/**
 * SystemRepository
 * Handles app storage for systems, settings, and UI preferences via storage drivers.
 */
class SystemRepository {
    constructor(options = {}) {
        const DEFAULT_SYSTEMS_KEY = 'architectureVisualization_systems_v11';
        const DEFAULT_SETTINGS_KEY = 'architectureVisualization_appSettings_v1';
        const DEFAULT_UI_PREFS_KEY = 'architectureVisualization_uiPrefs_v1';

        this.storageMode = options.storageMode || 'local';
        this.storageKey = options.storageKey || DEFAULT_SYSTEMS_KEY;
        this.driver = options.driver || this._createDriver(this.storageMode, this.storageKey);

        this.settingsStorageMode = options.settingsStorageMode || 'local';
        this.settingsStorageKey = options.settingsStorageKey || DEFAULT_SETTINGS_KEY;
        this.settingsDriver = options.settingsDriver || this._createDriver(this.settingsStorageMode, this.settingsStorageKey);

        this.prefsStorageMode = options.prefsStorageMode || 'local';
        this.prefsStorageKey = options.prefsStorageKey || DEFAULT_UI_PREFS_KEY;
        this.prefsDriver = options.prefsDriver || this._createDriver(this.prefsStorageMode, this.prefsStorageKey);
    }

    /**
     * Configure storage behavior (e.g., inject a different driver).
     * @param {Object} options
     * @param {string} [options.storageKey]
     * @param {string} [options.storageMode]
     * @param {Object} [options.driver]
     */
    configure(options = {}) {
        const nextStorageKey = options.storageKey || this.storageKey;
        const nextStorageMode = options.storageMode || this.storageMode || 'local';
        const hasStorageKeyChange = nextStorageKey !== this.storageKey;
        const hasStorageModeChange = nextStorageMode !== this.storageMode;
        const nextDriver = options.driver || ((hasStorageKeyChange || hasStorageModeChange) ? this._createDriver(nextStorageMode, nextStorageKey) : this.driver);
        this.storageKey = nextStorageKey;
        this.storageMode = nextStorageMode;
        this.driver = nextDriver;

        const nextSettingsKey = options.settingsStorageKey || this.settingsStorageKey;
        const nextSettingsMode = options.settingsStorageMode || this.settingsStorageMode || 'local';
        const hasSettingsKeyChange = nextSettingsKey !== this.settingsStorageKey;
        const hasSettingsModeChange = nextSettingsMode !== this.settingsStorageMode;
        const nextSettingsDriver = options.settingsDriver || ((hasSettingsKeyChange || hasSettingsModeChange) ? this._createDriver(nextSettingsMode, nextSettingsKey) : this.settingsDriver);
        this.settingsStorageKey = nextSettingsKey;
        this.settingsStorageMode = nextSettingsMode;
        this.settingsDriver = nextSettingsDriver;

        const nextPrefsKey = options.prefsStorageKey || this.prefsStorageKey;
        const nextPrefsMode = options.prefsStorageMode || this.prefsStorageMode || 'local';
        const hasPrefsKeyChange = nextPrefsKey !== this.prefsStorageKey;
        const hasPrefsModeChange = nextPrefsMode !== this.prefsStorageMode;
        const nextPrefsDriver = options.prefsDriver || ((hasPrefsKeyChange || hasPrefsModeChange) ? this._createDriver(nextPrefsMode, nextPrefsKey) : this.prefsDriver);
        this.prefsStorageKey = nextPrefsKey;
        this.prefsStorageMode = nextPrefsMode;
        this.prefsDriver = nextPrefsDriver;
    }

    /**
     * Storage driver factory (kept local to the repository).
     * @param {string} storageMode
     * @param {string} storageKey
     * @returns {Object}
     */
    _createDriver(storageMode, storageKey) {
        if (storageMode === 'local') {
            return new LocalStorageDriver(storageKey);
        }
        console.warn(`Unsupported storage mode "${storageMode}", falling back to local storage.`);
        return new LocalStorageDriver(storageKey);
    }

    /**
     * Internal helper to safely parse all systems from storage.
     * @returns {Object} Map of systemId -> systemData
     */
    _loadSystemsMap() {
        return this.driver.loadAll();
    }

    /**
     * Internal helper to persist the full systems map.
     * @param {Object} systemsMap
     */
    _saveSystemsMap(systemsMap) {
        this.driver.saveAll(systemsMap);
    }

    /**
     * Remove all systems from storage.
     */
    clearAllSystems() {
        this.driver.clear();
    }

    /**
     * Get a snapshot of all systems from storage.
     * @returns {Object} Map of systemId -> systemData
     */
    getAllSystemsMap() {
        return this._loadSystemsMap();
    }

    /**
     * Get raw system data by ID
     * @param {string} systemId
     * @returns {Object|null}
     */
    getSystemData(systemId) {
        const systemsMap = this._loadSystemsMap();
        return systemsMap[systemId] || null;
    }

    /**
     * Delete a system from storage
     * @param {string} systemId - The system ID to delete
     * @returns {boolean} True if deleted successfully, false otherwise
     */
    deleteSystem(systemId) {
        try {
            const systemsMap = this._loadSystemsMap();
            if (systemsMap[systemId]) {
                delete systemsMap[systemId];
                this._saveSystemsMap(systemsMap);
                console.log(`System "${systemId}" deleted from storage.`);
                return true;
            } else {
                console.warn(`System "${systemId}" not found in storage.`);
                return false;
            }
        } catch (e) {
            console.error('Error deleting system from storage:', e);
            return false;
        }
    }

    /**
     * Save or update a system in storage
     * @param {string} systemId - The system ID
     * @param {Object} systemData - The system data to save
     * @returns {boolean} True if saved successfully
     */
    saveSystem(systemId, systemData) {
        try {
            const systemsMap = this._loadSystemsMap();

            systemsMap[systemId] = {
                ...systemData,
                lastModified: new Date().toISOString()
            };

            this._saveSystemsMap(systemsMap);
            console.log(`System "${systemId}" saved to storage.`);
            return true;
        } catch (e) {
            console.error('Error saving system to storage:', e);
            return false;
        }
    }

    /**
     * Load app settings from storage.
     * @returns {Object} Settings data
     */
    getSettings() {
        return this.settingsDriver.loadAll();
    }

    /**
     * Save app settings to storage.
     * @param {Object} settings
     */
    saveSettings(settings) {
        this.settingsDriver.saveAll(settings || {});
    }

    /**
     * Clear stored app settings.
     */
    clearSettings() {
        this.settingsDriver.clear();
    }

    /**
     * Get stored UI preferences map.
     * @returns {Object}
     */
    getUiPrefs() {
        return this.prefsDriver.loadAll();
    }

    /**
     * Save full UI preferences map.
     * @param {Object} prefs
     */
    saveUiPrefs(prefs) {
        this.prefsDriver.saveAll(prefs || {});
    }

    /**
     * Get a single UI preference value.
     * @param {string} key
     * @param {*} [fallback]
     * @returns {*}
     */
    getUiPref(key, fallback = null) {
        const prefs = this.prefsDriver.loadAll();
        if (Object.prototype.hasOwnProperty.call(prefs, key)) {
            return prefs[key];
        }
        return fallback;
    }

    /**
     * Set a single UI preference value.
     * @param {string} key
     * @param {*} value
     */
    setUiPref(key, value) {
        const prefs = this.prefsDriver.loadAll();
        prefs[key] = value;
        this.prefsDriver.saveAll(prefs);
    }

    /**
     * Clear stored UI preferences.
     */
    clearUiPrefs() {
        this.prefsDriver.clear();
    }
}

/**
 * Local storage driver encapsulation
 */
class LocalStorageDriver {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    loadAll() {
        const storedString = localStorage.getItem(this.storageKey);
        if (!storedString) return {};
        try {
            return JSON.parse(storedString);
        } catch (e) {
            console.error('Error parsing data from localStorage:', e);
            return {};
        }
    }

    saveAll(dataMap) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(dataMap));
        } catch (e) {
            console.error('Error saving data to localStorage:', e);
        }
    }

    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {
            console.error('Error clearing localStorage key:', e);
        }
    }
}

// Export as singleton
const systemRepository = new SystemRepository();
