/**
 * Gantt Adapter: converts domain initiatives/workPackages into normalized tasks for the Gantt component.
 * Keeps Mermaid-agnostic transformation separate from rendering logic.
 */

// Global ganttAdapter object
const ganttAdapter = (function () {
    // Use GanttService methods
    const sanitizeId = (id) => GanttService.normalizeGanttId(id);
    const computeSdeEstimate = (init, filterTeamId) => GanttService.computeSdeEstimate(init, filterTeamId);

    // Helper to get working days
    const getWorkingDaysPerYear = () => {
        return SystemService.getCurrentSystem()?.capacityConfiguration?.workingDaysPerYear || 261;
    };

    function buildTasksFromInitiatives({ initiatives = [], workPackages = [], viewBy = 'All Initiatives', filters = {}, year, selectedTeam, expandedInitiativeIds = new Set(), expandedWorkPackageIds = new Set() }) {
        if (SystemService.getCurrentSystem()) {
            WorkPackageService.ensureWorkPackagesForInitiatives(SystemService.getCurrentSystem(), year);
        }
        const tasks = [];
        const yearVal = year || new Date().getFullYear();
        const defaultStart = `${yearVal}-01-15`;
        const defaultEnd = `${yearVal}-11-01`;
        const workingDaysPerYear = getWorkingDaysPerYear();
        const teamMap = new Map((SystemService.getCurrentSystem()?.teams || []).map(t => [t.teamId, t]));
        const goalMap = new Map((SystemService.getCurrentSystem()?.goals || []).map(g => [g.goalId, g]));
        const themeMap = new Map((SystemService.getCurrentSystem()?.definedThemes || []).map(t => [t.themeId, t]));

        // Apply explicit filters (status/year) to keep chart rows aligned with table
        const statusFilter = filters?.status;
        initiatives = (initiatives || []).filter(init => {
            if (year && init.attributes?.planningYear && `${init.attributes.planningYear}` !== `${year}`) return false;
            if (statusFilter && statusFilter.size > 0) {
                const st = init.status || '';
                if (!statusFilter.has(st)) return false;
            }
            return true;
        });

        const wpByInit = new Map();
        workPackages.forEach(wp => {
            if (!wpByInit.has(wp.initiativeId)) wpByInit.set(wp.initiativeId, []);
            wpByInit.get(wp.initiativeId).push(wp);
        });

        initiatives.forEach(init => {
            const groupLabel = buildInitiativeGroupLabel(init);
            const wpList = wpByInit.get(init.initiativeId) || [];
            const hasWorkPackages = wpList.length > 0;

            // Level 1: Initiative Summary (Always Render)
            // Use displayStart/displayEnd from normalized table data (table is master)
            // Fallback to stored dates or defaults only if normalized data not present
            const initStart = init.displayStart || init.attributes?.startDate || defaultStart;
            const initEnd = init.displayEnd || init.targetDueDate || defaultEnd;
            const initiativeLabel = buildInitiativeLabel(init, initEnd);
            tasks.push({
                id: sanitizeId(init.initiativeId),
                title: init.title || 'Initiative Summary',
                group: groupLabel,
                label: initiativeLabel,
                start: initStart,
                end: initEnd,
                status: init.status || 'active',
                type: 'initiative',
                dependencies: (init.dependencies || []).map(sanitizeId).join(','),
                hasWorkPackages,
                // Metadata for updates
                initiativeId: init.initiativeId
            });

            // Level 2: Work Packages (if Initiative expanded)
            if (expandedInitiativeIds.has(init.initiativeId)) {
                wpList.forEach(wp => {
                    // Always render WP bar if initiative is expanded
                    let span = computeWorkPackageSpan(wp, init, selectedTeam, defaultStart, defaultEnd);
                    if (!span) {
                        if (selectedTeam && selectedTeam !== 'all') {
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
                        selectedTeam,
                        spanEnd: span.endDate,
                        defaultEnd,
                        workingDaysPerYear
                    });

                    // Indent WP Label
                    const indentedLabel = `\u00A0\u00A0${label}`; // 2 non-breaking spaces

                    const wpTaskId = sanitizeId(wp.workPackageId || `${init.initiativeId}-${(wp.title || 'wp')}`);
                    const assignmentCount = (wp.impactedTeamAssignments || []).length;
                    tasks.push({
                        id: wpTaskId,
                        title: wp.title || 'Work Package',
                        group: groupLabel,
                        label: indentedLabel,
                        start: span.startDate,
                        end: span.endDate,
                        status: wp.status || init.status || 'active',
                        type: 'workPackage',
                        dependencies: (Array.isArray(wp.dependencies) ? wp.dependencies : []).map(sanitizeId).join(','),
                        assignmentCount,
                        // Metadata for updates
                        initiativeId: init.initiativeId,
                        workPackageId: wp.workPackageId
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
                            const assignLabelCore = buildAssignmentLabel(assign, wp, workingDaysPerYear);
                            // Double Indent Assignment Label
                            const assignLabel = `\u00A0\u00A0\u00A0\u00A0${assignLabelCore}`; // 4 non-breaking spaces

                            tasks.push({
                                id: sanitizeId(`${wp.workPackageId}-${assign.teamId}`),
                                title: `${wp.title} (${teamName})`,
                                group: groupLabel,
                                label: assignLabel,
                                start: assign.startDate || wp.startDate || defaultStart,
                                end: assign.endDate || wp.endDate || defaultEnd,
                                status: wp.status || 'active',
                                type: 'assignment',
                                dependencies: (() => {
                                    // Support both predecessorAssignmentIds (Service) and dependencies (Generic)
                                    // Use set to avoid duplicates
                                    const deps = new Set([
                                        ...(assign.predecessorAssignmentIds || []),
                                        ...(Array.isArray(assign.dependencies) ? assign.dependencies : [])
                                    ]);

                                    // Map to sanitized IDs. Note: Data model must store IDs that match the chart's 
                                    // constructed ID format (wpId-teamId) for this to link correctly.
                                    return Array.from(deps).map(sanitizeId).join(',');
                                })(),
                                // Metadata for updates
                                initiativeId: init.initiativeId,
                                workPackageId: wp.workPackageId,
                                teamId: assign.teamId
                            });
                        });
                    }
                });
            }
        });
        return tasks;
    }

    function buildInitiativeLabel(init, endDate) {
        const title = init.title || 'Initiative';
        const rawSde = computeSdeEstimate(init);
        const hasSde = Number.isFinite(rawSde);
        const sdeText = hasSde ? String(rawSde.toFixed(2)) : '';
        const dateText = formatShortDate(endDate);

        if (sdeText) {
            return `${title} (${sdeText} SDE Yrs | ${dateText})`;
        }
        return `${title} (${dateText})`;
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

    function buildWorkPackageLabel({ init, wp, viewBy, teamMap, goalMap, themeMap, selectedTeam, spanEnd, defaultEnd, workingDaysPerYear }) {
        const baseTitle = wp.title || 'Phase';

        let breakdownStr = '';
        const assignments = wp.impactedTeamAssignments || [];

        if (assignments.length > 0) {
            const parts = assignments.map(a => {
                if (selectedTeam && selectedTeam !== 'all' && a.teamId !== selectedTeam) return null;

                const t = teamMap.get(a.teamId);
                const identity = t ? (t.teamIdentity || t.teamName || a.teamId) : a.teamId;

                const days = a.sdeDays || 0;
                const years = workingDaysPerYear ? (days / workingDaysPerYear) : 0;

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

        // Roll up SDE for the visible WP slice
        const totalSdeYears = computeWpSdeYears(wp, workingDaysPerYear, selectedTeam);
        const infoBits = [];
        if (Number.isFinite(totalSdeYears)) infoBits.push(`${formatSdeYears(totalSdeYears)} SDE Yrs`);
        const endText = formatShortDate(spanEnd || wp.endDate || init.targetDueDate || defaultEnd);
        if (endText) infoBits.push(endText);
        const info = infoBits.length ? ` (${infoBits.join(' | ')})` : '';

        let finalLabel = baseTitle;

        if (viewBy !== 'All Initiatives' && viewBy !== 'Team') {
            finalLabel = `${init.title} - ${baseTitle}`;
        } else if (baseTitle.toLowerCase() === 'work package') {
            finalLabel = init.title;
        }

        return finalLabel + info + breakdownStr;
    }

    function buildAssignmentLabel(assign, wp, workingDaysPerYear) {
        const teamName = (() => {
            const t = (SystemService.getCurrentSystem()?.teams || []).find(team => team.teamId === assign.teamId);
            return t ? (t.teamIdentity || t.teamName || assign.teamId) : assign.teamId;
        })();
        const sdeYears = (assign.sdeYears !== undefined && assign.sdeYears !== null)
            ? parseFloat(assign.sdeYears)
            : ((assign.sdeDays || 0) / (workingDaysPerYear || 261));
        const infoBits = [];
        if (Number.isFinite(sdeYears)) infoBits.push(`${formatSdeYears(sdeYears)} SDE Yrs`);
        const endText = formatShortDate(assign.endDate || wp.endDate || wp.targetDueDate);
        if (endText) infoBits.push(endText);
        if (infoBits.length === 0) return teamName;
        return `${teamName} (${infoBits.join(' | ')})`;
    }

    function computeWpSdeYears(wp, workingDaysPerYear, selectedTeam = null) {
        const assignments = wp?.impactedTeamAssignments || [];
        const filtered = (selectedTeam && selectedTeam !== 'all')
            ? assignments.filter(a => a.teamId === selectedTeam)
            : assignments;
        if (filtered.length === 0 && assignments.length > 0) return NaN;
        const totalDays = filtered.reduce((sum, a) => {
            if (a.sdeYears !== undefined && a.sdeYears !== null) {
                const yrs = parseFloat(a.sdeYears);
                return sum + (isFinite(yrs) ? yrs * (workingDaysPerYear || 261) : 0);
            }
            return sum + (a.sdeDays || 0);
        }, 0);
        const divisor = workingDaysPerYear || 261;
        return divisor > 0 ? totalDays / divisor : NaN;
    }

    function formatShortDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return 'TBD';
        const normalized = dateStr.replace(/\//g, '-');
        const parts = normalized.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (parts.length === 3) {
            const [year, month, day] = parts;
            const mIdx = parseInt(month, 10) - 1;
            const dVal = parseInt(day, 10);
            if (year.length === 4 && mIdx >= 0 && mIdx < 12 && isFinite(dVal)) {
                return `${String(dVal).padStart(2, '0')}-${months[mIdx]}`;
            }
        }

        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) {
            const dVal = parsed.getUTCDate();
            const mIdx = parsed.getUTCMonth();
            return `${String(dVal).padStart(2, '0')}-${months[mIdx]}`;
        }

        return 'TBD';
    }

    function formatSdeYears(years) {
        if (!Number.isFinite(years)) return '';
        const rounded = Number(years.toFixed(2));
        return rounded.toString();
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Return the public API
    return { buildTasksFromInitiatives };
})();
