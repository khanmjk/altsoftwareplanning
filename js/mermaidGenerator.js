function generateMermaidSyntax(systemData) {
    const includePlatforms = (typeof showPlatformComponents === 'undefined') ? true : !!showPlatformComponents;
    const data = systemData || {};
    const lines = ['graph TD'];
    const classDefLines = [
        'classDef serviceNode fill:#eef2ff,stroke:#4a5568,stroke-width:1px;',
        'classDef platformNode fill:#fff7ed,stroke:#b7791f,stroke-width:1px,stroke-dasharray: 3 2;'
    ];

    const teams = Array.isArray(data.teams) ? [...data.teams] : [];
    const services = Array.isArray(data.services) ? [...data.services] : [];
    const teamById = new Map(teams.map(team => [team.teamId, team]));

    teams.sort((a, b) => getTeamName(a).localeCompare(getTeamName(b)));
    services.sort((a, b) => getServiceLabel(a).localeCompare(getServiceLabel(b)));

    const idRegistry = new Map();
    const serviceLookup = new Map();
    const teamIdSet = new Set(teams.map(team => team.teamId));
    const serviceNodeIds = new Set();
    const platformNodes = new Map();
    const edges = [];

    services.forEach(service => {
        const label = getServiceDisplayLabel(service);
        const nodeId = createStableId(label, 'svc');
        registerServiceLookup(serviceLookup, service, nodeId, label);
    });

    teams.forEach(team => {
        const teamLabel = getTeamName(team);
        const clusterId = createStableId(team.teamId || teamLabel, 'team');
        lines.push(`subgraph cluster_${clusterId}["${escapeLabel(teamLabel)}"]`);
        const teamServices = services.filter(service => service.owningTeamId === team.teamId);
        teamServices.forEach(service => {
            const nodeInfo = getServiceNodeInfo(serviceLookup, service);
            if (nodeInfo && !serviceNodeIds.has(nodeInfo.id)) {
                lines.push(`    ${nodeInfo.id}["${escapeLabel(nodeInfo.label)}"]`);
                serviceNodeIds.add(nodeInfo.id);
            }
        });
        lines.push('end');
    });

    const unassignedServices = services.filter(service => !service.owningTeamId || !teamIdSet.has(service.owningTeamId));
    if (unassignedServices.length > 0) {
        lines.push('subgraph cluster_unassigned["Unassigned"]');
        unassignedServices.forEach(service => {
            const nodeInfo = getServiceNodeInfo(serviceLookup, service);
            if (nodeInfo && !serviceNodeIds.has(nodeInfo.id)) {
                lines.push(`    ${nodeInfo.id}["${escapeLabel(nodeInfo.label)}"]`);
                serviceNodeIds.add(nodeInfo.id);
            }
        });
        lines.push('end');
    }

    Array.from(serviceLookup.values())
        .filter(nodeInfo => !serviceNodeIds.has(nodeInfo.id))
        .sort((a, b) => a.label.localeCompare(b.label))
        .forEach(nodeInfo => {
            lines.push(`${nodeInfo.id}["${escapeLabel(nodeInfo.label)}"]`);
            serviceNodeIds.add(nodeInfo.id);
        });

    services.forEach(service => {
        const source = getServiceNodeInfo(serviceLookup, service);
        if (!source) return;

        const dependencies = Array.isArray(service.serviceDependencies) ? [...service.serviceDependencies].sort((a, b) => a.localeCompare(b)) : [];
        dependencies.forEach(dep => {
            const target = getServiceNodeInfo(serviceLookup, dep);
            if (target) edges.push(`${source.id} --> ${target.id}`);
        });

        if (includePlatforms) {
            const platforms = Array.isArray(service.platformDependencies) ? [...service.platformDependencies].sort((a, b) => a.localeCompare(b)) : [];
            platforms.forEach(platformName => {
                const normalized = normalizeKey(platformName);
                if (!normalized) return;
                if (!platformNodes.has(normalized)) {
                    const platformId = createStableId(platformName, 'plat');
                    platformNodes.set(normalized, { id: platformId, label: platformName });
                }
                const platformInfo = platformNodes.get(normalized);
                edges.push(`${source.id} -.-> ${platformInfo.id}`);
            });
        }
    });

    if (includePlatforms && platformNodes.size > 0) {
        Array.from(platformNodes.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .forEach(node => {
                lines.push(`${node.id}[("${escapeLabel(node.label)}")]`);
            });
    }

    classDefLines.forEach(line => lines.push(line));

    if (serviceNodeIds.size > 0) {
        lines.push(`class ${Array.from(serviceNodeIds).join(',')} serviceNode;`);
    }

    if (includePlatforms && platformNodes.size > 0) {
        const platformIds = Array.from(platformNodes.values()).map(node => node.id);
        lines.push(`class ${platformIds.join(',')} platformNode;`);
    }

    edges.forEach(edge => lines.push(edge));

    return lines.join('\n');

    function getTeamName(team) {
        if (!team) return 'Team';
        const formal = (team.teamName || '').trim();
        const friendly = (team.teamIdentity || '').trim();
        const hasBoth = formal && friendly;
        const sameLabel = hasBoth && formal.toLowerCase() === friendly.toLowerCase();
        if (hasBoth && !sameLabel) {
            return `${formal} (${friendly})`;
        }
        return formal || friendly || team.teamId || 'Team';
    }

    function getServiceLabel(service) {
        return (service && (service.serviceName || service.serviceId || service.name)) ? (service.serviceName || service.serviceId || service.name) : 'Service';
    }

    function getServiceDisplayLabel(service) {
        const base = getServiceLabel(service);
        const teamLabel = teamById.has(service?.owningTeamId) ? getTeamName(teamById.get(service.owningTeamId)) : '';
        if (teamLabel) {
            return `${base}<br/>${teamLabel}`;
        }
        return base;
    }

    function escapeLabel(label) {
        return (label || '').toString().replace(/"/g, '\\"');
    }

    function normalizeKey(value) {
        if (value === null || value === undefined) return null;
        return value.toString().trim().toLowerCase();
    }

    function createStableId(rawValue, prefix) {
        const rawString = (rawValue === undefined || rawValue === null) ? '' : rawValue.toString();
        const sanitizedBase = rawString.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '') || prefix;
        const baseId = /^[a-zA-Z]/.test(sanitizedBase) ? sanitizedBase : `${prefix}_${sanitizedBase}`;
        let candidate = baseId;
        let counter = 1;

        while (idRegistry.has(candidate) && idRegistry.get(candidate) !== rawString) {
            candidate = `${baseId}_${counter++}`;
        }
        idRegistry.set(candidate, rawString);
        return candidate;
    }

    function registerServiceLookup(lookup, service, nodeId, label) {
        const nameKey = normalizeKey(service?.serviceName) || normalizeKey(label);
        const idKey = normalizeKey(service?.serviceId);
        if (nameKey && !lookup.has(nameKey)) lookup.set(nameKey, { id: nodeId, label });
        if (idKey && !lookup.has(idKey)) lookup.set(idKey, { id: nodeId, label });
    }

    function getServiceNodeInfo(lookup, serviceOrName) {
        if (!serviceOrName) return null;
        const key = typeof serviceOrName === 'string'
            ? normalizeKey(serviceOrName)
            : (normalizeKey(serviceOrName.serviceName) || normalizeKey(serviceOrName.serviceId) || normalizeKey(serviceOrName.name));

        if (key && lookup.has(key)) {
            return lookup.get(key);
        }

        if (typeof serviceOrName === 'string') {
            const fallbackId = createStableId(serviceOrName, 'svc');
            const fallbackLabel = serviceOrName;
            registerServiceLookup(lookup, { serviceName: serviceOrName }, fallbackId, fallbackLabel);
            return { id: fallbackId, label: fallbackLabel };
        }

        const fallbackLabel = getServiceLabel(serviceOrName);
        const fallbackId = createStableId(fallbackLabel, 'svc');
        registerServiceLookup(lookup, serviceOrName, fallbackId, fallbackLabel);
        return { id: fallbackId, label: fallbackLabel };
    }
}

if (typeof window !== 'undefined') {
    window.generateMermaidSyntax = generateMermaidSyntax;
}

function generateMermaidApiSyntax(systemData, options = {}) {
    const includePlatforms = (typeof showPlatformComponents === 'undefined') ? true : !!showPlatformComponents;
    const selectedService = options.selectedService || 'all';
    const data = systemData || {};
    const services = Array.isArray(data.services) ? [...data.services] : [];
    const teams = Array.isArray(data.teams) ? [...data.teams] : [];
    const teamById = new Map(teams.map(team => [team.teamId, team]));

    const lines = ['graph LR'];
    const classDefLines = [
        'classDef serviceNode fill:#e2e8f0,stroke:#2d3748,stroke-width:1px;',
        'classDef apiNode fill:#f0fff4,stroke:#276749,stroke-width:1px;',
        'classDef platformNode fill:#fff7ed,stroke:#b7791f,stroke-width:1px,stroke-dasharray: 3 2;'
    ];

    const idRegistry = new Map();
    const apiMapByName = new Map();
    const apiMapByKey = new Map();
    const serviceMap = new Map();
    services.forEach(service => serviceMap.set(service.serviceName, service));

    services.forEach(service => {
        (service.apis || []).forEach(api => {
            const key = `${service.serviceName}::${api.apiName}`;
            const id = createStableId(`${service.serviceName}_${api.apiName}`, 'api');
            const apiInfo = { id, api, service };
            apiMapByKey.set(key, apiInfo);
            if (!apiMapByName.has(api.apiName)) {
                apiMapByName.set(api.apiName, apiInfo);
            }
        });
    });

    const includedServices = new Set();
    const includedApis = new Set();
    if (selectedService !== 'all' && serviceMap.has(selectedService)) {
        const queue = [];
        const svc = serviceMap.get(selectedService);
        includedServices.add(svc.serviceName);
        (svc.apis || []).forEach(api => {
            const apiInfo = apiMapByKey.get(`${svc.serviceName}::${api.apiName}`);
            if (apiInfo) {
                queue.push(apiInfo);
                includedApis.add(apiInfo.id);
            }
        });
        while (queue.length) {
            const current = queue.shift();
            const deps = Array.isArray(current.api.dependentApis) ? current.api.dependentApis : [];
            deps.forEach(depName => {
                const targetApi = apiMapByName.get(depName);
                if (targetApi && !includedApis.has(targetApi.id)) {
                    includedApis.add(targetApi.id);
                    queue.push(targetApi);
                    includedServices.add(targetApi.service.serviceName);
                }
            });
        }
        // Add services referenced via serviceDependencies for context
        (svc.serviceDependencies || []).forEach(depServiceName => includedServices.add(depServiceName));
    } else {
        services.forEach(s => includedServices.add(s.serviceName));
        apiMapByKey.forEach(apiInfo => includedApis.add(apiInfo.id));
    }

    const platformNodes = new Map();
    const edges = [];
    const serviceNodes = [];
    const apiNodes = [];

    services
        .filter(service => includedServices.has(service.serviceName))
        .sort((a, b) => getServiceLabel(a).localeCompare(getServiceLabel(b)))
        .forEach(service => {
            const svcId = createStableId(service.serviceName, 'svc');
            serviceNodes.push({ id: svcId, label: getServiceDisplayLabel(service), teamId: service.owningTeamId });

            (service.apis || []).forEach(api => {
                const apiInfo = apiMapByKey.get(`${service.serviceName}::${api.apiName}`);
                if (!apiInfo) return;
                if (selectedService !== 'all' && !includedApis.has(apiInfo.id)) return;
                apiNodes.push({
                    id: apiInfo.id,
                    label: api.apiName,
                    serviceId: svcId,
                    teamId: service.owningTeamId
                });
            });

            if (includePlatforms && (service.platformDependencies || []).length) {
                service.platformDependencies.forEach(platformName => {
                    const normalized = normalizeKey(platformName);
                    if (!normalized) return;
                    if (!platformNodes.has(normalized)) {
                        const platId = createStableId(platformName, 'plat');
                        platformNodes.set(normalized, { id: platId, label: platformName });
                    }
                    const platInfo = platformNodes.get(normalized);
                    edges.push(`${svcId} -.-> ${platInfo.id}`);
                });
            }

            if (selectedService === 'all') {
                (service.serviceDependencies || []).forEach(depSvcName => {
                    const depSvc = serviceMap.get(depSvcName);
                    if (!depSvc) return;
                    const depSvcId = createStableId(depSvc.serviceName, 'svc');
                    edges.push(`${svcId} -.-> ${depSvcId}`);
                });
            } else if (service.serviceName === selectedService) {
                (service.serviceDependencies || []).forEach(depSvcName => {
                    const depSvc = serviceMap.get(depSvcName);
                    if (!depSvc) return;
                    const depSvcId = createStableId(depSvc.serviceName, 'svc');
                    edges.push(`${svcId} -.-> ${depSvcId}`);
                });
            }
        });

    apiMapByKey.forEach(apiInfo => {
        if (selectedService !== 'all' && !includedApis.has(apiInfo.id)) return;
        const sourceId = apiInfo.id;
        const deps = Array.isArray(apiInfo.api.dependentApis) ? apiInfo.api.dependentApis : [];
        deps.forEach(depName => {
            const target = apiMapByName.get(depName);
            if (!target) return;
            if (selectedService !== 'all' && !includedApis.has(target.id)) return;
            edges.push(`${sourceId} --> ${target.id}`);
        });
    });

    // Group by team, nest services, then APIs
    const servicesByTeam = new Map();
    serviceNodes.forEach(svc => {
        const teamId = svc.teamId || 'unassigned';
        if (!servicesByTeam.has(teamId)) servicesByTeam.set(teamId, []);
        servicesByTeam.get(teamId).push(svc);
    });

    const apiByServiceId = new Map();
    apiNodes.forEach(apiNode => {
        if (!apiByServiceId.has(apiNode.serviceId)) apiByServiceId.set(apiNode.serviceId, []);
        apiByServiceId.get(apiNode.serviceId).push(apiNode);
    });

    servicesByTeam.forEach((svcList, teamId) => {
        const teamLabel = getTeamLabel(teamById.get(teamId) || { teamName: 'Unassigned', teamIdentity: '' });
        const teamClusterId = createStableId(`team_${teamId}`, 'team');
        lines.push(`subgraph cluster_${teamClusterId}["${escapeLabel(teamLabel)}"]`);
        svcList.forEach(svc => {
            lines.push(`  subgraph ${svc.id}["${escapeLabel(svc.label)}"]`);
            const apis = apiByServiceId.get(svc.id) || [];
            apis.forEach(apiNode => {
                lines.push(`    ${apiNode.id}["${escapeLabel(apiNode.label)}"]`);
            });
            lines.push('  end');
        });
        lines.push('end');
    });

    if (includePlatforms && platformNodes.size > 0) {
        Array.from(platformNodes.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .forEach(node => {
                lines.push(`${node.id}[("${escapeLabel(node.label)}")]`);
            });
    }

    classDefLines.forEach(line => lines.push(line));
    if (serviceNodes.length > 0) {
        lines.push(`class ${serviceNodes.map(s => s.id).join(',')} serviceNode;`);
    }
    if (apiNodes.length > 0) {
        lines.push(`class ${apiNodes.map(a => a.id).join(',')} apiNode;`);
    }
    if (includePlatforms && platformNodes.size > 0) {
        const platformIds = Array.from(platformNodes.values()).map(node => node.id);
        lines.push(`class ${platformIds.join(',')} platformNode;`);
    }
    edges.forEach(edge => lines.push(edge));
    return lines.join('\n');

    function getServiceLabel(service) {
        return (service && (service.serviceName || service.serviceId || service.name)) ? (service.serviceName || service.serviceId || service.name) : 'Service';
    }

    function getServiceDisplayLabel(service) {
        const base = getServiceLabel(service);
        const teamLabel = teamById.has(service?.owningTeamId) ? getTeamLabel(teamById.get(service.owningTeamId)) : '';
        if (teamLabel) {
            return `${base}<br/>${teamLabel}`;
        }
        return base;
    }

    function getTeamLabel(team) {
        if (!team) return 'Team';
        const formal = (team.teamName || '').trim();
        const friendly = (team.teamIdentity || '').trim();
        const hasBoth = formal && friendly;
        const sameLabel = hasBoth && formal.toLowerCase() === friendly.toLowerCase();
        if (hasBoth && !sameLabel) {
            return `${formal} (${friendly})`;
        }
        return formal || friendly || team.teamId || 'Team';
    }

    function escapeLabel(label) {
        return (label || '').toString().replace(/"/g, '\\"');
    }

    function normalizeKey(value) {
        if (value === null || value === undefined) return null;
        return value.toString().trim().toLowerCase();
    }

    function createStableId(rawValue, prefix) {
        const rawString = (rawValue === undefined || rawValue === null) ? '' : rawValue.toString();
        const sanitizedBase = rawString.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '') || prefix;
        const baseId = /^[a-zA-Z]/.test(sanitizedBase) ? sanitizedBase : `${prefix}_${sanitizedBase}`;
        let candidate = baseId;
        let counter = 1;
        while (idRegistry.has(candidate) && idRegistry.get(candidate) !== rawString) {
            candidate = `${baseId}_${counter++}`;
        }
        idRegistry.set(candidate, rawString);
        return candidate;
    }
}

if (typeof window !== 'undefined') {
    window.generateMermaidApiSyntax = generateMermaidApiSyntax;
}
