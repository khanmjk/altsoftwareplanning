/**
 * ServiceVisualization - Service Relationships visualization
 * 
 * Displays a force-directed graph showing:
 * - Services and their dependencies
 * - Platform dependencies (when enabled)
 * - Selected service highlighting
 * 
 * @extends BaseVisualization
 */
class ServiceVisualization extends BaseVisualization {
    constructor(config = {}) {
        super({
            containerId: 'serviceRelationshipsVisualization',
            svgId: 'serviceSvg',
            legendId: 'serviceLegend',
            simulation: {
                linkDistance: 150,
                chargeStrength: -500,
                collideRadius: 50
            },
            ...config
        });

        this.showPlatformComponents = config.showPlatformComponents !== false;
        this.teamColorScale = null;
        this.selectedServiceName = null;
    }

    /**
     * Render the service visualization
     * @param {Array} services - Array of service objects to display
     * @param {string|null} selectedServiceName - Name of the selected/highlighted service
     */
    render(services, selectedServiceName = null) {
        this.selectedServiceName = selectedServiceName;

        if (!this.init()) return;

        const systemData = SystemService.getCurrentSystem();

        this.prepareData(services, systemData);
        this.createSimulation();

        // Note: Links are appended after nodes to get correct reference
        const colors = ThemeService.getThemeColors();
        const node = this.graphGroup.append('g')
            .selectAll('circle')
            .data(this.nodes)
            .join('circle')
            .attr('r', d => d.isSelected ? 25 : 20)
            .attr('fill', d => d.color)
            .attr('stroke', d => d.isSelected ? (colors.danger || 'red') : (colors.bgPrimary || '#fff'))
            .attr('stroke-width', d => d.isSelected ? 4 : 2)
            .call(this.createDragBehavior());

        const labels = this.graphGroup.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.nodes)
            .join('text')
            .attr('dx', 0)
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .text(d => d.id);

        const link = this.graphGroup.append('g')
            .attr('stroke', colors.textMuted || '#aaa')
            .selectAll('line')
            .data(this.links)
            .join('line')
            .attr('stroke-dasharray', d => {
                if (d.type === 'service-dependency') return '5,5';
                if (d.type === 'platform-dependency') return '10,5';
                return '1,0';
            })
            .attr('stroke-width', 2);

        this.attachTooltips(node, d => this.getTooltipContent(d));
        this.setupTick({ link, node, labels }, 20);
        this.renderTeamLegend();
    }

    /**
     * Prepare nodes and links from service data
     */
    prepareData(services, systemData) {
        this.nodes = [];
        this.links = [];
        const nodeMap = {};

        // Create team color scale
        const teamIds = systemData.teams.map(team => team.teamId);
        this.teamColorScale = D3Service.createColorScale(teamIds);

        // Create service map for quick lookup
        this.serviceMap = {};
        systemData.services.forEach(service => {
            this.serviceMap[service.serviceName] = service;
        });

        // Create nodes for services
        services.forEach(service => {
            const teamId = service.owningTeamId || 'unassigned';
            const nodeColor = this.teamColorScale(teamId);
            const isSelected = service.serviceName === this.selectedServiceName;

            this.nodes.push({
                id: service.serviceName,
                type: 'service',
                teamId: teamId,
                color: nodeColor,
                isSelected: isSelected
            });
            nodeMap[service.serviceName] = { id: service.serviceName, type: 'service' };
        });

        // Add platform dependencies as nodes
        if (this.showPlatformComponents) {
            services.forEach(service => {
                if (service.platformDependencies) {
                    service.platformDependencies.forEach(platform => {
                        if (!nodeMap[platform]) {
                            this.nodes.push({
                                id: platform,
                                type: 'platform',
                                color: ThemeService.getThemeColors().danger || '#a04040',
                                isSelected: false
                            });
                            nodeMap[platform] = { id: platform, type: 'platform' };
                        }
                        this.links.push({
                            source: service.serviceName,
                            target: platform,
                            type: 'platform-dependency'
                        });
                    });
                }
            });
        }

        // Create links based on service dependencies
        services.forEach(service => {
            service.serviceDependencies.forEach(dependency => {
                if (nodeMap[dependency]) {
                    this.links.push({
                        source: service.serviceName,
                        target: dependency,
                        type: 'service-dependency'
                    });
                }
            });
        });
    }

    /**
     * Get tooltip content for a node
     * @param {Object} d - Node data
     * @returns {string} HTML content
     */
    getTooltipContent(d) {
        if (d.type === 'service') {
            const service = this.serviceMap[d.id];
            const systemData = SystemService.getCurrentSystem();
            const team = systemData.teams.find(t => t.teamId === service.owningTeamId);
            return `<strong>Service Name:</strong> ${service.serviceName}<br>
                    <strong>Description:</strong> ${service.serviceDescription}<br>
                    <strong>Team:</strong> ${team ? `${team.teamName} (${team.teamIdentity})` : 'Unassigned'}`;
        } else if (d.type === 'platform') {
            return `<strong>Platform Dependency:</strong> ${d.id}`;
        }
        return '';
    }

    /**
     * Render the team legend
     */
    renderTeamLegend() {
        const systemData = SystemService.getCurrentSystem();
        const legendData = systemData.teams.map(team => ({
            label: team.teamIdentity,
            color: this.teamColorScale(team.teamId)
        }));

        this.renderLegend(legendData);
    }

    /**
     * Update the platform components visibility
     * @param {boolean} show - Whether to show platform components
     */
    setShowPlatformComponents(show) {
        this.showPlatformComponents = show;
    }
}
