/**
 * ResourceForecastView.js
 * 
 * View component for the Resource Forecasting tool.
 * Handles UI rendering, event binding, and interaction with the ForecastingEngine.
 */
class ResourceForecastView {
    constructor() {
        this.engine = new ForecastingEngine(SystemService.getCurrentSystem());
        this.chartInstance = null;
        this.currentTeamId = null;
    }

    render(container) {
        if (!container) return;

        // Ensure engine has latest data (fix for singleton stale data)
        if (SystemService.getCurrentSystem()) {
            this.engine.updateSystemData(SystemService.getCurrentSystem());
        }

        this.container = container;
        this.container.innerHTML = '';
        // Use standard workspace-view class for inheritance, plus specific class for overrides if needed
        this.container.className = 'workspace-view resource-forecast-container';

        // 1. Setup Metadata
        if (workspaceComponent) {
            workspaceComponent.setPageMetadata({
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
        if (!workspaceComponent) return;

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

        // Build options for ThemedSelect
        const teamOptions = [{ value: '', text: '-- Select a Team --' }];
        if (SystemService.getCurrentSystem() && SystemService.getCurrentSystem().teams) {
            SystemService.getCurrentSystem().teams.forEach(team => {
                const name = team.teamIdentity || team.teamName || team.teamId;
                teamOptions.push({ value: team.teamId, text: name });
            });
        }

        // Create ThemedSelect instance
        this.teamSelect = new ThemedSelect({
            options: teamOptions,
            value: '',
            placeholder: '-- Select a Team --',
            id: 'rf-team-select',
            onChange: (value) => this._handleTeamChange(value)
        });

        teamWrap.appendChild(label);
        teamWrap.appendChild(this.teamSelect.render());
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

        workspaceComponent.setToolbar(toolbar);
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

        inputSection.appendChild(createInput('Funded Team Size', 'rf-funded-size', null, 'Total headcount budget.'));
        inputSection.appendChild(createInput('Current Engineers', 'rf-current-eng', null, 'Currently assigned engineers.'));
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
        narrativeBox.className = 'workspace-card';
        narrativeBox.style.display = 'none';
        narrativeBox.style.marginTop = '20px';
        narrativeBox.style.marginTop = '20px';

        outputSection.appendChild(narrativeBox);

        this.container.appendChild(outputSection);

        // FAQ Section
        this._renderFAQ();
    }

    _renderFAQ() {
        const faqContainer = document.createElement('div');
        faqContainer.className = 'forecast-faq-section';
        faqContainer.id = 'rf-faq-container';

        // Add a loading state
        faqContainer.innerHTML = '<p>Loading FAQ...</p>';

        this.container.appendChild(faqContainer);

        this._loadFAQContent(faqContainer);
    }

    async _loadFAQContent(container) {
        const faqUrl = 'docs/sdmResourceForecastingFAQ.md';
        const htmlContent = await MarkdownService.fetchAndRender(faqUrl);

        // If fetch failed (e.g., CORS on file:// protocol), show fallback content
        if (htmlContent.includes('Could not load content')) {
            container.innerHTML = `
                <h3>FAQ & Model Insights</h3>
                <p><em>Full FAQ documentation is available when running via a local server. 
                   See <code>docs/sdmResourceForecastingFAQ.md</code> for details.</em></p>
                <details>
                    <summary><strong>Quick Reference: Key Metrics</strong></summary>
                    <ul>
                        <li><strong>Effective Engineers:</strong> Ramped-up engineers × (Net Available Days / 5)</li>
                        <li><strong>SDE-Weeks:</strong> Sum of weekly Effective Engineers for a month</li>
                        <li><strong>SDE-Days:</strong> Sum of (Effective Engineers × Net Available Days/Week) for a month</li>
                    </ul>
                </details>
                <details>
                    <summary><strong>How to Run with Full Docs</strong></summary>
                    <p>Start a local server: <code>python3 -m http.server 8000</code> or use VS Code Live Server</p>
                </details>
            `;
        } else {
            container.innerHTML = htmlContent;
        }
    }

    _attachListeners() {
        const generateBtn = document.getElementById('rf-generate-btn');

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
            // Playground Mode: Enable inputs
            fundedInput.readOnly = false;
            currentInput.readOnly = false;
            fundedInput.value = '';
            currentInput.value = '';
            fundedInput.placeholder = 'Enter size';
            currentInput.placeholder = 'Enter count';
            return;
        }

        // Team Selected Mode: Read-only inputs
        fundedInput.readOnly = true;
        currentInput.readOnly = true;
        fundedInput.placeholder = '-';
        currentInput.placeholder = '-';

        const team = SystemService.getCurrentSystem().teams.find(t => t.teamId === teamId);
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
        // Gather inputs
        const fundedSize = parseInt(document.getElementById('rf-funded-size').value) || 0;
        const currentEng = parseInt(document.getElementById('rf-current-eng').value) || 0;
        const hiringTime = parseInt(document.getElementById('rf-hiring-time').value) || 12;
        const rampUp = parseInt(document.getElementById('rf-ramp-up').value) || 10;
        const attrition = parseFloat(document.getElementById('rf-attrition').value) || 10;
        const targetWeek = parseInt(document.getElementById('rf-target-week').value) || 26;

        // Validation
        if (targetWeek < hiringTime) {
            notificationManager.showToast('Target week cannot be less than hiring time.', 'error');
            return;
        }

        // Run Simulation
        const hiringRate = this.engine.computeHiringRate(fundedSize, currentEng, hiringTime, rampUp, attrition / 100, targetWeek);
        const results = this.engine.simulateTeamSize(hiringRate, fundedSize, currentEng, hiringTime, rampUp, attrition / 100, this.currentTeamId);

        if (!results) {
            notificationManager.showToast('Simulation failed. Check console.', 'error');
            return;
        }

        // Store Capacity Gain in Team Attributes (if team selected)
        if (this.currentTeamId && SystemService.getCurrentSystem() && SystemService.getCurrentSystem().teams) {
            const team = SystemService.getCurrentSystem().teams.find(t => t.teamId === this.currentTeamId);
            if (team) {
                if (!team.attributes) team.attributes = {};
                team.attributes.newHireProductiveCapacityGain = results.newHireCapacityGainSdeYears || 0;
                console.log(`Stored newHireProductiveCapacityGain for team ${team.teamId}: ${team.attributes.newHireProductiveCapacityGain}`);

                // [PERSISTENCE FIX] Save changes to SystemRepository
                if (typeof SystemService !== 'undefined' && SystemService.save) {
                    SystemService.save();
                    // Optional: Suppress toast or show a specific "Forecast Saved" toast if desired.
                    // For now, relying on saveSystemChanges' internal logging/toast (if any, though main.js saveSystemChanges doesn't always toast on success, only error, unless called by UI button).
                    // Actually main.js saveSystemChanges returns boolean and logs. It doesn't show success toast.
                    notificationManager.showToast('Forecast capacity gain saved to system.', 'success');
                }

                // [SYNC FIX] Update global capacity metrics (pure data, no UI refresh needed)
                CapacityEngine.recalculate(SystemService.getCurrentSystem());
            }
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

        let team = null;
        if (this.currentTeamId && SystemService.getCurrentSystem() && SystemService.getCurrentSystem().teams) {
            team = SystemService.getCurrentSystem().teams.find(t => t.teamId === this.currentTeamId);
        }

        let teamDisplayName = 'Playground Scenario';
        let simpleTeamName = 'this scenario';
        let capacityContext = 'Standard 5-day week capacity (Playground Mode)';

        if (team) {
            const identity = team.teamIdentity;
            const name = team.teamName;
            simpleTeamName = name || identity || 'the team';

            if (identity && name) {
                teamDisplayName = `${identity}, ${name} `;
            } else {
                teamDisplayName = identity || name || 'the team';
            }
            capacityContext = `Capacity Configuration data for ${simpleTeamName} (including leave, holidays, overhead, etc.)`;
        }

        // 1. Headline
        const headline = document.createElement('h3');
        headline.style.marginTop = '0';
        headline.style.fontSize = '1.1rem';
        headline.style.fontWeight = '600';
        headline.style.color = 'var(--theme-text-primary)';
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
        explanation.style.color = 'var(--theme-text-primary)';

        const boldText = document.createElement('strong');
        boldText.textContent = "The 'Effective Engineers' shown reflect the ramped-up engineers adjusted for their actual productive time. ";
        explanation.appendChild(boldText);

        const normalText = document.createTextNode(`Based on the ${capacityContext}, the calculated average net available days per SDE per week is approximately ${netAvailableDays.toFixed(2)} (out of 5).`);
        explanation.appendChild(normalText);

        box.appendChild(explanation);

        // 4. Footer Note
        const footer = document.createElement('p');
        footer.style.marginTop = '16px';
        footer.style.fontStyle = 'italic';
        footer.style.fontSize = '0.9rem';
        footer.style.color = 'var(--theme-text-muted)';
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
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Ramped Up Engineers',
                        data: results.totalRampedUpEngineersArray,
                        borderColor: '#10b981', // Green
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Effective Engineers (Capacity)',
                        data: results.productiveEngineers,
                        borderColor: '#3b82f6', // Blue
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: true,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Cumulative Attrition',
                        data: results.cumulativeAttritionArray,
                        borderColor: '#f59e0b', // Orange
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Funded Target',
                        data: Array(52).fill(fundedSize),
                        borderColor: '#ef4444', // Red
                        borderWidth: 1,
                        pointRadius: 0,
                        borderDash: [5, 5], // Dashed to match original
                        fill: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: { display: true, text: '52-Week Resource Forecast' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Week' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Engineers' },
                        min: 0
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Cumulative Attrition' },
                        min: 0,
                        grid: {
                            drawOnChartArea: false // only want the grid lines for one axis to show up
                        }
                    }
                }
            }
        });
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        const teams = SystemService.getCurrentSystem()?.teams || [];

        return {
            viewTitle: 'Resource Forecasting',
            selectedTeamId: document.getElementById('sdmForecastingTeamSelector')?.value || null,
            teamCount: teams.length,
            hasEngine: !!this.engine,
            // Current input values if available
            inputs: {
                targetWeek: document.getElementById('targetWeekInput')?.value || null,
                hiringTime: document.getElementById('hiringTimeInput')?.value || null,
                rampUp: document.getElementById('rampUpInput')?.value || null,
                attrition: document.getElementById('attritionInput')?.value || null
            }
        };
    }
}
