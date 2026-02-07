/**
 * ManagementView
 * Handles product management settings like Themes, Initiatives, and Goals.
 * Refactored to use Workspace Canvas and PillNavigationComponent.
 * Updated to match System Edit "immersed" list style using ThemeEditComponent.
 */
class ManagementView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeTab = 'themes'; // Default tab
    this.pillNav = null;
    this.themeEditComponent = null;
    this.initiativeEditComponent = null;
    this.goalEditComponent = null;
    this.goalInspectionTableWidget = null;
    this.contentContainer = null;
    this.initiativeSearchQuery = '';
    this.goalInspectionFilters = {
      ownerId: 'all',
      ownerStatus: 'all',
      staleOnly: false,
      mismatchOnly: false,
      planningYear: 'all',
    };

    // Bind events
    this._boundContainerClick = this.handleContainerClick.bind(this);
    this._eventsBound = false;
  }

  render(container, params = {}) {
    if (container) {
      this.container = container;
    }

    const requestedTab = params?.tab;
    if (requestedTab && ['themes', 'initiatives', 'goals', 'inspections'].includes(requestedTab)) {
      this.activeTab = requestedTab;
    }

    if (!this.container) return;
    if (this.goalInspectionTableWidget) {
      this.goalInspectionTableWidget.destroy();
      this.goalInspectionTableWidget = null;
    }

    // 1. Set Workspace Metadata
    if (workspaceComponent) {
      workspaceComponent.setToolbar(null);
      workspaceComponent.setPageMetadata({
        title: 'Product Management',
        breadcrumbs: ['Product', 'Management'],
        actions: [],
      });
    }

    // 2. Set Workspace Toolbar (Pill Navigation)
    this.renderToolbar();

    // 3. Render Content Container
    this._clearElement(this.container);
    const viewContainer = document.createElement('div');
    viewContainer.className = 'management-view-container';

    const layout = document.createElement('div');
    layout.className = 'management-layout';

    this.contentContainer = document.createElement('div');
    this.contentContainer.id = 'managementContent';
    this.contentContainer.className = 'management-content';

    layout.appendChild(this.contentContainer);
    viewContainer.appendChild(layout);
    this.container.appendChild(viewContainer);

    this._renderActiveTabContent();

    // Bind events
    this.bindEvents();

    // Post-render actions
    this.postRender();
  }

  renderToolbar() {
    if (!workspaceComponent) return;

    const items = [
      { id: 'themes', label: 'Themes', icon: 'fas fa-swatchbook' },
      { id: 'initiatives', label: 'Initiatives', icon: 'fas fa-list-ul' },
      { id: 'goals', label: 'Goals', icon: 'fas fa-bullseye' },
      { id: 'inspections', label: 'Inspections', icon: 'fas fa-clipboard-check' },
    ];

    // Create or update PillNavigation
    if (!this.pillNav) {
      this.pillNav = new PillNavigationComponent({
        items: items,
        activeId: this.activeTab,
        onSwitch: (id) => this.switchTab(id),
      });
    } else {
      this.pillNav.setActive(this.activeTab);
    }

    workspaceComponent.setToolbar(this.pillNav.render());
  }

  switchTab(tabId) {
    const previousTab = this.activeTab;
    this.activeTab = tabId;
    if (
      previousTab === 'inspections' &&
      tabId !== 'inspections' &&
      this.goalInspectionTableWidget
    ) {
      this.goalInspectionTableWidget.destroy();
      this.goalInspectionTableWidget = null;
    }
    this._renderActiveTabContent();
    this.postRender();
  }

  postRender() {
    if (this.activeTab === 'themes') {
      this.renderThemesList();
    } else if (this.activeTab === 'initiatives') {
      this.populateInitiativesList();
    } else if (this.activeTab === 'goals') {
      this.populateGoalsList();
    } else if (this.activeTab === 'inspections') {
      this.populateGoalInspections();
    }
  }

  bindEvents() {
    if (this._eventsBound) return;
    this.container.addEventListener('click', this._boundContainerClick);
    this._eventsBound = true;
  }

  handleContainerClick(event) {
    // 1. Handle Button Clicks
    const button = event.target.closest('button[data-action]');
    if (button) {
      this.handleButtonClick(button);
      return;
    }
  }

  handleButtonClick(button) {
    const action = button.dataset.action;
    const initiativeId = button.dataset.initiativeId;

    if (action === 'add-theme') {
      this.addNewTheme();
    } else if (action === 'add-initiative') {
      this.openAddInitiativeModal();
    } else if (action === 'edit-initiative' && initiativeId) {
      this.editInitiative(initiativeId);
    } else if (action === 'delete-initiative' && initiativeId) {
      this.deleteInitiative(initiativeId);
    } else if (action === 'add-goal') {
      this.addNewGoal();
    }
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case 'themes':
        return this.renderThemesTab();
      case 'initiatives':
        return this.renderInitiativesTab();
      case 'goals':
        return this.renderGoalsTab();
      case 'inspections':
        return this.renderInspectionsTab();
      default:
        return this.renderThemesTab();
    }
  }

  // --- THEMES TAB ---
  renderThemesTab() {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'management-section-header';
    const heading = document.createElement('h3');
    heading.textContent = 'Themes';
    header.appendChild(heading);
    fragment.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.id = 'themesListContainer';
    fragment.appendChild(listContainer);

    const actions = document.createElement('div');
    actions.className = 'management-list-actions';
    actions.appendChild(this._createActionButton('add-theme', 'Add Theme', 'fas fa-plus'));
    fragment.appendChild(actions);

    return fragment;
  }

  renderThemesList() {
    if (!SystemService.getCurrentSystem()) return;

    // Initialize ThemeEditComponent
    if (!this.themeEditComponent) {
      this.themeEditComponent = new ThemeEditComponent(
        'themesListContainer',
        SystemService.getCurrentSystem()
      );
    } else {
      this.themeEditComponent.systemData = SystemService.getCurrentSystem();
      this.themeEditComponent.containerId = 'themesListContainer'; // Ensure container ID is set if re-using
    }

    this.themeEditComponent.render();
  }

  addNewTheme() {
    if (!SystemService.getCurrentSystem().definedThemes) {
      SystemService.getCurrentSystem().definedThemes = [];
    }

    SystemService.getCurrentSystem().definedThemes.push({
      name: 'New Theme',
      description: '',
      themeId: 'theme_' + Date.now(),
    });

    // Refresh Component
    if (this.themeEditComponent) {
      this.themeEditComponent.expandedIndex =
        SystemService.getCurrentSystem().definedThemes.length - 1; // Expand new
      this.themeEditComponent.render();
    }
  }

  // --- INITIATIVES TAB ---
  renderInitiativesTab() {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'management-section-header';
    const heading = document.createElement('h3');
    heading.textContent = 'Initiatives Overview';
    header.appendChild(heading);
    fragment.appendChild(header);

    const searchRow = document.createElement('div');
    searchRow.className = 'management-initiatives-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'management-input management-initiatives-search__input';
    searchInput.placeholder = 'Search by title, team, theme, status, or ID...';
    searchInput.value = this.initiativeSearchQuery;
    searchInput.addEventListener('input', (event) => {
      this.initiativeSearchQuery = event.target.value || '';
      if (this.initiativeEditComponent) {
        this.initiativeEditComponent.setSearchQuery(this.initiativeSearchQuery);
      }
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-secondary btn-sm';
    clearBtn.textContent = 'Reset';
    clearBtn.addEventListener('click', () => {
      this.initiativeSearchQuery = '';
      searchInput.value = '';
      if (this.initiativeEditComponent) {
        this.initiativeEditComponent.setSearchQuery('');
      }
    });

    searchRow.appendChild(searchInput);
    searchRow.appendChild(clearBtn);
    fragment.appendChild(searchRow);

    const listContainer = document.createElement('div');
    listContainer.id = 'initiativesListContainer';
    fragment.appendChild(listContainer);

    const actions = document.createElement('div');
    actions.className = 'management-list-actions';
    actions.appendChild(
      this._createActionButton('add-initiative', 'Add Initiative', 'fas fa-plus')
    );
    fragment.appendChild(actions);

    return fragment;
  }

  populateInitiativesList() {
    if (!SystemService.getCurrentSystem()) return;

    // Initialize InitiativeEditComponent
    if (!this.initiativeEditComponent) {
      this.initiativeEditComponent = new InitiativeEditComponent(
        'initiativesListContainer',
        SystemService.getCurrentSystem()
      );
    } else {
      this.initiativeEditComponent.systemData = SystemService.getCurrentSystem();
      this.initiativeEditComponent.containerId = 'initiativesListContainer';
    }
    this.initiativeEditComponent.searchQuery = String(this.initiativeSearchQuery || '')
      .trim()
      .toLowerCase();
    this.initiativeEditComponent.render();
  }

  openAddInitiativeModal() {
    // Use the component's draft mode for adding new initiatives
    if (this.initiativeEditComponent) {
      this.initiativeEditComponent.startNewInitiative();
    } else {
      // Fallback if component not ready (shouldn't happen if rendered)
      console.error('InitiativeEditComponent not initialized');
    }
  }

  // Legacy methods removed as they are now handled by the component
  editInitiative(initiativeId) {}
  handleSaveInitiative(data, isEdit) {}
  async deleteInitiative(initiativeId) {}

  // --- GOALS TAB ---
  renderGoalsTab() {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'management-section-header';
    const heading = document.createElement('h3');
    heading.textContent = 'Strategic Goals';
    header.appendChild(heading);
    fragment.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.id = 'goalsListContainer';
    fragment.appendChild(listContainer);

    const actions = document.createElement('div');
    actions.className = 'management-list-actions';
    actions.appendChild(this._createActionButton('add-goal', 'Add Goal', 'fas fa-plus'));
    fragment.appendChild(actions);

    return fragment;
  }

  populateGoalsList() {
    if (!SystemService.getCurrentSystem()) return;

    // Initialize GoalEditComponent
    if (!this.goalEditComponent) {
      this.goalEditComponent = new GoalEditComponent(
        'goalsListContainer',
        SystemService.getCurrentSystem()
      );
    } else {
      this.goalEditComponent.systemData = SystemService.getCurrentSystem();
      this.goalEditComponent.containerId = 'goalsListContainer';
    }
    this.goalEditComponent.render();
  }

  addNewGoal() {
    if (this.goalEditComponent) {
      this.goalEditComponent.startNewGoal();
    } else {
      console.error('GoalEditComponent not initialized');
    }
  }

  // --- INSPECTIONS TAB ---
  renderInspectionsTab() {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'management-section-header';
    const heading = document.createElement('h3');
    heading.textContent = 'Goal Inspections & Reporting';
    header.appendChild(heading);
    fragment.appendChild(header);

    const summaryContainer = document.createElement('div');
    summaryContainer.id = 'goalInspectionSummary';
    summaryContainer.className = 'goal-inspection-summary-grid';
    fragment.appendChild(summaryContainer);

    const filtersRow = document.createElement('div');
    filtersRow.className = 'goal-inspection-filters';

    const ownerWrap = document.createElement('div');
    ownerWrap.className = 'goal-inspection-filters__item';
    const ownerLabel = document.createElement('label');
    ownerLabel.className = 'inline-edit-label';
    ownerLabel.textContent = 'Owner';
    ownerWrap.appendChild(ownerLabel);
    const ownerSelectHost = document.createElement('div');
    ownerSelectHost.id = 'goalInspectionOwnerFilter';
    ownerWrap.appendChild(ownerSelectHost);
    filtersRow.appendChild(ownerWrap);

    const statusWrap = document.createElement('div');
    statusWrap.className = 'goal-inspection-filters__item';
    const statusLabel = document.createElement('label');
    statusLabel.className = 'inline-edit-label';
    statusLabel.textContent = 'Owner Status';
    statusWrap.appendChild(statusLabel);
    const statusSelectHost = document.createElement('div');
    statusSelectHost.id = 'goalInspectionStatusFilter';
    statusWrap.appendChild(statusSelectHost);
    filtersRow.appendChild(statusWrap);

    const staleWrap = document.createElement('label');
    staleWrap.className = 'goal-inspection-filters__toggle';
    const staleCheckbox = document.createElement('input');
    staleCheckbox.type = 'checkbox';
    staleCheckbox.checked = !!this.goalInspectionFilters.staleOnly;
    staleCheckbox.addEventListener('change', (event) => {
      this.goalInspectionFilters.staleOnly = event.target.checked;
      this.populateGoalInspections();
    });
    staleWrap.appendChild(staleCheckbox);
    staleWrap.appendChild(document.createTextNode(' Stale only'));
    filtersRow.appendChild(staleWrap);

    const mismatchWrap = document.createElement('label');
    mismatchWrap.className = 'goal-inspection-filters__toggle';
    const mismatchCheckbox = document.createElement('input');
    mismatchCheckbox.type = 'checkbox';
    mismatchCheckbox.checked = !!this.goalInspectionFilters.mismatchOnly;
    mismatchCheckbox.addEventListener('change', (event) => {
      this.goalInspectionFilters.mismatchOnly = event.target.checked;
      this.populateGoalInspections();
    });
    mismatchWrap.appendChild(mismatchCheckbox);
    mismatchWrap.appendChild(document.createTextNode(' Mismatch only'));
    filtersRow.appendChild(mismatchWrap);

    fragment.appendChild(filtersRow);

    const tableContainer = document.createElement('div');
    tableContainer.id = 'goalInspectionTableContainer';
    tableContainer.className = 'goal-inspection-table';
    fragment.appendChild(tableContainer);

    return fragment;
  }

  populateGoalInspections() {
    const systemData = SystemService.getCurrentSystem();
    if (!systemData) return;

    const ownerMap = new Map();
    (systemData.goals || []).forEach((goal) => {
      if (goal?.owner?.id) {
        ownerMap.set(goal.owner.id, goal.owner.name || goal.owner.id);
      }
      const inspectionOwnerId = goal?.attributes?.goalInspection?.ownerId;
      if (inspectionOwnerId && !ownerMap.has(inspectionOwnerId)) {
        ownerMap.set(inspectionOwnerId, inspectionOwnerId);
      }
    });

    const ownerOptions = [{ value: 'all', text: 'All Owners' }];
    ownerMap.forEach((name, id) => {
      ownerOptions.push({ value: id, text: name });
    });

    const inspectionStatusOptions = [
      { value: 'all', text: 'All Statuses' },
      { value: GoalService.INSPECTION_STATUS.ON_TRACK, text: 'On Track' },
      { value: GoalService.INSPECTION_STATUS.SLIPPING, text: 'Slipping' },
      { value: GoalService.INSPECTION_STATUS.AT_RISK, text: 'At Risk' },
      { value: GoalService.INSPECTION_STATUS.LATE, text: 'Late' },
      { value: GoalService.INSPECTION_STATUS.BLOCKED, text: 'Blocked' },
      { value: GoalService.INSPECTION_STATUS.ACHIEVED, text: 'Achieved' },
    ];

    const ownerSelectHost = document.getElementById('goalInspectionOwnerFilter');
    if (ownerSelectHost) {
      while (ownerSelectHost.firstChild) ownerSelectHost.removeChild(ownerSelectHost.firstChild);
      const ownerSelect = new ThemedSelect({
        options: ownerOptions,
        value: this.goalInspectionFilters.ownerId || 'all',
        id: 'goal-inspection-owner-select',
        onChange: (value) => {
          this.goalInspectionFilters.ownerId = value || 'all';
          this.populateGoalInspections();
        },
      });
      ownerSelectHost.appendChild(ownerSelect.render());
    }

    const statusSelectHost = document.getElementById('goalInspectionStatusFilter');
    if (statusSelectHost) {
      while (statusSelectHost.firstChild) statusSelectHost.removeChild(statusSelectHost.firstChild);
      const statusSelect = new ThemedSelect({
        options: inspectionStatusOptions,
        value: this.goalInspectionFilters.ownerStatus || 'all',
        id: 'goal-inspection-status-select',
        onChange: (value) => {
          this.goalInspectionFilters.ownerStatus = value || 'all';
          this.populateGoalInspections();
        },
      });
      statusSelectHost.appendChild(statusSelect.render());
    }

    const rows = GoalService.getGoalInspectionReportRows(systemData, this.goalInspectionFilters);
    const summary = GoalService.getGoalInspectionSummary(systemData, this.goalInspectionFilters);
    this.renderGoalInspectionSummary(summary);

    const fileDate = new Date().toISOString().slice(0, 10);
    const tableOptions = {
      data: rows,
      layout: 'fitDataStretch',
      pagination: 'local',
      paginationSize: 15,
      uniqueIdField: 'goalId',
      showColumnToggle: true,
      showExportMenu: true,
      exportCsvFileName: `goal-inspections-${fileDate}.csv`,
      exportJsonFileName: `goal-inspections-${fileDate}.json`,
      exportXlsxFileName: `goal-inspections-${fileDate}.xlsx`,
      exportSheetName: 'Goal Inspections',
      columns: [
        { title: 'Goal', field: 'goalName', minWidth: 180 },
        { title: 'Owner', field: 'ownerName', minWidth: 130 },
        { title: 'Owner Status', field: 'ownerStatusLabel', minWidth: 120 },
        { title: 'Computed', field: 'computedStatusLabel', minWidth: 160 },
        { title: 'Mismatch', field: 'mismatch', hozAlign: 'center', width: 95 },
        { title: 'Stale', field: 'stale', hozAlign: 'center', width: 85 },
        { title: 'Days Since', field: 'daysSinceCheckIn', hozAlign: 'right', width: 105 },
        { title: 'Week Ending', field: 'weekEnding', minWidth: 115 },
        { title: 'Last Update', field: 'lastCheckInAt', minWidth: 115 },
        { title: 'Next Due', field: 'nextCheckInDueAt', minWidth: 110 },
        { title: 'Confidence', field: 'confidence', hozAlign: 'right', width: 100 },
        { title: 'PTG Date', field: 'ptgTargetDate', minWidth: 100 },
        { title: 'Comment', field: 'comment', minWidth: 220 },
        { title: 'Path to Green', field: 'ptg', minWidth: 220 },
        { title: 'Blockers', field: 'blockers', minWidth: 220 },
        { title: 'Asks', field: 'asks', minWidth: 180 },
      ],
    };

    if (!this.goalInspectionTableWidget) {
      this.goalInspectionTableWidget = new EnhancedTableWidget(
        'goalInspectionTableContainer',
        tableOptions
      );
    } else {
      this.goalInspectionTableWidget.setData(rows);
    }
  }

  renderGoalInspectionSummary(summary) {
    const container = document.getElementById('goalInspectionSummary');
    if (!container) return;

    this._clearElement(container);

    const metrics = [
      { label: 'Goals In Scope', value: summary.totalGoals },
      { label: 'Updated This Week', value: summary.updatedThisWeek },
      { label: 'Stale Goals', value: summary.staleCount },
      { label: 'At Risk / Late', value: summary.atRiskOrLateCount },
      { label: 'Health Mismatches', value: summary.mismatchCount },
      {
        label: 'Weekly Coverage',
        value: `${summary.updateCoveragePct.toFixed(0)}%`,
      },
    ];

    metrics.forEach((metric) => {
      const card = document.createElement('div');
      card.className = 'goal-inspection-summary-card';

      const value = document.createElement('div');
      value.className = 'goal-inspection-summary-card__value';
      value.textContent = String(metric.value);
      card.appendChild(value);

      const label = document.createElement('div');
      label.className = 'goal-inspection-summary-card__label';
      label.textContent = metric.label;
      card.appendChild(label);

      container.appendChild(card);
    });

    const blockersCard = document.createElement('div');
    blockersCard.className = 'goal-inspection-summary-card goal-inspection-summary-card--wide';
    const blockersValue = document.createElement('div');
    blockersValue.className = 'goal-inspection-summary-card__label';
    blockersValue.textContent =
      summary.topBlockers.length > 0
        ? summary.topBlockers.map((entry) => `${entry.text} (${entry.count})`).join(' | ')
        : 'No blockers captured.';
    blockersCard.appendChild(blockersValue);
    container.appendChild(blockersCard);
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const themes = SystemService.getCurrentSystem()?.definedThemes || [];
    const initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
    const goals = SystemService.getCurrentSystem()?.goals || [];

    return {
      viewTitle: 'Product Management',
      currentTab: this.activeTab,
      themes: themes.map((t) => ({ themeId: t.themeId, name: t.name })),
      themeCount: themes.length,
      initiativeCount: initiatives.length,
      goalCount: goals.length,
      inspectionSummary:
        this.activeTab === 'inspections'
          ? GoalService.getGoalInspectionSummary(
              SystemService.getCurrentSystem(),
              this.goalInspectionFilters
            )
          : null,
      initiatives: initiatives.map((i) => ({
        id: i.initiativeId,
        title: i.title,
        themeId: i.attributes?.themeId,
        status: i.status,
      })),
      goals: goals.map((g) => ({
        id: g.goalId,
        name: g.name,
        status: g.status,
      })),
    };
  }

  _renderActiveTabContent() {
    if (!this.contentContainer) {
      this.contentContainer = document.getElementById('managementContent');
    }
    if (!this.contentContainer) return;
    this._clearElement(this.contentContainer);
    const content = this.renderActiveTab();
    if (content) {
      this.contentContainer.appendChild(content);
    }
  }

  _createActionButton(action, label, iconClass) {
    const button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.dataset.action = action;

    if (iconClass) {
      const icon = document.createElement('i');
      icon.className = iconClass;
      button.appendChild(icon);
      button.appendChild(document.createTextNode(' '));
    }
    button.appendChild(document.createTextNode(label));
    return button;
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}
