/**
 * MarkdownService - Abstraction layer for markdown-it library
 * 
 * This service provides a unified interface for rendering Markdown content,
 * abstracting away the direct window.markdownit and window.markdownItAnchor
 * dependencies for future ES module migration.
 */
const MarkdownService = {
    _renderer: null,
    _rendererWithAnchors: null,

    /**
     * Get or create a basic markdown renderer
     * @private
     */
    _getRenderer() {
        if (this._renderer) return this._renderer;

        if (typeof markdownit === 'undefined') {
            console.error('MarkdownService: markdown-it library not loaded');
            return null;
        }

        this._renderer = markdownit({
            html: true,
            linkify: true,
            typographer: true
        });

        return this._renderer;
    },

    /**
     * Get or create a markdown renderer with anchor plugin
     * @param {Function} [slugifyFn] - Optional custom slugify function
     * @private
     */
    _getRendererWithAnchors(slugifyFn) {
        if (this._rendererWithAnchors) return this._rendererWithAnchors;

        const md = this._getRenderer();
        if (!md) return null;

        // Create a new instance for anchor support (don't modify the base renderer)
        this._rendererWithAnchors = markdownit({
            html: true,
            linkify: true,
            typographer: true
        });

        // Apply anchor plugin if available
        if (typeof markdownItAnchor !== 'undefined') {
            try {
                const anchorOptions = {
                    permalink: markdownItAnchor.permalink.headerLink(),
                    level: [1, 2, 3, 4, 5, 6]
                };

                if (slugifyFn) {
                    anchorOptions.slugify = slugifyFn;
                }

                this._rendererWithAnchors = this._rendererWithAnchors.use(markdownItAnchor, anchorOptions);
            } catch (e) {
                console.warn('MarkdownService: Failed to apply markdown-it-anchor plugin:', e);
            }
        }

        return this._rendererWithAnchors;
    },

    /**
     * Render markdown content to HTML
     * @param {string} markdownText - The markdown content to render
     * @returns {string} Rendered HTML string
     */
    render(markdownText) {
        const md = this._getRenderer();
        if (!md) {
            return `<p style="color:red;">Markdown renderer not available</p>`;
        }
        return md.render(markdownText || '');
    },

    /**
     * Render markdown with anchor headers (for documentation/help views)
     * @param {string} markdownText - The markdown content to render
     * @param {Function} [slugifyFn] - Optional custom slugify function for anchors
     * @returns {string} Rendered HTML string with header anchors
     */
    renderWithAnchors(markdownText, slugifyFn) {
        const md = this._getRendererWithAnchors(slugifyFn);
        if (!md) {
            // Fallback to basic render
            return this.render(markdownText);
        }
        return md.render(markdownText || '');
    },

    /**
     * Fetch and render markdown from a URL
     * @param {string} url - URL to fetch markdown from
     * @param {Object} [options] - Options object
     * @param {boolean} [options.withAnchors=false] - Whether to include header anchors
     * @param {Function} [options.slugifyFn] - Custom slugify function for anchors
     * @returns {Promise<string>} Rendered HTML string
     */
    async fetchAndRender(url, options = {}) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdownText = await response.text();

            if (options.withAnchors) {
                return this.renderWithAnchors(markdownText, options.slugifyFn);
            }
            return this.render(markdownText);
        } catch (error) {
            console.error('MarkdownService: Failed to fetch and render:', error);
            return `<p style="color:red;">Could not load content. Details: ${error.message}</p>`;
        }
    },

    /**
     * Check if the markdown library is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof markdownit !== 'undefined';
    },

    /**
     * Check if anchor plugin is available
     * @returns {boolean}
     */
    hasAnchorSupport() {
        return typeof markdownItAnchor !== 'undefined';
    },

    /**
     * Reset cached renderers (useful for testing or reconfiguration)
     */
    reset() {
        this._renderer = null;
        this._rendererWithAnchors = null;
    }
};
