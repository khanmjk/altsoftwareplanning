/**
 * SystemService.js
 * 
 * Domain service for managing System lifecycles.
 * Handles creation, loading, saving, and deletion of systems.
 * Acts as the business logic layer over SystemRepository.
 * 
 * Part of Service Layer Architecture.
 */

// Private state - the currently loaded system
let _currentSystem = null;
// Private state - aggregate sample data
let _sampleSystemsData = {};

// Default sample system keys (used when sample data isn't loaded yet)
const DEFAULT_SAMPLE_SYSTEM_KEYS = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];

const SystemService = {

    /**
     * Get the currently loaded system.
     * @returns {Object|null}
     */
    getCurrentSystem() {
        return _currentSystem;
    },

    /**
     * Set the currently loaded system.
     * Notifies AppState for subscribers.
     * @param {Object|null} systemData
     */
    setCurrentSystem(systemData) {
        _currentSystem = systemData;

        // Sync to AppState for change notification subscribers
        appState.currentSystem = systemData;

        console.log(`[SystemService] Current system set to: ${systemData?.systemName || 'null'}`);
    },

    /**
     * Check if a system is currently loaded.
     * @returns {boolean}
     */
    hasCurrentSystem() {
        return _currentSystem !== null;
    },

    /**
     * Configure storage behavior (driver injection, mode, storage key).
     * @param {Object} options
     */
    configureStorage(options = {}) {
        systemRepository.configure(options);
    },

    /**
     * Get all systems as a list with basic metadata.
     * @returns {Array<Object>}
     */
    getAllSystems() {
        const systemsMap = systemRepository.getAllSystemsMap();
        return Object.entries(systemsMap).map(([key, data]) => ({
            id: key,
            name: data.systemName || key,
            description: data.systemDescription || '',
            lastModified: data.lastModified || null,
            data: data
        })).sort((a, b) => {
            const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
            const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
            return dateB - dateA;
        });
    },

    /**
     * Get user-created systems (non-sample systems).
     * @returns {Array<Object>}
     */
    getUserSystems() {
        const sampleKeys = this._getSampleSystemKeys();
        return this.getAllSystems().filter(sys => !sampleKeys.includes(sys.id));
    },

    /**
     * Get sample systems.
     * @returns {Array<Object>}
     */
    getSampleSystems() {
        const sampleKeys = this._getSampleSystemKeys();
        return this.getAllSystems().filter(sys => sampleKeys.includes(sys.id));
    },

    /**
     * Check whether a system exists in storage.
     * @param {string} systemId
     * @returns {boolean}
     */
    systemExists(systemId) {
        return !!systemRepository.getSystemData(systemId);
    },

    /**
     * Check if a system is a sample system.
     * @param {string} systemId
     * @returns {boolean}
     */
    isSampleSystem(systemId) {
        return this._getSampleSystemKeys().includes(systemId);
    },

    /**
     * Initialize default sample systems if they don't exist.
     * @param {object} options - { forceOverwrite: boolean }
     */
    initializeDefaults(options = {}) {
        const { forceOverwrite = false } = options;

        // Aggregate sample data from potential globals if main object is missing
        if (Object.keys(_sampleSystemsData).length === 0) {
            if (typeof sampleSystemDataStreamView !== 'undefined') _sampleSystemsData['StreamView'] = sampleSystemDataStreamView;
            if (typeof sampleSystemDataContactCenter !== 'undefined') _sampleSystemsData['ConnectPro'] = sampleSystemDataContactCenter;
            if (typeof sampleSystemDataShopSphere !== 'undefined') _sampleSystemsData['ShopSphere'] = sampleSystemDataShopSphere;
            if (typeof sampleSystemDataInsightAI !== 'undefined') _sampleSystemsData['InsightAI'] = sampleSystemDataInsightAI;
            if (typeof sampleSystemDataFinSecure !== 'undefined') _sampleSystemsData['FinSecure'] = sampleSystemDataFinSecure;
        }

        if (Object.keys(_sampleSystemsData).length === 0) {
            console.warn("SystemService: No sampleSystemsData found. Skipping defaults initialization.");
            return;
        }

        Object.keys(_sampleSystemsData).forEach(key => {
            const sampleData = _sampleSystemsData[key];
            if (!sampleData) return;

            // Use the name from the data if available, otherwise the key
            const systemId = sampleData.systemName || key;

            // Check if it already exists to avoid overwriting user changes unless forced
            const existing = this.systemExists(systemId);

            if (forceOverwrite || !existing) {
                systemRepository.saveSystem(systemId, sampleData);
                console.log(`SystemService: Initialized default system '${systemId}'.`);
            }
        });
    },

    /**
     * Creates a new, empty system structure.
     * @returns {object} The new system data object.
     */
    createSystem() {
        const newSystem = {
            systemName: "New Software System",
            systemDescription: "Description of the new system...",
            teams: [],
            allKnownEngineers: [],
            seniorManagers: [],
            sdms: [],
            pmts: [],
            projectManagers: [],
            services: [],
            platformDependencies: [],
            capacityConfiguration: {
                workingDaysPerYear: 261,
                standardHoursPerDay: 8,
                globalConstraints: {
                    publicHolidays: 10,
                    orgEvents: []
                },
                leaveTypes: [
                    { id: "annual", name: "Annual Leave", defaultEstimatedDays: 20, attributes: {} },
                    { id: "sick", name: "Sick Leave", defaultEstimatedDays: 7, attributes: {} }
                ],
                attributes: {}
            },
            yearlyInitiatives: [],
            goals: [],
            definedThemes: [],
            archivedYearlyPlans: [],
            workPackages: [],
            calculatedCapacityMetrics: null,
            attributes: {}
        };
        return newSystem;
    },

    /**
     * Loads a system by ID (name) and performs necessary data augmentation.
     * @param {string} systemId - The ID of the system to load.
     * @returns {object|null} The populated system data or null if not found.
     */
    loadSystem(systemId) {
        if (!systemId) {
            console.error("SystemService: No systemId provided to load.");
            return null;
        }

        // 1. Try Repository
        let systemData = systemRepository.getSystemData(systemId);

        // 2. Fallback: Check sampleSystemsData global (in case storage was cleared but app didn't reload)
        if (!systemData && _sampleSystemsData && _sampleSystemsData[systemId]) {
            console.log(`SystemService: System '${systemId}' not in storage, loading from default samples.`);
            systemData = _sampleSystemsData[systemId];
            // Auto-save to storage to persist it for next time
            systemRepository.saveSystem(systemId, systemData);
        }

        if (!systemData) {
            console.error(`SystemService: System '${systemId}' not found.`);
            return null;
        }

        // 3. Data Augmentation / normalization
        // Ensure all required arrays exist
        const requiredArrays = [
            'teams', 'allKnownEngineers', 'services',
            'yearlyInitiatives', 'goals', 'definedThemes',
            'sdms', 'pmts', 'seniorManagers', 'projectManagers', 'workPackages'
        ];
        requiredArrays.forEach(prop => {
            if (!systemData[prop]) systemData[prop] = [];
        });

        // Ensure Capacity Config
        if (!systemData.capacityConfiguration) {
            systemData.capacityConfiguration = {
                standardSdeYears: 1.0,
                supportOverheadBytes: 0.2,
                defaultAiProductivityGain: 0.05
            };
        }

        // Ensure System Name consistency
        // If the object key implies a name but the data lacks it, fill it
        if (!systemData.systemName) {
            systemData.systemName = systemId;
        }

        this._augmentSystemData(systemData);

        console.log(`SystemService: Loaded system '${systemId}'.`);
        return systemData;
    },

    /**
     * Resolve the set of sample system IDs.
     * @private
     * @returns {Array<string>}
     */
    _getSampleSystemKeys() {
        const sampleIds = Object.entries(_sampleSystemsData).map(([key, data]) => data?.systemName || key);
        if (sampleIds.length > 0) {
            return sampleIds;
        }
        return DEFAULT_SAMPLE_SYSTEM_KEYS.slice();
    },

    /**
     * Deeply augments system data to ensure all expected fields and defaults exist.
     * Use when loading data that might be from an older schema version.
     * @private
     */
    _augmentSystemData(systemData) {
        // 1. Engineers
        this._augmentEngineers(systemData);

        // 2. Capacity Configuration
        this._augmentCapacityConfiguration(systemData);

        // 3. Teams
        if (systemData.teams) {
            systemData.teams.forEach(team => {
                if (!team.attributes) team.attributes = {};
                if (!team.engineers) team.engineers = [];
                if (!team.awayTeamMembers) team.awayTeamMembers = [];
                // Default Capacity Adjustments
                if (!team.teamCapacityAdjustments) {
                    team.teamCapacityAdjustments = {
                        leaveUptakeEstimates: [],
                        variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 } },
                        teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0, attributes: {}
                    };
                }
            });
        }

        // 4. Services
        if (systemData.services) {
            systemData.services.forEach(service => {
                if (!service.attributes) service.attributes = {};
                if (!service.apis) service.apis = [];
                if (!service.serviceDependencies) service.serviceDependencies = [];
                if (!service.platformDependencies) service.platformDependencies = [];
            });
        }

        // 5. Initiatives and Work Packages
        WorkPackageService.ensureWorkPackagesForInitiatives(systemData);

        if (systemData.yearlyInitiatives) {
            systemData.yearlyInitiatives.forEach(initiative => {
                if (!initiative.attributes) initiative.attributes = {};
                if (initiative.attributes.pmCapacityNotes === undefined) initiative.attributes.pmCapacityNotes = "";

                // Direct specific migrations
                if (initiative.hasOwnProperty('relatedBusinessGoalId')) {
                    if (initiative.primaryGoalId === undefined) initiative.primaryGoalId = initiative.relatedBusinessGoalId;
                    delete initiative.relatedBusinessGoalId;
                }

                // Default ROI
                const defaultROI = { category: null, valueType: null, estimatedValue: null, currency: null, timeHorizonMonths: null, confidenceLevel: null, calculationMethodology: null, businessCaseLink: null, overrideJustification: null, attributes: {} };
                if (!initiative.roi) initiative.roi = JSON.parse(JSON.stringify(defaultROI));
                else {
                    for (const key in defaultROI) { if (initiative.roi[key] === undefined) initiative.roi[key] = defaultROI[key]; }
                }

                if (initiative.targetDueDate === undefined) initiative.targetDueDate = null;
                if (initiative.actualCompletionDate === undefined) initiative.actualCompletionDate = null;
                if (!initiative.status) initiative.status = initiative.isProtected ? 'Committed' : 'Backlog';
                if (!initiative.themes) initiative.themes = [];
                if (initiative.primaryGoalId === undefined) initiative.primaryGoalId = null;
                if (!initiative.assignments) initiative.assignments = [];
                if (!initiative.workPackageIds) initiative.workPackageIds = [];
            });
        }

        // 6. Platform Dependencies (Global Build)
        this._buildGlobalPlatformDependencies(systemData);
    },

    /**
     * Helper for capacity config augmentation
     */
    _augmentCapacityConfiguration(systemData) {
        const defaultCapacityConfig = {
            workingDaysPerYear: 261, standardHoursPerDay: 8,
            globalConstraints: { publicHolidays: 0, orgEvents: [] },
            leaveTypes: [
                { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "study", name: "Study Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
            ],
            attributes: {}
        };

        if (!systemData.capacityConfiguration) {
            systemData.capacityConfiguration = JSON.parse(JSON.stringify(defaultCapacityConfig));
        } else {
            // Shallow merge/ensure for key props
            const cc = systemData.capacityConfiguration;
            if (cc.workingDaysPerYear === undefined) cc.workingDaysPerYear = defaultCapacityConfig.workingDaysPerYear;
            // ... (can add more detailed merges if strictly needed, but base existence is most critical)
        }
    },

    _buildGlobalPlatformDependencies(systemData) {
        if (!systemData || !systemData.services) return;
        const platformDepsSet = new Set();
        systemData.services.forEach(service => {
            (service.platformDependencies || []).forEach(dep => platformDepsSet.add(dep));
        });
        systemData.platformDependencies = Array.from(platformDepsSet);
    },

    /**
     * Helper to backfill missing engineer IDs or properties.
     * @private
     */
    _augmentEngineers(systemData) {
        // Ensure Engineers have IDs if missing (legacy support)
        if (Array.isArray(systemData.allKnownEngineers)) {
            systemData.allKnownEngineers.forEach(eng => {
                if (!eng.id && eng.name) {
                    eng.id = eng.name.toLowerCase().replace(/\s+/g, '.');
                }
            });
        }
    },

    /**
     * Persists the given system data.
     * @param {object} systemData - The system data to save.
     * @param {string} [overrideId] - Optional ID to save under. Defaults to systemData.systemName.
     * @returns {boolean} True if successful.
     */
    saveSystem(systemData, overrideId = null) {
        if (!systemData) {
            console.error("SystemService: No data to save.");
            return false;
        }

        const systemId = overrideId || systemData.systemName;
        if (!systemId) {
            console.error("SystemService: Cannot save system without a name/ID.");
            return false;
        }

        // Validation - can be expanded
        if (!this.validateSystem(systemData)) {
            return false;
        }

        const success = systemRepository.saveSystem(systemId, systemData);
        if (success) {
            console.log(`SystemService: Saved system '${systemId}'.`);
        }
        return success;
    },

    /**
     * Validates system data before saving.
     * @param {object} systemData 
     * @returns {boolean}
     */
    validateSystem(systemData) {
        // Engineer Consistency Check
        if (!this._validateEngineerAssignments(systemData)) {
            return false;
        }
        return true;
    },

    /**
     * Checks for data consistency regarding engineers.
     * @private
     */
    _validateEngineerAssignments(systemData) {
        if (!systemData.teams || !systemData.allKnownEngineers) {
            // Warn but allow if data is just missing structures entirely (e.g. new system)
            return true;
        }

        let isValid = true;
        let errorMessages = [];
        const engineerTeamMap = new Map(); // Name -> currentTeamId

        // 1. Build Map from Roster
        systemData.allKnownEngineers.forEach(eng => {
            if (eng.name) {
                // If duplicates exist in roster, that's bad
                if (engineerTeamMap.has(eng.name)) {
                    // Only flag if they have conflicting teams. If duplicate entry same team, just warn?
                    // Ideally names are unique.
                }
                engineerTeamMap.set(eng.name, eng.currentTeamId || null);
            }
        });

        // 2. Check Teams against Roster
        systemData.teams.forEach(team => {
            if (!Array.isArray(team.engineers)) return;

            team.engineers.forEach(engName => {
                if (typeof engName !== 'string') return;

                const rosterTeamId = engineerTeamMap.get(engName);
                // undefined means not in roster
                if (rosterTeamId === undefined) {
                    isValid = false;
                    errorMessages.push(`Engineer '${engName}' in team '${team.teamName}' is not in the Global Engineer Roster.`);
                } else if (rosterTeamId !== team.teamId) {
                    // Mismatch
                    isValid = false;
                    errorMessages.push(`Engineer '${engName}' is assigned to team '${team.teamName}' but Roster says '${rosterTeamId || "Unassigned"}'.`);
                }
            });
        });

        if (!isValid) {
            console.warn("SystemService: Validation errors:", errorMessages);
            notificationManager.showToast("Data Inconsistency: Engineer assignments do not match global roster. See console.", "error");

        }

        return isValid;
    },

    /**
     * Deletes a system.
     * @param {string} systemId 
     * @returns {boolean}
     */
    deleteSystem(systemId) {
        if (!systemId) return false;
        return systemRepository.deleteSystem(systemId);
    },

    // ========================================
    // HIGH-LEVEL ORCHESTRATION METHODS
    // (Moved from main.js for cleaner architecture)
    // ========================================

    /**
     * Loads a system by name and activates it (sets as current, navigates to view).
     * @param {string} systemName - The system to load
     * @returns {boolean} True if successful
     */
    loadAndActivate(systemName) {
        console.log(`[SystemService] Loading and activating system: ${systemName}`);

        const systemData = this.loadSystem(systemName);
        if (!systemData) {
            notificationManager.showToast(`System "${systemName}" not found.`, 'error');
            return false;
        }

        this.setCurrentSystem(systemData);

        // Start AI session
        aiAgentController.startSession();

        // Navigate to default view
        navigationManager.navigateTo('visualizationCarousel');

        // Update sidebar
        sidebarComponent.updateState();

        console.log(`[SystemService] System "${systemName}" loaded and activated.`);
        return true;
    },

    /**
     * Creates a new blank system and activates it for editing.
     * @returns {Object} The new system data
     */
    createAndActivate() {
        const newSystem = this.createSystem();
        this.setCurrentSystem(newSystem);

        console.log("[SystemService] New system created and activated.");

        navigationManager.navigateTo('systemEditForm');

        return newSystem;
    },

    /**
     * Saves the current system.
     * Pure save - no DOM interaction.
     * @returns {boolean} True if successful
     */
    save() {
        const currentSystem = this.getCurrentSystem();
        if (!currentSystem) {
            console.error("[SystemService] Cannot save: No current system.");
            return false;
        }

        const success = this.saveSystem(currentSystem);

        if (success) {
            sidebarComponent.updateState();
        }

        return success;
    },

    /**
     * Resets all systems to defaults (with user confirmation).
     * @returns {Promise<boolean>} True if reset was performed
     */
    async resetToDefaults() {


        const confirmed = await notificationManager.confirm(
            'This will erase all your saved systems and restore the default sample systems. Do you want to proceed?',
            'Reset to Defaults',
            { confirmStyle: 'danger', confirmText: 'Reset' }
        );

        if (!confirmed) return false;

        try {
            systemRepository.clearAllSystems();
            console.log('[SystemService] Cleared user systems from storage.');
        } catch (error) {
            console.error('[SystemService] Failed to clear storage:', error);
            notificationManager.showToast('Unable to reset: storage could not be cleared.', 'error');
            return false;
        }

        this.initializeDefaults({ forceOverwrite: true });
        this.setCurrentSystem(null);
        notificationManager.showToast('Systems have been reset to defaults.', 'success');

        appState.closeCurrentSystem();

        return true;
    },

    /**
     * Deletes the currently loaded system (with user confirmation).
     * @returns {Promise<{success: boolean, reason?: string}>}
     */
    async deleteCurrentSystem() {
        const currentSystem = this.getCurrentSystem();

        if (!currentSystem?.systemName) {
            notificationManager.showToast('No system currently loaded to delete.', 'warning');
            return { success: false, reason: 'no_system' };
        }

        const systemName = currentSystem.systemName;

        // Protection for sample systems
        if (this.isSampleSystem(systemName)) {
            notificationManager.showToast(`Cannot delete built-in sample system: "${systemName}".`, 'error');
            return { success: false, reason: 'sample_system' };
        }

        // Confirmation


        const confirmed = await notificationManager.confirm(
            `Are you sure you want to permanently delete "${systemName}"? This cannot be undone.`,
            'Delete System',
            { confirmStyle: 'danger', confirmText: 'Delete Forever' }
        );

        if (!confirmed) {
            return { success: false, reason: 'cancelled' };
        }

        try {
            const success = this.deleteSystem(systemName);

            if (success) {
                console.log(`[SystemService] System "${systemName}" deleted.`);
                notificationManager.showToast(`System "${systemName}" has been deleted.`, 'success');

                appState.closeCurrentSystem();
                return { success: true, systemName };
            } else {
                notificationManager.showToast(`Could not delete "${systemName}".`, 'error');
                return { success: false, reason: 'delete_failed' };
            }
        } catch (error) {
            console.error("[SystemService] Error deleting system:", error);
            notificationManager.showToast("An error occurred while deleting.", "error");
            return { success: false, reason: 'error' };
        }
    }

};

// Export to window
// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemService;
}
