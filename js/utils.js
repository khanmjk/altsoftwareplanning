// Global Constants
const ALL_INITIATIVE_STATUSES = ['Backlog', 'Defined', 'Committed', 'Completed'];

// =================================================================
// DEPRECATED: Capacity calculation functions moved to CapacityService.js
// The following functions are now available via CapacityService:
//   - CapacityService.calculateTotalStandardLeaveDaysPerSDE()
//   - CapacityService.calculateTotalVariableLeaveDays()
//   - CapacityService.calculateOrgEventDaysPerSDE()
//   - CapacityService.calculateTeamActivityImpacts()
//   - CapacityService.calculateOverheadDaysPerSDE()
//   - CapacityService.calculateNetCapacity()
// =================================================================


// Helper to get team name (you might already have this or similar)
function getTeamNameById(teamId) {
    return OrgService.getTeamNameById(currentSystemData, teamId);
}



/** Helper to create Dual List Selectors */
function createDualListContainer(contextIndex, leftLabel, rightLabel, currentOptions, availableOptions, leftField, rightField, moveCallback, multiSelectLeft = true, allowAddNew = false, addNewPlaceholder = '', addNewCallback = null) {
    let container = document.createElement('div');
    container.className = 'dual-list-container';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.marginBottom = '10px';

    // Left List (Current)
    let leftDiv = document.createElement('div');
    leftDiv.style.flex = '1'; leftDiv.style.marginRight = '5px';
    let currentLabel = document.createElement('label');
    currentLabel.innerText = leftLabel; currentLabel.style.display = 'block';
    let currentSelect = document.createElement('select');
    currentSelect.multiple = multiSelectLeft; currentSelect.size = 5; currentSelect.style.width = '100%';
    currentSelect.setAttribute('data-list-context-index', contextIndex);
    currentSelect.setAttribute('data-field', leftField);
    (currentOptions || []).forEach(opt => currentSelect.appendChild(new Option(opt.text, opt.value)));
    leftDiv.appendChild(currentLabel); leftDiv.appendChild(currentSelect);

    // Buttons
    let buttonsDiv = document.createElement('div');
    buttonsDiv.style.display = 'flex'; buttonsDiv.style.flexDirection = 'column'; buttonsDiv.style.alignItems = 'center'; buttonsDiv.style.margin = '0 5px';
    let removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.innerHTML = '&gt;'; removeBtn.title = 'Remove selected item(s)'; removeBtn.style.marginBottom = '5px';
    let addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.innerHTML = '&lt;'; addBtn.title = 'Add selected item(s)';

    // Right List (Available)
    let rightDiv = document.createElement('div');
    rightDiv.style.flex = '1'; rightDiv.style.marginLeft = '5px';
    let availableLabel = document.createElement('label');
    availableLabel.innerText = rightLabel; availableLabel.style.display = 'block';
    let availableSelect = document.createElement('select');
    availableSelect.multiple = true; availableSelect.size = 5; availableSelect.style.width = '100%';
    availableSelect.setAttribute('data-list-context-index', contextIndex);
    availableSelect.setAttribute('data-field', rightField);
    (availableOptions || []).forEach(opt => availableSelect.appendChild(new Option(opt.text, opt.value)));
    rightDiv.appendChild(availableLabel); rightDiv.appendChild(availableSelect);

    // Add New Item Input/Button
    let addNewContainer = null;
    if (allowAddNew && addNewCallback) {
        addNewContainer = document.createElement('div'); addNewContainer.style.marginTop = '5px'; addNewContainer.style.display = 'flex';
        let addNewInput = document.createElement('input'); addNewInput.type = 'text'; addNewInput.placeholder = addNewPlaceholder; addNewInput.style.flexGrow = '1'; addNewInput.style.marginRight = '5px';
        let addNewBtn = document.createElement('button'); addNewBtn.type = 'button'; addNewBtn.innerText = 'Add';
        addNewBtn.onclick = (e) => {
            e.preventDefault();
            const newItemData = addNewCallback(addNewInput.value); // Pass current value from input
            if (newItemData && newItemData.value && newItemData.text) {
                const exists = Array.from(availableSelect.options).some(opt => opt.value === newItemData.value) || Array.from(currentSelect.options).some(opt => opt.value === newItemData.value);
                if (!exists) { availableSelect.appendChild(new Option(newItemData.text, newItemData.value)); }
                else if (!newItemData.preventAdd) { console.warn("Item already exists in lists:", newItemData.text); }
                addNewInput.value = '';
            } else if (newItemData && newItemData.preventAdd) { addNewInput.value = ''; }
        };
        addNewContainer.appendChild(addNewInput); addNewContainer.appendChild(addNewBtn);
        rightDiv.appendChild(addNewContainer);
    }

    // Button Actions
    removeBtn.onclick = (e) => {
        e.preventDefault();
        Array.from(currentSelect.selectedOptions).forEach(option => { availableSelect.appendChild(option); moveCallback(option.value, 'remove', contextIndex); });
    };
    addBtn.onclick = (e) => {
        e.preventDefault();
        Array.from(availableSelect.selectedOptions).forEach(option => {
            if (!multiSelectLeft) {
                while (currentSelect.options.length > 0) { let existingOption = currentSelect.options[0]; availableSelect.appendChild(existingOption); moveCallback(existingOption.value, 'remove', contextIndex); }
            }
            currentSelect.appendChild(option); moveCallback(option.value, 'add', contextIndex);
        });
    };

    buttonsDiv.appendChild(addBtn); buttonsDiv.appendChild(removeBtn);
    container.appendChild(leftDiv); container.appendChild(buttonsDiv); container.appendChild(rightDiv);
    return container;
} // --- End createDualListContainer ---

/** NEW Helper Function: Creates a summary string of away-team sources */
function getSourceSummary(awayTeamMembers) {
    if (!awayTeamMembers || awayTeamMembers.length === 0) {
        return '';
    }
    const sources = awayTeamMembers
        .map(m => m.sourceTeam)
        .filter(source => source && source.trim() !== ''); // Get non-empty sources

    const uniqueSources = [...new Set(sources)]; // Get unique sources

    if (uniqueSources.length === 0) {
        return 'Unknown Source'; // Fallback if sources were empty strings
    } else if (uniqueSources.length === 1) {
        return uniqueSources[0];
    } else if (uniqueSources.length === 2) {
        return uniqueSources.join(', ');
    } else {
        return `${uniqueSources.slice(0, 1).join(', ')} & Others`; // Show first + others if more than 2
    }
}

// Generate a unique ID
function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}





// --- End Documentation Resizing Logic (Corrected Names) ---

// --- NEW CRUD functions for Initiatives ---
/**
 * Adds a new initiative to currentSystemData.yearlyInitiatives.
 * @param {object} initiativeData - The initiative object to add.
 * @returns {object|null} The added initiative with an ID, or null if failed.
 */
function addInitiative(initiativeData) {
    if (!currentSystemData || !initiativeData || !initiativeData.title) {
        console.error("addInitiative: Missing currentSystemData or initiative data/title.");
        return null;
    }
    if (!currentSystemData.yearlyInitiatives) {
        currentSystemData.yearlyInitiatives = [];
    }
    const newInitiative = {
        initiativeId: generateUniqueId('init'), // Ensure generateUniqueId can take a prefix
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
    currentSystemData.yearlyInitiatives.push(newInitiative);
    console.log("Added initiative:", newInitiative);
    return newInitiative;
}

/**
 * Adds a new engineer to the global roster (`currentSystemData.allKnownEngineers`).
 * Optionally assigns the engineer to a team by calling moveEngineerToTeam.
 * @param {object} engineerData
 * @param {string} engineerData.name
 * @param {number} engineerData.level
 * @param {object} engineerData.attributes
 * @param {boolean} [engineerData.attributes.isAISWE]
 * @param {string|null} [engineerData.attributes.aiAgentType]
 * @param {Array<string>} [engineerData.attributes.skills]
 * @param {number} [engineerData.attributes.yearsOfExperience]
 * @param {string|null} [engineerData.currentTeamId]
 * @returns {object} The newly added engineer object.
 */
function addEngineerToRoster(engineerData = {}) {
    return OrgService.addEngineerToRoster(currentSystemData, engineerData);
}

/**
 * Moves an engineer to a new team (or unassigns them if newTeamId is null).
 * Updates both the engineer record and the teams' engineer arrays.
 * @param {string} engineerName
 * @param {string|null} newTeamId
 * @returns {object} The updated engineer object.
 */
function moveEngineerToTeam(engineerName, newTeamId) {
    const result = OrgService.moveEngineerToTeam(currentSystemData, engineerName, newTeamId);
    if (typeof window.updateCapacityCalculationsAndDisplay === 'function') {
        window.updateCapacityCalculationsAndDisplay();
    }
    return result;
}

/**
 * Adds a new senior manager to the organization.
 * @param {string} name - Full name of the senior manager.
 * @returns {object} Newly created senior manager object.
 */
function _generateIncrementalId(collection = [], idField, prefix) {
    return OrgService._generateIncrementalId(collection, idField, prefix);
}

function addSeniorManager(name) {
    return OrgService.addSeniorManager(currentSystemData, name);
}

function _normalizeNameForLookup(value) {
    return OrgService._normalizeNameForLookup(value);
}

function _resolveSeniorManagerIdentifier(identifier) {
    return OrgService._resolveSeniorManagerIdentifier(currentSystemData, identifier);
}

function _resolveSdmIdentifier(identifier) {
    return OrgService._resolveSdmIdentifier(currentSystemData, identifier);
}

function _resolveTeamIdentifier(identifier) {
    return OrgService._resolveTeamIdentifier(currentSystemData, identifier);
}

function addSdm(name, seniorManagerId = null) {
    return OrgService.addSdm(currentSystemData, name, seniorManagerId);
}

function updateSdm(sdmId, updates = {}) {
    return OrgService.updateSdm(currentSystemData, sdmId, updates);
}

function reassignTeamToSdm(teamIdentifier, newSdmIdentifier) {
    return OrgService.reassignTeamToSdm(currentSystemData, teamIdentifier, newSdmIdentifier);
}

function reassignSdmWithTeams(sdmIdentifier, destinationIdentifier, options = {}) {
    return OrgService.reassignSdmWithTeams(currentSystemData, sdmIdentifier, destinationIdentifier, options);
}

/**
 * Removes a senior manager from the roster and optionally reassigns their SDMs.
 * @param {string} seniorManagerId The ID of the senior manager to delete.
 * @param {string|null} reassignToSeniorManagerId Optional ID of another senior manager to reassign affected SDMs to. If omitted, SDMs become unassigned (null).
 * @returns {object} Information about the deletion.
 */
function deleteSeniorManager(seniorManagerId, reassignToSeniorManagerId = null) {
    return OrgService.deleteSeniorManager(currentSystemData, seniorManagerId, reassignToSeniorManagerId);
}

/**
 * Updates an existing initiative in currentSystemData.yearlyInitiatives.
 * @param {string} initiativeId - The ID of the initiative to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {object|null} The updated initiative, or null if not found or failed.
 */
function updateInitiative(initiativeId, updates) {
    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !initiativeId || !updates) {
        console.error("updateInitiative: Missing currentSystemData, initiatives, initiativeId, or updates.");
        return null;
    }
    const initiativeIndex = currentSystemData.yearlyInitiatives.findIndex(init => init.initiativeId === initiativeId);
    if (initiativeIndex === -1) {
        console.error(`updateInitiative: Initiative with ID ${initiativeId} not found.`);
        return null;
    }
    // Deep merge for nested objects like 'roi' and 'attributes' could be complex.
    // For now, a simple spread will overwrite 'roi' and 'attributes' if they are in 'updates'.
    // A more robust merge would be needed for partial updates to nested objects.
    // Let's assume 'updates' provides the full new 'roi' or 'attributes' object if they are being changed.
    currentSystemData.yearlyInitiatives[initiativeIndex] = {
        ...currentSystemData.yearlyInitiatives[initiativeIndex],
        ...updates
    };
    console.log(`Updated initiative ${initiativeId}:`, currentSystemData.yearlyInitiatives[initiativeIndex]);
    return currentSystemData.yearlyInitiatives[initiativeIndex];
}

/**
 * Deletes an initiative from currentSystemData.yearlyInitiatives.
 * @param {string} initiativeId - The ID of the initiative to delete.
 * @returns {boolean} True if deletion was successful, false otherwise.
 */
function deleteInitiative(initiativeId) {
    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !initiativeId) {
        console.error("deleteInitiative: Missing currentSystemData, initiatives, or initiativeId.");
        return false;
    }
    const initialLength = currentSystemData.yearlyInitiatives.length;
    currentSystemData.yearlyInitiatives = currentSystemData.yearlyInitiatives.filter(init => init.initiativeId !== initiativeId);
    if (currentSystemData.yearlyInitiatives.length < initialLength) {
        console.log(`Deleted initiative ${initiativeId}.`);
        return true;
    }
    console.warn(`deleteInitiative: Initiative with ID ${initiativeId} not found for deletion.`);
    return false;
}

/**
 * Formats a date string (YYYY-MM-DD) to a "Q[1-4] YYYY" string.
 * Returns an empty string if the date is invalid or null.
 * @param {string|null} dateString - The date string in "YYYY-MM-DD" format.
 * @returns {string} Formatted quarter and year, or empty string.
 */
function formatDateToQuarterYear(dateString) {
    if (!dateString) {
        return "";
    }
    try {
        const date = new Date(dateString + 'T00:00:00'); // Ensure parsing as local date
        if (isNaN(date.getTime())) {
            return ""; // Invalid date
        }
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScript months are 0-indexed
        let quarter;
        if (month <= 3) {
            quarter = 1;
        } else if (month <= 6) {
            quarter = 2;
        } else if (month <= 9) {
            quarter = 3;
        } else {
            quarter = 4;
        }
        return `Q${quarter} ${year}`;
    } catch (e) {
        console.warn("Error formatting date to quarter/year:", dateString, e);
        return ""; // Invalid date format
    }
}

/**
 * Ensures all initiatives have a consistent `planningYear` attribute,
 * deriving it from the `targetDueDate` if available, or setting a default.
 * This function modifies the initiatives in place.
 * @param {Array<object>} initiatives - The array of yearly initiatives from currentSystemData.
 */
function ensureInitiativePlanningYears(initiatives) {
    if (!initiatives || !Array.isArray(initiatives)) {
        console.warn("ensureInitiativePlanningYears: Initiatives array is invalid.");
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
                    // Note: Native parsing can be inconsistent across browsers for non-standard formats.
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
}

/**
 * Validates a newly generated AI system object against our core schema rules.
 * [MODIFIED] Added console logs for debugging.
 *
 * @param {object} systemData The parsed JSON object from the AI.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}}
 */
function validateGeneratedSystem(systemData) {
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

// =================================================================
// DEPRECATED: Roadmap utility functions moved to RoadmapService.js
// The following functions are now available via RoadmapService:
//   - RoadmapService.getQuarterFromDate()
//   - RoadmapService.getEndDateForQuarter()
//   - RoadmapService.getStartDateForQuarter()
//   - RoadmapService.getYearBucket()
//   - RoadmapService.filterByOrganization()
//   - RoadmapService.filterByTeam()
//   - RoadmapService.filterByThemes()
//   - RoadmapService.filterByYear()
//   - RoadmapService.getQuarterlyRoadmapData()
//   - RoadmapService.get3YearPlanData()
// =================================================================
