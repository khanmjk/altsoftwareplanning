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
        'capacityConfigView', 'sdmForecastingView', 'toolDocumentationSection',
        'roadmapView' // << NEW VIEW ID
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
            currentMode = newMode || Modes.Browse;
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
                else if (targetViewId === 'roadmapView') titleSuffix = ' - Roadmap & Backlog'; // << NEW SUFFIX
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
        // << NEW: Call roadmap generation if roadmapView is shown
        if (targetViewId === 'roadmapView' && typeof initializeRoadmapView === 'function') {
            initializeRoadmapView();
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
/**
 * REVISED: Clears existing data, validates clearance, saves sample systems,
 * and logs the stored data with emphasis on allKnownEngineers.
 * ADDED: More detailed debugging for sampleSystemDataStreamView and stringification.
 **/
function saveSampleSystemsToLocalStorage() {
    console.log(">>> Attempting to save sample systems to LocalStorage with new logic (extended debug)...");

    // 1. Wipe out old data stored under LOCAL_STORAGE_KEY
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log(`Cleared data under localStorage key: "${LOCAL_STORAGE_KEY}"`);

    // 2. Validate there are no objects saved (or the key is gone)
    const clearedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (clearedData === null) {
        console.log("Validation successful: localStorage key is cleared or contains no data.");

        // --- AGGRESSIVE DEBUGGING of sampleSystemDataStreamView ---
        console.log("--- Debugging sampleSystemDataStreamView before it's used ---");
        if (typeof sampleSystemDataStreamView !== 'undefined') {
            console.log("sampleSystemDataStreamView IS DEFINED.");

            // Check for the 'allKnownEngineers' key directly
            if (Object.prototype.hasOwnProperty.call(sampleSystemDataStreamView, 'allKnownEngineers')) {
                console.log("sampleSystemDataStreamView HAS the 'allKnownEngineers' property.");
                if (Array.isArray(sampleSystemDataStreamView.allKnownEngineers)) {
                    console.log("sampleSystemDataStreamView.allKnownEngineers IS AN ARRAY. Length:", sampleSystemDataStreamView.allKnownEngineers.length);
                    if (sampleSystemDataStreamView.allKnownEngineers.length > 0) {
                        console.log("First engineer in sampleSystemDataStreamView.allKnownEngineers:", JSON.parse(JSON.stringify(sampleSystemDataStreamView.allKnownEngineers[0])));
                    } else {
                        console.log("sampleSystemDataStreamView.allKnownEngineers is an EMPTY array.");
                    }
                } else {
                    console.error("CRITICAL DEBUG: sampleSystemDataStreamView.allKnownEngineers is NOT AN ARRAY. Type:", typeof sampleSystemDataStreamView.allKnownEngineers, "Value:", sampleSystemDataStreamView.allKnownEngineers);
                }
            } else {
                console.error("CRITICAL DEBUG: sampleSystemDataStreamView DOES NOT HAVE the 'allKnownEngineers' property. Keys present:", Object.keys(sampleSystemDataStreamView));
            }
            // Log a deep copy to see its structure if still problematic
            // console.log("Full structure of sampleSystemDataStreamView before use:", JSON.parse(JSON.stringify(sampleSystemDataStreamView)));
        } else {
            console.error("CRITICAL DEBUG: sampleSystemDataStreamView is UNDEFINED at the point of use in saveSampleSystemsToLocalStorage.");
            alert("Programming Error: sampleSystemDataStreamView is not defined. Check script load order and data.js.");
            return; // Stop execution if critical data is missing
        }
        console.log("--- End of debugging sampleSystemDataStreamView ---");
        // --- END OF AGGRESSIVE DEBUGGING ---

        // 3. Prepare systems object for saving
        console.log("Preparing systemsToSave object...");
        const systemsToSave = {
            'StreamView': sampleSystemDataStreamView,
            'ConnectPro': sampleSystemDataContactCenter
        };

        // --- DEBUG: Check systemsToSave['StreamView'] ---
        if (systemsToSave.StreamView && systemsToSave.StreamView.allKnownEngineers && Array.isArray(systemsToSave.StreamView.allKnownEngineers)) {
            console.log("DEBUG: systemsToSave.StreamView.allKnownEngineers IS valid before stringify. Length:", systemsToSave.StreamView.allKnownEngineers.length);
        } else {
            console.error("CRITICAL DEBUG: systemsToSave.StreamView.allKnownEngineers is MISSING or NOT AN ARRAY *before* stringify.");
            if(systemsToSave.StreamView) console.log("Keys in systemsToSave.StreamView:", Object.keys(systemsToSave.StreamView));
        }
        // --- END DEBUG ---

        try {
            // Stringify and save
            const stringifiedSystems = JSON.stringify(systemsToSave);

            // --- DEBUG: Check stringified output ---
            if (stringifiedSystems.includes('"allKnownEngineers"')) {
                if (stringifiedSystems.includes('"StreamView":{"systemName":"StreamView","systemDescription":"StreamView is a video streaming platform') && stringifiedSystems.match(/"StreamView":\{[^{}]*"allKnownEngineers":\[/)) {
                   console.log("DEBUG: Stringified data for StreamView APPEARS to contain 'allKnownEngineers' as an array.");
                } else {
                   console.warn("DEBUG: Stringified data contains 'allKnownEngineers', but not clearly within StreamView as an array. Manual check needed.");
                   // console.log("Snippet of stringified StreamView:", stringifiedSystems.substring(stringifiedSystems.indexOf('"StreamView":'), stringifiedSystems.indexOf('"StreamView":') + 1000));
                }
            } else {
                console.error("CRITICAL DEBUG: Stringified data DOES NOT contain the key 'allKnownEngineers' at all. Stringification is likely removing it.");
            }
            // --- END DEBUG ---

            localStorage.setItem(LOCAL_STORAGE_KEY, stringifiedSystems);
            console.log("Sample systems saved successfully to LocalStorage.");

            // 4. Log the full sample data being stored (verification step)
            console.log("--- Verifying Data Stored in localStorage (parsed from what was just set) ---");
            const newlyStoredSystemsString = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (newlyStoredSystemsString) {
                const newlyStoredSystems = JSON.parse(newlyStoredSystemsString);
                const streamViewDataStored = newlyStoredSystems['StreamView'];

                if (streamViewDataStored) {
                    // console.log("Full 'StreamView' data as stored in localStorage:", JSON.parse(JSON.stringify(streamViewDataStored)));
                    if (streamViewDataStored.allKnownEngineers && Array.isArray(streamViewDataStored.allKnownEngineers)) {
                        console.log("VERIFICATION SUCCEEDED: 'StreamView.allKnownEngineers' array IS PRESENT in stored data. Length:", streamViewDataStored.allKnownEngineers.length);
                        // if (streamViewDataStored.allKnownEngineers.length > 0) {
                        //     console.log("First engineer in 'StreamView.allKnownEngineers' as stored:", JSON.parse(JSON.stringify(streamViewDataStored.allKnownEngineers[0])));
                        // }
                    } else {
                        console.error("VERIFICATION FAILED: 'StreamView.allKnownEngineers' is missing or not an array in the data read back from localStorage. This is unexpected after a fresh save.");
                        if(streamViewDataStored) console.log("Keys in streamViewDataStored:", Object.keys(streamViewDataStored));
                    }
                } else {
                    console.warn("VERIFICATION WARNING: 'StreamView' data not found in what was just stored. This is unexpected.");
                }
            } else {
                console.error("CRITICAL VERIFICATION FAILED: Could not retrieve data immediately after setting it in localStorage.");
            }
            console.log("--- End of localStorage verification ---");

        } catch (error) {
            console.error("Error stringifying or setting sample systems in localStorage:", error);
            alert("Error during saving process. Check console.");
        }
    } else {
        console.error("CRITICAL VALIDATION FAILED: localStorage was not cleared properly. Found data:", clearedData);
        alert("Error: Could not clear previous data from localStorage. Please check browser console and potentially clear manually.");
    }
    console.log("<<< Finished saveSampleSystemsToLocalStorage execution.");
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


/** REVISED (v7) Load Saved System - Enhanced Logging for allKnownEngineers */
function loadSavedSystem(systemName) {
    console.log(`[V7 LOAD] Attempting to load system: ${systemName}`);
    const systemsString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!systemsString) {
        alert('No systems data found in localStorage.');
        console.error("[V7 LOAD] No systems key found in localStorage.");
        returnToHome();
        return;
    }

    const systems = JSON.parse(systemsString || '{}');
    const systemData = systems[systemName];

    if (!systemData) {
        alert(`System "${systemName}" not found in localStorage.`);
        console.error(`[V7 LOAD] System "${systemName}" not found after parsing localStorage.`);
        returnToHome();
        return;
    }

    currentSystemData = systemData; // Assign to global
    console.log(`[V7 LOAD] Successfully parsed system data for: "${currentSystemData.systemName}" from localStorage.`);

    // ----- IMMEDIATE CHECK of allKnownEngineers -----
    if (currentSystemData.allKnownEngineers && Array.isArray(currentSystemData.allKnownEngineers)) {
        console.log(`[V7 LOAD - PRE-AUGMENTATION] 'currentSystemData.allKnownEngineers' IS present. Length: ${currentSystemData.allKnownEngineers.length}`);
        if (currentSystemData.allKnownEngineers.length > 0) {
            console.log("[V7 LOAD - PRE-AUGMENTATION] Sample of loaded allKnownEngineers[0]:", JSON.stringify(currentSystemData.allKnownEngineers[0]));
        }
    } else {
        console.warn(`[V7 LOAD - PRE-AUGMENTATION] 'currentSystemData.allKnownEngineers' is MISSING or not an array upon loading for system "${systemName}". Will attempt to initialize.`);
    }
    // ----- END IMMEDIATE CHECK -----


    // --- DATA AUGMENTATION: Ensure new fields/arrays exist for older saved data ---
    console.log("[V7 LOAD] Augmenting loaded system data with new model defaults if missing...");

    // Top-level system attributes
    if (!currentSystemData.projectManagers) currentSystemData.projectManagers = [];
    if (!currentSystemData.goals) currentSystemData.goals = [];
    if (!currentSystemData.definedThemes) currentSystemData.definedThemes = [];
    if (!currentSystemData.archivedYearlyPlans) currentSystemData.archivedYearlyPlans = [];
    if (!currentSystemData.workPackages) currentSystemData.workPackages = [];
    if (!currentSystemData.attributes) currentSystemData.attributes = {};

    // allKnownEngineers (critical for engineer data)
    // This block now primarily ensures attributes on existing engineers if allKnownEngineers was loaded.
    // If it was missing, it initializes it as empty, which is then used by subsequent functions.
    if (!currentSystemData.allKnownEngineers || !Array.isArray(currentSystemData.allKnownEngineers)) {
        console.warn(`[V7 LOAD - AUGMENTATION] Initializing 'allKnownEngineers' as [] for loaded system: ${systemName} because it was missing or not an array.`);
        currentSystemData.allKnownEngineers = [];
        // Note: The logic to populate from team.engineers (if they were objects) is removed
        // as the new data model implies team.engineers are just names and allKnownEngineers is the source of truth.
        // If loading very old data where allKnownEngineers didn't exist AND teams had full engineer objects,
        // that old data would need a more specific migration step if encountered.
    }
    // Ensure attributes in allKnownEngineers
    (currentSystemData.allKnownEngineers || []).forEach(eng => {
        if (!eng.attributes) eng.attributes = { isAISWE: false, skills: [], yearsOfExperience: 0, aiAgentType: null };
        if (eng.attributes.isAISWE === undefined) eng.attributes.isAISWE = false;
        if (!eng.attributes.skills) eng.attributes.skills = [];
        if (eng.attributes.yearsOfExperience === undefined) eng.attributes.yearsOfExperience = 0;
        if (eng.attributes.aiAgentType === undefined && eng.attributes.isAISWE) eng.attributes.aiAgentType = "General AI";
        else if (eng.attributes.aiAgentType === undefined && !eng.attributes.isAISWE) eng.attributes.aiAgentType = null;

    });


    // Capacity Configuration (ensure structure and defaults for older data)
    const defaultCapacityConfig = {
        workingDaysPerYear: 261, standardHoursPerDay: 8,
        globalConstraints: { publicHolidays: 0, orgEvents: [] },
        leaveTypes: [
            { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0, attributes: {} },
            { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0, attributes: {} },
            { id: "study", name: "Study Leave", defaultEstimatedDays: 0, attributes: {} },
            { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
        ],
        attributes: {}
    };
    if (!currentSystemData.capacityConfiguration) {
        currentSystemData.capacityConfiguration = JSON.parse(JSON.stringify(defaultCapacityConfig)); // Deep copy
    } else {
        if (currentSystemData.capacityConfiguration.workingDaysPerYear === undefined) currentSystemData.capacityConfiguration.workingDaysPerYear = defaultCapacityConfig.workingDaysPerYear;
        if (currentSystemData.capacityConfiguration.standardHoursPerDay === undefined) currentSystemData.capacityConfiguration.standardHoursPerDay = defaultCapacityConfig.standardHoursPerDay;
        if (!currentSystemData.capacityConfiguration.globalConstraints) currentSystemData.capacityConfiguration.globalConstraints = JSON.parse(JSON.stringify(defaultCapacityConfig.globalConstraints));
        if (currentSystemData.capacityConfiguration.globalConstraints.publicHolidays === undefined) currentSystemData.capacityConfiguration.globalConstraints.publicHolidays = 0;
        if (!currentSystemData.capacityConfiguration.globalConstraints.orgEvents) currentSystemData.capacityConfiguration.globalConstraints.orgEvents = [];
        (currentSystemData.capacityConfiguration.globalConstraints.orgEvents || []).forEach(event => { if(!event.attributes) event.attributes = {}; });
        if (!currentSystemData.capacityConfiguration.leaveTypes || currentSystemData.capacityConfiguration.leaveTypes.length === 0) {
            currentSystemData.capacityConfiguration.leaveTypes = JSON.parse(JSON.stringify(defaultCapacityConfig.leaveTypes));
        }
        (currentSystemData.capacityConfiguration.leaveTypes || []).forEach(lt => { if(!lt.attributes) lt.attributes = {}; });
        if (!currentSystemData.capacityConfiguration.attributes) currentSystemData.capacityConfiguration.attributes = {};
    }
    if (currentSystemData.calculatedCapacityMetrics === undefined) currentSystemData.calculatedCapacityMetrics = null;


    // Teams
    (currentSystemData.teams || []).forEach(team => {
        if (!team.attributes) team.attributes = {};
        if (!team.engineers) team.engineers = []; // Should be array of names
        if (!team.awayTeamMembers) team.awayTeamMembers = [];
        const defaultTeamCapacityAdjustments = {
            leaveUptakeEstimates: [],
            variableLeaveImpact: { maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }, medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 } },
            teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0, attributes: {}
        };
        if (!team.teamCapacityAdjustments) {
            team.teamCapacityAdjustments = JSON.parse(JSON.stringify(defaultTeamCapacityAdjustments));
        } else {
            if (!team.teamCapacityAdjustments.leaveUptakeEstimates) team.teamCapacityAdjustments.leaveUptakeEstimates = [];
            if (!team.teamCapacityAdjustments.variableLeaveImpact) team.teamCapacityAdjustments.variableLeaveImpact = JSON.parse(JSON.stringify(defaultTeamCapacityAdjustments.variableLeaveImpact));
            else {
                const vli = team.teamCapacityAdjustments.variableLeaveImpact;
                if (!vli.maternity) vli.maternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
                if (!vli.paternity) vli.paternity = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
                if (!vli.familyResp) vli.familyResp = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
                if (!vli.medical) vli.medical = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
            }
            if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = [];
            if (team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE === undefined) team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE = 0;
            if (!team.teamCapacityAdjustments.attributes) team.teamCapacityAdjustments.attributes = {};
        }
    });

    // Services & APIs
    (currentSystemData.services || []).forEach(service => {
        if (!service.attributes) service.attributes = {};
        if (!service.apis) service.apis = [];
        (service.apis || []).forEach(api => {
            if (!api.attributes) api.attributes = {};
            if (!api.dependentApis) api.dependentApis = [];
        });
        if (!service.serviceDependencies) service.serviceDependencies = [];
        if (!service.platformDependencies) service.platformDependencies = [];
    });

    // Yearly Initiatives
    (currentSystemData.yearlyInitiatives || []).forEach(initiative => {
        if (!initiative.attributes) { // Ensure attributes object itself exists
            initiative.attributes = {};
        }
        if (initiative.attributes.pmCapacityNotes === undefined) { // Add pmCapacityNotes if missing
            initiative.attributes.pmCapacityNotes = "";
        }

        if (initiative.hasOwnProperty('relatedBusinessGoalId')) {
            if (initiative.primaryGoalId === undefined) initiative.primaryGoalId = initiative.relatedBusinessGoalId; // Migrate if primaryGoalId doesn't exist
            delete initiative.relatedBusinessGoalId;
        }
        const defaultROI = { category: null, valueType: null, estimatedValue: null, currency: null, timeHorizonMonths: null, confidenceLevel: null, calculationMethodology: null, businessCaseLink: null, overrideJustification: null, attributes: {} };
        if (!initiative.roi) initiative.roi = JSON.parse(JSON.stringify(defaultROI));
        else { // Ensure all sub-fields of ROI exist
            for (const key in defaultROI) { if (initiative.roi[key] === undefined) initiative.roi[key] = defaultROI[key]; }
            if (!initiative.roi.attributes) initiative.roi.attributes = {};
        }

        if (initiative.targetDueDate === undefined) initiative.targetDueDate = null;
        if (initiative.actualCompletionDate === undefined) initiative.actualCompletionDate = null;
        if (!initiative.status) initiative.status = initiative.isProtected ? 'Committed' : 'Backlog';
        if (!initiative.themes) initiative.themes = [];
        if (initiative.primaryGoalId === undefined) initiative.primaryGoalId = null;
        if (initiative.projectManager === undefined) initiative.projectManager = null;
        if (initiative.owner === undefined) initiative.owner = null;
        if (initiative.technicalPOC === undefined) initiative.technicalPOC = null;
        if (!initiative.impactedServiceIds) initiative.impactedServiceIds = [];
        if (!initiative.workPackageIds) initiative.workPackageIds = [];
        // if (!initiative.attributes) initiative.attributes = {}; // Already handled above
        if (!initiative.assignments) initiative.assignments = [];
    });

    ['seniorManagers', 'sdms', 'pmts', 'projectManagers', 'goals', 'definedThemes', 'archivedYearlyPlans', 'workPackages'].forEach(key => {
        (currentSystemData[key] || []).forEach(item => {
            if (item && !item.attributes) item.attributes = {};
        });
    });
    console.log("[V7 LOAD] Data augmentation complete.");
    // --- End Data Augmentation ---


    const systemLoadListDiv = document.getElementById('systemLoadListDiv');
    if (systemLoadListDiv && systemLoadListDiv.parentNode === document.body) {
        document.body.removeChild(systemLoadListDiv);
        console.log("[V7 LOAD] Removed system load list modal.");
    }

    d3.selectAll('.tooltip').remove();
    const legendDivs = ['legend', 'teamLegend', 'serviceLegend', 'dependencyLegend'];
    legendDivs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    buildGlobalPlatformDependencies();

    switchView('visualizationCarousel');

    try {
        populateServiceSelection();
        populateDependencyServiceSelection();
        generateServiceDependenciesTable();
        console.log("[V7 LOAD] Finished loading and preparing display for system:", currentSystemData.systemName);
    } catch (error) {
        console.error("[V7 LOAD] Error regenerating parts of system overview content during load:", error);
        const carouselDiv = document.getElementById('visualizationCarousel');
        if (carouselDiv) carouselDiv.innerHTML = '<p style="color:red">Error loading some visualization components. Check console.</p>';
    }
}
// window.loadSavedSystem = loadSavedSystem; // Keep global

/** Build global list of platform dependencies **/
function buildGlobalPlatformDependencies() {
    if (!currentSystemData || !currentSystemData.services) return;
    const platformDepsSet = new Set();
    currentSystemData.services.forEach(service => {
        (service.platformDependencies || []).forEach(dep => platformDepsSet.add(dep));
    });
    currentSystemData.platformDependencies = Array.from(platformDepsSet);
}

/** Updated function to handle "Create New Software System" button click **/
function createNewSystem() {
    currentMode = Modes.CREATING;

    // Default Senior Managers Data
    const defaultSeniorManagersData = [
        // It's often better to start empty and let the user define,
        // but if a default is truly needed:
        // { seniorManagerId: 'srMgrDefault1', seniorManagerName: 'Default Sr. Manager', attributes: {} }
    ];

    // Default SDMs Data
    const defaultSDMsData = [
        // { sdmId: 'sdmDefault1', sdmName: 'Default SDM', seniorManagerId: null, attributes: {} }
    ];

    // Default PMTs Data
    const defaultPMTsData = [
        // { pmtId: 'pmtDefault1', pmtName: 'Default PMT', attributes: {} }
    ];

    // Default Project Managers Data (New)
    const defaultProjectManagersData = [
        // { pmId: 'pmDefault1', pmName: 'Default Project Manager', attributes: {} }
    ];

    // Default Engineers (now managed via allKnownEngineers)
    const defaultAllKnownEngineers = [
        // { name: 'Default Engineer A', level: 2, currentTeamId: null, attributes: { isAISWE: false, skills: [], yearsOfExperience: 0, aiAgentType: null } },
        // { name: 'Default Engineer B', level: 3, currentTeamId: null, attributes: { isAISWE: false, skills: [], yearsOfExperience: 0, aiAgentType: null } }
    ];

    // Default Teams Data
    const defaultTeamsData = [
        // {
        //     teamId: 'teamDefault1',
        //     teamName: 'Default Team Alpha',
        //     teamIdentity: 'Alphas',
        //     teamDescription: 'A default example team.',
        //     fundedHeadcount: 0,
        //     engineers: [], // Engineer names, links to allKnownEngineers
        //     awayTeamMembers: [],
        //     sdmId: null,
        //     pmtId: null,
        //     teamCapacityAdjustments: {
        //         leaveUptakeEstimates: [],
        //         variableLeaveImpact: {
        //             maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
        //             paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
        //             familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
        //             medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 }
        //         },
        //         teamActivities: [],
        //         avgOverheadHoursPerWeekPerSDE: 0,
        //         attributes: {}
        //     },
        //     attributes: {}
        // }
    ];

    // Default Services Data
    const defaultServicesData = [
        // {
        //     serviceName: 'Default Service Core',
        //     serviceDescription: 'A default example service.',
        //     owningTeamId: null, // Link to a teamId if a default team exists
        //     apis: [
        //         { apiName: 'DefaultAPI', apiDescription: 'A default API endpoint.', dependentApis: [], attributes: {} }
        //     ],
        //     serviceDependencies: [],
        //     platformDependencies: [],
        //     attributes: {}
        // }
    ];

    // Default Yearly Initiatives (one example, usually starts empty)
    const defaultYearlyInitiatives = [
        // {
        //     initiativeId: 'initDefault-001',
        //     title: 'Setup Initial Project Environment',
        //     description: 'Configure repositories, CI/CD, and basic infrastructure for the new system.',
        //     isProtected: false,
        //     assignments: [], // Example: [{ teamId: 'teamDefault1', sdeYears: 0.5 }]
        //     roi: {
        //         category: 'Tech Debt', // Or 'Enablement'
        //         valueType: 'Narrative',
        //         estimatedValue: 'Foundational Setup',
        //         currency: null, timeHorizonMonths: 1, confidenceLevel: 'High',
        //         calculationMethodology: 'Required to start any development.',
        //         businessCaseLink: null, overrideJustification: null,
        //         attributes: {}
        //     },
        //     targetDueDate: null,
        //     actualCompletionDate: null,
        //     status: 'Backlog', // Default status for new initiatives
        //     themes: [], // e.g., ['theme-setup']
        //     primaryGoalId: null, // e.g., 'goal-initial-setup'
        //     projectManager: null, // { type: 'projectManager', id: null, name: 'Unassigned' }
        //     owner: null,          // { type: 'sdm', id: null, name: 'Unassigned' }
        //     technicalPOC: null,   // { type: 'engineer', id: null, name: 'Unassigned' }
        //     impactedServiceIds: [],
        //     workPackageIds: [],
        //     attributes: { pmCapacityNotes: "" } // << Initialize new field
        // }
    ];

    const defaultSystemData = {
        systemName: '', // User must enter in form
        systemDescription: '', // User must enter in form

        // Core Entities (mostly starting empty for a new system)
        seniorManagers: defaultSeniorManagersData,
        sdms: defaultSDMsData,
        pmts: defaultPMTsData,
        projectManagers: defaultProjectManagersData, // New
        teams: defaultTeamsData,
        services: defaultServicesData,
        allKnownEngineers: defaultAllKnownEngineers, // Start with no globally known engineers

        platformDependencies: [], // Will be built dynamically

        // Capacity Configuration (with defaults)
        capacityConfiguration: {
            workingDaysPerYear: 261,
            standardHoursPerDay: 8,
            globalConstraints: {
                publicHolidays: 0, // User should configure
                orgEvents: []      // User will add events
            },
            leaveTypes: [ // Standard leave types with 0 defaults
                { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "study", name: "Study Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
            ],
            attributes: {}
        },

        // Planning & Roadmap Entities (starting empty)
        yearlyInitiatives: defaultYearlyInitiatives, // Can start empty or with a placeholder
        goals: [],
        definedThemes: [],
        archivedYearlyPlans: [],
        workPackages: [], // Starts empty, to be populated during detailed planning

        calculatedCapacityMetrics: null, // Initially null
        attributes: {} // For system-level future extensibility
    };

    currentSystemData = defaultSystemData;
    console.log("Initialized new currentSystemData:", JSON.parse(JSON.stringify(currentSystemData)));

    enterEditMode(true); // Pass true flag for creation mode
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

// << NEW Function to show Roadmap View >>
/**
 * Shows the Roadmap & Backlog Management View.
 */
function showRoadmapView() {
    console.log("Switching to Roadmap & Backlog View...");
    if (!currentSystemData) {
        alert("Please load a system first to manage its roadmap and backlog.");
        return;
    }
    // Assuming Modes.PLANNING is suitable, or create a new Modes.ROADMAP
    switchView('roadmapView', Modes.PLANNING);

    // The actual generation of content (table, form) will be triggered
    // by switchView's transition.finished callback, which will call initializeRoadmapView.
}
window.showRoadmapView = showRoadmapView;