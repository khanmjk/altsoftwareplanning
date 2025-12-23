/**
 * MermaidService - Abstraction layer for mermaid.js library
 * 
 * This service provides a unified interface for mermaid diagram rendering,
 * abstracting away the direct mermaid global reference for future ES module migration.
 * Also contains syntax generators for architecture and API diagrams.
 */
const MermaidService = {
    _initialized: false,
    _mermaid: null,

    /**
     * Initialize the mermaid library
     * @param {Object} [config] - Optional mermaid configuration
     */
    init(config = {}) {
        if (this._initialized) return;

        this._mermaid = this._getMermaidInstance();
        if (!this._mermaid) {
            console.error('MermaidService: mermaid library not loaded');
            return;
        }

        const themeConfig = this._getMermaidThemeConfig();
        const defaultConfig = {
            startOnLoad: false,
            ...themeConfig
        };

        this._mermaid.initialize({ ...defaultConfig, ...config });
        this._initialized = true;
    },

    /**
     * Reinitialize mermaid with current theme settings
     * Call this when theme changes to update diagram rendering
     */
    reinitialize() {
        if (!this._mermaid) {
            this._mermaid = this._getMermaidInstance();
        }
        if (!this._mermaid) return;

        const themeConfig = this._getMermaidThemeConfig();
        this._mermaid.initialize({
            startOnLoad: false,
            ...themeConfig
        });
    },

    /**
     * Get Mermaid theme configuration based on current app theme
     * @private
     */
    _getMermaidThemeConfig() {
        const isDark = ThemeService.isDarkTheme();
        const colors = ThemeService.getThemeColors();

        if (isDark) {
            const bgSecondary = colors?.bgSecondary || '#16213e';
            const bgTertiary = colors?.bgTertiary || '#0f3460';
            const borderColor = colors?.borderColor || '#2a2a3e';
            const textPrimary = colors?.textPrimary || '#e8e8e8';
            const textMuted = colors?.textMuted || '#808080';

            return {
                theme: 'dark',
                themeVariables: {
                    primaryColor: bgSecondary,
                    primaryTextColor: textPrimary,
                    primaryBorderColor: borderColor,
                    lineColor: textMuted,
                    secondaryColor: bgTertiary,
                    tertiaryColor: colors?.bgPrimary || '#1a1a2e',
                    background: colors?.bgPrimary || '#1a1a2e',
                    mainBkg: bgSecondary,
                    secondBkg: bgTertiary,
                    nodeBorder: borderColor,
                    // Cluster/Subgraph styling
                    clusterBkg: bgTertiary,
                    clusterBorder: borderColor,
                    // Flowchart specific subgraph styling
                    subGraph0Fill: bgTertiary,
                    subGraph0Stroke: borderColor,
                    // Title and label colors
                    titleColor: textPrimary,
                    actorTextColor: textPrimary,
                    signalTextColor: textPrimary,
                    labelTextColor: textPrimary,
                    loopTextColor: textPrimary,
                    edgeLabelBackground: bgSecondary,
                    // Ensure node labels are visible
                    nodeTextColor: textPrimary
                }
            };
        } else {
            const bgSecondary = colors?.bgSecondary || '#f8f9fa';
            const bgTertiary = colors?.bgTertiary || '#f0f2f5';
            const borderColor = colors?.borderColor || '#e0e0e0';
            const textPrimary = colors?.textPrimary || '#212529';
            const textSecondary = colors?.textSecondary || '#6c757d';

            return {
                theme: 'default',
                themeVariables: {
                    primaryColor: bgSecondary,
                    primaryTextColor: textPrimary,
                    primaryBorderColor: borderColor,
                    lineColor: textSecondary,
                    secondaryColor: bgTertiary,
                    tertiaryColor: '#ffffff',
                    background: '#ffffff',
                    mainBkg: bgSecondary,
                    secondBkg: bgTertiary,
                    nodeBorder: borderColor,
                    // Cluster/Subgraph styling - theme-aware, not white
                    clusterBkg: bgSecondary,
                    clusterBorder: borderColor,
                    // Flowchart specific subgraph styling
                    subGraph0Fill: bgSecondary,
                    subGraph0Stroke: borderColor,
                    // Title and label colors
                    titleColor: textPrimary,
                    actorTextColor: textPrimary,
                    signalTextColor: textPrimary,
                    labelTextColor: textPrimary,
                    loopTextColor: textPrimary,
                    edgeLabelBackground: '#ffffff',
                    // Ensure node labels are visible
                    nodeTextColor: textPrimary
                }
            };
        }
    },

    /**
     * Get the mermaid library instance
     * @private
     */
    _getMermaidInstance() {
        if (typeof mermaid !== 'undefined') {
            return mermaid;
        }
        return null;
    },

    /**
     * Append an SVG string into a container without using innerHTML.
     * @private
     */
    _appendSvgToContainer(container, svgMarkup) {
        if (!container || !svgMarkup) return false;
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svgMarkup, 'image/svg+xml');
        const svgEl = parsed.documentElement;
        if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
            return false;
        }
        const doc = container.ownerDocument || document;
        container.appendChild(doc.importNode(svgEl, true));
        return true;
    },

    /**
     * Render a themed error message into the container.
     * @private
     */
    _renderErrorToContainer(container, message) {
        if (!container) return;
        const doc = container.ownerDocument || document;
        const wrapper = doc.createElement('div');
        wrapper.className = 'mermaid-error';
        const strong = doc.createElement('strong');
        strong.textContent = 'Error rendering diagram.';
        wrapper.appendChild(strong);
        if (message) {
            wrapper.appendChild(doc.createElement('br'));
            const detail = doc.createElement('small');
            detail.textContent = message;
            wrapper.appendChild(detail);
        }
        container.appendChild(wrapper);
    },

    /**
     * Get theme-aware classDef statements for Mermaid diagrams
     * @returns {Object} Object containing classDef strings
     */
    _getThemeClassDefs() {
        const isDark = ThemeService.isDarkTheme();
        const colors = ThemeService.getThemeColors();

        if (isDark) {
            // Dark theme colors
            const bgPrimary = colors?.bgSecondary || '#16213e';
            const borderColor = colors?.borderColor || '#2a2a3e';
            const textColor = colors?.textPrimary || '#e8e8e8';
            const primary = colors?.primary || '#4a9eff';
            const warning = colors?.warning || '#ffca28';

            return {
                serviceNode: `fill:${bgPrimary},stroke:${borderColor},stroke-width:1px,color:${textColor};`,
                platformNode: `fill:${bgPrimary},stroke:${warning},stroke-width:1px,stroke-dasharray: 3 2,color:${textColor};`,
                apiNode: `fill:${bgPrimary},stroke:${primary},stroke-width:1px,color:${textColor};`,
                subgraphBg: bgPrimary,
                subgraphBorder: borderColor
            };
        } else {
            // Light theme colors
            const bgSecondary = colors?.bgSecondary || '#f8f9fa';
            const borderColor = colors?.borderColor || '#e0e0e0';
            const textColor = colors?.textPrimary || '#212529';
            const primary = colors?.primary || '#007bff';
            const warning = colors?.warning || '#ffc107';

            return {
                serviceNode: `fill:${bgSecondary},stroke:${borderColor},stroke-width:1px,color:${textColor};`,
                platformNode: `fill:#fff7ed,stroke:${warning},stroke-width:1px,stroke-dasharray: 3 2,color:${textColor};`,
                apiNode: `fill:#f0fff4,stroke:${primary},stroke-width:1px,color:${textColor};`,
                subgraphBg: '#ffffff',
                subgraphBorder: borderColor
            };
        }
    },

    /**
     * Get the mermaid instance (for components that need direct access)
     * @returns {Object|null} The mermaid instance
     */
    getInstance() {
        if (!this._initialized) {
            this.init();
        }
        return this._mermaid;
    },

    /**
     * Check if mermaid library is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof mermaid !== 'undefined';
    },

    /**
     * Parse mermaid syntax for validation
     * @param {string} syntax - Mermaid diagram syntax
     * @returns {boolean} True if valid
     */
    parse(syntax) {
        if (!this._initialized) this.init();
        if (!this._mermaid) return false;

        try {
            this._mermaid.parse(syntax);
            return true;
        } catch (e) {
            console.error('MermaidService: Parse error:', e);
            return false;
        }
    },

    /**
     * Render a mermaid diagram
     * @param {string} id - Unique render ID
     * @param {string} syntax - Mermaid diagram syntax
     * @param {HTMLElement} [container] - Optional container element
     * @returns {Promise<{svg: string}>} Rendered SVG result
     */
    async render(id, syntax, container) {
        if (!this._initialized) this.init();
        if (!this._mermaid) {
            throw new Error('Mermaid library not available');
        }

        return await this._mermaid.render(id, syntax, container);
    },

    /**
     * Render a mermaid diagram into a container
     * @param {string} syntax - Mermaid diagram syntax
     * @param {HTMLElement} container - Container element
     * @param {string} [renderId] - Optional render ID
     * @returns {Promise<boolean>} Success status
     */
    async renderToContainer(syntax, container, renderId) {
        if (!container) return false;

        const id = renderId || `mermaid-${Date.now()}`;

        try {
            // Clear container
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            const result = await this.render(id, syntax, container);
            const appended = this._appendSvgToContainer(container, result.svg);
            if (!appended) {
                this._renderErrorToContainer(container, 'Unable to parse diagram output.');
                return false;
            }
            container.classList.remove('is-hidden');
            return true;
        } catch (error) {
            console.error('MermaidService: Render error:', error);
            this._renderErrorToContainer(container, error.message);
            return false;
        }
    },

    // ==================== Syntax Generators ====================

    /**
     * Generate mermaid syntax for system architecture diagram
     * @param {Object} systemData - System data containing teams and services
     * @returns {string} Mermaid diagram syntax
     */
    generateArchitectureSyntax(systemData) {
        const includePlatforms = (typeof showPlatformComponents === 'undefined') ? true : !!showPlatformComponents;
        const data = systemData || {};
        const lines = ['graph TD'];

        // Get theme-aware classDef colors
        const themeStyles = this._getThemeClassDefs();
        const classDefLines = [
            `classDef serviceNode ${themeStyles.serviceNode}`,
            `classDef platformNode ${themeStyles.platformNode}`
        ];

        const teams = Array.isArray(data.teams) ? [...data.teams] : [];
        const services = Array.isArray(data.services) ? [...data.services] : [];
        teams.sort((a, b) => this._getTeamName(a).localeCompare(this._getTeamName(b)));
        services.sort((a, b) => this._getServiceLabel(a).localeCompare(this._getServiceLabel(b)));

        const idRegistry = new Map();
        const serviceLookup = new Map();
        const teamIdSet = new Set(teams.map(team => team.teamId));
        const serviceNodeIds = new Set();
        const platformNodes = new Map();
        const edges = [];

        services.forEach(service => {
            const label = this._getServiceLabel(service);
            const nodeId = this._createStableId(label, 'svc', idRegistry);
            this._registerServiceLookup(serviceLookup, service, nodeId, label);
        });

        teams.forEach(team => {
            const teamLabel = this._getTeamName(team);
            const clusterId = this._createStableId(team.teamId || teamLabel, 'team', idRegistry);
            lines.push(`subgraph cluster_${clusterId}["${this._escapeLabel(teamLabel)}"]`);
            const teamServices = services.filter(service => service.owningTeamId === team.teamId);
            teamServices.forEach(service => {
                const nodeInfo = this._getServiceNodeInfo(serviceLookup, service, idRegistry);
                if (nodeInfo && !serviceNodeIds.has(nodeInfo.id)) {
                    lines.push(`    ${nodeInfo.id}["${this._escapeLabel(nodeInfo.label)}"]`);
                    serviceNodeIds.add(nodeInfo.id);
                }
            });
            lines.push('end');
        });

        const unassignedServices = services.filter(service => !service.owningTeamId || !teamIdSet.has(service.owningTeamId));
        if (unassignedServices.length > 0) {
            lines.push('subgraph cluster_unassigned["Unassigned"]');
            unassignedServices.forEach(service => {
                const nodeInfo = this._getServiceNodeInfo(serviceLookup, service, idRegistry);
                if (nodeInfo && !serviceNodeIds.has(nodeInfo.id)) {
                    lines.push(`    ${nodeInfo.id}["${this._escapeLabel(nodeInfo.label)}"]`);
                    serviceNodeIds.add(nodeInfo.id);
                }
            });
            lines.push('end');
        }

        Array.from(serviceLookup.values())
            .filter(nodeInfo => !serviceNodeIds.has(nodeInfo.id))
            .sort((a, b) => a.label.localeCompare(b.label))
            .forEach(nodeInfo => {
                lines.push(`${nodeInfo.id}["${this._escapeLabel(nodeInfo.label)}"]`);
                serviceNodeIds.add(nodeInfo.id);
            });

        services.forEach(service => {
            const source = this._getServiceNodeInfo(serviceLookup, service, idRegistry);
            if (!source) return;

            const dependencies = Array.isArray(service.serviceDependencies) ? [...service.serviceDependencies].sort((a, b) => a.localeCompare(b)) : [];
            dependencies.forEach(dep => {
                const target = this._getServiceNodeInfo(serviceLookup, dep, idRegistry);
                if (target) edges.push(`${source.id} --> ${target.id}`);
            });

            if (includePlatforms) {
                const platforms = Array.isArray(service.platformDependencies) ? [...service.platformDependencies].sort((a, b) => a.localeCompare(b)) : [];
                platforms.forEach(platformName => {
                    const normalized = this._normalizeKey(platformName);
                    if (!normalized) return;
                    if (!platformNodes.has(normalized)) {
                        const platformId = this._createStableId(platformName, 'plat', idRegistry);
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
                    lines.push(`${node.id}[("${this._escapeLabel(node.label)}")]`);
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
    },

    /**
     * Generate mermaid syntax for API interactions diagram
     * @param {Object} systemData - System data
     * @param {Object} [options] - Options including selectedService
     * @returns {string} Mermaid diagram syntax
     */
    generateApiSyntax(systemData, options = {}) {
        const includePlatforms = (typeof showPlatformComponents === 'undefined') ? true : !!showPlatformComponents;
        const selectedService = options.selectedService || 'all';
        const data = systemData || {};
        const services = Array.isArray(data.services) ? [...data.services] : [];
        const teams = Array.isArray(data.teams) ? [...data.teams] : [];
        const teamById = new Map(teams.map(team => [team.teamId, team]));

        const lines = ['graph LR'];

        // Get theme-aware classDef colors
        const themeStyles = this._getThemeClassDefs();
        const classDefLines = [
            `classDef serviceNode ${themeStyles.serviceNode}`,
            `classDef apiNode ${themeStyles.apiNode}`,
            `classDef platformNode ${themeStyles.platformNode}`
        ];

        const idRegistry = new Map();
        const apiMapByName = new Map();
        const apiMapByKey = new Map();
        const serviceMap = new Map();
        services.forEach(service => serviceMap.set(service.serviceName, service));

        services.forEach(service => {
            (service.apis || []).forEach(api => {
                const key = `${service.serviceName}::${api.apiName}`;
                const id = this._createStableId(`${service.serviceName}_${api.apiName}`, 'api', idRegistry);
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
            .sort((a, b) => this._getServiceLabel(a).localeCompare(this._getServiceLabel(b)))
            .forEach(service => {
                const svcId = this._createStableId(service.serviceName, 'svc', idRegistry);
                serviceNodes.push({ id: svcId, label: this._getServiceLabel(service), teamId: service.owningTeamId });

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
                        const normalized = this._normalizeKey(platformName);
                        if (!normalized) return;
                        if (!platformNodes.has(normalized)) {
                            const platId = this._createStableId(platformName, 'plat', idRegistry);
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
                        const depSvcId = this._createStableId(depSvc.serviceName, 'svc', idRegistry);
                        edges.push(`${svcId} -.-> ${depSvcId}`);
                    });
                } else if (service.serviceName === selectedService) {
                    (service.serviceDependencies || []).forEach(depSvcName => {
                        const depSvc = serviceMap.get(depSvcName);
                        if (!depSvc) return;
                        const depSvcId = this._createStableId(depSvc.serviceName, 'svc', idRegistry);
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
            const team = teamById.get(teamId) || { teamName: 'Unassigned', teamIdentity: '' };
            const teamLabel = this._getTeamLabel(team);
            const teamClusterId = this._createStableId(`team_${teamId}`, 'team', idRegistry);
            lines.push(`subgraph cluster_${teamClusterId}["${this._escapeLabel(teamLabel)}"]`);
            svcList.forEach(svc => {
                lines.push(`  subgraph ${svc.id}["${this._escapeLabel(svc.label)}"]`);
                const apis = apiByServiceId.get(svc.id) || [];
                apis.forEach(apiNode => {
                    lines.push(`    ${apiNode.id}["${this._escapeLabel(apiNode.label)}"]`);
                });
                lines.push('  end');
            });
            lines.push('end');
        });

        if (includePlatforms && platformNodes.size > 0) {
            Array.from(platformNodes.values())
                .sort((a, b) => a.label.localeCompare(b.label))
                .forEach(node => {
                    lines.push(`${node.id}[("${this._escapeLabel(node.label)}")]`);
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
    },

    // ==================== Helper Methods ====================

    _getTeamName(team) {
        if (!team) return 'Team';
        const formal = (team.teamName || '').trim();
        const friendly = (team.teamIdentity || '').trim();
        const hasBoth = formal && friendly;
        const sameLabel = hasBoth && formal.toLowerCase() === friendly.toLowerCase();
        if (hasBoth && !sameLabel) {
            return `${formal} (${friendly})`;
        }
        return formal || friendly || team.teamId || 'Team';
    },

    _getTeamLabel(team) {
        return this._getTeamName(team);
    },

    _getServiceLabel(service) {
        return (service && (service.serviceName || service.serviceId || service.name))
            ? (service.serviceName || service.serviceId || service.name)
            : 'Service';
    },

    _escapeLabel(label) {
        return (label || '').toString().replace(/"/g, '\\"');
    },

    _normalizeKey(value) {
        if (value === null || value === undefined) return null;
        return value.toString().trim().toLowerCase();
    },

    _createStableId(rawValue, prefix, idRegistry) {
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
    },

    _registerServiceLookup(lookup, service, nodeId, label) {
        const nameKey = this._normalizeKey(service?.serviceName) || this._normalizeKey(label);
        const idKey = this._normalizeKey(service?.serviceId);
        if (nameKey && !lookup.has(nameKey)) lookup.set(nameKey, { id: nodeId, label });
        if (idKey && !lookup.has(idKey)) lookup.set(idKey, { id: nodeId, label });
    },

    _getServiceNodeInfo(lookup, serviceOrName, idRegistry) {
        if (!serviceOrName) return null;
        const key = typeof serviceOrName === 'string'
            ? this._normalizeKey(serviceOrName)
            : (this._normalizeKey(serviceOrName.serviceName) || this._normalizeKey(serviceOrName.serviceId) || this._normalizeKey(serviceOrName.name));

        if (key && lookup.has(key)) {
            return lookup.get(key);
        }

        if (typeof serviceOrName === 'string') {
            const fallbackId = this._createStableId(serviceOrName, 'svc', idRegistry);
            const fallbackLabel = serviceOrName;
            this._registerServiceLookup(lookup, { serviceName: serviceOrName }, fallbackId, fallbackLabel);
            return { id: fallbackId, label: fallbackLabel };
        }

        const fallbackLabel = this._getServiceLabel(serviceOrName);
        const fallbackId = this._createStableId(fallbackLabel, 'svc', idRegistry);
        this._registerServiceLookup(lookup, serviceOrName, fallbackId, fallbackLabel);
        return { id: fallbackId, label: fallbackLabel };
    }
};
