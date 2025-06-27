// js/impactView.js

/**
 * Initializes the Enhanced Initiative Impact Visualization widget.
 * This is the main entry point called by the dashboard.
 * It now includes view modes for Initiative, Team, and Service.
 */
function initializeImpactView() {
    const container = document.getElementById('initiativeImpactWidget');
    if (!container) {
        console.error("Initiative Impact Widget container not found.");
        return;
    }
    container.innerHTML = ''; // Clear previous content

    const controlsContainer = document.createElement('div');
    controlsContainer.style.padding = '10px';
    controlsContainer.style.borderBottom = '1px solid #eee';
    controlsContainer.style.marginBottom = '10px';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'center';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.gap = '20px';

    const svgContainer = document.createElement('div');
    svgContainer.id = 'impact-graph-container';

    // Append controls first, then the SVG container
    container.appendChild(controlsContainer);
    container.appendChild(svgContainer);

    const svg = d3.select(svgContainer).append("svg")
        .attr("width", "100%")
        .attr("height", "700px");

    // --- Create UI Controls ---
    const modeLabel = document.createElement('label');
    modeLabel.textContent = "View By:";
    modeLabel.style.fontWeight = 'bold';

    const modeSelect = document.createElement('select');
    modeSelect.id = 'impact-view-mode-selector';
    modeSelect.innerHTML = `
        <option value="initiative">Initiative</option>
        <option value="team">Team</option>
        <option value="service">Service</option>
    `;
    modeSelect.style.padding = '5px';

    const dynamicSelectContainer = document.createElement('div');
    dynamicSelectContainer.id = 'impact-dynamic-select-container';

    controlsContainer.appendChild(modeLabel);
    controlsContainer.appendChild(modeSelect);
    controlsContainer.appendChild(dynamicSelectContainer);

    // --- Initial population and event listener ---
    updateDynamicSelector(svg);
    modeSelect.addEventListener('change', () => updateDynamicSelector(svg));
}

/**
 * Updates the second dropdown based on the selected view mode and triggers the graph render.
 * @param {d3.Selection} svg - The D3 selection for the SVG element.
 */
function updateDynamicSelector(svg) {
    const mode = document.getElementById('impact-view-mode-selector').value;
    const container = document.getElementById('impact-dynamic-select-container');
    container.innerHTML = '';

    const select = document.createElement('select');
    select.id = 'impact-item-selector';
    select.style.padding = '5px';
    select.style.minWidth = '300px';
    container.appendChild(select);

    let items = [];
    let renderFunc;
    let noItemsText = "No items found.";

    switch (mode) {
        case 'initiative':
            items = (currentSystemData.yearlyInitiatives || []).sort((a, b) => a.title.localeCompare(b.title));
            items.forEach(item => select.appendChild(new Option(item.title, item.initiativeId)));
            renderFunc = generateInitiativeImpactGraph;
            noItemsText = "No initiatives found.";
            break;
        case 'team':
            items = (currentSystemData.teams || []).sort((a,b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName));
            items.forEach(item => select.appendChild(new Option(item.teamIdentity || item.teamName, item.teamId)));
            renderFunc = generateTeamImpactGraph;
            noItemsText = "No teams found.";
            break;
        case 'service':
            items = (currentSystemData.services || []).sort((a,b) => a.serviceName.localeCompare(b.serviceName));
            items.forEach(item => select.appendChild(new Option(item.serviceName, item.serviceName)));
            renderFunc = generateServiceImpactGraph;
            noItemsText = "No services found.";
            break;
    }

    select.onchange = (e) => renderFunc(e.target.value, svg);

    if (items.length > 0) {
        renderFunc(select.value, svg);
    } else {
        svg.selectAll("*").remove();
        svg.append("text").attr("x", "50%").attr("y", "50%").attr("text-anchor", "middle").text(noItemsText);
    }
}

/**
 * Prepares node and link data for an INITIATIVE-centric view.
 * @param {string} selectedInitiativeId - The ID of the initiative to visualize.
 */
function generateInitiativeImpactGraph(selectedInitiativeId, svg) {
    const initiative = currentSystemData.yearlyInitiatives.find(i => i.initiativeId === selectedInitiativeId);
    if (!initiative) return;

    const nodes = [], links = [], nodeMap = new Map();
    const addNode = (node) => { if (!nodeMap.has(node.id)) { nodeMap.set(node.id, node); nodes.push(node); } };

    addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });

    (initiative.assignments || []).forEach(assignment => {
        const team = currentSystemData.teams.find(t => t.teamId === assignment.teamId);
        if (team) {
            addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
            links.push({ source: initiative.initiativeId, target: team.teamId, type: 'assignment', sde: assignment.sdeYears });
        }
    });

    const serviceQueue = [...(initiative.impactedServiceIds || [])];
    const processedServices = new Set(serviceQueue);

    while (serviceQueue.length > 0) {
        const serviceName = serviceQueue.shift();
        const service = currentSystemData.services.find(s => s.serviceName === serviceName);
        if (!service) continue;

        addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });
        if (initiative.impactedServiceIds.includes(serviceName)) {
             links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });
        }

        if (service.owningTeamId) {
            const team = currentSystemData.teams.find(t => t.teamId === service.owningTeamId);
            if (team) {
                addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                links.push({ source: team.teamId, target: service.serviceName, type: 'owns' });
            }
        }

        (service.serviceDependencies || []).forEach(depName => {
            const depService = currentSystemData.services.find(s => s.serviceName === depName);
            if(depService) {
                addNode({ id: depName, name: depName, type: 'Service', data: depService });
                links.push({ source: service.serviceName, target: depName, type: 'depends_on' });
                if (!processedServices.has(depName)) {
                    processedServices.add(depName);
                    serviceQueue.push(depName);
                }
            }
        });
    }
    renderImpactGraph(svg, nodes, links);
}

/**
 * Prepares node and link data for a TEAM-centric view.
 * @param {string} selectedTeamId - The ID of the team to visualize.
 */
function generateTeamImpactGraph(selectedTeamId, svg) {
    const team = currentSystemData.teams.find(t => t.teamId === selectedTeamId);
    if (!team) return;

    const nodes = [], links = [], nodeMap = new Map();
    const addNode = (node) => { if (!nodeMap.has(node.id)) { nodeMap.set(node.id, node); nodes.push(node); } };
    
    addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });

    const assignedInitiatives = currentSystemData.yearlyInitiatives.filter(
        init => (init.assignments || []).some(a => a.teamId === selectedTeamId)
    );

    assignedInitiatives.forEach(initiative => {
        addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
        const assignment = initiative.assignments.find(a => a.teamId === selectedTeamId);
        links.push({ source: team.teamId, target: initiative.initiativeId, type: 'assignment', sde: assignment.sdeYears });

        (initiative.assignments || []).forEach(ass => {
            if (ass.teamId !== selectedTeamId) {
                const otherTeam = currentSystemData.teams.find(t => t.teamId === ass.teamId);
                if(otherTeam) {
                    addNode({ id: otherTeam.teamId, name: otherTeam.teamIdentity || otherTeam.teamName, type: 'Team', data: otherTeam });
                    links.push({ source: initiative.initiativeId, target: otherTeam.teamId, type: 'assignment', sde: ass.sdeYears });
                }
            }
        });

        (initiative.impactedServiceIds || []).forEach(serviceName => {
            const service = currentSystemData.services.find(s => s.serviceName === serviceName);
            if(service) {
                addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });
                links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });
            }
        });
    });

    renderImpactGraph(svg, nodes, links);
}

/**
 * NEW: Prepares node and link data for a SERVICE-centric view.
 * @param {string} selectedServiceName - The name of the service to visualize.
 */
function generateServiceImpactGraph(selectedServiceName, svg) {
    const service = currentSystemData.services.find(s => s.serviceName === selectedServiceName);
    if (!service) return;

    const nodes = [], links = [], nodeMap = new Map();
    const addNode = (node) => { if (!nodeMap.has(node.id)) { nodeMap.set(node.id, node); nodes.push(node); } };

    // 1. Central service node
    addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });

    // 2. Owning team
    if (service.owningTeamId) {
        const team = currentSystemData.teams.find(t => t.teamId === service.owningTeamId);
        if (team) {
            addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
            links.push({ source: team.teamId, target: service.serviceName, type: 'owns' });
        }
    }

    // 3. Find all initiatives impacting this service
    const impactingInitiatives = currentSystemData.yearlyInitiatives.filter(
        init => (init.impactedServiceIds || []).includes(selectedServiceName)
    );

    impactingInitiatives.forEach(initiative => {
        addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
        links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });

        // Show all teams assigned to each of those initiatives
        (initiative.assignments || []).forEach(assignment => {
            const team = currentSystemData.teams.find(t => t.teamId === assignment.teamId);
            if (team) {
                addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                links.push({ source: initiative.initiativeId, target: team.teamId, type: 'assignment', sde: assignment.sdeYears });
            }
        });
    });

    renderImpactGraph(svg, nodes, links);
}


/**
 * Shared, enhanced rendering logic for the force-directed graph.
 * @param {d3.Selection} svg - The D3 selection for the SVG element.
 * @param {Array} nodes - Array of node objects.
 * @param {Array} links - Array of link objects.
 */
function renderImpactGraph(svg, nodes, links) {
    svg.selectAll("*").remove();
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    
    const tooltip = d3.select("body").selectAll(".tooltip").data([null]).join("div").attr("class", "tooltip").style("opacity", 0);

    // Calculate impact scores for sizing nodes
    const serviceImpactCount = new Map();
    links.forEach(link => {
        if (link.type === 'impact') {
            serviceImpactCount.set(link.target.id, (serviceImpactCount.get(link.target.id) || 0) + 1);
        }
    });

    const initiativeStatusColors = { "Backlog": "#6c757d", "Defined": "#17a2b8", "Committed": "#007bff", "In Progress": "#ffc107", "Completed": "#28a745" };
    const nodeTypeColors = d3.scaleOrdinal(d3.schemeCategory10).domain(['Team', 'Service']).range(['#1f77b4', '#2ca02c']);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === 'owns' ? 80 : 150).strength(0.6))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => (d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 5 + 20) + 10));

    // Arrowheads
    svg.append('defs').selectAll('marker')
        .data(['depends_on', 'owns', 'impact', 'assignment'])
        .enter().append('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', d => d === 'owns' ? 28 : 22)
        .attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#999');

    // Links (Paths)
    const link = svg.append("g").selectAll("path").data(links).join("path")
        .attr("stroke", "#999").attr("stroke-opacity", 0.7)
        .attr("stroke-width", d => Math.max(1, (d.sde || 0.5) * 2)) // Weighted links
        .attr('marker-end', d => `url(#arrow-${d.type})`)
        .style("stroke-dasharray", d => d.type === 'owns' ? "3, 3" : "0");

    // Nodes (Circles)
    const node = svg.append("g").selectAll("circle").data(nodes).join("circle")
        .attr("r", d => d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 4 + 18) // Dynamic sizing for services
        .attr("fill", d => d.type === 'Initiative' ? (initiativeStatusColors[d.data.status] || '#ff7f0e') : nodeTypeColors(d.type))
        .attr("stroke", "#fff").attr("stroke-width", 2)
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended))
        .on("mouseover", (event, d) => tooltip.transition().duration(200).style("opacity", .9))
        .on("mousemove", (event, d) => {
            let content = `<strong>${d.type}:</strong> ${d.name}`;
            if (d.type === 'Initiative') content += `<br>Status: ${d.data.status || 'N/A'}`;
            if (d.type === 'Service') content += `<br>Owner: ${currentSystemData.services.find(s=>s.serviceName===d.id)?.owningTeamId || 'N/A'}`;
            if (d.type === 'Team') content += `<br>SDM: ${currentSystemData.teams.find(t=>t.teamId===d.id)?.sdmId || 'N/A'}`;
            tooltip.html(content).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    // Labels (Text)
    const label = svg.append("g").selectAll("text").data(nodes).join("text")
        .attr("text-anchor", "middle").attr("dy", ".35em").style("font-size", "10px").style("pointer-events", "none")
        .text(d => d.name);

    function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

    simulation.on("tick", () => {
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
        link.attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
    });
}