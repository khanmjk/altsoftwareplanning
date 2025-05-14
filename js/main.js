/* global variables */

let currentSystemData = null;
let newServiceData = {};
let uniqueEngineers = []; // This might be fully replaced by usage of allKnownEngineers

let currentMode = Modes.NAVIGATION;
let planningCapacityScenario = 'effective'; // Default to 'effective'
let currentCapacityScenario = 'EffectiveBIS'; // Default scenario for capacity summary ('TeamBIS', 'EffectiveBIS', 'FundedHC')
let currentChartTeamId = '__ORG_VIEW__'; // To track which team's chart is displayed
let capacityChartInstance = null; // To hold the Chart.js instance
let applyCapacityConstraintsToggle = false; // Default to OFF

// --- Carousel State ---
let currentVisualizationIndex = 0;
const visualizationItems = [
    { id: 'visualization', title: 'System Visualization' },
    { id: 'teamVisualization', title: 'Team Relationships Visualization' },
    { id: 'serviceRelationshipsVisualization', title: 'Service Relationships Visualization' },
    { id: 'dependencyVisualization', title: 'Service Dependency Visualization' }
];
// ----------------------

// ========= SDM Resource Forecasting Tool Code (Lift & Shift - Phase 1) =========
let totalRampedUpEngineersArray_SDM = [];
let productiveEngineers_SDM = [];
let cumulativeAttritionArray_SDM = [];
let monthlyData_SDM = {};
let totalHeadcountArray_SDM = [];
let forecastChart_SDM = null;

const weekToMonth_SDM = [
    1,1,1,1,    // Jan (4 weeks) Weeks 1-4
    2,2,2,2,    // Feb (4 weeks) Weeks 5-8
    3,3,3,3,3,  // Mar (5 weeks) Weeks 9-13
    4,4,4,4,    // Apr (4 weeks) Weeks 14-17
    5,5,5,5,    // May (4 weeks) Weeks 18-21
    6,6,6,6,6,  // Jun (5 weeks) Weeks 22-26
    7,7,7,7,    // Jul (4 weeks) Weeks 27-30
    8,8,8,8,    // Aug (4 weeks) Weeks 31-34
    9,9,9,9,9,  // Sep (5 weeks) Weeks 35-39
    10,10,10,10, // Oct (4 weeks) Weeks 40-43
    11,11,11,11, // Nov (4 weeks) Weeks 44-47
    12,12,12,12,12 // Dec (5 weeks) Weeks 48-52
];
// --- End SDM Forecasting Tool Globals ---

// --- Documentation Resizing Logic ---
let isDocumentationResizing = false;
let lastMouseY = 0;
let originalDocumentationHeight = 0;

// Global state for engineer table sorting
let engineerSortState = { key: 'name', ascending: true };

// For Planning Table Drag & Drop
let draggedInitiativeId = null;
let draggedRowElement = null;

// Store temporary assignments before adding initiative
let tempAssignments = [];

// --- Trigger Top Bar Animation ---
document.addEventListener('DOMContentLoaded', function() {
    const topBar = document.getElementById('topBar');
    console.debug("DOMContentLoaded event triggered for animation. Top bar element:", topBar);
    if (topBar) {
        setTimeout(() => {
            topBar.classList.add('top-bar-loaded');
            console.debug("Added .top-bar-loaded class to #topBar to trigger animation.");
        }, 150);
    } else {
        console.error("ANIMATION ERROR: #topBar element not found in DOMContentLoaded.");
    }
});

window.onload = function() {
    console.log("!!! window.onload: Page HTML and synchronous scripts loaded. !!!");
    currentMode = Modes.NAVIGATION;

    const docHeader = document.getElementById('documentationHeader');
    const docResizeHandle = document.getElementById('docResizeHandle');

    if (docHeader) {
        docHeader.addEventListener('click', () => {
            toggleCollapsibleSection('documentationContent', 'documentationToggleIndicator', 'docResizeHandle');
        });
        console.log("Attached toggle listener to documentation header.");
    } else {
        console.warn("Documentation header not found in window.onload.");
    }

    if (docResizeHandle) {
        docResizeHandle.addEventListener('mousedown', startDocumentationResize);
        console.log("Attached mousedown listener to docResizeHandle.");
    } else {
        console.warn("Documentation resize handle not found in window.onload.");
    }

    // Save sample systems if none exist
    saveSampleSystemsToLocalStorage(); // Moved here to ensure it runs before potential initial switchView

    setTimeout(() => {
        console.log("Attempting initial switchView(null) after short delay.");
        switchView(null);
    }, 500);
};

/**
 * REVISED (v10 - Fixed console.log_debug and View Transitions)
 * Central function to manage switching between main views.
 */
function switchView(targetViewId, newMode = null) {
    console.log(`Switching view to: ${targetViewId || 'Home'}, Mode: ${newMode || 'Auto'}`);

    const allViewIds = [
        'systemEditForm', 'visualizationCarousel', 'serviceDependenciesTable',
        'organogramView', 'engineerTableView', 'planningView',
        'capacityConfigView', 'sdmForecastingView', 'toolDocumentationSection'
    ];
    const documentationSection = document.getElementById('toolDocumentationSection');

    const updateDOMForViewChange = () => {
        allViewIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'serviceDependenciesTable' && targetViewId === 'visualizationCarousel') {
                    // Visibility managed by showVisualization()
                } else {
                    element.style.display = 'none';
                }
            }
        });

        const pageTitleH1 = document.getElementById('pageTitle');
        const systemDescP = document.getElementById('systemDescription');
        const editMenu = document.querySelector('.edit-menu');
        const mainMenu = document.querySelector('.menu');
        const returnHomeBtn = document.getElementById('returnHomeButton');
        const backButton = document.getElementById('backToSystemViewButton');

        if (targetViewId) {
            currentMode = newMode || Modes.BROWSE;
            const targetElement = document.getElementById(targetViewId);
            if (targetElement) {
                targetElement.style.display = 'block';
            } else {
                console.error(`switchView: Target element with ID '${targetViewId}' not found! Attempting to return home.`);
                if (targetViewId !== null && typeof returnToHome === 'function') {
                    returnToHome();
                    return; // Exit current execution
                }
            }

            if (pageTitleH1 && currentSystemData) {
                let titleSuffix = '';
                if (targetViewId === 'planningView') titleSuffix = ' - Year Plan';
                else if (targetViewId === 'organogramView') titleSuffix = ' - Organization Overview';
                else if (targetViewId === 'engineerTableView') titleSuffix = ' - Engineer List';
                else if (targetViewId === 'systemEditForm') titleSuffix = ' - Edit System';
                else if (targetViewId === 'visualizationCarousel') titleSuffix = ' - Overview';
                else if (targetViewId === 'capacityConfigView') titleSuffix = ' - Capacity Constraints';
                else if (targetViewId === 'sdmForecastingView') titleSuffix = ' - SDM Resource Forecasting Model';
                pageTitleH1.innerText = `${currentSystemData.systemName || 'System'}${titleSuffix}`;
                pageTitleH1.style.display = 'block';
            } else if (pageTitleH1) {
                 pageTitleH1.style.display = 'none';
            }

            if (systemDescP) {
                 const isOverview = (targetViewId === 'visualizationCarousel');
                 systemDescP.style.display = isOverview ? 'block' : 'none';
                 if(systemDescP.style.display === 'block' && currentSystemData) {
                    systemDescP.innerText = currentSystemData.systemDescription || '';
                 }
            }

            if (mainMenu) mainMenu.style.display = 'none';
            if (editMenu) {
                const isOverview = (targetViewId === 'visualizationCarousel');
                editMenu.style.display = isOverview ? 'block' : 'none';
            }
            if (returnHomeBtn) returnHomeBtn.style.display = 'block';
            const isOverviewForBackButton = (targetViewId === 'visualizationCarousel');
            if (backButton) {
                 backButton.style.display = isOverviewForBackButton ? 'none' : 'block';
            }

        } else { // Showing the Home Screen
            currentMode = Modes.NAVIGATION;
            currentSystemData = null;
            if (pageTitleH1) { pageTitleH1.innerText = "Software Management Tools"; pageTitleH1.style.display = 'block'; }
            if (systemDescP) { systemDescP.innerText = "Load a previously saved system or create a new software system"; systemDescP.style.display = 'block';}
            if (mainMenu) mainMenu.style.display = 'block';
            if (editMenu) editMenu.style.display = 'none';
            if (returnHomeBtn) returnHomeBtn.style.display = 'none';
            if (backButton) backButton.style.display = 'none';

            if (documentationSection) {
                documentationSection.style.display = 'block';
                const docContent = document.getElementById('documentationContent');
                if (docContent) {
                    const currentHTML = docContent.innerHTML.trim().toLowerCase();
                    const needsLoading = currentHTML.includes("<em>loading documentation...") ||
                                       currentHTML.includes("<em>attempting to load documentation...") ||
                                       currentHTML.includes("<em>waiting for help components...") ||
                                       currentHTML === "";
                    if (needsLoading && typeof loadAndDisplayDocumentation === 'function') {
                        console.log("switchView (home): Conditions met to call loadAndDisplayDocumentation.");
                        loadAndDisplayDocumentation();
                    } else if (typeof loadAndDisplayDocumentation !== 'function') {
                        console.warn("switchView (home): loadAndDisplayDocumentation function is not defined.");
                    } else {
                        console.log("switchView (home): Documentation content not in initial state or already loaded. Not re-fetching.");
                    }
                }
            }

            const systemListDiv = document.getElementById('systemLoadListDiv');
            if (systemListDiv && systemListDiv.parentNode) document.body.removeChild(systemListDiv);
            const systemDeleteListDiv = document.getElementById('systemDeleteListDiv');
            if (systemDeleteListDiv && systemDeleteListDiv.parentNode) document.body.removeChild(systemDeleteListDiv);

            if (typeof d3 !== 'undefined' && typeof d3.selectAll === 'function') {
                d3.selectAll('.tooltip').remove();
            } else {
                console.warn("switchView (home): d3 or d3.selectAll is not available to remove tooltips.");
            }
        }
    };

    if (!document.startViewTransition) {
        console.warn("View Transitions API not supported by this browser. Switching view directly.");
        updateDOMForViewChange();
        if (targetViewId === 'visualizationCarousel' && typeof showVisualization === 'function') {
            showVisualization(0);
        }
        if (targetViewId === 'planningView' && typeof adjustPlanningTableHeight === 'function') {
            const planningTableContainer = document.getElementById('planningTableContainer');
            if (planningTableContainer && planningTableContainer.offsetParent !== null) {
                 adjustPlanningTableHeight();
            }
        }
        console.log(`View switched directly. Current mode: ${currentMode}`);
        return;
    }

    const transition = document.startViewTransition(updateDOMForViewChange);

    transition.ready.then(() => {
        console.debug("View transition ready (pseudo-elements created, animation about to start).");
    }).catch(err => {
        console.error("View transition 'ready' phase error:", err);
    });

    transition.finished.then(() => {
        console.debug("View transition finished.");
        if (targetViewId === 'visualizationCarousel' && typeof showVisualization === 'function') {
            showVisualization(0);
        }
        if (targetViewId === 'planningView' && typeof adjustPlanningTableHeight === 'function') {
            const planningTableContainer = document.getElementById('planningTableContainer');
            if (planningTableContainer && planningTableContainer.offsetParent !== null) {
                 adjustPlanningTableHeight();
            }
        }
    }).catch(err => {
        console.error("View transition 'finished' phase error:", err);
    });

    console.log(`View switched (attempted with transition). Current mode: ${currentMode}`);
}


/**
 * Shows the visualization item at the specified index and hides others.
 */
 function showVisualization(index) {
    const carouselContainer = document.getElementById('visualizationCarousel');
    if (!carouselContainer) {
        console.error("Carousel container #visualizationCarousel not found.");
        return;
    }
    const items = carouselContainer.querySelectorAll('.carousel-item');
    const titleElement = document.getElementById('visualizationTitle');
    const serviceDepsTableDiv = document.getElementById('serviceDependenciesTable');

    if (index < 0 || index >= items.length || items.length === 0) {
        console.error("Invalid visualization index or no items:", index);
        items.forEach(item => item.style.display = 'none');
        if (titleElement) titleElement.textContent = 'No Visualization';
        if (serviceDepsTableDiv) serviceDepsTableDiv.style.display = 'none';
        return;
    }

    items.forEach(item => {
        item.style.display = 'none';
        item.classList.remove('active');
    });

    if (serviceDepsTableDiv) serviceDepsTableDiv.style.display = 'none';

    const targetItemId = visualizationItems[index]?.id;
    const targetItem = targetItemId ? document.getElementById(targetItemId) : null;

    if (targetItem) {
        targetItem.style.display = 'block';
        targetItem.classList.add('active');
        if (titleElement) titleElement.textContent = visualizationItems[index].title;

        if (targetItemId === 'dependencyVisualization' && serviceDepsTableDiv) {
            serviceDepsTableDiv.style.display = 'block';
        }

        // Call regenerate functions only if the specific view is now active and data is loaded
        if (currentSystemData) {
            switch (targetItemId) {
                case 'visualization':
                    if (typeof generateVisualization === 'function') generateVisualization(currentSystemData);
                    break;
                case 'teamVisualization':
                    if (typeof generateTeamVisualization === 'function') generateTeamVisualization(currentSystemData);
                    break;
                case 'serviceRelationshipsVisualization':
                    if (typeof populateServiceSelection === 'function') populateServiceSelection();
                    if (typeof updateServiceVisualization === 'function') updateServiceVisualization();
                    break;
                case 'dependencyVisualization':
                    if (typeof populateDependencyServiceSelection === 'function') populateDependencyServiceSelection();
                    if (typeof updateDependencyVisualization === 'function') updateDependencyVisualization();
                    if (typeof generateServiceDependenciesTable === 'function' && serviceDepsTableDiv.style.display === 'block') {
                        generateServiceDependenciesTable();
                    }
                    break;
            }
        }
        console.log(`Showing visualization: ${visualizationItems[index].title}`);
    } else {
        console.error("Target visualization element not found for ID:", targetItemId);
        if (titleElement) titleElement.textContent = 'Error';
    }
    currentVisualizationIndex = index;
}

/**
 * Navigates the visualization carousel.
 */
function navigateVisualizations(direction) {
    let newIndex = currentVisualizationIndex + direction;
    const totalItems = visualizationItems.length;
    if (newIndex >= totalItems) newIndex = 0;
    else if (newIndex < 0) newIndex = totalItems - 1;
    showVisualization(newIndex);
}

/**
 * Toggles collapsible sections.
 */
function toggleCollapsibleSection(contentId, indicatorId, handleId = null) {
    console.log(`toggleCollapsibleSection called with contentId: '${contentId}', indicatorId: '${indicatorId}', handleId: '${handleId}'`);
    const contentDiv = document.getElementById(contentId);
    const indicatorSpan = document.getElementById(indicatorId);
    const handleDiv = handleId ? document.getElementById(handleId) : null;

    if (!contentDiv || !indicatorSpan) {
        console.error(`Cannot toggle section: Missing content or indicator. ContentID: '${contentId}', IndicatorID: '${indicatorId}'`);
        return;
    }
    const isHidden = contentDiv.style.display === 'none' || contentDiv.style.display === '';
    contentDiv.style.display = isHidden ? 'block' : 'none';
    indicatorSpan.textContent = isHidden ? '(-)' : '(+)';
    if (handleDiv) handleDiv.style.display = isHidden ? 'block' : 'none';

    if (document.getElementById('planningView').style.display !== 'none' &&
        (contentId === 'teamLoadSummaryContent' || contentId === 'addInitiativeContent') &&
        typeof adjustPlanningTableHeight === 'function') {
        adjustPlanningTableHeight();
    }
    console.log(`Toggled section ${contentId} to ${isHidden ? 'visible' : 'hidden'}`);
}

/** Save Sample Systems to Local Storage if not already present **/
function saveSampleSystemsToLocalStorage() {
    if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        // Ensure sampleSystemDataStreamView and sampleSystemDataContactCenter are defined (from data.js)
        if (typeof sampleSystemDataStreamView !== 'undefined' && typeof sampleSystemDataContactCenter !== 'undefined') {
            const systems = {
                'StreamView': sampleSystemDataStreamView,
                'ConnectPro': sampleSystemDataContactCenter
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));
            console.log("Saved sample systems to local storage.");
        } else {
            console.error("Sample system data is not defined. Cannot save to local storage.");
        }
    }
}

/** Show Saved Systems Modal **/
function showSavedSystems() {
    console.log("Showing saved systems list...");
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const systemNames = Object.keys(systems);

    if (systemNames.length === 0) {
        alert('No saved systems found.');
        return;
    }

    const existingLoadListDiv = document.getElementById('systemLoadListDiv');
    if (existingLoadListDiv) document.body.removeChild(existingLoadListDiv);
    const existingDeleteListDiv = document.getElementById('systemDeleteListDiv');
    if (existingDeleteListDiv) document.body.removeChild(existingDeleteListDiv);

    let systemListDiv = document.createElement('div');
    systemListDiv.id = 'systemLoadListDiv';
    let systemListHtml = '<h2>Select a System to Load</h2><ul>';
    systemNames.forEach(systemName => {
        systemListHtml += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>${systemName}</span>
                <button onclick="loadSavedSystem('${systemName}')" style="margin-left: 15px; padding: 3px 8px; font-size: 0.9em;">Load</button>
            </li>`;
    });
    systemListHtml += '</ul>';
    systemListDiv.innerHTML = systemListHtml;

    let closeButton = document.createElement('button');
    closeButton.innerText = 'Cancel';
    closeButton.style.marginTop = '15px';
    closeButton.onclick = function() {
        if (systemListDiv.parentNode === document.body) {
             document.body.removeChild(systemListDiv);
        }
    };
    systemListDiv.appendChild(closeButton);
    Object.assign(systemListDiv.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '20px', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: '1001', maxHeight: '80vh', overflowY: 'auto', minWidth: '300px' });
    document.body.appendChild(systemListDiv);
}
window.showSavedSystems = showSavedSystems;


/** Load Saved System - MODIFIED for new Engineer Data Model **/
function loadSavedSystem(systemName) {
    console.log(`Attempting to load system: ${systemName}`);
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const systemData = systems[systemName];

    if (!systemData) {
        alert('System not found.');
        console.error(`System "${systemName}" not found in localStorage.`);
        return;
    }
    currentSystemData = JSON.parse(JSON.stringify(systemData)); // Deep copy
    console.log('Selected system to load (raw):', currentSystemData);

    // --- Normalize/Initialize allKnownEngineers & their attributes ---
    let engineersWereProcessed = false;
    if (!currentSystemData.allKnownEngineers || !Array.isArray(currentSystemData.allKnownEngineers) || currentSystemData.allKnownEngineers.length === 0) {
        console.warn(`Initializing 'allKnownEngineers' for system: ${currentSystemData.systemName} from team.engineers array (older data format or empty list).`);
        currentSystemData.allKnownEngineers = [];
        const engineerMap = new Map();

        (currentSystemData.teams || []).forEach(team => {
            (team.engineers || []).forEach(engineerObj => { // Expecting {name, level} objects
                if (engineerObj && typeof engineerObj.name === 'string') {
                    const engineerNameLower = engineerObj.name.toLowerCase();
                    if (!engineerMap.has(engineerNameLower)) {
                        engineerMap.set(engineerNameLower, {
                            name: engineerObj.name,
                            level: engineerObj.level || 1,
                            currentTeamId: team.teamId,
                            attributes: {
                                isAISWE: false,
                                aiAgentType: null,
                                skills: [],
                                yearsOfExperience: 0
                            }
                        });
                    } else {
                        const existing = engineerMap.get(engineerNameLower);
                        if (!existing.currentTeamId && team.teamId) { // If unassigned, assign to this team
                            existing.currentTeamId = team.teamId;
                        }
                        // Ensure attributes exist if somehow missed (e.g. multiple listings in old data)
                        if (!existing.attributes) {
                             existing.attributes = { isAISWE: false, aiAgentType: null, skills: [], yearsOfExperience: 0 };
                        }
                    }
                } else {
                    console.warn("Skipping invalid engineer object in team:", team.teamId, engineerObj);
                }
            });
        });
        currentSystemData.allKnownEngineers = Array.from(engineerMap.values());
        engineersWereProcessed = true;
        console.log("'allKnownEngineers' array created/populated from team data:", currentSystemData.allKnownEngineers.length, "engineers found.");
    } else {
        console.log("'allKnownEngineers' array exists. Verifying attributes field for each engineer...");
        currentSystemData.allKnownEngineers.forEach(engineer => {
            if (typeof engineer.attributes !== 'object' || engineer.attributes === null) {
                engineer.attributes = {};
                engineersWereProcessed = true;
            }
            if (typeof engineer.attributes.isAISWE === 'undefined') engineer.attributes.isAISWE = false;
            if (typeof engineer.attributes.aiAgentType === 'undefined') engineer.attributes.aiAgentType = null;
            if (!Array.isArray(engineer.attributes.skills)) engineer.attributes.skills = [];
            if (typeof engineer.attributes.yearsOfExperience === 'undefined') engineer.attributes.yearsOfExperience = 0;
        });
        if (engineersWereProcessed) console.log("Default attributes applied to existing engineers where missing.");
    }

    // --- Normalize team.engineers to be an array of names ---
    let teamsModifiedForEngineerNames = false;
    (currentSystemData.teams || []).forEach(team => {
        if (team.engineers && Array.isArray(team.engineers) && team.engineers.length > 0 && typeof team.engineers[0] === 'object') {
            // If engineers are still objects {name, level}, convert to names
            team.engineers = team.engineers.map(engObj => engObj.name).filter(name => typeof name === 'string');
            teamsModifiedForEngineerNames = true;
        } else if (!Array.isArray(team.engineers)) {
            team.engineers = []; // Ensure it's an array if it was something else
            teamsModifiedForEngineerNames = true;
        }
    });
    if (teamsModifiedForEngineerNames) console.log("Normalized team.engineers to be arrays of names.");

    // --- Remove System Load List Popup ---
    const systemLoadListDiv = document.getElementById('systemLoadListDiv');
    if (systemLoadListDiv && systemLoadListDiv.parentNode) {
      document.body.removeChild(systemLoadListDiv);
    }

    // --- Clear previous visualization content ---
    if (typeof d3 !== 'undefined' && d3.selectAll) d3.selectAll('.tooltip').remove();
    ['legend', 'teamLegend', 'serviceLegend', 'dependencyLegend'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '';
    });

    if (typeof buildGlobalPlatformDependencies === 'function') buildGlobalPlatformDependencies();

    switchView('visualizationCarousel'); // Switch to the overview/carousel

    // Regenerate content - ensure functions are defined before calling
    try {
        if (typeof populateServiceSelection === 'function') populateServiceSelection();
        if (typeof populateDependencyServiceSelection === 'function') populateDependencyServiceSelection();
        // Visualizations are now triggered by showVisualization after switchView completes
        // generateVisualization(currentSystemData);
        // generateTeamVisualization(currentSystemData);
        if (typeof generateServiceDependenciesTable === 'function') generateServiceDependenciesTable();
        // showVisualization(0); // This is now called in switchView's transition.finished
        console.log("Finished loading and preparing display for system:", currentSystemData.systemName);
    } catch (error) {
        console.error("Error regenerating system overview content during load:", error);
        const carouselDiv = document.getElementById('visualizationCarousel');
        if(carouselDiv) carouselDiv.innerHTML = '<p style="color:red">Error loading visualizations.</p>';
    }
}
window.loadSavedSystem = loadSavedSystem;

/** Build global list of platform dependencies **/
function buildGlobalPlatformDependencies() {
    if (!currentSystemData || !currentSystemData.services) return;
    const platformDepsSet = new Set();
    currentSystemData.services.forEach(service => {
        (service.platformDependencies || []).forEach(dep => platformDepsSet.add(dep));
    });
    currentSystemData.platformDependencies = Array.from(platformDepsSet);
}

/** Create New Software System - MODIFIED for new Engineer Data Model **/
function createNewSystem() {
    currentMode = Modes.CREATING;

    const defaultSeniorManagersData = [ { seniorManagerId: 'srMgr1', seniorManagerName: 'Enter Sr. Manager Name Here' } ];
    const defaultSDMsData = [ { sdmId: 'sdm1', sdmName: 'Enter SDM Name Here', seniorManagerId: 'srMgr1' } ];
    const defaultPMTsData = [ { pmtId: 'pmt1', pmtName: 'Enter PMT Name Here' } ];

    // Define default engineers with new attributes structure
    const defaultEngineer1_details = {
        name: 'Default Engineer Alpha', level: 2, currentTeamId: 'team1',
        attributes: { isAISWE: false, aiAgentType: null, skills: ['Core Programming', 'Problem Solving'], yearsOfExperience: 1 }
    };
    const defaultEngineer2_details = {
        name: 'Default Engineer Beta', level: 3, currentTeamId: 'team1',
        attributes: { isAISWE: false, aiAgentType: null, skills: ['System Basics', 'Debugging'], yearsOfExperience: 2 }
    };
    const defaultAIEngineer_details = {
        name: 'AI-Helper-01', level: 2, currentTeamId: 'team1',
        attributes: { isAISWE: true, aiAgentType: "Documentation Assistant", skills: ["NLP", "Markdown"], yearsOfExperience: null }
    };

    const defaultAllKnownEngineers = [
        defaultEngineer1_details,
        defaultEngineer2_details,
        defaultAIEngineer_details
    ];

    const defaultTeamsData = [{
        teamId: 'team1', teamName: 'Enter Team Name Here', teamIdentity: 'Enter Team Identity Here',
        teamDescription: 'Enter Team Description Here...', fundedHeadcount: 3,
        engineers: [ defaultEngineer1_details.name, defaultEngineer2_details.name, defaultAIEngineer_details.name ], // Array of names
        awayTeamMembers: [], sdmId: 'sdm1', pmtId: 'pmt1',
        teamCapacityAdjustments: { leaveUptakeEstimates: [], variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0 }
    }];

    const defaultServicesData = [{
        serviceName: 'Enter Service Name Here', serviceDescription: 'Enter Service Description Here...',
        owningTeamId: 'team1',
        apis: [ { apiName: 'Enter API Name Here', apiDescription: 'Enter API Description Here...', dependentApis: [] } ],
        serviceDependencies: [], platformDependencies: []
    }];

    currentSystemData = {
        systemName: '', systemDescription: '',
        seniorManagers: defaultSeniorManagersData, sdms: defaultSDMsData, pmts: defaultPMTsData,
        teams: defaultTeamsData, services: defaultServicesData,
        platformDependencies: [],
        allKnownEngineers: defaultAllKnownEngineers, // Use the new detailed list
        capacityConfiguration: {
            workingDaysPerYear: 261, standardHoursPerDay: 8,
            globalConstraints: { publicHolidays: 10, orgEvents: [] },
            leaveTypes: [
                { id: "annual", name: "Annual Leave", defaultEstimatedDays: 20 },
                { id: "sick", name: "Sick Leave", defaultEstimatedDays: 10 },
                { id: "study", name: "Study Leave", defaultEstimatedDays: 5 },
                { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0 }
            ]
        },
        yearlyInitiatives: [],
        calculatedCapacityMetrics: null
    };
    if (typeof enterEditMode === 'function') enterEditMode(true);
}
window.createNewSystem = createNewSystem;


/** Return to Home **/
function returnToHome() {
    console.log("Returning to home view (Clearing System)...");
    switchView(null); // Passing null shows the home screen and resets state
}
window.returnToHome = returnToHome;

/** Reset to Default Sample Systems **/
function resetToDefaults() {
    if (confirm('This will erase all your saved systems and restore the default sample systems. Do you want to proceed?')) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        saveSampleSystemsToLocalStorage(); // This will re-add the defaults
        alert('Systems have been reset to defaults.');
        returnToHome();
    }
}
window.resetToDefaults = resetToDefaults;

/** Delete System (logic to prompt user) **/
function deleteSystem() {
    console.log("Initiating system deletion process...");
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const systemNames = Object.keys(systems);

    if (systemNames.length === 0) {
        alert('No saved systems found to delete.');
        return;
    }

    const existingListDiv = document.getElementById('systemDeleteListDiv');
    if (existingListDiv && existingListDiv.parentNode) {
        document.body.removeChild(existingListDiv);
    }
    const existingLoadListDiv = document.getElementById('systemLoadListDiv');
     if (existingLoadListDiv && existingLoadListDiv.parentNode) { // Also remove load list if open
        document.body.removeChild(existingLoadListDiv);
    }


    let systemListDiv = document.createElement('div');
    systemListDiv.id = 'systemDeleteListDiv';
    let systemListHtml = '<h2>Select a System to Delete</h2><ul>';
    systemNames.forEach(systemName => {
        systemListHtml += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>${systemName}</span>
                <button onclick="confirmAndDeleteSystem('${systemName}')" style="margin-left: 15px; padding: 3px 8px; font-size: 0.9em;" class="btn-danger">Delete</button>
            </li>`;
    });
    systemListHtml += '</ul>';
    systemListDiv.innerHTML = systemListHtml;

    let closeButton = document.createElement('button');
    closeButton.innerText = 'Cancel';
    closeButton.style.marginTop = '15px';
    closeButton.onclick = function() {
         if (systemListDiv.parentNode === document.body) {
             document.body.removeChild(systemListDiv);
        }
    };
    systemListDiv.appendChild(closeButton);
    Object.assign(systemListDiv.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '20px', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: '1001', maxHeight: '80vh', overflowY: 'auto', minWidth: '300px' });
    document.body.appendChild(systemListDiv);
}
window.deleteSystem = deleteSystem;

/** Confirms and deletes the specified system from localStorage **/
function confirmAndDeleteSystem(systemName) {
    if (!systemName) {
        console.error("confirmAndDeleteSystem called without systemName.");
        return;
    }
    if (confirm(`Are you sure you want to permanently delete the system "${systemName}"? This action cannot be undone.`)) {
        try {
            const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            if (systems[systemName]) {
                delete systems[systemName];
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));
                alert(`System "${systemName}" has been deleted.`);
                const listDiv = document.getElementById('systemDeleteListDiv');
                if (listDiv && listDiv.parentNode) document.body.removeChild(listDiv);
                if (currentSystemData && currentSystemData.systemName === systemName) {
                    returnToHome();
                }
            } else {
                alert(`Error: System "${systemName}" could not be found for deletion.`);
                const listDiv = document.getElementById('systemDeleteListDiv');
                if (listDiv && listDiv.parentNode) {
                    document.body.removeChild(listDiv);
                    deleteSystem(); // Re-show the updated list
                }
            }
        } catch (error) {
            console.error("Error deleting system from local storage:", error);
            alert("An error occurred while deleting the system.");
        }
    }
}
window.confirmAndDeleteSystem = confirmAndDeleteSystem;

/** Validation function to check engineer assignments (placeholder for now with new model) **/
function validateEngineerAssignments() {
    if (!currentSystemData || !currentSystemData.teams || !currentSystemData.allKnownEngineers) {
        console.warn("Validation skipped: Missing teams or allKnownEngineers data.");
        return true;
    }

    let isValid = true;
    let errorMessages = [];
    const engineerTeamMap = new Map(); // Tracks primary team assignment for each engineer from allKnownEngineers

    // Populate map from allKnownEngineers
    currentSystemData.allKnownEngineers.forEach(eng => {
        if (eng.name && eng.currentTeamId) {
            if (engineerTeamMap.has(eng.name) && engineerTeamMap.get(eng.name) !== eng.currentTeamId) {
                // This indicates an issue in allKnownEngineers itself, a name mapped to multiple currentTeamIds
                isValid = false;
                errorMessages.push(`Data integrity issue: Engineer "${eng.name}" listed with multiple different primary teams in allKnownEngineers.`);
            }
            engineerTeamMap.set(eng.name, eng.currentTeamId);
        } else if (eng.name && !eng.currentTeamId) {
            engineerTeamMap.set(eng.name, null); // Engineer exists but is unassigned
        }
    });

    // Check consistency between team.engineers and allKnownEngineers.currentTeamId
    currentSystemData.teams.forEach(team => {
        if (!team || !team.teamId || !Array.isArray(team.engineers)) return;

        team.engineers.forEach(engineerName => {
            if (typeof engineerName !== 'string') {
                isValid = false;
                errorMessages.push(`Invalid engineer entry in team "${team.teamIdentity || team.teamId}": not a string.`);
                return;
            }
            const knownEngineer = currentSystemData.allKnownEngineers.find(ke => ke.name === engineerName);
            if (!knownEngineer) {
                isValid = false;
                errorMessages.push(`Engineer "${engineerName}" listed in team "${team.teamIdentity || team.teamId}" but not found in the global engineer roster (allKnownEngineers).`);
            } else if (knownEngineer.currentTeamId !== team.teamId) {
                isValid = false;
                const assignedToTeam = knownEngineer.currentTeamId ?
                    (currentSystemData.teams.find(t => t.teamId === knownEngineer.currentTeamId)?.teamIdentity || knownEngineer.currentTeamId)
                    : "unassigned";
                errorMessages.push(`Data inconsistency: Engineer "${engineerName}" is in team "${team.teamIdentity || team.teamId}"'s list, but their global record assigns them to "${assignedToTeam}".`);
            }
        });
    });

    if (!isValid) {
        alert("Validation Error: Cannot save changes due to data inconsistencies.\n\n" + errorMessages.join("\n") + "\n\nPlease review team assignments and engineer records.");
    }
    return isValid;
}


/** Save System Changes (Placeholder - full save logic in saveAllChanges) **/
function saveSystemChanges() {
    // This function is now primarily a wrapper if called from simple contexts.
    // The main save logic including validation is in saveAllChanges or specific save buttons.
    console.log("saveSystemChanges called. Persisting currentSystemData.");

    if (!currentSystemData || !currentSystemData.systemName) {
        alert('System name cannot be empty if trying to save.');
        // Attempt to get it from input if in edit mode, though this function shouldn't rely on UI state.
        const systemNameInput = document.getElementById('systemNameInput');
        if (systemNameInput && systemNameInput.value.trim()) {
            currentSystemData.systemName = systemNameInput.value.trim();
        } else {
            console.error("Cannot save: System name is missing in currentSystemData.");
            return false; // Indicate failure
        }
    }
     // Ensure description is also up-to-date if possible (less critical than name)
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');
    if (systemDescriptionTextarea && currentSystemData) {
        currentSystemData.systemDescription = systemDescriptionTextarea.value.trim();
    }


    // It's better if validation is called by the function initiating the save (e.g., saveAllChanges)
    // However, as a safeguard:
    if (typeof validateEngineerAssignments === "function" && !validateEngineerAssignments()) {
        console.error("Validation failed in saveSystemChanges. Aborting save.");
        return false; // Indicate failure
    }

    try {
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        systems[currentSystemData.systemName] = currentSystemData;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));
        console.log('System changes saved to local storage via saveSystemChanges.');
        return true; // Indicate success
    } catch (error) {
        console.error("Error saving system to local storage in saveSystemChanges:", error);
        alert("An error occurred while saving. Please check console.");
        return false; // Indicate failure
    }
}


/** Shows the main system overview **/
function showSystemOverview() {
    console.log("Navigating back to system overview...");
    if (!currentSystemData) {
        console.warn("showSystemOverview called but no system is loaded. Returning home instead.");
        if (typeof returnToHome === 'function') returnToHome();
        return;
    }
    if (typeof buildGlobalPlatformDependencies === 'function') buildGlobalPlatformDependencies();
    switchView('visualizationCarousel');
    // Visualizations are now updated within showVisualization when it's called by switchView's transition.finished
}
window.showSystemOverview = showSystemOverview;