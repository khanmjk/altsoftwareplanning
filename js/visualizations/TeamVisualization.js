/**
 * TeamVisualization - Team Relationships visualization
 * 
 * Displays a force-directed graph showing:
 * - Teams as nodes colored distinctly
 * - Links between teams based on service dependencies
 * 
 * @extends BaseVisualization
 */
class TeamVisualization extends BaseVisualization {
    constructor(config = {}) {
        super({
            containerId: 'teamVisualization',
            svgId: 'teamSvg',
            legendId: 'teamLegend',
            simulation: {
                linkDistance: 150,
                chargeStrength: -500,
                collideRadius: 50
            },
            ...config
        });

        this.teamColorScale = null;
        this.systemData = null;
    }

    /**
     * Render the team visualization
     * @param {Object} systemData - The current system data
     */
    render(systemData) {
        if (!systemData) {
            console.error('TeamVisualization: No system data provided');
            return;
        }

        this.systemData = systemData;

        if (!this.init()) return;

        this.prepareData();
        this.createSimulation();

        const link = this.drawLinks({ strokeWidth: 2 });

        const colors = ThemeService.getThemeColors();
        const node = this.graphGroup.append('g')
            .attr('stroke', colors.bgPrimary || '#fff')
            .attr('stroke-width', 2)
            .selectAll('circle')
            .data(this.nodes)
            .join('circle')
            .attr('r', 20)
            .attr('fill', d => d.color)
            .call(this.createDragBehavior());

        const labels = this.drawLabels(
            d => d.name,
            { dy: 4, fontSize: '10px' }
        );

        this.attachTooltips(node, d => this.getTooltipContent(d));
        this.setupTick({ link, node, labels }, 20);
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
        const teamIds = this.systemData.teams.map(team => team.teamId);
        this.teamColorScale = D3Service.createColorScale(teamIds);

        // Map teamId to services
        const teamServicesMap = {};
        this.systemData.services.forEach(service => {
            const teamId = service.owningTeamId;
            if (teamId) {
                if (!teamServicesMap[teamId]) {
                    teamServicesMap[teamId] = [];
                }
                teamServicesMap[teamId].push(service.serviceName);
            }
        });

        // Create nodes for teams
        this.systemData.teams.forEach(team => {
            if (team.teamId) {
                this.nodes.push({
                    id: team.teamId,
                    name: team.teamIdentity,
                    type: 'team',
                    color: this.teamColorScale(team.teamId),
                    services: teamServicesMap[team.teamId] || []
                });
                nodeMap[team.teamId] = { id: team.teamId };
            }
        });

        // Create links based on service dependencies
        const teamDependencies = {};

        this.systemData.services.forEach(service => {
            const owningTeamId = service.owningTeamId;
            if (owningTeamId && this.systemData.teams.some(t => t.teamId === owningTeamId)) {
                if (service.serviceDependencies.length > 0) {
                    service.serviceDependencies.forEach(dependentServiceName => {
                        const dependentService = this.systemData.services.find(s => s.serviceName === dependentServiceName);
                        if (dependentService) {
                            const dependentTeamId = dependentService.owningTeamId;
                            if (dependentTeamId && owningTeamId !== dependentTeamId &&
                                this.systemData.teams.some(t => t.teamId === dependentTeamId)) {
                                const linkKey = `${owningTeamId}-${dependentTeamId}`;
                                if (!teamDependencies[linkKey]) {
                                    teamDependencies[linkKey] = true;
                                    this.links.push({
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
    }

    /**
     * Get tooltip content for a node
     * @param {Object} d - Node data
     * @returns {string} HTML content
     */
    getTooltipContent(d) {
        const team = this.systemData.teams.find(t => t.teamId === d.id);
        const sdm = this.systemData.sdms.find(s => s.sdmId === team.sdmId);
        const pmt = this.systemData.pmts.find(p => p.pmtId === team.pmtId);
        const services = d.services.join(', ') || 'None';

        return `<strong>Team Identity:</strong> ${team.teamIdentity}<br>
                <strong>Team Name:</strong> ${team.teamName}<br>
                <strong>SDM:</strong> ${sdm ? sdm.sdmName : 'N/A'}<br>
                <strong>PMT:</strong> ${pmt ? pmt.pmtName : 'N/A'}<br>
                <strong>Size of Team:</strong> ${team.fundedHeadcount !== undefined ? team.fundedHeadcount : (team.engineers ? team.engineers.length : 'N/A')}<br>
                <strong>Engineer Names:</strong> ${(team.engineers && team.engineers.length > 0) ? team.engineers.join(', ') : 'None'}<br>
                <strong>Services Owned:</strong> ${services}`;
    }

    /**
     * Render the team legend
     */
    renderTeamLegend() {
        const legendData = this.systemData.teams.map(team => ({
            label: team.teamIdentity,
            color: this.teamColorScale(team.teamId)
        }));

        this.renderLegend(legendData);
    }
}
