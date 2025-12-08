let currentGanttYear = new Date().getFullYear();
let currentGanttGroupBy = 'All Initiatives';
const GANTT_TABLE_WIDTH_KEY = 'ganttTableWidthPct';
let ganttTableWidthPct = 36;
const storedGanttWidth = parseFloat(localStorage.getItem(GANTT_TABLE_WIDTH_KEY));
if (isFinite(storedGanttWidth) && storedGanttWidth > 5 && storedGanttWidth < 95) {
    ganttTableWidthPct = storedGanttWidth;
}
let ganttExpandedInitiatives = new Set();
let ganttExpandedWorkPackages = new Set();
let ganttWorkPackagesInitialized = false;
let ganttOtherTeamsExpanded = new Set();
const GANTT_STATUS_OPTIONS = ['Backlog', 'Defined', 'Committed', 'In Progress', 'Done', 'Blocked'];
let ganttStatusFilter = new Set(GANTT_STATUS_OPTIONS);
let lastGanttFocusTaskId = null;
let lastGanttFocusTaskType = null;
let lastGanttFocusInitiativeId = null;
let ganttChartInstance = null; // Chart renderer instance (Mermaid or Frappe)

// Use GanttService methods via local aliases for cleaner internal usage
const normalizeGanttId = (value) => GanttService.normalizeGanttId(value);
const buildAssignmentTaskId = (wpId, teamId) => GanttService.buildAssignmentTaskId(wpId, teamId);
const truncateLabel = (text, maxLen) => GanttService.truncateLabel(text, maxLen);
const getEarliestAssignmentStart = (wp) => GanttService.getEarliestAssignmentStart(wp);
const getLatestAssignmentEnd = (wp) => GanttService.getLatestAssignmentEnd(wp);
const wouldCreateDependencyCycle = (fromWpId, toWpId, workPackages) => GanttService.wouldCreateDependencyCycle(fromWpId, toWpId, workPackages);
const wouldCreateAssignmentCycle = (fromId, toId, assignments) => GanttService.wouldCreateAssignmentCycle(fromId, toId, assignments);

function getGanttFocusContext() {
    return {
        taskId: lastGanttFocusTaskId ? normalizeGanttId(lastGanttFocusTaskId) : null,
        taskType: lastGanttFocusTaskType || null,
        initiativeId: lastGanttFocusInitiativeId ? normalizeGanttId(lastGanttFocusInitiativeId) : null
    };
}

function setLastGanttFocus({ taskId, taskType, initiativeId }) {
    if (!taskId) return;
    lastGanttFocusTaskId = normalizeGanttId(taskId);
    lastGanttFocusTaskType = taskType || null;
    lastGanttFocusInitiativeId = initiativeId ? normalizeGanttId(initiativeId) : null;
}


function captureGanttFocusFromTarget(target) {
    if (!target || !target.dataset) return;
    const { action, kind } = target.dataset;

    if (kind === 'wp-assign') {
        const wpId = target.dataset.wpId;
        const teamId = target.dataset.teamId;
        const initiativeId = target.dataset.initiativeId;
        const taskId = buildAssignmentTaskId(wpId, teamId);
        if (taskId) {
            setLastGanttFocus({ taskId, taskType: 'assignment', initiativeId });
        }
        return;
    }

    if (kind === 'wp-assign-dep') {
        const wpId = target.dataset.wpId;
        const assignId = target.dataset.assignId;
        const initiativeId = target.dataset.initiativeId;
        if (wpId && assignId) {
            setLastGanttFocus({ taskId: assignId, taskType: 'assignment', initiativeId });
        }
        return;
    }

    if (kind === 'work-package' || action === 'toggle-wp' || action === 'toggle-other-teams') {
        const wpId = target.dataset.wpId;
        const initiativeId = target.dataset.initiativeId;
        if (wpId) {
            setLastGanttFocus({ taskId: wpId, taskType: 'workPackage', initiativeId });
        }
        return;
    }

    if (kind === 'initiative' || action === 'toggle-initiative' || action === 'add-wp' || action === 'delete-wp') {
        const id = target.dataset.id || target.dataset.initiativeId;
        if (id) {
            setLastGanttFocus({ taskId: id, taskType: 'initiative', initiativeId: id });
        }
        return;
    }

    if (kind === 'wp-dep') {
        const wpId = target.dataset.wpId;
        const initiativeId = target.dataset.initiativeId;
        if (wpId) {
            setLastGanttFocus({ taskId: wpId, taskType: 'workPackage', initiativeId });
        }
        return;
    }

    if (kind === 'init-dep') {
        const initId = target.dataset.initId;
        if (initId) {
            setLastGanttFocus({ taskId: initId, taskType: 'initiative', initiativeId: initId });
        }
        return;
    }

    if (action === 'toggle-dep-menu') {
        const wpId = target.dataset.wpId;
        const initId = target.dataset.initId;
        const assignId = target.dataset.assignId;
        if (assignId && wpId) {
            setLastGanttFocus({ taskId: assignId, taskType: 'assignment', initiativeId: initId });
            return;
        }
        if (wpId) {
            setLastGanttFocus({ taskId: wpId, taskType: 'workPackage', initiativeId: initId });
            return;
        }
        if (initId) {
            setLastGanttFocus({ taskId: initId, taskType: 'initiative', initiativeId: initId });
        }
    }
}

/**
 * NEW: Renders the Gantt Planning view into the Workspace.
 */
function renderGanttPlanningView(container) {
    console.log("Rendering Gantt Planning View...");

    if (!container) {
        container = document.getElementById('ganttPlanningView');
    }
    if (!container) {
        console.error("Gantt container #ganttPlanningView not found.");
        return;
    }

    // Updated to use WorkPackageService directly
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), currentGanttYear);

    // 1. Set Workspace Metadata (Header)
    if (workspaceComponent) {
        workspaceComponent.setPageMetadata({
            title: 'Detailed Planning (Gantt)',
            breadcrumbs: ['Planning', 'Detailed Planning'],
            actions: [] // No global actions for now, maybe "Export" later
        });
    }

    // 2. Set Workspace Toolbar (Controls)
    const toolbarControls = generateGanttToolbar();
    if (workspaceComponent && toolbarControls) {
        workspaceComponent.setToolbar(toolbarControls);
    }

    // 3. Create Content Layout using DOM creation
    // Only create layout if it doesn't exist
    if (!document.getElementById('ganttSplitPane')) {
        ganttChartInstance = null;

        // Clear container
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Create split pane
        const splitPane = document.createElement('div');
        splitPane.id = 'ganttSplitPane';
        splitPane.className = 'gantt-split';

        // Table container
        const tableContainer = document.createElement('div');
        tableContainer.id = 'ganttPlanningTableContainer';
        tableContainer.className = 'gantt-panel';
        splitPane.appendChild(tableContainer);

        // Resizer
        const resizer = document.createElement('div');
        resizer.id = 'ganttSplitResizer';
        resizer.className = 'gantt-resizer';
        resizer.title = 'Drag to resize panels';
        splitPane.appendChild(resizer);

        // Chart wrapper and container
        const chartWrapper = document.createElement('div');
        chartWrapper.id = 'ganttChartWrapper';
        chartWrapper.className = 'gantt-panel';

        const chartContainer = document.createElement('div');
        chartContainer.id = 'ganttChartContainer';
        chartContainer.className = 'mermaid gantt-chart-box';
        chartWrapper.appendChild(chartContainer);

        splitPane.appendChild(chartWrapper);
        container.appendChild(splitPane);

        setupGanttResizer();
        applyGanttSplitWidth();
    }

    // 4. Initialize Filters & Render Views
    // These functions attach listeners to the elements we just put in the toolbar
    renderDynamicGroupFilter();
    renderStatusFilter();
    setupGanttRendererToggle();

    renderGanttTable();
    renderGanttChart();
}

/**
 * Generates the toolbar controls for the Gantt View.
 * @returns {HTMLElement} The toolbar container
 */
function generateGanttToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '16px';
    toolbar.style.width = '100%';
    toolbar.style.flexWrap = 'wrap';

    // Year selector
    const yearWrap = createLabeledControl('Year:', document.createElement('select'));
    const yearSelect = yearWrap.querySelector('select');
    yearSelect.id = 'ganttYearFilter';
    yearSelect.className = 'form-select form-select-sm';

    const years = Array.from(new Set(
        (SystemService.getCurrentSystem()?.yearlyInitiatives || [])
            .map(init => init.attributes?.planningYear)
            .filter(y => y)
    ));
    if (!years.includes(currentGanttYear)) years.push(currentGanttYear);
    years.sort();
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    });
    yearSelect.value = currentGanttYear;
    yearSelect.onchange = () => {
        currentGanttYear = parseInt(yearSelect.value, 10);
        console.log('[GANTT] Year changed', currentGanttYear);
        renderGanttTable();
        renderGanttChart();
    };
    toolbar.appendChild(yearWrap);

    // View By selector
    const groupWrap = createLabeledControl('View By:', document.createElement('select'));
    const groupSelect = groupWrap.querySelector('select');
    groupSelect.id = 'ganttGroupBy';
    groupSelect.className = 'form-select form-select-sm';
    ['All Initiatives', 'Team'].forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = `View by ${val}`;
        groupSelect.appendChild(opt);
    });
    groupSelect.value = currentGanttGroupBy;
    groupSelect.onchange = () => {
        currentGanttGroupBy = groupSelect.value;
        console.log('[GANTT] View By changed', currentGanttGroupBy);
        renderDynamicGroupFilter();
        renderGanttChart();
        renderGanttTable();
    };
    toolbar.appendChild(groupWrap);

    // Dynamic Filter Placeholder
    const dynamicFilterWrap = document.createElement('div');
    dynamicFilterWrap.id = 'ganttDynamicFilter';
    dynamicFilterWrap.className = 'filter-item';
    toolbar.appendChild(dynamicFilterWrap);

    // Status Filter Placeholder
    const statusFilterWrap = document.createElement('div');
    statusFilterWrap.id = 'ganttStatusFilter';
    statusFilterWrap.className = 'filter-item';
    toolbar.appendChild(statusFilterWrap);

    // Refresh Button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.className = 'btn btn-primary btn-sm';
    refreshBtn.onclick = () => {
        renderGanttTable();
        renderGanttChart();
    };
    toolbar.appendChild(refreshBtn);

    // Renderer Toggle
    const rendererWrap = document.createElement('div');
    rendererWrap.style.display = 'flex';
    rendererWrap.style.alignItems = 'center';
    const rendererBtn = document.createElement('button');
    rendererBtn.id = 'ganttRendererToggle';
    rendererBtn.type = 'button';
    rendererBtn.className = 'btn btn-secondary btn-sm';
    rendererBtn.title = 'Switch between Mermaid and Frappe Gantt renderers';
    rendererBtn.textContent = getRendererButtonLabel();
    rendererWrap.appendChild(rendererBtn);
    toolbar.appendChild(rendererWrap);

    // Legend (Frappe only)
    const legendDiv = document.createElement('div');
    legendDiv.id = 'ganttLegendContainer';
    legendDiv.className = 'gantt-legend';
    legendDiv.style.marginLeft = 'auto'; // Push to right

    const currentRenderer = FeatureFlags.getRenderer();

    legendDiv.style.display = currentRenderer === 'frappe' ? 'flex' : 'none';

    // Create legend items using DOM creation
    const legendItems = [
        { className: 'gantt-legend__color-box--initiative', label: 'Initiative' },
        { className: 'gantt-legend__color-box--work-package', label: 'Work Package' },
        { className: 'gantt-legend__color-box--assignment', label: 'Assignment' }
    ];

    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'gantt-legend__item';

        const colorBox = document.createElement('span');
        colorBox.className = `gantt-legend__color-box ${item.className}`;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(document.createTextNode(` ${item.label}`));
        legendDiv.appendChild(legendItem);
    });

    toolbar.appendChild(legendDiv);

    return toolbar;
}



function createLabeledControl(labelText, controlEl) {
    const wrap = document.createElement('div');
    wrap.className = 'filter-item';
    const label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);
    wrap.appendChild(controlEl);
    return wrap;
}

function getGanttFilteredInitiatives() {
    let initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives ? [...SystemService.getCurrentSystem().yearlyInitiatives] : [];
    const yearFilter = document.getElementById('ganttYearFilter')?.value || currentGanttYear;
    if (yearFilter && yearFilter !== 'all') {
        initiatives = initiatives.filter(init => (init.attributes?.planningYear || '').toString() === yearFilter.toString());
    }

    if (currentGanttGroupBy === 'Team') {
        const selectedTeam = document.getElementById('ganttGroupValue')?.value || 'all';
        if (selectedTeam !== 'all') {
            initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === selectedTeam));
        }
    }
    const statusFilter = ganttStatusFilter || new Set(GANTT_STATUS_OPTIONS);
    if (statusFilter.size > 0 && statusFilter.size < GANTT_STATUS_OPTIONS.length) {
        initiatives = initiatives.filter(init => statusFilter.has(init.status || ''));
    }
    if (statusFilter.size === 0) {
        initiatives = [];
    }
    return initiatives;
}

function renderGanttTable() {
    const container = document.getElementById('ganttPlanningTableContainer');
    if (!container) return;
    // Updated to use WorkPackageService directly
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), currentGanttYear);
    const focus = getGanttFocusContext();
    const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
    const showManagerTeams = currentGanttGroupBy === 'Manager' && (document.getElementById('ganttManagerFilter')?.value || 'all') !== 'all';
    const initiativeMap = new Map();
    const data = getGanttFilteredInitiatives().map(init => {
        const dates = getComputedInitiativeDates(init, selectedTeam);
        const item = {
            ...init,
            displayStart: dates.startDate,
            displayEnd: dates.endDate
        };
        initiativeMap.set(init.initiativeId, item);
        return item;
    });

    // Build table structure using DOM creation
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'gantt-table-wrapper';

    const table = document.createElement('table');
    table.className = 'gantt-table gantt-hierarchy';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Define header columns (conditionally include Teams column)
    const headerColumns = [
        'Initiative / Work Package',
        ...(showManagerTeams ? ['Teams'] : []),
        'Start',
        'Target',
        'SDEs',
        'Dependencies',
        'Actions'
    ];

    headerColumns.forEach(colText => {
        const th = document.createElement('th');
        th.className = 'gantt-table__header-cell';
        th.textContent = colText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'ganttTableBody';
    table.appendChild(tbody);

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    if (data.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = showManagerTeams ? 7 : 6;
        emptyCell.className = 'gantt-table__empty';
        emptyCell.textContent = 'No initiatives match the filters.';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    const workingDaysPerYear = SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
    const allInitiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
    const allWorkPackages = SystemService.getCurrentSystem().workPackages || [];
    // Seed initialization flag without auto-expanding WPs (default collapsed)
    if (!ganttWorkPackagesInitialized) {
        ganttWorkPackagesInitialized = true;
    }

    data.forEach(init => {
        const isExpanded = ganttExpandedInitiatives.has(init.initiativeId);
        const hasWorkPackages = hasWorkPackagesForInitiative(init.initiativeId);
        const initIdNorm = normalizeGanttId(init.initiativeId);
        const isFocusInitiative = focus.initiativeId && initIdNorm === focus.initiativeId;
        const isFocusRow = focus.taskType === 'initiative' && focus.taskId && initIdNorm === focus.taskId;
        const tr = document.createElement('tr');
        tr.className = [
            'gantt-init-row',
            isFocusInitiative ? 'gantt-focus-initiative' : '',
            isFocusRow ? 'gantt-focus-row' : ''
        ].filter(Boolean).join(' ');
        tr.innerHTML = `
            <td class="gantt-table__cell gantt-table__cell--initiative gantt-table__cell--initiative-title">
                <button class="gantt-expander" data-action="toggle-initiative" data-id="${init.initiativeId}" aria-label="Toggle work packages">${isExpanded ? '-' : '+'}</button>
                <div class="gantt-table__title-container">
                    <div>${init.title || '(Untitled)'}</div>
                    <div class="gantt-table__id-badge">${init.initiativeId || ''}</div>
                </div>
            </td>
            ${showManagerTeams ? `<td class="gantt-table__cell gantt-table__cell--initiative">${getTeamsForInitiative(init).join(', ')}</td>` : ''}
            <td class="gantt-table__cell gantt-table__cell--initiative"><input type="date" value="${init.displayStart || ''}" data-kind="initiative" data-field="startDate" data-id="${init.initiativeId}" ${hasWorkPackages ? 'disabled title="Edit dates at Work Package level when WPs exist."' : ''}></td>
            <td class="gantt-table__cell gantt-table__cell--initiative"><input type="date" value="${init.displayEnd || ''}" data-kind="initiative" data-field="targetDueDate" data-id="${init.initiativeId}" ${hasWorkPackages ? 'disabled title="Edit dates at Work Package level when WPs exist."' : ''}></td>
            <td class="gantt-table__cell gantt-table__cell--initiative"><input type="number" step="0.01" value="${computeSdeEstimate(init)}" data-kind="initiative" data-field="sdeEstimate" data-id="${init.initiativeId}" ${hasWorkPackages ? 'disabled title="Edit SDEs at Work Package level when WPs exist."' : ''}></td>
            <td class="gantt-table__cell gantt-table__cell--initiative">${renderInitiativePredecessorSelector(allInitiatives, init)}</td>
            <td class="gantt-table__cell gantt-table__cell--initiative">
                <button class="gantt-add-wp btn-primary" data-action="add-wp" data-id="${init.initiativeId}">Add WP</button>
            </td>
        `;
        tbody.appendChild(tr);

        if (isExpanded) {
            const wpList = getWorkPackagesForInitiative(init.initiativeId);
            if (!wpList.length) {
                const emptyWp = document.createElement('tr');
                emptyWp.className = 'gantt-wp-row';
                const emptyWpCell = document.createElement('td');
                emptyWpCell.colSpan = showManagerTeams ? 7 : 6;
                emptyWpCell.className = 'gantt-table__empty-wp';
                emptyWpCell.textContent = 'No work packages yet. Click "Add WP" to create one.';
                emptyWp.appendChild(emptyWpCell);
                tbody.appendChild(emptyWp);
            } else {
                wpList.forEach(wp => {
                    const wpExpanded = ganttExpandedWorkPackages.has(wp.workPackageId);
                    const wpIdNorm = normalizeGanttId(wp.workPackageId);
                    const isFocusWp = focus.taskType === 'workPackage' && focus.taskId && wpIdNorm === focus.taskId;
                    const wpRowClasses = [
                        'gantt-wp-row',
                        isFocusWp ? 'gantt-focus-row' : '',
                        isFocusInitiative ? 'gantt-focus-initiative' : ''
                    ].filter(Boolean).join(' ');
                    const wpRow = document.createElement('tr');
                    wpRow.className = wpRowClasses;
                    const depsValue = (wp.dependencies || []).join(', ');
                    wpRow.innerHTML = `
                        <td class="gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-title">
                            <div>
                                <button class="gantt-expander" data-action="toggle-wp" data-wp-id="${wp.workPackageId}" aria-label="Toggle team assignments">${wpExpanded ? '-' : '+'}</button>
                                <input type="text" value="${wp.title || ''}" data-kind="work-package" data-field="title" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}">
                            </div>
                        </td>
                        ${showManagerTeams ? `<td class="gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-teams">${formatWorkPackageTeams(wp, selectedTeam)}</td>` : ''}
                        <td class="gantt-table__cell gantt-table__cell--wp"><input type="date" value="${wp.startDate || ''}" data-kind="work-package" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}"></td>
                        <td class="gantt-table__cell gantt-table__cell--wp"><input type="date" value="${wp.endDate || ''}" data-kind="work-package" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}"></td>
                        <td class="gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-sde">${computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam)}</td>
                        <td class="gantt-table__cell gantt-table__cell--wp">
                            ${renderPredecessorSelector(allWorkPackages, wp)}
                        </td>
                        <td class="gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-actions">
                            <button data-action="add-task" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" class="btn-secondary btn-sm" title="Add team assignment">+ Task</button>
                            <button data-action="delete-wp" data-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" class="btn-danger btn-sm">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(wpRow);

                    // Team-level assignment rows for this work package
                    if (wpExpanded) {
                        const teamFilterActive = currentGanttGroupBy === 'Team' && selectedTeam && selectedTeam !== 'all';
                        const assigns = wp.impactedTeamAssignments || [];
                        const selectedAssignments = teamFilterActive ? assigns.filter(a => a.teamId === selectedTeam) : assigns;
                        const otherAssignments = teamFilterActive ? assigns.filter(a => a.teamId !== selectedTeam) : [];
                        const showOtherTeams = !teamFilterActive || ganttOtherTeamsExpanded.has(wp.workPackageId);
                        const visibleAssignments = showOtherTeams ? assigns : selectedAssignments;

                        visibleAssignments.forEach(assign => {
                            const assignRow = document.createElement('tr');
                            const assignTaskId = buildAssignmentTaskId(wp.workPackageId, assign.teamId);
                            const isFocusAssign = focus.taskType === 'assignment' && focus.taskId && assignTaskId && normalizeGanttId(assignTaskId) === focus.taskId;
                            assignRow.className = [
                                'gantt-wp-assign-row',
                                isFocusAssign ? 'gantt-focus-row' : '',
                                isFocusInitiative ? 'gantt-focus-initiative' : ''
                            ].filter(Boolean).join(' ');
                            const depsSelector = renderAssignmentPredecessorSelector(wp, assign);
                            const sdeYears = ((assign.sdeDays || 0) / workingDaysPerYear).toFixed(2);
                            if (showManagerTeams) {
                                assignRow.innerHTML = `
                                    <td class="gantt-table__cell--assignment">Team: ${getTeamName(assign.teamId) || '(Unassigned)'}</td>
                                    <td class="gantt-table__cell--assignment-empty"></td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="date" value="${assign.startDate || wp.startDate || ''}" data-kind="wp-assign" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="date" value="${assign.endDate || wp.endDate || ''}" data-kind="wp-assign" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="number" step="0.01" value="${sdeYears}" data-kind="wp-assign" data-field="sdeYears" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">${depsSelector}</td>
                                    <td class="gantt-table__cell--assignment-actions"><button data-action="delete-task" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}" class="btn-danger btn-sm" title="Delete this task">×</button></td>
                                `;
                            } else {
                                assignRow.innerHTML = `
                                    <td class="gantt-table__cell--assignment">Team: ${getTeamName(assign.teamId) || '(Unassigned)'}</td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="date" value="${assign.startDate || wp.startDate || ''}" data-kind="wp-assign" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="date" value="${assign.endDate || wp.endDate || ''}" data-kind="wp-assign" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">
                                        <input type="number" step="0.01" value="${sdeYears}" data-kind="wp-assign" data-field="sdeYears" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td class="gantt-table__cell--assignment-empty">${depsSelector}</td>
                                    <td class="gantt-table__cell--assignment-actions"><button data-action="delete-task" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}" class="btn-danger btn-sm" title="Delete this task">×</button></td>
                                `;
                            }
                            tbody.appendChild(assignRow);
                        });

                        if (teamFilterActive && otherAssignments.length) {
                            const toggleRow = document.createElement('tr');
                            if (showManagerTeams) {
                                toggleRow.innerHTML = `
                                    <td class="gantt-table__cell--other-teams">Other teams (${otherAssignments.length})</td>
                                    <td class="gantt-table__cell--other-teams-action"></td>
                                    <td colspan="4" class="gantt-table__cell--other-teams-action">
                                        <button data-action="toggle-other-teams" data-wp-id="${wp.workPackageId}">${showOtherTeams ? 'Hide' : 'Show'} other teams</button>
                                    </td>
                                    <td class="gantt-table__cell--other-teams-action"></td>
                                `;
                            } else {
                                toggleRow.innerHTML = `
                                    <td class="gantt-table__cell--other-teams">Other teams (${otherAssignments.length})</td>
                                    <td colspan="4" class="gantt-table__cell--other-teams-action">
                                        <button data-action="toggle-other-teams" data-wp-id="${wp.workPackageId}">${showOtherTeams ? 'Hide' : 'Show'} other teams</button>
                                    </td>
                                    <td class="gantt-table__cell--other-teams-action"></td>
                                `;
                            }
                            tbody.appendChild(toggleRow);
                        }
                    }
                });
            }
        }
    });

    tbody.addEventListener('click', async (e) => {
        const target = e.target;
        captureGanttFocusFromTarget(target);
        const action = target.dataset.action;
        if (action === 'toggle-initiative') {
            const id = target.dataset.id;
            if (ganttExpandedInitiatives.has(id)) {
                ganttExpandedInitiatives.delete(id);
            } else {
                ganttExpandedInitiatives.add(id);
            }
            renderGanttTable();
            renderGanttChart();
        } else if (action === 'add-wp') {
            const id = target.dataset.id;
            const init = initiativeMap.get(id);
            const defaults = { startDate: init?.displayStart, endDate: init?.displayEnd };
            const wp = WorkPackageService.addWorkPackage(SystemService.getCurrentSystem(), id, defaults);
            if (wp) {
                ganttExpandedInitiatives.add(id);
                ganttExpandedWorkPackages.add(wp.workPackageId);
                WorkPackageService.syncInitiativeTotals(id, SystemService.getCurrentSystem());
                if (typeof SystemService !== 'undefined' && SystemService.save) {
                    SystemService.save();
                }
                renderGanttTable();
                renderGanttChart();
            }
        } else if (action === 'delete-wp') {
            const wpId = target.dataset.id;
            const initId = target.dataset.initiativeId;
            if (!await notificationManager.confirm('Delete this work package?', 'Delete Work Package', { confirmStyle: 'danger' })) {
                return;
            }
            const deleted = WorkPackageService.deleteWorkPackage(SystemService.getCurrentSystem(), wpId);
            ganttExpandedWorkPackages.delete(wpId);
            WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
            if (typeof SystemService !== "undefined" && SystemService.save) {
                SystemService.save();
            }
            renderGanttTable();
            renderGanttChart();
        } else if (action === 'add-task') {
            // Add a new team assignment to this work package
            const wpId = target.dataset.wpId;
            const initId = target.dataset.initiativeId;
            const assignment = WorkPackageService.addAssignment(SystemService.getCurrentSystem(), wpId, {});
            if (assignment) {
                // Expand this work package to show the new assignment
                ganttExpandedWorkPackages.add(wpId);
                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
                if (SystemService.save) {
                    SystemService.save();
                }
                renderGanttTable();
                renderGanttChart();
            }
        } else if (action === 'delete-task') {
            // Delete a team assignment from a work package
            const wpId = target.dataset.wpId;
            const initId = target.dataset.initiativeId;
            const teamId = target.dataset.teamId;
            if (!await notificationManager.confirm('Delete this task assignment?', 'Delete Task', { confirmStyle: 'danger' })) {
                return;
            }
            const deleted = WorkPackageService.deleteAssignment(SystemService.getCurrentSystem(), wpId, teamId);
            if (deleted) {
                WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());
                if (SystemService.save) {
                    SystemService.save();
                }
                renderGanttTable();
                renderGanttChart();
            }
        } else if (action === 'toggle-wp') {
            const wpId = target.dataset.wpId;
            if (ganttExpandedWorkPackages.has(wpId)) {
                ganttExpandedWorkPackages.delete(wpId);
            } else {
                ganttExpandedWorkPackages.add(wpId);
            }
            renderGanttTable();
            renderGanttChart();
        } else if (action === 'toggle-other-teams') {
            const wpId = target.dataset.wpId;
            if (ganttOtherTeamsExpanded.has(wpId)) {
                ganttOtherTeamsExpanded.delete(wpId);
            } else {
                ganttOtherTeamsExpanded.add(wpId);
            }
            renderGanttTable();
        } else if (action === 'toggle-dep-menu') {
            const menuId = target.dataset.menuId;
            const menu = document.getElementById(menuId);
            if (!menu) return;
            menu.classList.toggle('open');
        }
    });

    tbody.addEventListener('change', (e) => {
        captureGanttFocusFromTarget(e.target);
        const field = e.target.dataset.field;
        const kind = e.target.dataset.kind;
        if (kind === 'initiative') {
            const id = e.target.dataset.id;
            const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === id);
            if (!init) return;
            const value = e.target.value;
            const hasWpsForInit = hasWorkPackagesForInitiative(id);
            const selectedTeamLocal = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
            const workingDaysPerYearLocal = SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
            if (field === 'startDate') {
                if (hasWpsForInit) {
                    notificationManager.showToast('Initiative dates cannot be edited when work packages exist. Edit at the work package level.', 'warning');
                    renderGanttTable();
                    return;
                }
                init.attributes = init.attributes || {};
                init.attributes.startDate = value;
                setWorkPackageDatesForTeam(init.initiativeId, { startDate: value }, selectedTeamLocal);
            } else if (field === 'targetDueDate') {
                if (hasWpsForInit) {
                    notificationManager.showToast('Initiative dates cannot be edited when work packages exist. Edit at the work package level.', 'warning');
                    renderGanttTable();
                    return;
                }
                init.targetDueDate = value;
                setWorkPackageDatesForTeam(init.initiativeId, { endDate: value }, selectedTeamLocal);
            } else if (field === 'sdeEstimate') {
                const num = parseFloat(value) || 0;
                const assignments = init.assignments || [];
                if (assignments.length > 0) {
                    if (currentGanttGroupBy === 'Team' && selectedTeamLocal && selectedTeamLocal !== 'all') {
                        assignments.forEach(a => {
                            if (a.teamId === selectedTeamLocal) {
                                a.sdeYears = num;
                            }
                        });
                        updateWorkPackageSde(init.initiativeId, selectedTeamLocal, num, workingDaysPerYearLocal);
                    } else {
                        const perTeam = num / assignments.length;
                        assignments.forEach(a => a.sdeYears = perTeam);
                        (init.assignments || []).forEach(a => {
                            updateWorkPackageSde(init.initiativeId, a.teamId, perTeam, workingDaysPerYearLocal);
                        });
                    }
                } else {
                    init.assignments = [{ teamId: selectedTeamLocal || null, sdeYears: num }];
                    updateWorkPackageSde(init.initiativeId, selectedTeamLocal || null, num, workingDaysPerYearLocal);
                }
            }
            WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem());
            WorkPackageService.syncInitiativeTotals(init.initiativeId, SystemService.getCurrentSystem());

            SystemService.save();

            renderGanttChart();
        } else if (kind === 'work-package') {
            const wpId = e.target.dataset.wpId;
            const initId = e.target.dataset.initiativeId;
            const value = e.target.value;
            const updates = {};
            if (field === 'title') {
                updates.title = value;
            } else if (field === 'startDate') {
                updates.startDate = value;
            } else if (field === 'endDate') {
                updates.endDate = value;
            } else if (field === 'dependencies') {
                updates.dependencies = value.split(',').map(s => s.trim()).filter(Boolean);
            }
            const wp = updateWorkPackage
                ? updateWorkPackage(wpId, updates)
                : (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            if (updates.startDate) {
                (wp.impactedTeamAssignments || []).forEach(assign => assign.startDate = updates.startDate || assign.startDate);
            }
            if (updates.endDate) {
                (wp.impactedTeamAssignments || []).forEach(assign => assign.endDate = updates.endDate || assign.endDate);
            }
            WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());

            SystemService.save();

            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'wp-assign') {
            const wpId = e.target.dataset.wpId;
            const initId = e.target.dataset.initiativeId;
            const teamId = e.target.dataset.teamId || null;
            const field = e.target.dataset.field;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            const assign = (wp.impactedTeamAssignments || []).find(a => `${a.teamId || ''}` === `${teamId || ''}`);
            if (!assign) return;
            if (field === 'startDate') {
                assign.startDate = e.target.value;
            } else if (field === 'endDate') {
                assign.endDate = e.target.value;
            } else if (field === 'sdeYears') {
                const sdeYears = parseFloat(e.target.value) || 0;
                assign.sdeDays = sdeYears * getWorkingDaysPerYear();
            }

            // Recalculate WP dates from assignments (Bottom-up)

            recalculateWorkPackageDates(wp);

            WorkPackageService.syncInitiativeTotals(initId, SystemService.getCurrentSystem());

            SystemService.save();

            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'wp-assign-dep') {
            const wpId = e.target.dataset.wpId;
            const initId = e.target.dataset.initiativeId;
            const assignId = e.target.dataset.assignId;
            const depId = e.target.dataset.value;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp || !assignId || !depId) return;
            const assign = getAssignmentByTaskId(wp, assignId);
            if (!assign) return;
            const deps = new Set((Array.isArray(assign.dependencies) ? assign.dependencies : []).map(normalizeGanttId).filter(Boolean));
            const depNorm = normalizeGanttId(depId);
            if (e.target.checked) {
                if (depNorm === normalizeGanttId(assignId)) {
                    e.target.checked = false;
                    notificationManager.showToast('A task cannot depend on itself.', 'warning');
                    return;
                }
                if (wouldCreateAssignmentCycle(wp, assignId, depId)) {
                    e.target.checked = false;
                    notificationManager.showToast('Circular dependency not allowed between tasks in this work package.', 'warning');
                    return;
                }
                deps.add(depNorm);
            } else {
                deps.delete(depNorm);
            }
            assign.dependencies = Array.from(deps);
            SystemService.save();

            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'wp-dep') {
            const wpId = e.target.dataset.wpId;
            const depId = e.target.dataset.value;
            const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            const deps = new Set(wp.dependencies || []);
            if (e.target.checked) {
                const allWps = SystemService.getCurrentSystem().workPackages || [];
                if (wouldCreateDependencyCycle(wpId, depId, allWps)) {
                    e.target.checked = false;
                    console.warn(`[GANTT] Prevented circular dependency: ${wpId} -> ${depId}`);
                    notificationManager.showToast('Circular dependency not allowed (would create a cycle).', 'warning');
                    return;
                }
                deps.add(depId);
            } else {
                deps.delete(depId);
            }
            onSaveCallback();
            updateWorkPackage(wpId, { dependencies: Array.from(deps) });
            syncInitiativeDependenciesFromWorkPackages(wp.initiativeId);
            SystemService.save();

            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'init-dep') {
            const initId = e.target.dataset.initId;
            const depId = e.target.dataset.value;
            const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initId);
            if (!initiative) return;
            const deps = new Set(initiative.dependencies || []);
            if (e.target.checked) {
                deps.add(depId);
            } else {
                deps.delete(depId);
            }
            initiative.dependencies = Array.from(deps);
            if (typeof SystemService !== "undefined" && SystemService.save) {
                SystemService.save();
            }
            renderGanttTable();
            renderGanttChart();
        }
    });

    scrollToGanttTableFocus();
}

function computeSdeEstimate(init) {
    const selectedGroupValue = document.getElementById('ganttGroupValue')?.value || 'all';
    let total = 0;
    (init.assignments || []).forEach(a => {
        if (currentGanttGroupBy === 'Team' && selectedGroupValue !== 'all') {
            if (a.teamId === selectedGroupValue) {
                total += a.sdeYears || 0;
            }
        } else {
            total += a.sdeYears || 0;
        }
    });
    return total.toFixed(2);
}

function getWorkPackagesForInitiative(initiativeId) {
    if (!initiativeId) return [];
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), currentGanttYear);
    return (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
}

function computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam = null) {
    const wpy = workingDaysPerYear || SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
    const assignments = wp?.impactedTeamAssignments || [];
    const filtered = (selectedTeam && selectedTeam !== 'all')
        ? assignments.filter(a => a.teamId === selectedTeam)
        : assignments;
    const totalDays = filtered.reduce((sum, a) => sum + (a.sdeDays || 0), 0);
    return (totalDays / wpy).toFixed(2);
}

function formatWorkPackageTeams(wp, selectedTeam = null) {
    const teams = new Set();
    (wp?.impactedTeamAssignments || []).forEach(assign => {
        if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
        const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === assign.teamId);
        if (team) teams.add(team.teamIdentity || team.teamName || assign.teamId);
    });
    if (teams.size === 0 && selectedTeam && selectedTeam !== 'all') {
        return '(Selected team not assigned)';
    }
    return teams.size ? Array.from(teams).join(', ') : '(Unassigned)';
}

function getWorkingDaysPerYear() {
    return SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
}

function getTeamName(teamId) {
    const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === teamId);
    return team ? (team.teamIdentity || team.teamName || teamId) : teamId;
}

function getAssignmentByTaskId(wp, assignTaskId) {
    if (!wp || !assignTaskId) return null;
    const targetNorm = normalizeGanttId(assignTaskId);
    return (wp.impactedTeamAssignments || []).find(assign => {
        const id = buildAssignmentTaskId(wp.workPackageId, assign.teamId);
        if (!id) return false;
        return normalizeGanttId(id) === targetNorm;
    }) || null;
}

function hasWorkPackagesForInitiative(initiativeId) {
    return (SystemService.getCurrentSystem().workPackages || []).some(wp => wp.initiativeId === initiativeId);
}

// getEarliestAssignmentStart and getLatestAssignmentEnd are now provided via GanttService aliases at top of file

// truncateLabel is now provided via GanttService alias at top of file

function renderPredecessorSelector(allWorkPackages, wp) {
    const options = (allWorkPackages || []).filter(other => other.workPackageId !== wp.workPackageId);
    const wpMap = new Map((allWorkPackages || []).map(w => [w.workPackageId, w]));
    const selected = new Set(wp.dependencies || []);
    const selectedLabels = Array.from(selected).map(id => {
        const found = wpMap.get(id);
        if (found) {
            return `${found.workPackageId}${found.title ? ` — ${found.title}` : ''}`;
        }
        return id;
    });
    const label = selectedLabels.length ? truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
    const menuId = `wp-deps-${wp.workPackageId}`;
    const items = options.length
        ? options.map(other => {
            const checked = selected.has(other.workPackageId) ? 'checked' : '';
            const initLabel = other.initiativeId ? ` [${other.initiativeId}]` : '';
            const text = `${other.workPackageId}${initLabel} — ${other.title || 'Untitled'}`;
            return `<label class="gantt-predecessor-option">
                        <input type="checkbox" data-kind="wp-dep" data-wp-id="${wp.workPackageId}" data-value="${other.workPackageId}" ${checked}>
                        <span>${text}</span>
                    </label>`;
        }).join('')
        : '<div class="gantt-predecessor-empty">No other work packages</div>';
    return `
        <div class="gantt-predecessor-select" data-wp-id="${wp.workPackageId}">
            <button type="button" class="btn-secondary gantt-predecessor-btn" data-action="toggle-dep-menu" data-menu-id="${menuId}" data-wp-id="${wp.workPackageId}">${label}</button>
            <div class="gantt-predecessor-menu" id="${menuId}">
                ${items}
            </div>
        </div>
    `;
}

function renderAssignmentPredecessorSelector(wp, assign) {
    if (!wp || !assign) return '';
    const assignments = wp.impactedTeamAssignments || [];
    const currentId = buildAssignmentTaskId(wp.workPackageId, assign.teamId);
    if (!currentId) return '';
    const assignmentMap = new Map();
    assignments.forEach(a => {
        const id = buildAssignmentTaskId(wp.workPackageId, a.teamId);
        if (id) assignmentMap.set(id, a);
    });
    const options = assignments
        .map(a => ({ id: buildAssignmentTaskId(wp.workPackageId, a.teamId), teamId: a.teamId }))
        .filter(opt => opt.id && normalizeGanttId(opt.id) !== normalizeGanttId(currentId));

    const selected = new Set((Array.isArray(assign.dependencies) ? assign.dependencies : []).map(normalizeGanttId).filter(Boolean));
    const selectedLabels = Array.from(selected).map(id => {
        const found = assignmentMap.get(id);
        if (found) {
            return getTeamName(found.teamId) || found.teamId || id;
        }
        return id;
    });

    const label = selectedLabels.length ? truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
    const menuId = `assign-deps-${currentId}`;
    const items = options.length
        ? options.map(opt => {
            const checked = selected.has(normalizeGanttId(opt.id)) ? 'checked' : '';
            const text = getTeamName(opt.teamId) || opt.teamId || opt.id;
            return `<label class="gantt-predecessor-option">
                        <input type="checkbox" data-kind="wp-assign-dep" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-assign-id="${currentId}" data-value="${opt.id}" ${checked}>
                        <span>${text}</span>
                    </label>`;
        }).join('')
        : '<div class="gantt-predecessor-empty">No other tasks in this work package</div>';

    return `
        <div class="gantt-predecessor-select" data-assign-id="${currentId}">
            <button type="button" class="btn-secondary gantt-predecessor-btn" data-action="toggle-dep-menu" data-menu-id="${menuId}" data-wp-id="${wp.workPackageId}" data-assign-id="${currentId}" data-initiative-id="${wp.initiativeId}">${label}</button>
            <div class="gantt-predecessor-menu" id="${menuId}">
                ${items}
            </div>
        </div>
    `;
}

function renderInitiativePredecessorSelector(allInitiatives, init) {
    const options = (allInitiatives || []).filter(other => other.initiativeId !== init.initiativeId);
    const initMap = new Map((allInitiatives || []).map(i => [i.initiativeId, i]));
    const selected = new Set(init.dependencies || []);
    const selectedLabels = Array.from(selected).map(id => {
        const found = initMap.get(id);
        if (found) {
            return `${found.initiativeId}${found.title ? ` — ${found.title}` : ''}`;
        }
        return id;
    });
    const label = selectedLabels.length ? truncateLabel(selectedLabels.join(', '), 45) : 'Select...';
    const menuId = `init-deps-${init.initiativeId}`;
    const items = options.length
        ? options.map(other => {
            const checked = selected.has(other.initiativeId) ? 'checked' : '';
            const text = `${other.initiativeId} — ${other.title || 'Untitled'}`;
            return `<label class="gantt-predecessor-option">
                        <input type="checkbox" data-kind="init-dep" data-init-id="${init.initiativeId}" data-value="${other.initiativeId}" ${checked}>
                        <span>${text}</span>
                    </label>`;
        }).join('')
        : '<div class="gantt-predecessor-empty">No other initiatives</div>';
    return `
        <div class="gantt-predecessor-select" data-init-id="${init.initiativeId}">
            <button type="button" class="btn-secondary gantt-predecessor-btn" data-action="toggle-dep-menu" data-menu-id="${menuId}" data-init-id="${init.initiativeId}">${label}</button>
            <div class="gantt-predecessor-menu" id="${menuId}">
                ${items}
            </div>
        </div>
    `;
}

function renderStatusFilter() {
    const wrap = document.getElementById('ganttStatusFilter');
    if (!wrap) return;
    wrap.innerHTML = '';
    const label = document.createElement('div');
    label.textContent = 'Backlog Status:';
    label.className = 'gantt-status-label';
    wrap.appendChild(label);

    const makeCheckbox = (id, text, value, checked) => {
        const boxWrap = document.createElement('label');
        boxWrap.className = 'gantt-status-checkbox';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.value = value;
        cb.checked = checked;
        cb.addEventListener('change', () => {
            if (value === '__all__') {
                ganttStatusFilter = cb.checked ? new Set(GANTT_STATUS_OPTIONS) : new Set();
            } else {
                if (cb.checked) {
                    ganttStatusFilter.add(value);
                } else {
                    ganttStatusFilter.delete(value);
                }
            }
            // keep "All" in sync
            const allBox = wrap.querySelector('input[value="__all__"]');
            if (allBox) {
                allBox.checked = ganttStatusFilter.size === GANTT_STATUS_OPTIONS.length;
            }
            renderGanttTable();
            renderGanttChart();
        });
        const span = document.createElement('span');
        span.textContent = text;
        boxWrap.appendChild(cb);
        boxWrap.appendChild(span);
        return boxWrap;
    };

    const allChecked = ganttStatusFilter.size === GANTT_STATUS_OPTIONS.length;
    wrap.appendChild(makeCheckbox('gantt-status-all', 'All', '__all__', allChecked));
    GANTT_STATUS_OPTIONS.forEach(status => {
        wrap.appendChild(makeCheckbox(`gantt-status-${status}`, status, status, ganttStatusFilter.has(status)));
    });
}

function applyGanttSplitWidth() {
    const split = document.getElementById('ganttSplitPane');
    const table = document.getElementById('ganttPlanningTableContainer');
    const chart = document.getElementById('ganttChartWrapper');
    if (!split) return;
    const clamped = Math.min(85, Math.max(5, ganttTableWidthPct));
    ganttTableWidthPct = clamped;
    const chartPct = 100 - clamped;
    // Primary layout: CSS grid columns
    split.style.gridTemplateColumns = `${clamped}% 8px ${chartPct}%`;
    // Fallback for older layouts (flex)
    if (table) {
        table.style.flexBasis = `${clamped}%`;
    }
    if (chart) {
        chart.style.flexBasis = `${chartPct}%`;
    }
}

function setupGanttResizer() {
    const resizer = document.getElementById('ganttSplitResizer');
    const split = document.getElementById('ganttSplitPane');
    if (!resizer || !split) return;
    if (resizer.dataset.bound) {
        applyGanttSplitWidth();
        return;
    }
    resizer.dataset.bound = 'true';
    let isDragging = false;
    let startX = 0;
    let startPct = ganttTableWidthPct;

    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('mouseleave', stopDrag);
        try {
            localStorage.setItem(GANTT_TABLE_WIDTH_KEY, String(ganttTableWidthPct));
        } catch (err) {
            console.warn('[GANTT] Failed to persist split width', err);
        }
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        const rect = split.getBoundingClientRect();
        const delta = e.clientX - startX;
        const startPx = (startPct / 100) * rect.width;
        const newPx = startPx + delta;
        if (rect.width <= 0) return;
        ganttTableWidthPct = (newPx / rect.width) * 100;
        applyGanttSplitWidth();
    };

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startPct = ganttTableWidthPct;
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mouseleave', stopDrag);
    });

    window.addEventListener('resize', applyGanttSplitWidth);
}

function getRendererButtonLabel() {
    const current = FeatureFlags.getRenderer();
    return current === 'mermaid' ? 'Switch to Frappe' : 'Switch to Mermaid';
}

function setupGanttRendererToggle() {
    const btn = document.getElementById('ganttRendererToggle');
    if (!btn || typeof FeatureFlags === 'undefined') return;

    const updateLabel = () => {
        btn.textContent = getRendererButtonLabel();
    };

    if (btn.dataset.bound === 'true') {
        updateLabel();
        return;
    }

    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
        const current = FeatureFlags.getRenderer();
        const next = current === 'mermaid' ? 'frappe' : 'mermaid';
        FeatureFlags.setRenderer(next);
        updateLabel();

        // Update legend visibility
        const legend = document.getElementById('ganttLegendContainer');
        if (legend) {
            legend.style.display = next === 'frappe' ? 'flex' : 'none';
        }

        ganttChartInstance = null; // Force re-create with new renderer
        renderGanttChart();
    });

    updateLabel();
}

function getTeamsByManager(managerId) {
    const teams = new Set();
    (SystemService.getCurrentSystem().teams || []).forEach(team => {
        if (team.sdmId === managerId) teams.add(team.teamId);
    });
    return teams;
}

function getTeamsForInitiative(init) {
    const teamNames = [];
    (init.assignments || []).forEach(a => {
        const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === a.teamId);
        if (team) {
            teamNames.push(team.teamIdentity || team.teamName || a.teamId);
        }
    });
    return teamNames.length ? teamNames : ['(None)'];
}

function getComputedInitiativeDates(init, selectedTeam = null) {
    // Prefer work package spans
    const workPackages = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === init.initiativeId);
    const year = init.attributes?.planningYear || currentGanttYear || new Date().getFullYear();
    const defaultStart = `${year}-01-15`;
    const defaultEnd = `${year}-11-01`;
    let earliest = null;
    let latest = null;
    workPackages.forEach(wp => {
        let hasMatchingAssignment = false;
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            hasMatchingAssignment = true;
            if (assign.startDate) {
                if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
            }
            if (assign.endDate) {
                if (!latest || assign.endDate > latest) latest = assign.endDate;
            }
        });
        if (!hasMatchingAssignment) {
            if (wp.startDate && (!earliest || wp.startDate < earliest)) earliest = wp.startDate;
            if (wp.endDate && (!latest || wp.endDate > latest)) latest = wp.endDate;
        }
    });
    return {
        startDate: earliest || init.attributes?.startDate || defaultStart,
        endDate: latest || init.targetDueDate || defaultEnd
    };
}

function setWorkPackageDatesForTeam(initiativeId, { startDate, endDate }, selectedTeam = null) {
    if (!initiativeId) return;
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem());
    const wps = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
    wps.forEach(wp => {
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            if (startDate) assign.startDate = startDate;
            if (endDate) assign.endDate = endDate;
        });

        // Recalculate WP dates from assignments (Bottom-up)
        // Recalculate WP dates from assignments (Bottom-up)
        WorkPackageService.recalculateWorkPackageDates(wp);
        // Fallback logic removed as service handles it or valid assumption
        if (startDate) wp.startDate = startDate;
        if (endDate) wp.endDate = endDate;
    });
    WorkPackageService.syncInitiativeTotals(initiativeId, SystemService.getCurrentSystem());
}

function updateWorkPackageSde(initiativeId, teamId, sdeYears, workingDaysPerYear) {
    if (!initiativeId) return;
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem());
    const wps = (SystemService.getCurrentSystem().workPackages || []).filter(wp => wp.initiativeId === initiativeId);
    const sdeDays = (sdeYears || 0) * (workingDaysPerYear || 261);
    wps.forEach(wp => {
        let updated = false;
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (!teamId || teamId === 'all' || assign.teamId === teamId) {
                assign.sdeDays = sdeDays;
                updated = true;
            }
        });
        if (!updated && teamId) {
            wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];
            wp.impactedTeamAssignments.push({
                teamId,
                sdeDays,
                startDate: wp.startDate,
                endDate: wp.endDate
            });
        }

        // Recalculate WP dates (in case new assignment added affects range)
        WorkPackageService.recalculateWorkPackageDates(wp);
    });

    WorkPackageService.syncInitiativeTotals(initiativeId, SystemService.getCurrentSystem());
}

function syncInitiativeDependenciesFromWorkPackages(initiativeId) {
    if (!initiativeId) return;
    const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
    if (!initiative) return;
    const deps = new Set();
    const wps = (SystemService.getCurrentSystem().workPackages || []).filter(w => w.initiativeId === initiativeId);
    wps.forEach(wp => {
        (wp.dependencies || []).forEach(depWpId => {
            const targetWp = (SystemService.getCurrentSystem().workPackages || []).find(other => other.workPackageId === depWpId);
            if (targetWp && targetWp.initiativeId && targetWp.initiativeId !== initiativeId) {
                deps.add(targetWp.initiativeId);
            }
        });
    });
    initiative.dependencies = Array.from(deps);
}

// wouldCreateDependencyCycle and wouldCreateAssignmentCycle are now provided via GanttService aliases at top of file

async function renderGanttChart() {
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;
    WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), currentGanttYear);
    const focus = getGanttFocusContext();
    const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
    const initiatives = getGanttFilteredInitiatives();
    if (!initiatives || initiatives.length === 0) {
        container.textContent = 'No initiatives to display.';
        return;
    }
    const tasks = (ganttAdapter)
        ? ganttAdapter.buildTasksFromInitiatives({
            initiatives,
            workPackages: SystemService.getCurrentSystem().workPackages || [],
            viewBy: currentGanttGroupBy,
            filters: { status: ganttStatusFilter },
            year: currentGanttYear,
            selectedTeam: selectedTeam,
            expandedInitiativeIds: ganttExpandedInitiatives,
            expandedWorkPackageIds: ganttExpandedWorkPackages
        })
        : [];

    // Use Factory to get the correct renderer
    if (!ganttChartInstance) {
        ganttChartInstance = GanttFactory.createRenderer(container);
    } else {
        // If renderer type changed, recreate instance
        const currentType = FeatureFlags.getRenderer();
        const isMermaid = ganttChartInstance instanceof MermaidGanttRenderer;
        const isFrappe = ganttChartInstance instanceof FrappeGanttRenderer;

        if ((currentType === 'mermaid' && !isMermaid) || (currentType === 'frappe' && !isFrappe)) {
            ganttChartInstance = GanttFactory.createRenderer(container);
        }
    }

    // Remove dynamic height forcing to allow the container to be a resizeable scrollable window
    // The CSS sets a default height and allows resizing.
    // const dynamicHeight = Math.max(600, tasks.length * 65);
    // container.style.minHeight = `${dynamicHeight}px`;
    container.style.minHeight = '600px'; // Set a reasonable minimum base

    // Update container reference in case it changed (though id is same)
    ganttChartInstance.container = container;

    await ganttChartInstance.render(tasks, {
        title: `Detailed Plan - ${currentGanttYear}`,
        year: currentGanttYear, // Pass year explicitly
        metaInitiativeCount: initiatives.length,
        focus,
        onUpdate: (update) => {
            handleGanttUpdate(update);
        },
        onItemDoubleClick: (task) => {
            handleGanttToggleFromChart(task);
        }
    });

    scrollToGanttFocusTask();
}

function handleGanttToggleFromChart(task) {
    if (!task || !task.type) return;
    if (task.type === 'initiative') {
        const id = task.initiativeId;
        if (!id) return;
        // Show only this initiative, collapse others and all WPs
        if (ganttExpandedInitiatives.has(id)) {
            ganttExpandedInitiatives.clear();
        } else {
            ganttExpandedInitiatives.clear();
            if (hasWorkPackagesForInitiative(id)) {
                ganttExpandedInitiatives.add(id);
            }
        }
        ganttExpandedWorkPackages.clear();
    } else if (task.type === 'workPackage') {
        const wpId = task.workPackageId;
        if (!wpId) return;
        // Ensure only this initiative and this WP are expanded
        if (task.initiativeId) {
            ganttExpandedInitiatives.clear();
            ganttExpandedInitiatives.add(task.initiativeId);
        }
        if (ganttExpandedWorkPackages.has(wpId)) {
            ganttExpandedWorkPackages.clear();
        } else {
            ganttExpandedWorkPackages.clear();
            ganttExpandedWorkPackages.add(wpId);
        }
    } else if (task.type === 'assignment') {
        // Toggle parent WP if present
        const wpId = task.workPackageId;
        if (wpId) {
            if (task.initiativeId) {
                ganttExpandedInitiatives.clear();
                ganttExpandedInitiatives.add(task.initiativeId);
            }
            ganttExpandedWorkPackages.clear();
            ganttExpandedWorkPackages.add(wpId);
        }
    }

    setLastGanttFocus({
        taskId: task.id || null,
        taskType: task.type || null,
        initiativeId: task.initiativeId || null
    });

    // Re-render table and chart to reflect toggles
    renderGanttTable();
    renderGanttChart();
}

function scrollToGanttFocusTask() {
    if (!lastGanttFocusTaskId) return;
    const focusId = normalizeGanttId(lastGanttFocusTaskId);
    if (!focusId) return;
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;
    const target = Array.from(container.querySelectorAll('.bar-wrapper'))
        .find(el => normalizeGanttId(el.getAttribute('data-id')) === focusId);
    if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
}

function scrollToGanttTableFocus() {
    if (!lastGanttFocusTaskId) return;
    const focusId = normalizeGanttId(lastGanttFocusTaskId);
    if (!focusId) return;
    const wrapper = document.querySelector('#ganttPlanningTableContainer .gantt-table-wrapper');
    if (!wrapper) return;

    let selector = '';
    if (lastGanttFocusTaskType === 'initiative') {
        const candidates = wrapper.querySelectorAll('.gantt-expander[data-action="toggle-initiative"]');
        const match = Array.from(candidates).find(el => normalizeGanttId(el.dataset.id) === focusId);
        if (match) selector = `[data-action="toggle-initiative"][data-id="${match.dataset.id}"]`;
    } else if (lastGanttFocusTaskType === 'workPackage') {
        const candidates = wrapper.querySelectorAll('.gantt-expander[data-action="toggle-wp"]');
        const match = Array.from(candidates).find(el => normalizeGanttId(el.dataset.wpId) === focusId);
        if (match) selector = `[data-action="toggle-wp"][data-wp-id="${match.dataset.wpId}"]`;
    } else if (lastGanttFocusTaskType === 'assignment' && lastGanttFocusInitiativeId) {
        const initiativeCandidates = wrapper.querySelectorAll('.gantt-expander[data-action="toggle-initiative"]');
        const targetInit = normalizeGanttId(lastGanttFocusInitiativeId);
        const match = Array.from(initiativeCandidates).find(el => normalizeGanttId(el.dataset.id) === targetInit);
        if (match) selector = `[data-action="toggle-initiative"][data-id="${match.dataset.id}"]`;
    }

    if (!selector) return;
    const el = wrapper.querySelector(selector);
    if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
}

function handleGanttUpdate({ task, start, end }) {
    console.log('[GANTT] Update received:', task, start, end);

    if (task) {
        setLastGanttFocus({
            taskId: task.id || task.workPackageId || task.initiativeId || null,
            taskType: task.type || null,
            initiativeId: task.initiativeId || null
        });
    }

    if (task.type === 'initiative') {
        const initId = task.initiativeId;
        const init = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initId);
        if (!init) return;

        // Check if has WPs - if so, warn and revert (re-render)
        if (hasWorkPackagesForInitiative(initId)) {
            console.warn('Initiative dates locked: work packages exist.');
            renderGanttChart(); // Revert UI
            return;
        }

        init.attributes = init.attributes || {};
        init.attributes.startDate = start;
        init.targetDueDate = end;

        // Update WPs if any (though we blocked it above, good for completeness)
        setWorkPackageDatesForTeam(initId, { startDate: start, endDate: end });

    } else if (task.type === 'workPackage') {
        const wpId = task.workPackageId;
        const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
        if (!wp) return;

        const assignments = wp.impactedTeamAssignments || [];
        if (assignments.length > 1) {
            console.warn('Work package dates locked: multiple tasks present.');
            renderGanttChart();
            return;
        }

        wp.startDate = start;
        wp.endDate = end;

        // If only one assignment, align it to the WP change
        (assignments || []).forEach(assign => {
            assign.startDate = start;
            assign.endDate = end;
        });

    } else if (task.type === 'assignment') {
        const wpId = task.workPackageId;
        const teamId = task.teamId;
        const wp = (SystemService.getCurrentSystem().workPackages || []).find(w => w.workPackageId === wpId);
        if (!wp) return;

        const assign = (wp.impactedTeamAssignments || []).find(a => a.teamId === teamId);
        if (!assign) return;

        assign.startDate = start;
        assign.endDate = end;

        // Recalculate WP dates
        // Recalculate WP dates
        WorkPackageService.recalculateWorkPackageDates(wp);
        // Keep initiative rollup in sync
        if (task.initiativeId) {
            WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
        }
    }

    // Sync totals and save
    if (task.initiativeId) {
        WorkPackageService.syncInitiativeTotals(task.initiativeId, SystemService.getCurrentSystem());
    }
    if (typeof SystemService !== "undefined" && SystemService.save) {
        SystemService.save();
    }

    // Refresh table and chart to show new dates/rollups
    renderGanttTable();
    renderGanttChart();
}


function renderDynamicGroupFilter() {
    const wrap = document.getElementById('ganttDynamicFilter');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (currentGanttGroupBy === 'Team') {
        const select = document.createElement('select');
        select.id = 'ganttGroupValue';
        const defaultOption = document.createElement('option');
        defaultOption.value = 'all';
        defaultOption.textContent = 'All Teams';
        select.appendChild(defaultOption);
        (SystemService.getCurrentSystem().teams || [])
            .slice()
            .sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
            .forEach(team => {
                const opt = document.createElement('option');
                opt.value = team.teamId;
                opt.textContent = team.teamIdentity || team.teamName;
                select.appendChild(opt);
            });
        select.onchange = () => {
            renderGanttTable();
            renderGanttChart();
        };
        wrap.appendChild(createLabeledControl('Team:', select));
    } else {
        // No extra filter for All Initiatives or other modes
        const placeholder = document.createElement('div');
        placeholder.textContent = '';
        wrap.appendChild(placeholder);
    }
    // Ensure table/chart refresh after rebuild
    renderGanttTable();
    renderGanttChart();
}
