// --- Helper for Input Warnings (Phase 7a) ---
const updateInputWarning = (inputElement, message) => {
    let warningSpan = inputElement.nextElementSibling;
    // Check if the next sibling is ALREADY the warning span we created
    if (warningSpan && warningSpan.classList.contains('input-warning')) {
        // Update existing warning
        warningSpan.textContent = message ? ' ⚠️' : ''; // Show icon only if there's a message
        warningSpan.title = message || ''; // Set tooltip message
        warningSpan.style.display = message ? 'inline' : 'none'; // Hide span if no message
    } else if (message) {
        // Create NEW warning span if there's a message and no span exists
        warningSpan = document.createElement('span');
        warningSpan.className = 'input-warning';
        warningSpan.textContent = ' ⚠️';
        warningSpan.title = message;
        warningSpan.style.color = 'orange';
        warningSpan.style.cursor = 'help';
        warningSpan.style.marginLeft = '3px'; // Add a little space
        warningSpan.style.display = 'inline'; // Ensure it's visible
        // Insert the span immediately after the input element
        inputElement.parentNode.insertBefore(warningSpan, inputElement.nextSibling);
    }
     // Update the input's own title to include the warning (if any)
     // Ensure original title exists before appending
     const originalTitle = inputElement.dataset.originalTitle || '';
     inputElement.title = originalTitle + (message ? `\nWarning: ${message}` : '');
};
// --- End Helper ---

/**
 * Helper: Calculates total standard leave days per SDE for a team.
 */
function calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig) {
    if (!team || !globalLeaveTypes || !capacityConfig || !capacityConfig.leaveTypes) return 0;
    let totalEffectiveDays = 0;
    const teamUptakeEstimates = team.teamCapacityAdjustments?.leaveUptakeEstimates || [];

    globalLeaveTypes.forEach(leaveType => {
        if (!leaveType || !leaveType.id) return;
        const currentGlobalDefaultObj = capacityConfig.leaveTypes.find(lt => lt.id === leaveType.id);
        const globalDefault = currentGlobalDefaultObj ? (currentGlobalDefaultObj.defaultEstimatedDays || 0) : 0;
        const teamUptake = teamUptakeEstimates.find(est => est.leaveTypeId === leaveType.id);
        const uptakePercent = teamUptake ? (teamUptake.estimatedUptakePercent ?? 100) : 100;
        totalEffectiveDays += globalDefault * (uptakePercent / 100);
    });
    return totalEffectiveDays;
}

/**
 * Helper: Calculates total variable leave impact in TOTAL TEAM DAYS.
 */
function calculateTotalVariableLeaveDays(team) {
    if (!team || !team.teamCapacityAdjustments?.variableLeaveImpact) return 0;
    let totalTeamVariableDays = 0;
    const varLeaveImpacts = team.teamCapacityAdjustments.variableLeaveImpact;

    for (const leaveKey in varLeaveImpacts) {
        if (varLeaveImpacts.hasOwnProperty(leaveKey)) {
            const impact = varLeaveImpacts[leaveKey];
            totalTeamVariableDays += (impact?.affectedSDEs || 0) * (impact?.avgDaysPerAffectedSDE || 0);
        }
    }
    return totalTeamVariableDays;
}

/**
 * Helper: Calculates total org event days per SDE.
 */
function calculateOrgEventDaysPerSDE(capacityConfig) {
    let totalDays = 0;
    const orgEvents = capacityConfig?.globalConstraints?.orgEvents || [];
    orgEvents.forEach(event => {
        totalDays += event.estimatedDaysPerSDE || 0;
    });
    return totalDays;
}

/**
 * Helper: Calculates team activity impacts.
 * Returns an object: { daysPerSDE: total_days_from_perSDE_inputs, totalTeamDaysDuration: duration_from_total_inputs }
 * Note: Renamed totalTeamDays to totalTeamDaysDuration to better reflect user interpretation.
 */
function calculateTeamActivityImpacts(team) {
    const result = { daysPerSDE: 0, totalTeamDaysDuration: 0 }; // Renamed second property
    if (!team || !team.teamCapacityAdjustments?.teamActivities) return result;

    const teamActivities = team.teamCapacityAdjustments.teamActivities;
    teamActivities.forEach(activity => {
        const value = activity.value || 0;
        if (activity.estimateType === 'perSDE') {
            result.daysPerSDE += value;
        } else { // Default to 'total' if not 'perSDE'
            result.totalTeamDaysDuration += value; // Accumulate the duration specified
        }
    });
    return result;
}

/**
 * Helper (CORRECTED): Calculates overhead days per SDE.
 */
function calculateOverheadDaysPerSDE(team, workingDaysPerYear) {
    if (!team || !team.teamCapacityAdjustments || !workingDaysPerYear || workingDaysPerYear === 0) {
         return 0;
    }
    const hoursPerWeek = team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE || 0;
    if (hoursPerWeek === 0) return 0;
    const standardHoursPerDay = 8;
    const totalAnnualOverheadHours = hoursPerWeek * (workingDaysPerYear / 5);
    const totalOverheadDays = totalAnnualOverheadHours / standardHoursPerDay;
    return totalOverheadDays;
}

/**
 * Helper (Phase 7b): Formats the deduction breakdown object into a tooltip string.
 */
function formatDeductionTooltip(breakdown) {
    if (!breakdown) {
        return "Breakdown not available.";
    }
    // Ensure all potential keys exist, defaulting to 0
    const stdLeave = breakdown.stdLeaveYrs || 0;
    const varLeave = breakdown.varLeaveYrs || 0;
    const holidays = breakdown.holidayYrs || 0;
    const orgEvents = breakdown.orgEventYrs || 0;
    const teamActs = breakdown.teamActivityYrs || 0;
    const overhead = breakdown.overheadYrs || 0;

    // Format the string for the tooltip title attribute
    return `Breakdown (SDE Yrs):
Std Leave: ${stdLeave.toFixed(2)}
Var Leave: ${varLeave.toFixed(2)}
Holidays: ${holidays.toFixed(2)}
Org Events: ${orgEvents.toFixed(2)}
Team Acts: ${teamActs.toFixed(2)}
Overhead: ${overhead.toFixed(2)}`;
}
// --- End Helper ---

// Helper to get team name (you might already have this or similar)
function getTeamNameById(teamId) {
    if (!currentSystemData || !currentSystemData.teams) return teamId; // Fallback
    const team = currentSystemData.teams.find(t => t.teamId === teamId);
    return team ? (team.teamIdentity || team.teamName) : teamId;
}

/** Helper to create Label + Input pairs (Revised for BIS display update) */
function createInputLabelPair(id, labelText, value, type = 'text', index, field, isReadOnly = false, tooltip = null) {
    let div = document.createElement('div');
    div.style.marginBottom = '10px';
    let label = document.createElement('label');
    label.htmlFor = id;
    label.innerText = labelText;
    label.style.display = 'block';
    if (tooltip) {
        label.title = tooltip; // Add tooltip to label if provided
    }

    let inputElement; // Could be input, textarea, or span

    if (isReadOnly) {
        inputElement = document.createElement('span');
        inputElement.id = id;
        inputElement.textContent = value;
        inputElement.style.fontWeight = 'bold'; // Make read-only values stand out
        if (tooltip) {
            inputElement.title = tooltip; // Add tooltip to value span as well
        }
    } else if (type === 'textarea') {
        inputElement = document.createElement('textarea');
        inputElement.rows = 2;
        inputElement.style.width = '90%';
        inputElement.id = id;
        inputElement.value = value;
        inputElement.setAttribute('data-team-index', index);
        inputElement.setAttribute('data-field', field);
        inputElement.addEventListener('change', handleTeamInputChange); // Use generic handler
    } else { // Default to input
        inputElement = document.createElement('input');
        inputElement.type = type;
        if (type === 'number') {
            inputElement.min = 0;
             // Add step=1 for integer headcount fields if needed
             if (field === 'fundedHeadcount') inputElement.step = 1;
        }
        inputElement.style.width = '90%';
        inputElement.id = id;
        inputElement.value = value;
        inputElement.setAttribute('data-team-index', index);
        inputElement.setAttribute('data-field', field);
        inputElement.addEventListener('change', handleTeamInputChange); // Use generic handler
    }

    div.appendChild(label);
    div.appendChild(inputElement);
    return div;
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


/**
 * Custom slugify function to match the README's Table of Contents link style.
 * - Converts to lowercase
 * - Replaces spaces and multiple hyphens with a single hyphen
 * - Removes leading numbers and dots (e.g., "1. Purpose" -> "purpose")
 * - Removes most other non-alphanumeric characters except hyphens
 * - Handles ampersands by replacing with '-and-' then simplifying.
 */
function customSlugify(str) {
    if (typeof str !== 'string') return '';
    const AMPERSAND_PLACEHOLDER = '_AMPERSANDREPLACEMENT_'; // Unique placeholder

    let s = str.toString().trim()
        .toLowerCase()
        // Remove leading numbers and dots like "1. ", "2.3. "
        .replace(/^\d+(\.\d+)*\.\s*/, '')
        // Replace '&' (and surrounding spaces) with a placeholder
        .replace(/\s*&\s*/g, AMPERSAND_PLACEHOLDER)
        // Replace any remaining '&' (e.g., if no spaces like "foo&bar")
        .replace(/&/g, AMPERSAND_PLACEHOLDER)
        // Replace spaces and common punctuation with a single hyphen
        .replace(/\s+|[/\\?,:()!"“„#$'%~`´]/g, '-')
        // Remove any characters that are not word characters (letters, numbers, underscore) or hyphens.
        // (Placeholder contains underscores and letters, so it's safe as \w includes underscore)
        .replace(/[^\w-]+/g, '')
        // Replace multiple hyphens with a single hyphen
        .replace(/-+/g, '-')
        // Trim leading/trailing hyphens that might result
        .replace(/^-+|-+$/g, '');

    // Replace the placeholder with the desired double hyphen
    s = s.replace(new RegExp(AMPERSAND_PLACEHOLDER, 'g'), '--');

    return s;
}

const MIN_DOCUMENTATION_HEIGHT = 100; // Minimum height in pixels
const MAX_DOCUMENT_HEIGHT_PERCENTAGE = 0.85; // Max height as 85% of viewport height

function startDocumentationResize(event) {
    isDocumentationResizing = true;
    lastMouseY = event.clientY;
    const contentDiv = document.getElementById('documentationContent');
    originalDocumentationHeight = contentDiv.offsetHeight; // Get current actual height

    document.addEventListener('mousemove', duringDocumentationResize);
    document.addEventListener('mouseup', stopDocumentationResize);
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
    event.preventDefault(); // Prevent default drag behavior
}

function duringDocumentationResize(event) {
    if (!isDocumentationResizing) return;

    const contentDiv = document.getElementById('documentationContent');
    const deltaY = event.clientY - lastMouseY;
    // Calculate new height based on the original height when mousedown started, plus the total delta
    let newHeight = originalDocumentationHeight + (event.clientY - lastMouseY);


    // Apply constraints
    const maxPossibleHeight = window.innerHeight * MAX_DOCUMENT_HEIGHT_PERCENTAGE; // Corrected const name
    newHeight = Math.max(MIN_DOCUMENTATION_HEIGHT, newHeight); // Enforce minimum
    newHeight = Math.min(maxPossibleHeight, newHeight);     // Enforce maximum

    contentDiv.style.maxHeight = newHeight + 'px';
    // If you want to update the height based on *incremental* changes from the *last* mousemove:
    // originalDocumentationHeight = contentDiv.offsetHeight; // Update for next delta (if not using mousedown original)
    // lastMouseY = event.clientY; // Update for next delta
}

function stopDocumentationResize() {
    if (!isDocumentationResizing) return;
    isDocumentationResizing = false;
    document.removeEventListener('mousemove', duringDocumentationResize);
    document.removeEventListener('mouseup', stopDocumentationResize);
    document.body.style.userSelect = ''; // Re-enable text selection
    const contentDiv = document.getElementById('documentationContent');
    if(contentDiv){
        console.log("Documentation resize ended. New max-height:", contentDiv.style.maxHeight);
    }
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
 * This is a strict validator, not an augmenter. It checks for existence, 
 * uniqueness, and relational integrity as defined in the AI generation prompt.
 *
 * @param {object} systemData The parsed JSON object from the AI.
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}}
 */
function validateGeneratedSystem(systemData) {
    const errors = [];
    const warnings = [];

    // --- 1. Top-Level Existence Checks ---
    if (!systemData || typeof systemData !== 'object' || Array.isArray(systemData)) {
        return { isValid: false, errors: ["AI returned no data or the data was not a JSON object."], warnings };
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
    
    // Check all required arrays. If these fail, we can't do integrity checks.
    const criticalArrays = [
        'teams', 'allKnownEngineers', 'services', 
        'yearlyInitiatives', 'goals', 'definedThemes', 
        'sdms', 'pmts'
    ];
    let canProceed = true;
    for (const key of criticalArrays) {
        if (!requiredPopulatedArray(key)) {
            canProceed = false;
        }
    }
    
    // Check optional arrays (can be empty)
    optionalArray('seniorManagers');
    optionalArray('projectManagers');
    
    if (!canProceed) {
        return { isValid: false, errors, warnings }; // Stop if basic structure is wrong
    }

    // --- 2. Build Look-up Sets & Check Uniqueness (Rule #6) ---
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

    // --- 3. Relational Integrity Checks (Rule #6) ---

    // Check Teams
    systemData.teams.forEach(team => {
        if (team.sdmId && !sdmIds.has(team.sdmId)) {
            errors.push(`Team "${team.teamName}" uses a non-existent sdmId: ${team.sdmId}`);
        }
        if (team.pmtId && !pmtIds.has(team.pmtId)) {
            errors.push(`Team "${team.teamName}" uses a non-existent pmtId: ${team.pmtId}`);
        }
        
        // Check team.engineers against allKnownEngineers
        for (const engName of (team.engineers || [])) {
            if (!engineerNameMap.has(engName)) {
                errors.push(`Team "${team.teamName}" lists an engineer "${engName}" who is not in 'allKnownEngineers'.`);
            } else {
                // Check consistency: Engineer's roster must list this team
                const engData = engineerNameMap.get(engName);
                if (engData.currentTeamId !== team.teamId) {
                    errors.push(`Data inconsistency: Engineer "${engName}" is in Team "${team.teamName}"'s list, but their 'currentTeamId' in 'allKnownEngineers' is "${engData.currentTeamId}".`);
                }
            }
        }
    });

    // Check allKnownEngineers for invalid team assignments
    engineerNameMap.forEach((eng, engName) => {
        if (eng.currentTeamId && !teamIds.has(eng.currentTeamId)) {
            errors.push(`Engineer "${engName}" is assigned to a non-existent teamId: ${eng.currentTeamId}`);
        }
    });

    // Check Services
    systemData.services.forEach(service => {
        if (service.owningTeamId && !teamIds.has(service.owningTeamId)) {
            errors.push(`Service "${service.serviceName}" is owned by a non-existent teamId: ${service.owningTeamId}`);
        }
    });

    // Check Initiatives
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
    });
    
    // --- 4. Final Result ---
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}