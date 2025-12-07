// js/yearPlanning.js

// ========= Year Planning Module State =========
// Global variable to store the currently selected planning year
let currentPlanningYear = new Date().getFullYear();
let planningCapacityScenario = 'effective'; // Default to 'effective'
let applyCapacityConstraintsToggle = false; // Default to OFF

let currentYearPlanSummaryData = null;
let currentYearPlanTableData = null;
let draggedInitiativeId = null; // For drag-drop reordering
let draggedRowElement = null; // For drag-drop row styling
// =============================================

// [PATCH] Remember summary table expanded state across re-renders
window.isSummaryTableExpanded = window.isSummaryTableExpanded || false;

/**
 * Toggles collapsible sections.
 */
function toggleCollapsibleSection(contentId, indicatorId, handleId = null) {
    const contentDiv = document.getElementById(contentId);
    const indicatorSpan = document.getElementById(indicatorId);
    const handleDiv = handleId ? document.getElementById(handleId) : null;

    if (!contentDiv || !indicatorSpan) {
        console.error(`Cannot toggle section: Missing content or indicator. ContentID: '${contentId}', IndicatorID: '${indicatorId}'`);
        return;
    }
    const isHidden = contentDiv.style.display === 'none' || contentDiv.style.display === '';
    contentDiv.style.display = isHidden ? 'block' : 'none';
    indicatorSpan.textContent = isHidden ? '(-)' : '(+)';
    if (handleDiv) handleDiv.style.display = isHidden ? 'block' : 'none';

    // Track summary table expanded state
    if (contentId === 'teamLoadSummaryContent' && typeof window.isSummaryTableExpanded !== 'undefined') {
        window.isSummaryTableExpanded = isHidden;
    }

    if (document.getElementById('planningView')?.style.display !== 'none' &&
        (contentId === 'teamLoadSummaryContent' || contentId === 'addInitiativeContent')) {
        adjustPlanningTableHeight();
    }
}

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
 * DEPRECATED: This function has been moved to YearPlanningView class
 * Keeping minimal stub for legacy renderPlanningView fallback
 */
function renderTeamLoadSummaryTable(summaryData, options = {}) {
    // If the class exists, use it
    if (window.yearPlanningView) {
        window.yearPlanningView.renderSummaryTable(summaryData);
        return;
    }
    // Legacy fallback removed - class should always be used
    console.warn('renderTeamLoadSummaryTable: YearPlanningView class not available');
}


/**
 * [REFACTORED] Performs all calculations for the team load summary.
 * Now delegates to PlanningService for pure business logic.
 * @returns {object} An object { rows: [], totals: {} } with the calculated data.
 */
function calculateTeamLoadSummaryData() {
    if (!currentSystemData || !currentSystemData.calculatedCapacityMetrics || !currentSystemData.teams) {
        console.error("calculateTeamLoadSummaryData: Missing required data.");
        return { rows: [], totals: {} };
    }

    // Filter initiatives for current planning year (excluding completed)
    const initiativesForYear = (currentSystemData.yearlyInitiatives || [])
        .filter(init => init.attributes.planningYear == currentPlanningYear && init.status !== 'Completed');

    // Delegate to PlanningService
    return PlanningService.calculateTeamLoadSummary({
        teams: currentSystemData.teams,
        initiatives: initiativesForYear,
        calculatedMetrics: currentSystemData.calculatedCapacityMetrics,
        scenario: planningCapacityScenario,
        applyConstraints: applyCapacityConstraintsToggle,
        allKnownEngineers: currentSystemData.allKnownEngineers || []
    });
}

/**
 * [REFACTORED] Calculates the main planning table data, including sorting and ATL/BTL status.
 * Now delegates to PlanningService for pure business logic.
 * @returns {Array<object>} A new array of initiative objects with calculated fields added.
 */
function calculatePlanningTableData() {
    if (!currentSystemData || !currentSystemData.calculatedCapacityMetrics || !currentSystemData.teams) {
        console.error("calculatePlanningTableData: Missing required data.");
        return [];
    }

    // Filter initiatives for current planning year (excluding completed)
    const initiativesForYear = (currentSystemData.yearlyInitiatives || [])
        .filter(init => init.attributes.planningYear == currentPlanningYear && init.status !== 'Completed');

    // Delegate to PlanningService
    const calculatedData = PlanningService.calculatePlanningTableData({
        initiatives: initiativesForYear,
        calculatedMetrics: currentSystemData.calculatedCapacityMetrics,
        scenario: planningCapacityScenario,
        applyConstraints: applyCapacityConstraintsToggle
    });

    // Update the planningStatusFundedHc on the original initiative objects for persistence
    calculatedData.forEach(calcInit => {
        const originalInit = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === calcInit.initiativeId);
        if (originalInit) {
            originalInit.attributes.planningStatusFundedHc = calcInit.calculatedAtlBtlStatus;
        }
    });

    return calculatedData;
}

/**
 * DEPRECATED: This function has been moved to YearPlanningView class
 * Keeping minimal stub for legacy renderPlanningView fallback
 */
function renderPlanningTable(planningData, options = {}) {
    // If the class exists, use it
    if (window.yearPlanningView) {
        window.yearPlanningView.renderPlanningTable(planningData);
        return;
    }
    // Legacy fallback removed - class should always be used
    console.warn('renderPlanningTable: YearPlanningView class not available');
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
 * Main render function for the Planning View.
 */
function renderPlanningView() {
    // [SYNC FIX] Ensure capacity metrics are fresh before rendering
    // We check if the function exists to avoid errors during initial load if main.js isn't fully ready
    if (window.updateCapacityCalculationsAndDisplay) {
        // Note: updateCapacityCalculationsAndDisplay calls renderPlanningView if currentViewId is planningView.
        // To avoid infinite recursion, we should only call it if we are NOT already inside a recursive call triggered by it.
        // However, updateCapacityCalculationsAndDisplay updates the data and THEN calls render.
        // If we call it here, we might loop.
        // BETTER APPROACH: Just recalculate the metrics HERE directly or call a non-rendering update helper.
        // OR: Trust that updateCapacityCalculationsAndDisplay is called by the triggers (save, switch view).
        // BUT: If user navigates directly to Planning View, we want fresh data.

        // SAFE FIX: Recalculate metrics directly here without triggering a full app refresh loop.
        if (currentSystemData) {
            const capacityEngine = new CapacityEngine(currentSystemData);
            currentSystemData.calculatedCapacityMetrics = capacityEngine.calculateAllMetrics();
        }
    }

    const container = document.getElementById('planningView');
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
                        if (window.aiAgentController && window.aiAgentController.runPrebuiltAgent) {
                            window.aiAgentController.runPrebuiltAgent('optimizePlan');
                        } else {
                            window.notificationManager.showToast("AI Controller is not available.", "error");
                        }
                    },
                    className: 'btn btn-info btn-sm',
                    hidden: !(SettingsService.get() && SettingsService.get().ai && SettingsService.get().ai.isEnabled)
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

    // [PATCH] Capture current expanded state from DOM before re-rendering
    const summaryContent = document.getElementById('teamLoadSummaryContent');
    if (summaryContent) {
        window.isSummaryTableExpanded = summaryContent.style.display !== 'none';
    }
    const isExpanded = window.isSummaryTableExpanded;

    container.innerHTML = `
        <div id="teamLoadSummarySection" style="margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px;">
            <h4 onclick="toggleCollapsibleSection('teamLoadSummaryContent', 'teamLoadSummaryToggle')" style="cursor: pointer; margin: 0; padding: 10px; background-color: #e9ecef; border-bottom: 1px solid #ccc;" title="Click to expand/collapse team load summary">
                <span id="teamLoadSummaryToggle" class="toggle-indicator">${isExpanded ? '(-)' : '(+)'} </span> Team Load Summary (for ATL Initiatives)
            </h4>
            <div id="teamLoadSummaryContent" style="display: ${isExpanded ? 'block' : 'none'}; padding: 10px;">
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
    // Updated to use WorkPackageService directly
    WorkPackageService.ensureWorkPackagesForInitiatives(currentSystemData, currentPlanningYear);
    // Updated to use WorkPackageService directly
    (currentSystemData.yearlyInitiatives || [])
        .filter(init => `${init.attributes?.planningYear || ''}` === `${currentPlanningYear}`)
        // Updated to use WorkPackageService directly
        .forEach(init => WorkPackageService.syncInitiativeTotals(init.initiativeId, currentSystemData));

    const tableContainer = document.getElementById('planningTableContainer');

    if (!currentSystemData || !currentSystemData.teams) {
        if (tableContainer) {
            tableContainer.innerHTML = '';
            const errorMsg = document.createElement('p');
            errorMsg.style.color = 'orange';
            errorMsg.textContent = 'No planning data loaded or no teams found.';
            tableContainer.appendChild(errorMsg);
        }
        return;
    }

    // Ensure Planning Years
    ensureInitiativePlanningYears(currentSystemData.yearlyInitiatives);

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
/**
 * Recalculates capacity metrics and refreshes the Year Planning view if active.
 * For other views, use CapacityEngine.recalculate() directly for pure data updates.
 */
function updateCapacityCalculationsAndDisplay() {
    if (!currentSystemData) return;

    // Delegate data recalculation to CapacityEngine
    CapacityEngine.recalculate(currentSystemData);

    // Refresh Year Planning view if it's currently active
    if (currentViewId === 'planningView') {
        renderPlanningView();
    }
}

if (typeof window !== 'undefined') {
    window.renderPlanningView = renderPlanningView;
    window.calculatePlanningTableData = calculatePlanningTableData;
    window.calculateTeamLoadSummaryData = calculateTeamLoadSummaryData;
    window.updateCapacityCalculationsAndDisplay = updateCapacityCalculationsAndDisplay;
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
        // Updated to use WorkPackageService directly
        WorkPackageService.ensureWorkPackagesForInitiatives(currentSystemData, currentPlanningYear);
        (currentSystemData.yearlyInitiatives || [])
            .filter(init => init.attributes?.planningYear == currentPlanningYear)
            .forEach(init => {
                // Updated to use WorkPackageService directly
                WorkPackageService.syncWorkPackagesFromInitiative(init, currentSystemData);
                WorkPackageService.syncInitiativeTotals(init.initiativeId, currentSystemData);
            });

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
