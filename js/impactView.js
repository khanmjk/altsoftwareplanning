// js/impactView.js

/**
 * Initializes the Enhanced Initiative Impact Visualization widget.
 * This is the main entry point called by the dashboard.
 * It now includes view modes for Initiative, Team, and Service.
 */
/**
 * Initializes the Enhanced Initiative Impact Visualization widget.
 * This is the main entry point called by the dashboard.
 * It now includes view modes for Initiative, Team, and Service.
 * Returns the toolbar element for placement in the Global Header.
 */
function initializeImpactView() {
    const container = document.getElementById('initiativeImpactWidget');
    if (!container) {
        console.error("Initiative Impact Widget container not found.");
        return null;
    }
    container.innerHTML = ''; // Clear previous content

    const svgContainer = document.createElement('div');
    svgContainer.id = 'impact-graph-container';
    container.appendChild(svgContainer);

    const svg = d3.select(svgContainer).append("svg")
        .attr("width", "100%")
        .attr("height", "650px");

    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'impact-summary-container';
    summaryContainer.style.display = 'none'; // Initially hidden (behavior, not styling)
    container.appendChild(summaryContainer);

    // Create and return toolbar
    return createImpactViewToolbar(svg);
}

/**
 * Creates the toolbar controls for the Impact View.
 */
function createImpactViewToolbar(svg) {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.gap = '15px';

    // --- Create UI Controls ---
    const modeLabel = document.createElement('label');
    modeLabel.textContent = "View By:";
    modeLabel.style.fontWeight = '600';
    modeLabel.style.marginBottom = '0';

    const modeSelect = document.createElement('select');
    modeSelect.id = 'impact-view-mode-selector';
    modeSelect.className = 'form-select form-select-sm';
    modeSelect.style.width = 'auto';
    modeSelect.innerHTML = `
        <option value="initiative">Initiative</option>
        <option value="team">Team</option>
        <option value="service">Service</option>
    `;

    const dynamicSelectContainer = document.createElement('div');
    dynamicSelectContainer.id = 'impact-dynamic-select-container';

    controlsContainer.appendChild(modeLabel);
    controlsContainer.appendChild(modeSelect);
    controlsContainer.appendChild(dynamicSelectContainer);

    // --- Initial population and event listener ---
    // FIXED: Pass elements directly instead of using getElementById
    if (window.currentSystemData) {
        updateDynamicSelector(svg, modeSelect, dynamicSelectContainer);
        modeSelect.addEventListener('change', () => updateDynamicSelector(svg, modeSelect, dynamicSelectContainer));
    }

    return controlsContainer;
}

/**
 * Updates the second dropdown based on the selected view mode and triggers the graph render.
 * @param {d3.Selection} svg - The D3 selection for the SVG element.
 * @param {HTMLElement} modeSelectEl - The mode selector element.
 * @param {HTMLElement} containerEl - The dynamic select container element.
 */
function updateDynamicSelector(svg, modeSelectEl, containerEl) {
    // FIXED: Use passed elements instead of getElementById
    const mode = modeSelectEl.value;
    containerEl.innerHTML = '';

    const select = document.createElement('select');
    select.id = 'impact-item-selector';
    select.className = 'form-select form-select-sm';
    select.style.minWidth = '250px';
    containerEl.appendChild(select);

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
            items = (currentSystemData.teams || []).sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName));
            select.appendChild(new Option('All Teams', 'all'));
            items.forEach(item => select.appendChild(new Option(item.teamIdentity || item.teamName, item.teamId)));
            renderFunc = generateTeamImpactGraph;
            noItemsText = "No teams found.";
            break;
        case 'service':
            items = (currentSystemData.services || []).sort((a, b) => a.serviceName.localeCompare(b.serviceName));
            items.forEach(item => select.appendChild(new Option(item.serviceName, item.serviceName)));
            renderFunc = generateServiceImpactGraph;
            noItemsText = "No services found.";
            break;
    }

    select.onchange = (e) => renderFunc(e.target.value, svg);

    if (select.options.length > 0) {
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
            if (depService) {
                addNode({ id: depName, name: depName, type: 'Service', data: depService });
                links.push({ source: service.serviceName, target: depName, type: 'depends_on' });
                if (!processedServices.has(depName)) {
                    processedServices.add(depName);
                    serviceQueue.push(depName);
                }
            }
        });
    }
    renderImpactGraph(svg, nodes, links, selectedInitiativeId);
}

/**
 * Prepares node and link data for a TEAM-centric view.
 * @param {string} selectedTeamId - The ID of the team to visualize.
 */
function generateTeamImpactGraph(selectedTeamId, svg) {
    if (selectedTeamId === 'all') {
        generateAllTeamsImpactGraph(svg);
        return;
    }

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
                if (otherTeam) {
                    addNode({ id: otherTeam.teamId, name: otherTeam.teamIdentity || otherTeam.teamName, type: 'Team', data: otherTeam });
                    links.push({ source: initiative.initiativeId, target: otherTeam.teamId, type: 'assignment', sde: ass.sdeYears });
                }
            }
        });

        (initiative.impactedServiceIds || []).forEach(serviceName => {
            const service = currentSystemData.services.find(s => s.serviceName === serviceName);
            if (service) {
                addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });
                links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });
            }
        });
    });

    renderImpactGraph(svg, nodes, links, selectedTeamId);
}

/**
 * Generates a graph showing all teams and their initiatives.
 * @param {d3.Selection} svg - The D3 selection for the SVG element.
 */
function generateAllTeamsImpactGraph(svg) {
    const nodes = [], links = [], nodeMap = new Map();
    const addNode = (node) => { if (!nodeMap.has(node.id)) { nodeMap.set(node.id, node); nodes.push(node); } };

    currentSystemData.teams.forEach(team => {
        addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
    });

    currentSystemData.yearlyInitiatives.forEach(initiative => {
        addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
        (initiative.assignments || []).forEach(assignment => {
            links.push({ source: initiative.initiativeId, target: assignment.teamId, type: 'assignment', sde: assignment.sdeYears });
        });
    });

    renderImpactGraph(svg, nodes, links, null); // No specific node is selected
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

    renderImpactGraph(svg, nodes, links, selectedServiceName);
}


/**
 * Shared, enhanced rendering logic for the force-directed graph.
 * @param {d3.Selection} svg - The D3 selection for the SVG element.
 * @param {Array} nodes - Array of node objects.
 * @param {Array} links - Array of link objects.
 */
function renderImpactGraph(svg, nodes, links, selectedId) {
    svg.selectAll("*").remove();
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    const tooltip = d3.select("body").selectAll(".tooltip").data([null]).join("div").attr("class", "tooltip").style("opacity", 0);

    const teamColors = d3.scaleOrdinal(d3.schemeCategory10).domain(currentSystemData.teams.map(t => t.teamId));
    const serviceImpactCount = new Map();
    links.forEach(link => {
        if (link.type === 'impact') {
            serviceImpactCount.set(link.target.id, (serviceImpactCount.get(link.target.id) || 0) + 1);
        }
    });
    const initiativeStatusColors = { "Backlog": "#6c757d", "Defined": "#17a2b8", "Committed": "#007bff", "In Progress": "#ffc107", "Completed": "#28a745" };

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === 'owns' ? 80 : 150).strength(0.6))
        .force("charge", d3.forceManyBody().strength(-800))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => (d.type === 'Team' ? 40 : (d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 5 + 20)) + 10));

    svg.append('defs').selectAll('marker')
        .data(['depends_on', 'owns', 'impact', 'assignment'])
        .enter().append('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#999');

    const link = svg.append("g").selectAll("path").data(links).join("path")
        .attr("stroke", "#999").attr("stroke-opacity", 0.7)
        .attr("stroke-width", d => Math.max(1, (d.sde || 0.5) * 2))
        .attr('marker-end', d => `url(#arrow-${d.type})`)
        .style("stroke-dasharray", d => d.type === 'owns' ? "3, 3" : "0")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            let content = `<strong>${d.type.replace('_', ' ')}</strong>`;
            if (d.sde) content += `<br>SDE Years: ${d.sde}`;
            tooltip.html(content).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

    const nodeGroup = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    nodeGroup.append("circle")
        .attr("r", d => d.type === 'Team' ? 35 : (d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 4 + 18))
        .attr("fill", d => {
            if (d.type === 'Initiative') return initiativeStatusColors[d.data.status] || '#ff7f0e';
            if (d.type === 'Team') return teamColors(d.id);
            if (d.type === 'Service') {
                const owningTeam = currentSystemData.teams.find(t => t.teamId === d.data.owningTeamId);
                return owningTeam ? d3.color(teamColors(owningTeam.teamId)).brighter(0.5) : '#2ca02c';
            }
            return '#ccc';
        })
        .attr("stroke", d => d.id === selectedId ? 'red' : '#fff')
        .attr("stroke-width", d => d.id === selectedId ? 4 : 2);

    nodeGroup.on("mouseover", (event, d) => tooltip.transition().duration(200).style("opacity", .9))
        .on("mousemove", (event, d) => {
            let content = `<strong>${d.type}:</strong> ${d.name}`;
            if (d.type === 'Initiative') {
                const sdmName = d.data.owner.name || 'N/A';
                const teamsImpacted = (d.data.assignments || []).map(a => currentSystemData.teams.find(t => t.teamId === a.teamId)?.teamIdentity || a.teamId).join(' / ');
                const estimates = (d.data.assignments || []).map(a => `${currentSystemData.teams.find(t => t.teamId === a.teamId)?.teamIdentity}: ${a.sdeYears}`).join(', ');
                content += `<br>Owner: ${sdmName}<br>Due: ${d.data.targetDueDate || 'N/A'}<br>Teams: ${teamsImpacted}<br>Estimates: ${estimates}`;
            } else if (d.type === 'Service') {
                const ownerTeam = currentSystemData.teams.find(t => t.teamId === d.data.owningTeamId);
                content += `<br>Owner: ${ownerTeam?.teamIdentity || 'N/A'}<br>Description: ${d.data.serviceDescription || ''}`;
            } else if (d.type === 'Team') {
                const sdm = currentSystemData.sdms.find(s => s.sdmId === d.data.sdmId);
                content += `<br>SDM: ${sdm?.sdmName || 'N/A'}`;
            }
            tooltip.html(content).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    nodeGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-size", "10px")
        .style("pointer-events", "none")
        .text(d => d.name)
        .call(wrap, d => d.type === 'Team' ? 60 : 50);

    simulation.on("tick", () => {
        link.attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    const summaryContainer = document.getElementById('impact-summary-container');
    if (selectedId && nodes.some(n => n.id === selectedId && n.type === 'Initiative')) {
        const initiative = nodes.find(n => n.id === selectedId).data;
        summaryContainer.style.display = 'block';
        summaryContainer.innerHTML = generateInitiativeSummary(initiative);
    } else {
        summaryContainer.style.display = 'none';
    }

    // Dynamic Legend
    const legendGroup = svg.append("g").attr("class", "legend").attr("transform", "translate(20, 20)");
    const legendData = [];
    const uniqueStatuses = [...new Set(nodes.filter(n => n.type === 'Initiative').map(n => n.data.status))].sort();
    if (uniqueStatuses.length > 0) {
        legendData.push({ label: 'Initiative Statuses', type: 'header' });
        uniqueStatuses.forEach(status => {
            legendData.push({ label: status || 'N/A', color: initiativeStatusColors[status] || '#ff7f0e', type: 'item' });
        });
    }

    const teamsInView = nodes.filter(n => n.type === 'Team');
    if (teamsInView.length > 0 && teamsInView.length < 10) { // Only show team legend if there are a manageable number
        legendData.push({ label: 'Teams', type: 'header' });
        teamsInView.forEach(teamNode => {
            legendData.push({ label: teamNode.name, color: teamColors(teamNode.id), type: 'item' });
        });
    }

    if (nodes.some(n => n.type === 'Service')) {
        legendData.push({ label: 'Services', type: 'header' });
        legendData.push({ label: 'Color derived from owning team', color: '#aaa', type: 'item' });
    }

    let yOffset = 0;
    const legendItems = legendGroup.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            const transform = `translate(0, ${yOffset})`;
            yOffset += d.type === 'header' ? 25 : 20;
            return transform;
        });

    legendItems.filter(d => d.type === 'header')
        .append('text')
        .attr('x', 0)
        .attr('y', 10)
        .style('font-weight', 'bold')
        .style('font-size', '12px')
        .text(d => d.label);

    const itemGroups = legendItems.filter(d => d.type === 'item');

    itemGroups.append('circle')
        .attr('cx', 5)
        .attr('cy', 5)
        .attr('r', 5)
        .style('fill', d => d.color);

    itemGroups.append('text')
        .attr('x', 15)
        .attr('y', 9)
        .style('font-size', '11px')
        .text(d => d.label);
}

/**
 * Generates a descriptive summary for an initiative.
 * @param {object} initiative - The initiative data object.
 * @returns {string} - An HTML string representing the summary.
 */
function generateInitiativeSummary(initiative) {
    const ownerName = initiative.owner.name || 'N/A';
    const teamsImpacted = (initiative.assignments || []).map(a => {
        const team = currentSystemData.teams.find(t => t.teamId === a.teamId);
        return `${team?.teamIdentity || a.teamId}: ${a.sdeYears} SDE-Years`;
    }).join(' • ');

    return `
        <div class="initiative-summary">
            <h4>${initiative.title}</h4>
            <div class="initiative-summary-meta">
                <strong>Owner:</strong> ${ownerName} • 
                <strong>Status:</strong> ${initiative.status || 'N/A'} • 
                <strong>Due:</strong> ${initiative.targetDueDate || 'N/A'}
            </div>
            <div class="initiative-summary-description"><strong>Description:</strong> ${initiative.description || 'No description provided.'}</div>
            <div class="initiative-summary-teams"><strong>Teams & Estimates:</strong> ${teamsImpacted || 'None'}</div>
        </div>
    `;
}

/**
 * Wraps long text labels into multiple lines.
 * @param {d3.Selection} text - The D3 selection of text elements.
 * @param {number} width - The maximum width for the text.
 */
function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            dy = parseFloat(text.attr("dy") || 0),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}
