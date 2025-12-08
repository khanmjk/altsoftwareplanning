/**
 * WorkPackageService.js
 * 
 * Domain logic for managing Work Packages (WPs).
 * Handles creation, updates, date rollups, and synchronization with initiatives.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const STANDARD_WORK_PACKAGE_PHASES = [
    "Requirements & Definition",
    "Design (Technical & UX)",
    "Implementation",
    "Integration & System Testing",
    "Security Testing",
    "User Acceptance Testing (UAT/E2E)",
    "Deployment",
    "Completed & Monitored"
];

const WorkPackageService = {

    /**
     * Ensures work packages exist for all initiatives. Generates defaults from initiative assignments when missing.
     * @param {object} systemData - The full system data object
     * @param {string|number} yearFilter - Optional year to filter initiative creation
     */
    ensureWorkPackagesForInitiatives(systemData, yearFilter = null) {
        if (!systemData) return;
        if (!systemData.workPackages) systemData.workPackages = [];
        let createdCount = 0;
        const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
        const defaultStartForYear = (year) => `${year}-01-15`;
        const defaultEndForYear = (year) => `${year}-11-01`;

        (systemData.yearlyInitiatives || []).forEach(init => {
            if (yearFilter && `${init.attributes?.planningYear || ''}` !== `${yearFilter}`) return;
            init.workPackageIds = init.workPackageIds || [];
            init.dependencies = init.dependencies || [];

            // Only create a default WP if absolutely no WPs exist for this initiative
            const existing = (systemData.workPackages || []).filter(wp => wp.initiativeId === init.initiativeId);
            if (existing.length > 0) {
                // Backfill missing arrays on existing WPs if needed
                existing.forEach(wp => {
                    if (!wp.dependencies) wp.dependencies = [];
                    wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];
                    wp.deliveryPhases = wp.deliveryPhases || STANDARD_WORK_PACKAGE_PHASES.map(phaseName => ({
                        id: `phase-${phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                        name: phaseName,
                        startDate: wp.startDate || null,
                        endDate: wp.endDate || null,
                        status: 'Planned'
                    }));
                    // NOTE: We deliberately do NOT auto-add team assignments here
                    // Team assignments should only be added/removed explicitly by the user
                });
                return;
            }

            const planningYear = init.attributes?.planningYear || new Date().getFullYear();
            const wpId = `wp-${init.initiativeId}-${Date.now()}`; // Simpler ID generation
            const wpStart = init.attributes?.startDate || defaultStartForYear(planningYear);
            const wpEnd = init.targetDueDate || defaultEndForYear(planningYear);
            const impactedTeamAssignments = (init.assignments || []).map(assign => ({
                teamId: assign.teamId || null,
                sdeDays: (assign.sdeYears || 0) * workingDaysPerYear,
                startDate: wpStart,
                endDate: wpEnd
            }));
            const deliveryPhases = STANDARD_WORK_PACKAGE_PHASES.map(phaseName => ({
                id: `phase-${phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                name: phaseName,
                startDate: wpStart,
                endDate: wpEnd,
                status: 'Planned'
            }));
            const newWp = {
                workPackageId: wpId,
                initiativeId: init.initiativeId,
                title: "Phase 1: Implementation", // Better default title
                impactedTeamAssignments,
                deliveryPhases,
                startDate: wpStart,
                endDate: wpEnd,
                status: init.status || 'Planned',
                dependencies: []
            };
            systemData.workPackages.push(newWp);
            if (!init.workPackageIds.includes(wpId)) {
                init.workPackageIds.push(wpId);
            }
            createdCount += 1;
        });
    },

    /**
     * Adds a new Work Package to a specific initiative.
     * @param {object} systemData - The full system data object
     * @param {string} initiativeId 
     * @param {object} wpData - Optional overrides { title, startDate, endDate, status }
     */
    addWorkPackage(systemData, initiativeId, wpData = {}) {
        if (!systemData) return null;
        this.ensureWorkPackagesForInitiatives(systemData);

        const initiative = (systemData.yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        if (!initiative) {
            console.error("Initiative not found:", initiativeId);
            return null;
        }

        const newWpId = `wp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const planningYear = initiative.attributes?.planningYear || new Date().getFullYear();

        // Default dates fallback to initiative dates
        const defaultStart = initiative.attributes?.startDate || `${planningYear}-01-15`;
        const defaultEnd = initiative.targetDueDate || `${planningYear}-11-01`;

        // Create task rows for ALL teams in the system (not just initiative assignments)
        // This allows planners to enter estimates for any team
        const allTeams = systemData.teams || [];
        const impactedTeamAssignments = allTeams.map(team => ({
            teamId: team.teamId,
            sdeDays: 0, // Start with zero, user will enter estimates
            startDate: wpData.startDate || defaultStart,
            endDate: wpData.endDate || defaultEnd
        }));

        const newWp = {
            workPackageId: newWpId,
            initiativeId: initiativeId,
            title: wpData.title || "New Work Package",
            startDate: wpData.startDate || defaultStart,
            endDate: wpData.endDate || defaultEnd,
            status: wpData.status || "Planned",
            impactedTeamAssignments,
            deliveryPhases: STANDARD_WORK_PACKAGE_PHASES.map(phaseName => ({
                id: `phase-${phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                name: phaseName,
                startDate: null,
                endDate: null,
                status: 'Planned'
            })),
            dependencies: [],
            ...wpData
        };

        if (!systemData.workPackages) systemData.workPackages = [];
        systemData.workPackages.push(newWp);

        if (!initiative.workPackageIds) initiative.workPackageIds = [];
        initiative.workPackageIds.push(newWpId);

        return newWp;
    },

    /**
     * Recalculates Work Package dates based on its assignments (Tasks).
     * Enforces bottom-up rollup: WP Start = Min(Task Starts), WP End = Max(Task Ends).
     * @param {object} workPackage 
     */
    recalculateWorkPackageDates(workPackage) {
        if (!workPackage || !workPackage.impactedTeamAssignments || workPackage.impactedTeamAssignments.length === 0) {
            return;
        }

        let earliest = null;
        let latest = null;

        workPackage.impactedTeamAssignments.forEach(assign => {
            if (assign.startDate) {
                if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
            }
            if (assign.endDate) {
                if (!latest || assign.endDate > latest) latest = assign.endDate;
            }
        });

        if (earliest) workPackage.startDate = earliest;
        if (latest) workPackage.endDate = latest;
    },

    /**
     * Updates an existing Work Package.
     * @param {object} systemData - The full system data object
     * @param {string} workPackageId 
     * @param {object} updates 
     */
    updateWorkPackage(systemData, workPackageId, updates) {
        if (!systemData || !systemData.workPackages) return null;
        const wp = systemData.workPackages.find(w => w.workPackageId === workPackageId);
        if (!wp) return null;

        Object.assign(wp, updates);

        // If dates changed, trigger sync logic if necessary (omitted for MVP)
        return wp;
    },

    /**
     * Deletes a Work Package.
     * @param {object} systemData - The full system data object
     * @param {string} workPackageId 
     */
    deleteWorkPackage(systemData, workPackageId) {
        if (!systemData || !systemData.workPackages) return false;

        const index = systemData.workPackages.findIndex(w => w.workPackageId === workPackageId);
        if (index === -1) return false;

        const wp = systemData.workPackages[index];
        systemData.workPackages.splice(index, 1);

        // Remove reference from initiative
        const initiative = (systemData.yearlyInitiatives || []).find(i => i.initiativeId === wp.initiativeId);
        if (initiative && initiative.workPackageIds) {
            initiative.workPackageIds = initiative.workPackageIds.filter(id => id !== workPackageId);
        }

        return true;
    },

    /**
     * Adds a new team assignment (task) to a Work Package.
     * @param {object} systemData - The full system data object
     * @param {string} workPackageId - The WP to add the assignment to
     * @param {object} assignData - Optional overrides { teamId, sdeDays, startDate, endDate }
     * @returns {object|null} The created assignment or null on failure
     */
    addAssignment(systemData, workPackageId, assignData = {}) {
        if (!systemData) return null;
        const wp = (systemData.workPackages || []).find(w => w.workPackageId === workPackageId);
        if (!wp) {
            console.error("Work Package not found:", workPackageId);
            return null;
        }

        wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];

        // Create new assignment with defaults
        const newAssignment = {
            teamId: assignData.teamId || null, // Will be unassigned if not provided
            sdeDays: assignData.sdeDays || 0,
            startDate: assignData.startDate || wp.startDate || null,
            endDate: assignData.endDate || wp.endDate || null,
            dependencies: assignData.dependencies || []
        };

        wp.impactedTeamAssignments.push(newAssignment);

        // Recalculate WP dates from assignments
        this.recalculateWorkPackageDates(wp);

        return newAssignment;
    },

    /**
     * Deletes a team assignment (task) from a Work Package.
     * @param {object} systemData - The full system data object
     * @param {string} workPackageId - The WP containing the assignment
     * @param {string} teamId - The team ID of the assignment to delete
     * @returns {boolean} True if deleted, false otherwise
     */
    deleteAssignment(systemData, workPackageId, teamId) {
        if (!systemData) return false;
        const wp = (systemData.workPackages || []).find(w => w.workPackageId === workPackageId);
        if (!wp || !wp.impactedTeamAssignments) return false;

        const index = wp.impactedTeamAssignments.findIndex(a => a.teamId === teamId);
        if (index === -1) return false;

        wp.impactedTeamAssignments.splice(index, 1);

        // Recalculate WP dates from remaining assignments
        this.recalculateWorkPackageDates(wp);

        return true;
    },

    /**
     * Recomputes initiative assignments bottom-up from work packages (impactedTeamAssignments).
     * Aggregates sdeDays -> sdeYears per team using workingDaysPerYear.
     * @param {string} initiativeId 
     * @param {object} systemData 
     */
    syncInitiativeTotals(initiativeId, systemData) {
        if (!systemData || !initiativeId) return;
        const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
        const wpForInit = (systemData.workPackages || []).filter(wp => wp.initiativeId === initiativeId);
        // If no WPs, don't zero out initiative data (allows top-down editing fallback)
        if (!wpForInit.length) return;

        const teamTotals = {};
        wpForInit.forEach(wp => {
            (wp.impactedTeamAssignments || []).forEach(assign => {
                if (!assign.teamId) return;
                teamTotals[assign.teamId] = (teamTotals[assign.teamId] || 0) + (assign.sdeDays || 0);
            });
        });
        const initiative = (systemData.yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        if (!initiative) return;

        // Only overwrite if we actually found data
        if (Object.keys(teamTotals).length > 0) {
            initiative.assignments = Object.entries(teamTotals).map(([teamId, days]) => ({
                teamId,
                sdeYears: days / workingDaysPerYear
            }));
        }

        // Update rollup dates: earliest start, latest end across assignments/WPs
        const { startDate, endDate } = this.getInitiativeDateSpanFromWorkPackages(wpForInit, initiative);
        initiative.attributes = initiative.attributes || {};
        initiative.attributes.startDate = startDate;
        initiative.targetDueDate = endDate;
    },

    /**
     * Computes the earliest start and latest end date for an initiative based on its work packages.
     * @param {Array} workPackages 
     * @param {object} initiative 
     * @returns {object} { startDate, endDate }
     */
    getInitiativeDateSpanFromWorkPackages(workPackages, initiative) {
        const year = initiative?.attributes?.planningYear || new Date().getFullYear();
        const defaultStart = `${year}-01-15`;
        const defaultEnd = `${year}-11-01`;
        let earliest = null;
        let latest = null;
        workPackages.forEach(wp => {
            if (wp.startDate) {
                if (!earliest || wp.startDate < earliest) earliest = wp.startDate;
            }
            if (wp.endDate) {
                if (!latest || wp.endDate > latest) latest = wp.endDate;
            }
        });
        return {
            startDate: earliest || defaultStart,
            endDate: latest || defaultEnd
        };
    },

    /**
     * Pushes initiative-level assignment and dates down into work packages for consistency.
     * Used when top-down editing occurs.
     * @param {object} initiative 
     * @param {object} systemData 
     */
    syncWorkPackagesFromInitiative(initiative, systemData) {
        if (!initiative || !systemData) return;
        this.ensureWorkPackagesForInitiatives(systemData);
        // const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
        const wps = (systemData.workPackages || []).filter(wp => wp.initiativeId === initiative.initiativeId);

        // If only 1 WP, we sync everything to it
        if (wps.length === 1) {
            const wp = wps[0];
            wp.startDate = initiative.attributes?.startDate;
            wp.endDate = initiative.targetDueDate;
            // Sync total effort approx
            // This is tricky bi-directional sync; mostly we assume WPs drive Initiative total 
            // EXCEPT when the user manually edits the initiative total in the table.
        }
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkPackageService;
}
