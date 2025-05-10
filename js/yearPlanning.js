/** Handles changes to the 'Protected' checkbox in the planning table */
function handleProtectedChange(event) {
    const checkbox = event.target;
    const initiativeId = checkbox.getAttribute('data-initiative-id');
    const isChecked = checkbox.checked;

    if (!initiativeId) {
        console.error("Could not find initiative ID on checkbox:", checkbox);
        return;
    }

    // Find the initiative in the main data array
    const initiative = currentSystemData.yearlyInitiatives.find(init => init.initiativeId === initiativeId);

    if (initiative) {
        // Update the data model
        initiative.isProtected = isChecked;
        console.log(`Updated 'isProtected' for initiative ${initiativeId} to ${isChecked}`);

        // Re-generate the table to reflect the sort change
        generatePlanningTable();
    } else {
        console.error("Could not find initiative data for ID:", initiativeId);
    }
}



/** REVISED Handles the start of a drag operation - Check Protection */
function handleDragStart(event) {
    const initiativeId = event.target.getAttribute('data-initiative-id');
    const initiative = currentSystemData.yearlyInitiatives.find(init => init.initiativeId === initiativeId);

    // Double-check: Do not allow dragging protected items
    if (!initiative || initiative.isProtected) {
        console.log(`Preventing drag start for protected or invalid item: ${initiativeId}`);
        event.preventDefault(); // Stop the drag operation before it starts
        return;
    }

    draggedInitiativeId = initiativeId; // Store the ID of the item being dragged
    draggedRowElement = event.target; // Store the element itself for styling
    event.dataTransfer.setData('text/plain', draggedInitiativeId);
    event.dataTransfer.effectAllowed = 'move';

    // Add visual feedback (defer slightly)
    setTimeout(() => {
        if(draggedRowElement) draggedRowElement.classList.add('dragging');
    }, 0);
    console.log(`Drag Start: ${draggedInitiativeId}`);
}

/** Handles dragging over a potential drop target */
function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = 'move';

    const targetRow = event.target.closest('tr');
    if (!targetRow || targetRow === draggedRowElement) return; // Don't highlight self

    // Add a class to indicate drop zone (e.g., border)
    targetRow.classList.add('drag-over');
}

/** Handles leaving a potential drop target */
function handleDragLeave(event) {
    const targetRow = event.target.closest('tr');
     if (targetRow) {
        targetRow.classList.remove('drag-over');
    }
}

/** REVISED Handles the drop operation - Adds Robust Protection Checks */
function handleDrop(event) {
    event.preventDefault();
    const targetRow = event.target.closest('tr');
    if(targetRow) targetRow.classList.remove('drag-over'); // Clean up visual indicator

    if (!targetRow || !draggedInitiativeId || targetRow.getAttribute('data-initiative-id') === draggedInitiativeId) {
        console.log("Drop cancelled - invalid target or same item.");
        // No need to reset draggedInitiativeId here, handleDragEnd will do it
        return;
    }

    const targetInitiativeId = targetRow.getAttribute('data-initiative-id');
    console.log(`Drop: ${draggedInitiativeId} onto ${targetInitiativeId}`);

    // --- Find initiatives and indices ---
    const initiatives = currentSystemData.yearlyInitiatives;
    const draggedIndex = initiatives.findIndex(init => init.initiativeId === draggedInitiativeId);
    const targetIndex = initiatives.findIndex(init => init.initiativeId === targetInitiativeId);

    if (draggedIndex === -1 || targetIndex === -1) {
        console.error("Could not find dragged or target initiative in data array during drop.");
        // No need to reset draggedInitiativeId here, handleDragEnd will do it
        return;
    }

    const draggedInitiative = initiatives[draggedIndex];
    const targetInitiative = initiatives[targetIndex];

    // --- Apply Reordering Constraints ---
    // Constraint 0: Cannot drag anything if the dragged item wasn't found or was somehow protected
     if (!draggedInitiative || draggedInitiative.isProtected) {
         console.log("Drop invalid: Dragged item is protected or invalid.");
         alert("Cannot move a protected item.");
         // handleDragEnd will reset state
         return;
     }
    // Constraint 1: Cannot drop ONTO a protected row (target is protected)
    if (targetInitiative.isProtected) {
        console.log("Drop invalid: Cannot drop onto a protected item.");
        alert("Cannot drop an item onto a protected item.");
         // handleDragEnd will reset state
        return;
    }
    // Constraint 2: Check if dropping would place the non-protected item *above* any protected items.
    // This means the new index (targetIndex) must be less than the index of the *first* non-protected item.
    const firstNonProtectedIndex = initiatives.findIndex(init => !init.isProtected);
    if (targetIndex < firstNonProtectedIndex && firstNonProtectedIndex !== -1) {
         console.log("Drop invalid: Cannot move item above the protected block.");
         alert("Cannot move items above the block of protected initiatives.");
         // handleDragEnd will reset state
         return;
    }
    // --- End Constraints ---


    // --- Perform Reorder in the Data Array ---
    const [movedItem] = initiatives.splice(draggedIndex, 1);
    const newTargetIndex = initiatives.findIndex(init => init.initiativeId === targetInitiativeId); // Recalculate index after splice
    // Determine insert position based on drop position relative to target row middle
     const rect = targetRow.getBoundingClientRect();
     const dropY = event.clientY;
     const insertBefore = dropY < rect.top + rect.height / 2;

     if (insertBefore) {
         initiatives.splice(newTargetIndex, 0, movedItem); // Insert before target
     } else {
         initiatives.splice(newTargetIndex + 1, 0, movedItem); // Insert after target
     }

    console.log("Reordered initiatives array:", initiatives.map(i => i.initiativeId));
    // --- End Reorder ---


    // --- Refresh the Table ---
    // The draggedInitiativeId is reset in handleDragEnd
    generatePlanningTable();
    // --- End Refresh ---
}

/** Cleans up after drag operation ends (dropped or cancelled) */
function handleDragEnd(event) {
    // Remove the dragging class from the original element
     if (draggedRowElement) {
        draggedRowElement.classList.remove('dragging');
    }
    // Clean up any lingering drag-over styles just in case
    document.querySelectorAll('#planningTableBody tr.drag-over').forEach(row => {
        row.classList.remove('drag-over');
    });

    console.log("Drag End");
    draggedInitiativeId = null;
    draggedRowElement = null;
}

/** Handles changes to SDE Year estimate inputs in the planning table */
function handleEstimateChange(event) {
    const input = event.target;
    const initiativeId = input.getAttribute('data-initiative-id');
    const teamId = input.getAttribute('data-team-id');
    const newValue = parseFloat(input.value);

    if (!initiativeId || !teamId) {
        console.error("Missing initiative or team ID on estimate input:", input);
        return;
    }

    // Validate the input value
    const validatedValue = (!isNaN(newValue) && newValue > 0) ? newValue : 0;

    // Find the initiative
    const initiative = currentSystemData.yearlyInitiatives.find(init => init.initiativeId === initiativeId);
    if (!initiative) {
        console.error("Could not find initiative data for ID:", initiativeId);
        return;
    }

    // Ensure assignments array exists
    if (!initiative.assignments) {
        initiative.assignments = [];
    }

    // Find existing assignment for this team
    const assignmentIndex = initiative.assignments.findIndex(a => a.teamId === teamId);

    if (validatedValue > 0) {
        if (assignmentIndex > -1) {
            // Update existing assignment
            initiative.assignments[assignmentIndex].sdeYears = validatedValue;
            console.log(`Updated estimate for ${initiativeId}, team ${teamId} to ${validatedValue}`);
        } else {
            // Add new assignment
            initiative.assignments.push({ teamId: teamId, sdeYears: validatedValue });
            console.log(`Added estimate for ${initiativeId}, team ${teamId}: ${validatedValue}`);
        }
        // Optionally reformat the input value after successful update
        input.value = validatedValue.toFixed(2);
    } else {
        // Remove assignment if value is 0 or invalid
        if (assignmentIndex > -1) {
            initiative.assignments.splice(assignmentIndex, 1);
            console.log(`Removed assignment for ${initiativeId}, team ${teamId}`);
        }
        // Clear the input field if the value was invalid or zero
        input.value = '';
    }

    // --- Refresh the entire table to recalculate totals and statuses ---
    generatePlanningTable();
    // --- End Refresh ---

    // Optional: Maintain focus if needed, though redraw might make it tricky
    // input.focus(); // Might not work reliably after full redraw
}

/** Sets the capacity scenario for planning and redraws the table */
function setPlanningScenario(scenario) {
  console.log(`Setting planning scenario to: ${scenario}`);
  // Allow 'effective', 'funded', or 'team_bis'
  if (scenario === 'effective' || scenario === 'funded' || scenario === 'team_bis') {
    planningCapacityScenario = scenario;
    // Redraw the planning table to apply the change
    generatePlanningTable();
  } else {
    console.warn("Invalid planning scenario provided:", scenario);
  }
}
// Make it globally accessible if not already
window.setPlanningScenario = setPlanningScenario;

/**
 * REVISED (v7 - Apply Constraints Sync) - Generates the Team Load Summary table.
 * - Reads applyCapacityConstraintsToggle state.
 * - Uses calculatedCapacityMetrics when toggle is ON to determine:
 * - The overall ATL/BTL limit for filtering initiatives.
 * - The per-team Scenario Capacity Limit displayed.
 * - The Remaining Capacity calculation.
 * - Updates column headers dynamically based on Net/Gross usage.
 */
function generateTeamLoadSummaryTable() {
    console.log("Generating Team Load Summary Table (v7 - Apply Constraints Sync)...");

    // --- Get Containers ---
    const summaryContentDiv = document.getElementById('teamLoadSummaryContent');
    const summaryContainer = document.getElementById('teamLoadSummarySection');
    if (!summaryContentDiv || !summaryContainer) { console.error("Missing Team Load Summary elements (contentDiv or container)."); return; }
    const summaryTable = summaryContentDiv.querySelector('#teamLoadSummaryTable');
    const summaryTableBody = summaryTable?.querySelector('#teamLoadSummaryTableBody');
    const summaryTableFoot = summaryTable?.querySelector('#teamLoadSummaryTableFoot');
    if (!summaryTable || !summaryTableBody || !summaryTableFoot) { console.error("Missing Team Load Summary table/tbody/tfoot elements."); return; }
    summaryTableBody.innerHTML = ''; summaryTableFoot.innerHTML = ''; // Clear previous content

    // --- Data Checks ---
    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !currentSystemData.teams) { /* ... error handling ... */ return; }

    // --- Get Pre-Calculated Capacity Metrics & Check Availability ---
    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    const metricsAvailable = !!calculatedMetrics;

    // --- Calculate Gross Capacity Totals (Overall & Per Team) ---
    let totalFundedHC = 0, totalTeamBIS = 0, totalAwayTeamBIS = 0;
    const teamCapacities = {}; // Stores GROSS { fundedHC, teamBIS, awayBIS, effectiveBIS } per teamId
    const teams = currentSystemData.teams || [];
    teams.forEach(team => {
        if (!team || !team.teamId) return;
        const funded = team.fundedHeadcount ?? 0;
        const teamBIS = team.engineers?.length ?? 0;
        const awayBIS = team.awayTeamMembers?.length ?? 0;
        const effectiveBIS = teamBIS + awayBIS;
        totalFundedHC += funded; totalTeamBIS += teamBIS; totalAwayTeamBIS += awayBIS;
        teamCapacities[team.teamId] = { fundedHC: funded, teamBIS: teamBIS, awayBIS: awayBIS, effectiveBIS: effectiveBIS };
    });
    const totalEffectiveBIS = totalTeamBIS + totalAwayTeamBIS;

    // --- *** Determine Overall ATL/BTL Limit FOR SUMMARY (Conditional on Toggle) *** ---
    let summaryAtlBtlLimit;
    let isNetCapacityUsed = false;
    let scenarioName = ''; // For display
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');

    if (applyCapacityConstraintsToggle && metricsAvailable && calculatedMetrics.totals?.[scenarioKey]) {
        // USE NET CAPACITY
        summaryAtlBtlLimit = calculatedMetrics.totals[scenarioKey].netYrs;
        isNetCapacityUsed = true;
        scenarioName = `Net ${scenarioKey}`;
        console.log(`Summary Table using NET capacity limit: ${summaryAtlBtlLimit.toFixed(2)}`);
    } else {
        // USE GROSS CAPACITY
        if (planningCapacityScenario === 'funded') { summaryAtlBtlLimit = totalFundedHC; scenarioName = 'Gross Funded HC'; }
        else if (planningCapacityScenario === 'team_bis') { summaryAtlBtlLimit = totalTeamBIS; scenarioName = 'Gross Team BIS'; }
        else { summaryAtlBtlLimit = totalEffectiveBIS; scenarioName = 'Gross Effective BIS';} // Default to effective
        console.log(`Summary Table using GROSS capacity limit: ${summaryAtlBtlLimit.toFixed(2)}`);
    }
    // --- End Limit Determination for Summary ---

    // Update collapsible header title
    const summaryTitleHeader = summaryContainer.querySelector('h4');
    if (summaryTitleHeader) {
        const toggleSpan = summaryTitleHeader.querySelector('span.toggle-indicator');
        summaryTitleHeader.textContent = ` Team Load Summary (for ATL Initiatives - Scenario: ${scenarioName})`;
        if (toggleSpan) { summaryTitleHeader.insertBefore(toggleSpan, summaryTitleHeader.firstChild); }
    }

    // --- *** Recalculate Assigned ATL SDEs per Team using summaryAtlBtlLimit *** ---
    const sortedInitiatives = [...currentSystemData.yearlyInitiatives].sort((a, b) => { if (a.isProtected && !b.isProtected) return -1; if (!a.isProtected && b.isProtected) return 1; return 0; });
    let overallCumulativeSde = 0;
    let teamAtlSdeAssigned = {}; // Stores { teamId: totalSDE }
    teams.forEach(team => { if(team && team.teamId) teamAtlSdeAssigned[team.teamId] = 0; }); // Initialize

    sortedInitiatives.forEach(initiative => {
        let initiativeTotalSde = 0;
        (initiative.assignments || []).forEach(a => { initiativeTotalSde += a.sdeYears; });
        const potentialCumulative = overallCumulativeSde + initiativeTotalSde;

        // Check if adding this initiative *keeps* it within the determined limit (Net or Gross)
        if (potentialCumulative <= summaryAtlBtlLimit) {
             overallCumulativeSde = potentialCumulative; // Update cumulative ONLY if ATL
            // Add assignments to team totals
            (initiative.assignments || []).forEach(assignment => {
                 if (teamAtlSdeAssigned.hasOwnProperty(assignment.teamId)) {
                     teamAtlSdeAssigned[assignment.teamId] += assignment.sdeYears;
                 }
            });
        } else {
             // Stop accumulating once BTL is hit according to the summary's limit
             // Do not process further initiatives for this summary table
             return; // Exit the forEach loop early (optimization)
        }
    });
    // --- End Assigned SDE Calculation ---

    // --- Populate Summary Table Body ---
    let totalAssignedAtlSdeOverall = 0;
    let totalScenarioCapacityOverall = 0;

    teams.sort((a,b) => (a?.teamName || a?.teamIdentity || '').localeCompare(b?.teamName || b?.teamIdentity || ''))
         .forEach(team => {
        if (!team || !team.teamId) return;
        const teamId = team.teamId;
        const grossCapacity = teamCapacities[teamId]; // Get GROSS capacities
        const assignedAtlSde = teamAtlSdeAssigned[teamId] || 0; // Get potentially NET-determined ATL SDEs
        if (!grossCapacity) { console.warn(`Gross capacity data not found for teamId: ${teamId}. Skipping summary row.`); return; }

        // *** Determine the Scenario Capacity Limit to DISPLAY (Net or Gross) ***
        let displayTeamScenarioLimit = 0;
        if (isNetCapacityUsed && metricsAvailable && calculatedMetrics[teamId]?.[scenarioKey]) {
            displayTeamScenarioLimit = calculatedMetrics[teamId][scenarioKey].netYrs;
        } else { // Use Gross
            if (planningCapacityScenario === 'funded') { displayTeamScenarioLimit = grossCapacity?.fundedHC ?? 0; }
            else if (planningCapacityScenario === 'team_bis') { displayTeamScenarioLimit = grossCapacity?.teamBIS ?? 0; }
            else { displayTeamScenarioLimit = grossCapacity?.effectiveBIS ?? 0; }
        }
        // --- End Display Limit Determination ---

        const remainingCapacity = displayTeamScenarioLimit - assignedAtlSde;
        totalAssignedAtlSdeOverall += assignedAtlSde;
        totalScenarioCapacityOverall += displayTeamScenarioLimit;

        let statusText = '✅ OK'; let statusColor = 'green';
        if (remainingCapacity < 0) { statusText = '🛑 Overloaded'; statusColor = 'red'; }
        else if (remainingCapacity < 0.5 && displayTeamScenarioLimit > 0) { statusText = '⚠️ Near Limit'; statusColor = 'darkorange'; }

        const row = summaryTableBody.insertRow();
        row.insertCell().textContent = team.teamIdentity || team.teamName || teamId;            // Col 0: Team Name
        row.insertCell().textContent = (grossCapacity?.fundedHC ?? 0).toFixed(2);               // Col 1: Funded HC (Gross)
        row.insertCell().textContent = (grossCapacity?.teamBIS ?? 0).toFixed(2);                // Col 2: Team BIS (Gross)
        row.insertCell().textContent = (grossCapacity?.awayBIS ?? 0).toFixed(2);                // Col 3: Away BIS (Gross)
        row.insertCell().textContent = (grossCapacity?.effectiveBIS ?? 0).toFixed(2);           // Col 4: Effective BIS (Gross)
        row.insertCell().textContent = assignedAtlSde.toFixed(2);                               // Col 5: Assigned ATL SDEs (potentially Net-based)
        row.insertCell().textContent = displayTeamScenarioLimit.toFixed(2);                     // Col 6: Scenario Limit (potentially Net)
        const remainingCell = row.insertCell();                                                 // Col 7: Remaining Capacity
            remainingCell.textContent = remainingCapacity.toFixed(2);
            remainingCell.style.color = remainingCapacity < 0 ? 'red' : 'green';
        const statusCell = row.insertCell();                                                    // Col 8: ATL Status
            statusCell.textContent = statusText;
            statusCell.style.color = statusColor;

        // Apply Styling
        const cells = Array.from(row.cells);
        cells.forEach((cell, index) => {
            cell.style.border = '1px solid #ccc';
            cell.style.padding = '4px 6px';
            if (index === 0) { cell.style.textAlign = 'left';}
            else if (index === cells.length - 1) { cell.style.textAlign = 'center'; }
            else { cell.style.textAlign = 'center'; }
        });
    }); // End teams.forEach

    // --- Populate Footer ---
    const footerRow = summaryTableFoot.insertRow();
    footerRow.insertCell().textContent = 'Totals';                                             // Col 0
    footerRow.insertCell().textContent = totalFundedHC.toFixed(2);                             // Col 1
    footerRow.insertCell().textContent = totalTeamBIS.toFixed(2);                              // Col 2
    footerRow.insertCell().textContent = totalAwayTeamBIS.toFixed(2);                          // Col 3
    footerRow.insertCell().textContent = totalEffectiveBIS.toFixed(2);                         // Col 4
    footerRow.insertCell().textContent = totalAssignedAtlSdeOverall.toFixed(2);                // Col 5
    footerRow.insertCell().textContent = totalScenarioCapacityOverall.toFixed(2);              // Col 6
    const totalRemainingCell = footerRow.insertCell();                                         // Col 7
        totalRemainingCell.textContent = (totalScenarioCapacityOverall - totalAssignedAtlSdeOverall).toFixed(2);
        totalRemainingCell.style.color = (totalScenarioCapacityOverall - totalAssignedAtlSdeOverall) < 0 ? 'red' : 'green';
    footerRow.insertCell().textContent = '';                                                   // Col 8 (Status)

    // Apply Footer Styling
    const footerCells = Array.from(footerRow.cells);
    footerCells.forEach((cell, index) => {
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '4px 6px';
        cell.style.backgroundColor = '#f8f9fa';
        if (index === 0) { cell.style.textAlign = 'left'; }
        else if (index === footerCells.length - 1) { cell.style.textAlign = 'center';}
        else { cell.style.textAlign = 'center'; }
    });

    console.log("Finished generating Team Load Summary Table (v7 - Apply Constraints Sync).");
}
window.generateTeamLoadSummaryTable = generateTeamLoadSummaryTable; // Make global if needed

/** NEW Helper: Toggles the capacity constraint application and redraws the planning table */
function toggleCapacityConstraints(isChecked) {
    console.log(`Toggling capacity constraints: ${isChecked}`);
    applyCapacityConstraintsToggle = isChecked; // Update the global state variable
    generatePlanningTable(); // Redraw the table to apply the change
}
// Make it globally accessible for the checkbox's onchange
window.toggleCapacityConstraints = toggleCapacityConstraints;

/** REVISED (v6) - Generates planning table - Persistent Green/Red Team Cells & Scoped Row Styles */
function generatePlanningTable() {
    console.log("Generating planning table (v6 - Persistent Team Colors)...");
    const planningViewDiv = document.getElementById('planningView');
    const capacitySummaryDiv = document.getElementById('planningCapacitySummary');
    const scenarioControlDiv = document.getElementById('planningScenarioControl');
    const tableContainer = document.getElementById('planningTableContainer');

    // --- Clear previous content ONLY from relevant areas ---
    if (capacitySummaryDiv) capacitySummaryDiv.innerHTML = ''; else console.error("Missing #planningCapacitySummary div");
    if (scenarioControlDiv) scenarioControlDiv.innerHTML = ''; else console.error("Missing #planningScenarioControl div");
    if (tableContainer) tableContainer.innerHTML = ''; else console.error("Missing #planningTableContainer div");

    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !currentSystemData.teams) {
        if (tableContainer) tableContainer.innerHTML = '<p style="color: orange;">No planning data loaded or no initiatives/teams found. Use "Edit System" to load or define data.</p>';
        if (capacitySummaryDiv) capacitySummaryDiv.innerHTML = 'Load a system to see capacity.';
        return;
    }

    // --- 1. Calculate Detailed Capacity (Overall & Per Team) --- (No change)
    let totalFundedHC = 0, totalTeamBIS = 0, totalAwayTeamBIS = 0;
    const teamCapacities = {}; // Store { fundedHC, teamBIS, effectiveBIS } per teamId
    const teams = currentSystemData.teams || [];
    teams.forEach(team => {
        const funded = team.fundedHeadcount ?? 0;
        const teamBIS = team.engineers?.length ?? 0;
        const awayBIS = team.awayTeamMembers?.length ?? 0;
        const effectiveBIS = teamBIS + awayBIS;
        totalFundedHC += funded;
        totalTeamBIS += teamBIS;
        totalAwayTeamBIS += awayBIS;
        teamCapacities[team.teamId] = { fundedHC: funded, teamBIS: teamBIS, effectiveBIS: effectiveBIS };
    });
    const totalEffectiveBIS = totalTeamBIS + totalAwayTeamBIS;

    // --- 2. Update Capacity Summary Display --- (No change)
    if (capacitySummaryDiv) { /* ... same as v5 ... */
        capacitySummaryDiv.innerHTML = `
            <span title="Finance Approved Headcount" style="margin-right: 15px;">Funded HC: <strong style="color: #28a745;">${totalFundedHC.toFixed(2)}</strong></span> |
            <span title="Actual Team Members" style="margin-right: 15px;">Team BIS: <strong style="color: #17a2b8;">${totalTeamBIS.toFixed(2)}</strong></span> |
            <span title="Borrowed / Away-Team Members" style="margin-right: 15px;">Away BIS: <strong style="color: #ffc107;">${totalAwayTeamBIS.toFixed(2)}</strong></span> |
            <span title="Total Effective Capacity (Team + Away)">Effective BIS: <strong style="color: #007bff;">${totalEffectiveBIS.toFixed(2)}</strong></span>
        `;
    }

    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics; // Get stored metrics
    const metricsAvailable = !!calculatedMetrics; // Check if metrics exist
    if (!metricsAvailable) {
        console.warn("Calculated capacity metrics not found in currentSystemData. Capacity constraints cannot be applied.");
        // Optionally reset the toggle state if metrics are missing after load?
        // applyCapacityConstraintsToggle = false;
    }

    // --- 3. Add/Update Scenario Toggle UI --- (No change)
    if (scenarioControlDiv) { /* ... same as v5 ... */
        const baseButtonStyle = 'padding: 5px 10px; margin-left: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.9em;';
        const activeButtonStyle = baseButtonStyle + ' background-color: #007bff; color: white; border-color: #0056b3; font-weight: bold;';
        const inactiveButtonStyle = baseButtonStyle + ' background-color: #e9ecef; color: #495057;';
        const effectiveButtonStyle = (planningCapacityScenario === 'effective') ? activeButtonStyle : inactiveButtonStyle;
        const fundedButtonStyle = (planningCapacityScenario === 'funded') ? activeButtonStyle : inactiveButtonStyle;
        const teamBisButtonStyle = (planningCapacityScenario === 'team_bis') ? activeButtonStyle : inactiveButtonStyle;
        scenarioControlDiv.innerHTML = `
            <strong style="margin-right: 10px;">Calculate ATL/BTL using:</strong>
            <button type="button" id="btnEffectiveBIS" style="${effectiveButtonStyle}" title="Use Effective BIS (${totalEffectiveBIS.toFixed(2)}) = Team + Away" onclick="setPlanningScenario('effective')">Effective BIS</button>
            <button type="button" id="btnTeamBIS" style="${teamBisButtonStyle}" title="Use Team BIS (${totalTeamBIS.toFixed(2)}) = Only Team Members" onclick="setPlanningScenario('team_bis')">Team BIS</button>
            <button type="button" id="btnFundedHC" style="${fundedButtonStyle}" title="Use Funded HC (${totalFundedHC.toFixed(2)}) = Budgeted Headcount" onclick="setPlanningScenario('funded')">Funded HC</button>
            <label style="margin-left: 20px; font-size: 0.9em; cursor: ${metricsAvailable ? 'pointer' : 'not-allowed'}; vertical-align: middle;" title="${metricsAvailable ? 'Apply calculated capacity constraints (leave, overhead, etc.) to ATL/BTL calculation (Might be less than before!). Look at Tune Capacity Constraints page to understand more!' : 'Capacity constraints not calculated or saved. Go to \'Tune Capacity Constraints\'.'}">
                <input type="checkbox" id="applyConstraintsToggle" style="vertical-align: middle;" onchange="toggleCapacityConstraints(this.checked)" ${applyCapacityConstraintsToggle ? 'checked' : ''} ${metricsAvailable ? '' : 'disabled'}>
                Apply Capacity Constraints?
            </label>
            <button type="button" id="savePlanButton"
                    style="${baseButtonStyle} background-color: #dc3545; color: white; border-color: #dc3545; margin-left: 25px;"
                    title="Save the current order and estimates for all initiatives in this plan.">
                Save Current Plan Order & Estimates
            </button>
        `;

        // --- Re-attach listener AFTER button is added to DOM ---
        // We need to find the button *after* innerHTML is set
        setTimeout(() => { // Use timeout to ensure DOM update
            const savePlanButton = document.getElementById('savePlanButton');
            if (savePlanButton) {
                 // Remove old listener if it exists from previous renders (safer)
                 savePlanButton.removeEventListener('click', handleSavePlan);
                 // Add the listener
                 savePlanButton.addEventListener('click', handleSavePlan);
                 console.log("Attached click listener to moved Save button.");
            } else {
                 console.error("Could not find moved Save button to attach listener.");
            }
       }, 0);
       // --- End of setTimeout block ---    
    
    } // End of the if (scenarioControlDiv) block
    
    // Determine Overall ATL/BTL Limit based on scenario
    // --- 5. Determine Overall ATL/BTL Limit (Conditional on Toggle) ---
    let atlBtlCapacityLimit;
    let isNetCapacityUsed = false;
    // Determine the key needed to look up metrics based on the button state

    if (applyCapacityConstraintsToggle && metricsAvailable) {
        // USE NET CAPACITY
        atlBtlCapacityLimit = calculatedMetrics.totals?.[scenarioKey]?.netYrs ?? 0; // Use Net SDE Years from stored metrics
        isNetCapacityUsed = true;
        console.log(`Using NET capacity limit for ATL/BTL: ${atlBtlCapacityLimit.toFixed(2)} (Scenario: ${scenarioKey})`);
        // Disable toggle in UI if metrics are still missing (shouldn't happen if check passed, but safe)
        const toggleInput = document.getElementById('applyConstraintsToggle');
        if(toggleInput && !calculatedMetrics.totals?.[scenarioKey]) {
             console.warn(`Metrics for scenario ${scenarioKey} missing, disabling toggle.`);
             toggleInput.checked = false;
             toggleInput.disabled = true;
             applyCapacityConstraintsToggle = false; // Reset state variable too
             isNetCapacityUsed = false; // Fallback to gross
             // Recalculate limit using Gross
             if (planningCapacityScenario === 'funded') { atlBtlCapacityLimit = totalFundedHC; }
             else if (planningCapacityScenario === 'team_bis') { atlBtlCapacityLimit = totalTeamBIS; }
             else { atlBtlCapacityLimit = totalEffectiveBIS; }
             console.log(`FALLBACK to GROSS capacity limit: ${atlBtlCapacityLimit.toFixed(2)}`);
        }

    } else {
        // USE GROSS CAPACITY (Original behavior)
        if (planningCapacityScenario === 'funded') { atlBtlCapacityLimit = totalFundedHC; }
        else if (planningCapacityScenario === 'team_bis') { atlBtlCapacityLimit = totalTeamBIS; }
        else { atlBtlCapacityLimit = totalEffectiveBIS; } // Default to effective
        console.log(`Using GROSS capacity limit for ATL/BTL: ${atlBtlCapacityLimit.toFixed(2)} (Scenario: ${scenarioKey})`);
        // Ensure toggle is unchecked if metrics were unavailable when it was initially rendered
        if(!metricsAvailable) {
            applyCapacityConstraintsToggle = false;
            const toggleInput = document.getElementById('applyConstraintsToggle');
             if(toggleInput) {
                toggleInput.checked = false;
                toggleInput.disabled = true;
             }
        }
    }
    // --- End Limit Determination ---

    generateTeamLoadSummaryTable();

    // --- 4. Prepare Table Structure ---
    const tableWrapper = document.createElement('div'); tableWrapper.id = 'planningTableWrapper';
    const table = document.createElement('table'); table.style.width = '100%'; table.style.borderCollapse = 'collapse'; table.id = 'planningTable';
    const thead = document.createElement('thead'); const headerRow = document.createElement('tr');
    const fixedHeaders = ['Protected', 'Title', 'ID', 'Description', 'Total SDE Years', 'Cumulative SDE Years', 'Capacity Status', 'ATL/BTL'];
    fixedHeaders.forEach(text => { const th = document.createElement('th'); th.textContent = text; th.style.border = '1px solid #ccc'; th.style.padding = '8px'; th.style.textAlign = 'left'; th.style.whiteSpace = 'nowrap'; headerRow.appendChild(th); });
    const teamHeaderMap = new Map();
    teams.forEach((team, index) => { 
      const th = document.createElement('th'); 
      const teamDisplayIdentity = team.teamIdentity || team.teamId || 'Unknown'; // Use ID if identity missing
      const teamFullName = team.teamName || teamDisplayIdentity; // Use full name or identity/ID for title
      th.textContent = teamDisplayIdentity; // Display the identity
      th.title = `Team: ${teamFullName}\nIdentity: ${teamDisplayIdentity}\n(Funded: ${teamCapacities[team.teamId]?.fundedHC.toFixed(2)}, Team BIS: ${teamCapacities[team.teamId]?.teamBIS.toFixed(2)}, Eff. BIS: ${teamCapacities[team.teamId]?.effectiveBIS.toFixed(2)})`; // Update title
      th.setAttribute('data-team-id', team.teamId); th.style.border = '1px solid #ccc'; 
      th.style.padding = '8px'; 
      th.style.textAlign = 'center'; 
      th.style.writingMode = 'vertical-lr'; 
      th.style.textOrientation = 'mixed'; 
      th.style.whiteSpace = 'nowrap'; 
      th.style.minWidth = '35px'; 
      th.style.maxWidth = '35px'; 
      headerRow.appendChild(th); 
      teamHeaderMap.set(fixedHeaders.length + index, team.teamId); 
    });
    thead.appendChild(headerRow); table.appendChild(thead);
    const tbody = document.createElement('tbody'); tbody.id = 'planningTableBody';


    // --- 5. Sort Initiatives & Populate Body ---
    const sortedInitiatives = [...currentSystemData.yearlyInitiatives].sort((a, b) => { /* ... same sort ... */ if (a.isProtected && !b.isProtected) return -1; if (!a.isProtected && b.isProtected) return 1; return 0; });
    let cumulativeSdeTotal = 0; // Overall cumulative
    let teamCumulativeSde = {}; // { teamId: cumulativeValue }
    teams.forEach(team => { teamCumulativeSde[team.teamId] = 0; }); // Initialize

    sortedInitiatives.forEach((initiative, rowIndex) => {
        if (!initiative || !initiative.initiativeId) { console.warn("Skipping invalid initiative data at index:", rowIndex); return; }
        const row = tbody.insertRow(); row.setAttribute('data-initiative-id', initiative.initiativeId); row.style.borderBottom = '1px solid #eee'; row.style.padding = '2px 0';
        // Drag and drop setup (No change)
        row.setAttribute('draggable', !initiative.isProtected); row.addEventListener('dragover', handleDragOver); row.addEventListener('dragleave', handleDragLeave); row.addEventListener('drop', handleDrop); row.addEventListener('dragend', handleDragEnd); if (!initiative.isProtected) { row.addEventListener('dragstart', handleDragStart); row.style.cursor = 'move'; } else { row.style.cursor = 'default'; }

        // Fixed Cells (Protected, Title, ID, Desc) - No changes
        const protectedCell = row.insertCell(); const protectedCheckbox = document.createElement('input'); protectedCheckbox.type = 'checkbox'; protectedCheckbox.checked = initiative.isProtected; protectedCheckbox.setAttribute('data-initiative-id', initiative.initiativeId); protectedCheckbox.style.cursor = 'pointer'; protectedCheckbox.onchange = handleProtectedChange; protectedCell.appendChild(protectedCheckbox); protectedCell.style.textAlign = 'center';
        const titleCell = row.insertCell(); titleCell.textContent = initiative.title || 'No Title'; titleCell.style.fontWeight = initiative.isProtected ? 'bold' : 'normal';
        const idCell = row.insertCell(); idCell.textContent = initiative.initiativeId; idCell.style.fontSize = '0.8em'; idCell.style.color = '#555';
        const descCell = row.insertCell(); const descText = initiative.description || ''; descCell.textContent = descText.length > 50 ? descText.substring(0, 47) + '...' : descText; descCell.title = descText;

        // Placeholder cells for overall totals/status
        const totalSdeCell = row.insertCell(); totalSdeCell.style.textAlign = 'right';
        const cumSdeCell = row.insertCell(); cumSdeCell.style.textAlign = 'right';
        const statusCell = row.insertCell(); statusCell.style.textAlign = 'center';
        const atlBtlCell = row.insertCell(); atlBtlCell.style.fontWeight = 'bold'; atlBtlCell.style.textAlign = 'center';

        let initiativeTotalSde = 0;
        const assignmentsMap = new Map((initiative.assignments || []).map(a => [a.teamId, a.sdeYears]));

        // *** REVISED: Per-Team Cell Coloring Logic ***
        teamHeaderMap.forEach((teamId, colIndex) => {
            const teamCell = row.insertCell();
            const currentEstimate = assignmentsMap.get(teamId) || 0;
            teamCumulativeSde[teamId] += currentEstimate; // Increment this team's cumulative

            // Estimate Input (still needed)
            const estimateInput = document.createElement('input');
            estimateInput.type = 'number'; estimateInput.min = '0'; estimateInput.step = '0.25'; estimateInput.value = currentEstimate > 0 ? currentEstimate.toFixed(2) : '';
            estimateInput.setAttribute('data-initiative-id', initiative.initiativeId); estimateInput.setAttribute('data-team-id', teamId);
            estimateInput.style.width = '60px'; estimateInput.style.textAlign = 'right';
            estimateInput.style.border = 'none';
            estimateInput.style.backgroundColor = 'transparent'; // Make input see-through
            estimateInput.addEventListener('change', handleEstimateChange);
            teamCell.appendChild(estimateInput);
            teamCell.style.textAlign = 'center';

            // Determine team's scenario limit
            // --- Determine team's limit and apply color based on toggle state ---
            let teamLimit = 0;
            let teamLimitType = '';
            let teamLimitValueStr = 'N/A';
            const currentTeamCumulative = teamCumulativeSde[teamId]; // Cumulative remains the same calculation

            if (isNetCapacityUsed && metricsAvailable && calculatedMetrics[teamId]?.[scenarioKey]) {
                // USE NET CAPACITY FOR COLORING
                teamLimit = calculatedMetrics[teamId]?.[scenarioKey]?.netYrs ?? 0;
                teamLimitType = `Net ${scenarioKey}`;
                teamLimitValueStr = teamLimit.toFixed(2);
                if (currentTeamCumulative <= teamLimit) {
                    teamCell.style.backgroundColor = '#d4edda'; // Green
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimitValueStr}) - OK`;
                } else {
                    teamCell.style.backgroundColor = '#f8d7da'; // Red
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimitValueStr}) - Overloaded`;
                }
            } else {
                // USE GROSS CAPACITY FOR COLORING (Original behavior)
                const teamGrossCapacityData = teamCapacities[teamId];
                if (planningCapacityScenario === 'funded') { teamLimit = teamGrossCapacityData?.fundedHC ?? 0; teamLimitType = `Gross Funded HC`; }
                else if (planningCapacityScenario === 'team_bis') { teamLimit = teamGrossCapacityData?.teamBIS ?? 0; teamLimitType = `Gross Team BIS`; }
                else { teamLimit = teamGrossCapacityData?.effectiveBIS ?? 0; teamLimitType = `Gross Effective BIS`; }
                teamLimitValueStr = teamLimit.toFixed(2);

                if (currentTeamCumulative <= teamLimit) {
                    teamCell.style.backgroundColor = '#d4edda'; // Green
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimitValueStr}) - OK`;
                } else {
                    teamCell.style.backgroundColor = '#f8d7da'; // Red
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimitValueStr}) - Overloaded`;
                }
            }
             // --- End Conditional Coloring ---

            initiativeTotalSde += currentEstimate;
        }); // End teamHeaderMap.forEach

        // Calculate and display OVERALL row totals and status
        totalSdeCell.textContent = initiativeTotalSde.toFixed(2);
        cumulativeSdeTotal += initiativeTotalSde;
        cumSdeCell.textContent = cumulativeSdeTotal.toFixed(2);

        // Overall Capacity Status (vs Team BIS and Funded HC) - No change
         if (cumulativeSdeTotal <= totalTeamBIS) { statusCell.textContent = '✅'; statusCell.title = `Within Team BIS (${totalTeamBIS.toFixed(2)})`; statusCell.style.backgroundColor = '#d4edda';} else if (cumulativeSdeTotal <= totalFundedHC) { statusCell.textContent = '⚠️'; statusCell.title = `Exceeds Team BIS (${totalTeamBIS.toFixed(2)}), Within Funded HC (${totalFundedHC.toFixed(2)}). Requires hiring or away-team.`; statusCell.style.backgroundColor = '#fff3cd'; } else { statusCell.textContent = '🛑'; statusCell.title = `Exceeds Funded HC (${totalFundedHC.toFixed(2)})`; statusCell.style.backgroundColor = '#f8d7da'; }

        // Overall ATL/BTL Status (vs Scenario Limit) - No change in text/color logic
        const isBTL = cumulativeSdeTotal > atlBtlCapacityLimit;
        if (!isBTL) {
            atlBtlCell.textContent = 'ATL'; atlBtlCell.style.color = 'green';
            // Add nuance tooltips (No change)
            /* ... tooltips comparing scenario limit vs other limits ... */
             if (planningCapacityScenario === 'effective' && cumulativeSdeTotal > totalFundedHC) { row.style.opacity = '0.8'; row.title = 'ATL (vs Effective BIS), but BTL vs Funded HC.'; } else if (planningCapacityScenario === 'team_bis' && cumulativeSdeTotal > totalEffectiveBIS) { row.style.opacity = '0.8'; row.title = 'ATL (vs Team BIS), but BTL vs Effective BIS.'; } else if (planningCapacityScenario === 'team_bis' && cumulativeSdeTotal > totalFundedHC) { row.style.opacity = '0.8'; row.title = 'ATL (vs Team BIS), but BTL vs Funded HC.'; } else if (planningCapacityScenario === 'funded' && cumulativeSdeTotal > totalEffectiveBIS) { row.style.opacity = '0.8'; row.title = 'ATL (vs Funded HC), but BTL vs Effective BIS.'; } else { row.style.opacity = '1'; row.title = ''; }
        } else {
            atlBtlCell.textContent = 'BTL'; atlBtlCell.style.color = 'red';
        }

        // *** REVISED: Apply Row Styling ONLY to Fixed Columns ***
        row.querySelectorAll('td').forEach((cell, idx) => {
            if (idx < fixedHeaders.length) { // Apply only to fixed columns
                if (initiative.isProtected) {
                    cell.style.backgroundColor = '#f8f9fa'; // Gray for protected fixed cells
                } else if (isBTL) {
                    cell.style.backgroundColor = '#ffeeee'; // Light red for BTL fixed cells
                } else {
                    // Set default for non-protected, non-BTL fixed cells (except status cell)
                    if (idx !== fixedHeaders.indexOf('Capacity Status')) {
                       cell.style.backgroundColor = '#fff'; // Default white
                    }
                }
            }
            // Ensure Capacity Status cell retains its independent color
            if (idx === fixedHeaders.indexOf('Capacity Status')) {
                 if (cumulativeSdeTotal <= totalTeamBIS) { cell.style.backgroundColor = '#d4edda';} else if (cumulativeSdeTotal <= totalFundedHC) { cell.style.backgroundColor = '#fff3cd'; } else { cell.style.backgroundColor = '#f8d7da'; }
                 // Also override if protected/BTL applies to fixed columns
                 if (initiative.isProtected) cell.style.backgroundColor = '#f8f9fa';
                 else if (isBTL) cell.style.backgroundColor = '#ffeeee';
            }
        });

    }); // End sortedInitiatives.forEach

    // --- Assemble the table structure ---
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    if (tableContainer) { tableContainer.appendChild(tableWrapper); }
    // --- End Assemble Table Structure ---

    adjustPlanningTableHeight();
    console.log("Finished generating planning table (v6 - Persistent Team Colors).");
} // --- End generatePlanningTable ---

/** Dynamically adjusts the max-height of the planning table scroll wrapper */
function adjustPlanningTableHeight() {
    const planningViewDiv = document.getElementById('planningView');
    const tableWrapper = document.getElementById('planningTableWrapper');
    const controlsAboveTable = document.getElementById('planningScenarioControl'); // Use scenario controls as a reference point above the table

    if (!planningViewDiv || !tableWrapper || !controlsAboveTable || planningViewDiv.style.display === 'none') {
        // Don't adjust if the view isn't visible or elements are missing
        return;
    }

    // Calculate available height
    const viewportHeight = window.innerHeight;
    const controlsRect = controlsAboveTable.getBoundingClientRect(); // Get position of controls above the table
    const controlsBottom = controlsRect.bottom; // Bottom edge of the controls
    const tableWrapperTop = tableWrapper.getBoundingClientRect().top; // Top edge of the table wrapper itself

    // Determine space available below the controls. Use whichever top position is lower (should be tableWrapperTop).
    const availableSpace = viewportHeight - tableWrapperTop;

    // Set a reasonable bottom margin/padding
    const bottomMargin = 60; // Adjust as needed (accounts for "Add Initiative" section, footer, etc.)

    let calculatedMaxHeight = availableSpace - bottomMargin;

    // Set a minimum height to prevent it becoming too small
    const minHeight = 200; // Minimum pixels for the table area
    calculatedMaxHeight = Math.max(minHeight, calculatedMaxHeight);

    console.log(`Adjusting planning table max-height to: ${calculatedMaxHeight}px`);
    tableWrapper.style.maxHeight = `${calculatedMaxHeight}px`;
}

/** Populates the team selection dropdown in the 'Add Initiative' section */
function populateTeamSelect() {
    const select = document.getElementById('newInitiativeTeamSelect');
    if (!select) return;

    // Clear existing options except the placeholder
    select.length = 1; // Keep only the "-- Select Team --" option

    (currentSystemData.teams || []).forEach(team => {
        const option = document.createElement('option');
        option.value = team.teamId;
        option.textContent = team.teamIdentity || team.teamName || team.teamId;
        select.appendChild(option);
    });
}

/** Updates the display area showing temporary team assignments */
function displayTempAssignments() {
    const displayDiv = document.getElementById('newInitiativeAssignmentsDisplay');
    if (!displayDiv) return;
    displayDiv.innerHTML = ''; // Clear current display

    tempAssignments.forEach((assignment, index) => {
        const team = (currentSystemData.teams || []).find(t => t.teamId === assignment.teamId);
        const teamName = team ? (team.teamIdentity || team.teamName) : assignment.teamId;
        const assignmentDiv = document.createElement('div');
        assignmentDiv.style.marginBottom = '3px';
        assignmentDiv.textContent = `${teamName}: ${assignment.sdeYears.toFixed(2)} SDE Years `;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.style.marginLeft = '10px';
        removeButton.style.fontSize = '0.8em';
        removeButton.onclick = () => {
            tempAssignments.splice(index, 1); // Remove from array
            displayTempAssignments(); // Refresh display
        };
        assignmentDiv.appendChild(removeButton);
        displayDiv.appendChild(assignmentDiv);
    });
}

/** Handles clicking the 'Add Assignment' button */
function handleAddTeamAssignment() {
    const teamSelect = document.getElementById('newInitiativeTeamSelect');
    const sdeYearsInput = document.getElementById('newInitiativeSdeYears');
    const teamId = teamSelect.value;
    const sdeYears = parseFloat(sdeYearsInput.value);

    // Validation
    if (!teamId) {
        alert('Please select a team.');
        return;
    }
    if (isNaN(sdeYears) || sdeYears <= 0) {
        alert('Please enter a valid positive number for SDE Years.');
        return;
    }

    // Check if team already assigned in temp list
    const existingIndex = tempAssignments.findIndex(a => a.teamId === teamId);
    if (existingIndex > -1) {
        // Update existing assignment
        tempAssignments[existingIndex].sdeYears = sdeYears;
        console.log(`Updated assignment for team ${teamId} to ${sdeYears}`);
    } else {
        // Add new assignment
        tempAssignments.push({ teamId: teamId, sdeYears: sdeYears });
        console.log(`Added assignment for team ${teamId}: ${sdeYears}`);
    }

    // Refresh display and clear inputs
    displayTempAssignments();
    teamSelect.selectedIndex = 0; // Reset dropdown
    sdeYearsInput.value = '';
}

/** Handles clicking the 'Add Initiative to Plan' button */
function handleAddInitiative() {
    const titleInput = document.getElementById('newInitiativeTitle');
    const descriptionInput = document.getElementById('newInitiativeDescription');
    const goalIdInput = document.getElementById('newInitiativeGoalId');

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const goalId = goalIdInput.value.trim() || null; // Use null if empty

    // Validation
    if (!title) {
        alert('Initiative Title cannot be empty.');
        return;
    }
    if (tempAssignments.length === 0) {
        alert('Please add at least one team assignment.');
        return;
    }

    // Create new initiative object
    const newInitiative = {
        initiativeId: 'init-' + Date.now() + '-' + Math.floor(Math.random() * 1000), // Simple unique ID
        title: title,
        description: description,
        relatedBusinessGoalId: goalId,
        isProtected: false, // New initiatives are not protected by default
        assignments: [...tempAssignments] // Copy the temporary assignments
    };

    // Add to main data structure
    if (!currentSystemData.yearlyInitiatives) {
        currentSystemData.yearlyInitiatives = [];
    }
    currentSystemData.yearlyInitiatives.push(newInitiative);
    console.log("Added new initiative:", newInitiative);

    // Clear form and temporary data
    titleInput.value = '';
    descriptionInput.value = '';
    goalIdInput.value = '';
    tempAssignments = [];
    displayTempAssignments(); // Clear display area

    // Refresh the main planning table
    generatePlanningTable();
}

/** Handles clicking the 'Save Current Plan' button */
function handleSavePlan() {
    console.log("Attempting to save plan from planning view...");

    if (!currentSystemData || !currentSystemData.systemName) {
        alert("Cannot save plan: No system data loaded or system name is missing.");
        return;
    }

    // --- Perform Pre-Save Actions ---
    // Ensure global platform dependencies reflect assignments before saving
    buildGlobalPlatformDependencies();
    // Validate engineer assignments (important if edits happened elsewhere)
    if (!validateEngineerAssignments()) {
        // Validation function already shows an alert
        return;
    }
    // Add any other planning-specific validations here if needed later
    // --- End Pre-Save Actions ---


    // --- Save the ENTIRE currentSystemData object to Local Storage ---
    // The yearlyInitiatives array within currentSystemData should reflect the current order and estimates.
    try {
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const systemNameKey = currentSystemData.systemName; // Use the name stored in the data

        // Save the current data under its name
        systems[systemNameKey] = currentSystemData;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        alert(`Plan for system "${systemNameKey}" saved successfully.`);
        console.log('System changes saved to local storage via Save Plan button.');

    } catch (error) {
        console.error("Error saving system to local storage:", error);
        alert("An error occurred while trying to save the plan. Please check the console for details.");
    }
    
}
