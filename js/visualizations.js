/**
 * REVISED (v2) - Generates the main system visualization (Services, APIs, Platforms).
 * - Fixes static graph issue by stopping drag event propagation to prevent zoom interference.
 * - Ensures consistent use of event.subject in drag handler.
 */
function generateVisualization(systemData) {
    let svg = d3.select('#systemSvg');
    svg.selectAll('*').remove(); // Clear any existing content

    // --- Get SVG Dimensions ---
    const container = document.getElementById('visualization');
    if (!container) {
        console.error("Container #visualization not found for generateVisualization.");
        return;
    }
    const svgRect = container.getBoundingClientRect();
    const width = svgRect.width > 0 ? svgRect.width : 800;
    const height = parseInt(svg.style('height')) || 600;
    console.log(`generateVisualization calculated width: ${width}, height: ${height}`);
    // --- End Dimensions ---

    // --- Zoom Setup ---
    let graphGroup = svg.append('g').attr('class', 'graph-group'); // Container for zoomable elements

    let zoom = d3.zoom()
        .scaleExtent([0.1, 5]) // Adjusted scale extent slightly
        .on('zoom', zoomed);

    // Apply zoom AFTER appending graphGroup, call it on SVG element
    svg.call(zoom);

    function zoomed(event) {
        graphGroup.attr('transform', event.transform); // Apply transform to the group
    }
    // --- End Zoom Setup ---

    // Define node radius
    const radius = 10;

    // --- Prepare Nodes and Links ---
    let nodes = [];
    let links = [];
    let nodeMap = {};

    const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const teamIds = (systemData.teams || []).map(team => team.teamId);
    teamColorScale.domain(teamIds);

    // Create nodes for services and APIs
    (systemData.services || []).forEach(service => {
        let teamId = service.owningTeamId || 'unassigned';
        let nodeColor = teamColorScale(teamId);

        nodes.push({ id: service.serviceName, type: 'service', teamId: teamId, color: nodeColor });
        nodeMap[service.serviceName] = { id: service.serviceName, type: 'service' };

        (service.apis || []).forEach(api => {
            nodes.push({ id: api.apiName, type: 'api', teamId: teamId, color: nodeColor });
            nodeMap[api.apiName] = { id: api.apiName, type: 'api' };
            links.push({
                source: api.apiName,
                target: service.serviceName,
                type: 'api-service'
            });
        });
    });

    // Add platform dependencies as nodes
    (systemData.services || []).forEach(service => {
        (service.platformDependencies || []).forEach(platform => {
            if (!nodeMap[platform]) {
                nodes.push({ id: platform, type: 'platform', color: '#a04040' }); // Distinct platform color
                nodeMap[platform] = { id: platform, type: 'platform' };
            }
            links.push({
                source: service.serviceName,
                target: platform,
                type: 'platform-dependency'
            });
        });
    });

    // Create links based on dependencies
    (systemData.services || []).forEach(service => {
        (service.serviceDependencies || []).forEach(dependency => {
            if (nodeMap[dependency]) {
                links.push({
                    source: service.serviceName,
                    target: dependency,
                    type: 'service-dependency'
                });
            }
        });
        (service.apis || []).forEach(api => {
            (api.dependentApis || []).forEach(depApi => {
                if (nodeMap[depApi]) {
                    links.push({
                        source: api.apiName,
                        target: depApi,
                        type: 'api-dependency'
                    });
                }
            });
        });
    });
    // --- End Node/Link Prep ---

    // --- Simulation Setup ---
    const nodeCount = nodes.length;
    let chargeStrength = -300;
    let linkDistance = 100;
    if (nodeCount > 100) { chargeStrength = -100; linkDistance = 30; }
    else if (nodeCount > 50) { chargeStrength = -200; linkDistance = 50; }

    let simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .force('collide', d3.forceCollide(radius + 20)); // Increased collision radius slightly
    // --- End Simulation ---

    // --- Draw Elements (Append to graphGroup) ---
    let link = graphGroup.append('g') // Append links to graphGroup
        .attr('class', 'links')
        .attr('stroke', '#aaa')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-dasharray', d => {
            if (d.type === 'api-service') return '2,2';
            else if (d.type === 'service-dependency') return '5,5';
            else if (d.type === 'platform-dependency') return '10,5';
            else if (d.type === 'api-dependency') return '3,3';
            else return '1,0';
        })
        .attr('stroke-width', 1.5);

    let node = graphGroup.append('g') // Append nodes to graphGroup
        .attr('class', 'nodes')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', radius)
        .attr('fill', d => d.color)
        .call(drag(simulation)); // Apply drag behavior

    let labels = graphGroup.append('g') // Append labels to graphGroup
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('dx', 0) // Center horizontally over node
        .attr('dy', -radius - 5) // Position above node
        .attr('text-anchor', 'middle') // Center text
        .style('font-size', '10px') // Smaller font size
        .style('pointer-events', 'none') // Prevent text from blocking node events
        .text(d => d.id);
    // --- End Draw Elements ---

    // --- Tooltip ---
    let tooltip = d3.select('body').selectAll('.tooltip').data([null]).join('div') // Reuse or create tooltip
        .attr('class', 'tooltip')
        .style('opacity', 0);

    node.on('mouseover', function(event, d) {
        let info = '';
        if (d.type === 'service') {
            let service = (systemData.services || []).find(s => s.serviceName === d.id);
            let team = service ? (systemData.teams || []).find(t => t.teamId === service.owningTeamId) : null;
            info = `<strong>Service:</strong> ${d.id}<br>
                    <strong>Team:</strong> ${team ? (team.teamName || team.teamIdentity) : 'Unassigned'}<br>
                    <strong>Description:</strong> ${service?.serviceDescription || 'N/A'}`;
        } else if (d.type === 'api') {
            let api, serviceName;
            (systemData.services || []).forEach(service => {
                (service.apis || []).forEach(a => {
                    if (a.apiName === d.id) { api = a; serviceName = service.serviceName; }
                });
            });
            info = `<strong>API:</strong> ${d.id}<br>
                    <strong>Service:</strong> ${serviceName || 'N/A'}<br>
                    <strong>Description:</strong> ${api?.apiDescription || 'N/A'}`;
        } else if (d.type === 'platform') {
            info = `<strong>Platform:</strong> ${d.id}`;
        }
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(info).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 28) + 'px');
    }).on('mouseout', function() {
        tooltip.transition().duration(500).style('opacity', 0);
    });
    // --- End Tooltip ---

    // --- Simulation Tick ---
    simulation.on('tick', () => {
        node
            .attr('cx', d => d.x = Math.max(radius, Math.min(width - radius, d.x)))
            .attr('cy', d => d.y = Math.max(radius, Math.min(height - radius, d.y)));
        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y - radius - 5); // Keep label position relative to node
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    });
    // --- End Tick ---

    // --- Drag Functions (with fix) ---
    function drag(simulation) {
        function dragstarted(event, d) {
            // *** FIX: Stop event propagation to prevent zoom/pan interference ***
            if (event.sourceEvent) { // Ensure sourceEvent exists
                 event.sourceEvent.stopPropagation();
            }
            // *******************************************************************
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x; // Use event.subject which is the datum 'd'
            event.subject.fy = event.subject.y;
        }
        function dragged(event, d) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    // --- End Drag Functions ---

    // --- Legend ---
    d3.select('#legend').selectAll('*').remove(); // Clear previous legend in the dedicated div
    let legendData = (systemData.teams || []).map(team => ({
        teamIdentity: team.teamIdentity || team.teamName || team.teamId, // Use identity, fallback to name/ID
        color: teamColorScale(team.teamId)
    }));
    // Add platform legend item
    legendData.push({ teamIdentity: 'Platform Dependency', color: '#a04040' });

    let legend = d3.select('#legend').selectAll('.legend-item')
        .data(legendData)
        .enter().append('div')
        .attr('class', 'legend-item'); // Use existing CSS class

    legend.append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('background-color', d => d.color)
        .style('border-radius', '50%') // Circles for legend
        .style('margin-right', '5px');

    legend.append('span')
        .text(d => d.teamIdentity);
    // --- End Legend ---
} // --- End generateVisualization ---

/** Generate Team Relationships Visualization **/
function generateTeamVisualization(systemData) {
    let svg = d3.select('#teamSvg');
    svg.selectAll('*').remove(); // Clear any existing content

    // Set SVG dimensions
    // Get SVG element and its parent container
    const container = document.getElementById('teamVisualization'); // Get the container div
    if (!container) {
         console.error("Container #teamVisualization not found for generateTeamVisualization.");
         return;
    }
    const svgRect = container.getBoundingClientRect(); // Get dimensions of the container
    const width = svgRect.width > 0 ? svgRect.width : 800; // Use container width or default
    // Keep height fixed or get from container style if needed
    const height = parseInt(svg.style('height')) || 600;
    console.log(`generateTeamVisualization calculated width: ${width}, height: ${height}`);

    // Define node radius
    const radius = 20;
    
    // Prepare nodes and links data
    let nodes = [];
    let links = [];
    let nodeMap = {};

    // Create a color scale for teams
    const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const teamIds = systemData.teams.map(team => team.teamId);
    teamColorScale.domain(teamIds);

    // Map teamId to services
    let teamServicesMap = {};
    systemData.services.forEach(service => {
        let teamId = service.owningTeamId;
        if (teamId) { // Ensure teamId is valid
            if (!teamServicesMap[teamId]) {
                teamServicesMap[teamId] = [];
            }
            teamServicesMap[teamId].push(service.serviceName);
        }
    });

    // Create nodes for teams
    systemData.teams.forEach(team => {
        if (team.teamId) { // Ensure teamId is valid
            nodes.push({
                id: team.teamId,
                name: team.teamIdentity,
                type: 'team',
                color: teamColorScale(team.teamId),
                services: teamServicesMap[team.teamId] || []
            });
            nodeMap[team.teamId] = { id: team.teamId };
        }
    });

    // Create links based on service dependencies
    let teamDependencies = {};

    systemData.services.forEach(service => {
        let owningTeamId = service.owningTeamId;
        if (owningTeamId && systemData.teams.some(t => t.teamId === owningTeamId)) { // Ensure owningTeamId is valid
            if (service.serviceDependencies.length > 0) {
                service.serviceDependencies.forEach(dependentServiceName => {
                    let dependentService = systemData.services.find(s => s.serviceName === dependentServiceName);
                    if (dependentService) {
                        let dependentTeamId = dependentService.owningTeamId;
                        if (dependentTeamId && owningTeamId !== dependentTeamId && systemData.teams.some(t => t.teamId === dependentTeamId)) {
                            let linkKey = owningTeamId + '-' + dependentTeamId;
                            if (!teamDependencies[linkKey]) {
                                teamDependencies[linkKey] = true;
                                links.push({
                                    source: owningTeamId,
                                    target: dependentTeamId,
                                    type: 'team-dependency'
                                });
                            }
                        }
                    }
                });
            }
        }
    });

    // Set up the simulation
    let simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .force('collide', d3.forceCollide(radius + 30));

    // Add links to the SVG
    let link = svg.append('g')
        .attr('stroke', '#aaa')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', 2);

    // Add nodes to the SVG
    let node = svg.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', 20)
        .attr('fill', d => d.color)
        .call(drag(simulation));

    // Add labels to nodes
    let labels = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('dx', 0)
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .text(d => d.name);

    // Tooltip
    let tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    node.on('mouseover', function(event, d) {
        let team = systemData.teams.find(t => t.teamId === d.id);
        let sdm = systemData.sdms.find(s => s.sdmId === team.sdmId);
        let pmt = systemData.pmts.find(p => p.pmtId === team.pmtId);
        let services = d.services.join(', ') || 'None';
        let info = `<strong>Team Identity:</strong> ${team.teamIdentity}<br>
                    <strong>Team Name:</strong> ${team.teamName}<br>
                    <strong>SDM:</strong> ${sdm ? sdm.sdmName : 'N/A'}<br>
                    <strong>PMT:</strong> ${pmt ? pmt.pmtName : 'N/A'}<br>
                    <strong>Size of Team:</strong> ${team.fundedHeadcount !== undefined ? team.fundedHeadcount : (team.engineers ? team.engineers.length : 'N/A')}<br>
                    <strong>Engineer Names:</strong> ${(team.engineers && team.engineers.length > 0) ? team.engineers.join(', ') : 'None'}<br>
                    <strong>Services Owned:</strong> ${services}`;
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        tooltip.html(info)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }).on('mouseout', function() {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    });

    // Update positions on each tick
    simulation.on('tick', () => {
        node
            .attr('cx', d => d.x = Math.max(radius, Math.min(width - radius, d.x)))
            .attr('cy', d => d.y = Math.max(radius, Math.min(height - radius, d.y)));
        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y - radius - 5);
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    });

    // Drag functions
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    // Add legend for teams
    let legendData = systemData.teams.map(team => ({
        teamIdentity: team.teamIdentity,
        color: teamColorScale(team.teamId)
    }));

    let legend = d3.select('#teamLegend').selectAll('.legend-item')
        .data(legendData)
        .enter().append('div')
        .attr('class', 'legend-item');

    legend.append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('background-color', d => d.color)
        .style('border-radius', '50%') // This makes it a circle
        .style('margin-right', '5px');

    legend.append('span')
        .text(d => d.teamIdentity);
}

function populateServiceSelection() {
    const serviceSelection = document.getElementById('serviceSelection');
    serviceSelection.innerHTML = ''; // Clear existing options

    // Add "All Services View" option
    let allServicesOption = document.createElement('option');
    allServicesOption.value = 'all';
    allServicesOption.text = 'All Services View';
    serviceSelection.appendChild(allServicesOption);

    // Add individual services
    currentSystemData.services.forEach(service => {
        let option = document.createElement('option');
        option.value = service.serviceName;
        option.text = service.serviceName;
        serviceSelection.appendChild(option);
    });
}

function getServiceDependencies(service, collectedServices = {}, visitedServices = {}) {
    if (!service || visitedServices[service.serviceName]) {
        return [];
    }
    visitedServices[service.serviceName] = true;
    collectedServices[service.serviceName] = service;

    // Recursively collect dependencies
    service.serviceDependencies.forEach(depName => {
        const depService = currentSystemData.services.find(s => s.serviceName === depName);
        getServiceDependencies(depService, collectedServices, visitedServices);
    });

    return Object.values(collectedServices);
}

function updateServiceVisualization() {
    const selectedService = document.getElementById('serviceSelection').value;

    // Ensure the service selection is populated with the latest data
    populateServiceSelection();
    
    if (selectedService === 'all') {
        generateServiceVisualization(currentSystemData.services, null); // No service is selected
    } else {
        // Find the selected service and its dependencies
        const selectedServiceData = currentSystemData.services.find(service => service.serviceName === selectedService);
        const relatedServices = getServiceDependencies(selectedServiceData);

        generateServiceVisualization(relatedServices, selectedService);
    }
}

function generateServiceVisualization(services, selectedServiceName) {
    let svg = d3.select('#serviceSvg');
    svg.selectAll('*').remove(); // Clear any existing content

    // Prepare nodes and links data
    let nodes = [];
    let links = [];
    let nodeMap = {};
   
    // Set SVG dimensions
    // Get SVG element and its parent container
    const container = document.getElementById('serviceRelationshipsVisualization'); // Get the container div
    if (!container) {
         console.error("Container #serviceRelationshipsVisualization not found for generateServiceVisualization.");
         return;
    }
    const svgRect = container.getBoundingClientRect(); // Get dimensions of the container
    const width = svgRect.width > 0 ? svgRect.width : 800; // Use container width or default
    // Keep height fixed or get from container style if needed
    const height = parseInt(svg.style('height')) || 600;
    console.log(`generateServiceVisualization calculated width: ${width}, height: ${height}`);

    // Define node radius
    const radius = 20;
   
    // Create a color scale based on teams
    const teamColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const teamIds = currentSystemData.teams.map(team => team.teamId);
    teamColorScale.domain(teamIds);

    // Map service names to services for quick lookup
    const serviceMap = {};
    currentSystemData.services.forEach(service => {
        serviceMap[service.serviceName] = service;
    });

    // Create nodes for services
    services.forEach(service => {
        let teamId = service.owningTeamId || 'unassigned';
        let nodeColor = teamColorScale(teamId);

        // Check if this is the selected service
        let isSelected = service.serviceName === selectedServiceName;

        nodes.push({
            id: service.serviceName,
            type: 'service',
            teamId: teamId,
            color: nodeColor,
            isSelected: isSelected
        });
        nodeMap[service.serviceName] = { id: service.serviceName, type: 'service' };
    });

    // Add platform dependencies as nodes
    services.forEach(service => {
        if (service.platformDependencies) {
            service.platformDependencies.forEach(platform => {
                if (!nodeMap[platform]) {
                    nodes.push({ id: platform, type: 'platform', color: '#a04040', isSelected: false }); // Add isSelected property
                    nodeMap[platform] = { id: platform, type: 'platform' };
                }
                // Link service to platform
                links.push({
                    source: service.serviceName,
                    target: platform,
                    type: 'platform-dependency'
                });
            });
        }
    });

    // Create links based on service dependencies
    services.forEach(service => {
        // Service dependencies
        service.serviceDependencies.forEach(dependency => {
            if (nodeMap[dependency]) {
                links.push({
                    source: service.serviceName,
                    target: dependency,
                    type: 'service-dependency'
                });
            }
        });
    });

    // Set up the simulation
    let simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .force('collide', d3.forceCollide(radius + 30));

    // **Corrected Node Creation and Attribute Setting**

    let node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => d.isSelected ? 25 : 20) // Increase radius for selected node
        .attr('fill', d => d.color)
        .attr('stroke', d => d.isSelected ? 'red' : '#fff') // Change stroke color to red for selected node
        .attr('stroke-width', d => d.isSelected ? 4 : 2) // Increase stroke width for selected node
        .call(drag(simulation));

    // Add labels to nodes
    let labels = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('dx', 0)
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .text(d => d.id)
        .attr('fill', d => d.isSelected ? 'red' : 'black'); // Change text color to red for selected node

    // Tooltip
    let tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    node.on('mouseover', function(event, d) {
        let info = '';
        if (d.type === 'service') {
            let service = serviceMap[d.id];
            let team = currentSystemData.teams.find(t => t.teamId === service.owningTeamId);
            info = `<strong>Service Name:</strong> ${service.serviceName}<br>
                    <strong>Description:</strong> ${service.serviceDescription}<br>
                    <strong>Team:</strong> ${team ? `${team.teamName} (${team.teamIdentity})` : 'Unassigned'}`;
        } else if (d.type === 'platform') {
            info = `<strong>Platform Dependency:</strong> ${d.id}`;
        }
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        tooltip.html(info)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }).on('mouseout', function() {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    });

    // Update positions on each tick
    simulation.on('tick', () => {
        node
            .attr('cx', d => d.x = Math.max(radius, Math.min(width - radius, d.x)))
            .attr('cy', d => d.y = Math.max(radius, Math.min(height - radius, d.y)));
        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y - radius - 5);
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    });

    // Drag functions
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    // **Add links to the SVG after nodes are created**
    let link = svg.append('g')
        .attr('stroke', '#aaa')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-dasharray', d => {
            if (d.type === 'service-dependency') return '5,5';
            else if (d.type === 'platform-dependency') return '10,5';
            else return '1,0';
        })
        .attr('stroke-width', 2);

    // Add legend for teams
    let legendData = currentSystemData.teams.map(team => ({
        teamIdentity: team.teamIdentity,
        color: teamColorScale(team.teamId)
    }));

    let legend = d3.select('#serviceLegend').selectAll('.legend-item')
        .data(legendData)
        .enter().append('div')
        .attr('class', 'legend-item');

    legend.append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('background-color', d => d.color)
        .style('border-radius', '50%') // This makes it a circle
        .style('margin-right', '5px');

    legend.append('span')
        .text(d => d.teamIdentity);
}

//Create a function to populate the dropdown menu with available services.
function populateDependencyServiceSelection() {
    const serviceSelection = document.getElementById('dependencyServiceSelection');
    serviceSelection.innerHTML = ''; // Clear existing options

    // Add individual services
    currentSystemData.services.forEach(service => {
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
    const nodes = [];
    const links = [];
    const nodeMap = {};

    const serviceMap = {};
    currentSystemData.services.forEach(service => {
        serviceMap[service.serviceName] = service;
    });

    const queue = [];
    const visited = new Set();

    queue.push(serviceName);
    visited.add(serviceName);

    while (queue.length > 0) {
        const currentServiceName = queue.shift();
        const currentService = serviceMap[currentServiceName];

        if (!nodeMap[currentServiceName]) {
            nodes.push({ id: currentServiceName, type: 'service' });
            nodeMap[currentServiceName] = true;
        }

        // Process upstream dependencies
        currentService.serviceDependencies.forEach(depName => {
            if (!nodeMap[depName]) {
                nodes.push({ id: depName, type: 'service' });
                nodeMap[depName] = true;
            }
            // Edge from dependency to current service
            links.push({
                source: depName,
                target: currentServiceName,
                type: 'service-dependency',
            });
            if (!visited.has(depName)) {
                visited.add(depName);
                queue.push(depName);
            }
        });

        // Process platform dependencies
        if (currentService.platformDependencies) {
            currentService.platformDependencies.forEach(platform => {
                if (!nodeMap[platform]) {
                    nodes.push({ id: platform, type: 'platform' });
                    nodeMap[platform] = true;
                }
                // Edge from platform to current service
                links.push({
                    source: platform,
                    target: currentServiceName,
                    type: 'platform-dependency',
                });
            });
        }

        // Process downstream dependents
        currentSystemData.services.forEach(service => {
            if (service.serviceDependencies.includes(currentServiceName)) {
                const dependentName = service.serviceName;
                if (!nodeMap[dependentName]) {
                    nodes.push({ id: dependentName, type: 'service' });
                    nodeMap[dependentName] = true;
                }
                // Edge from current service to dependent
                links.push({
                    source: currentServiceName,
                    target: dependentName,
                    type: 'service-dependency',
                });
                if (!visited.has(dependentName)) {
                    visited.add(dependentName);
                    queue.push(dependentName);
                }
            }
        });
    }

    return { nodes, links };
}

//Create functions to build the data structure representing upstream and downstream dependencies.
function buildDependencyTree(serviceName) {
    const serviceMap = {};
    currentSystemData.services.forEach(service => {
        serviceMap[service.serviceName] = service;
    });

    // Recursive function to get upstream dependencies
    function getUpstream(service, visited = new Set()) {
        if (!service || visited.has(service.serviceName)) return null;
        visited.add(service.serviceName);

        let dependencies = [];
        service.serviceDependencies.forEach(depName => {
            const depService = serviceMap[depName];
            const upstreamNode = getUpstream(depService, visited);
            if (upstreamNode) {
                dependencies.push(upstreamNode);
            } else if (depService) {
                dependencies.push({ name: depService.serviceName, children: [] });
            }
        });

        return { name: service.serviceName, children: dependencies };
    }

    // Recursive function to get downstream dependencies
    function getDownstream(service, visited = new Set()) {
        if (!service || visited.has(service.serviceName)) return null;
        visited.add(service.serviceName);

        let dependents = [];
        currentSystemData.services.forEach(otherService => {
            if (otherService.serviceDependencies.includes(service.serviceName)) {
                const downstreamNode = getDownstream(otherService, visited);
                if (downstreamNode) {
                    dependents.push(downstreamNode);
                } else {
                    dependents.push({ name: otherService.serviceName, children: [] });
                }
            }
        });

        return { name: service.serviceName, children: dependents };
    }

    const rootService = serviceMap[serviceName];

    const upstreamTree = getUpstream(rootService);
    const downstreamTree = getDownstream(rootService);

    // Combine upstream and downstream trees
    const treeData = {
        name: rootService.serviceName,
        children: []
    };

    if (upstreamTree && upstreamTree.children.length > 0) {
        treeData.children.push({
            name: 'Upstream Dependencies',
            direction: 'upstream',
            children: upstreamTree.children
        });
    }

    if (downstreamTree && downstreamTree.children.length > 0) {
        treeData.children.push({
            name: 'Downstream Dependencies',
            direction: 'downstream',
            children: downstreamTree.children
        });
    }

    return treeData;
}

/**
 * REVISED (v3) - Generates the force-directed graph for service dependencies.
 * - Adds safeguard for SVG selection.
 * - Initializes link/node/label selections early to prevent ReferenceError in ticked.
 * - Draws legend INSIDE the main SVG element for cohesive layout.
 */
function generateDependencyForceVisualization(selectedServiceName) {
    console.log(`Generating Dependency Force Viz for: ${selectedServiceName}`); // Log entry

    const svg = d3.select('#dependencySvg');

    // --- SAFEGUARD ---
    if (!svg || svg.empty()) {
        console.error("generateDependencyForceVisualization: #dependencySvg element not found or is empty. Cannot generate visualization.");
        const containerDiv = document.getElementById('dependencyVisualization');
        if(containerDiv) {
            containerDiv.innerHTML = '<p style="color: red; text-align: center;">Error: Could not load dependency visualization.</p>';
        }
        return;
    }
    // --- END SAFEGUARD ---

    svg.selectAll('*').remove(); // Clear existing content

    // Get SVG dimensions
    const container = document.getElementById('dependencyVisualization');
    if (!container) {
        console.error("Container #dependencyVisualization not found for getting dimensions.");
        return;
    }
    const svgRect = container.getBoundingClientRect();
    const width = svgRect.width > 0 ? svgRect.width : 800;
    const height = parseInt(svg.style('height')) || 600;
    console.log(`generateDependencyForceVisualization calculated width: ${width}, height: ${height}`);

    // --- Initialize Selections Early ---
    const vizContainer = svg.append('g').attr('class', 'viz-container'); // Group for zoom/pan

    let link = vizContainer.append('g').attr('class', 'links').selectAll('line');
    let node = vizContainer.append('g').attr('class', 'nodes').selectAll('circle');
    let label = vizContainer.append('g').attr('class', 'labels').selectAll('text');
    // --- End Initialization ---

    const { nodes: graphNodes, links: graphLinks } = buildDependencyGraph(selectedServiceName);

    // Assign index to links
    graphLinks.forEach((link, index) => { link.index = index; });

    // Color scale
    const color = d3.scaleOrdinal()
        .domain(['service', 'platform'])
        .range(['#1f77b4', '#ff7f0e']);

    // --- Simulation Setup ---
    const simulation = d3.forceSimulation(graphNodes)
        .force('link', d3.forceLink(graphLinks).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(45))
        .on('tick', ticked);
    // --- End Simulation Setup ---

     // Define arrowheads
     const defs = svg.append('defs');
     defs.selectAll('marker')
        .data(['service-dependency', 'platform-dependency'])
        .join('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 19)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
        .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

    // --- Data Binding and Element Creation ---
    link = link
        .data(graphLinks, d => `${d.source.id}-${d.target.id}`)
        .join('line')
            .attr('stroke-width', 2)
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-dasharray', d => d.type === 'platform-dependency' ? '5,5' : '0');

    node = node
        .data(graphNodes, d => d.id)
        .join('circle')
            .attr('r', d => d.id === selectedServiceName ? 15 : 10)
            .attr('fill', d => d.id === selectedServiceName ? 'red' : color(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', d => d.id === selectedServiceName ? 3 : 1.5)
            .call(drag(simulation))
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut);

    label = label
        .data(graphNodes, d => d.id)
        .join('text')
            .attr('dy', -15)
            .attr('text-anchor', 'middle')
            .text(d => d.id)
            .attr('font-size', '10px')
            .style('pointer-events', 'none') // Prevent labels interfering with node hover
            .attr('font-weight', d => d.id === selectedServiceName ? 'bold' : 'normal')
            .attr('fill', d => d.id === selectedServiceName ? 'red' : 'black');
    // --- End Data Binding ---

    // --- Zoom Setup ---
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            vizContainer.attr('transform', event.transform);
        });
    svg.call(zoom);
    // --- End Zoom Setup ---

    // Tooltip Element
    const tooltip = d3.select('body').selectAll('.tooltip').data([null]).join('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Highlight State
    let highlightedNodes = new Set();
    let highlightedLinks = new Set();

    // --- Event Handlers ---
    function handleMouseOver(event, d) {
        // Tooltip Logic (same as before)
        let info = '';
        if (d.type === 'service') {
            const service = currentSystemData.services.find(s => s.serviceName === d.id);
            if (service) {
                const upstreams = service.serviceDependencies || [];
                const downstreams = currentSystemData.services.filter(s => (s.serviceDependencies || []).includes(d.id)).map(s => s.serviceName);
                const platformDeps = service.platformDependencies || [];
                info = `<strong>Service:</strong> ${d.id}<br>`;
                info += `<strong>Upstream:</strong> ${upstreams.length > 0 ? upstreams.join(', ') : 'None'}<br>`;
                info += `<strong>Downstream:</strong> ${downstreams.length > 0 ? downstreams.join(', ') : 'None'}<br>`;
                info += `<strong>Platform Deps:</strong> ${platformDeps.length > 0 ? platformDeps.join(', ') : 'None'}`;
            }
        } else if (d.type === 'platform') {
            info = `<strong>Platform:</strong> ${d.id}`;
        }
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(info)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');

        // Highlight Logic (same as before)
        highlightedNodes.clear();
        highlightedLinks.clear();
        highlightedNodes.add(d.id);
        graphLinks.forEach(link => {
            if (link.source.id === d.id) { highlightedNodes.add(link.target.id); highlightedLinks.add(link.index); }
            if (link.target.id === d.id) { highlightedNodes.add(link.source.id); highlightedLinks.add(link.index); }
        });
        node.style('opacity', n => highlightedNodes.has(n.id) ? 1 : 0.1);
        label.style('opacity', n => highlightedNodes.has(n.id) ? 1 : 0.1);
        link.style('opacity', l => highlightedLinks.has(l.index) ? 0.9 : 0.1).attr('stroke', l => highlightedLinks.has(l.index) ? '#555' : '#999'); // Make highlighted links darker
    }

    function handleMouseOut() {
        tooltip.transition().duration(500).style('opacity', 0);
        // Remove highlights
        node.style('opacity', 1);
        label.style('opacity', 1);
        link.style('opacity', 0.6).attr('stroke', '#999'); // Restore default opacity and color
        highlightedNodes.clear();
        highlightedLinks.clear();
    }
    // --- End Event Handlers ---

    // --- Ticked Function ---
    function ticked() {
         if (link.empty() || node.empty() || label.empty()) return; // Safeguard

        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node
            .attr('cx', d => d.x = Math.max(15, Math.min(width - 15, d.x))) // Adjust radius for boundary
            .attr('cy', d => d.y = Math.max(15, Math.min(height - 15, d.y)));
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y - (d.id === selectedServiceName ? 20 : 15)); // Adjust label position slightly more for selected
    }
    // --- End Ticked Function ---

    // --- Drag Functions ---
    function drag(simulation) {
        function dragstarted(event, d) {
            if(event.sourceEvent) event.sourceEvent.stopPropagation(); // Prevent interference
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }
        return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
    }
    // --- End Drag Functions ---

    // --- Legend (REVISED: Append to SVG) ---
    // Remove the old selection of the external div:
    // const legendContainer = d3.select('#dependencyLegend'); // <-- REMOVE THIS LINE

    // Create the legend group INSIDE the main SVG
    const legend = svg.append('g')
        .attr('class', 'dependency-legend-svg') // Use a class specific to SVG legend if needed
        .attr('transform', `translate(20, 20)`); // Position the legend (e.g., top-left)

    const legendItemsData = [
        { label: 'Selected Service', color: 'red', shape: 'circle' },
        { label: 'Other Service', color: color('service'), shape: 'circle' },
        { label: 'Platform', color: color('platform'), shape: 'circle' },
        { label: 'Service Dependency', color: '#999', type: 'line', marker: 'arrow-service-dependency', dash: '0' },
        { label: 'Platform Dependency', color: '#999', type: 'line', marker: 'arrow-platform-dependency', dash: '5,5' }
    ];

    // Append legend items to the SVG group
    legendItemsData.forEach((item, index) => {
        const legendItem = legend.append('g')
            .attr('transform', `translate(0, ${index * 20})`); // Vertical spacing

        if (item.shape === 'circle') {
            legendItem.append('circle')
                .attr('r', 6)
                .attr('cx', 0) // Center the circle at the start of the item
                .attr('cy', 0)
                .attr('fill', item.color)
                .attr('stroke', item.label === 'Selected Service' ? '#fff' : '#ccc') // Outline
                .attr('stroke-width', item.label === 'Selected Service' ? 2 : 1);
            legendItem.append('text')
                .attr('x', 15) // Text starts after the circle
                .attr('y', 4) // Vertically align text
                .text(item.label)
                .style('font-size', '11px');
        } else if (item.type === 'line') {
            legendItem.append('line')
                .attr('x1', -5) // Start line slightly left
                .attr('y1', 0)
                .attr('x2', 15) // End line before text
                .attr('y2', 0)
                .attr('stroke', item.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', item.dash)
                .attr('marker-end', `url(#${item.marker})`); // Use marker from main defs
            legendItem.append('text')
                .attr('x', 25) // Text starts after the line
                .attr('y', 4) // Vertically align text
                .text(item.label)
                .style('font-size', '11px');
        }
    });
    // --- End Legend ---

    console.log("Finished generating dependency visualization.");
} // --- End generateDependencyForceVisualization ---

//Create a function to update the visualization when a new service is selected.
function updateDependencyVisualization() {
    const selectedServiceName = document.getElementById('dependencyServiceSelection').value;
    // Ensure the service selection is populated with the latest data
    populateDependencyServiceSelection();
    generateDependencyForceVisualization(selectedServiceName); //forced dependency works best
}

//Create a function to add the legend to the SVG.
//Legend Items: The legend displays the meanings of node colors, shapes, and edge styles.
//Arrowhead Definition: An arrowhead is defined for use in the legend.
function addDependencyLegend(svg) {
    const legendData = [
        { label: 'Selected Service', color: 'red', shape: 'rect' },
        { label: 'Service', color: '#1f77b4', shape: 'rect' },
        { label: 'Platform', color: '#ff7f0e', shape: 'rect' },
        { label: 'Service Dependency', style: 'stroke: #333; stroke-width: 2px;', arrowhead: true },
        { label: 'Platform Dependency', style: 'stroke: #333; stroke-width: 2px; stroke-dasharray: 5,5;', arrowhead: true },
    ];

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(20, 20)');

    legendData.forEach((item, index) => {
        const legendItem = legend.append('g')
            .attr('transform', `translate(0, ${index * 25})`);

        if (item.shape === 'rect') {
            legendItem.append('rect')
                .attr('x', 0)
                .attr('y', -10)
                .attr('width', 20)
                .attr('height', 20)
                .attr('style', `fill: ${item.color}; stroke: #fff; stroke-width: 1.5px;`);
        } else {
            // Draw line
            const line = legendItem.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 20)
                .attr('y2', 0)
                .attr('style', item.style);

            if (item.arrowhead) {
                line.attr('marker-end', 'url(#arrowhead)');
            }
        }

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 5)
            .text(item.label)
            .attr('text-anchor', 'start')
            .attr('font-size', '12px');
    });

    // Define arrowhead for legend lines
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#333');
}

function generateServiceDependenciesTable() {
    const tbody = document.querySelector('#serviceDependenciesTable tbody');
    tbody.innerHTML = ''; // Clear existing content

    currentSystemData.services.forEach(service => {
        const row = document.createElement('tr');

        // Service Name
        const nameCell = document.createElement('td');
        nameCell.textContent = service.serviceName;
        row.appendChild(nameCell);

        // Description
        const descCell = document.createElement('td');
        descCell.textContent = service.serviceDescription;
        row.appendChild(descCell);

        // Owning Team
        const team = currentSystemData.teams.find(t => t.teamId === service.owningTeamId);
        const teamCell = document.createElement('td');
        teamCell.textContent = team ? (team.teamIdentity || team.teamName) : 'Unassigned';
        row.appendChild(teamCell);

        // Upstream Dependencies (Services Depended On)
        const upstreamServices = service.serviceDependencies;
        const upstreamCell = document.createElement('td');
        upstreamCell.textContent = upstreamServices.length > 0 ? upstreamServices.join(', ') : 'None';
        row.appendChild(upstreamCell);

        // Platform Dependencies
        const platformDependencies = service.platformDependencies || [];
        const platformCell = document.createElement('td');
        platformCell.textContent = platformDependencies.length > 0 ? platformDependencies.join(', ') : 'None';
        row.appendChild(platformCell);

        // Downstream Dependencies (Services That Depend On This Service)
        const downstreamServices = currentSystemData.services
            .filter(s => s.serviceDependencies.includes(service.serviceName))
            .map(s => s.serviceName);
        const downstreamCell = document.createElement('td');
        downstreamCell.textContent = downstreamServices.length > 0 ? downstreamServices.join(', ') : 'None';
        row.appendChild(downstreamCell);

        tbody.appendChild(row);
    });
}

