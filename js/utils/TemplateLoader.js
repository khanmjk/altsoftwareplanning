/**
 * Utility class for loading and managing HTML templates
 */
class TemplateLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load HTML template from file
     * @param {string} path - Path to template file
     * @returns {Promise<string>} Template HTML content
     */
    async load(path) {
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${path}`);
            }
            const html = await response.text();
            this.cache.set(path, html);
            return html;
        } catch (error) {
            console.error('Template loading error:', error);
            throw error;
        }
    }

    /**
     * Clear template cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export as singleton
const templateLoader = new TemplateLoader();
if (typeof window !== 'undefined') {
    window.templateLoader = templateLoader;
}
