// js/roadmap.js

// Store the Tabulator instance for the roadmap table
let roadmapTable = null;

// Global variable to store the ID of the initiative being edited, or null if adding new
let currentEditingInitiativeId = null;
const ALL_INITIATIVE_STATUSES = ["Backlog", "Defined", "Committed", "In Progress", "Completed"];

// Store current filters - Default to showing ALL statuses
let currentRoadmapStatusFilters = [...ALL_INITIATIVE_STATUSES]; // Uses the existing constant


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
 * Opens the modal for adding a new initiative.
 */
function openRoadmapModalForAdd() {
    const elements = getRoadmapModalElements();
    if (!elements) return;

    currentEditingInitiativeId = null;
    elements.titleElement.textContent = 'Add New Initiative to Backlog';
    elements.formElement.reset();

    // Re-populate dynamic select options every time the modal is opened for "add"
    // to ensure it has the latest themes, goals, personnel etc.
    generateRoadmapInitiativeFormFields(elements.formElement); // This will now build theme multi-select

    const statusSelect = document.getElementById('initiativeStatus_modal_roadmap');
    if (statusSelect) statusSelect.value = "Backlog";

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
    
    // Ensure form fields are up-to-date before populating
    generateRoadmapInitiativeFormFields(elements.formElement);
    populateRoadmapInitiativeForm_modal(initiative);
    
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
    if (!elements || !elements.modal ) return; // Check only modal for hiding
    if (elements.modal) elements.modal.style.display = 'none';
    if (elements.formElement) elements.formElement.reset();
    currentEditingInitiativeId = null;
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
 * (Ensures targetDueDate is null if empty/whitespace for consistent date sorting)
 */
// Function: prepareRoadmapDataForTable
// MODIFIED: To include theme name lookups.
function prepareRoadmapDataForTable() {
    if (!currentSystemData || !currentSystemData.yearlyInitiatives) {
        console.warn("No current system data or yearly initiatives to prepare for roadmap table.");
        return [];
    }
    let initiatives = JSON.parse(JSON.stringify(currentSystemData.yearlyInitiatives)); // Deep copy

    // Filter by status
    if (currentRoadmapStatusFilters.length > 0 && currentRoadmapStatusFilters.length < ALL_INITIATIVE_STATUSES.length) {
         initiatives = initiatives.filter(init => currentRoadmapStatusFilters.includes(init.status));
    }

    const definedThemesMap = new Map((currentSystemData.definedThemes || []).map(theme => [theme.themeId, theme.name]));

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

        // --- NEW: Prepare theme names for display ---
        const themeNames = (init.themes || [])
            .map(themeId => definedThemesMap.get(themeId) || themeId) // Fallback to ID if name not found
            .join(', ');
        // --- END NEW ---

        return {
            ...init, // Spread all original initiative properties
            id: init.initiativeId, // Tabulator needs an 'id' field
            targetDueDate: cleanTargetDueDate,
            ownerDisplay: ownerName,
            roiSummaryDisplay: roiSummaryDisplay,
            targetQuarterYearDisplay: formatDateToQuarterYear(cleanTargetDueDate),
            themeNamesDisplay: themeNames // Add the new property for theme names
        };
    });
}

// Function: defineRoadmapTableColumns
// MODIFIED: Added ROI Value Type column, updated Themes column to use themeNamesDisplay.
function defineRoadmapTableColumns() {
    const columns = [
        {
            title: "Title",
            field: "title",
            minWidth: 200,
            headerFilter: "input",
            frozen:true,
            tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "Description",
            field: "description",
            minWidth: 250,
            hozAlign: "left",
            formatter: "textarea",
            headerFilter: "input",
            tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "Status",
            field: "status",
            width: 110,
            headerFilter: "list",
            headerFilterParams: {
                values: ["", ...ALL_INITIATIVE_STATUSES],
                clearable: true,
                autocomplete: true
            },
            headerFilterFunc: "="
        },
        {
            title: "Owner",
            field: "ownerDisplay",
            width: 140,
            headerFilter: "input",
            tooltip: function(e, cell){ return cell.getValue(); }
        },
        {
            title: "ROI Summary",
            field: "roiSummaryDisplay",
            minWidth: 180,
            hozAlign: "left",
            tooltip: function(e, cell){ return cell.getValue(); },
            headerFilter: "input",
            headerFilterPlaceholder: "Filter ROI..."
        },
        // --- NEW: ROI Value Type Column ---
        {
            title: "ROI Type",
            field: "roi.valueType", // Access nested data
            minWidth: 120,
            hozAlign: "left",
            headerFilter: "input", // Or "list" if you have predefined types
            tooltip: (e, cell) => cell.getValue() || "N/A",
            // visible: true // Default is true, so not strictly needed unless overriding a general hidden default
        },
        // --- END NEW ---
        {
            title: "Target Quarter/Yr",
            field: "targetQuarterYearDisplay",
            width: 110, hozAlign: "center",
            tooltip: function(e, cell){ return cell.getValue() || "N/A"; },
            headerFilter: "input",
            sorter: function(a, b, aRow, bRow, column, dir, sorterParams){
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
                const aIsNull = (date_a === null);
                const bIsNull = (date_b === null);

                if (aIsNull && bIsNull) return 0;
                if (aIsNull) return 1;
                if (bIsNull) return -1;
                return date_a.valueOf() - date_b.valueOf();
            }
        },
        {
            title: "Target Due Date",
            field: "targetDueDate",
            width: 110,
            hozAlign: "center",
            tooltip: function(e, cell){ return cell.getValue() ? cell.getValue() : "Not set"; },
            headerFilter: "input",
            headerFilterPlaceholder: "YYYY-MM-DD",
            sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
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
                if (aIsNull && bIsNull) return 0;
                if (aIsNull) return 1; if (bIsNull) return -1;
                return dateA.valueOf() - dateB.valueOf();
            }
        },
        // --- MODIFIED: Themes Column ---
        {
            title: "Themes",
            field: "themeNamesDisplay", // Use the new field with names
            minWidth: 150,
            formatter: (cell) => cell.getValue() || "", // Value is already a string
            headerFilter: "input",
            tooltip: function(e, cell){ return cell.getValue() || "N/A"; }, // Tooltip shows names
            sorter: "string" // Default string sorter should work on names
        },
        // --- END MODIFIED ---
        {
            title: "Actions",
            width: 120,
            hozAlign: "center",
            headerSort: false,
            formatter: (cell) => {
                const initiativeId = cell.getRow().getData().id;
                const editButton = `<button class="btn-secondary btn-sm" onclick="openRoadmapModalForEdit('${initiativeId}')">Edit</button>`;
                const deleteButton = `<button class="btn-danger btn-sm" style="margin-left:5px;" onclick="handleDeleteInitiativeButtonFromTable('${initiativeId}')">Del</button>`;
                return editButton + deleteButton;
            }
        }
    ];

    const roiFields = ["category", "currency", "timeHorizonMonths", "confidenceLevel", "calculationMethodology", "businessCaseLink", "overrideJustification"];
    // Note: "valueType" was removed from this list as it's now a visible column.
    // "estimatedValue" is part of "roiSummaryDisplay". If a separate "ROI Estimated Value" column is desired, it can be added explicitly.
    roiFields.forEach(field => {
        columns.push({
            title: `ROI: ${field.replace(/([A-Z])/g, ' $1').trim()}`,
            field: `roi.${field}`,
            visible: false, minWidth:150,
            headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); }
        });
    });
    // Add a specific hidden column for estimatedValue if it's not captured sufficiently by roiSummaryDisplay for export/column toggle
    columns.push({
        title: "ROI: Estimated Value", field: "roi.estimatedValue", visible: false, minWidth: 150,
        headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); }
    });


    columns.push({ title: "PM Capacity Notes", field: "attributes.pmCapacityNotes", visible: false, minWidth: 200, headerFilter: "input", formatter: "textarea", download: true, tooltip: function(e, cell){ return cell.getValue(); } });
    columns.push({ title: "Primary Goal ID", field: "primaryGoalId", visible: false, minWidth: 150, headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); } });
    columns.push({ title: "Project Manager", field: "projectManager.name", visible: false, minWidth: 150, headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); } });

    return columns;
}

// Now, also update the renderRoadmapTable function to use layout: "fitColumns"
// Replace the renderRoadmapTable function with this:

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
 * Ensures options are freshly fetched from currentSystemData.definedThemes.
 */
function generateRoadmapInitiativeFormFields(formElement) {
    if (!formElement) {
        console.error("Form element for roadmap initiative not provided.");
        return;
    }
    formElement.innerHTML = ''; // Clear existing form content

    // Helper to create form group
    const createFormGroup = (labelText, idSuffix, inputType = 'text', options = null, value = '', placeholder = '', multiple = false) => {
        // ... (helper function as previously defined, no changes needed here for this issue)
        const elementId = `${idSuffix}_modal_roadmap`;
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
                input.size = Math.min(5, (options || []).length || 1); 
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
        input.name = elementId;
        input.className = 'form-control';
        if (placeholder) input.placeholder = placeholder;

        div.appendChild(input);
        return div;
    };

    // Main Initiative Details Section
    const mainDetailsFieldset = document.createElement('fieldset');
    mainDetailsFieldset.style.border = '1px solid #ddd'; mainDetailsFieldset.style.padding = '10px'; mainDetailsFieldset.style.marginBottom = '10px';
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
    strategicFieldset.style.border = '1px solid #ddd'; strategicFieldset.style.padding = '10px'; strategicFieldset.style.marginBottom = '10px';
    const strategicLegend = document.createElement('legend'); strategicLegend.textContent = 'Strategic Alignment'; strategicLegend.style.fontWeight = 'bold';
    strategicFieldset.appendChild(strategicLegend);

    // Themes multi-select
    // CRITICAL: Always fetch the latest themes from currentSystemData when generating this form.
    const currentDefinedThemes = currentSystemData.definedThemes || [];
    const themeOptions = currentDefinedThemes.map(theme => ({
        value: theme.themeId,
        text: `${theme.name} (${theme.themeId.slice(0,10)}...)`
    }));

    if (themeOptions.length === 0) {
        const themesHelpText = document.createElement('p');
        themesHelpText.innerHTML = '<em>No themes defined. Use the "Manage Themes" button on the roadmap page to add themes.</em>';
        themesHelpText.style.fontSize = '0.9em';
        themesHelpText.style.color = '#555';
        strategicFieldset.appendChild(createFormGroup('Themes:', 'initiativeThemes', 'text', null, '', 'No themes defined.'));
        const themesTextInput = formElement.querySelector('#initiativeThemes_modal_roadmap');
        if(themesTextInput) {
            themesTextInput.disabled = true;
            themesTextInput.style.display = 'none'; // Hide the disabled text input
            themesTextInput.parentNode.insertBefore(themesHelpText, themesTextInput.nextSibling); // Insert help text
        }

    } else {
        strategicFieldset.appendChild(createFormGroup('Themes:', 'initiativeThemes', 'select', themeOptions, '', '', true)); // true for multiple
    }
    // ... (rest of the form fields: Primary Goal, Owner, Project Manager, ROI Details, Impacted Services as before) ...
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
    roiFieldset.style.border = '1px solid #ddd'; roiFieldset.style.padding = '10px'; roiFieldset.style.marginBottom = '10px';
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

    formElement.appendChild(createFormGroup('Impacted Service IDs (comma-separated):', 'initiativeImpactedServiceIds', 'text', null, '', 'e.g., service-id1,service-id2'));


    console.log("Roadmap initiative form fields generated into modal with multi-select for Themes.");
}

/**
 * Populates the Add/Edit modal form with data from an existing initiative.
 * MODIFIED: To handle multi-select for themes.
 */
function populateRoadmapInitiativeForm_modal(initiative) {
    if (!initiative) return;
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) return;
    const form = modalElements.formElement;

    form.elements['initiativeTitle_modal_roadmap'].value = initiative.title || '';
    form.elements['initiativeDescription_modal_roadmap'].value = initiative.description || '';
    form.elements['initiativeStatus_modal_roadmap'].value = initiative.status || 'Backlog';
    form.elements['initiativeTargetDueDate_modal_roadmap'].value = initiative.targetDueDate || '';
    form.elements['initiativePmCapacityNotes_modal_roadmap'].value = initiative.attributes?.pmCapacityNotes || '';
    
    // --- MODIFIED: Populate Themes multi-select ---
    const themesSelect = form.elements['initiativeThemes_modal_roadmap'];
    if (themesSelect) {
        const initiativeThemeIds = initiative.themes || [];
        for (let i = 0; i < themesSelect.options.length; i++) {
            themesSelect.options[i].selected = initiativeThemeIds.includes(themesSelect.options[i].value);
        }
    } else { // Fallback if the input is still text (e.g., no themes defined)
        if (form.elements['initiativeThemes_modal_roadmap']) { // Check if the text input exists
           form.elements['initiativeThemes_modal_roadmap'].value = (initiative.themes || []).join(', ');
        }
    }
    // --- END MODIFIED ---

    form.elements['initiativePrimaryGoalId_modal_roadmap'].value = initiative.primaryGoalId || '';
    form.elements['initiativeImpactedServiceIds_modal_roadmap'].value = (initiative.impactedServiceIds || []).join(', ');

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
}

/**
 * Handles saving the initiative (add or edit) from the modal.
 * MODIFIED: To read from multi-select for themes.
 */
function handleSaveRoadmapInitiative_modal() {
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) {
        console.error("Roadmap initiative modal form not found for saving.");
        return;
    }
    const form = modalElements.formElement;

    // --- MODIFIED: Read selected themes from multi-select ---
    let selectedThemeIds = [];
    const themesSelect = form.elements['initiativeThemes_modal_roadmap'];
    if (themesSelect && themesSelect.type === 'select-multiple') {
        for (let i = 0; i < themesSelect.options.length; i++) {
            if (themesSelect.options[i].selected) {
                selectedThemeIds.push(themesSelect.options[i].value);
            }
        }
    } else if (themesSelect) { // Fallback for text input if no themes were defined
        selectedThemeIds = themesSelect.value.split(',').map(t => t.trim()).filter(t => t);
    }
    // --- END MODIFIED ---

    const initiativeData = {
        title: form.elements['initiativeTitle_modal_roadmap'].value.trim(),
        description: form.elements['initiativeDescription_modal_roadmap'].value.trim(),
        status: form.elements['initiativeStatus_modal_roadmap'].value,
        targetDueDate: form.elements['initiativeTargetDueDate_modal_roadmap'].value || null,
        themes: selectedThemeIds, // Use the collected theme IDs
        primaryGoalId: form.elements['initiativePrimaryGoalId_modal_roadmap'].value || null,
        impactedServiceIds: form.elements['initiativeImpactedServiceIds_modal_roadmap'].value.split(',').map(s => s.trim()).filter(s => s),
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
     if (form.elements['roiTimeHorizonMonths_modal_roadmap'].value === '') {
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
        // Preserve fields not editable in this modal, like assignments and protection status
        const preservedData = {
            assignments: existingInitiative?.assignments || [], // Ensure it exists
            isProtected: existingInitiative?.isProtected || false, // Ensure it exists
            workPackageIds: existingInitiative?.workPackageIds || [], // Ensure it exists
            // Merge attributes, prioritizing new ones if any overlap
            attributes: {...(existingInitiative?.attributes || {}), ...initiativeData.attributes},
            // Merge ROI, prioritizing new ones
            roi: {...(existingInitiative?.roi || {}), ...initiativeData.roi}
        };
        const finalUpdateData = {...initiativeData, ...preservedData, initiativeId: currentEditingInitiativeId};
        const updated = updateInitiative(currentEditingInitiativeId, finalUpdateData);
        if (updated) success = true;
    } else {
        // For new initiatives, ensure assignments and workPackageIds are initialized if not already
        initiativeData.assignments = [];
        initiativeData.workPackageIds = [];
        initiativeData.isProtected = false; // Default for new
        const added = addInitiative(initiativeData);
        if (added) success = true;
    }

    if (success) {
        saveSystemChanges();
        renderRoadmapTable();
        closeRoadmapModal();
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