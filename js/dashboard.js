// js/dashboard.js

// --- Globals for Dashboard State ---
let investmentDoughnutChart = null;
let investmentTrendChart = null;

// The year filter for the doughnut chart
let dashboardPlanningYear = 'all'; 

// State for the new dashboard carousel
const dashboardItems = [
    { id: 'investmentDistributionWidget', title: 'Investment Distribution by Theme', generator: () => generateInvestmentDistributionChart(dashboardPlanningYear) },
    { id: 'investmentTrendWidget', title: 'Investment Trend Over Time', generator: generateInvestmentTrendChart },
    { id: 'roadmapTimelineWidget', title: 'Roadmap by Quarter', generator: initializeRoadmapTableView }
];
let currentDashboardIndex = 0;
// --- End Globals ---

/**
 * Main function to trigger the display of the Dashboard view.
 */
function showDashboardView() {
    console.log("Requesting to show Dashboard View...");
    if (!currentSystemData) {
        alert("Please load a system first to view the dashboard.");
        return;
    }
    switchView('dashboardView', 'dashboard');
}

/**
 * Initializes all content for the dashboard. Called by switchView.
 */
function initializeDashboard() {
    console.log("Initializing dashboard content with carousel...");
    generateDashboardLayout();
    showDashboardWidget(currentDashboardIndex); // Show the initial widget
}

/**
 * Handles the change event from the year selector dropdown.
 */
function handleDashboardYearChange(selectedYear) {
    dashboardPlanningYear = selectedYear;
    console.log(`Doughnut chart year filter changed to: ${dashboardPlanningYear}`);
    
    // Also update the year filter in the roadmap widget if it exists
    const roadmapYearFilter = document.getElementById('roadmapYearFilter');
    if (roadmapYearFilter) {
        roadmapYearFilter.value = selectedYear;
    }

    // Re-render the currently visible widget to apply the filter
    const currentWidget = dashboardItems[currentDashboardIndex];
    currentWidget.generator();
}

/**
 * Main function to create the carousel shell and its static elements.
 * REVISED: Removes h2 and h3 titles for a cleaner look.
 */
function generateDashboardLayout() {
    const container = document.getElementById('dashboardView');
    if (!container) {
        console.error("Dashboard container #dashboardView not found.");
        return;
    }

    const yearSelectorHTML = generateYearSelectorHTML();

    container.innerHTML = `
        ${yearSelectorHTML}
        <div id="dashboardCarousel" style="position: relative; border: 1px solid #ddd; padding: 10px; background-color: #fff; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 15px;">
                <button onclick="navigateDashboard(-1)">&lt; Previous</button>
                <span id="dashboardTitle" style="margin: 0 15px; font-weight: bold; font-size: 1.4em; color: #333;"></span>
                <button onclick="navigateDashboard(1)">Next &gt;</button>
            </div>
            
            <div id="investmentDistributionWidget" class="dashboard-carousel-item" style="display: none;">
                <p class="widget-subtitle" style="font-size: 0.9em; color: #666; text-align: center; margin-top: 0; margin-bottom: 15px;">Shows investment breakdown for the selected period.</p>
                <div class="chart-container" style="position: relative; height:400px; width:80vw; max-width: 600px; margin: auto;">
                    <canvas id="investmentDistributionChart"></canvas>
                </div>
                <div id="investmentTableContainer" style="margin-top: 20px;"></div>
            </div>

            <div id="investmentTrendWidget" class="dashboard-carousel-item" style="display: none;">
                 <p class="widget-subtitle" style="font-size: 0.9em; color: #666; text-align: center; margin-top: 0; margin-bottom: 15px;">Compares the percentage of total effort allocated to each theme, year over year.</p>
                <div class="chart-container" style="position: relative; height:450px; width:95%; margin: auto;">
                    <canvas id="investmentTrendChart"></canvas>
                </div>
            </div>

            <div id="roadmapTimelineWidget" class="dashboard-carousel-item" style="display: none;">
                </div>
        </div>
    `;
}

/**
 * Generates the HTML for the year selector dropdown.
 */
function generateYearSelectorHTML() {
    let availableYears = [...new Set((currentSystemData.yearlyInitiatives || []).map(init => init.attributes.planningYear).filter(Boolean))].sort((a, b) => a - b);
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());
    
    let yearOptionsHTML = '<option value="all">All Years</option>' + availableYears.map(year => `<option value="${year}" ${year == dashboardPlanningYear ? 'selected' : ''}>${year}</option>`).join('');
    
    return `
        <div style="margin-bottom: 20px; text-align: left;">
            <label for="dashboardYearSelector" style="font-weight: bold; margin-right: 10px;">Filter by Year:</label>
            <select id="dashboardYearSelector" onchange="handleDashboardYearChange(this.value)" style="padding: 5px; border-radius: 4px;">
                ${yearOptionsHTML}
            </select>
        </div>
    `;
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
    if(elementToShow) {
        elementToShow.style.display = 'block';
        // This function call is what renders the content inside the now-visible container
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
    
    const allYears = [...new Set(currentSystemData.yearlyInitiatives.map(init => init.attributes.planningYear).filter(Boolean))].sort((a,b) => a - b);
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
                        label: function(context) {
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

    const initiatives = selectedYear === 'all'
        ? currentSystemData.yearlyInitiatives
        : currentSystemData.yearlyInitiatives.filter(init => init.attributes.planningYear == selectedYear);

    initiatives.forEach(initiative => {
        if (initiative.status === 'Completed') return;
        const totalSdeYears = (initiative.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
        if (totalSdeYears > 0 && initiative.themes && initiative.themes.length > 0) {
            initiative.themes.forEach(themeId => {
                const themeName = themeMap.get(themeId);
                if (themeName) {
                    investmentByTheme[themeName] += totalSdeYears;
                }
            });
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

window.showDashboardView = showDashboardView;

