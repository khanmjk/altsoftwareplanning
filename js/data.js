// js/data.js

/** Define a unique key for local storage **/
const LOCAL_STORAGE_KEY = 'architectureVisualization_systems_v10'; 
const APP_SETTINGS_KEY = 'architectureVisualization_appSettings_v1';

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

const Modes = {
    NAVIGATION: 'navigation',
    Browse: 'Browse',
    EDITING: 'editing',
    CREATING: 'creating',
    PLANNING: 'planning',
    ROADMAP: 'roadmap'
};

/**
 * Ensures work packages exist for all initiatives. Generates defaults from initiative assignments when missing.
 * - Creates a single auto work package per initiative if none exist.
 * - Populates impactedTeamAssignments with teamId, sdeDays, startDate, endDate.
 * - Populates deliveryPhases from STANDARD_WORK_PACKAGE_PHASES with placeholder dates/status.
 * - Links workPackageIds on the initiative.
 */
function ensureWorkPackagesForInitiatives(systemData, yearFilter = null) {
    if (!systemData) return;
    if (!systemData.workPackages) systemData.workPackages = [];
    let createdCount = 0;
    console.log(`[WORKPACKAGES] ensureWorkPackagesForInitiatives invoked${yearFilter ? ' for year ' + yearFilter : ''}. Existing work packages: ${(systemData.workPackages || []).length}`);
    const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
    const defaultStartForYear = (year) => `${year}-01-15`;
    const defaultEndForYear = (year) => `${year}-11-01`;

    (systemData.yearlyInitiatives || []).forEach(init => {
        if (yearFilter && `${init.attributes?.planningYear || ''}` !== `${yearFilter}`) return;
        init.workPackageIds = init.workPackageIds || [];
        const existing = (systemData.workPackages || []).filter(wp => wp.initiativeId === init.initiativeId);
        if (existing.length > 0) {
            // Backfill missing arrays on existing WPs
            existing.forEach(wp => {
                wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];
                wp.deliveryPhases = wp.deliveryPhases || STANDARD_WORK_PACKAGE_PHASES.map(phaseName => ({
                    id: `phase-${phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    name: phaseName,
                    startDate: wp.startDate || null,
                    endDate: wp.endDate || null,
                    status: 'Planned'
                }));
            });
            console.log(`[WORKPACKAGES] Initiative ${init.initiativeId} already has ${existing.length} work package(s); backfilled missing arrays.`);
            return;
        }

        const planningYear = init.attributes?.planningYear || new Date().getFullYear();
        const wpId = `wp-${init.initiativeId || Math.random().toString(36).slice(2)}`;
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
            title: init.title || wpId,
            impactedTeamAssignments,
            deliveryPhases,
            startDate: wpStart,
            endDate: wpEnd,
            status: init.status || 'Planned'
        };
        systemData.workPackages.push(newWp);
        if (!init.workPackageIds.includes(wpId)) {
            init.workPackageIds.push(wpId);
        }
        createdCount += 1;
        console.log(`[WORKPACKAGES] Created work package ${wpId} for initiative ${init.initiativeId} with ${impactedTeamAssignments.length} team assignment(s).`);
    });
    if (createdCount > 0) {
        console.log(`[WORKPACKAGES] Created ${createdCount} work package(s) from initiatives${yearFilter ? ' for year ' + yearFilter : ''}.`);
    } else {
        console.log('[WORKPACKAGES] No new work packages created (existing data present).');
    }
}

/**
 * Recomputes initiative assignments bottom-up from work packages (impactedTeamAssignments).
 * Aggregates sdeDays -> sdeYears per team using workingDaysPerYear.
 */
function syncInitiativeTotals(initiativeId, systemData) {
    if (!systemData || !initiativeId) return;
    const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
    const wpForInit = (systemData.workPackages || []).filter(wp => wp.initiativeId === initiativeId);
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
    initiative.assignments = Object.entries(teamTotals).map(([teamId, days]) => ({
        teamId,
        sdeYears: days / workingDaysPerYear
    }));
    console.log('[WORKPACKAGES] syncInitiativeTotals', initiativeId, 'assignments:', initiative.assignments);
    // Update rollup dates: earliest start, latest end across assignments
    const { startDate, endDate } = getInitiativeDateSpanFromWorkPackages(wpForInit, initiative);
    initiative.attributes = initiative.attributes || {};
    initiative.attributes.startDate = startDate;
    initiative.targetDueDate = endDate;
}

function getInitiativeDateSpanFromWorkPackages(workPackages, initiative) {
    const year = initiative?.attributes?.planningYear || new Date().getFullYear();
    const defaultStart = `${year}-01-15`;
    const defaultEnd = `${year}-11-01`;
    let earliest = null;
    let latest = null;
    workPackages.forEach(wp => {
        (wp.impactedTeamAssignments || []).forEach(assign => {
            if (assign.startDate) {
                if (!earliest || assign.startDate < earliest) earliest = assign.startDate;
            }
            if (assign.endDate) {
                if (!latest || assign.endDate > latest) latest = assign.endDate;
            }
        });
    });
    return {
        startDate: earliest || defaultStart,
        endDate: latest || defaultEnd
    };
}

if (typeof window !== 'undefined') {
    window.ensureWorkPackagesForInitiatives = ensureWorkPackagesForInitiatives;
    window.syncInitiativeTotals = syncInitiativeTotals;
    window.getInitiativeDateSpanFromWorkPackages = getInitiativeDateSpanFromWorkPackages;
}

/**
 * Pushes initiative-level assignment and dates down into work packages for consistency.
 */
function syncWorkPackagesFromInitiative(initiative, systemData) {
    if (!initiative || !systemData) return;
    ensureWorkPackagesForInitiatives(systemData);
    const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
    const wps = (systemData.workPackages || []).filter(wp => wp.initiativeId === initiative.initiativeId);
    wps.forEach(wp => {
        wp.impactedTeamAssignments = wp.impactedTeamAssignments || [];
        // Map existing assignments for quick lookup
        const byTeam = new Map((wp.impactedTeamAssignments || []).map(a => [a.teamId, a]));
        (initiative.assignments || []).forEach(assign => {
            const target = byTeam.get(assign.teamId);
            const sdeDays = (assign.sdeYears || 0) * workingDaysPerYear;
            if (target) {
                target.sdeDays = sdeDays;
                target.startDate = target.startDate || initiative.attributes?.startDate;
                target.endDate = target.endDate || initiative.targetDueDate;
            } else {
                wp.impactedTeamAssignments.push({
                    teamId: assign.teamId,
                    sdeDays,
                    startDate: initiative.attributes?.startDate,
                    endDate: initiative.targetDueDate
                });
            }
        });
        // Update WP level dates as rollup from assignments
        const span = getInitiativeDateSpanFromWorkPackages([wp], initiative);
        wp.startDate = span.startDate;
        wp.endDate = span.endDate;
    });
}

if (typeof window !== 'undefined') {
    window.syncWorkPackagesFromInitiative = syncWorkPackagesFromInitiative;
}
