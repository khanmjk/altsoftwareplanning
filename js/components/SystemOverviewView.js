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
        // Set workspace metadata (header)
        workspaceComponent.setPageMetadata({
            title: 'System Overview',
            breadcrumbs: ['System', 'Overview'],
            actions: [] // No global actions for this view
        });

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
        // Set toolbar with pill navigation
        workspaceComponent.setToolbar(this.pillNav.render());

        // Render view structure
        this.renderViewStructure();

        // Show default view
        this.switchView(this.currentView);

        // Setup resize observer if available
        // setupVisualizationResizeObserver call removed
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
                    <button id="togglePlatformComponentsSystem" class="btn btn-sm system-overview-platform-toggle">Hide Platforms</button>
                    <svg id="systemSvg" class="system-overview-svg"></svg>
                    <div id="legend" class="legend"></div>
                `;
                break;

            case 'teamVisualization':
                section.innerHTML = `
                    <svg id="teamSvg" class="system-overview-svg"></svg>
                    <div id="teamLegend" class="legend"></div>
                `;
                break;

            case 'serviceRelationshipsVisualization':
                section.innerHTML = `
                    <div class="system-overview-filter-controls">
                        <label for="serviceSelection" class="system-overview-filter-label">Select Service:</label>
                        <select id="serviceSelection" class="form-select system-overview-filter-select"></select>
                        <button id="togglePlatformComponentsService" class="btn btn-sm system-overview-toggle-btn">Hide Platforms</button>
                    </div>
                    <svg id="serviceSvg" class="system-overview-svg"></svg>
                    <div id="serviceLegend" class="legend"></div>
                `;
                break;

            case 'dependencyVisualization':
                section.innerHTML = `
                    <div class="system-overview-filter-controls">
                        <label for="dependencyServiceSelection" class="system-overview-filter-label">Select Service:</label>
                        <select id="dependencyServiceSelection" class="form-select system-overview-filter-select"></select>
                        <button id="togglePlatformComponentsDependency" class="btn btn-sm system-overview-toggle-btn">Hide Platforms</button>
                    </div>
                    <svg id="dependencySvg" class="system-overview-svg"></svg>
                    <div id="dependencyLegend" class="legend"></div>
                `;
                break;

            case 'serviceDependenciesTableSlide':
                section.innerHTML = `
                    <div id="serviceDependenciesTable">
                        <h2>Service Dependencies Table</h2>
                        <div id="serviceDependenciesTableHost"></div>
                    </div>
                `;
                section.style.height = '100%';
                section.style.overflowY = 'auto';
                break;

            case 'mermaidVisualization':
                section.innerHTML = `<div id="mermaidGraph" class="system-overview-mermaid-container"></div>`;
                section.style.overflowY = 'auto';
                break;

            case 'mermaidApiVisualization':
                section.innerHTML = `
                    <div class="system-overview-filter-controls">
                        <label for="apiServiceSelection" class="system-overview-filter-label">Select Service:</label>
                        <select id="apiServiceSelection" class="form-select system-overview-filter-select"></select>
                    </div>
                    <div id="mermaidApiGraph" class="system-overview-mermaid-container"></div>
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
                        rerenderCurrentVisualizationForPlatformToggle();
                        updateAllToggleButtonsText(showPlatformComponents);
                    };
                }
                break;

            case 'serviceRelationshipsVisualization':
                // Service selection dropdown
                const serviceSelect = document.getElementById('serviceSelection');
                if (serviceSelect) {
                    serviceSelect.onchange = () => updateServiceVisualization();
                }

                // Platform toggle button
                const toggleService = document.getElementById('togglePlatformComponentsService');
                if (toggleService) {
                    toggleService.onclick = () => {
                        showPlatformComponents = !showPlatformComponents;
                        rerenderCurrentVisualizationForPlatformToggle();
                        updateAllToggleButtonsText(showPlatformComponents);
                    };
                }
                break;

            case 'dependencyVisualization':
                // Dependency service selection dropdown
                const depServiceSelect = document.getElementById('dependencyServiceSelection');
                if (depServiceSelect) {
                    depServiceSelect.onchange = () => updateDependencyVisualization();
                }

                // Platform toggle button
                const toggleDependency = document.getElementById('togglePlatformComponentsDependency');
                if (toggleDependency) {
                    toggleDependency.onclick = () => {
                        showPlatformComponents = !showPlatformComponents;
                        rerenderCurrentVisualizationForPlatformToggle();
                        updateAllToggleButtonsText(showPlatformComponents);
                    };
                }
                break;

            // mermaidApiVisualization case removed - onchange handled by populateApiServiceSelection()
        }
    }

    // ===== Visualization Rendering Methods =====
    // These delegate to existing global functions

    renderSystemVisualization() {
        if (SystemService.getCurrentSystem()) {
            getSystemVisualization().render(SystemService.getCurrentSystem());
        }
    }

    renderTeamVisualization() {
        if (SystemService.getCurrentSystem()) {
            getTeamVisualization().render(SystemService.getCurrentSystem());
        }
    }

    renderServiceRelationships() {
        populateServiceSelection();
        updateServiceVisualization();
    }

    renderDependencyGraph() {
        populateDependencyServiceSelection();
        updateDependencyVisualization();
    }

    renderDependencyTable() {
        // Defer to next frame to ensure proper layout
        requestAnimationFrame(() => generateServiceDependenciesTable());
    }

    renderMermaidDiagram() {
        renderMermaidDiagram();
    }

    renderMermaidApiDiagram() {
        // Populate dropdown first only if empty
        const select = document.getElementById('apiServiceSelection');
        if (select && select.options.length === 0) {
            populateApiServiceSelection();
        }
        // Render with current selection
        const selectedService = select ? select.value : 'all';
        renderMermaidApiDiagram(selectedService);
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

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        return {
            viewTitle: 'System Overview',
            currentVisualization: this.currentView,
            availableViews: this.viewConfigs.map(v => ({ id: v.id, label: v.label })),
            services: SystemService.getCurrentSystem()?.services?.map(s => ({
                serviceName: s.serviceName,
                owningTeamId: s.owningTeamId
            })),
            serviceCount: SystemService.getCurrentSystem()?.services?.length || 0,
            dependencies: SystemService.getCurrentSystem()?.serviceDependencies,
            platformDependencies: SystemService.getCurrentSystem()?.platformDependencies
        };
    }
}
