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
    this.contentContainer = null;
    this.initiativeSearchQuery = '';

    // Bind events
    this._boundContainerClick = this.handleContainerClick.bind(this);
    this._eventsBound = false;
  }

  render(container, params = {}) {
    if (container) {
      this.container = container;
    }

    const requestedTab = params?.tab;
    if (requestedTab && ['themes', 'initiatives', 'goals'].includes(requestedTab)) {
      this.activeTab = requestedTab;
    }

    if (!this.container) return;

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
    this.activeTab = tabId;
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
