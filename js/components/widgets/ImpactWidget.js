/**
 * ImpactWidget Component
 * 
 * Displays Initiative Impact force-directed graph visualization within DashboardView.
 * Refactored from impactView.js to use class-based pattern.
 * 
 * Note: This widget uses D3.js for force-directed graph visualization.
 * The core visualization logic is preserved from the original implementation.
 */
class ImpactWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.svg = null;
        this.tooltip = null;
        this.modeSelect = null;
        this.dynamicSelectContainer = null;
    }

    /**
     * Render the widget and return toolbar element
     * @returns {HTMLElement} Toolbar element for placement in dashboard header
     */
    render() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('ImpactWidget: Container not found:', this.containerId);
            return null;
        }

        this._clearElement(this.container);

        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.id = 'impact-graph-container';
        this.container.appendChild(svgContainer);

        // Use D3Service for SVG creation
        this.svg = D3Service.select(svgContainer).append('svg')
            .attr('width', '100%')
            .attr('height', '800px');

        // Create summary container
        const summaryContainer = document.createElement('div');
        summaryContainer.id = 'impact-summary-container';
        summaryContainer.className = 'is-hidden';
        this.container.appendChild(summaryContainer);

        // Create and return toolbar
        return this.createToolbar();
    }

    /**
     * Create toolbar controls for the Impact View
     * @returns {HTMLElement} Toolbar container
     */
    createToolbar() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'impact-toolbar';

        // Mode label
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'View By:';
        modeLabel.className = 'impact-toolbar__label';
        controlsContainer.appendChild(modeLabel);

        // Mode selector with ThemedSelect
        const modes = [
            { value: 'initiative', text: 'Initiative' },
            { value: 'team', text: 'Team' },
            { value: 'service', text: 'Service' }
        ];

        this._modeSelect = new ThemedSelect({
            options: modes,
            value: 'initiative',
            id: 'impact-view-mode-selector',
            onChange: () => this.updateDynamicSelector()
        });

        controlsContainer.appendChild(this._modeSelect.render());

        // Dynamic selector container
        this.dynamicSelectContainer = document.createElement('div');
        this.dynamicSelectContainer.id = 'impact-dynamic-select-container';
        controlsContainer.appendChild(this.dynamicSelectContainer);

        // Initialize
        if (SystemService.getCurrentSystem()) {
            this.updateDynamicSelector();
        }

        return controlsContainer;
    }

    /**
     * Update the dynamic selector based on view mode
     */
    updateDynamicSelector() {
        const mode = this._modeSelect?.getValue() || 'initiative';
        this._clearElement(this.dynamicSelectContainer);

        const systemData = SystemService.getCurrentSystem();
        let items = [];
        let options = [];
        let renderFunc;
        let noItemsText = 'No items found.';
        let defaultValue = '';

        switch (mode) {
            case 'initiative':
                items = (systemData.yearlyInitiatives || [])
                    .sort((a, b) => a.title.localeCompare(b.title));
                options = items.map(item => ({
                    value: item.initiativeId,
                    text: item.title
                }));
                renderFunc = (id) => this.generateInitiativeGraph(id);
                noItemsText = 'No initiatives found.';
                defaultValue = options.length > 0 ? options[0].value : '';
                break;

            case 'team':
                items = (systemData.teams || [])
                    .sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName));
                options = [{ value: 'all', text: 'All Teams' }];
                items.forEach(item => {
                    options.push({
                        value: item.teamId,
                        text: item.teamIdentity || item.teamName
                    });
                });
                renderFunc = (id) => this.generateTeamGraph(id);
                noItemsText = 'No teams found.';
                defaultValue = 'all';
                break;

            case 'service':
                items = (systemData.services || [])
                    .sort((a, b) => a.serviceName.localeCompare(b.serviceName));
                options = items.map(item => ({
                    value: item.serviceName,
                    text: item.serviceName
                }));
                renderFunc = (id) => this.generateServiceGraph(id);
                noItemsText = 'No services found.';
                defaultValue = options.length > 0 ? options[0].value : '';
                break;
        }

        if (options.length > 0) {
            this._itemSelect = new ThemedSelect({
                options: options,
                value: defaultValue,
                id: 'impact-item-selector',
                onChange: (value) => renderFunc(value)
            });

            this.dynamicSelectContainer.appendChild(this._itemSelect.render());
            renderFunc(defaultValue);
        } else {
            this.svg.selectAll('*').remove();
            this.svg.append('text')
                .attr('x', '50%')
                .attr('y', '50%')
                .attr('text-anchor', 'middle')
                .text(noItemsText);
        }
    }

    /**
     * Generate initiative-centric graph
     */
    generateInitiativeGraph(selectedInitiativeId) {
        const systemData = SystemService.getCurrentSystem();
        const initiative = systemData.yearlyInitiatives.find(i => i.initiativeId === selectedInitiativeId);
        if (!initiative) return;

        const nodes = [], links = [], nodeMap = new Map();
        const addNode = (node) => {
            if (!nodeMap.has(node.id)) {
                nodeMap.set(node.id, node);
                nodes.push(node);
            }
        };

        addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });

        (initiative.assignments || []).forEach(assignment => {
            const team = systemData.teams.find(t => t.teamId === assignment.teamId);
            if (team) {
                addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                links.push({ source: initiative.initiativeId, target: team.teamId, type: 'assignment', sde: assignment.sdeYears });
            }
        });

        const serviceQueue = [...(initiative.impactedServiceIds || [])];
        const processedServices = new Set(serviceQueue);

        while (serviceQueue.length > 0) {
            const serviceName = serviceQueue.shift();
            const service = systemData.services.find(s => s.serviceName === serviceName);
            if (!service) continue;

            addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });
            if (initiative.impactedServiceIds.includes(serviceName)) {
                links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });
            }

            if (service.owningTeamId) {
                const team = systemData.teams.find(t => t.teamId === service.owningTeamId);
                if (team) {
                    addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                    links.push({ source: team.teamId, target: service.serviceName, type: 'owns' });
                }
            }

            (service.serviceDependencies || []).forEach(depName => {
                const depService = systemData.services.find(s => s.serviceName === depName);
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
        this.renderGraph(nodes, links, selectedInitiativeId);
    }

    /**
     * Generate team-centric graph
     */
    generateTeamGraph(selectedTeamId) {
        if (selectedTeamId === 'all') {
            this.generateAllTeamsGraph();
            return;
        }

        const systemData = SystemService.getCurrentSystem();
        const team = systemData.teams.find(t => t.teamId === selectedTeamId);
        if (!team) return;

        const nodes = [], links = [], nodeMap = new Map();
        const addNode = (node) => {
            if (!nodeMap.has(node.id)) {
                nodeMap.set(node.id, node);
                nodes.push(node);
            }
        };

        addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });

        const assignedInitiatives = systemData.yearlyInitiatives.filter(
            init => (init.assignments || []).some(a => a.teamId === selectedTeamId)
        );

        assignedInitiatives.forEach(initiative => {
            addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
            const assignment = initiative.assignments.find(a => a.teamId === selectedTeamId);
            links.push({ source: team.teamId, target: initiative.initiativeId, type: 'assignment', sde: assignment.sdeYears });

            (initiative.assignments || []).forEach(ass => {
                if (ass.teamId !== selectedTeamId) {
                    const otherTeam = systemData.teams.find(t => t.teamId === ass.teamId);
                    if (otherTeam) {
                        addNode({ id: otherTeam.teamId, name: otherTeam.teamIdentity || otherTeam.teamName, type: 'Team', data: otherTeam });
                        links.push({ source: initiative.initiativeId, target: otherTeam.teamId, type: 'assignment', sde: ass.sdeYears });
                    }
                }
            });

            (initiative.impactedServiceIds || []).forEach(serviceName => {
                const service = systemData.services.find(s => s.serviceName === serviceName);
                if (service) {
                    addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });
                    links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });
                }
            });
        });

        this.renderGraph(nodes, links, selectedTeamId);
    }

    /**
     * Generate all teams graph
     */
    generateAllTeamsGraph() {
        const systemData = SystemService.getCurrentSystem();
        const nodes = [], links = [], nodeMap = new Map();
        const addNode = (node) => {
            if (!nodeMap.has(node.id)) {
                nodeMap.set(node.id, node);
                nodes.push(node);
            }
        };

        systemData.teams.forEach(team => {
            addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
        });

        systemData.yearlyInitiatives.forEach(initiative => {
            addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
            (initiative.assignments || []).forEach(assignment => {
                links.push({ source: initiative.initiativeId, target: assignment.teamId, type: 'assignment', sde: assignment.sdeYears });
            });
        });

        this.renderGraph(nodes, links, null);
    }

    /**
     * Generate service-centric graph
     */
    generateServiceGraph(selectedServiceName) {
        const systemData = SystemService.getCurrentSystem();
        const service = systemData.services.find(s => s.serviceName === selectedServiceName);
        if (!service) return;

        const nodes = [], links = [], nodeMap = new Map();
        const addNode = (node) => {
            if (!nodeMap.has(node.id)) {
                nodeMap.set(node.id, node);
                nodes.push(node);
            }
        };

        addNode({ id: service.serviceName, name: service.serviceName, type: 'Service', data: service });

        if (service.owningTeamId) {
            const team = systemData.teams.find(t => t.teamId === service.owningTeamId);
            if (team) {
                addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                links.push({ source: team.teamId, target: service.serviceName, type: 'owns' });
            }
        }

        const impactingInitiatives = systemData.yearlyInitiatives.filter(
            init => (init.impactedServiceIds || []).includes(selectedServiceName)
        );

        impactingInitiatives.forEach(initiative => {
            addNode({ id: initiative.initiativeId, name: initiative.title, type: 'Initiative', data: initiative });
            links.push({ source: initiative.initiativeId, target: service.serviceName, type: 'impact' });

            (initiative.assignments || []).forEach(assignment => {
                const team = systemData.teams.find(t => t.teamId === assignment.teamId);
                if (team) {
                    addNode({ id: team.teamId, name: team.teamIdentity || team.teamName, type: 'Team', data: team });
                    links.push({ source: initiative.initiativeId, target: team.teamId, type: 'assignment', sde: assignment.sdeYears });
                }
            });
        });

        this.renderGraph(nodes, links, selectedServiceName);
    }

    /**
     * Render force-directed graph
     */
    renderGraph(nodes, links, selectedId) {
        const systemData = SystemService.getCurrentSystem();
        this.svg.selectAll('*').remove();

        const width = this.svg.node().getBoundingClientRect().width;
        const height = this.svg.node().getBoundingClientRect().height;

        // Color scales - use D3Service
        const teamColors = D3Service.createColorScale(systemData.teams.map(t => t.teamId));
        const serviceImpactCount = new Map();
        links.forEach(link => {
            if (link.type === 'impact') {
                serviceImpactCount.set(link.target.id || link.target,
                    (serviceImpactCount.get(link.target.id || link.target) || 0) + 1);
            }
        });
        const initiativeStatusColors = {
            'Backlog': '#6c757d', 'Defined': '#17a2b8', 'Committed': '#007bff',
            'In Progress': '#ffc107', 'Completed': '#28a745'
        };

        // Force simulation - use D3Service with custom collision radius, left-aligned
        const d3 = D3Service.getInstance();
        const xCenter = width / 3; // Left-align: shift graph toward left side
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.type === 'owns' ? 80 : 150).strength(0.6))
            .force('charge', d3.forceManyBody().strength(-800))
            .force('center', d3.forceCenter(xCenter, height / 2))
            .force('collide', d3.forceCollide().radius(d =>
                (d.type === 'Team' ? 40 : (d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 5 + 20)) + 10));

        // Arrow markers
        this.svg.append('defs').selectAll('marker')
            .data(['depends_on', 'owns', 'impact', 'assignment'])
            .enter().append('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#999');

        // Links
        const link = this.svg.append('g').selectAll('path').data(links).join('path')
            .style('stroke', 'var(--theme-text-muted)').attr('stroke-opacity', 0.7)
            .attr('stroke-width', d => Math.max(1, (d.sde || 0.5) * 2))
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .style('stroke-dasharray', d => d.type === 'owns' ? '3, 3' : '0')
            .on('mouseover', (event, d) => {
                D3Service.showTooltip(event, this._buildLinkTooltipContent(d));
            })
            .on('mouseout', () => D3Service.hideTooltip());

        // Node groups with D3Service drag behavior
        const nodeGroup = this.svg.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(D3Service.createDragBehavior(simulation));

        // Node circles
        nodeGroup.append('circle')
            .attr('r', d => d.type === 'Team' ? 35 : (d.type === 'Initiative' ? 28 : (serviceImpactCount.get(d.id) || 0) * 4 + 18))
            .attr('fill', d => {
                if (d.type === 'Initiative') return initiativeStatusColors[d.data.status] || '#ff7f0e';
                if (d.type === 'Team') return teamColors(d.id);
                if (d.type === 'Service') {
                    const owningTeam = systemData.teams.find(t => t.teamId === d.data.owningTeamId);
                    return owningTeam ? D3Service.adjustColor(teamColors(owningTeam.teamId), 0.5) : '#2ca02c';
                }
                return '#ccc';
            })
            .attr('stroke', d => d.id === selectedId ? 'red' : '#fff')
            .attr('stroke-width', d => d.id === selectedId ? 4 : 2);

        // Node tooltips using D3Service
        nodeGroup.on('mouseover', (event, d) => {
            D3Service.showTooltip(event, this._buildNodeTooltipContent(d, systemData));
        })
            .on('mouseout', () => D3Service.hideTooltip());

        // Node labels
        nodeGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('font-size', '10px')
            .style('pointer-events', 'none')
            .style('fill', 'var(--theme-text-primary)')
            .style('text-shadow', '0 0 3px var(--theme-bg-primary)')
            .text(d => d.name)
            .call(this.wrapText, d => d.type === 'Team' ? 60 : 50);

        // Simulation tick
        simulation.on('tick', () => {
            link.attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
            nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Update summary panel
        this.updateSummary(nodes, selectedId);

        // Render legend
        this.renderLegend(nodes, teamColors, initiativeStatusColors);
    }

    /**
     * Update summary panel for selected initiative
     */
    updateSummary(nodes, selectedId) {
        const summaryContainer = document.getElementById('impact-summary-container');
        if (!summaryContainer) return;

        const systemData = SystemService.getCurrentSystem();
        const selectedNode = nodes.find(n => n.id === selectedId && n.type === 'Initiative');

        // Clear previous content
        while (summaryContainer.firstChild) {
            summaryContainer.removeChild(summaryContainer.firstChild);
        }

        if (selectedNode) {
            const init = selectedNode.data;
            const ownerName = init.owner?.name || 'N/A';
            const teamsImpacted = (init.assignments || []).map(a => {
                const team = systemData.teams.find(t => t.teamId === a.teamId);
                return `${team?.teamIdentity || a.teamId}: ${a.sdeYears} SDE-Years`;
            }).join(' • ');

            summaryContainer.classList.remove('is-hidden');

            // Create summary div
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'initiative-summary';

            // Title
            const title = document.createElement('h4');
            title.textContent = init.title;
            summaryDiv.appendChild(title);

            // Meta row
            const metaDiv = document.createElement('div');
            metaDiv.className = 'initiative-summary-meta';

            const ownerStrong = document.createElement('strong');
            ownerStrong.textContent = 'Owner: ';
            metaDiv.appendChild(ownerStrong);
            metaDiv.appendChild(document.createTextNode(ownerName + ' • '));

            const statusStrong = document.createElement('strong');
            statusStrong.textContent = 'Status: ';
            metaDiv.appendChild(statusStrong);
            metaDiv.appendChild(document.createTextNode((init.status || 'N/A') + ' • '));

            const dueStrong = document.createElement('strong');
            dueStrong.textContent = 'Due: ';
            metaDiv.appendChild(dueStrong);
            metaDiv.appendChild(document.createTextNode(init.targetDueDate || 'N/A'));

            summaryDiv.appendChild(metaDiv);

            // Description
            const descDiv = document.createElement('div');
            descDiv.className = 'initiative-summary-description';
            const descStrong = document.createElement('strong');
            descStrong.textContent = 'Description: ';
            descDiv.appendChild(descStrong);
            descDiv.appendChild(document.createTextNode(init.description || 'No description provided.'));
            summaryDiv.appendChild(descDiv);

            // Teams
            const teamsDiv = document.createElement('div');
            teamsDiv.className = 'initiative-summary-teams';
            const teamsStrong = document.createElement('strong');
            teamsStrong.textContent = 'Teams & Estimates: ';
            teamsDiv.appendChild(teamsStrong);
            teamsDiv.appendChild(document.createTextNode(teamsImpacted || 'None'));
            summaryDiv.appendChild(teamsDiv);

            summaryContainer.appendChild(summaryDiv);
        } else {
            summaryContainer.classList.add('is-hidden');
        }
    }

    /**
     * Render legend
     */
    renderLegend(nodes, teamColors, initiativeStatusColors) {
        const legendGroup = this.svg.append('g').attr('class', 'legend').attr('transform', 'translate(20, 20)');
        const legendData = [];

        const uniqueStatuses = [...new Set(nodes.filter(n => n.type === 'Initiative').map(n => n.data.status))].sort();
        if (uniqueStatuses.length > 0) {
            legendData.push({ label: 'Initiative Statuses', type: 'header' });
            uniqueStatuses.forEach(status => {
                legendData.push({ label: status || 'N/A', color: initiativeStatusColors[status] || '#ff7f0e', type: 'item' });
            });
        }

        const teamsInView = nodes.filter(n => n.type === 'Team');
        if (teamsInView.length > 0 && teamsInView.length < 10) {
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
            .attr('x', 0).attr('y', 10)
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            .style('fill', 'var(--theme-text-primary)')
            .text(d => d.label);

        const itemGroups = legendItems.filter(d => d.type === 'item');
        itemGroups.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 5).style('fill', d => d.color);
        itemGroups.append('text').attr('x', 15).attr('y', 9).style('font-size', '11px').style('fill', 'var(--theme-text-primary)').text(d => d.label);
    }

    /**
     * Wrap text helper
     */
    wrapText(text, widthFn) {
        text.each(function () {
            const t = D3Service.select(this);
            const words = t.text().split(/\s+/).reverse();
            let word, line = [], lineNumber = 0;
            const lineHeight = 1.1;
            const dy = parseFloat(t.attr('dy') || 0);
            let tspan = t.text(null).append('tspan').attr('x', 0).attr('dy', dy + 'em');
            const width = typeof widthFn === 'function' ? widthFn(t.datum()) : widthFn;

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = t.append('tspan').attr('x', 0).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
                }
            }
        });
    }

    _buildTooltipLine(label, value, includeSeparator = false) {
        const line = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = label;
        line.appendChild(strong);
        line.appendChild(document.createTextNode(` ${value}`));
        if (includeSeparator) {
            line.appendChild(document.createTextNode(' • '));
        }
        return line;
    }

    _buildLinkTooltipContent(link) {
        const wrapper = document.createElement('div');
        const title = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = link.type.replace('_', ' ');
        title.appendChild(strong);
        wrapper.appendChild(title);

        if (link.sde) {
            const line = document.createElement('div');
            line.textContent = `SDE Years: ${link.sde}`;
            wrapper.appendChild(line);
        }

        return wrapper;
    }

    _buildNodeTooltipContent(node, systemData) {
        const wrapper = document.createElement('div');
        const header = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `${node.type}:`;
        header.appendChild(strong);
        header.appendChild(document.createTextNode(` ${node.name}`));
        wrapper.appendChild(header);

        if (node.type === 'Initiative') {
            const sdmName = node.data.owner?.name || 'N/A';
            const teamsImpacted = (node.data.assignments || [])
                .map(a => systemData.teams.find(t => t.teamId === a.teamId)?.teamIdentity || a.teamId)
                .join(' / ');
            wrapper.appendChild(this._buildTooltipLine('Owner:', sdmName));
            wrapper.appendChild(this._buildTooltipLine('Due:', node.data.targetDueDate || 'N/A'));
            wrapper.appendChild(this._buildTooltipLine('Teams:', teamsImpacted || 'N/A'));
        } else if (node.type === 'Service') {
            const ownerTeam = systemData.teams.find(t => t.teamId === node.data.owningTeamId);
            wrapper.appendChild(this._buildTooltipLine('Owner:', ownerTeam?.teamIdentity || 'N/A'));
        } else if (node.type === 'Team') {
            const sdm = systemData.sdms.find(s => s.sdmId === node.data.sdmId);
            wrapper.appendChild(this._buildTooltipLine('SDM:', sdm?.sdmName || 'N/A'));
        }

        return wrapper;
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
