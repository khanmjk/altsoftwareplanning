let showPlatformComponents = true;
let serviceDependenciesTableWidget = null;
let currentServiceDependenciesTableData = [];


// Initialize Mermaid via MermaidService
MermaidService.init({ startOnLoad: false, theme: 'default' });

// ----------------------

// --- Lazy-loaded Visualization Class Instances ---
let _systemVisualization = null;
let _teamVisualization = null;
let _serviceVisualization = null;
let _dependencyVisualization = null;

function getSystemVisualization() {
    if (!_systemVisualization) {
        _systemVisualization = new SystemVisualization({ showPlatformComponents });
    }
    return _systemVisualization;
}

function getTeamVisualization() {
    if (!_teamVisualization) {
        _teamVisualization = new TeamVisualization();
    }
    return _teamVisualization;
}

function getServiceVisualization() {
    if (!_serviceVisualization) {
        _serviceVisualization = new ServiceVisualization({ showPlatformComponents });
    }
    return _serviceVisualization;
}

function getDependencyVisualization() {
    if (!_dependencyVisualization) {
        _dependencyVisualization = new DependencyVisualization({ showPlatformComponents });
    }
    return _dependencyVisualization;
}
// --- End Visualization Getters ---




async function renderMermaidDiagram() {
    const graphContainer = document.getElementById('mermaidGraph');
    if (!graphContainer) {
        console.error("renderMermaidDiagram: #mermaidGraph not found.");
        return;
    }

    // Helper to show message
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
        console.warn("renderMermaidDiagram: No system data available.");
        showMessage('Load a system to see the architecture diagram.', 'mermaid-info');
        return;
    }

    try {
        const definition = MermaidService.generateArchitectureSyntax(SystemService.getCurrentSystem());
        const success = await MermaidService.renderToContainer(definition, graphContainer, 'mermaid-system-architecture');
        if (!success) {
            showMessage('Unable to render Mermaid diagram. Check console for details.', 'mermaid-error');
        }
    } catch (error) {
        console.error("Failed to render Mermaid diagram:", error);
        showMessage('Unable to render Mermaid diagram. Check console for details.', 'mermaid-error');
    }
}

function populateApiServiceSelection() {
    const select = document.getElementById('apiServiceSelection');
    if (!select || !SystemService.getCurrentSystem() || !Array.isArray(SystemService.getCurrentSystem().services)) return;
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Services';
    select.appendChild(allOption);

    SystemService.getCurrentSystem().services
        .slice()
        .sort((a, b) => (a.serviceName || '').localeCompare(b.serviceName || ''))
        .forEach(service => {
            const opt = document.createElement('option');
            opt.value = service.serviceName;
            opt.textContent = service.serviceName;
            select.appendChild(opt);
        });

    select.onchange = () => {
        renderMermaidApiDiagram(select.value);
    };
}

async function renderMermaidApiDiagram(serviceParam) {
    const graphContainer = document.getElementById('mermaidApiGraph');

    // Determine selected service: explicit param > dropdown value > 'all'
    let selectedService = serviceParam;
    if (!selectedService || selectedService === 'all') {
        const select = document.getElementById('apiServiceSelection');
        if (select && select.value) {
            selectedService = select.value;
        } else {
            selectedService = 'all';
        }
    }

    // Helper to show message
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
        console.error("renderMermaidApiDiagram: required elements not found.");
        return;
    }
    if (!SystemService.getCurrentSystem()) {
        showMessage('Load a system to see API interactions.', 'mermaid-info');
        return;
    }

    try {
        const definition = MermaidService.generateApiSyntax(SystemService.getCurrentSystem(), { selectedService });
        const success = await MermaidService.renderToContainer(definition, graphContainer, 'mermaid-api-interactions');
        if (!success) {
            showMessage('Unable to render API interactions diagram. Check console for details.', 'mermaid-error');
        }
    } catch (error) {
        console.error("Failed to render Mermaid API diagram:", error);
        showMessage('Unable to render API interactions diagram. Check console for details.', 'mermaid-error');
    }
}

function populateServiceSelection() {
    const serviceSelection = document.getElementById('serviceSelection');
    if (!serviceSelection) return; // Exit if element doesn't exist
    serviceSelection.innerHTML = ''; // Clear existing options

    // Add "All Services View" option
    let allServicesOption = document.createElement('option');
    allServicesOption.value = 'all';
    allServicesOption.text = 'All Services View';
    serviceSelection.appendChild(allServicesOption);

    // Add individual services
    SystemService.getCurrentSystem().services.forEach(service => {
        let option = document.createElement('option');
        option.value = service.serviceName;
        option.text = service.serviceName;
        serviceSelection.appendChild(option);
    });
}

function getServiceDependencies(service, collectedServices = {}, visitedServices = {}) {
    return VisualizationService.getServiceDependencies(SystemService.getCurrentSystem(), service, collectedServices, visitedServices);
}

function updateServiceVisualization(selectedService) {
    // If called without arg (e.g. from resize observer), try to find the dropdown or default to all
    if (selectedService === undefined) {
        const dropdown = document.getElementById('serviceSelection');
        selectedService = dropdown ? dropdown.value : 'all';
    }

    const viz = getServiceVisualization();

    if (selectedService === 'all') {
        viz.render(SystemService.getCurrentSystem().services, null);
    } else {
        // Find the selected service and its dependencies
        const selectedServiceData = SystemService.getCurrentSystem().services.find(service => service.serviceName === selectedService);
        if (selectedServiceData) {
            const relatedServices = getServiceDependencies(selectedServiceData);
            viz.render(relatedServices, selectedService);
        } else {
            viz.render([], null);
        }
    }
}



//Create a function to populate the dropdown menu with available services.
function populateDependencyServiceSelection() {
    const serviceSelection = document.getElementById('dependencyServiceSelection');
    if (!serviceSelection) return; // Exit if element doesn't exist
    serviceSelection.innerHTML = ''; // Clear existing options

    // Add individual services
    SystemService.getCurrentSystem().services.forEach(service => {
        let option = document.createElement('option');
        option.value = service.serviceName;
        option.text = service.serviceName;
        serviceSelection.appendChild(option);
    });
}

//We need to build a graph with nodes and links, ensuring that nodes are not duplicated and circular dependencies are handled.
//We use a breadth-first search (BFS) traversal to explore both upstream and downstream services, handling cycles by keeping track of visited services.
//We build nodes and links without duplicating nodes.
//Ensure the edges are defined in the correct direction (from upstream to downstream).
function buildDependencyGraph(serviceName) {
    return VisualizationService.buildDependencyGraph(SystemService.getCurrentSystem(), serviceName, { showPlatformComponents });
}

//Create functions to build the data structure representing upstream and downstream dependencies.
function buildDependencyTree(serviceName) {
    return VisualizationService.buildDependencyTree(SystemService.getCurrentSystem(), serviceName);
}


//Create a function to update the visualization when a new service is selected.
function updateDependencyVisualization() {
    const selectionEl = document.getElementById('dependencyServiceSelection');
    if (!selectionEl) {
        console.warn("Dependency service selection element not found.");
        return;
    }

    const selectedServiceName = selectionEl.value;

    populateDependencyServiceSelection();

    if (Array.from(selectionEl.options).some(opt => opt.value === selectedServiceName)) {
        selectionEl.value = selectedServiceName;
    }

    getDependencyVisualization().render(selectionEl.value);
}


function prepareServiceDependenciesTableData() {
    return VisualizationService.prepareServiceDependenciesTableData(SystemService.getCurrentSystem());
}

function generateServiceDependenciesTable() {
    const tableContainer = document.getElementById('serviceDependenciesTableHost');
    if (!tableContainer) {
        console.error("Service Dependencies table container not found.");
        return;
    }

    const tableData = prepareServiceDependenciesTableData();
    currentServiceDependenciesTableData = tableData;

    const wrapTextFormatter = (cell, defaultText = 'None') => {
        const value = cell.getValue();
        const display = (value && value !== '') ? value : defaultText;
        const el = cell.getElement();
        el.style.whiteSpace = 'normal';
        el.style.lineHeight = '1.3';
        return display;
    };

    const columns = [
        { title: 'Service Name', field: 'serviceName', headerFilter: 'input', width: 180, formatter: wrapTextFormatter },
        { title: 'Description', field: 'description', headerFilter: 'input', width: 220, formatter: wrapTextFormatter },
        { title: 'Owning Team', field: 'owningTeam', headerFilter: 'input', width: 160, formatter: wrapTextFormatter },
        {
            title: 'Upstream Dependencies',
            field: 'upstreamDependenciesText',
            formatter: wrapTextFormatter,
            headerFilter: 'input',
            width: 220
        },
        {
            title: 'Platform Dependencies',
            field: 'platformDependenciesText',
            formatter: wrapTextFormatter,
            headerFilter: 'input',
            width: 220
        },
        {
            title: 'Downstream Dependencies',
            field: 'downstreamDependenciesText',
            formatter: wrapTextFormatter,
            headerFilter: 'input',
            width: 220
        }
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
        initialSort: [{ column: 'serviceName', dir: 'asc' }]
    };

    if (EnhancedTableWidget) {
        if (serviceDependenciesTableWidget) serviceDependenciesTableWidget.destroy();

        serviceDependenciesTableWidget = new EnhancedTableWidget(tableContainer, {
            ...tabulatorOptions,
            uniqueIdField: 'id',
            exportCsvFileName: 'service_dependencies.csv',
            exportJsonFileName: 'service_dependencies.json',
            exportXlsxFileName: 'service_dependencies.xlsx',
            exportSheetName: 'Service Dependencies'
        });
    } else {
        console.warn("EnhancedTableWidget not available. Falling back to Tabulator for service dependencies.");

        if (serviceDependenciesTableWidget) serviceDependenciesTableWidget.destroy();

        serviceDependenciesTableWidget = new Tabulator(tableContainer, {
            ...tabulatorOptions,
            height: '500px'
        });
    }
}

function updateAllToggleButtonsText(showPlatforms) {
    const toggleButtonSystem = document.getElementById('togglePlatformComponentsSystem');
    const toggleButtonService = document.getElementById('togglePlatformComponentsService');
    const toggleButtonDependency = document.getElementById('togglePlatformComponentsDependency');
    const newText = showPlatforms ? 'Hide Platforms' : 'Show Platforms';

    if (toggleButtonSystem) toggleButtonSystem.textContent = newText;
    if (toggleButtonService) toggleButtonService.textContent = newText;
    if (toggleButtonDependency) toggleButtonDependency.textContent = newText;
}

function rerenderCurrentVisualizationForPlatformToggle() {
    if (!SystemService.getCurrentSystem()) {
        console.warn("Platform toggle: SystemService.getCurrentSystem() is not available.");
        return;
    }

    // Update showPlatformComponents on cached instances
    if (_systemVisualization) _systemVisualization.setShowPlatformComponents(showPlatformComponents);
    if (_serviceVisualization) _serviceVisualization.setShowPlatformComponents(showPlatformComponents);
    if (_dependencyVisualization) _dependencyVisualization.setShowPlatformComponents(showPlatformComponents);

    let activeViewId = null;
    const carousel = document.getElementById('visualizationCarousel');
    if (carousel) {
        const activeItem = carousel.querySelector('.carousel-item.active') ||
            Array.from(carousel.querySelectorAll('.carousel-item')).find(item => item.style.display !== 'none');
        if (activeItem) {
            activeViewId = activeItem.id;
        }
    }

    if (!activeViewId && typeof visualizationItems !== 'undefined' && typeof currentVisualizationIndex !== 'undefined') {
        activeViewId = visualizationItems[currentVisualizationIndex]?.id || null;
    }

    switch (activeViewId) {
        case 'visualization':
            getSystemVisualization().render(SystemService.getCurrentSystem());
            break;
        case 'serviceRelationshipsVisualization':
            updateServiceVisualization();
            break;
        case 'dependencyVisualization':
            updateDependencyVisualization();
            break;
        case 'mermaidVisualization':
            renderMermaidDiagram();
            break;
        default:
            // If view can't be detected, refresh all relevant visualizations
            getSystemVisualization().render(SystemService.getCurrentSystem());
            updateServiceVisualization();
            updateDependencyVisualization();
            break;
    }
}


