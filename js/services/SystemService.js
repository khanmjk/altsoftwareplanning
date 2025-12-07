/**
 * SystemService.js
 * 
 * Domain service for managing System lifecycles.
 * Handles creation, loading, saving, and deletion of systems.
 * Acts as the business logic layer over SystemRepository.
 * 
 * Part of Service Layer Architecture.
 */

const SystemService = {

    /**
     * Initialize default sample systems if they don't exist.
     * @param {object} options - { forceOverwrite: boolean }
     */
    initializeDefaults(options = {}) {
        const { forceOverwrite = false } = options;

        // Aggregate sample data from potential globals if main object is missing
        if (!window.sampleSystemsData) {
            window.sampleSystemsData = {};
            if (typeof sampleSystemDataStreamView !== 'undefined') window.sampleSystemsData['StreamView'] = sampleSystemDataStreamView;
            if (typeof sampleSystemDataContactCenter !== 'undefined') window.sampleSystemsData['ConnectFlow'] = sampleSystemDataContactCenter; // Assuming ConnectFlow is the name
            if (typeof sampleSystemDataShopSphere !== 'undefined') window.sampleSystemsData['ShopSphere'] = sampleSystemDataShopSphere;
            if (typeof sampleSystemDataInsightAI !== 'undefined') window.sampleSystemsData['InsightAI'] = sampleSystemDataInsightAI;
            if (typeof sampleSystemDataFinSecure !== 'undefined') window.sampleSystemsData['FinSecure'] = sampleSystemDataFinSecure;
        }

        if (Object.keys(window.sampleSystemsData).length === 0) {
            console.warn("SystemService: No sampleSystemsData found. Skipping defaults initialization.");
            return;
        }

        // We use the repository to check/save
        if (typeof systemRepository === 'undefined') {
            console.error("SystemService: systemRepository is required but missing.");
            return;
        }

        Object.keys(window.sampleSystemsData).forEach(key => {
            const sampleData = window.sampleSystemsData[key];
            if (!sampleData) return;

            // Use the name from the data if available, otherwise the key
            const systemId = sampleData.systemName || key;

            // Check if it already exists to avoid overwriting user changes unless forced
            const existing = systemRepository.getSystemById(systemId);

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
            services: [],
            yearlyInitiatives: [],
            goals: [],
            definedThemes: [],
            sdms: [],
            pmts: [],
            seniorManagers: [],
            projectManagers: [], // Configurable list of PMs
            workPackages: [], // Explicitly empty
            capacityConfiguration: {
                standardSdeYears: 1.0,
                supportOverheadBytes: 0.2, // ~20% overhead default
                defaultAiProductivityGain: 0.05 // 5% default gain
            },
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
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

        // 2. Fallback: Check sampleSystemsData global (in case LocalStorage was cleared but app didn't reload)
        if (!systemData && window.sampleSystemsData && window.sampleSystemsData[systemId]) {
            console.log(`SystemService: System '${systemId}' not in storage, loading from default samples.`);
            systemData = window.sampleSystemsData[systemId];
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
        if (typeof WorkPackageService !== 'undefined') {
            WorkPackageService.ensureWorkPackagesForInitiatives(systemData);
        }

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
            if (window.notificationManager) {
                window.notificationManager.showToast("Data Inconsistency: Engineer assignments do not match global roster. See console.", "error");
            }
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
    }

};

// Export to window
if (typeof window !== 'undefined') {
    window.SystemService = SystemService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemService;
}
