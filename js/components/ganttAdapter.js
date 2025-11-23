/**
 * Gantt Adapter: converts domain initiatives/workPackages into normalized tasks for the Gantt component.
 * Keeps Mermaid-agnostic transformation separate from rendering logic.
 */
(function() {
    function buildTasksFromInitiatives({ initiatives = [], workPackages = [], viewBy = 'All Initiatives', filters = {}, year, selectedTeam }) {
        if (typeof ensureWorkPackagesForInitiatives === 'function' && typeof currentSystemData !== 'undefined') {
            ensureWorkPackagesForInitiatives(currentSystemData, year);
        }
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
            if (!wpList.length) return;
            const groupLabel = buildInitiativeGroupLabel(init);
            wpList.forEach(wp => {
                const span = computeWorkPackageSpan(wp, init, selectedTeam, defaultStart, defaultEnd);
                if (!span) return;
                const label = buildWorkPackageLabel({
                    init,
                    wp,
                    viewBy,
                    teamMap,
                    goalMap,
                    themeMap,
                    selectedTeam
                });
                tasks.push({
                    id: wp.workPackageId || `${init.initiativeId}-${(wp.title || 'wp').replace(/\s+/g, '-').toLowerCase()}`,
                    title: wp.title || 'Work Package',
                    group: groupLabel,
                    label,
                    start: span.startDate,
                    end: span.endDate,
                    status: wp.status || init.status || 'active'
                });
            });
        });
        return tasks;
    }

    function computeWorkPackageSpan(wp, init, selectedTeam, defaultStart, defaultEnd) {
        let earliest = null;
        let latest = null;
        const assignments = wp.impactedTeamAssignments || [];
        const relevantAssignments = (!selectedTeam || selectedTeam === 'all')
            ? assignments
            : assignments.filter(assign => assign.teamId === selectedTeam);

        if (selectedTeam && selectedTeam !== 'all' && assignments.length && relevantAssignments.length === 0) {
            return null; // WP not relevant to selected team
        }

        (relevantAssignments.length ? relevantAssignments : assignments).forEach(assign => {
            if (assign.startDate) {
                if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
            }
            if (assign.endDate) {
                if (!latest || assign.endDate > latest) latest = assign.endDate;
            }
        });

        if (!earliest && wp.startDate) earliest = wp.startDate;
        if (!latest && wp.endDate) latest = wp.endDate;

        const startDate = earliest || init.attributes?.startDate || defaultStart;
        const endDate = latest || init.targetDueDate || defaultEnd;
        if (!startDate || !endDate) return null;
        return { startDate, endDate };
    }

    function buildInitiativeGroupLabel(init) {
        const base = init.title || init.initiativeId || 'Initiative';
        return init.initiativeId ? `${base} (${init.initiativeId})` : base;
    }

    function buildWorkPackageLabel({ init, wp, viewBy, teamMap, goalMap, themeMap, selectedTeam }) {
        const base = wp.title || 'Work Package';
        switch (viewBy) {
            case 'Team': {
                if (selectedTeam && selectedTeam !== 'all') {
                    const t = teamMap.get(selectedTeam);
                    const name = t ? (t.teamIdentity || t.teamName || t.teamId) : selectedTeam;
                    return `${base} [${name}]`;
                }
                const names = (wp.impactedTeamAssignments || [])
                    .map(a => teamMap.get(a.teamId))
                    .filter(Boolean)
                    .map(t => t.teamIdentity || t.teamName || t.teamId);
                return names.length ? `${base} [${names.join(' / ')}]` : base;
            }
            case 'Manager': {
                const mgrName = init.owner?.name || 'Unassigned Manager';
                return `${base} [${mgrName}]`;
            }
            case 'Goal': {
                const goalName = goalMap.get(init.primaryGoalId)?.name || 'Unassigned Goal';
                return `${base} [${goalName}]`;
            }
            case 'Theme': {
                const themeName = themeMap.get((init.themes || [])[0])?.name || 'Unassigned Theme';
                return `${base} [${themeName}]`;
            }
            default:
                return `${base} (${init.title || init.initiativeId || 'Initiative'})`;
        }
    }

    if (typeof window !== 'undefined') {
        window.ganttAdapter = { buildTasksFromInitiatives };
    }
})();
