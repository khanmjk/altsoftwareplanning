/**
 * AIService.js
 * 
 * Domain logic for AI features and UI integration.
 * Handles AI settings validation, UI toggling, and generation stats management.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const AIService = {

    lastGenerationStats: null,

    /**
     * Updates the UI based on AI feature enablement in global settings.
     * Toggles "Create with AI" card and Chat Panel visibility.
     * @param {object} globalSettings - The current global settings object.
     * @param {object} options - Options options like { skipPlanningRender: boolean }
     */
    updateAiDependentUI(globalSettings, options = {}) {
        const { skipPlanningRender = false } = options;
        const aiEnabled = !!(globalSettings?.ai?.isEnabled);

        // Toggle the new "Create with AI" card in the welcome view
        const createWithAiCard = document.getElementById('createWithAiCard');
        if (createWithAiCard) {
            createWithAiCard.style.display = aiEnabled ? 'block' : 'none';
        }

        const chatContainer = document.getElementById('aiChatPanelContainer');
        const chatHandle = document.getElementById('chatResizeHandle');
        if (chatContainer) {
            if (aiEnabled) {
                chatContainer.style.display = 'block';
                // Check if global aiChatAssistant is available for finer control
                if (!(window.aiChatAssistant && window.aiChatAssistant.isAiChatPanelOpen && window.aiChatAssistant.isAiChatPanelOpen())) {
                    chatContainer.style.width = chatContainer.style.width || '0';
                    if (chatHandle) chatHandle.style.display = 'none';
                }
            } else {
                if (window.aiChatAssistant && window.aiChatAssistant.closeAiChatPanel) {
                    window.aiChatAssistant.closeAiChatPanel();
                }
                chatContainer.style.display = 'none';
                if (chatHandle) chatHandle.style.display = 'none';
            }
        }

        if (!skipPlanningRender && window.currentViewId === 'planningView') {
            window.renderPlanningView();
        }
    },

    /**
     * Formats AI generation stats into a readable block of text.
     * @param {object} stats 
     * @returns {string} Formatted text
     */
    formatAiStats(stats) {
        if (!stats) return "No statistics were provided.";
        const {
            inputChars = 0,
            outputChars = 0,
            outputTokens = 0,
            totalTokens = 0,
            systemPromptSummary = ''
        } = stats;

        return `Input Characters: ${inputChars.toLocaleString()}
Output Characters: ${outputChars.toLocaleString()}
Output Tokens: ${outputTokens.toLocaleString()}
Total Tokens (est.): ${totalTokens.toLocaleString()}

System Prompt Summary:
${systemPromptSummary}`.trim();
    },

    /**
     * Stores and displays the AI stats modal.
     * @param {object} stats 
     */
    showStatsModal(stats) {
        const modal = document.getElementById('aiGenerationStatsModal');
        const content = document.getElementById('aiGenerationStatsContent');

        if (!modal || !content) {
            console.warn("AIService: AI Stats modal elements not found.");
            return;
        }

        if (stats) {
            this.lastGenerationStats = stats;
        }

        if (!this.lastGenerationStats) {
            console.warn("AIService: No AI stats available to display.");
            return;
        }

        content.textContent = this.formatAiStats(this.lastGenerationStats);
        modal.style.display = 'block';
    },

    /**
     * Hides the AI stats modal.
     */
    closeStatsModal() {
        const modal = document.getElementById('aiGenerationStatsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Validates a newly generated AI system object against our core schema rules.
     * [MODIFIED] Added console logs for debugging.
     *
     * @param {object} systemData The parsed JSON object from the AI.
     * @returns {{isValid: boolean, errors: string[], warnings: string[]}}
     */
    validateGeneratedSystem(systemData) {
        console.log("[AI-VALIDATE] Starting AI System Validation...");
        const errors = [];
        const warnings = [];

        // --- 1. Top-Level Existence Checks ---
        console.log("[AI-VALIDATE] Checking top-level data structure...");
        if (!systemData || typeof systemData !== 'object' || Array.isArray(systemData)) {
            errors.push("AI returned no data or the data was not a JSON object.");
            console.error("[AI-VALIDATE] Basic structure validation FAILED. Data is not a valid object.");
            return { isValid: false, errors, warnings };
        }

        const requiredString = (key) => {
            if (!systemData[key] || typeof systemData[key] !== 'string' || systemData[key].trim() === '') {
                errors.push(`Required top-level string "${key}" is missing or empty.`);
            }
        };

        const requiredPopulatedArray = (key) => {
            if (!Array.isArray(systemData[key])) {
                errors.push(`Required field "${key}" is missing or not an array.`);
                return false; // Cannot check contents
            }
            if (systemData[key].length === 0) {
                errors.push(`Required array "${key}" must not be empty. AI must generate this data.`);
                return false;
            }
            return true; // Array exists and is populated
        };

        const optionalArray = (key) => {
            if (!Array.isArray(systemData[key])) {
                errors.push(`Field "${key}" is missing or not an array.`);
                return false;
            }
            if (systemData[key].length === 0) {
                warnings.push(`Array "${key}" is empty. AI should ideally populate this.`);
            }
            return true;
        };

        requiredString('systemName');

        const criticalArrays = [
            'teams', 'allKnownEngineers', 'services',
            'yearlyInitiatives', 'goals', 'definedThemes',
            'sdms', 'pmts', 'projectManagers'
        ];
        let canProceed = true;
        for (const key of criticalArrays) {
            if (!requiredPopulatedArray(key)) {
                canProceed = false;
            }
        }

        if (!Array.isArray(systemData.workPackages)) {
            errors.push(`Required field "workPackages" is missing or not an array.`);
            canProceed = false;
        } else if (systemData.workPackages.length === 0) {
            warnings.push(`Array "workPackages" is empty. Rule #10 (Generate Work Packages) was not fully followed.`);
        }

        if (!systemData.capacityConfiguration || typeof systemData.capacityConfiguration !== 'object') {
            errors.push(`Required field "capacityConfiguration" is missing or not an object.`);
            canProceed = false;
        }

        optionalArray('seniorManagers');

        if (!canProceed) {
            console.error("[AI-VALIDATE] Basic structure validation FAILED. Critical arrays or objects are missing.");
            return { isValid: false, errors, warnings }; // Stop if basic structure is wrong
        }
        console.log("[AI-VALIDATE] Basic structure OK.");


        // --- 2. Build Look-up Sets & Check Uniqueness (Rule #6) ---
        console.log("[AI-VALIDATE] Building look-up sets and checking uniqueness...");
        const teamIds = new Set();
        const teamNames = new Set();
        systemData.teams.forEach((team, i) => {
            if (!team.teamId) errors.push(`Team at index ${i} is missing "teamId".`);
            else if (teamIds.has(team.teamId)) errors.push(`Duplicate teamId found: ${team.teamId}`);
            else teamIds.add(team.teamId);

            if (!team.teamName) errors.push(`Team ${team.teamId || `at index ${i}`} is missing "teamName".`);
            else if (teamNames.has(team.teamName.toLowerCase())) warnings.push(`Duplicate teamName found: ${team.teamName}`);
            else teamNames.add(team.teamName.toLowerCase());
        });

        const sdmIds = new Set();
        systemData.sdms.forEach((sdm, i) => {
            if (!sdm.sdmId) errors.push(`SDM at index ${i} is missing "sdmId".`);
            else if (sdmIds.has(sdm.sdmId)) errors.push(`Duplicate sdmId found: ${sdm.sdmId}`);
            else sdmIds.add(sdm.sdmId);
        });

        const pmtIds = new Set(systemData.pmts.map(p => p.pmtId).filter(Boolean));
        const goalIds = new Set(systemData.goals.map(g => g.goalId).filter(Boolean));
        const themeIds = new Set(systemData.definedThemes.map(t => t.themeId).filter(Boolean));
        const pmIds = new Set(systemData.projectManagers.map(p => p.pmId).filter(Boolean));
        const workPackageIds = new Set(systemData.workPackages.map(wp => wp.workPackageId).filter(Boolean));

        const engineerNameMap = new Map();
        const engineerNameCheck = new Set();
        systemData.allKnownEngineers.forEach((eng, i) => {
            if (!eng.name) errors.push(`Engineer at index ${i} is missing a "name".`);
            else if (engineerNameCheck.has(eng.name.toLowerCase())) errors.push(`Duplicate engineer name found: ${eng.name}`);
            else {
                engineerNameCheck.add(eng.name.toLowerCase());
                engineerNameMap.set(eng.name, eng); // Use exact case for map key
            }
        });

        // --- 3. Relational Integrity Checks (Rule #6, 7, 9, 10) ---
        console.log("[AI-VALIDATE] Checking relational integrity (links between data)...");

        // Check Teams
        console.log(`[AI-VALIDATE] ... checking ${systemData.teams.length} Teams (SDMs, PMTs, Engineers, Capacity)...`);
        systemData.teams.forEach(team => {
            if (team.sdmId && !sdmIds.has(team.sdmId)) {
                errors.push(`Team "${team.teamName}" uses a non-existent sdmId: ${team.sdmId}`);
            }
            if (team.pmtId && !pmtIds.has(team.pmtId)) {
                errors.push(`Team "${team.teamName}" uses a non-existent pmtId: ${team.pmtId}`);
            }

            for (const engName of (team.engineers || [])) {
                if (!engineerNameMap.has(engName)) {
                    errors.push(`Team "${team.teamName}" lists an engineer "${engName}" who is not in 'allKnownEngineers'.`);
                } else {
                    const engData = engineerNameMap.get(engName);
                    if (engData.currentTeamId !== team.teamId) {
                        errors.push(`Data inconsistency: Engineer "${engName}" is in Team "${team.teamName}"'s list, but their 'currentTeamId' in 'allKnownEngineers' is "${engData.currentTeamId}".`);
                    }
                }
            }

            if (!team.teamCapacityAdjustments || typeof team.teamCapacityAdjustments !== 'object') {
                errors.push(`Team "${team.teamName}" is missing "teamCapacityAdjustments" object.`);
            } else {
                if (typeof team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE !== 'number') {
                    warnings.push(`Team "${team.teamName}" is missing "avgOverheadHoursPerWeekPerSDE".`);
                }
                if (typeof team.teamCapacityAdjustments.aiProductivityGainPercent !== 'number') {
                    warnings.push(`Team "${team.teamName}" is missing "aiProductivityGainPercent".`);
                }
            }

            if (!team.attributes || typeof team.attributes !== 'object') {
                warnings.push(`Team "${team.teamName}" is missing "attributes" object.`);
            }
        });

        // Check allKnownEngineers
        console.log(`[AI-VALIDATE] ... checking ${systemData.allKnownEngineers.length} Engineers (roster consistency)...`);
        engineerNameMap.forEach((eng, engName) => {
            if (eng.currentTeamId && !teamIds.has(eng.currentTeamId)) {
                errors.push(`Engineer "${engName}" is assigned to a non-existent teamId: ${eng.currentTeamId}`);
            }
        });

        // Check Services
        console.log(`[AI-VALIDATE] ... checking ${systemData.services.length} Services (Ownership, Dependencies, Attributes)...`);
        systemData.services.forEach(service => {
            if (service.owningTeamId && !teamIds.has(service.owningTeamId)) {
                errors.push(`Service "${service.serviceName}" is owned by a non-existent teamId: ${service.owningTeamId}`);
            }

            if (!service.serviceDependencies || service.serviceDependencies.length === 0) {
                warnings.push(`Service "${service.serviceName}" has no "serviceDependencies".`);
            }
            if (!service.platformDependencies || service.platformDependencies.length === 0) {
                warnings.push(`Service "${service.serviceName}" has no "platformDependencies".`);
            }
            if (!service.attributes || typeof service.attributes !== 'object') {
                warnings.push(`Service "${service.serviceName}" is missing "attributes" object.`);
            }
        });

        // Check Goals
        console.log(`[AI-VALIDATE] ... checking ${systemData.goals.length} Goals...`);
        systemData.goals.forEach(goal => {
            if (!goal.goalId) errors.push('A goal is missing its "goalId".');
            if (!goal.name) errors.push(`Goal "${goal.goalId}" is missing "name".`);

            if (!goal.dueDate) {
                warnings.push(`Goal "${goal.name || goal.goalId}" is missing "dueDate".`);
            }
        });

        // Check Initiatives
        console.log(`[AI-VALIDATE] ... checking ${systemData.yearlyInitiatives.length} Initiatives (Goals, Themes, Personnel, Work Packages)...`);
        systemData.yearlyInitiatives.forEach(init => {
            if (!init.initiativeId) errors.push('An initiative is missing its "initiativeId".');

            if (init.primaryGoalId && !goalIds.has(init.primaryGoalId)) {
                errors.push(`Initiative "${init.title}" uses a non-existent primaryGoalId: ${init.primaryGoalId}`);
            }

            for (const themeId of (init.themes || [])) {
                if (!themeIds.has(themeId)) {
                    errors.push(`Initiative "${init.title}" uses a non-existent themeId: ${themeId}`);
                }
            }

            for (const assignment of (init.assignments || [])) {
                if (!assignment.teamId || !teamIds.has(assignment.teamId)) {
                    errors.push(`Initiative "${init.title}" is assigned to a non-existent teamId: ${assignment.teamId || 'null'}`);
                }
            }

            const checkPersonnel = (personnel, type) => {
                if (!personnel) {
                    warnings.push(`Initiative "${init.title}" is missing "${type}".`);
                    return;
                }
                if (!personnel.type || !personnel.id || !personnel.name) {
                    errors.push(`Initiative "${init.title}" has an incomplete "${type}" object.`);
                    return;
                }
                let idSet;
                let idField = 'id';

                switch (personnel.type) {
                    case 'sdm': idSet = sdmIds; break;
                    case 'pmt': idSet = pmtIds; break;
                    case 'pm': idSet = pmIds; break;
                    case 'engineer':
                        idSet = engineerNameMap;
                        idField = 'name'; // Engineer is checked by name
                        break;
                    case 'seniorManager':
                        idSet = new Set(systemData.seniorManagers.map(sm => sm.seniorManagerId));
                        break;
                    default:
                        errors.push(`Initiative "${init.title}" has unknown personnel type "${personnel.type}" for "${type}".`);
                        return;
                }

                const idToFind = (personnel.type === 'engineer') ? personnel.name : personnel.id; // Use name for engineer, id for others
                if (!idSet.has(idToFind)) {
                    errors.push(`Initiative "${init.title}" lists a non-existent ${type}: "${personnel.name}" (ID/Name: ${idToFind}).`);
                }
            };
            checkPersonnel(init.owner, 'owner');
            checkPersonnel(init.projectManager, 'projectManager');
            checkPersonnel(init.technicalPOC, 'technicalPOC');

            if (!init.impactedServiceIds || init.impactedServiceIds.length === 0) {
                warnings.push(`Initiative "${init.title}" has no "impactedServiceIds".`);
            }

            if (!init.workPackageIds || !Array.isArray(init.workPackageIds)) {
                warnings.push(`Initiative "${init.title}" is missing "workPackageIds" array.`);
            } else if (init.workPackageIds.length > 0) {
                for (const wpId of init.workPackageIds) {
                    if (!workPackageIds.has(wpId)) {
                        errors.push(`Initiative "${init.title}" links to a non-existent workPackageId: ${wpId}`);
                    }
                }
            }
        });

        // Check Work Packages
        console.log(`[AI-VALIDATE] ... checking ${systemData.workPackages.length} Work Packages (links back to initiatives)...`);
        systemData.workPackages.forEach(wp => {
            if (!wp.initiativeId || !systemData.yearlyInitiatives.some(i => i.initiativeId === wp.initiativeId)) {
                errors.push(`WorkPackage "${wp.workPackageId}" has an invalid or missing "initiativeId": ${wp.initiativeId}`);
            }

            const parentInit = systemData.yearlyInitiatives.find(i => i.initiativeId === wp.initiativeId);
            if (parentInit && (!parentInit.workPackageIds || !parentInit.workPackageIds.includes(wp.workPackageId))) {
                errors.push(`Data inconsistency: WorkPackage "${wp.workPackageId}" links to initiative "${parentInit.title}", but the initiative does not link back to it in its "workPackageIds" array.`);
            }
        });


        // --- 4. Final Result ---
        if (errors.length > 0) {
            console.error(`[AI-VALIDATE] Validation FAILED. Errors: ${errors.length}, Warnings: ${warnings.length}`);
        } else {
            console.log(`[AI-VALIDATE] Validation PASSED. Errors: 0, Warnings: ${warnings.length}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
};

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.AIService = AIService;
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
