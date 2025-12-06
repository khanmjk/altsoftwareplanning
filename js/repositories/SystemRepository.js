/**
 * SystemRepository
 * Handles all data access operations for systems (CRUD operations with localStorage)
 */
class SystemRepository {
    constructor() {
        const DEFAULT_STORAGE_KEY = 'architectureVisualization_systems_v11';
        const mode = (typeof window !== 'undefined' && window.APP_STORAGE_MODE) || 'local';
        this.storageMode = mode;
        this.storageKey = (typeof window !== 'undefined' && window.LOCAL_STORAGE_KEY) || DEFAULT_STORAGE_KEY;
        this.driver = this._createDriver();
        this.sampleSystemKeys = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];
    }

    /**
     * Storage driver factory
     */
    _createDriver() {
        if (this.storageMode === 'local') {
            return new LocalStorageDriver(this.storageKey);
        }
        console.warn(`Unsupported storage mode "${this.storageMode}", falling back to local storage.`);
        return new LocalStorageDriver(this.storageKey);
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
     * Get all systems from localStorage
     * @returns {Array<Object>} Array of system objects with id, name, description, lastModified
     */
    getAllSystems() {
        const systemsMap = this._loadSystemsMap();
        return Object.entries(systemsMap).map(([key, data]) => ({
            id: key,
            name: data.systemName || key,
            description: data.systemDescription || '',
            lastModified: data.lastModified || null,
            // Include the full data for advanced usage
            data: data
        })).sort((a, b) => {
            // Sort by last modified descending
            const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
            const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
            return dateB - dateA;
        });
    }

    /**
     * Get user-created systems (non-sample systems)
     * @returns {Array<Object>} Array of user system objects
     */
    getUserSystems() {
        return this.getAllSystems().filter(sys => !this.sampleSystemKeys.includes(sys.id));
    }

    /**
     * Get sample systems
     * @returns {Array<Object>} Array of sample system objects
     */
    getSampleSystems() {
        return this.getAllSystems().filter(sys => this.sampleSystemKeys.includes(sys.id));
    }

    /**
     * Get a specific system by ID
     * @param {string} systemId - The system ID to retrieve
     * @returns {Object|null} The system object or null if not found
     */
    getSystemById(systemId) {
        const systems = this.getAllSystems();
        return systems.find(sys => sys.id === systemId) || null;
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
     * Check if a system is a sample system
     * @param {string} systemId - The system ID to check
     * @returns {boolean} True if it's a sample system
     */
    isSampleSystem(systemId) {
        return this.sampleSystemKeys.includes(systemId);
    }

    /**
     * Delete a system from localStorage
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
     * Save or update a system in localStorage
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
     * Check if any systems exist
     * @returns {boolean} True if at least one system exists
     */
    hasAnySystems() {
        return this.getAllSystems().length > 0;
    }

    /**
     * Check if any user systems exist
     * @returns {boolean} True if at least one user system exists
     */
    hasUserSystems() {
        return this.getUserSystems().length > 0;
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
if (typeof window !== 'undefined') {
    window.systemRepository = systemRepository;
    window.SystemRepository = SystemRepository;
}
