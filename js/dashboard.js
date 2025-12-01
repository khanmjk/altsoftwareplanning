// js/dashboard.js

// --- Globals for Dashboard State ---
let investmentDoughnutChart = null;
let investmentTrendChart = null;
let teamDemandChart = null; // Add a global for the new chart

let dashboardPlanningYear = 'all';

// State for the new dashboard carousel
const dashboardItems = [
    { id: 'strategicGoalsWidget', title: 'Strategic Goals Dashboard', generator: initializeGoalsView },
    { id: 'accomplishmentsWidget', title: 'Accomplishments', generator: initializeAccomplishmentsView },
    { id: 'investmentDistributionWidget', title: 'Investment Distribution by Theme', generator: () => generateInvestmentDistributionChart(dashboardPlanningYear) },
    { id: 'investmentTrendWidget', title: 'Investment Trend Over Time', generator: generateInvestmentTrendChart },
    { id: 'teamDemandWidget', title: 'Team Demand by Quarter', generator: initializeTeamDemandView }, // New widget added here
    { id: 'roadmapTimelineWidget', title: 'Roadmap by Quarter', generator: initializeRoadmapTableView },
    { id: 'threeYearPlanWidget', title: '3-Year Plan (3YP)', generator: initialize3YPRoadmapView },
    { id: 'initiativeImpactWidget', title: 'Initiative Impact', generator: initializeImpactView }
];
let currentDashboardIndex = 0;
// --- End Globals ---

/**
 * Main function to trigger the display of the Dashboard view.
 */
/**
 * NEW: Renders the Dashboard view into the Workspace.
 */
function renderDashboardView(container) {
    // console.log("Rendering Dashboard View...");

    // Fallback if container not passed
    if (!container) {
        container = document.getElementById('dashboardView');
    }

    if (!container) {
        console.error("Dashboard container not found.");
        return;
    }

    if (!currentSystemData) {
        // This check might be redundant if NavigationManager handles it, but good for safety

    }

    // Only generate layout if it doesn't exist to preserve carousel state/DOM if possible
    if (!document.getElementById('dashboardCarousel')) {
        generateDashboardLayout(container);
    }

    // Initialize/Refresh the current widget
    showDashboardWidget(currentDashboardIndex);
}

/**
 * Creates the carousel shell and its static elements.
 */
function generateDashboardLayout(container) {
    const yearSelectorHTML = generateYearSelectorHTML();

    container.innerHTML = `
        <div id="dashboardYearSelectorContainer" style="margin-bottom: 20px; text-align: left;">
             <label for="dashboardYearSelector" style="font-weight: bold; margin-right: 10px;">Filter by Year:</label>
            <select id="dashboardYearSelector" onchange="handleDashboardYearChange(this.value)" style="padding: 5px; border-radius: 4px;">
                ${yearSelectorHTML}
            </select>
        </div>
        <div id="dashboardCarousel" style="position: relative; border: 1px solid #ddd; padding: 10px; background-color: #fff; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 15px;">
                <button onclick="navigateDashboard(-1)">&lt; Previous</button>
                <span id="dashboardTitle" style="margin: 0 15px; font-weight: bold; font-size: 1.4em; color: #333;"></span>
                <button onclick="navigateDashboard(1)">Next &gt;</button>
            </div>
            
            <div id="strategicGoalsWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="accomplishmentsWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="investmentDistributionWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="investmentTrendWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="teamDemandWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="roadmapTimelineWidget" class="dashboard-carousel-item" style="display: none;"></div>
            <div id="threeYearPlanWidget" class="dashboard-carousel-item" style="display: none;"></div>      
            <div id="initiativeImpactWidget" class="dashboard-carousel-item" style="display: none;"></div>
        </div>
    `;
}

/**
 * Generates the HTML for the year selector dropdown.
 */
function generateYearSelectorHTML() {
    let availableYears = [...new Set((currentSystemData.yearlyInitiatives || []).map(init => init.attributes.planningYear).filter(Boolean))].sort((a, b) => a - b);
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

    if (!dashboardPlanningYear || (dashboardPlanningYear !== 'all' && !availableYears.includes(parseInt(dashboardPlanningYear)))) {
        dashboardPlanningYear = 'all';
    }

    let yearOptionsHTML = '<option value="all" ' + (dashboardPlanningYear === 'all' ? 'selected' : '') + '>All Years</option>' +
        availableYears.map(year => `<option value="${year}" ${year == dashboardPlanningYear ? 'selected' : ''}>${year}</option>`).join('');

    return yearOptionsHTML;
}

/**
 * Hides all dashboard widgets and shows the one at the specified index.
 */
function showDashboardWidget(index) {
    currentDashboardIndex = index;
    document.querySelectorAll('.dashboard-carousel-item').forEach(item => item.style.display = 'none');

    const widgetToShow = dashboardItems[index];
    document.getElementById('dashboardTitle').textContent = widgetToShow.title;
    const elementToShow = document.getElementById(widgetToShow.id);

    const yearFilterContainer = document.getElementById('dashboardYearSelectorContainer');
    if (yearFilterContainer) {
        // Updated to include the new teamDemandWidget in the list of filterable widgets
        const isFilterApplicable = ['strategicGoalsWidget', 'accomplishmentsWidget', 'investmentDistributionWidget', 'investmentTrendWidget', 'roadmapTimelineWidget', 'teamDemandWidget'].includes(widgetToShow.id);
        yearFilterContainer.style.display = isFilterApplicable ? 'block' : 'none';
    }

    if (elementToShow) {
        elementToShow.style.display = 'block';
        if (elementToShow.innerHTML === '') {
            if (widgetToShow.id === 'investmentDistributionWidget') {
                elementToShow.innerHTML = `<p class="widget-subtitle">...</p><div class="chart-container"><canvas id="investmentDistributionChart"></canvas></div><div id="investmentTableContainer"></div>`;
            } else if (widgetToShow.id === 'investmentTrendWidget') {
                elementToShow.innerHTML = `<p class="widget-subtitle">...</p><div class="chart-container"><canvas id="investmentTrendChart"></canvas></div>`;
            } else if (widgetToShow.id === 'teamDemandWidget') { // Add placeholder for new widget
                elementToShow.innerHTML = `<div id="roadmapTableFiltersDemand" class="widget-filter-bar"></div><div class="chart-container" style="height: 500px;"><canvas id="teamDemandChart"></canvas></div>`;
            }
        }
        widgetToShow.generator();
    }
}

/**
 * Navigates the dashboard carousel forward or backward.
 */
function navigateDashboard(direction) {
    let newIndex = (currentDashboardIndex + direction + dashboardItems.length) % dashboardItems.length;
    showDashboardWidget(newIndex);
}

// --- NEW WIDGET: TEAM DEMAND BY QUARTER ---

/**
 * Initializes the Team Demand by Quarter widget.
 */
function initializeTeamDemandView() {
    // console.log("Initializing Team Demand by Quarter widget...");
    generateRoadmapTableFilters('Demand', renderTeamDemandChart, { includeThemes: false });
    renderTeamDemandChart();
}

/**
 * Processes data for the team demand chart, separating demand into "committed" and "backlog".
 */
function processTeamDemandData() {
    const yearFilter = dashboardPlanningYear;
    const orgFilter = document.getElementById('roadmapOrgFilterDemand')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilterDemand')?.value || 'all';

    let initiatives = currentSystemData.yearlyInitiatives || [];

    // Apply filters
    if (yearFilter !== 'all') {
        initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
    }
    if (orgFilter !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgFilter) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                });
            }
        });
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }
    if (teamFilter !== 'all') {
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamFilter));
    }

    // Aggregate data
    const teamDemand = {};
    initiatives.forEach(init => {
        const quarterIndex = getQuarterIndexFromDate(init.targetDueDate);
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

/**
 * Renders the grouped stacked bar chart for team demand.
 */
function renderTeamDemandChart() {
    const canvas = document.getElementById('teamDemandChart');
    if (!canvas) { console.error("Canvas for team demand chart not found."); return; }
    if (teamDemandChart) { teamDemandChart.destroy(); }

    const demandData = processTeamDemandData();
    const teamMap = new Map((currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
    const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(currentSystemData.teams.map(t => t.teamId));

    const datasets = [];
    Object.keys(demandData).forEach(teamId => {
        const teamName = teamMap.get(teamId) || teamId;
        const teamColor = teamColorScale(teamId);

        // Committed Dataset (Solid Color)
        datasets.push({
            label: teamName,
            data: demandData[teamId].committed,
            backgroundColor: teamColor,
            stack: 'Committed' // Assign to the "Committed" stack
        });

        // Backlog Dataset (Hatched Pattern)
        datasets.push({
            label: `${teamName} (Backlog)`,
            data: demandData[teamId].backlog,
            backgroundColor: createHatchPattern(teamColor),
            stack: 'Backlog' // Assign to the "Backlog" stack
        });
    });

    // Custom plugin to draw data labels inside the bars
    const dataLabelsPlugin = {
        id: 'dataLabels',
        afterDatasetsDraw(chart, args, options) {
            const { ctx } = chart;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (meta.hidden) return;

                meta.data.forEach((bar, index) => {
                    const value = dataset.data[index];
                    // Only draw label if the bar segment is tall enough
                    if (value > 0 && bar.height > 15) {
                        ctx.fillText(value.toFixed(1), bar.x, bar.y + bar.height / 2);
                    }
                });
            });
        }
    };

    teamDemandChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: datasets
        },
        plugins: [dataLabelsPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        // Filter out backlog items from the legend for a cleaner look
                        filter: item => !item.text.includes('(Backlog)')
                    }
                },
                title: { display: false },
                tooltip: {
                    mode: 'index', // Show tooltips for all stacks at that index
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    stacked: true, // Stacking is enabled per stack group
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

/**
 * Helper to get a quarter index (0-3) from a date string.
 */
function getQuarterIndexFromDate(dateString) {
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

/**
 * Creates a canvas pattern for hatched fills.
 */
function createHatchPattern(color = '#000000') {
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

// --- EXISTING WIDGETS (UNCHANGED) ---

/**
 * Renders the doughnut chart for investment distribution.
 */
function generateInvestmentDistributionChart() {
    const canvas = document.getElementById('investmentDistributionChart');
    if (!canvas) {
        console.error("Canvas for doughnut chart not found. Bailing out of render.");
        return;
    }
    if (investmentDoughnutChart) investmentDoughnutChart.destroy();

    const data = processInvestmentData(dashboardPlanningYear);

    investmentDoughnutChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.sdeValues,
                backgroundColor: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: false },
                tooltip: { callbacks: { label: (context) => formatTooltipLabel(context, data.total) } }
            }
        }
    });

    generateInvestmentTable(data);
}

/**
 * Renders the 100% stacked bar chart for investment trends.
 */
function generateInvestmentTrendChart() {
    const canvas = document.getElementById('investmentTrendChart');
    if (!canvas) { console.error("Canvas for trend chart not found."); return; }
    if (investmentTrendChart) investmentTrendChart.destroy();

    const allYears = [...new Set(currentSystemData.yearlyInitiatives.map(init => init.attributes.planningYear).filter(Boolean))].sort((a, b) => a - b);
    const allThemes = [...new Set(currentSystemData.definedThemes.map(t => t.name))];
    const themeColors = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'];

    const datasets = allThemes.map((themeName, index) => ({
        label: themeName,
        data: [],
        backgroundColor: themeColors[index % themeColors.length],
    }));

    allYears.forEach(year => {
        const yearData = processInvestmentData(year.toString());
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

    investmentTrendChart = new Chart(canvas, {
        type: 'bar',
        data: { labels: allYears, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, max: 100, ticks: { callback: (value) => `${value}%` } }
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
 * Helper function to process initiative data for a given year.
 */
function processInvestmentData(selectedYear) {
    const themeMap = new Map(currentSystemData.definedThemes.map(theme => [theme.themeId, theme.name]));
    const investmentByTheme = {};

    themeMap.forEach(name => { investmentByTheme[name] = 0; });
    investmentByTheme['Uncategorized'] = 0;


    const initiatives = selectedYear === 'all'
        ? currentSystemData.yearlyInitiatives
        : currentSystemData.yearlyInitiatives.filter(init => init.attributes.planningYear == selectedYear);

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

/**
 * Generates the summary table for the doughnut chart.
 */
function generateInvestmentTable(data) {
    const container = document.getElementById('investmentTableContainer');
    if (!container) return;

    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead style="background-color: #f2f2f2;">
                <tr>
                    <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Theme</th>
                    <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">SDE-Years</th>
                    <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Percentage</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.labels.forEach((label, index) => {
        const sdeYears = data.sdeValues[index];
        const percentage = data.total > 0 ? (sdeYears / data.total * 100).toFixed(1) : 0;
        tableHTML += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${label}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sdeYears.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${percentage}%</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
            <tfoot style="font-weight: bold;">
                <tr>
                    <td style="border: 1px solid #ccc; padding: 8px;">Total</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${data.total.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${data.total > 0 ? '100.0%' : '0.0%'}</td>
                </tr>
            </tfoot>
        </table>
    `;

    container.innerHTML = tableHTML;
}

/**
 * Formats the tooltip label for the doughnut chart.
 */
function formatTooltipLabel(context, total) {
    let label = context.label || '';
    if (label) label += ': ';
    if (context.raw !== null) {
        const percentage = total > 0 ? (context.raw / total * 100).toFixed(1) : 0;
        label += `${context.raw.toFixed(2)} SDE-Yrs (${percentage}%)`;
    }
    return label;
}

window.renderDashboardView = renderDashboardView;