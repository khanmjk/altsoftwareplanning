let currentSystemData = null;
let newServiceData = {};
let uniqueEngineers = []; // This might be fully replaced by usage of allKnownEngineers


let currentMode = Modes.NAVIGATION;
let planningCapacityScenario = 'effective'; // Default to 'effective'
let currentCapacityScenario = 'EffectiveBIS'; // Default scenario for capacity summary ('TeamBIS', 'EffectiveBIS', 'FundedHC')
let currentChartTeamId = '__ORG_VIEW__'; // To track which team's chart is displayed
let capacityChartInstance = null; // To hold the Chart.js instance
let applyCapacityConstraintsToggle = false; // Default to OFF
let lastAiGenerationStats = null; // Cache the latest AI stats for the modal
let currentViewId = null; // Track the currently active view for AI context scraping
if (typeof window !== 'undefined') window.currentViewId = currentViewId;

// --- Global App Settings ---
const defaultSettings = {
    ai: {
        isEnabled: false,
        provider: 'google-gemini',
        apiKey: null
    },
    // We can add more settings here later, e.g.:
    // theme: 'default',
    // autoSave: false
};
let globalSettings = JSON.parse(JSON.stringify(defaultSettings)); // Our live settings object
function syncGlobalSettingsToWindow() {
    if (typeof window !== 'undefined') {
        window.globalSettings = globalSettings;
    }
}
syncGlobalSettingsToWindow();

if (typeof mermaid !== 'undefined' && typeof mermaid.initialize === 'function') {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
} else {
    console.warn("Mermaid library not available during initialization.");
}

function updateAiDependentUI(options = {}) {
    const { skipPlanningRender = false } = options;
    const aiEnabled = !!(globalSettings?.ai?.isEnabled);

    // Toggle the new "Create with AI" card in the welcome view
    const createWithAiCard = document.getElementById('createWithAiCard');
    if (createWithAiCard) {
        createWithAiCard.style.display = aiEnabled ? 'block' : 'none';
    }

    // Legacy button removal (just in case)
    const createWithAiButton = document.getElementById('createWithAiButton');
    if (createWithAiButton) {
        createWithAiButton.style.display = 'none';
    }

    const aiChatButton = document.getElementById('aiChatButton');
    if (aiChatButton) {
        aiChatButton.style.display = (aiEnabled && currentViewId) ? 'inline-block' : 'none';
    }

    const chatContainer = document.getElementById('aiChatPanelContainer');
    const chatHandle = document.getElementById('chatResizeHandle');
    if (chatContainer) {
        if (aiEnabled) {
            chatContainer.style.display = 'block';
            if (!(window.aiChatAssistant && typeof window.aiChatAssistant.isAiChatPanelOpen === 'function' && window.aiChatAssistant.isAiChatPanelOpen())) {
                chatContainer.style.width = chatContainer.style.width || '0';
                if (chatHandle) chatHandle.style.display = 'none';
            }
        } else {
            if (window.aiChatAssistant && typeof window.aiChatAssistant.closeAiChatPanel === 'function') {
                window.aiChatAssistant.closeAiChatPanel();
            }
            chatContainer.style.display = 'none';
            if (chatHandle) chatHandle.style.display = 'none';
        }
    }

    if (!skipPlanningRender && currentViewId === 'planningView' && typeof renderPlanningView === 'function') {
        renderPlanningView();
    }
}
// --- End Global App Settings ---

// --- Carousel State ---
let currentVisualizationIndex = 0;
const visualizationItems = [
    { id: 'visualization', title: 'System Visualization' },
    { id: 'teamVisualization', title: 'Team Relationships Visualization' },
    { id: 'serviceRelationshipsVisualization', title: 'Service Relationships Visualization' },
    { id: 'dependencyVisualization', title: 'Service Dependency Visualization' },
    { id: 'serviceDependenciesTableSlide', title: 'Service Dependency Table' },
    { id: 'mermaidVisualization', title: 'System Architecture (Mermaid)' },
    { id: 'mermaidApiVisualization', title: 'Service API Interactions (Mermaid)' }
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
    1, 1, 1, 1,    // Jan (4 weeks) Weeks 1-4
    2, 2, 2, 2,    // Feb (4 weeks) Weeks 5-8
    3, 3, 3, 3, 3,  // Mar (5 weeks) Weeks 9-13
    4, 4, 4, 4,    // Apr (4 weeks) Weeks 14-17
    5, 5, 5, 5,    // May (4 weeks) Weeks 18-21
    6, 6, 6, 6, 6,  // Jun (5 weeks) Weeks 22-26
    7, 7, 7, 7,    // Jul (4 weeks) Weeks 27-30
    8, 8, 8, 8,    // Aug (4 weeks) Weeks 31-34
    9, 9, 9, 9, 9,  // Sep (5 weeks) Weeks 35-39
    10, 10, 10, 10, // Oct (4 weeks) Weeks 40-43
    11, 11, 11, 11, // Nov (4 weeks) Weeks 44-47
    12, 12, 12, 12, 12 // Dec (5 weeks) Weeks 48-52
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

// Maps a view's container ID to the ID of the button that activates it.
const VIEW_TO_BUTTON_MAP = {
    'visualizationCarousel': 'systemOverviewButton',
    'systemEditForm': 'editSystemButton',
    'organogramView': 'viewOrgChartButton',
    'planningView': 'manageYearPlanButton',
    'roadmapView': 'manageRoadmapButton',
    'dashboardView': 'dashboardViewButton',
    'capacityConfigView': 'tuneCapacityButton',
    'sdmForecastingView': 'sdmForecastButton',
    'ganttPlanningView': 'detailedPlanningButton'
};

// Fallback HTML snippets for components when fetch is unavailable (e.g., file:// protocol)
const HTML_COMPONENT_FALLBACKS = {
    'html/components/aiChatPanel.html': `
<div id="aiChatPanel" style="display: flex; flex-direction: column; width: 100%; height: 100%; background-color: #fff; border-left: 1px solid #ccc;">
    <div class="modal-header" style="border-top-left-radius: 8px; border-top-right-radius: 8px;">
        <h3 id="aiChatTitle" style="margin: 0; font-size: 1.2em;">AI Assistant</h3>
        <span class="close-button" onclick="closeAiChatPanel()">&times;</span>
    </div>
    <div id="aiChatLog" style="flex-grow: 1; padding: 10px; overflow-y: auto; background-color: #f8f9fa; border-bottom: 1px solid #eee;">
        <div class="chat-message ai-message">Hello! How can I help you analyze the current system?</div>
    </div>
    <div id="aiChatSuggestions" style="padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid #f1f1f1; border-bottom: 1px solid #ccc; background: #fff;"></div>
    <div id="aiChatUsageDisplay" style="font-size: 0.8em; color: #6c757d; text-align: right; padding: 0 10px 5px 10px;">Session Tokens: 0</div>
    <div id="aiChatInputContainer" style="padding: 10px; border-top: 1px solid #ccc; position: relative;">
        <div id="aiChatCommandPopup" style="display: none;"></div>
        <textarea id="aiChatInput" style="width: 100%; min-height: 70px; max-height: 280px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; box-sizing: border-box; padding: 6px 8px; line-height: 1.4; font-size: 0.95em;" placeholder="Ask about the current view..."></textarea>
        <button id="aiChatSendButton" class="btn-primary" style="width: 100%; margin-top: 5px;">Send</button>
    </div>
</div>`
};

/**
 * Helper to load HTML components from files into target containers.
 */
async function loadHtmlComponent(url, targetId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        const target = document.getElementById(targetId);
        if (target) {
            target.innerHTML = html;
            return true;
        } else {
            console.warn(`HTML load target '${targetId}' not found in DOM.`);
            return false;
        }
    } catch (error) {
        console.error(`Failed to load component ${url}:`, error);
        const fallbackHtml = HTML_COMPONENT_FALLBACKS[url];
        const target = document.getElementById(targetId);
        if (fallbackHtml && target) {
            console.warn(`Injecting fallback HTML for component '${url}'.`);
            target.innerHTML = fallbackHtml;
            return true;
        }
        return false;
    }
}

// --- Initialization ---
// Moved initialization to window.onload to ensure correct order

// --- AI Assistant & Settings Functions ---

/**
 * Opens the AI settings modal and populates it from globalSettings.
 */
function openAiSettingsModal() {
    console.log("Opening AI Settings Modal...");
    // We don't need loadGlobalSettings() here, as it's loaded on startup

    const modal = document.getElementById('aiSettingsModal');
    const checkbox = document.getElementById('aiModeEnabled');
    const configInputs = document.getElementById('aiConfigInputs');
    const providerSelect = document.getElementById('aiProviderSelect');
    const apiKeyInput = document.getElementById('aiApiKeyInput');

    if (checkbox) checkbox.checked = globalSettings.ai.isEnabled;
    if (configInputs) configInputs.style.display = globalSettings.ai.isEnabled ? 'block' : 'none';
    if (providerSelect) providerSelect.value = globalSettings.ai.provider;
    if (apiKeyInput) apiKeyInput.value = globalSettings.ai.apiKey || '';

    if (modal) modal.style.display = 'block';
}

/**
 * Closes the AI settings modal.
 */
function closeAiSettingsModal() {
    const modal = document.getElementById('aiSettingsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Loads all app settings from localStorage into the globalSettings object.
 */
function loadGlobalSettings() {
    const settingsString = localStorage.getItem(APP_SETTINGS_KEY);
    if (settingsString) {
        try {
            const loadedSettings = JSON.parse(settingsString);
            // Merge loaded settings with defaults to ensure all keys exist
            globalSettings = { ...defaultSettings, ...loadedSettings };
            syncGlobalSettingsToWindow();
            // Deep merge for nested objects like 'ai'
            if (loadedSettings.ai) {
                globalSettings.ai = { ...defaultSettings.ai, ...loadedSettings.ai };
            }
            console.log("Loaded global settings from localStorage:", {
                aiEnabled: globalSettings.ai.isEnabled,
                aiProvider: globalSettings.ai.provider,
                apiKeyExists: !!globalSettings.ai.apiKey
            });
        } catch (e) {
            console.error("Error parsing global settings from localStorage:", e);
            globalSettings = JSON.parse(JSON.stringify(defaultSettings)); // Reset to defaults
            syncGlobalSettingsToWindow();
        }
    } else {
        // No settings saved yet, use defaults
        globalSettings = JSON.parse(JSON.stringify(defaultSettings));
        syncGlobalSettingsToWindow();
        console.log("No global settings found, using defaults.");
    }

    // Update the UI based on loaded settings
    updateAiDependentUI();
}

/**
 * Saves the current state of the AI settings modal to globalSettings and localStorage.
 */
function saveGlobalSettings() {
    console.log("Saving global settings...");

    // Read values from the AI modal
    const checkbox = document.getElementById('aiModeEnabled');
    const providerSelect = document.getElementById('aiProviderSelect');
    const apiKeyInput = document.getElementById('aiApiKeyInput');

    const isEnabled = checkbox ? checkbox.checked : false;
    const provider = providerSelect ? providerSelect.value : 'google-gemini';
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : null;

    if (isEnabled && (!apiKey || apiKey.length === 0)) {
        alert("Please enter a valid API Key to enable AI Assistant mode.");
        if (checkbox) checkbox.checked = false; // Uncheck the box
        globalSettings.ai.isEnabled = false; // Don't save 'enabled' state
    } else {
        globalSettings.ai.isEnabled = isEnabled;
    }

    globalSettings.ai.provider = provider;
    globalSettings.ai.apiKey = apiKey;

    try {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(globalSettings));
        console.log("Saved global settings to localStorage.");

        updateAiDependentUI();

        closeAiSettingsModal();
        alert("Settings saved.");

    } catch (e) {
        console.error("Error saving global settings to localStorage:", e);
        alert("Error saving settings.");
    }
}

/**
 * Formats AI generation stats into a readable block of text.
 */
function formatAiStats(stats) {
    if (!stats) return "No statistics were provided.";
    const {
        inputChars = 0,
        outputChars = 0,
        outputTokens = 0,
        totalTokens = 0,
        systemPromptSummary = ''
    } = stats;

    return `Input Characters: ${inputChars.toLocaleString()}
Output Characters: ${outputChars.toLocaleString()}
Output Tokens: ${outputTokens.toLocaleString()}
Total Tokens (est.): ${totalTokens.toLocaleString()}

System Prompt Summary:
${systemPromptSummary}`.trim();
}

/**
 * Shows the AI stats modal with the latest metrics.
 */
function showAiStatsModal(stats) {
    const modal = document.getElementById('aiGenerationStatsModal');
    const content = document.getElementById('aiGenerationStatsContent');

    if (!modal || !content) {
        console.warn("AI Stats modal elements not found.");
        return;
    }

    if (stats) {
        lastAiGenerationStats = stats;
    }

    if (!lastAiGenerationStats) {
        console.warn("No AI stats available to display.");
        return;
    }

    content.textContent = formatAiStats(lastAiGenerationStats);
    modal.style.display = 'block';
}

/**
 * Hides the AI stats modal.
 */
function closeAiStatsModal() {
    const modal = document.getElementById('aiGenerationStatsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Handles the "Create with AI" button click.
 */
async function handleCreateWithAi() {
    // Read directly from the global settings
    if (!globalSettings.ai.isEnabled || !globalSettings.ai.apiKey) {
        alert("AI Assistant mode is not enabled or API key is missing. Please check AI settings.");
        return;
    }

    const prompt = window.prompt("Describe the new software system you want to create (e.g., 'A video streaming service like Netflix', 'An e-commerce platform like Amazon'):");

    if (!prompt || prompt.trim().length === 0) {
        console.log("AI system generation cancelled by user.");
        return;
    }

    const spinner = document.getElementById('aiLoadingSpinner');
    const spinnerP = spinner ? spinner.querySelector('p') : null;

    if (spinner && spinnerP) {
        spinnerP.textContent = 'AI is generating your system... This may take a moment.';
        spinner.style.display = 'flex';
    }

    // Hide stats modal from any previous run
    closeAiStatsModal();

    try {
        const result = await generateSystemFromPrompt(prompt, globalSettings.ai.apiKey, globalSettings.ai.provider, spinnerP);
        const newSystemData = result.data;
        const stats = result.stats;

        if (!newSystemData) {
            // Error alerts are already handled in generateSystemFromPrompt
            return;
        }

        // --- THIS IS THE VALIDATION STEP ---
        const { isValid, errors, warnings } = validateGeneratedSystem(newSystemData);

        if (!isValid) {
            console.error("AI Generation Failed Validation:", errors);
            const errorList = errors.slice(0, 10).join("\n- ");
            alert(`AI generation failed validation checks. The data is inconsistent. Please try again.\n\nErrors:\n- ${errorList}${errors.length > 10 ? '\n- ...and more.' : ''}`);
            return;
        }

        if (warnings.length > 0) {
            console.warn("AI Generation Warnings:", warnings);
        }
        // --- END OF VALIDATION STEP ---

        console.log("AI generation successful and validated:", newSystemData);

        currentSystemData = newSystemData;
        window.currentSystemData = currentSystemData;
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

        let finalSystemName = newSystemData.systemName;
        if (systems[finalSystemName]) {
            finalSystemName = `${finalSystemName} (AI ${Date.now().toString().slice(-5)})`;
            newSystemData.systemName = finalSystemName;
        }

        systems[finalSystemName] = newSystemData;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        // Display stats in modal
        if (stats) {
            showAiStatsModal(stats);
        }

        alert(`Successfully created and saved system: "${finalSystemName}"! Loading it now.`);
        loadSavedSystem(finalSystemName);

    } catch (error) {
        // This existing alert will show the final error message after all retries fail.
        alert("An error occurred during AI system generation. Please check the console.\nError: " + error.message);
        console.error("Error in handleCreateWithAi:", error);
    } finally {
        if (spinner) spinner.style.display = 'none';
        // Reset spinner text again in finally block for safety
        if (spinnerP) spinnerP.textContent = 'AI is generating your system... This may take a moment.';
    }
}

window.onload = async function () {
    console.log("!!! window.onload: Page HTML and synchronous scripts loaded. !!!");
    currentMode = Modes.NAVIGATION;

    console.log("Initializing Application Components...");

    // Initialize Managers
    window.navigationManager = new NavigationManager();
    window.sidebarComponent = new SidebarComponent('sidebar', window.navigationManager);
    window.headerComponent = new HeaderComponent('main-header');

    // Init components
    window.navigationManager.init(window.sidebarComponent, window.headerComponent);
    window.sidebarComponent.init();
    window.headerComponent.init();

    // Load HTML components before wiring up listeners
    try {
        await loadHtmlComponent('html/components/aiChatPanel.html', 'aiChatPanelContainer');
        // Additional shared components can be added here in the future.
    } catch (e) {
        console.error("Failed to load essential HTML components on startup.", e);
    }



    initializeEventListeners();
    loadGlobalSettings();

    // Save sample systems if none exist
    saveSampleSystemsToLocalStorage(); // Moved here to ensure it runs before potential initial switchView

    setTimeout(() => {
        console.log("Attempting initial switchView(null) after short delay.");
        switchView(null);
    }, 500);
};

/**
 * REVISED (v11 - Dashboard Fix)
 * Central function to manage switching between main views.
 */
function switchView(targetViewId, newMode = null) {
    console.log(`Switching view to: ${targetViewId || 'Home'}, Mode: ${newMode || 'Auto'}`);

    // 1. Close Modals (Legacy Logic)
    if (typeof closeRoadmapModal === 'function') closeRoadmapModal();
    if (typeof closeThemeManagementModal === 'function') closeThemeManagementModal();

    // 2. Handle Home/Null State
    if (!targetViewId) {
        // "Home" state - Show welcome/landing
        // REVISED: Keep sidebar and header visible for "Workspace" feel.
        const sidebar = document.getElementById('sidebar');
        const header = document.getElementById('main-header');
        if (sidebar) sidebar.style.display = 'flex';
        if (header) header.style.display = 'flex';

        if (window.navigationManager) {
            window.navigationManager.navigateTo('welcomeView');
        }
        return;
    }


    // 3. Show UI Elements
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('main-header');
    if (sidebar) sidebar.style.display = 'flex';
    if (header) header.style.display = 'flex';

    // 4. Use Navigation Manager
    if (!window.navigationManager) {
        console.warn("NavigationManager not initialized in switchView! Attempting lazy initialization.");
        try {
            window.navigationManager = new NavigationManager();
            if (window.sidebarComponent && window.headerComponent) {
                window.navigationManager.init(window.sidebarComponent, window.headerComponent);
            }
        } catch (e) {
            console.error("Failed to lazy initialize NavigationManager:", e);
        }
    }

    if (window.navigationManager) {
        window.navigationManager.navigateTo(targetViewId);
    } else {
        console.error("NavigationManager still not initialized!");
    }

    // 5. Update AI UI
    updateAiDependentUI({ skipPlanningRender: true });

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
    if (typeof window.setupVisualizationResizeObserver === 'function') {
        window.setupVisualizationResizeObserver();
    }
    const items = carouselContainer.querySelectorAll('.carousel-item');
    const titleElement = document.getElementById('visualizationTitle');

    // Keep the user anchored at the top when switching between visualizations.
    const mainContentArea = document.getElementById('main-content-area');
    if (mainContentArea) {
        mainContentArea.scrollTop = 0;
    }
    carouselContainer.scrollTop = 0;
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (index < 0 || index >= items.length || items.length === 0) {
        console.error("Invalid visualization index or no items:", index);
        items.forEach(item => item.style.display = 'none');
        if (titleElement) titleElement.textContent = 'No Visualization';
        return;
    }

    items.forEach(item => {
        item.style.display = 'none';
        item.classList.remove('active');
    });

    const targetItemId = visualizationItems[index]?.id;
    const targetItem = targetItemId ? document.getElementById(targetItemId) : null;

    if (targetItem) {
        targetItem.style.display = 'block';
        targetItem.classList.add('active');
        if (titleElement) titleElement.textContent = visualizationItems[index].title;

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
                    break;
                case 'serviceDependenciesTableSlide':
                    if (typeof generateServiceDependenciesTable === 'function') {
                        // Defer table render until after layout/visibility is applied to avoid zero-height issues.
                        requestAnimationFrame(() => generateServiceDependenciesTable());
                    }
                    break;
                case 'mermaidVisualization':
                    if (typeof renderMermaidDiagram === 'function') renderMermaidDiagram();
                    break;
                case 'mermaidApiVisualization':
                    if (typeof populateApiServiceSelection === 'function') populateApiServiceSelection();
                    if (typeof renderMermaidApiDiagram === 'function') renderMermaidApiDiagram();
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
 * REVISED: Saves sample systems to Local Storage ONLY if no data already exists.
 **/
function saveSampleSystemsToLocalStorage() {
    console.log(">>> Checking if sample systems need to be saved to LocalStorage...");

    const existingData = localStorage.getItem(LOCAL_STORAGE_KEY);

    // Only save sample systems if the key doesn't exist or if it's an empty object string
    if (!existingData || existingData === '{}') {
        console.log("No existing user data found or data is empty. Saving sample systems...");

        // Prepare systems object for saving (StreamView and ConnectPro)
        const systemsToSave = {
            'StreamView': sampleSystemDataStreamView, // Ensure this is defined in data.js
            'ConnectPro': sampleSystemDataContactCenter, // Ensure this is defined in data.js
            'ShopSphere': sampleSystemDataShopSphere,
            'InsightAI': sampleSystemDataInsightAI, // Add the new system
            'FinSecure': sampleSystemDataFinSecure // Add the new system
        };

        try {
            const stringifiedSystems = JSON.stringify(systemsToSave);
            localStorage.setItem(LOCAL_STORAGE_KEY, stringifiedSystems);
            console.log("Sample systems saved successfully to LocalStorage.");

        } catch (error) {
            console.error("Error stringifying or setting sample systems in localStorage:", error);
            alert("Error during initial sample data saving process. Check console.");
        }
    } else {
        console.log("Existing user data found in LocalStorage. Sample systems will not be overwritten.");
    }
    console.log("<<< Finished saveSampleSystemsToLocalStorage check.");
}

/** Show Saved Systems Modal **/
function showSavedSystems(systemNames) {
    if (!window.systemSelectionModal) {
        window.systemSelectionModal = new SystemSelectionModal();
    }
    window.systemSelectionModal.show(systemNames, (selectedSystem) => {
        loadSavedSystem(selectedSystem);
    });
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
    window.currentSystemData = currentSystemData;
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
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData);
    }

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
        (currentSystemData.capacityConfiguration.globalConstraints.orgEvents || []).forEach(event => { if (!event.attributes) event.attributes = {}; });
        if (!currentSystemData.capacityConfiguration.leaveTypes || currentSystemData.capacityConfiguration.leaveTypes.length === 0) {
            currentSystemData.capacityConfiguration.leaveTypes = JSON.parse(JSON.stringify(defaultCapacityConfig.leaveTypes));
        }
        (currentSystemData.capacityConfiguration.leaveTypes || []).forEach(lt => { if (!lt.attributes) lt.attributes = {}; });
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

    // --- Start a new AI chat session ---
    // This clears the old chat UI and primes the AI with the new system's persona/data.
    if (typeof aiAgentController !== 'undefined' && typeof aiAgentController.startSession === 'function') {
        aiAgentController.startSession();
    } else {
        console.error("main.js: aiAgentController.startSession() function not found.");
    }
    // --- END NEW ---

    switchView('visualizationCarousel');

    // Update sidebar state now that system is loaded
    if (window.sidebarComponent) {
        window.sidebarComponent.updateState();
    }

    try {
        populateServiceSelection();
        populateDependencyServiceSelection();
        generateServiceDependenciesTable();
        if (typeof populateApiServiceSelection === 'function') {
            populateApiServiceSelection();
        }
        console.log("[V7 LOAD] Finished loading and preparing display for system:", currentSystemData.systemName);
    } catch (error) {
        console.error("[V7 LOAD] Error regenerating parts of system overview content during load:", error);
        const carouselDiv = document.getElementById('visualizationCarousel');
        if (carouselDiv) carouselDiv.innerHTML = '<p style="color:red">Error loading some visualization components. Check console.</p>';
    }

    // Setup toggle buttons for platform components visibility
    if (typeof window.setupPlatformToggleButtons === 'function') {
        window.setupPlatformToggleButtons();
        console.log("[V7 LOAD] Called setupPlatformToggleButtons.");
    } else {
        console.error("[V7 LOAD] setupPlatformToggleButtons function not found. Platform toggles will not work.");
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

/**
 * Loads a system from local storage.
 * If multiple systems exist, shows a selection list.
 */
function loadSystem() {
    console.log("loadSystem called.");
    const systemsJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!systemsJSON) {
        alert('No saved systems found.');
        return;
    }

    let systems = {};
    try {
        systems = JSON.parse(systemsJSON);
    } catch (e) {
        console.error("Error parsing systems JSON:", e);
        alert('Error reading saved systems.');
        return;
    }

    const systemNames = Object.keys(systems);
    if (systemNames.length === 0) {
        alert('No saved systems found.');
        return;
    }

    if (systemNames.length === 1) {
        loadSavedSystem(systemNames[0]);
    } else {
        showSavedSystems(systemNames);
    }
}
window.loadSystem = loadSystem;

/** Updated function to handle "Create New Software System" button click **/
function createNewSystem() {
    currentMode = Modes.CREATING;

    const defaultSeniorManagersData = [];
    const defaultSDMsData = [];
    const defaultPMTsData = [];
    const defaultProjectManagersData = [];
    const defaultAllKnownEngineers = [];
    const defaultTeamsData = [];
    const defaultServicesData = [];

    // Default Yearly Initiatives (now with assignments array)
    const defaultYearlyInitiatives = [
        {
            initiativeId: 'initDefault-001',
            title: 'Setup Initial Project Environment',
            description: 'Configure repositories, CI/CD, and basic infrastructure for the new system.',
            isProtected: false,
            assignments: [], // Initialize with empty assignments array
            impactedServiceIds: [], // Keeping this distinct for now
            roi: {
                category: 'Enablement',
                valueType: 'Narrative',
                estimatedValue: 'Foundational Setup',
                currency: null, timeHorizonMonths: 1, confidenceLevel: 'High',
                calculationMethodology: 'Required to start any development.',
                businessCaseLink: null, overrideJustification: null,
                attributes: {}
            },
            targetDueDate: null,
            actualCompletionDate: null,
            status: 'Backlog',
            themes: [],
            primaryGoalId: null,
            projectManager: null,
            owner: null,
            technicalPOC: null,
            workPackageIds: [],
            attributes: {
                pmCapacityNotes: "",
                planningYear: new Date().getFullYear() // Add planningYear
            }
        }
    ];

    const defaultSystemData = {
        systemName: '',
        systemDescription: '',
        seniorManagers: defaultSeniorManagersData,
        sdms: defaultSDMsData,
        pmts: defaultPMTsData,
        projectManagers: defaultProjectManagersData,
        teams: defaultTeamsData,
        services: defaultServicesData,
        allKnownEngineers: defaultAllKnownEngineers,
        platformDependencies: [],
        capacityConfiguration: {
            workingDaysPerYear: 261,
            standardHoursPerDay: 8,
            globalConstraints: {
                publicHolidays: 0,
                orgEvents: []
            },
            leaveTypes: [
                { id: "annual", name: "Annual Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "sick", name: "Sick Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "study", name: "Study Leave", defaultEstimatedDays: 0, attributes: {} },
                { id: "inlieu", name: "Time off In-lieu Leave", defaultEstimatedDays: 0, attributes: {} }
            ],
            attributes: {}
        },
        yearlyInitiatives: defaultYearlyInitiatives,
        goals: [],
        definedThemes: [],
        archivedYearlyPlans: [],
        workPackages: [],
        calculatedCapacityMetrics: null,
        attributes: {}
    };

    currentSystemData = defaultSystemData;
    window.currentSystemData = currentSystemData;
    console.log("Initialized new currentSystemData:", JSON.parse(JSON.stringify(currentSystemData)));

    enterEditMode(true);
}
window.createNewSystem = createNewSystem;


/** Return to Home **/
function returnToHome() {
    console.log("Returning to Home/Welcome screen.");
    currentSystemData = null;
    window.currentSystemData = null;

    // Update sidebar state now that system is loaded
    if (window.sidebarComponent) {
        console.log("[V7 LOAD] Calling sidebarComponent.updateState()...");
        window.sidebarComponent.updateState();
    } else {
        console.warn("[V7 LOAD] window.sidebarComponent is missing!");
    }

    switchView('welcomeView', 'home');
}
window.returnToHome = returnToHome;

/** Reset to Default Sample Systems **/
function resetToDefaults() {
    if (confirm('This will erase all your saved systems and restore the default sample systems. Do you want to proceed?')) {
        try {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            console.log('Cleared user systems from localStorage.');
        } catch (error) {
            console.error('Failed to clear local storage before resetting defaults:', error);
            alert('Unable to reset defaults because local storage could not be cleared.');
            return;
        }
        saveSampleSystemsToLocalStorage(); // This will re-add the defaults
        currentSystemData = null;
        window.currentSystemData = null;
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
    closeButton.onclick = function () {
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
                errorMessages.push(`Engineer "${engineerName}" listed in team "${team.teamIdentity || team.teamId}" but not found in the global engineer roster (allKnownEngineErrors).`);
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

function showGanttPlanningView() {
    console.log("Switching to Detailed Planning (Gantt) View...");
    if (!currentSystemData) {
        alert("Please load a system first to manage detailed planning.");
        return;
    }
    switchView('ganttPlanningView', Modes.PLANNING);
    if (typeof initializeGanttPlanningView === 'function') {
        initializeGanttPlanningView();
    }
}
window.showGanttPlanningView = showGanttPlanningView;

/**
 * Shows the Organization Chart view.
 * MODIFIED: Now calls the new initializeOrgChartView to handle layout switching.
 */
function showOrganogramView() {
    console.log("Switching to Organogram View...");
    if (!currentSystemData) {
        alert("Please load a system first.");
        return;
    }
    switchView('organogramView', 'browse');

    // MODIFIED: Call the new initializer instead of old direct functions
    if (typeof initializeOrgChartView === 'function') {
        initializeOrgChartView();
    } else {
        console.error("initializeOrgChartView function not found. Cannot render org view.");
    }

    // REMOVED: These are now called by initializeOrgChartView
    // if (typeof generateOrganogram === 'function') {
    //     generateOrganogram();
    // }
    // if (typeof generateTeamTable === 'function') {
    //     generateTeamTable(currentSystemData);
    // }
}

function refreshCurrentView() {
    switch (currentViewId) {
        case 'planningView':
            if (typeof renderPlanningView === 'function') renderPlanningView();
            break;
        case 'organogramView':
            if (typeof initializeOrgChartView === 'function') initializeOrgChartView();
            break;
        case 'roadmapView':
            if (typeof initializeRoadmapView === 'function') initializeRoadmapView();
            break;
        case 'dashboardView':
            if (typeof initializeDashboard === 'function') initializeDashboard();
            break;
        case 'capacityConfigView':
            if (typeof updateCapacityCalculationsAndDisplay === 'function') updateCapacityCalculationsAndDisplay();
            break;
        case 'visualizationCarousel':
            if (typeof showVisualization === 'function') showVisualization(currentVisualizationIndex || 0);
            break;
        case 'systemEditForm':
            if (typeof showSystemEditForm === 'function') {
                showSystemEditForm(currentSystemData);
            }
            break;
        default:
            console.log(`[REFRESH] No specific refresh handler for view: ${currentViewId}`);
            break;
    }
}

/**
 * Shows the Yearly Planning view.
 */
function showPlanningView() {
    console.log("Switching to Year Planning View...");
    if (!currentSystemData) {
        alert("Please load a system first.");
        return;
    }
    switchView('planningView', 'planning');
    if (typeof renderPlanningView === 'function') {
        renderPlanningView();
    } else {
        console.error("renderPlanningView function not found. Did yearPlanning.js load correctly?");
    }
}

// Ensure the functions are globally accessible for the old onclick attributes,
// or for the new event listener setup.
if (typeof showOrganogramView === 'function') window.showOrganogramView = showOrganogramView;
if (typeof showEngineerTableView === 'function') window.showEngineerTableView = showEngineerTableView;
if (typeof showPlanningView === 'function') window.showPlanningView = showPlanningView;

// It's also best practice to move enterEditMode here from index.html
function enterEditMode(creatingNewSystem = false) {
    const mode = creatingNewSystem ? Modes.CREATING : Modes.EDITING;
    console.log(`Entering mode: ${mode}`);
    currentMode = mode;

    if (!currentSystemData) {
        alert("No system data to edit.");
        returnToHome();
        return;
    }
    // This function will call switchView internally
    showSystemEditForm(currentSystemData);
}
window.enterEditMode = enterEditMode;

/**
 * NEW: Initializes all event listeners for the top bar.
 * This is the recommended modern approach.
 */
function initializeEventListeners() {
    console.log("Initializing event listeners...");

    // Main Menu Buttons
    document.querySelector('.menu button:nth-child(1)')?.addEventListener('click', showSavedSystems);
    document.querySelector('.menu button:nth-child(2)')?.addEventListener('click', createNewSystem);
    document.getElementById('createWithAiButton')?.addEventListener('click', handleCreateWithAi);
    document.getElementById('deleteSystemButton')?.addEventListener('click', deleteSystem);
    document.querySelector('.menu button:nth-child(4)')?.addEventListener('click', resetToDefaults);

    // Edit Menu Buttons
    document.getElementById('systemOverviewButton')?.addEventListener('click', showSystemOverview);
    document.getElementById('editSystemButton')?.addEventListener('click', () => enterEditMode());
    document.getElementById('viewOrgChartButton')?.addEventListener('click', showOrganogramView);
    document.getElementById('manageYearPlanButton')?.addEventListener('click', showPlanningView);
    document.getElementById('manageRoadmapButton')?.addEventListener('click', showRoadmapView);
    document.getElementById('detailedPlanningButton')?.addEventListener('click', showGanttPlanningView);
    document.getElementById('dashboardViewButton')?.addEventListener('click', showDashboardView);
    document.getElementById('tuneCapacityButton')?.addEventListener('click', showCapacityConfigView);
    document.getElementById('sdmForecastButton')?.addEventListener('click', showSdmForecastingView);
    document.getElementById('aiSettingsButton')?.addEventListener('click', openAiSettingsModal);

    // AI Chat Button
    document.getElementById('aiChatButton')?.addEventListener('click', () => {
        if (!window.aiChatAssistant) return;
        if (typeof window.aiChatAssistant.isAiChatPanelOpen === 'function' && window.aiChatAssistant.isAiChatPanelOpen()) {
            if (typeof window.aiChatAssistant.closeAiChatPanel === 'function') {
                window.aiChatAssistant.closeAiChatPanel();
            }
        } else if (typeof window.aiChatAssistant.openAiChatPanel === 'function') {
            window.aiChatAssistant.openAiChatPanel();
        }
    });
    // Initialize the chat panel's internal listeners
    if (typeof initializeAiChatPanel === 'function') {
        initializeAiChatPanel();
    } else {
        console.error("main.js: initializeAiChatPanel() function not found. aiChatAssistant.js may not have loaded.");
    }

    // Global Nav Buttons
    document.getElementById('backToSystemViewButton')?.addEventListener('click', showSystemOverview);
    document.getElementById('returnHomeButton')?.addEventListener('click', returnToHome);

    // --- MODIFIED LISTENERS FOR THE NEW MODAL ---
    document.getElementById('saveAiSettingsButton')?.addEventListener('click', saveGlobalSettings); // <-- Changed function
    document.querySelector('#aiSettingsModal .close-button')?.addEventListener('click', closeAiSettingsModal);
    document.getElementById('aiModeEnabled')?.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        const configInputs = document.getElementById('aiConfigInputs');
        if (configInputs) {
            configInputs.style.display = isChecked ? 'block' : 'none';
        }
        globalSettings.ai.isEnabled = isChecked;
        syncGlobalSettingsToWindow();
        updateAiDependentUI();
    });
    // --- END MODIFIED LISTENERS ---


    console.log("Event listeners initialized.");
}



if (typeof showOrganogramView === 'function') window.showOrganogramView = showOrganogramView;
if (typeof showEngineerTableView === 'function') window.showEngineerTableView = showEngineerTableView;
if (typeof showPlanningView === 'function') window.showPlanningView = showPlanningView;
if (typeof showRoadmapView === 'function') window.showRoadmapView = showRoadmapView;
if (typeof showSystemOverview === 'function') window.showSystemOverview = showSystemOverview;
if (typeof returnToHome === 'function') window.returnToHome = returnToHome;
if (typeof createNewSystem === 'function') window.createNewSystem = createNewSystem;
if (typeof deleteSystem === 'function') window.deleteSystem = deleteSystem;
if (typeof resetToDefaults === 'function') window.resetToDefaults = resetToDefaults;
if (typeof showSavedSystems === 'function') window.showSavedSystems = showSavedSystems;
