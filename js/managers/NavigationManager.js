/**
 * NavigationManager
 * Centralizes view switching logic and coordinates components.
 */
class NavigationManager {
    constructor() {
        this.sidebar = null;
        this.header = null;
        this.currentViewId = null;
        this.views = {}; // Map viewId to DOM element ID
    }

    init(sidebarComponent, headerComponent) {
        this.sidebar = sidebarComponent;
        this.header = headerComponent;

        // Register default views
        this.registerView('planningView', 'planningView');
        this.registerView('ganttPlanningView', 'ganttPlanningView');
        this.registerView('capacityConfigView', 'capacityConfigView');
        this.registerView('sdmForecastingView', 'sdmForecastingView');
        this.registerView('roadmapView', 'roadmapView');
        this.registerView('managementView', 'managementView');
        this.registerView('visualizationCarousel', 'visualizationCarousel');
        this.registerView('organogramView', 'organogramView');
        this.registerView('systemEditForm', 'systemEditForm');
        this.registerView('dashboardView', 'dashboardView');
        this.registerView('welcomeView', 'welcomeView');
        this.registerView('welcomeView', 'welcomeView');
        this.registerView('helpView', 'helpView');
        this.registerView('settingsView', 'settingsView');
        this.registerView('systemsView', 'systemsView');

        // Legacy views that might be needed
        this.registerView('serviceDependenciesTable', 'serviceDependenciesTable');

        console.log("NavigationManager initialized.");

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

    registerView(viewId, elementId) {
        console.log(`NavigationManager: Registering view '${viewId}' -> '${elementId}'`);
        this.views[viewId] = elementId;
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

        // 0. Update Global State for AI Context
        if (window.aiAgentController && typeof window.aiAgentController.setCurrentView === 'function') {
            window.aiAgentController.setCurrentView(viewId);
        } else {
            if (typeof window !== 'undefined') window.currentViewId = viewId;
        }

        // 1. Update Sidebar Selection
        if (this.sidebar) {
            this.sidebar.setActive(viewId);
        }

        // 2. Update Header Breadcrumbs
        if (this.header) {
            const systemName = window.currentSystemData ? window.currentSystemData.systemName : 'System';
            this.header.update(viewId, systemName);
        }

        // 3. Render the View via WorkspaceComponent
        if (window.workspaceComponent) {
            // Map viewId to render function
            if (viewId === 'planningView') {
                window.workspaceComponent.render(viewId, window.renderPlanningView);
            } else if (viewId === 'ganttPlanningView') {
                window.workspaceComponent.render(viewId, window.renderGanttPlanningView);
            } else if (viewId === 'capacityConfigView') {
                window.workspaceComponent.render(viewId, window.renderCapacityConfigView);
            } else if (viewId === 'sdmForecastingView') {
                window.workspaceComponent.render(viewId, window.renderSdmForecastingView);
            } else if (viewId === 'roadmapView') {
                window.workspaceComponent.render(viewId, window.renderRoadmapView);
            } else if (viewId === 'managementView') {
                window.workspaceComponent.render(viewId, (container) => {
                    if (!window.managementViewInstance) {
                        window.managementViewInstance = new ManagementView(container.id);
                    } else {
                        window.managementViewInstance.container = container;
                    }
                    // Handle tab switching via params
                    if (params && params.tab) {
                        window.managementViewInstance.switchTab(params.tab);
                    } else {
                        window.managementViewInstance.render();
                    }
                });
            } else if (viewId === 'visualizationCarousel') {
                window.workspaceComponent.render(viewId, window.renderSystemOverviewView);
            } else if (viewId === 'organogramView') {
                window.workspaceComponent.render(viewId, window.renderOrgChartView);
            } else if (viewId === 'systemEditForm') {
                window.workspaceComponent.render(viewId, (container) => window.showSystemEditForm(window.currentSystemData, container));
            } else if (viewId === 'dashboardView') {
                window.workspaceComponent.render(viewId, window.renderDashboardView);
            } else if (viewId === 'welcomeView') {
                window.workspaceComponent.render(viewId, (container) => {
                    const staticWelcome = document.getElementById('welcomeViewContent');
                    if (staticWelcome) {
                        container.innerHTML = staticWelcome.innerHTML;
                        container.style.display = 'block';
                    } else {
                        container.innerHTML = '<h1>Welcome</h1><p>Welcome content not found.</p>';
                    }
                });
            } else if (viewId === 'helpView') {
                window.workspaceComponent.render(viewId, window.renderHelpView);
            } else if (viewId === 'settingsView') {
                window.workspaceComponent.render(viewId, (container) => {
                    if (!window.settingsViewInstance) {
                        window.settingsViewInstance = new SettingsView(container.id);
                    } else {
                        window.settingsViewInstance.container = container;
                    }
                    window.settingsViewInstance.render();
                });
            } else if (viewId === 'systemsView') {
                window.workspaceComponent.render(viewId, (container) => {
                    if (!window.systemsViewInstance) {
                        window.systemsViewInstance = new SystemsView(container.id);
                    } else {
                        window.systemsViewInstance.container = container;
                    }
                    window.systemsViewInstance.render();
                });
            } else {
                console.warn(`NavigationManager: No render function mapped for ${viewId}`);
            }
        }

        // 4. Scroll to top
        const mainContentArea = document.getElementById('main-content-area');
        if (mainContentArea) {
            mainContentArea.scrollTop = 0;
        }

        // 5. Update Browser History
        if (!isPopState) {
            const url = new URL(window.location);
            url.searchParams.set('view', viewId);
            window.history.pushState({ viewId: viewId }, '', url);
        }
    }

    updateComponents(viewId) {
        // 4. Update Components
        if (this.sidebar) this.sidebar.setActive(viewId);
        if (this.header) {
            const systemName = window.currentSystemData ? window.currentSystemData.systemName : 'System';
            this.header.update(viewId, systemName);
        }

        // 4b. Ensure the active view starts at the top of the scrollable area
        const mainContentArea = document.getElementById('main-content-area');
        if (mainContentArea) {
            if (typeof mainContentArea.scrollTo === 'function') {
                mainContentArea.scrollTo({ top: 0, behavior: 'auto' });
            } else {
                mainContentArea.scrollTop = 0;
            }
        }
    }

    triggerViewInit(viewId) {
        // This mimics the logic from the old main.js switchView
        // We call the global functions that initialize specific views


        if (viewId === 'planningView') {
            if (typeof renderPlanningView === 'function') renderPlanningView();
            if (typeof adjustPlanningTableHeight === 'function') adjustPlanningTableHeight();
        }
        if (viewId === 'roadmapView' && typeof initializeRoadmapView === 'function') {
            initializeRoadmapView();
        }
        if (viewId === 'dashboardView' && typeof initializeDashboard === 'function') {
            initializeDashboard();
        }
        if (viewId === 'capacityConfigView' && typeof generateGlobalConstraintsForm === 'function') {
            generateGlobalConstraintsForm();
        }
        if (viewId === 'sdmForecastingView' && typeof generateForecastingUI_SDM === 'function') {
            generateForecastingUI_SDM();
        }
        if (viewId === 'organogramView' && typeof initializeOrgChartView === 'function') {
            initializeOrgChartView();
        }
        if (viewId === 'systemEditForm' && typeof populateSystemEditForm === 'function') {
            if (window.currentSystemData) {
                populateSystemEditForm(window.currentSystemData);
            } else {
                console.warn("NavigationManager: Cannot populate systemEditForm - no currentSystemData.");
            }
        }
        if (viewId === 'ganttPlanningView') {
            if (typeof initializeGanttPlanningView === 'function') initializeGanttPlanningView();
        }
        if (viewId === 'helpView') {
            if (!this.docComponent) {
                this.docComponent = new DocumentationComponent('documentationContent', 'main-content-area');
            }
            this.docComponent.init();
        }

        // Update AI Context
        if (typeof updateAiDependentUI === 'function') {
            updateAiDependentUI({ skipPlanningRender: true });
        }
    }
}

if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}
