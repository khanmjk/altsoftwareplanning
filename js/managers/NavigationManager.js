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
        this.registerView('visualizationCarousel', 'visualizationCarousel');
        this.registerView('organogramView', 'organogramView');
        this.registerView('systemEditForm', 'systemEditForm');
        this.registerView('dashboardView', 'dashboardView');
        this.registerView('welcomeView', 'welcomeView');
        this.registerView('helpView', 'helpView');

        // Legacy views that might be needed
        this.registerView('serviceDependenciesTable', 'serviceDependenciesTable');
    }

    registerView(viewId, elementId) {
        console.log(`NavigationManager: Registering view '${viewId}' -> '${elementId}'`);
        this.views[viewId] = elementId;
    }

    navigateTo(viewId) {
        console.log(`NavigationManager: Navigating to ${viewId}`);
        console.log(`NavigationManager: Current views map:`, JSON.stringify(this.views));

        // 1. Update State
        this.currentViewId = viewId;
        window.currentViewId = viewId; // Keep global sync for legacy code

        // 2. Hide all views
        Object.values(this.views).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 3. Show target view

        // --- Workspace Migration Check ---
        if (viewId === 'capacityConfigView' && window.workspaceComponent) {
            // Use the new Workspace Component for rendering
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderCapacityConfigView === 'function') {
                    window.renderCapacityConfigView();
                } else {
                    console.error("renderCapacityConfigView function not found!");
                }
            });
            // Skip the legacy display logic below, but ensure we update state
            this.updateComponents(viewId);
            return;
        }

        if (viewId === 'sdmForecastingView' && window.workspaceComponent) {
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderSdmForecastingView === 'function') {
                    window.renderSdmForecastingView();
                } else {
                    console.error("renderSdmForecastingView function not found!");
                }
            });
            this.updateComponents(viewId);
            return;
        }

        if (viewId === 'organogramView' && window.workspaceComponent) {
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderOrgChartView === 'function') {
                    window.renderOrgChartView();
                } else {
                    console.error("renderOrgChartView function not found!");
                }
            });
            this.updateComponents(viewId);
            return;
        }

        if (viewId === 'roadmapView' && window.workspaceComponent) {
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderRoadmapView === 'function') {
                    window.renderRoadmapView();
                } else {
                    console.error("renderRoadmapView function not found!");
                }
            });
            this.updateComponents(viewId);
            return;
        }

        if (viewId === 'dashboardView' && window.workspaceComponent) {
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderDashboardView === 'function') {
                    window.renderDashboardView();
                } else {
                    console.error("renderDashboardView function not found!");
                }
            });
            this.updateComponents(viewId);
            return;
        }

        if (viewId === 'ganttPlanningView' && window.workspaceComponent) {
            window.workspaceComponent.render(viewId, () => {
                if (typeof window.renderGanttPlanningView === 'function') {
                    window.renderGanttPlanningView();
                } else {
                    console.error("renderGanttPlanningView function not found!");
                }
            });
            this.updateComponents(viewId);
            return;
        }
        // ---------------------------------

        const targetId = this.views[viewId];
        console.log(`NavigationManager: Target ID for ${viewId} is ${targetId}`);
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            targetEl.style.display = 'block';
        } else {
            console.warn(`View element not found for ${viewId} (${targetId})`);
            console.log(`NavigationManager: document.getElementById('${targetId}') returned`, targetEl);
        }

        // 4. Update Components
        this.updateComponents(viewId);

        // 5. Trigger Legacy Initialization Logic (The "Glue")
        // This replaces the switch statement in the old switchView
        this.triggerViewInit(viewId);
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

        if (viewId === 'visualizationCarousel' && typeof showVisualization === 'function') {
            showVisualization(0);
        }
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
