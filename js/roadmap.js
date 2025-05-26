// js/roadmap.js

// Store the Tabulator instance for the roadmap table
let roadmapTable = null;

// Global variable to store the ID of the initiative being edited, or null if adding new
let currentEditingInitiativeId = null;
const ALL_INITIATIVE_STATUSES = ["Backlog", "Defined", "Committed", "In Progress", "Completed"];

// Store current filters - Default to showing ALL statuses
let currentRoadmapStatusFilters = [...ALL_INITIATIVE_STATUSES]; // Uses the existing constant

// NEW: Temporary store for team assignments in the roadmap modal
let tempRoadmapAssignments_modal = [];


/**
 * Helper function to get modal elements for the Roadmap Initiative Modal.
 * @returns {object|null} Object containing modal elements or null if not found.
 */
function getRoadmapModalElements() {
    const modal = document.getElementById('roadmapInitiativeModal');
    const titleElement = document.getElementById('addEditRoadmapInitiativeTitle_modal');
    const formElement = document.getElementById('roadmapInitiativeForm_modal');
    const saveButton = document.getElementById('saveRoadmapInitiativeButton_modal');
    const cancelButton = document.getElementById('cancelRoadmapInitiativeEditButton_modal');

    if (!modal || !titleElement || !formElement || !saveButton || !cancelButton) {
        console.error("One or more roadmap initiative modal elements are missing from the DOM.");
        return null;
    }
    return { modal, titleElement, formElement, saveButton, cancelButton };
}

/**
 * Helper function to get modal elements for the Theme Management Modal.
 * @returns {object|null} Object containing modal elements or null if not found.
 */
function getThemeManagementModalElements() {
    const modal = document.getElementById('themeManagementModal');
    const titleElement = document.getElementById('themeManagementModalTitle');
    const formElement = document.getElementById('addNewThemeForm_modal');
    const existingThemesListDiv = document.getElementById('existingThemesList');
    const saveNewThemeButton = document.getElementById('saveNewThemeButton_modal');

    if (!modal || !titleElement || !formElement || !existingThemesListDiv || !saveNewThemeButton) {
        console.error("One or more theme management modal elements are missing from the DOM.");
        return null;
    }
    return { modal, titleElement, formElement, existingThemesListDiv, saveNewThemeButton };
}

/**
 * NEW: Displays temporary team assignments in the roadmap modal.
 */
function displayTempRoadmapAssignments_modal() {
    const displayDiv = document.getElementById('roadmapInitiativeAssignmentsDisplay_modal');
    if (!displayDiv) {
        console.warn("Could not find #roadmapInitiativeAssignmentsDisplay_modal to display temp assignments.");
        return;
    }
    displayDiv.innerHTML = ''; // Clear current display

    if (tempRoadmapAssignments_modal.length === 0) {
        displayDiv.innerHTML = '<em>No teams assigned yet.</em>';
        return;
    }

    tempRoadmapAssignments_modal.forEach((assignment, index) => {
        const team = (currentSystemData.teams || []).find(t => t.teamId === assignment.teamId);
        const teamName = team ? (team.teamIdentity || team.teamName) : assignment.teamId;
        const assignmentDiv = document.createElement('div');
        assignmentDiv.style.marginBottom = '3px';
        assignmentDiv.textContent = `${teamName}: ${parseFloat(assignment.sdeYears || 0).toFixed(2)} SDE Years `;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.type = 'button'; // Prevent form submission
        removeButton.className = 'btn-danger btn-sm';
        removeButton.style.marginLeft = '10px';
        removeButton.style.fontSize = '0.8em';
        removeButton.onclick = () => {
            tempRoadmapAssignments_modal.splice(index, 1); // Remove from array
            displayTempRoadmapAssignments_modal(); // Refresh display
        };
        assignmentDiv.appendChild(removeButton);
        displayDiv.appendChild(assignmentDiv);
        assignmentDiv.classList.add('new-item-added-fade-in');
        setTimeout(() => {
            assignmentDiv.classList.remove('new-item-added-fade-in');
        }, 350);
    });
}

/**
 * NEW: Handles clicking the 'Add Assignment' button in the roadmap modal.
 */
function handleAddTeamAssignment_modal() {
    const teamSelect = document.getElementById('roadmapInitiativeTeamSelect_modal');
    const sdeYearsInput = document.getElementById('roadmapInitiativeSdeYears_modal');
    if (!teamSelect || !sdeYearsInput) {
        console.error("Team select or SDE years input not found in roadmap modal.");
        return;
    }

    const teamId = teamSelect.value;
    const sdeYears = parseFloat(sdeYearsInput.value);

    if (!teamId) {
        alert('Please select a team.');
        return;
    }
    // SDE Years can be 0 for roadmap items, indicating impact without specific effort yet.
    if (isNaN(sdeYears) || sdeYears < 0) {
        alert('Please enter a valid non-negative number for SDE Years (0 is allowed).');
        return;
    }

    const existingIndex = tempRoadmapAssignments_modal.findIndex(a => a.teamId === teamId);
    if (existingIndex > -1) {
        tempRoadmapAssignments_modal[existingIndex].sdeYears = sdeYears;
        console.log(`Updated assignment in modal for team ${teamId} to ${sdeYears}`);
    } else {
        tempRoadmapAssignments_modal.push({ teamId: teamId, sdeYears: sdeYears });
        console.log(`Added assignment in modal for team ${teamId}: ${sdeYears}`);
    }

    displayTempRoadmapAssignments_modal();
    teamSelect.selectedIndex = 0;
    sdeYearsInput.value = '0.0'; // Reset to 0.0
}


/**
 * Opens the modal for adding a new initiative.
 */
function openRoadmapModalForAdd() {
    const elements = getRoadmapModalElements();
    if (!elements) return;

    currentEditingInitiativeId = null;
    elements.titleElement.textContent = 'Add New Initiative to Backlog';
    elements.formElement.reset(); // Reset standard form inputs

    tempRoadmapAssignments_modal = []; // Clear temporary assignments

    generateRoadmapInitiativeFormFields(elements.formElement);
    displayTempRoadmapAssignments_modal(); // Display empty assignments list

    const statusSelect = document.getElementById('initiativeStatus_modal_roadmap');
    if (statusSelect) statusSelect.value = "Backlog";
    
    const addAssignmentButtonInModal = document.getElementById('addTeamAssignmentButton_modal');
    if (addAssignmentButtonInModal) {
        // Remove existing listener to prevent duplicates if modal is reopened
        addAssignmentButtonInModal.removeEventListener('click', handleAddTeamAssignment_modal);
        addAssignmentButtonInModal.addEventListener('click', handleAddTeamAssignment_modal);
    }


    elements.modal.style.display = 'block';
    const titleInput = document.getElementById('initiativeTitle_modal_roadmap');
    if (titleInput) titleInput.focus();
}

/**
 * Opens the modal for editing an existing initiative.
 * @param {string} initiativeId - The ID of the initiative to edit.
 */
function openRoadmapModalForEdit(initiativeId) {
    const elements = getRoadmapModalElements();
    if (!elements) return;

    const initiative = (currentSystemData.yearlyInitiatives || []).find(init => init.initiativeId === initiativeId);
    if (!initiative) {
        console.error("Initiative not found for editing:", initiativeId);
        alert("Error: Could not find the initiative to edit.");
        return;
    }

    currentEditingInitiativeId = initiativeId;
    elements.titleElement.textContent = `Edit Initiative: ${initiative.title || initiativeId}`;
    
    // Deep copy current assignments to temp store for editing
    tempRoadmapAssignments_modal = initiative.assignments ? JSON.parse(JSON.stringify(initiative.assignments)) : [];

    generateRoadmapInitiativeFormFields(elements.formElement); // Regenerate form structure
    populateRoadmapInitiativeForm_modal(initiative); // Populate with initiative data (excluding assignments, which are in temp)
    displayTempRoadmapAssignments_modal(); // Display the temp assignments for editing

    const addAssignmentButtonInModal = document.getElementById('addTeamAssignmentButton_modal');
     if (addAssignmentButtonInModal) {
        addAssignmentButtonInModal.removeEventListener('click', handleAddTeamAssignment_modal); // Remove old before adding new
        addAssignmentButtonInModal.addEventListener('click', handleAddTeamAssignment_modal);
    }

    elements.modal.style.display = 'block';

    const modalBody = elements.modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.scrollTop = 0;
    }

    const titleInput = document.getElementById('initiativeTitle_modal_roadmap');
    if (titleInput) {
        titleInput.focus();
    }
}


/**
 * Closes the roadmap initiative modal.
 */
function closeRoadmapModal() {
    const elements = getRoadmapModalElements();
    if (!elements || !elements.modal ) return; 
    if (elements.modal) elements.modal.style.display = 'none';
    if (elements.formElement) elements.formElement.reset();
    currentEditingInitiativeId = null;
    tempRoadmapAssignments_modal = []; // Clear temporary assignments
}

// js/roadmap.js

// Replace the existing openThemeManagementModal function with this one:

function openThemeManagementModal() {
    console.log("Attempting to open Theme Management Modal (v_refined_styles)...");

    if (!currentSystemData) { /* ... guard ... */ return; }
    if (typeof currentSystemData.definedThemes === 'undefined') { /* ... guard ... */ currentSystemData.definedThemes = []; }

    const elements = getThemeManagementModalElements();
    if (!elements || !elements.modal) { /* ... error ... */ return; }

    console.log("Theme Management Modal elements found:", elements);
    
    const modalElement = elements.modal;

    // Ensure the .modal class is present. This should be from HTML but good to double-check.
    if (!modalElement.classList.contains('modal')) {
        modalElement.classList.add('modal');
    }
    
    // Ensure the content wrapper is ready for content.
    // Its styles should primarily come from CSS.
    const contentWrapper = modalElement.querySelector('.modal-content-wrapper');
    if (contentWrapper) {
        // We might not need to set these if CSS is working correctly now that parentage is fixed.
        // Let's rely on CSS for these first.
        // contentWrapper.style.display = 'flex'; 
        // contentWrapper.style.margin = '10% auto';
        // contentWrapper.style.width = '60%'; 
        // contentWrapper.style.minHeight = '300px'; // This could be useful if content is sparse
    }

    renderThemesForManagement(); // Populate content
    
    if (elements.formElement) {
        elements.formElement.reset();
    }

    // Set display to block to make it visible
    modalElement.style.display = 'block';
    
    // Force a reflow to help ensure styles are applied before logging
    void modalElement.offsetHeight; 

    // --- Diagnostic Logging (keep this) ---
    const computedStyle = window.getComputedStyle(modalElement);
    console.log("Diagnostics for #themeManagementModal after refined open:");
    console.log(`  - Computed display: ${computedStyle.display}`);
    console.log(`  - Computed position: ${computedStyle.position}`);
    console.log(`  - offsetWidth: ${modalElement.offsetWidth}, offsetHeight: ${modalElement.offsetHeight}`);
    console.log(`  - Parent node: ${modalElement.parentNode ? modalElement.parentNode.tagName + (modalElement.parentNode.id ? '#' + modalElement.parentNode.id : '') : 'null'}`);

    const themeNameInput = document.getElementById('newThemeName_modal');
    if (themeNameInput) {
        themeNameInput.focus();
    }
    console.log("*** Opened Theme Management Modal with existing themes rendered.");
}

/**
 * Closes the Theme Management modal.
 */
function closeThemeManagementModal() {
    const elements = getThemeManagementModalElements();
    if (!elements || !elements.modal) return;
    elements.modal.style.display = 'none';
}

/**
 * Renders the list of existing themes in the Theme Management modal.
 */
function renderThemesForManagement() {
    const elements = getThemeManagementModalElements();
    if (!elements) return;

    elements.existingThemesListDiv.innerHTML = ''; // Clear current list

    const themes = currentSystemData.definedThemes || [];
    if (themes.length === 0) {
        elements.existingThemesListDiv.innerHTML = '<p><em>No themes defined yet.</em></p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.paddingLeft = '0';

    themes.forEach(theme => {
        const li = document.createElement('li');
        li.style.padding = '5px 0';
        li.style.borderBottom = '1px solid #f0f0f0';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        const themeInfo = document.createElement('span');
        themeInfo.innerHTML = `<strong>${theme.name || 'Unnamed Theme'}</strong> (ID: ${theme.themeId})`;
        if (theme.description) {
            themeInfo.innerHTML += `<br><small style="color: #555;"><em>${theme.description}</em></small>`;
        }
        li.appendChild(themeInfo);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'btn-danger btn-sm';
        deleteButton.style.marginLeft = '10px';
        deleteButton.onclick = () => handleDeleteTheme(theme.themeId);
        li.appendChild(deleteButton);

        ul.appendChild(li);
    });
    elements.existingThemesListDiv.appendChild(ul);
    console.log("*** Rendered existing themes in Theme Management modal.");
}

/**
 * Handles adding a new theme from the Theme Management modal.
 */
function handleAddNewTheme() {
    const themeNameInput = document.getElementById('newThemeName_modal');
    const themeDescriptionInput = document.getElementById('newThemeDescription_modal');

    const name = themeNameInput.value.trim();
    const description = themeDescriptionInput.value.trim();

    if (!name) {
        alert("Theme Name cannot be empty.");
        themeNameInput.focus();
        return;
    }

    if (!currentSystemData.definedThemes) {
        currentSystemData.definedThemes = [];
    }

    // Check if theme name or ID already exists
    const themeId = 'theme-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);
    if (currentSystemData.definedThemes.some(t => t.name.toLowerCase() === name.toLowerCase() || t.themeId === themeId)) {
        alert(`A theme with a similar name or generated ID already exists: "${name}"`);
        return;
    }

    const newTheme = {
        themeId: themeId,
        name: name,
        description: description,
        relatedGoalIds: [], // Default, can be edited elsewhere if needed
        attributes: {}
    };

    currentSystemData.definedThemes.push(newTheme);
    console.log("Added new theme:", newTheme);
    saveSystemChanges(); // Persist the change

    renderThemesForManagement(); // Re-render the list in the modal
    themeNameInput.value = ''; // Clear form
    themeDescriptionInput.value = '';
    themeNameInput.focus();

    // If the initiative modal is open, regenerate its form fields to update the themes multi-select
    const initiativeModalElements = getRoadmapModalElements();
    if (initiativeModalElements && initiativeModalElements.modal.style.display === 'block' && initiativeModalElements.formElement) {
        const initiativeDataForRepopulate = {}; // Placeholder, values will be re-read or form re-populated
        if (currentEditingInitiativeId) {
            const currentInit = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === currentEditingInitiativeId);
            if (currentInit) {
                // We need to preserve the currently selected values for other fields
                // A full re-populate is safer here
                generateRoadmapInitiativeFormFields(initiativeModalElements.formElement);
                populateRoadmapInitiativeForm_modal(currentInit);
            }
        } else {
            // For new initiative, just regenerate form, user will select themes.
             generateRoadmapInitiativeFormFields(initiativeModalElements.formElement);
        }
    }
}

/**
 * Handles deleting an existing theme.
 */
function handleDeleteTheme(themeIdToDelete) {
    if (!confirm(`Are you sure you want to delete theme "${themeIdToDelete}"? This will also remove it from any initiatives it's assigned to.`)) {
        return;
    }

    const themeIndex = (currentSystemData.definedThemes || []).findIndex(t => t.themeId === themeIdToDelete);
    if (themeIndex === -1) {
        alert("Theme not found for deletion.");
        return;
    }

    currentSystemData.definedThemes.splice(themeIndex, 1);

    // Remove this themeId from all initiatives
    (currentSystemData.yearlyInitiatives || []).forEach(initiative => {
        if (initiative.themes && initiative.themes.includes(themeIdToDelete)) {
            initiative.themes = initiative.themes.filter(tid => tid !== themeIdToDelete);
        }
    });

    console.log("Deleted theme:", themeIdToDelete);
    saveSystemChanges(); // Persist changes

    renderThemesForManagement(); // Re-render list in theme management modal

    // If the initiative modal is open, regenerate its form fields to update themes
    const initiativeModalElements = getRoadmapModalElements();
    if (initiativeModalElements && initiativeModalElements.modal.style.display === 'block' && initiativeModalElements.formElement) {
         if (currentEditingInitiativeId) {
            const currentInit = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === currentEditingInitiativeId);
            if (currentInit) {
                generateRoadmapInitiativeFormFields(initiativeModalElements.formElement);
                populateRoadmapInitiativeForm_modal(currentInit); // Repopulate with updated themes
            }
        } else {
             generateRoadmapInitiativeFormFields(initiativeModalElements.formElement);
        }
    }
     // Refresh the main roadmap table as theme names might have changed for some initiatives
     renderRoadmapTable();
}

/**
 * Initializes the Roadmap & Backlog view.
 * Ensures "Manage Themes" button and its modal's "Add Theme" button listeners are set up independently.
 */
function initializeRoadmapView() {
    console.log("Initializing Roadmap View (Modal version)...");
    generateRoadmapControls(); // This sets up the "Manage Themes" button and its onclick to openThemeManagementModal
    renderRoadmapTable();

    const initiativeModalElements = getRoadmapModalElements();
    if (initiativeModalElements && initiativeModalElements.formElement) {
        // Generate initiative form fields once; it will use currentSystemData.definedThemes as available
        generateRoadmapInitiativeFormFields(initiativeModalElements.formElement);
    } else {
        console.error("Cannot generate initiative form fields, modal form element not found.");
    }

    if (initiativeModalElements) {
        initiativeModalElements.saveButton.onclick = handleSaveRoadmapInitiative_modal;
    }

    // Attach listener for the Theme Management modal's "Add Theme" button
    const themeModalElements = getThemeManagementModalElements();
    if (themeModalElements && themeModalElements.saveNewThemeButton) { // Ensure the button itself exists
        themeModalElements.saveNewThemeButton.onclick = handleAddNewTheme;
    } else {
        console.error("Could not attach listener to 'Add New Theme' button in theme management modal. Button not found.");
    }

    console.log("Roadmap View Initialized with Modal and Theme Management support.");
}


/**
 * Generates filter controls and action buttons for the roadmap.
 * Includes "Manage Themes" button.
 */
function generateRoadmapControls() {
    const controlsContainer = document.getElementById('roadmapControlsContainer');
    if (!controlsContainer) {
        console.error("Roadmap controls container not found.");
        return;
    }

    controlsContainer.innerHTML = ''; // Clear existing controls

    const filterGroup = document.createElement('div');
    filterGroup.style.marginBottom = '10px';
    filterGroup.style.display = 'flex';
    filterGroup.style.flexWrap = 'wrap';
    filterGroup.style.alignItems = 'center';

    const statusLabel = document.createElement('strong');
    statusLabel.textContent = 'Filter by Status: ';
    statusLabel.style.marginRight = '10px';
    filterGroup.appendChild(statusLabel);

    const allStatusesWithAllOption = ["All", ...ALL_INITIATIVE_STATUSES];

    allStatusesWithAllOption.forEach(status => {
        const checkboxId = `roadmapStatusFilter_${status.toLowerCase().replace(/\s+/g, '')}`;
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.style.marginRight = '15px';
        checkboxWrapper.style.marginBottom = '5px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.value = status;
        checkbox.style.marginRight = '5px';

        if (status === "All") {
            checkbox.checked = currentRoadmapStatusFilters.length === ALL_INITIATIVE_STATUSES.length;
        } else {
            checkbox.checked = currentRoadmapStatusFilters.includes(status);
        }

        checkbox.addEventListener('change', (event) => {
            const changedStatus = event.target.value;
            const isChecked = event.target.checked;

            if (changedStatus === "All") {
                currentRoadmapStatusFilters = isChecked ? [...ALL_INITIATIVE_STATUSES] : [];
                ALL_INITIATIVE_STATUSES.forEach(s => {
                    const individualCheckbox = document.getElementById(`roadmapStatusFilter_${s.toLowerCase().replace(/\s+/g, '')}`);
                    if (individualCheckbox) individualCheckbox.checked = isChecked;
                });
            } else {
                if (isChecked) {
                    if (!currentRoadmapStatusFilters.includes(changedStatus)) {
                        currentRoadmapStatusFilters.push(changedStatus);
                    }
                } else {
                    currentRoadmapStatusFilters = currentRoadmapStatusFilters.filter(s => s !== changedStatus);
                }
                const allCheckbox = document.getElementById('roadmapStatusFilter_all');
                if (allCheckbox) {
                    allCheckbox.checked = currentRoadmapStatusFilters.length === ALL_INITIATIVE_STATUSES.length;
                }
            }
            renderRoadmapTable();
        });

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = status;
        label.style.fontWeight = 'normal';
        label.style.cursor = 'pointer';

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(label);
        filterGroup.appendChild(checkboxWrapper);
    });
    controlsContainer.appendChild(filterGroup);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.marginTop = '10px';

    const addNewButton = document.createElement('button');
    addNewButton.textContent = 'Add New Initiative';
    addNewButton.className = 'btn-primary';
    addNewButton.onclick = openRoadmapModalForAdd;
    actionsDiv.appendChild(addNewButton);

    const manageThemesButton = document.createElement('button');
    manageThemesButton.textContent = 'Manage Themes';
    manageThemesButton.className = 'btn-secondary';
    manageThemesButton.style.marginLeft = '10px';
    manageThemesButton.onclick = openThemeManagementModal; // This should work independently
    actionsDiv.appendChild(manageThemesButton);

    controlsContainer.appendChild(actionsDiv);
}

/**
 * Prepares and filters data for the roadmap table.
 * MODIFIED: Includes preparing display strings for assigned teams and total initial SDEs from 'assignments'.
 */
function prepareRoadmapDataForTable() {
    if (!currentSystemData || !currentSystemData.yearlyInitiatives) {
        console.warn("No current system data or yearly initiatives to prepare for roadmap table.");
        return [];
    }
    let initiatives = JSON.parse(JSON.stringify(currentSystemData.yearlyInitiatives)); 

    if (currentRoadmapStatusFilters.length > 0 && currentRoadmapStatusFilters.length < ALL_INITIATIVE_STATUSES.length) {
         initiatives = initiatives.filter(init => currentRoadmapStatusFilters.includes(init.status));
    }

    const definedThemesMap = new Map((currentSystemData.definedThemes || []).map(theme => [theme.themeId, theme.name]));
    const teamsMap = new Map((currentSystemData.teams || []).map(team => [team.teamId, team.teamIdentity || team.teamName]));

    return initiatives.map(init => {
        const ownerName = init.owner && init.owner.name ? init.owner.name : 'N/A';
        const roiCategory = init.roi && init.roi.category ? init.roi.category : '';
        const roiValue = init.roi && init.roi.estimatedValue ? init.roi.estimatedValue : '';
        let roiSummaryDisplay = 'N/A';
        if (roiCategory && roiValue) {
            roiSummaryDisplay = `${roiCategory}: ${roiValue}`;
            if (init.roi.valueType === 'Monetary' && init.roi.currency) {
                roiSummaryDisplay += ` ${init.roi.currency}`;
            }
        } else if (roiCategory) {
            roiSummaryDisplay = roiCategory;
        } else if (roiValue) {
            roiSummaryDisplay = String(roiValue);
        }

        const cleanTargetDueDate = (init.targetDueDate && String(init.targetDueDate).trim() !== "") ? String(init.targetDueDate).trim() : null;
        const themeNames = (init.themes || [])
            .map(themeId => definedThemesMap.get(themeId) || themeId) 
            .join(', ');

        // NEW: Prepare display for assigned teams and total SDEs
        let assignedTeamsDisplay = "None";
        let totalInitialSdes = 0;
        if (init.assignments && init.assignments.length > 0) {
            assignedTeamsDisplay = init.assignments
                .map(assign => teamsMap.get(assign.teamId) || assign.teamId)
                .join(', ');
            totalInitialSdes = init.assignments.reduce((sum, assign) => sum + (parseFloat(assign.sdeYears) || 0), 0);
        }

        return {
            ...init, 
            id: init.initiativeId, 
            targetDueDate: cleanTargetDueDate,
            ownerDisplay: ownerName,
            roiSummaryDisplay: roiSummaryDisplay,
            targetQuarterYearDisplay: formatDateToQuarterYear(cleanTargetDueDate),
            themeNamesDisplay: themeNames,
            assignedTeamsDisplay: assignedTeamsDisplay, // NEW
            totalInitialSdesDisplay: totalInitialSdes.toFixed(2) // NEW
        };
    });
}

/**
 * Defines columns for the roadmap table.
 * MODIFIED: Added columns for "Assigned Teams" and "Total Initial SDEs".
 */
function defineRoadmapTableColumns() {
    const columns = [
        {
            title: "Title", field: "title", minWidth: 200, headerFilter: "input", frozen:true,
            tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "Description", field: "description", minWidth: 250, hozAlign: "left",
            formatter: "textarea", headerFilter: "input", tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "Status", field: "status", width: 110, headerFilter: "list",
            headerFilterParams: { values: ["", ...ALL_INITIATIVE_STATUSES], clearable: true, autocomplete: true },
            headerFilterFunc: "="
        },
        // NEW: Assigned Teams Column
        {
            title: "Assigned Teams", field: "assignedTeamsDisplay", minWidth: 180, headerFilter: "input",
            tooltip: (e, cell) => cell.getValue() || "N/A",
            formatter: "textarea" // Allow multiline if many teams
        },
        // NEW: Total Initial SDEs Column
        {
            title: "SDE/Yr Estimates", field: "totalInitialSdesDisplay", width: 100, hozAlign: "center", headerFilter: "input", sorter: "number",
            tooltip: (e, cell) => `Total initial SDE estimate: ${cell.getValue()}`
        },
        {
            title: "Owner", field: "ownerDisplay", width: 140, headerFilter: "input",
            tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "ROI Summary", field: "roiSummaryDisplay", minWidth: 180, hozAlign: "left",
            tooltip: function(e, cell){ return cell.getValue(); },
            headerFilter: "input", headerFilterPlaceholder: "Filter ROI..."
        },
        {
            title: "ROI Type", field: "roi.valueType", minWidth: 120, hozAlign: "left",
            headerFilter: "input", tooltip: (e, cell) => cell.getValue() || "N/A",
        },
        {
            title: "Target Quarter/Yr", field: "targetQuarterYearDisplay", width: 110, hozAlign: "center",
            tooltip: function(e, cell){ return cell.getValue() || "N/A"; }, headerFilter: "input",
            sorter: function(a, b, aRow, bRow, column, dir, sorterParams){ /* ... sorter logic ... */
                const date_a_str = aRow.getData().targetDueDate;
                const date_b_str = bRow.getData().targetDueDate;
                let date_a = null;
                if (date_a_str && typeof date_a_str === 'string' && date_a_str.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const parsedA = luxon.DateTime.fromISO(date_a_str);
                    if (parsedA.isValid) date_a = parsedA;
                }
                let date_b = null;
                if (date_b_str && typeof date_b_str === 'string' && date_b_str.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const parsedB = luxon.DateTime.fromISO(date_b_str);
                    if (parsedB.isValid) date_b = parsedB;
                }
                const aIsNull = (date_a === null); const bIsNull = (date_b === null);
                if (aIsNull && bIsNull) return 0; if (aIsNull) return 1; if (bIsNull) return -1;
                return date_a.valueOf() - date_b.valueOf();
            }
        },
        {
            title: "Target Due Date", field: "targetDueDate", width: 110, hozAlign: "center",
            tooltip: function(e, cell){ return cell.getValue() ? cell.getValue() : "Not set"; },
            headerFilter: "input", headerFilterPlaceholder: "YYYY-MM-DD",
            sorter: function(a, b, aRow, bRow, column, dir, sorterParams) { /* ... sorter logic ... */
                const val_a = a; const val_b = b;
                let dateA = null;
                if (val_a && typeof val_a === 'string' && val_a.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const parsedA = luxon.DateTime.fromISO(val_a);
                    if (parsedA.isValid) dateA = parsedA;
                }
                let dateB = null;
                if (val_b && typeof val_b === 'string' && val_b.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const parsedB = luxon.DateTime.fromISO(val_b);
                    if (parsedB.isValid) dateB = parsedB;
                }
                const aIsNull = (dateA === null); const bIsNull = (dateB === null);
                if (aIsNull && bIsNull) return 0; if (aIsNull) return 1; if (bIsNull) return -1;
                return dateA.valueOf() - dateB.valueOf();
            }
        },
        {
            title: "Themes", field: "themeNamesDisplay", minWidth: 150,
            formatter: (cell) => cell.getValue() || "", headerFilter: "input",
            tooltip: function(e, cell){ return cell.getValue() || "N/A"; }, sorter: "string"
        },
        {
            title: "Actions", width: 120, hozAlign: "center", headerSort: false,
            formatter: (cell) => {
                const initiativeId = cell.getRow().getData().id;
                const editButton = `<button class="btn-secondary btn-sm" onclick="openRoadmapModalForEdit('${initiativeId}')">Edit</button>`;
                const deleteButton = `<button class="btn-danger btn-sm" style="margin-left:5px;" onclick="handleDeleteInitiativeButtonFromTable('${initiativeId}')">Del</button>`;
                return editButton + deleteButton;
            }
        }
    ];

    const roiFields = ["category", "currency", "timeHorizonMonths", "confidenceLevel", "calculationMethodology", "businessCaseLink", "overrideJustification"];
    roiFields.forEach(field => {
        columns.push({
            title: `ROI: ${field.replace(/([A-Z])/g, ' $1').trim()}`,
            field: `roi.${field}`, visible: false, minWidth:150,
            headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); }
        });
    });
    columns.push({
        title: "ROI: Estimated Value", field: "roi.estimatedValue", visible: false, minWidth: 150,
        headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); }
    });
    columns.push({ title: "PM Capacity Notes", field: "attributes.pmCapacityNotes", visible: false, minWidth: 200, headerFilter: "input", formatter: "textarea", download: true, tooltip: function(e, cell){ return cell.getValue(); } });
    columns.push({ title: "Primary Goal ID", field: "primaryGoalId", visible: false, minWidth: 150, headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); } });
    columns.push({ title: "Project Manager", field: "projectManager.name", visible: false, minWidth: 150, headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); } });

    return columns;
}

/**
 * Renders the roadmap table using Tabulator.
 * (Uses fitColumns layout)
 */
function renderRoadmapTable() {
    const tableContainer = document.getElementById('roadmapTableContainer');
    if (!tableContainer) {
        console.error("Roadmap table container not found for rendering.");
        return;
    }

    const tableData = prepareRoadmapDataForTable();
    const columnDefinitions = defineRoadmapTableColumns();

    const tabulatorOptions = {
        data: tableData,
        columns: columnDefinitions,
        layout: "fitColumns", // << CHANGED layout to fitColumns
        responsiveLayout: "hide",
        pagination: "local",
        paginationSize: 30,
        paginationSizeSelector: [10, 15, 25, 50, 75, 100],
        movableColumns: true,
        initialSort: [{ column: "title", dir: "asc" }],
        placeholder: "No initiatives match the current filters.",
        headerVisible: true,
    };

    if (typeof EnhancedTableWidget === 'function') {
        if (roadmapTable && typeof roadmapTable.destroy === 'function') {
            roadmapTable.destroy();
        }
        roadmapTable = new EnhancedTableWidget(tableContainer, {
            ...tabulatorOptions, // Spread the common options
            uniqueIdField: 'id', // Specific to EnhancedTableWidget if it uses it
            exportCsvFileName: 'roadmap_initiatives.csv',
            exportJsonFileName: 'roadmap_initiatives.json',
            exportXlsxFileName: 'roadmap_initiatives.xlsx',
            exportSheetName: 'Roadmap Initiatives'
        });
         console.log("Roadmap table rendered using EnhancedTableWidget with fitColumns layout.");
    } else {
        console.warn("EnhancedTableWidget not found, falling back to direct Tabulator for roadmap.");
         if (roadmapTable && typeof roadmapTable.destroy === 'function') {
            roadmapTable.destroy();
        }
        roadmapTable = new Tabulator(tableContainer, {
            ...tabulatorOptions, // Spread the common options
            height: "600px", // May need to set height if not using EnhancedTableWidget's auto-height logic
        });
        console.log("Roadmap table rendered using direct Tabulator with fitColumns layout.");
    }
}

/**
 * Generates the HTML structure for the Add/Edit Initiative form fields
 * INSIDE the provided formElement (which is the modal's form).
 * MODIFIED: Themes input changed to multi-select.
 * MODIFIED AGAIN: Replaced Impacted Service IDs with a Team Assignments section.
 */
function generateRoadmapInitiativeFormFields(formElement) {
    if (!formElement) {
        console.error("Form element for roadmap initiative not provided.");
        return;
    }
    formElement.innerHTML = ''; // Clear existing form content

    // Helper to create form group
    const createFormGroup = (labelText, idSuffix, inputType = 'text', options = null, value = '', placeholder = '', multiple = false) => {
        const elementId = `${idSuffix}_modal_roadmap`; // Unique ID for modal elements
        const div = document.createElement('div');
        div.style.marginBottom = '12px';

        const label = document.createElement('label');
        label.htmlFor = elementId;
        label.textContent = labelText;
        label.style.display = 'block';
        label.style.marginBottom = '4px';
        label.style.fontWeight = '500';
        div.appendChild(label);

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else if (inputType === 'select') {
            input = document.createElement('select');
            if (multiple) {
                input.multiple = true;
                input.size = Math.min(5, (options || []).length + 1); // +1 for potential placeholder
                input.style.height = 'auto'; 
            }
            if (options) {
                options.forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt.value;
                    optionEl.textContent = opt.text;
                    input.appendChild(optionEl);
                });
            }
        } else {
            input = document.createElement('input');
            input.type = inputType;
        }
        input.id = elementId;
        input.name = elementId; // Ensure name attribute is set for form.elements access
        input.className = 'form-control'; 
        if (placeholder) input.placeholder = placeholder;

        div.appendChild(input);
        return div;
    };

    // Main Initiative Details Section
    const mainDetailsFieldset = document.createElement('fieldset');
    mainDetailsFieldset.style.border = '1px solid #ddd'; mainDetailsFieldset.style.padding = '10px'; mainDetailsFieldset.style.marginBottom = '15px';
    const mainLegend = document.createElement('legend'); mainLegend.textContent = 'Core Details'; mainLegend.style.fontWeight = 'bold';
    mainDetailsFieldset.appendChild(mainLegend);
    mainDetailsFieldset.appendChild(createFormGroup('Title:', 'initiativeTitle', 'text'));
    mainDetailsFieldset.appendChild(createFormGroup('Description:', 'initiativeDescription', 'textarea'));
    const statusOptions = ALL_INITIATIVE_STATUSES.map(s => ({ value: s, text: s }));
    mainDetailsFieldset.appendChild(createFormGroup('Status:', 'initiativeStatus', 'select', statusOptions));
    mainDetailsFieldset.appendChild(createFormGroup('Target Due Date:', 'initiativeTargetDueDate', 'date'));
    mainDetailsFieldset.appendChild(createFormGroup('PM Capacity/Team Notes:', 'initiativePmCapacityNotes', 'textarea'));
    formElement.appendChild(mainDetailsFieldset);

    // Strategic Alignment Section
    const strategicFieldset = document.createElement('fieldset');
    strategicFieldset.style.border = '1px solid #ddd'; strategicFieldset.style.padding = '10px'; strategicFieldset.style.marginBottom = '15px';
    const strategicLegend = document.createElement('legend'); strategicLegend.textContent = 'Strategic Alignment'; strategicLegend.style.fontWeight = 'bold';
    strategicFieldset.appendChild(strategicLegend);

    const currentDefinedThemes = currentSystemData.definedThemes || [];
    const themeOptions = currentDefinedThemes.map(theme => ({
        value: theme.themeId,
        text: `${theme.name} (${theme.themeId.slice(0,10)}...)`
    }));

    if (themeOptions.length === 0) {
        const themesHelpText = document.createElement('p');
        themesHelpText.innerHTML = '<em>No themes defined. Use the "Manage Themes" button on the roadmap page to add themes.</em>';
        themesHelpText.style.fontSize = '0.9em'; themesHelpText.style.color = '#555';
        const themesGroup = createFormGroup('Themes:', 'initiativeThemes', 'text', null, '', 'No themes defined.');
        const themesTextInput = themesGroup.querySelector('input');
        if (themesTextInput) {
            themesTextInput.disabled = true; 
            themesTextInput.style.display = 'none';
            themesTextInput.parentNode.insertBefore(themesHelpText, themesTextInput.nextSibling);
        }
        strategicFieldset.appendChild(themesGroup);
    } else {
        strategicFieldset.appendChild(createFormGroup('Themes:', 'initiativeThemes', 'select', themeOptions, '', '', true));
    }
    const goalOptions = [{value: "", text:"-- None --"}].concat((currentSystemData.goals || []).map(g => ({ value: g.goalId, text: g.name })));
    strategicFieldset.appendChild(createFormGroup('Primary Goal:', 'initiativePrimaryGoalId', 'select', goalOptions));
    const personnelOptionsForOwner = [{value: "", text: "-- Select Owner --"}];
    (currentSystemData.sdms || []).forEach(p => personnelOptionsForOwner.push({value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)`}));
    (currentSystemData.pmts || []).forEach(p => personnelOptionsForOwner.push({value: `pmt:${p.pmtId}`, text: `${p.pmtName} (PMT)`}));
    (currentSystemData.seniorManagers || []).forEach(p => personnelOptionsForOwner.push({value: `seniorManager:${p.seniorManagerId}`, text: `${p.seniorManagerName} (Sr. Mgr)`}));
    strategicFieldset.appendChild(createFormGroup('Owner:', 'initiativeOwner', 'select', personnelOptionsForOwner));
    const pmOptions = [{value: "", text: "-- Select Project Manager --"}].concat((currentSystemData.projectManagers || []).map(p => ({ value: `projectManager:${p.pmId}`, text: p.pmName })));
    strategicFieldset.appendChild(createFormGroup('Project Manager:', 'initiativeProjectManager', 'select', pmOptions));
    formElement.appendChild(strategicFieldset);

    // ROI Details Section
    const roiFieldset = document.createElement('fieldset');
    roiFieldset.style.border = '1px solid #ddd'; roiFieldset.style.padding = '10px'; roiFieldset.style.marginBottom = '15px';
    const roiLegend = document.createElement('legend'); roiLegend.textContent = 'ROI Details'; roiLegend.style.fontWeight = 'bold';
    roiFieldset.appendChild(roiLegend);
    roiFieldset.appendChild(createFormGroup('Category:', 'roiCategory', 'text'));
    roiFieldset.appendChild(createFormGroup('Value Type:', 'roiValueType', 'text'));
    roiFieldset.appendChild(createFormGroup('Estimated Value:', 'roiEstimatedValue', 'text'));
    roiFieldset.appendChild(createFormGroup('Currency:', 'roiCurrency', 'text'));
    roiFieldset.appendChild(createFormGroup('Time Horizon (Months):', 'roiTimeHorizonMonths', 'number'));
    roiFieldset.appendChild(createFormGroup('Confidence Level:', 'roiConfidenceLevel', 'text'));
    roiFieldset.appendChild(createFormGroup('Calculation Methodology:', 'roiCalculationMethodology', 'textarea'));
    roiFieldset.appendChild(createFormGroup('Business Case Link (URL):', 'roiBusinessCaseLink', 'text'));
    roiFieldset.appendChild(createFormGroup('Override Justification:', 'roiOverrideJustification', 'textarea'));
    formElement.appendChild(roiFieldset);
    
    // NEW: Team Assignments Section
    const teamAssignmentsFieldset = document.createElement('fieldset');
    teamAssignmentsFieldset.style.border = '1px solid #ddd';
    teamAssignmentsFieldset.style.padding = '10px';
    teamAssignmentsFieldset.style.marginBottom = '15px';
    const assignmentsLegend = document.createElement('legend');
    assignmentsLegend.textContent = 'Team Assignments (Effort)';
    assignmentsLegend.style.fontWeight = 'bold';
    teamAssignmentsFieldset.appendChild(assignmentsLegend);

    const assignmentsDisplayDiv = document.createElement('div');
    assignmentsDisplayDiv.id = 'roadmapInitiativeAssignmentsDisplay_modal'; // Unique ID for modal
    assignmentsDisplayDiv.style.marginBottom = '10px';
    assignmentsDisplayDiv.style.minHeight = '30px';
    assignmentsDisplayDiv.style.backgroundColor = '#f8f9fa';
    assignmentsDisplayDiv.style.padding = '8px';
    assignmentsDisplayDiv.style.border = '1px solid #eee';
    assignmentsDisplayDiv.style.borderRadius = '4px';
    teamAssignmentsFieldset.appendChild(assignmentsDisplayDiv);

    const assignmentControlsDiv = document.createElement('div');
    assignmentControlsDiv.style.display = 'flex';
    assignmentControlsDiv.style.alignItems = 'center';
    assignmentControlsDiv.style.gap = '10px'; // Adds space between items

    const teamSelectLabel = document.createElement('label');
    teamSelectLabel.htmlFor = 'roadmapInitiativeTeamSelect_modal';
    teamSelectLabel.textContent = 'Team:';
    assignmentControlsDiv.appendChild(teamSelectLabel);

    const teamSelect = document.createElement('select');
    teamSelect.id = 'roadmapInitiativeTeamSelect_modal';
    teamSelect.className = 'form-control'; // Apply consistent styling
    teamSelect.style.flexGrow = '1'; // Allow select to take available space
    const defaultTeamOption = document.createElement('option');
    defaultTeamOption.value = "";
    defaultTeamOption.textContent = "-- Select Team --";
    teamSelect.appendChild(defaultTeamOption);
    (currentSystemData.teams || []).forEach(team => {
        const option = document.createElement('option');
        option.value = team.teamId;
        option.textContent = team.teamIdentity || team.teamName || team.teamId;
        teamSelect.appendChild(option);
    });
    assignmentControlsDiv.appendChild(teamSelect);

    const sdeYearsLabel = document.createElement('label');
    sdeYearsLabel.htmlFor = 'roadmapInitiativeSdeYears_modal';
    sdeYearsLabel.textContent = 'SDE Years:';
    assignmentControlsDiv.appendChild(sdeYearsLabel);

    const sdeYearsInput = document.createElement('input');
    sdeYearsInput.type = 'number';
    sdeYearsInput.id = 'roadmapInitiativeSdeYears_modal';
    sdeYearsInput.className = 'form-control';
    sdeYearsInput.step = '0.1'; // Finer granularity
    sdeYearsInput.min = '0';
    sdeYearsInput.placeholder = 'e.g., 0.5';
    sdeYearsInput.value = '0.0'; // Default to 0
    sdeYearsInput.style.width = '100px';
    assignmentControlsDiv.appendChild(sdeYearsInput);

    const addAssignmentButton = document.createElement('button');
    addAssignmentButton.type = 'button'; // Important to prevent form submission
    addAssignmentButton.id = 'addTeamAssignmentButton_modal'; // Unique ID
    addAssignmentButton.textContent = 'Add/Update Assignment';
    addAssignmentButton.className = 'btn-secondary'; // Secondary button style
    assignmentControlsDiv.appendChild(addAssignmentButton);
    
    teamAssignmentsFieldset.appendChild(assignmentControlsDiv);
    formElement.appendChild(teamAssignmentsFieldset);
    // END NEW: Team Assignments Section

    // Remove original impactedServiceIds text input field generation
    // formElement.appendChild(createFormGroup('Impacted Service IDs (comma-separated):', 'initiativeImpactedServiceIds', 'text', null, '', 'e.g., service-id1,service-id2'));

    console.log("Roadmap initiative form fields generated into modal with Team Assignments section.");
}

/**
 * Populates the Add/Edit modal form with data from an existing initiative.
 * MODIFIED: To handle multi-select for themes.
 * MODIFIED AGAIN: To handle Team Assignments section.
 */
function populateRoadmapInitiativeForm_modal(initiative) {
    if (!initiative) return;
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) return;
    const form = modalElements.formElement;

    // Populate standard fields
    form.elements['initiativeTitle_modal_roadmap'].value = initiative.title || '';
    form.elements['initiativeDescription_modal_roadmap'].value = initiative.description || '';
    form.elements['initiativeStatus_modal_roadmap'].value = initiative.status || 'Backlog';
    form.elements['initiativeTargetDueDate_modal_roadmap'].value = initiative.targetDueDate || '';
    form.elements['initiativePmCapacityNotes_modal_roadmap'].value = initiative.attributes?.pmCapacityNotes || '';
    
    const themesSelect = form.elements['initiativeThemes_modal_roadmap'];
    if (themesSelect && themesSelect.type === 'select-multiple') {
        const initiativeThemeIds = initiative.themes || [];
        for (let i = 0; i < themesSelect.options.length; i++) {
            themesSelect.options[i].selected = initiativeThemeIds.includes(themesSelect.options[i].value);
        }
    } else if (themesSelect) { 
        themesSelect.value = (initiative.themes || []).join(', ');
    }
    
    form.elements['initiativePrimaryGoalId_modal_roadmap'].value = initiative.primaryGoalId || '';

    // Populate owner and projectManager
    if (initiative.owner && initiative.owner.type && initiative.owner.id) {
        form.elements['initiativeOwner_modal_roadmap'].value = `${initiative.owner.type}:${initiative.owner.id}`;
    } else {
        form.elements['initiativeOwner_modal_roadmap'].value = "";
    }
    if (initiative.projectManager && initiative.projectManager.type && initiative.projectManager.id) {
       form.elements['initiativeProjectManager_modal_roadmap'].value = `${initiative.projectManager.type}:${initiative.projectManager.id}`;
    } else {
        form.elements['initiativeProjectManager_modal_roadmap'].value = "";
    }

    // Populate ROI fields
    const roi = initiative.roi || {};
    form.elements['roiCategory_modal_roadmap'].value = roi.category || '';
    form.elements['roiValueType_modal_roadmap'].value = roi.valueType || '';
    form.elements['roiEstimatedValue_modal_roadmap'].value = roi.estimatedValue !== null && roi.estimatedValue !== undefined ? roi.estimatedValue : '';
    form.elements['roiCurrency_modal_roadmap'].value = roi.currency || '';
    form.elements['roiTimeHorizonMonths_modal_roadmap'].value = roi.timeHorizonMonths !== null && roi.timeHorizonMonths !== undefined ? roi.timeHorizonMonths : '';
    form.elements['roiConfidenceLevel_modal_roadmap'].value = roi.confidenceLevel || '';
    form.elements['roiCalculationMethodology_modal_roadmap'].value = roi.calculationMethodology || '';
    form.elements['roiBusinessCaseLink_modal_roadmap'].value = roi.businessCaseLink || '';
    form.elements['roiOverrideJustification_modal_roadmap'].value = roi.overrideJustification || '';
    
    // Note: The actual display of assignments is handled by displayTempRoadmapAssignments_modal
    // which reads from tempRoadmapAssignments_modal. This temp store is populated in openRoadmapModalForEdit.
}

/**
 * Handles saving the initiative (add or edit) from the modal.
 * MODIFIED: To read from multi-select for themes.
 * MODIFIED AGAIN: To use tempRoadmapAssignments_modal for team assignments.
 */
function handleSaveRoadmapInitiative_modal() {
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) {
        console.error("Roadmap initiative modal form not found for saving.");
        return;
    }
    const form = modalElements.formElement;

    let selectedThemeIds = [];
    const themesSelect = form.elements['initiativeThemes_modal_roadmap'];
    if (themesSelect && themesSelect.type === 'select-multiple') {
        for (let i = 0; i < themesSelect.options.length; i++) {
            if (themesSelect.options[i].selected) {
                selectedThemeIds.push(themesSelect.options[i].value);
            }
        }
    } else if (themesSelect) { 
        selectedThemeIds = themesSelect.value.split(',').map(t => t.trim()).filter(t => t);
    }

    // Get assignments from the temporary store
    const initiativeAssignments = JSON.parse(JSON.stringify(tempRoadmapAssignments_modal));

    const initiativeData = {
        title: form.elements['initiativeTitle_modal_roadmap'].value.trim(),
        description: form.elements['initiativeDescription_modal_roadmap'].value.trim(),
        status: form.elements['initiativeStatus_modal_roadmap'].value,
        targetDueDate: form.elements['initiativeTargetDueDate_modal_roadmap'].value || null,
        themes: selectedThemeIds,
        primaryGoalId: form.elements['initiativePrimaryGoalId_modal_roadmap'].value || null,
        assignments: initiativeAssignments, // Use the assignments from the modal's temp store
        impactedServiceIds: [], // Keep as per earlier decision if still needed, or remove. For now, setting to empty.
                                // If you still need to manage impactedServiceIds distinctly, add a UI for it.
        roi: {
            category: form.elements['roiCategory_modal_roadmap'].value.trim() || null,
            valueType: form.elements['roiValueType_modal_roadmap'].value.trim() || null,
            estimatedValue: form.elements['roiEstimatedValue_modal_roadmap'].value.trim() || null,
            currency: form.elements['roiCurrency_modal_roadmap'].value.trim() || null,
            timeHorizonMonths: parseInt(form.elements['roiTimeHorizonMonths_modal_roadmap'].value) || null,
            confidenceLevel: form.elements['roiConfidenceLevel_modal_roadmap'].value.trim() || null,
            calculationMethodology: form.elements['roiCalculationMethodology_modal_roadmap'].value.trim() || null,
            businessCaseLink: form.elements['roiBusinessCaseLink_modal_roadmap'].value.trim() || null,
            overrideJustification: form.elements['roiOverrideJustification_modal_roadmap'].value.trim() || null,
            attributes: {}
        },
        attributes: {
            pmCapacityNotes: form.elements['initiativePmCapacityNotes_modal_roadmap'].value.trim()
        }
    };

     if (form.elements['roiTimeHorizonMonths_modal_roadmap'].value === '') { // Ensure null if empty
        initiativeData.roi.timeHorizonMonths = null;
    }

    const ownerValue = form.elements['initiativeOwner_modal_roadmap'].value;
    if (ownerValue) {
        const [type, id] = ownerValue.split(':');
        const selectedOptionText = form.elements['initiativeOwner_modal_roadmap'].options[form.elements['initiativeOwner_modal_roadmap'].selectedIndex]?.text || id;
        const name = selectedOptionText.includes(' (') ? selectedOptionText.substring(0, selectedOptionText.lastIndexOf(' (')).trim() : selectedOptionText;
        initiativeData.owner = { type, id, name: name || id };
    } else {
        initiativeData.owner = null;
    }

    const pmValue = form.elements['initiativeProjectManager_modal_roadmap'].value;
    if (pmValue) {
        const [type, id] = pmValue.split(':');
         const selectedOptionText = form.elements['initiativeProjectManager_modal_roadmap'].options[form.elements['initiativeProjectManager_modal_roadmap'].selectedIndex]?.text || id;
        initiativeData.projectManager = { type, id, name: selectedOptionText };
    } else {
        initiativeData.projectManager = null;
    }

    if (!initiativeData.title) {
        alert("Initiative Title is required.");
        return;
    }

    let success = false;
    let action = "added";
    if (currentEditingInitiativeId) {
        action = "updated";
        const existingInitiative = currentSystemData.yearlyInitiatives.find(i => i.initiativeId === currentEditingInitiativeId);
        // Preserve fields not editable in this modal (isProtected, workPackageIds).
        // Assignments are now taken from initiativeData (which got them from tempRoadmapAssignments_modal)
        const preservedData = {
            isProtected: existingInitiative?.isProtected || false, 
            workPackageIds: existingInitiative?.workPackageIds || [], 
            attributes: {...(existingInitiative?.attributes || {}), ...initiativeData.attributes}, // Merge attributes
            roi: {...(existingInitiative?.roi || {}), ...initiativeData.roi} // Merge ROI
        };
        // Combine, ensuring initiativeData (from form) takes precedence for fields it manages.
        const finalUpdateData = {...existingInitiative, ...initiativeData, ...preservedData, initiativeId: currentEditingInitiativeId };
        // Ensure impactedServiceIds is explicitly handled or cleared if it's no longer part of this form's direct management
        finalUpdateData.impactedServiceIds = existingInitiative?.impactedServiceIds || [];


        const updated = updateInitiative(currentEditingInitiativeId, finalUpdateData);
        if (updated) success = true;
    } else {
        // For new initiatives, ensure other necessary fields are initialized if not already
        initiativeData.workPackageIds = initiativeData.workPackageIds || [];
        initiativeData.isProtected = initiativeData.isProtected || false; 
        const added = addInitiative(initiativeData); // addInitiative in utils.js should handle default assignments if needed
        if (added) success = true;
    }

    if (success) {
        saveSystemChanges(); // Persist to localStorage
        renderRoadmapTable(); // Refresh the main roadmap table
        closeRoadmapModal();  // Close and clear the modal
        alert(`Initiative ${action} successfully.`);
    } else {
        alert(`Failed to ${action} initiative.`);
    }
}

/**
 * Handles click on "Delete" button in a table row for the roadmap.
 */
window.handleDeleteInitiativeButtonFromTable = function(initiativeId) {
    if (!initiativeId) {
        console.error("Delete called without initiativeId");
        return;
    }
    const initiativeToDelete = (currentSystemData.yearlyInitiatives || []).find(init => init.initiativeId === initiativeId);
    const initiativeTitle = initiativeToDelete ? initiativeToDelete.title : initiativeId;

    if (confirm(`Are you sure you want to delete initiative "${initiativeTitle}"? This action cannot be undone.`)) {
        const success = deleteInitiative(initiativeId); // utils.js function
        if (success) {
            saveSystemChanges();
            renderRoadmapTable();
            alert("Initiative deleted.");
            if (currentEditingInitiativeId === initiativeId) {
                closeRoadmapModal();
            }
        } else {
            alert("Failed to delete initiative.");
        }
    }
};