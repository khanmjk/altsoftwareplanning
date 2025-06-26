// js/dashboard.js

// Global variables to hold the chart instances
let investmentDoughnutChart = null;
let investmentTrendChart = null;

// Global variable to store the currently selected dashboard year for the doughnut chart
let dashboardPlanningYear = 'all';

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
 * Initializes all content for the dashboard. This is called by switchView.
 */
function initializeDashboard() {
    console.log("Initializing dashboard content...");
    generateDashboardLayout();
    // Generate both the doughnut chart (for the selected year) and the trend chart (for all years)
    generateInvestmentDistributionChart(dashboardPlanningYear);
    generateInvestmentTrendChart();
}

/**
 * Sets up the basic HTML layout for the dashboard view, including containers for both charts.
 */
function generateDashboardLayout() {
    const container = document.getElementById('dashboardView');
    if (!container) {
        console.error("Dashboard container #dashboardView not found.");
        return;
    }

    // --- Dynamic Year Selector for the Doughnut Chart ---
    const calendarYear = new Date().getFullYear();
    let availableYears = [];
    if (currentSystemData && currentSystemData.yearlyInitiatives) {
        const yearsFromData = new Set(currentSystemData.yearlyInitiatives.map(init => init.attributes.planningYear).filter(year => year));
        availableYears = Array.from(yearsFromData);
    }
    if (availableYears.length === 0) availableYears.push(calendarYear);
    if (!availableYears.includes(calendarYear)) availableYears.push(calendarYear);
    availableYears.sort((a, b) => a - b);

    let yearOptionsHTML = '<option value="all">All Years</option>' + availableYears.map(year =>
        `<option value="${year}" ${year == dashboardPlanningYear ? 'selected' : ''}>${year}</option>`
    ).join('');
    
    const yearSelectorHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <label for="dashboardYearSelector" style="font-weight: bold; margin-right: 10px;">Filter Single-Year View:</label>
            <select id="dashboardYearSelector" onchange="handleDashboardYearChange(this.value)" style="padding: 5px; border-radius: 4px;">
                ${yearOptionsHTML}
            </select>
        </div>
    `;

    container.innerHTML = `
        <h2>Strategic Investment Dashboard</h2>
        ${yearSelectorHTML}
        <div class="dashboard-widget" style="background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3>Investment Distribution by Theme (SDE-Years)</h3>
            <p style="font-size: 0.9em; color: #666; text-align: center; margin-top: -10px; margin-bottom: 15px;">Shows investment breakdown for the selected period.</p>
            <div class="chart-container" style="position: relative; height:400px; width:80vw; max-width: 600px; margin: auto;">
                <canvas id="investmentDistributionChart"></canvas>
            </div>
            <div id="investmentTableContainer" style="margin-top: 20px;"></div>
        </div>

        <div class="dashboard-widget" style="background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3>Investment Trend by Theme (% Allocation Over Time)</h3>
            <p style="font-size: 0.9em; color: #666; text-align: center; margin-top: -10px; margin-bottom: 15px;">Compares the percentage of total effort allocated to each theme, year over year.</p>
            <div class="chart-container" style="position: relative; height:450px; width:95%; margin: auto;">
                <canvas id="investmentTrendChart"></canvas>
            </div>
        </div>
    `;
}

/**
 * Handles the change event from the year selector dropdown for the doughnut chart.
 */
function handleDashboardYearChange(selectedYear) {
    dashboardPlanningYear = selectedYear;
    console.log(`Doughnut chart year changed to: ${dashboardPlanningYear}`);
    generateInvestmentDistributionChart(dashboardPlanningYear);
}

/**
 * Calculates and renders the doughnut chart for a specific year.
 * @param {string} selectedYear - The year to filter by, or 'all'.
 */
function generateInvestmentDistributionChart(selectedYear) {
    const canvas = document.getElementById('investmentDistributionChart');
    if (!canvas) { console.error("Canvas for doughnut chart not found."); return; }
    if (investmentDoughnutChart) investmentDoughnutChart.destroy();

    const data = processInvestmentData(selectedYear);
    
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
                title: { display: true, text: `SDE-Year Allocation for: ${selectedYear === 'all' ? 'All Years' : selectedYear}` },
                tooltip: { callbacks: { label: (context) => formatTooltipLabel(context, data.total) } }
            }
        }
    });

    generateInvestmentTable(data);
}

/**
 * Generates the new 100% stacked bar chart for investment trends.
 */
function generateInvestmentTrendChart() {
    const canvas = document.getElementById('investmentTrendChart');
    if (!canvas) { console.error("Canvas for trend chart not found."); return; }
    if (investmentTrendChart) investmentTrendChart.destroy();
    
    // --- Data Processing for Stacked Bar Chart ---
    const allYears = [...new Set(currentSystemData.yearlyInitiatives.map(init => init.attributes.planningYear).filter(Boolean))].sort();
    const allThemes = [...new Set(currentSystemData.definedThemes.map(t => t.name))];
    const themeColors = {'#4E79A7':0, '#F28E2B':1, '#E15759':2, '#76B7B2':3, '#59A14F':4, '#EDC948':5, '#B07AA1':6, '#FF9DA7':7, '#9C755F':8, '#BAB0AC':9};
    const datasets = allThemes.map((themeName, index) => ({
        label: themeName,
        data: [],
        backgroundColor: Object.keys(themeColors)[index % Object.keys(themeColors).length],
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
        data: {
            labels: allYears,
            datasets: datasets
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { stacked: true },
                y: { stacked: true, max: 100, ticks: { callback: (value) => `${value}%` } }
            },
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Investment Percentage by Theme Over Time' },
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
 * @param {string} selectedYear - The year to filter by ('all' or a number).
 * @returns {object} An object containing labels, sdeValues, and total.
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
 * @param {object} data - The processed data object from processInvestmentData.
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
 * @param {object} context - The tooltip context from Chart.js.
 * @param {number} total - The total SDE years for percentage calculation.
 * @returns {string} The formatted label string.
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