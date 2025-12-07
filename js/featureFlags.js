/**
 * Feature Flags for the application.
 * Use this to toggle experimental features or switch between implementations.
 */
const FeatureFlags = {
    // Current renderer for the Gantt chart. Options: 'mermaid', 'frappe'
    GANTT_RENDERER: 'mermaid',

    /**
     * Set the Gantt renderer.
     * @param {string} renderer - 'mermaid' or 'frappe'
     */
    setRenderer(renderer) {
        if (['mermaid', 'frappe'].includes(renderer)) {
            this.GANTT_RENDERER = renderer;
            console.log(`[FeatureFlags] Gantt renderer set to: ${renderer}`);
        } else {
            console.warn(`[FeatureFlags] Invalid renderer: ${renderer}`);
        }
    },

    /**
     * Get the current Gantt renderer.
     * @returns {string}
     */
    getRenderer() {
        return this.GANTT_RENDERER;
    }
};

// Object is registered globally in main.js
