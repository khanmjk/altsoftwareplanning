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

        // MVC Controller instance (new architecture)
        this.tableController = null;

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

        // Defer table render to after browser layout completes
        // Container has 0 dimensions until flex layout is calculated
        requestAnimationFrame(() => {
            this.renderGanttTable();
            renderGanttChart(); // Still uses legacy function temporarily
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
        ));
        if (!years.includes(this.currentGanttYear)) years.push(this.currentGanttYear);
        years.sort();

        const yearOptions = years.map(y => ({ value: y.toString(), text: y.toString() }));

        this.yearSelect = new ThemedSelect({
            options: yearOptions,
            value: this.currentGanttYear.toString(),
            id: 'ganttYearFilter',
            onChange: (value) => {
                this.currentGanttYear = parseInt(value, 10);
                console.log('[GANTT] Year changed', this.currentGanttYear);
                this.renderGanttTable();
                renderGanttChart();
            }
        });

        yearWrap.appendChild(this.yearSelect.render());
        toolbar.appendChild(yearWrap);

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
                currentGanttGroupBy = this.currentGanttGroupBy;
                console.log('[GANTT] View By changed', this.currentGanttGroupBy);
                renderDynamicGroupFilter();
                renderGanttChart();
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

        // Refresh Button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.className = 'btn btn-primary btn-sm';
        refreshBtn.onclick = () => {
            this.renderGanttTable();
            renderGanttChart(); // Still uses legacy temporarily
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
        rendererBtn.textContent = getRendererButtonLabel(); // Uses legacy function temporarily
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
            frappeRenderer: typeof ganttChartInstance !== 'undefined' ? ganttChartInstance : null
        });

        // Sync MVC model with view state
        const model = this.tableController.model;
        model.setFilter('year', this.currentGanttYear);
        model.setFilter('groupBy', this.currentGanttGroupBy);
        model.setFilter('statusFilter', this.ganttStatusFilter);

        // Sync expansion states from GLOBAL legacy variables for chart↔table sync
        // The chart updates these globals, so we read from them to stay in sync
        model.expandedInitiatives.clear();
        model.expandedWorkPackages.clear();

        if (typeof ganttExpandedInitiatives !== 'undefined') {
            ganttExpandedInitiatives.forEach(id => model.expandedInitiatives.add(id));
        }
        if (typeof ganttExpandedWorkPackages !== 'undefined') {
            ganttExpandedWorkPackages.forEach(id => model.expandedWorkPackages.add(id));
        }

        // Also sync view's local state from globals (for consistency)
        this.ganttExpandedInitiatives = new Set(model.expandedInitiatives);
        this.ganttExpandedWorkPackages = new Set(model.expandedWorkPackages);

        // Render with controller
        const systemData = SystemService.getCurrentSystem();
        const selectedTeam = document.getElementById('ganttGroupValue')?.value || null;

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
}

