function generateGanttSyntax(initiatives, groupBy = 'Initiative', viewYear = new Date().getFullYear(), options = {}) {
    const selectedTeamId = options.selectedTeamId || null;
    const lines = [];
    lines.push('gantt');
    lines.push('dateFormat YYYY-MM-DD');
    lines.push('axisFormat %Y-%m-%d');
    lines.push(`title Detailed Plan - ${viewYear}`);

    const grouped = groupInitiatives(initiatives || [], groupBy);

    Object.keys(grouped).sort().forEach(groupKey => {
        const groupLabel = groupKey || 'Unspecified';
        lines.push(`section ${escapeLabel(groupLabel)}`);
        grouped[groupKey].forEach(init => {
            const { statusToken, start, end } = getInitTiming(init, viewYear);
            if (!isValidDate(start) || !isValidDate(end)) {
                console.warn('Skipping initiative with invalid dates', init.initiativeId, start, end);
                return;
            }
            const teamsLabel = getTeamsLabel(init);
            const rawTitle = truncateLabel(sanitizeTitle(`${init.title || init.initiativeId || 'Initiative'}${teamsLabel}`), 64);
            const title = escapeLabel(rawTitle);
            const id = init.initiativeId || createSafeId(title);
            lines.push(`${title} :${statusToken}, ${id}, ${start}, ${end}`);
        });
    });

    return lines.join('\n');

    function groupInitiatives(items, mode) {
        const map = {};
        (items || []).forEach(init => {
            const key = resolveGroupKey(init, mode);
            if (!map[key]) map[key] = [];
            map[key].push(init);
        });
        return map;
    }

    function resolveGroupKey(init, mode) {
        switch (mode) {
            case 'All Initiatives': {
                return 'All Initiatives';
            }
            case 'Team': {
                if (selectedTeamId && selectedTeamId !== 'all') {
                    return getTeamNameById(selectedTeamId);
                }
                const teamId = (init.assignments || [])[0]?.teamId;
                return teamId ? getTeamNameById(teamId) : 'Unassigned Team';
            }
            case 'Theme': {
                const themeId = (init.themes || [])[0];
                return themeId ? getThemeNameById(themeId) : 'Unassigned Theme';
            }
            case 'Manager': {
                return init.owner?.name || 'Unassigned Manager';
            }
            case 'Goal': {
                return getGoalNameById(init.primaryGoalId) || 'Unassigned Goal';
            }
            default:
                return init.title || 'Initiative';
        }
    }

    function getInitTiming(init, year) {
        const defaultStart = `${year}-01-15`;
        const defaultEnd = `${year}-02-01`;
        const target = init.targetDueDate || defaultEnd;
        let start = (init.attributes && init.attributes.startDate) || '';
        if (!start) {
            // Infer a start 60 days before target, clamp to year start
            const targetDate = new Date(target);
            if (!isNaN(targetDate.getTime())) {
                const inferred = new Date(targetDate);
                inferred.setDate(inferred.getDate() - 60);
                if (inferred.getFullYear() < year || (inferred.getFullYear() === year && inferred.getMonth() === 0 && inferred.getDate() < 15)) {
                    inferred.setFullYear(year, 0, 15);
                }
                start = inferred.toISOString().slice(0, 10);
            }
        }
        if (!start) start = defaultStart;
        let end = target || defaultEnd;
        if (new Date(end) < new Date(start)) {
            const startDate = new Date(start);
            startDate.setDate(startDate.getDate() + 30);
            end = startDate.toISOString().slice(0, 10);
        }
        const statusToken = mapStatusToToken(init.status);
        return { start, end, statusToken };
    }

    function mapStatusToToken(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('done') || s.includes('complete')) return 'done';
        if (s.includes('risk') || s.includes('block')) return 'crit';
        return 'active';
    }

    function escapeLabel(text) {
        return (text || '').replace(/:/g, '\\:');
    }

    function truncateLabel(text, maxLen = 36) {
        const t = text || '';
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 3).trim() + '...';
    }

    function sanitizeTitle(text) {
        return (text || '')
            .replace(/,/g, ' / ')
            .replace(/[^\x20-\x7E]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function createSafeId(raw) {
        return (raw || 'id').replace(/[^a-zA-Z0-9_]/g, '_');
    }

    function getTeamNameById(teamId) {
        const team = (currentSystemData?.teams || []).find(t => t.teamId === teamId);
        return team ? (team.teamIdentity || team.teamName || teamId) : teamId;
    }

    function getThemeNameById(themeId) {
        const theme = (currentSystemData?.definedThemes || []).find(t => t.themeId === themeId);
        return theme ? (theme.name || themeId) : themeId;
    }

    function getGoalNameById(goalId) {
        const goal = (currentSystemData?.goals || []).find(g => g.goalId === goalId);
        return goal ? (goal.name || goalId) : goalId;
    }

    function getTeamsLabel(init) {
        const teamNames = [];
        (init.assignments || []).forEach(a => {
            if (selectedTeamId && selectedTeamId !== 'all' && a.teamId !== selectedTeamId) return;
            const team = (currentSystemData?.teams || []).find(t => t.teamId === a.teamId);
            if (team) {
                teamNames.push(team.teamIdentity || team.teamName || a.teamId);
            }
        });
        if (!teamNames.length) return '';
        return ` [Teams ${teamNames.join(' / ')}]`;
    }

    function isValidDate(str) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }
}

if (typeof window !== 'undefined') {
    window.generateGanttSyntax = generateGanttSyntax;
}
