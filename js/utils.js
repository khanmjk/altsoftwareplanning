// Global Constants
const ALL_INITIATIVE_STATUSES = ['Backlog', 'Defined', 'Committed', 'Completed'];


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
    if (!currentSystemData) {
        throw new Error("addEngineerToRoster: currentSystemData is not loaded.");
    }
    const { name, level, attributes = {}, currentTeamId = null } = engineerData;
    if (!name || !name.trim()) {
        throw new Error("addEngineerToRoster: Engineer name is required.");
    }
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel < 1) {
        throw new Error("addEngineerToRoster: Engineer level must be a positive number.");
    }
    if (!Array.isArray(currentSystemData.allKnownEngineers)) {
        currentSystemData.allKnownEngineers = [];
    }
    const normalizedName = name.trim();
    if (currentSystemData.allKnownEngineers.some(e => e.name.toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error(`Engineer \"${normalizedName}\" already exists in the roster.`);
    }

    const sanitizedAttributes = {
        isAISWE: !!attributes.isAISWE,
        aiAgentType: attributes.isAISWE ? (attributes.aiAgentType || "General AI") : null,
        skills: Array.isArray(attributes.skills) ? attributes.skills.map(skill => skill.trim()).filter(Boolean) : [],
        yearsOfExperience: Number.isFinite(attributes.yearsOfExperience) ? attributes.yearsOfExperience : 0
    };

    const newEngineer = {
        name: normalizedName,
        level: numericLevel,
        currentTeamId: null,
        attributes: sanitizedAttributes
    };

    currentSystemData.allKnownEngineers.push(newEngineer);
    console.log("addEngineerToRoster: Added engineer to roster.", newEngineer);

    if (currentTeamId) {
        let resolvedTeamId = currentTeamId;
        if (typeof resolvedTeamId === 'string') {
            const teamIdFromLookup = _resolveTeamIdentifier(resolvedTeamId);
            if (teamIdFromLookup) {
                resolvedTeamId = teamIdFromLookup;
            }
        }
        moveEngineerToTeam(normalizedName, resolvedTeamId);
    }

    return newEngineer;
}

/**
 * Moves an engineer to a new team (or unassigns them if newTeamId is null).
 * Updates both the engineer record and the teams' engineer arrays.
 * @param {string} engineerName
 * @param {string|null} newTeamId
 * @returns {object} The updated engineer object.
 */
function moveEngineerToTeam(engineerName, newTeamId) {
    if (!currentSystemData) {
        throw new Error("moveEngineerToTeam: currentSystemData is not loaded.");
    }
    if (!engineerName || !engineerName.trim()) {
        throw new Error("moveEngineerToTeam: Engineer name is required.");
    }
    const engineer = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
    if (!engineer) {
        throw new Error(`moveEngineerToTeam: Engineer \"${engineerName}\" not found in roster.`);
    }
    let normalizedNewTeamId = newTeamId || null;
    if (normalizedNewTeamId) {
        const resolvedTeamId = _resolveTeamIdentifier(normalizedNewTeamId);
        if (resolvedTeamId) {
            normalizedNewTeamId = resolvedTeamId;
        }
    }
    const oldTeamId = engineer.currentTeamId || null;
    if (oldTeamId === normalizedNewTeamId) {
        return engineer;
    }

    if (oldTeamId) {
        const oldTeam = (currentSystemData.teams || []).find(team => team.teamId === oldTeamId);
        if (oldTeam && Array.isArray(oldTeam.engineers)) {
            oldTeam.engineers = oldTeam.engineers.filter(name => name !== engineerName);
        }
    }

    engineer.currentTeamId = normalizedNewTeamId;

    if (normalizedNewTeamId) {
        const newTeam = (currentSystemData.teams || []).find(team => team.teamId === normalizedNewTeamId);
        if (!newTeam) {
            throw new Error(`moveEngineerToTeam: Team with ID \"${normalizedNewTeamId}\" not found.`);
        }
        if (!Array.isArray(newTeam.engineers)) {
            newTeam.engineers = [];
        }
        if (!newTeam.engineers.includes(engineerName)) {
            newTeam.engineers.push(engineerName);
        }
    }

    console.log(`moveEngineerToTeam: Moved ${engineerName} to ${normalizedNewTeamId || 'Unassigned'}.`);
    return engineer;
}

/**
 * Adds a new senior manager to the organization.
 * @param {string} name - Full name of the senior manager.
 * @returns {object} Newly created senior manager object.
 */
function _generateIncrementalId(collection = [], idField, prefix) {
    const regex = new RegExp(`^${prefix}(\\d+)$`);
    let maxNumeric = 0;
    collection.forEach(item => {
        const value = item && item[idField];
        if (typeof value === 'string') {
            const match = value.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!Number.isNaN(num)) {
                    maxNumeric = Math.max(maxNumeric, num);
                }
            }
        }
    });
    return `${prefix}${maxNumeric + 1}`;
}

function addSeniorManager(name) {
    if (!currentSystemData) {
        throw new Error("addSeniorManager: currentSystemData is not loaded.");
    }
    if (!name || !name.trim()) {
        throw new Error("addSeniorManager: Senior Manager name is required.");
    }
    const normalizedName = name.trim();
    if (!Array.isArray(currentSystemData.seniorManagers)) {
        currentSystemData.seniorManagers = [];
    }
    if (currentSystemData.seniorManagers.some(s => (s.seniorManagerName || '').toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error(`Senior Manager "${normalizedName}" already exists.`);
    }

    const newSrMgr = {
        seniorManagerId: _generateIncrementalId(currentSystemData.seniorManagers, 'seniorManagerId', 'srMgr'),
        seniorManagerName: normalizedName,
        attributes: {}
    };

    currentSystemData.seniorManagers.push(newSrMgr);
    console.log("addSeniorManager: Added new Senior Manager to roster.", newSrMgr);
    return newSrMgr;
}

function _normalizeNameForLookup(value) {
    return (value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function _resolveSeniorManagerIdentifier(identifier) {
    if (!identifier) return null;
    const managers = currentSystemData?.seniorManagers || [];
    if (managers.length === 0) return null;

    const directMatch = managers.find(sm => (sm.seniorManagerId || '').toLowerCase() === String(identifier).toLowerCase());
    if (directMatch) return directMatch.seniorManagerId;

    const placeholderMatch = typeof identifier === 'string' ? identifier.match(/^{{seniorManagerId_(.+)}}$/) : null;
    if (placeholderMatch) {
        identifier = placeholderMatch[1];
    }

    const sanitizedInput = _normalizeNameForLookup(identifier.replace(/^srMgr[-_]?/i, ''));
    if (!sanitizedInput) return null;

    const nameMatch = managers.find(sm => _normalizeNameForLookup(sm.seniorManagerName) === sanitizedInput);
    return nameMatch ? nameMatch.seniorManagerId : null;
}

function _resolveSdmIdentifier(identifier) {
    if (!identifier) return null;
    const sdms = currentSystemData?.sdms || [];
    if (sdms.length === 0) return null;

    const identifierStr = String(identifier).trim();
    const directMatch = sdms.find(sdm => (sdm.sdmId || '').toLowerCase() === identifierStr.toLowerCase());
    if (directMatch) return directMatch.sdmId;

    let lookupValue = identifierStr;
    const placeholderMatch = typeof identifierStr === 'string' ? identifierStr.match(/^{{sdmId_(.+)}}$/) : null;
    if (placeholderMatch) {
        lookupValue = placeholderMatch[1];
    }

    const sanitizedInput = _normalizeNameForLookup(lookupValue);
    if (!sanitizedInput) return null;

    const matches = sdms.filter(sdm => {
        const normalizedName = _normalizeNameForLookup(sdm.sdmName);
        if (!normalizedName) return false;
        return normalizedName === sanitizedInput ||
            normalizedName.startsWith(sanitizedInput) ||
            sanitizedInput.startsWith(normalizedName);
    });

    if (matches.length === 1) {
        return matches[0].sdmId;
    }
    if (matches.length > 1) {
        console.warn(`_resolveSdmIdentifier: Ambiguous identifier "${identifierStr}". Matching IDs: ${matches.map(m => m.sdmId).join(', ')}`);
    }
    return null;
}

function _resolveTeamIdentifier(identifier) {
    if (!identifier) return null;
    const teams = currentSystemData?.teams || [];
    if (teams.length === 0) return null;

    const identifierStr = String(identifier).trim();
    const directMatch = teams.find(team => (team.teamId || '').toLowerCase() === identifierStr.toLowerCase());
    if (directMatch) return directMatch.teamId;

    let lookupValue = identifierStr;
    const placeholderMatch = typeof identifierStr === 'string' ? identifierStr.match(/^{{teamId_(.+)}}$/) : null;
    if (placeholderMatch) {
        lookupValue = placeholderMatch[1];
    }

    const sanitizedInput = _normalizeNameForLookup(lookupValue);
    if (!sanitizedInput) return null;

    const matches = teams.filter(team => {
        const normalizedIdentity = _normalizeNameForLookup(team.teamIdentity);
        const normalizedName = _normalizeNameForLookup(team.teamName);
        const candidates = [normalizedIdentity, normalizedName].filter(Boolean);
        return candidates.some(candidate =>
            candidate === sanitizedInput ||
            candidate.startsWith(sanitizedInput) ||
            sanitizedInput.startsWith(candidate)
        );
    });

    if (matches.length === 1) {
        return matches[0].teamId;
    }
    if (matches.length > 1) {
        console.warn(`_resolveTeamIdentifier: Ambiguous identifier "${identifierStr}". Matching team IDs: ${matches.map(m => m.teamId).join(', ')}`);
    }
    return null;
}

function addSdm(name, seniorManagerId = null) {
    if (!currentSystemData) {
        throw new Error("addSdm: currentSystemData is not loaded.");
    }
    if (!name || !name.trim()) {
        throw new Error("addSdm: SDM name is required.");
    }
    const normalizedName = name.trim();
    if (!Array.isArray(currentSystemData.sdms)) {
        currentSystemData.sdms = [];
    }
    if (currentSystemData.sdms.some(s => (s.sdmName || '').toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error(`SDM "${normalizedName}" already exists.`);
    }
    if (seniorManagerId && !(currentSystemData.seniorManagers || []).some(s => s.seniorManagerId === seniorManagerId)) {
        const resolvedId = _resolveSeniorManagerIdentifier(seniorManagerId);
        if (resolvedId) {
            seniorManagerId = resolvedId;
        }
    }
    if (seniorManagerId && !(currentSystemData.seniorManagers || []).some(s => s.seniorManagerId === seniorManagerId)) {
        throw new Error(`addSdm: Cannot assign to non-existent seniorManagerId "${seniorManagerId}".`);
    }

    const newSdm = {
        sdmId: _generateIncrementalId(currentSystemData.sdms, 'sdmId', 'sdm'),
        sdmName: normalizedName,
        seniorManagerId: seniorManagerId || null,
        attributes: {}
    };

    currentSystemData.sdms.push(newSdm);
    console.log("addSdm: Added new SDM to roster.", newSdm);
    return newSdm;
}

function updateSdm(sdmId, updates = {}) {
    if (!currentSystemData || !Array.isArray(currentSystemData.sdms)) {
        throw new Error("updateSdm: SDM data is not loaded.");
    }
    if (!sdmId) {
        throw new Error("updateSdm: sdmId is required.");
    }
    if (!updates || typeof updates !== 'object') {
        throw new Error("updateSdm: A valid 'updates' object is required.");
    }

    const sdmIndex = currentSystemData.sdms.findIndex(s => s.sdmId === sdmId);
    if (sdmIndex === -1) {
        throw new Error(`updateSdm: SDM with ID "${sdmId}" not found.`);
    }

    if (updates.seniorManagerId && !(currentSystemData.seniorManagers || []).some(s => s.seniorManagerId === updates.seniorManagerId)) {
        const resolvedId = _resolveSeniorManagerIdentifier(updates.seniorManagerId);
        if (resolvedId) {
            updates.seniorManagerId = resolvedId;
        }
    }
    if (updates.seniorManagerId && !(currentSystemData.seniorManagers || []).some(s => s.seniorManagerId === updates.seniorManagerId)) {
        throw new Error(`updateSdm: Cannot assign to non-existent seniorManagerId "${updates.seniorManagerId}".`);
    }

    const sdm = currentSystemData.sdms[sdmIndex];
    Object.assign(sdm, updates);
    console.log(`updateSdm: Updated SDM ${sdmId}.`, sdm);
    return sdm;
}

function reassignTeamToSdm(teamIdentifier, newSdmIdentifier) {
    if (!currentSystemData || !Array.isArray(currentSystemData.teams)) {
        throw new Error("reassignTeamToSdm: Team data is not loaded.");
    }
    if (!teamIdentifier) {
        throw new Error("reassignTeamToSdm: teamIdentifier is required.");
    }
    if (!newSdmIdentifier) {
        throw new Error("reassignTeamToSdm: newSdmIdentifier is required.");
    }

    const resolvedTeamId = _resolveTeamIdentifier(teamIdentifier);
    if (!resolvedTeamId) {
        throw new Error(`reassignTeamToSdm: Could not resolve team identifier "${teamIdentifier}".`);
    }
    const team = currentSystemData.teams.find(t => t.teamId === resolvedTeamId);
    if (!team) {
        throw new Error(`reassignTeamToSdm: Team with ID "${resolvedTeamId}" not found.`);
    }

    const resolvedSdmId = _resolveSdmIdentifier(newSdmIdentifier);
    if (!resolvedSdmId) {
        throw new Error(`reassignTeamToSdm: Could not resolve SDM identifier "${newSdmIdentifier}".`);
    }

    const previousSdmId = team.sdmId || null;
    team.sdmId = resolvedSdmId;
    console.log(`reassignTeamToSdm: Team ${team.teamIdentity || team.teamName || team.teamId} reassigned from ${previousSdmId || 'unassigned'} to ${resolvedSdmId}.`);
    return { teamId: team.teamId, previousSdmId, newSdmId: resolvedSdmId, team };
}

function reassignSdmWithTeams(sdmIdentifier, destinationIdentifier, options = {}) {
    if (!currentSystemData || !Array.isArray(currentSystemData.sdms)) {
        throw new Error("reassignSdmWithTeams: SDM data is not loaded.");
    }
    if (!sdmIdentifier) {
        throw new Error("reassignSdmWithTeams: sdmIdentifier is required.");
    }
    if (!destinationIdentifier) {
        throw new Error("reassignSdmWithTeams: destinationIdentifier is required.");
    }

    const resolvedSdmId = _resolveSdmIdentifier(sdmIdentifier);
    if (!resolvedSdmId) {
        throw new Error(`reassignSdmWithTeams: Could not resolve SDM identifier "${sdmIdentifier}".`);
    }
    const sourceSdm = (currentSystemData.sdms || []).find(sdm => sdm.sdmId === resolvedSdmId);
    if (!sourceSdm) {
        throw new Error(`reassignSdmWithTeams: SDM with ID "${resolvedSdmId}" not found.`);
    }

    let destinationType = (options.destinationType || '').toLowerCase() || null;
    let destinationSeniorManagerId = null;
    let destinationSdmId = null;

    const resolveDestinationAsSeniorManager = () => {
        const resolved = _resolveSeniorManagerIdentifier(destinationIdentifier);
        if (resolved) {
            destinationSeniorManagerId = resolved;
            destinationType = 'seniorManager';
            return true;
        }
        return false;
    };

    const resolveDestinationAsSdm = () => {
        const resolved = _resolveSdmIdentifier(destinationIdentifier);
        if (resolved) {
            destinationSdmId = resolved;
            const destSdm = (currentSystemData.sdms || []).find(sdm => sdm.sdmId === resolved);
            destinationSeniorManagerId = destSdm ? (destSdm.seniorManagerId || null) : null;
            destinationType = 'sdm';
            return true;
        }
        return false;
    };

    if (destinationType === 'seniorManager') {
        if (!resolveDestinationAsSeniorManager()) {
            throw new Error(`reassignSdmWithTeams: Destination senior manager "${destinationIdentifier}" not found.`);
        }
    } else if (destinationType === 'sdm') {
        if (!resolveDestinationAsSdm()) {
            throw new Error(`reassignSdmWithTeams: Destination SDM "${destinationIdentifier}" not found.`);
        }
    } else {
        if (!resolveDestinationAsSeniorManager()) {
            if (!resolveDestinationAsSdm()) {
                throw new Error(`reassignSdmWithTeams: Could not resolve destination identifier "${destinationIdentifier}" to an SDM or Senior Manager.`);
            }
        }
    }

    const affectedTeams = (currentSystemData.teams || []).filter(team => team.sdmId === resolvedSdmId);
    const previousSeniorManagerId = sourceSdm.seniorManagerId || null;
    sourceSdm.seniorManagerId = destinationSeniorManagerId || null;

    console.log(`reassignSdmWithTeams: SDM ${sourceSdm.sdmName} (${resolvedSdmId}) moved under ${destinationType === 'sdm' ? `SDM ${destinationSdmId}'s` : 'Senior Manager'} org. Teams moved with SDM: ${affectedTeams.length}.`);
    return {
        sdmId: resolvedSdmId,
        destinationType,
        destinationSeniorManagerId: sourceSdm.seniorManagerId,
        destinationSdmId,
        previousSeniorManagerId,
        movedTeamIds: affectedTeams.map(team => team.teamId),
        movedTeamNames: affectedTeams.map(team => team.teamIdentity || team.teamName || team.teamId)
    };
}

/**
 * Removes a senior manager from the roster and optionally reassigns their SDMs.
 * @param {string} seniorManagerId The ID of the senior manager to delete.
 * @param {string|null} reassignToSeniorManagerId Optional ID of another senior manager to reassign affected SDMs to. If omitted, SDMs become unassigned (null).
 * @returns {object} Information about the deletion.
 */
function deleteSeniorManager(seniorManagerId, reassignToSeniorManagerId = null) {
    if (!currentSystemData) {
        throw new Error("deleteSeniorManager: currentSystemData is not loaded.");
    }
    if (!seniorManagerId) {
        throw new Error("deleteSeniorManager: seniorManagerId is required.");
    }
    const srManagers = currentSystemData.seniorManagers || [];
    const index = srManagers.findIndex(sm => sm.seniorManagerId === seniorManagerId);
    if (index === -1) {
        throw new Error(`deleteSeniorManager: Senior manager with ID "${seniorManagerId}" not found.`);
    }

    if (reassignToSeniorManagerId) {
        if (!srManagers.some(sm => sm.seniorManagerId === reassignToSeniorManagerId)) {
            throw new Error(`deleteSeniorManager: Cannot reassign to non-existent seniorManagerId "${reassignToSeniorManagerId}".`);
        }
    }

    const deletedSrMgr = srManagers.splice(index, 1)[0];

    (currentSystemData.sdms || []).forEach(sdm => {
        if (sdm.seniorManagerId === seniorManagerId) {
            sdm.seniorManagerId = reassignToSeniorManagerId || null;
        }
    });

    console.log(`deleteSeniorManager: Removed senior manager ${seniorManagerId}.`, deletedSrMgr);
    return { deleted: true, seniorManager: deletedSrMgr };
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
// ROADMAP DATA UTILITIES
// =================================================================

/**
 * Helper: Determines the quarter (Q1-Q4) from a date string (YYYY-MM-DD).
 */
function getQuarterFromDate(dateString) {
    if (!dateString) return null;
    try {
        const month = parseInt(dateString.substring(5, 7), 10);
        if (month >= 1 && month <= 3) return 'Q1';
        if (month >= 4 && month <= 6) return 'Q2';
        if (month >= 7 && month <= 9) return 'Q3';
        if (month >= 10 && month <= 12) return 'Q4';
        return null;
    } catch (e) { return null; }
}

/**
 * Helper: Returns the last date of the quarter for a given year.
 * @param {string} quarter - 'Q1', 'Q2', 'Q3', 'Q4'
 * @param {number} year - The year (e.g., 2025)
 * @returns {string} Date string 'YYYY-MM-DD'
 */
function getEndDateForQuarter(quarter, year) {
    if (!quarter || !year) return null;
    switch (quarter) {
        case 'Q1': return `${year}-03-31`;
        case 'Q2': return `${year}-06-30`;
        case 'Q3': return `${year}-09-30`;
        case 'Q4': return `${year}-12-31`;
        default: return null;
    }
}

/**
 * Extracts and structures data for the Quarterly Roadmap view.
 * @param {Object} filters - { year, orgId, teamId, themeIds }
 * @returns {Object} Structured data { ThemeName: { Q1: [], Q2: [], Q3: [], Q4: [] } }
 */
function getQuarterlyRoadmapData({ year, orgId, teamId, themeIds }) {
    let initiatives = currentSystemData.yearlyInitiatives || [];

    // 1. Filter by Year
    if (year && year !== 'all') {
        initiatives = initiatives.filter(init => init.attributes.planningYear == year);
    }

    // 2. Filter by Organization
    if (orgId && orgId !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgId) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                });
            }
        });
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }

    // 3. Filter by Team
    if (teamId && teamId !== 'all') {
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamId));
    }

    // 4. Filter by Themes
    const allThemeIds = (currentSystemData.definedThemes || []).map(t => t.themeId);
    const selectedThemes = themeIds || [];
    if (selectedThemes.length > 0 && selectedThemes.length < allThemeIds.length) {
        initiatives = initiatives.filter(init => {
            const initThemes = init.themes || [];
            if (initThemes.length === 0) return false;
            return initThemes.some(themeId => selectedThemes.includes(themeId));
        });
    }

    // 5. Structure Data
    const roadmapData = {};
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));

    initiatives.forEach(init => {
        // Prioritize explicit targetQuarter (from drag-and-drop), otherwise derive from date
        const quarter = init.targetQuarter || getQuarterFromDate(init.targetDueDate);
        if (!quarter) return;

        const assignedThemes = init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];

        assignedThemes.forEach(themeId => {
            const themeName = themeMap.get(themeId) || "Uncategorized";

            if (selectedThemes.length > 0 && selectedThemes.length < allThemeIds.length && !selectedThemes.includes(themeId)) {
                return;
            }

            if (!roadmapData[themeName]) {
                roadmapData[themeName] = { Q1: [], Q2: [], Q3: [], Q4: [] };
            }
            roadmapData[themeName][quarter].push(init);
        });
    });

    return roadmapData;
}

/**
 * Extracts and structures data for the 3-Year Plan view.
 * @param {Object} filters - { orgId, teamId, themeIds }
 * @returns {Object} Structured data { ThemeName: { 'Current Year': [], 'Next Year': [], 'Future': [] } }
 */
function get3YearPlanData({ orgId, teamId, themeIds }) {
    let initiatives = currentSystemData.yearlyInitiatives || [];

    // 1. Filter by Organization
    if (orgId && orgId !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgId) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                });
            }
        });
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }

    // 2. Filter by Team
    if (teamId && teamId !== 'all') {
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamId));
    }

    // 3. Filter by Themes
    const allThemeIds = (currentSystemData.definedThemes || []).map(t => t.themeId);
    const selectedThemes = themeIds || [];
    if (selectedThemes.length > 0 && selectedThemes.length < allThemeIds.length) {
        initiatives = initiatives.filter(init => {
            const initThemes = init.themes || [];
            if (initThemes.length === 0) return false;
            return initThemes.some(themeId => selectedThemes.includes(themeId));
        });
    }

    // 4. Structure Data
    const roadmapData = {};
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
    const currentYear = new Date().getFullYear();

    initiatives.forEach(init => {
        const planningYear = init.attributes.planningYear;
        if (!planningYear) return;

        let yearBucket;
        if (planningYear === currentYear) { yearBucket = 'Current Year'; }
        else if (planningYear === currentYear + 1) { yearBucket = 'Next Year'; }
        else if (planningYear > currentYear + 1) { yearBucket = 'Future'; }
        else { return; }

        const assignedThemes = init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];
        assignedThemes.forEach(themeId => {
            const themeName = themeMap.get(themeId) || "Uncategorized";

            if (selectedThemes.length > 0 && selectedThemes.length < allThemeIds.length && !selectedThemes.includes(themeId)) {
                return;
            }

            if (!roadmapData[themeName]) {
                roadmapData[themeName] = { 'Current Year': [], 'Next Year': [], 'Future': [] };
            }
            roadmapData[themeName][yearBucket].push(init);
        });
    });

    return roadmapData;
}
