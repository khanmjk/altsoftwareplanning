/**
 * SMT Feedback Worker
 * Cloudflare Worker that proxies feedback submissions to GitHub Issues.
 * 
 * Deploy: wrangler deploy
 * Secrets: wrangler secret put GITHUB_TOKEN
 */

// GitHub repository configuration
const GITHUB_OWNER = 'khanmjk';
const GITHUB_REPO = 'altsoftwareplanning';

// Map feedback types to GitHub labels
const LABEL_MAP = {
    'Bug Report': 'bug',
    'Feature Request': 'enhancement',
    'General Feedback': 'feedback',
    'Question': 'question'
};

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS();
        }

        // Only accept POST
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: corsHeaders()
            });
        }

        try {
            const body = await request.json();

            // Validate required fields
            if (!body.type || !body.description) {
                return new Response(JSON.stringify({
                    error: 'Missing required fields: type, description'
                }), {
                    status: 400,
                    headers: corsHeaders()
                });
            }

            // Build issue title
            const titlePrefix = `[${body.type}]`;
            const title = body.title
                ? `${titlePrefix} ${body.title}`
                : `${titlePrefix} User Feedback`;

            // Build issue body with context
            const issueBody = buildIssueBody(body);

            // Get label for this feedback type
            const labels = [LABEL_MAP[body.type] || 'question'];

            // Create GitHub issue
            const githubResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'SMT-Feedback-Worker/1.0',
                        'Accept': 'application/vnd.github+json'
                    },
                    body: JSON.stringify({
                        title,
                        body: issueBody,
                        labels
                    })
                }
            );

            if (!githubResponse.ok) {
                const errorText = await githubResponse.text();
                console.error('GitHub API Error:', errorText);
                return new Response(JSON.stringify({
                    error: 'Failed to create issue',
                    details: githubResponse.status
                }), {
                    status: 502,
                    headers: corsHeaders()
                });
            }

            const issue = await githubResponse.json();

            return new Response(JSON.stringify({
                success: true,
                issueNumber: issue.number,
                issueUrl: issue.html_url
            }), {
                status: 201,
                headers: corsHeaders()
            });

        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: corsHeaders()
            });
        }
    }
};

/**
 * Build the issue body with formatted context
 */
function buildIssueBody(data) {
    const sections = [];

    // Description
    sections.push('## Description');
    sections.push(data.description);
    sections.push('');

    // Context (if provided)
    if (data.context) {
        sections.push('## App Context');
        sections.push('```json');
        sections.push(JSON.stringify(data.context, null, 2));
        sections.push('```');
        sections.push('');
    }

    // Metadata
    sections.push('## Metadata');
    sections.push(`- **Submitted by**: ${data.email || 'Anonymous'}`);
    sections.push(`- **Submitted at**: ${new Date().toISOString()}`);
    if (data.userAgent) {
        sections.push(`- **User Agent**: ${data.userAgent}`);
    }
    if (data.currentView) {
        sections.push(`- **Current View**: ${data.currentView}`);
    }

    sections.push('');
    sections.push('---');
    sections.push('*This issue was automatically created via the SMT Platform Feedback form.*');

    return sections.join('\n');
}

/**
 * CORS headers for cross-origin requests
 */
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // In production, restrict to your domain
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders()
    });
}
