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
        this.planningYear = 'all';

        // Widget definitions
        this.widgets = [
            { id: 'strategicGoalsWidget', title: 'Strategic Goals Dashboard', generator: () => this.initializeGoalsWidget() },
            { id: 'accomplishmentsWidget', title: 'Accomplishments', generator: () => this.initializeAccomplishmentsWidget() },
            { id: 'investmentDistributionWidget', title: 'Investment Distribution by Theme', generator: () => this.generateInvestmentDistributionChart() },
            { id: 'investmentTrendWidget', title: 'Investment Trend Over Time', generator: () => this.generateInvestmentTrendChart() },
            { id: 'teamDemandWidget', title: 'Team Demand by Quarter', generator: () => this.initializeTeamDemandWidget() },
            { id: 'roadmapTimelineWidget', title: 'Roadmap by Quarter', generator: () => this.initializeRoadmapTableWidget() },
            { id: 'threeYearPlanWidget', title: '3-Year Plan (3YP)', generator: () => this.initialize3YPWidget() },
            { id: 'initiativeImpactWidget', title: 'Initiative Impact', generator: () => this.initializeImpactWidget() }
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

        if (!window.currentSystemData) {
            this.container.innerHTML = '<div class="dashboard-empty-state"><i class="fas fa-chart-line dashboard-empty-state__icon"></i><p class="dashboard-empty-state__message">No system data loaded</p></div>';
            return;
        }

        // Only generate layout if it doesn't exist
        if (!this.container.querySelector('.dashboard-carousel')) {
            this.generateLayout();
        }

        // Show current widget
        this.showWidget(this.currentWidgetIndex);
    }

    /**
     * Generate the dashboard layout
     */
    generateLayout() {
        const yearOptions = this.generateYearOptions();

        this.container.innerHTML = `
            <div class="dashboard-view">
                <div class="dashboard-filter-bar">
                    <label for="dashboardYearSelector" class="dashboard-filter-label">Filter by Year:</label>
                    <select id="dashboardYearSelector" class="dashboard-filter-select">
                        ${yearOptions}
                    </select>
                </div>

                <div class="dashboard-carousel">
                    <div class="dashboard-carousel__nav">
                        <button class="dashboard-carousel__btn dashboard-carousel__btn--prev" data-action="prev">Previous</button>
                        <h2 class="dashboard-carousel__title" id="dashboardTitle"></h2>
                        <button class="dashboard-carousel__btn dashboard-carousel__btn--next" data-action="next">Next</button>
                    </div>

                    ${this.widgets.map(widget => `
                        <div id="${widget.id}" class="dashboard-carousel-item"></div>
                    `).join('')}
                </div>
            </div>
        `;

        // Bind events
        this.bindEvents();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Year selector
        const yearSelector = document.getElementById('dashboardYearSelector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => this.handleYearChange(e.target.value));
        }

        // Carousel navigation
        const carousel = this.container.querySelector('.dashboard-carousel');
        if (carousel) {
            carousel.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;

                const action = btn.dataset.action;
                if (action === 'prev') this.navigateWidget(-1);
                else if (action === 'next') this.navigateWidget(1);
            });
        }
    }

    /**
     * Generate year filter options
     */
    generateYearOptions() {
        const allYears = [...new Set(
            (window.currentSystemData.yearlyInitiatives || [])
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
    showWidget(index) {
        this.currentWidgetIndex = index;

        // Hide all widgets
        document.querySelectorAll('.dashboard-carousel-item').forEach(item => {
            item.classList.remove('active');
        });

        const widget = this.widgets[index];

        // Update title
        const titleEl = document.getElementById('dashboardTitle');
        if (titleEl) {
            titleEl.textContent = widget.title;
        }

        // Show year filter only for applicable widgets
        const yearFilterBar = this.container.querySelector('.dashboard-filter-bar');
        if (yearFilterBar) {
            const filterApplicable = [
                'strategicGoalsWidget',
                'accomplishmentsWidget',
                'investmentDistributionWidget',
                'investmentTrendWidget',
                'roadmapTimelineWidget',
                'teamDemandWidget'
            ].includes(widget.id);
            yearFilterBar.style.display = filterApplicable ? 'flex' : 'none';
        }

        // Show and initialize widget
        const widgetEl = document.getElementById(widget.id);
        if (widgetEl) {
            widgetEl.classList.add('active');

            // Initialize widget content if empty
            if (widgetEl.innerHTML === '') {
                this.initializeWidgetContent(widget);
            }

            // Run widget generator
            widget.generator();
        }
    }

    /**
     * Initialize widget HTML structure
     */
    initializeWidgetContent(widget) {
        const widgetEl = document.getElementById(widget.id);
        if (!widgetEl) return;

        if (widget.id === 'investmentDistributionWidget') {
            widgetEl.innerHTML = `
                <p class="widget-subtitle">Investment distribution across strategic themes</p>
                <div class="chart-container">
                    <canvas id="investmentDistributionChart"></canvas>
                </div>
                <div id="investmentTableContainer"></div>
            `;
        } else if (widget.id === 'investmentTrendWidget') {
            widgetEl.innerHTML = `
                <p class="widget-subtitle">Track how investment priorities shift over time</p>
                <div class="chart-container">
                    <canvas id="investmentTrendChart"></canvas>
                </div>
            `;
        } else if (widget.id === 'teamDemandWidget') {
            widgetEl.innerHTML = `
                <div id="roadmapTableFiltersDemand" class="widget-filter-bar"></div>
                <div class="chart-container chart-container--tall">
                    <canvas id="teamDemandChart"></canvas>
                </div>
            `;
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
            window.currentSystemData.yearlyInitiatives
                .map(init => init.attributes.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);

        const allThemes = [...new Set(
            window.currentSystemData.definedThemes.map(t => t.name)
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
        if (window.generateRoadmapTableFilters) {
            window.generateRoadmapTableFilters('Demand', () => this.renderTeamDemandChart(), { includeThemes: false });
        }
        this.renderTeamDemandChart();
    }

    renderTeamDemandChart() {
        const canvas = document.getElementById('teamDemandChart');
        if (!canvas) return;

        if (this.teamDemandChart) {
            this.teamDemandChart.destroy();
        }

        const demandData = this.processTeamDemandData();
        const teamMap = new Map((window.currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
        const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(window.currentSystemData.teams.map(t => t.teamId));

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
        const themeMap = new Map(window.currentSystemData.definedThemes.map(theme => [theme.themeId, theme.name]));
        const investmentByTheme = {};

        themeMap.forEach(name => { investmentByTheme[name] = 0; });
        investmentByTheme['Uncategorized'] = 0;

        const initiatives = selectedYear === 'all'
            ? window.currentSystemData.yearlyInitiatives
            : window.currentSystemData.yearlyInitiatives.filter(init => init.attributes.planningYear == selectedYear);

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

        let tableHTML = '<table class="investment-table"><thead><tr><th>Theme</th><th>SDE-Years</th><th>Percentage</th></tr></thead><tbody>';

        data.labels.forEach((label, index) => {
            const sdeYears = data.sdeValues[index];
            const percentage = data.total > 0 ? (sdeYears / data.total * 100).toFixed(1) : 0;
            tableHTML += `<tr><td>${label}</td><td>${sdeYears.toFixed(2)}</td><td>${percentage}%</td></tr>`;
        });

        tableHTML += `</tbody><tfoot><tr><td>Total</td><td>${data.total.toFixed(2)}</td><td>${data.total > 0 ? '100.0%' : '0.0%'}</td></tr></tfoot></table>`;
        container.innerHTML = tableHTML;
    }

    processTeamDemandData() {
        const yearFilter = this.planningYear;
        const orgFilter = document.getElementById('roadmapOrgFilterDemand')?.value || 'all';
        const teamFilter = document.getElementById('roadmapTeamFilterDemand')?.value || 'all';

        let initiatives = window.currentSystemData.yearlyInitiatives || [];

        if (yearFilter !== 'all') {
            initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
        }
        if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (window.currentSystemData.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (window.currentSystemData.teams || []).forEach(team => {
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
        if (window.initializeGoalsView) window.initializeGoalsView();
    }

    initializeAccomplishmentsWidget() {
        if (window.initializeAccomplishmentsView) window.initializeAccomplishmentsView();
    }

    initializeRoadmapTableWidget() {
        if (window.initializeRoadmapTableView) window.initializeRoadmapTableView();
    }

    initialize3YPWidget() {
        if (window.initialize3YPRoadmapView) window.initialize3YPRoadmapView();
    }

    initializeImpactWidget() {
        if (window.initializeImpactView) window.initializeImpactView();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.DashboardView = DashboardView;

    // Backwards compatibility wrapper
    window.renderDashboardView = function (container) {
        if (!window.dashboardViewInstance) {
            window.dashboardViewInstance = new DashboardView(container?.id || 'dashboardView');
        } else {
            window.dashboardViewInstance.container = container || document.getElementById('dashboardView');
        }
        window.dashboardViewInstance.render();
    };
}
