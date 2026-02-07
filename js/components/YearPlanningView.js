/**
 * YearPlanningView.js
 *
 * Class-based Year Planning view for the Workspace Canvas.
 * Compliant with docs/workspace-canvas-contract.md v2.0
 *
 * Features:
 * - Drag-drop initiative reordering
 * - Real-time ATL/BTL calculation
 * - Team Load Summary synchronization
 * - AI optimizer integration
 */

class YearPlanningView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentYear = new Date().getFullYear();
    this.scenario = 'effective'; // 'funded' | 'team_bis' | 'effective'
    this.applyConstraints = false;
    this.selectedTeamFilter = 'all';
    this.selectedSnapshotId = '';

    // Cached calculated data
    this.summaryData = null;
    this.tableData = null;

    // Drag state (migrated from yearPlanning.js globals)
    this.draggedInitiativeId = null;
    this.draggedRowElement = null;

    // Focus restore state (enables continuous editing after rerender)
    this.lastEditedCell = null; // { initiativeId, teamId }

    // UI state
    this.isSummaryExpanded = false;

    // Settings subscription - bind handler for proper cleanup
    this._onSettingsChanged = this._onSettingsChanged.bind(this);
    document.addEventListener('settings:changed', this._onSettingsChanged);
  }

  /**
   * Handle settings:changed event - re-render toolbar to show/hide AI button
   * @private
   */
  _onSettingsChanged(event) {
    // Only re-render toolbar if this view is currently active
    if (navigationManager?.currentViewId === 'planningView') {
      console.log('[YearPlanningView] Settings changed, re-rendering toolbar');
      this.setToolbar();
    }
  }

  /**
   * Toggle the Team Load Summary collapsible section
   * @private
   */
  _toggleSummarySection() {
    const contentDiv = document.getElementById('teamLoadSummaryContent');
    const indicatorSpan = document.getElementById('teamLoadSummaryToggle');

    if (!contentDiv || !indicatorSpan) {
      console.error('[YearPlanningView] Cannot toggle summary section: Missing elements');
      return;
    }

    const isHidden = contentDiv.classList.contains('is-hidden');
    contentDiv.classList.toggle('is-hidden', !isHidden);
    indicatorSpan.textContent = isHidden ? '(-) ' : '(+) ';

    // Update internal state
    this.isSummaryExpanded = isHidden;

    // Adjust table height after toggle
    this._adjustPlanningTableHeight();
  }

  /**
   * Dynamically adjusts the max-height of the planning table scroll wrapper
   * @private
   */
  _adjustPlanningTableHeight() {
    const tableWrapper = document.getElementById('planningTableWrapper');
    if (!tableWrapper) return;

    const viewportHeight = window.innerHeight;
    const tableWrapperTop = tableWrapper.getBoundingClientRect().top;
    const availableSpace = viewportHeight - tableWrapperTop;
    const bottomMargin = 60;
    const minHeight = 200;

    let calculatedMaxHeight = Math.max(minHeight, availableSpace - bottomMargin);
    styleVars.set(tableWrapper, {
      '--planning-table-max-height': `${calculatedMaxHeight}px`,
    });
  }

  /**
   * Cleanup method - called when view is destroyed
   */
  destroy() {
    document.removeEventListener('settings:changed', this._onSettingsChanged);
  }

  /**
   * Main render function - called by NavigationManager
   */
  render() {
    if (!this.container) {
      console.error('YearPlanningView: Container not found');
      return;
    }

    // Ensure capacity metrics are fresh
    this.refreshCapacityMetrics();

    // 1. Set Workspace Metadata
    this.setPageMetadata();

    // 2. Set Toolbar
    this.setToolbar();

    // 3. Render Content
    this.renderLayout();

    // 4. Ensure data consistency
    this.ensureDataConsistency();

    // 5. Calculate and render tables
    this.summaryData = this.calculateSummaryData();
    this.renderSummaryTable(this.summaryData);

    this.tableData = this.calculateTableData();
    this.renderPlanningTable(this.tableData);

    console.log('YearPlanningView: Render complete');
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const atlInitiatives = (this.tableData || []).filter((i) => !i.isBTL);
    const btlInitiatives = (this.tableData || []).filter((i) => i.isBTL);

    return {
      viewTitle: 'Year Plan',
      planningYear: this.currentYear,
      scenario: this.scenario,
      constraintsEnabled: this.applyConstraints,
      teamLoadSummary: this.summaryData,
      planningTable: this.tableData,
      // Summary metrics for quick AI access
      atlInitiativeCount: atlInitiatives.length,
      btlInitiativeCount: btlInitiatives.length,
      totalSdeYears: atlInitiatives.reduce(
        (sum, i) => sum + (i.calculatedInitiativeTotalSde || 0),
        0
      ),
    };
  }

  /**
   * Refresh capacity metrics before rendering
   */
  refreshCapacityMetrics() {
    const system = SystemService.getCurrentSystem();
    if (system) {
      const capacityEngine = new CapacityEngine(system);
      system.calculatedCapacityMetrics = capacityEngine.calculateAllMetrics();
    }
  }

  /**
   * Set workspace page metadata (header)
   * NOTE: Actions moved to toolbar per Workspace Canvas UX pattern
   */
  setPageMetadata() {
    if (!workspaceComponent) return;

    workspaceComponent.setPageMetadata({
      title: 'Year Plan',
      breadcrumbs: ['Planning', 'Year Plan'],
      actions: [], // Actions in toolbar, not header
    });
  }

  /**
   * Set workspace toolbar
   */
  setToolbar() {
    if (!workspaceComponent) return;
    const toolbar = this.generateToolbar();
    workspaceComponent.setToolbar(toolbar);
  }

  /**
   * Generate toolbar controls
   * @returns {HTMLElement}
   */
  generateToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'planning-toolbar';

    // Left side - controls
    const leftGroup = document.createElement('div');
    leftGroup.className = 'year-plan-toolbar-group';

    // Year Selector
    leftGroup.appendChild(this.createYearSelector());

    // Scenario Controls
    const scenarioGroup = this.createScenarioControls();
    if (scenarioGroup) leftGroup.appendChild(scenarioGroup);

    // Team focus filter
    const teamFilterGroup = this.createTeamFilterSelector();
    if (teamFilterGroup) leftGroup.appendChild(teamFilterGroup);

    toolbar.appendChild(leftGroup);

    // Right side - actions
    const rightGroup = document.createElement('div');
    rightGroup.className = 'year-plan-toolbar-group year-plan-toolbar-group--right';

    // Constraints Toggle
    const toggleGroup = this.createConstraintsToggle();
    if (toggleGroup) rightGroup.appendChild(toggleGroup);

    // Snapshot controls
    const snapshotGroup = this.createSnapshotControls();
    if (snapshotGroup) rightGroup.appendChild(snapshotGroup);

    const exportGroup = this.createExportControls();
    if (exportGroup) rightGroup.appendChild(exportGroup);

    // Save Plan Button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-danger btn-sm';
    const saveIcon = document.createElement('i');
    saveIcon.className = 'fas fa-save';
    saveBtn.appendChild(saveIcon);
    saveBtn.appendChild(document.createTextNode(` Save Plan for ${this.currentYear}`));
    saveBtn.addEventListener('click', () => this.handleSavePlan());
    rightGroup.appendChild(saveBtn);

    // Optimize Button (AI-enabled only)
    if (SettingsService.get()?.ai?.isEnabled) {
      const optimizeBtn = document.createElement('button');
      optimizeBtn.className = 'btn btn-info btn-sm';
      const aiIcon = document.createElement('i');
      aiIcon.className = 'fas fa-robot';
      optimizeBtn.appendChild(aiIcon);
      optimizeBtn.appendChild(document.createTextNode(' Optimize Plan'));
      optimizeBtn.addEventListener('click', () => this.runOptimizer());
      rightGroup.appendChild(optimizeBtn);
    }

    toolbar.appendChild(rightGroup);

    return toolbar;
  }

  createTeamFilterSelector() {
    const teams = SystemService.getCurrentSystem()?.teams || [];
    const options = [{ value: 'all', text: 'All Teams' }];
    teams.forEach((team) => {
      options.push({
        value: team.teamId,
        text: team.teamIdentity || team.teamName || team.teamId,
      });
    });

    const group = document.createElement('div');
    group.className = 'year-plan-toolbar-group';

    const label = document.createElement('strong');
    label.className = 'year-plan-toolbar-label';
    label.textContent = 'Team Focus:';
    group.appendChild(label);

    this.teamFocusSelect = new ThemedSelect({
      options,
      value: this.selectedTeamFilter,
      id: 'year-plan-team-focus-select',
      onChange: (value) => {
        this.selectedTeamFilter = value || 'all';
        this.render();
      },
    });
    group.appendChild(this.teamFocusSelect.render());

    return group;
  }

  createExportControls() {
    const group = document.createElement('div');
    group.className = 'year-plan-toolbar-group year-plan-toolbar-group--exports';

    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.type = 'button';
    exportCsvBtn.className = 'btn btn-secondary btn-sm';
    const csvIcon = document.createElement('i');
    csvIcon.className = 'fas fa-file-csv';
    exportCsvBtn.appendChild(csvIcon);
    exportCsvBtn.appendChild(document.createTextNode(' Export CSV'));
    exportCsvBtn.addEventListener('click', () => this.handleExportYearPlanCsv());
    group.appendChild(exportCsvBtn);

    const exportXlsxBtn = document.createElement('button');
    exportXlsxBtn.type = 'button';
    exportXlsxBtn.className = 'btn btn-secondary btn-sm';
    const xlsxIcon = document.createElement('i');
    xlsxIcon.className = 'fas fa-file-excel';
    exportXlsxBtn.appendChild(xlsxIcon);
    exportXlsxBtn.appendChild(document.createTextNode(' Export XLSX'));
    exportXlsxBtn.addEventListener('click', () => this.handleExportYearPlanXlsx());
    group.appendChild(exportXlsxBtn);

    return group;
  }

  createSnapshotControls() {
    const systemData = SystemService.getCurrentSystem();
    if (!systemData) return null;

    const snapshots = PlanningService.getPlanSnapshots(systemData, this.currentYear);
    const options = [{ value: '', text: 'Select Snapshot' }];
    snapshots.forEach((snapshot) => {
      const stamp = new Date(snapshot.createdAt);
      const stampLabel = isNaN(stamp.getTime()) ? snapshot.createdAt : stamp.toLocaleString();
      options.push({
        value: snapshot.snapshotId,
        text: `${stampLabel} (${snapshot.initiatives?.length || 0} items)`,
      });
    });

    if (!options.some((option) => option.value === this.selectedSnapshotId)) {
      this.selectedSnapshotId = '';
    }

    const group = document.createElement('div');
    group.className = 'year-plan-toolbar-group year-plan-toolbar-group--snapshots';

    const snapshotSelect = new ThemedSelect({
      options,
      value: this.selectedSnapshotId,
      id: 'year-plan-snapshot-select',
      onChange: (value) => {
        this.selectedSnapshotId = value || '';
      },
    });
    group.appendChild(snapshotSelect.render());

    const saveSnapshotBtn = document.createElement('button');
    saveSnapshotBtn.type = 'button';
    saveSnapshotBtn.className = 'btn btn-secondary btn-sm';
    saveSnapshotBtn.textContent = 'Save Snapshot';
    saveSnapshotBtn.addEventListener('click', () => this.handleSaveSnapshot());
    group.appendChild(saveSnapshotBtn);

    const loadSnapshotBtn = document.createElement('button');
    loadSnapshotBtn.type = 'button';
    loadSnapshotBtn.className = 'btn btn-secondary btn-sm';
    loadSnapshotBtn.textContent = 'Load Snapshot';
    loadSnapshotBtn.addEventListener('click', () => this.handleLoadSnapshot());
    group.appendChild(loadSnapshotBtn);

    return group;
  }

  /**
   * Create year selector control
   */
  createYearSelector() {
    const availableYears = this.getAvailableYears();

    const yearGroup = document.createElement('div');
    yearGroup.className = 'year-plan-toolbar-group';

    const yearLabel = document.createElement('strong');
    yearLabel.className = 'year-plan-toolbar-label';
    yearLabel.textContent = 'Planning Year:';
    yearGroup.appendChild(yearLabel);

    // Build year options for ThemedSelect
    const yearOptions = availableYears.map((year) => ({
      value: year.toString(),
      text: year.toString(),
    }));

    // Create ThemedSelect instance
    this.yearSelect = new ThemedSelect({
      options: yearOptions,
      value: this.currentYear.toString(),
      id: 'year-planning-selector',
      onChange: (value) => this.setYear(parseInt(value)),
    });

    yearGroup.appendChild(this.yearSelect.render());
    return yearGroup;
  }

  /**
   * Get available planning years from initiatives
   */
  getAvailableYears() {
    const calendarYear = new Date().getFullYear();
    let availableYears = [];

    const initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
    if (initiatives.length > 0) {
      const yearsFromData = new Set(
        initiatives.map((init) => init.attributes?.planningYear).filter(Boolean)
      );
      availableYears = Array.from(yearsFromData);
    }

    if (!availableYears.includes(calendarYear)) availableYears.push(calendarYear);
    availableYears.sort((a, b) => a - b);

    if (!availableYears.includes(this.currentYear)) {
      this.currentYear = availableYears.includes(calendarYear) ? calendarYear : availableYears[0];
    }

    return availableYears;
  }

  /**
   * Create scenario toggle buttons
   */
  createScenarioControls() {
    const metrics = SystemService.getCurrentSystem()?.calculatedCapacityMetrics;
    if (!metrics) return null;

    const scenarioGroup = document.createElement('div');
    scenarioGroup.className = 'year-plan-toolbar-group';

    const label = document.createElement('strong');
    label.className = 'year-plan-toolbar-label';
    label.textContent = 'Calculate ATL/BTL using:';
    scenarioGroup.appendChild(label);

    const scenarios = [
      { id: 'effective', label: 'Effective BIS', key: 'EffectiveBIS' },
      { id: 'team_bis', label: 'Team BIS', key: 'TeamBIS' },
      { id: 'funded', label: 'Funded HC', key: 'FundedHC' },
    ];

    scenarios.forEach((sc) => {
      const btn = document.createElement('button');
      btn.textContent = sc.label;
      btn.className = `btn btn-sm year-plan-scenario-btn ${this.scenario === sc.id ? 'btn-primary' : 'btn-light'}`;
      if (this.scenario === sc.id) {
        // btn-primary class handles the style
      }

      const scMetrics = metrics.totals?.[sc.key];
      if (scMetrics) {
        btn.title = `Gross: ${scMetrics.grossYrs.toFixed(2)}, Net: ${scMetrics.netYrs.toFixed(2)}`;
      }

      btn.addEventListener('click', () => this.setScenario(sc.id));
      scenarioGroup.appendChild(btn);
    });

    return scenarioGroup;
  }

  /**
   * Create constraints toggle checkbox
   */
  createConstraintsToggle() {
    const metrics = SystemService.getCurrentSystem()?.calculatedCapacityMetrics;
    if (!metrics) return null;

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'year-plan-toolbar-group';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'applyConstraintsToggle';
    checkbox.checked = this.applyConstraints;
    checkbox.className = 'year-plan-checkbox';
    checkbox.addEventListener('change', (e) => this.setApplyConstraints(e.target.checked));

    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'applyConstraintsToggle';
    toggleLabel.textContent = 'Apply Constraints & AI Gains (Net)';
    toggleLabel.className = 'year-plan-toggle-label';
    toggleLabel.title = 'Toggling this ON applies all configured capacity constraints.';

    toggleGroup.appendChild(checkbox);
    toggleGroup.appendChild(toggleLabel);
    return toggleGroup;
  }

  /**
   * Render the main layout structure using DOM creation
   * PHASE 3: Converted from innerHTML to document.createElement
   */
  renderLayout() {
    // Capture current expanded state before re-rendering
    const existingSummaryContent = document.getElementById('teamLoadSummaryContent');
    if (existingSummaryContent) {
      this.isSummaryExpanded = !existingSummaryContent.classList.contains('is-hidden');
    }

    const isExpanded = this.isSummaryExpanded;

    // Clear container
    this._clearElement(this.container);

    // === Team Load Summary Section ===
    // Styling now in year-planning-view.css
    const summarySection = document.createElement('div');
    summarySection.id = 'teamLoadSummarySection';

    // Summary Header (collapsible) - styling in CSS
    const summaryHeader = document.createElement('h4');
    summaryHeader.title = 'Click to expand/collapse team load summary';
    summaryHeader.addEventListener('click', () => this._toggleSummarySection());

    const toggleIndicator = document.createElement('span');
    toggleIndicator.id = 'teamLoadSummaryToggle';
    toggleIndicator.className = 'toggle-indicator';
    toggleIndicator.textContent = isExpanded ? '(-) ' : '(+) ';
    summaryHeader.appendChild(toggleIndicator);

    summaryHeader.appendChild(document.createTextNode('Team Load Summary (for ATL Initiatives)'));
    summarySection.appendChild(summaryHeader);

    // Summary Content (collapsible content) - styling in CSS
    const summaryContent = document.createElement('div');
    summaryContent.id = 'teamLoadSummaryContent';
    // Dynamic display state (not in CSS)
    summaryContent.classList.toggle('is-hidden', !isExpanded);

    // Note paragraph - styling in CSS
    const summaryNote = document.createElement('p');
    summaryNote.textContent =
      'Shows team load based *only* on initiatives currently Above The Line (ATL) according to the selected scenario below.';
    summaryContent.appendChild(summaryNote);

    // Summary Table - styling in CSS
    const summaryTable = document.createElement('table');
    summaryTable.id = 'teamLoadSummaryTable';

    // Table Header (styles in year-planning-view.css)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = [
      { text: 'Team Name', title: '' },
      { text: 'Funded HC', title: 'Finance Approved Budget' },
      { text: 'Team BIS', title: 'Actual Team Members' },
      { text: 'Away BIS', title: 'Borrowed/Away Members' },
      { text: 'Effective BIS', title: 'Team BIS + Away BIS' },
      { text: 'Assigned ATL SDEs', title: 'SDEs assigned to this team from ATL initiatives only' },
      {
        text: 'Scenario Capacity Limit',
        title: "Team's capacity based on selected scenario button below",
      },
      { text: 'Remaining Capacity (ATL)', title: 'Scenario Capacity Limit - Assigned ATL SDEs' },
      { text: 'ATL Status', title: 'Load status for ATL work based on Scenario Capacity Limit' },
    ];

    headers.forEach((h) => {
      const th = document.createElement('th');
      // Styles handled by #teamLoadSummaryTable thead th in CSS
      th.textContent = h.text;
      if (h.title) th.title = h.title;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    summaryTable.appendChild(thead);

    // Table Body
    const tbody = document.createElement('tbody');
    tbody.id = 'teamLoadSummaryTableBody';
    summaryTable.appendChild(tbody);

    // Table Footer (styles in CSS)
    const tfoot = document.createElement('tfoot');
    tfoot.id = 'teamLoadSummaryTableFoot';
    summaryTable.appendChild(tfoot);

    summaryContent.appendChild(summaryTable);
    summarySection.appendChild(summaryContent);
    this.container.appendChild(summarySection);

    // === Planning Table Container ===
    const planningTableContainer = document.createElement('div');
    planningTableContainer.id = 'planningTableContainer';
    this.container.appendChild(planningTableContainer);
  }

  /**
   * Ensure data consistency before rendering
   */
  ensureDataConsistency() {
    WorkPackageService.ensureWorkPackagesForInitiatives(
      SystemService.getCurrentSystem(),
      this.currentYear
    );
    const initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
    initiatives
      .filter((init) => init.attributes?.planningYear == this.currentYear)
      .forEach((init) => {
        WorkPackageService.syncInitiativeTotals(
          init.initiativeId,
          SystemService.getCurrentSystem()
        );
      });
  }

  /**
   * Calculate summary data using PlanningService
   */
  calculateSummaryData() {
    if (
      !SystemService.getCurrentSystem()?.calculatedCapacityMetrics ||
      !SystemService.getCurrentSystem()?.teams
    ) {
      return { rows: [], totals: {} };
    }

    const initiativesForYear = (SystemService.getCurrentSystem().yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear == this.currentYear && init.status !== 'Completed'
    );

    return PlanningService.calculateTeamLoadSummary({
      teams: SystemService.getCurrentSystem().teams,
      initiatives: initiativesForYear,
      calculatedMetrics: SystemService.getCurrentSystem().calculatedCapacityMetrics,
      scenario: this.scenario,
      applyConstraints: this.applyConstraints,
      allKnownEngineers: SystemService.getCurrentSystem().allKnownEngineers || [],
    });
  }

  /**
   * Calculate table data using PlanningService
   */
  calculateTableData() {
    if (
      !SystemService.getCurrentSystem()?.calculatedCapacityMetrics ||
      !SystemService.getCurrentSystem()?.teams
    ) {
      return [];
    }

    const initiativesForYear = (SystemService.getCurrentSystem().yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear == this.currentYear && init.status !== 'Completed'
    );

    const calculatedData = PlanningService.calculatePlanningTableData({
      initiatives: initiativesForYear,
      calculatedMetrics: SystemService.getCurrentSystem().calculatedCapacityMetrics,
      scenario: this.scenario,
      applyConstraints: this.applyConstraints,
    });

    // Note: planningStatusFundedHc is persisted only when user explicitly saves
    // via PlanningService.commitPlanningChanges(), not during render

    return calculatedData;
  }

  /**
   * Render the Team Load Summary table with context-aware columns
   * Columns adapt based on selected scenario and constraints toggle
   */
  renderSummaryTable(summaryData) {
    const summaryContainer = document.getElementById('teamLoadSummarySection');
    if (!summaryContainer) {
      return;
    }

    const summaryTable = summaryContainer.querySelector('#teamLoadSummaryTable');
    const summaryTableBody = summaryTable?.querySelector('#teamLoadSummaryTableBody');
    const summaryTableFoot = summaryTable?.querySelector('#teamLoadSummaryTableFoot');
    let summaryTableHead = summaryTable?.querySelector('thead');

    if (!summaryTable || !summaryTableBody || !summaryTableFoot || !summaryTableHead) {
      console.error('YearPlanningView: Missing Team Load Summary table structure.');
      return;
    }

    // Clear existing content
    this._clearElement(summaryTableHead);
    this._clearElement(summaryTableBody);
    this._clearElement(summaryTableFoot);

    // Scenario and state configuration
    const scenarioKey =
      this.scenario === 'funded'
        ? 'FundedHC'
        : this.scenario === 'team_bis'
          ? 'TeamBIS'
          : 'EffectiveBIS';
    const isNetCapacityUsed = this.applyConstraints;
    const scenarioNameForTitle = `${isNetCapacityUsed ? 'Net' : 'Gross'} ${scenarioKey.replace('BIS', ' BIS')}`;

    // Update title
    const summaryTitleHeader = summaryContainer.querySelector('h4');
    if (summaryTitleHeader) {
      const toggleSpan = summaryTitleHeader.querySelector('span.toggle-indicator');
      summaryTitleHeader.textContent = ` Team Load Summary (for ATL Initiatives - Scenario: ${scenarioNameForTitle})`;
      if (toggleSpan) {
        summaryTitleHeader.insertBefore(toggleSpan, summaryTitleHeader.firstChild);
      }
    }

    // Build context-aware column configuration
    const columns = this._buildSummaryColumns(scenarioKey, isNetCapacityUsed);

    // Build header row (styles handled by CSS)
    const headerRow = summaryTableHead.insertRow();
    columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.header;
      th.title = col.title || '';
      if (col.align === 'left') th.classList.add('year-plan-cell--left');
      headerRow.appendChild(th);
    });

    // Build data rows
    (summaryData.rows || []).forEach((rowData) => {
      const row = summaryTableBody.insertRow();
      columns.forEach((col) => {
        const cell = row.insertCell();
        const value = col.getValue(rowData, isNetCapacityUsed);
        cell.textContent = value;

        // Apply CSS class instead of inline style
        if (col.getCssClass) {
          const cssClass = col.getCssClass(rowData, isNetCapacityUsed);
          if (cssClass) cell.classList.add(cssClass);
        }
        if (col.align === 'left') cell.classList.add('year-plan-cell--left');
      });
    });

    // Build footer row
    const totals = summaryData.totals || {};
    const footerRow = summaryTableFoot.insertRow();
    columns.forEach((col) => {
      const cell = footerRow.insertCell();
      const value = col.getTotal ? col.getTotal(totals, isNetCapacityUsed) : '';
      cell.textContent = value;

      // Apply CSS class instead of inline style
      if (col.getTotalCssClass) {
        const cssClass = col.getTotalCssClass(totals, isNetCapacityUsed);
        if (cssClass) cell.classList.add(cssClass);
      }
      if (col.align === 'left') cell.classList.add('year-plan-cell--left');
    });
  }

  /**
   * Build column configuration based on scenario and constraints
   * @private
   */
  _buildSummaryColumns(scenarioKey, isNetCapacityUsed) {
    const columns = [];
    const stateDisplayName = isNetCapacityUsed ? 'Net' : 'Gross';

    // 1. Team Name (always)
    columns.push({
      header: 'Team',
      title: 'Team Name',
      align: 'left',
      getValue: (row) => row.teamName,
      getTotal: () => 'Totals',
    });

    // 2. Scenario-specific base capacity column(s)
    if (this.scenario === 'funded') {
      columns.push({
        header: 'Funded HC (Humans)',
        title: 'Budgeted headcount for human engineers.',
        getValue: (row) => row.fundedHC.toFixed(2),
        getTotal: (totals) => (totals.fundedHCGross ?? 0).toFixed(2),
      });
    } else if (this.scenario === 'team_bis') {
      columns.push({
        header: 'Team BIS (Humans)',
        title: 'Actual human engineers on the team.',
        getValue: (row) => row.teamBISHumans.toFixed(2),
        getTotal: (totals) => (totals.teamBISHumans ?? 0).toFixed(2),
      });
    } else {
      // Effective BIS - show Team BIS + Away BIS
      columns.push({
        header: 'Team BIS (Humans)',
        title: 'Actual human engineers on the team.',
        getValue: (row) => row.teamBISHumans.toFixed(2),
        getTotal: (totals) => (totals.teamBISHumans ?? 0).toFixed(2),
      });
      columns.push({
        header: 'Away BIS (Humans)',
        title: 'Borrowed human engineers from other teams.',
        getValue: (row) => row.awayBISHumans.toFixed(2),
        getTotal: (totals) => (totals.awayBISHumans ?? 0).toFixed(2),
      });
    }

    // 3. AI Engineers (always - important distinction)
    columns.push({
      header: 'AI Engineers',
      title: 'Count of AI Software Engineers contributing to the team.',
      getValue: (row) => row.aiEngineers.toFixed(2),
      getTotal: (totals) => (totals.aiEngineers ?? 0).toFixed(2),
    });

    // 4. Adjustment columns (only when constraints ON)
    if (isNetCapacityUsed) {
      columns.push({
        header: '(-) Sinks (SDE/Yrs)',
        title: 'Total deductions from leave, overhead, etc.',
        getValue: (row) => `-${row.sinks.toFixed(2)}`,
        getTotal: (totals) => `-${(totals.sinks ?? 0).toFixed(2)}`,
        getCssClass: () => 'year-plan-value--negative',
        getTotalCssClass: () => 'year-plan-value--negative',
      });
      // Hiring Ramp-up columns (only show if any team has values)
      columns.push({
        header: '(-) Hire Ramp-up',
        title: 'Capacity lost while new hires ramp up to full productivity.',
        getValue: (row) =>
          row.hiringRampUpSink > 0 ? `-${row.hiringRampUpSink.toFixed(2)}` : '0.00',
        getTotal: (totals) =>
          totals.hiringRampUpSink > 0 ? `-${(totals.hiringRampUpSink ?? 0).toFixed(2)}` : '0.00',
        getCssClass: (row) => (row.hiringRampUpSink > 0 ? 'year-plan-value--negative' : ''),
        getTotalCssClass: (totals) =>
          (totals.hiringRampUpSink ?? 0) > 0 ? 'year-plan-value--negative' : '',
      });
      columns.push({
        header: '(+) New Hire Gain',
        title: 'Capacity gained from new hires after ramp-up completes.',
        getValue: (row) => (row.newHireGain > 0 ? `+${row.newHireGain.toFixed(2)}` : '0.00'),
        getTotal: (totals) =>
          totals.newHireGain > 0 ? `+${(totals.newHireGain ?? 0).toFixed(2)}` : '0.00',
        getCssClass: (row) => (row.newHireGain > 0 ? 'year-plan-value--positive' : ''),
        getTotalCssClass: (totals) =>
          (totals.newHireGain ?? 0) > 0 ? 'year-plan-value--positive' : '',
      });
      columns.push({
        header: '(+) AI Productivity Gain',
        title: 'The effective SDE/Year capacity gained from AI tooling.',
        getValue: (row) => `+${row.productivityGain.toFixed(2)}`,
        getTotal: (totals) => `+${(totals.productivityGain ?? 0).toFixed(2)}`,
        getCssClass: () => 'year-plan-value--positive',
        getTotalCssClass: () => 'year-plan-value--positive',
      });
      columns.push({
        header: 'AI Gain %',
        title: 'The configured productivity gain percentage for the team.',
        getValue: (row) => `${row.productivityPercent.toFixed(0)}%`,
        getTotal: () => '',
      });
    }

    // 5. Final Capacity (always)
    const scenarioDisplayName = scenarioKey.replace('BIS', ' BIS');
    columns.push({
      header: `${scenarioDisplayName} Capacity (${stateDisplayName})`,
      title: `The total planning capacity under ${scenarioDisplayName} scenario.`,
      getValue: (row) => row.scenarioCapacity.toFixed(2),
      getTotal: (totals) => (totals.scenarioCapacity ?? 0).toFixed(2),
    });

    // 6. Assigned ATL SDEs (always)
    columns.push({
      header: 'Assigned ATL SDEs',
      title: 'SDEs assigned from ATL initiatives.',
      getValue: (row) => row.assignedAtlSde.toFixed(2),
      getTotal: (totals) => (totals.assignedAtlSde ?? 0).toFixed(2),
    });

    // 7. Remaining Capacity (always)
    columns.push({
      header: 'Remaining Capacity (ATL)',
      title: 'Scenario Capacity minus Assigned ATL SDEs.',
      getValue: (row) => row.remainingCapacity.toFixed(2),
      getTotal: (totals) => (totals.remainingCapacity ?? 0).toFixed(2),
      getCssClass: (row) =>
        row.remainingCapacity < 0 ? 'year-plan-value--negative' : 'year-plan-value--positive',
      getTotalCssClass: (totals) =>
        (totals.remainingCapacity ?? 0) < 0
          ? 'year-plan-value--negative'
          : 'year-plan-value--positive',
    });

    columns.push({
      header: 'ATL Status',
      title: 'Indicates if team is overloaded based on ATL work.',
      getValue: (row) => row.status,
      getTotal: () => '',
      getCssClass: (row) => {
        if (row.status === '🛑 Overloaded') return 'year-plan-status-text--danger';
        if (row.status === '⚠️ Near Limit') return 'year-plan-status-text--warning';
        return 'year-plan-status-text--ok';
      },
    });

    return columns;
  }

  /**
   * Render the main Planning Table
   * REFACTORED: Moved from yearPlanning.js into class for proper encapsulation
   * NOTE: Event handlers (drag/drop, estimate change, protected change) still reference
   * legacy functions in yearPlanning.js - those can be migrated in a follow-up cleanup
   */
  renderPlanningTable(tableData) {
    const tableContainer = document.getElementById('planningTableContainer');
    if (!tableContainer) {
      return;
    }

    this._clearElement(tableContainer);

    const displayTableData = this._getDisplayTableData(tableData);
    if (displayTableData.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'year-plan-empty-state';
      empty.textContent =
        this.selectedTeamFilter !== 'all'
          ? 'No initiatives are assigned to the selected team for this planning year.'
          : 'No initiatives found for this planning year.';
      tableContainer.appendChild(empty);
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.id = 'planningTableWrapper';

    const table = document.createElement('table');
    table.id = 'planningTable';
    // Table styling handled by #planningTable in CSS

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    // Header row styling handled by CSS

    // Fixed headers (styles in CSS via #planningTable th)
    const fixedHeaders = [
      'Protected',
      'Title',
      'ID',
      'Description',
      'Total SDE Years',
      'Cumulative SDE Years',
      'Capacity Status',
      'ATL/BTL',
    ];
    fixedHeaders.forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    // Team columns
    const teams = SystemService.getCurrentSystem()?.teams || [];
    const calculatedMetrics = SystemService.getCurrentSystem()?.calculatedCapacityMetrics || {};
    const teamHeaderMap = new Map();
    const cumulativeLookup = this._buildTeamCumulativeLookup(tableData, teams);

    teams.forEach((team, index) => {
      const th = document.createElement('th');
      const teamDisplayIdentity = team.teamIdentity || team.teamId || 'Unknown';
      const teamFullName = team.teamName || teamDisplayIdentity;
      const teamMetrics = calculatedMetrics[team.teamId];
      const teamTitle = `Team: ${teamFullName}\nIdentity: ${teamDisplayIdentity}\nFunded HC: ${teamMetrics?.FundedHC?.humanHeadcount?.toFixed?.(2) || '0.00'}\nTeam BIS: ${teamMetrics?.TeamBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}\nEff. BIS: ${teamMetrics?.EffectiveBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}`;
      th.textContent = teamDisplayIdentity;
      th.title = teamTitle;
      th.setAttribute('data-team-id', team.teamId);
      th.classList.add('year-plan-team-header');
      headerRow.appendChild(th);
      teamHeaderMap.set(fixedHeaders.length + index, team.teamId);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'planningTableBody';

    // Use class properties instead of global variables
    const scenarioKey =
      this.scenario === 'funded'
        ? 'FundedHC'
        : this.scenario === 'team_bis'
          ? 'TeamBIS'
          : 'EffectiveBIS';
    const isNetCapacityUsed = this.applyConstraints;

    // Build rows
    displayTableData.forEach((initiative) => {
      const row = tbody.insertRow();
      row.setAttribute('data-initiative-id', initiative.initiativeId);
      row.setAttribute('draggable', !initiative.isProtected);

      // Add row type classes
      if (initiative.isProtected) {
        row.classList.add('year-plan-row--protected');
      }
      if (initiative.isBTL) {
        row.classList.add('year-plan-row--btl');
      }

      // Drag handlers (use arrow functions to preserve 'this' context)
      row.addEventListener('dragover', (e) => this._handleDragOver(e));
      row.addEventListener('dragleave', (e) => this._handleDragLeave(e));
      row.addEventListener('drop', (e) => this._handleDrop(e));
      row.addEventListener('dragend', (e) => this._handleDragEnd(e));
      if (!initiative.isProtected) {
        row.addEventListener('dragstart', (e) => this._handleDragStart(e));
      }

      // Protected checkbox cell
      const protectedCell = row.insertCell();
      protectedCell.classList.add('year-plan-cell--center');
      const protectedCheckbox = document.createElement('input');
      protectedCheckbox.type = 'checkbox';
      protectedCheckbox.checked = initiative.isProtected;
      protectedCheckbox.setAttribute('data-initiative-id', initiative.initiativeId);
      protectedCheckbox.classList.add('year-plan-checkbox');
      protectedCheckbox.addEventListener('change', (e) => this._handleProtectedChange(e));
      protectedCell.appendChild(protectedCheckbox);

      // Title cell
      const titleCell = row.insertCell();
      titleCell.textContent = initiative.title || 'No Title';
      if (initiative.isProtected) titleCell.classList.add('year-plan-cell--bold');

      // ID cell
      const idCell = row.insertCell();
      idCell.textContent = initiative.initiativeId;
      idCell.classList.add('year-plan-cell--id');

      // Description cell
      const descCell = row.insertCell();
      const descText = initiative.description || '';
      descCell.textContent = descText.length > 50 ? descText.substring(0, 47) + '...' : descText;
      descCell.title = descText;
      descCell.classList.add('year-plan-cell--description');

      // Total SDE cell
      const totalSdeCell = row.insertCell();
      totalSdeCell.classList.add('year-plan-cell--right');
      totalSdeCell.textContent = initiative.calculatedInitiativeTotalSde.toFixed(2);

      // Cumulative SDE cell
      const cumSdeCell = row.insertCell();
      cumSdeCell.classList.add('year-plan-cell--right');
      cumSdeCell.textContent = initiative.calculatedCumulativeSde.toFixed(2);

      // Capacity Status cell
      const statusCell = row.insertCell();
      statusCell.classList.add('year-plan-cell--center');

      // Use the currently selected scenario's total capacity
      const selectedScenarioKey =
        this.scenario === 'funded'
          ? 'FundedHC'
          : this.scenario === 'team_bis'
            ? 'TeamBIS'
            : 'EffectiveBIS';
      const scenarioCapacity = isNetCapacityUsed
        ? calculatedMetrics.totals?.[selectedScenarioKey]?.netYrs
        : calculatedMetrics.totals?.[selectedScenarioKey]?.grossYrs;
      const totalCapacity = scenarioCapacity || 0;

      if (initiative.calculatedCumulativeSde <= totalCapacity) {
        statusCell.textContent = '✅';
        statusCell.title = `Within ${selectedScenarioKey} capacity (${totalCapacity.toFixed(2)})`;
        statusCell.classList.add('year-plan-capacity--ok');
      } else {
        statusCell.textContent = '⚠️';
        statusCell.title = `Exceeds ${selectedScenarioKey} capacity (${totalCapacity.toFixed(2)})`;
        statusCell.classList.add('year-plan-capacity--warning');
      }

      // ATL/BTL cell
      const atlBtlCell = row.insertCell();
      atlBtlCell.classList.add('year-plan-atl-status');
      if (!initiative.isBTL) {
        atlBtlCell.textContent = 'ATL';
        atlBtlCell.classList.add('year-plan-atl-status--atl');
      } else {
        atlBtlCell.textContent = 'BTL';
        atlBtlCell.classList.add('year-plan-atl-status--btl');
      }

      // Team estimate cells
      const assignmentsMap = new Map(
        (initiative.assignments || []).map((a) => [a.teamId, a.sdeYears])
      );
      teamHeaderMap.forEach((teamId) => {
        const teamCell = row.insertCell();
        teamCell.classList.add('year-plan-team-cell');
        const currentEstimate = assignmentsMap.get(teamId) || 0;

        const estimateInput = document.createElement('input');
        estimateInput.type = 'number';
        estimateInput.min = '0';
        estimateInput.step = '0.25';
        estimateInput.value = currentEstimate > 0 ? currentEstimate.toFixed(2) : '';
        estimateInput.setAttribute('data-initiative-id', initiative.initiativeId);
        estimateInput.setAttribute('data-team-id', teamId);
        estimateInput.classList.add('year-plan-estimate-input');
        estimateInput.addEventListener('change', (e) => this._handleEstimateChange(e));
        teamCell.appendChild(estimateInput);

        // Color code based on capacity using CSS classes
        let teamLimit = isNetCapacityUsed
          ? (calculatedMetrics[teamId]?.[scenarioKey]?.netYrs ?? 0)
          : (calculatedMetrics[teamId]?.[scenarioKey]?.grossYrs ?? 0);

        const currentTeamCumulative = cumulativeLookup.get(initiative.initiativeId)?.[teamId] || 0;
        if (currentTeamCumulative <= teamLimit) {
          teamCell.classList.add('year-plan-team-cell--ok');
          teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit: ${teamLimit.toFixed(2)} - OK`;
        } else {
          teamCell.classList.add('year-plan-team-cell--over');
          teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit: ${teamLimit.toFixed(2)} - Overloaded`;
        }
      });

      // Row styling now handled by CSS classes (year-plan-row--protected, year-plan-row--btl)
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableContainer.appendChild(tableWrapper);

    // Adjust table height for viewport
    this._adjustPlanningTableHeight();
  }

  // ==================== State Setters ====================

  setYear(year) {
    this.currentYear = parseInt(year);
    console.log(`YearPlanningView: Year changed to ${this.currentYear}`);
    this.render();
  }

  setScenario(scenario) {
    this.scenario = scenario;
    console.log(`YearPlanningView: Scenario changed to ${this.scenario}`);
    this.render();
  }

  setApplyConstraints(value) {
    this.applyConstraints = value;
    console.log(`YearPlanningView: Apply constraints = ${this.applyConstraints}`);
    this.render();
  }

  // ==================== Actions ====================

  handleSavePlan() {
    console.log(`Saving plan for year ${this.currentYear}...`);

    const systemData = SystemService.getCurrentSystem();
    if (!systemData?.systemName) {
      notificationManager?.showToast('Cannot save: No system data loaded.', 'error');
      return;
    }

    try {
      PlanningService.createPlanSnapshot(systemData, {
        planningYear: this.currentYear,
        scenario: this.scenario,
        applyConstraints: this.applyConstraints,
        label: `Auto snapshot before save (${new Date().toLocaleString()})`,
      });

      // Use PlanningService to commit status changes via service command
      const result = PlanningService.commitPlanStatusesInPlace(systemData, {
        planningYear: this.currentYear,
        planningTable: this.tableData,
      });

      console.log(`Plan save: ${result.updated} status changes applied`);

      // Sync Work Packages
      WorkPackageService.ensureWorkPackagesForInitiatives(systemData, this.currentYear);
      (systemData.yearlyInitiatives || [])
        .filter((init) => init.attributes?.planningYear == this.currentYear)
        .forEach((init) => {
          WorkPackageService.syncWorkPackagesFromInitiative(init, systemData);
          WorkPackageService.syncInitiativeTotals(init.initiativeId, systemData);
        });

      // Persist
      SystemService.save();
      notificationManager?.showToast(`Plan for ${this.currentYear} saved successfully.`, 'success');
      this.render();
    } catch (error) {
      console.error('Error saving plan:', error);
      notificationManager?.showToast('Error saving plan. Check console.', 'error');
    }
  }

  handleSaveSnapshot() {
    const systemData = SystemService.getCurrentSystem();
    if (!systemData) return;

    const snapshot = PlanningService.createPlanSnapshot(systemData, {
      planningYear: this.currentYear,
      scenario: this.scenario,
      applyConstraints: this.applyConstraints,
      label: `Manual snapshot (${new Date().toLocaleString()})`,
    });

    if (!snapshot) {
      notificationManager?.showToast('Could not save snapshot.', 'error');
      return;
    }

    SystemService.save();
    notificationManager?.showToast('Plan snapshot saved.', 'success');
    this.render();
  }

  handleExportYearPlanCsv() {
    this.exportYearPlan('csv');
  }

  handleExportYearPlanXlsx() {
    this.exportYearPlan('xlsx');
  }

  exportYearPlan(format) {
    const systemData = SystemService.getCurrentSystem();
    if (!systemData) {
      notificationManager?.showToast('Load a system before exporting.', 'warning');
      return;
    }

    const exportData = this._buildYearPlanExportData();
    const fileName = this._buildYearPlanExportFileName(format);

    try {
      if (format === 'csv') {
        const csv = PlanningService.serializeYearPlanExportToCsv(exportData);
        this._downloadBlob(fileName, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        notificationManager?.showToast(`Exported ${fileName}`, 'success');
        return;
      }

      if (format === 'xlsx') {
        if (typeof XLSX === 'undefined') {
          notificationManager?.showToast(
            'XLSX export requires SheetJS (xlsx.full.min.js).',
            'error'
          );
          return;
        }

        const workbook = XLSX.utils.book_new();
        const metadataRows = [['Year Plan Export'], [], ...(exportData.metadata || [])];
        const summaryRows = [exportData.summary.headers || [], ...(exportData.summary.rows || [])];
        const initiativeRows = [
          exportData.initiatives.headers || [],
          ...(exportData.initiatives.rows || []),
        ];

        const metadataSheet = XLSX.utils.aoa_to_sheet(metadataRows);
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        const initiativesSheet = XLSX.utils.aoa_to_sheet(initiativeRows);

        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Team Summary');
        XLSX.utils.book_append_sheet(workbook, initiativesSheet, 'Initiatives');

        const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this._downloadBlob(
          fileName,
          new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        );
        notificationManager?.showToast(`Exported ${fileName}`, 'success');
        return;
      }

      notificationManager?.showToast(`Unsupported export format: ${format}`, 'error');
    } catch (error) {
      console.error('YearPlanningView export error:', error);
      notificationManager?.showToast(`Export failed: ${error.message}`, 'error');
    }
  }

  _buildYearPlanExportData() {
    const teams = SystemService.getCurrentSystem()?.teams || [];
    const tableData = Array.isArray(this.tableData) ? this.tableData : this.calculateTableData();
    const summaryData = this.summaryData?.rows ? this.summaryData : this.calculateSummaryData();

    return PlanningService.buildYearPlanExportData({
      tableData,
      summaryData,
      teams,
      planningYear: this.currentYear,
      scenario: this.scenario,
      applyConstraints: this.applyConstraints,
      teamFilter: this.selectedTeamFilter,
    });
  }

  _buildYearPlanExportFileName(format) {
    const scenarioName =
      this.scenario === 'funded'
        ? 'funded-hc'
        : this.scenario === 'team_bis'
          ? 'team-bis'
          : 'effective-bis';
    const constraintsName = this.applyConstraints ? 'net' : 'gross';
    const teamName = this._sanitizeExportToken(this.selectedTeamFilter || 'all');
    return `year-plan-${this.currentYear}-${scenarioName}-${constraintsName}-${teamName}.${format}`;
  }

  _sanitizeExportToken(value) {
    return (
      String(value || 'all')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'all'
    );
  }

  _downloadBlob(fileName, blob) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async handleLoadSnapshot() {
    if (!this.selectedSnapshotId) {
      notificationManager?.showToast('Select a snapshot to load.', 'warning');
      return;
    }

    const confirmed = await notificationManager.confirm(
      'Load this snapshot into the active plan? Current planning-year data will be replaced.',
      'Load Plan Snapshot',
      { confirmStyle: 'warning', confirmText: 'Load Snapshot' }
    );
    if (!confirmed) return;

    const systemData = SystemService.getCurrentSystem();
    const restoreResult = PlanningService.restorePlanSnapshotInPlace(
      systemData,
      this.selectedSnapshotId
    );

    if (!restoreResult.success) {
      notificationManager?.showToast(restoreResult.error || 'Could not load snapshot.', 'error');
      return;
    }

    WorkPackageService.ensureWorkPackagesForInitiatives(systemData, this.currentYear);
    SystemService.save();
    notificationManager?.showToast(
      `Loaded snapshot (${restoreResult.restoredInitiatives} initiatives restored).`,
      'success'
    );
    this.render();
  }

  runOptimizer() {
    if (aiAgentController?.runPrebuiltAgent) {
      aiAgentController.runPrebuiltAgent('optimizePlan');
    } else {
      notificationManager?.showToast('AI Controller not available.', 'error');
    }
  }

  // ==================== Event Handlers (migrated from yearPlanning.js) ====================

  /**
   * Handles changes to the Protected checkbox.
   * Uses InitiativeService.setProtected to mutate data.
   */
  _handleProtectedChange(event) {
    const checkbox = event.target;
    const initiativeId = checkbox.dataset.initiativeId;
    const isChecked = checkbox.checked;

    if (!initiativeId) {
      console.error('YearPlanningView: Missing initiative ID on protected checkbox');
      return;
    }

    const systemData = SystemService.getCurrentSystem();
    InitiativeService.setProtected(systemData, initiativeId, isChecked);
    this.render();
  }

  /**
   * Handles changes to team estimate inputs.
   * Uses InitiativeService and WorkPackageService to mutate data.
   */
  _handleEstimateChange(event) {
    const input = event.target;
    const initiativeId = input.dataset.initiativeId;
    const teamId = input.dataset.teamId;
    const newValue = parseFloat(input.value);

    if (!initiativeId || !teamId) {
      console.error('YearPlanningView: Missing initiative or team ID on estimate input');
      return;
    }

    const validatedValue = !isNaN(newValue) && newValue > 0 ? newValue : 0;
    const systemData = SystemService.getCurrentSystem();

    // Update initiative assignments via service
    InitiativeService.setTeamAssignmentSdeYears(systemData, initiativeId, teamId, validatedValue);

    // Sync to Work Packages to prevent reversion
    WorkPackageService.applyInitiativeTeamEstimateFromYearPlan(
      systemData,
      initiativeId,
      teamId,
      validatedValue
    );

    // Track for focus restoration
    this.lastEditedCell = { initiativeId, teamId };

    // Re-render and restore focus
    this.render();
    this._restoreFocus();
  }

  /**
   * Restores focus to the last edited cell after rerender.
   */
  _restoreFocus() {
    if (!this.lastEditedCell) return;

    const { initiativeId, teamId } = this.lastEditedCell;

    // Find the input using data attributes
    setTimeout(() => {
      const newInput = document.querySelector(
        `input[data-initiative-id="${initiativeId}"][data-team-id="${teamId}"]`
      );
      if (newInput) {
        newInput.focus();
      }
    }, 0);
  }

  /**
   * Handles the start of a drag operation.
   */
  _handleDragStart(event) {
    const initiativeId = event.target.dataset.initiativeId;
    const systemData = SystemService.getCurrentSystem();
    const initiative = systemData.yearlyInitiatives.find(
      (init) => init.initiativeId === initiativeId
    );

    // Do not allow dragging protected items
    if (!initiative || initiative.isProtected) {
      console.log(`YearPlanningView: Preventing drag of protected item ${initiativeId}`);
      event.preventDefault();
      return;
    }

    this.draggedInitiativeId = initiativeId;
    this.draggedRowElement = event.target;
    event.dataTransfer.setData('text/plain', initiativeId);
    event.dataTransfer.effectAllowed = 'move';

    // Add visual feedback (defer to allow drag image to render)
    setTimeout(() => {
      if (this.draggedRowElement) {
        this.draggedRowElement.classList.add('dragging');
      }
    }, 0);
  }

  /**
   * Handles dragging over a potential drop target.
   */
  _handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetRow = event.target.closest('tr');
    if (!targetRow || targetRow === this.draggedRowElement) return;

    targetRow.classList.add('drag-over');
  }

  /**
   * Handles leaving a potential drop target.
   */
  _handleDragLeave(event) {
    const targetRow = event.target.closest('tr');
    if (targetRow) {
      targetRow.classList.remove('drag-over');
    }
  }

  /**
   * Handles the drop operation.
   * Uses PlanningService.reorderInitiativesInPlace for the actual reorder.
   */
  _handleDrop(event) {
    event.preventDefault();
    const targetRow = event.target.closest('tr');
    if (targetRow) targetRow.classList.remove('drag-over');

    if (!targetRow || !this.draggedInitiativeId) {
      return;
    }

    const targetInitiativeId = targetRow.dataset.initiativeId;
    if (!targetInitiativeId || targetInitiativeId === this.draggedInitiativeId) {
      return;
    }

    // Determine insert position based on cursor Y vs target row midpoint
    const rect = targetRow.getBoundingClientRect();
    const dropY = event.clientY;
    const insertBefore = dropY < rect.top + rect.height / 2;

    const systemData = SystemService.getCurrentSystem();
    const success = PlanningService.reorderInitiativesInPlace(
      systemData,
      this.draggedInitiativeId,
      targetInitiativeId,
      insertBefore
    );

    if (!success) {
      // Service will have logged the constraint violation
      notificationManager?.showToast('Cannot reorder: Protected block constraint.', 'warning');
    }

    // Re-render regardless (drag state will be cleaned up in _handleDragEnd)
    this.render();
  }

  /**
   * Handles the end of a drag operation (dropped or cancelled).
   */
  _handleDragEnd(event) {
    // Remove dragging class
    if (this.draggedRowElement) {
      this.draggedRowElement.classList.remove('dragging');
    }

    // Clean up any lingering drag-over styles
    document.querySelectorAll('#planningTableBody tr.drag-over').forEach((row) => {
      row.classList.remove('drag-over');
    });

    // Reset drag state
    this.draggedInitiativeId = null;
    this.draggedRowElement = null;
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  _getDisplayTableData(tableData) {
    if (!Array.isArray(tableData)) return [];
    if (!this.selectedTeamFilter || this.selectedTeamFilter === 'all') {
      return tableData;
    }
    return tableData.filter((initiative) =>
      (initiative.assignments || []).some(
        (assignment) => assignment.teamId === this.selectedTeamFilter
      )
    );
  }

  _buildTeamCumulativeLookup(tableData, teams) {
    const cumulative = {};
    teams.forEach((team) => {
      cumulative[team.teamId] = 0;
    });

    const lookup = new Map();
    (tableData || []).forEach((initiative) => {
      if (!initiative.isBTL) {
        (initiative.assignments || []).forEach((assignment) => {
          if (Object.prototype.hasOwnProperty.call(cumulative, assignment.teamId)) {
            cumulative[assignment.teamId] += assignment.sdeYears || 0;
          }
        });
      }
      lookup.set(initiative.initiativeId, { ...cumulative });
    });

    return lookup;
  }

  // ==================== AI Integration ====================

  /**
   * Get context for AI chat panel
   */
  getContext() {
    return {
      viewName: 'Year Planning',
      currentYear: this.currentYear,
      scenario: this.scenario,
      applyConstraints: this.applyConstraints,
      atlInitiatives: PlanningService.getATLInitiatives(this.tableData || []),
      btlInitiatives: PlanningService.getBTLInitiatives(this.tableData || []),
      totalCapacity: PlanningService.getTotalCapacity(
        SystemService.getCurrentSystem()?.calculatedCapacityMetrics,
        this.scenario,
        this.applyConstraints
      ),
      summaryTotals: this.summaryData?.totals || {},
    };
  }
}

// No legacy global needed - NavigationManager creates and manages the instance
