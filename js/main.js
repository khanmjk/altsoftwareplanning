let currentSystemData = null;




let currentMode = Modes.NAVIGATION;
let planningCapacityScenario = 'effective'; // Default to 'effective'
let currentCapacityScenario = 'EffectiveBIS'; // Default scenario for capacity summary ('TeamBIS', 'EffectiveBIS', 'FundedHC')
let currentChartTeamId = '__ORG_VIEW__'; // To track which team's chart is displayed
let capacityChartInstance = null; // To hold the Chart.js instance
let applyCapacityConstraintsToggle = false; // Default to OFF
let lastAiGenerationStats = null; // Cache the latest AI stats for the modal
// currentViewId is now managed globally on window by NavigationManager
if (typeof window !== 'undefined' && !window.currentViewId) window.currentViewId = null;

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
// Moved to visualizations.js
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


// Global state for engineer table sorting


// For Planning Table Drag & Drop
let draggedInitiativeId = null;
let draggedRowElement = null;

// Store temporary assignments before adding initiative



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
        window.notificationManager.showToast("AI Assistant mode is not enabled or API key is missing. Please check AI settings.", "error");
        return;
    }

    const prompt = await window.notificationManager.prompt("Describe the new software system you want to create (e.g., 'A video streaming service like Netflix', 'An e-commerce platform like Amazon'):", "", "Create New System with AI");

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
            window.notificationManager.showToast(`AI generation failed validation checks. The data is inconsistent. Please try again.\n\nErrors:\n- ${errorList}${errors.length > 10 ? '\n- ...and more.' : ''}`, "error");
            return;
        }

        if (warnings.length > 0) {
            console.warn("AI Generation Warnings:", warnings);
        }
        // --- END OF VALIDATION STEP ---

        console.log("AI generation successful and validated:", newSystemData);

        currentSystemData = newSystemData;
        window.currentSystemData = currentSystemData;

        let finalSystemName = newSystemData.systemName;
        if (window.systemRepository.getSystemData(finalSystemName)) {
            finalSystemName = `${finalSystemName} (AI ${Date.now().toString().slice(-5)})`;
            newSystemData.systemName = finalSystemName;
        }

        window.systemRepository.saveSystem(finalSystemName, newSystemData);

        // Display stats in modal
        if (stats) {
            showAiStatsModal(stats);
        }

        window.notificationManager.showToast(`Successfully created and saved system: "${finalSystemName}"! Loading it now.`, "success");
        loadSavedSystem(finalSystemName);

    } catch (error) {
        // This existing alert will show the final error message after all retries fail.
        window.notificationManager.showToast("An error occurred during AI system generation. Please check the console.\nError: " + error.message, "error");
        console.error("Error in handleCreateWithAi:", error);
    } finally {
        if (spinner) spinner.style.display = 'none';
        // Reset spinner text again in finally block for safety
        if (spinnerP) spinnerP.textContent = 'AI is generating your system... This may take a moment.';
    }
}

window.onload = async function () {
    // console.log("!!! window.onload: Page HTML and synchronous scripts loaded. !!!");
    currentMode = Modes.NAVIGATION;

    // console.log("Initializing Application Components...");

    // Initialize Managers
    window.notificationManager = new NotificationManager();
    window.navigationManager = new NavigationManager();

    // Initialize Components
    window.headerComponent = new HeaderComponent('main-header');
    window.sidebarComponent = new SidebarComponent('sidebar', window.navigationManager);
    window.workspaceComponent = new WorkspaceComponent('main-content-area');

    // Initialize Navigation
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
        // Check for view in URL
        const urlParams = new URLSearchParams(window.location.search);
        const initialView = urlParams.get('view');

        console.log(`Attempting initial navigation. URL View: ${initialView}`);

        if (initialView) {
            // Use switchView which now uses NavigationManager
            switchView(initialView);
        } else {
            switchView(null); // Default to welcome
        }
    }, 500);
};

/**
 * REVISED (v11 - Dashboard Fix)
 * Central function to manage switching between main views.
 */
function switchView(targetViewId, newMode = null) {
    // console.log(`Switching view to: ${targetViewId || 'Home'}, Mode: ${newMode || 'Auto'}`);

    // 1. Close Modals (Legacy Logic)
    if (typeof closeRoadmapModal === 'function') closeRoadmapModal();

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
 * Toggles collapsible sections.
 */
function toggleCollapsibleSection(contentId, indicatorId, handleId = null) {
    // console.log(`toggleCollapsibleSection called with contentId: '${contentId}', indicatorId: '${indicatorId}', handleId: '${handleId}'`);
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
    // console.log(`Toggled section ${contentId} to ${isHidden ? 'visible' : 'hidden'}`);
}

/** Save Sample Systems to Local Storage if not already present **/
/**
 * Saves sample systems to Local Storage.
 * Default: add missing samples without touching existing (editable) ones.
 * Use { forceOverwrite: true } to reset all samples to defaults.
 */
function saveSampleSystemsToLocalStorage(options = {}) {
    const { forceOverwrite = false } = options;

    const sampleSystems = {
        'StreamView': sampleSystemDataStreamView,
        'ConnectPro': sampleSystemDataContactCenter,
        'ShopSphere': sampleSystemDataShopSphere,
        'InsightAI': sampleSystemDataInsightAI,
        'FinSecure': sampleSystemDataFinSecure
    };

    Object.entries(sampleSystems).forEach(([key, data]) => {
        const exists = window.systemRepository.getSystemData(key);
        if (forceOverwrite || !exists) {
            window.systemRepository.saveSystem(key, data);
        }
    });
}

/** Show Saved Systems Modal **/



/** REVISED (v7) Load Saved System - Enhanced Logging for allKnownEngineers */
function loadSavedSystem(systemName) {
    console.log(`[V7 LOAD] Attempting to load system: ${systemName}`);
    const systemData = window.systemRepository.getSystemData(systemName);
    if (!systemData) {
        window.notificationManager.showToast(`System "${systemName}" not found in storage.`, 'error');
        console.error(`[V7 LOAD] System "${systemName}" not found in repository.`);
        returnToHome();
        return;
    }

    currentSystemData = systemData; // Assign to global
    window.currentSystemData = currentSystemData;
    console.log(`[V7 LOAD] Successfully loaded system data for: "${currentSystemData.systemName}" from repository.`);

    // ----- IMMEDIATE CHECK of allKnownEngineers -----
    if (currentSystemData.allKnownEngineers && Array.isArray(currentSystemData.allKnownEngineers)) {
        // console.log(`[V7 LOAD - PRE-AUGMENTATION] 'currentSystemData.allKnownEngineers' IS present. Length: ${currentSystemData.allKnownEngineers.length}`);
        if (currentSystemData.allKnownEngineers.length > 0) {
            // console.log("[V7 LOAD - PRE-AUGMENTATION] Sample of loaded allKnownEngineers[0]:", JSON.stringify(currentSystemData.allKnownEngineers[0]));
        }
    } else {
        console.warn(`[V7 LOAD - PRE-AUGMENTATION] 'currentSystemData.allKnownEngineers' is MISSING or not an array upon loading for system "${systemName}". Will attempt to initialize.`);
    }
    // ----- END IMMEDIATE CHECK -----


    // --- DATA AUGMENTATION: Ensure new fields/arrays exist for older saved data ---
    // console.log("[V7 LOAD] Augmenting loaded system data with new model defaults if missing...");

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
    // console.log("[V7 LOAD] Data augmentation complete.");
    // --- End Data Augmentation ---


    const systemLoadListDiv = document.getElementById('systemLoadListDiv');
    if (systemLoadListDiv && systemLoadListDiv.parentNode === document.body) {
        document.body.removeChild(systemLoadListDiv);
        // console.log("[V7 LOAD] Removed system load list modal.");
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

    console.log("[V7 LOAD] Finished loading and preparing display for system:", currentSystemData.systemName);

    // Setup toggle buttons for platform components visibility

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
/**
 * Loads a system from local storage.
 * If multiple systems exist, shows the Systems View.
 */
function loadSystem() {
    // console.log("loadSystem called.");

    // If NavigationManager is available, use it to go to the Systems View
    if (window.navigationManager) {
        window.navigationManager.navigateTo('systemsView');
        return;
    }

    // Fallback if NavigationManager is not ready (shouldn't happen in normal flow)
    console.warn("NavigationManager not found, attempting manual switch to systemsView");
    if (window.workspaceComponent) {
        window.workspaceComponent.render('systemsView', (container) => {
            if (!window.systemsViewInstance) {
                window.systemsViewInstance = new SystemsView(container.id);
            } else {
                window.systemsViewInstance.container = container;
            }
            window.systemsViewInstance.render();
        });
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

    switchView('systemEditForm');
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
async function resetToDefaults() {
    if (await window.notificationManager.confirm('This will erase all your saved systems and restore the default sample systems. Do you want to proceed?', 'Reset to Defaults', { confirmStyle: 'danger', confirmText: 'Reset' })) {
        try {
            window.systemRepository.clearAllSystems();
            console.log('Cleared user systems from localStorage.');
        } catch (error) {
            console.error('Failed to clear local storage before resetting defaults:', error);
            window.notificationManager.showToast('Unable to reset defaults because local storage could not be cleared.', 'error');
            return;
        }
        saveSampleSystemsToLocalStorage({ forceOverwrite: true }); // Re-add defaults explicitly
        currentSystemData = null;
        window.currentSystemData = null;
        window.notificationManager.showToast('Systems have been reset to defaults.', 'success');
        returnToHome();
    }
}
window.resetToDefaults = resetToDefaults;

/** Delete System (logic to prompt user) **/
function deleteSystem() {
    console.log("Initiating system deletion process...");

    if (!currentSystemData || !currentSystemData.systemName) {
        window.notificationManager.showToast('No system currently loaded to delete.', 'warning');
        return;
    }

    const systemName = currentSystemData.systemName;

    // Hardcoded list of sample systems to protect
    // Ideally this should be shared with saveSampleSystemsToLocalStorage, but for now we duplicate or check against known keys
    const sampleSystemNames = [
        'StreamView',
        'ConnectPro',
        'ShopSphere',
        'InsightAI',
        'FinSecure'
    ];

    if (sampleSystemNames.includes(systemName)) {
        window.notificationManager.showToast(`Cannot delete built-in sample system: "${systemName}".`, 'error');
        return;
    }

    // Direct confirmation for current system
    confirmAndDeleteSystem(systemName);
}
window.deleteSystem = deleteSystem;

/** Confirms and deletes the specified system from storage **/
async function confirmAndDeleteSystem(systemName) {
    if (!systemName) return;

    const confirmed = await window.notificationManager.confirm(
        `Are you sure you want to permanently delete the system "${systemName}"? This action cannot be undone.`,
        'Delete System',
        { confirmStyle: 'danger', confirmText: 'Delete Forever' }
    );

    if (confirmed) {
        try {
            const deleted = window.systemRepository.deleteSystem(systemName);
            if (deleted) {
                console.log(`System "${systemName}" deleted from repository.`);

                window.notificationManager.showToast(`System "${systemName}" has been deleted.`, 'success');

                // If we deleted the current system, return to home
                if (currentSystemData && currentSystemData.systemName === systemName) {
                    returnToHome();
                }
            } else {
                window.notificationManager.showToast(`System "${systemName}" not found in storage.`, 'error');
            }
        } catch (error) {
            console.error("Error deleting system:", error);
            window.notificationManager.showToast("An error occurred while deleting the system.", "error");
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
        window.notificationManager.showToast("Validation Error: Cannot save changes due to data inconsistencies.\n\n" + errorMessages.join("\n") + "\n\nPlease review team assignments and engineer records.", "error");
    }
    return isValid;
}


/** Save System Changes (Placeholder - full save logic in saveAllChanges) **/
function saveSystemChanges() {
    // This function is now primarily a wrapper if called from simple contexts.
    // The main save logic including validation is in saveAllChanges or specific save buttons.
    console.log("saveSystemChanges called. Persisting currentSystemData.");

    if (!currentSystemData || !currentSystemData.systemName) {
        window.notificationManager.showToast('System name cannot be empty if trying to save.', 'error');
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
        // Track last modified for sorting and display in Systems view (handled in repository)
        const saved = window.systemRepository.saveSystem(currentSystemData.systemName, currentSystemData);
        if (saved) {
            console.log('System changes saved via SystemRepository.');
            return true; // Indicate success
        }
        console.error("SystemRepository.saveSystem returned false.");
        return false;
    } catch (error) {
        console.error("Error saving system via repository in saveSystemChanges:", error);
        window.notificationManager.showToast("An error occurred while saving. Please check console.", "error");
        return false; // Indicate failure
    }
}










function refreshCurrentView() {
    switch (currentViewId) {
        case 'planningView':
            if (typeof renderPlanningView === 'function') renderPlanningView();
            break;
        case 'organogramView':
            // Use switchView to ensure proper rendering via WorkspaceComponent
            switchView('organogramView');
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



// Ensure the functions are globally accessible for the old onclick attributes,
// or for the new event listener setup.




/**
 * NEW: Initializes all event listeners for the top bar.
 * This is the recommended modern approach.
 */
function initializeEventListeners() {
    console.log("Initializing event listeners...");




    // Initialize the chat panel's internal listeners (Required for Header AI Button)
    if (typeof initializeAiChatPanel === 'function') {
        initializeAiChatPanel();
    } else {
        console.error("main.js: initializeAiChatPanel() function not found. aiChatAssistant.js may not have loaded.");
    }
    console.log("Event listeners initialized.");
}




if (typeof returnToHome === 'function') window.returnToHome = returnToHome;
if (typeof createNewSystem === 'function') window.createNewSystem = createNewSystem;
if (typeof deleteSystem === 'function') window.deleteSystem = deleteSystem;
if (typeof resetToDefaults === 'function') window.resetToDefaults = resetToDefaults;
