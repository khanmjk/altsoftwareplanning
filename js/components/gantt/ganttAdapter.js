/**
 * Gantt Adapter: converts domain initiatives/workPackages into normalized tasks for the Gantt component.
 * Keeps Mermaid-agnostic transformation separate from rendering logic.
 */
(function () {
    function buildTasksFromInitiatives({ initiatives = [], workPackages = [], viewBy = 'All Initiatives', filters = {}, year, selectedTeam, expandedInitiativeIds = new Set(), expandedWorkPackageIds = new Set() }) {
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
            const groupLabel = buildInitiativeGroupLabel(init);

            // Level 1: Initiative Summary (Always Render)
            const initStart = init.attributes?.startDate || defaultStart;
            const initEnd = init.targetDueDate || defaultEnd;
            tasks.push({
                id: sanitizeId(init.initiativeId),
                title: init.title || 'Initiative Summary',
                group: groupLabel,
                label: init.title || 'Initiative',
                start: initStart,
                end: initEnd,
                status: init.status || 'active',
                dependencies: (init.dependencies || []).map(sanitizeId).join(',')
            });

            // Level 2: Work Packages (if Initiative expanded)
            if (expandedInitiativeIds.has(init.initiativeId)) {
                const wpList = wpByInit.get(init.initiativeId) || [];
                wpList.forEach(wp => {
                    // Always render WP bar if initiative is expanded
                    let span = computeWorkPackageSpan(wp, init, selectedTeam, defaultStart, defaultEnd);
                    if (!span) {
                        if (selectedTeam && selectedTeam !== 'all') {
                            // If filtering by team and this WP has no relevant assignments, skip it?
                            // Or show ghost? Let's skip for cleaner view if filtered.
                            // But if we want hierarchy, maybe show it? 
                            // Let's stick to: if no span (meaning no assignments for team), skip.
                            return;
                        }
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

                    // Indent WP Label
                    const indentedLabel = `\u00A0\u00A0${label}`; // 2 non-breaking spaces

                    const wpTaskId = sanitizeId(wp.workPackageId || `${init.initiativeId}-${(wp.title || 'wp')}`);
                    tasks.push({
                        id: wpTaskId,
                        title: wp.title || 'Work Package',
                        group: groupLabel,
                        label: indentedLabel,
                        start: span.startDate,
                        end: span.endDate,
                        status: wp.status || init.status || 'active',
                        dependencies: (wp.dependencies || []).map(sanitizeId).join(',')
                    });

                    // Level 3: Team Assignments (if WP expanded)
                    if (expandedWorkPackageIds.has(wp.workPackageId)) {
                        const assignments = wp.impactedTeamAssignments || [];
                        const relevantAssignments = (!selectedTeam || selectedTeam === 'all')
                            ? assignments
                            : assignments.filter(assign => assign.teamId === selectedTeam);

                        relevantAssignments.forEach(assign => {
                            const t = teamMap.get(assign.teamId);
                            const teamName = t ? (t.teamIdentity || t.teamName || assign.teamId) : assign.teamId;
                            // Double Indent Assignment Label
                            const assignLabel = `\u00A0\u00A0\u00A0\u00A0${teamName}`; // 4 non-breaking spaces

                            tasks.push({
                                id: sanitizeId(`${wp.workPackageId}-${assign.teamId}`),
                                title: `${wp.title} (${teamName})`,
                                group: groupLabel,
                                label: assignLabel,
                                start: assign.startDate || wp.startDate || defaultStart,
                                end: assign.endDate || wp.endDate || defaultEnd,
                                status: wp.status || 'active',
                                dependencies: (wp.dependencies || []).map(sanitizeId).join(',')
                            });
                        });
                    }
                });
            }
        });
        return tasks;
    }

    // Removed createTaskForWorkPackage helper as logic is now inline for indentation control


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

    function sanitizeId(id) {
        return (id || '')
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
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
