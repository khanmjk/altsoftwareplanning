/**
 * D3Service - Abstraction layer for D3.js library
 * 
 * Provides a developer-friendly API for common D3 visualization patterns,
 * abstracting away direct d3.* global references for future ES module migration.
 * 
 * Features:
 * - Force simulation creation with sensible defaults
 * - Reusable drag and zoom handlers
 * - Tooltip management
 * - Color scale utilities
 * - SVG setup helpers
 * 
 * @example
 * // Create a force simulation with defaults
 * const sim = D3Service.createForceSimulation(nodes, links, { width: 800, height: 600 });
 * 
 * @example
 * // Create drag behavior
 * node.call(D3Service.createDragBehavior(simulation));
 * 
 * @example
 * // Show tooltip
 * const content = document.createElement('strong');
 * content.textContent = 'Node: Example';
 * D3Service.showTooltip(event, content);
 */
const D3Service = {
    _tooltip: null,

    // ==================== Core Access ====================

    /**
     * Check if D3.js library is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof d3 !== 'undefined';
    },

    /**
     * Get the D3 library instance (for advanced use cases)
     * @returns {Object|null} The d3 object or null if not available
     */
    getInstance() {
        return this.isAvailable() ? d3 : null;
    },

    // ==================== Selection Helpers ====================

    /**
     * Select a single element
     * @param {string|HTMLElement} selector - CSS selector or element
     * @returns {d3.Selection}
     */
    select(selector) {
        if (!this.isAvailable()) return null;
        return d3.select(selector);
    },

    /**
     * Select all matching elements
     * @param {string} selector - CSS selector
     * @returns {d3.Selection}
     */
    selectAll(selector) {
        if (!this.isAvailable()) return null;
        return d3.selectAll(selector);
    },

    // ==================== SVG Setup ====================

    /**
     * Create or select an SVG element with proper sizing
     * @param {string} selector - Container selector
     * @param {Object} options - Configuration options
     * @param {number} options.width - SVG width
     * @param {number} options.height - SVG height
     * @param {boolean} [options.append=false] - Append new SVG vs select existing
     * @returns {d3.Selection} SVG selection
     */
    setupSvg(selector, options = {}) {
        if (!this.isAvailable()) return null;

        const { width = 800, height = 600, append = false } = options;

        let svg;
        if (append) {
            svg = d3.select(selector).append('svg');
        } else {
            svg = d3.select(selector);
        }

        return svg
            .attr('width', width)
            .attr('height', height)
            .style('width', '100%')
            .style('height', '100%');
    },

    /**
     * Clear all children from an SVG or container
     * @param {string|d3.Selection} selector - CSS selector or D3 selection
     */
    clearSvg(selector) {
        if (!this.isAvailable()) return;
        const selection = typeof selector === 'string' ? d3.select(selector) : selector;
        selection.selectAll('*').remove();
    },

    // ==================== Force Simulation ====================

    /**
     * Create a force simulation with sensible defaults
     * @param {Array} nodes - Array of node objects
     * @param {Array} links - Array of link objects
     * @param {Object} options - Simulation options
     * @param {number} options.width - Container width
     * @param {number} options.height - Container height
     * @param {number} [options.linkDistance=150] - Link distance
     * @param {number} [options.chargeStrength=-500] - Charge strength (negative = repel)
     * @param {number} [options.collideRadius=30] - Collision radius
     * @param {number} [options.centerStrength=0.1] - Center force strength
     * @returns {d3.Simulation}
     */
    createForceSimulation(nodes, links, options = {}) {
        if (!this.isAvailable()) return null;

        const {
            width = 800,
            height = 600,
            linkDistance = 150,
            chargeStrength = -500,
            collideRadius = 30,
            centerStrength = 0.1
        } = options;

        // Left-align: use width/3 instead of width/2 to shift graph toward left
        const xCenter = width / 3;
        const yCenter = height / 2;

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(typeof linkDistance === 'function' ? linkDistance : () => linkDistance)
            )
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(xCenter, yCenter))
            .force('x', d3.forceX(xCenter).strength(centerStrength))
            .force('y', d3.forceY(yCenter).strength(centerStrength))
            .force('collide', d3.forceCollide(collideRadius));

        return simulation;
    },

    // ==================== Drag Behavior ====================

    /**
     * Create a drag behavior for force simulation nodes
     * @param {d3.Simulation} simulation - The force simulation
     * @param {Object} [callbacks] - Optional callback functions
     * @param {Function} [callbacks.onStart] - Called when drag starts
     * @param {Function} [callbacks.onDrag] - Called during drag
     * @param {Function} [callbacks.onEnd] - Called when drag ends
     * @returns {d3.DragBehavior}
     */
    createDragBehavior(simulation, callbacks = {}) {
        if (!this.isAvailable()) return null;

        const { onStart, onDrag, onEnd } = callbacks;

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            if (onStart) onStart(event, d);
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
            if (onDrag) onDrag(event, d);
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            if (onEnd) onEnd(event, d);
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    },

    // ==================== Zoom Behavior ====================

    /**
     * Create a zoom behavior
     * @param {Object} options - Zoom options
     * @param {number[]} [options.scaleExtent=[0.1, 4]] - Min and max zoom scale
     * @param {Function} options.onZoom - Callback function receiving the transform
     * @returns {d3.ZoomBehavior}
     */
    createZoomBehavior(options = {}) {
        if (!this.isAvailable()) return null;

        const { scaleExtent = [0.1, 4], onZoom } = options;

        const zoom = d3.zoom()
            .scaleExtent(scaleExtent)
            .on('zoom', (event) => {
                if (onZoom) onZoom(event.transform);
            });

        return zoom;
    },

    // ==================== Color Scales ====================

    /**
     * Create a categorical color scale
     * @param {Array} [domain] - Optional domain values
     * @param {string} [scheme='category10'] - Color scheme name
     * @returns {d3.ScaleOrdinal}
     */
    createColorScale(domain, scheme = 'category10') {
        if (!this.isAvailable()) return null;

        const schemeMap = {
            'category10': d3.schemeCategory10,
            'paired': d3.schemePaired,
            'set1': d3.schemeSet1,
            'set2': d3.schemeSet2,
            'set3': d3.schemeSet3,
            'pastel1': d3.schemePastel1,
            'pastel2': d3.schemePastel2
        };

        const colorScheme = schemeMap[scheme] || d3.schemeCategory10;
        const scale = d3.scaleOrdinal(colorScheme);

        if (domain) {
            scale.domain(domain);
        }

        return scale;
    },

    /**
     * Brighten or darken a color
     * @param {string} color - Color value
     * @param {number} [amount=0.5] - Brightness adjustment (positive = brighter, negative = darker)
     * @returns {string} Adjusted color
     */
    adjustColor(color, amount = 0.5) {
        if (!this.isAvailable()) return color;
        const d3Color = d3.color(color);
        if (!d3Color) return color;
        return amount >= 0 ? d3Color.brighter(amount).toString() : d3Color.darker(-amount).toString();
    },

    // ==================== Tooltip ====================

    /**
     * Show a tooltip at the event position
     * @param {Event} event - Mouse event
     * @param {string|Node|DocumentFragment|Array<Node>} content - Content for tooltip
     * @param {Object} [options] - Tooltip options
     * @param {string} [options.className='tooltip'] - CSS class
     * @param {number} [options.offsetX=10] - X offset from cursor
     * @param {number} [options.offsetY=10] - Y offset from cursor
     */
    showTooltip(event, content, options = {}) {
        if (!this.isAvailable()) return;

        const { className = 'tooltip', offsetX = 10, offsetY = 10 } = options;

        // Create or reuse tooltip
        if (!this._tooltip) {
            this._tooltip = d3.select('body')
                .append('div')
                .attr('class', className);
        } else if (className && this._tooltip.attr('class') !== className) {
            this._tooltip.attr('class', className);
        }

        const tooltipNode = this._tooltip.node();
        if (tooltipNode) {
            this._clearElement(tooltipNode);
            this._appendTooltipContent(tooltipNode, content);
            this._setTooltipPosition(tooltipNode, event.pageX + offsetX, event.pageY + offsetY);
        }

        this._tooltip.classed('tooltip--visible', true);
    },

    /**
     * Hide the tooltip
     */
    hideTooltip() {
        if (this._tooltip) {
            this._tooltip.classed('tooltip--visible', false);
        }
    },

    /**
     * Create a managed tooltip that auto-hides
     * @param {Object} [options] - Tooltip configuration
     * @returns {Object} Tooltip controller with show/hide methods
     */
    createTooltipController(options = {}) {
        const service = this;
        return {
            show(event, content) {
                service.showTooltip(event, content, options);
            },
            hide() {
                service.hideTooltip();
            }
        };
    },

    _appendTooltipContent(container, content) {
        if (!container || content === undefined || content === null) return;
        if (Array.isArray(content)) {
            content.forEach(item => this._appendTooltipContent(container, item));
            return;
        }
        if (content && typeof content === 'object' && 'nodeType' in content) {
            container.appendChild(content);
            return;
        }
        container.textContent = String(content);
    },

    _setTooltipPosition(container, x, y) {
        if (!container) return;
        const styles = {
            '--tooltip-x': `${x}px`,
            '--tooltip-y': `${y}px`
        };
        styleVars.set(container, styles);
    },

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    // ==================== Legend Helpers ====================

    /**
     * Create a simple legend
     * @param {d3.Selection} container - Container selection
     * @param {Array} items - Legend items [{label, color, shape?}]
     * @param {Object} [options] - Legend options
     * @param {number} [options.itemHeight=20] - Height per item
     * @param {number} [options.symbolSize=15] - Size of color symbol
     */
    createLegend(container, items, options = {}) {
        if (!this.isAvailable()) return;

        const { itemHeight = 20, symbolSize = 15 } = options;

        const legend = container.selectAll('.legend-item')
            .data(items)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * itemHeight})`);

        // Color box
        legend.append('rect')
            .attr('width', symbolSize)
            .attr('height', symbolSize)
            .attr('fill', d => d.color)
            .attr('rx', d => d.shape === 'circle' ? symbolSize / 2 : 2);

        // Label
        legend.append('text')
            .attr('x', symbolSize + 8)
            .attr('y', symbolSize / 2)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .text(d => d.label);

        return legend;
    },

    // ==================== Utility Functions ====================

    /**
     * Wrap long text to multiple lines
     * @param {d3.Selection} textSelection - Text element selection
     * @param {number|Function} width - Width limit or function returning width
     */
    wrapText(textSelection, width) {
        if (!this.isAvailable()) return;

        textSelection.each(function () {
            const text = d3.select(this);
            const words = text.text().split(/\s+/).reverse();
            const lineHeight = 1.1;
            const y = text.attr('y');
            const dy = parseFloat(text.attr('dy') || 0);

            let word;
            let line = [];
            let lineNumber = 0;
            let tspan = text.text(null)
                .append('tspan')
                .attr('x', text.attr('x'))
                .attr('y', y)
                .attr('dy', `${dy}em`);

            const maxWidth = typeof width === 'function' ? width() : width;

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = text.append('tspan')
                        .attr('x', text.attr('x'))
                        .attr('y', y)
                        .attr('dy', `${++lineNumber * lineHeight + dy}em`)
                        .text(word);
                }
            }
        });
    },

    /**
     * Calculate node radius based on value
     * @param {number} value - Value to scale
     * @param {Object} [options] - Scaling options
     * @param {number} [options.min=10] - Minimum radius
     * @param {number} [options.max=40] - Maximum radius
     * @param {number} [options.scale=1] - Scale factor
     * @returns {number} Calculated radius
     */
    calculateRadius(value, options = {}) {
        const { min = 10, max = 40, scale = 1 } = options;
        const base = Math.sqrt(Math.abs(value || 1)) * scale;
        return Math.max(min, Math.min(max, min + base));
    }
};
