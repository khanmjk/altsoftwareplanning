/**
 * NavigationManager
 * Centralizes view switching logic and coordinates components.
 * 
 * Uses a VIEW_REGISTRY pattern for declarative view configuration
 * and an internal viewInstances Map for singleton management.
 */

/**
 * VIEW_REGISTRY - Declarative configuration for all navigable views.
 * Uses string class names to avoid parse-time dependencies.
 * Classes are resolved at runtime in getOrCreateView().
 */
const VIEW_REGISTRY = {
    welcomeView: {
        className: 'WelcomeView',
        title: 'Welcome',
        breadcrumbs: [],
        singleton: true,
        requiresSystem: false,
        selfManaged: false
    },
    planningView: {
        className: 'YearPlanningView',
        title: 'Year Plan',
        breadcrumbs: ['Planning', 'Year Plan'],
        singleton: true,
        requiresSystem: true,
        selfManaged: false
    },
    ganttPlanningView: {
        className: 'GanttPlanningView',
        title: 'Detailed Planning',
        breadcrumbs: ['Planning', 'Detailed Planning'],
        singleton: true,
        requiresSystem: true,
        selfManaged: false
    },
    capacityConfigView: {
        className: 'CapacityPlanningView',
        title: 'Capacity Tuning',
        breadcrumbs: ['Planning', 'Capacity Tuning'],
        singleton: true,
        requiresSystem: true,
        selfManaged: true
    },
    sdmForecastingView: {
        className: 'ResourceForecastView',
        title: 'Resource Forecast',
        breadcrumbs: ['Planning', 'Resource Forecast'],
        singleton: true,
        requiresSystem: true,
        selfManaged: true
    },
    roadmapView: {
        className: 'RoadmapView',
        title: 'Roadmap & Backlog',
        breadcrumbs: ['Product', 'Roadmap & Backlog'],
        singleton: true,
        requiresSystem: true,
        selfManaged: true
    },
    managementView: {
        className: 'ManagementView',
        title: 'Management',
        breadcrumbs: ['Product', 'Management'],
        singleton: true,
        requiresSystem: true,
        selfManaged: true
    },
    visualizationCarousel: {
        className: 'SystemOverviewView',
        title: 'System Overview',
        breadcrumbs: ['System', 'System Overview'],
        singleton: true,
        requiresSystem: true,
        selfManaged: false
    },
    organogramView: {
        className: 'OrgView',
        title: 'Org Design',
        breadcrumbs: ['System', 'Org Design'],
        singleton: true,
        requiresSystem: true,
        selfManaged: false
    },
    systemEditForm: {
        className: 'SystemEditView',
        title: 'Edit System',
        breadcrumbs: ['System', 'Edit System'],
        singleton: true,
        requiresSystem: false,
        selfManaged: false
    },
    dashboardView: {
        className: 'DashboardView',
        title: 'Dashboard',
        breadcrumbs: ['Insights', 'Dashboard'],
        singleton: true,
        requiresSystem: true,
        selfManaged: true
    },
    helpView: {
        className: 'HelpView',
        title: 'How to Guide',
        breadcrumbs: ['Help', 'How to Guide'],
        singleton: true,
        requiresSystem: false,
        selfManaged: true
    },
    settingsView: {
        className: 'SettingsView',
        title: 'Settings',
        breadcrumbs: ['Configuration', 'Settings'],
        singleton: true,
        requiresSystem: false,
        selfManaged: false
    },
    systemsView: {
        className: 'SystemsView',
        title: 'My Systems',
        breadcrumbs: ['My Systems'],
        singleton: true,
        requiresSystem: false,
        selfManaged: false
    },
    aboutView: {
        className: 'AboutView',
        title: 'About',
        breadcrumbs: ['Help', 'About'],
        singleton: true,
        requiresSystem: false,
        selfManaged: true
    }
};

/**
 * CLASS_MAP - Maps class name strings to actual class constructors.
 * Populated lazily on first navigation to ensure all classes are defined.
 */
let CLASS_MAP = null;

function getClassMap() {
    if (CLASS_MAP) return CLASS_MAP;

    CLASS_MAP = {
        WelcomeView,
        YearPlanningView,
        GanttPlanningView,
        CapacityPlanningView,
        ResourceForecastView,
        RoadmapView,
        ManagementView,
        SystemOverviewView,
        OrgView,
        SystemEditView,
        DashboardView,
        HelpView,
        SettingsView,
        SystemsView,
        AboutView
    };
    return CLASS_MAP;
}

class NavigationManager {
    constructor() {
        this.sidebar = null;
        this.header = null;
        this.currentViewId = null;
        this.viewInstances = new Map();
    }

    init(sidebarComponent, headerComponent) {
        this.sidebar = sidebarComponent;
        this.header = headerComponent;

        console.log("NavigationManager initialized with VIEW_REGISTRY pattern.");

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.viewId) {
                console.log(`[History] Popstate event: navigating to ${event.state.viewId}`);
                this.navigateTo(event.state.viewId, true); // true = isPopState
            } else {
                // Fallback for initial state or empty state
                console.log("[History] Popstate event with no state, defaulting to welcomeView");
                this.navigateTo('welcomeView', true);
            }
        });
    }

    /**
     * Get or create a view instance from the registry.
     * @param {string} viewId - The view identifier
     * @param {HTMLElement} container - The container element
     * @returns {Object|null} The view instance
     */
    getOrCreateView(viewId, container) {
        const config = VIEW_REGISTRY[viewId];
        if (!config) {
            console.warn(`NavigationManager: Unknown view '${viewId}'`);
            return null;
        }

        // Return cached singleton if available
        if (config.singleton && this.viewInstances.has(viewId)) {
            const instance = this.viewInstances.get(viewId);
            instance.container = container;
            return instance;
        }

        // Resolve class name to actual class at runtime via CLASS_MAP
        const classMap = getClassMap();
        const ViewClass = classMap[config.className];
        if (!ViewClass) {
            console.error(`NavigationManager: Class '${config.className}' not found for view '${viewId}'`);
            return null;
        }

        // Create new instance
        const instance = new ViewClass(container.id);
        instance.container = container;

        // Cache singleton
        if (config.singleton) {
            this.viewInstances.set(viewId, instance);
        }

        return instance;
    }

    /**
     * Get view instance by ID (for external access like AI context)
     * @param {string} viewId - The view identifier
     * @returns {Object|null} The view instance
     */
    getViewInstance(viewId) {
        return this.viewInstances.get(viewId) || null;
    }

    /**
     * Navigates to a specific view.
     * @param {string} viewId - The ID of the view to navigate to.
     * @param {object} params - Optional parameters to pass to the view.
     * @param {boolean} isPopState - If true, indicates navigation is from history (don't push state).
     */
    navigateTo(viewId, params = {}, isPopState = false) {
        // Handle legacy signature where params might be boolean (isPopState)
        if (typeof params === 'boolean') {
            isPopState = params;
            params = {};
        }

        console.log(`NavigationManager: Navigating to ${viewId}`, params);

        const config = VIEW_REGISTRY[viewId];
        if (!config) {
            console.warn(`NavigationManager: No view registered for '${viewId}'`);
            return;
        }

        // 0. Update Global State for AI Context
        aiAgentController.setCurrentView(viewId);
        this.currentViewId = viewId;

        // 1. Update Sidebar Selection
        if (this.sidebar) {
            this.sidebar.setActive(viewId);
        }

        // 2. Render the View via WorkspaceComponent
        workspaceComponent.render(viewId, (container) => {
            const view = this.getOrCreateView(viewId, container);
            if (view) {
                // Handle views that need special params (like managementView tabs)
                if (viewId === 'managementView' && params && params.tab) {
                    view.switchTab(params.tab);
                } else {
                    view.render(container, params);
                }
            }
        });

        // 3. Update Header Breadcrumbs (AFTER render, so legacy views can set breadcrumbs)
        if (this.header) {
            const systemName = SystemService.getCurrentSystem() ? SystemService.getCurrentSystem().systemName : 'System';
            this.header.update(viewId, systemName);
        }

        // 4. Set Shell Metadata for non-self-managed views
        if (!config.selfManaged) {
            let title = config.title;
            let breadcrumbs = [...config.breadcrumbs];

            // Special handling for Create System mode
            if (viewId === 'systemEditForm' && params && params.createMode) {
                title = 'Create System';
                breadcrumbs = ['System', 'Create System'];
            } else if (SystemService.getCurrentSystem() && SystemService.getCurrentSystem().systemName) {
                // Prepend system name to breadcrumbs
                breadcrumbs.unshift(SystemService.getCurrentSystem().systemName);
            }

            workspaceComponent.setPageMetadata({
                title: title,
                breadcrumbs: breadcrumbs,
                actions: []
            });
        }

        // 5. Scroll to top
        const mainContentArea = document.getElementById('main-content-area');
        if (mainContentArea) {
            mainContentArea.scrollTop = 0;
        }

        // 6. Update Browser History
        if (!isPopState) {
            const url = new URL(window.location);
            url.searchParams.set('view', viewId);
            window.history.pushState({ viewId: viewId }, '', url);
        }

        // 7. Update AI-dependent UI elements
        AIService.updateAiDependentUI(SettingsService.get(), { skipPlanningRender: true });

        // 8. Dispatch viewChanged event for components that need to react to navigation
        // (e.g., ThemedSelect auto-upgrade)
        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId } }));
    }

    /**
     * Helper to get a display title for legacy views.
     */
    getViewTitle(viewId) {
        const titles = {
            'planningView': 'Year Plan',
            'ganttPlanningView': 'Detailed Planning',
            'capacityConfigView': 'Capacity Tuning',
            'sdmForecastingView': 'Resource Forecast',
            'roadmapView': 'Roadmap & Backlog',
            'managementView': 'Management',
            'visualizationCarousel': 'System Overview',
            'organogramView': 'Org Design',
            'systemEditForm': 'Edit System',
            'dashboardView': 'Dashboard',
            'helpView': 'How to Guide',
            'settingsView': 'Settings',
            'systemsView': 'My Systems',
            'welcomeView': 'Welcome',
            'aboutView': 'About'
        };
        return titles[viewId] || 'Workspace';
    }
    /**
     * Refreshes the current view by re-navigating to it.
     * Used by AI agents and other callers that modify data and need to update the UI.
     */
    refresh() {
        const currentViewId = this.currentViewId;
        if (!currentViewId) {
            console.warn("[NavigationManager] No current view to refresh");
            return;
        }

        // Re-navigate to current view with popstate flag to avoid history entry
        this.navigateTo(currentViewId, {}, true);
    }


}

// Class is registered globally in main.js
