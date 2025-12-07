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
    return OrgService.getTeamNameById(SystemService.getCurrentSystem(), teamId);
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
 * Adds a new initiative to SystemService.getCurrentSystem().yearlyInitiatives.
 * @param {object} initiativeData - The initiative object to add.
 * @returns {object|null} The added initiative with an ID, or null if failed.
 */
function addInitiative(initiativeData) {
    const result = InitiativeService.addInitiative(SystemService.getCurrentSystem(), initiativeData);
    if (result) console.log("Added initiative:", result);
    return result;
}

/**
 * Adds a new engineer to the global roster (`SystemService.getCurrentSystem().allKnownEngineers`).
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
    return OrgService.addEngineerToRoster(SystemService.getCurrentSystem(), engineerData);
}

/**
 * Moves an engineer to a new team (or unassigns them if newTeamId is null).
 * Updates both the engineer record and the teams' engineer arrays.
 * @param {string} engineerName
 * @param {string|null} newTeamId
 * @returns {object} The updated engineer object.
 */
function moveEngineerToTeam(engineerName, newTeamId) {
    const result = OrgService.moveEngineerToTeam(SystemService.getCurrentSystem(), engineerName, newTeamId);
    // Recalculate capacity metrics (pure data, no UI refresh)
    CapacityEngine.recalculate(SystemService.getCurrentSystem());
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
    return OrgService.addSeniorManager(SystemService.getCurrentSystem(), name);
}

function _normalizeNameForLookup(value) {
    return OrgService._normalizeNameForLookup(value);
}

function _resolveSeniorManagerIdentifier(identifier) {
    return OrgService._resolveSeniorManagerIdentifier(SystemService.getCurrentSystem(), identifier);
}

function _resolveSdmIdentifier(identifier) {
    return OrgService._resolveSdmIdentifier(SystemService.getCurrentSystem(), identifier);
}

function _resolveTeamIdentifier(identifier) {
    return OrgService._resolveTeamIdentifier(SystemService.getCurrentSystem(), identifier);
}

function addSdm(name, seniorManagerId = null) {
    return OrgService.addSdm(SystemService.getCurrentSystem(), name, seniorManagerId);
}

function updateSdm(sdmId, updates = {}) {
    return OrgService.updateSdm(SystemService.getCurrentSystem(), sdmId, updates);
}

function reassignTeamToSdm(teamIdentifier, newSdmIdentifier) {
    return OrgService.reassignTeamToSdm(SystemService.getCurrentSystem(), teamIdentifier, newSdmIdentifier);
}

function reassignSdmWithTeams(sdmIdentifier, destinationIdentifier, options = {}) {
    return OrgService.reassignSdmWithTeams(SystemService.getCurrentSystem(), sdmIdentifier, destinationIdentifier, options);
}

/**
 * Removes a senior manager from the roster and optionally reassigns their SDMs.
 * @param {string} seniorManagerId The ID of the senior manager to delete.
 * @param {string|null} reassignToSeniorManagerId Optional ID of another senior manager to reassign affected SDMs to. If omitted, SDMs become unassigned (null).
 * @returns {object} Information about the deletion.
 */
function deleteSeniorManager(seniorManagerId, reassignToSeniorManagerId = null) {
    return OrgService.deleteSeniorManager(SystemService.getCurrentSystem(), seniorManagerId, reassignToSeniorManagerId);
}

/**
 * Updates an existing initiative in SystemService.getCurrentSystem().yearlyInitiatives.
 * @param {string} initiativeId - The ID of the initiative to update.
 * @param {object} updates - An object containing the fields to update.
 * @returns {object|null} The updated initiative, or null if not found or failed.
 */
function updateInitiative(initiativeId, updates) {
    const result = InitiativeService.updateInitiative(SystemService.getCurrentSystem(), initiativeId, updates);
    if (result) console.log(`Updated initiative ${initiativeId}:`, result);
    return result;
}

/**
 * Deletes an initiative from SystemService.getCurrentSystem().yearlyInitiatives.
 * @param {string} initiativeId - The ID of the initiative to delete.
 * @returns {boolean} True if deletion was successful, false otherwise.
 */
function deleteInitiative(initiativeId) {
    const result = InitiativeService.deleteInitiative(SystemService.getCurrentSystem(), initiativeId);
    if (result) console.log(`Deleted initiative ${initiativeId}.`);
    return result;
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
 * @param {Array<object>} initiatives - The array of yearly initiatives from SystemService.getCurrentSystem().
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
