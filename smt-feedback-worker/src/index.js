/**
 * SMT Feedback Worker
 * Cloudflare Worker that proxies:
 * - Feedback submissions to GitHub Issues
 * - YouTube API requests (to keep API key server-side)
 *
 * Deploy: wrangler deploy
 * Secrets:
 *   wrangler secret put GITHUB_TOKEN
 *   wrangler secret put YOUTUBE_API_KEY
 */

// GitHub repository configuration
const GITHUB_OWNER = 'khanmjk';
const GITHUB_REPO = 'altsoftwareplanning';

// YouTube channel configuration
const YOUTUBE_CHANNEL_ID = 'UC2ryW_gQBMNZgv6GNUhM2ag';

// Map feedback types to GitHub labels
const LABEL_MAP = {
  'Bug Report': 'bug',
  'Feature Request': 'enhancement',
  'General Feedback': 'feedback',
  Question: 'question',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight for all routes
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Route: /health - Lightweight health endpoint for observability
    if (path === '/health' || path === '/health/' || path === '/api/health') {
      return handleHealth(request, env);
    }

    // Route: /youtube - Proxy YouTube API requests
    if (path === '/youtube' || path === '/youtube/') {
      return handleYouTube(request, env);
    }

    // Route: / or /feedback - Handle feedback submissions (existing)
    if (path === '/' || path === '/feedback' || path === '/feedback/') {
      return handleFeedback(request, env);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

/**
 * Handle YouTube API proxy requests
 */
async function handleYouTube(request, env) {
  // Only accept GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  try {
    const url = new URL(request.url);
    const maxResults = url.searchParams.get('maxResults') || '6';

    // Fetch videos from YouTube Data API
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?key=${env.YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet&order=date&maxResults=${maxResults}&type=video`;

    const response = await fetch(youtubeUrl);
    const data = await response.json();

    if (data.error) {
      return new Response(
        JSON.stringify({
          error: 'YouTube API error',
          details: data.error.message,
        }),
        {
          status: data.error.code || 500,
          headers: corsHeaders(),
        }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.error('YouTube Proxy Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch YouTube data',
        message: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

/**
 * Handle feedback submissions to GitHub Issues
 */
async function handleFeedback(request, env) {
  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.description) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: type, description',
        }),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Build issue title
    const titlePrefix = `[${body.type}]`;
    const title = body.title ? `${titlePrefix} ${body.title}` : `${titlePrefix} User Feedback`;

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
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SMT-Feedback-Worker/1.0',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API Error:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to create issue',
          details: githubResponse.status,
        }),
        {
          status: 502,
          headers: corsHeaders(),
        }
      );
    }

    const issue = await githubResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      }),
      {
        status: 201,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error('Worker Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Lightweight health endpoint (no external calls).
 * Designed to be safe for browser checks and GitHub Actions uptime workflows.
 */
function handleHealth(request, env) {
  // Only accept GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  const responseBody = {
    ok: true,
    service: 'smt-feedback-worker',
    time: new Date().toISOString(),
    checks: {
      github: { configured: !!env.GITHUB_TOKEN },
      youtube: { configured: !!env.YOUTUBE_API_KEY },
    },
  };

  // If GitHub token is missing, feedback submission cannot work.
  responseBody.ok = !!responseBody.checks.github.configured;

  return new Response(JSON.stringify(responseBody), {
    status: responseBody.ok ? 200 : 503,
    headers: {
      ...corsHeaders(),
      'Cache-Control': 'no-store',
    },
  });
}
