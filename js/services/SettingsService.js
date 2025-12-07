/**
 * SettingsService.js
 * 
 * Domain logic for Global App Settings.
 * Handles loading, saving, and accessing application-wide configuration.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const APP_SETTINGS_KEY = 'architectureVisualization_appSettings_v1';

const DEFAULT_SETTINGS = {
    ai: {
        isEnabled: false,
        provider: 'google-gemini',
        apiKey: null
    },
    // Future settings (theme, autoSave, etc.) can be added here
};

const SettingsService = {
    state: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), // Initialize with defaults

    /**
     * Initializes the service by loading settings from persistence.
     */
    init() {
        this.load();
    },

    /**
     * Loads settings from localStorage and merges with defaults.
     * @returns {object} The loaded settings object.
     */
    load() {
        const settingsString = localStorage.getItem(APP_SETTINGS_KEY);
        if (settingsString) {
            try {
                const loadedSettings = JSON.parse(settingsString);
                // Shallow merge first
                this.state = { ...DEFAULT_SETTINGS, ...loadedSettings };

                // Deep merge for specific nested objects like 'ai'
                if (loadedSettings.ai) {
                    this.state.ai = { ...DEFAULT_SETTINGS.ai, ...loadedSettings.ai };
                }

                console.log("SettingsService: Loaded settings from localStorage:", {
                    aiEnabled: this.state.ai.isEnabled,
                    aiProvider: this.state.ai.provider
                });
            } catch (e) {
                console.error("SettingsService: Error parsing settings, reverting to defaults:", e);
                this.reset();
            }
        } else {
            console.log("SettingsService: No saved settings found, using defaults.");
            this.reset();
        }

        return this.state;
    },

    /**
     * Saves the current settings state to localStorage.
     */
    save() {
        try {
            localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(this.state));
            // Dispatch custom event for UI updates if needed?
            // window.dispatchEvent(new CustomEvent('settingsChanged', { detail: this.state }));
        } catch (e) {
            console.error("SettingsService: Failed to save settings:", e);
        }
    },

    /**
     * Resets settings to default values.
     */
    reset() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        this.save();
    },

    /**
     * Gets a specific setting or the entire settings object.
     * @param {string} [key] - Optional key (e.g., 'ai')
     * @returns {any}
     */
    get(key) {
        if (!key) return this.state;
        return this.state[key];
    },

    /**
     * Updates settings (partial update support).
     * @param {object} newSettings - Object containing fields to update.
     */
    update(newSettings) {
        // We might want a recursive merge utility, but for now specific handling or shallow merge
        // For 'ai', we need deep merge support often
        if (newSettings.ai) {
            this.state.ai = { ...this.state.ai, ...newSettings.ai };
            delete newSettings.ai; // Remove so we don't overwrite with shallow merge again
        }

        this.state = { ...this.state, ...newSettings };
        this.save();
    },

    // Note: window.globalSettings backward compatibility removed per coding-agent-contract.md
    // Use SettingsService.get() directly instead
};

// Auto-initialize if possible, or wait for explicit call?
// For now, let's keep it explicit or passive. usage in main.js will trigger load.

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsService;
}
