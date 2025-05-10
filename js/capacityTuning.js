/** NEW Function - Shows the Capacity Configuration View */
function showCapacityConfigView() {
    console.log("Switching to Capacity Configuration View (Focus Mode)...");
    if (!currentSystemData) {
        alert("Please load a system first.");
        return;
    }
    const container = document.getElementById('capacityConfigView');
    if (!container) {
        console.error("Cannot generate global constraints form: Container #capacityConfigView not found.");
        return;
    }

    // Use switchView to handle view transition and UI elements
    switchView('capacityConfigView'); // Pass the ID of the new view container

    generateGlobalConstraintsForm();
    generateTeamConstraintsForms();    
    // ---------------------------

    // Placeholder for future content generation
    console.log("Capacity Config View displayed. Content generation will be added in next phase.");
    // (Phase 5+)
    updateCapacityCalculationsAndDisplay();

}
// Make it globally accessible for the button's onclick
window.showCapacityConfigView = showCapacityConfigView;

/**
 * Generates the form elements for global capacity constraints.
 * Fixes tbody lookup issue in renderOrgEvents.
 */
function generateGlobalConstraintsForm() {
    console.log("Generating Global Constraints Form (Fix 1)...");
    const container = document.getElementById('capacityConfigView');
    if (!container) {
        console.error("Cannot generate global constraints form: Container #capacityConfigView not found.");
        return;
    }
    if (!currentSystemData || !currentSystemData.capacityConfiguration) {
         console.error("Cannot generate global constraints form: Missing currentSystemData.capacityConfiguration.");
         container.innerHTML = '<p style="color:red;">Error: Capacity configuration data missing in the loaded system.</p>';
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
        console.log("Creating #globalConstraintsSection div...");
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
        console.log("Clearing existing content within #globalConstraintsSection (keeping title)...");
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
        if (!tbodyElement) {console.error("Org events tbody not found for rendering"); return;}
        tbodyElement.innerHTML = '';
        // Access the array safely AFTER the check/init above
        const events = currentSystemData.capacityConfiguration.globalConstraints.orgEvents;
        console.log("[DEBUG] Rendering org events table with data:", JSON.stringify(events)); // Add log to see data used for render
    
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
                console.log(`Attempting to remove org event at index ${index}`);
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
         if(orgEventsTbody) renderOrgEvents(orgEventsTbody);
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
    if(tbodyLeave) {
        (currentSystemData.capacityConfiguration.leaveTypes || []).forEach(leaveType => {
            if(!leaveType) return; // Skip if invalid
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
    console.log("Finished generating Global Constraints Form.");
}
window.generateGlobalConstraintsForm = generateGlobalConstraintsForm; // Make global if needed

/**
 * REVISED (Phase 7b fix 6) - Calculates capacity metrics for all teams across all scenarios.
 * - Includes required helper functions.
 * - Calculates SDE Year contribution for each deduction category directly.
 * - CORRECTED Team Activity calculation for 'Total Team Days' type inputs per user interpretation.
 */
function calculateAllCapacityMetrics() {
    console.log("Calculating all capacity metrics (Phase 7b - Fix 6)..."); // Log updated
    if (!currentSystemData || !currentSystemData.capacityConfiguration || !currentSystemData.teams) {
        console.error("Cannot calculate metrics: Missing core data (config or teams).");
        return { totals: { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} } };
    }

    const capacityConfig = currentSystemData.capacityConfiguration;
    const teams = currentSystemData.teams;
    const workingDaysPerYear = capacityConfig.workingDaysPerYear || 261;
    const sdesPerSdeYear = 1; // Base assumption
    const globalLeaveTypes = capacityConfig.leaveTypes || [];
    const workingDays = workingDaysPerYear || 1; // Use for division, avoid zero

    const teamMetrics = {};
    const totals = {
        TeamBIS: { headcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
        EffectiveBIS: { headcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
        FundedHC: { headcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} }
    };
     // Initialize total breakdowns
     ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
        totals[scenario].deductionsBreakdown = {
            stdLeaveYrs: 0, varLeaveYrs: 0, holidayYrs: 0,
            orgEventYrs: 0, teamActivityYrs: 0, overheadYrs: 0
        };
     });


    // --- Iterate through each team ---
    (teams || []).forEach(team => {
        if (!team || !team.teamId) return;
        teamMetrics[team.teamId] = { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} };

        // --- Pre-calculate per-SDE values and total team days using helpers ---
        const stdLeave_days_per_sde = calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
        const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
        const orgEvents_days_per_sde = calculateOrgEventDaysPerSDE(capacityConfig);
        const overhead_days_per_sde = calculateOverheadDaysPerSDE(team, workingDaysPerYear);
        const variable_leave_total_team_days = calculateTotalVariableLeaveDays(team);
        // Get { daysPerSDE: total_avg_days, totalTeamDaysDuration: duration_for_whole_team_event }
        const teamActivityImpacts = calculateTeamActivityImpacts(team);

        // --- Iterate through each scenario for this team ---
        ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
            let headcount = 0;
            switch (scenario) {
                case 'TeamBIS': headcount = team?.buildersInSeats || 0; break;
                case 'EffectiveBIS': headcount = (team?.buildersInSeats || 0) + (team?.awayTeamMembers?.length || 0); break;
                case 'FundedHC': headcount = team?.fundedHeadcount || 0; break;
            }

            // --- Calculate SDE Year impact for EACH category for THIS scenario ---

            // Calculate SDE Years impact from the duration specified for 'Total Team Days' type activities
            // This impact applies to *each* SDE in the current scenario's headcount
            const teamActivityYrs_from_total_duration = (teamActivityImpacts.totalTeamDaysDuration / workingDays) * headcount;

            // Calculate SDE Years impact from the average specified for 'Days/SDE' type activities
            // This impact is an average and not scaled by headcount again
            const teamActivityYrs_from_perSDE_avg = teamActivityImpacts.daysPerSDE / workingDays;

            const breakdown = {
                stdLeaveYrs: (stdLeave_days_per_sde / workingDays) * headcount,
                varLeaveYrs: variable_leave_total_team_days / workingDays, // Direct conversion from total days
                holidayYrs: (holidays_days_per_sde / workingDays) * headcount,
                orgEventYrs: (orgEvents_days_per_sde / workingDays) * headcount,
                // *** CORRECTED LOGIC for Team Activities (Fix 6) ***
                // Add the impact from events affecting the whole team (scaled by HC)
                // Add the impact from averaged per-SDE events (not scaled by HC)
                teamActivityYrs: teamActivityYrs_from_total_duration + teamActivityYrs_from_perSDE_avg,
                overheadYrs: (overhead_days_per_sde / workingDays) * headcount
            };

            // Calculate core metrics
            const grossYrs = headcount * sdesPerSdeYear;
            const totalDeductYrs = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
            const netYrs = grossYrs - totalDeductYrs;

            // Store metrics
            teamMetrics[team.teamId][scenario] = {
                headcount: headcount,
                grossYrs: grossYrs,
                deductYrs: totalDeductYrs,
                netYrs: netYrs,
                deductionsBreakdown: breakdown
            };

            // Accumulate totals
            totals[scenario].headcount += headcount;
            totals[scenario].grossYrs += grossYrs;
            totals[scenario].deductYrs += totalDeductYrs;
            totals[scenario].netYrs += netYrs;
            if (breakdown) {
                totals[scenario].deductionsBreakdown.stdLeaveYrs += breakdown.stdLeaveYrs || 0;
                totals[scenario].deductionsBreakdown.varLeaveYrs += breakdown.varLeaveYrs || 0;
                totals[scenario].deductionsBreakdown.holidayYrs += breakdown.holidayYrs || 0;
                totals[scenario].deductionsBreakdown.orgEventYrs += breakdown.orgEventYrs || 0;
                totals[scenario].deductionsBreakdown.teamActivityYrs += breakdown.teamActivityYrs || 0;
                totals[scenario].deductionsBreakdown.overheadYrs += breakdown.overheadYrs || 0;
            }

        }); // End scenario loop
    }); // End team loop

    console.log("Finished calculating metrics (Phase 7b - Fix 6).");
    const finalMetrics = { ...teamMetrics, totals: totals };
    return finalMetrics;
}

window.calculateAllCapacityMetrics = calculateAllCapacityMetrics; // Ensure it's globally accessible

/**
 * REVISED (Phase 7d) - Triggers recalculation and redraws summary, narrative, AND chart.
 * @param {string | null} newScenario - Optional. If provided, sets the current scenario before redrawing.
 */
function updateCapacityCalculationsAndDisplay(newScenario = null) {
    console.log(`Updating capacity display. New scenario provided: ${newScenario}, Current scenario: ${currentCapacityScenario}`);
    let scenarioChanged = false;
    if (newScenario && ['TeamBIS', 'EffectiveBIS', 'FundedHC'].includes(newScenario) && newScenario !== currentCapacityScenario) {
        currentCapacityScenario = newScenario;
        scenarioChanged = true;
        console.log(`Capacity scenario changed to: ${currentCapacityScenario}`);
    }

    if (!currentSystemData) {
        console.warn("No current system data to calculate metrics from.");
        // Clear displays if no data?
         const summarySection = document.getElementById('capacitySummarySection');
         if (summarySection) summarySection.innerHTML = '<h3>Calculated Net Project Capacity Summary</h3><p><em>No system data loaded.</em></p>';
         const narrativeContainer = document.getElementById('capacityNarrativeSection');
          if (narrativeContainer) narrativeContainer.style.display = 'none'; // Hide if no data
           const chartContainer = document.getElementById('capacityChartContainer');
          if (chartContainer) chartContainer.style.display = 'none'; // Hide if no data
        return;
    }

    // --- Perform Calculations ---
    const calculatedMetrics = calculateAllCapacityMetrics(currentSystemData);
    console.log("Capacity metrics calculated:", calculatedMetrics); // Log calculated metrics for debugging

    // --- Update Displays ---
    // 1. Summary Table
    generateCapacitySummaryDisplay(calculatedMetrics, currentCapacityScenario);

    // 2. Narrative Section (will handle its own container creation/visibility)
    generateCapacityNarrative(calculatedMetrics, currentCapacityScenario);

    // 3. Waterfall Chart (will handle its own container creation/visibility)
    generateCapacityWaterfallChart(calculatedMetrics, currentCapacityScenario); // <-- ADDED CALL

    console.log("All capacity displays updated.");
}
// Make global if needed
window.updateCapacityCalculationsAndDisplay = updateCapacityCalculationsAndDisplay;

/**
 * NEW Function (Phase 5b) - Generates the Summary Table HTML based on calculated metrics and selected scenario.
 * @param {object} calculatedMetrics - The object returned by calculateAllCapacityMetrics.
 * @param {string} selectedScenario - The key of the currently selected scenario ('TeamBIS', 'EffectiveBIS', 'FundedHC').
 */
function generateCapacitySummaryDisplay(calculatedMetrics, selectedScenario) {
    console.log(`Generating Capacity Summary Display for scenario: ${selectedScenario}`);
    const summarySection = document.getElementById('capacitySummarySection');
    if (!summarySection) { console.error("Summary section not found."); return; }

    const placeholder = summarySection.querySelector('#capacitySummaryPlaceholder');
    if (placeholder) placeholder.style.display = 'none'; // Hide placeholder

    // --- Scenario Buttons ---
    let scenarioButtonsDiv = summarySection.querySelector('#capacityScenarioButtons');
    if (!scenarioButtonsDiv) {
        scenarioButtonsDiv = document.createElement('div');
        scenarioButtonsDiv.id = 'capacityScenarioButtons';
        scenarioButtonsDiv.style.marginBottom = '15px';
        summarySection.insertBefore(scenarioButtonsDiv, summarySection.querySelector('p')); // Insert before placeholder
    }
    const baseButtonStyle = 'padding: 5px 10px; margin-right: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.9em;';
    const activeButtonStyle = baseButtonStyle + ' background-color: #007bff; color: white; border-color: #0056b3; font-weight: bold;';
    const inactiveButtonStyle = baseButtonStyle + ' background-color: #e9ecef; color: #495057;';

    scenarioButtonsDiv.innerHTML = `
        <strong style="margin-right: 10px;">Show Summary For:</strong>
        <button type="button" style="${selectedScenario === 'EffectiveBIS' ? activeButtonStyle : inactiveButtonStyle}" onclick="updateCapacityCalculationsAndDisplay('EffectiveBIS')">Effective BIS</button>
        <button type="button" style="${selectedScenario === 'TeamBIS' ? activeButtonStyle : inactiveButtonStyle}" onclick="updateCapacityCalculationsAndDisplay('TeamBIS')">Team BIS</button>
        <button type="button" style="${selectedScenario === 'FundedHC' ? activeButtonStyle : inactiveButtonStyle}" onclick="updateCapacityCalculationsAndDisplay('FundedHC')">Funded HC</button>
    `;

    // --- Summary Table ---
    let summaryTable = summarySection.querySelector('#capacitySummaryTable');
    if (!summaryTable) {
        summaryTable = document.createElement('table');
        summaryTable.id = 'capacitySummaryTable';
        summaryTable.style.width = '100%';
        summaryTable.style.borderCollapse = 'collapse';
        summaryTable.style.marginTop = '10px';
        summarySection.appendChild(summaryTable); // Append new table
    }
    summaryTable.style.display = 'table'; // Ensure table is visible
    summaryTable.innerHTML = ''; // Clear previous content

    const thead = summaryTable.createTHead();
    const headerRow = thead.insertRow();
    // **UPDATED Headers with Units**
    const headers = [
        { text: 'Team Identity', title: 'Team Identifier' },
        { text: `HC (${selectedScenario})`, title: 'Headcount for the selected scenario' },
        { text: 'Gross (SDE Yrs)', title: 'Total SDE Years before deductions' },
        { text: '(-) Deduct (SDE Yrs)', title: 'Total deductions (Leave, Holidays, Activities, Overhead) in SDE Years' },
        { text: '(=) Net Project (SDE Yrs)', title: 'Remaining capacity for project work in SDE Years' }
    ];
    headers.forEach(hdr => {
        const th = document.createElement('th');
        th.textContent = hdr.text; th.title = hdr.title; // Use text and title properties
        th.style.border = '1px solid #ccc'; th.style.padding = '5px'; th.style.backgroundColor = '#f8f9fa';
        if (hdr.text !== 'Team Identity') th.style.textAlign = 'center'; else th.style.textAlign = 'left'; // Use hdr.text
        headerRow.appendChild(th);
    });

    const tbody = summaryTable.createTBody();
    const totals = calculatedMetrics.totals[selectedScenario] || { headcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0 };

    (currentSystemData.teams || []).forEach(team => {
        if (!team || !team.teamId) return;
        const teamMetrics = calculatedMetrics[team.teamId]?.[selectedScenario];
        if (!teamMetrics) { console.warn(`Metrics not found for team ${team.teamId} and scenario ${selectedScenario}`); return; }

        const row = tbody.insertRow();
        row.insertCell().textContent = team.teamIdentity || team.teamName || team.teamId;
        row.insertCell().textContent = teamMetrics.headcount.toFixed(2);
        row.insertCell().textContent = teamMetrics.grossYrs.toFixed(2);

        // Deduct Yrs Cell (with Tooltip)
        const deductCell = row.insertCell();
        deductCell.textContent = teamMetrics.deductYrs.toFixed(2); // Set the number
        // Add info icon for visual cue (optional)
        const infoIcon = document.createElement('span');
        infoIcon.textContent = ' ℹ️';
        infoIcon.style.cursor = 'help';
        infoIcon.style.fontSize = '0.8em'; // Make icon slightly smaller
        deductCell.appendChild(infoIcon);
        // Set the tooltip using the breakdown data
        const breakdownData = teamMetrics.deductionsBreakdown; // Get breakdown object
        deductCell.title = formatDeductionTooltip(breakdownData); // Use helper to format

        const netCell = row.insertCell();
        netCell.textContent = teamMetrics.netYrs.toFixed(2);
        netCell.style.fontWeight = 'bold';
        // **NEW (Phase 7a): Highlight if Net SDE Years <= 0**
        if (teamMetrics.netYrs <= 0) {
            netCell.style.backgroundColor = '#f8d7da'; // Light red
            netCell.title = 'Warning: Net Project Capacity is zero or negative!';
        }        

        // Style numerical cells
        Array.from(row.cells).forEach((cell, i) => { if (i > 0) cell.style.textAlign = 'center'; });
    });

    // Add Totals Row
    const tfoot = summaryTable.createTFoot();
    const footerRow = tfoot.insertRow();
    footerRow.style.fontWeight = 'bold'; footerRow.style.backgroundColor = '#f0f0f0';
    footerRow.insertCell().textContent = 'TOTALS';
    footerRow.insertCell().textContent = (totals.headcount).toFixed(2);
    footerRow.insertCell().textContent = totals.grossYrs.toFixed(2);
    
    // Total Deduct Yrs Cell (with Tooltip)
    const deductTotalCell = footerRow.insertCell();
    deductTotalCell.textContent = totals.deductYrs.toFixed(2); // Set the number
    // Add info icon
    const totalInfoIcon = document.createElement('span');
    totalInfoIcon.textContent = ' ℹ️';
    totalInfoIcon.style.cursor = 'help';
    totalInfoIcon.style.fontSize = '0.8em';
    deductTotalCell.appendChild(totalInfoIcon);
    // Set the tooltip using the breakdown data from totals
    const totalBreakdownData = totals[selectedScenario]?.deductionsBreakdown; // Get total breakdown
    deductTotalCell.title = formatDeductionTooltip(totalBreakdownData); // Use helper
    
    const netTotalCell = footerRow.insertCell();
    netTotalCell.textContent = totals.netYrs.toFixed(2);    

    // **NEW (Phase 7a): Highlight total if Net SDE Years <= 0**
    if (totals.netYrs <= 0) {
        netTotalCell.style.backgroundColor = '#f8d7da'; // Light red
        netTotalCell.title = 'Warning: Total Net Project Capacity is zero or negative!';
    }    
    Array.from(footerRow.cells).forEach((cell, i) => {
        cell.style.borderTop = '2px solid #666';
        if (i > 0) cell.style.textAlign = 'center';
    });

    console.log("Summary display generated.");
}
window.generateCapacitySummaryDisplay = generateCapacitySummaryDisplay; // Make global if needed

/**
 * REVISED (Phase 7c - Narrative Enhancement for Auditability) - Generates narrative & ensures container exists.
 */
function generateCapacityNarrative(calculatedMetrics, selectedScenario) {
    console.log(`Attempting to generate Enhanced Capacity Narrative for scenario: ${selectedScenario}...`);

    let narrativeContainer = document.getElementById('capacityNarrativeSection');
    const mainContainer = document.getElementById('capacityConfigView'); // Parent container

    // --- Ensure Narrative Container Exists ---
    if (!narrativeContainer) {
        console.log("Creating narrative section container with collapsible structure...");
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
            // Append after summary section if it exists, otherwise just append
            const summarySection = mainContainer.querySelector('#capacitySummarySection');
            if (summarySection && summarySection.parentNode === mainContainer) {
                 summarySection.insertAdjacentElement('afterend', narrativeContainer);
            } else {
                 mainContainer.appendChild(narrativeContainer);
            }
        } else {
            console.error("Main container #capacityConfigView not found. Cannot append narrative section.");
            return; // Cannot proceed without main container
        }

    } else {
        // Ensure main container is visible if it exists
         if(narrativeContainer) narrativeContainer.style.display = 'block';
    }

    const narrativeContentContainer = document.getElementById('narrativeContent');
    if (!narrativeContentContainer) {
        console.error("Narrative content container #narrativeContent not found in the DOM.");
        return;
    }

    // --- Check for Required Data ---
    if (!calculatedMetrics || !currentSystemData || !currentSystemData.capacityConfiguration || !currentSystemData.teams) {
        console.error("Cannot generate narrative: Required data is missing.");
        narrativeContentContainer.innerHTML = `<p><em>Error: Cannot generate narrative because required data is missing.</em></p>`;
        return;
    }

    const teams = currentSystemData.teams;
    const capacityConfig = currentSystemData.capacityConfiguration;
    const workingDays = capacityConfig.workingDaysPerYear || 261; // Use default if not set
    const standardHoursPerDay = capacityConfig.standardHoursPerDay || 8; // Use default if not set
    const totals = calculatedMetrics.totals; // Get totals for all scenarios

    // --- Helper Functions ---
    const toDays = (sdeYears) => {
        if (typeof sdeYears !== 'number' || isNaN(sdeYears)) return 'N/A';
        return (sdeYears * workingDays).toFixed(0);
    }
    const toFixed = (num, places = 2) => {
        if (typeof num !== 'number' || isNaN(num)) return 'N/A';
        const fixedNum = (num || 0).toFixed(places);
        return (fixedNum === '-0.00' || fixedNum === '-0.0') ? '0.00' : fixedNum;
    }
    const getTeamName = (team) => team.teamIdentity || team.teamName || team.teamId;
    const getDefaultLeaveDays = (leaveTypeId) => {
        return capacityConfig.leaveTypes?.find(lt => lt.id === leaveTypeId)?.defaultEstimatedDays || 0;
    }
    const getTeamLeaveUptake = (team, leaveTypeId) => {
        const uptakeObj = team.teamCapacityAdjustments?.leaveUptakeEstimates?.find(est => est.leaveTypeId === leaveTypeId);
        return uptakeObj?.estimatedUptakePercent ?? 100; // Default 100%
    }

    // --- Start Building Narrative HTML ---
    let narrativeHTML = '';

    // --- Paragraph 1: Top-Level Reality ---
    narrativeHTML += `<p><strong>Overall Capacity Baselines:</strong> `;
    narrativeHTML += `The total <strong>Funded Headcount</strong> is <strong>${toFixed(totals.FundedHC?.headcount)}</strong>, equivalent to a gross capacity of <strong>${toFixed(totals.FundedHC?.grossYrs)} SDE Years</strong> (${toDays(totals.FundedHC?.grossYrs)} SDE Days). `;
    narrativeHTML += `Based on current team composition (<strong>'Team BIS'</strong> - Builders In Seats), there are <strong>${toFixed(totals.TeamBIS?.headcount)}</strong> builders, providing <strong>${toFixed(totals.TeamBIS?.grossYrs)} SDE Years</strong> (${toDays(totals.TeamBIS?.grossYrs)} SDE Days). `;
    narrativeHTML += `Including known incoming 'Away Team' members (<strong>'Effective BIS'</strong>), the effective headcount is <strong>${toFixed(totals.EffectiveBIS?.headcount)}</strong>, for a gross capacity of <strong>${toFixed(totals.EffectiveBIS?.grossYrs)} SDE Years</strong> (${toDays(totals.EffectiveBIS?.grossYrs)} SDE Days) before any deductions.</p>`;

    // --- Paragraph 2: Global Constraints (with calculation parameters) ---
    const holidays = capacityConfig.globalConstraints?.publicHolidays || 0;
    const orgEvents = capacityConfig.globalConstraints?.orgEvents || [];
    const holidayImpactYrs = totals[selectedScenario]?.deductionsBreakdown?.holidayYrs || 0;
    const orgEventImpactYrs = totals[selectedScenario]?.deductionsBreakdown?.orgEventYrs || 0;

    narrativeHTML += `<p><strong>Global Factors Reducing Capacity:</strong> `;
    narrativeHTML += `Calculations converting days to SDE Years are based on the configured <strong>${workingDays} Standard Working Days Per Year</strong>. Overhead conversion assumes a standard <strong>${standardHoursPerDay}-hour</strong> working day. `; // Added parameters
    narrativeHTML += `Across the organization, <strong>${holidays} Public Holiday</strong> days reduce capacity by approx. <strong>${toFixed(holidayImpactYrs)} SDE Years</strong> (${toDays(holidayImpactYrs)} SDE Days). `;
    if (orgEvents.length > 0) {
        const eventNames = orgEvents.map(e => e.name || 'Unnamed Event').slice(0, 3).join(', ');
        narrativeHTML += `Planned Organization-Wide Events (e.g., ${eventNames}${orgEvents.length > 3 ? '...' : ''}) account for a further reduction of <strong>${toFixed(orgEventImpactYrs)} SDE Years</strong> (${toDays(orgEventImpactYrs)} SDE Days). `;
    } else {
         narrativeHTML += `No significant Organization-Wide Events impacting capacity have been defined. `;
    }
     const annualDefault = getDefaultLeaveDays('annual');
     narrativeHTML += `Standard leave defaults include ${annualDefault} days/SDE for Annual Leave. The actual impact varies per team based on estimated uptake percentages.</p>`;

    // --- Paragraphs 3+ (Per Team) ---
    narrativeHTML += `<h4 style="margin-bottom: 0.5em;">Team-Specific Breakdown (${selectedScenario} Scenario):</h4>`;

    teams.forEach(team => {
        const teamId = team.teamId;
        const teamName = getTeamName(team);
        const teamMetrics = calculatedMetrics[teamId]?.[selectedScenario];
        const teamBreakdown = teamMetrics?.deductionsBreakdown;

        if (!teamMetrics || !teamBreakdown) {
            narrativeHTML += `<p><strong>${teamName}:</strong> Metrics not available for this scenario.</p><hr style='border:none; border-top: 1px solid #eee; margin: 1em 0;'>`;
            return; // Skip this team if no metrics
        }

        const totalSinkYrs = teamMetrics.deductYrs || 0;
        const totalSinkDays = toDays(totalSinkYrs);

        narrativeHTML += `<p><strong><u>${teamName}</u> (HC: ${toFixed(teamMetrics.headcount)} in ${selectedScenario} view):</strong> `; // Added scenario context

        // --- Explain main sinks with more detail ---
        narrativeHTML += `Key capacity reductions include: `;

        // Standard Leave
        const annualUptakePercent = getTeamLeaveUptake(team, 'annual');
        const sickUptakePercent = getTeamLeaveUptake(team, 'sick');
        const annualDefaultDays = getDefaultLeaveDays('annual');
        const sickDefaultDays = getDefaultLeaveDays('sick');
        narrativeHTML += `Standard Leave (<strong>${toFixed(teamBreakdown.stdLeaveYrs)} SDE Yrs</strong>`;
        if (annualUptakePercent !== 100 || sickUptakePercent !== 100) { // Add detail only if not default
             narrativeHTML += `, based on applying team-specific uptake percentages such as ${annualUptakePercent}% for Annual Leave (${annualDefaultDays} default days) and ${sickUptakePercent}% for Sick Leave (${sickDefaultDays} default days) to the default days provided`;
        }
         narrativeHTML += `); `;

        // Variable Leave
        const varLeaveDays = calculateTotalVariableLeaveDays(team);
        narrativeHTML += `Variable Leave impact totalling <strong>${varLeaveDays.toFixed(0)} SDE-Days</strong> (from Maternity, Paternity, Medical, etc. inputs), equivalent to <strong>${toFixed(teamBreakdown.varLeaveYrs)} SDE Yrs</strong>; `;

        // Team Activities
        const teamActivityImpacts = calculateTeamActivityImpacts(team);
        narrativeHTML += `Team Activities impact of <strong>${toFixed(teamBreakdown.teamActivityYrs)} SDE Yrs</strong>`;
        // Optionally list top 1-2 activities contributing
        const topActivities = (team.teamCapacityAdjustments?.teamActivities || [])
            .filter(a => a.value > 0)
            .sort((a, b) => { // Crude sort: prioritize perSDE, then by value
                 if (a.estimateType === 'perSDE' && b.estimateType !== 'perSDE') return -1;
                 if (a.estimateType !== 'perSDE' && b.estimateType === 'perSDE') return 1;
                 return (b.value || 0) - (a.value || 0);
            })
            .slice(0, 2)
            .map(a => `'${a.name}' (${a.value} ${a.estimateType === 'perSDE' ? 'Days/SDE' : 'Total Days'})`)
            .join(', ');
        if (topActivities) {
            narrativeHTML += ` (driven primarily by ${topActivities})`;
        }
         narrativeHTML += `; `;

        // Overhead
        const overheadHrs = team.teamCapacityAdjustments?.avgOverheadHoursPerWeekPerSDE || 0;
        narrativeHTML += `Overhead based on <strong>${overheadHrs.toFixed(1)} Hrs/Wk/SDE</strong> input, converting to an impact of <strong>${toFixed(teamBreakdown.overheadYrs)} SDE Yrs</strong>; `;

        // Global Factors (already covered generally, just acknowledge their inclusion)
        narrativeHTML += `plus the team's share of global Holidays & Org Events. `;

        // Reconciliation Sentence
        const sumOfParts = (teamBreakdown.stdLeaveYrs || 0) + (teamBreakdown.varLeaveYrs || 0) + (teamBreakdown.holidayYrs || 0) + (teamBreakdown.orgEventYrs || 0) + (teamBreakdown.teamActivityYrs || 0) + (teamBreakdown.overheadYrs || 0);
        narrativeHTML += `The sum of these specific deductions reconciles to the total team deduction of <strong>${toFixed(totalSinkYrs)} SDE Yrs</strong> shown. `;


        // --- End Sink Details ---

        // Total Sink
        //narrativeHTML += `In total, this team loses approx. <strong>${totalSinkDays} SDE Days</strong> (<strong>${toFixed(totalSinkYrs)} SDE Yrs</strong>) to these factors in the ${selectedScenario} view. `; // Redundant now with reconciliation

        // Before/After across scenarios
        const netTeamBIS = calculatedMetrics[teamId]?.TeamBIS?.netYrs;
        const netEffectiveBIS = calculatedMetrics[teamId]?.EffectiveBIS?.netYrs;
        const netFundedHC = calculatedMetrics[teamId]?.FundedHC?.netYrs;
        narrativeHTML += `Resulting Net Project Capacity across scenarios: Team BIS = <strong>${toFixed(netTeamBIS)} Yrs</strong>, Effective BIS = <strong>${toFixed(netEffectiveBIS)} Yrs</strong>, Funded HC = <strong>${toFixed(netFundedHC)} Yrs</strong>.</p><hr style='border:none; border-top: 1px solid #eee; margin: 1em 0;'>`; // Add separator

    });

    // --- Final Paragraph: Overall Summary ---
    const totalNetYrs = totals[selectedScenario]?.netYrs || 0;
    narrativeHTML += `<p style="margin-top:1em;"><strong>Overall Summary (${selectedScenario}):</strong> `;
    narrativeHTML += `Summing across all teams for the <strong>${selectedScenario}</strong> scenario, the total Gross Capacity is <strong>${toFixed(totals[selectedScenario]?.grossYrs)} SDE Yrs</strong>. After accounting for all deductions totalling <strong>${toFixed(totals[selectedScenario]?.deductYrs)} SDE Yrs</strong>, the estimated final <strong>Net Project Capacity is ${toFixed(totalNetYrs)} SDE Years</strong> (${toDays(totalNetYrs)} SDE Days).</p>`;

    // --- Display Narrative ---
    narrativeContentContainer.innerHTML = narrativeHTML; // Set the content of the inner div
    console.log("Finished generating enhanced capacity narrative.");
}
// Make global if needed for direct calls (though usually called via updateCapacityCalculationsAndDisplay)
window.generateCapacityNarrative = generateCapacityNarrative;

/**
 * FINAL (Phase 7d - Waterfall Chart Implementation) - Generates the Capacity Waterfall Chart.
 * Includes dynamic container creation, collapsible behavior, Org View, and Chart.js rendering.
 * @param {object} calculatedMetrics - The object returned by calculateAllCapacityMetrics.
 * @param {string} selectedScenario - The key of the currently selected scenario ('TeamBIS', 'EffectiveBIS', 'FundedHC').
 */
function generateCapacityWaterfallChart(calculatedMetrics, selectedScenario) {
    console.log(`Generating Capacity Waterfall Chart section for scenario: ${selectedScenario}...`);

    const ORG_VIEW_ID = '__ORG_VIEW__'; // Identifier for Org View

    let chartContainer = document.getElementById('capacityChartContainer');
    const mainContainer = document.getElementById('capacityConfigView');
    const narrativeSection = document.getElementById('capacityNarrativeSection');
    const summarySection = document.getElementById('capacitySummarySection');

    // --- Ensure Chart Container Exists ---
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
        chartContent.style.padding = '15px'; chartContent.style.display = 'none'; // Start collapsed
        chartContainer.appendChild(chartContent); // Add content div

        const canvasElement = document.createElement('canvas');
        canvasElement.id = 'capacityWaterfallChart';
        canvasElement.style.width = '100%'; canvasElement.style.maxHeight = '450px';
        chartContent.appendChild(canvasElement);

        const teamSelectorDiv = document.createElement('div');
        teamSelectorDiv.id = 'chartTeamSelector';
        teamSelectorDiv.style.textAlign = 'center'; teamSelectorDiv.style.marginTop = '10px';
        teamSelectorDiv.innerHTML = `<p><i>Select a view:</i></p>`;
        chartContent.appendChild(teamSelectorDiv);

        chartHeader.onclick = () => { /* ... (toggle logic remains same) ... */
            const contentDiv = chartContainer.querySelector('#chartContent');
            const indicatorSpan = chartHeader.querySelector('#chartToggleIndicator');
            if (contentDiv && indicatorSpan) {
                const isHidden = contentDiv.style.display === 'none';
                contentDiv.style.display = isHidden ? 'block' : 'none';
                indicatorSpan.textContent = isHidden ? '[-] ' : '[+] ';
            }
        };

        // Append container
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

    // --- Get references ---
    const teamSelectorContainer = document.getElementById('chartTeamSelector');
    const canvas = document.getElementById('capacityWaterfallChart');
    const chartContentDiv = document.getElementById('chartContent'); // Get content div

    if (!teamSelectorContainer || !canvas || !chartContentDiv) {
        console.error("Chart inner elements not found."); return;
    }

    // --- Populate View Selector Buttons ---
    teamSelectorContainer.innerHTML = '<strong style="margin-right: 10px;">Select View:</strong>';
    if (typeof currentChartTeamId === 'undefined') { currentChartTeamId = ORG_VIEW_ID; } // Ensure default

    // Org View Button
    const orgButton = document.createElement('button'); /* ... (button creation logic remains same) ... */
    orgButton.textContent = 'Org View'; orgButton.type = 'button';
    orgButton.style.cssText = `padding: 3px 8px; margin: 0 5px 5px 0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85em;`;
    if (currentChartTeamId === ORG_VIEW_ID) { orgButton.style.backgroundColor = '#007bff'; orgButton.style.color = 'white'; orgButton.style.fontWeight = 'bold'; }
    else { orgButton.style.backgroundColor = '#e9ecef'; orgButton.style.color = '#495057'; }
    orgButton.onclick = () => { currentChartTeamId = ORG_VIEW_ID; generateCapacityWaterfallChart(calculatedMetrics, selectedScenario); };
    teamSelectorContainer.appendChild(orgButton);

    // Team Buttons
    if (currentSystemData && currentSystemData.teams && currentSystemData.teams.length > 0) {
        currentSystemData.teams.forEach(team => {
            const button = document.createElement('button'); /* ... (button creation logic remains same) ... */
             button.textContent = team.teamIdentity || team.teamName; button.type = 'button';
             button.style.cssText = `padding: 3px 8px; margin: 0 5px 5px 0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85em;`;
             if (team.teamId === currentChartTeamId) { button.style.backgroundColor = '#007bff'; button.style.color = 'white'; button.style.fontWeight = 'bold'; }
             else { button.style.backgroundColor = '#e9ecef'; button.style.color = '#495057'; }
             button.onclick = () => { currentChartTeamId = team.teamId; generateCapacityWaterfallChart(calculatedMetrics, selectedScenario); };
             teamSelectorContainer.appendChild(button);
        });
    }

    // --- Chart Generation Logic ---
    console.log(`Generating chart for view: ${currentChartTeamId === ORG_VIEW_ID ? 'Org View' : currentChartTeamId}`);

    // Destroy previous chart instance
    if (capacityChartInstance) {
        capacityChartInstance.destroy();
        capacityChartInstance = null;
    }

    // Determine data source and label
    let viewData;
    let viewLabel;
    if (currentChartTeamId === ORG_VIEW_ID) {
        viewData = calculatedMetrics.totals?.[selectedScenario];
        viewLabel = 'Organization Total';
    } else {
        viewData = calculatedMetrics[currentChartTeamId]?.[selectedScenario];
        viewLabel = getTeamNameById(currentChartTeamId);
    }

    // Check if data exists
    if (!viewData || !viewData.deductionsBreakdown) {
        console.warn(`No metrics/breakdown found for view ${currentChartTeamId} and scenario ${selectedScenario}. Cannot generate chart.`);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
        ctx.fillText(`No data available for ${viewLabel} (${selectedScenario})`, canvas.width / 2, 50);
        return;
    }

    // --- Prepare Waterfall Data ---
    const labels = ['Gross', 'Holidays', 'Org Events', 'Std Leave', 'Var Leave', 'Activities', 'Overhead', 'Net Project'];
    const dataValues = [];
    const colors = [];
    const borderColors = [];

    const grossYrs = viewData.grossYrs || 0;
    const holidayYrs = viewData.deductionsBreakdown.holidayYrs || 0;
    const orgEventYrs = viewData.deductionsBreakdown.orgEventYrs || 0;
    const stdLeaveYrs = viewData.deductionsBreakdown.stdLeaveYrs || 0;
    const varLeaveYrs = viewData.deductionsBreakdown.varLeaveYrs || 0;
    const activityYrs = viewData.deductionsBreakdown.teamActivityYrs || 0; // Ensure correct key
    const overheadYrs = viewData.deductionsBreakdown.overheadYrs || 0;
    const netYrs = viewData.netYrs || 0;

    let currentLevel = 0;

    // Gross Capacity Bar (Positive)
    dataValues.push([currentLevel, grossYrs]);
    colors.push('rgba(75, 192, 192, 0.6)'); // Greenish
    borderColors.push('rgba(75, 192, 192, 1)');
    currentLevel = grossYrs;

    // Deduction Bars (Negative impact visually shown by starting point)
    const deductions = [holidayYrs, orgEventYrs, stdLeaveYrs, varLeaveYrs, activityYrs, overheadYrs];
    const deductionColors = [
        'rgba(255, 99, 132, 0.6)', // Red
        'rgba(255, 159, 64, 0.6)', // Orange
        'rgba(255, 205, 86, 0.6)', // Yellow
        'rgba(153, 102, 255, 0.6)', // Purple
        'rgba(201, 203, 207, 0.6)', // Grey
        'rgba(54, 162, 235, 0.6)' // Blue
    ];
    deductions.forEach((deduction, index) => {
        if (typeof deduction !== 'number' || isNaN(deduction) || deduction === 0) {
            // Skip zero or invalid deductions visually, or represent as 0 height bar?
             // Let's represent as [currentLevel, currentLevel] to keep label alignment
              dataValues.push([currentLevel, currentLevel]);
        } else {
             dataValues.push([currentLevel, currentLevel - deduction]);
             currentLevel -= deduction;
        }
         colors.push(deductionColors[index % deductionColors.length]); // Cycle colors if needed
         borderColors.push(deductionColors[index % deductionColors.length].replace('0.6', '1')); // Solid border
    });

    // Net Project Capacity Bar (Positive, starts from 0)
    dataValues.push([0, netYrs]);
    colors.push('rgba(75, 192, 192, 0.6)'); // Greenish
    borderColors.push('rgba(75, 192, 192, 1)');

    // --- Configure Chart.js ---
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
                barPercentage: 0.8, // Adjust bar width
                categoryPercentage: 0.9 // Adjust spacing between bars
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow height to adjust
            indexAxis: 'x', // Waterfall typically vertical bars
            scales: {
                x: {
                    grid: { display: false } // Cleaner look
                },
                y: {
                    beginAtZero: true, // Start y-axis at zero
                    title: {
                        display: true,
                        text: 'Capacity (SDE Years)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Legend not very useful for waterfall
                },
                title: {
                    display: true,
                    text: `Capacity Waterfall: ${viewLabel} (${selectedScenario})`,
                    padding: { top: 10, bottom: 15 },
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (Array.isArray(value) && value.length === 2) {
                                const start = value[0];
                                const end = value[1];
                                const change = end - start;
                                // For deductions, show the negative change; for Gross/Net show the total
                                if (context.label === 'Gross' || context.label === 'Net Project') {
                                     label += `${end.toFixed(2)} SDE Yrs`;
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

    // --- Create the Chart ---
    const ctx = canvas.getContext('2d');
    capacityChartInstance = new Chart(ctx, config); // Store instance

    console.log("Waterfall chart generated successfully.");
}
// Make global if needed
window.generateCapacityWaterfallChart = generateCapacityWaterfallChart;

/**
 * REVISED Function (Phase 4b - SIMPLIFIED Team Activities UI)
 * - Removes Participation % column from Team Activities table.
 * - Clarifies 'Value' input meaning via tooltips based on 'Est. Type'.
 * - Includes previous functionality (Collapsible, Leave Uptake %, Variable Leave).
 */
function generateTeamConstraintsForms() {
    console.log("Generating Team Constraints Forms (Phase 4b - Simplified Activities)...");
    const container = document.getElementById('capacityConfigView');
    // --- Null checks ---
    if (!container) { console.error("Container #capacityConfigView not found."); return; }
    if (!currentSystemData || !currentSystemData.teams || !currentSystemData.capacityConfiguration?.leaveTypes) { console.error("Missing teams or global leaveTypes data."); /* Error display */ return; }

    // --- Find/create main container ---
    let teamsSection = document.getElementById('teamConstraintsSection');
    if (!teamsSection) { /* ... Create teamsSection ... */
        teamsSection = document.createElement('div'); teamsSection.id = 'teamConstraintsSection'; teamsSection.style.border = '1px solid #ccc'; teamsSection.style.padding = '15px'; teamsSection.style.marginTop = '20px'; const teamsTitle = document.createElement('h3'); teamsTitle.textContent = 'Team-Specific Adjustments'; teamsSection.appendChild(teamsTitle); container.appendChild(teamsSection);
    } else { const teamContainers = teamsSection.querySelectorAll('.team-constraint-container'); teamContainers.forEach(tc => tc.remove()); }

    const teams = currentSystemData.teams || [];
    const globalLeaveTypes = currentSystemData.capacityConfiguration.leaveTypes || [];

    // --- Helper: Update Total Standard Leave Display (no change) ---
    const updateTotalStdLeaveDisplay = (teamIndex) => { /* ... function code from previous version ... */
        const teamContainer = document.getElementById(`teamConstraintContainer_${teamIndex}`); if (!teamContainer) return; const totalDisplayElement = teamContainer.querySelector('.total-std-leave-display'); if (!totalDisplayElement) return; const team = currentSystemData.teams[teamIndex]; if (!team?.teamCapacityAdjustments?.leaveUptakeEstimates) return; let totalEffectiveDays = 0; globalLeaveTypes.forEach(leaveType => { if (!leaveType || !leaveType.id) return; const currentGlobalDefaultObj = currentSystemData.capacityConfiguration.leaveTypes.find(lt => lt.id === leaveType.id); const globalDefault = currentGlobalDefaultObj ? (currentGlobalDefaultObj.defaultEstimatedDays || 0) : 0; const teamUptake = team.teamCapacityAdjustments.leaveUptakeEstimates.find(est => est.leaveTypeId === leaveType.id); const uptakePercent = teamUptake ? (teamUptake.estimatedUptakePercent ?? 100) : 100; totalEffectiveDays += globalDefault * (uptakePercent / 100); }); totalDisplayElement.textContent = totalEffectiveDays.toFixed(1);
    };

    // --- Helper: Update Variable Leave Total Display (no change) ---
     const updateVariableLeaveTotalDisplay = (teamIndex, leaveKey) => { /* ... function code from previous version ... */
         const teamContainer = document.getElementById(`teamConstraintContainer_${teamIndex}`); if (!teamContainer) { console.warn(`updateVariableLeaveTotalDisplay: Cannot find container for team ${teamIndex}`); return; } const totalDisplayElement = teamContainer.querySelector(`.variable-leave-total-display[data-leave-key="${leaveKey}"]`); if (!totalDisplayElement) { console.warn(`updateVariableLeaveTotalDisplay: Cannot find total display span for team ${teamIndex}, key ${leaveKey}`); return; } const team = currentSystemData.teams[teamIndex]; const impact = team?.teamCapacityAdjustments?.variableLeaveImpact?.[leaveKey]; if (impact) { const affectedSDEs = impact.affectedSDEs ?? 0; const avgDays = impact.avgDaysPerAffectedSDE ?? 0; const totalDays = affectedSDEs * avgDays; totalDisplayElement.textContent = totalDays.toFixed(0); } else { totalDisplayElement.textContent = '0'; }
     };

    // --- Helper: Render SIMPLIFIED Team Activities Table ---
    const renderTeamActivitiesTable = (teamIndex, targetContainer) => {
        console.log(`Rendering SIMPLIFIED team activities table for team index ${teamIndex}`);
        targetContainer.innerHTML = ''; // Clear previous table content

        const team = currentSystemData.teams[teamIndex];
        if (!team?.teamCapacityAdjustments?.teamActivities) {
            if (team?.teamCapacityAdjustments) { team.teamCapacityAdjustments.teamActivities = []; }
            else { console.warn("Cannot render activities, missing teamCapacityAdjustments for team:", teamIndex); return; }
        }

        const activitiesTable = document.createElement('table');
        activitiesTable.style.width = '100%'; activitiesTable.style.fontSize = '0.9em'; activitiesTable.style.borderCollapse = 'collapse';
        // *** REMOVED Participation % Header ***
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

        // Populate Table Rows
        team.teamCapacityAdjustments.teamActivities.forEach((activity, activityIndex) => {
            const row = activitiesTbody.insertRow();
            row.style.borderBottom = '1px solid #eee';

            // Helper to create input/select cells
            const createCell = (elementType = 'input', attributes = {}, styles = {}, options = null) => {
                 const cell = row.insertCell(); const element = document.createElement(elementType); for (const attr in attributes) { element[attr] = attributes[attr]; } for (const style in styles) { element.style[style] = styles[style]; } if (elementType === 'select' && options) { options.forEach(opt => element.add(new Option(opt.text, opt.value))); }
                 element.onchange = (e) => {
                     const field = e.target.name; let value = e.target.value; if (e.target.type === 'number') value = parseFloat(value) || 0;
                     activity[field] = value; console.log(`Updated activity[${activityIndex}].${field} to ${value}`);
                     // Update value tooltip based on Est Type change
                     if (field === 'estimateType') {
                         const valueInput = row.querySelector('input[name="value"]');
                         if(valueInput) valueInput.title = value === 'perSDE' ? 'Enter TOTAL SDE-Days impact (e.g., # SDEs * Duration)' : 'Enter TOTAL calendar days for the activity (applies to whole team)';
                     }
                     updateCapacityCalculationsAndDisplay();
                 };
                 cell.appendChild(element); return element;
             };

            // Create Cells
            createCell('input', { type: 'text', value: activity.name || '', name: 'name', placeholder: 'e.g., AWS Training' }, { width: '95%' });
            createCell('input', { type: 'text', value: activity.type || '', name: 'type', placeholder: 'Optional' }, { width: '90%' });
            createCell('select', { value: activity.estimateType || 'perSDE', name: 'estimateType', title: 'Estimate per SDE or as a total for the team' }, { width: '95%' }, [{ text: 'Days/SDE', value: 'perSDE' }, { text: 'Total Team Days', value: 'total' }]);
            const initialValueTitle = (activity.estimateType === 'total') ? 'Enter TOTAL calendar days for the activity (applies to whole team)' : 'Enter TOTAL SDE-Days impact (e.g., # SDEs * Duration)';
            createCell('input', { type: 'number', value: activity.value || 0, name: 'value', min: '0', step: '0.5', title: initialValueTitle }, { width: '70px', textAlign: 'right' });
            // *** REMOVED Participation % Input Cell Creation ***

            // Action Cell (Remove)
            const actionCell = row.insertCell(); actionCell.style.textAlign = 'center';
            const removeBtn = document.createElement('button');
             removeBtn.textContent = 'X'; removeBtn.title = 'Remove Activity'; removeBtn.style.color = 'red'; removeBtn.style.fontSize = '0.8em'; removeBtn.style.padding = '1px 4px';
            removeBtn.onclick = () => {
                team.teamCapacityAdjustments.teamActivities.splice(activityIndex, 1);
                renderTeamActivitiesTable(teamIndex, targetContainer); // Re-render this specific table
                updateCapacityCalculationsAndDisplay();
            };
            actionCell.appendChild(removeBtn);
        }); // end forEach activity

        targetContainer.appendChild(activitiesTable); // Add table to container

        // Add "Add Activity" Button
        const addActivityBtn = document.createElement('button');
         addActivityBtn.textContent = 'Add Team Activity'; addActivityBtn.style.marginTop = '5px';
        addActivityBtn.onclick = () => {
            if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = [];
            // *** Add new activity WITHOUT participationPercent ***
            team.teamCapacityAdjustments.teamActivities.push({
                id: `act-${teamIndex}-${Date.now()}`, name: '', type: '', estimateType: 'perSDE', value: 0
                // participationPercent removed
            });
            renderTeamActivitiesTable(teamIndex, targetContainer); // Re-render table
        };
        targetContainer.appendChild(addActivityBtn);
    };
    // --- *** END Render Team Activities Table Helper *** ---

    // --- Helper Function to RENDER DETAILS for a single team ---
    const renderTeamConstraintDetails = (teamIndex, detailsContainer) => {
        console.log(`Rendering details for team index ${teamIndex}`);
        detailsContainer.innerHTML = ''; // Clear previous content
        const team = currentSystemData.teams[teamIndex]; if (!team) return;
        // --- Ensure data structures exist ---
         if (!team.teamCapacityAdjustments) { team.teamCapacityAdjustments = { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], recurringOverhead: [] }; } else { if (!team.teamCapacityAdjustments.leaveUptakeEstimates) team.teamCapacityAdjustments.leaveUptakeEstimates = []; if (!team.teamCapacityAdjustments.variableLeaveImpact) team.teamCapacityAdjustments.variableLeaveImpact = { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}; if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = []; if (!team.teamCapacityAdjustments.recurringOverhead) team.teamCapacityAdjustments.recurringOverhead = []; const varLeave = team.teamCapacityAdjustments.variableLeaveImpact; if (!varLeave.maternity) varLeave.maternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.paternity) varLeave.paternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.familyResp) varLeave.familyResp = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; if (!varLeave.medical) varLeave.medical = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }; }

        // --- Standard Leave Estimates Section (%) ---
        // ... (Standard Leave UI generation - No change, uses simplified table) ...
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
                  let validatedPercent = 100; // Default to 100%
              
                  // Validate input and update data model
                  if (inputVal !== '') {
                      const numericVal = parseInt(inputVal);
                      if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 100) {
                          validatedPercent = numericVal;
                      } else {
                          // Revert to previous value if invalid
                          const previousEstimate = (estimateIndex > -1) ? targetTeam.teamCapacityAdjustments.leaveUptakeEstimates[estimateIndex] : null;
                          e.target.value = previousEstimate ? (previousEstimate.estimatedUptakePercent ?? '') : ''; // Revert visual input
                          // Use previous % or default 100% for calculation this time
                          validatedPercent = previousEstimate ? (previousEstimate.estimatedUptakePercent ?? 100) : 100;
                      }
                  }
              
                  // Update the data structure based on validated percent
                  if (inputVal === '' || validatedPercent === 100) {
                      // If input is empty or 100%, ensure no specific entry exists for this leave type
                      if (estimateIndex > -1) {
                          targetTeam.teamCapacityAdjustments.leaveUptakeEstimates.splice(estimateIndex, 1);
                          console.log(`Removed leave uptake entry for team ${tIdx}, type ${lTypeId}`);
                      }
                      e.target.value = ''; // Keep input visually empty for 100% default
                      validatedPercent = 100; // Ensure 100 is used for current calculation cycle
                  } else {
                      // If a specific percentage (not 100) is entered
                      if (estimateIndex > -1) {
                          // Update existing entry
                          targetTeam.teamCapacityAdjustments.leaveUptakeEstimates[estimateIndex].estimatedUptakePercent = validatedPercent;
                          console.log(`Updated leave uptake for team ${tIdx}, type ${lTypeId} to ${validatedPercent}%`);
                      } else {
                          // Add new entry if it didn't exist
                          targetTeam.teamCapacityAdjustments.leaveUptakeEstimates.push({ leaveTypeId: lTypeId, estimatedUptakePercent: validatedPercent });
                          console.log(`Added leave uptake for team ${tIdx}, type ${lTypeId} as ${validatedPercent}%`);
                      }
                      e.target.value = validatedPercent; // Update input visually to the validated number
                  }
              
                  // Update the 'Effective Days/SDE' cell next to the input
                  const currentDefaultObj = currentSystemData.capacityConfiguration.leaveTypes.find(lt => lt.id === lTypeId);
                  const currentDefaultVal = currentDefaultObj ? (currentDefaultObj.defaultEstimatedDays || 0) : 0;
                  const effectiveCell = document.getElementById(`effectiveDays_${tIdx}_${lTypeId}`);
                  if (effectiveCell) effectiveCell.textContent = (currentDefaultVal * (validatedPercent / 100)).toFixed(1);
              
                  // Update the total display for standard leave
                  updateTotalStdLeaveDisplay(tIdx);
              
                  // --- Explicitly find the current scenario ---
                  let currentScenario = 'EffectiveBIS'; // Default assumption
                  const capacityButtonsDiv = document.getElementById('capacityScenarioButtons');
                  if (capacityButtonsDiv) {
                       const activeButton = capacityButtonsDiv.querySelector('button[style*="background-color: #007bff"]'); // Find the blue button
                       if (activeButton) {
                           const onclickText = activeButton.getAttribute('onclick');
                           if (onclickText && onclickText.includes('updateCapacityCalculationsAndDisplay(\'TeamBIS\')')) {
                               currentScenario = 'TeamBIS';
                           } else if (onclickText && onclickText.includes('updateCapacityCalculationsAndDisplay(\'FundedHC\')')) {
                               currentScenario = 'FundedHC';
                           }
                           // Otherwise, it remains 'EffectiveBIS'
                       } else {
                           console.warn("Could not find active scenario button, defaulting to EffectiveBIS.");
                       }
                   } else {
                       console.warn("Could not find capacity scenario buttons container, defaulting to EffectiveBIS.");
                   }
                  // --- End Find current scenario ---
              
                  // Call the main update function, PASSING the determined scenario
                  console.log(`Triggering capacity update from leave uptake change. Scenario: ${currentScenario}`);
                  updateCapacityCalculationsAndDisplay(currentScenario);
              });              
              percentCell.appendChild(percentInput);
         });
         const totalDisplaySpan = totalStdLeaveDiv.querySelector('.total-std-leave-display'); if(totalDisplaySpan) totalDisplaySpan.textContent = teamTotalAvgStdLeave.toFixed(1);
        // --- End Standard Leave Section ---

        // --- Variable Leave Estimates Section ---
        // ... (Variable Leave UI generation - No change) ...
         const varLeaveTitle = document.createElement('h5'); varLeaveTitle.textContent = 'Variable Leave Impact Estimate'; varLeaveTitle.style.marginTop = '15px'; varLeaveTitle.title = 'Estimate the total impact ON THE TEAM for variable leave (Maternity, Paternity, etc.). Enter # SDEs affected and Avg Days/SDE for each.'; detailsContainer.appendChild(varLeaveTitle); const varLeaveContainer = document.createElement('div'); varLeaveContainer.style.marginLeft = '20px';
         const handleVariableLeaveInputChange = (e) => { const input = e.target; const tIdx = parseInt(input.getAttribute('data-team-index')); const leaveKey = input.getAttribute('data-leave-key'); const field = input.getAttribute('data-field'); const targetTeam = currentSystemData.teams[tIdx]; if (!targetTeam?.teamCapacityAdjustments?.variableLeaveImpact?.[leaveKey] || !field) return; const value = parseInt(input.value); const validatedValue = (!isNaN(value) && value >= 0) ? value : 0; targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey][field] = validatedValue; input.value = validatedValue; console.log(`Updated ${leaveKey}.${field} for team ${tIdx} to ${validatedValue}`); updateVariableLeaveTotalDisplay(tIdx, leaveKey); updateCapacityCalculationsAndDisplay();};
         const createVarLeaveInputRow = (targetTeam, leaveKey, labelText) => { const div = document.createElement('div'); div.style.marginBottom = '5px'; div.style.display = 'flex'; div.style.alignItems = 'center'; const label = document.createElement('label'); label.textContent = `${labelText}: `; label.style.width = '180px'; label.style.marginRight = '10px'; div.appendChild(label); const sdesInput = document.createElement('input'); sdesInput.type = 'number'; sdesInput.min = '0'; sdesInput.step = '1'; sdesInput.value = targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey]?.affectedSDEs || 0; sdesInput.style.width = '60px'; sdesInput.style.marginRight = '5px'; sdesInput.title = '# SDEs Affected'; sdesInput.setAttribute('data-team-index', teamIndex); sdesInput.setAttribute('data-leave-key', leaveKey); sdesInput.setAttribute('data-field', 'affectedSDEs'); sdesInput.addEventListener('change', handleVariableLeaveInputChange); div.appendChild(sdesInput); div.appendChild(document.createTextNode(' SDEs * ')); const daysInput = document.createElement('input'); daysInput.type = 'number'; daysInput.min = '0'; daysInput.step = '1'; daysInput.value = targetTeam.teamCapacityAdjustments.variableLeaveImpact[leaveKey]?.avgDaysPerAffectedSDE || 0; daysInput.style.width = '60px'; daysInput.style.marginRight = '10px'; daysInput.title = 'Avg. Days per Affected SDE'; daysInput.setAttribute('data-team-index', teamIndex); daysInput.setAttribute('data-leave-key', leaveKey); daysInput.setAttribute('data-field', 'avgDaysPerAffectedSDE'); daysInput.addEventListener('change', handleVariableLeaveInputChange); div.appendChild(daysInput); div.appendChild(document.createTextNode(' Days/SDE = ')); const totalDisplay = document.createElement('span'); totalDisplay.className = 'variable-leave-total-display'; totalDisplay.setAttribute('data-leave-key', leaveKey); totalDisplay.style.fontWeight = 'bold'; totalDisplay.style.minWidth = '40px'; totalDisplay.style.display = 'inline-block'; const initialTotal = (sdesInput.valueAsNumber || 0) * (daysInput.valueAsNumber || 0); totalDisplay.textContent = initialTotal.toFixed(0); div.appendChild(totalDisplay); div.appendChild(document.createTextNode(' Total SDE Days')); return div; };
         varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'maternity', 'Maternity Leave')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'paternity', 'Paternity Leave')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'familyResp', 'Family Responsibility')); varLeaveContainer.appendChild(createVarLeaveInputRow(team, 'medical', 'Medical Leave')); detailsContainer.appendChild(varLeaveContainer);
        // --- End Variable Leave Section ---

        // --- Team Activities Section (Phase 4b Implementation) ---
        const activitiesTitle = document.createElement('h5');
        activitiesTitle.textContent = 'Team Activities (Training, Conferences, etc.)';
        activitiesTitle.style.marginTop = '15px';
        activitiesTitle.title = 'Estimate impact of non-recurring team-specific activities.';
        detailsContainer.appendChild(activitiesTitle);
        const activitiesContainer = document.createElement('div');
        activitiesContainer.style.marginLeft = '20px';
        activitiesContainer.id = `teamActivitiesContainer_${teamIndex}`;
        renderTeamActivitiesTable(teamIndex, activitiesContainer); // Call the helper
        detailsContainer.appendChild(activitiesContainer);
        // --- END Team Activities Section ---

        // --- *** NEW: Recurring Overhead Section (Phase 4c) *** ---
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
        overheadInput.step = '0.5'; // Allow half hours
        overheadInput.value = team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE || 0;
        overheadInput.style.width = '70px';
        overheadInput.dataset.originalTitle = overheadLabel.title; // Store original title        
        overheadInput.setAttribute('data-team-index', teamIndex);

        overheadInput.addEventListener('change', (e) => {
            const tIdx = parseInt(e.target.getAttribute('data-team-index'));
            const targetTeam = currentSystemData.teams[tIdx];
            if (!targetTeam?.teamCapacityAdjustments) return;
        
            const value = parseFloat(e.target.value);
            const validatedValue = (!isNaN(value) && value >= 0) ? value : 0;
            let warningMsg = ''; // Initialize warning message
        
            targetTeam.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE = validatedValue;
            // Display with one decimal place, but store the potentially more precise value
            e.target.value = validatedValue.toFixed(1);
            console.log(`Updated avgOverheadHoursPerWeekPerSDE for team ${tIdx} to ${validatedValue}`);
        
            // --- Sanity Check ---
            if (validatedValue > 40) { // Example sanity check
                warningMsg = 'Value exceeds 40 Hrs/Week/SDE. Is this realistic?';
            }
            // --- End Sanity Check ---
        
            updateInputWarning(e.target, warningMsg); // Update warning display
            updateCapacityCalculationsAndDisplay();
        });

        overheadContainer.appendChild(overheadLabel);
        overheadContainer.appendChild(overheadInput);
        detailsContainer.appendChild(overheadContainer);
        // Initial check on load
        updateInputWarning(overheadInput, (parseFloat(overheadInput.value) > 40) ? 'Value exceeds 40 Hrs/Week/SDE. Is this realistic?' : '');        
        // --- *** END Recurring Overhead Section *** ---
        // --- End Placeholders ---

    }; // --- End renderTeamConstraintDetails ---

    // --- Iterate Through Teams and Setup Collapsible (No change) ---
    teams.forEach((team, teamIndex) => {
        if (!team || !team.teamId) return;
        const teamContainer = document.createElement('div'); /* ... Container setup ... */ teamContainer.id = `teamConstraintContainer_${teamIndex}`; teamContainer.className = 'team-constraint-container'; teamContainer.style.borderTop = '1px solid #ccc'; teamContainer.style.paddingTop = '10px'; teamContainer.style.marginTop = '10px'; const teamHeader = document.createElement('h4'); /* ... Header setup ... */ teamHeader.style.cursor = 'pointer'; teamHeader.style.backgroundColor = '#f8f9fa'; teamHeader.style.padding = '8px'; teamHeader.style.margin = '0'; teamHeader.title = `Click to expand/collapse settings for ${team.teamName || team.teamIdentity}`; const indicator = document.createElement('span'); indicator.id = `teamConstraintToggle_${teamIndex}`; indicator.className = 'toggle-indicator'; indicator.innerText = '(+) '; indicator.style.fontWeight = 'bold'; indicator.style.marginRight = '5px'; teamHeader.appendChild(indicator); teamHeader.appendChild(document.createTextNode(`Team: ${team.teamIdentity || team.teamName || team.teamId}`)); teamContainer.appendChild(teamHeader); const teamDetails = document.createElement('div'); /* ... Details div setup ... */ teamDetails.id = `teamConstraintContent_${teamIndex}`; teamDetails.style.display = 'none'; teamDetails.style.padding = '10px'; teamDetails.style.border = '1px solid #eee'; teamDetails.style.borderTop = 'none';
        teamHeader.onclick = () => { /* ... OnClick Handler (no change) ... */
             const contentDiv = teamDetails; const indicatorSpan = indicator; const isHidden = contentDiv.style.display === 'none' || contentDiv.style.display === ''; if (isHidden) { renderTeamConstraintDetails(teamIndex, contentDiv); contentDiv.style.display = 'block'; indicatorSpan.textContent = '(-)'; } else { contentDiv.style.display = 'none'; indicatorSpan.textContent = '(+)'; contentDiv.innerHTML = ''; }
         };
        teamContainer.appendChild(teamDetails); teamsSection.appendChild(teamContainer);
    }); // --- End teams.forEach ---

    // --- Placeholder for Overall Summary Section (no change) ---
    let summarySection = document.getElementById('capacitySummarySection'); /* ... Placeholder setup ... */
     if (!summarySection) { summarySection = document.createElement('div'); summarySection.id = 'capacitySummarySection'; summarySection.style.border = '1px solid #666'; summarySection.style.backgroundColor = '#f0f0f0'; summarySection.style.padding = '15px'; summarySection.style.marginTop = '20px'; const summaryTitle = document.createElement('h3'); summaryTitle.textContent = 'Calculated Net Project Capacity Summary'; summarySection.appendChild(summaryTitle); const summaryPlaceholder = document.createElement('p'); summaryPlaceholder.id = 'capacitySummaryPlaceholder'; summaryPlaceholder.textContent = '[Summary table with calculations will be added in Phase 5]'; summaryPlaceholder.style.fontStyle = 'italic'; summarySection.appendChild(summaryPlaceholder); container.appendChild(summarySection); } else { const placeholder = summarySection.querySelector('#capacitySummaryPlaceholder'); if (placeholder) placeholder.style.display = 'block'; const table = summarySection.querySelector('table'); if(table) table.style.display = 'none'; }

     // --- Add Save Button (no change) ---
     let saveButtonContainer = document.getElementById('capacitySaveButtonContainer'); /* ... Button setup ... */
      if (!saveButtonContainer) { saveButtonContainer = document.createElement('div'); saveButtonContainer.id = 'capacitySaveButtonContainer'; saveButtonContainer.style.textAlign = 'center'; saveButtonContainer.style.marginTop = '25px'; const saveButton = document.createElement('button'); saveButton.id = 'saveCapacityConfigButton'; saveButton.textContent = 'Save All Capacity Configuration'; saveButton.style.padding = '10px 20px'; saveButton.style.fontSize = '16px'; saveButton.style.backgroundColor = '#dc3545'; saveButton.style.color = 'white'; saveButton.style.border = 'none'; saveButton.style.borderRadius = '5px'; saveButton.style.cursor = 'pointer'; saveButton.onclick = saveCapacityConfiguration; saveButtonContainer.appendChild(saveButton); container.appendChild(saveButtonContainer); }

    console.log("Finished setting up Team Constraints structure (Phase 4b Simplified Activities).");
}
window.generateTeamConstraintsForms = generateTeamConstraintsForms;

/**
 * REVISED Function (Phase 6 - CORRECTED Save Logic + Store Calculated Metrics)
 * - Saves capacity configuration directly to localStorage using the correct system name.
 * - Avoids calling the incorrect saveSystemChanges function.
 * - Includes validation for workingDaysPerYear.
 * - Calculates metrics using calculateAllCapacityMetrics() and stores the result in currentSystemData.calculatedCapacityMetrics before saving.
 */
function saveCapacityConfiguration() {
    console.log("Attempting to save capacity configuration (including calculated metrics)...");
    if (!currentSystemData || !currentSystemData.systemName) {
        alert("Cannot save configuration: No system data loaded or system name is missing.");
        return;
    }

    const systemNameKey = currentSystemData.systemName; // Use the name stored in the data

    // Optional: Validation check before saving
    const workingDays = currentSystemData.capacityConfiguration?.workingDaysPerYear;
    console.log(`Validating workingDaysPerYear: Value=${workingDays}, Type=${typeof workingDays}`); // Added log for debugging
    if (workingDays === undefined || workingDays === null || workingDays <= 0) {
        if (!confirm(`Warning: 'Standard Working Days Per Year' (${workingDays}) is not set or is invalid. Calculations might be incorrect. Save anyway?`)) {
            const wdInput = document.getElementById('workingDaysInput');
            if(wdInput) wdInput.focus();
            return;
        }
    }

    try {
        // --- *** NEW: Calculate metrics BEFORE saving *** ---
        console.log("Calculating metrics before saving...");
        const calculatedMetrics = calculateAllCapacityMetrics(); // Assumes it uses global currentSystemData
        if (calculatedMetrics) {
            currentSystemData.calculatedCapacityMetrics = calculatedMetrics; // Store the results
            console.log("Stored calculated metrics in currentSystemData.calculatedCapacityMetrics.");
        } else {
            console.error("Failed to calculate metrics, calculatedCapacityMetrics will not be updated in saved data.");
            // Decide if you want to proceed saving without calculated metrics or stop
            // currentSystemData.calculatedCapacityMetrics = null; // Or set to null
        }
     
        // 1. Get existing systems from localStorage
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

        // 2. Update the data for the current system using its correct name
        // Now currentSystemData includes the calculatedCapacityMetrics
        systems[systemNameKey] = currentSystemData;
        console.log(`Updating localStorage for key: "${systemNameKey}"`);

        // 3. Save the entire systems object back to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        alert(`Capacity configuration for system "${systemNameKey}" saved successfully.`);
        console.log("Capacity configuration (with calculated metrics) saved.");

    } catch (error) {
        console.error("Error during saveCapacityConfiguration:", error);
        alert("An error occurred while trying to save the capacity configuration. Check console.");
    }
}
// Ensure it's globally accessible if button calls it directly
window.saveCapacityConfiguration = saveCapacityConfiguration;