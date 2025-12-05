// js/yearPlanning.js

// Global variable to store the currently selected planning year
let currentPlanningYear = new Date().getFullYear();

let currentYearPlanSummaryData = null; // [NEW]
let currentYearPlanTableData = null; // [NEW]

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
        renderPlanningView();
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
        if (draggedRowElement) draggedRowElement.classList.add('dragging');
    }, 0);
    // console.log(`Drag Start: ${draggedInitiativeId}`);
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
    if (targetRow) targetRow.classList.remove('drag-over'); // Clean up visual indicator

    if (!targetRow || !draggedInitiativeId || targetRow.getAttribute('data-initiative-id') === draggedInitiativeId) {
        // console.log("Drop cancelled - invalid target or same item.");
        // No need to reset draggedInitiativeId here, handleDragEnd will do it
        return;
    }

    const targetInitiativeId = targetRow.getAttribute('data-initiative-id');
    // console.log(`Drop: ${draggedInitiativeId} onto ${targetInitiativeId}`);

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
        // console.log("Drop invalid: Dragged item is protected or invalid.");
        window.notificationManager.showToast("Cannot move a protected item.", "warning");
        // handleDragEnd will reset state
        return;
    }
    // Constraint 1: Cannot drop ONTO a protected row (target is protected)
    if (targetInitiative.isProtected) {
        // console.log("Drop invalid: Cannot drop onto a protected item.");
        window.notificationManager.showToast("Cannot drop an item onto a protected item.", "warning");
        // handleDragEnd will reset state
        return;
    }
    // Constraint 2: Check if dropping would place the non-protected item *above* any protected items.
    // This means the new index (targetIndex) must be less than the index of the *first* non-protected item.
    const firstNonProtectedIndex = initiatives.findIndex(init => !init.isProtected);
    if (targetIndex < firstNonProtectedIndex && firstNonProtectedIndex !== -1) {
        // console.log("Drop invalid: Cannot move item above the protected block.");
        window.notificationManager.showToast("Cannot move items above the block of protected initiatives.", "warning");
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

    // console.log("Reordered initiatives array:", initiatives.map(i => i.initiativeId));
    // --- End Reorder ---


    // --- Refresh the Table ---
    // The draggedInitiativeId is reset in handleDragEnd
    renderPlanningView();
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

    // console.log("Drag End");
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
        } else {
            // Add new assignment
            initiative.assignments.push({ teamId: teamId, sdeYears: validatedValue });
        }
        // Optionally reformat the input value after successful update
        input.value = validatedValue.toFixed(2);
    } else {
        // Remove assignment if value is 0 or invalid
        if (assignmentIndex > -1) {
            initiative.assignments.splice(assignmentIndex, 1);
        }
        // Clear the input field if the value was invalid or zero
        input.value = '';
    }

    // [NEW] Top-Down Sync: Propagate changes to Work Packages to prevent reversion
    // because renderPlanningView calls syncInitiativeTotals which overwrites from WPs.
    if (currentSystemData.workPackages) {
        const wps = currentSystemData.workPackages.filter(wp => wp.initiativeId === initiativeId);
        if (wps.length > 0) {
            // We update the first WP found. In a multi-WP scenario, this is a simplification,
            // but it ensures the total is preserved for the initiative.
            const targetWp = wps[0];
            const workingDays = currentSystemData.capacityConfiguration?.workingDaysPerYear || 261;

            if (!targetWp.impactedTeamAssignments) targetWp.impactedTeamAssignments = [];

            const wpAssignIndex = targetWp.impactedTeamAssignments.findIndex(a => a.teamId === teamId);

            if (validatedValue > 0) {
                const newDays = validatedValue * workingDays;
                if (wpAssignIndex > -1) {
                    targetWp.impactedTeamAssignments[wpAssignIndex].sdeDays = newDays;
                } else {
                    targetWp.impactedTeamAssignments.push({
                        teamId: teamId,
                        sdeDays: newDays,
                        startDate: targetWp.startDate,
                        endDate: targetWp.endDate
                    });
                }
            } else {
                // Remove from WP if set to 0
                if (wpAssignIndex > -1) {
                    targetWp.impactedTeamAssignments.splice(wpAssignIndex, 1);
                }
            }
            console.log(`[Top-Down Sync] Updated WorkPackage ${targetWp.workPackageId} for team ${teamId} to match initiative estimate.`);
        }
    }

    // --- Refresh the entire table to recalculate totals and statuses ---
    renderPlanningView();
    // --- End Refresh ---

    // [NEW] Restore focus to the input field to allow continuous editing (e.g. using spinners or keyboard)
    setTimeout(() => {
        const newInput = document.querySelector(`input[data-initiative-id="${initiativeId}"][data-team-id="${teamId}"]`);
        if (newInput) {
            newInput.focus();
            // Optional: Select the text to make it easier to type over, or just keep focus
            // newInput.select(); 
        }
    }, 0);
}

/** Sets the capacity scenario for planning and redraws the table */
function setPlanningScenario(scenario) {
    // console.log(`Setting planning scenario to: ${scenario}`);
    // Allow 'effective', 'funded', or 'team_bis'
    if (scenario === 'effective' || scenario === 'funded' || scenario === 'team_bis') {
        planningCapacityScenario = scenario;
        // Redraw the planning table to apply the change
        renderPlanningView();
    } else {
        console.warn("Invalid planning scenario provided:", scenario);
    }
}
// Make it globally accessible if not already
window.setPlanningScenario = setPlanningScenario;

/**
 * REVISED (v12 - Final Polish) - Generates the Team Load Summary table.
 * - Adds a "(-) Sinks" column that is only visible when constraints are applied.
 * - This provides a full, transparent view of the capacity calculation: Gross -> Sinks -> Gains -> Net.
 * - Retains all previous enhancements like dynamic headers and correct data sourcing.
 */
function renderTeamLoadSummaryTable(summaryData) {
    // console.log("Rendering Team Load Summary Table from calculated data...");
    const summaryContainer = document.getElementById('teamLoadSummarySection');
    if (!summaryContainer) { return; }
    const summaryTable = summaryContainer.querySelector('#teamLoadSummaryTable');
    const summaryTableBody = summaryTable?.querySelector('#teamLoadSummaryTableBody');
    const summaryTableFoot = summaryTable?.querySelector('#teamLoadSummaryTableFoot');
    let summaryTableHead = summaryTable?.querySelector('thead');

    if (!summaryTable || !summaryTableBody || !summaryTableFoot || !summaryTableHead) {
        console.error("Missing Team Load Summary table structure."); return;
    }
    summaryTableHead.innerHTML = '';
    summaryTableBody.innerHTML = '';
    summaryTableFoot.innerHTML = '';

    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const isNetCapacityUsed = applyCapacityConstraintsToggle;
    const scenarioNameForTitle = `${isNetCapacityUsed ? 'Net' : 'Gross'} ${scenarioKey.replace('BIS', ' BIS')}`;

    const summaryTitleHeader = summaryContainer.querySelector('h4');
    if (summaryTitleHeader) {
        const toggleSpan = summaryTitleHeader.querySelector('span.toggle-indicator');
        summaryTitleHeader.textContent = ` Team Load Summary (for ATL Initiatives - Scenario: ${scenarioNameForTitle})`;
        if (toggleSpan) { summaryTitleHeader.insertBefore(toggleSpan, summaryTitleHeader.firstChild); }
    }

    const headerRow = summaryTableHead.insertRow();
    const scenarioDisplayName = scenarioKey.replace('BIS', ' BIS');
    const stateDisplayName = isNetCapacityUsed ? 'Net' : 'Gross';
    const dynamicHeaderText = `${scenarioDisplayName} Capacity (${stateDisplayName})`;
    const headersData = [
        { text: 'Team', title: 'Team Name' },
        { text: 'Funded HC (Humans)', title: 'Budgeted headcount for human engineers.' },
        { text: 'Team BIS (Humans)', title: 'Actual human engineers on the team.' },
        { text: 'Away BIS (Humans)', title: 'Borrowed human engineers.' },
        { text: 'AI Engineers', title: 'Count of AI Software Engineers contributing to the team.' },
        { text: '(-) Sinks (SDE/Yrs)', title: 'Total deductions from leave, overhead, etc. This is only shown when the "Apply Constraints" toggle is ON.' },
        { text: '(+) AI Productivity Gain', title: 'The effective SDE/Year capacity gained from AI tooling.' },
        { text: 'AI Gain %', title: 'The configured productivity gain percentage for the team.' },
        { text: dynamicHeaderText, title: 'The total planning capacity for the team under the selected scenario and state (Gross or Net).' },
        { text: 'Assigned ATL SDEs', title: 'The sum of SDE estimates for this team from initiatives Above The Line.' },
        { text: 'Remaining Capacity (ATL)', title: 'Scenario Capacity minus Assigned ATL SDEs.' },
        { text: 'ATL Status', title: 'Indicates if the team is overloaded based on ATL work.' }
    ];
    headersData.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h.text;
        th.title = h.title;
        headerRow.appendChild(th);
    });

    (summaryData.rows || []).forEach(rowData => {
        const row = summaryTableBody.insertRow();
        row.insertCell().textContent = rowData.teamName;
        row.insertCell().textContent = rowData.fundedHC.toFixed(2);
        row.insertCell().textContent = rowData.teamBISHumans.toFixed(2);
        row.insertCell().textContent = rowData.awayBISHumans.toFixed(2);
        row.insertCell().textContent = rowData.aiEngineers.toFixed(2);

        const sinksCell = row.insertCell();
        sinksCell.textContent = isNetCapacityUsed ? `-${rowData.sinks.toFixed(2)}` : '—';
        sinksCell.style.color = isNetCapacityUsed ? '#dc3545' : '#6c757d';

        row.insertCell().textContent = `+${rowData.productivityGain.toFixed(2)}`;
        row.insertCell().textContent = `${rowData.productivityPercent.toFixed(0)}%`;
        row.insertCell().textContent = rowData.scenarioCapacity.toFixed(2);
        row.insertCell().textContent = rowData.assignedAtlSde.toFixed(2);

        const remainingCell = row.insertCell();
        remainingCell.textContent = rowData.remainingCapacity.toFixed(2);
        remainingCell.style.color = rowData.remainingCapacity < 0 ? 'red' : 'green';

        const statusCell = row.insertCell();
        statusCell.textContent = rowData.status;
        statusCell.style.color = rowData.status === '🛑 Overloaded' ? 'red' : (rowData.status === '⚠️ Near Limit' ? 'darkorange' : 'green');
        statusCell.style.fontWeight = 'bold';

        Array.from(row.cells).forEach((cell, index) => { cell.style.textAlign = index === 0 ? 'left' : 'center'; });
    });

    const totals = summaryData.totals || {};
    const footerRow = summaryTableFoot.insertRow();
    footerRow.insertCell().textContent = 'Totals';
    footerRow.insertCell().textContent = (totals.fundedHCGross ?? 0).toFixed(2);
    footerRow.insertCell().textContent = (totals.teamBISHumans ?? 0).toFixed(2);
    footerRow.insertCell().textContent = (totals.awayBISHumans ?? 0).toFixed(2);
    footerRow.insertCell().textContent = (totals.aiEngineers ?? 0).toFixed(2);
    footerRow.insertCell().textContent = isNetCapacityUsed ? `-${(totals.sinks ?? 0).toFixed(2)}` : '—';
    footerRow.insertCell().textContent = `+${(totals.productivityGain ?? 0).toFixed(2)}`;
    footerRow.insertCell().textContent = '';
    footerRow.insertCell().textContent = (totals.scenarioCapacity ?? 0).toFixed(2);
    footerRow.insertCell().textContent = (totals.assignedAtlSde ?? 0).toFixed(2);
    const totalRemainingCell = footerRow.insertCell();
    totalRemainingCell.textContent = (totals.remainingCapacity ?? 0).toFixed(2);
    totalRemainingCell.style.color = (totals.remainingCapacity ?? 0) < 0 ? 'red' : 'green';
    footerRow.insertCell().textContent = '';

    Array.from(footerRow.cells).forEach((cell, index) => { cell.style.textAlign = index === 0 ? 'left' : 'center'; });
}


/**
 * [NEW] Performs all calculations for the team load summary.
 * @returns {object} An object { rows: [], totals: {} } with the calculated data.
 */
function calculateTeamLoadSummaryData() {
    if (!currentSystemData || !currentSystemData.calculatedCapacityMetrics || !currentSystemData.teams) {
        console.error("calculateTeamLoadSummaryData: Missing required data.");
        return { rows: [], totals: {} };
    }

    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    const teams = currentSystemData.teams || [];
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const isNetCapacityUsed = applyCapacityConstraintsToggle;
    const summaryAtlBtlLimit = isNetCapacityUsed ? calculatedMetrics.totals[scenarioKey].netYrs : calculatedMetrics.totals[scenarioKey].grossYrs;

    const initiativesForYear = (currentSystemData.yearlyInitiatives || [])
        .filter(init => init.attributes.planningYear == currentPlanningYear && init.status !== 'Completed');

    const sortedInitiatives = [...initiativesForYear].sort((a, b) => {
        if (a.isProtected && !b.isProtected) return -1;
        if (!a.isProtected && b.isProtected) return 1;
        return 0;
    });

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

    let summaryRows = [];
    let totals = {
        fundedHCGross: 0, teamBISHumans: 0, awayBISHumans: 0, aiEngineers: 0,
        sinks: 0, productivityGain: 0, scenarioCapacity: 0, assignedAtlSde: 0
    };

    teams.sort((a, b) => (a?.teamName || '').localeCompare(b?.teamName || '')).forEach(team => {
        if (!team || !team.teamId) return;

        const teamId = team.teamId;
        const teamMetrics = calculatedMetrics[teamId];
        if (!teamMetrics) { return; }

        const teamAIBIS = (team.engineers || []).filter(name => currentSystemData.allKnownEngineers.find(e => e.name === name)?.attributes?.isAISWE).length;
        const awayAIBIS = (team.awayTeamMembers || []).filter(m => m.attributes?.isAISWE).length;
        const aiEngineers = teamAIBIS + awayAIBIS;

        const teamBISHumans = teamMetrics.TeamBIS.humanHeadcount;
        const effectiveBISHumans = teamMetrics.EffectiveBIS.humanHeadcount;
        const awayBISHumans = effectiveBISHumans - teamBISHumans;
        const sinks = isNetCapacityUsed ? (teamMetrics[scenarioKey].deductYrs || 0) : 0;
        const productivityGain = teamMetrics[scenarioKey].deductionsBreakdown.aiProductivityGainYrs || 0;
        const productivityPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
        const scenarioCapacity = isNetCapacityUsed ? teamMetrics[scenarioKey].netYrs : teamMetrics[scenarioKey].grossYrs;
        const assignedAtlSde = teamAtlSdeAssigned[teamId] || 0;
        const remainingCapacity = scenarioCapacity - assignedAtlSde;

        let statusText = '✅ OK';
        if (remainingCapacity < 0) { statusText = '🛑 Overloaded'; }
        else if (remainingCapacity < 0.5 && scenarioCapacity > 0) { statusText = '⚠️ Near Limit'; }

        summaryRows.push({
            teamId: team.teamId,
            teamName: team.teamIdentity || team.teamName || teamId,
            fundedHC: teamMetrics.FundedHC.humanHeadcount,
            teamBISHumans: teamBISHumans,
            awayBISHumans: awayBISHumans,
            aiEngineers: aiEngineers,
            sinks: sinks,
            productivityGain: productivityGain,
            productivityPercent: productivityPercent,
            scenarioCapacity: scenarioCapacity,
            assignedAtlSde: assignedAtlSde,
            remainingCapacity: remainingCapacity,
            status: statusText
        });

        totals.fundedHCGross += teamMetrics.FundedHC.humanHeadcount;
        totals.teamBISHumans += teamBISHumans;
        totals.awayBISHumans += awayBISHumans;
        totals.aiEngineers += aiEngineers;
        totals.sinks += sinks;
        totals.productivityGain += productivityGain;
        totals.scenarioCapacity += scenarioCapacity;
        totals.assignedAtlSde += assignedAtlSde;
    });

    totals.remainingCapacity = totals.scenarioCapacity - totals.assignedAtlSde;

    return { rows: summaryRows, totals: totals };
}

/**
 * [NEW] Calculates the main planning table data, including sorting and ATL/BTL status.
 * @returns {Array<object>} A new array of initiative objects with calculated fields added.
 */
function calculatePlanningTableData() {
    if (!currentSystemData || !currentSystemData.calculatedCapacityMetrics || !currentSystemData.teams) {
        console.error("calculatePlanningTableData: Missing required data.");
        return [];
    }

    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const isNetCapacityUsed = applyCapacityConstraintsToggle;
    const atlBtlCapacityLimit = isNetCapacityUsed ? calculatedMetrics.totals[scenarioKey].netYrs : calculatedMetrics.totals[scenarioKey].grossYrs;

    const initiativesForYear = (currentSystemData.yearlyInitiatives || [])
        .filter(init => init.attributes.planningYear == currentPlanningYear && init.status !== 'Completed');

    const sortedInitiatives = [...initiativesForYear].sort((a, b) => {
        if (a.isProtected && !b.isProtected) return -1;
        if (!a.isProtected && b.isProtected) return 1;
        return 0;
    });

    let cumulativeSdeTotal = 0;
    const calculatedData = [];

    for (const initiative of sortedInitiatives) {
        let initiativeTotalSde = 0;
        (initiative.assignments || []).forEach(assignment => {
            initiativeTotalSde += (assignment.sdeYears || 0);
        });

        cumulativeSdeTotal += initiativeTotalSde;
        const isBTL = cumulativeSdeTotal > atlBtlCapacityLimit;
        const atlBtlStatus = isBTL ? 'BTL' : 'ATL';
        initiative.attributes.planningStatusFundedHc = atlBtlStatus;

        calculatedData.push({
            ...initiative,
            calculatedInitiativeTotalSde: initiativeTotalSde,
            calculatedCumulativeSde: cumulativeSdeTotal,
            calculatedAtlBtlStatus: atlBtlStatus,
            isBTL: isBTL
        });
    }
    return calculatedData;
}

/**
 * [NEW] Renders the main planning table from pre-calculated data.
 * @param {Array<object>} planningData - The array from calculatePlanningTableData().
 */
function renderPlanningTable(planningData) {
    // console.log("Rendering main planning table from calculated data...");
    const tableContainer = document.getElementById('planningTableContainer');
    if (!tableContainer) { return; }

    tableContainer.innerHTML = '';

    const tableWrapper = document.createElement('div');
    tableWrapper.id = 'planningTableWrapper';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.id = 'planningTable';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const fixedHeaders = ['Protected', 'Title', 'ID', 'Description', 'Total SDE Years', 'Cumulative SDE Years', 'Capacity Status', 'ATL/BTL'];
    fixedHeaders.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.whiteSpace = 'nowrap';
        headerRow.appendChild(th);
    });

    const teams = currentSystemData.teams || [];
    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    const teamHeaderMap = new Map();

    teams.forEach((team, index) => {
        const th = document.createElement('th');
        const teamDisplayIdentity = team.teamIdentity || team.teamId || 'Unknown';
        const teamFullName = team.teamName || teamDisplayIdentity;
        const teamMetrics = calculatedMetrics[team.teamId];
        const teamTitle = `Team: ${teamFullName}\nIdentity: ${teamDisplayIdentity}\nFunded HC: ${teamMetrics?.FundedHC?.humanHeadcount?.toFixed?.(2) || '0.00'}\nTeam BIS: ${teamMetrics?.TeamBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}\nEff. BIS: ${teamMetrics?.EffectiveBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}`;
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
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'planningTableBody';

    let teamCumulativeSde = {};
    teams.forEach(team => { teamCumulativeSde[team.teamId] = 0; });
    const scenarioKey = planningCapacityScenario === 'funded' ? 'FundedHC' : (planningCapacityScenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    const isNetCapacityUsed = applyCapacityConstraintsToggle;

    planningData.forEach((initiative) => {
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

        const protectedCell = row.insertCell();
        const protectedCheckbox = document.createElement('input');
        protectedCheckbox.type = 'checkbox';
        protectedCheckbox.checked = initiative.isProtected;
        protectedCheckbox.setAttribute('data-initiative-id', initiative.initiativeId);
        protectedCheckbox.style.cursor = 'pointer';
        protectedCheckbox.onchange = handleProtectedChange;
        protectedCell.appendChild(protectedCheckbox);
        protectedCell.style.textAlign = 'center';

        const titleCell = row.insertCell();
        titleCell.textContent = initiative.title || 'No Title';
        titleCell.style.fontWeight = initiative.isProtected ? 'bold' : 'normal';

        const idCell = row.insertCell();
        idCell.textContent = initiative.initiativeId;
        idCell.style.fontSize = '0.8em';
        idCell.style.color = '#555';

        const descCell = row.insertCell();
        const descText = initiative.description || '';
        descCell.textContent = descText.length > 50 ? descText.substring(0, 47) + '...' : descText;
        descCell.title = descText;

        const totalSdeCell = row.insertCell();
        totalSdeCell.style.textAlign = 'right';
        totalSdeCell.textContent = initiative.calculatedInitiativeTotalSde.toFixed(2);

        const cumSdeCell = row.insertCell();
        cumSdeCell.style.textAlign = 'right';
        cumSdeCell.textContent = initiative.calculatedCumulativeSde.toFixed(2);

        const statusCell = row.insertCell();
        statusCell.style.textAlign = 'center';
        if (initiative.calculatedCumulativeSde <= calculatedMetrics.totals.TeamBIS.totalHeadcount) {
            statusCell.textContent = '✅';
            statusCell.title = `Within Team BIS (${calculatedMetrics.totals.TeamBIS.totalHeadcount.toFixed(2)})`;
            statusCell.style.backgroundColor = '#d4edda';
        } else if (initiative.calculatedCumulativeSde <= calculatedMetrics.totals.FundedHC.humanHeadcount) {
            statusCell.textContent = '⚠️';
            statusCell.title = `Exceeds Team BIS (${calculatedMetrics.totals.TeamBIS.totalHeadcount.toFixed(2)}), Within Funded HC (${calculatedMetrics.totals.FundedHC.humanHeadcount.toFixed(2)}).`;
            statusCell.style.backgroundColor = '#fff3cd';
        } else {
            statusCell.textContent = '🛑';
            statusCell.title = `Exceeds Funded HC (${calculatedMetrics.totals.FundedHC.humanHeadcount.toFixed(2)})`;
            statusCell.style.backgroundColor = '#f8d7da';
        }

        const atlBtlCell = row.insertCell();
        atlBtlCell.style.fontWeight = 'bold';
        atlBtlCell.style.textAlign = 'center';
        if (!initiative.isBTL) {
            atlBtlCell.textContent = 'ATL';
            atlBtlCell.style.color = 'green';
        } else {
            atlBtlCell.textContent = 'BTL';
            atlBtlCell.style.color = 'red';
        }

        const assignmentsMap = new Map((initiative.assignments || []).map(a => [a.teamId, a.sdeYears]));
        teamHeaderMap.forEach((teamId) => {
            const teamCell = row.insertCell();
            const currentEstimate = assignmentsMap.get(teamId) || 0;
            if (!initiative.isBTL) {
                teamCumulativeSde[teamId] += currentEstimate;
            }

            const estimateInput = document.createElement('input');
            estimateInput.type = 'number';
            estimateInput.min = '0';
            estimateInput.step = '0.25';
            estimateInput.value = currentEstimate > 0 ? currentEstimate.toFixed(2) : '';
            estimateInput.setAttribute('data-initiative-id', initiative.initiativeId);
            estimateInput.setAttribute('data-team-id', teamId);
            Object.assign(estimateInput.style, { width: '60px', textAlign: 'right', border: 'none', backgroundColor: 'transparent' });
            // [CHANGED] Revert to 'change' event to avoid cursor jumping issues with toFixed(2)
            // The focus restoration logic in handleEstimateChange will handle the re-render.
            estimateInput.addEventListener('change', handleEstimateChange);
            teamCell.appendChild(estimateInput);
            teamCell.style.textAlign = 'center';

            let teamLimit = isNetCapacityUsed
                ? calculatedMetrics[teamId]?.[scenarioKey]?.netYrs ?? 0
                : calculatedMetrics[teamId]?.[scenarioKey]?.grossYrs ?? 0;
            let teamLimitType = isNetCapacityUsed ? `Net ${scenarioKey}` : `Gross ${scenarioKey}`;

            const currentTeamCumulative = teamCumulativeSde[teamId];
            if (currentTeamCumulative <= teamLimit) {
                teamCell.style.backgroundColor = '#d4edda';
                teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimit.toFixed(2)}) - OK`;
            } else {
                teamCell.style.backgroundColor = '#f8d7da';
                teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit (${teamLimitType}: ${teamLimit.toFixed(2)}) - Overloaded`;
            }
        });

        row.querySelectorAll('td').forEach((cell, idx) => {
            if (idx < fixedHeaders.length) {
                if (initiative.isProtected) {
                    cell.style.backgroundColor = '#f8f9fa';
                } else if (initiative.isBTL) {
                    cell.style.backgroundColor = '#ffeeee';
                }
            }
        });
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableContainer.appendChild(tableWrapper);

    adjustPlanningTableHeight();
}
window.renderTeamLoadSummaryTable = renderTeamLoadSummaryTable; // Make global if needed

/** NEW Helper: Toggles the capacity constraint application and redraws the planning table */
function toggleCapacityConstraints(isChecked) {
    // console.log(`Toggling capacity constraints: ${isChecked}`);
    applyCapacityConstraintsToggle = isChecked; // Update the global state variable
    renderPlanningView(); // Redraw the table to apply the change
}
// Make it globally accessible for the checkbox's onchange
window.toggleCapacityConstraints = toggleCapacityConstraints;

/**
 * REVISED - Generates the planning table, dynamically populating the year selector
 * based on initiative data and ensuring data consistency.
 */
/**
 * REVISED - Generates the planning table using the Workspace Shell.
 */
function renderPlanningView(container) {
    // console.log(`renderPlanningView: Rendering main planning view for year: ${currentPlanningYear}...`);

    if (!container) {
        container = document.getElementById('planningView');
    }
    if (!container) {
        console.error("Planning container #planningView not found.");
        return;
    }

    // 1. Set Workspace Metadata (Header)
    if (window.workspaceComponent) {
        window.workspaceComponent.setPageMetadata({
            title: 'Year Plan',
            breadcrumbs: ['Planning', 'Year Plan'],
            actions: [
                {
                    label: `Save Plan for ${currentPlanningYear}`,
                    icon: 'fas fa-save',
                    onClick: () => handleSavePlan(),
                    className: 'btn btn-danger btn-sm' // Keeping red style for save
                },
                {
                    label: 'Optimize Plan',
                    icon: 'fas fa-robot',
                    onClick: () => {
                        if (window.aiAgentController && typeof window.aiAgentController.runPrebuiltAgent === 'function') {
                            window.aiAgentController.runPrebuiltAgent('optimizePlan');
                        } else {
                            window.notificationManager.showToast("AI Controller is not available.", "error");
                        }
                    },
                    className: 'btn btn-info btn-sm',
                    hidden: !(window.globalSettings && window.globalSettings.ai && window.globalSettings.ai.isEnabled)
                }
            ]
        });
    }

    // 2. Set Workspace Toolbar (Controls)
    const toolbarControls = generatePlanningToolbar();
    if (window.workspaceComponent && toolbarControls) {
        window.workspaceComponent.setToolbar(toolbarControls);
    }

    // 3. Create Content Layout
    // We only need the summary section and the table container.
    // The controls are now in the toolbar.
    container.innerHTML = `
        <div id="teamLoadSummarySection" style="margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px;">
            <h4 onclick="toggleCollapsibleSection('teamLoadSummaryContent', 'teamLoadSummaryToggle')" style="cursor: pointer; margin: 0; padding: 10px; background-color: #e9ecef; border-bottom: 1px solid #ccc;" title="Click to expand/collapse team load summary">
                <span id="teamLoadSummaryToggle" class="toggle-indicator">(+) </span> Team Load Summary (for ATL Initiatives)
            </h4>
            <div id="teamLoadSummaryContent" style="display: none; padding: 10px;">
                <p style="font-size: 0.9em; color: #555;">Shows team load based *only* on initiatives currently Above The Line (ATL) according to the selected scenario below.</p>
                <table id="teamLoadSummaryTable" style="margin: 0 auto; border-collapse: collapse; font-size: 0.9em;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ccc; padding: 5px;">Team Name</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Finance Approved Budget">Funded HC</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Actual Team Members">Team BIS</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Borrowed/Away Members">Away BIS</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Team BIS + Away BIS">Effective BIS</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="SDEs assigned to this team from ATL initiatives only">Assigned ATL SDEs</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Team's capacity based on selected scenario button below">Scenario Capacity Limit</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Scenario Capacity Limit - Assigned ATL SDEs">Remaining Capacity (ATL)</th>
                            <th style="border: 1px solid #ccc; padding: 5px;" title="Load status for ATL work based on Scenario Capacity Limit">ATL Status</th>
                        </tr>
                    </thead>
                    <tbody id="teamLoadSummaryTableBody"></tbody>
                    <tfoot id="teamLoadSummaryTableFoot" style="font-weight: bold;"></tfoot>
                </table>
            </div>
        </div>

        <div id="planningTableContainer"></div>
    `;

    // Ensure Data
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentPlanningYear);
        if (typeof syncInitiativeTotals === 'function') {
            (currentSystemData.yearlyInitiatives || [])
                .filter(init => `${init.attributes?.planningYear || ''}` === `${currentPlanningYear}`)
                .forEach(init => syncInitiativeTotals(init.initiativeId, currentSystemData));
        }
    }

    const tableContainer = document.getElementById('planningTableContainer');

    if (!currentSystemData || !currentSystemData.teams) {
        if (tableContainer) tableContainer.innerHTML = '<p style="color: orange;">No planning data loaded or no teams found.</p>';
        return;
    }

    // Ensure Planning Years
    if (typeof ensureInitiativePlanningYears === 'function') {
        ensureInitiativePlanningYears(currentSystemData.yearlyInitiatives);
    }

    // Ensure Metrics
    if (!currentSystemData.calculatedCapacityMetrics) {
        const capacityEngine = new CapacityEngine(currentSystemData);
        currentSystemData.calculatedCapacityMetrics = capacityEngine.calculateAllMetrics();
    }

    // Render Tables
    currentYearPlanSummaryData = calculateTeamLoadSummaryData();
    renderTeamLoadSummaryTable(currentYearPlanSummaryData);

    currentYearPlanTableData = calculatePlanningTableData();
    renderPlanningTable(currentYearPlanTableData);

    console.log("Finished rendering planning view.");
}

/**
 * Generates the toolbar controls for the Planning View.
 * @returns {HTMLElement} The toolbar container
 */
function generatePlanningToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'planning-toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '20px';
    toolbar.style.width = '100%';

    // 1. Year Selector
    const calendarYear = new Date().getFullYear();
    let availableYears = [];
    if (currentSystemData.yearlyInitiatives && currentSystemData.yearlyInitiatives.length > 0) {
        const yearsFromData = new Set(currentSystemData.yearlyInitiatives.map(init => init.attributes.planningYear).filter(year => year));
        availableYears = Array.from(yearsFromData);
    }
    if (availableYears.length === 0) availableYears.push(calendarYear);
    if (!availableYears.includes(calendarYear)) availableYears.push(calendarYear);
    availableYears.sort((a, b) => a - b);
    if (!availableYears.includes(currentPlanningYear)) {
        currentPlanningYear = availableYears.includes(calendarYear) ? calendarYear : availableYears[0];
    }

    const yearGroup = document.createElement('div');
    yearGroup.style.display = 'flex';
    yearGroup.style.alignItems = 'center';
    yearGroup.style.gap = '8px';

    const yearLabel = document.createElement('strong');
    yearLabel.textContent = 'Planning Year:';
    yearGroup.appendChild(yearLabel);

    const yearSelect = document.createElement('select');
    yearSelect.className = 'form-select form-select-sm'; // Use standard classes if available
    yearSelect.style.padding = '4px 8px';
    yearSelect.style.borderRadius = '4px';
    yearSelect.onchange = (e) => setPlanningYear(e.target.value);

    availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentPlanningYear) option.selected = true;
        yearSelect.appendChild(option);
    });
    yearGroup.appendChild(yearSelect);
    toolbar.appendChild(yearGroup);

    // 2. Scenario Controls
    const calculatedMetrics = currentSystemData.calculatedCapacityMetrics;
    if (calculatedMetrics) {
        const scenarioGroup = document.createElement('div');
        scenarioGroup.style.display = 'flex';
        scenarioGroup.style.alignItems = 'center';
        scenarioGroup.style.gap = '8px';

        const label = document.createElement('strong');
        label.textContent = 'Calculate ATL/BTL using:';
        scenarioGroup.appendChild(label);

        const scenarios = [
            { id: 'effective', label: 'Effective BIS', key: 'EffectiveBIS' },
            { id: 'team_bis', label: 'Team BIS', key: 'TeamBIS' },
            { id: 'funded', label: 'Funded HC', key: 'FundedHC' }
        ];

        scenarios.forEach(sc => {
            const btn = document.createElement('button');
            btn.textContent = sc.label;
            btn.className = `btn btn-sm ${planningCapacityScenario === sc.id ? 'btn-primary' : 'btn-light'}`;
            btn.style.border = '1px solid #ccc'; // Fallback style
            if (planningCapacityScenario === sc.id) {
                btn.style.backgroundColor = '#007bff';
                btn.style.color = 'white';
            }

            // Tooltip
            const metrics = calculatedMetrics.totals[sc.key];
            if (metrics) {
                btn.title = `Gross: ${metrics.grossYrs.toFixed(2)}, Net: ${metrics.netYrs.toFixed(2)}`;
            }

            btn.onclick = () => setPlanningScenario(sc.id);
            scenarioGroup.appendChild(btn);
        });

        toolbar.appendChild(scenarioGroup);

        // 3. Constraints Toggle
        const toggleGroup = document.createElement('div');
        toggleGroup.style.display = 'flex';
        toggleGroup.style.alignItems = 'center';
        toggleGroup.style.gap = '6px';
        toggleGroup.style.marginLeft = 'auto'; // Push to right if needed, or just gap

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'applyConstraintsToggleToolbar';
        checkbox.checked = applyCapacityConstraintsToggle;
        checkbox.style.cursor = 'pointer';
        checkbox.onchange = (e) => toggleCapacityConstraints(e.target.checked);

        const toggleLabel = document.createElement('label');
        toggleLabel.htmlFor = 'applyConstraintsToggleToolbar';
        toggleLabel.textContent = 'Apply Constraints & AI Gains (Net)';
        toggleLabel.style.cursor = 'pointer';
        toggleLabel.style.userSelect = 'none';
        toggleLabel.title = "Toggling this ON applies all configured capacity constraints (leave, overhead, etc.) AND adds any productivity gains from AI tooling to calculate the Net capacity.";

        toggleGroup.appendChild(checkbox);
        toggleGroup.appendChild(toggleLabel);
        toolbar.appendChild(toggleGroup);
    }

    return toolbar;
}
if (typeof window !== 'undefined') {
    window.renderPlanningView = renderPlanningView;
    window.calculatePlanningTableData = calculatePlanningTableData;
    window.calculateTeamLoadSummaryData = calculateTeamLoadSummaryData;
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

/**
 * REVISED - Saves the plan, updating initiative statuses based on ATL/BTL status for the current year.
 */
function handleSavePlan() {
    console.log(`Saving plan for year ${currentPlanningYear}...`);

    if (!currentSystemData || !currentSystemData.systemName) {
        window.notificationManager.showToast("Cannot save plan: No system data loaded or system name is missing.", "error");
        return;
    }

    const initiativesForYear = (currentSystemData.yearlyInitiatives || []).filter(
        init => init.attributes.planningYear == currentPlanningYear
    );

    initiativesForYear.forEach(initiative => {
        const planningStatus = initiative.attributes.planningStatusFundedHc;

        if (initiative.status === "Completed") {
            // Do nothing, it remains "Completed"
        } else if (planningStatus === 'ATL') {
            if (initiative.status === "Backlog" || initiative.status === "Defined") {
                initiative.status = "Committed";
            }
        } else if (planningStatus === 'BTL') {
            if (initiative.status === "Committed" || initiative.status === "In Progress") {
                initiative.status = "Backlog";
            }
        }
    });

    try {
        if (typeof ensureWorkPackagesForInitiatives === 'function') {
            ensureWorkPackagesForInitiatives(currentSystemData, currentPlanningYear);
            (currentSystemData.yearlyInitiatives || [])
                .filter(init => init.attributes?.planningYear == currentPlanningYear)
                .forEach(init => {
                    if (typeof syncWorkPackagesFromInitiative === 'function') {
                        syncWorkPackagesFromInitiative(init, currentSystemData);
                    }
                    if (typeof syncInitiativeTotals === 'function') {
                        syncInitiativeTotals(init.initiativeId, currentSystemData);
                    }
                });
        }
        saveSystemChanges();
        window.notificationManager.showToast(`Plan for ${currentPlanningYear} saved successfully. Initiative statuses have been updated.`, "success");
        // Optionally, refresh the table to show any visual changes reflecting status updates
        renderPlanningView();
    } catch (error) {
        console.error("Error saving plan:", error);
        window.notificationManager.showToast("An error occurred while saving the plan. Please check the console for details.", "error");
    }
}

/**
 * Sets the planning year and redraws the table.
 */
function setPlanningYear(year) {
    currentPlanningYear = parseInt(year);
    console.log(`Planning year changed to: ${currentPlanningYear}`);
    renderPlanningView();
}
