/**
 * SystemOverviewView
 * 
 * Class-based view for System Overview with multiple visualization modes.
 * Replaces the carousel pattern with pill navigation integrated into workspace toolbar.
 * 
 * Visualization Modes:
 * 1. System Architecture - Main system visualization with services, APIs, platforms
 * 2. Team Relationships - Team collaboration and dependencies
 * 3. Service Dependencies - Service-to-service relationships
 * 4. Dependency Graph - Force-directed dependency visualization
 * 5. Dependency Table - Tabular view of service dependencies
 * 6. Mermaid Architecture - Mermaid diagram of system architecture
 * 7. API Interactions - API-level interactions (Mermaid)
 */
class SystemOverviewView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`SystemOverviewView: Container '${containerId}' not found`);
        }

        this.pillNav = null;
        this.currentView = 'visualization'; // default to System Architecture

        // View configurations
        this.viewConfigs = [
            {
                id: 'visualization',
                label: 'System Architecture',
                icon: 'fas fa-sitemap',
                renderFn: () => this.renderSystemVisualization()
            },
            {
                id: 'teamVisualization',
                label: 'Team Relationships',
                icon: 'fas fa-users',
                renderFn: () => this.renderTeamVisualization()
            },
            {
                id: 'serviceRelationshipsVisualization',
                label: 'Service Dependencies',
                icon: 'fas fa-project-diagram',
                renderFn: () => this.renderServiceRelationships()
            },
            {
                id: 'dependencyVisualization',
                label: 'Dependency Graph',
                icon: 'fas fa-bezier-curve',
                renderFn: () => this.renderDependencyGraph()
            },
            {
                id: 'serviceDependenciesTableSlide',
                label: 'Dependency Table',
                icon: 'fas fa-table',
                renderFn: () => this.renderDependencyTable()
            },
            {
                id: 'mermaidVisualization',
                label: 'Mermaid Architecture',
                icon: 'fas fa-code-branch',
                renderFn: () => this.renderMermaidDiagram()
            },
            {
                id: 'mermaidApiVisualization',
                label: 'API Interactions',
                icon: 'fas fa-exchange-alt',
                renderFn: () => this.renderMermaidApiDiagram()
            }
        ];
    }

    /**
     * Main render method - sets up workspace and renders initial view
     */
    render() {
        if (!this.container) {
            console.error('SystemOverviewView: Cannot render, container not found');
            return;
        }

        // Set workspace metadata (header)
        if (window.workspaceComponent) {
            window.workspaceComponent.setPageMetadata({
                title: 'System Overview',
                breadcrumbs: ['System', 'Overview'],
                actions: [] // No global actions for this view
            });
        }

        // Create pill navigation
        this.pillNav = new PillNavigationComponent({
            items: this.viewConfigs.map(v => ({
                id: v.id,
                label: v.label,
                icon: v.icon
            })),
            onSwitch: (viewId) => this.switchView(viewId),
            initialActive: this.currentView
        });

        // Set toolbar with pill navigation
        if (window.workspaceComponent) {
            window.workspaceComponent.setToolbar(this.pillNav.render());
        }

        // Render view structure
        this.renderViewStructure();

        // Show default view
        this.switchView(this.currentView);

        // Setup resize observer if available
        if (typeof setupVisualizationResizeObserver === 'function') {
            setTimeout(() => setupVisualizationResizeObserver(), 100);
        }
    }

    /**
     * Creates the DOM structure for all visualization views
     */
    renderViewStructure() {
        this.container.innerHTML = ''; // Clear previous content

        // Create wrapper for all views
        const viewsWrapper = document.createElement('div');
        viewsWrapper.className = 'workspace-view system-overview-view';
        viewsWrapper.id = 'visualizationCarousel'; // Keep ID for compatibility with existing functions

        // Create individual view containers
        this.viewConfigs.forEach(viewConfig => {
            const viewSection = this.createViewSection(viewConfig.id);
            viewsWrapper.appendChild(viewSection);
        });

        this.container.appendChild(viewsWrapper);
    }

    /**
     * Creates a view section container based on view ID
     */
    createViewSection(viewId) {
        const section = document.createElement('div');
        section.id = viewId;
        section.className = 'workspace-view__section carousel-item'; // Keep carousel-item for CSS compatibility
        section.style.display = 'none';

        // Create view-specific content
        switch (viewId) {
            case 'visualization':
                section.innerHTML = `
                    <button id="togglePlatformComponentsSystem" class="btn btn-sm" style="margin-bottom: 10px;">Hide Platforms</button>
                    <svg id="systemSvg" style="width: 100%; height: 600px; border: 1px solid var(--color-gray-300); background-color: var(--color-white);"></svg>
                    <div id="legend" class="legend"></div>
                `;
                break;

            case 'teamVisualization':
                section.innerHTML = `
                    <svg id="teamSvg" style="width: 100%; height: 600px; border: 1px solid var(--color-gray-300); background-color: var(--color-white);"></svg>
                    <div id="teamLegend" class="legend"></div>
                `;
                break;

            case 'serviceRelationshipsVisualization':
                section.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <label for="serviceSelection" style="margin-right: 10px; font-weight: 500;">Select Service:</label>
                        <select id="serviceSelection" class="form-select" style="display: inline-block; width: auto; min-width: 200px;"></select>
                        <button id="togglePlatformComponentsService" class="btn btn-sm" style="margin-left: 10px;">Hide Platforms</button>
                    </div>
                    <svg id="serviceSvg" style="width: 100%; height: 600px; border: 1px solid var(--color-gray-300); background-color: var(--color-white);"></svg>
                    <div id="serviceLegend" class="legend"></div>
                `;
                break;

            case 'dependencyVisualization':
                section.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <label for="dependencyServiceSelection" style="margin-right: 10px; font-weight: 500;">Select Service:</label>
                        <select id="dependencyServiceSelection" class="form-select" style="display: inline-block; width: auto; min-width: 200px;"></select>
                        <button id="togglePlatformComponentsDependency" class="btn btn-sm" style="margin-left: 10px;">Hide Platforms</button>
                    </div>
                    <svg id="dependencySvg" style="width: 100%; height: 600px; border: 1px solid var(--color-gray-300); background-color: var(--color-white);"></svg>
                    <div id="dependencyLegend" class="legend"></div>
                `;
                break;

            case 'serviceDependenciesTableSlide':
                section.innerHTML = `
                    <div id="serviceDependenciesTable" style="width: 100%; height: 100%;">
                        <h2 style="margin-top: 0;">Service Dependencies Table</h2>
                        <div id="serviceDependenciesTableHost" style="height: calc(100% - 50px);"></div>
                    </div>
                `;
                section.style.height = '100%';
                section.style.overflowY = 'auto';
                break;

            case 'mermaidVisualization':
                section.innerHTML = `<div id="mermaidGraph" style="min-height: 600px;"></div>`;
                section.style.overflowY = 'auto';
                break;

            case 'mermaidApiVisualization':
                section.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <label for="apiServiceSelection" style="margin-right: 10px; font-weight: 500;">Select Service:</label>
                        <select id="apiServiceSelection" class="form-select" style="display: inline-block; width: auto; min-width: 200px;"></select>
                    </div>
                    <div id="mermaidApiGraph" style="min-height: 600px;"></div>
                `;
                section.style.overflowY = 'auto';
                break;
        }

        return section;
    }

    /**
     * Switches to a specific view
     */
    switchView(viewId) {
        // Validate view exists
        const viewConfig = this.viewConfigs.find(v => v.id === viewId);
        if (!viewConfig) {
            console.error(`SystemOverviewView: View '${viewId}' not found`);
            return;
        }

        // Hide all views
        this.viewConfigs.forEach(v => {
            const el = document.getElementById(v.id);
            if (el) el.style.display = 'none';
        });

        // Show selected view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.style.display = 'block';
            this.currentView = viewId;

            // Update pill navigation
            if (this.pillNav) {
                this.pillNav.setActive(viewId);
            }

            // Scroll to top
            const mainContentArea = document.getElementById('main-content-area');
            if (mainContentArea) {
                mainContentArea.scrollTop = 0;
            }

            // Setup event handlers for this view
            this.setupEventHandlers(viewId);

            // Render visualization
            viewConfig.renderFn();
        }
    }

    /**
     * Sets up event handlers for interactive elements in each view
     */
    setupEventHandlers(viewId) {
        switch (viewId) {
            case 'visualization':
                // Platform toggle button
                const toggleSystem = document.getElementById('togglePlatformComponentsSystem');
                if (toggleSystem) {
                    toggleSystem.onclick = () => {
                        showPlatformComponents = !showPlatformComponents;
                        if (typeof rerenderCurrentVisualizationForPlatformToggle === 'function') {
                            rerenderCurrentVisualizationForPlatformToggle();
                        }
                        if (typeof updateAllToggleButtonsText === 'function') {
                            updateAllToggleButtonsText(showPlatformComponents);
                        }
                    };
                }
                break;

            case 'serviceRelationshipsVisualization':
                // Service selection dropdown
                const serviceSelect = document.getElementById('serviceSelection');
                if (serviceSelect && typeof updateServiceVisualization === 'function') {
                    serviceSelect.onchange = () => updateServiceVisualization();
                }

                // Platform toggle button
                const toggleService = document.getElementById('togglePlatformComponentsService');
                if (toggleService) {
                    toggleService.onclick = () => {
                        showPlatformComponents = !showPlatformComponents;
                        if (typeof rerenderCurrentVisualizationForPlatformToggle === 'function') {
                            rerenderCurrentVisualizationForPlatformToggle();
                        }
                        if (typeof updateAllToggleButtonsText === 'function') {
                            updateAllToggleButtonsText(showPlatformComponents);
                        }
                    };
                }
                break;

            case 'dependencyVisualization':
                // Dependency service selection dropdown
                const depServiceSelect = document.getElementById('dependencyServiceSelection');
                if (depServiceSelect && typeof updateDependencyVisualization === 'function') {
                    depServiceSelect.onchange = () => updateDependencyVisualization();
                }

                // Platform toggle button
                const toggleDependency = document.getElementById('togglePlatformComponentsDependency');
                if (toggleDependency) {
                    toggleDependency.onclick = () => {
                        showPlatformComponents = !showPlatformComponents;
                        if (typeof rerenderCurrentVisualizationForPlatformToggle === 'function') {
                            rerenderCurrentVisualizationForPlatformToggle();
                        }
                        if (typeof updateAllToggleButtonsText === 'function') {
                            updateAllToggleButtonsText(showPlatformComponents);
                        }
                    };
                }
                break;

            case 'mermaidApiVisualization':
                // Must pass the selected service value as parameter
                const apiServiceSelect = document.getElementById('apiServiceSelection');
                if (apiServiceSelect) {
                    apiServiceSelect.onchange = () => {
                        const selectedService = apiServiceSelect.value;
                        if (typeof renderMermaidApiDiagram === 'function') {
                            renderMermaidApiDiagram(selectedService);
                        }
                    };
                }
                break;
        }
    }

    // ===== Visualization Rendering Methods =====
    // These delegate to existing global functions

    renderSystemVisualization() {
        if (window.currentSystemData && typeof generateVisualization === 'function') {
            generateVisualization(window.currentSystemData);
        }
    }

    renderTeamVisualization() {
        if (window.currentSystemData && typeof generateTeamVisualization === 'function') {
            generateTeamVisualization(window.currentSystemData);
        }
    }

    renderServiceRelationships() {
        if (typeof populateServiceSelection === 'function') {
            populateServiceSelection();
        }
        if (typeof updateServiceVisualization === 'function') {
            updateServiceVisualization();
        }
    }

    renderDependencyGraph() {
        if (typeof populateDependencyServiceSelection === 'function') {
            populateDependencyServiceSelection();
        }
        if (typeof updateDependencyVisualization === 'function') {
            updateDependencyVisualization();
        }
    }

    renderDependencyTable() {
        if (typeof generateServiceDependenciesTable === 'function') {
            // Defer to next frame to ensure proper layout
            requestAnimationFrame(() => generateServiceDependenciesTable());
        }
    }

    renderMermaidDiagram() {
        if (typeof renderMermaidDiagram === 'function') {
            renderMermaidDiagram();
        }
    }

    renderMermaidApiDiagram() {
        // Same pattern as renderServiceRelationships
        if (typeof populateApiServiceSelection === 'function') {
            populateApiServiceSelection();
        }
        if (typeof renderMermaidApiDiagram === 'function') {
            renderMermaidApiDiagram();
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.pillNav) {
            this.pillNav.destroy();
            this.pillNav = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for global usage
if (typeof window !== 'undefined') {
    window.SystemOverviewView = SystemOverviewView;
}
