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

        // Chart Container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'forecast-chart-container';

        const canvas = document.createElement('canvas');
        canvas.id = 'rf-chart';

        chartContainer.appendChild(canvas);
        outputSection.appendChild(chartContainer);

        // Narrative Summary Box (Below Chart)
        const narrativeBox = document.createElement('div');
        narrativeBox.id = 'rf-narrative-box';
        narrativeBox.className = 'workspace-card'; // Use standard card
        narrativeBox.style.display = 'none';
        narrativeBox.style.backgroundColor = '#f1f5f9'; // Light gray background per screenshot
        narrativeBox.style.border = 'none';
        narrativeBox.style.padding = '20px';
        narrativeBox.style.marginTop = '20px';

        outputSection.appendChild(narrativeBox);

        this.container.appendChild(outputSection);

        // FAQ Section
        this._renderFAQ();
    }

    _renderFAQ() {
        const faq = document.createElement('div');
        faq.className = 'forecast-faq-section';
        faq.innerHTML = `
            <h3>Model Insights & FAQ</h3>

            <details class="forecast-faq-item">
                <summary>1. How are 'Effective Engineers', 'SDE-Weeks', and 'SDE-Days' calculated now?</summary>
                <div class="forecast-faq-content">
                    <p>This forecast model estimates the <em>productive engineering capacity available for project work</em> after accounting for hiring delays, ramp-up, attrition, and non-project time defined in the 'Tune Capacity Constraints' section.</p>
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
                    </ul>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>2. Why is 'Effective Engineers' (Blue) lower than 'Total Ramped Up Engineers' (Green Dashed)?</summary>
                <div class="forecast-faq-content">
                    <p>The Green dashed line shows the number of engineers who have completed their ramp-up period. The Blue line shows how much *productive project capacity* those ramped-up engineers represent.</p>
                    <p>The Blue line will be lower than the Green line whenever the calculated 'Net Available Days per Week per SDE' is less than 5. This difference represents the proportion of a ramped-up engineer's time consumed by configured non-project factors like leave, holidays, recurring overhead, org events, and per-SDE team activities.</p>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>3. How is the 'Est. Hires Required' calculated?</summary>
                <div class="forecast-faq-content">
                    <p>The text "Est. Hires Required" aims to provide a practical hiring target.</p>
                    <ul>
                        <li>The underlying model first calculates the *minimum constant weekly hiring rate* needed to make the 'Total Headcount' reach the 'Funded Team Size' precisely by the 'Target Week'.</li>
                        <li>To provide a more actionable number, the tool then estimates the total number of *whole* hires needed. This includes the initial gap ('Funded Size' - 'Current Available Engineers') plus an estimate of the cumulative attrition expected to occur between the start and the target week.</li>
                    </ul>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>4. How does Attrition work in this model? What are its limitations?</summary>
                <div class="forecast-faq-content">
                    <p>The model applies attrition based on the 'Annual Attrition Rate (%)' input.</p>
                    <ul>
                        <li>The annual percentage is converted into a weekly rate.</li>
                        <li>Each week, this rate is applied to the *current total headcount* (including engineers still ramping up).</li>
                        <li>Fractional attrition accumulates, and whole engineers are removed from the headcount when the fraction crosses an integer.</li>
                    </ul>
                    <p><strong>Limitations:</strong> Assumes linear attrition and applies the same rate to everyone regardless of tenure.</p>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>5. How does Ramp-up Time work? What are its limitations?</summary>
                <div class="forecast-faq-content">
                    <p>New hires enter the simulation after the 'Average Hiring Time'. They immediately count towards 'Total Headcount' (Purple line).</p>
                    <ul>
                        <li>They remain in a 'ramping' state for the number of weeks specified in 'Ramp-up Time'.</li>
                        <li>Only *after* completing this period do they contribute to 'Total Ramped Up Engineers' (Green dashed line) and subsequently to 'Effective Engineers' (Blue line).</li>
                    </ul>
                    <p><strong>Limitations:</strong> Assumes 0% productivity during ramp-up, then instantly 100% productivity afterwards.</p>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>6. How should I choose the manual input values?</summary>
                <div class="forecast-faq-content">
                    <ul>
                        <li><strong>Hiring Time:</strong> Use historical data (job req approval to start date).</li>
                        <li><strong>Ramp-up Time:</strong> Estimate based on role complexity and onboarding effectiveness.</li>
                        <li><strong>Attrition Rate (%):</strong> Base on historical team/org data.</li>
                        <li><strong>Target Week:</strong> Set an ambitious but *achievable* target.</li>
                    </ul>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>7. What are the key assumptions and limitations?</summary>
                <div class="forecast-faq-content">
                    <ul>
                        <li><strong>Linear Attrition:</strong> Assumes a constant rate spread evenly over the year.</li>
                        <li><strong>Binary Ramp-Up:</strong> Assumes hires are non-productive then fully productive.</li>
                        <li><strong>Constant Hiring Rate:</strong> Calculates the *required* rate as a constant average.</li>
                        <li><strong>Capacity Based on Snapshot:</strong> Uses the current 'Tune Capacity Constraints' data.</li>
                    </ul>
                </div>
            </details>
            
            <details class="forecast-faq-item">
                <summary>8. What are potential future improvements?</summary>
                <div class="forecast-faq-content">
                    <ul>
                        <li><strong>Dynamic Inputs:</strong> Modeling non-linear attrition and variable hiring rates.</li>
                        <li><strong>Persistence:</strong> Saving forecast input parameters per team.</li>
                        <li><strong>Scenario Comparison:</strong> Ability to save and compare different forecast scenarios.</li>
                        <li><strong>Cost Integration:</strong> Adding salary bands or cost estimates.</li>
                    </ul>
                </div>
            </details>
        `;
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
        const narrativeBox = document.getElementById('rf-narrative-box');
        if (narrativeBox) {
            narrativeBox.style.display = 'none';
            narrativeBox.innerHTML = '';
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
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
        this._renderNarrativeSummary(hiringRate, targetWeek, fundedSize, hiringTime, rampUp, attrition, results.calculatedNetAvailableDaysPerWeek);
        this._renderChart(results, fundedSize);
    }

    _renderNarrativeSummary(hiringRate, targetWeek, fundedSize, hiringTime, rampUp, attrition, netAvailableDays) {
        const box = document.getElementById('rf-narrative-box');
        if (!box) return;

        box.style.display = 'block';
        box.innerHTML = '';

        const team = window.currentSystemData.teams.find(t => t.teamId === this.currentTeamId);
        let teamDisplayName = 'the team';
        let simpleTeamName = 'the team';

        if (team) {
            const identity = team.teamIdentity;
            const name = team.teamName;
            simpleTeamName = name || identity || 'the team';

            if (identity && name) {
                teamDisplayName = `${identity}, ${name}`;
            } else {
                teamDisplayName = identity || name || 'the team';
            }
        }

        // 1. Headline
        const headline = document.createElement('h3');
        headline.style.marginTop = '0';
        headline.style.fontSize = '1.1rem';
        headline.style.fontWeight = '600';
        headline.style.color = '#1e293b';
        headline.textContent = `For ${teamDisplayName}, to reach the funded team size of ${fundedSize} by Week ${targetWeek}, the required hiring rate is approximately ${hiringRate.toFixed(2)} engineers per week.`;
        box.appendChild(headline);

        // 2. Parameters List
        const listTitle = document.createElement('p');
        listTitle.style.fontWeight = '600';
        listTitle.style.marginBottom = '8px';
        listTitle.textContent = 'This forecast considers:';
        box.appendChild(listTitle);

        const ul = document.createElement('ul');
        ul.style.marginTop = '0';
        ul.style.marginBottom = '16px';
        ul.style.paddingLeft = '24px';

        const params = [
            `Avg. Hiring Time: ${hiringTime} weeks`,
            `Avg. Ramp-up Time: ${rampUp} weeks`,
            `Annual Attrition Rate: ${attrition}%`
        ];

        params.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul.appendChild(li);
        });
        box.appendChild(ul);

        // 3. Effective Engineers Explanation
        const explanation = document.createElement('p');
        explanation.style.lineHeight = '1.5';
        explanation.style.color = '#334155';

        const boldText = document.createElement('strong');
        boldText.textContent = "The 'Effective Engineers' shown reflect the ramped-up engineers adjusted for their actual productive time. ";
        explanation.appendChild(boldText);

        const normalText = document.createTextNode(`Based on the Capacity Configuration data for ${simpleTeamName} (including leave, holidays, overhead, etc.), the calculated average net available days per SDE per week is approximately ${netAvailableDays.toFixed(2)} (out of 5).`);
        explanation.appendChild(normalText);

        box.appendChild(explanation);

        // 4. Footer Note
        const footer = document.createElement('p');
        footer.style.marginTop = '16px';
        footer.style.fontStyle = 'italic';
        footer.style.fontSize = '0.9rem';
        footer.style.color = '#64748b';
        footer.textContent = 'Note: Manual forecast parameters (hiring time, ramp-up, attrition) are not currently saved per team.';
        box.appendChild(footer);
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
