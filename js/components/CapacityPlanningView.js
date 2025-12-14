/**
 * CapacityPlanningView.js
 * 
 * Shell component for the Capacity Tuning feature.
 * Manages navigation between the Dashboard (Analysis) and Configuration (Inputs) views.
 */
class CapacityPlanningView {
    constructor() {
        this.currentView = 'dashboard'; // Default view
        this.pillNav = null;
        this.activeComponent = null;

        this.viewConfigs = [
            { id: 'dashboard', label: 'Dashboard & Analysis', icon: 'fas fa-chart-line' },
            { id: 'configuration', label: 'Configuration', icon: 'fas fa-cogs' }
        ];
    }

    render(container) {
        if (!container) container = document.getElementById('capacityConfigView'); // Fallback ID
        if (!container) {
            console.error("CapacityPlanningView: Container not provided.");
            return;
        }
        this.container = container;
        this.container.innerHTML = '';
        this.container.classList.add('workspace-view');

        // 1. Set Metadata
        workspaceComponent.setPageMetadata({
            title: 'Capacity Tuning',
            breadcrumbs: ['Planning', 'Capacity Tuning'],
            actions: []
        });

        // 2. Setup Container
        this.contentContainer = document.createElement('div');
        this.contentContainer.id = 'capacityPlanningContent';
        this.contentContainer.className = 'capacity-planning-content';
        this.container.appendChild(this.contentContainer);

        // 3. Setup Toolbar
        this.setupToolbar();

        // 4. Render Default View
        this.switchView(this.currentView);
    }

    setupToolbar() {
        if (!workspaceComponent) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'capacity-planning-toolbar';

        // Left: Pill Navigation
        const leftGroup = document.createElement('div');
        leftGroup.className = 'capacity-planning-toolbar__left';
        leftGroup.style.display = 'flex'; // Helper utility or class? Keeping minimal inline for layout if specific class not defined, but better to use class.
        // Actually, let's use the class defined in CSS: .capacity-planning-toolbar handles the flex.
        // But leftGroup needs flex too.
        leftGroup.style.display = 'flex';
        leftGroup.style.alignItems = 'center';
        leftGroup.style.gap = '10px';

        this.pillNav = new PillNavigationComponent({
            items: this.viewConfigs,
            initialActive: this.currentView,
            onSwitch: (viewId) => this.switchView(viewId)
        });
        leftGroup.appendChild(this.pillNav.render());
        toolbar.appendChild(leftGroup);

        // Right: Save Button (Global Action)
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-sm';

        const icon = document.createElement('i');
        icon.className = 'fas fa-save';
        saveBtn.appendChild(icon);
        saveBtn.appendChild(document.createTextNode(' Save Changes'));

        saveBtn.onclick = () => this.saveChanges();
        toolbar.appendChild(saveBtn);

        workspaceComponent.setToolbar(toolbar);
    }

    switchView(viewId) {
        this.currentView = viewId;
        if (this.pillNav) this.pillNav.setActive(viewId);

        if (!this.contentContainer) return;

        // Clear container
        this.contentContainer.innerHTML = '';

        // Instantiate and Render Component
        if (viewId === 'dashboard') {
            // Ensure metrics are up-to-date before rendering dashboard
            CapacityEngine.recalculate(SystemService.getCurrentSystem());
            this.activeComponent = new CapacityDashboardView();
        } else if (viewId === 'configuration') {
            this.activeComponent = new CapacityConfigurationView();
        }

        if (this.activeComponent) {
            this.activeComponent.render(this.contentContainer);
        }
    }

    saveChanges() {
        // Recalculate system-wide metrics before saving
        CapacityEngine.recalculate(SystemService.getCurrentSystem());

        SystemService.save();
        this.render();
        notificationManager?.showToast("Capacity configuration saved.", "success");
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        return {
            viewTitle: 'Capacity Tuning',
            currentView: this.currentView, // 'dashboard' or 'configuration'
            metrics: SystemService.getCurrentSystem()?.calculatedCapacityMetrics,
            config: SystemService.getCurrentSystem()?.capacityConfiguration,
            teamCount: SystemService.getCurrentSystem()?.teams?.length || 0
        };
    }
}
