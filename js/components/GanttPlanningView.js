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
 * - No module-level globals (all state in class instance)
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

        // MVC Controller instance (new architecture)
        this.tableController = null;

        // Chart renderer instance
        this.chartRenderer = null;

        // Dirty state tracking for Save button
        this._isDirty = false;
        this._saveBtn = null;

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
            this.chartRenderer = null;

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
        this.renderDynamicGroupFilter();
        this.renderStatusFilter();
        this.setupGanttRendererToggle();

        // Defer table render to after browser layout completes
        // Container has 0 dimensions until flex layout is calculated
        requestAnimationFrame(() => {
            this.renderGanttTable();
            this.renderGanttChart();
            this.setupScrollSync(); // Sync vertical scroll between table and chart
        });
    }

    /**
     * Sets up bidirectional scroll synchronization between table and chart.
     * When the user scrolls the table, the chart scrolls to match, and vice versa.
     */
    setupScrollSync() {
        const tableContainer = document.getElementById('ganttPlanningTableContainer');
        const chartWrapper = document.getElementById('ganttChartContainer');

        if (!tableContainer || !chartWrapper) return;

        // Frappe Gantt creates its own scrollable container - find it
        // The actual scrollable element might be .gantt-container, .gantt, or the wrapper itself
        const frappeScrollable = chartWrapper.querySelector('.gantt-container')
            || chartWrapper.querySelector('.gantt')
            || chartWrapper;

        // Also get the table's scrollable wrapper if it exists
        const tableScrollable = tableContainer.querySelector('.gantt-table-wrapper')
            || tableContainer;

        // Prevent infinite scroll loops
        let syncing = false;

        const syncScrollHandler = (source, target) => {
            return () => {
                if (syncing) return;
                syncing = true;

                // Match vertical scroll position
                target.scrollTop = source.scrollTop;

                requestAnimationFrame(() => {
                    syncing = false;
                });
            };
        };

        // Remove any previous listeners to prevent duplicates
        if (tableScrollable._syncHandler) {
            tableScrollable.removeEventListener('scroll', tableScrollable._syncHandler);
        }
        if (frappeScrollable._syncHandler) {
            frappeScrollable.removeEventListener('scroll', frappeScrollable._syncHandler);
        }

        // Create and store handlers for cleanup
        tableScrollable._syncHandler = syncScrollHandler(tableScrollable, frappeScrollable);
        frappeScrollable._syncHandler = syncScrollHandler(frappeScrollable, tableScrollable);

        tableScrollable.addEventListener('scroll', tableScrollable._syncHandler);
        frappeScrollable.addEventListener('scroll', frappeScrollable._syncHandler);

        console.log('[GanttPlanningView] Scroll sync setup:', {
            tableScrollable: tableScrollable.className || tableScrollable.id,
            frappeScrollable: frappeScrollable.className || frappeScrollable.id
        });
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
        const yearWrap = document.createElement('div');
        yearWrap.className = 'filter-item';
        yearWrap.style.display = 'flex';
        yearWrap.style.alignItems = 'center';
        yearWrap.style.gap = '6px';

        const yearLabel = document.createElement('span');
        yearLabel.textContent = 'Year:';
        yearLabel.style.fontWeight = '600';
        yearWrap.appendChild(yearLabel);

        // Build year options
        const years = Array.from(new Set(
            (SystemService.getCurrentSystem()?.yearlyInitiatives || [])
                .map(init => init.attributes?.planningYear)
                .filter(y => y)
        )).sort().reverse();
        if (!years.includes(this.currentGanttYear)) years.push(this.currentGanttYear);

        // Year select (using ThemedSelect)
        this.yearSelect = new ThemedSelect({
            options: years.map(y => ({ value: y, text: y.toString() })),
            value: this.currentGanttYear,
            className: 'themed-select--sm',
            onChange: (val) => {
                this.handleGanttYearChange(parseInt(val));
            }
        });
        yearWrap.appendChild(this.yearSelect.render());
        toolbar.appendChild(yearWrap);

        // Status Filter
        const statusWrap = document.createElement('div');
        statusWrap.className = 'filter-item';
        statusWrap.style.display = 'flex';
        statusWrap.style.alignItems = 'center';
        statusWrap.style.gap = '6px';
        statusWrap.style.minWidth = '200px';

        const statusLabel = document.createElement('span');
        statusLabel.textContent = 'Status:';
        statusLabel.style.fontWeight = '600';
        statusWrap.appendChild(statusLabel);

        // Use canonical statuses from service if available, otherwise derive from data
        const systemStatuses = InitiativeService.STATUSES || [];

        // Also include any data-derived statuses that might not be in the canonical list (legacy support)
        const rawInitiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
        const dataStatuses = Array.from(new Set(
            rawInitiatives
                .map(i => i.status ? String(i.status).trim() : 'Backlog')
                .filter(s => s.length > 0) // Filter out empty strings
        ));

        // Merge and dedupe, preferring canonical order
        const uniqueStatuses = Array.from(new Set([...systemStatuses, ...dataStatuses]));
        const validStatusSet = new Set(uniqueStatuses);

        // Default to all selected if filter empty, or use current filter
        const currentFilter = this.tableController?.model.getFilters().statusFilter;

        // Ensure we only use values that are actually valid options
        const validCurrentFilter = currentFilter
            ? Array.from(currentFilter).filter(s => validStatusSet.has(s))
            : [];

        const initialValue = validCurrentFilter.length > 0
            ? validCurrentFilter
            : uniqueStatuses;

        const statusSelect = new ThemedSelect({
            options: uniqueStatuses.map(s => ({ value: s, text: s })),
            value: initialValue,
            multiple: true,
            placeholder: 'Filter Status',
            className: 'themed-select--sm',
            onChange: (val) => {
                // val is array of selected statuses
                const newFilter = new Set(val);
                if (this.tableController) {
                    this.tableController.model.setFilter('statusFilter', newFilter);
                }
            }
        });

        statusWrap.appendChild(statusSelect.render());
        toolbar.appendChild(statusWrap);

        // View By selector
        const groupWrap = document.createElement('div');
        groupWrap.className = 'filter-item';
        groupWrap.style.display = 'flex';
        groupWrap.style.alignItems = 'center';
        groupWrap.style.gap = '6px';

        const groupLabel = document.createElement('span');
        groupLabel.textContent = 'View By:';
        groupLabel.style.fontWeight = '600';
        groupWrap.appendChild(groupLabel);

        const groupOptions = [
            { value: 'All Initiatives', text: 'View by All Initiatives' },
            { value: 'Team', text: 'View by Team' }
        ];

        this.groupSelect = new ThemedSelect({
            options: groupOptions,
            value: this.currentGanttGroupBy,
            id: 'ganttGroupBy',
            onChange: (value) => {
                this.currentGanttGroupBy = value;
                console.log('[GANTT] View By changed', this.currentGanttGroupBy);
                this.renderDynamicGroupFilter();
                this.renderGanttChart();
                this.renderGanttTable();
            }
        });

        groupWrap.appendChild(this.groupSelect.render());
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

        // Save Button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn btn-success btn-sm';
        saveBtn.title = 'Save changes to system';
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'default';
        saveBtn.onclick = () => this._save();
        this._saveBtn = saveBtn;
        toolbar.appendChild(saveBtn);

        // Refresh Button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.className = 'btn btn-primary btn-sm';
        refreshBtn.onclick = () => {
            this.renderGanttTable();
            this.renderGanttChart();
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
        rendererBtn.textContent = this.getRendererButtonLabel();
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
        // PER USER REQUEST: The Gantt Chart must be driven by the state of the Gantt Table (Model)
        if (this.tableController && this.tableController.model) {
            const filters = this.tableController.model.getFilters();
            return GanttService.getFilteredInitiatives({
                initiatives: SystemService.getCurrentSystem()?.yearlyInitiatives || [],
                year: filters.year || this.currentGanttYear,
                statusFilter: filters.statusFilter, // Use model's status filter
                groupBy: filters.groupBy || this.currentGanttGroupBy,
                groupValue: filters.groupValue || document.getElementById('ganttGroupValue')?.value || 'all',
                teams: SystemService.getCurrentSystem()?.teams || [],
                sdms: SystemService.getCurrentSystem()?.sdms || []
            });
        }

        // Fallback for initial load only
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

    /**
     * Sets up the resizable split pane between table and chart
     */
    setupGanttResizer() {
        const resizer = document.getElementById('ganttSplitResizer');
        const split = document.getElementById('ganttSplitPane');
        if (!resizer || !split) return;

        if (resizer.dataset.bound) {
            this.applyGanttSplitWidth();
            return;
        }
        resizer.dataset.bound = 'true';

        let isDragging = false;
        let startX = 0;
        let startPct = this.ganttTableWidthPct;

        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('mouseleave', stopDrag);
            try {
                localStorage.setItem(this.GANTT_TABLE_WIDTH_KEY, String(this.ganttTableWidthPct));
            } catch (err) {
                console.warn('[GANTT] Failed to persist split width', err);
            }
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            const rect = split.getBoundingClientRect();
            const delta = e.clientX - startX;
            const startPx = (startPct / 100) * rect.width;
            const newPx = startPx + delta;
            if (rect.width <= 0) return;
            this.ganttTableWidthPct = (newPx / rect.width) * 100;
            this.applyGanttSplitWidth();
        };

        resizer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startPct = this.ganttTableWidthPct;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('mouseleave', stopDrag);
        });

        window.addEventListener('resize', () => this.applyGanttSplitWidth());
    }

    /**
     * Applies the current table/chart split width
     */
    applyGanttSplitWidth() {
        const split = document.getElementById('ganttSplitPane');
        const table = document.getElementById('ganttPlanningTableContainer');
        const chart = document.getElementById('ganttChartWrapper');
        if (!split) return;

        const clamped = Math.min(85, Math.max(5, this.ganttTableWidthPct));
        this.ganttTableWidthPct = clamped;
        const chartPct = 100 - clamped;

        // Primary layout: CSS grid columns
        split.style.gridTemplateColumns = `${clamped}% 8px ${chartPct}%`;

        // Fallback for older layouts (flex)
        if (table) {
            table.style.flexBasis = `${clamped}%`;
        }
        if (chart) {
            chart.style.flexBasis = `${chartPct}%`;
        }
    }

    /**
     * Gets the renderer toggle button label
     */
    getRendererButtonLabel() {
        const current = FeatureFlags.getRenderer();
        return current === 'mermaid' ? 'Switch to Frappe' : 'Switch to Mermaid';
    }

    /**
     * Sets up the Mermaid/Frappe renderer toggle button
     */
    setupGanttRendererToggle() {
        const btn = document.getElementById('ganttRendererToggle');
        if (!btn || typeof FeatureFlags === 'undefined') return;

        const updateLabel = () => {
            btn.textContent = this.getRendererButtonLabel();
        };

        if (btn.dataset.bound === 'true') {
            updateLabel();
            return;
        }

        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
            const current = FeatureFlags.getRenderer();
            const next = current === 'mermaid' ? 'frappe' : 'mermaid';
            FeatureFlags.setRenderer(next);
            updateLabel();

            // Update legend visibility
            const legend = document.getElementById('ganttLegendContainer');
            if (legend) {
                legend.style.display = next === 'frappe' ? 'flex' : 'none';
            }

            this.chartRenderer = null; // Force re-create with new renderer
            this.renderGanttChart();
        });

        updateLabel();
    }

    /**
     * Renders the dynamic group filter (Team filter when View By Team is selected)
     */
    renderDynamicGroupFilter() {
        const wrap = document.getElementById('ganttDynamicFilter');
        if (!wrap) return;
        wrap.innerHTML = '';

        if (this.currentGanttGroupBy === 'Team') {
            // Build team options for ThemedSelect
            const teamOptions = [{ value: 'all', text: 'All Teams' }];
            (SystemService.getCurrentSystem().teams || [])
                .slice()
                .sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
                .forEach(team => {
                    teamOptions.push({
                        value: team.teamId,
                        text: team.teamIdentity || team.teamName
                    });
                });

            const teamSelect = new ThemedSelect({
                options: teamOptions,
                value: 'all',
                id: 'ganttGroupValue',
                onChange: () => {
                    this.renderGanttTable();
                    this.renderGanttChart();
                }
            });

            // Create label wrapper
            const labelWrap = document.createElement('div');
            labelWrap.className = 'filter-item';
            labelWrap.style.display = 'flex';
            labelWrap.style.alignItems = 'center';
            labelWrap.style.gap = '6px';

            const label = document.createElement('span');
            label.textContent = 'Team:';
            label.style.fontWeight = '600';
            labelWrap.appendChild(label);
            labelWrap.appendChild(teamSelect.render());

            wrap.appendChild(labelWrap);
        } else {
            // No extra filter for All Initiatives or other modes
            const placeholder = document.createElement('div');
            placeholder.textContent = '';
            wrap.appendChild(placeholder);
        }
        // Ensure table/chart refresh after rebuild
        this.renderGanttTable();
        this.renderGanttChart();
    }

    /**
     * Renders the Gantt chart using the configured renderer (Mermaid or Frappe)
     */
    async renderGanttChart() {
        const container = document.getElementById('ganttChartContainer');
        if (!container) return;

        // Expansion state is synced via syncExpansionState() from controller
        // No need to read from globals - viewInstance is the source of truth

        WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), this.currentGanttYear);

        const focus = this.getGanttFocusContext();
        const selectedTeam = (this.currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
        const initiatives = this.getGanttFilteredInitiatives();

        if (!initiatives || initiatives.length === 0) {
            container.textContent = 'No initiatives to display.';
            return;
        }

        // Helper to get normalized data from model (Single Source of Truth)
        const allSystemWPs = SystemService.getCurrentSystem().workPackages || [];
        // The model computes displayStart/displayEnd based on WP rollup
        const normalizedInitiatives = this.model.getNormalizedData(initiatives, allSystemWPs);

        // Build tasks using the gantt adapter with normalized data
        const tasks = (typeof ganttAdapter !== 'undefined' && ganttAdapter)
            ? ganttAdapter.buildTasksFromInitiatives({
                initiatives: normalizedInitiatives,
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
        if (!this.chartRenderer) {
            this.chartRenderer = GanttFactory.createRenderer(container);
        } else {
            // If renderer type changed, recreate instance
            const currentType = FeatureFlags.getRenderer();
            const isMermaid = this.chartRenderer instanceof MermaidGanttRenderer;
            const isFrappe = this.chartRenderer instanceof FrappeGanttRenderer;

            if ((currentType === 'mermaid' && !isMermaid) || (currentType === 'frappe' && !isFrappe)) {
                this.chartRenderer = GanttFactory.createRenderer(container);
            }
        }

        container.style.minHeight = '600px'; // Set a reasonable minimum base

        // Update container reference in case it changed
        this.chartRenderer.container = container;

        await this.chartRenderer.render(tasks, {
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

    /**
     * Gets the current focus context for highlighting
     */
    getGanttFocusContext() {
        return {
            taskId: this.lastGanttFocusTaskId ? this.normalizeGanttId(this.lastGanttFocusTaskId) : null,
            taskType: this.lastGanttFocusTaskType || null,
            initiativeId: this.lastGanttFocusInitiativeId ? this.normalizeGanttId(this.lastGanttFocusInitiativeId) : null
        };
    }

    /**
     * Sets the last focus for scroll preservation
     */
    setLastGanttFocus({ taskId, taskType, initiativeId }) {
        if (!taskId) return;
        this.lastGanttFocusTaskId = this.normalizeGanttId(taskId);
        this.lastGanttFocusTaskType = taskType || null;
        this.lastGanttFocusInitiativeId = initiativeId ? this.normalizeGanttId(initiativeId) : null;
    }

    /**
     * Syncs expansion state from GanttTableController.
     * Called by controller when expansion changes need to propagate to chart.
     * 
     * @param {Set<string>} expandedInitiatives - Set of expanded initiative IDs
     * @param {Set<string>} expandedWorkPackages - Set of expanded work package IDs
     */
    syncExpansionState(expandedInitiatives, expandedWorkPackages) {
        this.ganttExpandedInitiatives = new Set(expandedInitiatives);
        this.ganttExpandedWorkPackages = new Set(expandedWorkPackages);
    }

    /**
     * Handles toggle (expand/collapse) from chart double-click
     */
    handleGanttToggleFromChart(task) {
        if (!task || !task.type) return;

        if (task.type === 'initiative') {
            const id = task.initiativeId;
            if (!id) return;
            // Show only this initiative, collapse others and all WPs
            if (this.ganttExpandedInitiatives.has(id)) {
                this.ganttExpandedInitiatives.clear();
            } else {
                this.ganttExpandedInitiatives.clear();
                const hasWPs = (SystemService.getCurrentSystem().workPackages || []).some(wp => wp.initiativeId === id);
                if (hasWPs) {
                    this.ganttExpandedInitiatives.add(id);
                }
            }
            this.ganttExpandedWorkPackages.clear();
        } else if (task.type === 'workPackage') {
            const wpId = task.workPackageId;
            if (!wpId) return;
            // Ensure only this initiative and this WP are expanded
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
            // Toggle parent WP if present
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

        // Re-render table and chart to reflect toggles
        this.renderGanttTable();
        this.renderGanttChart();

        // Scroll table to show the focused row
        this.scrollToTableFocusRow(task);
    }

    /**
     * Scrolls the table to show the focused row
     */
    scrollToTableFocusRow(task) {
        if (!task) return;
        // Use setTimeout to wait for table to finish rendering after re-render
        setTimeout(() => {
            const tableContainer = document.getElementById('ganttPlanningTableContainer');
            if (!tableContainer) return;

            // Find the scrollable wrapper
            const scrollWrapper = tableContainer.querySelector('.gantt-table-wrapper');

            let focusRow = null;

            if (task.type === 'initiative' && task.initiativeId) {
                // Try to find the initiative row
                focusRow = tableContainer.querySelector(`tr[data-initiative-id="${task.initiativeId}"]`);
            } else if (task.type === 'workPackage' && task.workPackageId) {
                focusRow = tableContainer.querySelector(`tr[data-wp-id="${task.workPackageId}"]`);
            } else if (task.type === 'assignment' && task.workPackageId && task.teamId) {
                focusRow = tableContainer.querySelector(`tr[data-wp-id="${task.workPackageId}"][data-team-id="${task.teamId}"]`);
            }

            if (focusRow && scrollWrapper) {
                console.log('[GANTT] Scrolling to focused row:', focusRow);
                // Calculate scroll position to center the row in the wrapper
                const rowRect = focusRow.getBoundingClientRect();
                const wrapperRect = scrollWrapper.getBoundingClientRect();
                const rowOffsetTop = focusRow.offsetTop;
                const wrapperHeight = scrollWrapper.clientHeight;
                const targetScroll = rowOffsetTop - (wrapperHeight / 2) + (rowRect.height / 2);

                scrollWrapper.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            } else if (focusRow) {
                // Fallback to scrollIntoView
                focusRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                console.warn('[GANTT] Could not find focus row for task:', task);
            }
        }, 150); // Wait for table render to complete
    }

    /**
     * Handles update events from Frappe chart drag
     */
    handleGanttUpdate({ task, start, end }) {
        console.log('[GANTT] Update received:', task, start, end);

        if (task) {
            this.setLastGanttFocus({
                taskId: task.id || task.workPackageId || task.initiativeId || null,
                taskType: task.type || null,
                initiativeId: task.initiativeId || null
            });
        }

        const hasWPs = (id) => (SystemService.getCurrentSystem().workPackages || []).some(wp => wp.initiativeId === id);

        if (task.type === 'initiative') {
            const initId = task.initiativeId;
            const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initId);
            if (!init) return;

            // Check if has WPs - if so, warn and revert (re-render)
            if (hasWPs(initId)) {
                console.warn('Initiative dates locked: work packages exist.');
                this.renderGanttChart(); // Revert UI
                return;
            }

            init.attributes = init.attributes || {};
            init.attributes.startDate = start;
            init.targetDueDate = end;

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

            // If only one assignment, align it to the WP change
            (assignments || []).forEach(assign => {
                assign.startDate = start;
                assign.endDate = end;
            });

            // Cascade initiative dates: sync totals to update initiative start/end
            const initId = wp.initiativeId || task.initiativeId;
            if (initId) {
                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
            }

        } else if (task.type === 'assignment') {
            const wpId = task.workPackageId;
            const teamId = task.teamId;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;

            const assign = (wp.impactedTeamAssignments || []).find(a => a.teamId === teamId);
            if (!assign) return;

            assign.startDate = start;
            assign.endDate = end;

            // Recalculate WP dates
            WorkPackageService.recalculateWorkPackageDates(wp);
            // Keep initiative rollup in sync
            if (task.initiativeId) {
                WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
            }
        }

        // Sync totals and save
        if (task.initiativeId) {
            WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
        }
        SystemService.save();

        // Refresh table and chart to show new dates/rollups
        this.renderGanttTable();
        this.renderGanttChart();
    }

    /**
     * Scrolls to the focused task in the chart
     */
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



    renderGanttTable() {
        // Always use MVC controller (legacy is deprecated)
        const tableContainer = document.getElementById('ganttPlanningTableContainer');
        if (!tableContainer) {
            console.warn('GanttPlanningView: Table container not found');
            return;
        }

        // Always create a fresh controller instance with the current container
        // Container is recreated on each view render, so cached controller has stale reference
        this.tableController = new GanttTableController({
            container: tableContainer,
            frappeRenderer: this.chartRenderer || null,
            viewInstance: this  // Per coding contract: pass reference, not global
        });

        // Sync MVC model with view state
        this.model = this.tableController.model;
        const model = this.model;

        // Set filters BEFORE init - the initialized guard prevents premature renders
        const selectedTeam = document.getElementById('ganttGroupValue')?.value || null;
        model.setFilter('year', this.currentGanttYear);
        model.setFilter('groupBy', this.currentGanttGroupBy);
        model.setFilter('groupValue', selectedTeam);

        // Ensure status filter is synced from the view's current selection state
        if (this.ganttStatusFilter) {
            model.setFilter('statusFilter', this.ganttStatusFilter);
        }

        // Sync expansion states from viewInstance (not globals)
        // The chart and controller use viewInstance directly now
        model.expandedInitiatives.clear();
        model.expandedWorkPackages.clear();
        this.ganttExpandedInitiatives.forEach(id => model.expandedInitiatives.add(id));
        this.ganttExpandedWorkPackages.forEach(id => model.expandedWorkPackages.add(id));

        // Sync focus state to model so table rows get focus class
        if (this.lastGanttFocusTaskId || this.lastGanttFocusInitiativeId) {
            model.setFocus({
                taskType: this.lastGanttFocusTaskType || null,
                taskId: this.lastGanttFocusTaskId ? this.normalizeGanttId(this.lastGanttFocusTaskId) : null,
                initiativeId: this.lastGanttFocusInitiativeId ? this.normalizeGanttId(this.lastGanttFocusInitiativeId) : null
            });
        }

        // Initialize with system data - this sets initialized=true and calls render()
        const systemData = SystemService.getCurrentSystem();

        this.tableController.init(systemData, {
            selectedTeam,
            showManagerTeams: this.currentGanttGroupBy === 'Team'
        });
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

    /**
     * Marks the view as having unsaved changes.
     * Enables and highlights the Save button.
     */
    markDirty() {
        if (this._isDirty) return; // Already dirty

        this._isDirty = true;

        if (this._saveBtn) {
            this._saveBtn.style.opacity = '1';
            this._saveBtn.style.cursor = 'pointer';
            this._saveBtn.classList.add('btn-pulse'); // Optional animation class
        }
    }

    /**
     * Saves the current system and clears dirty state.
     */
    _save() {
        if (!this._isDirty) return; // Nothing to save

        const success = SystemService.save();

        if (success) {
            this._isDirty = false;

            if (this._saveBtn) {
                this._saveBtn.style.opacity = '0.5';
                this._saveBtn.style.cursor = 'default';
                this._saveBtn.classList.remove('btn-pulse');
            }

            // Show success feedback
            if (typeof ToastComponent !== 'undefined') {
                ToastComponent.show('Changes saved successfully', 'success');
            }
        } else {
            // Show error feedback
            if (typeof ToastComponent !== 'undefined') {
                ToastComponent.show('Failed to save changes', 'error');
            }
        }
    }
}

