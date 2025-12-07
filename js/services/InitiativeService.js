/**
 * InitiativeService.js
 * 
 * Domain logic for managing Initiatives.
 * Handles CRUD operations and validation for the Initiative entity.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const InitiativeService = {

    /**
     * Adds a new initiative to systemData.yearlyInitiatives.
     * @param {object} systemData - The global system data object.
     * @param {object} initiativeData - The initiative object to add.
     * @returns {object|null} The added initiative with an ID, or null if failed.
     */
    addInitiative(systemData, initiativeData) {
        if (!systemData || !initiativeData || !initiativeData.title) {
            console.error("InitiativeService.addInitiative: Missing systemData or initiative data/title.");
            return null;
        }
        if (!Array.isArray(systemData.yearlyInitiatives)) {
            systemData.yearlyInitiatives = [];
        }

        // Helper to generate unique ID if not present globally or locally
        // We replicate generateUniqueId simplistic logic here or rely on passed ID if provided?
        // Ideally generateUniqueId should be a shared utility, but for now we implement logic here or expect utility access.
        // Given this is a pure service, we should ideally not depend on global utils.
        const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newInitiative = {
            initiativeId: generateId('init'),
            isProtected: false,
            assignments: [],
            roi: { category: null, valueType: null, estimatedValue: null, currency: null, timeHorizonMonths: null, confidenceLevel: null, calculationMethodology: null, businessCaseLink: null, overrideJustification: null, attributes: {} },
            status: 'Backlog', // Default status
            themes: [],
            primaryGoalId: null,
            projectManager: null,
            owner: null,
            technicalPOC: null,
            impactedServiceIds: [],
            workPackageIds: [],
            attributes: { pmCapacityNotes: "" }, // Initialize new field
            ...initiativeData // Spread provided data, allowing overrides of defaults
        };

        systemData.yearlyInitiatives.push(newInitiative);
        return newInitiative;
    },

    /**
     * Updates an existing initiative in systemData.yearlyInitiatives.
     * @param {object} systemData - The global system data object.
     * @param {string} initiativeId - The ID of the initiative to update.
     * @param {object} updates - An object containing the fields to update.
     * @returns {object|null} The updated initiative, or null if not found or failed.
     */
    updateInitiative(systemData, initiativeId, updates) {
        if (!systemData || !Array.isArray(systemData.yearlyInitiatives) || !initiativeId || !updates) {
            console.error("InitiativeService.updateInitiative: Missing systemData, initiatives, initiativeId, or updates.");
            return null;
        }
        const initiativeIndex = systemData.yearlyInitiatives.findIndex(init => init.initiativeId === initiativeId);
        if (initiativeIndex === -1) {
            console.error(`InitiativeService.updateInitiative: Initiative with ID ${initiativeId} not found.`);
            return null;
        }

        // Deep merge for nested objects like 'roi' and 'attributes' could be complex.
        // For now, preserving existing spread behavior.
        systemData.yearlyInitiatives[initiativeIndex] = {
            ...systemData.yearlyInitiatives[initiativeIndex],
            ...updates
        };

        return systemData.yearlyInitiatives[initiativeIndex];
    },

    /**
     * Deletes an initiative from systemData.yearlyInitiatives.
     * @param {object} systemData - The global system data object.
     * @param {string} initiativeId - The ID of the initiative to delete.
     * @returns {boolean} True if deletion was successful, false otherwise.
     */
    deleteInitiative(systemData, initiativeId) {
        if (!systemData || !Array.isArray(systemData.yearlyInitiatives) || !initiativeId) {
            console.error("InitiativeService.deleteInitiative: Missing systemData, initiatives, or initiativeId.");
            return false;
        }
        const initialLength = systemData.yearlyInitiatives.length;
        systemData.yearlyInitiatives = systemData.yearlyInitiatives.filter(init => init.initiativeId !== initiativeId);

        return systemData.yearlyInitiatives.length < initialLength;
    },
    /**
     * Ensures all initiatives have a consistent `planningYear` attribute,
     * deriving it from the `targetDueDate` if available, or setting a default.
     * This function modifies the initiatives in place.
     * @param {Array<object>} initiatives - The array of yearly initiatives from systemData.
     */
    ensureInitiativePlanningYears(initiatives) {
        if (!initiatives || !Array.isArray(initiatives)) {
            console.warn("InitiativeService.ensureInitiativePlanningYears: Initiatives array is invalid.");
            return;
        }

        const currentYear = new Date().getFullYear();

        initiatives.forEach(initiative => {
            if (!initiative.attributes) {
                initiative.attributes = {};
            }

            let planningYear = null;

            // 1. Derive year from targetDueDate if it exists and is valid
            if (initiative.targetDueDate) {
                try {
                    // Using luxon for robust date parsing, assuming it's available via index.html.
                    let date;
                    if (typeof luxon !== 'undefined') {
                        date = luxon.DateTime.fromISO(initiative.targetDueDate);
                        if (date.isValid) {
                            planningYear = date.year;
                        }
                    } else {
                        // Fallback to native Date if luxon is not present.
                        const nativeDate = new Date(initiative.targetDueDate + 'T00:00:00');
                        if (!isNaN(nativeDate.getTime())) {
                            planningYear = nativeDate.getFullYear();
                        }
                    }
                } catch (e) {
                    console.warn(`Could not parse targetDueDate "${initiative.targetDueDate}" for initiative ID ${initiative.initiativeId}.`, e);
                }
            }

            // 2. If no valid year could be derived, set defaults
            if (planningYear === null) {
                planningYear = currentYear;
                // Set targetDueDate to the last day of the now-assigned planning year
                initiative.targetDueDate = `${planningYear}-12-31`;
            }

            // 3. Assign the final, consistent planningYear to the initiative's attributes
            initiative.attributes.planningYear = planningYear;
        });
        console.log("Finished ensuring all initiatives have a consistent planningYear.");
    },
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InitiativeService;
}
