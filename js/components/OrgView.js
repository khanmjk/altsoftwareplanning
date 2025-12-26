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
  /**
   * Render the organization view
   */
  render() {
    if (!this.container) {
      console.error('OrgView: Container not found');
      return;
    }

    // 1. Set Workspace Metadata
    // 1. Set Workspace Metadata
    workspaceComponent.setPageMetadata({
      title: 'Org Design',
      breadcrumbs: ['System', 'Org Design'],
      actions: [],
    });

    // 2. Setup Navigation Items
    const navItems = [
      { id: 'd3', label: 'Block View', icon: 'fas fa-sitemap' },
      { id: 'list', label: 'List View', icon: 'fas fa-list' },
      { id: 'table', label: 'Org Table', icon: 'fas fa-table' },
      { id: 'engineerList', label: 'Engineer List', icon: 'fas fa-users' },
    ];

    // 3. Initialize Pill Navigation
    this.pillNav = new PillNavigationComponent({
      items: navItems,
      activeItemId: this.currentMode,
      onSwitch: (modeId) => {
        this.currentMode = modeId;
        this.updateRenderer();
      },
    });

    // 4. Set Workspace Toolbar
    // 4. Set Workspace Toolbar
    workspaceComponent.setToolbar(this.pillNav.render());

    this._clearElement(this.container);

    if (!SystemService.getCurrentSystem()) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'workspace-empty-state org-error-text';
      errorMsg.textContent = 'No system data loaded';
      this.container.appendChild(errorMsg);
      return;
    }

    this.generateLayout();
    this.updateRenderer();
  }

  /**
   * Generate the view layout
   * REFACTORED: Strict DOM creation
   */
  generateLayout() {
    const wrapper = document.createElement('div');
    wrapper.className = 'org-view';

    const chartContainer = document.createElement('div');
    chartContainer.id = 'organogramContent';
    chartContainer.className = 'org-content-area';
    wrapper.appendChild(chartContainer);

    const tableContainer = document.createElement('div');
    tableContainer.id = 'teamBreakdown';
    tableContainer.className = 'org-content-area is-hidden';
    wrapper.appendChild(tableContainer);

    const engineerListContainer = document.createElement('div');
    engineerListContainer.id = 'orgEngineerListView';
    engineerListContainer.className = 'org-content-area is-hidden';
    wrapper.appendChild(engineerListContainer);

    this.container.appendChild(wrapper);
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

    // Hide all containers first
    chartContainer.classList.add('is-hidden');
    tableContainer.classList.add('is-hidden');
    engineerListContainer.classList.add('is-hidden');

    // Show appropriate view
    switch (this.currentMode) {
      case 'd3':
        chartContainer.classList.remove('is-hidden');
        this.renderD3OrgChart(chartContainer);
        break;
      case 'list':
        chartContainer.classList.remove('is-hidden');
        this.renderHtmlOrgList(chartContainer);
        break;
      case 'table':
        tableContainer.classList.remove('is-hidden');
        this.generateTeamTable();
        break;
      case 'engineerList':
        engineerListContainer.classList.remove('is-hidden');
        this.generateEngineerTable();
        break;
    }
  }

  /**
   * Build hierarchical data for visualization
   */
  buildHierarchyData() {
    if (!SystemService.getCurrentSystem()) return null;

    const sdmMap = new Map(
      (SystemService.getCurrentSystem().sdms || []).map((sdm) => [
        sdm.sdmId,
        { ...sdm, name: sdm.sdmName, children: [], type: 'sdm' },
      ])
    );

    const srMgrMap = new Map(
      (SystemService.getCurrentSystem().seniorManagers || []).map((sr) => [
        sr.seniorManagerId,
        { ...sr, name: sr.seniorManagerName, children: [], type: 'srMgr' },
      ])
    );

    // Group SDMs under Senior Managers
    sdmMap.forEach((sdm) => {
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
            type: 'srMgr',
          });
        }
        if (sdm && sdm.sdmId) srMgrMap.get(unassignedKey).children.push(sdm);
      }
    });

    // Add teams under SDMs
    (SystemService.getCurrentSystem().teams || []).forEach((team) => {
      const awayTeamCount = team.awayTeamMembers?.length ?? 0;
      const sourceSummary = this.getSourceSummary(team.awayTeamMembers);

      const engineerChildren = (team.engineers || [])
        .map((engineerName) => {
          const eng = (SystemService.getCurrentSystem().allKnownEngineers || []).find(
            (e) => e.name === engineerName
          );
          return {
            name: `${eng ? eng.name : engineerName} (L${eng ? eng.level : '?'})${eng?.attributes?.isAISWE ? ' [AI]' : ''}`,
            type: 'engineer',
          };
        })
        .filter((e) => e.name);

      const teamNode = {
        name: team.teamIdentity || team.teamName || 'Unnamed Team',
        type: 'team',
        details: `BIS: ${team.engineers?.length ?? 0} / Funded: ${team.fundedHeadcount ?? 'N/A'}`,
        awayTeamCount,
        awaySourceSummary: sourceSummary,
        children: engineerChildren,
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
            type: 'sdm',
          });
          const unassignedSrMgrKey = 'unassigned-sr-mgr';
          if (!srMgrMap.has(unassignedSrMgrKey)) {
            srMgrMap.set(unassignedSrMgrKey, {
              seniorManagerId: unassignedSrMgrKey,
              seniorManagerName: 'Unassigned Senior Manager',
              name: 'Unassigned Senior Manager',
              children: [],
              type: 'srMgr',
            });
          }
          srMgrMap.get(unassignedSrMgrKey).children.push(sdmMap.get(unassignedSdmKey));
        }
        if (team && team.teamId) sdmMap.get(unassignedSdmKey).children.push(teamNode);
      }
    });

    return {
      name: SystemService.getCurrentSystem().systemName || 'Organization',
      type: 'root',
      children: Array.from(srMgrMap.values()),
    };
  }

  /**
   * Helper to summarize source teams (originally from utils.js)
   */
  getSourceSummary(awayTeamMembers) {
    if (!awayTeamMembers || awayTeamMembers.length === 0) {
      return '';
    }
    const sources = awayTeamMembers
      .map((m) => m.sourceTeam)
      .filter((source) => source && source.trim() !== '');
    const uniqueSources = [...new Set(sources)];

    if (uniqueSources.length === 0) return '';
    if (uniqueSources.length === 1) return uniqueSources[0];
    if (uniqueSources.length === 2) return uniqueSources.join(' & ');
    return `${uniqueSources.slice(0, 1).join(', ')} & Others`;
  }

  /**
   * Render HTML list view
   * REFACTORED: Recursive DOM creation (No innerHTML)
   */
  renderHtmlOrgList(container) {
    const hierarchicalData = this.buildHierarchyData();

    this._clearElement(container);

    if (!hierarchicalData) {
      console.error('No data for HTML org list');
      const error = document.createElement('p');
      error.className = 'org-error-message';
      error.textContent = 'Could not generate organogram data.';
      container.appendChild(error);
      return;
    }

    this.buildLevelDOM(hierarchicalData, 0, container);
  }

  /**
   * Recursive helper to build DOM for Org List
   */
  buildLevelDOM(node, level, parentContainer) {
    if (!node) return;

    const nodeDiv = document.createElement('div');
    nodeDiv.className = `org-list-node org-level-${level}`;

    // Create Content Span
    const contentSpan = document.createElement('span');

    // Define text and style based on type
    // Using classes from org-view.css instead of inline styles
    let textClass = 'org-text-default';
    let mainText = node.name || 'Group';
    let detailsText = '';

    switch (node.type) {
      case 'root':
        textClass = 'org-text-root';
        mainText = `System: ${node.name || 'N/A'}`;
        break;
      case 'srMgr':
        textClass = 'org-text-srmgr';
        mainText = `Sr. Manager: ${node.seniorManagerName || node.name || 'N/A'}`;
        break;
      case 'sdm':
        textClass = 'org-text-sdm';
        mainText = `SDM: ${node.sdmName || node.name || 'N/A'}`;
        break;
      case 'team':
        textClass = 'org-text-team';
        mainText = `Team: ${node.name || 'N/A'}`;
        detailsText = `(${node.details || ''})`;
        break;
    }

    const mainTextEl = document.createElement('strong');
    mainTextEl.className = textClass;
    mainTextEl.textContent = mainText;
    contentSpan.appendChild(mainTextEl);

    if (detailsText) {
      const detailsEl = document.createElement('span');
      detailsEl.className = 'org-details';
      detailsEl.textContent = detailsText;
      contentSpan.appendChild(detailsEl);
    }

    if (node.awayTeamCount > 0) {
      const awayEl = document.createElement('span');
      awayEl.className = 'org-away-tag';
      awayEl.textContent = `(+${node.awayTeamCount} Away)`;
      contentSpan.appendChild(awayEl);
    }

    nodeDiv.appendChild(contentSpan);

    // Engineer List (for teams)
    if (node.type === 'team' && node.children && node.children.length > 0) {
      const engList = document.createElement('ul');
      engList.className = 'org-engineer-list';

      node.children.forEach((eng) => {
        if (eng.type === 'engineer') {
          const engItem = document.createElement('li');
          engItem.className = 'org-engineer-item';
          engItem.textContent = eng.name;
          engList.appendChild(engItem);
        }
      });
      nodeDiv.appendChild(engList);
    }

    parentContainer.appendChild(nodeDiv);

    // Recursive children (excluding engineers/team children handled above)
    if (
      node.children &&
      node.children.length > 0 &&
      node.type !== 'team' &&
      node.type !== 'engineer'
    ) {
      node.children.forEach((child) => {
        this.buildLevelDOM(child, level + 1, parentContainer);
      });
    }
  }

  /**
   * Render D3 org chart
   * IMPORTANT: Preserves all D3.js functionality
   */
  renderD3OrgChart(container) {
    const hierarchicalData = this.buildHierarchyData();

    if (!hierarchicalData || !container) {
      console.error('D3 Org Chart container or data not found');
      // Strict DOM replacement for error
      if (container) {
        this._clearElement(container);
        const p = document.createElement('p');
        p.className = 'org-error-text';
        p.textContent = 'Could not generate D3 organogram data.';
        container.appendChild(p);
      }
      return;
    }

    this._clearElement(container);

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

      const svg = d3
        .select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('class', 'org-chart-svg');

      // Use d3-org-tooltip class for style compliance
      const tooltip = d3
        .select('body')
        .selectAll('.d3-org-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'd3-org-tooltip');

      const g = svg.append('g');

      const tree = d3
        .tree()
        .nodeSize([nodeWidth + horizontalSpacing, nodeHeight + verticalSpacing]);

      const root = d3.hierarchy(hierarchicalData);

      root.descendants().forEach((d) => {
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

        nodes.forEach((d) => {
          d.y = d.depth * (nodeHeight + verticalSpacing) + nodeHeight;
        });

        const elbow = (d) => {
          return (
            `M ${d.source.x},${d.source.y + nodeHeight / 2}` +
            ` V ${d.target.y - verticalSpacing / 2}` +
            ` H ${d.target.x}` +
            ` V ${d.target.y - nodeHeight / 2}`
          );
        };

        const link = g.selectAll('.org-link').data(links, (d) => d.target.id);

        const linkEnter = link
          .enter()
          .append('path')
          .attr('class', 'org-link')
          .attr('d', (d) => {
            const o = { x: source.x0 || source.x, y: source.y0 || source.y };
            return `M ${o.x},${o.y + nodeHeight / 2} V ${o.y + nodeHeight / 2} H ${o.x} V ${o.y + nodeHeight / 2}`;
          });

        link.merge(linkEnter).transition().duration(duration).attr('d', elbow);

        link
          .exit()
          .transition()
          .duration(duration)
          .attr('d', (d) => {
            const o = { x: source.x, y: source.y };
            return `M ${o.x},${o.y + nodeHeight / 2} V ${o.y + nodeHeight / 2} H ${o.x} V ${o.y + nodeHeight / 2}`;
          })
          .remove();

        const node = g
          .selectAll('.org-node')
          .data(nodes, (d) => d.data.id || d.data.name + Math.random());

        const nodeEnter = node
          .enter()
          .append('g')
          .attr('class', (d) => `org-node org-type-${d.data.type}`)
          .attr('transform', (d) => `translate(${source.x0 || source.x},${source.y0 || source.y})`)
          .attr('opacity', 0)
          .on('click', (event, d) => {
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
          .on('mouseover', (event, d) => {
            const tooltipNode = tooltip.node();
            if (tooltipNode) {
              this._clearElement(tooltipNode);
              tooltipNode.appendChild(this._buildOrgTooltipContent(d.data));
            }
            tooltip.classed('d3-org-tooltip--visible', true);
            styleVars.set(tooltipNode, {
              '--tooltip-x': `${event.pageX + 15}px`,
              '--tooltip-y': `${event.pageY - 28}px`,
            });
          })
          .on('mouseout', () => {
            tooltip.classed('d3-org-tooltip--visible', false);
          });

        nodeEnter
          .append('rect')
          .attr('class', 'org-node-rect')
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('x', -nodeWidth / 2)
          .attr('y', -nodeHeight / 2)
          .attr('rx', 4)
          .attr('ry', 4)
          .classed('org-node-rect--interactive', (d) => d.data.type !== 'engineer')
          .classed('org-node-rect--static', (d) => d.data.type === 'engineer');

        const fo = nodeEnter
          .append('foreignObject')
          .attr('x', -nodeWidth / 2)
          .attr('y', -nodeHeight / 2)
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('class', 'org-node-foreign');

        const div = fo
          .append('xhtml:div')
          .attr('xmlns', 'http://www.w3.org/1999/xhtml')
          .attr('class', 'org-node-label-wrapper');

        div
          .append('xhtml:div')
          .attr('class', 'org-node-label-name')
          .text((d) => d.data.name);

        div
          .append('xhtml:div')
          .attr('class', 'org-node-label-details')
          .text((d) => {
            if (d.data.type === 'team') return d.data.details;
            if (d.data.type === 'engineer')
              return d.data.name.includes('[AI]') ? 'AI Software Engineer' : 'Software Engineer';
            return d.data.type.replace('srMgr', 'Senior Manager');
          });

        nodeEnter
          .append('text')
          .attr('class', 'org-node-toggle')
          .attr('text-anchor', 'middle')
          .attr('y', nodeHeight / 2 + 16)
          .text((d) => {
            if (d.data.type === 'engineer') return '';
            return d._children ? '▼' : d.children ? '▲' : '';
          });

        node
          .merge(nodeEnter)
          .transition()
          .duration(duration)
          .attr('transform', (d) => `translate(${d.x},${d.y})`)
          .attr('opacity', 1);

        node
          .merge(nodeEnter)
          .select('.org-node-toggle')
          .text((d) => {
            if (d.data.type === 'engineer') return '';
            return d._children ? '▼' : d.children ? '▲' : '';
          });

        node
          .exit()
          .transition()
          .duration(duration)
          .attr('transform', (d) => `translate(${source.x},${source.y})`)
          .attr('opacity', 0)
          .remove();

        nodes.forEach((d) => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      };

      update(root);

      const bounds = g.node().getBBox();
      const chartWidth = bounds.width;
      const scale = Math.min(1, (width / (chartWidth + 100)) * 0.8);
      const tx = width / 2 - root.x * scale;
      const ty = 50;
      const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);

      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 2])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
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
   */
  generateTeamTable() {
    // ... (Logic remains mostly same, just checking container interactions) ...
    const widgetContainer = document.getElementById('teamBreakdown');
    if (!widgetContainer) return;

    this._clearElement(widgetContainer);

    // ... (Rest of existing logic is fine as EnhancedTableWidget handles its DOM internally safely) ...
    // Re-injecting the original logic cleanly:

    const tableData = this.prepareTeamDataForTabulator();
    const columnDefs = this.defineTeamTableColumns();

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
        initialSort: [
          { column: 'seniorManagerName', dir: 'asc' },
          { column: 'sdmName', dir: 'asc' },
        ],
        exportCsvFileName: 'team_breakdown.csv',
        exportJsonFileName: 'team_breakdown.json',
        exportXlsxFileName: 'team_breakdown.xlsx',
        exportSheetName: 'Team Breakdown',
        layout: 'fitData',
      });
    } catch (error) {
      console.error('Error creating team table widget:', error);
      const errEl = document.createElement('p');
      errEl.className = 'org-error-message';
      errEl.textContent = 'Error initializing team table widget';
      widgetContainer.appendChild(errEl);
    }
  }

  /**
   * Prepare data for team table
   */
  prepareTeamDataForTabulator() {
    if (!SystemService.getCurrentSystem() || !SystemService.getCurrentSystem().teams) {
      return [];
    }

    const sdmMap = new Map((SystemService.getCurrentSystem().sdms || []).map((s) => [s.sdmId, s]));
    const srMgrMap = new Map(
      (SystemService.getCurrentSystem().seniorManagers || []).map((sm) => [sm.seniorManagerId, sm])
    );
    const pmtMap = new Map((SystemService.getCurrentSystem().pmts || []).map((p) => [p.pmtId, p]));
    const engineerMap = new Map(
      (SystemService.getCurrentSystem().allKnownEngineers || []).map((e) => [e.name, e])
    );

    let teamServicesMap = {};
    (SystemService.getCurrentSystem().services || []).forEach((service) => {
      if (service.owningTeamId) {
        if (!teamServicesMap[service.owningTeamId]) teamServicesMap[service.owningTeamId] = [];
        teamServicesMap[service.owningTeamId].push(service.serviceName);
      }
    });

    return SystemService.getCurrentSystem().teams.map((team) => {
      const sdm = sdmMap.get(team.sdmId);
      const seniorManager = sdm ? srMgrMap.get(sdm.seniorManagerId) : null;
      const pmt = pmtMap.get(team.pmtId);

      const teamBIS = (team.engineers || []).length;
      const fundedHC = parseInt(team.fundedHeadcount, 10) || 0;
      const awayTeamBIS = (team.awayTeamMembers || []).length;
      const effectiveBIS = teamBIS + awayTeamBIS;
      const hiringGap = fundedHC - teamBIS;

      const engineerDetails = (team.engineers || [])
        .map((name) => {
          const eng = engineerMap.get(name);
          if (eng) {
            const type = eng.attributes?.isAISWE ? ` [AI]` : '';
            return `${eng.name} (L${eng.level})${type}`;
          }
          return `${name} (Details Missing)`;
        })
        .join('\n');

      const awayTeamDetails = (team.awayTeamMembers || [])
        .map((away) => {
          const type = away.attributes?.isAISWE ? ` [AI]` : '';
          return `${away.name} (L${away.level})${type} - From: ${away.sourceTeam}`;
        })
        .join('\n');

      const servicesOwned = (teamServicesMap[team.teamId] || []).join('\n');

      return {
        teamId: team.teamId,
        seniorManagerName: seniorManager ? seniorManager.seniorManagerName : 'N/A',
        sdmName: sdm ? sdm.sdmName : 'N/A',
        teamIdentity: team.teamIdentity || 'N/A',
        teamName: team.teamName || 'N/A',
        pmtName: pmt ? pmt.pmtName : 'N/A',
        teamBIS: teamBIS,
        fundedHeadcount: fundedHC,
        effectiveBIS: effectiveBIS,
        hiringGap: hiringGap,
        engineerDetails: engineerDetails,
        awayTeamDetails: awayTeamDetails,
        servicesOwned: servicesOwned,
      };
    });
  }

  /**
   * Define team table columns
   */
  defineTeamTableColumns() {
    // Use helper from orgView_old if available, otherwise define inline
    const getNameHeaderFilterParams = (sourceArray, nameField) => {
      const options = [{ label: 'All', value: '' }];
      if (sourceArray) {
        const uniqueNames = {};
        sourceArray.forEach((item) => {
          if (item && item[nameField]) {
            uniqueNames[item[nameField]] = item[nameField];
          }
        });
        Object.keys(uniqueNames)
          .sort((a, b) => String(a).localeCompare(String(b)))
          .forEach((name) => {
            options.push({ label: name, value: name });
          });
      }
      options.push({ label: 'N/A', value: 'N/A' });
      return { values: options, clearable: true, autocomplete: true };
    };

    const gapFormatter = (cell) => {
      const value = cell.getValue();
      const el = cell.getElement();
      el.classList.remove('org-gap--needs-hiring', 'org-gap--overstaffed', 'org-gap--balanced');
      if (value > 0) {
        el.classList.add('org-gap--needs-hiring');
        el.title = `Need to hire ${value}`;
      } else if (value < 0) {
        el.classList.add('org-gap--overstaffed');
        el.title = `Over-hired by ${Math.abs(value)}`;
      } else {
        el.classList.add('org-gap--balanced');
        el.removeAttribute('title');
      }
      return value;
    };

    return [
      {
        title: 'Sr. Manager',
        field: 'seniorManagerName',
        headerFilter: 'list',
        headerFilterParams: getNameHeaderFilterParams(
          SystemService.getCurrentSystem().seniorManagers,
          'seniorManagerName'
        ),
      },
      {
        title: 'SDM',
        field: 'sdmName',
        headerFilter: 'list',
        headerFilterParams: getNameHeaderFilterParams(
          SystemService.getCurrentSystem().sdms,
          'sdmName'
        ),
      },
      { title: 'Team Identity', field: 'teamIdentity', width: 180 },
      { title: 'Team Name', field: 'teamName', width: 200 },
      {
        title: 'PMT',
        field: 'pmtName',
        headerFilter: 'list',
        headerFilterParams: getNameHeaderFilterParams(
          SystemService.getCurrentSystem().pmts,
          'pmtName'
        ),
      },
      { title: 'Team BIS', field: 'teamBIS', hozAlign: 'center', width: 100 },
      { title: 'Funded HC', field: 'fundedHeadcount', hozAlign: 'center', width: 100 },
      { title: 'Effective BIS', field: 'effectiveBIS', hozAlign: 'center', width: 120 },
      {
        title: 'Hiring Gap',
        field: 'hiringGap',
        hozAlign: 'center',
        width: 100,
        formatter: gapFormatter,
      },
      { title: 'Engineers', field: 'engineerDetails', width: 250, tooltip: true },
      { title: 'Away Team', field: 'awayTeamDetails', width: 250, tooltip: true },
      { title: 'Services Owned', field: 'servicesOwned', width: 200, tooltip: true },
    ];
  }

  /**
   * Generate engineer table with statistics header and full editing capabilities
   * REFACTORED: Strict DOM creation
   */
  generateEngineerTable() {
    const widgetContainer = document.getElementById('orgEngineerListView');
    if (!widgetContainer) {
      console.error('Engineer table container not found');
      return;
    }

    this._clearElement(widgetContainer);

    // Create narrative paragraph using DOM
    const narrativeP = document.createElement('p');
    narrativeP.id = 'orgEngineerTableHeading';
    narrativeP.className = 'org-engineer-narrative';
    widgetContainer.appendChild(narrativeP);

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
        initialSort: [{ column: 'name', dir: 'asc' }],
        exportCsvFileName: 'engineer_list.csv',
        exportJsonFileName: 'engineer_list.json',
        exportXlsxFileName: 'engineer_list.xlsx',
        exportSheetName: 'Engineers',
        layout: 'fitData',
      });

      // Force redraw to ensure proper rendering
      setTimeout(() => {
        if (this.engineerTableWidgetInstance?.tabulatorInstance) {
          this.engineerTableWidgetInstance.tabulatorInstance.redraw(true);
        }
      }, 100);
    } catch (error) {
      console.error('Error creating engineer table widget:', error);
      const errEl = document.createElement('p');
      errEl.className = 'org-error-message';
      errEl.textContent = 'Error initializing engineer table. Check console.';
      widgetContainer.appendChild(errEl);
    }
  }

  /**
   * Calculate and update engineer table statistics header
   * REFACTORED: Strict DOM creation for inner text and elements
   */
  updateEngineerTableStatistics() {
    const heading = document.getElementById('orgEngineerTableHeading');
    if (!heading || !SystemService.getCurrentSystem()) return;

    const stats = this.calculateEngineerStatistics();

    // Clear existing content
    this._clearElement(heading);

    // Helper to create bold text
    const createBold = (text) => {
      const b = document.createElement('strong');
      b.textContent = text;
      return b;
    };

    // Construct the sentence: "The organization is currently funded for [X] headcount."
    heading.appendChild(document.createTextNode('The organization is currently funded for '));
    heading.appendChild(createBold(stats.funded));
    heading.appendChild(document.createTextNode(' headcount. We have '));
    heading.appendChild(createBold(stats.teamBIS));
    heading.appendChild(document.createTextNode(' engineers on team, with '));
    heading.appendChild(createBold(stats.awayBIS));
    heading.appendChild(
      document.createTextNode(
        ' away-team members borrowed to help, resulting in an effective strength of '
      )
    );
    heading.appendChild(createBold(stats.effectiveBIS));
    heading.appendChild(document.createTextNode('. '));

    // Gap Text
    if (stats.hiringGap > 0) {
      heading.appendChild(document.createTextNode('There is currently a hiring gap of '));
      heading.appendChild(createBold(stats.hiringGap));
      heading.appendChild(document.createTextNode(' engineers.'));
    } else if (stats.hiringGap < 0) {
      heading.appendChild(document.createTextNode('We are currently over-hired by '));
      heading.appendChild(createBold(Math.abs(stats.hiringGap)));
      heading.appendChild(document.createTextNode(' engineers.'));
    } else {
      heading.appendChild(
        document.createTextNode('We are currently fully staffed against the funded headcount.')
      );
    }

    // Remove old tooltip title as the text is now self-explanatory
    heading.removeAttribute('title');
  }

  /**
   * Calculate engineer statistics
   * EXTRACTED: Pure function for testability
   */
  calculateEngineerStatistics() {
    const data = SystemService.getCurrentSystem();
    if (!data) return { funded: 0, teamBIS: 0, awayBIS: 0, effectiveBIS: 0, hiringGap: 0 };

    const funded = (data.teams || []).reduce(
      (sum, team) => sum + (parseInt(team.fundedHeadcount, 10) || 0),
      0
    );
    const teamBIS = (data.allKnownEngineers || []).filter((eng) => eng.currentTeamId).length;
    const awayBIS = (data.teams || []).reduce(
      (sum, team) => sum + (team.awayTeamMembers || []).length,
      0
    );
    const effectiveBIS = teamBIS + awayBIS;
    const hiringGap = funded - teamBIS;

    return { funded, teamBIS, awayBIS, effectiveBIS, hiringGap };
  }

  /**
   * Prepare data for engineer table
   * Retrieved from legacy code and adapted
   */
  prepareEngineerDataForTabulator() {
    if (!SystemService.getCurrentSystem() || !SystemService.getCurrentSystem().allKnownEngineers) {
      return [];
    }

    return SystemService.getCurrentSystem().allKnownEngineers.map((engineer) => {
      let teamDisplayForColumn = 'Unallocated';
      let actualTeamIdForData = engineer.currentTeamId;
      let sdmName = 'N/A';
      let seniorManagerName = 'N/A';

      if (engineer.currentTeamId) {
        const team = (SystemService.getCurrentSystem().teams || []).find(
          (t) => t.teamId === engineer.currentTeamId
        );
        if (team) {
          teamDisplayForColumn = team.teamIdentity || team.teamName || 'Unknown Team';
          if (team.sdmId) {
            const sdm = (SystemService.getCurrentSystem().sdms || []).find(
              (s) => s.sdmId === team.sdmId
            );
            if (sdm) {
              sdmName = sdm.sdmName;
              if (sdm.seniorManagerId) {
                const srMgr = (SystemService.getCurrentSystem().seniorManagers || []).find(
                  (sm) => sm.seniorManagerId === sdm.seniorManagerId
                );
                if (srMgr) {
                  seniorManagerName = srMgr.seniorManagerName;
                }
              }
            }
          }
        } else {
          teamDisplayForColumn = 'Orphaned (Team Missing)';
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
        title: 'Engineer Name',
        field: 'name',
        sorter: 'string',
        minWidth: 180,
        frozen: true,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Filter by name...',
      },
      {
        title: 'Level',
        field: 'level',
        width: 100,
        hozAlign: 'center',
        sorter: 'number',
        editor: 'list',
        editorParams: {
          values: [
            { label: 'L4 (SDE I)', value: 4 },
            { label: 'L5 (SDE II)', value: 5 },
            { label: 'L6 (SDE III / Sr.)', value: 6 },
            { label: 'L7 (Principal)', value: 7 },
          ],
        },
        formatter: (cell) => this.formatEditableCell(cell, 'level'),
        headerFilter: 'list',
        headerFilterParams: {
          values: [
            { label: 'All', value: '' },
            { label: 'L4', value: 4 },
            { label: 'L5', value: 5 },
            { label: 'L6', value: 6 },
            { label: 'L7', value: 7 },
          ],
        },
        headerFilterFunc: '=',
        cellEdited: (cell) => this.handleLevelEdit(cell),
      },
      {
        title: 'Team Identity',
        field: 'teamId',
        minWidth: 180,
        editor: 'list',
        editorParams: () => this.getTeamEditorParams(),
        formatter: (cell) => this.formatTeamCell(cell),
        headerFilter: 'list',
        headerFilterParams: () => this.getTeamFilterParams(),
        headerFilterFunc: (headerValue, rowValue) => {
          if (headerValue === '') return true;
          if (headerValue === '_UNALLOCATED_') return !rowValue;
          return rowValue === headerValue;
        },
        cellEdited: (cell) => this.handleTeamEdit(cell),
      },
      {
        title: 'SDM',
        field: 'sdmName',
        sorter: 'string',
        minWidth: 150,
        headerFilter: 'list',
        headerFilterParams: () => this.getManagerFilterParams('sdms', 'sdmName'),
        headerFilterFunc: '=',
      },
      {
        title: 'Senior Manager',
        field: 'seniorManagerName',
        sorter: 'string',
        minWidth: 150,
        headerFilter: 'list',
        headerFilterParams: () =>
          this.getManagerFilterParams('seniorManagers', 'seniorManagerName'),
        headerFilterFunc: '=',
      },
      {
        title: 'Actions',
        field: 'actions',
        width: 80,
        hozAlign: 'center',
        headerSort: false,
        formatter: (cell) => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-danger btn-sm org-engineer-delete-btn';
          btn.textContent = '🗑️';
          btn.title = 'Delete Engineer';
          return btn;
        },
        cellClick: (e, cell) => this.handleDeleteEngineer(cell),
      },
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
      return this._createEditableCellContent(value, `Edit ${columnDef.title}`);
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
      return columnDef.editor
        ? this._createEditableCellContent('Unallocated', 'Edit Team Assignment')
        : 'Unallocated';
    }

    const team = (SystemService.getCurrentSystem().teams || []).find((t) => t.teamId === teamId);
    const display = team
      ? team.teamIdentity || team.teamName || teamId
      : `Missing (${teamId.slice(-4)})`;

    if (columnDef.editor) {
      return this._createEditableCellContent(display, 'Edit Team Assignment');
    }
    return display;
  }

  /**
   * Get team editor parameters
   */
  getTeamEditorParams() {
    const options = [{ label: 'Unallocated', value: '' }];
    (SystemService.getCurrentSystem().teams || []).forEach((team) => {
      options.push({
        label: team.teamIdentity || team.teamName || team.teamId,
        value: team.teamId,
      });
    });
    return { values: options, autocomplete: true };
  }

  /**
   * Get team filter parameters
   */
  getTeamFilterParams() {
    const options = [
      { label: 'All', value: '' },
      { label: 'Unallocated', value: '_UNALLOCATED_' },
    ];
    const addedTeams = new Set();

    (SystemService.getCurrentSystem().allKnownEngineers || []).forEach((engineer) => {
      if (engineer.currentTeamId && !addedTeams.has(engineer.currentTeamId)) {
        const team = (SystemService.getCurrentSystem().teams || []).find(
          (t) => t.teamId === engineer.currentTeamId
        );
        if (team) {
          options.push({
            label: team.teamIdentity || team.teamName || team.teamId,
            value: team.teamId,
          });
          addedTeams.add(engineer.currentTeamId);
        }
      }
    });

    return { values: options, clearable: true, autocomplete: true };
  }

  _createEditableCellContent(text, title) {
    const wrapper = document.createElement('span');
    wrapper.className = 'org-editable-cell';

    const textNode = document.createElement('span');
    textNode.textContent = text;
    wrapper.appendChild(textNode);

    const icon = document.createElement('span');
    icon.className = 'org-edit-icon';
    if (title) icon.title = title;
    icon.textContent = '\u270F\uFE0F';
    wrapper.appendChild(icon);

    return wrapper;
  }

  _buildOrgTooltipContent(nodeData) {
    const fragment = document.createDocumentFragment();
    const addLine = (label, value) => {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = label;
      line.appendChild(strong);
      line.appendChild(document.createTextNode(` ${value}`));
      fragment.appendChild(line);
    };

    switch (nodeData.type) {
      case 'root':
        addLine('System:', nodeData.name);
        break;
      case 'srMgr':
        addLine('Sr. Manager:', nodeData.name);
        break;
      case 'sdm':
        addLine('SDM:', nodeData.name);
        break;
      case 'team':
        addLine('Team:', nodeData.name);
        if (nodeData.details) {
          addLine('Details:', nodeData.details);
        }
        if (nodeData.awayTeamCount > 0) {
          const awayLine = document.createElement('div');
          const awayLabel = document.createElement('span');
          awayLabel.className = 'org-tooltip-away';
          awayLabel.textContent = 'Away:';
          awayLine.appendChild(awayLabel);
          awayLine.appendChild(
            document.createTextNode(` +${nodeData.awayTeamCount} (${nodeData.awaySourceSummary})`)
          );
          fragment.appendChild(awayLine);
        }
        break;
      case 'engineer':
        addLine('Engineer:', nodeData.name);
        break;
      default: {
        const line = document.createElement('div');
        line.textContent = nodeData.name || '';
        fragment.appendChild(line);
      }
    }

    return fragment;
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Get manager filter parameters (reusable)
   */
  getManagerFilterParams(arrayName, fieldName) {
    const options = [{ label: 'All', value: '' }];
    const source = SystemService.getCurrentSystem()[arrayName] || [];
    const uniqueNames = new Set();

    source.forEach((item) => {
      if (item && item[fieldName]) {
        uniqueNames.add(item[fieldName]);
      }
    });

    Array.from(uniqueNames)
      .sort()
      .forEach((name) => {
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
      notificationManager?.showToast('Invalid level. Must be L4-L7.', 'warning');
      cell.restoreOldValue();
      return;
    }

    const engineer = (SystemService.getCurrentSystem().allKnownEngineers || []).find(
      (e) => e.name === engineerName
    );
    if (engineer) {
      engineer.level = newLevel;
      SystemService.save();
      // Recalculate capacity metrics (pure data, no UI refresh needed here)
      CapacityEngine.recalculate(SystemService.getCurrentSystem());
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
    const newTeamId = cell.getValue() === '' ? null : cell.getValue();

    OrgService.moveEngineerToTeam(SystemService.getCurrentSystem(), engineerName, newTeamId);
    CapacityEngine.recalculate(SystemService.getCurrentSystem());

    SystemService.save();
    this.generateEngineerTable();
    notificationManager?.showToast(
      `Moved ${engineerName} to ${newTeamId ? 'new team' : 'Unallocated'}`,
      'success'
    );
  }

  /**
   * Handle engineer deletion from table
   * Uses OrgService.deleteEngineer and recalculates capacity
   */
  async handleDeleteEngineer(cell) {
    const engineerName = cell.getRow().getData().name;

    const confirmed = await notificationManager?.confirm(
      `Are you sure you want to delete "${engineerName}" from the roster? This action cannot be undone.`,
      'Delete Engineer',
      { confirmStyle: 'danger' }
    );

    if (!confirmed) return;

    try {
      OrgService.deleteEngineer(SystemService.getCurrentSystem(), engineerName);
      CapacityEngine.recalculate(SystemService.getCurrentSystem());
      SystemService.save();
      this.generateEngineerTable();
      notificationManager?.showToast(`Deleted ${engineerName} from roster`, 'success');
    } catch (err) {
      console.error('Error deleting engineer:', err);
      notificationManager?.showToast(`Failed to delete engineer: ${err.message}`, 'error');
    }
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const engineers = SystemService.getCurrentSystem()?.allKnownEngineers || [];
    const teams = SystemService.getCurrentSystem()?.teams || [];
    const aiEngineers = engineers.filter((e) => e.attributes?.isAISWE);

    return {
      viewTitle: 'Org Design',
      currentMode: this.currentMode,
      seniorManagers: SystemService.getCurrentSystem()?.seniorManagers?.map((sm) => ({
        id: sm.id,
        name: sm.name,
      })),
      sdms: SystemService.getCurrentSystem()?.sdms?.map((sdm) => ({
        id: sdm.id,
        name: sdm.name,
        reportsToSeniorManagerId: sdm.reportsToSeniorManagerId,
      })),
      teams: teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName || t.teamIdentity,
        engineerCount: t.engineers?.length || 0,
      })),
      teamCount: teams.length,
      engineerCount: engineers.length,
      aiEngineerCount: aiEngineers.length,
      humanEngineerCount: engineers.length - aiEngineers.length,
    };
  }
}
