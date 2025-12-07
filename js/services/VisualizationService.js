/**
 * VisualizationService.js
 * 
 * Domain logic for preparing visualization data (graphs, trees, tables).
 * Pure data transformations, decoupled from D3/Mermaid rendering.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const VisualizationService = {

    /**
     * Recursively collects all service dependencies.
     * @param {object} systemData
     * @param {object} service
     * @param {object} collectedServices
     * @param {object} visitedServices
     * @returns {Array} List of dependent services
     */
    getServiceDependencies(systemData, service, collectedServices = {}, visitedServices = {}) {
        if (!systemData || !service || visitedServices[service.serviceName]) {
            return [];
        }
        visitedServices[service.serviceName] = true;
        collectedServices[service.serviceName] = service;

        // Recursively collect dependencies
        if (service.serviceDependencies) {
            service.serviceDependencies.forEach(depName => {
                const depService = (systemData.services || []).find(s => s.serviceName === depName);
                if (depService) {
                    this.getServiceDependencies(systemData, depService, collectedServices, visitedServices);
                }
            });
        }

        return Object.values(collectedServices);
    },

    /**
     * Prepares data for the Service Dependencies Table.
     * @param {object} systemData
     * @returns {Array} Array of row data objects
     */
    prepareServiceDependenciesTableData(systemData) {
        if (!systemData || !Array.isArray(systemData.services)) {
            return [];
        }

        const services = systemData.services || [];
        const teams = systemData.teams || [];

        return services.map(service => {
            const team = teams.find(t => t.teamId === service.owningTeamId);
            const upstreamServices = service.serviceDependencies || [];
            const platformDependencies = service.platformDependencies || [];
            const downstreamServices = services
                .filter(s => (s.serviceDependencies || []).includes(service.serviceName))
                .map(s => s.serviceName);

            return {
                id: service.serviceName,
                serviceName: service.serviceName,
                description: service.serviceDescription || '',
                owningTeam: team ? (team.teamIdentity || team.teamName || team.teamId) : 'Unassigned',
                upstreamDependencies: upstreamServices,
                platformDependencies: platformDependencies,
                downstreamDependencies: downstreamServices,
                upstreamDependenciesText: upstreamServices.length > 0 ? upstreamServices.join(', ') : 'None',
                platformDependenciesText: platformDependencies.length > 0 ? platformDependencies.join(', ') : 'None',
                downstreamDependenciesText: downstreamServices.length > 0 ? downstreamServices.join(', ') : 'None'
            };
        });
    },

    /**
     * Builds a graph structure (nodes, links) for service dependencies using BFS.
     * @param {object} systemData
     * @param {string} serviceName
     * @param {object} options - { showPlatformComponents: boolean }
     * @returns {object} { nodes, links }
     */
    buildDependencyGraph(systemData, serviceName, options = { showPlatformComponents: true }) {
        if (!systemData || !serviceName) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const nodeMap = {};
        const serviceMap = {};

        (systemData.services || []).forEach(service => {
            serviceMap[service.serviceName] = service;
        });

        const queue = [];
        const visited = new Set();

        queue.push(serviceName);
        visited.add(serviceName);

        while (queue.length > 0) {
            const currentServiceName = queue.shift();
            const currentService = serviceMap[currentServiceName];

            if (!currentService) continue;

            if (!nodeMap[currentServiceName]) {
                nodes.push({ id: currentServiceName, type: 'service' });
                nodeMap[currentServiceName] = true; // Mark as added to nodes array
            }

            // Process upstream dependencies
            if (currentService.serviceDependencies) {
                currentService.serviceDependencies.forEach(depName => {
                    if (!nodeMap[depName]) {
                        nodes.push({ id: depName, type: 'service' });
                        nodeMap[depName] = true;
                    }
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
            }

            // Process platform dependencies
            if (options.showPlatformComponents) {
                if (currentService.platformDependencies) {
                    currentService.platformDependencies.forEach(platform => {
                        if (!nodeMap[platform]) {
                            nodes.push({ id: platform, type: 'platform' });
                            nodeMap[platform] = true;
                        }
                        links.push({
                            source: platform,
                            target: currentServiceName,
                            type: 'platform-dependency',
                        });
                    });
                }
            }

            // Process downstream dependents
            (systemData.services || []).forEach(service => {
                if (service.serviceDependencies && service.serviceDependencies.includes(currentServiceName)) {
                    const dependentName = service.serviceName;
                    if (!nodeMap[dependentName]) {
                        nodes.push({ id: dependentName, type: 'service' });
                        nodeMap[dependentName] = true;
                    }
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
    },

    /**
     * Builds a hierarchical tree structure of upstream and downstream dependencies.
     * @param {object} systemData
     * @param {string} serviceName
     * @returns {object} Tree data object
     */
    buildDependencyTree(systemData, serviceName) {
        if (!systemData || !serviceName) return null;

        const serviceMap = {};
        (systemData.services || []).forEach(service => {
            serviceMap[service.serviceName] = service;
        });

        const rootService = serviceMap[serviceName];
        if (!rootService) return { name: serviceName, children: [] };

        // Recursive function to get upstream dependencies
        const getUpstream = (service, visited = new Set()) => {
            if (!service || visited.has(service.serviceName)) return null;
            visited.add(service.serviceName);

            let dependencies = [];
            if (service.serviceDependencies) {
                service.serviceDependencies.forEach(depName => {
                    const depService = serviceMap[depName];
                    const upstreamNode = getUpstream(depService, visited);
                    if (upstreamNode) {
                        dependencies.push(upstreamNode);
                    } else if (depService) {
                        // Leaf or visited elsewhere (simplify cycle handling)
                        dependencies.push({ name: depService.serviceName, children: [] });
                    }
                });
            }
            return { name: service.serviceName, children: dependencies };
        };

        // Recursive function to get downstream dependencies
        const getDownstream = (service, visited = new Set()) => {
            if (!service || visited.has(service.serviceName)) return null;
            visited.add(service.serviceName);

            let dependents = [];
            (systemData.services || []).forEach(otherService => {
                if (otherService.serviceDependencies && otherService.serviceDependencies.includes(service.serviceName)) {
                    const downstreamNode = getDownstream(otherService, visited);
                    if (downstreamNode) {
                        dependents.push(downstreamNode);
                    } else {
                        dependents.push({ name: otherService.serviceName, children: [] });
                    }
                }
            });

            return { name: service.serviceName, children: dependents };
        };

        const upstreamTree = getUpstream(rootService, new Set()); // Pass new Set to isolate visited
        const downstreamTree = getDownstream(rootService, new Set());

        const treeData = {
            name: rootService.serviceName,
            children: []
        };

        if (upstreamTree && upstreamTree.children && upstreamTree.children.length > 0) {
            treeData.children.push({
                name: 'Upstream Dependencies',
                direction: 'upstream',
                children: upstreamTree.children
            });
        }

        if (downstreamTree && downstreamTree.children && downstreamTree.children.length > 0) {
            treeData.children.push({
                name: 'Downstream Dependencies',
                direction: 'downstream',
                children: downstreamTree.children
            });
        }

        return treeData;
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizationService;
}
