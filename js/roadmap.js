// js/roadmap.js

// Store the Tabulator instance for the roadmap table
let roadmapTable = null;

// Global variable to store the ID of the initiative being edited, or null if adding new
let currentEditingInitiativeId = null;
const ALL_INITIATIVE_STATUSES = ["Backlog", "Defined", "Committed", "In Progress", "Completed"];

// Store current filters - Default to showing ALL statuses
let currentRoadmapStatusFilters = [...ALL_INITIATIVE_STATUSES]; // Uses the existing constant


/**
 * Helper function to get modal elements.
 * @returns {object|null} Object containing modal elements or null if not found.
 */
function getRoadmapModalElements() {
    const modal = document.getElementById('roadmapInitiativeModal');
    const titleElement = document.getElementById('addEditRoadmapInitiativeTitle_modal');
    const formElement = document.getElementById('roadmapInitiativeForm_modal');
    const saveButton = document.getElementById('saveRoadmapInitiativeButton_modal');
    const cancelButton = document.getElementById('cancelRoadmapInitiativeEditButton_modal');

    if (!modal || !titleElement || !formElement || !saveButton || !cancelButton) {
        console.error("One or more modal elements are missing from the DOM.");
        return null;
    }
    return { modal, titleElement, formElement, saveButton, cancelButton };
}

/**
 * Opens the modal for adding a new initiative.
 */
function openRoadmapModalForAdd() {
    const elements = getRoadmapModalElements();
    if (!elements) return;

    currentEditingInitiativeId = null;
    elements.titleElement.textContent = 'Add New Initiative to Backlog';
    elements.formElement.reset(); // Clear previous form values

    // Set default values for a new initiative
    const statusSelect = document.getElementById('initiativeStatus_modal_roadmap'); // Ensure ID matches generated form
    if (statusSelect) statusSelect.value = "Backlog";

    // Populate dynamic select options if they aren't already up-to-date
    // (generateRoadmapInitiativeFormFields should handle initial population)

    elements.modal.style.display = 'block';
    const titleInput = document.getElementById('initiativeTitle_modal_roadmap');
    if (titleInput) titleInput.focus();
}

/**
 * Opens the modal for editing an existing initiative.
 * (Ensures modal is in view and first field is focused)
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
    populateRoadmapInitiativeForm_modal(initiative); // Populate form with initiative data
    
    elements.modal.style.display = 'block';

    // Ensure the modal itself is scrolled to the top if its content was previously scrolled
    const modalBody = elements.modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.scrollTop = 0;
    }

    // Set focus to the first editable field
    const titleInput = document.getElementById('initiativeTitle_modal_roadmap'); // ID of the title input in the modal
    if (titleInput) {
        titleInput.focus();
    }
}

/**
 * Closes the roadmap initiative modal.
 */
function closeRoadmapModal() {
    const elements = getRoadmapModalElements();
    if (!elements) return;
    elements.modal.style.display = 'none';
    elements.formElement.reset();
    currentEditingInitiativeId = null; // Clear editing state
}


/**
 * Initializes the Roadmap & Backlog view.
 */
function initializeRoadmapView() {
    console.log("Initializing Roadmap View (Modal version)...");
    // Structure is now mostly in index.html. We ensure controls and table are generated.

    generateRoadmapControls(); // Generates filter and "Add New" button
    renderRoadmapTable();    // Generates the table structure and renders data

    // Form fields are generated once into the modal's form structure
    const modalElements = getRoadmapModalElements();
    if (modalElements && modalElements.formElement) {
        generateRoadmapInitiativeFormFields(modalElements.formElement);
    } else {
        console.error("Cannot generate form fields, modal form element not found.");
    }


    // Attach event listener for the modal's save and cancel buttons
    if (modalElements) {
        modalElements.saveButton.onclick = handleSaveRoadmapInitiative_modal;
        // The cancel button in the modal HTML already calls closeRoadmapModal() via onclick.
        // elements.cancelButton.onclick = closeRoadmapModal; // Or assign here if not inline
    }
    console.log("Roadmap View Initialized with Modal support.");
}

/**
 * Generates filter controls for the roadmap.
 * (Defaults to all statuses checked)
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

    const statusLabel = document.createElement('strong');
    statusLabel.textContent = 'Filter by Status: ';
    filterGroup.appendChild(statusLabel);

    const allStatusesWithAllOption = ["All", ...ALL_INITIATIVE_STATUSES];

    allStatusesWithAllOption.forEach(status => {
        const checkboxId = `roadmapStatusFilter_${status.toLowerCase().replace(/\s+/g, '')}`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.value = status;
        checkbox.style.marginRight = '5px';
        checkbox.style.marginLeft = '10px';

        // Initialize checkbox state based on currentRoadmapStatusFilters
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
            renderRoadmapTable(); // Re-render table with new filters
        });

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = status;
        label.style.marginRight = '15px';
        label.style.fontWeight = 'normal';
        label.style.cursor = 'pointer';

        filterGroup.appendChild(checkbox);
        filterGroup.appendChild(label);
    });
    controlsContainer.appendChild(filterGroup);

    const addNewButton = document.createElement('button');
    addNewButton.textContent = 'Add New Initiative';
    addNewButton.className = 'btn-primary';
    addNewButton.style.marginTop = '10px';
    addNewButton.onclick = openRoadmapModalForAdd;
    controlsContainer.appendChild(addNewButton);
}

/**
 * Prepares and filters data for the roadmap table.
 * (Ensures targetDueDate is null if empty/whitespace for consistent date sorting)
 */
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

    return initiatives.map(init => {
        const ownerName = init.owner && init.owner.name ? init.owner.name : 'N/A';
        const roiCategory = init.roi && init.roi.category ? init.roi.category : '';
        const roiValue = init.roi && init.roi.estimatedValue ? init.roi.estimatedValue : '';
        let roiDisplay = 'N/A';
        if (roiCategory && roiValue) {
            roiDisplay = `${roiCategory}: ${roiValue}`;
            if (init.roi.valueType === 'Monetary' && init.roi.currency) {
                roiDisplay += ` ${init.roi.currency}`;
            }
        } else if (roiCategory) {
            roiDisplay = roiCategory;
        } else if (roiValue) {
            roiDisplay = String(roiValue);
        }

        // Ensure targetDueDate is either a valid-looking string or null.
        // This helps the Tabulator date sorter.
        const cleanTargetDueDate = (init.targetDueDate && String(init.targetDueDate).trim() !== "") ? String(init.targetDueDate).trim() : null;

        return {
            ...init, // Spread all original initiative properties
            id: init.initiativeId, // Tabulator needs an 'id' field
            targetDueDate: cleanTargetDueDate, // Use the cleaned date for sorting
            ownerDisplay: ownerName,
            roiSummaryDisplay: roiDisplay,
            targetQuarterYearDisplay: formatDateToQuarterYear(cleanTargetDueDate) // Also use cleaned date for quarter display
        };
    });
}

/**
 * Defines columns for the roadmap table.
 * (Adjusts column widths for better layout with fitColumns, Actions column narrower)
 */
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
            title: "ROI Summary", // No explicit width, let fitColumns manage
            field: "roiSummaryDisplay",
            minWidth: 180, // Give it a minimum
            hozAlign: "left",
            tooltip: function(e, cell){ return cell.getValue(); },
            headerFilter: "input",
            headerFilterPlaceholder: "Filter ROI..."
        },
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
            width: 110, // Keep defined width
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
        {
            title: "Themes", // No explicit width
            field: "themes",
            minWidth: 150, // Give it a minimum
            formatter: (cell) => (cell.getValue() || []).join(', '),
            headerFilter: "input",
            tooltip: function(e, cell){ return (cell.getValue() || []).join(', '); },
            sorter: function(a, b, aRow, bRow, column, dir, sorterParams){
                const val_a = (a || []).join(', ').toLowerCase();
                const val_b = (b || []).join(', ').toLowerCase();
                return val_a.localeCompare(val_b);
            }
        },
        {
            title: "Actions",
            width: 120, // << REDUCED width for Actions column
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

    const roiFields = ["valueType", "currency", "timeHorizonMonths", "confidenceLevel", "calculationMethodology", "businessCaseLink", "overrideJustification"];
    roiFields.forEach(field => {
        columns.push({
            title: `ROI: ${field.replace(/([A-Z])/g, ' $1').trim()}`,
            field: `roi.${field}`,
            visible: false, minWidth:150, // MinWidth for hidden columns too
            headerFilter: "input", download: true, tooltip: function(e, cell){ return cell.getValue(); }
        });
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
 */
function generateRoadmapInitiativeFormFields(formElement) {
    if (!formElement) {
        console.error("Form element for roadmap initiative not provided.");
        return;
    }
    formElement.innerHTML = ''; // Clear existing form content

    // Helper to create form group (label + input/select/textarea)
    const createFormGroup = (labelText, idSuffix, inputType = 'text', options = null, value = '', placeholder = '') => {
        const elementId = `${idSuffix}_modal_roadmap`; // Unique ID for modal form
        const div = document.createElement('div');
        div.style.marginBottom = '12px'; // class="form-group" can be used if defined in CSS

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
        input.className = 'form-control'; // Assuming a general form control style exists
        if (placeholder) input.placeholder = placeholder;
        // input.value = value; // Value will be set by populate function

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
    strategicFieldset.appendChild(createFormGroup('Themes (comma-separated IDs):', 'initiativeThemes', 'text', null, '', 'e.g., theme-id1,theme-id2'));
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

    console.log("Roadmap initiative form fields generated into modal.");
}

/**
 * Populates the Add/Edit modal form with data from an existing initiative.
 */
function populateRoadmapInitiativeForm_modal(initiative) { // Renamed & takes initiative object
    if (!initiative) return;
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) return;
    const form = modalElements.formElement;

    form.elements['initiativeTitle_modal_roadmap'].value = initiative.title || '';
    form.elements['initiativeDescription_modal_roadmap'].value = initiative.description || '';
    form.elements['initiativeStatus_modal_roadmap'].value = initiative.status || 'Backlog';
    form.elements['initiativeTargetDueDate_modal_roadmap'].value = initiative.targetDueDate || '';
    form.elements['initiativePmCapacityNotes_modal_roadmap'].value = initiative.attributes?.pmCapacityNotes || '';
    form.elements['initiativeThemes_modal_roadmap'].value = (initiative.themes || []).join(', ');
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
 */
function handleSaveRoadmapInitiative_modal() {
    const modalElements = getRoadmapModalElements();
    if (!modalElements || !modalElements.formElement) {
        console.error("Roadmap initiative modal form not found for saving.");
        return;
    }
    const form = modalElements.formElement;

    const initiativeData = {
        title: form.elements['initiativeTitle_modal_roadmap'].value.trim(),
        description: form.elements['initiativeDescription_modal_roadmap'].value.trim(),
        status: form.elements['initiativeStatus_modal_roadmap'].value,
        targetDueDate: form.elements['initiativeTargetDueDate_modal_roadmap'].value || null,
        themes: form.elements['initiativeThemes_modal_roadmap'].value.split(',').map(t => t.trim()).filter(t => t),
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
        const preservedData = {
            assignments: existingInitiative.assignments,
            isProtected: existingInitiative.isProtected,
            workPackageIds: existingInitiative.workPackageIds,
            attributes: {...existingInitiative.attributes, ...initiativeData.attributes},
            roi: {...existingInitiative.roi, ...initiativeData.roi}
        };
        const finalUpdateData = {...initiativeData, ...preservedData, initiativeId: currentEditingInitiativeId}; // Ensure ID is part of the update payload
        const updated = updateInitiative(currentEditingInitiativeId, finalUpdateData); // utils.js
        if (updated) success = true;
    } else {
        const added = addInitiative(initiativeData); // utils.js
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
// Renamed to avoid conflict if a global handleDeleteInitiativeButton exists for other views
window.handleDeleteInitiativeButtonFromTable = function(initiativeId) {
    if (!initiativeId) {
        console.error("Delete called without initiativeId");
        return;
    }
    if (confirm(`Are you sure you want to delete initiative "${initiativeId}"? This action cannot be undone.`)) {
        const success = deleteInitiative(initiativeId); // utils.js function
        if (success) {
            saveSystemChanges();
            renderRoadmapTable();
            alert("Initiative deleted.");
            if (currentEditingInitiativeId === initiativeId) { // If it was being edited in modal
                closeRoadmapModal(); // Close modal and reset
            }
        } else {
            alert("Failed to delete initiative.");
        }
    }
};