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
 * Opens the modal for adding a new initiative.
 */
function openRoadmapModalForAdd() {
    if (window.roadmapInitiativeModal) {
        window.roadmapInitiativeModal.onSave = handleSaveRoadmapInitiative;
        window.roadmapInitiativeModal.open();
    } else {
        console.error("RoadmapInitiativeModal not initialized.");
    }
}

/**
 * Opens the modal for editing an existing initiative.
 * @param {string} initiativeId - The ID of the initiative to edit.
 */
function openRoadmapModalForEdit(initiativeId) {
    if (window.roadmapInitiativeModal) {
        window.roadmapInitiativeModal.onSave = handleSaveRoadmapInitiative;
        window.roadmapInitiativeModal.open(initiativeId);
    } else {
        console.error("RoadmapInitiativeModal not initialized.");
    }
}

/**
 * Handles saving the initiative (add or edit) from the new modal.
 */
function handleSaveRoadmapInitiative(initiativeData, isEdit) {
    if (!currentSystemData.yearlyInitiatives) {
        currentSystemData.yearlyInitiatives = [];
    }

    if (isEdit) {
        const index = currentSystemData.yearlyInitiatives.findIndex(i => i.initiativeId === initiativeData.initiativeId);
        if (index > -1) {
            // Merge to preserve fields not handled by modal (if any)
            currentSystemData.yearlyInitiatives[index] = { ...currentSystemData.yearlyInitiatives[index], ...initiativeData };
        }
    } else {
        currentSystemData.yearlyInitiatives.push(initiativeData);
    }

    saveSystemChanges();
    renderRoadmapTable();
    console.log("Initiative saved:", initiativeData);
}



/**
 * Initializes the Roadmap & Backlog view.
 * Ensures "Manage Themes" button and its modal's "Add Theme" button listeners are set up independently.
 */
/**
 * NEW: Renders the Roadmap & Backlog view into the Workspace.
 * Ensures "Manage Themes" button and its modal's "Add Theme" button listeners are set up independently.
 */
function renderRoadmapView(container) {
    // console.log("Rendering Roadmap View...");

    if (!container) {
        container = document.getElementById('roadmapView');
    }
    if (!container) {
        console.error("Roadmap container #roadmapView not found.");
        return;
    }

    // --- Dynamic DOM Creation for Workspace ---
    if (!document.getElementById('roadmapControlsContainer')) {
        container.innerHTML = `
            <div id="roadmapControlsContainer" style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;"></div>
            <div id="roadmapTableContainer" style="margin-bottom: 20px;"></div>
        `;
    }

    generateRoadmapControls(); // This sets up the "Manage Themes" button and its onclick to openThemeManagementModal
    renderRoadmapTable();

    // Initialize the modal if not already done
    if (!window.roadmapInitiativeModal) {
        window.roadmapInitiativeModal = new RoadmapInitiativeModal();
    }

    // console.log("Roadmap View Rendered with Modal and Theme Management support.");
}
// Make globally accessible
window.renderRoadmapView = renderRoadmapView;


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
    manageThemesButton.onclick = () => {
        if (window.navigationManager) {
            window.navigationManager.navigateTo('managementView', { tab: 'themes' });
        } else {
            console.error("NavigationManager not available");
        }
    };
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
 * Defines columns for the roadmap table, now with inline editors.
 */
function defineRoadmapTableColumns() {

    // Helper to generate editor params for personnel (Owner) dropdowns
    const getPersonnelEditorParams = () => {
        const options = [{ label: "- No Owner -", value: "" }];
        (currentSystemData.sdms || []).forEach(p => options.push({ label: `${p.sdmName} (SDM)`, value: `sdm:${p.sdmId}` }));
        (currentSystemData.pmts || []).forEach(p => options.push({ label: `${p.pmtName} (PMT)`, value: `pmt:${p.pmtId}` }));
        (currentSystemData.seniorManagers || []).forEach(p => options.push({ label: `${p.seniorManagerName} (Sr. Mgr)`, value: `seniorManager:${p.seniorManagerId}` }));
        return { values: options, autocomplete: true };
    };

    // Helper to generate editor params for Themes multi-select
    const getThemeEditorParams = () => {
        const options = (currentSystemData.definedThemes || []).map(theme => ({
            label: theme.name,
            value: theme.themeId
        }));
        return { values: options, multiselect: true };
    };

    const columns = [
        {
            title: "Title", field: "title", minWidth: 200, headerFilter: "input", frozen: true,
            tooltip: (e, cell) => cell.getValue(),
            editor: "input",
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                updateInitiative(initiative.id, { title: cell.getValue() });
                saveSystemChanges();
            }
        },
        {
            title: "Description", field: "description", minWidth: 250, hozAlign: "left",
            formatter: "textarea", headerFilter: "input", tooltip: (e, cell) => cell.getValue(),
            editor: "textarea", // Enable inline editing for description
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                updateInitiative(initiative.id, { description: cell.getValue() });
                saveSystemChanges();
            }
        },
        {
            title: "Status", field: "status", width: 120, headerFilter: "list",
            headerFilterParams: { values: ["", ...ALL_INITIATIVE_STATUSES], clearable: true, autocomplete: true },
            headerFilterFunc: "=",
            editor: "list",
            editorParams: { values: ALL_INITIATIVE_STATUSES },
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                const newValue = cell.getValue();
                const oldValue = cell.getOldValue();

                if (newValue === "Completed") {
                    const today = luxon.DateTime.now().startOf('day');
                    const dueDate = luxon.DateTime.fromISO(initiative.targetDueDate).startOf('day');

                    if (oldValue !== "Committed") {
                        window.notificationManager.showToast("Error: Only 'Committed' initiatives can be marked as 'Completed'.", "error");
                        cell.restoreOldValue();
                        return;
                    }
                    if (dueDate > today) {
                        window.notificationManager.showToast("Error: Cannot mark an initiative as 'Completed' before its due date has passed.", "error");
                        cell.restoreOldValue();
                        return;
                    }
                    updateInitiative(initiative.id, { status: newValue });
                    saveSystemChanges();

                } else {
                    window.notificationManager.showToast("Status updates (other than to 'Completed') are managed by the Year Plan ATL/BTL process.", "info");
                    cell.restoreOldValue();
                }
            }
        },
        {
            title: "Assigned Teams", field: "assignedTeamsDisplay", minWidth: 180, headerFilter: "input",
            tooltip: (e, cell) => cell.getValue() || "N/A",
            formatter: "textarea"
        },
        {
            title: "SDE/Yr Estimates", field: "totalInitialSdesDisplay", width: 100, hozAlign: "center", headerFilter: "input", sorter: "number",
            tooltip: (e, cell) => `Total initial SDE estimate: ${cell.getValue()}`
        },
        {
            title: "Owner", field: "owner", width: 140, headerFilter: "input",
            formatter: (cell) => cell.getValue()?.name || "N/A",
            editor: "list",
            editorParams: getPersonnelEditorParams,
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                const ownerValue = cell.getValue();
                let newOwnerObject = null;
                if (ownerValue) {
                    const [type, id] = ownerValue.split(':');
                    const options = getPersonnelEditorParams().values;
                    const selectedOption = options.find(opt => opt.value === ownerValue);
                    const name = selectedOption ? selectedOption.label.replace(/ \(.+\)/, '') : id;
                    newOwnerObject = { type, id, name };
                }
                updateInitiative(initiative.id, { owner: newOwnerObject });
                saveSystemChanges();
                // FIX: Update the cell's underlying row data so the formatter works correctly
                cell.getRow().update({ owner: newOwnerObject });
            },
            tooltip: (e, cell) => cell.getValue()?.name || "N/A"
        },
        {
            title: "ROI Summary", field: "roiSummaryDisplay", minWidth: 180, hozAlign: "left",
            tooltip: (e, cell) => cell.getValue(), headerFilter: "input", headerFilterPlaceholder: "Filter ROI..."
        },
        {
            title: "Target Quarter/Yr", field: "targetQuarterYearDisplay", width: 110, hozAlign: "center",
            tooltip: (e, cell) => cell.getValue() || "N/A", headerFilter: "input",
            sorter: (a, b, aRow, bRow) => {
                const dateA = aRow.getData().targetDueDate ? luxon.DateTime.fromISO(aRow.getData().targetDueDate) : null;
                const dateB = bRow.getData().targetDueDate ? luxon.DateTime.fromISO(bRow.getData().targetDueDate) : null;
                if (!dateA?.isValid && !dateB?.isValid) return 0;
                if (!dateA?.isValid) return 1;
                if (!dateB?.isValid) return -1;
                return dateA - dateB;
            }
        },
        {
            title: "Target Due Date", field: "targetDueDate", width: 120, hozAlign: "center",
            tooltip: (e, cell) => cell.getValue() || "Not set",
            headerFilter: "input", headerFilterPlaceholder: "YYYY-MM-DD",
            editor: "date",
            editorParams: { format: "yyyy-MM-dd" },
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                const newDate = cell.getValue();
                const newYear = newDate ? luxon.DateTime.fromISO(newDate).year : new Date().getFullYear();

                updateInitiative(initiative.id, {
                    targetDueDate: newDate,
                    attributes: { ...initiative.attributes, planningYear: newYear }
                });
                saveSystemChanges();

                cell.getRow().update({ targetQuarterYearDisplay: formatDateToQuarterYear(newDate) });
            }
        },
        {
            title: "Themes", field: "themes", minWidth: 150, headerFilter: "input",
            formatter: (cell) => {
                const themeIds = cell.getValue() || [];
                const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
                return themeIds.map(id => themeMap.get(id) || id).join(', ');
            },
            editor: "list",
            editorParams: getThemeEditorParams,
            cellEdited: (cell) => {
                const initiative = cell.getRow().getData();
                const newThemeIds = cell.getValue() || [];
                updateInitiative(initiative.id, { themes: newThemeIds });
                saveSystemChanges();
            },
            tooltip: (e, cell) => {
                const themeIds = cell.getValue() || [];
                if (themeIds.length === 0) return "N/A";
                const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
                return themeIds.map(id => themeMap.get(id) || id).join(', ');
            }
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

    // Hidden columns for export
    columns.push({ title: "ROI: Category", field: "roi.category", visible: false, download: true });
    columns.push({ title: "ROI: Est. Value", field: "roi.estimatedValue", visible: false, download: true });

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
        layout: "fitColumns",
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
            ...tabulatorOptions,
            uniqueIdField: 'id',
            exportCsvFileName: 'roadmap_initiatives.csv',
            exportJsonFileName: 'roadmap_initiatives.json',
            exportXlsxFileName: 'roadmap_initiatives.xlsx',
            exportSheetName: 'Roadmap Initiatives'
        });
        // console.log("Roadmap table rendered using EnhancedTableWidget with fitColumns layout.");
    } else {
        console.warn("EnhancedTableWidget not found, falling back to direct Tabulator for roadmap.");
        if (roadmapTable && typeof roadmapTable.destroy === 'function') {
            roadmapTable.destroy();
        }
        roadmapTable = new Tabulator(tableContainer, {
            ...tabulatorOptions,
            height: "600px",
        });
        // console.log("Roadmap table rendered using direct Tabulator with fitColumns layout.");
    }
}



/**
 * Handles click on "Delete" button in a table row for the roadmap.
 */
window.handleDeleteInitiativeButtonFromTable = async function (initiativeId) {
    if (!initiativeId) {
        console.error("Delete called without initiativeId");
        return;
    }
    const initiativeToDelete = (currentSystemData.yearlyInitiatives || []).find(init => init.initiativeId === initiativeId);
    const initiativeTitle = initiativeToDelete ? initiativeToDelete.title : initiativeId;

    if (await window.notificationManager.confirm(`Are you sure you want to delete initiative "${initiativeTitle}"? This action cannot be undone.`, 'Delete Initiative', { confirmStyle: 'danger', confirmText: 'Delete' })) {
        const success = deleteInitiative(initiativeId); // utils.js function
        if (success) {
            saveSystemChanges();
            renderRoadmapTable();
            window.notificationManager.showToast("Initiative deleted.", "success");
            if (currentEditingInitiativeId === initiativeId) {
                // If we were editing this initiative, just clear the ID. The modal should be handled by the caller or UI.
                currentEditingInitiativeId = null;
            }
        } else {
            window.notificationManager.showToast("Failed to delete initiative.", "error");
        }
    }
};


