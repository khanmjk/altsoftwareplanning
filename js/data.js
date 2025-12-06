// js/data.js

/** Define a unique key for local storage (internal to repository) **/
const LOCAL_STORAGE_KEY = 'architectureVisualization_systems_v11';
const APP_SETTINGS_KEY = 'architectureVisualization_appSettings_v1';



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
    return WorkPackageService.ensureWorkPackagesForInitiatives(systemData, yearFilter);
}

/**
 * Adds a new Work Package to a specific initiative.
 * @param {string} initiativeId 
 * @param {object} wpData - Optional overrides { title, startDate, endDate, status }
 */
function addWorkPackage(initiativeId, wpData = {}) {
    return WorkPackageService.addWorkPackage(currentSystemData, initiativeId, wpData);
}

/**
 * Recalculates Work Package dates based on its assignments (Tasks).
 * Enforces bottom-up rollup: WP Start = Min(Task Starts), WP End = Max(Task Ends).
 * @param {object} workPackage 
 */
function recalculateWorkPackageDates(workPackage) {
    return WorkPackageService.recalculateWorkPackageDates(workPackage);
}

/**
 * Updates an existing Work Package.
 * @param {string} workPackageId 
 * @param {object} updates 
 */
function updateWorkPackage(workPackageId, updates) {
    return WorkPackageService.updateWorkPackage(currentSystemData, workPackageId, updates);
}

/**
 * Deletes a Work Package.
 * @param {string} workPackageId 
 */
function deleteWorkPackage(workPackageId) {
    return WorkPackageService.deleteWorkPackage(currentSystemData, workPackageId);
}

/**
 * Recomputes initiative assignments bottom-up from work packages (impactedTeamAssignments).
 * Aggregates sdeDays -> sdeYears per team using workingDaysPerYear.
 */
function syncInitiativeTotals(initiativeId, systemData) {
    return WorkPackageService.syncInitiativeTotals(initiativeId, systemData);
}

function getInitiativeDateSpanFromWorkPackages(workPackages, initiative) {
    return WorkPackageService.getInitiativeDateSpanFromWorkPackages(workPackages, initiative);
}

/**
 * Pushes initiative-level assignment and dates down into work packages for consistency.
 * Used when top-down editing occurs.
 */
function syncWorkPackagesFromInitiative(initiative, systemData) {
    return WorkPackageService.syncWorkPackagesFromInitiative(initiative, systemData);
}

if (typeof window !== 'undefined') {
    window.ensureWorkPackagesForInitiatives = ensureWorkPackagesForInitiatives;
    window.syncInitiativeTotals = syncInitiativeTotals;
    window.getInitiativeDateSpanFromWorkPackages = getInitiativeDateSpanFromWorkPackages;
    window.syncWorkPackagesFromInitiative = syncWorkPackagesFromInitiative;
    window.addWorkPackage = addWorkPackage;
    window.updateWorkPackage = updateWorkPackage;
    window.recalculateWorkPackageDates = recalculateWorkPackageDates;
    window.deleteWorkPackage = deleteWorkPackage;
    // Storage key no longer exported; repository manages storage internally.
    window.APP_SETTINGS_KEY = APP_SETTINGS_KEY;
    window.Modes = Modes;
}
