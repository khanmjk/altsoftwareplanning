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
        aiAgentController.setCurrentView(viewId);
        window.currentViewId = viewId;

        // 1. Update Sidebar Selection
        if (this.sidebar) {
            this.sidebar.setActive(viewId);
        }

        // 2. Render the View via WorkspaceComponent
        // 2. Render the View via WorkspaceComponent
        // Map viewId to render function
        if (viewId === 'planningView') {
            window.workspaceComponent.render(viewId, (container) => {
                if (!window.yearPlanningView) {
                    window.yearPlanningView = new YearPlanningView(container.id);
                } else {
                    window.yearPlanningView.container = container;
                }
                window.yearPlanningView.render();
            });
        } else if (viewId === 'ganttPlanningView') {
            window.workspaceComponent.render(viewId, window.renderGanttPlanningView);
        } else if (viewId === 'capacityConfigView') {
            window.workspaceComponent.render(viewId, (container) => {
                if (!window.capacityPlanningViewInstance) {
                    window.capacityPlanningViewInstance = new CapacityPlanningView();
                }
                window.capacityPlanningViewInstance.render(container);
            });
        } else if (viewId === 'sdmForecastingView') {
            window.workspaceComponent.render(viewId, (container) => {
                if (!window.resourceForecastViewInstance) {
                    window.resourceForecastViewInstance = new ResourceForecastView();
                }
                window.resourceForecastViewInstance.render(container);
            });
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
            window.workspaceComponent.render(viewId, (container) => {
                if (!window.systemOverviewViewInstance) {
                    window.systemOverviewViewInstance = new SystemOverviewView(container.id);
                } else {
                    window.systemOverviewViewInstance.container = container;
                }
                window.systemOverviewViewInstance.render();
            });
        } else if (viewId === 'organogramView') {
            window.workspaceComponent.render(viewId, window.renderOrgView);
        } else if (viewId === 'systemEditForm') {
            window.workspaceComponent.render(viewId, (container) => window.showSystemEditForm(SystemService.getCurrentSystem(), container));
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

        // 3. Update Header Breadcrumbs (AFTER render, so legacy views can set breadcrumbs)
        if (this.header) {
            const systemName = SystemService.getCurrentSystem() ? SystemService.getCurrentSystem().systemName : 'System';
            this.header.update(viewId, systemName);
        }

        // 4. Set Default Shell Metadata for Legacy Views
        // (Refactored views like 'roadmapView' handle this themselves)
        const selfManagedViews = ['roadmapView', 'managementView', 'dashboardView', 'settingsView', 'helpView', 'sdmForecastingView', 'capacityConfigView'];
        if (!selfManagedViews.includes(viewId)) {
            let title = this.getViewTitle(viewId);
            let breadcrumbs = [];

            // Special handling for Create System mode
            if (viewId === 'systemEditForm' && params && params.createMode) {
                title = 'Create System';
                breadcrumbs.push('System');
                breadcrumbs.push('Create System');
            } else {
                // Standard Breadcrumbs
                // 1. Home/System Context
                if (SystemService.getCurrentSystem() && SystemService.getCurrentSystem().systemName) {
                    breadcrumbs.push(SystemService.getCurrentSystem().systemName);
                }

                // 2. View Path (from HeaderComponent mapping)
                if (this.header && typeof this.header.getViewPath === 'function') {
                    const path = this.header.getViewPath(viewId);
                    if (path && Array.isArray(path)) {
                        path.forEach(step => breadcrumbs.push(step.label));
                    }
                }
            }

            window.workspaceComponent.setPageMetadata({
                title: title,
                breadcrumbs: breadcrumbs,
                actions: []      // Legacy actions handled by view templates
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
            'welcomeView': 'Welcome'
        };
        return titles[viewId] || 'Workspace';
    }
    /**
     * Refreshes the current view by re-navigating to it.
     * Used by AI agents and other callers that modify data and need to update the UI.
     */
    refresh() {
        const currentViewId = window.currentViewId;
        if (!currentViewId) {
            console.warn("[NavigationManager] No current view to refresh");
            return;
        }

        // Re-navigate to current view with popstate flag to avoid history entry
        this.navigateTo(currentViewId, {}, true);
    }


}

if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}
