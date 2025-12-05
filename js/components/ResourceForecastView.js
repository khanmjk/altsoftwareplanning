/**
 * ResourceForecastView.js
 * 
 * View component for the Resource Forecasting tool.
 * Handles UI rendering, event binding, and interaction with the ForecastingEngine.
 */
class ResourceForecastView {
    constructor() {
        this.engine = new ForecastingEngine(window.currentSystemData);
        this.chartInstance = null;
        this.currentTeamId = null;
    }

    render(container) {
        if (!container) return;

        // Ensure engine has latest data (fix for singleton stale data)
        if (window.currentSystemData) {
            this.engine.updateSystemData(window.currentSystemData);
        }

        this.container = container;
        this.container.innerHTML = '';
        // Use standard workspace-view class for inheritance, plus specific class for overrides if needed
        this.container.className = 'workspace-view resource-forecast-container';

        // 1. Setup Metadata
        if (window.workspaceComponent) {
            window.workspaceComponent.setPageMetadata({
                title: 'Resource Forecasting',
                breadcrumbs: ['Planning', 'Resource Forecasting'],
                actions: []
            });
        }

        // 2. Setup Toolbar
        this._setupToolbar();

        // 3. Render Content
        this._renderContent();

        // 4. Attach Listeners
        this._attachListeners();
    }

    _setupToolbar() {
        if (!window.workspaceComponent) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'canvas-toolbar__content';
        toolbar.style.display = 'flex';
        toolbar.style.width = '100%';
        toolbar.style.alignItems = 'center';
        toolbar.style.gap = '16px';

        // Team Selector
        const teamWrap = document.createElement('div');
        teamWrap.className = 'toolbar-control-group';

        // Use pill-nav style for the selector container if desired, or keep standard
        // Keeping standard label + select for now, but ensuring alignment
        const label = document.createElement('label');
        label.textContent = 'Select Team:';
        label.style.marginRight = '8px';
        label.style.fontSize = '0.9rem';
        label.style.fontWeight = '500';

        const select = document.createElement('select');
        select.id = 'rf-team-select';
        select.className = 'form-select form-select-sm';
        select.style.minWidth = '200px';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a Team --';
        select.appendChild(defaultOption);

        if (window.currentSystemData && window.currentSystemData.teams) {
            window.currentSystemData.teams.forEach(team => {
                const name = team.teamIdentity || team.teamName || team.teamId;
                const option = document.createElement('option');
                option.value = team.teamId;
                option.textContent = name;
                select.appendChild(option);
            });
        }

        teamWrap.appendChild(label);
        teamWrap.appendChild(select);
        toolbar.appendChild(teamWrap);

        // Spacer
        const spacer = document.createElement('div');
        spacer.className = 'forecast-toolbar-gap';
        toolbar.appendChild(spacer);

        // Generate Button as Pill
        const pillContainer = document.createElement('div');
        pillContainer.className = 'pill-nav';

        const btn = document.createElement('button');
        btn.id = 'rf-generate-btn';
        btn.className = 'pill-nav__item pill-nav__item--active';

        const icon = document.createElement('i');
        icon.className = 'fas fa-play pill-nav__icon';

        const btnLabel = document.createElement('span');
        btnLabel.className = 'pill-nav__label';
        btnLabel.textContent = 'Generate Forecast';

        btn.appendChild(icon);
        btn.appendChild(btnLabel);

        pillContainer.appendChild(btn);
        toolbar.appendChild(pillContainer);

        window.workspaceComponent.setToolbar(toolbar);
    }

    _renderContent() {
        // Input Section
        const inputSection = document.createElement('div');
        inputSection.className = 'forecast-input-grid';

        const createInput = (label, id, value, help, readonly = false) => {
            const group = document.createElement('div');
            group.className = 'forecast-input-group';

            const lbl = document.createElement('label');
            lbl.textContent = label;

            const inp = document.createElement('input');
            inp.type = 'number';
            inp.id = id;
            if (value !== null) inp.value = value;
            if (readonly) {
                inp.readOnly = true;
                inp.placeholder = '-';
            }

            const helpText = document.createElement('div');
            helpText.className = 'forecast-help-text';
            helpText.textContent = help;

            group.appendChild(lbl);
            group.appendChild(inp);
            group.appendChild(helpText);
            return group;
        };

        inputSection.appendChild(createInput('Funded Team Size', 'rf-funded-size', null, 'Total headcount budget (from Team data).', true));
        inputSection.appendChild(createInput('Current Engineers', 'rf-current-eng', null, 'Currently assigned engineers (from Team data).', true));
        inputSection.appendChild(createInput('Avg Hiring Time (weeks)', 'rf-hiring-time', '12', 'Time from req open to start date.'));
        inputSection.appendChild(createInput('Ramp-up Time (weeks)', 'rf-ramp-up', '10', 'Time to reach full productivity.'));
        inputSection.appendChild(createInput('Annual Attrition (%)', 'rf-attrition', '10', 'Expected annual turnover rate.'));
        inputSection.appendChild(createInput('Target Week', 'rf-target-week', '26', 'Week to close the funding gap.'));

        this.container.appendChild(inputSection);

        // Output Section
        const outputSection = document.createElement('div');
        outputSection.className = 'forecast-output-section';

        // Summary Box
        const summaryBox = document.createElement('div');
        summaryBox.id = 'rf-summary-box';
        summaryBox.className = 'forecast-summary-box';
        summaryBox.style.display = 'none';

        const summaryText = document.createElement('div');
        summaryText.id = 'rf-summary-text';
        summaryText.className = 'forecast-summary-text';

        summaryBox.appendChild(summaryText);
        outputSection.appendChild(summaryBox);

        // Chart Container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'forecast-chart-container';

        const canvas = document.createElement('canvas');
        canvas.id = 'rf-chart';

        chartContainer.appendChild(canvas);
        outputSection.appendChild(chartContainer);

        // Tables Grid
        const tablesGrid = document.createElement('div');
        tablesGrid.className = 'forecast-tables-grid';

        const createTable = (title, id, headers) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'forecast-table-wrapper';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'forecast-table-header';
            headerDiv.textContent = title;

            const scrollDiv = document.createElement('div');
            scrollDiv.style.maxHeight = '300px';
            scrollDiv.style.overflowY = 'auto';

            const table = document.createElement('table');
            table.className = 'forecast-data-table';
            table.id = id;

            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            headers.forEach(h => {
                const th = document.createElement('th');
                th.textContent = h;
                tr.appendChild(th);
            });
            thead.appendChild(tr);

            const tbody = document.createElement('tbody');
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = headers.length;
            emptyCell.className = 'forecast-empty-state';
            emptyCell.textContent = 'Run forecast to see data';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);

            table.appendChild(thead);
            table.appendChild(tbody);
            scrollDiv.appendChild(table);

            wrapper.appendChild(headerDiv);
            wrapper.appendChild(scrollDiv);
            return wrapper;
        };

        tablesGrid.appendChild(createTable('Monthly Summary', 'rf-monthly-table', ['Month', 'Headcount', 'SDE-Weeks', 'SDE-Days']));
        tablesGrid.appendChild(createTable('Weekly Detail', 'rf-weekly-table', ['Week', 'Effective Engineers']));

        outputSection.appendChild(tablesGrid);
        this.container.appendChild(outputSection);

        // FAQ Section
        this._renderFAQ();
    }

    _renderFAQ() {
        const faq = document.createElement('div');
        faq.className = 'forecast-faq-section';

        const h3 = document.createElement('h3');
        h3.textContent = 'Model Insights & FAQ';
        faq.appendChild(h3);

        const faqs = [
            {
                q: "1. How are 'Effective Engineers', 'SDE-Weeks', and 'SDE-Days' calculated now?",
                a: `<p>This forecast model estimates the <em>productive engineering capacity available for project work</em> after accounting for hiring delays, ramp-up, attrition, and non-project time defined in the 'Tune Capacity Constraints' section.</p>
                    <ul>
                        <li><strong>Foundation:</strong> The model tracks 'Total Headcount' (Purple line) based on current engineers, hiring pipeline, and attrition. It also tracks 'Total Ramped Up Engineers' (Green dashed line), which lags headcount based on the 'Ramp-up Time' input.</li>
                        <li><strong>Capacity Integration:</strong> The crucial step is determining the actual productive time per engineer. Instead of a simple efficiency %, the model calculates the <strong>'Net Available Days per Week per SDE'</strong> for the selected team. This calculation uses the values you configured in the 'Tune Capacity Constraints' page:
                            <ul>
                                <li>The 'Standard Working Days Per Year' set globally.</li>
                                <li>Deductions for global Public Holidays and Org-Wide Events.</li>
                                <li>Deductions for Standard Leave types (like Annual, Sick), adjusted by the team's specific 'Uptake %'.</li>
                                <li>Deductions based on the team's 'Avg. Overhead (Hrs/Week/SDE)' for recurring meetings, admin, etc.</li>
                                <li>Deductions for per-SDE 'Team Activities' (like training days).</li>
                            </ul>
                        </li>
                        <li><strong>Effective Engineers (Blue Line):</strong> This is calculated weekly as: 'Total Ramped Up Engineers' &times; ('Net Available Days per Week per SDE' / 5). It represents the SDEs effectively available for project work that week.</li>
                    </ul>`
            },
            {
                q: "2. Why is 'Effective Engineers' (Blue) lower than 'Total Ramped Up Engineers' (Green Dashed)?",
                a: `<p>The Green dashed line shows the number of engineers who have completed their ramp-up period. The Blue line shows how much *productive project capacity* those ramped-up engineers represent.</p>
                    <p>The Blue line will be lower than the Green line whenever the calculated 'Net Available Days per Week per SDE' is less than 5. This difference represents the proportion of a ramped-up engineer's time consumed by configured non-project factors like leave, holidays, recurring overhead, org events, and per-SDE team activities.</p>`
            },
            {
                q: "3. How is the 'Est. Hires Required' calculated?",
                a: `<p>The text "Est. Hires Required" aims to provide a practical hiring target.</p>
                    <ul>
                        <li>The underlying model first calculates the *minimum constant weekly hiring rate* needed to make the 'Total Headcount' reach the 'Funded Team Size' precisely by the 'Target Week'.</li>
                        <li>To provide a more actionable number, the tool then estimates the total number of *whole* hires needed. This includes the initial gap ('Funded Size' - 'Current Available Engineers') plus an estimate of the cumulative attrition expected to occur between the start and the target week.</li>
                    </ul>`
            },
            {
                q: "4. How does Attrition work in this model? What are its limitations?",
                a: `<p>The model applies attrition based on the 'Annual Attrition Rate (%)' input.</p>
                    <ul>
                        <li>The annual percentage is converted into a weekly rate.</li>
                        <li>Each week, this rate is applied to the *current total headcount* (including engineers still ramping up).</li>
                        <li>Fractional attrition accumulates, and whole engineers are removed from the headcount when the fraction crosses an integer.</li>
                    </ul>
                    <p><strong>Limitations:</strong> Assumes linear attrition and applies the same rate to everyone regardless of tenure.</p>`
            },
            {
                q: "5. How does Ramp-up Time work? What are its limitations?",
                a: `<p>New hires enter the simulation after the 'Average Hiring Time'. They immediately count towards 'Total Headcount' (Purple line).</p>
                    <ul>
                        <li>They remain in a 'ramping' state for the number of weeks specified in 'Ramp-up Time'.</li>
                        <li>Only *after* completing this period do they contribute to 'Total Ramped Up Engineers' (Green dashed line) and subsequently to 'Effective Engineers' (Blue line).</li>
                    </ul>
                    <p><strong>Limitations:</strong> Assumes 0% productivity during ramp-up, then instantly 100% productivity afterwards.</p>`
            },
            {
                q: "6. How should I choose the manual input values?",
                a: `<ul>
                        <li><strong>Hiring Time:</strong> Use historical data (job req approval to start date).</li>
                        <li><strong>Ramp-up Time:</strong> Estimate based on role complexity and onboarding effectiveness.</li>
                        <li><strong>Attrition Rate (%):</strong> Base on historical team/org data.</li>
                        <li><strong>Target Week:</strong> Set an ambitious but *achievable* target.</li>
                    </ul>`
            },
            {
                q: "7. What are the key assumptions and limitations?",
                a: `<ul>
                        <li><strong>Linear Attrition:</strong> Assumes a constant rate spread evenly over the year.</li>
                        <li><strong>Binary Ramp-Up:</strong> Assumes hires are non-productive then fully productive.</li>
                        <li><strong>Constant Hiring Rate:</strong> Calculates the *required* rate as a constant average.</li>
                        <li><strong>Capacity Based on Snapshot:</strong> Uses the current 'Tune Capacity Constraints' data.</li>
                    </ul>`
            },
            {
                q: "8. What are potential future improvements?",
                a: `<ul>
                        <li><strong>Dynamic Inputs:</strong> Modeling non-linear attrition and variable hiring rates.</li>
                        <li><strong>Persistence:</strong> Saving forecast input parameters per team.</li>
                        <li><strong>Scenario Comparison:</strong> Ability to save and compare different forecast scenarios.</li>
                        <li><strong>Cost Integration:</strong> Adding salary bands or cost estimates.</li>
                    </ul>`
            }
        ];

        faqs.forEach(item => {
            const details = document.createElement('details');
            details.className = 'forecast-faq-item';

            const summary = document.createElement('summary');
            summary.textContent = item.q;

            const content = document.createElement('div');
            content.className = 'forecast-faq-content';
            content.innerHTML = item.a; // Rich text content allowed

            details.appendChild(summary);
            details.appendChild(content);
            faq.appendChild(details);
        });

        this.container.appendChild(faq);
    }

    _attachListeners() {
        const teamSelect = document.getElementById('rf-team-select');
        const generateBtn = document.getElementById('rf-generate-btn');

        if (teamSelect) {
            teamSelect.addEventListener('change', (e) => this._handleTeamChange(e.target.value));
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this._generateForecast());
        }

        // Real-time updates for inputs
        const inputs = ['rf-hiring-time', 'rf-ramp-up', 'rf-attrition', 'rf-target-week'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this._generateForecast());
                el.addEventListener('input', () => {
                    // Optional: Debounce this if calculations become heavy
                    // For now, 'change' covers commit, 'input' covers typing if we want instant feedback
                    // Let's stick to 'change' for stability or just 'change' + 'blur'
                });
            }
        });
    }

    _handleTeamChange(teamId) {
        this.currentTeamId = teamId;
        const fundedInput = document.getElementById('rf-funded-size');
        const currentInput = document.getElementById('rf-current-eng');

        // Clear outputs
        this._clearOutputs();

        if (!teamId) {
            fundedInput.value = '';
            currentInput.value = '';
            return;
        }

        const team = window.currentSystemData.teams.find(t => t.teamId === teamId);
        if (team) {
            fundedInput.value = team.fundedHeadcount || 0;
            currentInput.value = (team.engineers || []).length;
        }
    }

    _clearOutputs() {
        document.getElementById('rf-summary-box').style.display = 'none';
        document.getElementById('rf-summary-text').innerHTML = '';

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const emptyRow = '<tr><td colspan="4" class="forecast-empty-state">Run forecast to see data</td></tr>';
        document.querySelector('#rf-monthly-table tbody').innerHTML = emptyRow;
        document.querySelector('#rf-weekly-table tbody').innerHTML = '<tr><td colspan="2" class="forecast-empty-state">Run forecast to see data</td></tr>';
    }

    _generateForecast() {
        if (!this.currentTeamId) {
            window.notificationManager.showToast('Please select a team first.', 'warning');
            return;
        }

        // Gather inputs
        const fundedSize = parseInt(document.getElementById('rf-funded-size').value) || 0;
        const currentEng = parseInt(document.getElementById('rf-current-eng').value) || 0;
        const hiringTime = parseInt(document.getElementById('rf-hiring-time').value) || 12;
        const rampUp = parseInt(document.getElementById('rf-ramp-up').value) || 10;
        const attrition = parseFloat(document.getElementById('rf-attrition').value) || 10;
        const targetWeek = parseInt(document.getElementById('rf-target-week').value) || 26;

        // Validation
        if (targetWeek < hiringTime) {
            window.notificationManager.showToast('Target week cannot be less than hiring time.', 'error');
            return;
        }

        // Run Simulation
        const hiringRate = this.engine.computeHiringRate(fundedSize, currentEng, hiringTime, rampUp, attrition / 100, targetWeek);
        const results = this.engine.simulateTeamSize(hiringRate, fundedSize, currentEng, hiringTime, rampUp, attrition / 100, this.currentTeamId);

        if (!results) {
            window.notificationManager.showToast('Simulation failed. Check console.', 'error');
            return;
        }

        // Calculate detailed hires needed
        const hiresNeededStats = this.engine.calculateEstimatedHiresNeeded(fundedSize, currentEng, hiringRate, attrition / 100, targetWeek);

        // Render Results
        this._renderSummary(hiringRate, targetWeek, fundedSize, currentEng, hiresNeededStats);
        this._renderTables(results);
        this._renderChart(results, fundedSize);
    }

    _renderSummary(hiringRate, targetWeek, fundedSize, currentEng, stats) {
        const box = document.getElementById('rf-summary-box');
        const text = document.getElementById('rf-summary-text');

        box.style.display = 'block';
        text.innerHTML = ''; // Clear previous content

        const strong1 = document.createElement('strong');
        strong1.textContent = 'Forecast Result:';

        const line1 = document.createElement('div');
        line1.appendChild(strong1);

        const line2 = document.createElement('div');
        line2.innerHTML = `To reach the funded size of <strong>${fundedSize}</strong> by Week <strong>${targetWeek}</strong>:`;

        const line3 = document.createElement('div');
        line3.innerHTML = `You need to hire approximately <strong>${hiringRate.toFixed(2)}</strong> engineers per week.`;

        const detailsDiv = document.createElement('div');
        detailsDiv.style.marginTop = '8px';
        detailsDiv.style.fontSize = '0.9em';
        detailsDiv.style.color = '#444';
        detailsDiv.innerHTML = `
            <strong>Est. Total Hires Required: ${Math.ceil(stats.totalHiresNeeded)}</strong><br>
            (Gap Fill: ${stats.initialGap} + Attrition Replacement: ~${Math.round(stats.estimatedAttrition)})
        `;

        text.appendChild(line1);
        text.appendChild(line2);
        text.appendChild(line3);
        text.appendChild(detailsDiv);
    }

    _renderTables(results) {
        // Monthly Table
        const monthlyBody = document.querySelector('#rf-monthly-table tbody');
        monthlyBody.innerHTML = '';
        results.monthlyData.headcount.forEach((hc, idx) => {
            const row = document.createElement('tr');

            const tdMonth = document.createElement('td');
            tdMonth.textContent = `Month ${idx + 1}`;

            const tdHc = document.createElement('td');
            tdHc.textContent = hc;

            const tdWeeks = document.createElement('td');
            tdWeeks.textContent = results.monthlyData.sdeWeeks[idx].toFixed(1);

            const tdDays = document.createElement('td');
            tdDays.textContent = results.monthlyData.sdeDays[idx].toFixed(1);

            row.appendChild(tdMonth);
            row.appendChild(tdHc);
            row.appendChild(tdWeeks);
            row.appendChild(tdDays);
            monthlyBody.appendChild(row);
        });

        // Weekly Table
        const weeklyBody = document.querySelector('#rf-weekly-table tbody');
        weeklyBody.innerHTML = '';
        results.productiveEngineers.forEach((eff, idx) => {
            const row = document.createElement('tr');

            const tdWeek = document.createElement('td');
            tdWeek.textContent = `Week ${idx + 1}`;

            const tdEff = document.createElement('td');
            tdEff.textContent = eff.toFixed(2);

            row.appendChild(tdWeek);
            row.appendChild(tdEff);
            weeklyBody.appendChild(row);
        });
    }

    _renderChart(results, fundedSize) {
        const ctx = document.getElementById('rf-chart').getContext('2d');
        const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [
                    {
                        label: 'Total Headcount',
                        data: results.totalHeadcountArray,
                        borderColor: '#8b5cf6', // Purple
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Ramped Up Engineers',
                        data: results.totalRampedUpEngineersArray,
                        borderColor: '#10b981', // Green
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Effective Engineers (Capacity)',
                        data: results.productiveEngineers,
                        borderColor: '#3b82f6', // Blue
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Funded Target',
                        data: Array(52).fill(fundedSize),
                        borderColor: '#ef4444', // Red
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: '52-Week Resource Forecast' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { title: { display: true, text: 'Week' } },
                    y: { title: { display: true, text: 'Engineers' }, min: 0 }
                }
            }
        });
    }
}
