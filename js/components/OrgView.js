/**
 * OrgView - Organization Chart View Component
 * Displays organizational hierarchy with multiple view modes
 * Preserves AI agent integration for org manipulation
 */
class OrgView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentMode = 'd3'; // Default to D3 view
        this.teamTableWidgetInstance = null;
        this.engineerTableWidgetInstance = null;
    }

    /**
     * Render the organization view
     */
    render() {
        if (!this.container) {
            console.error('OrgView: Container not found');
            return;
        }

        if (!window.currentSystemData) {
            this.container.innerHTML = '<div class="org-view"><p style="color: red;">No system data loaded</p></div>';
            return;
        }

        this.generateLayout();
        this.updateRenderer();
    }

    /**
     * Generate the view layout
     */
    generateLayout() {
        this.container.innerHTML = `
            <div class="org-view">
                <div id="organogramToolbar" class="org-toolbar">
                    <span class="org-toolbar__label">Chart Layout:</span>
                    <div class="org-toolbar__buttons">
                        <button id="orgViewModeD3" class="btn btn-secondary" data-mode="d3">Block View</button>
                        <button id="orgViewModeList" class="btn btn-secondary" data-mode="list">List View</button>
                        <button id="orgViewModeTable" class="btn btn-secondary" data-mode="table">Org Table</button>
                        <button id="orgViewModeEngineerList" class="btn btn-secondary" data-mode="engineerList">Engineer List</button>
                    </div>
                </div>
                <div id="organogramContent" class="org-content"></div>
                <div id="teamBreakdown" class="org-view__team-breakdown"></div>
                <div id="orgEngineerListView" class="org-view__engineer-list"></div>
            </div>
        `;

        this.bindEvents();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const toolbar = document.getElementById('organogramToolbar');
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-mode]');
                if (!btn) return;

                this.currentMode = btn.dataset.mode;
                this.updateRenderer();
            });
        }
    }

    /**
     * Update the view based on current mode
     */
    updateRenderer() {
        const chartContainer = document.getElementById('organogramContent');
        const tableContainer = document.getElementById('teamBreakdown');
        const engineerListContainer = document.getElementById('orgEngineerListView');

        if (!chartContainer || !tableContainer || !engineerListContainer) {
            console.error('OrgView: Missing containers');
            return;
        }

        // Update button states
        document.querySelectorAll('#organogramToolbar button').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });

        const activeBtn = document.querySelector(`[data-mode="${this.currentMode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('btn-primary');
            activeBtn.classList.remove('btn-secondary');
        }

        // Hide all containers
        chartContainer.style.display = 'none';
        tableContainer.classList.remove('active');
        engineerListContainer.classList.remove('active');

        // Show appropriate view
        switch (this.currentMode) {
            case 'd3':
                chartContainer.style.display = 'block';
                this.renderD3OrgChart(chartContainer);
                break;
            case 'list':
                chartContainer.style.display = 'block';
                this.renderHtmlOrgList(chartContainer);
                break;
            case 'table':
                tableContainer.classList.add('active');
                this.generateTeamTable();
                break;
            case 'engineerList':
                engineerListContainer.classList.add('active');
                this.generateEngineerTable();
                break;
        }
    }

    /**
     * Build hierarchical data for visualization
     */
    buildHierarchyData() {
        if (!window.currentSystemData) return null;

        const sdmMap = new Map((window.currentSystemData.sdms || []).map(sdm =>
            [sdm.sdmId, { ...sdm, name: sdm.sdmName, children: [], type: 'sdm' }]
        ));

        const srMgrMap = new Map((window.currentSystemData.seniorManagers || []).map(sr =>
            [sr.seniorManagerId, { ...sr, name: sr.seniorManagerName, children: [], type: 'srMgr' }]
        ));

        // Group SDMs under Senior Managers
        sdmMap.forEach(sdm => {
            if (sdm.seniorManagerId && srMgrMap.has(sdm.seniorManagerId)) {
                srMgrMap.get(sdm.seniorManagerId).children.push(sdm);
            } else {
                const unassignedKey = 'unassigned-sr-mgr';
                if (!srMgrMap.has(unassignedKey)) {
                    srMgrMap.set(unassignedKey, {
                        seniorManagerId: unassignedKey,
                        seniorManagerName: 'Unassigned Senior Manager',
                        name: 'Unassigned Senior Manager',
                        children: [],
                        type: 'srMgr'
                    });
                }
                if (sdm && sdm.sdmId) srMgrMap.get(unassignedKey).children.push(sdm);
            }
        });

        // Add teams under SDMs
        (window.currentSystemData.teams || []).forEach(team => {
            const awayTeamCount = team.awayTeamMembers?.length ?? 0;
            const sourceSummary = typeof window.getSourceSummary === 'function'
                ? window.getSourceSummary(team.awayTeamMembers)
                : '';

            const engineerChildren = (team.engineers || []).map(engineerName => {
                const eng = (window.currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                return {
                    name: `${eng ? eng.name : engineerName} (L${eng ? eng.level : '?'})${eng?.attributes?.isAISWE ? ' [AI]' : ''}`,
                    type: 'engineer'
                };
            }).filter(e => e.name);

            const teamNode = {
                name: team.teamIdentity || team.teamName || 'Unnamed Team',
                type: 'team',
                details: `BIS: ${team.engineers?.length ?? 0} / Funded: ${team.fundedHeadcount ?? 'N/A'}`,
                awayTeamCount,
                awaySourceSummary: sourceSummary,
                children: engineerChildren
            };

            if (team.sdmId && sdmMap.has(team.sdmId)) {
                sdmMap.get(team.sdmId).children.push(teamNode);
            } else {
                const unassignedSdmKey = 'unassigned-sdm';
                if (!sdmMap.has(unassignedSdmKey)) {
                    sdmMap.set(unassignedSdmKey, {
                        sdmId: unassignedSdmKey,
                        sdmName: 'Unassigned SDM',
                        name: 'Unassigned SDM',
                        children: [],
                        type: 'sdm'
                    });
                    const unassignedSrMgrKey = 'unassigned-sr-mgr';
                    if (!srMgrMap.has(unassignedSrMgrKey)) {
                        srMgrMap.set(unassignedSrMgrKey, {
                            seniorManagerId: unassignedSrMgrKey,
                            seniorManagerName: 'Unassigned Senior Manager',
                            name: 'Unassigned Senior Manager',
                            children: [],
                            type: 'srMgr'
                        });
                    }
                    srMgrMap.get(unassignedSrMgrKey).children.push(sdmMap.get(unassignedSdmKey));
                }
                if (team && team.teamId) sdmMap.get(unassignedSdmKey).children.push(teamNode);
            }
        });

        return {
            name: window.currentSystemData.systemName || 'Organization',
            type: 'root',
            children: Array.from(srMgrMap.values())
        };
    }

    /**
     * Render HTML list view
     */
    renderHtmlOrgList(container) {
        const hierarchicalData = this.buildHierarchyData();

        if (!hierarchicalData || !container) {
            console.error('No data for HTML org list');
            if (container) container.innerHTML = '<p style="color: red;">Could not generate organogram data.</p>';
            return;
        }

        container.innerHTML = '';
        container.style.fontFamily = 'Arial, sans-serif';

        const buildLevel = (node, level) => {
            if (!node) return '';

            let html = `<div class="org-level-${level}" style="margin-left: ${level * 25}px; margin-bottom: 5px; padding: 3px 5px; border-left: 2px solid #eee; position: relative;">`;
            let nodeContent = '';
            let nodeStyle = '';

            switch (node.type) {
                case 'root':
                    nodeContent = `<strong>System: ${node.name || 'N/A'}</strong>`;
                    nodeStyle = 'font-size: 1.2em; color: #333;';
                    break;
                case 'srMgr':
                    nodeContent = `<strong>Sr. Manager: ${node.seniorManagerName || node.name || 'N/A'}</strong>`;
                    nodeStyle = 'font-size: 1.1em; color: #0056b3;';
                    break;
                case 'sdm':
                    nodeContent = `<strong>SDM: ${node.sdmName || node.name || 'N/A'}</strong>`;
                    nodeStyle = 'color: #007bff;';
                    break;
                case 'team':
                    nodeContent = `<span style="color: #17a2b8;">Team: ${node.name || 'N/A'}</span> <span style="font-size: 0.8em; color: #555;">(${node.details || ''})</span>`;
                    if (node.awayTeamCount > 0) {
                        nodeContent += ` <span style="color: #dc3545; font-style: italic; font-size: 0.9em;">(+${node.awayTeamCount} Away)</span>`;
                    }
                    if (node.children && node.children.length > 0) {
                        nodeContent += '<ul style="list-style: none; padding-left: 15px; margin-top: 3px;">';
                        node.children.forEach(eng => {
                            if (eng.type === 'engineer') {
                                nodeContent += `<li style="font-size:0.85em;">${eng.name}</li>`;
                            }
                        });
                        nodeContent += '</ul>';
                    }
                    break;
                default:
                    nodeContent = `<strong>${node.name || 'Group'}</strong>`;
                    nodeStyle = 'color: #6c757d;';
            }

            html += `<span style="${nodeStyle}">${nodeContent}</span>`;

            if (node.children && node.children.length > 0 && node.type !== 'team' && node.type !== 'engineer') {
                node.children.forEach(child => {
                    html += buildLevel(child, level + 1);
                });
            }

            html += `</div>`;
            return html;
        };

        container.innerHTML = buildLevel(hierarchicalData, 0);
    }

    /**
     * Render D3 org chart
     * IMPORTANT: Preserves all D3.js functionality
     */
    renderD3OrgChart(container) {
        const hierarchicalData = this.buildHierarchyData();

        if (!hierarchicalData || !container) {
            console.error('D3 Org Chart container or data not found');
            if (container) container.innerHTML = '<p style="color: red;">Could not generate D3 organogram data.</p>';
            return;
        }

        container.innerHTML = '';

        const renderChart = (force = false) => {
            let width = container.clientWidth;
            if (width === 0) {
                if (force) {
                    width = 960;
                } else {
                    return;
                }
            }

            const height = 1200;
            const nodeWidth = 220;
            const nodeHeight = 80;
            const verticalSpacing = 100;
            const horizontalSpacing = 20;

            const svg = d3.select(container).append("svg")
                .attr("width", "100%")
                .attr("height", height)
                .attr("viewBox", [0, 0, width, height])
                .style("overflow", "auto");

            const tooltip = d3.select("body").selectAll(".tooltip").data([null]).join("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            const g = svg.append("g");

            const tree = d3.tree()
                .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing]);

            const root = d3.hierarchy(hierarchicalData);

            root.descendants().forEach(d => {
                d._children = d.children;
                if (d.data.type === 'team') {
                    d.children = null;
                }
            });

            root.x0 = width / 2;
            root.y0 = nodeHeight;

            const update = (source) => {
                const duration = 250;
                const treeData = tree(root);
                const nodes = treeData.descendants().reverse();
                const links = treeData.links();

                nodes.forEach(d => {
                    d.y = d.depth * (nodeHeight + verticalSpacing) + nodeHeight;
                });

                const elbow = (d) => {
                    return `M ${d.source.x},${d.source.y + nodeHeight / 2}` +
                        ` V ${d.target.y - verticalSpacing / 2}` +
                        ` H ${d.target.x}` +
                        ` V ${d.target.y - nodeHeight / 2}`;
                };

                const link = g.selectAll(".org-link")
                    .data(links, d => d.target.id);

                const linkEnter = link.enter().append("path")
                    .attr("class", "org-link")
                    .attr("d", d => {
                        const o = { x: source.x0 || source.x, y: source.y0 || source.y };
                        return `M ${o.x},${o.y + nodeHeight / 2} V ${o.y + nodeHeight / 2} H ${o.x} V ${o.y + nodeHeight / 2}`;
                    })
                    .attr("fill", "none")
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 1.5);

                link.merge(linkEnter).transition().duration(duration)
                    .attr("d", elbow);

                link.exit().transition().duration(duration)
                    .attr("d", d => {
                        const o = { x: source.x, y: source.y };
                        return `M ${o.x},${o.y + nodeHeight / 2} V ${o.y + nodeHeight / 2} H ${o.x} V ${o.y + nodeHeight / 2}`;
                    })
                    .remove();

                const node = g.selectAll(".org-node")
                    .data(nodes, d => d.data.id || d.data.name + Math.random());

                const nodeEnter = node.enter().append("g")
                    .attr("class", d => `org-node org-type-${d.data.type}`)
                    .attr("transform", d => `translate(${source.x0 || source.x},${source.y0 || source.y})`)
                    .style("opacity", 0)
                    .on("click", (event, d) => {
                        if (d.data.type === 'engineer') return;
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        } else {
                            d.children = d._children;
                            d._children = null;
                        }
                        update(d);
                    })
                    .on("mouseover", (event, d) => {
                        let info = '';
                        switch (d.data.type) {
                            case 'root': info = `<strong>System:</strong> ${d.data.name}`; break;
                            case 'srMgr': info = `<strong>Sr. Manager:</strong> ${d.data.name}`; break;
                            case 'sdm': info = `<strong>SDM:</strong> ${d.data.name}`; break;
                            case 'team':
                                info = `<strong>Team:</strong> ${d.data.name}<br><strong>Details:</strong> ${d.data.details}`;
                                if (d.data.awayTeamCount > 0) info += `<br><strong style='color: #dc3545;'>Away:</strong> +${d.data.awayTeamCount} (${d.data.awaySourceSummary})`;
                                break;
                            case 'engineer': info = `<strong>Engineer:</strong> ${d.data.name}`; break;
                            default: info = d.data.name;
                        }
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(info)
                            .style("left", (event.pageX + 15) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", () => {
                        tooltip.transition().duration(500).style("opacity", 0);
                    });

                nodeEnter.append("rect")
                    .attr("class", "org-node-rect")
                    .attr("width", nodeWidth)
                    .attr("height", nodeHeight)
                    .attr("x", -nodeWidth / 2)
                    .attr("y", -nodeHeight / 2)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .style("cursor", d => d.data.type !== 'engineer' ? "pointer" : "default");

                const fo = nodeEnter.append("foreignObject")
                    .attr("x", -nodeWidth / 2)
                    .attr("y", -nodeHeight / 2)
                    .attr("width", nodeWidth)
                    .attr("height", nodeHeight)
                    .style("pointer-events", "none");

                const div = fo.append("xhtml:div")
                    .attr("xmlns", "http://www.w3.org/1999/xhtml")
                    .attr("class", "org-node-label-wrapper");

                div.append("xhtml:div")
                    .attr("class", "org-node-label-name")
                    .html(d => d.data.name);

                div.append("xhtml:div")
                    .attr("class", "org-node-label-details")
                    .html(d => {
                        if (d.data.type === 'team') return d.data.details;
                        if (d.data.type === 'engineer') return d.data.name.includes('[AI]') ? 'AI Software Engineer' : 'Software Engineer';
                        return d.data.type.replace('srMgr', 'Senior Manager');
                    });

                nodeEnter.append("text")
                    .attr("class", "org-node-toggle")
                    .attr("text-anchor", "middle")
                    .attr("y", (nodeHeight / 2) + 16)
                    .text(d => {
                        if (d.data.type === 'engineer') return '';
                        return d._children ? '▼' : (d.children ? '▲' : '');
                    });

                node.merge(nodeEnter).transition().duration(duration)
                    .attr("transform", d => `translate(${d.x},${d.y})`)
                    .style("opacity", 1);

                node.merge(nodeEnter).select(".org-node-toggle")
                    .text(d => {
                        if (d.data.type === 'engineer') return '';
                        return d._children ? '▼' : (d.children ? '▲' : '');
                    });

                node.exit().transition().duration(duration)
                    .attr("transform", d => `translate(${source.x},${source.y})`)
                    .style("opacity", 0)
                    .remove();

                nodes.forEach(d => {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            };

            update(root);

            const bounds = g.node().getBBox();
            const chartWidth = bounds.width;
            const scale = Math.min(1, (width / (chartWidth + 100)) * 0.8);
            const tx = (width / 2) - (root.x * scale);
            const ty = 50;
            const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);

            const zoom = d3.zoom()
                .scaleExtent([0.1, 2])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                });

            svg.call(zoom).call(zoom.transform, initialTransform);
        };

        if (container.clientWidth > 0) {
            renderChart();
        } else {
            let rendered = false;
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.contentRect.width > 0 && !rendered) {
                        rendered = true;
                        renderChart();
                        observer.disconnect();
                        break;
                    }
                }
            });
            observer.observe(container);

            setTimeout(() => {
                if (!rendered) {
                    rendered = true;
                    observer.disconnect();
                    renderChart(true);
                }
            }, 500);
        }
    }

    /**
     * Generate team table using EnhancedTableWidget
     * IMPORTANT: AI agent integration point
     */
    generateTeamTable() {
        const tableData = this.prepareTeamDataForTabulator();
        const columnDefs = this.defineTeamTableColumns();
        const widgetContainer = document.getElementById('teamBreakdown');

        if (!widgetContainer) {
            console.error('Team table container not found');
            return;
        }

        widgetContainer.innerHTML = '';

        if (this.teamTableWidgetInstance) {
            this.teamTableWidgetInstance.destroy();
            this.teamTableWidgetInstance = null;
        }

        try {
            this.teamTableWidgetInstance = new EnhancedTableWidget('teamBreakdown', {
                data: tableData,
                columns: columnDefs,
                uniqueIdField: 'teamId',
                paginationSize: 50,
                paginationSizeSelector: [25, 50, 100, 250],
                initialSort: [{ column: "seniorManagerName", dir: "asc" }, { column: "sdmName", dir: "asc" }],
                exportCsvFileName: 'team_breakdown.csv',
                exportJsonFileName: 'team_breakdown.json',
                exportXlsxFileName: 'team_breakdown.xlsx',
                exportSheetName: 'Team Breakdown',
                layout: "fitData"
            });
        } catch (error) {
            console.error('Error creating team table widget:', error);
            widgetContainer.innerHTML = "<p style='color:red;'>Error initializing team table widget</p>";
        }
    }

    /**
     * Prepare data for team table
     */
    prepareTeamDataForTabulator() {
        if (!window.currentSystemData || !window.currentSystemData.teams) {
            return [];
        }

        const sdmMap = new Map((window.currentSystemData.sdms || []).map(s => [s.sdmId, s]));
        const srMgrMap = new Map((window.currentSystemData.seniorManagers || []).map(sm => [sm.seniorManagerId, sm]));
        const pmtMap = new Map((window.currentSystemData.pmts || []).map(p => [p.pmtId, p]));
        const engineerMap = new Map((window.currentSystemData.allKnownEngineers || []).map(e => [e.name, e]));

        let teamServicesMap = {};
        (window.currentSystemData.services || []).forEach(service => {
            if (service.owningTeamId) {
                if (!teamServicesMap[service.owningTeamId]) teamServicesMap[service.owningTeamId] = [];
                teamServicesMap[service.owningTeamId].push(service.serviceName);
            }
        });

        return window.currentSystemData.teams.map(team => {
            const sdm = sdmMap.get(team.sdmId);
            const seniorManager = sdm ? srMgrMap.get(sdm.seniorManagerId) : null;
            const pmt = pmtMap.get(team.pmtId);

            const teamBIS = (team.engineers || []).length;
            const fundedHC = team.fundedHeadcount ?? 0;
            const awayTeamBIS = (team.awayTeamMembers || []).length;
            const effectiveBIS = teamBIS + awayTeamBIS;
            const hiringGap = fundedHC - teamBIS;

            const engineerDetails = (team.engineers || []).map(name => {
                const eng = engineerMap.get(name);
                if (eng) {
                    const type = eng.attributes?.isAISWE ? ` [AI]` : '';
                    return `${eng.name} (L${eng.level})${type}`;
                }
                return `${name} (Details Missing)`;
            }).join('\n');

            const awayTeamDetails = (team.awayTeamMembers || []).map(away => {
                const type = away.attributes?.isAISWE ? ` [AI]` : '';
                return `${away.name} (L${away.level})${type} - From: ${away.sourceTeam}`;
            }).join('\n');

            const servicesOwned = (teamServicesMap[team.teamId] || []).join('\n');

            return {
                teamId: team.teamId,
                seniorManagerName: seniorManager ? seniorManager.seniorManagerName : "N/A",
                sdmName: sdm ? sdm.sdmName : "N/A",
                teamIdentity: team.teamIdentity || "N/A",
                teamName: team.teamName || "N/A",
                pmtName: pmt ? pmt.pmtName : "N/A",
                teamBIS: teamBIS,
                fundedHeadcount: fundedHC,
                effectiveBIS: effectiveBIS,
                hiringGap: hiringGap,
                engineerDetails: engineerDetails,
                awayTeamDetails: awayTeamDetails,
                servicesOwned: servicesOwned
            };
        });
    }

    /**
     * Define team table columns
     */
    defineTeamTableColumns() {
        // Use helper from orgView_old if available, otherwise define inline
        const getNameHeaderFilterParams = (sourceArray, nameField) => {
            const options = [{ label: "All", value: "" }];
            if (sourceArray) {
                const uniqueNames = {};
                sourceArray.forEach(item => {
                    if (item && item[nameField]) {
                        uniqueNames[item[nameField]] = item[nameField];
                    }
                });
                Object.keys(uniqueNames).sort((a, b) => String(a).localeCompare(String(b))).forEach(name => {
                    options.push({ label: name, value: name });
                });
            }
            options.push({ label: "N/A", value: "N/A" });
            return { values: options, clearable: true, autocomplete: true };
        };

        const gapFormatter = (cell) => {
            const value = cell.getValue();
            if (value > 0) {
                cell.getElement().style.color = "orange";
                cell.getElement().title = `Need to hire ${value}`;
            } else if (value < 0) {
                cell.getElement().style.color = "blue";
                cell.getElement().title = `Over-hired by ${Math.abs(value)}`;
            } else {
                cell.getElement().style.color = "green";
            }
            return value;
        };

        return [
            { title: "Sr. Manager", field: "seniorManagerName", headerFilter: "list", headerFilterParams: getNameHeaderFilterParams(window.currentSystemData.seniorManagers, "seniorManagerName") },
            { title: "SDM", field: "sdmName", headerFilter: "list", headerFilterParams: getNameHeaderFilterParams(window.currentSystemData.sdms, "sdmName") },
            { title: "Team Identity", field: "teamIdentity", width: 180 },
            { title: "Team Name", field: "teamName", width: 200 },
            { title: "PMT", field: "pmtName", headerFilter: "list", headerFilterParams: getNameHeaderFilterParams(window.currentSystemData.pmts, "pmtName") },
            { title: "Team BIS", field: "teamBIS", hozAlign: "center", width: 100 },
            { title: "Funded HC", field: "fundedHeadcount", hozAlign: "center", width: 100 },
            { title: "Effective BIS", field: "effectiveBIS", hozAlign: "center", width: 120 },
            { title: "Hiring Gap", field: "hiringGap", hozAlign: "center", width: 100, formatter: gapFormatter },
            { title: "Engineers", field: "engineerDetails", width: 250, tooltip: true },
            { title: "Away Team", field: "awayTeamDetails", width: 250, tooltip: true },
            { title: "Services Owned", field: "servicesOwned", width: 200, tooltip: true }
        ];
    }


    /**
     * Generate engineer table with statistics header and full editing capabilities
     * REFACTORED: Clean OOP implementation following Phase 2 principles
     */
    generateEngineerTable() {
        const widgetContainer = document.getElementById('orgEngineerListView');
        if (!widgetContainer) {
            console.error('Engineer table container not found');
            return;
        }

        // Clear container and create structure
        widgetContainer.innerHTML = '<h2 id="orgEngineerTableHeading" class="org-engineer-header"></h2>';
        const tableDiv = document.createElement('div');
        tableDiv.id = 'orgEngineerTableWidgetContainer';
        widgetContainer.appendChild(tableDiv);

        // Update statistics header
        this.updateEngineerTableStatistics();

        // Prepare data and columns
        const tableData = this.prepareEngineerDataForTabulator();
        const columnDefs = this.defineEngineerTableColumns();

        // Destroy previous instance
        if (this.engineerTableWidgetInstance) {
            this.engineerTableWidgetInstance.destroy();
            this.engineerTableWidgetInstance = null;
        }

        // Create new table widget
        try {
            this.engineerTableWidgetInstance = new EnhancedTableWidget(tableDiv.id, {
                data: tableData,
                columns: columnDefs,
                uniqueIdField: 'name',
                paginationSize: 100,
                paginationSizeSelector: [25, 50, 100, 250, 500],
                initialSort: [{ column: "name", dir: "asc" }],
                exportCsvFileName: 'engineer_list.csv',
                exportJsonFileName: 'engineer_list.json',
                exportXlsxFileName: 'engineer_list.xlsx',
                exportSheetName: 'Engineers',
                layout: "fitData"
            });

            // Force redraw to ensure proper rendering
            setTimeout(() => {
                if (this.engineerTableWidgetInstance?.tabulatorInstance) {
                    this.engineerTableWidgetInstance.tabulatorInstance.redraw(true);
                }
            }, 100);
        } catch (error) {
            console.error('Error creating engineer table widget:', error);
            widgetContainer.innerHTML = "<p style='color:red;'>Error initializing engineer table. Check console.</p>";
        }
    }

    /**
     * Calculate and update engineer table statistics header
     * EXTRACTED: Clean helper for statistics calculation
     */
    updateEngineerTableStatistics() {
        const heading = document.getElementById('orgEngineerTableHeading');
        if (!heading || !window.currentSystemData) return;

        const stats = this.calculateEngineerStatistics();

        heading.textContent = `Engineer Resource List (Funded: ${stats.funded} | Team BIS: ${stats.teamBIS} | Away BIS: ${stats.awayBIS} | Effective BIS: ${stats.effectiveBIS} | Hiring Gap: ${stats.hiringGap})`;

        // Color code based on hiring gap
        heading.style.color = stats.hiringGap < 0 ? 'blue' : (stats.hiringGap > 0 ? 'darkorange' : 'green');
        heading.title = `Finance Approved Funding: ${stats.funded}\nActual Team Members (BIS): ${stats.teamBIS}\nAway-Team Members: ${stats.awayBIS}\nTotal Effective Capacity: ${stats.effectiveBIS}\nHiring Gap (Funded - Team BIS): ${stats.hiringGap}`;
    }

    /**
     * Calculate engineer statistics
     * EXTRACTED: Pure function for testability
     */
    calculateEngineerStatistics() {
        const data = window.currentSystemData;
        if (!data) return { funded: 0, teamBIS: 0, awayBIS: 0, effectiveBIS: 0, hiringGap: 0 };

        const funded = (data.teams || []).reduce((sum, team) => sum + (team.fundedHeadcount ?? 0), 0);
        const teamBIS = (data.allKnownEngineers || []).filter(eng => eng.currentTeamId).length;
        const awayBIS = (data.teams || []).reduce((sum, team) => sum + (team.awayTeamMembers || []).length, 0);
        const effectiveBIS = teamBIS + awayBIS;
        const hiringGap = funded - teamBIS;

        return { funded, teamBIS, awayBIS, effectiveBIS, hiringGap };
    }

    /**
     * Prepare data for engineer table
     * Retrieved from legacy code and adapted
     */
    prepareEngineerDataForTabulator() {
        if (!window.currentSystemData || !window.currentSystemData.allKnownEngineers) {
            return [];
        }

        return window.currentSystemData.allKnownEngineers.map((engineer) => {
            let teamDisplayForColumn = "Unallocated";
            let actualTeamIdForData = engineer.currentTeamId;
            let sdmName = "N/A";
            let seniorManagerName = "N/A";

            if (engineer.currentTeamId) {
                const team = (window.currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
                if (team) {
                    teamDisplayForColumn = team.teamIdentity || team.teamName || "Unknown Team";
                    if (team.sdmId) {
                        const sdm = (window.currentSystemData.sdms || []).find(s => s.sdmId === team.sdmId);
                        if (sdm) {
                            sdmName = sdm.sdmName;
                            if (sdm.seniorManagerId) {
                                const srMgr = (window.currentSystemData.seniorManagers || []).find(sm => sm.seniorManagerId === sdm.seniorManagerId);
                                if (srMgr) {
                                    seniorManagerName = srMgr.seniorManagerName;
                                }
                            }
                        }
                    }
                } else {
                    teamDisplayForColumn = "Orphaned (Team Missing)";
                    actualTeamIdForData = null;
                }
            }

            return {
                name: engineer.name,
                level: engineer.level,
                teamId: actualTeamIdForData,
                teamDisplay: teamDisplayForColumn,
                sdmName: sdmName,
                seniorManagerName: seniorManagerName,
            };
        });
    }

    /**
     * Define engineer table columns with editing capabilities
     * REFACTORED: Clean column definitions with edit formatters and handlers
     */
    defineEngineerTableColumns() {
        return [
            {
                title: "Engineer Name",
                field: "name",
                sorter: "string",
                minWidth: 180,
                frozen: true,
                headerFilter: "input",
                headerFilterPlaceholder: "Filter by name..."
            },
            {
                title: "Level",
                field: "level",
                width: 100,
                hozAlign: "center",
                sorter: "number",
                editor: "list",
                editorParams: {
                    values: [
                        { label: "L4 (SDE I)", value: 4 },
                        { label: "L5 (SDE II)", value: 5 },
                        { label: "L6 (SDE III / Sr.)", value: 6 },
                        { label: "L7 (Principal)", value: 7 }
                    ]
                },
                formatter: (cell) => this.formatEditableCell(cell, 'level'),
                headerFilter: "list",
                headerFilterParams: {
                    values: [
                        { label: "All", value: "" },
                        { label: "L4", value: 4 },
                        { label: "L5", value: 5 },
                        { label: "L6", value: 6 },
                        { label: "L7", value: 7 }
                    ]
                },
                headerFilterFunc: "=",
                cellEdited: (cell) => this.handleLevelEdit(cell)
            },
            {
                title: "Team Identity",
                field: "teamId",
                minWidth: 180,
                editor: "list",
                editorParams: () => this.getTeamEditorParams(),
                formatter: (cell) => this.formatTeamCell(cell),
                headerFilter: "list",
                headerFilterParams: () => this.getTeamFilterParams(),
                headerFilterFunc: (headerValue, rowValue) => {
                    if (headerValue === "") return true;
                    if (headerValue === "_UNALLOCATED_") return !rowValue;
                    return rowValue === headerValue;
                },
                cellEdited: (cell) => this.handleTeamEdit(cell)
            },
            {
                title: "SDM",
                field: "sdmName",
                sorter: "string",
                minWidth: 150,
                headerFilter: "list",
                headerFilterParams: () => this.getManagerFilterParams('sdms', 'sdmName'),
                headerFilterFunc: "="
            },
            {
                title: "Senior Manager",
                field: "seniorManagerName",
                sorter: "string",
                minWidth: 150,
                headerFilter: "list",
                headerFilterParams: () => this.getManagerFilterParams('seniorManagers', 'seniorManagerName'),
                headerFilterFunc: "="
            }
        ];
    }

    /**
     * Format editable cells with edit icon
     * HELPER: Consistent formatting for editable fields
     */
    formatEditableCell(cell, field) {
        let value = cell.getValue();
        const columnDef = cell.getColumn().getDefinition();

        if (field === 'level') {
            const levels = { 4: 'L4', 5: 'L5', 6: 'L6', 7: 'L7' };
            value = levels[value] || value;
        }

        if (columnDef.editor && value) {
            return `${value} <span style='color:#007bff; font-size:0.8em; margin-left:5px; cursor:pointer;' title='Edit ${columnDef.title}'>✏️</span>`;
        }
        return value || '';
    }

    /**
     * Format team assignment cell
     */
    formatTeamCell(cell) {
        const teamId = cell.getValue();
        const columnDef = cell.getColumn().getDefinition();

        if (!teamId) {
            return columnDef.editor ? `Unallocated <span style='color:#007bff; font-size:0.8em; margin-left:5px; cursor:pointer;'>✏️</span>` : 'Unallocated';
        }

        const team = (window.currentSystemData.teams || []).find(t => t.teamId === teamId);
        const display = team ? (team.teamIdentity || team.teamName || teamId) : `Missing (${teamId.slice(-4)})`;

        if (columnDef.editor) {
            return `${display} <span style='color:#007bff; font-size:0.8em; margin-left:5px; cursor:pointer;' title='Edit Team Assignment'>✏️</span>`;
        }
        return display;
    }

    /**
     * Get team editor parameters
     */
    getTeamEditorParams() {
        const options = [{ label: "Unallocated", value: "" }];
        (window.currentSystemData.teams || []).forEach(team => {
            options.push({
                label: team.teamIdentity || team.teamName || team.teamId,
                value: team.teamId
            });
        });
        return { values: options, autocomplete: true };
    }

    /**
     * Get team filter parameters
     */
    getTeamFilterParams() {
        const options = [{ label: "All", value: "" }, { label: "Unallocated", value: "_UNALLOCATED_" }];
        const addedTeams = new Set();

        (window.currentSystemData.allKnownEngineers || []).forEach(engineer => {
            if (engineer.currentTeamId && !addedTeams.has(engineer.currentTeamId)) {
                const team = (window.currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
                if (team) {
                    options.push({
                        label: team.teamIdentity || team.teamName || team.teamId,
                        value: team.teamId
                    });
                    addedTeams.add(engineer.currentTeamId);
                }
            }
        });

        return { values: options, clearable: true, autocomplete: true };
    }

    /**
     * Get manager filter parameters (reusable)
     */
    getManagerFilterParams(arrayName, fieldName) {
        const options = [{ label: "All", value: "" }];
        const source = window.currentSystemData[arrayName] || [];
        const uniqueNames = new Set();

        source.forEach(item => {
            if (item && item[fieldName]) {
                uniqueNames.add(item[fieldName]);
            }
        });

        Array.from(uniqueNames).sort().forEach(name => {
            options.push({ label: name, value: name });
        });

        return { values: options, clearable: true, autocomplete: true };
    }

    /**
     * Handle level edit
     * CLEAN: Proper event handler with validation
     */
    handleLevelEdit(cell) {
        const engineerName = cell.getRow().getData().name;
        const newLevel = parseInt(cell.getValue());

        if (isNaN(newLevel) || newLevel < 4 || newLevel > 7) {
            window.notificationManager?.showToast('Invalid level. Must be L4-L7.', 'warning');
            cell.restoreOldValue();
            return;
        }

        const engineer = (window.currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
        if (engineer) {
            engineer.level = newLevel;
            if (window.saveSystemChanges) window.saveSystemChanges();
            console.log(`Updated ${engineerName} to L${newLevel}`);
        } else {
            console.error(`Engineer ${engineerName} not found`);
        }
    }

    /**
     * Handle team assignment edit
     * CLEAN: Proper event handler using existing moveEngineerToTeam function
     */
    handleTeamEdit(cell) {
        const engineerName = cell.getRow().getData().name;
        const newTeamId = cell.getValue() === "" ? null : cell.getValue();

        try {
            if (window.moveEngineerToTeam) {
                window.moveEngineerToTeam(engineerName, newTeamId);
                if (window.saveSystemChanges) window.saveSystemChanges();
                this.generateEngineerTable(); // Refresh table
                window.notificationManager?.showToast(`Moved ${engineerName} to ${newTeamId ? 'new team' : 'Unallocated'}`, 'success');
            }
        } catch (error) {
            console.error('Error moving engineer:', error);
            window.notificationManager?.showToast(error.message || 'Failed to move engineer', 'error');
            cell.restoreOldValue();
        }
    }
}

// Export and backwards compatibility
if (typeof window !== 'undefined') {
    window.OrgView = OrgView;

    // Backwards compatibility - global wrapper function for AI integration
    window.renderOrgChartView = function (container) {
        if (!window.orgViewInstance) {
            window.orgViewInstance = new OrgView(container?.id || 'organogramView');
        } else {
            window.orgViewInstance.container = container || document.getElementById('organogramView');
        }
        window.orgViewInstance.render();
    };

    // Export team table generator globally for AI integration
    window.generateTeamTable = function () {
        if (window.orgViewInstance) {
            window.orgViewInstance.generateTeamTable();
        } else {
            console.error('OrgView instance not initialized');
        }
    };

    // Export engineer table generator globally
    window.generateEngineerTable = function () {
        if (window.orgViewInstance) {
            window.orgViewInstance.generateEngineerTable();
        } else {
            console.error('OrgView instance not initialized');
        }
    };

    // Export build hierarchy globally for potential AI use
    window.buildHierarchyData = function () {
        if (window.orgViewInstance) {
            return window.orgViewInstance.buildHierarchyData();
        }
        // Fallback for direct calls
        const view = new OrgView('temp');
        return view.buildHierarchyData();
    };

    // CRITICAL: NavigationManager expects renderOrgView function
    window.renderOrgView = function (container) {
        if (!window.orgViewInstance) {
            window.orgViewInstance = new OrgView(container?.id || 'organogramView');
        } else {
            window.orgViewInstance.container = container || document.getElementById('organogramView');
        }
        window.orgViewInstance.render();
    };
}
