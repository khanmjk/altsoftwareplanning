/**
 * SystemVisualization - Main system visualization showing Services, APIs, and Platforms
 * 
 * Displays a force-directed graph of the system architecture including:
 * - Services colored by owning team
 * - APIs connected to their parent services
 * - Platform dependencies (when enabled)
 * 
 * @extends BaseVisualization
 */
class SystemVisualization extends BaseVisualization {
    /**
     * @param {Object} config - Configuration options
     * @param {boolean} [config.showPlatformComponents=true] - Show platform dependencies
     */
    constructor(config = {}) {
        super({
            containerId: 'visualization',
            svgId: 'systemSvg',
            legendId: 'legend',
            simulation: {
                linkDistance: 100,
                chargeStrength: -300,
                collideRadius: 30
            },
            ...config
        });

        this.showPlatformComponents = config.showPlatformComponents !== false;
        this.teamColorScale = null;
        this.systemData = null;
    }

    /**
     * Render the system visualization
     * @param {Object} systemData - The current system data
     */
    render(systemData) {
        if (!systemData) {
            console.error('SystemVisualization: No system data provided');
            return;
        }

        this.systemData = systemData;

        if (!this.init()) return;

        this.prepareData();
        this.createSimulation(this.getSimulationConfig());

        const link = this.drawLinks({
            strokeDasharray: d => {
                if (d.type === 'api-service') return '2,2';
                if (d.type === 'service-dependency') return '5,5';
                if (d.type === 'platform-dependency') return '10,5';
                if (d.type === 'api-dependency') return '3,3';
                return '1,0';
            }
        });

        const node = this.drawNodes(
            d => d.color,
            10
        );

        const labels = this.drawLabels(
            d => d.id,
            { dy: -15 }
        );

        this.attachTooltips(node, d => this.getTooltipContent(d));
        this.setupTick({ link, node, labels }, 10);
        this.renderTeamLegend();
    }

    /**
     * Prepare nodes and links from system data
     */
    prepareData() {
        this.nodes = [];
        this.links = [];
        const nodeMap = {};

        // Create team color scale
        const teamIds = (this.systemData.teams || []).map(team => team.teamId);
        this.teamColorScale = D3Service.createColorScale(teamIds);

        // Create nodes for services and APIs
        (this.systemData.services || []).forEach(service => {
            const teamId = service.owningTeamId || 'unassigned';
            const nodeColor = this.teamColorScale(teamId);

            this.nodes.push({
                id: service.serviceName,
                type: 'service',
                teamId: teamId,
                color: nodeColor
            });
            nodeMap[service.serviceName] = { id: service.serviceName, type: 'service' };

            (service.apis || []).forEach(api => {
                this.nodes.push({
                    id: api.apiName,
                    type: 'api',
                    teamId: teamId,
                    color: nodeColor
                });
                nodeMap[api.apiName] = { id: api.apiName, type: 'api' };
                this.links.push({
                    source: api.apiName,
                    target: service.serviceName,
                    type: 'api-service'
                });
            });
        });

        // Add platform dependencies as nodes
        if (this.showPlatformComponents) {
            (this.systemData.services || []).forEach(service => {
                (service.platformDependencies || []).forEach(platform => {
                    if (!nodeMap[platform]) {
                        this.nodes.push({
                            id: platform,
                            type: 'platform',
                            color: ThemeService.getThemeColors().danger || '#a04040'
                        });
                        nodeMap[platform] = { id: platform, type: 'platform' };
                    }
                    this.links.push({
                        source: service.serviceName,
                        target: platform,
                        type: 'platform-dependency'
                    });
                });
            });
        }

        // Create links based on dependencies
        (this.systemData.services || []).forEach(service => {
            (service.serviceDependencies || []).forEach(dependency => {
                if (nodeMap[dependency]) {
                    this.links.push({
                        source: service.serviceName,
                        target: dependency,
                        type: 'service-dependency'
                    });
                }
            });
            (service.apis || []).forEach(api => {
                (api.dependentApis || []).forEach(depApi => {
                    if (nodeMap[depApi]) {
                        this.links.push({
                            source: api.apiName,
                            target: depApi,
                            type: 'api-dependency'
                        });
                    }
                });
            });
        });
    }

    /**
     * Get simulation configuration based on node count
     * @returns {Object} Simulation config
     */
    getSimulationConfig() {
        const nodeCount = this.nodes.length;
        let chargeStrength = -300;
        let linkDistance = 100;

        if (nodeCount > 100) {
            chargeStrength = -100;
            linkDistance = 30;
        } else if (nodeCount > 50) {
            chargeStrength = -200;
            linkDistance = 50;
        }

        return { chargeStrength, linkDistance };
    }

    /**
     * Get tooltip content for a node
     * @param {Object} d - Node data
     * @returns {Node} Tooltip content
     */
    getTooltipContent(d) {
        if (d.type === 'service') {
            const service = (this.systemData.services || []).find(s => s.serviceName === d.id);
            const team = service ? (this.systemData.teams || []).find(t => t.teamId === service.owningTeamId) : null;
            return this._buildTooltipContent([
                { label: 'Service', value: d.id },
                { label: 'Team', value: team ? (team.teamName || team.teamIdentity) : 'Unassigned' },
                { label: 'Description', value: service?.serviceDescription || 'N/A' }
            ]);
        }
        if (d.type === 'api') {
            let api;
            let serviceName;
            (this.systemData.services || []).forEach(service => {
                (service.apis || []).forEach(a => {
                    if (a.apiName === d.id) {
                        api = a;
                        serviceName = service.serviceName;
                    }
                });
            });
            return this._buildTooltipContent([
                { label: 'API', value: d.id },
                { label: 'Service', value: serviceName || 'N/A' },
                { label: 'Description', value: api?.apiDescription || 'N/A' }
            ]);
        }
        if (d.type === 'platform') {
            return this._buildTooltipContent([
                { label: 'Platform', value: d.id }
            ]);
        }
        return this._buildTooltipContent([{ label: 'Item', value: d.id }]);
    }

    /**
     * Render the team legend
     */
    renderTeamLegend() {
        const legendData = (this.systemData.teams || []).map(team => ({
            label: team.teamIdentity || team.teamName || team.teamId,
            color: this.teamColorScale(team.teamId)
        }));

        if (this.showPlatformComponents) {
            legendData.push({ label: 'Platform Dependency', color: ThemeService.getThemeColors().danger || '#a04040' });
        }

        this.renderLegend(legendData);
    }

    /**
     * Update the platform components visibility
     * @param {boolean} show - Whether to show platform components
     */
    setShowPlatformComponents(show) {
        this.showPlatformComponents = show;
        if (this.systemData) {
            this.render(this.systemData);
        }
    }
}
