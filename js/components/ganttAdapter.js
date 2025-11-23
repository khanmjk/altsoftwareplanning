/**
 * Gantt Adapter: converts domain initiatives/workPackages into normalized tasks for the Gantt component.
 * Keeps Mermaid-agnostic transformation separate from rendering logic.
 */
(function() {
    function buildTasksFromInitiatives({ initiatives = [], workPackages = [], viewBy = 'All Initiatives', filters = {}, year, selectedTeam }) {
        const tasks = [];
        const yearVal = year || new Date().getFullYear();
        const defaultStart = `${yearVal}-01-15`;
        const defaultEnd = `${yearVal}-11-01`;
        const teamMap = new Map((currentSystemData?.teams || []).map(t => [t.teamId, t]));
        const goalMap = new Map((currentSystemData?.goals || []).map(g => [g.goalId, g]));
        const themeMap = new Map((currentSystemData?.definedThemes || []).map(t => [t.themeId, t]));

        const wpByInit = new Map();
        workPackages.forEach(wp => {
            if (!wpByInit.has(wp.initiativeId)) wpByInit.set(wp.initiativeId, []);
            wpByInit.get(wp.initiativeId).push(wp);
        });

        initiatives.forEach(init => {
            const wpList = wpByInit.get(init.initiativeId) || [];
            if (viewBy === 'Team' && selectedTeam && selectedTeam !== 'all') {
                // build task per selected team assignment only
                const span = computeSpan(init, wpList, selectedTeam, defaultStart, defaultEnd);
                if (!span) return;
                const label = buildLabel(init, viewBy, { teamMap, goalMap, themeMap, selectedTeam });
                tasks.push({
                    id: `${init.initiativeId}-${selectedTeam}`,
                    title: init.title || init.initiativeId,
                    group: label.group,
                    label: label.text,
                    start: span.startDate,
                    end: span.endDate,
                    status: init.status || 'active'
                });
            } else {
                const span = computeSpan(init, wpList, selectedTeam, defaultStart, defaultEnd);
                if (!span) return;
                const label = buildLabel(init, viewBy, { teamMap, goalMap, themeMap, selectedTeam });
                tasks.push({
                    id: init.initiativeId,
                    title: init.title || init.initiativeId,
                    group: label.group,
                    label: label.text,
                    start: span.startDate,
                    end: span.endDate,
                    status: init.status || 'active'
                });
            }
        });
        return tasks;
    }

    function computeSpan(init, wpList, selectedTeam, defaultStart, defaultEnd) {
        let earliest = null;
        let latest = null;
        wpList.forEach(wp => {
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
        const startDate = earliest || init.attributes?.startDate || defaultStart;
        const endDate = latest || init.targetDueDate || defaultEnd;
        if (!startDate || !endDate) return null;
        return { startDate, endDate };
    }

    function buildLabel(init, viewBy, maps) {
        const base = init.title || init.initiativeId || 'Initiative';
        switch (viewBy) {
            case 'Team': {
                if (maps.selectedTeam && maps.selectedTeam !== 'all') {
                    const t = maps.teamMap.get(maps.selectedTeam);
                    const name = t ? (t.teamIdentity || t.teamName || t.teamId) : maps.selectedTeam;
                    return { group: name, text: `${base} [${name}]` };
                }
                const names = (init.assignments || [])
                    .map(a => maps.teamMap.get(a.teamId))
                    .filter(Boolean)
                    .map(t => t.teamIdentity || t.teamName || t.teamId);
                const group = names.join(' / ') || 'Unassigned Team';
                return { group, text: `${base} [${group}]` };
            }
            case 'Manager': {
                const mgrName = init.owner?.name || 'Unassigned Manager';
                return { group: mgrName, text: `${base} [${mgrName}]` };
            }
            case 'Goal': {
                const goalName = maps.goalMap.get(init.primaryGoalId)?.name || 'Unassigned Goal';
                return { group: goalName, text: `${base} [${goalName}]` };
            }
            case 'Theme': {
                const themeName = maps.themeMap.get((init.themes || [])[0])?.name || 'Unassigned Theme';
                return { group: themeName, text: `${base} [${themeName}]` };
            }
            default:
                return { group: 'All Initiatives', text: `${base}` };
        }
    }

    if (typeof window !== 'undefined') {
        window.ganttAdapter = { buildTasksFromInitiatives };
    }
})();
