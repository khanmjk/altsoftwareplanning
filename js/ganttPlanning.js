let currentGanttYear = new Date().getFullYear();
let currentGanttGroupBy = 'All Initiatives';

function initializeGanttPlanningView() {
    const container = document.getElementById('ganttPlanningView');
    if (!container) return;
    container.innerHTML = `
        <div id="ganttPlanningControls" class="gantt-filter-bar"></div>
        <div id="ganttContextMeta" style="margin: 8px 0;"></div>
        <div id="ganttSplitPane" class="gantt-split">
            <div id="ganttPlanningTableContainer" class="gantt-panel"></div>
            <div id="ganttChartWrapper" class="gantt-panel">
                <div id="ganttChartContainer" class="mermaid gantt-chart-box"></div>
            </div>
        </div>
    `;
    renderGanttControls();
    renderGanttTable();
    renderGanttChart();
}

function renderGanttControls() {
    const controls = document.getElementById('ganttPlanningControls');
    if (!controls) return;
    controls.innerHTML = '';

    const filtersWrapper = document.createElement('div');
    filtersWrapper.className = 'filter-bar';
    filtersWrapper.style.display = 'flex';
    filtersWrapper.style.flexWrap = 'wrap';
    filtersWrapper.style.gap = '10px';

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
    ['All Initiatives', 'Theme', 'Team', 'Goal', 'Manager'].forEach(val => {
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

    // Org/Team filters reuse roadmap helpers
    const orgTeamFilters = document.createElement('div');
    orgTeamFilters.id = 'ganttOrgTeamFilters';
    orgTeamFilters.className = 'widget-filter-bar';
    orgTeamFilters.style.display = 'flex';
    orgTeamFilters.style.flexWrap = 'wrap';
    orgTeamFilters.style.gap = '10px';
    controls.appendChild(orgTeamFilters);

    filtersWrapper.appendChild(createLabeledControl('Year:', yearSelect));
    filtersWrapper.appendChild(createLabeledControl('View By:', groupSelect));
    const dynamicFilterWrap = document.createElement('div');
    dynamicFilterWrap.id = 'ganttDynamicFilter';
    dynamicFilterWrap.className = 'filter-item';
    filtersWrapper.appendChild(dynamicFilterWrap);
    controls.appendChild(filtersWrapper);

    // Build org/team filters using existing helper
    renderDynamicGroupFilter();
    renderContextMeta();
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
    } else if (currentGanttGroupBy === 'Manager') {
        const selectedSm = document.getElementById('ganttSeniorManagerFilter')?.value || 'all';
        const selectedManager = document.getElementById('ganttManagerFilter')?.value || 'all';
        const teams = (currentSystemData.teams || []).filter(team => {
            if (selectedManager !== 'all') return team.sdmId === selectedManager;
            if (selectedSm !== 'all') {
                const sdm = (currentSystemData.sdms || []).find(m => m.sdmId === team.sdmId);
                return sdm && sdm.seniorManagerId === selectedSm;
            }
            return true;
        }).map(t => t.teamId);
        if (selectedSm !== 'all' || selectedManager !== 'all') {
            const teamSet = new Set(teams);
            initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamSet.has(a.teamId)));
        }
    } else if (currentGanttGroupBy === 'Goal') {
        const selectedGoal = document.getElementById('ganttGoalFilter')?.value || 'all';
        if (selectedGoal !== 'all') {
            initiatives = initiatives.filter(init => init.primaryGoalId === selectedGoal);
        }
    } else if (currentGanttGroupBy === 'Theme') {
        const selectedTheme = document.getElementById('ganttThemeFilter')?.value || 'all';
        if (selectedTheme !== 'all') {
            initiatives = initiatives.filter(init => (init.themes || []).includes(selectedTheme));
        }
    }
    return initiatives;
}

function renderContextMeta() {
    const meta = document.getElementById('ganttContextMeta');
    if (!meta) return;
    const year = document.getElementById('ganttYearFilter')?.value || currentGanttYear;
    const viewBy = currentGanttGroupBy;
    const team = document.getElementById('ganttGroupValue')?.value || 'all';
    const manager = document.getElementById('ganttManagerFilter')?.value || 'all';
    const sm = document.getElementById('ganttSeniorManagerFilter')?.value || 'all';
    const goal = document.getElementById('ganttGoalFilter')?.value || 'all';
    const theme = document.getElementById('ganttThemeFilter')?.value || 'all';

    const chips = [];
    chips.push(`<span class="gantt-context-chip">Year: ${year}</span>`);
    chips.push(`<span class="gantt-context-chip">View: ${viewBy}</span>`);
    if (viewBy === 'Team' && team !== 'all') {
        const teamObj = (currentSystemData.teams || []).find(t => t.teamId === team);
        chips.push(`<span class="gantt-context-chip">Team: ${teamObj ? (teamObj.teamIdentity || teamObj.teamName) : team}</span>`);
    }
    if (viewBy === 'Manager') {
        if (sm !== 'all') {
            const smObj = (currentSystemData.seniorManagers || []).find(s => s.seniorManagerId === sm);
            chips.push(`<span class="gantt-context-chip">Sr. Manager: ${smObj ? smObj.seniorManagerName : sm}</span>`);
        }
        if (manager !== 'all') {
            const mgrObj = (currentSystemData.sdms || []).find(m => m.sdmId === manager);
            chips.push(`<span class="gantt-context-chip">Manager: ${mgrObj ? mgrObj.sdmName : manager}</span>`);
        }
    }
    if (viewBy === 'Goal' && goal !== 'all') {
        const goalObj = (currentSystemData.goals || []).find(g => g.goalId === goal);
        chips.push(`<span class="gantt-context-chip">Goal: ${goalObj ? (goalObj.name || goal) : goal}</span>`);
    }
    if (viewBy === 'Theme' && theme !== 'all') {
        const themeObj = (currentSystemData.definedThemes || []).find(t => t.themeId === theme);
        chips.push(`<span class="gantt-context-chip">Theme: ${themeObj ? (themeObj.name || theme) : theme}</span>`);
    }
    meta.innerHTML = chips.join('');
}

function renderGanttTable() {
    const container = document.getElementById('ganttPlanningTableContainer');
    if (!container) return;
    const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
    const data = getGanttFilteredInitiatives().map(init => {
        const dates = getComputedInitiativeDates(init, selectedTeam);
        return {
            ...init,
            displayStart: dates.startDate,
            displayEnd: dates.endDate
        };
    });
    container.innerHTML = `
        <div class="gantt-table-wrapper">
        <table class="gantt-table">
            <thead>
                <tr>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">ID</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Title</th>
                    ${currentGanttGroupBy === 'Manager' && (document.getElementById('ganttManagerFilter')?.value || 'all') !== 'all' ? '<th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Teams</th>' : ''}
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Start</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Target</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">SDEs</th>
                    <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd;">Status</th>
                </tr>
            </thead>
            <tbody id="ganttTableBody"></tbody>
        </table>
        </div>
    `;
    const tbody = document.getElementById('ganttTableBody');
    data.forEach(init => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:6px; border-bottom:1px solid #f0f0f0; font-family: monospace;">${init.initiativeId || ''}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">${init.title || '(Untitled)'}</td>
            ${currentGanttGroupBy === 'Manager' && (document.getElementById('ganttManagerFilter')?.value || 'all') !== 'all' ? `<td style="padding:6px; border-bottom:1px solid #f0f0f0;">${getTeamsForInitiative(init).join(', ')}</td>` : ''}
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="date" value="${init.displayStart || ''}" data-field="startDate" data-id="${init.initiativeId}"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="date" value="${init.displayEnd || ''}" data-field="targetDueDate" data-id="${init.initiativeId}"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;"><input type="number" step="0.01" value="${computeSdeEstimate(init)}" data-field="sdeEstimate" data-id="${init.initiativeId}" style="width:80px;"></td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0;">
                <select data-field="status" data-id="${init.initiativeId}">
                    ${['Backlog','Defined','Committed','In Progress','Done','Blocked'].map(s => `<option value="${s}" ${init.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', (e) => {
            const field = e.target.dataset.field;
            const id = e.target.dataset.id;
            const init = (currentSystemData.yearlyInitiatives || []).find(i => i.initiativeId === id);
            if (!init) return;
            const value = e.target.value;
            const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
            const workingDaysPerYear = currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261;
            if (field === 'startDate') {
                init.attributes = init.attributes || {};
                init.attributes.startDate = value;
                setWorkPackageDatesForTeam(init.initiativeId, { startDate: value }, selectedTeam);
            } else if (field === 'targetDueDate') {
                init.targetDueDate = value;
                setWorkPackageDatesForTeam(init.initiativeId, { endDate: value }, selectedTeam);
            } else if (field === 'sdeEstimate') {
                const num = parseFloat(value) || 0;
                const assignments = init.assignments || [];
                if (assignments.length > 0) {
                    if (currentGanttGroupBy === 'Team' && selectedTeam && selectedTeam !== 'all') {
                        assignments.forEach(a => {
                            if (a.teamId === selectedTeam) {
                                a.sdeYears = num;
                            }
                        });
                        updateWorkPackageSde(init.initiativeId, selectedTeam, num, workingDaysPerYear);
                    } else {
                        const perTeam = num / assignments.length;
                        assignments.forEach(a => a.sdeYears = perTeam);
                        // distribute to all teams
                        (init.assignments || []).forEach(a => {
                            updateWorkPackageSde(init.initiativeId, a.teamId, perTeam, workingDaysPerYear);
                        });
                    }
                } else {
                    init.assignments = [{ teamId: selectedTeam || null, sdeYears: num }];
                    updateWorkPackageSde(init.initiativeId, selectedTeam || null, num, workingDaysPerYear);
                }
                console.log('[GANTT] SDE estimate changed', { initiativeId: id, newTotalSdeYears: num, assignments: init.assignments });
            } else if (field === 'status') {
                init.status = value;
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
        });
    });
}

function computeSdeEstimate(init) {
    const selectedGroupValue = document.getElementById('ganttGroupValue')?.value || 'all';
    const selectedManager = document.getElementById('ganttManagerFilter')?.value || 'all';
    let total = 0;
    (init.assignments || []).forEach(a => {
        if (currentGanttGroupBy === 'Team' && selectedGroupValue !== 'all') {
            if (a.teamId === selectedGroupValue) {
                total += a.sdeYears || 0;
            }
        } else if (currentGanttGroupBy === 'Manager' && selectedManager !== 'all') {
            const managerTeams = getTeamsByManager(selectedManager);
            if (managerTeams.has(a.teamId)) {
                total += a.sdeYears || 0;
            }
        } else {
            total += a.sdeYears || 0;
        }
    });
    return total.toFixed(2);
}

function getTeamsByManager(managerId) {
    const teams = new Set();
    (currentSystemData.teams || []).forEach(team => {
        if (team.sdmId === managerId) teams.add(team.teamId);
    });
    return teams;
}

function getTeamsForInitiative(init) {
    const selectedManager = document.getElementById('ganttManagerFilter')?.value || 'all';
    const teamNames = [];
    const managerTeams = selectedManager !== 'all' ? getTeamsByManager(selectedManager) : null;
    (init.assignments || []).forEach(a => {
        if (managerTeams && !managerTeams.has(a.teamId)) return;
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
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            if (assign.startDate) {
                if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
            }
            if (assign.endDate) {
                if (!latest || assign.endDate > latest) latest = assign.endDate;
            }
        });
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

async function renderGanttChart() {
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;
    const selectedTeam = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : null;
    const data = getGanttFilteredInitiatives().map(init => {
        const dates = getComputedInitiativeDates(init, selectedTeam);
        return {
            ...init,
            attributes: { ...(init.attributes || {}), startDate: dates.startDate },
            targetDueDate: dates.endDate
        };
    });
    if (!data || data.length === 0) {
        container.textContent = 'No initiatives to display.';
        return;
    }
    const syntax = generateGanttSyntax(data, currentGanttGroupBy, currentGanttYear, { selectedTeamId: selectedTeam });
    const renderId = `gantt-${Date.now()}`;
    if (typeof mermaid !== 'undefined' && typeof mermaid.render === 'function') {
        try {
            const result = await mermaid.render(renderId, syntax);
            container.innerHTML = result.svg;
        } catch (err) {
            console.error("Mermaid render failed for gantt:", err, syntax);
            container.textContent = 'Unable to render Gantt chart. Check console for details.';
        }
    } else {
        container.textContent = 'Mermaid is not available.';
    }
    if (!document.getElementById('ganttChartStyle')) {
        const style = document.createElement('style');
        style.id = 'ganttChartStyle';
        style.textContent = `
            .mermaid .task text { font-size: 11px; }
            .mermaid .task tspan { font-size: 11px; }
        `;
        document.head.appendChild(style);
    }
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
    } else if (currentGanttGroupBy === 'Manager') {
        const seniorSelect = document.createElement('select');
        seniorSelect.id = 'ganttSeniorManagerFilter';
        seniorSelect.innerHTML = '<option value="all">All Senior Managers</option>';
        (currentSystemData.seniorManagers || []).forEach(sm => {
            const opt = document.createElement('option');
            opt.value = sm.seniorManagerId;
            opt.textContent = sm.seniorManagerName;
            seniorSelect.appendChild(opt);
        });

        const managerSelect = document.createElement('select');
        managerSelect.id = 'ganttManagerFilter';
        managerSelect.innerHTML = '<option value="all">All Managers</option>';

        const rebuildManagers = () => {
            const selectedSm = seniorSelect.value || 'all';
            const sdms = (currentSystemData.sdms || []).filter(sdm => selectedSm === 'all' ? true : sdm.seniorManagerId === selectedSm);
            managerSelect.innerHTML = '<option value="all">All Managers</option>';
            sdms.forEach(sdm => {
                const opt = document.createElement('option');
                opt.value = sdm.sdmId;
                opt.textContent = sdm.sdmName;
                managerSelect.appendChild(opt);
            });
        };

        seniorSelect.onchange = () => {
            rebuildManagers();
            renderGanttTable();
            renderGanttChart();
        };
        managerSelect.onchange = () => {
            renderGanttTable();
            renderGanttChart();
        };

        rebuildManagers();
        wrap.appendChild(createLabeledControl('Senior Manager:', seniorSelect));
        wrap.appendChild(createLabeledControl('Manager:', managerSelect));
    } else if (currentGanttGroupBy === 'Goal') {
        const select = document.createElement('select');
        select.id = 'ganttGoalFilter';
        select.innerHTML = '<option value="all">All Goals</option>';
        (currentSystemData.goals || [])
            .slice()
            .sort((a, b) => (a.name || a.goalId).localeCompare(b.name || b.goalId))
            .forEach(goal => {
                const opt = document.createElement('option');
                opt.value = goal.goalId;
                opt.textContent = goal.name || goal.goalId;
                select.appendChild(opt);
            });
        select.onchange = () => {
            renderGanttTable();
            renderGanttChart();
        };
        wrap.appendChild(createLabeledControl('Goal:', select));
    } else if (currentGanttGroupBy === 'Theme') {
        const select = document.createElement('select');
        select.id = 'ganttThemeFilter';
        select.innerHTML = '<option value="all">All Themes</option>';
        (currentSystemData.definedThemes || [])
            .slice()
            .sort((a, b) => (a.name || a.themeId).localeCompare(b.name || b.themeId))
            .forEach(theme => {
                const opt = document.createElement('option');
                opt.value = theme.themeId;
                opt.textContent = theme.name || theme.themeId;
                select.appendChild(opt);
            });
        select.onchange = () => {
            renderGanttTable();
            renderGanttChart();
        };
        wrap.appendChild(createLabeledControl('Theme:', select));
    } else {
        // No extra filter for All Initiatives or other modes
        const placeholder = document.createElement('div');
        placeholder.textContent = '';
        wrap.appendChild(placeholder);
    }
    // Ensure table/chart refresh after rebuild
    renderGanttTable();
    renderGanttChart();
    renderContextMeta();
}
