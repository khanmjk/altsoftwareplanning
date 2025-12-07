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
    AIService.closeStatsModal();

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

        SystemService.setCurrentSystem(newSystemData);

        let finalSystemName = newSystemData.systemName;
        if (window.systemRepository.getSystemData(finalSystemName)) {
            finalSystemName = `${finalSystemName} (AI ${Date.now().toString().slice(-5)})`;
            newSystemData.systemName = finalSystemName;
        }

        window.systemRepository.saveSystem(finalSystemName, newSystemData);

        if (stats) {
            AIService.showStatsModal(stats);
        }

        window.notificationManager.showToast(`Successfully created and saved system: "${finalSystemName}"! Loading it now.`, "success");
        SystemService.loadAndActivate(finalSystemName);

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

    // Initialize Settings
    SettingsService.init();

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

    // Initialize the chat panel's internal listeners (Required for Header AI Button)
    initializeAiChatPanel();

    // Load settings and update AI UI
    SettingsService.load();
    AIService.updateAiDependentUI(SettingsService.get());

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

