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

    teams.sort((a, b) => getTeamName(a).localeCompare(getTeamName(b)));
    services.sort((a, b) => getServiceLabel(a).localeCompare(getServiceLabel(b)));

    const idRegistry = new Map();
    const serviceLookup = new Map();
    const teamIdSet = new Set(teams.map(team => team.teamId));
    const serviceNodeIds = new Set();
    const platformNodes = new Map();
    const edges = [];

    services.forEach(service => {
        const label = getServiceLabel(service);
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
        return (team && (team.teamName || team.teamIdentity || team.teamId)) ? (team.teamName || team.teamIdentity || team.teamId) : 'Team';
    }

    function getServiceLabel(service) {
        return (service && (service.serviceName || service.serviceId || service.name)) ? (service.serviceName || service.serviceId || service.name) : 'Service';
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
