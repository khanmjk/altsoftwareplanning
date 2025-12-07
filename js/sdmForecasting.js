/**
 * NEW Function: Renders the SDM Forecasting View into the Workspace
 */

// ========= SDM Module State =========
let totalRampedUpEngineersArray_SDM = [];
let productiveEngineers_SDM = [];
let cumulativeAttritionArray_SDM = [];
let monthlyData_SDM = {};
let totalHeadcountArray_SDM = [];
let forecastChart_SDM = null;

const weekToMonth_SDM = [
    1, 1, 1, 1,    // Jan (4 weeks) Weeks 1-4
    2, 2, 2, 2,    // Feb (4 weeks) Weeks 5-8
    3, 3, 3, 3, 3, // Mar (5 weeks) Weeks 9-13
    4, 4, 4, 4,    // Apr (4 weeks) Weeks 14-17
    5, 5, 5, 5,    // May (4 weeks) Weeks 18-21
    6, 6, 6, 6, 6, // Jun (5 weeks) Weeks 22-26
    7, 7, 7, 7,    // Jul (4 weeks) Weeks 27-30
    8, 8, 8, 8,    // Aug (4 weeks) Weeks 31-34
    9, 9, 9, 9, 9, // Sep (5 weeks) Weeks 35-39
    10, 10, 10, 10, // Oct (4 weeks) Weeks 40-43
    11, 11, 11, 11, // Nov (4 weeks) Weeks 44-47
    12, 12, 12, 12, 12 // Dec (5 weeks) Weeks 48-52
];
// ====================================

/**
 * NEW Function: Renders the SDM Forecasting View into the Workspace
 */
function renderSdmForecastingView(container) {
    console.log("Rendering SDM Resource Forecasting View...");

    if (!container) {
        container = document.getElementById('sdmForecastingView');
    }
    if (!container) {
        console.error("SDM Forecasting container #sdmForecastingView not found.");
        return;
    }

    // 1. Set Workspace Metadata (Header)
    if (workspaceComponent) {
        workspaceComponent.setPageMetadata({
            title: 'Resource Forecasting',
            breadcrumbs: ['Planning', 'Resource Forecasting'],
            actions: []
        });
    }

    // 2. Set Workspace Toolbar (Controls)
    const toolbarControls = generateSdmToolbar();
    if (workspaceComponent && toolbarControls) {
        workspaceComponent.setToolbar(toolbarControls);
    }

    // 3. Render Content
    generateForecastingUI_SDM();
}
window.renderSdmForecastingView = renderSdmForecastingView;

/**
 * Generates the toolbar controls for SDM Forecasting.
 * Includes Team Selector and Generate Button.
 */
function generateSdmToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'sdm-toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '16px';
    toolbar.style.width = '100%';

    // Team Selector
    const teamWrap = createLabeledControl('Select Team:', document.createElement('select'));
    const teamSelect = teamWrap.querySelector('select');
    teamSelect.id = 'sdmForecastTeamSelect';
    teamSelect.className = 'form-select form-select-sm';
    teamSelect.style.minWidth = '200px';
    teamSelect.appendChild(new Option('-- Select a Team --', ''));

    if (SystemService.getCurrentSystem() && SystemService.getCurrentSystem().teams) {
        SystemService.getCurrentSystem().teams.forEach(team => {
            const teamDisplayName = team.teamIdentity || team.teamName || team.teamId;
            teamSelect.appendChild(new Option(teamDisplayName, team.teamId));
        });
    }
    teamSelect.addEventListener('change', (event) => {
        loadSdmForecastInputsForTeam(event.target.value);
        clearSdmForecastOutputs();
    });
    toolbar.appendChild(teamWrap);

    // Spacer
    const spacer = document.createElement('div');
    spacer.style.flexGrow = '1';
    toolbar.appendChild(spacer);

    // Generate Button
    const generateBtn = document.createElement('button');
    generateBtn.type = 'button';
    generateBtn.className = 'btn btn-primary btn-sm';
    generateBtn.id = 'generateForecastBtn_SDM';
    generateBtn.textContent = 'Generate Forecast';
    // Listener attached in generateForecastingUI_SDM or we can attach here
    generateBtn.addEventListener('click', generateForecast_SDM);

    toolbar.appendChild(generateBtn);

    return toolbar;
}

/**
 * NEW Function (Phase 2b): Loads team data into forecast inputs.
 */
function loadSdmForecastInputsForTeam(teamId) {
    console.log(`Loading forecast inputs for team ID: ${teamId}`);
    const fundedSizeInput = document.getElementById('fundedSize_SDM');
    const currentEngInput = document.getElementById('currentEngineers_SDM');
    // Get references to other inputs to reset them
    const hiringTimeInput = document.getElementById('hiringTime_SDM');
    const rampUpTimeInput = document.getElementById('rampUpTime_SDM');
    const attritionRateInput = document.getElementById('attritionRate_SDM');
    const closeGapWeekInput = document.getElementById('closeGapWeek_SDM');


    if (!fundedSizeInput || !currentEngInput) {
        console.error("Could not find forecast input elements.");
        return;
    }

    if (!teamId) { // No team selected (e.g., "-- Select --")
        fundedSizeInput.value = '';
        currentEngInput.value = '';
        // Reset other manual inputs to defaults
        if (hiringTimeInput) hiringTimeInput.value = 12;
        if (rampUpTimeInput) rampUpTimeInput.value = 10;
        if (attritionRateInput) attritionRateInput.value = 10;
        if (closeGapWeekInput) closeGapWeekInput.value = 26;
        return;
    }

    const team = SystemService.getCurrentSystem()?.teams?.find(t => t.teamId === teamId);

    if (!team) {
        console.error(`Team data not found for ID: ${teamId}`);
        fundedSizeInput.value = 'Error';
        currentEngInput.value = 'Error';
        return;
    }

    // Populate read-only fields from team data
    fundedSizeInput.value = team.fundedHeadcount ?? 0;
    currentEngInput.value = team.engineers?.length ?? 0; // This is Team BIS

    // TODO (Future): Load saved forecastingParams for this team here
    // For now, reset manual inputs to defaults when team changes
    if (hiringTimeInput) hiringTimeInput.value = 12;
    if (rampUpTimeInput) rampUpTimeInput.value = 10;
    if (attritionRateInput) attritionRateInput.value = 10; // Reset attrition
    if (closeGapWeekInput) closeGapWeekInput.value = 26; // Reset target week


    console.log(`Inputs populated for team: ${team.teamIdentity || teamId}`);
}

/**
 * NEW Function: Clears the output areas of the SDM forecast view.
 */
function clearSdmForecastOutputs() {
    console.log("Clearing SDM forecast outputs.");
    const hiringInfoDiv = document.getElementById('hiringInfo_SDM');
    const outputSummaryDiv = document.getElementById('outputSummary_SDM');
    const forecastTable = document.getElementById('forecastTable_SDM');
    const monthlySummaryTable = document.getElementById('monthlySummaryTable_SDM');
    const canvas = document.getElementById('forecastChart_SDM');

    if (hiringInfoDiv) hiringInfoDiv.textContent = 'Select a team and click \'Generate Forecast\'.';
    if (outputSummaryDiv) outputSummaryDiv.innerHTML = '';
    if (forecastTable) forecastTable.innerHTML = '<thead><tr><th>Week</th><th>Effective Engineers</th></tr></thead><tbody><tr><td colspan="2">...</td></tr></tbody>';
    if (monthlySummaryTable) monthlySummaryTable.innerHTML = '<thead><tr><th>Month</th><th>Headcount Available</th><th>SDE-Weeks</th><th>SDE-Days</th></tr></thead><tbody><tr><td colspan="4">...</td></tr></tbody>';

    // Destroy existing chart
    if (forecastChart_SDM) {
        forecastChart_SDM.destroy();
        forecastChart_SDM = null;
    }
    // Clear canvas
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

/**
 * REVISED (Comprehensive FAQ Update): Generates the HTML structure for the forecasting tool.
 * - Includes extensively revised FAQ explaining current logic, assumptions, and future improvements.
 */
function generateForecastingUI_SDM() {
    console.log("Generating SDM Forecasting UI (Comprehensive FAQ Update)...");
    const container = document.getElementById('sdmForecastingView');
    if (!container) {
        console.error("SDM Forecasting container #sdmForecastingView not found.");
        return;
    }
    container.innerHTML = ''; // Clear previous content

    // Team Selection moved to Toolbar



    // --- Input Section ---
    // (Input section HTML - unchanged from previous version)
    const inputSection = document.createElement('div');
    inputSection.className = 'input-section';
    inputSection.innerHTML = `
        <h3>Input Parameters</h3>
        <p style="font-size:0.9em; color:#555;"><i>Select a team above. Funded Size & Current Engineers are read from system data. Changes to other parameters below will automatically update the forecast.</i></p>
        <div class="input-group">
            <label for="fundedSize_SDM">Funded Team Size:</label>
            <input id="fundedSize_SDM" type="number" value="" readonly />
            <div class="help-text">Total number of engineers the budget allows for (from Team data).</div>
        </div>
        <div class="input-group">
            <label for="currentEngineers_SDM">Current Available Engineers (Team BIS):</label>
            <input id="currentEngineers_SDM" type="number" value="" readonly />
            <div class="help-text">Number of engineers currently assigned to this team (from Team data).</div>
        </div>
        <hr style="margin: 15px 0;">
        <div class="input-group">
            <label for="hiringTime_SDM">Average Hiring Time (weeks):</label>
            <input id="hiringTime_SDM" type="number" value="12" />
            <div class="help-text">Est. time from initiating hiring to an engineer's start date.</div>
        </div>
        <div class="input-group">
            <label for="rampUpTime_SDM">Ramp-up Time (weeks):</label>
            <input id="rampUpTime_SDM" type="number" value="10" />
            <div class="help-text">Est. time for new hires to reach full productivity.</div>
        </div>
        <div class="input-group">
            <label for="attritionRate_SDM">Annual Attrition Rate (%):</label>
            <input id="attritionRate_SDM" type="number" value="10" />
            <div class="help-text">Estimated percentage of engineers expected to leave annually for this team.</div>
        </div>
        <div class="input-group">
            <label for="closeGapWeek_SDM">Target Week to Close Funding Gap:</label>
            <input id="closeGapWeek_SDM" type="number" value="26" />
            <div class="help-text">Target week (1-52) to reach the funded team size via hiring.</div>
        </div>
        <!-- Generate Button moved to Toolbar -->

    `;
    container.appendChild(inputSection);

    // --- Output Section ---
    // (Output section HTML - unchanged from previous version)
    const outputSection = document.createElement('div');
    outputSection.className = 'output-section';
    outputSection.innerHTML = `
        <h3>Monthly Resource Summary</h3>
        <div class="info" id="hiringInfo_SDM">Select a team to run forecast.</div>
        <canvas id="forecastChart_SDM" style="max-height: 450px; width: 100%;"></canvas>
        <table id="monthlySummaryTable_SDM"><thead><tr><th>Month</th><th>Headcount Available</th><th>SDE-Weeks</th><th>SDE-Days</th></tr></thead><tbody><tr><td colspan="4">...</td></tr></tbody></table>
        <div class="summary" id="outputSummary_SDM"></div>
        <h3>Weekly Resource Plan</h3>
        <table id="forecastTable_SDM"><thead><tr><th>Week</th><th>Effective Engineers</th></tr></thead><tbody><tr><td colspan="2">...</td></tr></tbody></table>
    `;
    container.appendChild(outputSection);

    // --- FAQ Section (UPDATED CONTENT) ---
    const faqSection = document.createElement('div');
    faqSection.className = 'faq-section';
    faqSection.innerHTML = `
        <h3>FAQ & Model Insights</h3>

        <div class="faq-item">
            <h4>1. How are 'Effective Engineers', 'SDE-Weeks', and 'SDE-Days' calculated now?</h4>
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
                        <li><em>(Note: Variable Leave like Maternity/Paternity and 'Total Team Days' activities configured in Capacity Constraints affect the *overall* team capacity but aren't factored into this *per-SDE* availability calculation directly).</em></li>
                    </ul>
                     (Check the browser console logs when generating the forecast for a detailed breakdown of this calculation for the selected team).
                </li>
                <li><strong>Effective Engineers (Blue Line):</strong> This is calculated weekly as: 'Total Ramped Up Engineers' &times; ('Net Available Days per Week per SDE' / 5). It represents the SDEs effectively available for project work that week.</li>
                <li><strong>SDE-Weeks (Monthly Table):</strong> The sum of the weekly 'Effective Engineers' values for all weeks falling within that calendar month.</li>
                <li><strong>SDE-Days (Monthly Table):</strong> The sum over the weeks in that month of (Weekly 'Effective Engineers' &times; 'Net Available Days per Week per SDE'). This gives a more precise measure of total productive days.</li>
            </ul>
            <p><em>Auditor's Note:</em> This integrated approach grounds the forecast in the more detailed capacity planning done elsewhere, providing better traceability than a subjective efficiency percentage. However, the accuracy still relies on the quality of inputs in *both* the forecasting tool *and* the Capacity Constraints configuration.</p>
        </div>

        <div class="faq-item">
            <h4>2. Why is 'Effective Engineers' (Blue) lower than 'Total Ramped Up Engineers' (Green Dashed)?</h4>
            <p>The Green dashed line shows the number of engineers who have completed their ramp-up period. The Blue line shows how much *productive project capacity* those ramped-up engineers represent.</p>
            <p>The Blue line will be lower than the Green line whenever the calculated 'Net Available Days per Week per SDE' is less than 5. This difference represents the proportion of a ramped-up engineer's time consumed by configured non-project factors like leave, holidays, recurring overhead, org events, and per-SDE team activities (as defined in 'Tune Capacity Constraints').</p>
            <p>If the lines overlap, it means the net available days calculated to 5.00, indicating minimal or no capacity sinks were configured for that team.</p>
        </div>

         <div class="faq-item">
            <h4>3. How is the 'Est. Hires Required' calculated?</h4>
            <p>The text "Est. Hires Required: X by Week Y (~Z/week)" aims to provide a practical hiring target.</p>
             <ul>
                <li>The underlying model first calculates the *minimum constant weekly hiring rate* (Z) needed to make the 'Total Headcount' reach the 'Funded Team Size' precisely by the 'Target Week to Close Funding Gap', accounting for the specified 'Average Hiring Time' and 'Annual Attrition Rate'. This rate is often fractional.</li>
                <li>To provide a more actionable number, the tool then estimates the total number of *whole* hires (X) needed. This includes the initial gap ('Funded Size' - 'Current Available Engineers') plus an estimate of the cumulative attrition expected to occur between the start and the target week.</li>
             </ul>
            <p><em>Manager Tip:</em> Use the 'Est. Hires Required' as your primary target. The average weekly rate gives context on the required velocity. Plan hiring activities realistically – you hire whole people, often in batches, not fractions per week.</p>
        </div>

         <div class="faq-item">
            <h4>4. How does Attrition work in this model? What are its limitations?</h4>
            <p>The model applies attrition based on the 'Annual Attrition Rate (%)' input.</p>
             <ul>
                <li>The annual percentage is converted into a weekly rate.</li>
                <li>Each week, this rate is applied to the *current total headcount* (including engineers still ramping up).</li>
                <li>Fractional attrition accumulates, and whole engineers are removed from the headcount (deducted from ramped-up engineers first, then ramping engineers) when the fraction crosses an integer.</li>
             </ul>
             <p><strong>Limitations (Critical View):</strong></p>
             <ul>
                <li><strong>Linear/Constant Rate:</strong> Assumes attrition occurs evenly throughout the year. Reality is often uneven (e.g., lower initially for new hires, peaks after bonus cycles, market shifts).</li>
                <li><strong>Applied to All:</strong> Applies the same rate to everyone currently on the team, regardless of tenure or ramp-up status.</li>
             </ul>
             <p><em>Manager Tip:</em> Use an annual rate that reflects your best *overall* estimate for the team's expected turnover during the forecast period. Be aware of the model's simplification.</p>
        </div>

        <div class="faq-item">
            <h4>5. How does Ramp-up Time work? What are its limitations?</h4>
             <p>New hires enter the simulation after the 'Average Hiring Time'. They immediately count towards 'Total Headcount' (Purple line).</p>
             <ul>
                <li>They remain in a 'ramping' state for the number of weeks specified in 'Ramp-up Time'.</li>
                <li>Only *after* completing this period do they contribute to 'Total Ramped Up Engineers' (Green dashed line) and subsequently to 'Effective Engineers' (Blue line).</li>
             </ul>
            <p><strong>Limitations (Critical View):</strong></p>
             <ul>
                <li><strong>Binary State:</strong> Assumes 0% productivity during ramp-up, then instantly 100% productivity afterwards. Real ramp-up is usually a gradual curve.</li>
                <li><strong>Uniform Time:</strong> Assumes the same ramp-up time for all hires, regardless of level or role complexity.</li>
             </ul>
             <p><em>Manager Tip:</em> Set 'Ramp-up Time' to the average duration until a new hire consistently delivers close to their expected full capacity. Factor in onboarding quality, role complexity, and expected experience level of hires.</p>
        </div>

        <div class="faq-item">
            <h4>6. How should I choose the manual input values (Hiring, Ramp-up, Attrition, Target Week)?</h4>
            <ul>
                <li><strong>Hiring Time:</strong> Use historical data (job req approval to start date) if possible. Include sourcing, interviews, offer, notice periods. Be realistic about current market conditions.</li>
                <li><strong>Ramp-up Time:</strong> Estimate based on role complexity, required domain knowledge, onboarding effectiveness, and typical new hire experience.</li>
                <li><strong>Attrition Rate (%):</strong> Base on historical team/org data, adjusted for current morale, compensation competitiveness, and market trends. If unsure, it might be safer to slightly overestimate attrition.</li>
                <li><strong>Target Week:</strong> Set an ambitious but *achievable* target. Consider your recruitment team's capacity and the calculated hiring rate. An impossible target week (e.g., less than hiring time) will generate an error.</li>
            </ul>
            <p><em>Important:</em> These parameters are specific to *this forecast run* and are **not** currently saved per team in the application data model. You need to re-enter them each time you run a forecast.</p>
        </div>

        <div class="faq-item">
             <h4>7. What are the key assumptions and limitations of this forecasting model?</h4>
             <p>Like any model, this one makes simplifying assumptions. Understanding them is crucial for interpreting the results:</p>
             <ul>
                 <li><strong>Linear Attrition:</strong> Assumes a constant rate spread evenly over the year (see Q4).</li>
                 <li><strong>Binary Ramp-Up:</strong> Assumes hires are non-productive then fully productive (see Q5).</li>
                 <li><strong>Constant Hiring Rate (for calculation):</strong> Calculates the *required* rate as a constant average; actual hiring may vary.</li>
                 <li><strong>Simplified Hiring Pipeline:</strong> Assumes hires start exactly after 'Hiring Time'; doesn't model candidate drop-off or variable time-to-fill.</li>
                 <li><strong>Capacity Based on Snapshot:</strong> Uses the current 'Tune Capacity Constraints' data; doesn't forecast *changes* to leave policies, overhead levels, etc., during the year.</li>
                 <li><strong>Deterministic Model:</strong> Doesn't incorporate probability or risk ranges (e.g., best/worst case for hiring or attrition).</li>
                 <li><strong>No Cost Modeling:</strong> Focuses purely on headcount/SDE capacity, not budget implications.</li>
                 <li><strong>Fixed Horizon:</strong> Currently limited to a 52-week forecast.</li>
             </ul>
             <p><em>Auditor's Note:</em> While useful for visualizing potential trajectories based on inputs, the outputs are sensitive to these assumptions. Use the forecast for planning discussions and scenario analysis ("what-if") rather than as a precise prediction.</p>
        </div>

        <div class="faq-item">
             <h4>8. What are potential future improvements for this forecasting model?</h4>
             <p>Based on the current model's limitations and standard industry practices, potential future enhancements could include:</p>
             <ul>
                 <li><strong>Dynamic Inputs:</strong> Modeling non-linear attrition (e.g., seasonal), variable hiring rates (e.g., freezes/bursts), and gradual productivity ramp-up curves.</li>
                 <li><strong>Persistence:</strong> Saving forecast input parameters per team.</li>
                 <li><strong>Scenario Comparison:</strong> Ability to save and compare different forecast scenarios (e.g., optimistic vs. pessimistic attrition).</li>
                 <li><strong>Risk Modeling:</strong> Incorporating uncertainty using ranges or Monte Carlo simulations.</li>
                 <li><strong>Cost Integration:</strong> Adding salary bands or cost estimates to model budget impact.</li>
                 <li><strong>More Granularity:</strong> Allowing different parameters based on engineer level or role.</li>
                 <li><strong>Historical Data Integration:</strong> Using past hiring/attrition data to calibrate the model.</li>
                 <li><strong>Extended Time Horizon:</strong> Allowing forecasts beyond one year.</li>
                 <li><strong>Enhanced Visualizations:</strong> Offering different chart types for analysis.</li>
                 <li><strong>Project Linking:</strong> Connecting forecasted capacity to planned project demands (a major integration).</li>
             </ul>
        </div>
    `;
    container.appendChild(faqSection);

    // Attach event listeners
    const manualInputs = [
        'hiringTime_SDM', 'rampUpTime_SDM', 'attritionRate_SDM', 'closeGapWeek_SDM'
    ];
    manualInputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.removeEventListener('change', generateForecast_SDM);
            inputElement.addEventListener('change', generateForecast_SDM);
        } else { console.warn(`Could not find input element ${inputId} to attach listener.`); }
    });
    const generateBtn = document.getElementById('generateForecastBtn_SDM');
    if (generateBtn) {
        generateBtn.removeEventListener('click', generateForecast_SDM);
        generateBtn.addEventListener('click', generateForecast_SDM);
    } else { console.error("Could not find Generate Forecast button to attach listener."); }

    console.log("SDM Forecasting UI generated with updated FAQ.");
}

/**
 * RENAMED & ADAPTED from standalone tool.
 * Phase 2c/Debug:
 * - Removed reading of deleted inputs.
 * - Passes selectedTeamId to simulation.
 * - Changed Hiring Rate display text.
 */
function generateForecast_SDM() {
    console.log("Generating SDM Forecast (Phase 2c/Debug)...");

    // --- Get Selected Team ---
    const teamSelect = document.getElementById('sdmForecastTeamSelect');
    const selectedTeamId = teamSelect?.value;
    if (!selectedTeamId) {
        notificationManager.showToast("Please select a team to forecast.", "warning");
        clearSdmForecastOutputs();
        return;
    }
    console.log(`Forecasting for team: ${selectedTeamId}`);
    // --- End Get Selected Team ---

    // --- Retrieve input values ---
    const fundedSizeInput = document.getElementById('fundedSize_SDM');
    const currentEngineersInput = document.getElementById('currentEngineers_SDM');
    const hiringTimeInput = document.getElementById('hiringTime_SDM');
    const rampUpTimeInput = document.getElementById('rampUpTime_SDM');
    const attritionRateInput = document.getElementById('attritionRate_SDM');
    const closeGapWeekInput = document.getElementById('closeGapWeek_SDM');

    const fundedSize = parseInt(fundedSizeInput?.value || '0');
    const currentEngineers = parseInt(currentEngineersInput?.value || '0'); // Team BIS
    const hiringTime = parseInt(hiringTimeInput?.value || '12');
    const rampUpTime = parseInt(rampUpTimeInput?.value || '10');
    const attritionRate = parseFloat(attritionRateInput?.value || '10') / 100;
    const closeGapWeek = parseInt(closeGapWeekInput?.value || '26');

    const hiringInfoDiv = document.getElementById('hiringInfo_SDM');
    const outputSummaryDiv = document.getElementById('outputSummary_SDM');
    const forecastTable = document.getElementById('forecastTable_SDM');
    const monthlySummaryTable = document.getElementById('monthlySummaryTable_SDM');

    // --- Validate required inputs ---
    if (isNaN(fundedSize) || isNaN(currentEngineers) || isNaN(hiringTime) || isNaN(rampUpTime) || isNaN(attritionRate) || isNaN(closeGapWeek)) {
        notificationManager.showToast("Please ensure all forecast parameters (Hiring Time, Ramp-up, Attrition, Target Week) have valid numeric values.", "error");
        clearSdmForecastOutputs();
        return;
    }
    if (!SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || SystemService.getCurrentSystem().capacityConfiguration.workingDaysPerYear <= 0) {
        notificationManager.showToast("Cannot run forecast: 'Standard Working Days Per Year' must be configured in Capacity Constraints and be greater than 0.", "error");
        clearSdmForecastOutputs();
        return;
    }
    if (!SystemService.getCurrentSystem()?.capacityConfiguration?.leaveTypes) {
        console.warn("Leave types not defined in capacity configuration. Proceeding with defaults (0).");
    }

    // Feasibility Check
    if (closeGapWeek < hiringTime) {
        if (hiringInfoDiv) {
            while (hiringInfoDiv.firstChild) hiringInfoDiv.removeChild(hiringInfoDiv.firstChild);
            const errorSpan = document.createElement('span');
            errorSpan.className = 'sdm-error-text';
            errorSpan.textContent = `Target week (${closeGapWeek}) is earlier than hiring time (${hiringTime} weeks). Cannot reach target.`;
            hiringInfoDiv.appendChild(errorSpan);
        }
        if (outputSummaryDiv) {
            while (outputSummaryDiv.firstChild) outputSummaryDiv.removeChild(outputSummaryDiv.firstChild);
            const adjustText = document.createElement('p');
            adjustText.textContent = 'Adjust Hiring Time or Target Week.';
            outputSummaryDiv.appendChild(adjustText);
        }
        if (forecastTable) { while (forecastTable.firstChild) forecastTable.removeChild(forecastTable.firstChild); }
        if (monthlySummaryTable) { while (monthlySummaryTable.firstChild) monthlySummaryTable.removeChild(monthlySummaryTable.firstChild); }
        if (forecastChart_SDM) { forecastChart_SDM.destroy(); forecastChart_SDM = null; }
        return;
    } else {
        if (outputSummaryDiv) { while (outputSummaryDiv.firstChild) outputSummaryDiv.removeChild(outputSummaryDiv.firstChild); }
    }

    // Calculate required hiring rate
    const hiringRate = computeHiringRate_SDM(fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, closeGapWeek);

    // *** Calculate Estimated Total Hires Needed ***
    // Simple gap fill + estimated attrition replacement by target week
    let estimatedAttritionByTarget = 0;
    // Run a quick simulation JUST for attrition calculation up to target week
    // (This is an approximation, a more precise way would integrate into computeHiringRate)
    let tempHeadcount = currentEngineers;
    let tempAttritionCounter = 0;
    const tempWeeklyAttrition = attritionRate / 52;
    for (let wk = 1; wk < closeGapWeek; wk++) {
        tempAttritionCounter += tempHeadcount * tempWeeklyAttrition;
        let attrThisWk = Math.floor(tempAttritionCounter);
        tempAttritionCounter -= attrThisWk;
        tempHeadcount -= attrThisWk;
        estimatedAttritionByTarget += attrThisWk;
        tempHeadcount += hiringRate; // Approximate impact of hiring on base for next week's attrition
        tempHeadcount = Math.min(tempHeadcount, fundedSize); // Cap
    }
    const hiresNeeded = Math.max(0, fundedSize - currentEngineers) + estimatedAttritionByTarget;
    // *** -------------------------------------- ***


    // --- Update Hiring Info Display ---
    if (hiringInfoDiv) {
        while (hiringInfoDiv.firstChild) hiringInfoDiv.removeChild(hiringInfoDiv.firstChild);

        hiringInfoDiv.appendChild(document.createTextNode('Est. Hires Required: '));

        const hiresNumberSpan = document.createElement('strong');
        hiresNumberSpan.className = 'sdm-highlight-text';
        hiresNumberSpan.textContent = Math.ceil(hiresNeeded);
        hiringInfoDiv.appendChild(hiresNumberSpan);

        hiringInfoDiv.appendChild(document.createTextNode(` by Week ${closeGapWeek} to reach funded size (Avg. rate: ~${hiringRate.toFixed(2)}/week).`));

        hiringInfoDiv.title = `Calculated minimum constant weekly hiring rate needed: ${hiringRate.toFixed(4)}. Total hires includes gap filling (${Math.max(0, fundedSize - currentEngineers)}) and replacing estimated attrition (${estimatedAttritionByTarget.toFixed(1)}) occurring before week ${closeGapWeek}.`;
    }
    // --- -------------------------- ---


    // Initialize weeks array
    let weeks = [...Array(52).keys()].map(i => i + 1);

    // Simulate team size over time
    const simulationResult = simulateTeamSize_SDM(
        hiringRate, fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate,
        selectedTeamId
    );

    if (!simulationResult) {
        notificationManager.showToast("An error occurred during the forecast simulation. Please check the console.", "error");
        clearSdmForecastOutputs();
        if (hiringInfoDiv) hiringInfoDiv.textContent = "Simulation Error.";
        return;
    }

    // Update global variables
    productiveEngineers_SDM = simulationResult.productiveEngineers;
    totalRampedUpEngineersArray_SDM = simulationResult.totalRampedUpEngineersArray;
    cumulativeAttritionArray_SDM = simulationResult.cumulativeAttritionArray;
    monthlyData_SDM = simulationResult.monthlyData;
    totalHeadcountArray_SDM = simulationResult.totalHeadcountArray;

    // Generate tables and charts
    generateWeeklyTable_SDM(weeks, productiveEngineers_SDM);
    generateMonthlySummary_SDM(monthlyData_SDM);
    generateChart_SDM(weeks, simulationResult, fundedSize);

    // Generate output summary
    generateOutputSummary_SDM(hiringRate, closeGapWeek, selectedTeamId, simulationResult);
}

/**
 * RENAMED & ADAPTED from standalone tool.
 * Phase 2c: Calls simulateTeamSize_SDM with null teamId, as only headcount matters here.
 */
function computeHiringRate_SDM(fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, closeGapWeek) {
    console.log("Computing SDM hiring rate...");
    let lowerBound = 0;
    let upperBound = 20; // Max plausible rate
    let tolerance = 0.01;
    let hiringRate = 0;
    let iterations = 0;

    while ((upperBound - lowerBound) > tolerance && iterations < 1000) {
        hiringRate = (upperBound + lowerBound) / 2;

        // Call the simulation function WITHOUT a teamId (or null)
        // It will use default capacity assumptions (e.g., 5 days/week) internally
        const simulationResult = simulateTeamSize_SDM(
            hiringRate, fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate,
            null // Pass null for selectedTeamId
        );

        // *** Check if simulationResult is valid before accessing properties ***
        if (!simulationResult || !simulationResult.totalHeadcountArray) {
            console.error("Error: Simulation failed during hiring rate computation. Cannot proceed.");
            // Handle error appropriately - maybe return a default rate or throw an error?
            // Returning 0 might be safest for now, but indicates a problem.
            return 0;
        }
        // *** End Check ***

        const totalHeadcountAtTargetWeek = simulationResult.totalHeadcountArray[closeGapWeek - 1];

        if (totalHeadcountAtTargetWeek === undefined) {
            console.error(`Error: Headcount for target week ${closeGapWeek} is undefined in simulation results during rate computation.`);
            return 0; // Indicate error
        }

        if (totalHeadcountAtTargetWeek >= fundedSize) {
            upperBound = hiringRate;
        } else {
            lowerBound = hiringRate;
        }
        iterations++;
    }
    if (iterations >= 1000) {
        console.warn("computeHiringRate_SDM reached max iterations.");
    }
    // Return the upper bound as it's the lowest rate that achieves the target
    console.log(`Computed hiring rate: ${upperBound.toFixed(2)} after ${iterations} iterations.`);
    return upperBound; // Return upperBound for potentially closer result
}

/**
 * RENAMED & ADAPTED from standalone tool.
 * Phase 2c: Implements Option B for Capacity/Efficiency.
 * - selectedTeamId is now optional.
 * - Calculates netAvailableDaysPerWeekPerSDE based on Capacity Config data IF teamId is provided.
 * - Uses netAvailableDaysPerWeekPerSDE to calculate effectiveEngineers.
 * - Uses default capacity assumptions if teamId is null (for computeHiringRate call).
 * - ADDED detailed logging for capacity calculation components.
 */
function simulateTeamSize_SDM(
    hiringRate, fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate,
    selectedTeamId = null, // Optional parameter
    capAtFundedSize = true
) {
    console.log(`Simulating SDM team size... Team ID: ${selectedTeamId || 'None (Rate Calc)'}`);

    let netAvailableDaysPerWeekPerSDE = 5.0; // Default assumption (5 working days)
    let teamNameForLog = "Rate Calculation";

    // --- If a specific team is provided, calculate its detailed capacity ---
    if (selectedTeamId) {
        const team = SystemService.getCurrentSystem()?.teams?.find(t => t.teamId === selectedTeamId);
        const capacityConfig = SystemService.getCurrentSystem()?.capacityConfiguration;

        if (!team) {
            console.error(`Simulation error: Team not found for ID: ${selectedTeamId}`);
            return null;
        }
        teamNameForLog = team.teamIdentity || team.teamName || teamId;

        if (!capacityConfig || !capacityConfig.workingDaysPerYear || capacityConfig.workingDaysPerYear <= 0) {
            console.error("Simulation error: Invalid 'workingDaysPerYear' in capacity configuration.");
            notificationManager.showToast("Error: 'Standard Working Days Per Year' must be configured in Capacity Constraints and be greater than 0.", "error");
            return null;
        }

        // --- Calculate Net Available Days per Week per SDE using CapacityService ---
        const workingDaysPerYear = capacityConfig.workingDaysPerYear;
        const globalLeaveTypes = capacityConfig.leaveTypes || [];

        // Calculate capacity deductions using service
        const stdLeave_days_per_sde = CapacityService.calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
        const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
        const orgEvents_days_per_sde = CapacityService.calculateOrgEventDaysPerSDE(capacityConfig);
        const overhead_days_per_sde = CapacityService.calculateOverheadDaysPerSDE(team, workingDaysPerYear);
        const teamActivityImpacts = CapacityService.calculateTeamActivityImpacts(team);
        const teamActivity_days_per_sde = teamActivityImpacts.daysPerSDE; // Only use the perSDE part

        console.log(`  Capacity Calculation Details for Team: ${teamNameForLog}`);
        console.log(`    - Working Days/Year: ${workingDaysPerYear}`);
        console.log(`    - Std Leave Days/SDE/Yr: ${stdLeave_days_per_sde.toFixed(2)}`);
        console.log(`    - Public Holiday Days/SDE/Yr: ${holidays_days_per_sde.toFixed(2)}`);
        console.log(`    - Org Event Days/SDE/Yr: ${orgEvents_days_per_sde.toFixed(2)}`);
        console.log(`    - Overhead Days/SDE/Yr: ${overhead_days_per_sde.toFixed(2)}`);
        console.log(`    - Team Activity Days/SDE/Yr: ${teamActivity_days_per_sde.toFixed(2)}`);
        // *** -------------------------------------- ***

        const totalPerSdeDeductionDays = stdLeave_days_per_sde + holidays_days_per_sde + orgEvents_days_per_sde + overhead_days_per_sde + teamActivity_days_per_sde;
        const netProjectDaysPerSdePerYear = Math.max(0, workingDaysPerYear - totalPerSdeDeductionDays);
        netAvailableDaysPerWeekPerSDE = (netProjectDaysPerSdePerYear / workingDaysPerYear) * 5;

        // Log overall calculation results
        console.log(`    = Total Per-SDE Deduction Days/Year: ${totalPerSdeDeductionDays.toFixed(1)}`);
        console.log(`    = Net Project Days/SDE/Year: ${netProjectDaysPerSdePerYear.toFixed(1)}`);
        console.log(`    = Net Available Days/Week/SDE: ${netAvailableDaysPerWeekPerSDE.toFixed(2)}`);
        // --- End Net Available Days Calculation ---
    } else {
        console.log("  Running simulation for rate calculation (using default 5 available days/week).");
    }


    // --- Simulation Initialization ---
    let productiveEngineersLocal = [];
    let totalRampedUpEngineersArrayLocal = [];
    let cumulativeAttritionArrayLocal = [];
    let totalHeadcountArrayLocal = [];
    let monthlyDataLocal = { headcount: [], sdeWeeks: [], sdeDays: [] };

    let weeks = 52;
    let totalRampedUpEngineers = currentEngineers;
    let totalHeadcount = currentEngineers; // Start with Team BIS
    let hiringPipeline = [];
    let rampingEngineers = [];
    let cumulativeAttrition = 0;
    let attritionCounter = 0;
    const weeklyAttritionRate = attritionRate / 52;
    // --- End Initialization ---

    // --- Weekly Simulation Loop ---
    for (let week = 1; week <= weeks; week++) {
        // Attrition (based on total headcount)
        attritionCounter += totalHeadcount * weeklyAttritionRate;
        let attritionThisWeek = Math.floor(attritionCounter);
        attritionCounter -= attritionThisWeek;

        if (attritionThisWeek > 0) {
            totalHeadcount -= attritionThisWeek;
            let preAttritionHC = totalHeadcount + attritionThisWeek;
            let rampedProportion = (preAttritionHC > 0) ? totalRampedUpEngineers / preAttritionHC : 0;
            let attritionFromRamped = Math.round(attritionThisWeek * rampedProportion);
            let attritionFromRamping = attritionThisWeek - attritionFromRamped;

            totalRampedUpEngineers -= attritionFromRamped;

            let removedFromRamping = 0;
            for (let i = rampingEngineers.length - 1; i >= 0 && removedFromRamping < attritionFromRamping; i--) {
                let removable = Math.min(rampingEngineers[i].count, attritionFromRamping - removedFromRamping);
                rampingEngineers[i].count -= removable;
                removedFromRamping += removable;
                if (rampingEngineers[i].count <= 0) {
                    rampingEngineers.splice(i, 1);
                }
            }
            cumulativeAttrition += attritionThisWeek;
        }

        totalRampedUpEngineers = Math.max(0, totalRampedUpEngineers);
        totalHeadcount = Math.max(0, totalHeadcount);

        // Hiring (target fundedSize)
        let totalFutureHeadcount = totalHeadcount + hiringPipeline.reduce((sum, h) => sum + h.count, 0);
        if (totalFutureHeadcount < fundedSize) {
            let hiringNeeded = fundedSize - totalFutureHeadcount;
            let actualHiring = Math.min(hiringRate, hiringNeeded);
            if (actualHiring > 0) {
                hiringPipeline.push({ weeksLeft: hiringTime, count: actualHiring });
            }
        }

        // Advance hiring pipeline -> Ramping
        for (let i = hiringPipeline.length - 1; i >= 0; i--) {
            hiringPipeline[i].weeksLeft--;
            if (hiringPipeline[i].weeksLeft <= 0) {
                totalHeadcount += hiringPipeline[i].count;
                rampingEngineers.push({ weeksLeft: rampUpTime, count: hiringPipeline[i].count });
                hiringPipeline.splice(i, 1);
            }
        }

        // Advance ramp-up pipeline -> Ramped Up
        for (let i = rampingEngineers.length - 1; i >= 0; i--) {
            rampingEngineers[i].weeksLeft--;
            if (rampingEngineers[i].weeksLeft <= 0) {
                totalRampedUpEngineers += rampingEngineers[i].count;
                rampingEngineers.splice(i, 1);
            }
        }

        // Cap total headcount at funded size if required
        if (capAtFundedSize) {
            let overflow = totalHeadcount - fundedSize;
            if (overflow > 0) {
                totalHeadcount = fundedSize;
                totalRampedUpEngineers = Math.min(totalRampedUpEngineers, totalHeadcount);
            }
        }

        // Calculate effective engineers using NET available days
        const weeklyAvailabilityMultiplier = netAvailableDaysPerWeekPerSDE / 5;
        const effectiveEngineers = totalRampedUpEngineers * weeklyAvailabilityMultiplier;

        // Store weekly results
        productiveEngineersLocal.push(effectiveEngineers);
        totalRampedUpEngineersArrayLocal.push(totalRampedUpEngineers);
        totalHeadcountArrayLocal.push(totalHeadcount);
        cumulativeAttritionArrayLocal.push(cumulativeAttrition);

        // Aggregate monthly data
        const weekArrayIndex = week - 1;
        if (weekArrayIndex >= 0 && weekArrayIndex < weekToMonth_SDM.length) {
            const monthNumber = weekToMonth_SDM[weekArrayIndex];
            if (typeof monthNumber === 'number' && monthNumber >= 1 && monthNumber <= 12) {
                let monthIndex = monthNumber - 1;
                if (monthlyDataLocal.headcount[monthIndex] === undefined) {
                    monthlyDataLocal.headcount[monthIndex] = 0;
                    monthlyDataLocal.sdeWeeks[monthIndex] = 0;
                    monthlyDataLocal.sdeDays[monthIndex] = 0;
                }
                monthlyDataLocal.headcount[monthIndex] = totalHeadcount;
                monthlyDataLocal.sdeWeeks[monthIndex] += effectiveEngineers;
                monthlyDataLocal.sdeDays[monthIndex] += effectiveEngineers * netAvailableDaysPerWeekPerSDE;
            } else {
                console.warn(`Invalid month number ${monthNumber} derived for week ${week}`);
            }
        } else {
            console.warn(`Invalid week array index ${weekArrayIndex} calculated for week ${week}`);
        }

    } // End weekly loop

    // Final formatting for monthly data
    for (let i = 0; i < 12; i++) {
        monthlyDataLocal.headcount[i] = Math.round(monthlyDataLocal.headcount[i] || 0);
        monthlyDataLocal.sdeDays[i] = parseFloat((monthlyDataLocal.sdeDays[i] || 0).toFixed(2));
        monthlyDataLocal.sdeWeeks[i] = parseFloat((monthlyDataLocal.sdeWeeks[i] || 0).toFixed(2));
    }

    console.log("SDM Simulation complete.");
    return {
        productiveEngineers: productiveEngineersLocal,
        totalRampedUpEngineersArray: totalRampedUpEngineersArrayLocal,
        totalHeadcountArray: totalHeadcountArrayLocal,
        cumulativeAttritionArray: cumulativeAttritionArrayLocal,
        monthlyData: monthlyDataLocal,
        calculatedNetAvailableDaysPerWeek: netAvailableDaysPerWeekPerSDE
    };
}

/**
 * RENAMED & ADAPTED from standalone tool.
 */
function generateWeeklyTable_SDM(weeks, productiveEngineers) {
    const table = document.getElementById('forecastTable_SDM');
    if (!table) { console.error("Weekly forecast table #forecastTable_SDM not found."); return; }
    let tableHTML = '<thead><tr><th>Week</th><th>Effective Engineers</th></tr></thead><tbody>'; // Added thead/tbody
    for (let i = 0; i < weeks.length; i++) {
        tableHTML += `<tr><td>${weeks[i]}</td><td>${(productiveEngineers[i] || 0).toFixed(2)}</td></tr>`;
    }
    tableHTML += '</tbody>';
    table.innerHTML = tableHTML;
}

/**
 * RENAMED & ADAPTED from standalone tool. Attaches listeners dynamically.
 */
function generateMonthlySummary_SDM(monthlyData) {
    const table = document.getElementById('monthlySummaryTable_SDM');
    if (!table) { console.error("Monthly summary table #monthlySummaryTable_SDM not found."); return; }
    let monthlyTableHTML = '<thead><tr><th>Month</th><th>Headcount Available</th><th>SDE-Weeks</th><th>SDE-Days</th></tr></thead><tbody>';
    for (let i = 0; i < 12; i++) {
        monthlyTableHTML += `<tr>
            <td>${i + 1}</td>
            <td contenteditable="true" class="editable sdm-editable-cell" data-month-index="${i}">${Math.round(monthlyData.headcount[i] || 0)}</td>
            <td>${(monthlyData.sdeWeeks[i] || 0).toFixed(2)}</td>
            <td>${(monthlyData.sdeDays[i] || 0).toFixed(2)}</td>
        </tr>`;
    }
    monthlyTableHTML += '</tbody>';
    table.innerHTML = monthlyTableHTML;

    // Add event listeners AFTER generating the table
    const editableCells = table.querySelectorAll('td.sdm-editable-cell');
    editableCells.forEach(cell => {
        // Remove existing listener first to prevent duplicates if called multiple times
        cell.removeEventListener('input', handleMonthlyHeadcountInput_SDM);
        // Add the new listener
        cell.addEventListener('input', handleMonthlyHeadcountInput_SDM);
    });
}

// NEW Listener function specific to SDM tool's editable cells
function handleMonthlyHeadcountInput_SDM(event) {
    const cell = event.target;
    const monthIndex = parseInt(cell.getAttribute('data-month-index'));
    const newValue = parseInt(cell.textContent);
    if (!isNaN(newValue) && monthIndex >= 0) {
        // Call the specific update function for this tool
        updateMonthlyHeadcount_SDM(monthIndex, newValue);
    } else {
        // Optional: Add validation feedback or revert
        console.warn("Invalid input for monthly headcount:", cell.textContent);
        // Revert? Might be complex. For now, just don't update.
    }
}

/**
 * RENAMED & ADAPTED from standalone tool.
 * Phase 2c: Updated summary text to reflect integrated capacity calculation (Option B).
 */
function generateOutputSummary_SDM(hiringRate, closeGapWeek, selectedTeamId, simulationResult) { // Added teamId & simResult
    const summaryDiv = document.getElementById('outputSummary_SDM');
    if (!summaryDiv) { console.error("Output summary div #outputSummary_SDM not found."); return; }

    const team = SystemService.getCurrentSystem()?.teams?.find(t => t.teamId === selectedTeamId);
    const teamName = team ? (team.teamIdentity || team.teamName) : 'the selected team';

    // Get current input values using NEW IDs
    const hiringTime = document.getElementById('hiringTime_SDM')?.value || 'N/A';
    const rampUpTime = document.getElementById('rampUpTime_SDM')?.value || 'N/A';
    const attritionRate = document.getElementById('attritionRate_SDM')?.value || 'N/A';

    // Get the calculated net available days from the simulation result
    const netAvailableDays = simulationResult?.calculatedNetAvailableDaysPerWeek?.toFixed(2) || 'N/A';
    let netDaysInfo = "";
    if (netAvailableDays !== 'N/A') {
        netDaysInfo = `Based on the Capacity Configuration data for <strong>${teamName}</strong> (including leave, holidays, overhead, etc.), the calculated average net available days per SDE per week is approx. <strong>${netAvailableDays}</strong> (out of 5).`;
    } else {
        netDaysInfo = "Could not retrieve detailed capacity configuration; using default assumptions.";
    }

    const summary = `
        <p>For team <strong>${teamName}</strong>, to reach the funded team size by week ${closeGapWeek}, the required hiring rate is approx. <strong>${hiringRate.toFixed(2)}</strong> engineers per week.</p>
        <p>This forecast considers:</p>
        <ul>
            <li>Avg. Hiring Time: ${hiringTime} weeks</li>
            <li>Avg. Ramp-up Time: ${rampUpTime} weeks</li>
            <li>Annual Attrition Rate: ${attritionRate}%</li>
        </ul>
        <p>The 'Effective Engineers' shown reflect the ramped-up engineers adjusted for their actual productive time. ${netDaysInfo}</p>
        <p><i>Note: Manual forecast parameters (hiring time, ramp-up, attrition) are not currently saved per team.</i></p>
        `;
    summaryDiv.innerHTML = summary;
}

/**
 * RENAMED & ADAPTED from standalone tool.
 */
function updateMonthlyHeadcount_SDM(monthIndex, newHeadcount) {
    console.log(`Manual update for Month ${monthIndex + 1} to Headcount: ${newHeadcount}`);
    // Update totalHeadcountArray_SDM and recalculate derived arrays
    const fundedSize = parseInt(document.getElementById('fundedSize_SDM').value);
    const efficiencyFactor = parseFloat(document.getElementById('efficiencyFactor_SDM').value) / 100;
    const leaveDays = parseInt(document.getElementById('leaveDays_SDM').value);
    const publicHolidays = parseInt(document.getElementById('publicHolidays_SDM').value);

    // --- Phase 1: Simple update, assumes manually edited headcount are all ramped ---
    // TODO (Phase 2): Revisit this logic. Manual edits might conflict with simulation.
    //                  Perhaps disable manual edits or make simulation more flexible.
    const weeklyLeaveDaysPerEngineer = leaveDays / 52;
    const weeklyPublicHolidaysPerEngineer = publicHolidays / 52;
    const weeklyAvailableDaysPerEngineer = Math.max(0, 5 - weeklyLeaveDaysPerEngineer - weeklyPublicHolidaysPerEngineer);

    let weekStartIndex = -1, weekEndIndex = -1;
    for (let i = 0; i < weekToMonth_SDM.length; i++) {
        if (weekToMonth_SDM[i] === monthIndex + 1) {
            if (weekStartIndex === -1) weekStartIndex = i;
            weekEndIndex = i;
        }
    }

    if (weekStartIndex === -1) { console.error("Could not find weeks for month index:", monthIndex); return; }

    // Update arrays for the relevant weeks
    for (let weekIndex = weekStartIndex; weekIndex <= weekEndIndex; weekIndex++) {
        if (weekIndex < totalHeadcountArray_SDM.length) {
            totalHeadcountArray_SDM[weekIndex] = newHeadcount;
            // Simplistic assumption for Phase 1: If headcount is manually set, assume they are ramped.
            totalRampedUpEngineersArray_SDM[weekIndex] = newHeadcount;
            // Recalculate effective engineers based on the new ramped-up count
            const effectiveEngineers = totalRampedUpEngineersArray_SDM[weekIndex] * efficiencyFactor * (weeklyAvailableDaysPerEngineer / 5);
            if (weekIndex < productiveEngineers_SDM.length) {
                productiveEngineers_SDM[weekIndex] = effectiveEngineers;
            }
        }
    }

    // Recalculate monthlyData for the affected month
    monthlyData_SDM.headcount[monthIndex] = newHeadcount;
    monthlyData_SDM.sdeWeeks[monthIndex] = 0;
    monthlyData_SDM.sdeDays[monthIndex] = 0;
    for (let weekIndex = weekStartIndex; weekIndex <= weekEndIndex; weekIndex++) {
        if (weekIndex < productiveEngineers_SDM.length) {
            monthlyData_SDM.sdeWeeks[monthIndex] += productiveEngineers_SDM[weekIndex];
            monthlyData_SDM.sdeDays[monthIndex] += productiveEngineers_SDM[weekIndex] * weeklyAvailableDaysPerEngineer;
        }
    }
    monthlyData_SDM.headcount[monthIndex] = Math.round(monthlyData_SDM.headcount[monthIndex] || 0);
    monthlyData_SDM.sdeDays[monthIndex] = parseFloat((monthlyData_SDM.sdeDays[monthIndex] || 0).toFixed(2));
    monthlyData_SDM.sdeWeeks[monthIndex] = parseFloat((monthlyData_SDM.sdeWeeks[monthIndex] || 0).toFixed(2));


    // Refresh display elements
    generateWeeklyTable_SDM([...Array(52).keys()].map(i => i + 1), productiveEngineers_SDM);
    // Need to regenerate the monthly summary to update the specific cell and recalculate SDE days/weeks
    generateMonthlySummary_SDM(monthlyData_SDM);
    generateChart_SDM([...Array(52).keys()].map(i => i + 1), {
        productiveEngineers: productiveEngineers_SDM,
        totalRampedUpEngineersArray: totalRampedUpEngineersArray_SDM,
        totalHeadcountArray: totalHeadcountArray_SDM,
        cumulativeAttritionArray: cumulativeAttritionArray_SDM // Pass existing attrition
    }, fundedSize);
    console.log("Updated forecast after manual headcount change.");
}

/**
 * RENAMED & ADAPTED from standalone tool. Uses new chart ID and variable names.
 * Phase 2 Debug: Added borderDash to green line for visibility.
 */
function generateChart_SDM(weeks, simulationResult, fundedSize) {
    console.log("Generating SDM Forecast Chart (with dashed green line)..."); // Updated log
    // Destroy existing chart instance if it exists
    if (forecastChart_SDM) {
        forecastChart_SDM.destroy();
        forecastChart_SDM = null;
        console.log("Destroyed previous SDM forecast chart instance.");
    }

    const canvas = document.getElementById('forecastChart_SDM');
    if (!canvas) {
        console.error("Canvas element #forecastChart_SDM not found.");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Failed to get 2D context for SDM forecast chart canvas.");
        return;
    }

    forecastChart_SDM = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [
                {
                    label: 'Effective Engineers', // Blue
                    data: simulationResult.productiveEngineers,
                    borderColor: 'blue', fill: false, yAxisID: 'y', tension: 0.1
                },
                {
                    label: 'Total Ramped Up Engineers', // Green
                    data: simulationResult.totalRampedUpEngineersArray,
                    borderColor: 'green',
                    borderDash: [10, 5], // *** ADDED: Make dashed ***
                    fill: false, yAxisID: 'y', tension: 0.1
                },
                {
                    label: 'Total Headcount', // Purple
                    data: simulationResult.totalHeadcountArray,
                    borderColor: 'purple', fill: false, yAxisID: 'y', tension: 0.1
                },
                {
                    label: 'Cumulative Attrition', // Orange
                    data: simulationResult.cumulativeAttritionArray,
                    borderColor: 'orange', fill: false, yAxisID: 'y1', tension: 0.1
                },
                {
                    label: 'Funded Team Size', // Red Dashed
                    data: weeks.map(() => fundedSize),
                    borderColor: 'red', borderDash: [5, 5], fill: false, yAxisID: 'y', tension: 0.1
                },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false, },
            stacked: false,
            scales: {
                x: { display: true, title: { display: true, text: 'Week' } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Engineers' },
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false, },
                    beginAtZero: true,
                    title: { display: true, text: 'Cumulative Attrition' },
                }
            }
        }
    });
    console.log("SDM Forecast Chart generated (with dashed green line).");
}

// ========= END SDM Resource Forecasting Tool Code =========


