/**
 * RoadmapView - Roadmap & Backlog View Component
 * Displays initiatives in a Tabulator table with filtering and inline editing
 */
class RoadmapView {
    constructor() {
        this.roadmapTable = null;
        this.statusFilters = [...ALL_INITIATIVE_STATUSES];
        this.ALL_STATUSES = ALL_INITIATIVE_STATUSES;
    }

    /**
     * Render the roadmap view
     */
    render(container) {
        if (!container) {
            container = document.getElementById('roadmapView');
        }
        if (!container) {
            console.error('Roadmap container not found');
            return;
        }

        // Create layout
        container.innerHTML = `
            <div class="roadmap-view">
                <div id="roadmapControlsContainer" class="roadmap-controls"></div>
                <div id="roadmapTableContainer" class="roadmap-table-container"></div>
            </div>
        `;

        this.generateControls();
        this.renderTable();

        // Initialize modal if not already done
        if (!window.roadmapInitiativeModal) {
            window.roadmapInitiativeModal = new RoadmapInitiativeModal();
        }
    }

    /**
     * Generate filter controls and action buttons
     */
    generateControls() {
        const controlsContainer = document.getElementById('roadmapControlsContainer');
        if (!controlsContainer) return;

        controlsContainer.innerHTML = '';

        // Filter group
        const filterGroup = document.createElement('div');
        filterGroup.className = 'roadmap-filter-group';

        const statusLabel = document.createElement('strong');
        statusLabel.textContent = 'Filter by Status: ';
        statusLabel.className = 'roadmap-filter-label';
        filterGroup.appendChild(statusLabel);

        const allStatuses = ['All', ...this.ALL_STATUSES];

        allStatuses.forEach(status => {
            const checkboxId = `roadmapStatusFilter_${status.toLowerCase().replace(/\s+/g, '')}`;
            const wrapper = document.createElement('div');
            wrapper.className = 'roadmap-filter-checkbox-wrapper';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = status;
            checkbox.className = 'roadmap-filter-checkbox';
            checkbox.dataset.status = status;

            if (status === 'All') {
                checkbox.checked = this.statusFilters.length === this.ALL_STATUSES.length;
            } else {
                checkbox.checked = this.statusFilters.includes(status);
            }

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = status;
            label.className = 'roadmap-filter-checkbox-label';

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            filterGroup.appendChild(wrapper);
        });

        controlsContainer.appendChild(filterGroup);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'roadmap-actions';

        const addButton = document.createElement('button');
        addButton.textContent = 'Add New Initiative';
        addButton.className = 'btn btn-primary';
        addButton.dataset.action = 'add-initiative';
        actionsDiv.appendChild(addButton);

        const themesButton = document.createElement('button');
        themesButton.textContent = 'Manage Themes';
        themesButton.className = 'btn btn-secondary';
        themesButton.dataset.action = 'manage-themes';
        actionsDiv.appendChild(themesButton);

        controlsContainer.appendChild(actionsDiv);

        // Event delegation
        controlsContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.status) {
                this.handleStatusFilterChange(e.target);
            }
        });

        controlsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            if (btn.dataset.action === 'add-initiative') {
                this.openModalForAdd();
            } else if (btn.dataset.action === 'manage-themes') {
                if (window.navigationManager) {
                    window.navigationManager.navigateTo('managementView', { tab: 'themes' });
                }
            }
        });
    }

    /**
     * Handle status filter changes
     */
    handleStatusFilterChange(checkbox) {
        const status = checkbox.value;
        const isChecked = checkbox.checked;

        if (status === 'All') {
            this.statusFilters = isChecked ? [...this.ALL_STATUSES] : [];
            this.ALL_STATUSES.forEach(s => {
                const cb = document.getElementById(`roadmapStatusFilter_${s.toLowerCase().replace(/\s+/g, '')}`);
                if (cb) cb.checked = isChecked;
            });
        } else {
            if (isChecked) {
                if (!this.statusFilters.includes(status)) {
                    this.statusFilters.push(status);
                }
            } else {
                this.statusFilters = this.statusFilters.filter(s => s !== status);
            }
            const allCb = document.getElementById('roadmapStatusFilter_all');
            if (allCb) {
                allCb.checked = this.statusFilters.length === this.ALL_STATUSES.length;
            }
        }

        this.renderTable();
    }

    /**
     * Open modal for adding new initiative
     */
    openModalForAdd() {
        if (window.roadmapInitiativeModal) {
            window.roadmapInitiativeModal.onSave = this.handleSave.bind(this);
            window.roadmapInitiativeModal.open();
        }
    }

    /**
     * Open modal for editing initiative
     */
    openModalForEdit(initiativeId) {
        if (window.roadmapInitiativeModal) {
            window.roadmapInitiativeModal.onSave = this.handleSave.bind(this);
            window.roadmapInitiativeModal.open(initiativeId);
        }
    }

    /**
     * Handle save from modal
     */
    handleSave(initiativeData, isEdit) {
        if (!window.currentSystemData.yearlyInitiatives) {
            window.currentSystemData.yearlyInitiatives = [];
        }

        if (isEdit) {
            const index = window.currentSystemData.yearlyInitiatives.findIndex(i => i.initiativeId === initiativeData.initiativeId);
            if (index > -1) {
                window.currentSystemData.yearlyInitiatives[index] = {
                    ...window.currentSystemData.yearlyInitiatives[index],
                    ...initiativeData
                };
            }
        } else {
            window.currentSystemData.yearlyInitiatives.push(initiativeData);
        }

        window.saveSystemChanges();
        this.renderTable();
    }

    /**
     * Handle delete initiative
     */
    async handleDelete(initiativeId) {
        const initiative = (window.currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        const title = initiative ? initiative.title : initiativeId;

        if (await window.notificationManager.confirm(
            `Are you sure you want to delete initiative "${title}"? This action cannot be undone.`,
            'Delete Initiative',
            { confirmStyle: 'danger', confirmText: 'Delete' }
        )) {
            const success = window.deleteInitiative(initiativeId);
            if (success) {
                window.saveSystemChanges();
                this.renderTable();
                window.notificationManager.showToast('Initiative deleted', 'success');
            } else {
                window.notificationManager.showToast('Failed to delete initiative', 'error');
            }
        }
    }

    /**
     * Prepare table data
     */
    prepareTableData() {
        if (!window.currentSystemData || !window.currentSystemData.yearlyInitiatives) {
            return [];
        }

        let initiatives = JSON.parse(JSON.stringify(window.currentSystemData.yearlyInitiatives));

        // Apply status filter
        if (this.statusFilters.length > 0 && this.statusFilters.length < this.ALL_STATUSES.length) {
            initiatives = initiatives.filter(init => this.statusFilters.includes(init.status));
        }

        const themesMap = new Map((window.currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
        const teamsMap = new Map((window.currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));

        return initiatives.map(init => {
            const ownerName = init.owner?.name || 'N/A';

            // ROI summary
            let roiSummary = 'N/A';
            if (init.roi?.category && init.roi?.estimatedValue) {
                roiSummary = `${init.roi.category}: ${init.roi.estimatedValue}`;
                if (init.roi.valueType === 'Monetary' && init.roi.currency) {
                    roiSummary += ` ${init.roi.currency}`;
                }
            } else if (init.roi?.category) {
                roiSummary = init.roi.category;
            } else if (init.roi?.estimatedValue) {
                roiSummary = String(init.roi.estimatedValue);
            }

            const cleanDate = (init.targetDueDate && String(init.targetDueDate).trim() !== '')
                ? String(init.targetDueDate).trim()
                : null;

            const themes = (init.themes || []).map(tid => themesMap.get(tid) || tid).join(', ');

            // Assignments
            let assignedTeams = 'None';
            let totalSdes = 0;
            if (init.assignments && init.assignments.length > 0) {
                assignedTeams = init.assignments.map(a => teamsMap.get(a.teamId) || a.teamId).join(', ');
                totalSdes = init.assignments.reduce((sum, a) => sum + (parseFloat(a.sdeYears) || 0), 0);
            }

            return {
                ...init,
                id: init.initiativeId,
                targetDueDate: cleanDate,
                ownerDisplay: ownerName,
                roiSummaryDisplay: roiSummary,
                targetQuarterYearDisplay: window.formatDateToQuarterYear(cleanDate),
                themeNamesDisplay: themes,
                assignedTeamsDisplay: assignedTeams,
                totalInitialSdesDisplay: totalSdes.toFixed(2)
            };
        });
    }

    /**
     * Define table columns
     */
    defineColumns() {
        const getPersonnelEditorParams = () => {
            const options = [{ label: '- No Owner -', value: '' }];
            (window.currentSystemData.sdms || []).forEach(p =>
                options.push({ label: `${p.sdmName} (SDM)`, value: `sdm:${p.sdmId}` }));
            (window.currentSystemData.pmts || []).forEach(p =>
                options.push({ label: `${p.pmtName} (PMT)`, value: `pmt:${p.pmtId}` }));
            (window.currentSystemData.seniorManagers || []).forEach(p =>
                options.push({ label: `${p.seniorManagerName} (Sr. Mgr)`, value: `seniorManager:${p.seniorManagerId}` }));
            return { values: options, autocomplete: true };
        };

        const getThemeEditorParams = () => {
            const options = (window.currentSystemData.definedThemes || []).map(t => ({
                label: t.name,
                value: t.themeId
            }));
            return { values: options, multiselect: true };
        };

        return [
            {
                title: 'Title', field: 'title', minWidth: 200, headerFilter: 'input', frozen: true,
                tooltip: (e, cell) => cell.getValue(),
                editor: 'input',
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    window.updateInitiative(init.id, { title: cell.getValue() });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Description', field: 'description', minWidth: 250,
                formatter: 'textarea', headerFilter: 'input', tooltip: (e, cell) => cell.getValue(),
                editor: 'textarea',
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    window.updateInitiative(init.id, { description: cell.getValue() });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Status', field: 'status', width: 120, headerFilter: 'list',
                headerFilterParams: { values: ['', ...this.ALL_STATUSES], clearable: true },
                headerFilterFunc: '=',
                editor: 'list',
                editorParams: { values: this.ALL_STATUSES },
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    const newValue = cell.getValue();
                    const oldValue = cell.getOldValue();

                    if (newValue === 'Completed') {
                        const today = luxon.DateTime.now().startOf('day');
                        const dueDate = luxon.DateTime.fromISO(init.targetDueDate).startOf('day');

                        if (oldValue !== 'Committed') {
                            window.notificationManager.showToast("Only 'Committed' initiatives can be marked as 'Completed'", 'error');
                            cell.restoreOldValue();
                            return;
                        }
                        if (dueDate > today) {
                            window.notificationManager.showToast("Cannot mark as 'Completed' before due date", 'error');
                            cell.restoreOldValue();
                            return;
                        }
                        window.updateInitiative(init.id, { status: newValue });
                        window.saveSystemChanges();
                    } else {
                        window.notificationManager.showToast("Status updates (other than to 'Completed') managed by Year Plan ATL/BTL process", 'info');
                        cell.restoreOldValue();
                    }
                }
            },
            {
                title: 'Assigned Teams', field: 'assignedTeamsDisplay', minWidth: 180, headerFilter: 'input',
                tooltip: (e, cell) => cell.getValue() || 'N/A',
                formatter: 'textarea'
            },
            {
                title: 'SDE/Yr Estimates', field: 'totalInitialSdesDisplay', width: 100, hozAlign: 'center',
                headerFilter: 'input', sorter: 'number',
                tooltip: (e, cell) => `Total initial SDE estimate: ${cell.getValue()}`
            },
            {
                title: 'Owner', field: 'owner', width: 140, headerFilter: 'input',
                formatter: (cell) => cell.getValue()?.name || 'N/A',
                editor: 'list',
                editorParams: getPersonnelEditorParams,
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    const ownerValue = cell.getValue();
                    let newOwner = null;
                    if (ownerValue) {
                        const [type, id] = ownerValue.split(':');
                        const options = getPersonnelEditorParams().values;
                        const selected = options.find(opt => opt.value === ownerValue);
                        const name = selected ? selected.label.replace(/ \(.+\)/, '') : id;
                        newOwner = { type, id, name };
                    }
                    window.updateInitiative(init.id, { owner: newOwner });
                    window.saveSystemChanges();
                    cell.getRow().update({ owner: newOwner });
                }
            },
            {
                title: 'ROI Summary', field: 'roiSummaryDisplay', minWidth: 180,
                tooltip: (e, cell) => cell.getValue(), headerFilter: 'input'
            },
            {
                title: 'Target Quarter/Yr', field: 'targetQuarterYearDisplay', width: 110, hozAlign: 'center',
                tooltip: (e, cell) => cell.getValue() || 'N/A', headerFilter: 'input',
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
                title: 'Target Due Date', field: 'targetDueDate', width: 120, hozAlign: 'center',
                tooltip: (e, cell) => cell.getValue() || 'Not set',
                headerFilter: 'input', editor: 'date',
                editorParams: { format: 'yyyy-MM-dd' },
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    const newDate = cell.getValue();
                    const newYear = newDate ? luxon.DateTime.fromISO(newDate).year : new Date().getFullYear();
                    window.updateInitiative(init.id, {
                        targetDueDate: newDate,
                        attributes: { ...init.attributes, planningYear: newYear }
                    });
                    window.saveSystemChanges();
                    cell.getRow().update({ targetQuarterYearDisplay: window.formatDateToQuarterYear(newDate) });
                }
            },
            {
                title: 'Themes', field: 'themes', minWidth: 150, headerFilter: 'input',
                formatter: (cell) => {
                    const themeIds = cell.getValue() || [];
                    const themeMap = new Map((window.currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
                    return themeIds.map(id => themeMap.get(id) || id).join(', ');
                },
                editor: 'list',
                editorParams: getThemeEditorParams,
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    window.updateInitiative(init.id, { themes: cell.getValue() || [] });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Actions', width: 120, hozAlign: 'center', headerSort: false,
                formatter: (cell) => {
                    const id = cell.getRow().getData().id;
                    return `
                        <div class="roadmap-action-buttons">
                            <button class="btn btn-secondary btn-sm" data-action="edit" data-initiative-id="${id}">Edit</button>
                            <button class="btn btn-danger btn-sm" data-action="delete" data-initiative-id="${id}">Del</button>
                        </div>
                    `;
                }
            }
        ];
    }

    /**
     * Render the table
     */
    renderTable() {
        const container = document.getElementById('roadmapTableContainer');
        if (!container) return;

        const tableData = this.prepareTableData();
        const columns = this.defineColumns();

        const options = {
            data: tableData,
            columns: columns,
            layout: 'fitColumns',
            responsiveLayout: 'hide',
            pagination: 'local',
            paginationSize: 30,
            paginationSizeSelector: [10, 15, 25, 50, 75, 100],
            movableColumns: true,
            initialSort: [{ column: 'title', dir: 'asc' }],
            placeholder: 'No initiatives match the current filters.',
            uniqueIdField: 'id',
            exportCsvFileName: 'roadmap_initiatives.csv',
            exportJsonFileName: 'roadmap_initiatives.json',
            exportXlsxFileName: 'roadmap_initiatives.xlsx',
            exportSheetName: 'Roadmap Initiatives'
        };

        if (this.roadmapTable && typeof this.roadmapTable.destroy === 'function') {
            this.roadmapTable.destroy();
        }

        if (typeof EnhancedTableWidget === 'function') {
            this.roadmapTable = new EnhancedTableWidget(container, options);
        } else {
            this.roadmapTable = new Tabulator(container, { ...options, height: '600px' });
        }

        // Event delegation for actions in table
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const initiativeId = btn.dataset.initiativeId;
            if (!initiativeId) return;

            if (btn.dataset.action === 'edit') {
                this.openModalForEdit(initiativeId);
            } else if (btn.dataset.action === 'delete') {
                this.handleDelete(initiativeId);
            }
        });
    }
}

// Export and backwards compatibility
if (typeof window !== 'undefined') {
    window.RoadmapView = RoadmapView;

    // Global variables for backwards compatibility
    window.currentEditingInitiativeId = null;
    window.tempRoadmapAssignments_modal = [];

    // Backwards compatibility wrapper
    window.renderRoadmapView = function (container) {
        if (!window.roadmapViewInstance) {
            window.roadmapViewInstance = new RoadmapView();
        }
        window.roadmapViewInstance.render(container);
    };

    // Global functions for modal and table integration
    window.openRoadmapModalForAdd = function () {
        if (window.roadmapViewInstance) {
            window.roadmapViewInstance.openModalForAdd();
        }
    };

    window.openRoadmapModalForEdit = function (initiativeId) {
        if (window.roadmapViewInstance) {
            window.roadmapViewInstance.openModalForEdit(initiativeId);
        }
    };

    window.handleSaveRoadmapInitiative = function (initiativeData, isEdit) {
        if (window.roadmapViewInstance) {
            window.roadmapViewInstance.handleSave(initiativeData, isEdit);
        }
    };

    window.handleDeleteInitiativeButtonFromTable = async function (initiativeId) {
        if (window.roadmapViewInstance) {
            await window.roadmapViewInstance.handleDelete(initiativeId);
        }
    };
}
