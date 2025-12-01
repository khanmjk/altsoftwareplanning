// js/capacityTuning.js
// console.log("Loading capacityTuning.js...");

/** NEW Function - Renders the Capacity Configuration View into the Workspace */
function renderCapacityConfigView(container) {
    // console.log("Rendering Capacity Configuration View...");

    // Fallback if container not passed (legacy support)
    if (!container) {
        container = document.getElementById('capacityConfigView');
    }

    if (!container) {
        console.error("Cannot render capacity view: Container not found.");
        return;
    }

    if (!currentSystemData) {
        container.innerHTML = '<div class="capacity-config-view__error"><h3>Please load a system first.</h3></div>';
        return;
    }

    // Clear container (though WorkspaceComponent does this too)
    // container.innerHTML = ''; 

    // We need to ensure internal functions use this container or find their targets within it.
    // For now, internal functions like generateGlobalConstraintsForm still look for ID 'capacityConfigView'.
    // So we MUST ensure the container has that ID if we want to avoid refactoring everything.
    // WorkspaceComponent assigns the ID, so we are good.

    generateGlobalConstraintsForm();
    generateTeamConstraintsForms();
    // ---------------------------

    // (Phase 5+)
    updateCapacityCalculationsAndDisplay();

}
// Make it globally accessible
window.renderCapacityConfigView = renderCapacityConfigView;

/**
 * Generates the form elements for global capacity constraints.
 * Fixes tbody lookup issue in renderOrgEvents.
 */
function generateGlobalConstraintsForm() {
    // console.log("Generating Global Constraints Form (Fix 1)...");
    const container = document.getElementById('capacityConfigView');
    if (!container) {
        console.error("Cannot generate global constraints form: Container #capacityConfigView not found.");
        return;
    }
    if (!currentSystemData || !currentSystemData.capacityConfiguration) {
        console.error("Cannot generate global constraints form: Missing currentSystemData.capacityConfiguration.");
        container.innerHTML = '<p class="capacity-config-view__error capacity-config-view__error--missing-data">Error: Capacity configuration data missing in the loaded system.</p>';
        return;
    }

    // Ensure nested structure exists
    if (!currentSystemData.capacityConfiguration.globalConstraints) {
        currentSystemData.capacityConfiguration.globalConstraints = { publicHolidays: null, orgEvents: [] };
    }

    if (!currentSystemData.capacityConfiguration.globalConstraints.orgEvents || !Array.isArray(currentSystemData.capacityConfiguration.globalConstraints.orgEvents)) {
        console.warn("Initializing missing or invalid orgEvents array.");
        currentSystemData.capacityConfiguration.globalConstraints.orgEvents = [];
    }

    if (!currentSystemData.capacityConfiguration.leaveTypes) {
        currentSystemData.capacityConfiguration.leaveTypes = [
            { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0 },
            { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0 },
            { id: "study", name: "Study Leave", defaultEstimatedDays: 0 },
            { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0 }
        ];
    }


    // --- Create Section for Global Settings ---
    let globalSection = document.getElementById('globalConstraintsSection');
    if (!globalSection) {
        // console.log("Creating #globalConstraintsSection div...");
        globalSection = document.createElement('div');
        globalSection.id = 'globalConstraintsSection';
        globalSection.style.border = '1px solid #ccc';
        globalSection.style.padding = '15px';
        globalSection.style.marginBottom = '20px';
        const globalTitle = document.createElement('h3');
        globalTitle.textContent = 'Organizational Defaults & Global Events';
        globalSection.appendChild(globalTitle);
        // Insert the new section at the beginning of the main container
        container.insertBefore(globalSection, container.firstChild);
    } else {
        // console.log("Clearing existing content within #globalConstraintsSection (keeping title)...");
        // Clear previous content EXCEPT the title (assuming H3 is the first child)
        while (globalSection.childNodes.length > 1) {
            globalSection.removeChild(globalSection.lastChild);
        }
    }
    globalSection.style.border = '1px solid #ccc';
    globalSection.style.padding = '15px';
    globalSection.style.marginBottom = '20px';

    // Working Days per Year
    const wdLabel = document.createElement('label');
    wdLabel.textContent = 'Standard Working Days Per Year: ';
    wdLabel.htmlFor = 'workingDaysInput';
    wdLabel.title = 'Define the standard number of working days in a year (e.g., 261). Used as the basis for SDE Year calculations. Values over 300 may be unrealistic.';
    const wdInput = document.createElement('input');
    wdInput.type = 'number';
    wdInput.id = 'workingDaysInput';
    wdInput.min = '1';
    wdInput.step = '1';
    wdInput.value = currentSystemData.capacityConfiguration.workingDaysPerYear || 261; // Default if null
    wdInput.style.width = '80px';
    wdInput.dataset.originalTitle = wdLabel.title; // Store original title for warnings
    wdInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        let warningMsg = ''; // Initialize warning message
        if (!isNaN(value) && value > 0) {
            currentSystemData.capacityConfiguration.workingDaysPerYear = value;
            console.log("Updated workingDaysPerYear:", value);
            // --- Sanity Check ---
            if (value > 300 || value < 200) { // Example sanity check range
                warningMsg = 'Value seems high/low. Typical range is 200-300.';
            }
            // --- End Sanity Check ---
            updateCapacityCalculationsAndDisplay();
        } else {
            // Revert to stored value if input is invalid
            e.target.value = currentSystemData.capacityConfiguration.workingDaysPerYear || 261;
        }
        updateInputWarning(e.target, warningMsg); // Update warning display
    });
    globalSection.appendChild(wdLabel);
    globalSection.appendChild(wdInput);
    // Initial check on load
    updateInputWarning(wdInput, (parseInt(wdInput.value) > 300 || parseInt(wdInput.value) < 200) ? 'Value seems high/low. Typical range is 200-300.' : '');
    globalSection.appendChild(document.createElement('br'));
    globalSection.appendChild(document.createElement('br'));

    // Public Holidays
    const phLabel = document.createElement('label');
    phLabel.textContent = 'Public Holidays (Days/Year): ';
    phLabel.htmlFor = 'publicHolidaysInput';
    phLabel.title = 'Enter the total number of official public holidays per year that impact all teams.';
    const phInput = document.createElement('input');
    phInput.type = 'number';
    phInput.id = 'publicHolidaysInput';
    phInput.min = '0';
    phInput.step = '1';
    phInput.value = currentSystemData.capacityConfiguration.globalConstraints.publicHolidays || 0;
    phInput.style.width = '80px';
    phInput.dataset.originalTitle = phLabel.title; // Store original title
    phInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        let warningMsg = ''; // Initialize warning message
        if (!isNaN(value) && value >= 0) {
            currentSystemData.capacityConfiguration.globalConstraints.publicHolidays = value;
            console.log("Updated publicHolidays:", value);
            // --- Sanity Check ---
            if (value > 30) { // Example sanity check
                warningMsg = 'Value seems high for public holidays (more than 30).';
            }
            // --- End Sanity Check ---
            updateCapacityCalculationsAndDisplay();
        } else {
            // Revert to stored value if input is invalid
            e.target.value = currentSystemData.capacityConfiguration.globalConstraints.publicHolidays || 0;
        }
        updateInputWarning(e.target, warningMsg); // Update warning display
    });

    globalSection.appendChild(phLabel);
    globalSection.appendChild(phInput);
    // Initial check on load
    updateInputWarning(phInput, (parseInt(phInput.value) > 30) ? 'Value seems high for public holidays (more than 30).' : '');
    globalSection.appendChild(document.createElement('br'));
    globalSection.appendChild(document.createElement('br'));

    // --- Org-Wide Events ---
    const orgEventsTitle = document.createElement('h4');
    orgEventsTitle.textContent = 'Organization-Wide Events';
    orgEventsTitle.title = 'Define events that impact all (or most) engineers globally (e.g., Hackathons, All-Hands). Estimate average days per participating SDE.';
    globalSection.appendChild(orgEventsTitle);

    const orgEventsTable = document.createElement('table');
    orgEventsTable.style.width = '80%';
    orgEventsTable.style.borderCollapse = 'collapse';
    orgEventsTable.innerHTML = `
        <thead>
            <tr>
                <th style="border: 1px solid #ccc; padding: 5px;">Event Name</th>
                <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Est. Days/SDE</th>
                <th style="border: 1px solid #ccc; padding: 5px; width: 80px; text-align: center;">Action</th>
            </tr>
        </thead>
        <tbody id="orgEventsTbody">
            </tbody>
    `;
    globalSection.appendChild(orgEventsTable);

    // *** Find the tbody WITHIN the newly created table ***
    const orgEventsTbody = orgEventsTable.querySelector('#orgEventsTbody'); // Find tbody inside the table

    // --- REVISED renderOrgEvents function within generateGlobalConstraintsForm ---
    const renderOrgEvents = (tbodyElement) => {
        if (!tbodyElement) { console.error("Org events tbody not found for rendering"); return; }
        tbodyElement.innerHTML = '';
        // Access the array safely AFTER the check/init above
        const events = currentSystemData.capacityConfiguration.globalConstraints.orgEvents;
        // console.log("[DEBUG] Rendering org events table with data:", JSON.stringify(events)); // Add log to see data used for render

        events.forEach((event, index) => {
            const row = tbodyElement.insertRow();
            const nameCell = row.insertCell(); /* ... Name Input Cell ... */ nameCell.style.border = '1px solid #ccc'; nameCell.style.padding = '5px'; const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.value = event.name || ''; nameInput.style.width = '95%';
            // *** MODIFIED NAME INPUT ONCHANGE ***
            nameInput.onchange = (e) => {
                // Explicitly find the event in currentSystemData using index
                const eventToUpdate = currentSystemData.capacityConfiguration.globalConstraints.orgEvents[index];
                if (eventToUpdate) {
                    eventToUpdate.name = e.target.value; // Update the object in the main data structure
                    console.log(`Updated org event[${index}] name in currentSystemData`);
                    updateCapacityCalculationsAndDisplay(); // Trigger update
                } else {
                    console.error(`Could not find org event at index ${index} to update name.`);
                }
            };
            nameCell.appendChild(nameInput);

            const daysCell = row.insertCell(); /* ... Days Input Cell ... */ daysCell.style.border = '1px solid #ccc'; daysCell.style.padding = '5px'; daysCell.style.textAlign = 'center'; const daysInput = document.createElement('input'); daysInput.type = 'number'; daysInput.min = '0'; daysInput.step = '0.5'; daysInput.value = event.estimatedDaysPerSDE || 0; daysInput.style.width = '60px';
            // *** MODIFIED DAYS INPUT ONCHANGE ***
            daysInput.onchange = (e) => {
                // Explicitly find the event in currentSystemData using index
                const eventToUpdate = currentSystemData.capacityConfiguration.globalConstraints.orgEvents[index];
                if (eventToUpdate) {
                    eventToUpdate.estimatedDaysPerSDE = parseFloat(e.target.value) || 0; // Update the object in the main data structure
                    console.log(`Updated org event[${index}] days in currentSystemData`);
                    updateCapacityCalculationsAndDisplay(); // Trigger update
                } else {
                    console.error(`Could not find org event at index ${index} to update days.`);
                }
            };
            daysCell.appendChild(daysInput);

            const actionCell = row.insertCell(); /* ... Remove Button Cell ... */ actionCell.style.border = '1px solid #ccc'; actionCell.style.padding = '5px'; actionCell.style.textAlign = 'center'; const removeBtn = document.createElement('button'); removeBtn.textContent = 'Remove'; removeBtn.style.fontSize = '0.9em';
            // Remove button logic remains the same - it correctly modifies the array directly
            removeBtn.onclick = () => {
                // console.log(`Attempting to remove org event at index ${index}`);
                currentSystemData.capacityConfiguration.globalConstraints.orgEvents.splice(index, 1);
                console.log("Spliced event from array. New array:", JSON.stringify(currentSystemData.capacityConfiguration.globalConstraints.orgEvents));
                renderOrgEvents(tbodyElement); // Re-render the table rows
                updateCapacityCalculationsAndDisplay(); // Trigger summary update
            };
            actionCell.appendChild(removeBtn);
        });
    };
    // --- END REVISED renderOrgEvents function ---

    // Check if tbody was found before calling renderOrgEvents
    if (orgEventsTbody) {
        renderOrgEvents(orgEventsTbody); // Initial render, pass the found tbody
    } else {
        console.error("Could not find #orgEventsTbody within the created orgEventsTable.");
    }

    const addOrgEventBtn = document.createElement('button');
    addOrgEventBtn.textContent = 'Add Org Event';
    addOrgEventBtn.style.marginTop = '10px';
    addOrgEventBtn.onclick = () => {
        if (!currentSystemData.capacityConfiguration.globalConstraints.orgEvents) {
            currentSystemData.capacityConfiguration.globalConstraints.orgEvents = [];
        }
        currentSystemData.capacityConfiguration.globalConstraints.orgEvents.push({ id: 'evt-' + Date.now(), name: 'New Org Event', estimatedDaysPerSDE: 0 });
        // *** Pass the correct tbody element when re-rendering after add ***
        if (orgEventsTbody) renderOrgEvents(orgEventsTbody);
        // Trigger recalculation of summary display
        updateCapacityCalculationsAndDisplay();
    };
    globalSection.appendChild(addOrgEventBtn);
    globalSection.appendChild(document.createElement('br'));
    globalSection.appendChild(document.createElement('br'));


    // --- Standard Leave Types (Defaults) ---
    const leaveTypesTitle = document.createElement('h4');
    leaveTypesTitle.textContent = 'Standard Leave Types (Default Days/SDE/Year)';
    leaveTypesTitle.title = 'Define standard leave types and their default estimated days per SDE per year. Team-specific estimates can override these defaults later.';
    globalSection.appendChild(leaveTypesTitle);

    const leaveTypesTable = document.createElement('table');
    leaveTypesTable.style.width = '60%';
    leaveTypesTable.style.borderCollapse = 'collapse';
    leaveTypesTable.innerHTML = `
        <thead>
            <tr>
                <th style="border: 1px solid #ccc; padding: 5px;">Leave Type</th>
                <th style="border: 1px solid #ccc; padding: 5px; text-align: center;">Default Est. Days/SDE/Year</th>
            </tr>
        </thead>
        <tbody id="leaveTypesTbody">
            </tbody>
    `;
    globalSection.appendChild(leaveTypesTable);

    const tbodyLeave = leaveTypesTable.querySelector('#leaveTypesTbody'); // Find tbody within this table
    if (tbodyLeave) {
        (currentSystemData.capacityConfiguration.leaveTypes || []).forEach(leaveType => {
            if (!leaveType) return; // Skip if invalid
            const row = tbodyLeave.insertRow();
            const nameCell = row.insertCell();
            nameCell.style.border = '1px solid #ccc'; nameCell.style.padding = '5px';
            nameCell.textContent = leaveType.name;

            const daysCell = row.insertCell();
            daysCell.style.border = '1px solid #ccc'; daysCell.style.padding = '5px'; daysCell.style.textAlign = 'center';
            const daysInput = document.createElement('input');
            daysInput.type = 'number'; daysInput.min = '0'; daysInput.step = '1'; daysInput.value = leaveType.defaultEstimatedDays || 0; daysInput.style.width = '60px';
            daysInput.title = `Default estimate for ${leaveType.name}`;
            daysInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                leaveType.defaultEstimatedDays = (!isNaN(value) && value >= 0) ? value : 0;
                console.log(`Updated default days for ${leaveType.id} to ${leaveType.defaultEstimatedDays}`);
                //Trigger recalculation of summary display
                updateCapacityCalculationsAndDisplay();
            });
            daysCell.appendChild(daysInput);
        });
    } else {
        console.error("Could not find #leaveTypesTbody within the created leaveTypesTable.");
    }
    // Note: Not adding 'Add New Leave Type' for now to keep MVP simpler.

    // --- Append Global Section ---
    // console.log("Finished generating Global Constraints Form.");
}
window.generateGlobalConstraintsForm = generateGlobalConstraintsForm;

/**
 * REVISED - Calculates capacity metrics, accounting for AI vs. Human engineers,
 * the new rule for Funded Headcount, and the new AI Productivity Gain.
 */
function calculateAllCapacityMetrics() {
    // console.log("Calculating all capacity metrics (AI-Aware with Productivity Gain)...");
    if (!currentSystemData || !currentSystemData.capacityConfiguration || !currentSystemData.teams) {
        console.error("Cannot calculate metrics: Missing core data (config or teams).");
        return { totals: { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} } };
    }

    const capacityConfig = currentSystemData.capacityConfiguration;
    const teams = currentSystemData.teams;
    const allKnownEngineers = currentSystemData.allKnownEngineers || [];
    const workingDaysPerYear = capacityConfig.workingDaysPerYear || 261;
    const sdesPerSdeYear = 1;
    const globalLeaveTypes = capacityConfig.leaveTypes || [];
    const workingDays = workingDaysPerYear || 1; // Safeguard for division by zero

    const teamMetrics = {};
    const totals = {
        TeamBIS: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
        EffectiveBIS: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
        FundedHC: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} }
    };

    ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
        totals[scenario].deductionsBreakdown = { stdLeaveYrs: 0, varLeaveYrs: 0, holidayYrs: 0, orgEventYrs: 0, teamActivityYrs: 0, overheadYrs: 0, aiProductivityGainYrs: 0 };
    });

    (teams || []).forEach(team => {
        if (!team || !team.teamId) return;
        teamMetrics[team.teamId] = { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} };

        // Differentiate human vs total engineers for the team
        const teamEngineerNames = team.engineers || [];
        const humanEngineersOnTeamList = teamEngineerNames.filter(name => {
            const eng = allKnownEngineers.find(e => e.name === name);
            return eng && !eng.attributes.isAISWE;
        });
        const aiEngineersOnTeamList = teamEngineerNames.filter(name => {
            const eng = allKnownEngineers.find(e => e.name === name);
            return eng && eng.attributes.isAISWE;
        });

        const teamHumanBIS = humanEngineersOnTeamList.length;
        const teamAIBIS = aiEngineersOnTeamList.length;
        const teamTotalBIS = team.engineers?.length ?? 0;

        const awayHumanMembers = (team.awayTeamMembers || []).filter(m => !m.attributes?.isAISWE).length;
        const awayAIMembers = (team.awayTeamMembers || []).filter(m => m.attributes?.isAISWE).length;
        const awayTotalMembers = (team.awayTeamMembers || []).length;


        // Pre-calculate per-SDE values and total team days using helpers
        const stdLeave_days_per_sde = calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
        const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
        const orgEvents_days_per_sde = calculateOrgEventDaysPerSDE(capacityConfig);
        const overhead_days_per_sde = calculateOverheadDaysPerSDE(team, workingDaysPerYear);
        const variable_leave_total_team_days = calculateTotalVariableLeaveDays(team);
        const teamActivityImpacts = calculateTeamActivityImpacts(team);

        ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
            let totalHeadcount = 0;
            let humanHeadcount = 0;

            switch (scenario) {
                case 'TeamBIS':
                    totalHeadcount = teamTotalBIS;
                    humanHeadcount = teamHumanBIS;
                    break;
                case 'EffectiveBIS':
                    totalHeadcount = teamTotalBIS + awayTotalMembers;
                    humanHeadcount = teamHumanBIS + awayHumanMembers;
                    break;
                case 'FundedHC':
                    humanHeadcount = team.fundedHeadcount || 0;
                    totalHeadcount = humanHeadcount + teamAIBIS + awayAIMembers;
                    break;
            }

            const grossYrs = totalHeadcount * sdesPerSdeYear;

            const deductionsBreakdown = {
                stdLeaveYrs: (stdLeave_days_per_sde / workingDays) * humanHeadcount,
                varLeaveYrs: variable_leave_total_team_days / workingDays,
                holidayYrs: (holidays_days_per_sde / workingDays) * humanHeadcount,
                orgEventYrs: (orgEvents_days_per_sde / workingDays) * humanHeadcount,
                teamActivityYrs: (teamActivityImpacts.daysPerSDE / workingDays) * humanHeadcount + (teamActivityImpacts.totalTeamDaysDuration / workingDays),
                overheadYrs: (overhead_days_per_sde / workingDays) * humanHeadcount,
                aiProductivityGainYrs: 0 // Initialize gain
            };

            const totalDeductYrs = Object.values(deductionsBreakdown).reduce((sum, val) => sum + (val || 0), 0);

            // --- NEW: Calculate and apply AI Productivity Gain ---
            const aiProductivityGainPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
            const humanGrossYrs = humanHeadcount * sdesPerSdeYear;
            // All deductions are already based on human headcount
            const humanNetWorkYrs_BeforeGain = humanGrossYrs - totalDeductYrs;
            const aiGainInSdeYears = humanNetWorkYrs_BeforeGain * (aiProductivityGainPercent / 100);

            deductionsBreakdown.aiProductivityGainYrs = aiGainInSdeYears;

            const netYrs = (grossYrs - totalDeductYrs) + aiGainInSdeYears;
            // --- END NEW ---

            teamMetrics[team.teamId][scenario] = {
                totalHeadcount: totalHeadcount,
                humanHeadcount: humanHeadcount,
                grossYrs: grossYrs,
                deductYrs: totalDeductYrs,
                netYrs: netYrs,
                deductionsBreakdown: deductionsBreakdown
            };

            totals[scenario].totalHeadcount += totalHeadcount;
            totals[scenario].humanHeadcount += humanHeadcount;
            totals[scenario].grossYrs += grossYrs;
            totals[scenario].deductYrs += totalDeductYrs;
            totals[scenario].netYrs += netYrs;

            Object.keys(deductionsBreakdown).forEach(key => {
                totals[scenario].deductionsBreakdown[key] = (totals[scenario].deductionsBreakdown[key] || 0) + (deductionsBreakdown[key] || 0);
            });
        });
    });

    // console.log("Finished calculating AI-aware metrics with productivity gain.");
    return { ...teamMetrics, totals: totals };
}
window.calculateAllCapacityMetrics = calculateAllCapacityMetrics;

/**
 * REVISED - Triggers recalculation and redraws summary, narrative, and chart.
 */
function updateCapacityCalculationsAndDisplay(newScenario = null) {
    // console.log(`Updating capacity display. New scenario provided: ${newScenario}, Current scenario: ${currentCapacityScenario}`);
    if (newScenario && ['TeamBIS', 'EffectiveBIS', 'FundedHC'].includes(newScenario) && newScenario !== currentCapacityScenario) {
        currentCapacityScenario = newScenario;
        console.log(`Capacity scenario changed to: ${currentCapacityScenario}`);
    }

    if (!currentSystemData) {
        console.warn("No current system data to calculate metrics from.");
        const summarySection = document.getElementById('capacitySummarySection');
        if (summarySection) summarySection.innerHTML = '<h3>Calculated Net Project Capacity Summary</h3><p><em>No system data loaded.</em></p>';
        const narrativeContainer = document.getElementById('capacityNarrativeSection');
        if (narrativeContainer) narrativeContainer.style.display = 'none';
        const chartContainer = document.getElementById('capacityChartContainer');
        if (chartContainer) chartContainer.style.display = 'none';
        return;
    }

    const calculatedMetrics = calculateAllCapacityMetrics();
    // console.log("Capacity metrics calculated:", calculatedMetrics);

    generateCapacitySummaryDisplay(calculatedMetrics, currentCapacityScenario);
    generateCapacityNarrative(calculatedMetrics, currentCapacityScenario);
    generateCapacityWaterfallChart(calculatedMetrics, currentCapacityScenario);

    // console.log("All capacity displays updated.");
}
window.updateCapacityCalculationsAndDisplay = updateCapacityCalculationsAndDisplay;

/**
 * REVISED (v7 - Final Polish) - Generates the Summary Table.
 * - Adds a "ℹ️" info icon to the 'AI Gain' column with a detailed tooltip showing the calculation.
 * - Retains all previous enhancements like dynamic headers and correct data sourcing.
 */
function generateCapacitySummaryDisplay(calculatedMetrics, selectedScenario) {
    // console.log(`Generating AI-Aware Capacity Summary Display for scenario: ${selectedScenario}`);
    const summarySection = document.getElementById('capacitySummarySection');
    if (!summarySection) { console.error("Summary section not found."); return; }

    let scenarioButtonsDiv = summarySection.querySelector('#capacityScenarioButtons');
    if (!scenarioButtonsDiv) {
        scenarioButtonsDiv = document.createElement('div');
        scenarioButtonsDiv.id = 'capacityScenarioButtons';
        scenarioButtonsDiv.style.marginBottom = '15px';
        summarySection.insertBefore(scenarioButtonsDiv, summarySection.firstChild);
    }
    const baseButtonStyle = 'padding: 5px 10px; margin-right: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.9em;';
    const activeButtonStyle = baseButtonStyle + ' background-color: #007bff; color: white; border-color: #0056b3; font-weight: bold;';
    const inactiveButtonStyle = baseButtonStyle + ' background-color: #e9ecef; color: #495057;';

    scenarioButtonsDiv.innerHTML = `
        <strong class="capacity-scenario-selector__label">Show Summary For:</strong>
        <button type="button" class="capacity-scenario-button ${selectedScenario === 'EffectiveBIS' ? 'capacity-scenario-button--active' : ''}" data-scenario="EffectiveBIS">Effective BIS</button>
        <button type="button" class="capacity-scenario-button ${selectedScenario === 'TeamBIS' ? 'capacity-scenario-button--active' : ''}" data-scenario="TeamBIS">Team BIS</button>
        <button type="button" class="capacity-scenario-button ${selectedScenario === 'FundedHC' ? 'capacity-scenario-button--active' : ''}" data-scenario="FundedHC">Funded HC</button>
    `;

    // Event delegation for scenario buttons
    scenarioButtonsDiv.querySelectorAll('.capacity-scenario-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = btn.getAttribute('data-scenario');
            if (scenario && typeof updateCapacityCalculationsAndDisplay === 'function') {
                updateCapacityCalculationsAndDisplay(scenario);
            }
        });
    });

    let summaryTable = summarySection.querySelector('#capacitySummaryTable');
    if (!summaryTable) {
        summaryTable = document.createElement('table');
        summaryTable.id = 'capacitySummaryTable';
        summaryTable.style.width = '100%';
        summaryTable.style.borderCollapse = 'collapse';
        summaryTable.style.marginTop = '10px';
        summarySection.appendChild(summaryTable);
    }
    summaryTable.style.display = 'table';
    summaryTable.innerHTML = '';

    const thead = summaryTable.createTHead();
    const headerRow = thead.insertRow();

    const headers = [
        { text: 'Team Identity', title: 'Team Identifier' },
        { text: `Headcount (${selectedScenario})`, title: 'Total headcount (Human + AI) for the selected scenario' },
        { text: 'Gross (SDE Yrs)', title: 'Total SDE Years before deductions' },
        { text: '(-) Deduct (SDE Yrs)', title: 'Total deductions (Leave, Overhead, etc.) applied to HUMAN engineers' },
        { text: '(+) AI Gain (SDE Yrs)', title: 'Productivity gain from AI tooling applied back to the team\'s capacity.' },
        { text: '(=) Net Project (SDE Yrs)', title: 'Remaining capacity for project work (Gross - Deductions + AI Gain)' }
    ];

    headers.forEach(hdr => {
        const th = document.createElement('th');
        th.textContent = hdr.text;
        th.title = hdr.title;
        th.style.cssText = 'border: 1px solid #ccc; padding: 5px; background-color: #f8f9fa;';
        if (hdr.text !== 'Team Identity') th.style.textAlign = 'center'; else th.style.textAlign = 'left';
        headerRow.appendChild(th);
    });

    const tbody = summaryTable.createTBody();
    const totals = calculatedMetrics.totals[selectedScenario] || { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} };

    (currentSystemData.teams || []).forEach(team => {
        if (!team || !team.teamId) return;
        const teamMetrics = calculatedMetrics[team.teamId]?.[selectedScenario];
        if (!teamMetrics) { console.warn(`Metrics not found for team ${team.teamId} and scenario ${selectedScenario}`); return; }

        const row = tbody.insertRow();
        row.insertCell().textContent = team.teamIdentity || team.teamName || team.teamId;

        const hcCell = row.insertCell();
        const aiEngineers = teamMetrics.totalHeadcount - teamMetrics.humanHeadcount;
        hcCell.innerHTML = `${teamMetrics.totalHeadcount.toFixed(1)} <span style="font-size:0.8em; color:#6c757d;">(${teamMetrics.humanHeadcount.toFixed(1)}H, ${aiEngineers.toFixed(1)}AI)</span>`;
        hcCell.title = `Total: ${teamMetrics.totalHeadcount.toFixed(1)}, Humans: ${teamMetrics.humanHeadcount.toFixed(1)}, AI: ${aiEngineers.toFixed(1)}`;

        row.insertCell().textContent = teamMetrics.grossYrs.toFixed(2);

        const deductCell = row.insertCell();
        deductCell.textContent = teamMetrics.deductYrs.toFixed(2);
        const deductInfoIcon = document.createElement('span');
        deductInfoIcon.textContent = ' ℹ️';
        deductInfoIcon.style.cursor = 'help';
        deductInfoIcon.style.fontSize = '0.8em';
        deductCell.appendChild(deductInfoIcon);
        deductCell.title = formatDeductionTooltip(teamMetrics.deductionsBreakdown);

        const aiGainCell = row.insertCell();
        const aiGainValue = teamMetrics.deductionsBreakdown.aiProductivityGainYrs || 0;
        aiGainCell.textContent = `+${aiGainValue.toFixed(2)}`;
        aiGainCell.style.color = '#28a745';
        aiGainCell.style.fontWeight = 'bold';

        // ** NEW: Add Info Icon for AI Gain **
        const aiGainInfoIcon = document.createElement('span');
        aiGainInfoIcon.textContent = ' ℹ️';
        aiGainInfoIcon.style.cursor = 'help';
        aiGainInfoIcon.style.fontSize = '0.8em';

        // Construct the tooltip text for AI Gain calculation
        const humanGrossYrs = teamMetrics.humanHeadcount * 1.0; // SDE Year per human
        const humanNetBeforeGain = humanGrossYrs - teamMetrics.deductYrs;
        const productivityPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
        aiGainInfoIcon.title = `Calculation: (Human Net Capacity Before Gain) * AI Gain %\n` +
            `(${humanNetBeforeGain.toFixed(2)} SDE Yrs * ${productivityPercent}%) = +${aiGainValue.toFixed(2)} SDE Yrs`;
        aiGainCell.appendChild(aiGainInfoIcon);


        const netCell = row.insertCell();
        netCell.textContent = teamMetrics.netYrs.toFixed(2);
        netCell.style.fontWeight = 'bold';
        if (teamMetrics.netYrs <= 0) {
            netCell.style.backgroundColor = '#f8d7da';
            netCell.title = 'Warning: Net Project Capacity is zero or negative!';
        } else {
            netCell.style.backgroundColor = '#d4edda';
        }

        Array.from(row.cells).forEach((cell, i) => { if (i > 0) cell.style.textAlign = 'center'; });
    });

    const tfoot = summaryTable.createTFoot();
    const footerRow = tfoot.insertRow();
    footerRow.style.fontWeight = 'bold';
    footerRow.style.backgroundColor = '#f0f0f0';
    footerRow.insertCell().textContent = 'TOTALS';

    const totalHcCell = footerRow.insertCell();
    const totalAiEngineers = totals.totalHeadcount - totals.humanHeadcount;
    totalHcCell.innerHTML = `${totals.totalHeadcount.toFixed(1)} <span style="font-size:0.8em; color:#6c757d;">(${totals.humanHeadcount.toFixed(1)}H, ${totalAiEngineers.toFixed(1)}AI)</span>`;
    totalHcCell.title = `Total: ${totals.totalHeadcount.toFixed(1)}, Humans: ${totals.humanHeadcount.toFixed(1)}, AI: ${totalAiEngineers.toFixed(1)}`;

    footerRow.insertCell().textContent = totals.grossYrs.toFixed(2);

    const deductTotalCell = footerRow.insertCell();
    deductTotalCell.textContent = totals.deductYrs.toFixed(2);
    const totalDeductInfoIcon = document.createElement('span');
    totalDeductInfoIcon.textContent = ' ℹ️';
    totalDeductInfoIcon.style.cursor = 'help';
    totalDeductInfoIcon.style.fontSize = '0.8em';
    deductTotalCell.appendChild(totalDeductInfoIcon);
    deductTotalCell.title = formatDeductionTooltip(totals.deductionsBreakdown);

    const totalAIGainCell = footerRow.insertCell();
    const totalAIGainValue = totals.deductionsBreakdown.aiProductivityGainYrs || 0;
    totalAIGainCell.textContent = `+${totalAIGainValue.toFixed(2)}`;
    totalAIGainCell.style.color = '#28a745';
    // Add info icon to total gain as well
    const totalAIGainInfoIcon = document.createElement('span');
    totalAIGainInfoIcon.textContent = ' ℹ️';
    totalAIGainInfoIcon.style.cursor = 'help';
    totalAIGainInfoIcon.style.fontSize = '0.8em';
    const totalHumanGrossYrs = totals.humanHeadcount * 1.0;
    const totalHumanNetBeforeGain = totalHumanGrossYrs - totals.deductYrs;
    totalAIGainInfoIcon.title = `Represents the sum of all team AI gains.\n` +
        `Calculated from each team's Human Net Capacity multiplied by their respective AI Gain %.`;
    totalAIGainCell.appendChild(totalAIGainInfoIcon);


    const netTotalCell = footerRow.insertCell();
    netTotalCell.textContent = totals.netYrs.toFixed(2);
    if (totals.netYrs <= 0) {
        netTotalCell.style.backgroundColor = '#f8d7da';
        netTotalCell.title = 'Warning: Total Net Project Capacity is zero or negative!';
    } else {
        netTotalCell.style.backgroundColor = '#d4edda';
    }

    Array.from(footerRow.cells).forEach((cell, i) => {
        cell.style.borderTop = '2px solid #666';
        if (i > 0) cell.style.textAlign = 'center';
    });
}
window.generateCapacitySummaryDisplay = generateCapacitySummaryDisplay;

/**
 * REVISED (v7 - Enhanced Narrative) - Generates an enhanced narrative that explains the AI vs. Human calculation
 * and highlights the "AI Capacity Dividend" and "AI Productivity Gain" at both the org and team level.
 * - This version provides a much more verbose and contextualized explanation of the capacity model.
 */
function generateCapacityNarrative(calculatedMetrics, selectedScenario) {
    // console.log(`Attempting to generate Enhanced AI-Aware Capacity Narrative for scenario: ${selectedScenario}...`);

    let narrativeContainer = document.getElementById('capacityNarrativeSection');
    const mainContainer = document.getElementById('capacityConfigView');

    if (!narrativeContainer) {
        // console.log("Creating narrative section container with collapsible structure...");
        narrativeContainer = document.createElement('div');
        narrativeContainer.id = 'capacityNarrativeSection';
        narrativeContainer.style.border = '1px solid rgb(204, 204, 204)';
        narrativeContainer.style.marginTop = '20px';
        narrativeContainer.style.backgroundColor = '#f8f9fa';

        const narrativeHeader = document.createElement('h3');
        narrativeHeader.id = 'narrativeHeader';
        narrativeHeader.style.margin = '0';
        narrativeHeader.style.padding = '10px 15px';
        narrativeHeader.style.cursor = 'pointer';
        narrativeHeader.style.backgroundColor = '#e9ecef';
        narrativeHeader.style.borderBottom = '1px solid rgb(224, 224, 224)';
        narrativeHeader.title = 'Click to expand/collapse narrative';
        narrativeHeader.innerHTML = `<span class="toggle-indicator" style="font-weight:bold; margin-right:5px;">[+] </span>Capacity Narrative`;

        const narrativeContent = document.createElement('div');
        narrativeContent.id = 'narrativeContent';
        narrativeContent.style.padding = '15px';
        narrativeContent.style.display = 'none';
        narrativeContent.style.fontFamily = 'Arial, sans-serif';
        narrativeContent.style.lineHeight = '1.6';
        narrativeContent.innerHTML = `<p><em>Generating narrative...</em></p>`;

        narrativeContainer.appendChild(narrativeHeader);
        narrativeContainer.appendChild(narrativeContent);

        narrativeHeader.onclick = () => {
            const contentDiv = narrativeContainer.querySelector('#narrativeContent');
            const indicatorSpan = narrativeHeader.querySelector('.toggle-indicator');
            if (contentDiv && indicatorSpan) {
                const isHidden = contentDiv.style.display === 'none';
                contentDiv.style.display = isHidden ? 'block' : 'none';
                indicatorSpan.textContent = isHidden ? '[-] ' : '[+] ';
            }
        };

        if (mainContainer) {
            const summarySection = mainContainer.querySelector('#capacitySummarySection');
            if (summarySection && summarySection.parentNode === mainContainer) {
                summarySection.insertAdjacentElement('afterend', narrativeContainer);
            } else {
                mainContainer.appendChild(narrativeContainer);
            }
        } else {
            console.error("Main container #capacityConfigView not found. Cannot append narrative section.");
            return;
        }
    } else {
        if (narrativeContainer) narrativeContainer.style.display = 'block';
    }

    const narrativeContentContainer = document.getElementById('narrativeContent');
    if (!calculatedMetrics || !currentSystemData || !currentSystemData.capacityConfiguration || !currentSystemData.teams) {
        console.error("Cannot generate narrative: Required data is missing.");
        narrativeContentContainer.innerHTML = `<p><em>Error: Cannot generate narrative because required data is missing.</em></p>`;
        return;
    }

    const totals = calculatedMetrics.totals[selectedScenario] || {};
    const toFixed = (num, places = 2) => (num || 0).toFixed(places);

    // --- Overall Summary Narrative ---
    let narrativeHTML = `<h4>Overall Capacity Summary (${selectedScenario})</h4>`;

    const totalHeadcount = totals.totalHeadcount || 0;
    const humanHeadcount = totals.humanHeadcount || 0;
    const aiHeadcount = totalHeadcount - humanHeadcount;

    narrativeHTML += `<p>For this scenario, the organization's **Gross Capacity is ${toFixed(totals.grossYrs)} SDE Years**. ` +
        `This initial figure is derived from a total headcount of **${toFixed(totalHeadcount, 1)}**, which is composed of ` +
        `<strong>${toFixed(humanHeadcount, 1)} Human Engineers</strong> and <strong>${toFixed(aiHeadcount, 1)} AI Engineers</strong>.</p>`;

    narrativeHTML += `<p>To determine realistic project availability, we first subtract time for operational overheads. These "capacity sinks"—such as leave, public holidays, recurring meetings, and organizational events—amount to a total deduction of ` +
        `<strong>${toFixed(totals.deductYrs)} SDE Years</strong>. It's important to note that these sinks are calculated based on the ` +
        `<em>human headcount only</em>, as AI engineers do not take vacation or attend most team meetings.</p>`;

    narrativeHTML += `<p>After accounting for those deductions, a productivity dividend is applied. The use of AI tooling provides a calculated gain of ` +
        `<strong>${toFixed(totals.deductionsBreakdown?.aiProductivityGainYrs)} SDE Years</strong> across the organization. This gain is applied back to the available human capacity.</p>`;

    narrativeHTML += `<p>Therefore, after subtracting the sinks from the gross capacity and adding back the AI productivity gains, the final estimated ` +
        `<strong>Net Project Capacity is ${toFixed(totals.netYrs)} SDE Years</strong> for the organization.</p>`;

    narrativeHTML += `<hr style='border:none; border-top: 1px solid #ccc; margin: 1.5em 0;'>`;

    // --- Team-Specific Breakdown Narrative ---
    narrativeHTML += `<h4>Team-Specific Breakdown (${selectedScenario} Scenario)</h4>`;

    (currentSystemData.teams || []).forEach(team => {
        const teamMetrics = calculatedMetrics[team.teamId]?.[selectedScenario];
        if (!teamMetrics) return;

        const teamName = team.teamIdentity || team.teamName || team.teamId;
        const teamGross = teamMetrics.grossYrs || 0;
        const teamSinks = teamMetrics.deductYrs || 0;
        const teamAIGain = teamMetrics.deductionsBreakdown?.aiProductivityGainYrs || 0;
        const teamNet = teamMetrics.netYrs || 0;

        narrativeHTML += `<p><strong><u>${teamName}</u>:</strong> ` +
            `Starts with a Gross Capacity of <strong>${toFixed(teamGross)} SDE Years</strong>. ` +
            `From this, <strong>${toFixed(teamSinks)} SDE Years</strong> are deducted for human-centric sinks (leave, overhead, etc.). ` +
            `An estimated <strong>${toFixed(teamAIGain)} SDE Years</strong> are then regained through AI tooling productivity enhancements, ` +
            `resulting in a final Net Project Capacity of <strong>${toFixed(teamNet)} SDE Years</strong> for this team.</p>`;
    });

    narrativeContentContainer.innerHTML = narrativeHTML;
    // console.log("Finished generating enhanced, verbose capacity narrative.");
}
window.generateCapacityNarrative = generateCapacityNarrative;

/**
 * REVISED - Generates the Waterfall chart, now including an "AI Gain" bar.
 */
function generateCapacityWaterfallChart(calculatedMetrics, selectedScenario) {
    console.log(`Generating Capacity Waterfall Chart with AI Gain for scenario: ${selectedScenario}...`);

    const ORG_VIEW_ID = '__ORG_VIEW__';

    let chartContainer = document.getElementById('capacityChartContainer');
    const mainContainer = document.getElementById('capacityConfigView');
    const narrativeSection = document.getElementById('capacityNarrativeSection');
    const summarySection = document.getElementById('capacitySummarySection');

    if (!chartContainer) {
        if (!mainContainer) {
            console.error("Main container #capacityConfigView not found."); return;
        }
        console.log("Creating chart container dynamically (collapsible)...");
        chartContainer = document.createElement('div');
        chartContainer.id = 'capacityChartContainer';
        chartContainer.style.marginTop = '20px';
        chartContainer.style.border = '1px solid #ccc';
        chartContainer.style.backgroundColor = '#f8f9fa';

        const chartHeader = document.createElement('h3');
        chartHeader.id = 'chartHeader';
        chartHeader.style.margin = '0'; chartHeader.style.padding = '10px 15px';
        chartHeader.style.cursor = 'pointer'; chartHeader.style.backgroundColor = '#e9ecef';
        chartHeader.style.borderBottom = '1px solid rgb(224, 224, 224)';
        chartHeader.title = 'Click to expand/collapse chart section';
        chartHeader.innerHTML = `<span class="toggle-indicator" id="chartToggleIndicator" style="font-weight:bold; margin-right:5px;">[+] </span>Capacity Visualization (Waterfall)`;
        chartContainer.appendChild(chartHeader);

        const chartContent = document.createElement('div');
        chartContent.id = 'chartContent';
        chartContent.style.padding = '15px'; chartContent.style.display = 'none';
        chartContainer.appendChild(chartContent);

        const canvasElement = document.createElement('canvas');
        canvasElement.id = 'capacityWaterfallChart';
        canvasElement.style.width = '100%'; canvasElement.style.maxHeight = '450px';
        chartContent.appendChild(canvasElement);

        const teamSelectorDiv = document.createElement('div');
        teamSelectorDiv.id = 'chartTeamSelector';
        teamSelectorDiv.style.textAlign = 'center'; teamSelectorDiv.style.marginTop = '10px';
        teamSelectorDiv.innerHTML = `<p><i>Select a view:</i></p>`;
        chartContent.appendChild(teamSelectorDiv);

        chartHeader.onclick = () => {
            const contentDiv = chartContainer.querySelector('#chartContent');
            const indicatorSpan = chartHeader.querySelector('#chartToggleIndicator');
            if (contentDiv && indicatorSpan) {
                const isHidden = contentDiv.style.display === 'none';
                contentDiv.style.display = isHidden ? 'block' : 'none';
                indicatorSpan.textContent = isHidden ? '[-] ' : '[+] ';
            }
        };

        if (narrativeSection && narrativeSection.parentNode === mainContainer) {
            narrativeSection.insertAdjacentElement('afterend', chartContainer);
        } else if (summarySection && summarySection.parentNode === mainContainer) {
            summarySection.insertAdjacentElement('afterend', chartContainer);
        } else {
            mainContainer.appendChild(chartContainer);
        }
    } else {
        chartContainer.style.display = 'block';
    }

    const teamSelectorContainer = document.getElementById('chartTeamSelector');
    const canvas = document.getElementById('capacityWaterfallChart');
    const chartContentDiv = document.getElementById('chartContent');

    if (!teamSelectorContainer || !canvas || !chartContentDiv) {
        console.error("Chart inner elements not found."); return;
    }

    teamSelectorContainer.innerHTML = '<strong style="margin-right: 10px;">Select View:</strong>';
    if (typeof currentChartTeamId === 'undefined') { currentChartTeamId = ORG_VIEW_ID; }

    const orgButton = document.createElement('button');
    orgButton.textContent = 'Org View'; orgButton.type = 'button';
    orgButton.style.cssText = `padding: 3px 8px; margin: 0 5px 5px 0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85em;`;
    if (currentChartTeamId === ORG_VIEW_ID) { orgButton.style.backgroundColor = '#007bff'; orgButton.style.color = 'white'; orgButton.style.fontWeight = 'bold'; }
    else { orgButton.style.backgroundColor = '#e9ecef'; orgButton.style.color = '#495057'; }
    orgButton.onclick = () => { currentChartTeamId = ORG_VIEW_ID; generateCapacityWaterfallChart(calculatedMetrics, selectedScenario); };
    teamSelectorContainer.appendChild(orgButton);

    if (currentSystemData && currentSystemData.teams && currentSystemData.teams.length > 0) {
        currentSystemData.teams.forEach(team => {
            const button = document.createElement('button');
            button.textContent = team.teamIdentity || team.teamName; button.type = 'button';
            button.style.cssText = `padding: 3px 8px; margin: 0 5px 5px 0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85em;`;
            if (team.teamId === currentChartTeamId) { button.style.backgroundColor = '#007bff'; button.style.color = 'white'; button.style.fontWeight = 'bold'; }
            else { button.style.backgroundColor = '#e9ecef'; button.style.color = '#495057'; }
            button.onclick = () => { currentChartTeamId = team.teamId; generateCapacityWaterfallChart(calculatedMetrics, selectedScenario); };
            teamSelectorContainer.appendChild(button);
        });
    }

    console.log(`Generating chart for view: ${currentChartTeamId === ORG_VIEW_ID ? 'Org View' : currentChartTeamId}`);

    if (capacityChartInstance) {
        capacityChartInstance.destroy();
        capacityChartInstance = null;
    }

    let viewData;
    let viewLabel;
    if (currentChartTeamId === ORG_VIEW_ID) {
        viewData = calculatedMetrics.totals?.[selectedScenario];
        viewLabel = 'Organization Total';
    } else {
        viewData = calculatedMetrics[currentChartTeamId]?.[selectedScenario];
        viewLabel = getTeamNameById(currentChartTeamId);
    }

    if (!viewData || !viewData.deductionsBreakdown) {
        console.warn(`No metrics/breakdown found for view ${currentChartTeamId} and scenario ${selectedScenario}. Cannot generate chart.`);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
        ctx.fillText(`No data available for ${viewLabel} (${selectedScenario})`, canvas.width / 2, 50);
        return;
    }

    const labels = ['Gross', 'Holidays', 'Org Events', 'Std Leave', 'Var Leave', 'Activities', 'Overhead', 'AI Gain', 'Net Project'];
    const dataValues = [];
    const colors = [];
    const borderColors = [];

    const grossYrs = viewData.grossYrs || 0;
    const holidayYrs = viewData.deductionsBreakdown.holidayYrs || 0;
    const orgEventYrs = viewData.deductionsBreakdown.orgEventYrs || 0;
    const stdLeaveYrs = viewData.deductionsBreakdown.stdLeaveYrs || 0;
    const varLeaveYrs = viewData.deductionsBreakdown.varLeaveYrs || 0;
    const activityYrs = viewData.deductionsBreakdown.teamActivityYrs || 0;
    const overheadYrs = viewData.deductionsBreakdown.overheadYrs || 0;
    const aiGainYrs = viewData.deductionsBreakdown.aiProductivityGainYrs || 0; // New
    const netYrs = viewData.netYrs || 0;

    let currentLevel = 0;

    // Gross Bar
    dataValues.push([currentLevel, grossYrs]);
    colors.push('rgba(75, 192, 192, 0.6)');
    borderColors.push('rgba(75, 192, 192, 1)');
    currentLevel = grossYrs;

    // Deduction Bars
    const deductions = [holidayYrs, orgEventYrs, stdLeaveYrs, varLeaveYrs, activityYrs, overheadYrs];
    const deductionColors = [
        'rgba(255, 99, 132, 0.6)', 'rgba(255, 159, 64, 0.6)', 'rgba(255, 205, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)', 'rgba(201, 203, 207, 0.6)', 'rgba(54, 162, 235, 0.6)'
    ];
    deductions.forEach((deduction, index) => {
        dataValues.push([currentLevel, currentLevel - deduction]);
        colors.push(deductionColors[index % deductionColors.length]);
        borderColors.push(deductionColors[index % deductionColors.length].replace('0.6', '1'));
        currentLevel -= deduction;
    });

    // AI Gain Bar (goes UP)
    dataValues.push([currentLevel, currentLevel + aiGainYrs]);
    colors.push('rgba(40, 167, 69, 0.6)'); // Green for gain
    borderColors.push('rgba(40, 167, 69, 1)');
    currentLevel += aiGainYrs;

    // Final Net Bar
    dataValues.push([0, netYrs]);
    colors.push('rgba(75, 192, 192, 0.6)');
    borderColors.push('rgba(75, 192, 192, 1)');

    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Capacity (SDE Years) - ${viewLabel} (${selectedScenario})`,
                data: dataValues,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 1,
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x',
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, title: { display: true, text: 'Capacity (SDE Years)' } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: `Capacity Waterfall: ${viewLabel} (${selectedScenario})`, padding: { top: 10, bottom: 15 }, font: { size: 16 } },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (Array.isArray(value) && value.length === 2) {
                                const start = value[0];
                                const end = value[1];
                                const change = end - start;
                                if (context.label === 'Gross' || context.label === 'Net Project') {
                                    label += `${end.toFixed(2)} SDE Yrs`;
                                } else if (context.label === 'AI Gain') {
                                    label += `+${change.toFixed(2)} SDE Yrs`;
                                } else {
                                    label += `${change.toFixed(2)} SDE Yrs`;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };

    const ctx = canvas.getContext('2d');
    capacityChartInstance = new Chart(ctx, config);

    console.log("Waterfall chart generated successfully.");
}
window.generateCapacityWaterfallChart = generateCapacityWaterfallChart;


/**
 * REVISED - Handles saving the capacity configuration.
 */
async function saveCapacityConfiguration() {
    console.log("Attempting to save capacity configuration (including calculated metrics)...");
    if (!currentSystemData || !currentSystemData.systemName) {
        window.notificationManager.showToast("Cannot save configuration: No system data loaded or system name is missing.", 'error');
        return;
    }

    const systemNameKey = currentSystemData.systemName;

    const workingDays = currentSystemData.capacityConfiguration?.workingDaysPerYear;
    if (workingDays === undefined || workingDays === null || workingDays <= 0) {
        if (!await window.notificationManager.confirm(`Warning: 'Standard Working Days Per Year' (${workingDays}) is not set or is invalid. Calculations might be incorrect. Save anyway?`, 'Invalid Configuration', { confirmStyle: 'warning' })) {
            const wdInput = document.getElementById('workingDaysInput');
            if (wdInput) wdInput.focus();
            return;
        }
    }

    try {
        console.log("Calculating metrics before saving...");
        const calculatedMetrics = calculateAllCapacityMetrics();
        if (calculatedMetrics) {
            currentSystemData.calculatedCapacityMetrics = calculatedMetrics;
            console.log("Stored calculated metrics in currentSystemData.calculatedCapacityMetrics.");
        } else {
            console.error("Failed to calculate metrics, calculatedCapacityMetrics will not be updated in saved data.");
        }

        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        systems[systemNameKey] = currentSystemData;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        window.notificationManager.showToast(`Capacity configuration for system "${systemNameKey}" saved successfully.`, 'success');
        console.log("Capacity configuration (with calculated metrics) saved.");

    } catch (error) {
        console.error("Error during saveCapacityConfiguration:", error);
        window.notificationManager.showToast("An error occurred while trying to save the capacity configuration. Check console.", 'error');
    }
}
window.saveCapacityConfiguration = saveCapacityConfiguration;

/**
 * REVISED - Generates the forms for team-specific constraints, now including AI Productivity Gain.
 */
function generateTeamConstraintsForms() {
    console.log("Generating Team Constraints Forms (AI-Aware with Productivity Gain)...");
    const container = document.getElementById('capacityConfigView');
    if (!container) { console.error("Container #capacityConfigView not found."); return; }
    if (!currentSystemData || !currentSystemData.teams || !currentSystemData.capacityConfiguration?.leaveTypes) { console.error("Missing teams or global leaveTypes data."); return; }

    let teamsSection = document.getElementById('teamConstraintsSection');
    if (!teamsSection) {
        teamsSection = document.createElement('div');
        teamsSection.id = 'teamConstraintsSection';
        teamsSection.style.border = '1px solid #ccc';
        teamsSection.style.padding = '15px';
        teamsSection.style.marginTop = '20px';
        const teamsTitle = document.createElement('h3');
        teamsTitle.textContent = 'Team-Specific Adjustments';
        teamsSection.appendChild(teamsTitle);
        container.appendChild(teamsSection);
    } else {
        const teamContainers = teamsSection.querySelectorAll('.team-constraint-container');
        teamContainers.forEach(tc => tc.remove());
    }

    const teams = currentSystemData.teams || [];
    const globalLeaveTypes = currentSystemData.capacityConfiguration.leaveTypes || [];

    const updateTotalStdLeaveDisplay = (teamIndex) => {
        const teamContainer = document.getElementById(`teamConstraintContainer_${teamIndex}`); if (!teamContainer) return; const totalDisplayElement = teamContainer.querySelector('.total-std-leave-display'); if (!totalDisplayElement) return; const team = currentSystemData.teams[teamIndex]; if (!team?.teamCapacityAdjustments?.leaveUptakeEstimates) return; let totalEffectiveDays = 0; globalLeaveTypes.forEach(leaveType => { if (!leaveType || !leaveType.id) return; const currentGlobalDefaultObj = currentSystemData.capacityConfiguration.leaveTypes.find(lt => lt.id === leaveType.id); const globalDefault = currentGlobalDefaultObj ? (currentGlobalDefaultObj.defaultEstimatedDays || 0) : 0; const teamUptake = team.teamCapacityAdjustments.leaveUptakeEstimates.find(est => est.leaveTypeId === leaveType.id); const uptakePercent = teamUptake ? (teamUptake.estimatedUptakePercent ?? 100) : 100; totalEffectiveDays += globalDefault * (uptakePercent / 100); }); totalDisplayElement.textContent = totalEffectiveDays.toFixed(1);
    };

    const updateVariableLeaveTotalDisplay = (teamIndex, leaveKey) => {
        const teamContainer = document.getElementById(`teamConstraintContainer_${teamIndex}`); if (!teamContainer) { console.warn(`updateVariableLeaveTotalDisplay: Cannot find container for team ${teamIndex}`); return; } const totalDisplayElement = teamContainer.querySelector(`.variable-leave-total-display[data-leave-key="${leaveKey}"]`); if (!totalDisplayElement) { console.warn(`updateVariableLeaveTotalDisplay: Cannot find total display span for team ${teamIndex}, key ${leaveKey}`); return; } const team = currentSystemData.teams[teamIndex]; const impact = team?.teamCapacityAdjustments?.variableLeaveImpact?.[leaveKey]; if (impact) { const affectedSDEs = impact.affectedSDEs ?? 0; const avgDays = impact.avgDaysPerAffectedSDE ?? 0; const totalDays = affectedSDEs * avgDays; totalDisplayElement.textContent = totalDays.toFixed(0); } else { totalDisplayElement.textContent = '0'; }
    };

    const renderTeamActivitiesTable = (teamIndex, targetContainer) => {
        console.log(`Rendering SIMPLIFIED team activities table for team index ${teamIndex}`);
        targetContainer.innerHTML = '';

        const team = currentSystemData.teams[teamIndex];
        if (!team?.teamCapacityAdjustments?.teamActivities) {
            if (team?.teamCapacityAdjustments) { team.teamCapacityAdjustments.teamActivities = []; }
            else { console.warn("Cannot render activities, missing teamCapacityAdjustments for team:", teamIndex); return; }
        }

        const activitiesTable = document.createElement('table');
        activitiesTable.style.width = '100%';
        activitiesTable.style.fontSize = '0.9em';
        activitiesTable.style.borderCollapse = 'collapse';
        activitiesTable.innerHTML = `
            <thead style="background-color: #f8f9fa;">
                <tr>
                    <th style="border: 1px solid #ccc; padding: 4px; width: 40%;">Activity Name</th>
                    <th style="border: 1px solid #ccc; padding: 4px; width: 20%;">Type</th>
                    <th style="border: 1px solid #ccc; padding: 4px; width: 20%;" title="Estimate per SDE or as a total for the team">Est. Type</th>
                    <th style="border: 1px solid #ccc; padding: 4px; width: 10%;" title="'Days/SDE' = Enter average days per SDE.\n'Total Team Days' = Enter total days impact for the whole team.">Value</th>
                    <th style="border: 1px solid #ccc; padding: 4px; width: 10%;">Action</th>
                </tr>
            </thead>
            <tbody></tbody>`;
        const activitiesTbody = activitiesTable.querySelector('tbody');

        team.teamCapacityAdjustments.teamActivities.forEach((activity, activityIndex) => {
            const row = activitiesTbody.insertRow();
            row.style.borderBottom = '1px solid #eee';

            const createCell = (elementType = 'input', attributes = {}, styles = {}, options = null) => {
                const cell = row.insertCell(); const element = document.createElement(elementType); for (const attr in attributes) { element[attr] = attributes[attr]; } for (const style in styles) { element.style[style] = styles[style]; } if (elementType === 'select' && options) { options.forEach(opt => element.add(new Option(opt.text, opt.value))); }
                element.onchange = (e) => {
                    const field = e.target.name; let value = e.target.value; if (e.target.type === 'number') value = parseFloat(value) || 0;
                    activity[field] = value; console.log(`Updated activity[${activityIndex}].${field} to ${value}`);
                    if (field === 'estimateType') {
                        const valueInput = row.querySelector('input[name="value"]');
                        if (valueInput) valueInput.title = value === 'perSDE' ? 'Enter average days per SDE.' : 'Enter total days for the entire team activity.';
                    }
                    updateCapacityCalculationsAndDisplay();
                };
                cell.appendChild(element); return element;
            };

            createCell('input', { type: 'text', value: activity.name || '', name: 'name', placeholder: 'e.g., AWS Training' }, { width: '95%' });
            createCell('input', { type: 'text', value: activity.type || '', name: 'type', placeholder: 'Optional' }, { width: '90%' });
            createCell('select', { value: activity.estimateType || 'perSDE', name: 'estimateType', title: 'Estimate per SDE or as a total for the team' }, { width: '95%' }, [{ text: 'Days/SDE', value: 'perSDE' }, { text: 'Total Team Days', value: 'total' }]);
            const initialValueTitle = (activity.estimateType === 'total') ? 'Enter total days for the entire team activity.' : 'Enter average days per SDE.';
            createCell('input', { type: 'number', value: activity.value || 0, name: 'value', min: '0', step: '0.5', title: initialValueTitle }, { width: '70px', textAlign: 'right' });

            const actionCell = row.insertCell(); actionCell.style.textAlign = 'center';
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X'; removeBtn.title = 'Remove Activity'; removeBtn.style.color = 'red'; removeBtn.style.fontSize = '0.8em'; removeBtn.style.padding = '1px 4px';
            removeBtn.onclick = () => {
                team.teamCapacityAdjustments.teamActivities.splice(activityIndex, 1);
                renderTeamActivitiesTable(teamIndex, targetContainer);
                updateCapacityCalculationsAndDisplay();
            };
            actionCell.appendChild(removeBtn);
        });

        targetContainer.appendChild(activitiesTable);

        const addActivityBtn = document.createElement('button');
        addActivityBtn.textContent = 'Add Team Activity'; addActivityBtn.style.marginTop = '5px';
        addActivityBtn.onclick = () => {
            if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = [];
            team.teamCapacityAdjustments.teamActivities.push({ id: `act-${teamIndex}-${Date.now()}`, name: '', type: '', estimateType: 'perSDE', value: 0 });
            renderTeamActivitiesTable(teamIndex, targetContainer);
        };
        targetContainer.appendChild(addActivityBtn);
    };

    const renderTeamConstraintDetails = (teamIndex, detailsContainer) => {
        console.log(`Rendering details for team index ${teamIndex}`);
        detailsContainer.innerHTML = '';
        const team = currentSystemData.teams[teamIndex]; if (!team) return;
        if (!team.teamCapacityAdjustments) {
            team.teamCapacityAdjustments = { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 } }, teamActivities: [], recurringOverhead: [], aiProductivityGainPercent: 0 };
        } else {
            if (!team.teamCapacityAdjustments.leaveUptakeEstimates) team.teamCapacityAdjustments.leaveUptakeEstimates = [];
            if (!team.teamCapacityAdjustments.variableLeaveImpact) team.teamCapacityAdjustments.variableLeaveImpact = { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 } };
            if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = [];
            if (!team.teamCapacityAdjustments.recurringOverhead) team.teamCapacityAdjustments.recurringOverhead = [];
            if (team.teamCapacityAdjustments.aiProductivityGainPercent === undefined) team.teamCapacityAdjustments.aiProductivityGainPercent = 0; // Backward compatibility
            const varLeave = team.teamCapacityAdjustments.variableLeaveImpact;
            if (!varLeave.maternity) varLeave.maternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.paternity) varLeave.paternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.familyResp) varLeave.familyResp = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.medical) varLeave.medical = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
        }

        const stdLeaveTitle = document.createElement('h5'); stdLeaveTitle.textContent = 'Standard Leave Uptake Estimate (%)'; stdLeaveTitle.style.marginTop = '10px'; stdLeaveTitle.title = 'Estimate % of Org Default leave days taken per SDE (e.g., 80%). Blank=100%. Affects Annual, Sick, Study, etc.'; detailsContainer.appendChild(stdLeaveTitle); const stdLeaveTable = document.createElement('table'); stdLeaveTable.style.marginLeft = '20px'; stdLeaveTable.style.width = 'auto';
        stdLeaveTable.innerHTML = `<thead> <tr> <th style="text-align: left; padding: 4px 8px;">Leave Type</th> <th style="text-align: center; padding: 4px 8px;" title="Estimated % uptake for this team (0-100). Blank=100%">Team Uptake (%)</th> <th style="text-align: center; padding: 4px 8px;" title="Calculated Effective Days/SDE (Default * Uptake %)">Effective Days/SDE</th> </tr> </thead> <tbody></tbody>`;
        const stdLeaveTbody = stdLeaveTable.querySelector('tbody'); detailsContainer.appendChild(stdLeaveTable); const totalStdLeaveDiv = document.createElement('div'); totalStdLeaveDiv.style.marginLeft = '20px'; totalStdLeaveDiv.style.marginTop = '5px'; totalStdLeaveDiv.style.fontWeight = 'bold'; totalStdLeaveDiv.innerHTML = `Total Avg. Standard Leave Days/SDE: <span class="total-std-leave-display">0.0</span>`; detailsContainer.appendChild(totalStdLeaveDiv);
        let teamTotalAvgStdLeave = 0;
        globalLeaveTypes.forEach(leaveType => {
            if (!leaveType || !leaveType.id) return;
            const currentGlobalDefaultObj = currentSystemData.capacityConfiguration.leaveTypes.find(lt => lt.id === leaveType.id); const globalDefault = currentGlobalDefaultObj ? (currentGlobalDefaultObj.defaultEstimatedDays || 0) : 0;
            const teamUptakeObj = team.teamCapacityAdjustments.leaveUptakeEstimates.find(est => est.leaveTypeId === leaveType.id); const teamUptakePercentValue = teamUptakeObj ? (teamUptakeObj.estimatedUptakePercent ?? '') : ''; const displayUptakePercent = teamUptakeObj ? (teamUptakeObj.estimatedUptakePercent ?? 100) : 100; const effectiveDays = globalDefault * (displayUptakePercent / 100); teamTotalAvgStdLeave += effectiveDays;
            const row = stdLeaveTbody.insertRow(); row.insertCell().textContent = leaveType.name;
            const percentCell = row.insertCell(); percentCell.style.textAlign = 'center'; const percentInput = document.createElement('input'); percentInput.type = 'number'; percentInput.min = '0'; percentInput.max = '100'; percentInput.step = '5'; percentInput.value = teamUptakePercentValue; percentInput.placeholder = '100'; percentInput.style.width = '60px'; percentInput.style.textAlign = 'center'; percentInput.title = `Enter % uptake (0-100) for ${leaveType.name}. Blank means 100% of default: ${globalDefault}`; percentInput.setAttribute('data-leave-type-id', leaveType.id); percentInput.setAttribute('data-team-index', teamIndex); const effectiveDaysCell = row.insertCell(); effectiveDaysCell.id = `effectiveDays_${teamIndex}_${leaveType.id}`; effectiveDaysCell.textContent = effectiveDays.toFixed(1); effectiveDaysCell.style.textAlign = 'center'; effectiveDaysCell.style.fontWeight = 'bold';
            percentInput.addEventListener('change', (e) => {
                const inputVal = e.target.value.trim();
                const lTypeId = e.target.getAttribute('data-leave-type-id');
                const tIdx = parseInt(e.target.getAttribute('data-team-index'));
                const targetTeam = currentSystemData.teams[tIdx];
                if (!targetTeam?.teamCapacityAdjustments?.leaveUptakeEstimates) return;

                const estimateIndex = targetTeam.teamCapacityAdjustments.leaveUptakeEstimates.findIndex(est => est.leaveTypeId === lTypeId);
                let validatedPercent = 100;

                if (inputVal !== '') {
                    const numericVal = parseInt(inputVal);
                    if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 100) {
                        validatedPercent = numericVal;
                    } else {
                        const previousEstimate = (estimateIndex > -1) ? targetTeam.teamCapacityAdjustments.leaveUptakeEstimates[estimateIndex] : null;
                        e.target.value = previousEstimate ? (previousEstimate.estimatedUptakePercent ?? '') : '';
                        validatedPercent = previousEstimate ? (previousEstimate.estimatedUptakePercent ?? 100) : 100;
                    }
                }

                if (inputVal === '' || validatedPercent === 100) {
                    if (estimateIndex > -1) {
                        targetTeam.teamCapacityAdjustments.leaveUptakeEstimates.splice(estimateIndex, 1);
                        console.log(`Removed leave uptake entry for team ${tIdx}, type ${lTypeId}`);
                    }
                    e.target.value = '';
                    validatedPercent = 100;
                } else {
                    if (estimateIndex > -1) {
                        targetTeam.teamCapacityAdjustments.leaveUptakeEstimates[estimateIndex].estimatedUptakePercent = validatedPercent;
                        console.log(`Updated leave uptake for team ${tIdx}, type ${lTypeId} to ${validatedPercent}%`);
                    } else {
                        targetTeam.teamCapacityAdjustments.leaveUptakeEstimates.push({ leaveTypeId: lTypeId, estimatedUptakePercent: validatedPercent });
                        console.log(`Added leave uptake for team ${tIdx}, type ${lTypeId} as ${validatedPercent}%`);
                    }
                    e.target.value = validatedPercent;
                }

                const currentDefaultObj = currentSystemData.capacityConfiguration.leaveTypes.find(lt => lt.id === lTypeId);
                const currentDefaultVal = currentDefaultObj ? (currentDefaultObj.defaultEstimatedDays || 0) : 0;
                const effectiveCell = document.getElementById(`effectiveDays_${tIdx}_${lTypeId}`);
                if (effectiveCell) effectiveCell.textContent = (currentDefaultVal * (validatedPercent / 100)).toFixed(1);

                updateTotalStdLeaveDisplay(tIdx);
                updateCapacityCalculationsAndDisplay();
            });
            percentCell.appendChild(percentInput);
        });
        const totalDisplaySpan = totalStdLeaveDiv.querySelector('.total-std-leave-display'); if (totalDisplaySpan) totalDisplaySpan.textContent = teamTotalAvgStdLeave.toFixed(1);

        const varLeaveTitle = document.createElement('h5'); varLeaveTitle.textContent = 'Variable Leave Impact Estimate'; varLeaveTitle.style.marginTop = '15px'; varLeaveTitle.title = 'Estimate the total impact ON THE TEAM for variable leave (Maternity, Paternity, etc.). Enter # SDEs affected and Avg Days/SDE for each.'; detailsContainer.appendChild(varLeaveTitle); const varLeaveContainer = document.createElement('div'); varLeaveContainer.style.marginLeft = '20px';
        const handleVariableLeaveInputChange = (e) => { const input = e.target; const tIdx = parseInt(input.getAttribute('data-team-index')); const leaveKey = input.getAttribute('data-leave-key'); const field = input.getAttribute('data-field'); const targetTeam = currentSystemData.teams[tIdx]; if (!targetTeam?.teamCapacityAdjustments?.variableLeaveImpact?.[leaveKey] || !field) return; const value = parseInt(input.value); const validatedValue = (!isNaN(value) && value >= 0) ? value : 0; targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey][field] = validatedValue; input.value = validatedValue; console.log(`Updated ${leaveKey}.${field} for team ${tIdx} to ${validatedValue}`); updateVariableLeaveTotalDisplay(tIdx, leaveKey); updateCapacityCalculationsAndDisplay(); };
        const createVarLeaveInputRow = (targetTeam, leaveKey, labelText) => { const div = document.createElement('div'); div.style.marginBottom = '5px'; div.style.display = 'flex'; div.style.alignItems = 'center'; const label = document.createElement('label'); label.textContent = `${labelText}: `; label.style.width = '180px'; label.style.marginRight = '10px'; div.appendChild(label); const sdesInput = document.createElement('input'); sdesInput.type = 'number'; sdesInput.min = '0'; sdesInput.step = '1'; sdesInput.value = targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey]?.affectedSDEs || 0; sdesInput.style.width = '60px'; sdesInput.style.marginRight = '5px'; sdesInput.title = '# SDEs Affected'; sdesInput.setAttribute('data-team-index', teamIndex); sdesInput.setAttribute('data-leave-key', leaveKey); sdesInput.setAttribute('data-field', 'affectedSDEs'); sdesInput.addEventListener('change', handleVariableLeaveInputChange); div.appendChild(sdesInput); div.appendChild(document.createTextNode(' SDEs * ')); const daysInput = document.createElement('input'); daysInput.type = 'number'; daysInput.min = '0'; daysInput.step = '1'; daysInput.value = targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey]?.avgDaysPerAffectedSDE || 0; daysInput.style.width = '60px'; daysInput.style.marginRight = '10px'; daysInput.title = 'Avg. Days per Affected SDE'; daysInput.setAttribute('data-team-index', teamIndex); daysInput.setAttribute('data-leave-key', leaveKey); daysInput.setAttribute('data-field', 'avgDaysPerAffectedSDE'); daysInput.addEventListener('change', handleVariableLeaveInputChange); div.appendChild(daysInput); div.appendChild(document.createTextNode(' Days/SDE = ')); const totalDisplay = document.createElement('span'); totalDisplay.className = 'variable-leave-total-display'; totalDisplay.setAttribute('data-leave-key', leaveKey); totalDisplay.style.fontWeight = 'bold'; totalDisplay.style.minWidth = '40px'; totalDisplay.style.display = 'inline-block'; const initialTotal = (sdesInput.valueAsNumber || 0) * (daysInput.valueAsNumber || 0); totalDisplay.textContent = initialTotal.toFixed(0); div.appendChild(totalDisplay); div.appendChild(document.createTextNode(' Total SDE Days')); return div; };
        varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'maternity', 'Maternity Leave')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'paternity', 'Paternity Leave')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'familyResp', 'Family Responsibility')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'medical', 'Medical Leave')); detailsContainer.appendChild(varLeaveContainer);

        const activitiesTitle = document.createElement('h5');
        activitiesTitle.textContent = 'Team Activities (Training, Conferences, etc.)';
        activitiesTitle.style.marginTop = '15px';
        activitiesTitle.title = 'Estimate impact of non-recurring team-specific activities.';
        detailsContainer.appendChild(activitiesTitle);
        const activitiesContainer = document.createElement('div');
        activitiesContainer.style.marginLeft = '20px';
        activitiesContainer.id = `teamActivitiesContainer_${teamIndex}`;
        renderTeamActivitiesTable(teamIndex, activitiesContainer);
        detailsContainer.appendChild(activitiesContainer);

        const overheadTitle = document.createElement('h5');
        overheadTitle.textContent = 'Recurring Overhead (Meetings, etc.)';
        overheadTitle.style.marginTop = '15px';
        detailsContainer.appendChild(overheadTitle);

        const overheadContainer = document.createElement('div');
        overheadContainer.style.marginLeft = '20px';

        const overheadLabel = document.createElement('label');
        overheadLabel.htmlFor = `avgOverheadHrs_${teamIndex}`;
        overheadLabel.textContent = 'Avg. Overhead (Hrs/Week/SDE): ';
        overheadLabel.title = 'Estimate the average hours PER SDE PER WEEK spent on ALL recurring activities (standups, planning, retros, 1:1s, syncs, admin, etc.)';
        overheadLabel.style.display = 'inline-block';
        overheadLabel.style.marginRight = '10px';

        const overheadInput = document.createElement('input');
        overheadInput.type = 'number';
        overheadInput.id = `avgOverheadHrs_${teamIndex}`;
        overheadInput.min = '0';
        overheadInput.step = '0.5';
        overheadInput.value = team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE || 0;
        overheadInput.style.width = '70px';
        overheadInput.dataset.originalTitle = overheadLabel.title;
        overheadInput.setAttribute('data-team-index', teamIndex);

        overheadInput.addEventListener('change', (e) => {
            const tIdx = parseInt(e.target.getAttribute('data-team-index'));
            const targetTeam = currentSystemData.teams[tIdx];
            if (!targetTeam?.teamCapacityAdjustments) return;

            const value = parseFloat(e.target.value);
            const validatedValue = (!isNaN(value) && value >= 0) ? value : 0;
            let warningMsg = '';

            targetTeam.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE = validatedValue;
            e.target.value = validatedValue.toFixed(1);
            console.log(`Updated avgOverheadHoursPerWeekPerSDE for team ${tIdx} to ${validatedValue}`);

            if (validatedValue > 40) {
                warningMsg = 'Value exceeds 40 Hrs/Week/SDE. Is this realistic?';
            }

            updateInputWarning(e.target, warningMsg);
            updateCapacityCalculationsAndDisplay();
        });

        overheadContainer.appendChild(overheadLabel);
        overheadContainer.appendChild(overheadInput);
        detailsContainer.appendChild(overheadContainer);
        updateInputWarning(overheadInput, (parseFloat(overheadInput.value) > 40) ? 'Value exceeds 40 Hrs/Week/SDE. Is this realistic?' : '');

        // --- NEW: AI Productivity Gain Section ---
        const productivityTitle = document.createElement('h5');
        productivityTitle.textContent = 'AI Tooling Productivity';
        productivityTitle.style.marginTop = '15px';
        detailsContainer.appendChild(productivityTitle);

        const productivityContainer = document.createElement('div');
        productivityContainer.style.marginLeft = '20px';

        const productivityLabel = document.createElement('label');
        productivityLabel.htmlFor = `aiProductivityGain_${teamIndex}`;
        productivityLabel.textContent = 'Productivity Gain from AI Tools (%): ';
        productivityLabel.title = 'Estimate the percentage of productivity gain for HUMAN engineers on this team from using AI-assisted tools (e.g., Copilot, internal AI platforms). This gain is applied after all capacity sinks are deducted.';
        productivityLabel.style.display = 'inline-block';
        productivityLabel.style.marginRight = '10px';

        const productivityInput = document.createElement('input');
        productivityInput.type = 'number';
        productivityInput.id = `aiProductivityGain_${teamIndex}`;
        productivityInput.min = '0';
        productivityInput.step = '1';
        productivityInput.value = team.teamCapacityAdjustments.aiProductivityGainPercent || 0;
        productivityInput.style.width = '70px';
        productivityInput.setAttribute('data-team-index', teamIndex);

        productivityInput.addEventListener('change', (e) => {
            const tIdx = parseInt(e.target.getAttribute('data-team-index'));
            const targetTeam = currentSystemData.teams[tIdx];
            if (!targetTeam?.teamCapacityAdjustments) return;

            const value = parseFloat(e.target.value) || 0;
            targetTeam.teamCapacityAdjustments.aiProductivityGainPercent = value;
            e.target.value = value;
            console.log(`Updated aiProductivityGainPercent for team ${tIdx} to ${value}`);
            updateCapacityCalculationsAndDisplay();
        });

        productivityContainer.appendChild(productivityLabel);
        productivityContainer.appendChild(productivityInput);
        detailsContainer.appendChild(productivityContainer);
        // --- END NEW SECTION ---
    };

    teams.forEach((team, teamIndex) => {
        if (!team || !team.teamId) return;
        const teamContainer = document.createElement('div'); teamContainer.id = `teamConstraintContainer_${teamIndex}`; teamContainer.className = 'team-constraint-container'; teamContainer.style.borderTop = '1px solid #ccc'; teamContainer.style.paddingTop = '10px'; teamContainer.style.marginTop = '10px'; const teamHeader = document.createElement('h4'); teamHeader.style.cursor = 'pointer'; teamHeader.style.backgroundColor = '#f8f9fa'; teamHeader.style.padding = '8px'; teamHeader.style.margin = '0'; teamHeader.title = `Click to expand/collapse settings for ${team.teamName || team.teamIdentity}`; const indicator = document.createElement('span'); indicator.id = `teamConstraintToggle_${teamIndex}`; indicator.className = 'toggle-indicator'; indicator.innerText = '(+) '; indicator.style.fontWeight = 'bold'; indicator.style.marginRight = '5px'; teamHeader.appendChild(indicator); teamHeader.appendChild(document.createTextNode(`Team: ${team.teamIdentity || team.teamName || team.teamId}`)); teamContainer.appendChild(teamHeader); const teamDetails = document.createElement('div'); teamDetails.id = `teamConstraintContent_${teamIndex}`; teamDetails.style.display = 'none'; teamDetails.style.padding = '10px'; teamDetails.style.border = '1px solid #eee'; teamDetails.style.borderTop = 'none';
        teamHeader.onclick = () => {
            const contentDiv = teamDetails; const indicatorSpan = indicator; const isHidden = contentDiv.style.display === 'none' || contentDiv.style.display === ''; if (isHidden) { renderTeamConstraintDetails(teamIndex, contentDiv); contentDiv.style.display = 'block'; indicatorSpan.textContent = '(-)'; } else { contentDiv.style.display = 'none'; indicatorSpan.textContent = '(+)'; contentDiv.innerHTML = ''; }
        };
        teamContainer.appendChild(teamDetails); teamsSection.appendChild(teamContainer);
    });

    let summarySection = document.getElementById('capacitySummarySection');
    if (!summarySection) {
        summarySection = document.createElement('div');
        summarySection.id = 'capacitySummarySection';
        summarySection.style.border = '1px solid #666';
        summarySection.style.backgroundColor = '#f0f0f0';
        summarySection.style.padding = '15px';
        summarySection.style.marginTop = '20px';
        const summaryTitle = document.createElement('h3');
        summaryTitle.textContent = 'Calculated Net Project Capacity Summary';
        summarySection.appendChild(summaryTitle);
        const summaryPlaceholder = document.createElement('p');
        summaryPlaceholder.id = 'capacitySummaryPlaceholder';
        summaryPlaceholder.textContent = '';
        summaryPlaceholder.style.fontStyle = 'italic'; summarySection.appendChild(summaryPlaceholder);
        container.appendChild(summarySection);
    } else {
        const placeholder = summarySection.querySelector('#capacitySummaryPlaceholder');
        if (placeholder) placeholder.style.display = 'block';
        const table = summarySection.querySelector('table');
        if (table) table.style.display = 'none';
    }

    let saveButtonContainer = document.getElementById('capacitySaveButtonContainer');
    if (!saveButtonContainer) {
        saveButtonContainer = document.createElement('div');
        saveButtonContainer.id = 'capacitySaveButtonContainer';
        saveButtonContainer.style.textAlign = 'center';
        saveButtonContainer.style.marginTop = '25px';
        const saveButton = document.createElement('button');
        saveButton.id = 'saveCapacityConfigButton';
        saveButton.textContent = 'Save All Capacity Configuration';
        saveButton.className = 'btn-primary';
        saveButton.style.cursor = 'pointer';
        saveButton.onclick = saveCapacityConfiguration;
        saveButtonContainer.appendChild(saveButton);
        container.appendChild(saveButtonContainer);
    }

    console.log("Finished setting up Team Constraints structure (AI-Aware with Productivity Gain).");
}
window.generateTeamConstraintsForms = generateTeamConstraintsForms;

/**
 * REVISED - Helper function to format the deduction breakdown, now including the AI gain.
 */
function formatDeductionTooltip(breakdown) {
    if (!breakdown) {
        return "Breakdown not available.";
    }
    const stdLeave = breakdown.stdLeaveYrs || 0;
    const varLeave = breakdown.varLeaveYrs || 0;
    const holidays = breakdown.holidayYrs || 0;
    const orgEvents = breakdown.orgEventYrs || 0;
    const teamActs = breakdown.teamActivityYrs || 0;
    const overhead = breakdown.overheadYrs || 0;
    const aiGain = breakdown.aiProductivityGainYrs || 0;

    let tooltipString = `Deductions (SDE Yrs):\n` +
        `  Std Leave: -${stdLeave.toFixed(2)}\n` +
        `  Var Leave: -${varLeave.toFixed(2)}\n` +
        `  Holidays: -${holidays.toFixed(2)}\n` +
        `  Org Events: -${orgEvents.toFixed(2)}\n` +
        `  Team Acts: -${teamActs.toFixed(2)}\n` +
        `  Overhead: -${overhead.toFixed(2)}`;

    if (aiGain > 0) {
        tooltipString += `\n\nGains (SDE Yrs):\n` +
            `  AI Productivity: +${aiGain.toFixed(2)}`;
    }

    return tooltipString;
}
// --- End Helper ---



