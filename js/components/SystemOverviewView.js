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

    // ===== State migrated from visualizations.js =====
    // Previously module-level globals, now class properties
    this.showPlatformComponents = true;
    this.serviceDependenciesTableWidget = null;
    this.serviceDependenciesTableData = [];

    // Lazy-loaded visualization instances
    this._systemVisualization = null;
    this._teamVisualization = null;
    this._serviceVisualization = null;
    this._dependencyVisualization = null;

    // View configurations
    this.viewConfigs = [
      {
        id: 'visualization',
        label: 'System Architecture',
        icon: 'fas fa-sitemap',
        renderFn: () => this.renderSystemVisualization(),
      },
      {
        id: 'teamVisualization',
        label: 'Team Relationships',
        icon: 'fas fa-users',
        renderFn: () => this.renderTeamVisualization(),
      },
      {
        id: 'serviceRelationshipsVisualization',
        label: 'Service Dependencies',
        icon: 'fas fa-project-diagram',
        renderFn: () => this.renderServiceRelationships(),
      },
      {
        id: 'dependencyVisualization',
        label: 'Dependency Graph',
        icon: 'fas fa-bezier-curve',
        renderFn: () => this.renderDependencyGraph(),
      },
      {
        id: 'serviceDependenciesTableSlide',
        label: 'Dependency Table',
        icon: 'fas fa-table',
        renderFn: () => this.renderDependencyTable(),
      },
      {
        id: 'mermaidVisualization',
        label: 'Mermaid Architecture',
        icon: 'fas fa-code-branch',
        renderFn: () => this.renderMermaidDiagram(),
      },
      {
        id: 'mermaidApiVisualization',
        label: 'API Interactions',
        icon: 'fas fa-exchange-alt',
        renderFn: () => this.renderMermaidApiDiagram(),
      },
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
      actions: [], // No global actions for this view
    });

    // Create pill navigation
    this.pillNav = new PillNavigationComponent({
      items: this.viewConfigs.map((v) => ({
        id: v.id,
        label: v.label,
        icon: v.icon,
      })),
      onSwitch: (viewId) => this.switchView(viewId),
      initialActive: this.currentView,
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
    this._clearElement(this.container);

    // Create wrapper for all views
    const viewsWrapper = document.createElement('div');
    viewsWrapper.className = 'workspace-view system-overview-view';
    viewsWrapper.id = 'visualizationCarousel'; // Keep ID for compatibility with existing functions

    // Create individual view containers
    this.viewConfigs.forEach((viewConfig) => {
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

    // Create view-specific content using DOM creation (compliant with §2.6)
    switch (viewId) {
      case 'visualization': {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'togglePlatformComponentsSystem';
        toggleBtn.className = 'btn btn-sm system-overview-platform-toggle';
        toggleBtn.textContent = 'Hide Platforms';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'systemSvg');
        svg.setAttribute('class', 'system-overview-svg');

        const legend = document.createElement('div');
        legend.id = 'legend';
        legend.className = 'legend';

        section.append(toggleBtn, svg, legend);
        break;
      }

      case 'teamVisualization': {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'teamSvg');
        svg.setAttribute('class', 'system-overview-svg');

        const legend = document.createElement('div');
        legend.id = 'teamLegend';
        legend.className = 'legend';

        section.append(svg, legend);
        break;
      }

      case 'serviceRelationshipsVisualization': {
        const controls = document.createElement('div');
        controls.className = 'system-overview-filter-controls';

        const label = document.createElement('label');
        label.htmlFor = 'serviceSelection';
        label.className = 'system-overview-filter-label';
        label.textContent = 'Select Service:';

        // Container for ThemedSelect (will be populated in render method)
        const selectContainer = document.createElement('div');
        selectContainer.id = 'serviceSelectionContainer';

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'togglePlatformComponentsService';
        toggleBtn.className = 'btn btn-sm system-overview-toggle-btn';
        toggleBtn.textContent = 'Hide Platforms';

        controls.append(label, selectContainer, toggleBtn);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'serviceSvg');
        svg.setAttribute('class', 'system-overview-svg');

        const legend = document.createElement('div');
        legend.id = 'serviceLegend';
        legend.className = 'legend';

        section.append(controls, svg, legend);
        break;
      }

      case 'dependencyVisualization': {
        const controls = document.createElement('div');
        controls.className = 'system-overview-filter-controls';

        const label = document.createElement('label');
        label.htmlFor = 'dependencyServiceSelection';
        label.className = 'system-overview-filter-label';
        label.textContent = 'Select Service:';

        // Container for ThemedSelect (will be populated in render method)
        const selectContainer = document.createElement('div');
        selectContainer.id = 'dependencyServiceSelectionContainer';

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'togglePlatformComponentsDependency';
        toggleBtn.className = 'btn btn-sm system-overview-toggle-btn';
        toggleBtn.textContent = 'Hide Platforms';

        controls.append(label, selectContainer, toggleBtn);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'dependencySvg');
        svg.setAttribute('class', 'system-overview-svg');

        const legend = document.createElement('div');
        legend.id = 'dependencyLegend';
        legend.className = 'legend';

        section.append(controls, svg, legend);
        break;
      }

      case 'serviceDependenciesTableSlide': {
        const container = document.createElement('div');
        container.id = 'serviceDependenciesTable';

        const heading = document.createElement('h2');
        heading.textContent = 'Service Dependencies Table';

        const host = document.createElement('div');
        host.id = 'serviceDependenciesTableHost';

        container.append(heading, host);
        section.appendChild(container);
        section.classList.add('system-overview__section--full', 'system-overview__section--scroll');
        break;
      }

      case 'mermaidVisualization': {
        const container = document.createElement('div');
        container.id = 'mermaidGraph';
        container.className = 'system-overview-mermaid-container';
        section.appendChild(container);
        section.classList.add('system-overview__section--scroll');
        break;
      }

      case 'mermaidApiVisualization': {
        const controls = document.createElement('div');
        controls.className = 'system-overview-filter-controls';

        const label = document.createElement('label');
        label.htmlFor = 'apiServiceSelection';
        label.className = 'system-overview-filter-label';
        label.textContent = 'Select Service:';

        // Container for ThemedSelect (will be populated in render method)
        const selectContainer = document.createElement('div');
        selectContainer.id = 'apiServiceSelectionContainer';

        controls.append(label, selectContainer);

        const graphContainer = document.createElement('div');
        graphContainer.id = 'mermaidApiGraph';
        graphContainer.className = 'system-overview-mermaid-container';

        section.append(controls, graphContainer);
        section.classList.add('system-overview__section--scroll');
        break;
      }
    }

    return section;
  }

  /**
   * Switches to a specific view
   */
  switchView(viewId) {
    // Validate view exists
    const viewConfig = this.viewConfigs.find((v) => v.id === viewId);
    if (!viewConfig) {
      console.error(`SystemOverviewView: View '${viewId}' not found`);
      return;
    }

    // Hide all views
    this.viewConfigs.forEach((v) => {
      const el = document.getElementById(v.id);
      if (el) el.classList.remove('active');
    });

    // Show selected view
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add('active');
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
      case 'visualization': {
        // Platform toggle button
        const toggleSystem = document.getElementById('togglePlatformComponentsSystem');
        if (toggleSystem) {
          toggleSystem.onclick = () => {
            this.showPlatformComponents = !this.showPlatformComponents;
            this._rerenderCurrentVisualizationForPlatformToggle();
            this._updateAllToggleButtonsText();
          };
        }
        break;
      }
      case 'serviceRelationshipsVisualization': {
        // Service selection dropdown
        const serviceSelect = document.getElementById('serviceSelection');
        if (serviceSelect) {
          serviceSelect.onchange = () => this._updateServiceVisualization();
        }

        // Platform toggle button
        const toggleService = document.getElementById('togglePlatformComponentsService');
        if (toggleService) {
          toggleService.onclick = () => {
            this.showPlatformComponents = !this.showPlatformComponents;
            this._rerenderCurrentVisualizationForPlatformToggle();
            this._updateAllToggleButtonsText();
          };
        }
        break;
      }
      case 'dependencyVisualization': {
        // Dependency service selection dropdown
        const depServiceSelect = document.getElementById('dependencyServiceSelection');
        if (depServiceSelect) {
          depServiceSelect.onchange = () => this._updateDependencyVisualization();
        }

        // Platform toggle button
        const toggleDependency = document.getElementById('togglePlatformComponentsDependency');
        if (toggleDependency) {
          toggleDependency.onclick = () => {
            this.showPlatformComponents = !this.showPlatformComponents;
            this._rerenderCurrentVisualizationForPlatformToggle();
            this._updateAllToggleButtonsText();
          };
        }
        break;
      }
      // mermaidApiVisualization case removed - onchange handled by _populateApiServiceSelection()
    }
  }

  // ===== Visualization Rendering Methods =====

  renderSystemVisualization() {
    if (SystemService.getCurrentSystem()) {
      this.getSystemVisualization().render(SystemService.getCurrentSystem());
    }
  }

  renderTeamVisualization() {
    if (SystemService.getCurrentSystem()) {
      this.getTeamVisualization().render(SystemService.getCurrentSystem());
    }
  }

  renderServiceRelationships() {
    this._populateServiceSelection();
    this._updateServiceVisualization();
  }

  renderDependencyGraph() {
    this._populateDependencyServiceSelection();
    this._updateDependencyVisualization();
  }

  renderDependencyTable() {
    // Defer to next frame to ensure proper layout
    requestAnimationFrame(() => this._generateServiceDependenciesTable());
  }

  renderMermaidDiagram() {
    this._renderMermaidDiagramImpl();
  }

  renderMermaidApiDiagram() {
    // Populate ThemedSelect if not already created
    const container = document.getElementById('apiServiceSelectionContainer');
    if (container && container.children.length === 0) {
      this._populateApiServiceSelection();
    }
    // Render with current selection
    const selectedService = this._apiSelectValue || 'all';
    this._renderMermaidApiDiagramImpl(selectedService);
  }

  // ===== Visualization Getters (migrated from visualizations.js) =====

  getSystemVisualization() {
    if (!this._systemVisualization) {
      this._systemVisualization = new SystemVisualization({
        showPlatformComponents: this.showPlatformComponents,
      });
    }
    return this._systemVisualization;
  }

  getTeamVisualization() {
    if (!this._teamVisualization) {
      this._teamVisualization = new TeamVisualization();
    }
    return this._teamVisualization;
  }

  getServiceVisualization() {
    if (!this._serviceVisualization) {
      this._serviceVisualization = new ServiceVisualization({
        showPlatformComponents: this.showPlatformComponents,
      });
    }
    return this._serviceVisualization;
  }

  getDependencyVisualization() {
    if (!this._dependencyVisualization) {
      this._dependencyVisualization = new DependencyVisualization({
        showPlatformComponents: this.showPlatformComponents,
      });
    }
    return this._dependencyVisualization;
  }

  // ===== Helper Methods (migrated from visualizations.js) =====

  _updateAllToggleButtonsText() {
    const toggleButtonSystem = document.getElementById('togglePlatformComponentsSystem');
    const toggleButtonService = document.getElementById('togglePlatformComponentsService');
    const toggleButtonDependency = document.getElementById('togglePlatformComponentsDependency');
    const newText = this.showPlatformComponents ? 'Hide Platforms' : 'Show Platforms';

    if (toggleButtonSystem) toggleButtonSystem.textContent = newText;
    if (toggleButtonService) toggleButtonService.textContent = newText;
    if (toggleButtonDependency) toggleButtonDependency.textContent = newText;
  }

  _rerenderCurrentVisualizationForPlatformToggle() {
    if (!SystemService.getCurrentSystem()) {
      console.warn('Platform toggle: SystemService.getCurrentSystem() is not available.');
      return;
    }

    // Update showPlatformComponents on cached instances
    if (this._systemVisualization)
      this._systemVisualization.setShowPlatformComponents(this.showPlatformComponents);
    if (this._serviceVisualization)
      this._serviceVisualization.setShowPlatformComponents(this.showPlatformComponents);
    if (this._dependencyVisualization)
      this._dependencyVisualization.setShowPlatformComponents(this.showPlatformComponents);

    // Re-render current view
    const viewConfig = this.viewConfigs.find((v) => v.id === this.currentView);
    if (viewConfig) {
      viewConfig.renderFn();
    }
  }

  _populateServiceSelection() {
    const container = document.getElementById('serviceSelectionContainer');
    if (!container) return;

    // Clear any previous instance
    this._clearElement(container);

    // Build service options for ThemedSelect
    const serviceOptions = [{ value: 'all', text: 'All Services View' }];
    SystemService.getCurrentSystem().services.forEach((service) => {
      serviceOptions.push({
        value: service.serviceName,
        text: service.serviceName,
      });
    });

    // Create ThemedSelect instance
    this._serviceSelect = new ThemedSelect({
      options: serviceOptions,
      value: this._serviceSelectValue || 'all',
      id: 'serviceSelection',
      onChange: (value) => {
        this._serviceSelectValue = value;
        this._updateServiceVisualization(value);
      },
    });

    container.appendChild(this._serviceSelect.render());
  }

  _updateServiceVisualization(selectedService) {
    if (selectedService === undefined) {
      const dropdown = document.getElementById('serviceSelection');
      selectedService = dropdown ? dropdown.value : 'all';
    }

    const viz = this.getServiceVisualization();

    if (selectedService === 'all') {
      viz.render(SystemService.getCurrentSystem().services, null);
    } else {
      const selectedServiceData = SystemService.getCurrentSystem().services.find(
        (service) => service.serviceName === selectedService
      );
      if (selectedServiceData) {
        const relatedServices = VisualizationService.getServiceDependencies(
          SystemService.getCurrentSystem(),
          selectedServiceData,
          {},
          {}
        );
        viz.render(relatedServices, selectedService);
      } else {
        viz.render([], null);
      }
    }
  }

  _populateDependencyServiceSelection() {
    const container = document.getElementById('dependencyServiceSelectionContainer');
    if (!container) return;

    // Clear any previous instance
    this._clearElement(container);

    // Build service options for ThemedSelect
    const serviceOptions = [];
    SystemService.getCurrentSystem().services.forEach((service) => {
      serviceOptions.push({
        value: service.serviceName,
        text: service.serviceName,
      });
    });

    // Default to first service if no previous selection
    const defaultValue = this._dependencySelectValue || serviceOptions[0]?.value || '';

    // Create ThemedSelect instance
    this._dependencySelect = new ThemedSelect({
      options: serviceOptions,
      value: defaultValue,
      id: 'dependencyServiceSelection',
      onChange: (value) => {
        this._dependencySelectValue = value;
        this.getDependencyVisualization().render(value);
      },
    });

    container.appendChild(this._dependencySelect.render());
  }

  _updateDependencyVisualization() {
    this._populateDependencyServiceSelection();
    const selectedValue =
      this._dependencySelectValue ||
      SystemService.getCurrentSystem().services[0]?.serviceName ||
      '';
    this.getDependencyVisualization().render(selectedValue);
  }

  async _renderMermaidDiagramImpl() {
    const graphContainer = document.getElementById('mermaidGraph');
    if (!graphContainer) {
      console.error('renderMermaidDiagram: #mermaidGraph not found.');
      return;
    }

    const showMessage = (text, className) => {
      while (graphContainer.firstChild) {
        graphContainer.removeChild(graphContainer.firstChild);
      }
      const p = document.createElement('p');
      p.className = className;
      p.textContent = text;
      graphContainer.appendChild(p);
    };

    if (!SystemService.getCurrentSystem()) {
      console.warn('renderMermaidDiagram: No system data available.');
      showMessage('Load a system to see the architecture diagram.', 'mermaid-info');
      return;
    }

    try {
      const definition = MermaidService.generateArchitectureSyntax(
        SystemService.getCurrentSystem()
      );
      const success = await MermaidService.renderToContainer(
        definition,
        graphContainer,
        'mermaid-system-architecture'
      );
      if (!success) {
        showMessage(
          'Unable to render Mermaid diagram. Check console for details.',
          'mermaid-error'
        );
      }
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error);
      showMessage('Unable to render Mermaid diagram. Check console for details.', 'mermaid-error');
    }
  }

  _populateApiServiceSelection() {
    const container = document.getElementById('apiServiceSelectionContainer');
    if (
      !container ||
      !SystemService.getCurrentSystem() ||
      !Array.isArray(SystemService.getCurrentSystem().services)
    )
      return;

    // Clear any previous instance
    this._clearElement(container);

    // Build service options for ThemedSelect
    const serviceOptions = [{ value: 'all', text: 'All Services' }];
    SystemService.getCurrentSystem()
      .services.slice()
      .sort((a, b) => (a.serviceName || '').localeCompare(b.serviceName || ''))
      .forEach((service) => {
        serviceOptions.push({
          value: service.serviceName,
          text: service.serviceName,
        });
      });

    // Create ThemedSelect instance
    this._apiSelect = new ThemedSelect({
      options: serviceOptions,
      value: this._apiSelectValue || 'all',
      id: 'apiServiceSelection',
      onChange: (value) => {
        this._apiSelectValue = value;
        this._renderMermaidApiDiagramImpl(value);
      },
    });

    container.appendChild(this._apiSelect.render());
  }

  async _renderMermaidApiDiagramImpl(serviceParam) {
    const graphContainer = document.getElementById('mermaidApiGraph');

    let selectedService = serviceParam;
    if (!selectedService || selectedService === 'all') {
      const select = document.getElementById('apiServiceSelection');
      if (select && select.value) {
        selectedService = select.value;
      } else {
        selectedService = 'all';
      }
    }

    const showMessage = (text, className) => {
      while (graphContainer.firstChild) {
        graphContainer.removeChild(graphContainer.firstChild);
      }
      const p = document.createElement('p');
      p.className = className;
      p.textContent = text;
      graphContainer.appendChild(p);
    };

    if (!graphContainer) {
      console.error('renderMermaidApiDiagram: required elements not found.');
      return;
    }
    if (!SystemService.getCurrentSystem()) {
      showMessage('Load a system to see API interactions.', 'mermaid-info');
      return;
    }

    try {
      const definition = MermaidService.generateApiSyntax(SystemService.getCurrentSystem(), {
        selectedService,
      });
      const success = await MermaidService.renderToContainer(
        definition,
        graphContainer,
        'mermaid-api-interactions'
      );
      if (!success) {
        showMessage(
          'Unable to render API interactions diagram. Check console for details.',
          'mermaid-error'
        );
      }
    } catch (error) {
      console.error('Failed to render Mermaid API diagram:', error);
      showMessage(
        'Unable to render API interactions diagram. Check console for details.',
        'mermaid-error'
      );
    }
  }

  _generateServiceDependenciesTable() {
    const tableContainer = document.getElementById('serviceDependenciesTableHost');
    if (!tableContainer) {
      console.error('Service Dependencies table container not found.');
      return;
    }

    const tableData = VisualizationService.prepareServiceDependenciesTableData(
      SystemService.getCurrentSystem()
    );
    this.serviceDependenciesTableData = tableData;

    const wrapTextFormatter = (cell, defaultText = 'None') => {
      const value = cell.getValue();
      const display = value && value !== '' ? value : defaultText;
      const el = cell.getElement();
      el.classList.add('system-overview-table-cell--wrap');
      return display;
    };

    const columns = [
      {
        title: 'Service Name',
        field: 'serviceName',
        headerFilter: 'input',
        width: 180,
        formatter: wrapTextFormatter,
      },
      {
        title: 'Description',
        field: 'description',
        headerFilter: 'input',
        width: 220,
        formatter: wrapTextFormatter,
      },
      {
        title: 'Owning Team',
        field: 'owningTeam',
        headerFilter: 'input',
        width: 160,
        formatter: wrapTextFormatter,
      },
      {
        title: 'Upstream Dependencies',
        field: 'upstreamDependenciesText',
        formatter: wrapTextFormatter,
        headerFilter: 'input',
        width: 220,
      },
      {
        title: 'Platform Dependencies',
        field: 'platformDependenciesText',
        formatter: wrapTextFormatter,
        headerFilter: 'input',
        width: 220,
      },
      {
        title: 'Downstream Dependencies',
        field: 'downstreamDependenciesText',
        formatter: wrapTextFormatter,
        headerFilter: 'input',
        width: 220,
      },
    ];

    const tabulatorOptions = {
      data: tableData,
      columns,
      layout: 'fitDataStretch',
      responsiveLayout: false,
      placeholder: 'No services available.',
      pagination: 'local',
      paginationSize: 20,
      paginationSizeSelector: [10, 20, 50, 100],
      movableColumns: true,
      initialSort: [{ column: 'serviceName', dir: 'asc' }],
    };

    if (EnhancedTableWidget) {
      if (this.serviceDependenciesTableWidget) this.serviceDependenciesTableWidget.destroy();

      this.serviceDependenciesTableWidget = new EnhancedTableWidget(tableContainer, {
        ...tabulatorOptions,
        uniqueIdField: 'id',
        exportCsvFileName: 'service_dependencies.csv',
        exportJsonFileName: 'service_dependencies.json',
        exportXlsxFileName: 'service_dependencies.xlsx',
        exportSheetName: 'Service Dependencies',
      });
    } else {
      console.warn(
        'EnhancedTableWidget not available. Falling back to Tabulator for service dependencies.'
      );

      if (this.serviceDependenciesTableWidget) this.serviceDependenciesTableWidget.destroy();

      this.serviceDependenciesTableWidget = new Tabulator(tableContainer, {
        ...tabulatorOptions,
        height: '500px',
      });
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
    if (this.serviceDependenciesTableWidget) {
      this.serviceDependenciesTableWidget.destroy();
      this.serviceDependenciesTableWidget = null;
    }
    if (this.container) {
      this._clearElement(this.container);
    }
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
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
      availableViews: this.viewConfigs.map((v) => ({ id: v.id, label: v.label })),
      services: SystemService.getCurrentSystem()?.services?.map((s) => ({
        serviceName: s.serviceName,
        owningTeamId: s.owningTeamId,
      })),
      serviceCount: SystemService.getCurrentSystem()?.services?.length || 0,
      dependencies: SystemService.getCurrentSystem()?.serviceDependencies,
      platformDependencies: SystemService.getCurrentSystem()?.platformDependencies,
    };
  }
}
