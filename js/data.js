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
 */
function ensureWorkPackagesForInitiatives(systemData, yearFilter = null) {
    if (!systemData) return;
    if (!systemData.workPackages) systemData.workPackages = [];
    let createdCount = 0;
    const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
    const defaultStartForYear = (year) => `${year}-01-15`;
    const defaultEndForYear = (year) => `${year}-11-01`;

    (systemData.yearlyInitiatives || []).forEach(init => {
        if (yearFilter && `${init.attributes?.planningYear || ''}` !== `${yearFilter}`) return;
        init.workPackageIds = init.workPackageIds || [];
        
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
                // Add missing team assignments if initiative assignments exist
                const initAssignments = init.assignments || [];
                initAssignments.forEach(assign => {
                    if (!assign.teamId) return;
                    const already = (wp.impactedTeamAssignments || []).some(a => a.teamId === assign.teamId);
                    if (!already) {
                        wp.impactedTeamAssignments.push({
                            teamId: assign.teamId,
                            sdeDays: (assign.sdeYears || 0) * workingDaysPerYear,
                            startDate: wp.startDate || null,
                            endDate: wp.endDate || null
                        });
                    }
                });
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
}

/**
 * Adds a new Work Package to a specific initiative.
 * @param {string} initiativeId 
 * @param {object} wpData - Optional overrides { title, startDate, endDate, status }
 */
function addWorkPackage(initiativeId, wpData = {}) {
    if (!currentSystemData) return null;
    ensureWorkPackagesForInitiatives(currentSystemData); 

    const initiative = currentSystemData.yearlyInitiatives.find(i => i.initiativeId === initiativeId);
    if (!initiative) {
        console.error("Initiative not found:", initiativeId);
        return null;
    }

    const newWpId = `wp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const planningYear = initiative.attributes?.planningYear || new Date().getFullYear();
    
    // Default dates fallback to initiative dates
    const defaultStart = initiative.attributes?.startDate || `${planningYear}-01-15`;
    const defaultEnd = initiative.targetDueDate || `${planningYear}-11-01`;

    const impactedTeamAssignments = (initiative.assignments || []).map(assign => ({
        teamId: assign.teamId || null,
        sdeDays: (assign.sdeYears || 0) * (currentSystemData?.capacityConfiguration?.workingDaysPerYear || 261),
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

    currentSystemData.workPackages.push(newWp);
    
    if (!initiative.workPackageIds) initiative.workPackageIds = [];
    initiative.workPackageIds.push(newWpId);

    return newWp;
}

/**
 * Updates an existing Work Package.
 * @param {string} workPackageId 
 * @param {object} updates 
 */
function updateWorkPackage(workPackageId, updates) {
    if (!currentSystemData || !currentSystemData.workPackages) return null;
    const wp = currentSystemData.workPackages.find(w => w.workPackageId === workPackageId);
    if (!wp) return null;

    Object.assign(wp, updates);
    
    // If dates changed, trigger sync logic if necessary (omitted for MVP)
    return wp;
}

/**
 * Deletes a Work Package.
 * @param {string} workPackageId 
 */
function deleteWorkPackage(workPackageId) {
    if (!currentSystemData || !currentSystemData.workPackages) return false;
    
    const index = currentSystemData.workPackages.findIndex(w => w.workPackageId === workPackageId);
    if (index === -1) return false;

    const wp = currentSystemData.workPackages[index];
    currentSystemData.workPackages.splice(index, 1);

    // Remove reference from initiative
    const initiative = currentSystemData.yearlyInitiatives.find(i => i.initiativeId === wp.initiativeId);
    if (initiative && initiative.workPackageIds) {
        initiative.workPackageIds = initiative.workPackageIds.filter(id => id !== workPackageId);
    }

    return true;
}

/**
 * Recomputes initiative assignments bottom-up from work packages (impactedTeamAssignments).
 * Aggregates sdeDays -> sdeYears per team using workingDaysPerYear.
 */
function syncInitiativeTotals(initiativeId, systemData) {
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
}

/**
 * Pushes initiative-level assignment and dates down into work packages for consistency.
 * Used when top-down editing occurs.
 */
function syncWorkPackagesFromInitiative(initiative, systemData) {
    if (!initiative || !systemData) return;
    ensureWorkPackagesForInitiatives(systemData);
    const workingDaysPerYear = systemData.capacityConfiguration?.workingDaysPerYear || 261;
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

if (typeof window !== 'undefined') {
    window.ensureWorkPackagesForInitiatives = ensureWorkPackagesForInitiatives;
    window.syncInitiativeTotals = syncInitiativeTotals;
    window.getInitiativeDateSpanFromWorkPackages = getInitiativeDateSpanFromWorkPackages;
    window.syncWorkPackagesFromInitiative = syncWorkPackagesFromInitiative;
    window.addWorkPackage = addWorkPackage;
    window.updateWorkPackage = updateWorkPackage;
    window.deleteWorkPackage = deleteWorkPackage;
}
