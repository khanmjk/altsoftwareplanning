/**
 * GanttService.js
 * 
 * Pure business logic functions for Gantt chart data operations.
 * NO DOM access - all functions are pure and testable.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const GanttService = {

    // =========================================================================
    // ID UTILITIES (Pure)
    // =========================================================================

    /**
     * Normalizes a Gantt ID to lowercase with hyphens only.
     * 
     * @param {string} value - Raw ID value
     * @returns {string} Normalized ID
     */
    normalizeGanttId(value) {
        return (value || '')
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * Builds a unique task ID for an assignment.
     * 
     * @param {string} wpId - Work package ID
     * @param {string} teamId - Team ID
     * @returns {string|null} Combined task ID
     */
    buildAssignmentTaskId(wpId, teamId) {
        if (!wpId || !teamId) return null;
        return this.normalizeGanttId(`${wpId}-${teamId}`);
    },

    // =========================================================================
    // LABEL UTILITIES (Pure)
    // =========================================================================

    /**
     * Truncates a label to a maximum length with ellipsis.
     * 
     * @param {string} text - Text to truncate
     * @param {number} maxLen - Maximum length
     * @returns {string} Truncated text
     */
    truncateLabel(text, maxLen) {
        const t = text || '';
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 3).trim() + '...';
    },

    // =========================================================================
    // SDE CALCULATIONS (Pure)
    // =========================================================================

    /**
     * Computes total SDE estimate for an initiative.
     * 
     * @param {object} initiative - Initiative object with assignments
     * @param {string} [filterTeamId] - Optional team ID to filter by
     * @returns {number} Total SDE years
     */
    computeSdeEstimate(initiative, filterTeamId = null) {
        let total = 0;
        (initiative.assignments || []).forEach(a => {
            if (filterTeamId && filterTeamId !== 'all') {
                if (a.teamId === filterTeamId) {
                    total += a.sdeYears || 0;
                }
            } else {
                total += a.sdeYears || 0;
            }
        });
        return total;
    },

    /**
     * Computes SDE years for a work package.
     * 
     * @param {object} wp - Work package object
     * @param {number} workingDaysPerYear - Working days per year
     * @param {string} [selectedTeam] - Optional team filter
     * @returns {number} SDE years
     */
    computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam = null) {
        const wpy = workingDaysPerYear || 261;
        const assignments = wp?.impactedTeamAssignments || [];
        const filtered = (selectedTeam && selectedTeam !== 'all')
            ? assignments.filter(a => a.teamId === selectedTeam)
            : assignments;
        const totalDays = filtered.reduce((sum, a) => sum + (a.sdeDays || 0), 0);
        return totalDays / wpy;
    },

    // =========================================================================
    // DATE CALCULATIONS (Pure)
    // =========================================================================

    /**
     * Gets the earliest assignment start date from a work package.
     * 
     * @param {object} wp - Work package object
     * @returns {string|null} Earliest start date or null
     */
    getEarliestAssignmentStart(wp) {
        let earliest = wp?.startDate || null;
        (wp?.impactedTeamAssignments || []).forEach(assign => {
            if (assign.startDate && (!earliest || assign.startDate < earliest)) {
                earliest = assign.startDate;
            }
        });
        return earliest;
    },

    /**
     * Gets the latest assignment end date from a work package.
     * 
     * @param {object} wp - Work package object
     * @returns {string|null} Latest end date or null
     */
    getLatestAssignmentEnd(wp) {
        let latest = wp?.endDate || null;
        (wp?.impactedTeamAssignments || []).forEach(assign => {
            if (assign.endDate && (!latest || assign.endDate > latest)) {
                latest = assign.endDate;
            }
        });
        return latest;
    },

    /**
     * Computes initiative date span from work packages and assignments.
     * 
     * @param {object} initiative - Initiative object
     * @param {Array} workPackages - Work packages for this initiative
     * @param {string} [selectedTeam] - Optional team filter
     * @param {number} [defaultYear] - Default year if no dates found
     * @returns {object} { startDate, endDate }
     */
    getComputedInitiativeDates(initiative, workPackages, selectedTeam = null, defaultYear = null) {
        const year = initiative?.attributes?.planningYear || defaultYear || new Date().getFullYear();
        const defaultStart = `${year}-01-15`;
        const defaultEnd = `${year}-11-01`;

        let earliest = null;
        let latest = null;

        (workPackages || []).forEach(wp => {
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
            startDate: earliest || initiative?.attributes?.startDate || defaultStart,
            endDate: latest || initiative?.targetDueDate || defaultEnd
        };
    },

    // =========================================================================
    // DEPENDENCY CYCLE DETECTION (Pure) 
    // =========================================================================

    /**
     * Checks if adding a dependency would create a cycle.
     * 
     * @param {string} fromWpId - Source work package ID
     * @param {string} toWpId - Target work package ID (dependency)
     * @param {Array} workPackages - All work packages
     * @returns {boolean} True if cycle would be created
     */
    wouldCreateDependencyCycle(fromWpId, toWpId, workPackages) {
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
    },

    /**
     * Checks if adding an assignment dependency would create a cycle.
     * 
     * @param {object} wp - Work package object
     * @param {string} fromAssignId - Source assignment task ID
     * @param {string} toAssignId - Target assignment task ID
     * @returns {boolean} True if cycle would be created
     */
    wouldCreateAssignmentCycle(wp, fromAssignId, toAssignId) {
        if (!wp || !fromAssignId || !toAssignId) return false;

        const from = this.normalizeGanttId(fromAssignId);
        const to = this.normalizeGanttId(toAssignId);

        const graph = new Map();
        (wp.impactedTeamAssignments || []).forEach(assign => {
            const assignId = this.buildAssignmentTaskId(wp.workPackageId, assign.teamId);
            if (!assignId) return;
            const normalized = this.normalizeGanttId(assignId);
            const deps = (assign.predecessorAssignmentIds || []).map(d => this.normalizeGanttId(d));
            graph.set(normalized, new Set(deps));
        });

        if (!graph.has(from)) graph.set(from, new Set());
        graph.get(from).add(to);

        const visited = new Set();
        const stack = [to];
        while (stack.length) {
            const current = stack.pop();
            if (current === from) return true;
            if (visited.has(current)) continue;
            visited.add(current);
            const neighbors = graph.get(current);
            if (neighbors) {
                neighbors.forEach(n => stack.push(n));
            }
        }
        return false;
    },

    // =========================================================================
    // FILTERING (Pure)
    // =========================================================================

    /**
     * Filters initiatives based on Gantt view criteria.
     * 
     * @param {object} params - Filter parameters
     * @param {Array} params.initiatives - All initiatives
     * @param {number} params.year - Planning year filter
     * @param {Set} params.statusFilter - Set of allowed statuses
     * @param {string} params.groupBy - 'All Initiatives', 'Team', or SDM ID
     * @param {string} params.groupValue - Specific group value
     * @param {Array} params.teams - All teams
     * @param {Array} params.sdms - All SDMs
     * @returns {Array} Filtered initiatives
     */
    getFilteredInitiatives({ initiatives, year, statusFilter, groupBy, groupValue, teams, sdms }) {
        let filtered = (initiatives || []).filter(init => {
            const planningYear = init.attributes?.planningYear;
            return planningYear == year;
        });

        // Status filter
        if (statusFilter && statusFilter.size > 0) {
            filtered = filtered.filter(init => {
                const status = init.status || 'Backlog';
                return statusFilter.has(status);
            });
        }

        // Group filtering
        if (groupBy === 'Team' && groupValue && groupValue !== 'all') {
            filtered = filtered.filter(init =>
                (init.assignments || []).some(a => a.teamId === groupValue)
            );
        } else if (groupBy !== 'All Initiatives' && groupBy !== 'Team') {
            // Group by SDM
            const sdm = (sdms || []).find(s => s.sdmId === groupBy);
            if (sdm) {
                const sdmTeamIds = new Set(
                    (teams || []).filter(t => t.sdmId === groupBy).map(t => t.teamId)
                );
                if (groupValue && groupValue !== 'all') {
                    filtered = filtered.filter(init =>
                        (init.assignments || []).some(a => a.teamId === groupValue)
                    );
                } else {
                    filtered = filtered.filter(init =>
                        (init.assignments || []).some(a => sdmTeamIds.has(a.teamId))
                    );
                }
            }
        }

        return filtered;
    },

    // =========================================================================
    // TEAM UTILITIES (Pure)
    // =========================================================================

    /**
     * Gets teams assigned to an initiative.
     * 
     * @param {object} initiative - Initiative object
     * @param {Array} teams - All teams
     * @returns {Array<string>} Team names
     */
    getTeamsForInitiative(initiative, teams) {
        const teamNames = [];
        (initiative.assignments || []).forEach(a => {
            const team = (teams || []).find(t => t.teamId === a.teamId);
            if (team) {
                teamNames.push(team.teamIdentity || team.teamName || a.teamId);
            }
        });
        return teamNames.length ? teamNames : ['(None)'];
    },

    /**
     * Formats work package team names.
     * 
     * @param {object} wp - Work package object
     * @param {Array} teams - All teams
     * @param {string} [selectedTeam] - Optional team filter
     * @returns {string} Comma-separated team names
     */
    formatWorkPackageTeams(wp, teams, selectedTeam = null) {
        const teamSet = new Set();
        (wp?.impactedTeamAssignments || []).forEach(assign => {
            if (selectedTeam && selectedTeam !== 'all' && assign.teamId !== selectedTeam) return;
            const team = (teams || []).find(t => t.teamId === assign.teamId);
            if (team) teamSet.add(team.teamIdentity || team.teamName || assign.teamId);
        });
        if (teamSet.size === 0 && selectedTeam && selectedTeam !== 'all') {
            return '(Selected team not assigned)';
        }
        return teamSet.size ? Array.from(teamSet).join(', ') : '(Unassigned)';
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttService;
}
