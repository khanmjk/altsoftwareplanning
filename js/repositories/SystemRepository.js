/**
 * SystemRepository
 * Handles all data access operations for systems (CRUD operations via a storage driver)
 */
class SystemRepository {
    constructor(options = {}) {
        const DEFAULT_STORAGE_KEY = 'architectureVisualization_systems_v11';
        this.storageMode = options.storageMode || 'local';
        this.storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
        this.driver = options.driver || this._createDriver(this.storageMode, this.storageKey);
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
}

/**
 * Local storage driver encapsulation
 */
class LocalStorageDriver {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    loadAll() {
        const systemsString = localStorage.getItem(this.storageKey);
        if (!systemsString) return {};
        try {
            return JSON.parse(systemsString);
        } catch (e) {
            console.error('Error parsing systems from localStorage:', e);
            return {};
        }
    }

    saveAll(systemsMap) {
        localStorage.setItem(this.storageKey, JSON.stringify(systemsMap));
    }

    clear() {
        localStorage.removeItem(this.storageKey);
    }
}

// Export as singleton
const systemRepository = new SystemRepository();
