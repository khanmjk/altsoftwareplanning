/**
 * GanttPlanningView
 * 
 * Class-based view conforming to workspace-canvas-contract.md
 * Encapsulates all Gantt planning state and rendering logic.
 * 
 * Contract Compliance:
 * - Uses workspaceComponent.setPageMetadata() for headers
 * - Uses workspaceComponent.setToolbar() for controls
 * - Implements getAIContext() for AI integration
 * - No window.* assignments (state encapsulated in class)
 * - Delegates business logic to GanttService
 */
class GanttPlanningView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;

        // ========= Instance State (formerly module-level globals) =========
        this.currentGanttYear = new Date().getFullYear();
        this.currentGanttGroupBy = 'All Initiatives';
        this.ganttTableWidthPct = 36;
        this.ganttExpandedInitiatives = new Set();
        this.ganttExpandedWorkPackages = new Set();
        this.ganttWorkPackagesInitialized = false;
        this.ganttOtherTeamsExpanded = new Set();
        this.ganttStatusFilter = new Set(['Backlog', 'Defined', 'Committed', 'In Progress', 'Done', 'Blocked']);
        this.lastGanttFocusTaskId = null;
        this.lastGanttFocusTaskType = null;
        this.lastGanttFocusInitiativeId = null;

        // Constants
        this.GANTT_TABLE_WIDTH_KEY = 'ganttTableWidthPct';
        this.GANTT_STATUS_OPTIONS = ['Backlog', 'Defined', 'Committed', 'In Progress', 'Done', 'Blocked'];

        // Load persisted table width from localStorage
        const storedGanttWidth = parseFloat(localStorage.getItem(this.GANTT_TABLE_WIDTH_KEY));
        if (isFinite(storedGanttWidth) && storedGanttWidth > 5 && storedGanttWidth < 95) {
            this.ganttTableWidthPct = storedGanttWidth;
        }

        // Service aliases (for internal convenience)
        this.normalizeGanttId = (value) => GanttService.normalizeGanttId(value);
        this.buildAssignmentTaskId = (wpId, teamId) => GanttService.buildAssignmentTaskId(wpId, teamId);
        this.truncateLabel = (text, maxLen) => GanttService.truncateLabel(text, maxLen);
    }

    /**
     * Main render function - Entry point for workspace navigation
     */
    render(container) {
        if (container) {
            this.container = container;
        } else if (this.containerId) {
            this.container = document.getElementById(this.containerId);
        }

        if (!this.container) {
            console.error('GanttPlanningView: No container provided');
            return;
        }

        console.log("Rendering Gantt Planning View...");

        // Ensure work packages exist for all initiatives
        WorkPackageService.ensureWorkPackagesForInitiatives(
            SystemService.getCurrentSystem(),
            this.currentGanttYear
        );

        // 1. Set Workspace Metadata (Header)
        if (workspaceComponent) {
            workspaceComponent.setPageMetadata({
                title: 'Detailed Planning (Gantt)',
                breadcrumbs: ['Planning', 'Detailed Planning'],
                actions: []
            });
        }

        // 2. Set Workspace Toolbar (Controls)
        const toolbarControls = this.generateGanttToolbar();
        if (workspaceComponent && toolbarControls) {
            workspaceComponent.setToolbar(toolbarControls);
        }

        // 3. Create Content Layout using DOM creation
        if (!document.getElementById('ganttSplitPane')) {
            ganttChartInstance = null;

            // Clear container
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }

            // Create split pane structure
            const splitPane = document.createElement('div');
            splitPane.id = 'ganttSplitPane';
            splitPane.className = 'gantt-split';

            // Table container
            const tableContainer = document.createElement('div');
            tableContainer.id = 'ganttPlanningTableContainer';
            tableContainer.className = 'gantt-panel';
            splitPane.appendChild(tableContainer);

            // Resizer
            const resizer = document.createElement('div');
            resizer.id = 'ganttSplitResizer';
            resizer.className = 'gantt-resizer';
            resizer.title = 'Drag to resize panels';
            splitPane.appendChild(resizer);

            // Chart wrapper and container
            const chartWrapper = document.createElement('div');
            chartWrapper.id = 'ganttChartWrapper';
            chartWrapper.className = 'gantt-panel';

            const chartContainer = document.createElement('div');
            chartContainer.id = 'ganttChartContainer';
            chartContainer.className = 'mermaid gantt-chart-box';
            chartWrapper.appendChild(chartContainer);

            splitPane.appendChild(chartWrapper);
            this.container.appendChild(splitPane);

            this.setupGanttResizer();
            this.applyGanttSplitWidth();
        }

        // 4. Initialize Filters & Render Views
        renderDynamicGroupFilter(); // Still uses legacy function temporarily
        this.renderStatusFilter();
        setupGanttRendererToggle(); // Still uses legacy function temporarily

        this.renderGanttTable();
        renderGanttChart(); // Still uses legacy function temporarily
    }

    /**
     * Generates the toolbar controls for the Gantt View.
     * @returns {HTMLElement} The toolbar container
     */
    generateGanttToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'gantt-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.gap = '16px';
        toolbar.style.width = '100%';
        toolbar.style.flexWrap = 'wrap';

        // Year selector
        const yearWrap = this.createLabeledControl('Year:', document.createElement('select'));
        const yearSelect = yearWrap.querySelector('select');
        yearSelect.id = 'ganttYearFilter';
        yearSelect.className = 'form-select form-select-sm';

        const years = Array.from(new Set(
            (SystemService.getCurrentSystem()?.yearlyInitiatives || [])
                .map(init => init.attributes?.planningYear)
                .filter(y => y)
        ));
        if (!years.includes(this.currentGanttYear)) years.push(this.currentGanttYear);
        years.sort();
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
        yearSelect.value = this.currentGanttYear;
        yearSelect.onchange = () => {
            this.currentGanttYear = parseInt(yearSelect.value, 10);
            console.log('[GANTT] Year changed', this.currentGanttYear);
            this.renderGanttTable();
            this.renderGanttChart(); // Still uses legacy temporarily
        };
        toolbar.appendChild(yearWrap);

        // View By selector
        const groupWrap = this.createLabeledControl('View By:', document.createElement('select'));
        const groupSelect = groupWrap.querySelector('select');
        groupSelect.id = 'ganttGroupBy';
        groupSelect.className = 'form-select form-select-sm';
        ['All Initiatives', 'Team'].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = `View by ${val}`;
            groupSelect.appendChild(opt);
        });
        groupSelect.value = this.currentGanttGroupBy;
        groupSelect.onchange = () => {
            this.currentGanttGroupBy = groupSelect.value;
            console.log('[GANTT] View By changed', this.currentGanttGroupBy);
            this.renderDynamicGroupFilter(); // Still uses legacy temporarily
            this.renderGanttChart(); // Still uses legacy temporarily
            this.renderGanttTable();
        };
        toolbar.appendChild(groupWrap);

        // Dynamic Filter Placeholder
        const dynamicFilterWrap = document.createElement('div');
        dynamicFilterWrap.id = 'ganttDynamicFilter';
        dynamicFilterWrap.className = 'filter-item';
        toolbar.appendChild(dynamicFilterWrap);

        // Status Filter Placeholder
        const statusFilterWrap = document.createElement('div');
        statusFilterWrap.id = 'ganttStatusFilter';
        statusFilterWrap.className = 'filter-item';
        toolbar.appendChild(statusFilterWrap);

        // Refresh Button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.className = 'btn btn-primary btn-sm';
        refreshBtn.onclick = () => {
            this.renderGanttTable();
            this.renderGanttChart(); // Still uses legacy temporarily
        };
        toolbar.appendChild(refreshBtn);

        // Renderer Toggle
        const rendererWrap = document.createElement('div');
        rendererWrap.style.display = 'flex';
        rendererWrap.style.alignItems = 'center';
        const rendererBtn = document.createElement('button');
        rendererBtn.id = 'ganttRendererToggle';
        rendererBtn.type = 'button';
        rendererBtn.className = 'btn btn-secondary btn-sm';
        rendererBtn.title = 'Switch between Mermaid and Frappe Gantt renderers';
        rendererBtn.textContent = this.getRendererButtonLabel(); // Uses legacy function temporarily
        rendererWrap.appendChild(rendererBtn);
        toolbar.appendChild(rendererWrap);

        // Legend (Frappe only)
        const legendDiv = document.createElement('div');
        legendDiv.id = 'ganttLegendContainer';
        legendDiv.className = 'gantt-legend';
        legendDiv.style.marginLeft = 'auto';

        const currentRenderer = FeatureFlags.getRenderer();
        legendDiv.style.display = currentRenderer === 'frappe' ? 'flex' : 'none';

        // Create legend items using DOM creation
        const legendItems = [
            { className: 'gantt-legend__color-box--initiative', label: 'Initiative' },
            { className: 'gantt-legend__color-box--work-package', label: 'Work Package' },
            { className: 'gantt-legend__color-box--assignment', label: 'Assignment' }
        ];

        legendItems.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'gantt-legend__item';

            const colorBox = document.createElement('span');
            colorBox.className = `gantt-legend__color-box ${item.className}`;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(document.createTextNode(` ${item.label}`));
            legendDiv.appendChild(legendItem);
        });

        toolbar.appendChild(legendDiv);

        return toolbar;
    }

    /**
     * Creates a labeled control wrapper (label + control element)
     */
    createLabeledControl(labelText, controlEl) {
        const wrap = document.createElement('div');
        wrap.className = 'filter-item';
        const label = document.createElement('label');
        label.textContent = labelText;
        wrap.appendChild(label);
        wrap.appendChild(controlEl);
        return wrap;
    }

    /**
     * Gets filtered initiatives based on current filters
     */
    getGanttFilteredInitiatives() {
        let initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives ?
            [...SystemService.getCurrentSystem().yearlyInitiatives] : [];

        const yearFilter = document.getElementById('ganttYearFilter')?.value || this.currentGanttYear;
        if (yearFilter && yearFilter !== 'all') {
            initiatives = initiatives.filter(init =>
                (init.attributes?.planningYear || '').toString() === yearFilter.toString()
            );
        }

        if (this.currentGanttGroupBy === 'Team') {
            const selectedTeam = document.getElementById('ganttGroupValue')?.value || 'all';
            if (selectedTeam !== 'all') {
                initiatives = initiatives.filter(init =>
                    (init.assignments || []).some(a => a.teamId === selectedTeam)
                );
            }
        }

        const statusFilter = this.ganttStatusFilter || new Set(this.GANTT_STATUS_OPTIONS);
        if (statusFilter.size > 0 && statusFilter.size < this.GANTT_STATUS_OPTIONS.length) {
            initiatives = initiatives.filter(init => statusFilter.has(init.status || ''));
        }
        if (statusFilter.size === 0) {
            initiatives = [];
        }

        return initiatives;
    }

    /**
     * Renders the status filter dropdown
     */
    renderStatusFilter() {
        const container = document.getElementById('ganttStatusFilter');
        if (!container) return;

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Rest of the implementation continues...
        // (This is a partial implementation to show the pattern)
        // The full method would be added in subsequent edits
    }

    setupGanttResizer() {
        // Resizer setup logic to be implemented
        setupGanttResizer(); // Temporary delegation to legacy
    }

    applyGanttSplitWidth() {
        applyGanttSplitWidth(); // Temporary delegation to legacy
    }

    renderGanttTable() {
        const container = document.getElementById('ganttPlanningTableContainer');
        if (!container) return;

        // Ensure WPs are loaded
        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), this.currentGanttYear);

        const focus = typeof getGanttFocusContext === 'function' ? getGanttFocusContext() : {};
        const selectedTeam = (this.currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
        const showManagerTeams = this.currentGanttGroupBy === 'Manager' && (document.getElementById('ganttManagerFilter')?.value || 'all') !== 'all';
        const initiativeMap = new Map();

        const data = this.getGanttFilteredInitiatives().map(init => {
            const dates = this.getComputedInitiativeDates(init, selectedTeam);
            const item = {
                ...init,
                displayStart: dates.startDate,
                displayEnd: dates.endDate
            };
            initiativeMap.set(init.initiativeId, item);
            return item;
        });

        // Clear container
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'gantt-table-wrapper';

        const table = document.createElement('table');
        table.className = 'gantt-table gantt-hierarchy';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const headerColumns = [
            'Initiative / Work Package',
            ...(showManagerTeams ? ['Teams'] : []),
            'Start',
            'Target',
            'SDEs',
            'Dependencies',
            'Actions'
        ];

        headerColumns.forEach(colText => {
            const th = document.createElement('th');
            th.className = 'gantt-table__header-cell';
            th.textContent = colText;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.id = 'ganttTableBody';
        table.appendChild(tbody);

        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);

        if (data.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = showManagerTeams ? 7 : 6;
            emptyCell.className = 'gantt-table__empty';
            emptyCell.textContent = 'No initiatives match the filters.';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            return;
        }

        const workingDaysPerYear = this.getWorkingDaysPerYear();
        const allInitiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
        const allWorkPackages = SystemService.getCurrentSystem()?.workPackages || [];

        // Auto-expand check (global var access - should be class prop if moved, leaving global for now if defined externally)
        // Actually, let's use the class property for initialization flag if possible, or just skip it as logic might handle it.
        // The legacy code had: if (!ganttWorkPackagesInitialized) ganttWorkPackagesInitialized = true;

        data.forEach(init => {
            const isExpanded = this.ganttExpandedInitiatives.has(init.initiativeId);
            const hasWorkPackages = this.hasWorkPackagesForInitiative(init.initiativeId);
            const initIdNorm = this.normalizeGanttId(init.initiativeId);
            const isFocusInitiative = focus.initiativeId && initIdNorm === focus.initiativeId;
            const isFocusRow = focus.taskType === 'initiative' && focus.taskId && initIdNorm === focus.taskId;

            const tr = document.createElement('tr');
            tr.className = [
                'gantt-init-row',
                isFocusInitiative ? 'gantt-focus-initiative' : '',
                isFocusRow ? 'gantt-focus-row' : ''
            ].filter(Boolean).join(' ');

            // Title cell
            const titleCell = document.createElement('td');
            titleCell.className = 'gantt-table__cell gantt-table__cell--initiative gantt-table__cell--initiative-title';

            const expanderBtn = document.createElement('button');
            expanderBtn.className = 'gantt-expander';
            expanderBtn.dataset.action = 'toggle-initiative';
            expanderBtn.dataset.id = init.initiativeId;
            expanderBtn.setAttribute('aria-label', 'Toggle work packages');
            expanderBtn.textContent = isExpanded ? '-' : '+';
            titleCell.appendChild(expanderBtn);

            const titleContainer = document.createElement('div');
            titleContainer.className = 'gantt-table__title-container';
            const titleDiv = document.createElement('div');
            titleDiv.textContent = init.title || '(Untitled)';
            titleContainer.appendChild(titleDiv);
            const idBadge = document.createElement('div');
            idBadge.className = 'gantt-table__id-badge';
            idBadge.textContent = init.initiativeId || '';
            titleContainer.appendChild(idBadge);
            titleCell.appendChild(titleContainer);
            tr.appendChild(titleCell);

            // Optional Teams
            if (showManagerTeams) {
                const teamsCell = document.createElement('td');
                teamsCell.className = 'gantt-table__cell gantt-table__cell--initiative';
                teamsCell.textContent = this.getTeamsForInitiative(init).join(', ');
                tr.appendChild(teamsCell);
            }

            // Start Date
            const startCell = document.createElement('td');
            startCell.className = 'gantt-table__cell gantt-table__cell--initiative';
            const startInput = document.createElement('input');
            startInput.type = 'date';
            startInput.value = init.displayStart || '';
            startInput.dataset.kind = 'initiative';
            startInput.dataset.field = 'startDate';
            startInput.dataset.id = init.initiativeId;
            if (hasWorkPackages) {
                startInput.disabled = true;
                startInput.title = 'Edit dates at Work Package level when WPs exist.';
            }
            startCell.appendChild(startInput);
            tr.appendChild(startCell);

            // Target Date
            const targetCell = document.createElement('td');
            targetCell.className = 'gantt-table__cell gantt-table__cell--initiative';
            const targetInput = document.createElement('input');
            targetInput.type = 'date';
            targetInput.value = init.displayEnd || '';
            targetInput.dataset.kind = 'initiative';
            targetInput.dataset.field = 'targetDueDate';
            targetInput.dataset.id = init.initiativeId;
            if (hasWorkPackages) {
                targetInput.disabled = true;
                targetInput.title = 'Edit dates at Work Package level when WPs exist.';
            }
            targetCell.appendChild(targetInput);
            tr.appendChild(targetCell);

            // SDEs
            const sdeCell = document.createElement('td');
            sdeCell.className = 'gantt-table__cell gantt-table__cell--initiative';
            const sdeInput = document.createElement('input');
            sdeInput.type = 'number';
            sdeInput.step = '0.01';
            sdeInput.value = this.computeSdeEstimate(init);
            sdeInput.dataset.kind = 'initiative';
            sdeInput.dataset.field = 'sdeEstimate';
            sdeInput.dataset.id = init.initiativeId;
            if (hasWorkPackages) {
                sdeInput.disabled = true;
                sdeInput.title = 'Edit SDEs at Work Package level when WPs exist.';
            }
            sdeCell.appendChild(sdeInput);
            tr.appendChild(sdeCell);

            // Dependencies (Using DOM Creator)
            const depsCell = document.createElement('td');
            depsCell.className = 'gantt-table__cell gantt-table__cell--initiative';
            depsCell.appendChild(this.createInitiativePredecessorSelector(allInitiatives, init));
            tr.appendChild(depsCell);

            // Actions
            const actionsCell = document.createElement('td');
            actionsCell.className = 'gantt-table__cell gantt-table__cell--initiative';
            const addWpBtn = document.createElement('button');
            addWpBtn.className = 'gantt-add-wp btn-primary';
            addWpBtn.dataset.action = 'add-wp';
            addWpBtn.dataset.id = init.initiativeId;
            addWpBtn.textContent = 'Add WP';
            actionsCell.appendChild(addWpBtn);
            tr.appendChild(actionsCell);

            tbody.appendChild(tr);

            if (isExpanded) {
                const wpList = this.getWorkPackagesForInitiative(init.initiativeId);
                if (!wpList.length) {
                    const emptyWp = document.createElement('tr');
                    emptyWp.className = 'gantt-wp-row';
                    const emptyWpCell = document.createElement('td');
                    emptyWpCell.colSpan = showManagerTeams ? 7 : 6;
                    emptyWpCell.className = 'gantt-table__empty-wp';
                    emptyWpCell.textContent = 'No work packages yet. Click "Add WP" to create one.';
                    emptyWp.appendChild(emptyWpCell);
                    tbody.appendChild(emptyWp);
                } else {
                    wpList.forEach(wp => {
                        const wpExpanded = this.ganttExpandedWorkPackages.has(wp.workPackageId);
                        const wpIdNorm = this.normalizeGanttId(wp.workPackageId);
                        const isFocusWp = focus.taskType === 'workPackage' && focus.taskId && wpIdNorm === focus.taskId;

                        const wpRow = document.createElement('tr');
                        wpRow.className = [
                            'gantt-wp-row',
                            isFocusWp ? 'gantt-focus-row' : '',
                            isFocusInitiative ? 'gantt-focus-initiative' : ''
                        ].filter(Boolean).join(' ');

                        // WP Title
                        const wpTitleCell = document.createElement('td');
                        wpTitleCell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-title';
                        const wpTitleDiv = document.createElement('div');
                        const wpExpanderBtn = document.createElement('button');
                        wpExpanderBtn.className = 'gantt-expander';
                        wpExpanderBtn.dataset.action = 'toggle-wp';
                        wpExpanderBtn.dataset.wpId = wp.workPackageId;
                        wpExpanderBtn.setAttribute('aria-label', 'Toggle team assignments');
                        wpExpanderBtn.textContent = wpExpanded ? '-' : '+';
                        wpTitleDiv.appendChild(wpExpanderBtn);
                        const wpTitleInput = document.createElement('input');
                        wpTitleInput.type = 'text';
                        wpTitleInput.value = wp.title || '';
                        wpTitleInput.dataset.kind = 'work-package';
                        wpTitleInput.dataset.field = 'title';
                        wpTitleInput.dataset.wpId = wp.workPackageId;
                        wpTitleInput.dataset.initiativeId = wp.initiativeId;
                        wpTitleDiv.appendChild(wpTitleInput);
                        wpTitleCell.appendChild(wpTitleDiv);
                        wpRow.appendChild(wpTitleCell);

                        if (showManagerTeams) {
                            const wpTeamsCell = document.createElement('td');
                            wpTeamsCell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-teams';
                            wpTeamsCell.textContent = this.formatWorkPackageTeams(wp, selectedTeam);
                            wpRow.appendChild(wpTeamsCell);
                        }

                        // WP Start
                        const wpStartCell = document.createElement('td');
                        wpStartCell.className = 'gantt-table__cell gantt-table__cell--wp';
                        const wpStartInput = document.createElement('input');
                        wpStartInput.type = 'date';
                        wpStartInput.value = wp.startDate || '';
                        wpStartInput.dataset.kind = 'work-package';
                        wpStartInput.dataset.field = 'startDate';
                        wpStartInput.dataset.wpId = wp.workPackageId;
                        wpStartInput.dataset.initiativeId = wp.initiativeId;
                        wpStartCell.appendChild(wpStartInput);
                        wpRow.appendChild(wpStartCell);

                        // WP End
                        const wpEndCell = document.createElement('td');
                        wpEndCell.className = 'gantt-table__cell gantt-table__cell--wp';
                        const wpEndInput = document.createElement('input');
                        wpEndInput.type = 'date';
                        wpEndInput.value = wp.endDate || '';
                        wpEndInput.dataset.kind = 'work-package';
                        wpEndInput.dataset.field = 'endDate';
                        wpEndInput.dataset.wpId = wp.workPackageId;
                        wpEndInput.dataset.initiativeId = wp.initiativeId;
                        wpEndCell.appendChild(wpEndInput);
                        wpRow.appendChild(wpEndCell);

                        // WP SDE
                        const wpSdeCell = document.createElement('td');
                        wpSdeCell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-sde';
                        wpSdeCell.textContent = this.computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam);
                        wpRow.appendChild(wpSdeCell);

                        // WP Dependencies (DOM Creator)
                        const wpDepsCell = document.createElement('td');
                        wpDepsCell.className = 'gantt-table__cell gantt-table__cell--wp';
                        wpDepsCell.appendChild(this.createPredecessorSelector(allWorkPackages, wp));
                        wpRow.appendChild(wpDepsCell);

                        // WP Actions
                        const wpActionsCell = document.createElement('td');
                        wpActionsCell.className = 'gantt-table__cell gantt-table__cell--wp';
                        const deleteWpBtn = document.createElement('button');
                        deleteWpBtn.dataset.action = 'delete-wp';
                        deleteWpBtn.dataset.id = wp.workPackageId;
                        deleteWpBtn.dataset.initiativeId = wp.initiativeId;
                        deleteWpBtn.className = 'btn-danger';
                        deleteWpBtn.textContent = 'Delete';
                        wpActionsCell.appendChild(deleteWpBtn);
                        wpRow.appendChild(wpActionsCell);

                        tbody.appendChild(wpRow);

                        // Assignments
                        if (wpExpanded) {
                            const teamFilterActive = this.currentGanttGroupBy === 'Team' && selectedTeam && selectedTeam !== 'all';
                            const assigns = wp.impactedTeamAssignments || [];
                            const selectedAssignments = teamFilterActive ? assigns.filter(a => a.teamId === selectedTeam) : assigns;
                            const otherAssignments = teamFilterActive ? assigns.filter(a => a.teamId !== selectedTeam) : [];
                            const showOtherTeams = !teamFilterActive || this.ganttOtherTeamsExpanded.has(wp.workPackageId);
                            const visibleAssignments = showOtherTeams ? assigns : selectedAssignments;

                            visibleAssignments.forEach(assign => {
                                const assignRow = document.createElement('tr');
                                const assignTaskId = this.buildAssignmentTaskId(wp.workPackageId, assign.teamId);
                                const isFocusAssign = focus.taskType === 'assignment' && focus.taskId && assignTaskId && this.normalizeGanttId(assignTaskId) === focus.taskId;
                                assignRow.className = [
                                    'gantt-wp-assign-row',
                                    isFocusAssign ? 'gantt-focus-row' : '',
                                    isFocusInitiative ? 'gantt-focus-initiative' : ''
                                ].filter(Boolean).join(' ');

                                const sdeYears = ((assign.sdeDays || 0) / workingDaysPerYear).toFixed(2);

                                const teamCell = document.createElement('td');
                                teamCell.className = 'gantt-table__cell--assignment';
                                teamCell.textContent = `Team: ${this.getTeamName(assign.teamId) || '(Unassigned)'}`;
                                assignRow.appendChild(teamCell);

                                if (showManagerTeams) {
                                    const emptyTeamCell = document.createElement('td');
                                    emptyTeamCell.className = 'gantt-table__cell--assignment-empty';
                                    assignRow.appendChild(emptyTeamCell);
                                }

                                const startCell = document.createElement('td');
                                startCell.className = 'gantt-table__cell--assignment-empty';
                                const startInput = document.createElement('input');
                                startInput.type = 'date';
                                startInput.value = assign.startDate || wp.startDate || '';
                                startInput.dataset.kind = 'wp-assign';
                                startInput.dataset.field = 'startDate';
                                startInput.dataset.wpId = wp.workPackageId;
                                startInput.dataset.initiativeId = wp.initiativeId;
                                startInput.dataset.teamId = assign.teamId || '';
                                startCell.appendChild(startInput);
                                assignRow.appendChild(startCell);

                                const endCell = document.createElement('td');
                                endCell.className = 'gantt-table__cell--assignment-empty';
                                const endInput = document.createElement('input');
                                endInput.type = 'date';
                                endInput.value = assign.endDate || wp.endDate || '';
                                endInput.dataset.kind = 'wp-assign';
                                endInput.dataset.field = 'endDate';
                                endInput.dataset.wpId = wp.workPackageId;
                                endInput.dataset.initiativeId = wp.initiativeId;
                                endInput.dataset.teamId = assign.teamId || '';
                                endCell.appendChild(endInput);
                                assignRow.appendChild(endCell);

                                const sdeCell = document.createElement('td');
                                sdeCell.className = 'gantt-table__cell--assignment-empty';
                                const sdeInput = document.createElement('input');
                                sdeInput.type = 'number';
                                sdeInput.step = '0.01';
                                sdeInput.value = sdeYears;
                                sdeInput.dataset.kind = 'wp-assign';
                                sdeInput.dataset.field = 'sdeYears';
                                sdeInput.dataset.wpId = wp.workPackageId;
                                sdeInput.dataset.initiativeId = wp.initiativeId;
                                sdeInput.dataset.teamId = assign.teamId || '';
                                sdeCell.appendChild(sdeInput);
                                assignRow.appendChild(sdeCell);

                                // Dependencies (DOM Creator)
                                const depsCell = document.createElement('td');
                                depsCell.className = 'gantt-table__cell--assignment-empty';
                                depsCell.appendChild(this.createAssignmentPredecessorSelector(wp, assign));
                                assignRow.appendChild(depsCell);

                                const actionsCell = document.createElement('td');
                                actionsCell.className = 'gantt-table__cell--assignment-empty';
                                assignRow.appendChild(actionsCell);

                                tbody.appendChild(assignRow);
                            });

                            if (teamFilterActive && otherAssignments.length) {
                                const toggleRow = document.createElement('tr');

                                const labelCell = document.createElement('td');
                                labelCell.className = 'gantt-table__cell--other-teams';
                                labelCell.textContent = `Other teams (${otherAssignments.length})`;
                                toggleRow.appendChild(labelCell);

                                if (showManagerTeams) {
                                    const emptyCell = document.createElement('td');
                                    emptyCell.className = 'gantt-table__cell--other-teams-action';
                                    toggleRow.appendChild(emptyCell);
                                }

                                const actionCell = document.createElement('td');
                                actionCell.className = 'gantt-table__cell--other-teams-action';
                                actionCell.colSpan = 4;
                                const toggleBtn = document.createElement('button');
                                toggleBtn.dataset.action = 'toggle-other-teams';
                                toggleBtn.dataset.wpId = wp.workPackageId;
                                toggleBtn.textContent = (showOtherTeams ? 'Hide' : 'Show') + ' other teams';
                                actionCell.appendChild(toggleBtn);
                                toggleRow.appendChild(actionCell);

                                const trailingCell = document.createElement('td');
                                trailingCell.className = 'gantt-table__cell--other-teams-action';
                                toggleRow.appendChild(trailingCell);

                                tbody.appendChild(toggleRow);
                            }
                        }
                    });
                }
            }
        });

        this.bindTableEvents(tbody);
    }

    bindTableEvents(tbody) {
        tbody.addEventListener('click', async (e) => {
            const target = e.target;
            const action = target.dataset.action;

            if (action === 'toggle-initiative') {
                const id = target.dataset.id;
                if (this.ganttExpandedInitiatives.has(id)) {
                    this.ganttExpandedInitiatives.delete(id);
                } else {
                    this.ganttExpandedInitiatives.add(id);
                }
                this.renderGanttTable();
                this.renderGanttChart();
            } else if (action === 'add-wp') {
                const id = target.dataset.id;
                const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === id);
                const defaults = { startDate: init?.displayStart, endDate: init?.displayEnd };
                const wp = WorkPackageService.addWorkPackage(SystemService.getCurrentSystem(), id, defaults);
                if (wp) {
                    this.ganttExpandedInitiatives.add(id);
                    this.ganttExpandedWorkPackages.add(wp.workPackageId);
                    WorkPackageService.syncInitiativeTotals(id, SystemService.getCurrentSystem());
                    if (typeof SystemService !== 'undefined' && SystemService.save) {
                        SystemService.save();
                    }
                    this.renderGanttTable();
                    this.renderGanttChart();
                }
            } else if (action === 'delete-wp') {
                const wpId = target.dataset.id;
                const initId = target.dataset.initiativeId;
                if (!await notificationManager.confirm('Delete this work package?', 'Delete Work Package', { confirmStyle: 'danger' })) {
                    return;
                }
                WorkPackageService.deleteWorkPackage(SystemService.getCurrentSystem(), wpId);
                this.ganttExpandedWorkPackages.delete(wpId);
                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
                if (typeof SystemService !== "undefined" && SystemService.save) {
                    SystemService.save();
                }
                this.renderGanttTable();
                this.renderGanttChart();
            } else if (action === 'toggle-wp') {
                const wpId = target.dataset.wpId;
                if (this.ganttExpandedWorkPackages.has(wpId)) {
                    this.ganttExpandedWorkPackages.delete(wpId);
                } else {
                    this.ganttExpandedWorkPackages.add(wpId);
                }
                this.renderGanttTable();
                this.renderGanttChart();
            } else if (action === 'toggle-other-teams') {
                const wpId = target.dataset.wpId;
                if (this.ganttOtherTeamsExpanded.has(wpId)) {
                    this.ganttOtherTeamsExpanded.delete(wpId);
                } else {
                    this.ganttOtherTeamsExpanded.add(wpId);
                }
                this.renderGanttTable();
            } else if (action === 'toggle-dep-menu') {
                const menuId = target.dataset.menuId;
                const menu = document.getElementById(menuId);
                if (!menu) return;
                menu.classList.toggle('open');
            }
        });

        tbody.addEventListener('change', (e) => {
            const field = e.target.dataset.field;
            const kind = e.target.dataset.kind;

            if (kind === 'initiative') {
                const id = e.target.dataset.id;
                const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === id);
                if (!init) return;

                const value = e.target.value;
                const hasWpsForInit = this.hasWorkPackagesForInitiative(id);

                if (field === 'startDate') {
                    if (hasWpsForInit) {
                        notificationManager.showToast('Initiative dates cannot be edited when work packages exist.', 'warning');
                        this.renderGanttTable();
                        return;
                    }
                    init.attributes = init.attributes || {};
                    init.attributes.startDate = value;
                } else if (field === 'targetDueDate') {
                    if (hasWpsForInit) {
                        notificationManager.showToast('Initiative dates cannot be edited when work packages exist.', 'warning');
                        this.renderGanttTable();
                        return;
                    }
                    init.targetDueDate = value;
                } else if (field === 'sdeEstimate') {
                    if (hasWpsForInit) {
                        notificationManager.showToast('SDE estimates cannot be edited when work packages exist.', 'warning');
                        this.renderGanttTable();
                        return;
                    }
                }
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();

            } else if (kind === 'work-package') {
                const wpId = e.target.dataset.wpId;
                const initId = e.target.dataset.initiativeId;
                const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
                if (!wp) return;

                const value = e.target.value;
                if (field === 'title') {
                    wp.title = value;
                } else if (field === 'startDate') {
                    const selectedTeam = (this.currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
                    this.setWorkPackageDatesForTeam(initId, { startDate: value }, selectedTeam);
                } else if (field === 'endDate') {
                    const selectedTeam = (this.currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
                    this.setWorkPackageDatesForTeam(initId, { endDate: value }, selectedTeam);
                }

                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();

            } else if (kind === 'wp-assign') {
                const wpId = e.target.dataset.wpId;
                const teamId = e.target.dataset.teamId;
                const initId = e.target.dataset.initiativeId;
                const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
                if (!wp) return;

                const assign = (wp.impactedTeamAssignments || []).find(a => a.teamId === teamId);
                if (!assign) return;

                const value = e.target.value;
                if (field === 'startDate') assign.startDate = value;
                if (field === 'endDate') assign.endDate = value;
                if (field === 'sdeYears') {
                    const workingDays = this.getWorkingDaysPerYear();
                    assign.sdeDays = parseFloat(value) * workingDays;
                }

                WorkPackageService.recalculateWorkPackageDates(wp);
                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();

            } else if (kind === 'wp-assign-dep') {
                const wpId = e.target.dataset.wpId;
                const assignId = e.target.dataset.assignId;
                const depId = e.target.dataset.value;

                const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
                if (!wp || !assignId || !depId) return;
                const assign = this.getAssignmentByTaskId(wp, assignId);
                if (!assign) return;

                const deps = new Set((Array.isArray(assign.dependencies) ? assign.dependencies : []).map(this.normalizeGanttId).filter(Boolean));
                const depNorm = this.normalizeGanttId(depId);

                if (e.target.checked) {
                    if (depNorm === this.normalizeGanttId(assignId)) {
                        e.target.checked = false;
                        notificationManager.showToast('A task cannot depend on itself.', 'warning');
                        return;
                    }
                    if (GanttService.wouldCreateAssignmentCycle(wp, assignId, depId)) {
                        e.target.checked = false;
                        notificationManager.showToast('Circular dependency not allowed.', 'warning');
                        return;
                    }
                    deps.add(depNorm);
                } else {
                    deps.delete(depNorm);
                }
                assign.dependencies = Array.from(deps);
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();

            } else if (kind === 'wp-dep') {
                const wpId = e.target.dataset.wpId;
                const depId = e.target.dataset.value;
                const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
                if (!wp) return;

                const deps = new Set(wp.dependencies || []);
                if (e.target.checked) {
                    const allWps = SystemService.getCurrentSystem().workPackages || [];
                    if (GanttService.wouldCreateDependencyCycle(wpId, depId, allWps)) {
                        e.target.checked = false;
                        notificationManager.showToast('Circular dependency not allowed.', 'warning');
                        return;
                    }
                    deps.add(depId);
                } else {
                    deps.delete(depId);
                }
                wp.dependencies = Array.from(deps);
                this.syncInitiativeDependenciesFromWorkPackages(wp.initiativeId);
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();

            } else if (kind === 'init-dep') {
                const initId = e.target.dataset.initId;
                const depId = e.target.dataset.value;
                const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initId);
                if (!initiative) return;

                const deps = new Set(initiative.dependencies || []);
                if (e.target.checked) {
                    deps.add(depId);
                } else {
                    deps.delete(depId);
                }
                initiative.dependencies = Array.from(deps);
                SystemService.save();
                this.renderGanttTable();
                this.renderGanttChart();
            }
        });
    }

    // ==========================================
    // DOM ELEMENT CREATION METHODS (Selectors)
    // ==========================================

    createInitiativePredecessorSelector(allInitiatives, init) {
        const options = (allInitiatives || []).filter(other => other.initiativeId !== init.initiativeId);
        const initMap = new Map((allInitiatives || []).map(i => [i.initiativeId, i]));
        const selected = new Set(init.dependencies || []);
        const selectedLabels = Array.from(selected).map(id => {
            const found = initMap.get(id);
            if (found) {
                return `${found.initiativeId}${found.title ? ` — ${found.title}` : ''}`;
            }
            return id;
        });
        const labelText = selectedLabels.length ? this.truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
        const menuId = `init-deps-${init.initiativeId}`;

        const container = document.createElement('div');
        container.className = 'gantt-predecessor-select';
        container.dataset.initId = init.initiativeId;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary gantt-predecessor-btn';
        btn.dataset.action = 'toggle-dep-menu';
        btn.dataset.menuId = menuId;
        btn.dataset.initId = init.initiativeId;
        btn.textContent = labelText;
        container.appendChild(btn);

        const menu = document.createElement('div');
        menu.className = 'gantt-predecessor-menu';
        menu.id = menuId;

        if (options.length) {
            options.forEach(other => {
                const label = document.createElement('label');
                label.className = 'gantt-predecessor-option';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.dataset.kind = 'init-dep';
                cb.dataset.initId = init.initiativeId;
                cb.dataset.value = other.initiativeId;
                cb.checked = selected.has(other.initiativeId);

                const span = document.createElement('span');
                span.textContent = `${other.initiativeId} — ${other.title || 'Untitled'}`;

                label.appendChild(cb);
                label.appendChild(span);
                menu.appendChild(label);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'gantt-predecessor-empty';
            empty.textContent = 'No other initiatives';
            menu.appendChild(empty);
        }

        container.appendChild(menu);
        return container;
    }

    createPredecessorSelector(allWorkPackages, wp) {
        const options = (allWorkPackages || []).filter(other => other.workPackageId !== wp.workPackageId);
        const wpMap = new Map((allWorkPackages || []).map(w => [w.workPackageId, w]));
        const selected = new Set(wp.dependencies || []);
        const selectedLabels = Array.from(selected).map(id => {
            const found = wpMap.get(id);
            if (found) {
                return `${found.workPackageId}${found.title ? ` — ${found.title}` : ''}`;
            }
            return id;
        });
        const labelText = selectedLabels.length ? this.truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
        const menuId = `wp-deps-${wp.workPackageId}`;

        const container = document.createElement('div');
        container.className = 'gantt-predecessor-select';
        container.dataset.wpId = wp.workPackageId;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary gantt-predecessor-btn';
        btn.dataset.action = 'toggle-dep-menu';
        btn.dataset.menuId = menuId;
        btn.dataset.wpId = wp.workPackageId;
        btn.textContent = labelText;
        container.appendChild(btn);

        const menu = document.createElement('div');
        menu.className = 'gantt-predecessor-menu';
        menu.id = menuId;

        if (options.length) {
            options.forEach(other => {
                const label = document.createElement('label');
                label.className = 'gantt-predecessor-option';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.dataset.kind = 'wp-dep';
                cb.dataset.wpId = wp.workPackageId;
                cb.dataset.value = other.workPackageId;
                cb.checked = selected.has(other.workPackageId);

                const initLabel = other.initiativeId ? ` [${other.initiativeId}]` : '';
                const span = document.createElement('span');
                span.textContent = `${other.workPackageId}${initLabel} — ${other.title || 'Untitled'}`;

                label.appendChild(cb);
                label.appendChild(span);
                menu.appendChild(label);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'gantt-predecessor-empty';
            empty.textContent = 'No other work packages';
            menu.appendChild(empty);
        }

        container.appendChild(menu);
        return container;
    }

    createAssignmentPredecessorSelector(wp, assign) {
        if (!wp || !assign) return document.createTextNode('');
        const assignments = wp.impactedTeamAssignments || [];
        const currentId = this.buildAssignmentTaskId(wp.workPackageId, assign.teamId);
        if (!currentId) return document.createTextNode('');

        const assignmentMap = new Map();
        assignments.forEach(a => {
            const id = this.buildAssignmentTaskId(wp.workPackageId, a.teamId);
            if (id) assignmentMap.set(id, a);
        });

        const options = assignments
            .map(a => ({ id: this.buildAssignmentTaskId(wp.workPackageId, a.teamId), teamId: a.teamId }))
            .filter(opt => opt.id && this.normalizeGanttId(opt.id) !== this.normalizeGanttId(currentId));

        const selected = new Set((Array.isArray(assign.dependencies) ? assign.dependencies : []).map(this.normalizeGanttId).filter(Boolean));
        const selectedLabels = Array.from(selected).map(id => {
            const found = assignmentMap.get(id);
            if (found) {
                return this.getTeamName(found.teamId) || found.teamId || id;
            }
            return id;
        });

        const labelText = selectedLabels.length ? this.truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
        const menuId = `assign-deps-${currentId}`;

        const container = document.createElement('div');
        container.className = 'gantt-predecessor-select';
        container.dataset.assignId = currentId;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary gantt-predecessor-btn';
        btn.dataset.action = 'toggle-dep-menu';
        btn.dataset.menuId = menuId;
        btn.dataset.wpId = wp.workPackageId;
        btn.dataset.assignId = currentId;
        btn.dataset.initiativeId = wp.initiativeId;
        btn.textContent = labelText;
        container.appendChild(btn);

        const menu = document.createElement('div');
        menu.className = 'gantt-predecessor-menu';
        menu.id = menuId;

        if (options.length) {
            options.forEach(opt => {
                const label = document.createElement('label');
                label.className = 'gantt-predecessor-option';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.dataset.kind = 'wp-assign-dep';
                cb.dataset.wpId = wp.workPackageId;
                cb.dataset.initiativeId = wp.initiativeId;
                cb.dataset.assignId = currentId;
                cb.dataset.value = opt.id;
                cb.checked = selected.has(this.normalizeGanttId(opt.id));

                const span = document.createElement('span');
                span.textContent = this.getTeamName(opt.teamId) || opt.teamId || opt.id;

                label.appendChild(cb);
                label.appendChild(span);
                menu.appendChild(label);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'gantt-predecessor-empty';
            empty.textContent = 'No other tasks in this work package';
            menu.appendChild(empty);
        }

        container.appendChild(menu);
        return container;
    }

    // ==========================================
    // DATA & CALCULATION HELPERS
    // ==========================================

    getWorkingDaysPerYear() {
        return SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
    }

    getWorkPackagesForInitiative(initiativeId) {
        if (!initiativeId) return [];
        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), this.currentGanttYear);
        return (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
    }

    hasWorkPackagesForInitiative(initiativeId) {
        return (SystemService.getCurrentSystem().workPackages || []).some(wp => wp.initiativeId === initiativeId);
    }

    getTeamName(teamId) {
        const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === teamId);
        return team ? (team.teamIdentity || team.teamName || teamId) : teamId;
    }

    getTeamsByManager(managerId) {
        const teams = new Set();
        (SystemService.getCurrentSystem().teams || []).forEach(team => {
            if (team.sdmId === managerId) teams.add(team.teamId);
        });
        return teams;
    }

    getTeamsForInitiative(init) {
        const teamNames = [];
        (init.assignments || []).forEach(a => {
            const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === a.teamId);
            if (team) {
                teamNames.push(team.teamIdentity || team.teamName || a.teamId);
            }
        });
        return teamNames.length ? teamNames : ['(None)'];
    }

    formatWorkPackageTeams(wp, selectedTeam = null) {
        const teams = new Set();
        (wp?.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === assign.teamId);
            if (team) teams.add(team.teamIdentity || team.teamName || assign.teamId);
        });
        if (teams.size === 0 && selectedTeam && selectedTeam !== 'all') {
            return '(Selected team not assigned)';
        }
        return teams.size ? Array.from(teams).join(', ') : '(Unassigned)';
    }

    computeSdeEstimate(init) {
        const selectedGroupValue = document.getElementById('ganttGroupValue')?.value || 'all';
        let total = 0;
        (init.assignments || []).forEach(a => {
            if (this.currentGanttGroupBy === 'Team' && selectedGroupValue !== 'all') {
                if (a.teamId === selectedGroupValue) {
                    total += a.sdeYears || 0;
                }
            } else {
                total += a.sdeYears || 0;
            }
        });
        return total.toFixed(2);
    }

    computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam = null) {
        const wpy = workingDaysPerYear || this.getWorkingDaysPerYear();
        const assignments = wp?.impactedTeamAssignments || [];
        const filtered = (selectedTeam && selectedTeam !== 'all')
            ? assignments.filter(a => a.teamId === selectedTeam)
            : assignments;
        const totalDays = filtered.reduce((sum, a) => sum + (a.sdeDays || 0), 0);
        return (totalDays / wpy).toFixed(2);
    }

    getComputedInitiativeDates(init, selectedTeam = null) {
        // Prefer work package spans
        const workPackages = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === init.initiativeId);
        const year = init.attributes?.planningYear || this.currentGanttYear || new Date().getFullYear();
        const defaultStart = `${year}-01-15`;
        const defaultEnd = `${year}-11-01`;
        let earliest = null;
        let latest = null;

        workPackages.forEach(wp => {
            let hasMatchingAssignment = false;
            (wp.impactedTeamAssignments || []).forEach(assign => {
                if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
                hasMatchingAssignment = true;
                if (assign.startDate) {
                    if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
                }
                if (assign.endDate) {
                    if (!latest || assign.endDate > latest) latest = assign.endDate;
                }
            });
            if (!hasMatchingAssignment) {
                if (wp.startDate && (!earliest || wp.startDate < earliest)) earliest = wp.startDate;
                if (wp.endDate && (!latest || wp.endDate > latest)) latest = wp.endDate;
            }
        });
        return {
            startDate: earliest || init.attributes?.startDate || defaultStart,
            endDate: latest || init.targetDueDate || defaultEnd
        };
    }

    getAssignmentByTaskId(wp, assignTaskId) {
        if (!wp || !assignTaskId) return null;
        const targetNorm = this.normalizeGanttId(assignTaskId);
        return (wp.impactedTeamAssignments || []).find(assign => {
            const id = this.buildAssignmentTaskId(wp.workPackageId, assign.teamId);
            if (!id) return false;
            return this.normalizeGanttId(id) === targetNorm;
        }) || null;
    }

    setWorkPackageDatesForTeam(initiativeId, { startDate, endDate }, selectedTeam = null) {
        if (!initiativeId) return;
        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem());
        const wps = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
        wps.forEach(wp => {
            (wp.impactedTeamAssignments || []).forEach(assign => {
                if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
                if (startDate) assign.startDate = startDate;
                if (endDate) assign.endDate = endDate;
            });
            WorkPackageService.recalculateWorkPackageDates(wp);
            // Fallback logic for safety
            if (startDate) wp.startDate = startDate;
            if (endDate) wp.endDate = endDate;
        });
        WorkPackageService.syncInitiativeTotals(initiativeId, SystemService.getCurrentSystem());
    }

    updateWorkPackageSde(initiativeId, teamId, sdeYears, workingDaysPerYear) {
        if (!initiativeId) return;
        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem());
        const wps = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
        const sdeDays = (sdeYears || 0) * (workingDaysPerYear || 261);
        wps.forEach(wp => {
            let updated = false;
            (wp.impactedTeamAssignments || []).forEach(assign => {
                if (!teamId || teamId === 'all' || assign.teamId === teamId) {
                    assign.sdeDays = sdeDays;
                    updated = true;
                }
            });
            if (!updated && teamId) {
                wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];
                wp.impactedTeamAssignments.push({
                    teamId,
                    sdeDays,
                    startDate: wp.startDate,
                    endDate: wp.endDate
                });
            }
            WorkPackageService.recalculateWorkPackageDates(wp);
        });
        WorkPackageService.syncInitiativeTotals(initiativeId, SystemService.getCurrentSystem());
    }

    syncInitiativeDependenciesFromWorkPackages(initiativeId) {
        if (!initiativeId) return;
        const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        if (!initiative) return;
        const deps = new Set();
        const wps = (SystemService.getCurrentSystem().workPackages || []).filter(w => w.initiativeId === initiativeId);
        wps.forEach(wp => {
            (wp.dependencies || []).forEach(depWpId => {
                const targetWp = (SystemService.getCurrentSystem().workPackages || []).find(other => other.workPackageId === depWpId);
                if (targetWp && targetWp.initiativeId && targetWp.initiativeId !== initiativeId) {
                    deps.add(targetWp.initiativeId);
                }
            });
        });
        initiative.dependencies = Array.from(deps);
    }

    // ==========================================
    // CHART RENDERING & INTERACTION
    // ==========================================

    async renderGanttChart() {
        const container = document.getElementById('ganttChartContainer');
        if (!container) return;

        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), this.currentGanttYear);
        const focus = this.getGanttFocusContext();
        const selectedTeam = (this.currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
        const initiatives = this.getGanttFilteredInitiatives();

        if (!initiatives || initiatives.length === 0) {
            container.textContent = 'No initiatives to display.';
            return;
        }

        const tasks = (typeof ganttAdapter !== 'undefined')
            ? ganttAdapter.buildTasksFromInitiatives({
                initiatives,
                workPackages: SystemService.getCurrentSystem().workPackages || [],
                viewBy: this.currentGanttGroupBy,
                filters: { status: this.ganttStatusFilter },
                year: this.currentGanttYear,
                selectedTeam: selectedTeam,
                expandedInitiativeIds: this.ganttExpandedInitiatives,
                expandedWorkPackageIds: this.ganttExpandedWorkPackages
            })
            : [];

        // Use Factory to get the correct renderer
        if (!this.ganttChartInstance) {
            this.ganttChartInstance = GanttFactory.createRenderer(container);
        } else {
            // Check renderer type change
            const currentType = FeatureFlags.getRenderer();
            const isMermaid = this.ganttChartInstance instanceof MermaidGanttRenderer;
            const isFrappe = this.ganttChartInstance instanceof FrappeGanttRenderer;

            if ((currentType === 'mermaid' && !isMermaid) || (currentType === 'frappe' && !isFrappe)) {
                this.ganttChartInstance = GanttFactory.createRenderer(container);
            }
        }

        // Dynamic height logic
        container.style.minHeight = '600px';

        this.ganttChartInstance.container = container;

        await this.ganttChartInstance.render(tasks, {
            title: `Detailed Plan - ${this.currentGanttYear}`,
            year: this.currentGanttYear,
            metaInitiativeCount: initiatives.length,
            focus,
            onUpdate: (update) => {
                this.handleGanttUpdate(update);
            },
            onItemDoubleClick: (task) => {
                this.handleGanttToggleFromChart(task);
            }
        });

        this.scrollToGanttFocusTask();
    }

    handleGanttUpdate({ task, start, end }) {
        console.log('[GANTT] Update received:', task, start, end);

        if (task) {
            this.setLastGanttFocus({
                taskId: task.id || task.workPackageId || task.initiativeId || null,
                taskType: task.type || null,
                initiativeId: task.initiativeId || null
            });
        }

        if (task.type === 'initiative') {
            const initId = task.initiativeId;
            const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initId);
            if (!init) return;

            if (this.hasWorkPackagesForInitiative(initId)) {
                console.warn('Initiative dates locked: work packages exist.');
                this.renderGanttChart();
                return;
            }

            init.attributes = init.attributes || {};
            init.attributes.startDate = start;
            init.targetDueDate = end;
            this.setWorkPackageDatesForTeam(initId, { startDate: start, endDate: end });

        } else if (task.type === 'workPackage') {
            const wpId = task.workPackageId;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;

            const assignments = wp.impactedTeamAssignments || [];
            if (assignments.length > 1) {
                console.warn('Work package dates locked: multiple tasks present.');
                this.renderGanttChart();
                return;
            }

            wp.startDate = start;
            wp.endDate = end;
            (assignments || []).forEach(assign => {
                assign.startDate = start;
                assign.endDate = end;
            });

        } else if (task.type === 'assignment') {
            const wpId = task.workPackageId;
            const teamId = task.teamId;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;

            const assign = (wp.impactedTeamAssignments || []).find(a => a.teamId === teamId);
            if (!assign) return;

            assign.startDate = start;
            assign.endDate = end;
            WorkPackageService.recalculateWorkPackageDates(wp);
            if (task.initiativeId) {
                WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
            }
        }

        if (task.initiativeId) {
            WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
        }
        if (typeof SystemService !== "undefined" && SystemService.save) {
            SystemService.save();
        }

        this.renderGanttTable();
        this.renderGanttChart();
    }

    handleGanttToggleFromChart(task) {
        if (!task || !task.type) return;
        if (task.type === 'initiative') {
            const id = task.initiativeId;
            if (!id) return;
            if (this.ganttExpandedInitiatives.has(id)) {
                this.ganttExpandedInitiatives.clear();
            } else {
                this.ganttExpandedInitiatives.clear();
                if (this.hasWorkPackagesForInitiative(id)) {
                    this.ganttExpandedInitiatives.add(id);
                }
            }
            this.ganttExpandedWorkPackages.clear();
        } else if (task.type === 'workPackage') {
            const wpId = task.workPackageId;
            if (!wpId) return;
            if (task.initiativeId) {
                this.ganttExpandedInitiatives.clear();
                this.ganttExpandedInitiatives.add(task.initiativeId);
            }
            if (this.ganttExpandedWorkPackages.has(wpId)) {
                this.ganttExpandedWorkPackages.clear();
            } else {
                this.ganttExpandedWorkPackages.clear();
                this.ganttExpandedWorkPackages.add(wpId);
            }
        } else if (task.type === 'assignment') {
            const wpId = task.workPackageId;
            if (wpId) {
                if (task.initiativeId) {
                    this.ganttExpandedInitiatives.clear();
                    this.ganttExpandedInitiatives.add(task.initiativeId);
                }
                this.ganttExpandedWorkPackages.clear();
                this.ganttExpandedWorkPackages.add(wpId);
            }
        }

        this.setLastGanttFocus({
            taskId: task.id || null,
            taskType: task.type || null,
            initiativeId: task.initiativeId || null
        });

        this.renderGanttTable();
        this.renderGanttChart();
    }

    setLastGanttFocus({ taskId, taskType, initiativeId }) {
        this.lastGanttFocusTaskId = taskId;
        this.lastGanttFocusTaskType = taskType;
        this.lastGanttFocusInitiativeId = initiativeId;
    }

    getGanttFocusContext() {
        return {
            taskId: this.lastGanttFocusTaskId,
            taskType: this.lastGanttFocusTaskType,
            initiativeId: this.lastGanttFocusInitiativeId
        };
    }

    scrollToGanttFocusTask() {
        if (!this.lastGanttFocusTaskId) return;
        const focusId = this.normalizeGanttId(this.lastGanttFocusTaskId);
        if (!focusId) return;
        const container = document.getElementById('ganttChartContainer');
        if (!container) return;
        const target = Array.from(container.querySelectorAll('.bar-wrapper'))
            .find(el => this.normalizeGanttId(el.getAttribute('data-id')) === focusId);
        if (target) {
            target.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
    }

    renderDynamicGroupFilter() {
        const wrap = document.getElementById('ganttDynamicFilter');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (this.currentGanttGroupBy === 'Team') {
            const select = document.createElement('select');
            select.id = 'ganttGroupValue';
            const defaultOption = document.createElement('option');
            defaultOption.value = 'all';
            defaultOption.textContent = 'All Teams';
            select.appendChild(defaultOption);
            (SystemService.getCurrentSystem().teams || [])
                .slice()
                .sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
                .forEach(team => {
                    const opt = document.createElement('option');
                    opt.value = team.teamId;
                    opt.textContent = team.teamIdentity || team.teamName;
                    select.appendChild(opt);
                });
            select.onchange = () => {
                this.renderGanttTable();
                this.renderGanttChart();
            };
            wrap.appendChild(this.createLabeledControl('Team:', select));
        } else {
            const placeholder = document.createElement('div');
            placeholder.textContent = '';
            wrap.appendChild(placeholder);
        }
        this.renderGanttChart();
    }

    getRendererButtonLabel() {
        const r = FeatureFlags.getRenderer();
        return (r === 'mermaid') ? 'Switch to Interactive (Frappe)' : 'Switch to Static (Mermaid)';
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements AI_VIEW_REGISTRY contract
     */
    getAIContext() {
        return {
            viewTitle: 'Detailed Planning (Gantt)',
            currentYear: this.currentGanttYear,
            groupBy: this.currentGanttGroupBy,
            initiativesCount: this.getGanttFilteredInitiatives().length,
            expandedInitiatives: this.ganttExpandedInitiatives.size,
            statusFilters: Array.from(this.ganttStatusFilter)
        };
    }
}
