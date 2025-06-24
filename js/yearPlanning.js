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
 * REVISED (v11 - UX Wording) - Generates the Team Load Summary table.
 * - Makes the 'Scenario Capacity' column header dynamic to reflect the selected scenario and state (Gross/Net).
 */
function generateTeamLoadSummaryTable() {
    console.log("Generating Team Load Summary Table (v11 - UX Wording)...");

    const summaryContainer = document.getElementById('teamLoadSummarySection');
    if (!summaryContainer) { console.error("Missing Team Load Summary container."); return; }
    const summaryTable = summaryContainer.querySelector('#teamLoadSummaryTable');
    const summaryTableBody = summaryTable?.querySelector('#teamLoadSummaryTableBody');
    const summaryTableFoot = summaryTable?.querySelector('#teamLoadSummaryTableFoot');
    let summaryTableHead = summaryTable?.querySelector('thead');
    if (!summaryTableHead) {
        summaryTableHead = summaryTable.createTHead();
    }
    
    if (!summaryTable || !summaryTableBody || !summaryTableFoot || !summaryTableHead) {
        console.error("Missing Team Load Summary table structure (tbody, tfoot, or thead).");
        return;
    }
    summaryTableHead.innerHTML = '';
    summaryTableBody.innerHTML = '';
    summaryTableFoot.innerHTML = '';

    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !currentSystemData.teams) { return; }

    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    if (!calculatedMetrics) {
        console.error("generateTeamLoadSummaryTable cannot run: calculatedCapacityMetrics is missing.");
        summaryContainer.querySelector('h4').textContent += " - ERROR: Metrics not calculated!";
        return;
    }
    
    const teams = currentSystemData.teams || [];
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const isNetCapacityUsed = applyCapacityConstraintsToggle;

    const summaryAtlBtlLimit = isNetCapacityUsed ? calculatedMetrics.totals[scenarioKey].netYrs : calculatedMetrics.totals[scenarioKey].grossYrs;
    const scenarioNameForTitle = `${isNetCapacityUsed ? 'Net' : 'Gross'} ${scenarioKey.replace('BIS', ' BIS')}`;
    
    const summaryTitleHeader = summaryContainer.querySelector('h4');
    if (summaryTitleHeader) {
        const toggleSpan = summaryTitleHeader.querySelector('span.toggle-indicator');
        summaryTitleHeader.textContent = ` Team Load Summary (for ATL Initiatives - Scenario: ${scenarioNameForTitle})`;
        if (toggleSpan) { summaryTitleHeader.insertBefore(toggleSpan, summaryTitleHeader.firstChild); }
    }
    
    // --- 1. Generate Table Headers with Dynamic Column ---
    const headerRow = summaryTableHead.insertRow();
    
    // ** CHANGE: Create the dynamic header text **
    const scenarioDisplayName = scenarioKey.replace('BIS', ' BIS');
    const stateDisplayName = isNetCapacityUsed ? 'Net' : 'Gross';
    const dynamicHeaderText = `${scenarioDisplayName} Capacity (${stateDisplayName})`;
    
    const headers = [
        { text: 'Team', title: 'Team Name' },
        { text: 'Funded HC (Humans)', title: 'Budgeted headcount for human engineers.' },
        { text: 'Team BIS (Humans)', title: 'Actual human engineers on the team.' },
        { text: 'Away BIS (Humans)', title: 'Borrowed human engineers.' },
        { text: 'AI Engineers', title: 'Count of AI Software Engineers contributing to the team (on-team and away).' },
        { text: '(+) AI Productivity Gain', title: 'The effective SDE/Year capacity gained from AI tooling, applied to human engineers.' },
        { text: 'AI Gain %', title: 'The configured productivity gain percentage for the team.' },
        // ** Use the dynamic header text **
        { text: dynamicHeaderText, title: 'The total planning capacity for the team under the selected scenario and state (Gross or Net).' },
        { text: 'Assigned ATL SDEs', title: 'The sum of SDE estimates for this team from initiatives Above The Line.' },
        { text: 'Remaining Capacity (ATL)', title: 'Scenario Capacity minus Assigned ATL SDEs.' },
        { text: 'ATL Status', title: 'Indicates if the team is overloaded based on ATL work.' }
    ];

    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h.text;
        th.title = h.title;
        headerRow.appendChild(th);
    });

    // --- 2. Populate Table Body and Footer ---
    // The rest of the function remains identical to the previous version (v10).
    const sortedInitiatives = [...currentSystemData.yearlyInitiatives].sort((a, b) => { if (a.isProtected && !b.isProtected) return -1; if (!a.isProtected && b.isProtected) return 1; return 0; });
    let overallCumulativeSde = 0;
    const teamAtlSdeAssigned = teams.reduce((acc, team) => { acc[team.teamId] = 0; return acc; }, {});

    for (const initiative of sortedInitiatives) {
        const initiativeTotalSde = (initiative.assignments || []).reduce((sum, a) => sum + a.sdeYears, 0);
        if (overallCumulativeSde + initiativeTotalSde <= summaryAtlBtlLimit) {
            overallCumulativeSde += initiativeTotalSde;
            (initiative.assignments || []).forEach(assignment => {
                if (teamAtlSdeAssigned.hasOwnProperty(assignment.teamId)) {
                    teamAtlSdeAssigned[assignment.teamId] += assignment.sdeYears;
                }
            });
        } else {
            break;
        }
    }

    let totalFundedHCGross = 0, totalTeamBISHumans = 0, totalAwayBISHumans = 0, totalAIEngineers = 0;
    let totalProductivityGain = 0, totalScenarioCapacity = 0, totalAssignedAtlSde = 0;

    teams.sort((a, b) => (a?.teamName || '').localeCompare(b?.teamName || '')).forEach(team => {
        if (!team || !team.teamId) return;
        const teamId = team.teamId;
        const teamMetrics = calculatedMetrics[teamId];
        if (!teamMetrics) { console.warn(`Metrics not found for teamId: ${teamId}.`); return; }
        
        const teamAIBIS = (team.engineers || []).filter(name => currentSystemData.allKnownEngineers.find(e => e.name === name)?.attributes?.isAISWE).length;
        const awayAIBIS = (team.awayTeamMembers || []).filter(m => m.attributes?.isAISWE).length;
        const aiEngineers = teamAIBIS + awayAIBIS;
        const teamBISHumans = teamMetrics.TeamBIS.humanHeadcount;
        const effectiveBISHumans = teamMetrics.EffectiveBIS.humanHeadcount;
        const awayBISHumans = effectiveBISHumans - teamBISHumans;
        const productivityGain = teamMetrics[scenarioKey].deductionsBreakdown.aiProductivityGainYrs || 0;
        const productivityPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
        const scenarioCapacity = isNetCapacityUsed ? teamMetrics[scenarioKey].netYrs : teamMetrics[scenarioKey].grossYrs;
        const assignedAtlSde = teamAtlSdeAssigned[teamId] || 0;
        const remainingCapacity = scenarioCapacity - assignedAtlSde;

        totalFundedHCGross += teamMetrics.FundedHC.humanHeadcount;
        totalTeamBISHumans += teamBISHumans;
        totalAwayBISHumans += awayBISHumans;
        totalAIEngineers += aiEngineers;
        totalProductivityGain += productivityGain;
        totalScenarioCapacity += scenarioCapacity;
        totalAssignedAtlSde += assignedAtlSde;

        let statusText = '✅ OK'; let statusColor = 'green';
        if (remainingCapacity < 0) { statusText = '🛑 Overloaded'; statusColor = 'red'; }
        else if (remainingCapacity < 0.5 && scenarioCapacity > 0) { statusText = '⚠️ Near Limit'; statusColor = 'darkorange'; }

        const row = summaryTableBody.insertRow();
        row.insertCell().textContent = team.teamIdentity || team.teamName || teamId;
        row.insertCell().textContent = teamMetrics.FundedHC.humanHeadcount.toFixed(2);
        row.insertCell().textContent = teamBISHumans.toFixed(2);
        row.insertCell().textContent = awayBISHumans.toFixed(2);
        row.insertCell().textContent = aiEngineers.toFixed(2);
        row.insertCell().textContent = `+${productivityGain.toFixed(2)}`;
        row.insertCell().textContent = `${productivityPercent.toFixed(0)}%`;
        row.insertCell().textContent = scenarioCapacity.toFixed(2);
        row.insertCell().textContent = assignedAtlSde.toFixed(2);
        const remainingCell = row.insertCell();
        remainingCell.textContent = remainingCapacity.toFixed(2);
        remainingCell.style.color = remainingCapacity < 0 ? 'red' : 'green';
        const statusCell = row.insertCell();
        statusCell.textContent = statusText;
        statusCell.style.color = statusColor;
        statusCell.style.fontWeight = 'bold';

        Array.from(row.cells).forEach((cell, index) => { cell.style.textAlign = index === 0 ? 'left' : 'center'; });
    });

    const footerRow = summaryTableFoot.insertRow();
    footerRow.insertCell().textContent = 'Totals';
    footerRow.insertCell().textContent = totalFundedHCGross.toFixed(2);
    footerRow.insertCell().textContent = totalTeamBISHumans.toFixed(2);
    footerRow.insertCell().textContent = totalAwayBISHumans.toFixed(2);
    footerRow.insertCell().textContent = totalAIEngineers.toFixed(2);
    footerRow.insertCell().textContent = `+${totalProductivityGain.toFixed(2)}`;
    footerRow.insertCell().textContent = '';
    footerRow.insertCell().textContent = totalScenarioCapacity.toFixed(2);
    footerRow.insertCell().textContent = totalAssignedAtlSde.toFixed(2);
    const totalRemainingCell = footerRow.insertCell();
    totalRemainingCell.textContent = (totalScenarioCapacity - totalAssignedAtlSde).toFixed(2);
    totalRemainingCell.style.color = (totalScenarioCapacity - totalAssignedAtlSde) < 0 ? 'red' : 'green';
    footerRow.insertCell().textContent = '';

    Array.from(footerRow.cells).forEach((cell, index) => { cell.style.textAlign = index === 0 ? 'left' : 'center'; });
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

/**
 * REVISED (v7 - Aligned with Capacity Tuning)
 * Generates the planning table, ensuring it uses the single source of truth for capacity calculations.
 * - If capacity metrics are not pre-calculated, it generates them on the fly.
 * - Always uses 'grossYrs' or 'netYrs' from the calculated metrics object for ATL/BTL calculations.
 * - Aligns per-team cell coloring with the authoritative metrics.
 * - Removes all local/redundant capacity calculations.
 */
function generatePlanningTable() {
    console.log("Generating planning table (v7 - Aligned with Capacity Tuning)...");
    const planningViewDiv = document.getElementById('planningView');
    const capacitySummaryDiv = document.getElementById('planningCapacitySummary');
    const scenarioControlDiv = document.getElementById('planningScenarioControl');
    const tableContainer = document.getElementById('planningTableContainer');

    // --- Clear previous content ---
    if (capacitySummaryDiv) capacitySummaryDiv.innerHTML = ''; else console.error("Missing #planningCapacitySummary div");
    if (scenarioControlDiv) scenarioControlDiv.innerHTML = ''; else console.error("Missing #planningScenarioControl div");
    if (tableContainer) tableContainer.innerHTML = ''; else console.error("Missing #planningTableContainer div");

    if (!currentSystemData || !currentSystemData.yearlyInitiatives || !currentSystemData.teams) {
        if (tableContainer) tableContainer.innerHTML = '<p style="color: orange;">No planning data loaded or no initiatives/teams found.</p>';
        return;
    }

    // --- 1. ENSURE CAPACITY METRICS ARE AVAILABLE (THE CORE FIX) ---
    // Check if the canonical metrics object exists. If not, calculate it now.
    if (!currentSystemData.calculatedCapacityMetrics) {
        console.warn("calculatedCapacityMetrics not found. Generating on the fly for Year Planning view.");
        // This ensures the view can function correctly even if the user hasn't visited the tuning page.
        currentSystemData.calculatedCapacityMetrics = calculateAllCapacityMetrics();
    }
    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    const metricsAvailable = !!calculatedMetrics; // Should always be true now.
    // --- END CORE FIX ---


    // --- 2. Get Capacity Totals DIRECTLY from Calculated Metrics ---
    // No more local calculations. These values are the single source of truth.
    const totalFundedHC = calculatedMetrics.totals.FundedHC.humanHeadcount;
    const totalTeamBIS = calculatedMetrics.totals.TeamBIS.totalHeadcount;
    const totalEffectiveBIS = calculatedMetrics.totals.EffectiveBIS.totalHeadcount;
    const totalAwayTeamBIS = totalEffectiveBIS - calculatedMetrics.totals.TeamBIS.totalHeadcount; // Derived for display
    // --- END SOURCING FROM METRICS ---


    // --- 3. Update Capacity Summary Display (Using data from metrics) ---
    if (capacitySummaryDiv) {
        capacitySummaryDiv.innerHTML = `
            <span title="Finance Approved Headcount (Humans)" style="margin-right: 15px;">Funded HC: <strong style="color: #28a745;">${totalFundedHC.toFixed(2)}</strong></span> |
            <span title="Actual Team Members (Humans + AI)" style="margin-right: 15px;">Team BIS: <strong style="color: #17a2b8;">${totalTeamBIS.toFixed(2)}</strong></span> |
            <span title="Borrowed / Away-Team Members" style="margin-right: 15px;">Away BIS: <strong style="color: #ffc107;">${totalAwayTeamBIS.toFixed(2)}</strong></span> |
            <span title="Total Effective Capacity (Team + Away)" style="color: #007bff;">Effective BIS: <strong style="color: #007bff;">${totalEffectiveBIS.toFixed(2)}</strong></span>
        `;
    }


    // --- 4. Add/Update Scenario Toggle UI ---
    if (scenarioControlDiv) {
        const baseButtonStyle = 'padding: 5px 10px; margin-left: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.9em;';
        const activeButtonStyle = baseButtonStyle + ' background-color: #007bff; color: white; border-color: #0056b3; font-weight: bold;';
        const inactiveButtonStyle = baseButtonStyle + ' background-color: #e9ecef; color: #495057;';

        const effectiveButtonTitle = `Use Effective BIS. Gross: ${calculatedMetrics.totals.EffectiveBIS.grossYrs.toFixed(2)}, Net: ${calculatedMetrics.totals.EffectiveBIS.netYrs.toFixed(2)}`;
        const teamBisButtonTitle = `Use Team BIS. Gross: ${calculatedMetrics.totals.TeamBIS.grossYrs.toFixed(2)}, Net: ${calculatedMetrics.totals.TeamBIS.netYrs.toFixed(2)}`;
        const fundedHcButtonTitle = `Use Funded HC. Gross: ${calculatedMetrics.totals.FundedHC.grossYrs.toFixed(2)}, Net: ${calculatedMetrics.totals.FundedHC.netYrs.toFixed(2)}`;

        // ** CHANGE: Updated toggle label text and tooltip **
        const toggleTooltip = "Toggling this ON applies all configured capacity constraints (leave, overhead, etc.) AND adds any productivity gains from AI tooling to calculate the Net capacity.";
        const toggleLabelText = "Apply Constraints & AI Gains (Net)";

        scenarioControlDiv.innerHTML = `
            <strong style="margin-right: 10px;">Calculate ATL/BTL using:</strong>
            <button type="button" style="${planningCapacityScenario === 'effective' ? activeButtonStyle : inactiveButtonStyle}" title="${effectiveButtonTitle}" onclick="setPlanningScenario('effective')">Effective BIS</button>
            <button type="button" style="${planningCapacityScenario === 'team_bis' ? activeButtonStyle : inactiveButtonStyle}" title="${teamBisButtonTitle}" onclick="setPlanningScenario('team_bis')">Team BIS</button>
            <button type="button" style="${planningCapacityScenario === 'funded' ? activeButtonStyle : inactiveButtonStyle}" title="${fundedHcButtonTitle}" onclick="setPlanningScenario('funded')">Funded HC</button>
            <label style="margin-left: 20px; font-size: 0.9em; cursor: pointer; vertical-align: middle;" title="${toggleTooltip}">
                <input type="checkbox" id="applyConstraintsToggle" style="vertical-align: middle;" onchange="toggleCapacityConstraints(this.checked)" ${applyCapacityConstraintsToggle ? 'checked' : ''}>
                ${toggleLabelText}
            </label>
            <button type="button" id="savePlanButton"
                    style="${baseButtonStyle} background-color: #dc3545; color: white; border-color: #dc3545; margin-left: 25px;"
                    title="Save the current order and estimates for all initiatives in this plan.">
                Save Current Plan Order & Estimates
            </button>
        `;
        setTimeout(() => {
            const savePlanButton = document.getElementById('savePlanButton');
            if (savePlanButton) {
                 savePlanButton.addEventListener('click', handleSavePlan);
            }
       }, 0);
    }


    // --- 5. Determine Overall ATL/BTL Limit (ALIGNED LOGIC) ---
    let atlBtlCapacityLimit;
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');

    if (applyCapacityConstraintsToggle && metricsAvailable) {
        atlBtlCapacityLimit = calculatedMetrics.totals[scenarioKey].netYrs;
        console.log(`Using NET capacity limit for ATL/BTL: ${atlBtlCapacityLimit.toFixed(2)} (Scenario: ${scenarioKey})`);
    } else {
        atlBtlCapacityLimit = calculatedMetrics.totals[scenarioKey].grossYrs;
        console.log(`Using GROSS capacity limit for ATL/BTL: ${atlBtlCapacityLimit.toFixed(2)} (Scenario: ${scenarioKey})`);
    }
    // --- END ALIGNED LOGIC ---


    // --- 6. Generate Team Load Summary ---
    // This call assumes generateTeamLoadSummaryTable() will also be updated to use calculatedMetrics.
    generateTeamLoadSummaryTable();


    // --- 7. Prepare & Generate Main Planning Table ---
    const tableWrapper = document.createElement('div'); tableWrapper.id = 'planningTableWrapper';
    const table = document.createElement('table'); table.style.width = '100%'; table.style.borderCollapse = 'collapse'; table.id = 'planningTable';
    const thead = document.createElement('thead'); const headerRow = document.createElement('tr');
    const fixedHeaders = ['Protected', 'Title', 'ID', 'Description', 'Total SDE Years', 'Cumulative SDE Years', 'Capacity Status', 'ATL/BTL'];
    fixedHeaders.forEach(text => { const th = document.createElement('th'); th.textContent = text; th.style.border = '1px solid #ccc'; th.style.padding = '8px'; th.style.textAlign = 'left'; th.style.whiteSpace = 'nowrap'; headerRow.appendChild(th); });

    const teams = currentSystemData.teams || [];
    const teamHeaderMap = new Map();
    teams.forEach((team, index) => {
      const th = document.createElement('th');
      const teamDisplayIdentity = team.teamIdentity || team.teamId || 'Unknown';
      const teamFullName = team.teamName || teamDisplayIdentity;
      const teamMetrics = calculatedMetrics[team.teamId];
      const teamTitle = `Team: ${teamFullName}\nIdentity: ${teamDisplayIdentity}\n` +
                        `Funded HC: ${teamMetrics.FundedHC.humanHeadcount.toFixed(2)}\n` +
                        `Team BIS: ${teamMetrics.TeamBIS.totalHeadcount.toFixed(2)}\n` +
                        `Eff. BIS: ${teamMetrics.EffectiveBIS.totalHeadcount.toFixed(2)}`;
      th.textContent = teamDisplayIdentity;
      th.title = teamTitle;
      th.setAttribute('data-team-id', team.teamId);
      Object.assign(th.style, {
          border: '1px solid #ccc', padding: '8px', textAlign: 'center', writingMode: 'vertical-lr',
          textOrientation: 'mixed', whiteSpace: 'nowrap', minWidth: '35px', maxWidth: '35px'
      });
      headerRow.appendChild(th);
      teamHeaderMap.set(fixedHeaders.length + index, team.teamId);
    });
    thead.appendChild(headerRow); table.appendChild(thead);
    const tbody = document.createElement('tbody'); tbody.id = 'planningTableBody';


    const sortedInitiatives = [...currentSystemData.yearlyInitiatives].sort((a, b) => { if (a.isProtected && !b.isProtected) return -1; if (!a.isProtected && b.isProtected) return 1; return 0; });
    let cumulativeSdeTotal = 0;
    let teamCumulativeSde = {};
    teams.forEach(team => { teamCumulativeSde[team.teamId] = 0; });

    sortedInitiatives.forEach((initiative, rowIndex) => {
        if (!initiative || !initiative.initiativeId) { console.warn("Skipping invalid initiative data at index:", rowIndex); return; }
        const row = tbody.insertRow();
        row.setAttribute('data-initiative-id', initiative.initiativeId);
        row.style.borderBottom = '1px solid #eee';
        row.style.padding = '2px 0';
        row.setAttribute('draggable', !initiative.isProtected);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
        if (!initiative.isProtected) {
            row.addEventListener('dragstart', handleDragStart);
            row.style.cursor = 'move';
        } else {
            row.style.cursor = 'default';
        }

        const protectedCell = row.insertCell(); const protectedCheckbox = document.createElement('input'); protectedCheckbox.type = 'checkbox'; protectedCheckbox.checked = initiative.isProtected; protectedCheckbox.setAttribute('data-initiative-id', initiative.initiativeId); protectedCheckbox.style.cursor = 'pointer'; protectedCheckbox.onchange = handleProtectedChange; protectedCell.appendChild(protectedCheckbox); protectedCell.style.textAlign = 'center';
        const titleCell = row.insertCell(); titleCell.textContent = initiative.title || 'No Title'; titleCell.style.fontWeight = initiative.isProtected ? 'bold' : 'normal';
        const idCell = row.insertCell(); idCell.textContent = initiative.initiativeId; idCell.style.fontSize = '0.8em'; idCell.style.color = '#555';
        const descCell = row.insertCell(); const descText = initiative.description || ''; descCell.textContent = descText.length > 50 ? descText.substring(0, 47) + '...' : descText; descCell.title = descText;

        const totalSdeCell = row.insertCell(); totalSdeCell.style.textAlign = 'right';
        const cumSdeCell = row.insertCell(); cumSdeCell.style.textAlign = 'right';
        const statusCell = row.insertCell(); statusCell.style.textAlign = 'center';
        const atlBtlCell = row.insertCell(); atlBtlCell.style.fontWeight = 'bold'; atlBtlCell.style.textAlign = 'center';

        let initiativeTotalSde = 0;
        const assignmentsMap = new Map((initiative.assignments || []).map(a => [a.teamId, a.sdeYears]));

        teamHeaderMap.forEach((teamId, colIndex) => {
            const teamCell = row.insertCell();
            const currentEstimate = assignmentsMap.get(teamId) || 0;
            teamCumulativeSde[teamId] += currentEstimate;

            const estimateInput = document.createElement('input');
            estimateInput.type = 'number'; estimateInput.min = '0'; estimateInput.step = '0.25'; estimateInput.value = currentEstimate > 0 ? currentEstimate.toFixed(2) : '';
            estimateInput.setAttribute('data-initiative-id', initiative.initiativeId);
            estimateInput.setAttribute('data-team-id', teamId);
            Object.assign(estimateInput.style, { width: '60px', textAlign: 'right', border: 'none', backgroundColor: 'transparent' });
            estimateInput.addEventListener('change', handleEstimateChange);
            teamCell.appendChild(estimateInput);
            teamCell.style.textAlign = 'center';

            let teamLimit = 0;
            let teamLimitType = '';
            if (applyCapacityConstraintsToggle && metricsAvailable) {
                teamLimit = calculatedMetrics[teamId]?.[scenarioKey]?.netYrs ?? 0;
                teamLimitType = `Net ${scenarioKey}`;
            } else {
                teamLimit = calculatedMetrics[teamId]?.[scenarioKey]?.grossYrs ?? 0;
                teamLimitType = `Gross ${scenarioKey}`;
            }

            const currentTeamCumulative = teamCumulativeSde[teamId];
            if (currentTeamCumulative <= teamLimit) {
                teamCell.style.backgroundColor = '#d4edda'; // Green
                teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimit.toFixed(2)}) - OK`;
            } else {
                teamCell.style.backgroundColor = '#f8d7da'; // Red
                teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimit.toFixed(2)}) - Overloaded`;
            }

            initiativeTotalSde += currentEstimate;
        });

        totalSdeCell.textContent = initiativeTotalSde.toFixed(2);
        cumulativeSdeTotal += initiativeTotalSde;
        cumSdeCell.textContent = cumulativeSdeTotal.toFixed(2);

        if (cumulativeSdeTotal <= totalTeamBIS) { statusCell.textContent = '✅'; statusCell.title = `Within Team BIS (${totalTeamBIS.toFixed(2)})`; statusCell.style.backgroundColor = '#d4edda';}
        else if (cumulativeSdeTotal <= totalFundedHC) { statusCell.textContent = '⚠️'; statusCell.title = `Exceeds Team BIS (${totalTeamBIS.toFixed(2)}), Within Funded HC (${totalFundedHC.toFixed(2)}).`; statusCell.style.backgroundColor = '#fff3cd'; }
        else { statusCell.textContent = '🛑'; statusCell.title = `Exceeds Funded HC (${totalFundedHC.toFixed(2)})`; statusCell.style.backgroundColor = '#f8d7da'; }

        const isBTL = cumulativeSdeTotal > atlBtlCapacityLimit;
        if (!isBTL) {
            atlBtlCell.textContent = 'ATL'; atlBtlCell.style.color = 'green';
        } else {
            atlBtlCell.textContent = 'BTL'; atlBtlCell.style.color = 'red';
        }

        row.querySelectorAll('td').forEach((cell, idx) => {
            if (idx < fixedHeaders.length) {
                if (initiative.isProtected) {
                    cell.style.backgroundColor = '#f8f9fa';
                } else if (isBTL) {
                    cell.style.backgroundColor = '#ffeeee';
                }
            }
        });
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    if (tableContainer) { tableContainer.appendChild(tableWrapper); }

    adjustPlanningTableHeight();
    console.log("Finished generating ALIGNED planning table (v7).");
}

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
    // Store the current scroll position if needed, though for this short list it might not matter
    // const scrollPosition = displayDiv.scrollTop;
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

        // *** ADD THIS FOR ANIMATION ***
        // Apply animation only if this item was just added (e.g., it's the last one)
        // This is a heuristic; a more robust way would be to flag new items.
        // For simplicity now, let's animate all items on each redraw of this small list.
        assignmentDiv.classList.add('new-item-added-fade-in'); // Use the simpler fade-in
        // Remove class after animation to allow re-animation if list rebuilds
        setTimeout(() => {
            assignmentDiv.classList.remove('new-item-added-fade-in');
        }, 350); // Duration slightly longer than animation
        // *****************************
    });
    // displayDiv.scrollTop = scrollPosition; // Restore scroll position if needed
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
