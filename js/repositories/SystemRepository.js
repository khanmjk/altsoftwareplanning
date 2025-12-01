/**
 * SystemRepository
 * Handles all data access operations for systems (CRUD operations with localStorage)
 */
class SystemRepository {
    constructor() {
        this.storageKey = window.LOCAL_STORAGE_KEY || 'architectureVisualization_systems_v10';
        this.sampleSystemKeys = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];
    }

    /**
     * Get all systems from localStorage
     * @returns {Array<Object>} Array of system objects with id, name, description, lastModified
     */
    getAllSystems() {
        const systemsString = localStorage.getItem(this.storageKey);
        if (!systemsString) return [];

        try {
            const systemsMap = JSON.parse(systemsString);
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
        } catch (e) {
            console.error('Error parsing systems from localStorage:', e);
            return [];
        }
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
        const systemsString = localStorage.getItem(this.storageKey);
        if (!systemsString) return false;

        try {
            const systemsMap = JSON.parse(systemsString);
            if (systemsMap[systemId]) {
                delete systemsMap[systemId];
                localStorage.setItem(this.storageKey, JSON.stringify(systemsMap));
                console.log(`System "${systemId}" deleted from localStorage.`);
                return true;
            } else {
                console.warn(`System "${systemId}" not found in localStorage.`);
                return false;
            }
        } catch (e) {
            console.error('Error deleting system from localStorage:', e);
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
            const systemsString = localStorage.getItem(this.storageKey) || '{}';
            const systemsMap = JSON.parse(systemsString);

            systemsMap[systemId] = {
                ...systemData,
                lastModified: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(systemsMap));
            console.log(`System "${systemId}" saved to localStorage.`);
            return true;
        } catch (e) {
            console.error('Error saving system to localStorage:', e);
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

// Export as singleton
const systemRepository = new SystemRepository();
if (typeof window !== 'undefined') {
    window.systemRepository = systemRepository;
    window.SystemRepository = SystemRepository;
}
