/**
 * NavigationManager
 * Centralizes view switching logic and coordinates components.
 */
class NavigationManager {
    constructor() {
        this.sidebar = null;
        this.header = null;
    }

    init(sidebarComponent, headerComponent) {
        this.sidebar = sidebarComponent;
        this.header = headerComponent;

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
        }
        if (typeof window !== 'undefined') {
            window.currentViewId = viewId;
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
                window.workspaceComponent.render(viewId, window.renderOrgView);
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


}

if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}
