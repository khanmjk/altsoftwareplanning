/**
 * DependencyVisualization - Service Dependency force-directed graph
 * 
 * Displays upstream/downstream dependencies for a selected service:
 * - Services colored by type
 * - Platform dependencies shown differently
 * - Interactive highlighting on hover
 * 
 * @extends BaseVisualization
 */
class DependencyVisualization extends BaseVisualization {
    constructor(config = {}) {
        super({
            containerId: 'dependencyVisualization',
            svgId: 'dependencySvg',
            legendId: 'dependencyLegend',
            simulation: {
                linkDistance: 150,
                chargeStrength: -600,
                collideRadius: 45
            },
            ...config
        });

        this.selectedServiceName = null;
        this.highlightedNodes = new Set();
        this.highlightedLinks = new Set();
        this.showPlatformComponents = config.showPlatformComponents !== false;

        // Element references for highlighting
        this.nodeSelection = null;
        this.labelSelection = null;
        this.linkSelection = null;
    }

    /**
     * Render the dependency visualization
     * @param {string} selectedServiceName - Name of the service to visualize dependencies for
     */
    render(selectedServiceName) {
        console.log(`DependencyVisualization: Rendering for ${selectedServiceName}`);

        this.selectedServiceName = selectedServiceName;

        if (!this.init()) return;

        this.prepareData();
        this.createSimulation();

        // Setup simulation tick
        this.simulation.on('tick', () => this.ticked());

        // Define arrowheads
        this.defineArrowheads();

        // Draw elements
        this.linkSelection = this.drawDependencyLinks();
        this.nodeSelection = this.drawDependencyNodes();
        this.labelSelection = this.drawDependencyLabels();

        // Render legend inside SVG
        this.renderDependencyLegend();
    }

    /**
     * Prepare nodes and links from dependency graph
     */
    prepareData() {
        const graphData = VisualizationService.buildDependencyGraph(
            SystemService.getCurrentSystem(),
            this.selectedServiceName,
            { showPlatformComponents: this.showPlatformComponents }
        );

        this.nodes = graphData.nodes;
        this.links = graphData.links;

        // Assign index to links for highlighting
        this.links.forEach((link, index) => { link.index = index; });
    }

    /**
     * Define arrow markers for links
     */
    defineArrowheads() {
        const defs = this.svg.append('defs');
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
    }

    /**
     * Draw dependency links with proper styling
     * @returns {d3.Selection}
     */
    drawDependencyLinks() {
        const linksGroup = this.graphGroup.append('g').attr('class', 'links');

        return linksGroup.selectAll('line')
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
            .join('line')
            .attr('stroke-width', 2)
            .attr('marker-end', d => `url(#arrow-${d.type})`)
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-dasharray', d => d.type === 'platform-dependency' ? '5,5' : '0');
    }

    /**
     * Draw dependency nodes with proper styling
     * @returns {d3.Selection}
     */
    drawDependencyNodes() {
        const color = this.d3.scaleOrdinal()
            .domain(['service', 'platform'])
            .range(['#1f77b4', '#ff7f0e']);

        const nodesGroup = this.graphGroup.append('g').attr('class', 'nodes');

        return nodesGroup.selectAll('circle')
            .data(this.nodes, d => d.id)
            .join('circle')
            .attr('r', d => d.id === this.selectedServiceName ? 15 : 10)
            .attr('fill', d => d.id === this.selectedServiceName ? 'red' : color(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', d => d.id === this.selectedServiceName ? 3 : 1.5)
            .call(this.createDragBehavior())
            .on('mouseover', (event, d) => this.handleMouseOver(event, d))
            .on('mouseout', () => this.handleMouseOut());
    }

    /**
     * Draw dependency labels
     * @returns {d3.Selection}
     */
    drawDependencyLabels() {
        const labelsGroup = this.graphGroup.append('g').attr('class', 'labels');

        return labelsGroup.selectAll('text')
            .data(this.nodes, d => d.id)
            .join('text')
            .attr('dy', -15)
            .attr('text-anchor', 'middle')
            .text(d => d.id)
            .attr('font-size', '10px')
            .style('pointer-events', 'none')
            .attr('font-weight', d => d.id === this.selectedServiceName ? 'bold' : 'normal')
            .attr('fill', d => d.id === this.selectedServiceName ? 'red' : 'black');
    }

    /**
     * Handle mouseover event for highlighting
     * @param {Event} event - Mouse event
     * @param {Object} d - Node data
     */
    handleMouseOver(event, d) {
        // Build tooltip content
        let info = '';
        if (d.type === 'service') {
            const service = SystemService.getCurrentSystem().services.find(s => s.serviceName === d.id);
            if (service) {
                const upstreams = service.serviceDependencies || [];
                const downstreams = SystemService.getCurrentSystem().services
                    .filter(s => (s.serviceDependencies || []).includes(d.id))
                    .map(s => s.serviceName);
                const platformDeps = service.platformDependencies || [];
                info = `<strong>Service:</strong> ${d.id}<br>`;
                info += `<strong>Upstream:</strong> ${upstreams.length > 0 ? upstreams.join(', ') : 'None'}<br>`;
                info += `<strong>Downstream:</strong> ${downstreams.length > 0 ? downstreams.join(', ') : 'None'}<br>`;
                info += `<strong>Platform Deps:</strong> ${platformDeps.length > 0 ? platformDeps.join(', ') : 'None'}`;
            }
        } else if (d.type === 'platform') {
            info = `<strong>Platform:</strong> ${d.id}`;
        }

        D3Service.showTooltip(event, info, { className: 'visualization-tooltip' });

        // Highlight connected nodes and links
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
        this.highlightedNodes.add(d.id);

        this.links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            if (sourceId === d.id) {
                this.highlightedNodes.add(targetId);
                this.highlightedLinks.add(link.index);
            }
            if (targetId === d.id) {
                this.highlightedNodes.add(sourceId);
                this.highlightedLinks.add(link.index);
            }
        });

        this.nodeSelection.style('opacity', n => this.highlightedNodes.has(n.id) ? 1 : 0.1);
        this.labelSelection.style('opacity', n => this.highlightedNodes.has(n.id) ? 1 : 0.1);
        this.linkSelection
            .style('opacity', l => this.highlightedLinks.has(l.index) ? 0.9 : 0.1)
            .attr('stroke', l => this.highlightedLinks.has(l.index) ? '#555' : '#999');
    }

    /**
     * Handle mouseout event to remove highlighting
     */
    handleMouseOut() {
        D3Service.hideTooltip();
        this.nodeSelection.style('opacity', 1);
        this.labelSelection.style('opacity', 1);
        this.linkSelection.style('opacity', 0.6).attr('stroke', '#999');
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
    }

    /**
     * Tick function for simulation
     */
    ticked() {
        if (!this.linkSelection || !this.nodeSelection || !this.labelSelection) return;
        if (this.linkSelection.empty() || this.nodeSelection.empty() || this.labelSelection.empty()) return;

        this.linkSelection
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        this.nodeSelection
            .attr('cx', d => d.x = Math.max(15, Math.min(this.width - 15, d.x)))
            .attr('cy', d => d.y = Math.max(15, Math.min(this.height - 15, d.y)));

        this.labelSelection
            .attr('x', d => d.x)
            .attr('y', d => d.y - (d.id === this.selectedServiceName ? 20 : 15));
    }

    /**
     * Render legend inside the SVG
     */
    renderDependencyLegend() {
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend-group')
            .attr('transform', 'translate(10, 10)');

        const legendItems = [
            { label: 'Service', color: '#1f77b4', shape: 'circle' },
            { label: 'Platform', color: '#ff7f0e', shape: 'circle' },
            { label: 'Selected', color: 'red', shape: 'circle' }
        ];

        let yOffset = 0;
        legendItems.forEach(item => {
            const itemGroup = legendGroup.append('g')
                .attr('transform', `translate(0, ${yOffset})`);

            itemGroup.append('circle')
                .attr('r', 5)
                .attr('cx', 5)
                .attr('cy', 5)
                .attr('fill', item.color);

            itemGroup.append('text')
                .attr('x', 15)
                .attr('y', 9)
                .attr('font-size', '10px')
                .text(item.label);

            yOffset += 18;
        });
    }

    /**
     * Update the platform components visibility
     * @param {boolean} show - Whether to show platform components
     */
    setShowPlatformComponents(show) {
        this.showPlatformComponents = show;
    }
}
