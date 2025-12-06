/**
 * BacklogComponent
 * Renders the tabular list of initiatives (Backlog view).
 */
class BacklogComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.table = null;
        this.statusFilters = [...ALL_INITIATIVE_STATUSES];
        this.ALL_STATUSES = ALL_INITIATIVE_STATUSES;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `<div id="backlogTableContainer" class="roadmap-table-container" style="height: 100%; width: 100%;"></div>`;
        this.renderTable();
    }

    /**
     * Generate filter controls for the toolbar
     */
    generateToolbarControls() {
        const toolbarContainer = document.createElement('div');
        toolbarContainer.className = 'roadmap-toolbar-content';

        // Filter group
        const filterGroup = document.createElement('div');
        filterGroup.className = 'roadmap-filter-group';

        const statusLabel = document.createElement('strong');
        statusLabel.textContent = 'Filter by Status: ';
        statusLabel.className = 'roadmap-filter-label';
        filterGroup.appendChild(statusLabel);

        const allStatuses = ['All', ...this.ALL_STATUSES];

        allStatuses.forEach(status => {
            const checkboxId = `backlogStatusFilter_${status.toLowerCase().replace(/\s+/g, '')}`;
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

        toolbarContainer.appendChild(filterGroup);

        // Event delegation
        toolbarContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.status) {
                this.handleStatusFilterChange(e.target);
            }
        });

        return toolbarContainer;
    }

    handleStatusFilterChange(checkbox) {
        const status = checkbox.value;
        const isChecked = checkbox.checked;

        if (status === 'All') {
            this.statusFilters = isChecked ? [...this.ALL_STATUSES] : [];
            this.ALL_STATUSES.forEach(s => {
                const cb = document.getElementById(`backlogStatusFilter_${s.toLowerCase().replace(/\s+/g, '')}`);
                if (cb) cb.checked = isChecked;
            });
        } else {
            if (isChecked) {
                if (!this.statusFilters.includes(status)) this.statusFilters.push(status);
            } else {
                this.statusFilters = this.statusFilters.filter(s => s !== status);
            }
            const allCb = document.getElementById('backlogStatusFilter_all');
            if (allCb) {
                allCb.checked = this.statusFilters.length === this.ALL_STATUSES.length;
            }
        }
        this.renderTable();
    }

    prepareTableData() {
        if (!window.currentSystemData || !window.currentSystemData.yearlyInitiatives) {
            return [];
        }

        let initiatives = JSON.parse(JSON.stringify(window.currentSystemData.yearlyInitiatives));

        if (this.statusFilters.length > 0 && this.statusFilters.length < this.ALL_STATUSES.length) {
            initiatives = initiatives.filter(init => this.statusFilters.includes(init.status));
        }

        const themesMap = new Map((window.currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
        const teamsMap = new Map((window.currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));

        return initiatives.map(init => {
            const ownerName = init.owner?.name || 'N/A';
            let roiSummary = 'N/A';
            if (init.roi?.category && init.roi?.estimatedValue) {
                roiSummary = `${init.roi.category}: ${init.roi.estimatedValue}`;
                if (init.roi.valueType === 'Monetary' && init.roi.currency) roiSummary += ` ${init.roi.currency}`;
            } else if (init.roi?.category) {
                roiSummary = init.roi.category;
            } else if (init.roi?.estimatedValue) {
                roiSummary = String(init.roi.estimatedValue);
            }

            const cleanDate = (init.targetDueDate && String(init.targetDueDate).trim() !== '') ? String(init.targetDueDate).trim() : null;
            const themes = (init.themes || []).map(tid => themesMap.get(tid) || tid).join(', ');
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

    defineColumns() {
        const getPersonnelEditorParams = () => {
            const options = [{ label: '- No Owner -', value: '' }];
            (window.currentSystemData.sdms || []).forEach(p => options.push({ label: `${p.sdmName} (SDM)`, value: `sdm:${p.sdmId}` }));
            (window.currentSystemData.pmts || []).forEach(p => options.push({ label: `${p.pmtName} (PMT)`, value: `pmt:${p.pmtId}` }));
            (window.currentSystemData.seniorManagers || []).forEach(p => options.push({ label: `${p.seniorManagerName} (Sr. Mgr)`, value: `seniorManager:${p.seniorManagerId}` }));
            return { values: options, autocomplete: true };
        };

        const getThemeEditorParams = () => {
            const options = (window.currentSystemData.definedThemes || []).map(t => ({ label: t.name, value: t.themeId }));
            return { values: options, multiselect: true };
        };

        return [
            {
                title: 'Title', field: 'title', minWidth: 200, headerFilter: 'input', frozen: true,
                tooltip: (e, cell) => cell.getValue(), editor: 'input',
                cellEdited: (cell) => {
                    window.updateInitiative(cell.getRow().getData().id, { title: cell.getValue() });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Description', field: 'description', minWidth: 250, formatter: 'textarea', headerFilter: 'input',
                tooltip: (e, cell) => cell.getValue(), editor: 'textarea',
                cellEdited: (cell) => {
                    window.updateInitiative(cell.getRow().getData().id, { description: cell.getValue() });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Status', field: 'status', width: 120, headerFilter: 'list',
                headerFilterParams: { values: ['', ...this.ALL_STATUSES], clearable: true },
                editor: 'list', editorParams: { values: this.ALL_STATUSES },
                cellEdited: (cell) => {
                    const init = cell.getRow().getData();
                    const newValue = cell.getValue();
                    const oldValue = cell.getOldValue();
                    if (newValue === 'Completed') {
                        const today = luxon.DateTime.now().startOf('day');
                        const dueDate = luxon.DateTime.fromISO(init.targetDueDate).startOf('day');
                        if (oldValue !== 'Committed') {
                            window.notificationManager.showToast("Only 'Committed' initiatives can be marked as 'Completed'", 'error');
                            cell.restoreOldValue(); return;
                        }
                        if (dueDate > today) {
                            window.notificationManager.showToast("Cannot mark as 'Completed' before due date", 'error');
                            cell.restoreOldValue(); return;
                        }
                        window.updateInitiative(init.id, { status: newValue });
                        window.saveSystemChanges();
                    } else {
                        window.notificationManager.showToast("Status updates (other than to 'Completed') managed by Year Plan ATL/BTL process", 'info');
                        cell.restoreOldValue();
                    }
                }
            },
            { title: 'Assigned Teams', field: 'assignedTeamsDisplay', minWidth: 180, headerFilter: 'input', formatter: 'textarea' },
            { title: 'SDE/Yr Estimates', field: 'totalInitialSdesDisplay', width: 100, hozAlign: 'center', headerFilter: 'input', sorter: 'number' },
            {
                title: 'Owner', field: 'owner', width: 140, headerFilter: 'input',
                formatter: (cell) => cell.getValue()?.name || 'N/A',
                editor: 'list', editorParams: getPersonnelEditorParams,
                cellEdited: (cell) => {
                    const ownerValue = cell.getValue();
                    let newOwner = null;
                    if (ownerValue) {
                        const [type, id] = ownerValue.split(':');
                        const options = getPersonnelEditorParams().values;
                        const selected = options.find(opt => opt.value === ownerValue);
                        const name = selected ? selected.label.replace(/ \(.+\)/, '') : id;
                        newOwner = { type, id, name };
                    }
                    window.updateInitiative(cell.getRow().getData().id, { owner: newOwner });
                    window.saveSystemChanges();
                    cell.getRow().update({ owner: newOwner });
                }
            },
            { title: 'ROI Summary', field: 'roiSummaryDisplay', minWidth: 180, headerFilter: 'input' },
            {
                title: 'Target Quarter/Yr', field: 'targetQuarterYearDisplay', width: 110, hozAlign: 'center', headerFilter: 'input',
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
                title: 'Target Due Date', field: 'targetDueDate', width: 120, hozAlign: 'center', headerFilter: 'input', editor: 'date',
                editorParams: { format: 'yyyy-MM-dd' },
                cellEdited: (cell) => {
                    const newDate = cell.getValue();
                    const newYear = newDate ? luxon.DateTime.fromISO(newDate).year : new Date().getFullYear();
                    window.updateInitiative(cell.getRow().getData().id, {
                        targetDueDate: newDate,
                        attributes: { ...cell.getRow().getData().attributes, planningYear: newYear }
                    });
                    window.saveSystemChanges();
                    cell.getRow().update({ targetQuarterYearDisplay: window.formatDateToQuarterYear(newDate) });
                }
            },
            {
                title: 'Themes', field: 'themes', minWidth: 150, headerFilter: 'input',
                formatter: (cell) => {
                    const themeMap = new Map((window.currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
                    return (cell.getValue() || []).map(id => themeMap.get(id) || id).join(', ');
                },
                editor: 'list', editorParams: getThemeEditorParams,
                cellEdited: (cell) => {
                    window.updateInitiative(cell.getRow().getData().id, { themes: cell.getValue() || [] });
                    window.saveSystemChanges();
                }
            },
            {
                title: 'Actions', width: 120, hozAlign: 'center', headerSort: false,
                formatter: (cell) => {
                    const id = cell.getRow().getData().id;
                    return `<div class="roadmap-action-buttons">
                        <button class="btn btn-secondary btn-sm" data-action="edit" data-initiative-id="${id}">Edit</button>
                        <button class="btn btn-danger btn-sm" data-action="delete" data-initiative-id="${id}">Del</button>
                    </div>`;
                }
            }
        ];
    }

    renderTable() {
        const container = document.getElementById('backlogTableContainer');
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
            uniqueIdField: 'id'
        };

        if (this.table && typeof this.table.destroy === 'function') this.table.destroy();

        if (typeof EnhancedTableWidget === 'function') {
            this.table = new EnhancedTableWidget(container, options);
        } else {
            this.table = new Tabulator(container, { ...options, height: '600px' });
        }

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const initiativeId = btn.dataset.initiativeId;
            if (btn.dataset.action === 'edit') {
                if (window.roadmapViewInstance) window.roadmapViewInstance.openModalForEdit(initiativeId);
            } else if (btn.dataset.action === 'delete') {
                if (window.roadmapViewInstance) window.roadmapViewInstance.handleDelete(initiativeId);
            }
        });
    }
}
