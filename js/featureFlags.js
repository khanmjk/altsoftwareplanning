/**
 * Feature Flags for the application.
 * Use this to toggle experimental features or switch between implementations.
 */
const FeatureFlags = {
    // Current renderer for the Gantt chart. Options: 'mermaid', 'frappe'
    GANTT_RENDERER: 'mermaid',

    // MVC-based Gantt Table is now the default (legacy is deprecated)
    GANTT_TABLE_MVC: true,

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
    },

    /**
     * Check if a feature flag is enabled.
     * @param {string} flagName - The feature flag name (camelCase or UPPER_SNAKE_CASE)
     * @returns {boolean}
     */
    isEnabled(flagName) {
        const normalizedName = this._normalizeFlag(flagName);
        return this[normalizedName] === true;
    },

    /**
     * Enable or disable a feature flag.
     * @param {string} flagName - The feature flag name (camelCase or UPPER_SNAKE_CASE)
     * @param {boolean} enabled - Whether to enable the flag
     */
    setFlag(flagName, enabled) {
        const normalizedName = this._normalizeFlag(flagName);
        if (Object.prototype.hasOwnProperty.call(this, normalizedName)) {
            this[normalizedName] = !!enabled;
            console.log(`[FeatureFlags] ${normalizedName} set to: ${enabled}`);
        } else {
            console.warn(`[FeatureFlags] Unknown flag: ${flagName} (normalized: ${normalizedName})`);
        }
    },

    /**
     * Normalizes flag name from camelCase to UPPER_SNAKE_CASE
     * @private
     */
    _normalizeFlag(flagName) {
        // Insert underscore before uppercase letters, then uppercase the whole thing
        return flagName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
    }
};

// Object is registered globally in main.js

