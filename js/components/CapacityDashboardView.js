/**
 * CapacityDashboardView.js
 * 
 * Dashboard component for analyzing capacity.
 * Features KPI cards, Waterfall Chart, and detailed Summary Table.
 */
class CapacityDashboardView {
    constructor() {
        this.container = null;
        this.capacityEngine = new CapacityEngine(window.currentSystemData);
        this.currentScenario = 'EffectiveBIS'; // Default
        this.currentChartTeamId = '__ORG_VIEW__';
    }

    render(container) {
        this.container = container;
        this.container.innerHTML = '';

        // Update Data
        this.capacityEngine.updateSystemData(window.currentSystemData);
        const metrics = this.capacityEngine.calculateAllMetrics();

        const wrapper = document.createElement('div');
        wrapper.className = 'capacity-dashboard-view';

        // 1. Controls Row (Scenario Selector)
        this._renderControls(wrapper);

        // 2. KPI Cards
        this._renderKPICards(wrapper, metrics);

        // 3. Chart Section
        this._renderChartSection(wrapper, metrics);

        // 4. Summary Table
        this._renderSummaryTable(wrapper, metrics);

        this.container.appendChild(wrapper);
    }

    _renderControls(parent) {
        const container = document.createElement('div');
        container.className = 'capacity-dashboard-controls-container';

        // 1. Controls Row
        const row = document.createElement('div');
        row.className = 'capacity-dashboard-controls';

        // Scenario Selector
        const scenGroup = document.createElement('div');
        scenGroup.className = 'capacity-control-group';
        const scenLabel = document.createElement('span');
        scenLabel.textContent = 'Analysis Scenario:';
        scenLabel.className = 'capacity-dashboard-controls__label';
        scenGroup.appendChild(scenLabel);

        const scenSelect = document.createElement('select');
        scenSelect.className = 'form-control capacity-dashboard-controls__select';
        [
            { val: 'EffectiveBIS', text: 'Effective BIS (Actual + Borrowed)' },
            { val: 'TeamBIS', text: 'Team BIS (Actual Only)' },
            { val: 'FundedHC', text: 'Funded Headcount (Budget)' }
        ].forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.val;
            o.textContent = opt.text;
            if (opt.val === this.currentScenario) o.selected = true;
            scenSelect.appendChild(o);
        });
        scenSelect.onchange = (e) => {
            this.currentScenario = e.target.value;
            this.render(this.container);
        };
        scenGroup.appendChild(scenSelect);
        row.appendChild(scenGroup);

        // Team Filter (Moved from Chart)
        const teamGroup = document.createElement('div');
        teamGroup.className = 'capacity-control-group';
        const teamLabel = document.createElement('span');
        teamLabel.textContent = 'View For:';
        teamLabel.className = 'capacity-dashboard-controls__label';
        teamGroup.appendChild(teamLabel);

        const teamSelect = document.createElement('select');
        teamSelect.className = 'form-control capacity-dashboard-controls__select';

        const orgOpt = document.createElement('option');
        orgOpt.value = '__ORG_VIEW__';
        orgOpt.textContent = 'Entire Organization';
        if (this.currentChartTeamId === '__ORG_VIEW__') orgOpt.selected = true;
        teamSelect.appendChild(orgOpt);

        (window.currentSystemData.teams || []).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.teamId;
            opt.textContent = t.teamIdentity || t.teamName;
            if (t.teamId === this.currentChartTeamId) opt.selected = true;
            teamSelect.appendChild(opt);
        });

        teamSelect.onchange = (e) => {
            this.currentChartTeamId = e.target.value;
            this.render(this.container); // Re-render to update KPIs and Chart
        };
        teamGroup.appendChild(teamSelect);
        row.appendChild(teamGroup);

        container.appendChild(row);

        // 2. Dynamic Heading
        const heading = document.createElement('div');
        heading.className = 'capacity-dashboard-context-heading';

        const scenarioText = scenSelect.options[scenSelect.selectedIndex].text;
        const teamText = teamSelect.options[teamSelect.selectedIndex].text;

        heading.innerHTML = `Views reflect <strong>${scenarioText}</strong> for <strong>${teamText}</strong>`;
        container.appendChild(heading);

        parent.appendChild(container);
    }

    _renderKPICards(parent, metrics) {
        // Determine data source based on selection
        let data;
        if (this.currentChartTeamId === '__ORG_VIEW__') {
            data = metrics.totals[this.currentScenario];
        } else {
            data = metrics[this.currentChartTeamId]?.[this.currentScenario];
        }

        if (!data) {
            // Handle edge case where team data might be missing
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.textContent = 'No data available for this selection.';
            parent.appendChild(alert);
            return;
        }

        const row = document.createElement('div');
        row.className = 'capacity-kpi-row';

        const createCard = (title, value, subtext, colorClass) => {
            const card = document.createElement('div');
            card.className = `card text-white bg-${colorClass} capacity-kpi-card`;

            const h5 = document.createElement('h5');
            h5.className = 'card-title capacity-kpi-card__title';
            h5.textContent = title;
            card.appendChild(h5);

            const h2 = document.createElement('h2');
            h2.className = 'card-text capacity-kpi-card__value';
            h2.textContent = value;
            card.appendChild(h2);

            const p = document.createElement('p');
            p.className = 'card-text capacity-kpi-card__subtext';
            p.textContent = subtext;
            card.appendChild(p);

            return card;
        };

        // Gross
        row.appendChild(createCard('Gross Capacity', data.grossYrs.toFixed(1), 'Total SDE Years (Raw)', 'secondary'));

        // Deductions
        row.appendChild(createCard('Total Deductions', `-${data.deductYrs.toFixed(1)}`, 'Leave, Holidays, Overhead', 'danger'));

        // AI Gain
        const aiGain = data.deductionsBreakdown.aiProductivityGainYrs || 0;
        row.appendChild(createCard('AI Productivity Gain', `+${aiGain.toFixed(1)}`, 'Efficiency Uplift', 'success'));

        // Net
        row.appendChild(createCard('Net Project Capacity', data.netYrs.toFixed(1), 'Available for Roadmap', 'primary'));

        parent.appendChild(row);
    }

    _renderChartSection(parent, metrics) {
        const section = document.createElement('div');
        section.className = 'card capacity-chart-section';

        const header = document.createElement('div');
        header.className = 'capacity-chart-header';

        const title = document.createElement('h4');
        title.textContent = 'Capacity Waterfall Analysis';
        header.appendChild(title);

        // Removed local filter, now global

        section.appendChild(header);

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'capacity-chart-container';

        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);
        section.appendChild(canvasContainer);

        parent.appendChild(section);

        // Draw Chart (defer slightly to ensure DOM is ready)
        setTimeout(() => this._drawChart(canvas, metrics), 0);
    }

    _drawChart(canvas, metrics) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        let data;
        if (this.currentChartTeamId === '__ORG_VIEW__') {
            data = metrics.totals[this.currentScenario];
        } else {
            data = metrics[this.currentChartTeamId]?.[this.currentScenario];
        }

        if (!data) return;

        const bd = data.deductionsBreakdown;

        const labels = ['Gross Capacity', 'Std Leave', 'Var Leave', 'Specific Leave', 'Holidays', 'Org Events', 'Team Activities', 'Overhead', 'AI Gain', 'Net Capacity'];

        const values = [
            data.grossYrs,
            -bd.stdLeaveYrs,
            -bd.varLeaveYrs,
            -bd.specificLeaveYrs, // New
            -bd.holidayYrs,
            -bd.orgEventYrs,
            -bd.teamActivityYrs,
            -bd.overheadYrs,
            bd.aiProductivityGainYrs,
            data.netYrs
        ];

        const bgColors = [
            '#6c757d', // Gross (Grey)
            '#dc3545', '#dc3545', '#dc3545', '#d63384', '#dc3545', '#dc3545', '#dc3545', '#dc3545', // Deductions (Red, Specific Leave Pink)
            '#28a745', // AI Gain (Green)
            '#007bff'  // Net (Blue)
        ];

        this.chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'SDE Years',
                    data: values,
                    backgroundColor: bgColors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.toFixed(2)} SDE Years`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'SDE Years' }
                    }
                }
            }
        });
    }

    _renderSummaryTable(parent, metrics) {
        const section = document.createElement('div');
        section.className = 'capacity-summary-table';

        const title = document.createElement('h4');
        title.textContent = 'Detailed Team Breakdown';
        section.appendChild(title);

        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['Team', 'Headcount', 'Gross', 'Deductions', 'AI Gain', 'Net Capacity'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        const teams = window.currentSystemData.teams || [];

        teams.forEach(team => {
            const m = metrics[team.teamId]?.[this.currentScenario];
            if (!m) return;

            const row = tbody.insertRow();
            row.insertCell().textContent = team.teamIdentity || team.teamName;
            row.insertCell().textContent = m.totalHeadcount.toFixed(1);
            row.insertCell().textContent = m.grossYrs.toFixed(2);

            const dedCell = row.insertCell();
            dedCell.textContent = `-${m.deductYrs.toFixed(2)}`;
            dedCell.className = 'capacity-summary-deduction';

            const aiCell = row.insertCell();
            aiCell.textContent = `+${(m.deductionsBreakdown.aiProductivityGainYrs || 0).toFixed(2)}`;
            aiCell.className = 'capacity-summary-gain';

            const netCell = row.insertCell();
            netCell.textContent = m.netYrs.toFixed(2);
            netCell.className = 'capacity-summary-net';
            if (m.netYrs <= 0) netCell.classList.add('capacity-summary-net--negative');
        });

        section.appendChild(table);
        parent.appendChild(section);
    }
}

window.CapacityDashboardView = CapacityDashboardView;
