/**
 * SettingsService.js
 * 
 * Domain logic for Global App Settings.
 * Handles loading, saving, and accessing application-wide configuration.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const DEFAULT_SETTINGS = {
    ai: {
        isEnabled: false,
        provider: 'google-gemini',
        apiKey: null
    },
    theme: 'light', // Theme preference
    // Future settings (autoSave, etc.) can be added here
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
     * Loads settings from storage and merges with defaults.
     * @returns {object} The loaded settings object.
     */
    load() {
        const loadedSettings = systemRepository.getSettings();
        if (loadedSettings && Object.keys(loadedSettings).length > 0) {
            // Shallow merge first
            this.state = { ...DEFAULT_SETTINGS, ...loadedSettings };

            // Deep merge for specific nested objects like 'ai'
            if (loadedSettings.ai) {
                this.state.ai = { ...DEFAULT_SETTINGS.ai, ...loadedSettings.ai };
            }

            console.log("SettingsService: Loaded settings from storage:", {
                aiEnabled: this.state.ai.isEnabled,
                aiProvider: this.state.ai.provider
            });
        } else {
            console.log("SettingsService: No saved settings found, using defaults.");
            this.reset();
        }

        return this.state;
    },

    /**
     * Saves the current settings state to storage.
     */
    save() {
        systemRepository.saveSettings(this.state);
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

    /**
     * Gets a stored UI preference value.
     * @param {string} key
     * @param {*} [fallback]
     * @returns {*}
     */
    getUiPreference(key, fallback = null) {
        return systemRepository.getUiPref(key, fallback);
    },

    /**
     * Persists a single UI preference value.
     * @param {string} key
     * @param {*} value
     */
    setUiPreference(key, value) {
        systemRepository.setUiPref(key, value);
    }
};
