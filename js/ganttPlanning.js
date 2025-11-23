let currentGanttYear = new Date().getFullYear();
let currentGanttGroupBy = 'All Initiatives';
let ganttTableWidthPct = 36;
const ganttExpandedInitiatives = new Set();
const ganttExpandedWorkPackages = new Set();
let ganttWorkPackagesInitialized = false;
const ganttOtherTeamsExpanded = new Set();
const GANTT_STATUS_OPTIONS = ['Backlog','Defined','Committed','In Progress','Done','Blocked'];
let ganttStatusFilter = new Set(GANTT_STATUS_OPTIONS);

function initializeGanttPlanningView() {
    const container = document.getElementById('ganttPlanningView');
    if (!container) return;
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentGanttYear);
    }
    ganttChartInstance = null;
    container.innerHTML = `
        <div id="ganttPlanningControls" class="gantt-filter-bar"></div>
        <div id="ganttSplitPane" class="gantt-split">
            <div id="ganttPlanningTableContainer" class="gantt-panel"></div>
            <div id="ganttSplitResizer" class="gantt-resizer" title="Drag to resize panels"></div>
            <div id="ganttChartWrapper" class="gantt-panel">
                <div id="ganttChartContainer" class="mermaid gantt-chart-box"></div>
            </div>
        </div>
    `;
    setupGanttResizer();
    applyGanttSplitWidth();
    renderGanttControls();
    renderGanttTable();
    renderGanttChart();
}

function renderGanttControls() {
    const controls = document.getElementById('ganttPlanningControls');
    if (!controls) return;
    controls.innerHTML = '';

    const filtersWrapper = document.createElement('div');
    filtersWrapper.className = 'widget-filter-bar gantt-filter-row';

    // Year selector
    const yearSelect = document.createElement('select');
    yearSelect.id = 'ganttYearFilter';
    const years = Array.from(new Set(
        (currentSystemData?.yearlyInitiatives || [])
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

    // View By selector
    const groupSelect = document.createElement('select');
    groupSelect.id = 'ganttGroupBy';
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

    filtersWrapper.appendChild(createLabeledControl('Year:', yearSelect));
    filtersWrapper.appendChild(createLabeledControl('View By:', groupSelect));
    const dynamicFilterWrap = document.createElement('div');
    dynamicFilterWrap.id = 'ganttDynamicFilter';
    dynamicFilterWrap.className = 'filter-item';
    filtersWrapper.appendChild(dynamicFilterWrap);
    const statusFilterWrap = document.createElement('div');
    statusFilterWrap.id = 'ganttStatusFilter';
    statusFilterWrap.className = 'filter-item';
    filtersWrapper.appendChild(statusFilterWrap);
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.className = 'btn-primary';
    refreshBtn.onclick = () => {
        renderGanttTable();
        renderGanttChart();
    };
    filtersWrapper.appendChild(refreshBtn);
    controls.appendChild(filtersWrapper);

    // Build filters
    renderDynamicGroupFilter();
    renderStatusFilter();
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
    let initiatives = currentSystemData?.yearlyInitiatives ? [...currentSystemData.yearlyInitiatives] : [];
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
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentGanttYear);
    }
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
    container.innerHTML = `
        <div class="gantt-table-wrapper">
        <table class="gantt-table gantt-hierarchy">
            <thead>
                <tr>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Initiative / Work Package</th>
                    ${showManagerTeams ? '<th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Teams</th>' : ''}
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Start</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Target</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">SDEs</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Predecessors</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Actions</th>
                </tr>
            </thead>
            <tbody id="ganttTableBody"></tbody>
        </table>
        </div>
    `;
    const tbody = document.getElementById('ganttTableBody');
    if (data.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="${showManagerTeams ? '7' : '6'}" style="padding:10px; text-align:center; color:#777;">No initiatives match the filters.</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    const workingDaysPerYear = currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261;
    const allInitiatives = currentSystemData?.yearlyInitiatives || [];
    const allWorkPackages = currentSystemData.workPackages || [];
    // Seed default expansion only once for existing work packages
    if (!ganttWorkPackagesInitialized) {
        (currentSystemData.workPackages || []).forEach(wp => {
            ganttExpandedWorkPackages.add(wp.workPackageId);
        });
        ganttWorkPackagesInitialized = true;
    }

    data.forEach(init => {
        const isExpanded = ganttExpandedInitiatives.has(init.initiativeId);
        const tr = document.createElement('tr');
        tr.className = 'gantt-init-row';
        tr.innerHTML = `
            <td style="padding:6px; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:8px;">
                <button class="gantt-expander" data-action="toggle-initiative" data-id="${init.initiativeId}" aria-label="Toggle work packages">${isExpanded ? '-' : '+'}</button>
                <div>
                    <div style="font-weight:600;">${init.title || '(Untitled)'}</div>
                    <div style="font-family: monospace; color:#666; font-size:12px;">${init.initiativeId || ''}</div>
                </div>
            </td>
            ${showManagerTeams ? `<td style="padding:6px; border-bottom:1px solid #f0f0f0;">${getTeamsForInitiative(init).join(', ')}</td>` : ''}
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="date" value="${init.displayStart || ''}" data-kind="initiative" data-field="startDate" data-id="${init.initiativeId}"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="date" value="${init.displayEnd || ''}" data-kind="initiative" data-field="targetDueDate" data-id="${init.initiativeId}"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="number" step="0.01" value="${computeSdeEstimate(init)}" data-kind="initiative" data-field="sdeEstimate" data-id="${init.initiativeId}" style="width:80px;"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">${renderInitiativePredecessorSelector(allInitiatives, init)}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
                <button class="gantt-add-wp btn-primary" data-action="add-wp" data-id="${init.initiativeId}">Add WP</button>
            </td>
        `;
        tbody.appendChild(tr);

        if (isExpanded) {
            const wpList = getWorkPackagesForInitiative(init.initiativeId);
            if (!wpList.length) {
                const emptyWp = document.createElement('tr');
                emptyWp.className = 'gantt-wp-row';
                emptyWp.innerHTML = `<td colspan="${showManagerTeams ? '7' : '6'}" style="padding:6px 12px; color:#777;">No work packages yet. Click "Add WP" to create one.</td>`;
                tbody.appendChild(emptyWp);
            } else {
                wpList.forEach(wp => {
                    const wpExpanded = ganttExpandedWorkPackages.has(wp.workPackageId);
                    const wpRow = document.createElement('tr');
                    wpRow.className = 'gantt-wp-row';
                    const depsValue = (wp.dependencies || []).join(', ');
                    wpRow.innerHTML = `
                        <td style="padding:6px 6px 6px 32px; border-bottom:1px solid #f7f7f7;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <button class="gantt-expander" data-action="toggle-wp" data-wp-id="${wp.workPackageId}" aria-label="Toggle team assignments">${wpExpanded ? '-' : '+'}</button>
                                <input type="text" value="${wp.title || ''}" data-kind="work-package" data-field="title" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" style="width:70%;">
                            </div>
                        </td>
                        ${showManagerTeams ? `<td style="padding:6px; border-bottom:1px solid #f7f7f7; color:#555;">${formatWorkPackageTeams(wp, selectedTeam)}</td>` : ''}
                        <td style="padding:6px; border-bottom:1px solid #f7f7f7;"><input type="date" value="${wp.startDate || ''}" data-kind="work-package" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}"></td>
                        <td style="padding:6px; border-bottom:1px solid #f7f7f7;"><input type="date" value="${wp.endDate || ''}" data-kind="work-package" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}"></td>
                        <td style="padding:6px; border-bottom:1px solid #f7f7f7; color:#333;">${computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam)}</td>
                        <td style="padding:6px; border-bottom:1px solid #f7f7f7;">
                            ${renderPredecessorSelector(allWorkPackages, wp)}
                        </td>
                        <td style="padding:6px; border-bottom:1px solid #f7f7f7;">
                            <button data-action="delete-wp" data-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" class="btn-danger">Delete</button>
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
                            assignRow.className = 'gantt-wp-assign-row';
                            const sdeYears = ((assign.sdeDays || 0) / workingDaysPerYear).toFixed(2);
                            if (showManagerTeams) {
                                assignRow.innerHTML = `
                                    <td style="padding:4px 6px 4px 48px; border-bottom:1px solid #fafafa; color:#555; font-size:13px;">Team: ${getTeamName(assign.teamId) || '(Unassigned)'}</td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="date" value="${assign.startDate || wp.startDate || ''}" data-kind="wp-assign" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="date" value="${assign.endDate || wp.endDate || ''}" data-kind="wp-assign" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="number" step="0.01" value="${sdeYears}" data-kind="wp-assign" data-field="sdeYears" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}" style="width:80px;">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                `;
                            } else {
                                assignRow.innerHTML = `
                                    <td style="padding:4px 6px 4px 48px; border-bottom:1px solid #fafafa; color:#555; font-size:13px;">Team: ${getTeamName(assign.teamId) || '(Unassigned)'}</td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="date" value="${assign.startDate || wp.startDate || ''}" data-kind="wp-assign" data-field="startDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="date" value="${assign.endDate || wp.endDate || ''}" data-kind="wp-assign" data-field="endDate" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <input type="number" step="0.01" value="${sdeYears}" data-kind="wp-assign" data-field="sdeYears" data-wp-id="${wp.workPackageId}" data-initiative-id="${wp.initiativeId}" data-team-id="${assign.teamId || ''}" style="width:80px;">
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                `;
                            }
                            tbody.appendChild(assignRow);
                        });

                        if (teamFilterActive && otherAssignments.length) {
                            const toggleRow = document.createElement('tr');
                            if (showManagerTeams) {
                                toggleRow.innerHTML = `
                                    <td style="padding:4px 6px 4px 48px; border-bottom:1px solid #fafafa; color:#777; font-size:12px;">Other teams (${otherAssignments.length})</td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                    <td colspan="4" style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <button data-action="toggle-other-teams" data-wp-id="${wp.workPackageId}" style="padding:2px 6px;">${showOtherTeams ? 'Hide' : 'Show'} other teams</button>
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                `;
                            } else {
                                toggleRow.innerHTML = `
                                    <td style="padding:4px 6px 4px 48px; border-bottom:1px solid #fafafa; color:#777; font-size:12px;">Other teams (${otherAssignments.length})</td>
                                    <td colspan="4" style="padding:4px; border-bottom:1px solid #fafafa;">
                                        <button data-action="toggle-other-teams" data-wp-id="${wp.workPackageId}" style="padding:2px 6px;">${showOtherTeams ? 'Hide' : 'Show'} other teams</button>
                                    </td>
                                    <td style="padding:4px; border-bottom:1px solid #fafafa;"></td>
                                `;
                            }
                            tbody.appendChild(toggleRow);
                        }
                    }
                });
            }
        }
    });

    tbody.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        if (action === 'toggle-initiative') {
            const id = target.dataset.id;
            if (ganttExpandedInitiatives.has(id)) {
                ganttExpandedInitiatives.delete(id);
            } else {
                ganttExpandedInitiatives.add(id);
            }
            renderGanttTable();
        } else if (action === 'add-wp') {
            const id = target.dataset.id;
            const init = initiativeMap.get(id);
            const defaults = { startDate: init?.displayStart, endDate: init?.displayEnd };
            const wp = typeof addWorkPackage === 'function' ? addWorkPackage(id, defaults) : null;
            if (wp) {
                ganttExpandedInitiatives.add(id);
                ganttExpandedWorkPackages.add(wp.workPackageId);
                if (typeof syncInitiativeTotals === 'function') {
                    syncInitiativeTotals(id, currentSystemData);
                }
                if (typeof saveSystemChanges === 'function') {
                    saveSystemChanges();
                }
                renderGanttTable();
                renderGanttChart();
            }
        } else if (action === 'delete-wp') {
            const wpId = target.dataset.id;
            const initId = target.dataset.initiativeId;
            if (!window.confirm('Delete this work package?')) {
                return;
            }
            const deleted = typeof deleteWorkPackage === 'function' ? deleteWorkPackage(wpId) : false;
            ganttExpandedWorkPackages.delete(wpId);
            if (deleted && typeof syncInitiativeTotals === 'function') {
                syncInitiativeTotals(initId, currentSystemData);
            }
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
            renderGanttTable();
            renderGanttChart();
        } else if (action === 'toggle-wp') {
            const wpId = target.dataset.wpId;
            if (ganttExpandedWorkPackages.has(wpId)) {
                ganttExpandedWorkPackages.delete(wpId);
            } else {
                ganttExpandedWorkPackages.add(wpId);
            }
            renderGanttTable();
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
        const field = e.target.dataset.field;
        const kind = e.target.dataset.kind;
        if (kind === 'initiative') {
            const id = e.target.dataset.id;
            const init = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === id);
            if (!init) return;
            const value = e.target.value;
            const selectedTeamLocal = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
            const workingDaysPerYearLocal = currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261;
            if (field === 'startDate') {
                init.attributes = init.attributes || {};
                init.attributes.startDate = value;
                setWorkPackageDatesForTeam(init.initiativeId, { startDate: value }, selectedTeamLocal);
            } else if (field === 'targetDueDate') {
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
            if (typeof ensureWorkPackagesForInitiatives === 'function') {
                ensureWorkPackagesForInitiatives(currentSystemData);
                if (typeof syncInitiativeTotals === 'function') {
                    syncInitiativeTotals(init.initiativeId, currentSystemData);
                }
            }
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
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
            const wp = typeof updateWorkPackage === 'function'
                ? updateWorkPackage(wpId, updates)
                : (currentSystemData.workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            if (updates.startDate) {
                (wp.impactedTeamAssignments || []).forEach(assign => assign.startDate = updates.startDate || assign.startDate);
            }
            if (updates.endDate) {
                (wp.impactedTeamAssignments || []).forEach(assign => assign.endDate = updates.endDate || assign.endDate);
            }
            if (typeof syncInitiativeTotals === 'function') {
                syncInitiativeTotals(initId, currentSystemData);
            }
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'wp-assign') {
            const wpId = e.target.dataset.wpId;
            const initId = e.target.dataset.initiativeId;
            const teamId = e.target.dataset.teamId || null;
            const field = e.target.dataset.field;
            const wp = (currentSystemData.workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            const assign = (wp.impactedTeamAssignments || []).find(a => `${a.teamId || ''}` === `${teamId || ''}`);
            if (!assign) return;
            if (field === 'startDate') {
                assign.startDate = e.target.value;
                if (!wp.startDate || e.target.value < wp.startDate) {
                    wp.startDate = e.target.value;
                } else {
                    // Shrink if this was the earliest date and no other assignment starts earlier
                    const earliest = getEarliestAssignmentStart(wp);
                    wp.startDate = earliest || wp.startDate;
                }
            } else if (field === 'endDate') {
                assign.endDate = e.target.value;
                if (!wp.endDate || e.target.value > wp.endDate) {
                    wp.endDate = e.target.value;
                } else {
                    // Shrink if this was the latest date and no other assignment ends later
                    const latest = getLatestAssignmentEnd(wp);
                    wp.endDate = latest || wp.endDate;
                }
            } else if (field === 'sdeYears') {
                const sdeYears = parseFloat(e.target.value) || 0;
                assign.sdeDays = sdeYears * getWorkingDaysPerYear();
            }
            if (typeof syncInitiativeTotals === 'function') {
                syncInitiativeTotals(initId, currentSystemData);
            }
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'wp-dep') {
            const wpId = e.target.dataset.wpId;
            const depId = e.target.dataset.value;
            const wp = (currentSystemData.workPackages || []).find(w => w.workPackageId === wpId);
            if (!wp) return;
            const deps = new Set(wp.dependencies || []);
            if (e.target.checked) {
                const allWps = currentSystemData.workPackages || [];
                if (wouldCreateDependencyCycle(wpId, depId, allWps)) {
                    e.target.checked = false;
                    console.warn(`[GANTT] Prevented circular dependency: ${wpId} -> ${depId}`);
                    alert('Circular dependency not allowed (would create a cycle).');
                    return;
                }
                deps.add(depId);
            } else {
                deps.delete(depId);
            }
            if (typeof updateWorkPackage === 'function') {
                updateWorkPackage(wpId, { dependencies: Array.from(deps) });
            } else {
                wp.dependencies = Array.from(deps);
            }
            syncInitiativeDependenciesFromWorkPackages(wp.initiativeId);
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
            renderGanttTable();
            renderGanttChart();
        } else if (kind === 'init-dep') {
            const initId = e.target.dataset.initId;
            const depId = e.target.dataset.value;
            const initiative = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === initId);
            if (!initiative) return;
            const deps = new Set(initiative.dependencies || []);
            if (e.target.checked) {
                deps.add(depId);
            } else {
                deps.delete(depId);
            }
            initiative.dependencies = Array.from(deps);
            if (typeof saveSystemChanges === 'function') {
                saveSystemChanges();
            }
            renderGanttTable();
            renderGanttChart();
        }
    });
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
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentGanttYear);
    }
    return (currentSystemData.workPackages || []).filter(wp => wp.initiativeId === initiativeId);
}

function computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam = null) {
    const wpy = workingDaysPerYear || currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261;
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
        const team = (currentSystemData.teams || []).find(t => t.teamId === assign.teamId);
        if (team) teams.add(team.teamIdentity || team.teamName || assign.teamId);
    });
    if (teams.size === 0 && selectedTeam && selectedTeam !== 'all') {
        return '(Selected team not assigned)';
    }
    return teams.size ? Array.from(teams).join(', ') : '(Unassigned)';
}

function getWorkingDaysPerYear() {
    return currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261;
}

function getTeamName(teamId) {
    const team = (currentSystemData.teams || []).find(t => t.teamId === teamId);
    return team ? (team.teamIdentity || team.teamName || teamId) : teamId;
}

function getEarliestAssignmentStart(wp) {
    let earliest = wp.startDate || null;
    (wp.impactedTeamAssignments || []).forEach(assign => {
        if (assign.startDate && (!earliest || assign.startDate < earliest)) {
            earliest = assign.startDate;
        }
    });
    return earliest;
}

function getLatestAssignmentEnd(wp) {
    let latest = wp.endDate || null;
    (wp.impactedTeamAssignments || []).forEach(assign => {
        if (assign.endDate && (!latest || assign.endDate > latest)) {
            latest = assign.endDate;
        }
    });
    return latest;
}

function renderPredecessorSelector(allWorkPackages, wp) {
    const options = (allWorkPackages || []).filter(other => other.workPackageId !== wp.workPackageId);
    const selected = new Set(wp.dependencies || []);
    const label = selected.size ? `${selected.size} selected` : 'Select...';
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

function renderInitiativePredecessorSelector(allInitiatives, init) {
    const options = (allInitiatives || []).filter(other => other.initiativeId !== init.initiativeId);
    const selected = new Set(init.dependencies || []);
    const label = selected.size ? `${selected.size} selected` : 'Select...';
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
    if (!split) return;
    const clamped = Math.min(80, Math.max(20, ganttTableWidthPct));
    ganttTableWidthPct = clamped;
    split.style.gridTemplateColumns = `${clamped}% 10px ${100 - clamped}%`;
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

function getTeamsByManager(managerId) {
    const teams = new Set();
    (currentSystemData.teams || []).forEach(team => {
        if (team.sdmId === managerId) teams.add(team.teamId);
    });
    return teams;
}

function getTeamsForInitiative(init) {
    const teamNames = [];
    (init.assignments || []).forEach(a => {
        const team = (currentSystemData.teams || []).find(t => t.teamId === a.teamId);
        if (team) {
            teamNames.push(team.teamIdentity || team.teamName || a.teamId);
        }
    });
    return teamNames.length ? teamNames : ['(None)'];
}

function getComputedInitiativeDates(init, selectedTeam = null) {
    // Prefer work package spans
    const workPackages = (currentSystemData.workPackages || []).filter(wp => wp.initiativeId === init.initiativeId);
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
    ensureWorkPackagesForInitiatives(currentSystemData);
    const wps = (currentSystemData.workPackages || []).filter(wp => wp.initiativeId === initiativeId);
    wps.forEach(wp => {
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            if (startDate) assign.startDate = startDate;
            if (endDate) assign.endDate = endDate;
        });
        // also keep wp-level dates in sync if present
        if (startDate) wp.startDate = startDate;
        if (endDate) wp.endDate = endDate;
    });
    if (typeof syncInitiativeTotals === 'function') {
        syncInitiativeTotals(initiativeId, currentSystemData);
    }
}

function updateWorkPackageSde(initiativeId, teamId, sdeYears, workingDaysPerYear) {
    if (!initiativeId) return;
    ensureWorkPackagesForInitiatives(currentSystemData);
    const wps = (currentSystemData.workPackages || []).filter(wp => wp.initiativeId === initiativeId);
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
    });
}

function syncInitiativeDependenciesFromWorkPackages(initiativeId) {
    if (!initiativeId) return;
    const initiative = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
    if (!initiative) return;
    const deps = new Set(initiative.dependencies || []);
    const wps = (currentSystemData.workPackages || []).filter(w => w.initiativeId === initiativeId);
    wps.forEach(wp => {
        (wp.dependencies || []).forEach(depWpId => {
            const targetWp = (currentSystemData.workPackages || []).find(other => other.workPackageId === depWpId);
            if (targetWp && targetWp.initiativeId && targetWp.initiativeId !== initiativeId) {
                deps.add(targetWp.initiativeId);
            }
        });
    });
    initiative.dependencies = Array.from(deps);
}

function wouldCreateDependencyCycle(fromWpId, toWpId, workPackages) {
    if (!fromWpId || !toWpId) return false;
    const graph = new Map();
    (workPackages || []).forEach(wp => {
        graph.set(wp.workPackageId, new Set(wp.dependencies || []));
    });
    if (!graph.has(fromWpId)) graph.set(fromWpId, new Set());
    graph.get(fromWpId).add(toWpId);

    const visited = new Set();
    const stack = [toWpId];
    while (stack.length) {
        const current = stack.pop();
        if (current === fromWpId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        const neighbors = graph.get(current);
        if (neighbors) {
            neighbors.forEach(n => stack.push(n));
        }
    }
    return false;
}

async function renderGanttChart() {
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentGanttYear);
    }
    const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
    const initiatives = getGanttFilteredInitiatives();
    if (!initiatives || initiatives.length === 0) {
        container.textContent = 'No initiatives to display.';
        return;
    }
    const tasks = (window.ganttAdapter && typeof window.ganttAdapter.buildTasksFromInitiatives === 'function')
        ? window.ganttAdapter.buildTasksFromInitiatives({
            initiatives,
            workPackages: currentSystemData.workPackages || [],
            viewBy: currentGanttGroupBy,
            filters: {},
            year: currentGanttYear,
            selectedTeam: selectedTeam
        })
        : [];
    if (!ganttChartInstance) {
        ganttChartInstance = new GanttChart({ container, mermaidInstance: mermaid, onRenderError: (err, syntax) => console.error('Gantt render error', err, syntax) });
    }
    const dynamicHeight = Math.max(500, tasks.length * 60);
    container.style.minHeight = `${dynamicHeight}px`;
    ganttChartInstance.setData(tasks, { title: `Detailed Plan - ${currentGanttYear}` });
    await ganttChartInstance.render();
}

if (typeof window !== 'undefined') {
    window.initializeGanttPlanningView = initializeGanttPlanningView;
}
function renderDynamicGroupFilter() {
    const wrap = document.getElementById('ganttDynamicFilter');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (currentGanttGroupBy === 'Team') {
        const select = document.createElement('select');
        select.id = 'ganttGroupValue';
        select.innerHTML = '<option value="all">All Teams</option>';
        (currentSystemData.teams || [])
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
