// js/orgView.js

// Keep track of the current org view mode
let currentOrgViewMode = 'd3'; // Default to the new D3 view

/**
 * NEW: Initializes the entire Organization Overview page.
 * Sets up layout switchers and calls the default renderer.
 * MODIFIED: Now handles 3 views (D3, List, Table).
 */
/**
 * NEW: Renders the entire Organization Overview page into the Workspace.
 * Sets up layout switchers and calls the default renderer.
 */
function renderOrgChartView(container) {
    console.log("Rendering Organization Chart View...");

    if (!container) {
        console.error("Org Chart container not provided to renderOrgChartView.");
        // Fallback for legacy calls (if any)
        container = document.getElementById('organogramView');
        if (!container) {
            console.error("Fallback container #organogramView also not found.");
            return;
        }
    }

    // --- Dynamic DOM Creation for Workspace ---
    // We need to ensure the structure exists INSIDE the provided container.
    // We can't rely on IDs being unique if we have multiple views, but for now we'll assume one org view.
    // Better to use classes or scoped selectors, but let's stick to IDs for now to minimize refactoring of internal functions.

    container.innerHTML = `
        <div id="organogramToolbar" style="margin-bottom: 10px; padding: 10px; background-color: #f8f9fa; border-bottom: 1px solid #ddd;"></div>
        <div id="organogramContent" style="overflow: auto; height: calc(100vh - 200px); width: 100%; position: relative;"></div>
        <div id="teamBreakdown" style="display:none; margin-top: 30px;"></div>
        <div id="orgEngineerListView" style="display:none; margin-top: 30px;"></div>
    `;

    const toolbar = container.querySelector('#organogramToolbar');
    const content = container.querySelector('#organogramContent');

    if (!toolbar || !content) {
        console.error("Cannot initialize Org Chart view: toolbar or content div missing after creation.");
        return;
    }

    // --- 1. Setup Toolbar Buttons (Now with 3 buttons) ---
    toolbar.innerHTML = `
        <strong style="margin-right: 10px;">Chart Layout:</strong>
        <button id="orgViewModeD3" class="btn-secondary">Block View</button>
        <button id="orgViewModeList" class="btn-secondary">List View</button>
        <button id="orgViewModeTable" class="btn-secondary">Org Table</button>
        <button id="orgViewModeEngineerList" class="btn-secondary">Engineer List</button>
    `;

    const btnD3 = document.getElementById('orgViewModeD3');
    const btnList = document.getElementById('orgViewModeList');
    const btnTable = document.getElementById('orgViewModeTable');
    const btnEngineerList = document.getElementById('orgViewModeEngineerList');

    // Button click handlers
    btnD3.addEventListener('click', () => {
        currentOrgViewMode = 'd3';
        updateOrgViewRenderer();
    });

    btnList.addEventListener('click', () => {
        currentOrgViewMode = 'list';
        updateOrgViewRenderer();
    });

    btnTable.addEventListener('click', () => {
        currentOrgViewMode = 'table';
        updateOrgViewRenderer();
    });

    btnEngineerList.addEventListener('click', () => {
        currentOrgViewMode = 'engineerList';
        updateOrgViewRenderer();
    });

    // --- 2. Render the correct view based on the current mode ---
    updateOrgViewRenderer(content);
}
// Make globally accessible
window.renderOrgChartView = renderOrgChartView;

/**
 * NEW: Helper function to render the correct org chart based on the current mode.
 * MODIFIED: Now controls visibility of organogramContent AND teamBreakdown.
 */
function updateOrgViewRenderer(chartContainer) {
    const btnD3 = document.getElementById('orgViewModeD3');
    const btnList = document.getElementById('orgViewModeList');
    const btnTable = document.getElementById('orgViewModeTable');
    const btnEngineerList = document.getElementById('orgViewModeEngineerList');

    // Get references to both content containers
    // If chartContainer is not passed, try to find it (fallback)
    if (!chartContainer) chartContainer = document.getElementById('organogramContent');
    const tableContainer = document.getElementById('teamBreakdown');
    const engineerListContainer = document.getElementById('orgEngineerListView');

    if (!chartContainer || !tableContainer) {
        console.error("Missing chart or table containers.");
        return;
    }

    // Reset all button styles
    btnD3.classList.add('btn-secondary');
    btnD3.classList.remove('btn-primary');
    btnList.classList.add('btn-secondary');
    btnList.classList.remove('btn-primary');
    btnTable.classList.add('btn-secondary');
    btnTable.classList.remove('btn-primary');
    btnEngineerList.classList.add('btn-secondary');
    btnEngineerList.classList.remove('btn-primary');

    // Hide both containers by default
    chartContainer.style.display = 'none';
    tableContainer.style.display = 'none';
    engineerListContainer.style.display = 'none';

    if (currentOrgViewMode === 'd3') {
        btnD3.classList.add('btn-primary');
        btnD3.classList.remove('btn-secondary');

        chartContainer.style.display = 'block'; // Show chart container
        if (typeof renderD3OrgChart === 'function') {
            renderD3OrgChart(chartContainer); // Pass container explicitly
        } else {
            console.error("renderD3OrgChart function not found.");
        }
    } else if (currentOrgViewMode === 'list') {
        btnList.classList.add('btn-primary');
        btnList.classList.remove('btn-secondary');

        chartContainer.style.display = 'block'; // Show chart container
        if (typeof renderHtmlOrgList === 'function') {
            renderHtmlOrgList(chartContainer); // Pass container explicitly
        } else {
            console.error("renderHtmlOrgList function not found.");
        }
    } else if (currentOrgViewMode === 'table') {
        btnTable.classList.add('btn-primary');
        btnTable.classList.remove('btn-secondary');

        tableContainer.style.display = 'block'; // Show table container
        if (typeof generateTeamTable === 'function') {
            // This function renders the EnhancedTableWidget
            generateTeamTable(currentSystemData);
        } else {
            console.error("generateTeamTable function not found.");
        }
    } else if (currentOrgViewMode === 'engineerList') {
        btnEngineerList.classList.add('btn-primary');
        btnEngineerList.classList.remove('btn-secondary');

        engineerListContainer.style.display = 'block'; // Show engineer list container
        if (typeof generateEngineerTable === 'function') {
            generateEngineerTable();
        } else {
            console.error("generateEngineerTable function not found.");
        }
    }
}


/**
 * Builds hierarchical data for Organogram.
 * MODIFIED: Ensures all nodes (srMgr, sdm) have a generic `name` property for D3.
 */
function buildHierarchyData() {
    console.log("Building hierarchy data (D3-compatible)...");
    if (!currentSystemData) return null;

    // Add `name` property for D3 compatibility
    const sdmMap = new Map((currentSystemData.sdms || []).map(sdm => [sdm.sdmId, { ...sdm, name: sdm.sdmName, children: [], type: 'sdm' }]));
    const srMgrMap = new Map((currentSystemData.seniorManagers || []).map(sr => [sr.seniorManagerId, { ...sr, name: sr.seniorManagerName, children: [], type: 'srMgr' }]));

    sdmMap.forEach(sdm => {
        if (sdm.seniorManagerId && srMgrMap.has(sdm.seniorManagerId)) {
            srMgrMap.get(sdm.seniorManagerId).children.push(sdm);
        } else {
            const unassignedSrMgrKey = 'unassigned-sr-mgr';
            if (!srMgrMap.has(unassignedSrMgrKey)) {
                // Add `name` property for D3 compatibility
                srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', name: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
            }
            if (sdm && sdm.sdmId) srMgrMap.get(unassignedSrMgrKey).children.push(sdm);
        }
    });

    (currentSystemData.teams || []).forEach(team => {
        const awayTeamCount = team.awayTeamMembers?.length ?? 0;
        const sourceSummary = typeof getSourceSummary === 'function' ? getSourceSummary(team.awayTeamMembers) : '';

        // Build engineer children by looking up names from team.engineers in allKnownEngineers
        const engineerChildren = (team.engineers || []).map(engineerName => {
            const engineerDetails = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
            return {
                name: `${engineerDetails ? engineerDetails.name : engineerName} (L${engineerDetails ? engineerDetails.level : '?'})${engineerDetails?.attributes?.isAISWE ? ' [AI]' : ''}`,
                type: 'engineer'
            };
        }).filter(e => e.name); // Filter out any undefined if lookup failed, though ideally names should always exist

        const teamNode = {
            name: team.teamIdentity || team.teamName || 'Unnamed Team',
            type: 'team',
            details: `BIS: ${team.engineers?.length ?? 0} / Funded: ${team.fundedHeadcount ?? 'N/A'}`,
            awayTeamCount: awayTeamCount,
            awaySourceSummary: sourceSummary,
            children: engineerChildren
        };

        if (team.sdmId && sdmMap.has(team.sdmId)) {
            sdmMap.get(team.sdmId).children.push(teamNode);
        } else {
            const unassignedSdmKey = 'unassigned-sdm';
            if (!sdmMap.has(unassignedSdmKey)) {
                // Add `name` property for D3 compatibility
                sdmMap.set(unassignedSdmKey, { sdmId: unassignedSdmKey, sdmName: 'Unassigned SDM', name: 'Unassigned SDM', children: [], type: 'sdm' });
                const unassignedSrMgrKey = 'unassigned-sr-mgr';
                if (!srMgrMap.has(unassignedSrMgrKey)) {
                    // Add `name` property for D3 compatibility
                    srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', name: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
                }
                srMgrMap.get(unassignedSrMgrKey).children.push(sdmMap.get(unassignedSdmKey));
            }
            if (team && team.teamId) sdmMap.get(unassignedSdmKey).children.push(teamNode);
        }
    });

    const root = {
        name: currentSystemData.systemName || 'Organization',
        type: 'root',
        children: Array.from(srMgrMap.values())
    };

    console.log("Finished building hierarchy data.");
    return root;
}

/**
 * RENAMED: Was previously generateOrganogram()
 * Generates the Organogram using HTML list structure.
 */
function renderHtmlOrgList(container) {
    console.log("Generating Organogram HTML List...");
    const hierarchicalData = buildHierarchyData();

    if (!container) container = document.getElementById('organogramContent');

    if (!hierarchicalData || !container) {
        console.error("No data or container for organogram HTML.");
        if (container) container.innerHTML = '<p style="color: red;">Could not generate organogram data.</p>';
        return;
    }
    container.innerHTML = '';
    container.style.fontFamily = 'Arial, sans-serif';

    function buildHtmlLevel(node, level) {
        if (!node) return '';
        let html = `<div class="org-level-${level}" style="margin-left: ${level * 25}px; margin-bottom: 5px; padding: 3px 5px; border-left: 2px solid #eee; position: relative;">`;
        let nodeContent = '';
        let nodeStyle = '';
        let detailsStyle = 'font-size: 0.8em; color: #555; margin-left: 5px;';

        switch (node.type) {
            case 'root':
                nodeContent = `<strong>System: ${node.name || 'N/A'}</strong>`;
                nodeStyle = 'font-size: 1.2em; color: #333;';
                break;
            case 'srMgr':
                nodeContent = `<strong title="${node.seniorManagerId || ''}">Sr. Manager: ${node.seniorManagerName || node.name || 'N/A'}</strong>`;
                nodeStyle = 'font-size: 1.1em; color: #0056b3;';
                break;
            case 'sdm':
                nodeContent = `<strong title="${node.sdmId || ''}">SDM: ${node.sdmName || node.name || 'N/A'}</strong>`;
                nodeStyle = 'color: #007bff;';
                break;
            case 'team':
                nodeContent = `<span style="color: #17a2b8;">Team: ${node.name || 'N/A'}</span> <span style="${detailsStyle}">(${node.details || ''})</span>`;
                if (node.awayTeamCount > 0) {
                    const awaySourceText = node.awaySourceSummary || 'Source Unknown';
                    const annotation = ` <span style="color: #dc3545; font-style: italic; font-size: 0.9em;" title="Away-Team Sources: ${awaySourceText}">(+${node.awayTeamCount} Away)</span>`;
                    nodeContent += annotation;
                }
                // Display engineer names from node.children (which are already formatted by buildHierarchyData)
                if (node.children && node.children.length > 0) {
                    nodeContent += '<ul style="list-style: none; padding-left: 15px; margin-top: 3px;">';
                    node.children.forEach(engNode => { // These are engineer nodes from buildHierarchyData
                        if (engNode.type === 'engineer') {
                            nodeContent += `<li style="font-size:0.85em;">${engNode.name}</li>`;
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

        // Recursively add children for non-team, non-engineer types
        if (node.children && node.children.length > 0 && node.type !== 'team' && node.type !== 'engineer') {
            node.children.forEach(child => {
                html += buildHtmlLevel(child, level + 1);
            });
        }
        html += `</div>`;
        return html;
    }
    container.innerHTML = buildHtmlLevel(hierarchicalData, 0);
    console.log("Finished generating Organogram HTML List.");
}

/**
 * NEW (v4): Generates the Organogram using a D3 Tree Layout (Top-Down).
 * MODIFIED: Uses <foreignObject> and adds correct xmlns attribute for HTML text wrapping.
 */
function renderD3OrgChart(container) {
    console.log("Generating D3 Org Chart (Top-Down, Text Wrap v4)...");
    const hierarchicalData = buildHierarchyData();

    // Fallback if container not passed
    if (!container) container = document.getElementById('organogramContent');

    if (!hierarchicalData || !container) {
        console.error("D3 Org Chart container or data not found.");
        if (container) container.innerHTML = '<p style="color: red;">Could not generate D3 organogram data.</p>';
        return;
    }

    // DEBUG: Check container dimensions and visibility
    const rect = container.getBoundingClientRect();
    console.log(`D3 Org Chart Container Debug: ID=${container.id}, Width=${rect.width}, Height=${rect.height}, Display=${getComputedStyle(container).display}, Visibility=${getComputedStyle(container).visibility}`);


    container.innerHTML = ''; // Clear existing content
    container.style.fontFamily = ''; // Unset inline style



    // Use ResizeObserver to ensure container has dimensions before rendering
    // This handles the first-load race condition where clientWidth is 0
    const renderChart = (force = false) => {
        // Get container size for responsive chart
        // If force is true, or if clientWidth is 0, use a default width
        let width = container.clientWidth;
        if (width === 0) {
            if (force) {
                console.warn("D3 Org Chart: Container width is 0, using default 960px.");
                width = 960;
            } else {
                return; // Still waiting for layout
            }
        }
        const height = 1200; // Fixed height, chart will be scrollable

        if (width === 0) return; // Still waiting for layout

        console.log(`D3 Render: Calculated Width=${width}, Height=${height}`);

        // Define node box sizes and spacing
        const nodeWidth = 220;
        const nodeHeight = 80;
        const verticalSpacing = 100;   // Space BETWEEN nodes vertically
        const horizontalSpacing = 20;   // Space BETWEEN nodes horizontally

        // Create SVG
        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("overflow", "auto"); // Enable overflow for zoom/pan

        // Tooltip
        const tooltip = d3.select("body").selectAll(".tooltip").data([null]).join("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Main group for chart content (for zooming)
        const g = svg.append("g");

        // Create Tree Layout
        const tree = d3.tree()
            .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing]);

        // Create Hierarchy
        const root = d3.hierarchy(hierarchicalData);

        // Assign `_children` for collapse/expand
        root.descendants().forEach(d => {
            d._children = d.children;
            // Start with engineers collapsed (teams are parents of engineers)
            if (d.data.type === 'team') {
                d.children = null;
            }
        });

        // Set initial position for the root node
        root.x0 = width / 2; // Initial horizontal center
        root.y0 = nodeHeight;  // Initial vertical position

        // This is the main function that draws/updates the chart
        const update = (source) => {
            const duration = 250;

            // Recalculate layout
            const treeData = tree(root);

            // Get nodes and links
            const nodes = treeData.descendants().reverse();
            const links = treeData.links();

            // Normalize for fixed-depth (y position)
            nodes.forEach(d => {
                d.y = d.depth * (nodeHeight + verticalSpacing) + nodeHeight; // y = depth * spacing
            });

            // --- LINKS ---
            function elbow(d) {
                return `M ${d.source.x},${d.source.y + nodeHeight / 2}` +
                    ` V ${d.target.y - verticalSpacing / 2}` +
                    ` H ${d.target.x}` +
                    ` V ${d.target.y - nodeHeight / 2}`;
            }

            const link = g.selectAll(".org-link")
                .data(links, d => d.target.id);

            const linkEnter = link.enter().append("path")
                .attr("class", "org-link")
                .attr("d", d => {
                    const o = { x: source.x0 || source.x, y: source.y0 || source.y };
                    return `M ${o.x},${o.y + nodeHeight / 2}` +
                        ` V ${o.y + nodeHeight / 2}` +
                        ` H ${o.x}` +
                        ` V ${o.y + nodeHeight / 2}`;
                })
                .attr("fill", "none")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1.5);

            link.merge(linkEnter).transition().duration(duration)
                .attr("d", elbow);

            link.exit().transition().duration(duration)
                .attr("d", d => {
                    const o = { x: source.x, y: source.y };
                    return `M ${o.x},${o.y + nodeHeight / 2}` +
                        ` V ${o.y + nodeHeight / 2}` +
                        ` H ${o.x}` +
                        ` V ${o.y + nodeHeight / 2}`;
                })
                .remove();

            // --- NODES ---
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

            // Add the rectangle for the node
            nodeEnter.append("rect")
                .attr("class", "org-node-rect")
                .attr("width", nodeWidth)
                .attr("height", nodeHeight)
                .attr("x", -nodeWidth / 2)
                .attr("y", -nodeHeight / 2)
                .attr("rx", 4)
                .attr("ry", 4)
                .style("cursor", d => d.data.type !== 'engineer' ? "pointer" : "default");

            // Add <foreignObject> for text wrapping
            const fo = nodeEnter.append("foreignObject")
                .attr("x", -nodeWidth / 2)
                .attr("y", -nodeHeight / 2)
                .attr("width", nodeWidth)
                .attr("height", nodeHeight)
                .style("pointer-events", "none");

            // Add namespaced HTML div for content
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

            // Add expand/collapse indicator (SVG text)
            nodeEnter.append("text")
                .attr("class", "org-node-toggle")
                .attr("text-anchor", "middle")
                .attr("y", (nodeHeight / 2) + 16)
                .text(d => {
                    if (d.data.type === 'engineer') return '';
                    return d._children ? '▼' : (d.children ? '▲' : '');
                });

            // Transition nodes to their new position.
            node.merge(nodeEnter).transition().duration(duration)
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .style("opacity", 1);

            // Update toggle text on merge
            node.merge(nodeEnter).select(".org-node-toggle")
                .text(d => {
                    if (d.data.type === 'engineer') return '';
                    return d._children ? '▼' : (d.children ? '▲' : '');
                });

            // Transition exiting nodes to the parent's new position.
            node.exit().transition().duration(duration)
                .attr("transform", d => `translate(${source.x},${source.y})`)
                .style("opacity", 0)
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });

        }; // End of update function

        // Initial render
        update(root);

        // --- Initial Zoom & Pan ---
        const bounds = g.node().getBBox();
        const chartWidth = bounds.width;

        const scale = Math.min(1, (width / (chartWidth + 100)) * 0.8);

        const tx = (width / 2) - (root.x * scale);
        const ty = 50; // 50px margin from top

        const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);

        const zoom = d3.zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom)
            .call(zoom.transform, initialTransform);

        console.log("D3 Org Chart (Top-Down, Text Wrap) rendered.");
    };

    // Check if we can render immediately
    if (container.clientWidth > 0) {
        renderChart();
    } else {
        console.log("D3 Org Chart: Container has 0 width, waiting for resize...");

        let rendered = false;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && !rendered) {
                    console.log("D3 Org Chart: Container resized, rendering...");
                    rendered = true;
                    renderChart();
                    observer.disconnect();
                    break;
                }
            }
        });
        observer.observe(container);

        // Fallback: If resize doesn't fire within 500ms, force render (assuming layout settled)
        setTimeout(() => {
            if (!rendered) {
                console.warn("D3 Org Chart: ResizeObserver timed out, forcing render...");
                rendered = true;
                observer.disconnect();
                renderChart(true); // Force render with default width
            }
        }, 500);
    }

}


// Keep a global instance for the team table widget
let teamTableWidgetInstance = null;

/**
 * NEW: Generates the Team Breakdown Table using EnhancedTableWidget.
 * This replaces the old manual HTML table.
 */
function generateTeamTable() {
    console.log("Generating Team Breakdown Table using EnhancedTableWidget...");

    const tableData = prepareTeamDataForTabulator();
    const columnDefinitions = defineTeamTableColumns();

    const widgetContainerId = 'teamBreakdown'; // We'll re-use the existing div
    let widgetTargetDiv = document.getElementById(widgetContainerId);

    if (!widgetTargetDiv) {
        console.error("Cannot find #teamBreakdown div to render team table widget.");
        return;
    }

    // Clear the old content (like the H2 and p tags) to make way for the widget
    widgetTargetDiv.innerHTML = '';
    widgetTargetDiv.style.marginTop = '30px'; // Re-apply margin

    // Destroy previous widget instance if it exists
    if (teamTableWidgetInstance) {
        teamTableWidgetInstance.destroy();
        teamTableWidgetInstance = null;
        console.log("Previous Team Table widget instance destroyed.");
    }

    // Create new instance of EnhancedTableWidget
    try {
        teamTableWidgetInstance = new EnhancedTableWidget(widgetContainerId, {
            data: tableData,
            columns: columnDefinitions,
            uniqueIdField: 'teamId', // Use teamId as the unique key
            paginationSize: 50,
            paginationSizeSelector: [25, 50, 100, 250],
            initialSort: [{ column: "seniorManagerName", dir: "asc" }, { column: "sdmName", dir: "asc" }],
            exportCsvFileName: 'team_breakdown.csv',
            exportJsonFileName: 'team_breakdown.json',
            exportXlsxFileName: 'team_breakdown.xlsx',
            exportSheetName: 'Team Breakdown',
            layout: "fitData" // Use fitData to make it feel more like a table
        });
        console.log("Team Breakdown EnhancedTableWidget instance created.");

    } catch (error) {
        console.error("Error creating EnhancedTableWidget for Team Breakdown:", error);
        widgetTargetDiv.innerHTML = "<p style='color:red;'>Error initializing team table widget. Check console.</p>";
    }
}
window.generateTeamTable = generateTeamTable; // Make global if it isn't already


/**
 * NEW: Prepares flat data for the Team Breakdown Tabulator.
 */
function prepareTeamDataForTabulator() {
    if (!currentSystemData || !currentSystemData.teams) {
        console.warn("prepareTeamDataForTabulator: currentSystemData.teams is missing.");
        return [];
    }

    // Create maps for efficient lookups
    const sdmMap = new Map((currentSystemData.sdms || []).map(s => [s.sdmId, s]));
    const srMgrMap = new Map((currentSystemData.seniorManagers || []).map(sm => [sm.seniorManagerId, sm]));
    const pmtMap = new Map((currentSystemData.pmts || []).map(p => [p.pmtId, p]));
    const engineerMap = new Map((currentSystemData.allKnownEngineers || []).map(e => [e.name, e]));

    let teamServicesMap = {};
    (currentSystemData.services || []).forEach(service => {
        let teamId = service.owningTeamId;
        if (teamId) {
            if (!teamServicesMap[teamId]) teamServicesMap[teamId] = [];
            teamServicesMap[teamId].push(service.serviceName);
        }
    });

    return currentSystemData.teams.map(team => {
        const sdm = sdmMap.get(team.sdmId);
        const seniorManager = sdm ? srMgrMap.get(sdm.seniorManagerId) : null;
        const pmt = pmtMap.get(team.pmtId);

        const teamBIS = (team.engineers || []).length;
        const fundedHC = team.fundedHeadcount ?? 0;
        const awayTeamBIS = (team.awayTeamMembers || []).length;
        const effectiveBIS = teamBIS + awayTeamBIS;
        const hiringGap = fundedHC - teamBIS;

        // Get engineer details
        const engineerDetails = (team.engineers || []).map(name => {
            const eng = engineerMap.get(name);
            if (eng) {
                const type = eng.attributes?.isAISWE ? ` [AI]` : '';
                return `${eng.name} (L${eng.level})${type}`;
            }
            return `${name} (Details Missing)`;
        }).join('\n'); // Use newline for tooltip/clipboard

        // Get away team details
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
 * NEW HELPER: Generates header filter params for name-based dropdowns.
 * @param {Array} sourceArray - The array to get unique names from (e.g., currentSystemData.sdms)
 * @param {string} nameField - The field to use for the label/value (e.g., "sdmName")
 * @returns {object} Parameters for Tabulator's headerFilterParams
 */
function getNameHeaderFilterParams(sourceArray, nameField) {
    const options = [{ label: "All", value: "" }];
    if (sourceArray) {
        const uniqueNames = {};
        sourceArray.forEach(item => {
            if (item && item[nameField]) {
                uniqueNames[item[nameField]] = item[nameField]; // Value is the name itself for filtering
            }
        });
        Object.keys(uniqueNames).sort((a, b) => String(a).localeCompare(String(b))).forEach(name => {
            options.push({ label: name, value: name });
        });
    }
    // Add an option for "N/A" (unassigned)
    options.push({ label: "N/A", value: "N/A" });
    return { values: options, clearable: true, autocomplete: true };
};

/**
 * NEW: Defines the columns for the Team Breakdown Tabulator.
 * MODIFIED: Uses "list" header filters for categorical columns.
 */
function defineTeamTableColumns() {
    // Custom formatter for gap
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
            cell.getElement().title = `At hiring target`;
        }
        return value;
    };

    // Custom formatter for multiline text
    const multilineFormatter = (cell) => {
        const value = cell.getValue();
        return value ? value.replace(/\n/g, '<br>') : "None";
    };

    return [
        {
            title: "Senior Manager",
            field: "seniorManagerName",
            minWidth: 150,
            frozen: true,
            headerFilter: "list",
            headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.seniorManagers, 'seniorManagerName'),
            headerFilterFunc: "="
        },
        {
            title: "SDM",
            field: "sdmName",
            minWidth: 150,
            frozen: true,
            headerFilter: "list",
            headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.sdms, 'sdmName'),
            headerFilterFunc: "="
        },
        {
            title: "Team Identity",
            field: "teamIdentity",
            minWidth: 150,
            frozen: true,
            headerFilter: "list",
            headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.teams, 'teamIdentity'),
            headerFilterFunc: "="
        },
        {
            title: "Team Name",
            field: "teamName",
            minWidth: 200,
            headerFilter: "input" // Team Name is free-text, so input is fine
        },
        {
            title: "PMT",
            field: "pmtName",
            minWidth: 150,
            headerFilter: "list",
            headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.pmts, 'pmtName'),
            headerFilterFunc: "="
        },
        { title: "Team BIS", field: "teamBIS", width: 90, hozAlign: "center", sorter: "number", headerFilter: "number" },
        { title: "Funded HC", field: "fundedHeadcount", width: 100, hozAlign: "center", sorter: "number", headerFilter: "number" },
        { title: "Effective BIS", field: "effectiveBIS", width: 100, hozAlign: "center", sorter: "number", headerFilter: "number" },
        { title: "Hiring Gap", field: "hiringGap", width: 100, hozAlign: "center", sorter: "number", formatter: gapFormatter, headerFilter: "number" },
        { title: "Engineers", field: "engineerDetails", minWidth: 250, formatter: multilineFormatter, tooltip: true, headerFilter: "input", headerSort: false },
        { title: "Away-Team", field: "awayTeamDetails", minWidth: 250, formatter: multilineFormatter, tooltip: true, headerFilter: "input", headerSort: false },
        { title: "Services Owned", field: "servicesOwned", minWidth: 250, formatter: multilineFormatter, tooltip: true, headerFilter: "input", headerSort: false }
    ];
}


let engineerTableWidgetInstance = null; // Keep this global for the widget

/**
 * Generates the Engineer List table by instantiating and configuring
 * the EnhancedTableWidget.
 * MODIFIED: Added a redraw call for Tabulator to fix initial display issues.
 */
function generateEngineerTable() {
    console.log("Generating Engineer List using EnhancedTableWidget...");
    if (typeof updateEngineerTableHeading === 'function') {
        updateEngineerTableHeading();
    } else {
        console.warn("updateEngineerTableHeading function not found.");
    }

    const tableData = prepareEngineerDataForTabulator(); // This function is already updated
    const columnDefinitions = defineEngineerTableColumns(); // This function is already updated

    const widgetContainerId = 'orgEngineerListView';
    let widgetTargetDiv = document.getElementById(widgetContainerId);

    if (!widgetTargetDiv) {
        console.error("Cannot find #orgEngineerListView to append widget container.");
        return;
    }

    // Clear the container and add a heading
    widgetTargetDiv.innerHTML = '<h2 id="orgEngineerTableHeading"></h2>';
    const widgetInnerContainer = document.createElement('div');
    widgetInnerContainer.id = 'orgEngineerTableWidgetContainer';
    widgetTargetDiv.appendChild(widgetInnerContainer);

    updateEngineerTableHeading(); // Call this after the heading element is created

    // Destroy previous widget instance if it exists to prevent conflicts
    if (engineerTableWidgetInstance) {
        engineerTableWidgetInstance.destroy();
        engineerTableWidgetInstance = null;
        console.log("Previous Engineer List widget instance destroyed.");
    }

    // Create new instance of EnhancedTableWidget
    try {
        engineerTableWidgetInstance = new EnhancedTableWidget(widgetInnerContainer.id, {
            data: tableData,
            columns: columnDefinitions,
            uniqueIdField: 'name',
            paginationSize: 100,
            paginationSizeSelector: [25, 50, 100, 250, 500],
            initialSort: [{ column: "name", dir: "asc" }],
            exportCsvFileName: 'engineer_list.csv',
            exportJsonFileName: 'engineer_list.json',
            exportXlsxFileName: 'engineer_list.xlsx',
            exportSheetName: 'Engineers'
            // cellEdited callback is now part of columnDefinitions
        });
        console.log("Engineer List EnhancedTableWidget instance created.");

        // Force Tabulator to redraw after a very short delay
        // This ensures the container is visible and has dimensions.
        if (engineerTableWidgetInstance && engineerTableWidgetInstance.tabulatorInstance) {
            setTimeout(() => {
                console.debug("Attempting Tabulator redraw for Engineer List after short delay.");
                engineerTableWidgetInstance.tabulatorInstance.redraw(true);
            }, 100); // 100ms delay, can be adjusted
        } else {
            console.warn("Could not access tabulatorInstance for redraw inside generateEngineerTable.");
        }
    } catch (error) {
        console.error("Error creating EnhancedTableWidget for Engineer List:", error);
        if (widgetTargetDiv) {
            widgetTargetDiv.innerHTML = "<p style='color:red;'>Error initializing engineer table widget. Check console.</p>";
        }
    }
}

// In js/orgView.js

// Function: prepareEngineerDataForTabulator
// MODIFIED: To extract and prepare new engineer attributes for the table.
function prepareEngineerDataForTabulator() {
    if (!currentSystemData || !currentSystemData.allKnownEngineers) {
        console.warn("prepareEngineerDataForTabulator: currentSystemData.allKnownEngineers is missing.");
        return [];
    }

    return currentSystemData.allKnownEngineers.map((engineer) => {
        let sdmName = "N/A";
        let seniorManagerName = "N/A";

        if (engineer.currentTeamId) {
            const team = (currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
            if (team) {
                if (team.sdmId) {
                    const sdm = (currentSystemData.sdms || []).find(s => s.sdmId === team.sdmId);
                    if (sdm) {
                        sdmName = sdm.sdmName;
                        if (sdm.seniorManagerId) {
                            const srMgr = (currentSystemData.seniorManagers || []).find(sm => sm.seniorManagerId === sdm.seniorManagerId);
                            if (srMgr) {
                                seniorManagerName = srMgr.seniorManagerName;
                            }
                        }
                    }
                }
            }
        }

        // Prepare data from attributes, ensuring defaults if attributes or nested fields are missing
        const attributes = engineer.attributes || {}; // Ensure attributes object exists
        const isAISWE = attributes.isAISWE || false;
        const aiAgentType = isAISWE ? (attributes.aiAgentType || "General AI") : "-";
        const skillsArray = Array.isArray(attributes.skills) ? attributes.skills : [];
        const yearsOfExperience = typeof attributes.yearsOfExperience === 'number' ? attributes.yearsOfExperience : 0;

        return {
            name: engineer.name,
            level: engineer.level,
            teamId: engineer.currentTeamId,
            sdmName: sdmName,
            seniorManagerName: seniorManagerName,
            // New fields from attributes
            isAISWE: isAISWE, // Boolean, for formatter
            aiAgentType: aiAgentType,
            skills: skillsArray.join(', '), // Comma-separated string for display and editing
            _skillsArray: skillsArray, // Keep original array for editing if needed, or parse from string
            yearsOfExperience: yearsOfExperience
        };
    });
}

// Function: defineEngineerTableColumns
// MODIFIED: Added new columns for Type (AI/Human), AI Agent Type, Skills (editable), and Years Exp.
// These new columns are set to visible: false by default.
// In js/orgView.js

// Replace the existing defineEngineerTableColumns function with this:
function defineEngineerTableColumns() {
    console.log("Defining Engineer Table Columns (Tabulator list editor fix)..."); // Added console log
    const engineerLevels = [
        { label: "All", value: "" }, { label: "L1", value: 1 }, { label: "L2", value: 2 }, { label: "L3", value: 3 },
        { label: "L4", value: 4 }, { label: "L5", value: 5 }, { label: "L6", value: 6 }, { label: "L7", value: 7 }
    ];
    // For Level Cell Editor
    const levelCellEditorParams = {
        values: engineerLevels.filter(l => l.value !== ""), // Exclude "All" from cell editor
        autocomplete: false, // Consider true if list is very long
        clearable: false // A level should probably always be set
    };
    // For Level Header Filter
    const levelHeaderFilterParams = {
        values: engineerLevels, // "All" is included for clearing filter
        clearable: true,
        autocomplete: true,
        multiselect: false
    };

    // For Team Identity Cell Editor
    const getTeamIdentityCellEditorParams = () => {
        const teams = currentSystemData.teams || [];
        const options = [{ label: "-- Unassign --", value: "" }]; // "" value for null teamId
        (teams || []).forEach(team => { // Ensure teams is an array
            const displayIdentity = team.teamIdentity || team.teamName || team.teamId;
            if (displayIdentity) {
                options.push({ label: String(displayIdentity), value: team.teamId });
            }
        });
        // Sort options by label, keeping "-- Unassign --" at the top
        options.sort((a, b) => {
            if (a.value === "") return -1;
            if (b.value === "") return 1;
            return String(a.label).localeCompare(String(b.label));
        });
        return { values: options, autocomplete: true, clearable: true }; // enable autocomplete
    };

    // For Team Identity Header Filter
    const getTeamIdentityHeaderFilterParams = () => {
        const options = [{ label: "All", value: "" }];
        const addedTeamIds = new Set([""]);

        if (currentSystemData && currentSystemData.allKnownEngineers) {
            (currentSystemData.allKnownEngineers || []).forEach(engineer => { // Ensure allKnownEngineers is an array
                if (engineer.currentTeamId && !addedTeamIds.has(engineer.currentTeamId)) {
                    const team = (currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
                    if (team) {
                        const display = team.teamIdentity || team.teamName || team.teamId;
                        options.push({ label: String(display), value: team.teamId });
                        addedTeamIds.add(team.teamId);
                    }
                } else if (!engineer.currentTeamId && !addedTeamIds.has("_UNALLOCATED_")) {
                    options.push({ label: "Unallocated", value: "_UNALLOCATED_" });
                    addedTeamIds.add("_UNALLOCATED_");
                }
            });
        }
        options.sort((a, b) => {
            if (a.value === "") return -1;
            if (b.value === "") return 1;
            if (a.value === "_UNALLOCATED_") return options.length - 1; // Try to push Unallocated towards end
            if (b.value === "_UNALLOCATED_") return -(options.length - 1);
            return String(a.label).localeCompare(String(b.label));
        });
        return { values: options, clearable: true, autocomplete: true };
    };

    // For SDM and Sr Manager Header Filters
    const getNameHeaderFilterParams = (sourceArray, nameField) => {
        const options = [{ label: "All", value: "" }];
        if (sourceArray) {
            const uniqueNames = {};
            sourceArray.forEach(item => {
                if (item && item[nameField]) {
                    uniqueNames[item[nameField]] = item[nameField]; // Value is the name itself for filtering
                }
            });
            Object.keys(uniqueNames).sort((a, b) => String(a).localeCompare(String(b))).forEach(name => {
                options.push({ label: name, value: name });
            });
        }
        return { values: options, clearable: true, autocomplete: true };
    };

    // Generic formatter for cells that might be editable, to add an edit icon
    const editableCellFormatter = (cell) => {
        let value = cell.getValue();
        const field = cell.getField();
        const columnDef = cell.getColumn().getDefinition();

        if (field === "level") {
            const levelObj = engineerLevels.find(l => l.value === parseInt(value));
            value = levelObj ? levelObj.label : String(value);
        } else if (field === "teamId") {
            const teamId = cell.getValue();
            if (teamId) {
                const team = (currentSystemData.teams || []).find(t => t.teamId === teamId);
                value = team ? (team.teamIdentity || team.teamName || teamId) : `Missing (${teamId.slice(-4)})`;
            } else {
                value = "Unallocated";
            }
        }
        // Skills and Years Exp. have their own formatters if needed, or are handled by prepare...

        if (columnDef.editor && value !== undefined && value !== null && String(value).trim() !== "") { // Add edit icon if column is editable and has a value
            return `${value} <span style='color:#007bff; font-size:0.8em; margin-left: 5px; cursor:pointer;' title='Edit ${columnDef.title || field}'>✏️</span>`;
        }
        return value; // Return value directly if no editor or if value is empty
    };

    return [
        { title: "Engineer Name", field: "name", sorter: "string", minWidth: 180, frozen: true, editable: false, headerFilter: "input", headerFilterPlaceholder: "Filter by name...", accessorDownload: (v, d) => d.name },
        {
            title: "Level", field: "level", width: 100, hozAlign: "left", sorter: "number",
            editor: "list", editorParams: levelCellEditorParams,
            formatter: editableCellFormatter,
            headerFilter: "list", headerFilterParams: levelHeaderFilterParams, headerFilterFunc: "=",
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newLevelValue = parseInt(cell.getValue()); // Editor should provide the value directly
                if (isNaN(newLevelValue) || newLevelValue < 1 || newLevelValue > 7) {
                    alert("Invalid level. Please select a valid level from the list.");
                    cell.restoreOldValue();
                    return;
                }
                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                if (engineerGlobal) {
                    engineerGlobal.level = newLevelValue;
                    console.log(`Updated level for ${engineerName} to ${newLevelValue} in allKnownEngineers.`);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                } else {
                    console.error(`Engineer ${engineerName} not found in allKnownEngineers for level update.`);
                }
            },
            accessorDownload: (v, d) => (engineerLevels.find(l => l.value === d.level) || { label: d.level }).label
        },
        {
            title: "Type", field: "isAISWE", width: 70, hozAlign: "center",
            formatter: (cell) => {
                const isAI = cell.getValue();
                return isAI ? '<i class="fas fa-robot" title="AI Engineer"></i>' : '<i class="fas fa-user" title="Human Engineer"></i>';
            },
            headerFilter: "list", // Changed from "select" to "list"
            headerFilterParams: {
                values: [ // Using array of objects for "list" header filter
                    { label: "All", value: "" },
                    { label: "AI", value: true },
                    { label: "Human", value: false }
                ]
            },
            visible: false,
            download: true, accessorDownload: (v, d) => d.isAISWE ? "AI" : "Human"
        },
        {
            title: "AI Agent Type", field: "aiAgentType", minWidth: 150, hozAlign: "left",
            formatter: (cell) => cell.getValue() || "-",
            headerFilter: "input", headerFilterPlaceholder: "Filter by AI Type...",
            visible: false,
            download: true, accessorDownload: (v, d) => d.aiAgentType === "-" ? "" : d.aiAgentType // Export blank if it was just a dash
        },
        {
            title: "Skills", field: "skills", minWidth: 200, hozAlign: "left",
            editor: "input",
            formatter: editableCellFormatter,
            headerFilter: "input", headerFilterPlaceholder: "Filter by skills (comma-sep)...",
            visible: false,
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newSkillsString = cell.getValue();
                const newSkillsArray = newSkillsString ? newSkillsString.split(',').map(s => s.trim()).filter(s => s) : [];
                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                if (engineerGlobal) {
                    if (!engineerGlobal.attributes) engineerGlobal.attributes = { isAISWE: false, aiAgentType: null, skills: [], yearsOfExperience: 0 };
                    engineerGlobal.attributes.skills = newSkillsArray;
                    console.log(`Updated skills for ${engineerName} to:`, newSkillsArray);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                }
            },
            download: true, accessorDownload: (v, d) => d.skills
        },
        {
            title: "Years Exp.", field: "yearsOfExperience", width: 100, hozAlign: "right", sorter: "number",
            formatter: (cell) => {
                const val = cell.getValue();
                return (typeof val === 'number') ? `${val} years` : (val || "-");
            },
            headerFilter: "number", headerFilterParams: { placeholder: "e.g. >2" }, // Tabulator uses headerFilterParams for placeholder
            visible: false,
            download: true, accessorDownload: (v, d) => d.yearsOfExperience
        },
        {
            title: "Team Identity", field: "teamId", sorterParams: { alignEmptyValues: "top" }, minWidth: 170, hozAlign: "left",
            editor: "list", editorParams: getTeamIdentityCellEditorParams,
            formatter: editableCellFormatter,
            headerFilter: "list", headerFilterParams: getTeamIdentityHeaderFilterParams,
            headerFilterFunc: (headerValue, rowValue, rowData, filterParams) => {
                if (headerValue === "") return true;
                if (headerValue === "_UNALLOCATED_") return !rowValue;
                return rowValue === headerValue;
            },
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newAssignedTeamId = cell.getValue() === "" ? null : cell.getValue();
                try {
                    moveEngineerToTeam(engineerName, newAssignedTeamId);
                    console.log(`Moved engineer ${engineerName} to ${newAssignedTeamId || 'Unassigned'}.`);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                    if (typeof generateEngineerTable === 'function') generateEngineerTable();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                    if (typeof cell.restoreOldValue === 'function') {
                        cell.restoreOldValue();
                    }
                }
            },
            accessorDownload: (v, d) => { const t = (currentSystemData.teams || []).find(team => team.teamId === d.teamId); return t ? (t.teamIdentity || t.teamName || d.teamId) : "Unallocated"; }
        },
        { title: "Manager (SDM)", field: "sdmName", sorter: "string", minWidth: 150, editable: false, headerFilter: "list", headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.sdms, 'sdmName'), headerFilterFunc: "=", headerFilterPlaceholder: "Filter by SDM...", accessorDownload: (v, d) => d.sdmName },
        { title: "Senior Manager", field: "seniorManagerName", sorter: "string", minWidth: 150, editable: false, headerFilter: "list", headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.seniorManagers, 'seniorManagerName'), headerFilterFunc: "=", headerFilterPlaceholder: "Filter by Sr. Mgr...", accessorDownload: (v, d) => d.seniorManagerName },
    ];
}

/**
 * Updates the H2 heading for the engineer table with summary stats.
 * MODIFIED: Calculates BIS based on `allKnownEngineers` that have a `currentTeamId`.
 */
function updateEngineerTableHeading() {
    const heading = document.getElementById('orgEngineerTableHeading');
    if (!currentSystemData || !heading) return;

    let totalFundedHC = 0;
    (currentSystemData.teams || []).forEach(team => {
        totalFundedHC += team.fundedHeadcount ?? 0;
    });

    // Calculate Team BIS by counting engineers in allKnownEngineers that have a currentTeamId
    const totalTeamBIS = (currentSystemData.allKnownEngineers || []).filter(eng => eng.currentTeamId).length;

    // Calculate Away Team BIS (sum of awayTeamMembers arrays)
    let totalAwayTeamBIS = 0;
    (currentSystemData.teams || []).forEach(team => {
        totalAwayTeamBIS += (team.awayTeamMembers || []).length;
    });

    const totalEffectiveBIS = totalTeamBIS + totalAwayTeamBIS;
    const totalHiringGap = totalFundedHC - totalTeamBIS; // Gap is based on primary team members vs funded

    heading.innerText = `Engineer Resource List (Funded: ${totalFundedHC} | Team BIS: ${totalTeamBIS} | Away BIS: ${totalAwayTeamBIS} | Effective BIS: ${totalEffectiveBIS} | Hiring Gap: ${totalHiringGap})`;
    heading.style.color = totalHiringGap < 0 ? 'blue' : (totalHiringGap > 0 ? 'darkorange' : 'green');
    heading.title = `Finance Approved Funding: ${totalFundedHC}\nActual Team Members (BIS): ${totalTeamBIS}\nAway-Team Members: ${totalAwayTeamBIS}\nTotal Effective Capacity (Team + Away): ${totalEffectiveBIS}\nHiring Gap (Funded - Team BIS): ${totalHiringGap}`;
}


/**
 * Generates the "Add New Resource" form section.
 * MODIFIED: Added fields for new engineer attributes (isAISWE, aiAgentType, skills, yearsOfExperience).
 */
function generateAddNewResourceSection(containerElement) {
    console.log("Generating 'Add New Resource' section with new engineer attributes...");
    if (!containerElement) {
        console.error("Container for 'Add New Resource' section not provided.");
        return;
    }

    let sectionDiv = document.getElementById('addNewResourceSection');
    if (sectionDiv) {
        sectionDiv.innerHTML = ''; // Clear if already exists for re-rendering
    } else {
        sectionDiv = document.createElement('div');
        sectionDiv.id = 'addNewResourceSection';
        sectionDiv.style.marginTop = '30px';
        sectionDiv.style.padding = '15px';
        sectionDiv.style.border = '1px solid #ccc';
        sectionDiv.style.backgroundColor = '#f9f9f9';
        containerElement.appendChild(sectionDiv); // Append to the provided container
    }

    const title = document.createElement('h3');
    title.textContent = 'Add New Resource to Organisation';
    sectionDiv.appendChild(title);

    const form = document.createElement('form');
    form.id = 'addNewResourceForm';
    form.onsubmit = function (event) { event.preventDefault(); handleAddNewResource(); };

    // Resource Type Selector
    form.innerHTML += `
        <div style="margin-bottom: 10px;">
            <label for="newResourceType" style="display:block; margin-bottom:5px;">Resource Type:</label>
            <select id="newResourceType" name="resourceType" onchange="toggleNewResourceFields()">
                <option value="engineer">Engineer</option>
                <option value="sdm">SDM</option>
                <option value="sr_manager">Senior Manager</option>
                <option value="pmt">PMT</option>
            </select>
        </div>
    `;

    // Fields for Engineer - MODIFIED to include new attributes
    form.innerHTML += `
        <div id="newEngineerFields" class="resource-fields" style="border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">Engineer Details</h5>
            <div style="margin-bottom:8px;">
                <label for="newEngineerName" style="display:block;">Engineer Name:</label>
                <input type="text" id="newEngineerName" name="engineerName" required>
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerLevel" style="display:block;">Level (1-7):</label>
                <input type="number" id="newEngineerLevel" name="engineerLevel" min="1" max="7" value="1" required style="width:80px;">
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerYearsOfExperience" style="display:block;">Years of Experience:</label>
                <input type="number" id="newEngineerYearsOfExperience" name="yearsOfExperience" min="0" value="0" style="width:80px;">
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerSkills" style="display:block;">Skills (comma-separated):</label>
                <input type="text" id="newEngineerSkills" name="skills" placeholder="e.g., Java, AWS, Agile">
            </div>
            <div style="margin-top:10px; margin-bottom:5px;">
                <input type="checkbox" id="newEngineerIsAISWE" name="isAISWE" onchange="toggleAIAgentTypeField()" style="margin-right:5px; vertical-align:middle;">
                <label for="newEngineerIsAISWE" style="vertical-align:middle;">Is AI Software Engineer?</label>
            </div>
            <div id="aiAgentTypeContainer" style="display:none; margin-top:5px; margin-bottom:8px;">
                <label for="newEngineerAIAgentType" style="display:block;">AI Agent Type:</label>
                <input type="text" id="newEngineerAIAgentType" name="aiAgentType" placeholder="e.g., Code Generation, Testing">
            </div>
        </div>
    `;

    const srManagerOptions = (currentSystemData?.seniorManagers || []).map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
    form.innerHTML += `
        <div id="newSdmFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">SDM Details</h5>
            <div style="margin-bottom:8px;">
                <label for="newSdmName" style="display:block;">SDM Name:</label>
                <input type="text" id="newSdmName" name="sdmName">
            </div>
            <div>
                <label for="assignSrManagerId" style="display:block;">Assign to Senior Manager (Optional):</label>
                <select id="assignSrManagerId" name="srManagerId">
                    <option value="">-- None --</option>
                    ${srManagerOptions}
                </select>
            </div>
        </div>
    `;
    form.innerHTML += `
        <div id="newSrManagerFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
             <h5 style="margin-top:0; margin-bottom:10px;">Senior Manager Details</h5>
            <div>
                <label for="newSrManagerName" style="display:block;">Senior Manager Name:</label>
                <input type="text" id="newSrManagerName" name="srManagerName">
            </div>
        </div>
    `;
    form.innerHTML += `
        <div id="newPmtFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">PMT Details</h5>
            <div>
                <label for="newPmtName" style="display:block;">PMT Name:</label>
                <input type="text" id="newPmtName" name="pmtName">
            </div>
        </div>
    `;

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Resource';
    submitButton.className = 'btn-primary';
    submitButton.style.marginTop = '10px';
    form.appendChild(submitButton);

    sectionDiv.appendChild(form);
    toggleNewResourceFields(); // Initial call
}

/**
 * Toggles visibility of form fields based on selected resource type.
 * MODIFIED: Calls toggleAIAgentTypeField when engineer is selected.
 */
function toggleNewResourceFields() {
    const resourceType = document.getElementById('newResourceType').value;
    document.querySelectorAll('#addNewResourceForm .resource-fields').forEach(div => {
        div.style.display = 'none';
        div.querySelectorAll('input, select').forEach(input => {
            if (input.type !== 'select-one' && input.type !== 'checkbox') input.value = '';
            else if (input.type === 'select-one') input.selectedIndex = 0;
            else if (input.type === 'checkbox') input.checked = false;
            input.required = false; // Reset required status
        });
    });

    if (resourceType === 'engineer') {
        document.getElementById('newEngineerFields').style.display = 'block';
        document.getElementById('newEngineerName').required = true;
        document.getElementById('newEngineerLevel').required = true;
        // Years, Skills, AI Agent Type are not strictly required but will be collected
        if (typeof toggleAIAgentTypeField === 'function') toggleAIAgentTypeField(); // Ensure AI type field visibility is correct
    } else if (resourceType === 'sdm') {
        document.getElementById('newSdmFields').style.display = 'block';
        document.getElementById('newSdmName').required = true;
    } else if (resourceType === 'sr_manager') {
        document.getElementById('newSrManagerFields').style.display = 'block';
        document.getElementById('newSrManagerName').required = true;
    } else if (resourceType === 'pmt') {
        document.getElementById('newPmtFields').style.display = 'block';
        document.getElementById('newPmtName').required = true;
    }
}

/**
 * Helper function to toggle AI Agent Type field visibility based on IsAISWE checkbox.
 * NEW function.
 */
function toggleAIAgentTypeField() {
    const isAISWECheckbox = document.getElementById('newEngineerIsAISWE');
    const aiAgentTypeContainer = document.getElementById('aiAgentTypeContainer');
    const aiAgentTypeInput = document.getElementById('newEngineerAIAgentType');

    if (isAISWECheckbox && aiAgentTypeContainer && aiAgentTypeInput) {
        if (isAISWECheckbox.checked) {
            aiAgentTypeContainer.style.display = 'block';
            aiAgentTypeInput.required = true; // Make AI type required if it's an AI SWE
        } else {
            aiAgentTypeContainer.style.display = 'none';
            aiAgentTypeInput.required = false;
            aiAgentTypeInput.value = '';
        }
    }
}

/**
 * Handles adding a new resource to the system.
 * MODIFIED: Collects new attributes for engineers and saves them in the 'attributes' object.
 */
function handleAddNewResource() {
    const resourceType = document.getElementById('newResourceType').value;
    let success = false;
    let newResourceDataForLog = {};

    if (!currentSystemData) {
        alert("Error: currentSystemData is not loaded. Cannot add resource.");
        return;
    }

    if (resourceType === 'engineer') {
        const name = document.getElementById('newEngineerName').value.trim();
        const level = parseInt(document.getElementById('newEngineerLevel').value, 10);
        const yearsOfExperience = parseInt(document.getElementById('newEngineerYearsOfExperience').value, 10) || 0;
        const skillsString = document.getElementById('newEngineerSkills').value.trim();
        const skills = skillsString ? skillsString.split(',').map(s => s.trim()).filter(Boolean) : [];
        const isAISWE = document.getElementById('newEngineerIsAISWE').checked;
        const aiAgentType = isAISWE ? document.getElementById('newEngineerAIAgentType').value.trim() : null;

        if (!name || isNaN(level) || level < 1 || level > 7) {
            alert("Invalid engineer name or level. Please ensure name is provided and level is between 1 and 7.");
        } else {
            try {
                const newEngineer = addEngineerToRoster({
                    name,
                    level,
                    attributes: {
                        isAISWE,
                        aiAgentType,
                        skills,
                        yearsOfExperience
                    }
                });
                newResourceDataForLog = newEngineer;
                success = true;
            } catch (error) {
                alert(error.message);
            }
        }
    } else if (resourceType === 'sdm') {
        const name = document.getElementById('newSdmName').value.trim();
        const srManagerId = document.getElementById('assignSrManagerId').value || null;
        if (name) {
            if (!(currentSystemData.sdms || []).some(s => s.sdmName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.sdms) currentSystemData.sdms = [];
                const newSdm = { sdmId: 'sdm-' + Date.now(), sdmName: name, seniorManagerId: srManagerId };
                currentSystemData.sdms.push(newSdm);
                newResourceDataForLog = newSdm;
                success = true;
            } else { alert(`SDM with name "${name}" already exists.`); }
        } else { alert("SDM name cannot be empty."); }
    } else if (resourceType === 'sr_manager') {
        const name = document.getElementById('newSrManagerName').value.trim();
        if (name) {
            if (!(currentSystemData.seniorManagers || []).some(s => s.seniorManagerName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.seniorManagers) currentSystemData.seniorManagers = [];
                const newSrManager = { seniorManagerId: 'srMgr-' + Date.now(), seniorManagerName: name };
                currentSystemData.seniorManagers.push(newSrManager);
                newResourceDataForLog = newSrManager;
                success = true;
            } else { alert(`Senior Manager with name "${name}" already exists.`); }
        } else { alert("Senior Manager name cannot be empty."); }
    } else if (resourceType === 'pmt') {
        const name = document.getElementById('newPmtName').value.trim();
        if (name) {
            if (!(currentSystemData.pmts || []).some(p => p.pmtName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.pmts) currentSystemData.pmts = [];
                const newPmt = { pmtId: 'pmt-' + Date.now(), pmtName: name };
                currentSystemData.pmts.push(newPmt);
                newResourceDataForLog = newPmt;
                success = true;
            } else { alert(`PMT with name "${name}" already exists.`); }
        } else { alert("PMT name cannot be empty."); }
    }

    if (success) {
        alert("Resource added successfully to the system roster!");
        console.log("Added new resource to currentSystemData:", newResourceDataForLog);
        if (typeof saveSystemChanges === 'function') saveSystemChanges();
        document.getElementById('addNewResourceForm').reset();
        toggleNewResourceFields(); // This will also call toggleAIAgentTypeField

        // Refresh relevant views if they are currently displayed
        if (document.getElementById('organogramView').style.display !== 'none') {
            if (typeof initializeOrgChartView === 'function') {
                initializeOrgChartView(); // Re-run the full init
            }
        }
        if (document.getElementById('engineerTableView').style.display !== 'none') {
            if (typeof generateEngineerTable === 'function') generateEngineerTable();
        }
        // Update dropdowns in other forms if necessary (e.g., SDM list in team edit, Sr Mgr list here)
        if (resourceType === 'sr_manager' && document.getElementById('assignSrManagerId')) {
            const srManagerSelect = document.getElementById('assignSrManagerId');
            const currentSrMgrs = currentSystemData.seniorManagers || [];
            srManagerSelect.innerHTML = '<option value="">-- None --</option>' + currentSrMgrs.map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
        }
        if (resourceType === 'sdm' && typeof displayTeamsForEditing === 'function' && document.getElementById('systemEditForm').style.display !== 'none') {
            displayTeamsForEditing(currentSystemData.teams, -1); // Refresh team edit view to update SDM lists
        }
        if (resourceType === 'pmt' && typeof displayTeamsForEditing === 'function' && document.getElementById('systemEditForm').style.display !== 'none') {
            displayTeamsForEditing(currentSystemData.teams, -1); // Refresh team edit view to update PMT lists
        }
    }
}
