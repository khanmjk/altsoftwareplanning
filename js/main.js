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

function clearContainer(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function buildAiChatPanel() {
    const panel = document.createElement('div');
    panel.id = 'aiChatPanel';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h3');
    title.id = 'aiChatTitle';
    title.textContent = 'AI Assistant';
    header.appendChild(title);

    const closeButton = document.createElement('span');
    closeButton.id = 'aiChatCloseButton';
    closeButton.className = 'close-button';
    closeButton.textContent = String.fromCharCode(215);
    header.appendChild(closeButton);

    const log = document.createElement('div');
    log.id = 'aiChatLog';
    const greeting = document.createElement('div');
    greeting.className = 'chat-message ai-message';
    greeting.textContent = 'Hello! How can I help you analyze the current system?';
    log.appendChild(greeting);

    const suggestions = document.createElement('div');
    suggestions.id = 'aiChatSuggestions';

    const usage = document.createElement('div');
    usage.id = 'aiChatUsageDisplay';
    usage.textContent = 'Session Tokens: 0';

    const inputContainer = document.createElement('div');
    inputContainer.id = 'aiChatInputContainer';

    const commandPopup = document.createElement('div');
    commandPopup.id = 'aiChatCommandPopup';
    inputContainer.appendChild(commandPopup);

    const input = document.createElement('textarea');
    input.id = 'aiChatInput';
    input.placeholder = 'Ask about the current view...';
    inputContainer.appendChild(input);

    const sendButton = document.createElement('button');
    sendButton.id = 'aiChatSendButton';
    sendButton.className = 'btn-primary';
    sendButton.textContent = 'Send';
    inputContainer.appendChild(sendButton);

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(suggestions);
    panel.appendChild(usage);
    panel.appendChild(inputContainer);

    return panel;
}

function renderAiChatPanel(targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
        console.warn(`AI chat panel target '${targetId}' not found in DOM.`);
        return false;
    }

    clearContainer(target);
    target.appendChild(buildAiChatPanel());
    return true;
}



// Global Component Instances

window.onload = function () {

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

    // Configure system storage (only main.js reads window.* config)
    const storageConfig = {};
    if (window.LOCAL_STORAGE_KEY) {
        storageConfig.storageKey = window.LOCAL_STORAGE_KEY;
    }
    if (window.APP_STORAGE_MODE) {
        storageConfig.storageMode = window.APP_STORAGE_MODE;
    }
    if (window.APP_STORAGE_DRIVER) {
        storageConfig.driver = window.APP_STORAGE_DRIVER;
    }
    if (Object.keys(storageConfig).length > 0) {
        SystemService.configureStorage(storageConfig);
    }

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

    // Render shared components before wiring up listeners
    if (!renderAiChatPanel('aiChatPanelContainer')) {
        console.error('Failed to render essential UI components on startup.');
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
