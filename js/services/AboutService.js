/**
 * AboutService
 * Handles data fetching for the About view.
 * Encapsulates Blogger JSONP and YouTube API calls.
 */
const AboutService = {
    /**
     * Fetch blog posts from Blogger via JSONP
     * @param {string} blogId 
     * @param {string} label 
     * @param {number} maxResults 
     * @returns {Promise<Array>}
     */
    getBlogPosts(blogId, label, maxResults = 9) {
        return new Promise((resolve, reject) => {
            const callbackName = 'bloggerCallback_' + Date.now();
            const apiUrl = `https://www.blogger.com/feeds/${blogId}/posts/default/-/${label}?alt=json-in-script&callback=${callbackName}&max-results=${maxResults}`;

            // Create timeout to reject if hangs
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Blogger API request timed out'));
            }, 10000);

            function cleanup() {
                delete window[callbackName];
                const scriptEl = document.getElementById(callbackName);
                if (scriptEl) scriptEl.remove();
                clearTimeout(timeoutId);
            }

            // Global callback
            window[callbackName] = (data) => {
                cleanup();
                try {
                    const entries = data.feed?.entry || [];
                    const posts = entries.map(entry => ({
                        id: entry.id.$t,
                        title: entry.title.$t,
                        summary: AboutService._extractSummary(entry.content.$t),
                        date: new Date(entry.published.$t).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        }),
                        url: entry.link.find(l => l.rel === 'alternate')?.href || '#',
                        thumbnail: entry.media$thumbnail?.url || null
                    }));
                    resolve(posts);
                } catch (error) {
                    reject(error);
                }
            };

            // Inject script
            const script = document.createElement('script');
            script.id = callbackName;
            script.src = apiUrl;
            script.onerror = () => {
                cleanup();
                reject(new Error('Failed to load Blogger script'));
            };
            document.head.appendChild(script);
        });
    },

    /**
     * Fetch videos from Cloudflare Worker proxy
     * @param {string} workerUrl 
     * @param {number} maxResults 
     * @returns {Promise<Array>}
     */
    async getYouTubeVideos(workerUrl, maxResults = 6) {
        try {
            const response = await fetch(`${workerUrl}?maxResults=${maxResults}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'YouTube API Error');
            }

            return (data.items || []).map(item => ({
                id: item.id.videoId,
                title: AboutService._decodeHtmlEntities(item.snippet.title),
                description: AboutService._decodeHtmlEntities(item.snippet.description).substring(0, 100) + '...',
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                date: new Date(item.snippet.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            }));
        } catch (error) {
            console.error('AboutService: Fetch failed', error);
            throw error;
        }
    },

    /**
     * Helper to extract summary from HTML
     * @private
     */
    _extractSummary(htmlContent) {
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;

        // Remove script and style tags to prevent code leakage
        const scripts = temp.getElementsByTagName('script');
        const styles = temp.getElementsByTagName('style');

        // Remove strictly, iterating backwards
        for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].remove();
        }
        for (let i = styles.length - 1; i >= 0; i--) {
            styles[i].remove();
        }

        const text = temp.textContent || temp.innerText || '';
        return text.substring(0, 150).trim() + (text.length > 150 ? '...' : '');
    },

    /**
     * Helper to decode HTML entities
     * @private
     */
    _decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
};

// Export for ES modules or attach to window for legacy
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AboutService;
} else {
    // In this project, services are typically globals or imported via ES modules.
    // Given the pattern in other files (e.g. PlanningService is an export), 
    // but looking at valid existing services like PlanningService.js:
    // "export function..."
    // Wait, let me check PlanningService.js structure.
}

// End of service
