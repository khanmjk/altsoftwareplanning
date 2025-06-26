// js/dashboard.js

// Global variable to hold the chart instance
let investmentChart = null;

/**
 * Main function to trigger the display of the Dashboard view.
 * This is called by the button in the main navigation.
 */
function showDashboardView() {
    console.log("Requesting to show Dashboard View...");
    if (!currentSystemData) {
        alert("Please load a system first to view the dashboard.");
        return;
    }
    // This function's only job is to tell switchView what to do.
    // The actual content generation is now handled by initializeDashboard,
    // which is called by switchView's callback.
    switchView('dashboardView', 'dashboard');
}

/**
 * Initializes all content for the dashboard.
 * This function is called by switchView AFTER the dashboardView div is visible.
 */
function initializeDashboard() {
    console.log("Initializing dashboard content...");
    generateDashboardLayout();
    generateInvestmentDistributionChart();
}

/**
 * Sets up the basic layout for the dashboard view.
 */
function generateDashboardLayout() {
    const container = document.getElementById('dashboardView');
    if (!container) {
        console.error("Dashboard container #dashboardView not found.");
        return;
    }

    // This styling is just an example, can be moved to CSS
    container.innerHTML = `
        <h2>Strategic Investment Dashboard</h2>
        <div class="dashboard-widget" style="background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h3>Investment Distribution by Theme (SDE-Years)</h3>
            <div class="chart-container" style="position: relative; height:400px; width:80vw; max-width: 600px; margin: auto;">
                <canvas id="investmentDistributionChart"></canvas>
            </div>
            <div id="investmentTableContainer" style="margin-top: 20px;"></div>
        </div>
        `;
}

/**
 * Calculates the investment distribution and renders the chart.
 */
function generateInvestmentDistributionChart() {
    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !currentSystemData.definedThemes) {
        console.warn("Missing data for investment chart (initiatives or themes).");
        return;
    }

    const themeMap = new Map(currentSystemData.definedThemes.map(theme => [theme.themeId, theme.name]));
    const investmentByTheme = {};

    // Initialize all themes with 0 investment to ensure they appear in the data
    themeMap.forEach((name, id) => {
        investmentByTheme[name] = 0;
    });

    // Calculate SDE Years per theme
    currentSystemData.yearlyInitiatives.forEach(initiative => {
        // Only include initiatives that haven't been completed in the investment calculation
        if (initiative.status === 'Completed') return;

        const totalSdeYears = (initiative.assignments || []).reduce((sum, assignment) => sum + (assignment.sdeYears || 0), 0);
        
        if (totalSdeYears > 0 && initiative.themes && initiative.themes.length > 0) {
            initiative.themes.forEach(themeId => {
                const themeName = themeMap.get(themeId);
                if (themeName) {
                    investmentByTheme[themeName] += totalSdeYears;
                }
            });
        }
    });

    const chartData = {
        labels: Object.keys(investmentByTheme).filter(themeName => investmentByTheme[themeName] > 0),
        datasets: [{
            data: Object.values(investmentByTheme).filter(sde => sde > 0),
            backgroundColor: [
                '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
                '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'
            ],
            hoverOffset: 4
        }]
    };

    const canvas = document.getElementById('investmentDistributionChart');
    if (!canvas) {
        console.error("Canvas element for investment chart not found.");
        return;
    }
    
    // Destroy existing chart instance if it exists
    if (investmentChart) {
        investmentChart.destroy();
        investmentChart = null;
    }

    investmentChart = new Chart(canvas, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'SDE-Year Allocation by Strategic Theme (Planned Work)'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.raw !== null) {
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = total > 0 ? (context.raw / total * 100).toFixed(1) : 0;
                                label += `${context.raw.toFixed(2)} SDE-Yrs (${percentage}%)`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
    
    generateInvestmentTable(investmentByTheme);
}

/**
 * Generates a summary table to accompany the investment chart.
 * @param {object} investmentData - The calculated data of investment per theme.
 */
function generateInvestmentTable(investmentData) {
    const container = document.getElementById('investmentTableContainer');
    if (!container) return;

    const tableData = Object.entries(investmentData)
        .map(([theme, sdeYears]) => ({ theme, sdeYears }))
        .filter(item => item.sdeYears > 0)
        .sort((a, b) => b.sdeYears - a.sdeYears);

    const totalInvestment = tableData.reduce((sum, item) => sum + item.sdeYears, 0);

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

    tableData.forEach(item => {
        const percentage = totalInvestment > 0 ? (item.sdeYears / totalInvestment * 100).toFixed(1) : 0;
        tableHTML += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.theme}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.sdeYears.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${percentage}%</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
            <tfoot style="font-weight: bold;">
                <tr>
                    <td style="border: 1px solid #ccc; padding: 8px;">Total</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${totalInvestment.toFixed(2)}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${totalInvestment > 0 ? '100.0%' : '0.0%'}</td>
                </tr>
            </tfoot>
        </table>
    `;

    container.innerHTML = tableHTML;
}