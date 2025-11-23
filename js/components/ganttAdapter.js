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
                let span = computeWorkPackageSpan(wp, init, selectedTeam, defaultStart, defaultEnd);
                if (!span) {
                    span = { startDate: defaultStart, endDate: defaultEnd };
                }
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
                    status: wp.status || init.status || 'active',
                    dependencies: (wp.dependencies || []).join(',')
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
        return truncateText(init.initiativeId ? `${base} (${init.initiativeId})` : base, 65);
    }

    function buildWorkPackageLabel({ init, wp, viewBy, teamMap, goalMap, themeMap, selectedTeam }) {
        const baseTitle = wp.title || 'Phase';
        
        let breakdownStr = '';
        const assignments = wp.impactedTeamAssignments || [];
        
        if (assignments.length > 0) {
            const parts = assignments.map(a => {
                if (selectedTeam && selectedTeam !== 'all' && a.teamId !== selectedTeam) return null;
                
                const t = teamMap.get(a.teamId);
                const identity = t ? (t.teamIdentity || t.teamName || a.teamId) : a.teamId;
                
                const days = a.sdeDays || 0;
                const years = days / 261;
                
                let valStr = '';
                if (years >= 0.1) {
                    valStr = `${years.toFixed(1)}y`;
                } else {
                    valStr = `${days.toFixed(0)}d`;
                }
                return `${identity} ${valStr}`;
            }).filter(Boolean);
            
            if (parts.length > 0) {
                breakdownStr = ` (${parts.join(' / ')})`;
            }
        }

        let finalLabel = baseTitle;
        
        if (viewBy !== 'All Initiatives' && viewBy !== 'Team') {
             finalLabel = `${init.title} - ${baseTitle}`;
        } else if (baseTitle.toLowerCase() === 'work package') {
             finalLabel = init.title; 
        }

        return finalLabel + breakdownStr;
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    if (typeof window !== 'undefined') {
        window.ganttAdapter = { buildTasksFromInitiatives };
    }
})();
