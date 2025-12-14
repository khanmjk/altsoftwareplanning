/**
 * main.js
 * Application Entry Point
 *
 * This file is responsible for bootstrapping the application. It:
 * 1. Initializes core Services (Settings, System).
 * 2. Instantiates global Managers (Navigation).
 * 3. Creates and wires up UI Components (Header, Sidebar, Workspace).
 * 4. Sets up global event listeners (e.g., AI delegation).
 * 5. Handles initial routing and view navigation.
 */

// Fallback HTML snippets for components when fetch is unavailable (e.g., file:// protocol)
const HTML_COMPONENT_FALLBACKS = {
    'html/components/aiChatPanel.html': `
<div id="aiChatPanel">
    <div class="modal-header">
        <h3 id="aiChatTitle">AI Assistant</h3>
        <span id="aiChatCloseButton" class="close-button">&times;</span>
    </div>
    <div id="aiChatLog">
        <div class="chat-message ai-message">Hello! How can I help you analyze the current system?</div>
    </div>
    <div id="aiChatSuggestions"></div>
    <div id="aiChatUsageDisplay">Session Tokens: 0</div>
    <div id="aiChatInputContainer">
        <div id="aiChatCommandPopup"></div>
        <textarea id="aiChatInput" placeholder="Ask about the current view..."></textarea>
        <button id="aiChatSendButton" class="btn-primary">Send</button>
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



// Global Component Instances

window.onload = async function () {

    // ============================================================================
    // GLOBAL CLASS/OBJECT REGISTRATIONS
    // Per coding-agent-contract.md, all window.* assignments must be in onload
    // ============================================================================
    window.CapacityEngine = CapacityEngine;
    window.FeatureFlags = FeatureFlags;
    window.NavigationManager = NavigationManager;

    // Initialize Settings
    SettingsService.init();

    // Initialize Theme (must be after Settings)
    ThemeService.init();

    // Initialize Managers
    window.navigationManager = new NavigationManager();

    // Initialize Components
    window.headerComponent = new HeaderComponent('main-header');
    window.sidebarComponent = new SidebarComponent('sidebar', window.navigationManager);
    window.workspaceComponent = new WorkspaceComponent('main-content-area');

    // AI Generation Overlay Event Listener (Event Delegation to handle view re-renders)
    document.addEventListener('click', (event) => {
        const createWithAiCard = event.target.closest('#createWithAiCard');
        if (createWithAiCard) {
            AIGenProgressOverlayView.getInstance().startGenerationFlow();
        }
    });

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

    // Update AI UI based on loaded settings
    AIService.updateAiDependentUI(SettingsService.get());

    // Save sample systems if none exist
    SystemService.initializeDefaults();

    // Check for view in URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view');
    console.log(`Attempting initial navigation. URL View: ${initialView}`);

    navigationManager.navigateTo(initialView || 'welcomeView');
};
