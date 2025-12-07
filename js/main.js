let currentSystemData = null;
let currentMode = appState.Modes.NAVIGATION;

// Settings delegated to SettingsService (syncs to window.globalSettings for backward compatibility)
SettingsService.init();
console.log("main.js: Initialized settings via SettingsService.");

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

// Inline template fallbacks for TemplateLoader consumers
window.TEMPLATE_FALLBACKS = {
    'html/components/systems-view-template.html': `
<div class="systems-view">
    <div class="systems-view__header">
        <h1 class="systems-view__title">
            <i class="fas fa-server systems-view__icon"></i>
            My Systems
        </h1>
        <div class="systems-view__actions">
            <button id="createWithAiBtn" class="btn btn--primary btn--gradient" data-action="create-ai">
                <i class="fas fa-magic"></i> Create with AI
            </button>
            <button id="createSystemBtn" class="btn btn--primary" data-action="create-new">
                <i class="fas fa-plus"></i> Create New System
            </button>
        </div>
    </div>

    <div id="systemsGrid" class="systems-grid">
        <p>Loading systems...</p>
    </div>
</div>
`
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

/**
 * Loads all app settings from localStorage.
 */
function loadGlobalSettings() {
    SettingsService.load();
    AIService.updateAiDependentUI(SettingsService.get());
}

/**
 * Formats AI generation stats into a readable block of text.
 */
function formatAiStats(stats) {
    return AIService.formatAiStats(stats);
}

/**
 * Shows the AI stats modal with the latest metrics.
 */
function showAiStatsModal(stats) {
    AIService.showStatsModal(stats);
}

/**
 * Hides the AI stats modal.
 */
function closeAiStatsModal() {
    AIService.closeStatsModal();
}

/**
 * Handles the "Create with AI" button click.
 */
async function handleCreateWithAi() {
    const settings = SettingsService.get();
    if (!settings.ai.isEnabled || !settings.ai.apiKey) {
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
        const result = await generateSystemFromPrompt(prompt, settings.ai.apiKey, settings.ai.provider, spinnerP);
        const newSystemData = result.data;
        const stats = result.stats;

        if (!newSystemData) {
            // Error alerts are already handled in generateSystemFromPrompt
            return;
        }

        // --- THIS IS THE VALIDATION STEP ---
        const { isValid, errors, warnings } = AIService.validateGeneratedSystem(newSystemData);

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
    currentMode = appState.Modes.NAVIGATION;

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
    SystemService.initializeDefaults();

    setTimeout(() => {
        // Check for view in URL
        const urlParams = new URLSearchParams(window.location.search);
        const initialView = urlParams.get('view');
        console.log(`Attempting initial navigation. URL View: ${initialView}`);

        navigationManager.navigateTo(initialView || 'welcomeView');
    }, 500);
};

/**
 * REVISED Load Saved System - Delegates to SystemService
 */
function loadSavedSystem(systemName) {
    console.log(`[Load] Attempting to load system: ${systemName}`);

    const systemData = SystemService.loadSystem(systemName);

    if (!systemData) {
        window.notificationManager.showToast(`System "${systemName}" not found in storage.`, 'error');
        appState.closeCurrentSystem();
        return;
    }

    currentSystemData = systemData; // Assign to global
    window.currentSystemData = currentSystemData;

    // UI Cleanup
    const systemLoadListDiv = document.getElementById('systemLoadListDiv');
    if (systemLoadListDiv && systemLoadListDiv.parentNode === document.body) {
        document.body.removeChild(systemLoadListDiv);
    }

    d3.selectAll('.tooltip').remove();
    const legendDivs = ['legend', 'teamLegend', 'serviceLegend', 'dependencyLegend'];
    legendDivs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // --- Start a new AI chat session ---
    if (typeof aiAgentController !== 'undefined' && typeof aiAgentController.startSession === 'function') {
        aiAgentController.startSession();
    }

    navigationManager.navigateTo('visualizationCarousel');

    // Update sidebar state now that system is loaded
    if (window.sidebarComponent) {
        window.sidebarComponent.updateState();
    }

    console.log("[Load] System loaded and UI updated.");
}

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

/** Creates a new blank software system **/
function createNewSystem() {
    currentMode = appState.Modes.CREATING;

    // Delegate to SystemService
    const defaultSystemData = SystemService.createSystem();

    currentSystemData = defaultSystemData;
    window.currentSystemData = currentSystemData;
    console.log("Initialized new currentSystemData via SystemService.");

    navigationManager.navigateTo('systemEditForm');
}
window.createNewSystem = createNewSystem;


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

        // Re-add defaults explicitly using SystemService
        SystemService.initializeDefaults({ forceOverwrite: true });

        currentSystemData = null;
        window.currentSystemData = null;
        window.notificationManager.showToast('Systems have been reset to defaults.', 'success');
        appState.closeCurrentSystem();
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

    // Protection for sample systems
    if (window.systemRepository.isSampleSystem(systemName)) {
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
            const success = SystemService.deleteSystem(systemName);

            if (success) {
                console.log(`System "${systemName}" deleted.`);
                window.notificationManager.showToast(`System "${systemName}" has been deleted.`, 'success');

                // If we deleted the current system, return to home
                if (currentSystemData && currentSystemData.systemName === systemName) {
                    appState.closeCurrentSystem();
                }
            } else {
                window.notificationManager.showToast(`System "${systemName}" could not be deleted.`, 'error');
            }
        } catch (error) {
            console.error("Error deleting system:", error);
            window.notificationManager.showToast("An error occurred while deleting the system.", "error");
        }
    }
}
window.confirmAndDeleteSystem = confirmAndDeleteSystem;

/** Save System Changes **/
function saveSystemChanges() {
    console.log("saveSystemChanges called. Persisting currentSystemData.");

    if (!currentSystemData || !currentSystemData.systemName) {
        window.notificationManager.showToast('System name cannot be empty if trying to save.', 'error');
        // Attempt to get it from input if in edit mode
        const systemNameInput = document.getElementById('systemNameInput');
        if (systemNameInput && systemNameInput.value.trim()) {
            currentSystemData.systemName = systemNameInput.value.trim();
        } else {
            console.error("Cannot save: System name is missing in currentSystemData.");
            return false;
        }
    }
    // Ensure description is also up-to-date if possible
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');
    if (systemDescriptionTextarea && currentSystemData) {
        currentSystemData.systemDescription = systemDescriptionTextarea.value.trim();
    }

    // Delegate to SystemService
    const success = SystemService.saveSystem(currentSystemData);

    if (success) {
        window.notificationManager.showToast(`System "${currentSystemData.systemName}" saved successfully.`, 'success');

        // Update sidebar state
        if (window.sidebarComponent) {
            window.sidebarComponent.updateState();
        }
        return true;
    } else {
        window.notificationManager.showToast("Failed to save system. See console for details.", "error");
        return false;
    }
}
window.saveSystemChanges = saveSystemChanges;

/**
 * Centralized function to recalculate capacity metrics and refresh relevant views.
 * Should be called whenever capacity inputs (config, team structure, forecasts) change.
 */
function updateCapacityCalculationsAndDisplay() {
    console.log("[Capacity] Recalculating metrics...");
    if (!currentSystemData) return;

    // 1. Recalculate
    const capacityEngine = new CapacityEngine(currentSystemData);
    const metrics = capacityEngine.calculateAllMetrics();
    currentSystemData.calculatedCapacityMetrics = metrics;

    // 2. Refresh UI based on current view
    // If we are in the Capacity Planning View (which contains Dashboard & Config)
    if (window.workspaceComponent && window.workspaceComponent.currentViewId === 'capacityConfigView') {
        // If the active component is the Dashboard, re-render it
        // We can access the view instance if it's stored globally or via the container
        // For now, we'll rely on the fact that CapacityPlanningView manages its own state.
        // If we are strictly in the Dashboard sub-view, we might want to trigger a re-render.
        // However, CapacityPlanningView.switchView('dashboard') does a fresh render.

        // If we are just refreshing the data, we might need to find the active dashboard instance.
        // A simpler approach for this legacy/hybrid codebase is to check if the dashboard container exists.
        const dashboardContainer = document.querySelector('.capacity-dashboard-view');
        if (dashboardContainer) {
            // Re-instantiate dashboard to refresh data
            const dashboard = new CapacityDashboardView();
            // We need to find the container to render into. 
            // The dashboard is usually inside #capacityPlanningContent
            const contentContainer = document.getElementById('capacityPlanningContent');
            if (contentContainer) {
                dashboard.render(contentContainer);
            }
        }
    } else if (currentViewId === 'planningView') {
        renderPlanningView();
    }

    console.log("[Capacity] Metrics updated and UI refreshed.");
}
window.updateCapacityCalculationsAndDisplay = updateCapacityCalculationsAndDisplay;
function refreshCurrentView() {
    // Prefer NavigationManager so views render through WorkspaceComponent (consistent with refactor)
    if (window.navigationManager && typeof window.navigationManager.navigateTo === 'function' && currentViewId) {
        // Use popstate flag to avoid duplicating history entries
        window.navigationManager.navigateTo(currentViewId, {}, true);
        return;
    }

    switch (currentViewId) {
        case 'planningView':
            renderPlanningView();
            break;
        case 'organogramView':
            navigationManager.navigateTo('organogramView', {}, true);
            break;

        case 'capacityConfigView':
            updateCapacityCalculationsAndDisplay();
            break;
        case 'visualizationCarousel':
            showVisualization(currentVisualizationIndex || 0);
            break;
        case 'systemEditForm':
            showSystemEditForm(currentSystemData);
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
    initializeAiChatPanel();
    console.log("Event listeners initialized.");
}
