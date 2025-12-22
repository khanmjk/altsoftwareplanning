/**
 * DashboardView - Class-based dashboard with widget carousel
 * Displays various analytics widgets including charts and tables
 */
class DashboardView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        // Chart instances
        this.investmentDoughnutChart = null;
        this.investmentTrendChart = null;
        this.teamDemandChart = null;

        // State
        this.currentWidgetIndex = 0;

        // Initialize year filter - DashboardView owns this state
        // Default to first available year from system data
        this.planningYear = this._getDefaultPlanningYear();

        this.pillNav = null; // NEW: Pill navigation component

        // Widget definitions
        this.widgets = [
            { id: 'strategicGoalsWidget', title: 'Strategic Goals Dashboard', label: 'Strategic Goals', icon: 'fas fa-bullseye', generator: () => this.initializeGoalsWidget() },
            { id: 'accomplishmentsWidget', title: 'Accomplishments', label: 'Accomplishments', icon: 'fas fa-trophy', generator: () => this.initializeAccomplishmentsWidget() },
            { id: 'investmentDistributionWidget', title: 'Investment Distribution by Theme', label: 'Investment Distribution', icon: 'fas fa-chart-pie', generator: () => this.generateInvestmentDistributionChart() },
            { id: 'investmentTrendWidget', title: 'Investment Trend Over Time', label: 'Investment Trend', icon: 'fas fa-chart-line', generator: () => this.generateInvestmentTrendChart() },
            { id: 'teamDemandWidget', title: 'Team Demand by Quarter', label: 'Team Demand', icon: 'fas fa-users-cog', generator: () => this.initializeTeamDemandWidget() },
            { id: 'roadmapTimelineWidget', title: 'Roadmap by Quarter', label: 'Roadmap Timeline', icon: 'fas fa-calendar-alt', generator: () => this.initializeRoadmapTableWidget() },
            { id: 'threeYearPlanWidget', title: '3-Year Plan (3YP)', label: '3-Year Plan', icon: 'fas fa-sitemap', generator: () => this.initialize3YPWidget() },
            { id: 'initiativeImpactWidget', title: 'Initiative Impact', label: 'Initiative Impact', icon: 'fas fa-chart-bar', generator: () => this.initializeImpactWidget() }
        ];
    }

    /**
     * Render the dashboard view
     */
    render() {
        if (!this.container) {
            console.error('DashboardView: Container not found');
            return;
        }

        // 1. Set Workspace Metadata
        // 1. Set Workspace Metadata
        workspaceComponent.setPageMetadata({
            title: 'Executive Dashboard',
            breadcrumbs: ['Insights', 'Dashboard'],
            actions: []
        });

        // 2. Set Workspace Toolbar
        const toolbar = this.generateDashboardToolbar();
        workspaceComponent.setToolbar(toolbar);

        if (!SystemService.getCurrentSystem()) {
            this.container.innerHTML = '';
            const emptyState = document.createElement('div');
            emptyState.className = 'dashboard-empty-state';
            const icon = document.createElement('i');
            icon.className = 'fas fa-chart-line dashboard-empty-state__icon';
            const msg = document.createElement('p');
            msg.className = 'dashboard-empty-state__message';
            msg.textContent = 'No system data loaded';
            emptyState.append(icon, msg);
            this.container.appendChild(emptyState);
            return;
        }

        // 3. Render Content Container (DOM creation for §2.6 compliance)
        this.container.innerHTML = '';
        const dashboardView = document.createElement('div');
        dashboardView.className = 'dashboard-view';
        const dashboardContent = document.createElement('div');
        dashboardContent.id = 'dashboardContent';
        dashboardContent.className = 'dashboard-content';
        dashboardView.appendChild(dashboardContent);
        this.container.appendChild(dashboardView);

        // Show current widget
        this.showWidget(this.currentWidgetIndex);
    }

    /**
     * Generates the toolbar controls for Dashboard View
     */
    generateDashboardToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'dashboard-toolbar-global';
        toolbar.id = 'dashboardGlobalToolbar';

        // First row: Widget pills
        const pillRow = document.createElement('div');
        pillRow.className = 'dashboard-toolbar__pill-row';

        this.pillNav = new PillNavigationComponent({
            items: this.widgets.map(w => ({
                id: w.id,
                label: w.label || w.title,
                icon: w.icon
            })),
            onSwitch: (widgetId) => {
                const index = this.widgets.findIndex(w => w.id === widgetId);
                if (index !== -1) this.showWidget(index);
            },
            initialActive: this.widgets[this.currentWidgetIndex].id
        });

        pillRow.appendChild(this.pillNav.render());
        toolbar.appendChild(pillRow);

        // Second row: Year filter (conditionally visible)
        const filterRow = document.createElement('div');
        filterRow.id = 'dashboardYearFilterRow';
        filterRow.className = 'dashboard-toolbar__filter-row';

        const yearLabel = document.createElement('span');
        yearLabel.textContent = 'Year:';
        yearLabel.className = 'dashboard-toolbar__label';
        filterRow.appendChild(yearLabel);

        // Build year options for ThemedSelect
        const yearOptions = this._buildYearOptions();

        // Create ThemedSelect instance
        this.yearSelect = new ThemedSelect({
            options: yearOptions,
            value: this.planningYear.toString(),
            placeholder: 'All Years',
            id: 'dashboardYearSelector',
            className: 'form-select-sm',
            onChange: (value) => this.handleYearChange(value)
        });

        filterRow.appendChild(this.yearSelect.render());

        // Contextual toolbar for widget-specific controls
        const contextToolbar = document.createElement('div');
        contextToolbar.id = 'dashboardContextToolbar';
        contextToolbar.className = 'dashboard-context-toolbar';
        filterRow.appendChild(contextToolbar);

        toolbar.appendChild(filterRow);

        return toolbar;
    }

    /**
     * Bind event listeners
     */
    /**
     * Bind event listeners (Legacy - mostly handled in toolbar now)
     */
    bindEvents() {
        // No internal events needed for now
    }

    /**
     * Get the default planning year from system data
     * @returns {string|number} The first available year or 'all'
     */
    _getDefaultPlanningYear() {
        const system = SystemService.getCurrentSystem();
        if (!system || !system.yearlyInitiatives) {
            return 'all';
        }
        const years = [...new Set(
            system.yearlyInitiatives
                .map(init => init.attributes?.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);
        return years.length > 0 ? years[0] : 'all';
    }

    /**
     * Generate year filter options (legacy HTML format)
     */
    generateYearOptions() {
        // Safety check for data
        if (!SystemService.getCurrentSystem() || !SystemService.getCurrentSystem().yearlyInitiatives) {
            return '<option value="all">All Years</option>';
        }

        const allYears = [...new Set(
            (SystemService.getCurrentSystem().yearlyInitiatives || [])
                .map(init => init.attributes?.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);

        if (allYears.length === 0) {
            allYears.push(new Date().getFullYear());
        }

        if (this.planningYear !== 'all' && !allYears.includes(parseInt(this.planningYear))) {
            this.planningYear = 'all';
        }

        const options = [`<option value="all" ${this.planningYear === 'all' ? 'selected' : ''}>All Years</option>`];
        options.push(...allYears.map(year =>
            `<option value="${year}" ${year == this.planningYear ? 'selected' : ''}>${year}</option>`
        ));

        return options.join('');
    }

    /**
     * Build year options for ThemedSelect
     * @returns {Array<{value: string, text: string}>}
     */
    _buildYearOptions() {
        const options = [{ value: 'all', text: 'All Years' }];

        if (!SystemService.getCurrentSystem() || !SystemService.getCurrentSystem().yearlyInitiatives) {
            return options;
        }

        const allYears = [...new Set(
            (SystemService.getCurrentSystem().yearlyInitiatives || [])
                .map(init => init.attributes?.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);

        if (allYears.length === 0) {
            allYears.push(new Date().getFullYear());
        }

        allYears.forEach(year => {
            options.push({ value: year.toString(), text: year.toString() });
        });

        return options;
    }

    /**
     * Handle year filter change
     */
    handleYearChange(year) {
        this.planningYear = year;
        this.showWidget(this.currentWidgetIndex); // Refresh current widget
    }

    /**
     * Navigate between widgets
     */
    navigateWidget(direction) {
        const newIndex = (this.currentWidgetIndex + direction + this.widgets.length) % this.widgets.length;
        this.showWidget(newIndex);
    }

    /**
     * Show specific widget
     */
    /**
     * Show specific widget
     */
    showWidget(index) {
        this.currentWidgetIndex = index;
        const widget = this.widgets[index];
        const contentContainer = document.getElementById('dashboardContent');

        if (!contentContainer) return;

        // Clear container
        contentContainer.innerHTML = '';

        // Create widget container
        const widgetEl = document.createElement('div');
        widgetEl.id = widget.id;
        widgetEl.className = 'dashboard-widget-active'; // New class for active widget
        contentContainer.appendChild(widgetEl);

        // Initialize widget content
        this.initializeWidgetContent(widget);

        // Run widget generator and handle returned toolbar controls
        const returnedToolbar = widget.generator();
        console.log('[DEBUG] showWidget - widget:', widget.id, 'returned toolbar:', returnedToolbar);

        // Some widgets (like Initiative Impact) return toolbar controls to be placed in contextual area
        // Others (like Roadmap) inject their own filters and return nothing
        const contextToolbarContainer = document.getElementById('dashboardContextToolbar');
        console.log('[DEBUG] contextToolbarContainer found:', !!contextToolbarContainer);
        if (contextToolbarContainer) {
            contextToolbarContainer.innerHTML = ''; // Clear previous
            if (returnedToolbar instanceof HTMLElement) {
                console.log('[DEBUG] Attaching toolbar to contextual area');
                contextToolbarContainer.appendChild(returnedToolbar);
            }
        }

        // Update year filter visibility (hide for 3-Year Plan)
        const yearFilterRow = document.getElementById('dashboardYearFilterRow');
        if (yearFilterRow) {
            yearFilterRow.classList.toggle('is-hidden', widget.id === 'threeYearPlanWidget');
        }

        // Update Pill Navigation State
        if (this.pillNav) {
            this.pillNav.setActive(widget.id);
        }
    }

    /**
     * Initialize widget HTML structure
     */
    initializeWidgetContent(widget) {
        const widgetEl = document.getElementById(widget.id);
        if (!widgetEl) return;

        // Widget content templates converted to DOM creation (§2.6 compliance)
        if (widget.id === 'investmentDistributionWidget') {
            const subtitle = document.createElement('p');
            subtitle.className = 'widget-subtitle';
            subtitle.textContent = 'Investment distribution across strategic themes';
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            const canvas = document.createElement('canvas');
            canvas.id = 'investmentDistributionChart';
            chartContainer.appendChild(canvas);
            const tableContainer = document.createElement('div');
            tableContainer.id = 'investmentTableContainer';
            widgetEl.append(subtitle, chartContainer, tableContainer);
        } else if (widget.id === 'investmentTrendWidget') {
            const subtitle = document.createElement('p');
            subtitle.className = 'widget-subtitle';
            subtitle.textContent = 'Track how investment priorities shift over time';
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            const canvas = document.createElement('canvas');
            canvas.id = 'investmentTrendChart';
            chartContainer.appendChild(canvas);
            widgetEl.append(subtitle, chartContainer);
        } else if (widget.id === 'teamDemandWidget') {
            const filterBar = document.createElement('div');
            filterBar.id = 'roadmapTableFiltersDemand';
            filterBar.className = 'widget-filter-bar';
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container chart-container--tall';
            const canvas = document.createElement('canvas');
            canvas.id = 'teamDemandChart';
            chartContainer.appendChild(canvas);
            widgetEl.append(filterBar, chartContainer);
        }
    }

    // ========================================
    // WIDGET GENERATORS
    // ========================================

    /**
     * Investment Distribution Chart (Doughnut)
     */
    generateInvestmentDistributionChart() {
        const canvas = document.getElementById('investmentDistributionChart');
        if (!canvas) return;

        if (this.investmentDoughnutChart) {
            this.investmentDoughnutChart.destroy();
        }

        const data = this.processInvestmentData(this.planningYear);

        this.investmentDoughnutChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.sdeValues,
                    backgroundColor: [
                        '#4E79A7', '#F28E2B', '#E15759', '#76B7B2',
                        '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7',
                        '#9C755F', '#BAB0AC'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.raw !== null) {
                                    const percentage = data.total > 0 ? (context.raw / data.total * 100).toFixed(1) : 0;
                                    label += `${context.raw.toFixed(2)} SDE-Yrs (${percentage}%)`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        this.generateInvestmentTable(data);
    }

    /**
     * Investment Trend Chart (Stacked Bar)
     */
    generateInvestmentTrendChart() {
        const canvas = document.getElementById('investmentTrendChart');
        if (!canvas) return;

        if (this.investmentTrendChart) {
            this.investmentTrendChart.destroy();
        }

        const allYears = [...new Set(
            SystemService.getCurrentSystem().yearlyInitiatives
                .map(init => init.attributes.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);

        const allThemes = [...new Set(
            SystemService.getCurrentSystem().definedThemes.map(t => t.name)
        )];

        const themeColors = [
            '#4E79A7', '#F28E2B', '#E15759', '#76B7B2',
            '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7',
            '#9C755F', '#BAB0AC'
        ];

        const datasets = allThemes.map((themeName, index) => ({
            label: themeName,
            data: [],
            backgroundColor: themeColors[index % themeColors.length]
        }));

        allYears.forEach(year => {
            const yearData = this.processInvestmentData(year.toString());
            const totalYearInvestment = yearData.total;

            datasets.forEach(dataset => {
                const themeIndex = yearData.labels.indexOf(dataset.label);
                if (themeIndex !== -1 && totalYearInvestment > 0) {
                    const percentage = (yearData.sdeValues[themeIndex] / totalYearInvestment) * 100;
                    dataset.data.push(percentage);
                } else {
                    dataset.data.push(0);
                }
            });
        });

        this.investmentTrendChart = new Chart(canvas, {
            type: 'bar',
            data: { labels: allYears, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: {
                        stacked: true,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += `${context.parsed.y.toFixed(1)}%`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Team Demand Chart
     */
    initializeTeamDemandWidget() {
        this.renderTeamDemandChart();
    }

    renderTeamDemandChart() {
        const canvas = document.getElementById('teamDemandChart');
        if (!canvas) return;

        if (this.teamDemandChart) {
            this.teamDemandChart.destroy();
        }

        const demandData = this.processTeamDemandData();
        const teamMap = new Map((SystemService.getCurrentSystem().teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
        const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(SystemService.getCurrentSystem().teams.map(t => t.teamId));

        const datasets = [];
        Object.keys(demandData).forEach(teamId => {
            const teamName = teamMap.get(teamId) || teamId;
            const teamColor = teamColorScale(teamId);

            datasets.push({
                label: teamName,
                data: demandData[teamId].committed,
                backgroundColor: teamColor,
                stack: 'Committed'
            });

            datasets.push({
                label: `${teamName} (Backlog)`,
                data: demandData[teamId].backlog,
                backgroundColor: this.createHatchPattern(teamColor),
                stack: 'Backlog'
            });
        });

        this.teamDemandChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            filter: item => !item.text.includes('(Backlog)')
                        }
                    },
                    title: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'SDE-Years Demand'
                        }
                    }
                }
            }
        });
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    processInvestmentData(selectedYear) {
        const themeMap = new Map(SystemService.getCurrentSystem().definedThemes.map(theme => [theme.themeId, theme.name]));
        const investmentByTheme = {};

        themeMap.forEach(name => { investmentByTheme[name] = 0; });
        investmentByTheme['Uncategorized'] = 0;

        const initiatives = selectedYear === 'all'
            ? SystemService.getCurrentSystem().yearlyInitiatives
            : SystemService.getCurrentSystem().yearlyInitiatives.filter(init => init.attributes.planningYear == selectedYear);

        initiatives.forEach(initiative => {
            if (initiative.status === 'Completed') return;
            const totalSdeYears = (initiative.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
            if (totalSdeYears > 0) {
                if (initiative.themes && initiative.themes.length > 0) {
                    initiative.themes.forEach(themeId => {
                        const themeName = themeMap.get(themeId);
                        if (themeName) {
                            investmentByTheme[themeName] += totalSdeYears;
                        }
                    });
                } else {
                    investmentByTheme['Uncategorized'] += totalSdeYears;
                }
            }
        });

        const sortedData = Object.entries(investmentByTheme)
            .filter(([, sde]) => sde > 0)
            .sort(([, a], [, b]) => b - a);

        return {
            labels: sortedData.map(([label]) => label),
            sdeValues: sortedData.map(([, sde]) => sde),
            total: sortedData.reduce((sum, [, sde]) => sum + sde, 0)
        };
    }

    generateInvestmentTable(data) {
        const container = document.getElementById('investmentTableContainer');
        if (!container) return;

        container.innerHTML = ''; // Clear previous

        const table = document.createElement('table');
        table.className = 'investment-table';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Theme', 'SDE-Years', 'Percentage'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        data.labels.forEach((label, index) => {
            const sdeYears = data.sdeValues[index];
            const percentage = data.total > 0 ? (sdeYears / data.total * 100).toFixed(1) : 0;
            const row = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.textContent = label;
            const tdSde = document.createElement('td');
            tdSde.textContent = sdeYears.toFixed(2);
            const tdPct = document.createElement('td');
            tdPct.textContent = `${percentage}%`;

            row.append(tdLabel, tdSde, tdPct);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        // Footer
        const tfoot = document.createElement('tfoot');
        const footerRow = document.createElement('tr');
        const tdTotal = document.createElement('td');
        tdTotal.textContent = 'Total';
        const tdTotalSde = document.createElement('td');
        tdTotalSde.textContent = data.total.toFixed(2);
        const tdTotalPct = document.createElement('td');
        tdTotalPct.textContent = data.total > 0 ? '100.0%' : '0.0%';
        footerRow.append(tdTotal, tdTotalSde, tdTotalPct);
        tfoot.appendChild(footerRow);
        table.appendChild(tfoot);

        container.appendChild(table);
    }

    processTeamDemandData() {
        const yearFilter = this.planningYear;
        const orgFilter = document.getElementById('roadmapOrgFilterDemand')?.value || 'all';
        const teamFilter = document.getElementById('roadmapTeamFilterDemand')?.value || 'all';

        let initiatives = SystemService.getCurrentSystem().yearlyInitiatives || [];

        if (yearFilter !== 'all') {
            initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
        }
        if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (SystemService.getCurrentSystem().sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (SystemService.getCurrentSystem().teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
        }
        if (teamFilter !== 'all') {
            initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamFilter));
        }

        const teamDemand = {};
        initiatives.forEach(init => {
            const quarterIndex = this.getQuarterIndexFromDate(init.targetDueDate);
            if (quarterIndex === -1) return;

            const isCommitted = init.status === 'Committed' || init.status === 'In Progress';
            const demandType = isCommitted ? 'committed' : 'backlog';

            (init.assignments || []).forEach(assignment => {
                if (teamFilter !== 'all' && assignment.teamId !== teamFilter) return;

                if (!teamDemand[assignment.teamId]) {
                    teamDemand[assignment.teamId] = { committed: [0, 0, 0, 0], backlog: [0, 0, 0, 0] };
                }
                teamDemand[assignment.teamId][demandType][quarterIndex] += (assignment.sdeYears || 0);
            });
        });

        return teamDemand;
    }

    getQuarterIndexFromDate(dateString) {
        if (!dateString) return -1;
        try {
            const month = parseInt(dateString.substring(5, 7), 10);
            if (month >= 1 && month <= 3) return 0;
            if (month >= 4 && month <= 6) return 1;
            if (month >= 7 && month <= 9) return 2;
            if (month >= 10 && month <= 12) return 3;
            return -1;
        } catch (e) { return -1; }
    }

    createHatchPattern(color = '#000000') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 10;
        canvas.width = size;
        canvas.height = size;

        ctx.fillStyle = d3.color(color).copy({ opacity: 0.3 });
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = d3.color(color).copy({ opacity: 0.5 });
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(size, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(size, size);
        ctx.stroke();

        return ctx.createPattern(canvas, 'repeat');
    }

    // Widget placeholders that delegate to global functions
    initializeGoalsWidget() {
        // Use new GoalsWidget class (refactored from goalsView.js)
        if (!this.goalsWidget) {
            this.goalsWidget = new GoalsWidget('strategicGoalsWidget');
        }
        this.goalsWidget.setPlanningYear(this.planningYear);
        this.goalsWidget.render();
    }

    initializeAccomplishmentsWidget() {
        // Use new AccomplishmentsWidget class (refactored from accomplishmentsView.js)
        if (!this.accomplishmentsWidget) {
            this.accomplishmentsWidget = new AccomplishmentsWidget('accomplishmentsWidget');
        }
        this.accomplishmentsWidget.setPlanningYear(this.planningYear);
        this.accomplishmentsWidget.render();
    }

    initializeRoadmapTableWidget() {
        // Use new RoadmapTableWidget class (refactored from roadmapTableView.js)
        if (!this.roadmapTableWidget) {
            this.roadmapTableWidget = new RoadmapTableWidget('roadmapTimelineWidget', 'quarterly');
        }
        this.roadmapTableWidget.setPlanningYear(this.planningYear);
        this.roadmapTableWidget.render();
    }

    initialize3YPWidget() {
        // Use new RoadmapTableWidget class for 3YP (refactored from roadmapTableView.js)
        if (!this.threeYearPlanWidget) {
            this.threeYearPlanWidget = new RoadmapTableWidget('threeYearPlanWidget', '3yp');
        }
        this.threeYearPlanWidget.setPlanningYear(this.planningYear);
        this.threeYearPlanWidget.render();
    }

    initializeImpactWidget() {
        // Use new ImpactWidget class (refactored from impactView.js)
        if (!this.impactWidget) {
            this.impactWidget = new ImpactWidget('initiativeImpactWidget');
        }
        return this.impactWidget.render(); // CRITICAL: Return toolbar controls
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        const currentWidget = this.widgets[this.currentWidgetIndex];
        return {
            viewTitle: 'Executive Dashboard',
            currentWidget: currentWidget ? {
                id: currentWidget.id,
                title: currentWidget.title
            } : null,
            widgetCount: this.widgets.length,
            yearFilter: this.planningYear,
            availableWidgets: this.widgets.map(w => ({ id: w.id, title: w.title }))
        };
    }
}
