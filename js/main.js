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

  // Build Workspace Shell (layout + header/toolbar/content containers)
  const workspaceShell = new WorkspaceShellComponent('app-root');
  workspaceShell.render();

  // Initialize Components
  window.headerComponent = new HeaderComponent('workspace-header');
  window.sidebarComponent = new SidebarComponent('sidebar', window.navigationManager);
  window.workspaceComponent = new WorkspaceComponent('main-content-area');
  workspaceComponent.initExtensions();
  workspaceComponent.registerExtension(new AIChatPanelExtension());

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

  // Backend observability (advisory only; app remains local-first).
  if (typeof BackendStatusService !== 'undefined') {
    BackendStatusService.startPolling();
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
