/* global variables */

let currentSystemData = null;
let newServiceData = {};
let uniqueEngineers = [];

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

// --- Global variables specific to the SDM Forecasting Tool ---
let totalRampedUpEngineersArray_SDM = [];
let productiveEngineers_SDM = [];
let cumulativeAttritionArray_SDM = [];
let monthlyData_SDM = {};
let totalHeadcountArray_SDM = [];
let forecastChart_SDM = null; // Chart instance for this view

const weekToMonth_SDM = [ // Renamed variable - CORRECTED LENGTH
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
    12,12,12,12,12 // Dec (5 weeks) Weeks 48-52 *** Corrected: Added 5th '12' ***
];

// --- Documentation Resizing Logic (Corrected Names) ---
let isDocumentationResizing = false;
let lastMouseY = 0;
let originalDocumentationHeight = 0;

// Global state for engineer table sorting
let engineerSortState = { key: 'name', ascending: true };

/** Stores the ID of the row being dragged */
let draggedInitiativeId = null;
let draggedRowElement = null; // Store the element itself for styling

// Store temporary assignments before adding the initiative
let tempAssignments = [];

window.onload = function() {
    console.log("!!! window.onload: Page HTML and synchronous scripts loaded. !!!");
    currentMode = Modes.NAVIGATION;

    const docHeader = document.getElementById('documentationHeader');
    const docResizeHandle = document.getElementById('docResizeHandle'); // Get resize handle

    if (docHeader) {
        docHeader.addEventListener('click', () => {
            // Pass the resize handle ID to toggleCollapsibleSection
            toggleCollapsibleSection('documentationContent', 'documentationToggleIndicator', 'docResizeHandle');
        });
        console.log("Attached toggle listener to documentation header.");
    } else {
        console.warn("Documentation header not found in window.onload.");
    }

    // Attach mousedown listener to the resize handle
    if (docResizeHandle) { // Assuming docResizeHandle is defined earlier
        docResizeHandle.addEventListener('mousedown', startDocumentationResize); // Use corrected function name
        console.log("Attached mousedown listener to docResizeHandle.");
    } else {
        console.warn("Documentation resize handle not found in window.onload.");
    }

    setTimeout(() => {
        console.log("Attempting initial switchView(null) after short delay.");
        switchView(null);
    }, 500);
};

/**
 * REVISED (v8) - Central function to manage switching between main views.
 * - Calls loadAndDisplayDocumentation when switching to home.
 */
 function switchView(targetViewId, newMode = null) {
    console.log(`Switching view to: ${targetViewId || 'Home'}, Mode: ${newMode || 'Auto'}`);

    const allViewIds = [
        'systemEditForm',
        'visualizationCarousel',
        'serviceDependenciesTable',
        'organogramView',
        'engineerTableView',
        'planningView',
        'capacityConfigView',
        'sdmForecastingView',
        'toolDocumentationSection'
    ];

    const documentationSection = document.getElementById('toolDocumentationSection'); // Get early

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
            console.error(`switchView: Target element with ID '${targetViewId}' not found!`);
            returnToHome();
            return;
        }

        // pageTitleH1, systemDescP, editMenu, returnHomeBtn, backButton logic... (as before)
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


    } else { // Showing the Home Screen (targetViewId is null or empty)
     currentMode = Modes.NAVIGATION;
        currentSystemData = null;
        if (pageTitleH1) { pageTitleH1.innerText = "Software Management Tools"; pageTitleH1.style.display = 'block'; }
        if (systemDescP) { systemDescP.innerText = "Load a previously saved system or create a new software system"; systemDescP.style.display = 'block';}
        if (mainMenu) mainMenu.style.display = 'block';
        if (editMenu) editMenu.style.display = 'none';
        if (returnHomeBtn) returnHomeBtn.style.display = 'none';
        if (backButton) backButton.style.display = 'none';

        if (documentationSection) { // documentationSection is fetched at the top of switchView
            documentationSection.style.display = 'block';
            const docContent = document.getElementById('documentationContent');
            if (docContent) {
                // Check if it's the initial placeholder or an error message before trying to load
                const currentHTML = docContent.innerHTML.trim().toLowerCase();
                const needsLoading = currentHTML.includes("<em>loading documentation...") ||
                                   currentHTML.includes("<em>attempting to load documentation...") ||
                                   currentHTML.includes("<em>waiting for help components...") ||
                                   currentHTML === ""; // Also try if completely empty

                if (needsLoading) {
                    console.log("switchView (home): Conditions met to call loadAndDisplayDocumentation.");
                    loadAndDisplayDocumentation();
                } else {
                    console.log("switchView (home): Documentation content not in initial state, assuming already loaded or in error state. Not re-fetching.");
                }
            }
        }

        const systemListDiv = document.getElementById('systemLoadListDiv');
        if (systemListDiv) document.body.removeChild(systemListDiv);
        const systemDeleteListDiv = document.getElementById('systemDeleteListDiv');
        if (systemDeleteListDiv) document.body.removeChild(systemDeleteListDiv);
        d3.selectAll('.tooltip').remove();
    }

    if (targetViewId === 'visualizationCarousel') {
        showVisualization(0);
    }
    console.log(`View switched. Current mode: ${currentMode}`);
}

/**
 * REVISED (v3) - Shows the visualization item at the specified index and hides others.
 * Updates the carousel title and triggers specific D3 updates *after* display.
 * Manages visibility of the serviceDependenciesTable based on the selected carousel item.
 * @param {number} index - The index of the visualization item to show.
 */
 function showVisualization(index) {
    const carouselContainer = document.getElementById('visualizationCarousel');
    if (!carouselContainer) {
        console.error("Carousel container #visualizationCarousel not found.");
        return;
    }

    const items = carouselContainer.querySelectorAll('.carousel-item');
    const titleElement = document.getElementById('visualizationTitle');
    const serviceDepsTableDiv = document.getElementById('serviceDependenciesTable'); // Get the table div

    if (index < 0 || index >= items.length || items.length === 0) {
        console.error("Invalid visualization index or no items:", index);
        items.forEach(item => item.style.display = 'none');
        if (titleElement) titleElement.textContent = 'No Visualization';
        if (serviceDepsTableDiv) serviceDepsTableDiv.style.display = 'none'; // Ensure table is hidden
        return;
    }

    // Hide all items first
    items.forEach((item, i) => {
        item.style.display = 'none';
        item.classList.remove('active');
    });

    // **Explicitly hide the service dependencies table initially**
    if (serviceDepsTableDiv) {
        serviceDepsTableDiv.style.display = 'none';
    }

    const targetItemId = visualizationItems[index]?.id;
    const targetItem = targetItemId ? document.getElementById(targetItemId) : null;

    if (targetItem) {
        targetItem.style.display = 'block';
        targetItem.classList.add('active');
        console.log(`Showing visualization: ${visualizationItems[index].title}`);

        if (titleElement) {
            titleElement.textContent = visualizationItems[index].title;
        }

        // **Conditionally show the service dependencies table**
        if (targetItemId === 'dependencyVisualization' && serviceDepsTableDiv) {
            serviceDepsTableDiv.style.display = 'block';
            console.log("Service Dependencies Table shown because Dependency Visualization is active.");
        } else if (serviceDepsTableDiv) {
            // Ensure it's hidden for other visualizations, though already done above, this is a safeguard
            serviceDepsTableDiv.style.display = 'none';
        }


        switch (targetItemId) {
            case 'visualization':
                console.log("System Visualization shown.");
                break;
            case 'teamVisualization':
                console.log("Team Visualization shown.");
                break;
            case 'serviceRelationshipsVisualization':
                populateServiceSelection();
                updateServiceVisualization();
                console.log("Service Relationships shown & updated.");
                break;
            case 'dependencyVisualization':
                populateDependencyServiceSelection();
                updateDependencyVisualization();
                console.log("Dependency Visualization shown & updated.");
                break;
        }
    } else {
        console.error("Target visualization element not found for ID:", targetItemId);
        if (titleElement) titleElement.textContent = 'Error';
        if (serviceDepsTableDiv) serviceDepsTableDiv.style.display = 'none'; // Ensure table is hidden on error
    }

    currentVisualizationIndex = index;
}

/**
 * Navigates the visualization carousel forward or backward.
 * @param {number} direction - 1 for next, -1 for previous.
 */
function navigateVisualizations(direction) {
    let newIndex = currentVisualizationIndex + direction;
    const totalItems = visualizationItems.length;

    // Wrap around
    if (newIndex >= totalItems) {
        newIndex = 0; // Wrap to the first item
    } else if (newIndex < 0) {
        newIndex = totalItems - 1; // Wrap to the last item
    }

    showVisualization(newIndex);
}

/**
 * REVISED - Toggles the visibility of a collapsible section and its indicator.
 * Optionally toggles visibility of a resize handle.
 * Also triggers recalculation of the main planning table height if applicable.
 * @param {string} contentId - The ID of the div containing the content to toggle.
 * @param {string} indicatorId - The ID of the span element showing (+) or (-).
 * @param {string|null} handleId - Optional. The ID of the resize handle to toggle.
 */
function toggleCollapsibleSection(contentId, indicatorId, handleId = null) {
    console.log(`toggleCollapsibleSection called with contentId: '${contentId}', indicatorId: '${indicatorId}', handleId: '${handleId}'`);

    const contentDiv = document.getElementById(contentId);
    const indicatorSpan = document.getElementById(indicatorId);
    const handleDiv = handleId ? document.getElementById(handleId) : null;

    if (!contentDiv || !indicatorSpan) {
        console.error(`Cannot toggle section: Missing content or indicator element. ContentID: '${contentId}', IndicatorID: '${indicatorId}'`);
        return;
    }

    const isHidden = contentDiv.style.display === 'none' || contentDiv.style.display === '';
    contentDiv.style.display = isHidden ? 'block' : 'none';
    indicatorSpan.textContent = isHidden ? '(-)' : '(+)';

    // Toggle resize handle visibility if provided
    if (handleDiv) {
        handleDiv.style.display = isHidden ? 'block' : 'none';
    }

    // Adjust planning table height only if we are in the planning view and toggling specific sections
    if (document.getElementById('planningView').style.display !== 'none' &&
        (contentId === 'teamLoadSummaryContent' || contentId === 'addInitiativeContent')) {
        adjustPlanningTableHeight();
    }
    console.log(`Toggled section ${contentId} to ${isHidden ? 'visible' : 'hidden'}`);
}

/** Save Sample Systems to Local Storage **/
function saveSampleSystemsToLocalStorage() {
    if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        const systems = {
            'StreamView': sampleSystemDataStreamView,
            'ConnectPro': sampleSystemDataContactCenter
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));
    }
}

/** Show Saved Systems **/

/** REVISED (v3 - Corrected Template Literal) Show Saved Systems - Uses modal list with Load buttons */
function showSavedSystems() {
    console.log("Showing saved systems list (v3 - Corrected)...");
    // Retrieve the systems from local storage
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const systemNames = Object.keys(systems);

    // If no systems are saved, alert the user
    if (systemNames.length === 0) {
        alert('No saved systems found.');
        return;
    }

    // --- Create a modal/div to list systems for loading ---
    // Remove any existing list first (either load or delete)
    const existingLoadListDiv = document.getElementById('systemLoadListDiv');
    if (existingLoadListDiv) document.body.removeChild(existingLoadListDiv);
    const existingDeleteListDiv = document.getElementById('systemDeleteListDiv');
    if (existingDeleteListDiv) document.body.removeChild(existingDeleteListDiv);


    let systemListDiv = document.createElement('div');
    systemListDiv.id = 'systemLoadListDiv'; // Use a specific ID for the load list

    let systemListHtml = '<h2>Select a System to Load</h2><ul>';
    // Loop through the actual system names fetched from local storage
    systemNames.forEach(systemName => {
        // *** This template literal correctly inserts the systemName variable ***
        systemListHtml += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>${systemName}</span>
                <button onclick="loadSavedSystem('${systemName}')" style="margin-left: 15px; padding: 3px 8px; font-size: 0.9em;">Load</button>
            </li>`;
        // **********************************************************************
    });
    systemListHtml += '</ul>';
    systemListDiv.innerHTML = systemListHtml;

    // Add a close button
    let closeButton = document.createElement('button');
    closeButton.innerText = 'Cancel';
    closeButton.style.marginTop = '15px';
    closeButton.onclick = function() {
        if (systemListDiv.parentNode === document.body) {
             document.body.removeChild(systemListDiv);
        }
    };
    systemListDiv.appendChild(closeButton);

    // Style the div (consistent with delete modal)
    systemListDiv.style.position = 'fixed';
    systemListDiv.style.top = '50%';
    systemListDiv.style.left = '50%';
    systemListDiv.style.transform = 'translate(-50%, -50%)';
    systemListDiv.style.backgroundColor = '#fff';
    systemListDiv.style.padding = '20px';
    systemListDiv.style.border = '1px solid #ccc';
    systemListDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    systemListDiv.style.zIndex = '1001'; // Ensure it's above other elements
    systemListDiv.style.maxHeight = '80vh';
    systemListDiv.style.overflowY = 'auto';
    systemListDiv.style.minWidth = '300px';


    // Append the div to the body
    document.body.appendChild(systemListDiv);
    console.log("Load system prompt displayed.");
}
// Ensure it's globally accessible if called directly via onclick
window.showSavedSystems = showSavedSystems;

/** REVISED (v5) Load Saved System using switchView - Table visibility managed by carousel */
function loadSavedSystem(systemName) {
    // --- Find System Data (No Change) ---
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const systemData = systems[systemName];
    console.log('Loaded systems from local storage:', systems);
    if (!systemData) { alert('System not found.'); return; }
    currentSystemData = systemData;
    console.log('Selected system to load:', currentSystemData);
    // --- End Find System Data ---

    // --- Remove System Load List Popup (No Change) ---
    const systemLoadListDiv = document.getElementById('systemLoadListDiv');
    if (systemLoadListDiv) {
      document.body.removeChild(systemLoadListDiv);
      console.log("Removed system load list modal.");
    }
    // --- End Remove Popup ---

    // --- Clear previous visualization content (No Change) ---
    d3.selectAll('.tooltip').remove();
    const legendDivs = ['legend', 'teamLegend', 'serviceLegend', 'dependencyLegend'];
    legendDivs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '';
    });
    // --- End Clear ---

     // --- Re-initialize uniqueEngineers and build platform deps (No Change) ---
     uniqueEngineers = [];
     (currentSystemData.teams || []).forEach(team => {
         (team.engineers || []).forEach(engineer => {
            if (engineer && engineer.name) {
                 uniqueEngineers.push({ engineerName: engineer.name, teamId: team.teamId });
             }
         });
     });
     buildGlobalPlatformDependencies();
     // --- End Data Prep ---

    // --- USE switchView TO SHOW OVERVIEW ---
    // Show ONLY the carousel. Table visibility managed by showVisualization.
    switchView('visualizationCarousel');
    // --- End switchView ---

    // --- Regenerate Overview Content ---
    try {
         // Populate dropdowns needed for carousel items
         populateServiceSelection();
         populateDependencyServiceSelection();

        // Generate visualizations (even if initially hidden by carousel)
         generateVisualization(currentSystemData);
         generateTeamVisualization(currentSystemData);
         // The specific service/dependency D3 views are generated when shown by showVisualization

        // Generate separate dependencies table (data ready, display conditional)
         generateServiceDependenciesTable();

         // Show the FIRST item in the carousel - This triggers updates and sets table visibility.
         showVisualization(0);

        console.log("Finished loading and displaying system:", currentSystemData.systemName);
     } catch (error) {
         console.error("Error regenerating system overview content during load:", error);
          const carouselDiv = document.getElementById('visualizationCarousel');
          if(carouselDiv) carouselDiv.innerHTML = '<p style="color:red">Error loading visualizations.</p>';
          // No explicit error message for the table here as its display is part of the carousel logic.
    }
     // --- End Regeneration ---
}
// window.loadSavedSystem = loadSavedSystem; // Already global

function buildGlobalPlatformDependencies() {
    const platformDepsSet = new Set();

    // Iterate over services to collect platform dependencies
    currentSystemData.services.forEach(service => {
        if (service.platformDependencies) {
            service.platformDependencies.forEach(dep => {
                platformDepsSet.add(dep);
            });
        }
    });

    // Convert the set to an array and assign to currentSystemData
    currentSystemData.platformDependencies = Array.from(platformDepsSet);
}

/** Updated function to handle "Create New Software System" button click **/
function createNewSystem() {
    currentMode = Modes.CREATING;

    // Default Senior Managers Data
    const defaultSeniorManagersData = [
        { seniorManagerId: 'srMgr1', seniorManagerName: 'Enter Sr. Manager Name Here' }
    ];

    // Default SDMs Data (with seniorManagerId)
    const defaultSDMsData = [
        { sdmId: 'sdm1', sdmName: 'Enter SDM Name Here', seniorManagerId: 'srMgr1' } // Added seniorManagerId
    ];

    // Default PMTs Data
    const defaultPMTsData = [
        { pmtId: 'pmt1', pmtName: 'Enter PMT Name Here' }
    ];

    // Default Teams Data (using new structure)
    const defaultTeamsData = [
        {
            teamId: 'team1', // Will be regenerated on save if needed, but useful for default service
            teamName: 'Enter Team Name Here',
            teamIdentity: 'Enter Team Identity Here',
            teamDescription: 'Enter Team Description Here...', // Added description field based on usage elsewhere
            fundedHeadcount: 1, // Example default
            buildersInSeats: 1, // Matches the single default engineer
            engineers: [ // Changed from engineerNames string to engineers array
                { name: 'Enter Engineer Name Here', level: 2 } // Example default engineer with level
            ],
            awayTeamMembers: [], // Initialize away team members
            sdmId: 'sdm1', // Reference to the default SDM
            pmtId: 'pmt1', // Reference to the default PMT
            teamCapacityAdjustments: {
                leaveUptakeEstimates: [], // Empty by default
                variableLeaveImpact: { // New structure
                    maternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                    paternity:  { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                    familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
                    medical:    { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
                },
                teamActivities: [],
                recurringOverhead: [],
                avgOverheadHoursPerWeekPerSDE: 0 // Add new field for simple UI
            }
        }
    ];

    // Default Services Data
    const defaultServicesData = [
        {
            serviceName: 'Enter Service Name Here',
            serviceDescription: 'Enter Service Description Here...',
            owningTeamId: 'team1', // Reference to the default Team
            apis: [
                {
                    apiName: 'Enter API Name Here',
                    apiDescription: 'Enter API Description Here...',
                    dependentApis: []
                }
            ],
            serviceDependencies: [],
            platformDependencies: []
        }
    ];

    // Default System Data (including seniorManagers)
    const defaultSystemData = {
        systemName: '', // Start blank, user must enter in form
        systemDescription: '', // Start blank, user must enter in form
        seniorManagers: defaultSeniorManagersData, // Added
        sdms: defaultSDMsData,
        pmts: defaultPMTsData,
        teams: defaultTeamsData,
        services: defaultServicesData,
        platformDependencies: [],
        // Capacity constraints configuration
        capacityConfiguration: {
            workingDaysPerYear: 261, // To be configured - but assume 261
            standardHoursPerDay: 8,  // Default
            globalConstraints: {
                publicHolidays: null, // To be configured
                orgEvents: [
                    // User will add events via UI later
                ]
            },
            leaveTypes: [ // Define standard leave types globally
                { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0 },
                { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0 },
                { id: "study", name: "Study Leave", defaultEstimatedDays: 0 },
                { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0 }
                //{ id: "paternity", name: "Paternity Leave", defaultEstimatedDays: 0 },
                //{ id: "family", name: "Family Responsibility", defaultEstimatedDays: 0 }
            ]
        },
        yearlyInitiatives: [],
        // *** NEW: Add placeholder for calculated capacity metrics ***
        calculatedCapacityMetrics: null
        // **********************************************************
    };

    // Assign to currentSystemData
    currentSystemData = defaultSystemData;

    // Use enterEditMode (which now uses switchView) to show the edit form
    enterEditMode(true); // Pass true flag for creation mode
}

/** REVISED (v3) Return to Home using switchView */
function returnToHome() {
    console.log("Returning to home view (Clearing System)...");
    switchView(null); // Passing null shows the home screen and resets state
    console.log("Home view displayed.");
}
window.returnToHome = returnToHome;

function resetToDefaults() {
    if (confirm('This will erase all your saved systems and restore the default sample systems. Do you want to proceed?')) {
        // Clear the local storage for systems
        localStorage.removeItem(LOCAL_STORAGE_KEY);

        // Re-initialize with sample systems
        const systems = {
            'StreamView': sampleSystemDataStreamView,
            'ConnectPro': sampleSystemDataContactCenter
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        alert('Systems have been reset to defaults.');

        // Return to the home page
        returnToHome();
    }
}

/** REVISED (v2) - Delete System - Prompts user to select a system from the list */
    function deleteSystem() {
        console.log("Initiating system deletion process...");
        // Retrieve the systems from local storage
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const systemNames = Object.keys(systems);

        // If no systems are saved, alert the user
        if (systemNames.length === 0) {
            alert('No saved systems found to delete.');
            return;
        }

        // --- Create a modal/div to list systems for deletion ---
        // Remove any existing list first
        const existingListDiv = document.getElementById('systemDeleteListDiv');
        if (existingListDiv) {
            document.body.removeChild(existingListDiv);
        }

        let systemListDiv = document.createElement('div');
        systemListDiv.id = 'systemDeleteListDiv'; // Use a distinct ID

        let systemListHtml = '<h2>Select a System to Delete</h2><ul>';
        systemNames.forEach(systemName => {
            // Use template literal for easier reading and onclick generation
            systemListHtml += `
                <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span>${systemName}</span>
                    <button onclick="confirmAndDeleteSystem('${systemName}')" style="margin-left: 15px; padding: 3px 8px; font-size: 0.9em; color: red; border-color: red;">Delete</button>
                </li>`;
        });
        systemListHtml += '</ul>';
        systemListDiv.innerHTML = systemListHtml;

        // Add a close button
        let closeButton = document.createElement('button');
        closeButton.innerText = 'Cancel';
        closeButton.style.marginTop = '15px';
        closeButton.onclick = function() {
             if (systemListDiv.parentNode === document.body) { // Check if still attached before removing
                 document.body.removeChild(systemListDiv);
            }
        };
        systemListDiv.appendChild(closeButton);

        // Style the div (similar to showSavedSystems)
        systemListDiv.style.position = 'fixed';
        systemListDiv.style.top = '50%';
        systemListDiv.style.left = '50%';
        systemListDiv.style.transform = 'translate(-50%, -50%)';
        systemListDiv.style.backgroundColor = '#fff';
        systemListDiv.style.padding = '20px';
        systemListDiv.style.border = '1px solid #ccc';
        systemListDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'; // Add shadow
        systemListDiv.style.zIndex = '1001'; // Ensure it's above other elements
        systemListDiv.style.maxHeight = '80vh'; // Prevent excessive height
        systemListDiv.style.overflowY = 'auto'; // Add scroll if needed
        systemListDiv.style.minWidth = '300px'; // Ensure reasonable width


        // Append the div to the body
        document.body.appendChild(systemListDiv);
        console.log("Delete system prompt displayed.");
    }
    // Ensure it's globally accessible if called directly via onclick
    window.deleteSystem = deleteSystem;


    /** NEW Helper Function: Confirms and deletes the specified system */
    function confirmAndDeleteSystem(systemName) {
        console.log(`Attempting to delete system: ${systemName}`);
        if (!systemName) {
            console.error("confirmAndDeleteSystem called without systemName.");
            return;
        }

        if (confirm(`Are you sure you want to permanently delete the system "${systemName}"? This action cannot be undone.`)) {
            try {
                const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

                if (systems[systemName]) {
                    delete systems[systemName]; // Remove the system entry
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems)); // Save updated data
                    console.log(`System "${systemName}" deleted successfully.`);
                    alert(`System "${systemName}" has been deleted.`);

                    // Close the delete prompt modal
                    const listDiv = document.getElementById('systemDeleteListDiv');
                    if (listDiv && listDiv.parentNode === document.body) {
                        document.body.removeChild(listDiv);
                    }

                    // If the deleted system *was* the currently loaded one (unlikely from home screen, but good practice)
                    if (currentSystemData && currentSystemData.systemName === systemName) {
                        console.log("Deleted system was the currently loaded one. Returning to home.");
                        returnToHome(); // Reset UI fully
                    }

                } else {
                    console.warn(`System "${systemName}" not found in local storage for deletion.`);
                    alert(`Error: System "${systemName}" could not be found for deletion.`);
                    // Optionally refresh the list here if it's still visible
                     const listDiv = document.getElementById('systemDeleteListDiv');
                     if (listDiv) {
                        document.body.removeChild(listDiv); // Remove the old list
                        deleteSystem(); // Re-show the updated list
                     }
                }
            } catch (error) {
                console.error("Error deleting system from local storage:", error);
                alert("An error occurred while deleting the system. Please check the console.");
            }
        } else {
            console.log(`Deletion cancelled for system: ${systemName}`);
        }
    }
    // Make helper globally accessible for onclick
    window.confirmAndDeleteSystem = confirmAndDeleteSystem;

    /** NEW Validation function to check engineer assignments */
function validateEngineerAssignments() {
    if (!currentSystemData || !currentSystemData.teams) {
        console.error("Validation skipped: No team data loaded.");
        return true; // Allow saving if no data? Or return false? Safer to allow.
    }

    const engineerAssignments = new Map(); // Key: engineerName, Value: Set<teamId>
    let isValid = true;
    let errorMessages = [];

    currentSystemData.teams.forEach(team => {
        if (!team || !team.teamId) return; // Skip invalid team entries
        (team.engineers || []).forEach(engineer => {
            if (!engineer || !engineer.name) return; // Skip invalid engineer entries
            const name = engineer.name;
            if (!engineerAssignments.has(name)) {
                engineerAssignments.set(name, new Set());
            }
            engineerAssignments.get(name).add(team.teamId);
        });
    });

    // Check for overallocations
    engineerAssignments.forEach((assignedTeamIds, engineerName) => {
        if (assignedTeamIds.size > 1) {
            isValid = false;
            const teamNames = Array.from(assignedTeamIds).map(tId => {
                const team = currentSystemData.teams.find(t => t.teamId === tId);
                return team ? (team.teamName || team.teamIdentity) : tId;
            }).join(', ');
            errorMessages.push(`Engineer "${engineerName}" is assigned to multiple teams: ${teamNames}.`);
        }
    });

    if (!isValid) {
        alert("Validation Error: Cannot save changes.\n\n" + errorMessages.join("\n"));
    }

    return isValid;
}

/** Updated Save System Changes (used by Save All/Save Team) - Add Validation **/
function saveSystemChanges() {
    // Get updated system name and description (if called directly, maybe redundant)
    const systemNameInput = document.getElementById('systemNameInput');
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');
    if (systemNameInput && systemDescriptionTextarea) { // Check if elements exist
         currentSystemData.systemName = systemNameInput.value.trim();
         currentSystemData.systemDescription = systemDescriptionTextarea.value.trim();
    } else if (currentMode === Modes.CREATING || currentMode === Modes.EDITING) {
         // If called during saveAll/saveTeam, these might not be the source of truth anymore
         console.warn("saveSystemChanges called without direct access to system name/desc inputs. Assuming currentSystemData properties are up-to-date.");
    }


    if (!currentSystemData.systemName && (currentMode === Modes.CREATING || currentMode === Modes.EDITING)) {
        alert('System name cannot be empty.');
        return;
    }

    // *** Add validation before saving to local storage ***
    if (!validateEngineerAssignments()) {
        return; // Stop saving if validation fails
    }
    // *********************************************************

    // Save currentSystemData to local storage
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    systems[currentSystemData.systemName] = currentSystemData; // Use potentially updated name as key
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

    console.log('System changes saved to local storage.'); // Changed alert to console log

    // Note: UI updates are typically handled by the calling function (like saveTeamChanges or exitEditMode)
}

/** REVISED (v4) function to show the main system overview using switchView */
function showSystemOverview() {
    console.log("Navigating back to system overview...");
    if (!currentSystemData) {
        console.warn("showSystemOverview called but no system is loaded. Returning home instead.");
        returnToHome();
        return;
    }

    // Use switchView to handle showing carousel/table and managing buttons/title
    // Show ONLY the carousel. The table's visibility is now handled by showVisualization.
    switchView('visualizationCarousel'); // Shows carousel, hides others, sets mode to BROWSE

    // Regenerate content within the (now visible) containers
    try {
        buildGlobalPlatformDependencies();
        generateVisualization(currentSystemData); // For the first carousel item
        generateTeamVisualization(currentSystemData); // For the second carousel item
        // ServiceDependenciesTable is generated but its visibility is controlled by showVisualization
        generateServiceDependenciesTable();

        // Populate dropdowns needed for other carousel items
        populateServiceSelection();
        populateDependencyServiceSelection();
        // Service/Dependency D3 rendering is triggered by showVisualization when those items are selected

        // Show the FIRST item in the carousel - this will correctly set table visibility
        showVisualization(0);

        console.log("Displayed overview containers and regenerated content. Table visibility tied to carousel item.");
    } catch (error) {
        console.error("Error regenerating system overview content:", error);
        const carouselDiv = document.getElementById('visualizationCarousel');
        if(carouselDiv) carouselDiv.innerHTML = '<p style="color:red">Error loading visualizations.</p>';
        // We no longer explicitly show the table here, so no need to put an error in it.
    }
}
// window.showSystemOverview = showSystemOverview; // Already global