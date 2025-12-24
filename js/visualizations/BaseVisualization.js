/**
 * BaseVisualization - Abstract base class for D3 force-directed visualizations
 * 
 * Provides shared infrastructure for all visualization components:
 * - SVG setup and sizing
 * - Force simulation configuration
 * - Drag and zoom behavior
 * - Tooltip management
 * - Legend rendering
 * 
 * Subclasses should implement:
 * - prepareData(systemData) -> { nodes, links }
 * - getNodeColor(d) -> color string
 * - getNodeRadius(d) -> radius number
 * - getTooltipContent(d) -> HTML string
 * - getLegendData() -> array of { label, color }
 * 
 * @example
 * class MyVisualization extends BaseVisualization {
 *     prepareData(systemData) { return { nodes: [], links: [] }; }
 *     render() { super.render(); this.drawNodes(); this.drawLinks(); }
 * }
 */
class BaseVisualization {
    /**
     * @param {Object} config - Configuration options
     * @param {string} config.containerId - ID of the container element
     * @param {string} config.svgId - ID of the SVG element
     * @param {string} [config.legendId] - ID of the legend container
     * @param {Object} [config.simulation] - Force simulation options
     */
    constructor(config) {
        this.containerId = config.containerId;
        this.svgId = config.svgId;
        this.legendId = config.legendId || null;
        this.simulationConfig = config.simulation || {};

        // D3 instance for complex operations
        this.d3 = D3Service.getInstance();

        // State
        this.svg = null;
        this.graphGroup = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.width = 800;
        this.height = 600;
    }

    /**
     * Initialize the visualization
     * Sets up SVG, dimensions, and zoom behavior
     */
    init() {
        this.svg = D3Service.select(`#${this.svgId}`);
        if (!this.svg || this.svg.empty()) {
            console.error(`BaseVisualization: #${this.svgId} not found`);
            return false;
        }

        this.svg.selectAll('*').remove();

        // Get container dimensions
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`BaseVisualization: #${this.containerId} not found`);
            return false;
        }

        const rect = container.getBoundingClientRect();
        this.width = rect.width > 0 ? rect.width : 800;
        this.height = rect.height > 0 ? rect.height : 600;

        // Create graph group for zoom/pan
        this.graphGroup = this.svg.append('g').attr('class', 'graph-group');

        // Setup zoom behavior
        this.setupZoom();

        return true;
    }

    /**
     * Setup zoom behavior on the SVG
     */
    setupZoom() {
        const zoomBehavior = D3Service.createZoomBehavior({
            scaleExtent: [0.1, 5],
            onZoom: (transform) => this.graphGroup.attr('transform', transform)
        });
        this.svg.call(zoomBehavior);
    }

    /**
     * Create and configure the force simulation
     * @param {Object} [options] - Override default simulation options
     */
    createSimulation(options = {}) {
        const config = {
            linkDistance: 150,
            chargeStrength: -500,
            collideRadius: 30,
            centerStrength: 0.1,
            ...this.simulationConfig,
            ...options,
            width: this.width,
            height: this.height
        };

        // Left-align: use width/3 instead of width/2 to shift graph toward left
        const xCenter = this.width / 3;
        const yCenter = this.height / 2;

        this.simulation = this.d3.forceSimulation(this.nodes)
            .force('link', this.d3.forceLink(this.links)
                .id(d => d.id)
                .distance(config.linkDistance))
            .force('charge', this.d3.forceManyBody().strength(config.chargeStrength))
            .force('center', this.d3.forceCenter(xCenter, yCenter))
            .force('x', this.d3.forceX(xCenter).strength(config.centerStrength))
            .force('y', this.d3.forceY(yCenter).strength(config.centerStrength))
            .force('collide', this.d3.forceCollide(config.collideRadius));

        return this.simulation;
    }

    /**
     * Create drag behavior for nodes
     * @param {Object} [callbacks] - Optional drag callbacks
     * @returns {d3.DragBehavior}
     */
    createDragBehavior(callbacks = {}) {
        return D3Service.createDragBehavior(this.simulation, {
            onStart: (event) => {
                if (event.sourceEvent) event.sourceEvent.stopPropagation();
                if (callbacks.onStart) callbacks.onStart(event);
            },
            onDrag: callbacks.onDrag,
            onEnd: callbacks.onEnd
        });
    }

    /**
     * Draw links to the graph
     * @param {Object} [options] - Link styling options
     * @returns {d3.Selection}
     */
    drawLinks(options = {}) {
        const colors = ThemeService.getThemeColors();
        const {
            strokeColor = colors.textMuted || '#aaa',
            strokeWidth = 1.5,
            strokeDasharray = null
        } = options;

        const link = this.graphGroup.append('g')
            .attr('class', 'links')
            .attr('stroke', strokeColor)
            .selectAll('line')
            .data(this.links)
            .join('line')
            .attr('stroke-width', typeof strokeWidth === 'function' ? strokeWidth : () => strokeWidth);

        if (strokeDasharray) {
            link.attr('stroke-dasharray', strokeDasharray);
        }

        return link;
    }

    /**
     * Draw nodes to the graph
     * @param {Function} colorFn - Function to determine node color
     * @param {Function|number} radiusFn - Function or value for node radius
     * @returns {d3.Selection}
     */
    drawNodes(colorFn, radiusFn = 10) {
        const colors = ThemeService.getThemeColors();
        const node = this.graphGroup.append('g')
            .attr('class', 'nodes')
            .attr('stroke', colors.bgPrimary || '#fff')
            .attr('stroke-width', 1.5)
            .selectAll('circle')
            .data(this.nodes)
            .join('circle')
            .attr('r', typeof radiusFn === 'function' ? radiusFn : () => radiusFn)
            .attr('fill', colorFn)
            .call(this.createDragBehavior());

        return node;
    }

    /**
     * Draw labels for nodes
     * @param {Function} labelFn - Function to get label text
     * @param {Object} [options] - Label styling options
     * @returns {d3.Selection}
     */
    drawLabels(labelFn, options = {}) {
        const {
            fontSize = '10px',
            dy = -15,
            textAnchor = 'middle'
        } = options;

        const labels = this.graphGroup.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.nodes)
            .join('text')
            .attr('dy', dy)
            .attr('text-anchor', textAnchor)
            .style('font-size', fontSize)
            .style('pointer-events', 'none')
            .text(labelFn);

        return labels;
    }

    /**
     * Attach tooltip behavior to a selection
     * @param {d3.Selection} selection - Selection to attach tooltips to
     * @param {Function} contentFn - Function returning tooltip content (Node or string)
     */
    attachTooltips(selection, contentFn) {
        selection
            .on('mouseover', (event, d) => {
                D3Service.showTooltip(event, contentFn(d), {
                    className: 'visualization-tooltip'
                });
            })
            .on('mouseout', () => {
                D3Service.hideTooltip();
            });
    }

    _buildTooltipContent(rows) {
        const container = document.createElement('div');
        rows.forEach(({ label, value }) => {
            container.appendChild(this._createTooltipRow(label, value));
        });
        return container;
    }

    _createTooltipRow(label, value) {
        const row = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `${label}:`;
        row.appendChild(strong);
        row.appendChild(document.createTextNode(` ${value}`));
        return row;
    }

    /**
     * Setup the simulation tick handler
     * @param {Object} elements - Object containing link, node, labels selections
     * @param {number} [radius=10] - Node radius for boundary calculations
     */
    setupTick(elements, radius = 10) {
        const { link, node, labels } = elements;

        this.simulation.on('tick', () => {
            if (node) {
                node
                    // Allow horizontal movement without clamping for left-alignment
                    // Only clamp vertically to keep nodes visible
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y = Math.max(radius, Math.min(this.height - radius, d.y)));
            }

            if (labels) {
                labels
                    .attr('x', d => d.x)
                    .attr('y', d => d.y - radius - 5);
            }

            if (link) {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
            }
        });
    }

    /**
     * Render a legend
     * @param {Array} legendData - Array of { label, color } objects
     * @param {string} [containerId] - Override legend container ID
     */
    renderLegend(legendData, containerId = null) {
        const legendId = containerId || this.legendId;
        if (!legendId) return;

        const legendContainer = D3Service.select(`#${legendId}`);
        if (!legendContainer || legendContainer.empty()) return;

        legendContainer.selectAll('*').remove();

        const legend = legendContainer.selectAll('.legend-item')
            .data(legendData)
            .enter().append('div')
            .attr('class', 'legend-item');

        legend.append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', d => d.color)
            .style('border-radius', '50%')
            .style('margin-right', '5px');

        legend.append('span')
            .text(d => d.label);
    }

    /**
     * Clear the visualization
     */
    clear() {
        if (this.svg) {
            this.svg.selectAll('*').remove();
        }
        if (this.simulation) {
            this.simulation.stop();
        }
    }

    /**
     * Destroy the visualization and clean up resources
     */
    destroy() {
        this.clear();
        this.svg = null;
        this.graphGroup = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
    }
}
