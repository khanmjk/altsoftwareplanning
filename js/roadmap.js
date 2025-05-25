// js/roadmap.js

// Store the Tabulator instance for the roadmap table
let roadmapTable = null;
// Store current filters - Default to showing "Backlog" and "Defined"
let currentRoadmapStatusFilters = ["Backlog", "Defined"];

// Global variable to store the ID of the initiative being edited, or null if adding new
let currentEditingInitiativeId = null;
const ALL_INITIATIVE_STATUSES = ["Backlog", "Defined", "Committed", "In Progress", "Completed"];


/**
 * Initializes the Roadmap & Backlog view.
 * This function is called when the view is switched to.
 */
function initializeRoadmapView() {
    console.log("Initializing Roadmap View (Option A)...");
    const roadmapViewContainer = document.getElementById('roadmapView');
    if (!roadmapViewContainer) {
        console.error("Roadmap view container not found.");
        return;
    }
    // Clear previous content if any to prevent duplication, but ensure main structure remains.
    // The main structure is now part of index.html, so we just get references.
    const controlsContainer = document.getElementById('roadmapControlsContainer');
    const tableContainer = document.getElementById('roadmapTableContainer');
    const formSection = document.getElementById('addEditRoadmapInitiativeSection');
    const formElement = document.getElementById('roadmapInitiativeForm');
    const formTitle = document.getElementById('addEditRoadmapInitiativeTitle');

    if (!controlsContainer || !tableContainer || !formSection || !formElement || !formTitle) {
        console.error("One or more roadmap view sub-containers are missing in index.html.");
        // Fallback: Recreate if totally missing (though ideally it's in index.html)
        roadmapViewContainer.innerHTML = `
            <h2>Roadmap & Backlog Management</h2>
            <div id="roadmapControlsContainer" style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;"></div>
            <div id="roadmapTableContainer" style="margin-bottom: 20px;"></div>
            <div id="addEditRoadmapInitiativeSection" style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; background-color: #f9f9f9;">
                <h3 id="addEditRoadmapInitiativeTitle">Add New Initiative to Backlog</h3>
                <form id="roadmapInitiativeForm"></form>
                <div style="margin-top:15px;">
                     <button type="button" id="saveRoadmapInitiativeButton" class="btn-primary">Save Initiative</button>
                     <button type="button" id="cancelRoadmapInitiativeEditButton" style="margin-left: 10px;">Cancel</button>
                </div>
            </div>
        `;
    }


    generateRoadmapControls();
    renderRoadmapTable(); // This will call prepareRoadmapDataForTable and defineRoadmapTableColumns
    generateAddEditInitiativeForm(); // Setup the form structure

    // Attach event listener for the main save button
    const saveButton = document.getElementById('saveRoadmapInitiativeButton');
    if (saveButton) {
        saveButton.onclick = handleSaveRoadmapInitiative;
    }
    const cancelButton = document.getElementById('cancelRoadmapInitiativeEditButton');
    if (cancelButton) {
        cancelButton.onclick = () => {
            document.getElementById('roadmapInitiativeForm').reset();
            currentEditingInitiativeId = null;
            document.getElementById('addEditRoadmapInitiativeTitle').textContent = 'Add New Initiative to Backlog';
            // Potentially hide or clear specific fields that are only for editing
            // Hide the form section or collapse it if preferred
            // document.getElementById('addEditRoadmapInitiativeSection').style.display = 'none';
        };
    }
    console.log("Roadmap View Initialized.");
}

/**
 * Generates filter controls for the roadmap.
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


        if (status === "All") {
            checkbox.checked = currentRoadmapStatusFilters.length === ALL_INITIATIVE_STATUSES.length;
        } else {
            checkbox.checked = currentRoadmapStatusFilters.includes(status);
        }


        checkbox.addEventListener('change', (event) => {
            const changedStatus = event.target.value;
            const isChecked = event.target.checked;

            if (changedStatus === "All") {
                if (isChecked) {
                    currentRoadmapStatusFilters = [...ALL_INITIATIVE_STATUSES];
                    // Check all other individual checkboxes
                    ALL_INITIATIVE_STATUSES.forEach(s => {
                        const individualCheckbox = document.getElementById(`roadmapStatusFilter_${s.toLowerCase().replace(/\s+/g, '')}`);
                        if (individualCheckbox) individualCheckbox.checked = true;
                    });
                } else {
                    currentRoadmapStatusFilters = [];
                    // Uncheck all other individual checkboxes
                     ALL_INITIATIVE_STATUSES.forEach(s => {
                        const individualCheckbox = document.getElementById(`roadmapStatusFilter_${s.toLowerCase().replace(/\s+/g, '')}`);
                        if (individualCheckbox) individualCheckbox.checked = false;
                    });
                }
            } else {
                if (isChecked) {
                    if (!currentRoadmapStatusFilters.includes(changedStatus)) {
                        currentRoadmapStatusFilters.push(changedStatus);
                    }
                } else {
                    currentRoadmapStatusFilters = currentRoadmapStatusFilters.filter(s => s !== changedStatus);
                }
                // Update "All" checkbox state
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

     // Button to trigger "add new" mode for the form
    const addNewButton = document.createElement('button');
    addNewButton.textContent = 'Add New Initiative';
    addNewButton.className = 'btn-primary';
    addNewButton.style.marginTop = '10px'; // Add some space if filters are long
    addNewButton.onclick = () => {
        currentEditingInitiativeId = null; // Ensure we are in "add" mode
        document.getElementById('roadmapInitiativeForm').reset(); // Clear form
        
        const statusSelect = document.getElementById('initiativeStatus_roadmap');
        if (statusSelect) statusSelect.value = "Backlog"; // Default status for new

        const titleInput = document.getElementById('initiativeTitle_roadmap');
        if(titleInput) titleInput.focus(); // Focus the first field

        document.getElementById('addEditRoadmapInitiativeTitle').textContent = 'Add New Initiative to Backlog';
        document.getElementById('addEditRoadmapInitiativeSection').style.display = 'block'; // Ensure form is visible
    };
    controlsContainer.appendChild(addNewButton);
}


/**
 * Prepares and filters data for the roadmap table.
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


        return {
            ...init, // Spread all original initiative properties
            id: init.initiativeId, // Tabulator needs an 'id' field
            ownerDisplay: ownerName,
            roiSummaryDisplay: roiDisplay,
            targetQuarterYearDisplay: formatDateToQuarterYear(init.targetDueDate) // Uses utils.js function
        };
    });
}

/**
 * Defines columns for the roadmap table.
 */
function defineRoadmapTableColumns() {
    const columns = [
        { title: "Title", field: "title", width: 250, headerFilter: "input", frozen:true, tooltip: (cell) => cell.getValue() },
        { title: "Description", field: "description", width: 300, hozAlign: "left", formatter: "textarea", headerFilter: "input", tooltip: (cell) => cell.getValue() },
        {
            title: "Status",
            field: "status",
            width: 120,
            headerFilter: "select",
            headerFilterParams: { values: ["", ...ALL_INITIATIVE_STATUSES] } // Add "" for "All"
        },
        { title: "Owner", field: "ownerDisplay", width: 150, headerFilter: "input" },
        { title: "ROI Summary", field: "roiSummaryDisplay", width: 220, hozAlign: "left", tooltip: (cell) => cell.getValue() },
        { title: "Target", field: "targetQuarterYearDisplay", width: 100, hozAlign: "center" },
        { title: "Themes", field: "themes", width: 180, formatter: (cell) => (cell.getValue() || []).join(', '), headerFilter: "input", tooltip: (cell) => (cell.getValue() || []).join(', ') },
        {
            title: "Actions",
            width: 130,
            hozAlign: "center",
            headerSort: false,
            formatter: (cell) => {
                const initiativeId = cell.getRow().getData().id;
                const editButton = `<button class="btn-secondary btn-sm" onclick="handleEditInitiativeButton('${initiativeId}')">Edit</button>`;
                const deleteButton = `<button class="btn-danger btn-sm" style="margin-left:5px;" onclick="handleDeleteInitiativeButton('${initiativeId}')">Del</button>`;
                return editButton + deleteButton;
            }
        }
    ];

    // Add other ROI fields as hidden columns, and pmCapacityNotes
    const roiFields = ["valueType", "currency", "timeHorizonMonths", "confidenceLevel", "calculationMethodology", "businessCaseLink", "overrideJustification"];
    roiFields.forEach(field => {
        columns.push({
            title: `ROI: ${field.replace(/([A-Z])/g, ' $1').trim()}`,
            field: `roi.${field}`,
            visible: false,
            headerFilter: "input",
            download: true, // Include in exports
            tooltip: (cell) => cell.getValue()
        });
    });
    columns.push({ title: "PM Capacity Notes", field: "attributes.pmCapacityNotes", visible: false, headerFilter: "input", formatter: "textarea", download: true, tooltip: (cell) => cell.getValue() });
    columns.push({ title: "Primary Goal ID", field: "primaryGoalId", visible: false, headerFilter: "input", download: true, tooltip: (cell) => cell.getValue() });
    columns.push({ title: "Project Manager", field: "projectManager.name", visible: false, headerFilter: "input", download: true, tooltip: (cell) => cell.getValue() });
    columns.push({ title: "Target Due Date", field: "targetDueDate", visible: false, headerFilter: "input", download: true, tooltip: (cell) => cell.getValue() });


    return columns;
}

/**
 * Renders the roadmap table using Tabulator.
 */
function renderRoadmapTable() {
    const tableContainer = document.getElementById('roadmapTableContainer');
    if (!tableContainer) {
        console.error("Roadmap table container not found for rendering.");
        return;
    }

    const tableData = prepareRoadmapDataForTable();
    const columnDefinitions = defineRoadmapTableColumns();

    // Check if EnhancedTableWidget class is available
    if (typeof EnhancedTableWidget === 'function') {
        if (roadmapTable && roadmapTable.destroy) { // Check if it's our widget or Tabulator
           if (typeof roadmapTable.setData === 'function') { // It's our widget
                roadmapTable.setData(tableData); // Use widget's setData
                return;
           } else { // It's a Tabulator instance
                roadmapTable.destroy(); // Destroy old Tabulator instance
           }
        }
        roadmapTable = new EnhancedTableWidget(tableContainer, {
            data: tableData,
            columns: columnDefinitions,
            uniqueIdField: 'id',
            layout: "fitDataStretch", // Try different layout
            responsiveLayout: "hide",
            pagination: "local",
            paginationSize: 15,
            paginationSizeSelector: [10, 15, 25, 50, 100],
            movableColumns: true,
            initialSort: [{ column: "title", dir: "asc" }],
            placeholder: "No initiatives match the current filters.",
            headerVisible: true,
             exportCsvFileName: 'roadmap_initiatives.csv',
             exportJsonFileName: 'roadmap_initiatives.json',
             exportXlsxFileName: 'roadmap_initiatives.xlsx',
             exportSheetName: 'Roadmap Initiatives'
        });
         console.log("Roadmap table rendered using EnhancedTableWidget.");
    } else {
        // Fallback to direct Tabulator if widget is not available
        console.warn("EnhancedTableWidget not found, falling back to direct Tabulator initialization for roadmap.");
        if (roadmapTable && typeof roadmapTable.destroy === 'function') {
            roadmapTable.destroy();
        }
        roadmapTable = new Tabulator(tableContainer, {
            height: "600px",
            data: tableData,
            layout: "fitDataStretch",
            columns: columnDefinitions,
            pagination: "local",
            paginationSize: 15,
            paginationSizeSelector: [10, 15, 25, 50, 100],
            movableColumns: true,
            initialSort: [{ column: "title", dir: "asc" }],
            placeholder: "No initiatives match the current filters."
        });
        console.log("Roadmap table rendered using direct Tabulator.");
    }
}

/**
 * Generates the HTML structure for the Add/Edit Initiative form.
 * (Implementation to be done in the next step)
 */
function generateAddEditInitiativeForm() {
    const form = document.getElementById('roadmapInitiativeForm');
    if (!form) {
        console.error("Roadmap initiative form element not found.");
        return;
    }
    form.innerHTML = ''; // Clear existing form content

    // Helper to create form group (label + input/select/textarea)
    const createFormGroup = (labelText, idSuffix, inputType = 'text', options = null, value = '', placeholder = '') => {
        const elementId = `${idSuffix}_roadmap`; // Unique ID for roadmap form
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
        input.name = elementId; // Name can be same as ID for form data
        input.style.width = '100%'; // Make inputs take full width of their container
        input.style.padding = '8px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '4px';
        input.style.boxSizing = 'border-box';
        if (placeholder) input.placeholder = placeholder;
        input.value = value; // Set initial value if provided

        div.appendChild(input);
        return div;
    };

    // Main Initiative Details Section
    const mainDetailsFieldset = document.createElement('fieldset');
    mainDetailsFieldset.style.border = '1px solid #ddd';
    mainDetailsFieldset.style.padding = '15px';
    mainDetailsFieldset.style.marginBottom = '15px';
    const mainLegend = document.createElement('legend');
    mainLegend.textContent = 'Core Details';
    mainLegend.style.fontWeight = 'bold';
    mainDetailsFieldset.appendChild(mainLegend);

    mainDetailsFieldset.appendChild(createFormGroup('Title:', 'initiativeTitle', 'text'));
    mainDetailsFieldset.appendChild(createFormGroup('Description:', 'initiativeDescription', 'textarea'));
    const statusOptions = ALL_INITIATIVE_STATUSES.map(s => ({ value: s, text: s }));
    mainDetailsFieldset.appendChild(createFormGroup('Status:', 'initiativeStatus', 'select', statusOptions));
    mainDetailsFieldset.appendChild(createFormGroup('Target Due Date:', 'initiativeTargetDueDate', 'date'));
    mainDetailsFieldset.appendChild(createFormGroup('PM Capacity/Team Notes:', 'initiativePmCapacityNotes', 'textarea'));
    form.appendChild(mainDetailsFieldset);


    // Strategic Alignment Section
    const strategicFieldset = document.createElement('fieldset');
    strategicFieldset.style.border = '1px solid #ddd';
    strategicFieldset.style.padding = '15px';
    strategicFieldset.style.marginBottom = '15px';
    const strategicLegend = document.createElement('legend');
    strategicLegend.textContent = 'Strategic Alignment';
    strategicLegend.style.fontWeight = 'bold';
    strategicFieldset.appendChild(strategicLegend);

    // Themes - For now, a simple text input. TODO: Implement a better multi-select.
    strategicFieldset.appendChild(createFormGroup('Themes (comma-separated IDs):', 'initiativeThemes', 'text', null, '', 'e.g., theme-id1,theme-id2'));
    
    const goalOptions = [{value: "", text:"-- None --"}].concat(
        (currentSystemData.goals || []).map(g => ({ value: g.goalId, text: g.name }))
    );
    strategicFieldset.appendChild(createFormGroup('Primary Goal:', 'initiativePrimaryGoalId', 'select', goalOptions));

    const personnelOptionsForOwner = [{value: "", text: "-- Select Owner --"}];
    (currentSystemData.sdms || []).forEach(p => personnelOptionsForOwner.push({value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)`}));
    (currentSystemData.pmts || []).forEach(p => personnelOptionsForOwner.push({value: `pmt:${p.pmtId}`, text: `${p.pmtName} (PMT)`}));
    (currentSystemData.seniorManagers || []).forEach(p => personnelOptionsForOwner.push({value: `seniorManager:${p.seniorManagerId}`, text: `${p.seniorManagerName} (Sr. Mgr)`}));
    strategicFieldset.appendChild(createFormGroup('Owner:', 'initiativeOwner', 'select', personnelOptionsForOwner));

    const pmOptions = [{value: "", text: "-- Select Project Manager --"}].concat(
        (currentSystemData.projectManagers || []).map(p => ({ value: `projectManager:${p.pmId}`, text: p.pmName }))
    );
    strategicFieldset.appendChild(createFormGroup('Project Manager:', 'initiativeProjectManager', 'select', pmOptions));
    form.appendChild(strategicFieldset);


    // ROI Details Section
    const roiFieldset = document.createElement('fieldset');
    roiFieldset.style.border = '1px solid #ddd';
    roiFieldset.style.padding = '15px';
    roiFieldset.style.marginBottom = '15px';
    const roiLegend = document.createElement('legend');
    roiLegend.textContent = 'ROI Details';
    roiLegend.style.fontWeight = 'bold';
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
    form.appendChild(roiFieldset);

    // Impacted Services - Placeholder for a better multi-select later
    form.appendChild(createFormGroup('Impacted Service IDs (comma-separated):', 'initiativeImpactedServiceIds', 'text', null, '', 'e.g., service-id1,service-id2'));


    console.log("Add/Edit initiative form structure generated.");
}


/**
 * Populates the Add/Edit form with data from an existing initiative.
 * (Implementation to be done in the next step)
 */
function populateInitiativeForm(initiativeId) {
    console.log("Populating form for initiative ID:", initiativeId);
    const initiative = (currentSystemData.yearlyInitiatives || []).find(init => init.initiativeId === initiativeId);
    if (!initiative) {
        console.error("Initiative not found for editing:", initiativeId);
        currentEditingInitiativeId = null;
        document.getElementById('roadmapInitiativeForm').reset();
        document.getElementById('addEditRoadmapInitiativeTitle').textContent = 'Add New Initiative to Backlog';
        return;
    }

    currentEditingInitiativeId = initiativeId;
    document.getElementById('addEditRoadmapInitiativeTitle').textContent = `Edit Initiative: ${initiative.title}`;
    const form = document.getElementById('roadmapInitiativeForm');

    form.elements['initiativeTitle_roadmap'].value = initiative.title || '';
    form.elements['initiativeDescription_roadmap'].value = initiative.description || '';
    form.elements['initiativeStatus_roadmap'].value = initiative.status || 'Backlog';
    form.elements['initiativeTargetDueDate_roadmap'].value = initiative.targetDueDate || '';
    form.elements['initiativePmCapacityNotes_roadmap'].value = initiative.attributes?.pmCapacityNotes || '';
    form.elements['initiativeThemes_roadmap'].value = (initiative.themes || []).join(', ');
    form.elements['initiativePrimaryGoalId_roadmap'].value = initiative.primaryGoalId || '';
    form.elements['initiativeImpactedServiceIds_roadmap'].value = (initiative.impactedServiceIds || []).join(', ');

    // Populate Owner
    if (initiative.owner && initiative.owner.type && initiative.owner.id) {
        form.elements['initiativeOwner_roadmap'].value = `${initiative.owner.type}:${initiative.owner.id}`;
    } else {
        form.elements['initiativeOwner_roadmap'].value = "";
    }
    // Populate Project Manager
    if (initiative.projectManager && initiative.projectManager.type && initiative.projectManager.id) {
       form.elements['initiativeProjectManager_roadmap'].value = `${initiative.projectManager.type}:${initiative.projectManager.id}`;
    } else {
        form.elements['initiativeProjectManager_roadmap'].value = "";
    }

    // Populate ROI fields
    const roi = initiative.roi || {};
    form.elements['roiCategory_roadmap'].value = roi.category || '';
    form.elements['roiValueType_roadmap'].value = roi.valueType || '';
    form.elements['roiEstimatedValue_roadmap'].value = roi.estimatedValue !== null && roi.estimatedValue !== undefined ? roi.estimatedValue : '';
    form.elements['roiCurrency_roadmap'].value = roi.currency || '';
    form.elements['roiTimeHorizonMonths_roadmap'].value = roi.timeHorizonMonths !== null && roi.timeHorizonMonths !== undefined ? roi.timeHorizonMonths : '';
    form.elements['roiConfidenceLevel_roadmap'].value = roi.confidenceLevel || '';
    form.elements['roiCalculationMethodology_roadmap'].value = roi.calculationMethodology || '';
    form.elements['roiBusinessCaseLink_roadmap'].value = roi.businessCaseLink || '';
    form.elements['roiOverrideJustification_roadmap'].value = roi.overrideJustification || '';
    
    document.getElementById('addEditRoadmapInitiativeSection').style.display = 'block';
}

/**
 * Handles saving the initiative (add or edit).
 * (Implementation to be done in the next step)
 */
function handleSaveRoadmapInitiative() {
    console.log("Handling save roadmap initiative...");
    const form = document.getElementById('roadmapInitiativeForm');
    if (!form) {
        console.error("Roadmap initiative form not found for saving.");
        return;
    }

    const initiativeData = {
        title: form.elements['initiativeTitle_roadmap'].value.trim(),
        description: form.elements['initiativeDescription_roadmap'].value.trim(),
        status: form.elements['initiativeStatus_roadmap'].value,
        targetDueDate: form.elements['initiativeTargetDueDate_roadmap'].value || null,
        themes: form.elements['initiativeThemes_roadmap'].value.split(',').map(t => t.trim()).filter(t => t),
        primaryGoalId: form.elements['initiativePrimaryGoalId_roadmap'].value || null,
        impactedServiceIds: form.elements['initiativeImpactedServiceIds_roadmap'].value.split(',').map(s => s.trim()).filter(s => s),
        // Initialize nested objects if they don't exist, especially for new initiatives
        roi: {
            category: form.elements['roiCategory_roadmap'].value.trim() || null,
            valueType: form.elements['roiValueType_roadmap'].value.trim() || null,
            estimatedValue: form.elements['roiEstimatedValue_roadmap'].value.trim() || null,
            currency: form.elements['roiCurrency_roadmap'].value.trim() || null,
            timeHorizonMonths: parseInt(form.elements['roiTimeHorizonMonths_roadmap'].value) || null,
            confidenceLevel: form.elements['roiConfidenceLevel_roadmap'].value.trim() || null,
            calculationMethodology: form.elements['roiCalculationMethodology_roadmap'].value.trim() || null,
            businessCaseLink: form.elements['roiBusinessCaseLink_roadmap'].value.trim() || null,
            overrideJustification: form.elements['roiOverrideJustification_roadmap'].value.trim() || null,
            attributes: {} // Ensure attributes exists within ROI
        },
        attributes: { // Ensure attributes exists at the top level
            pmCapacityNotes: form.elements['initiativePmCapacityNotes_roadmap'].value.trim()
        }
        // `assignments` are not managed here. They will be preserved if editing an existing initiative.
        // For new initiatives, `addInitiative` in utils.js will default it to [].
    };
     // Clean up null or empty strings for number fields before parsing
    if (form.elements['roiTimeHorizonMonths_roadmap'].value === '') {
        initiativeData.roi.timeHorizonMonths = null;
    }


    // Handle Owner
    const ownerValue = form.elements['initiativeOwner_roadmap'].value;
    if (ownerValue) {
        const [type, id] = ownerValue.split(':');
        const selectedOptionText = form.elements['initiativeOwner_roadmap'].options[form.elements['initiativeOwner_roadmap'].selectedIndex]?.text || id;
        const name = selectedOptionText.substring(0, selectedOptionText.lastIndexOf(' (')).trim(); // Attempt to extract name
        initiativeData.owner = { type, id, name: name || id };
    } else {
        initiativeData.owner = null;
    }

    // Handle Project Manager
    const pmValue = form.elements['initiativeProjectManager_roadmap'].value;
    if (pmValue) {
        const [type, id] = pmValue.split(':');
         const selectedOptionText = form.elements['initiativeProjectManager_roadmap'].options[form.elements['initiativeProjectManager_roadmap'].selectedIndex]?.text || id;
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
        // Ensure existing fields not in the form (like assignments, isProtected) are preserved
        const existingInitiative = currentSystemData.yearlyInitiatives.find(i => i.initiativeId === currentEditingInitiativeId);
        const preservedData = {
            assignments: existingInitiative.assignments,
            isProtected: existingInitiative.isProtected,
            workPackageIds: existingInitiative.workPackageIds,
            // Preserve original attributes and ROI then merge form data
            attributes: {...existingInitiative.attributes, ...initiativeData.attributes},
            roi: {...existingInitiative.roi, ...initiativeData.roi}

        };
        const finalUpdateData = {...initiativeData, ...preservedData};
        const updated = updateInitiative(currentEditingInitiativeId, finalUpdateData);
        if (updated) success = true;

    } else {
        // Add new initiative
        const added = addInitiative(initiativeData); // utils.js function
        if (added) success = true;
    }

    if (success) {
        saveSystemChanges(); // Persist all currentSystemData to localStorage
        renderRoadmapTable(); // Refresh table
        form.reset();
        currentEditingInitiativeId = null;
        document.getElementById('addEditRoadmapInitiativeTitle').textContent = 'Add New Initiative to Backlog';
        alert(`Initiative ${action} successfully.`);
        // document.getElementById('addEditRoadmapInitiativeSection').style.display = 'none'; // Optionally hide form
    } else {
        alert(`Failed to ${action} initiative.`);
    }
}


/**
 * Handles click on "Edit" button in a table row.
 */
window.handleEditInitiativeButton = function(initiativeId) { // Make global for inline onclick
    populateInitiativeForm(initiativeId);
    const formSection = document.getElementById('addEditRoadmapInitiativeSection');
    if (formSection) {
      formSection.style.display = 'block'; // Ensure form is visible
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * Handles click on "Delete" button in a table row.
 */
window.handleDeleteInitiativeButton = function(initiativeId) { // Make global for inline onclick
    if (!initiativeId) {
        console.error("Delete called without initiativeId");
        return;
    }
    if (confirm(`Are you sure you want to delete initiative "${initiativeId}"? This action cannot be undone.`)) {
        const success = deleteInitiative(initiativeId); // utils.js function
        if (success) {
            saveSystemChanges(); // Persist deletion
            renderRoadmapTable();
            alert("Initiative deleted.");
            // If the deleted initiative was being edited, clear the form
            if (currentEditingInitiativeId === initiativeId) {
                document.getElementById('roadmapInitiativeForm').reset();
                currentEditingInitiativeId = null;
                document.getElementById('addEditRoadmapInitiativeTitle').textContent = 'Add New Initiative to Backlog';
            }
        } else {
            alert("Failed to delete initiative.");
        }
    }
};