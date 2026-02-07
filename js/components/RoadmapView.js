/**
 * RoadmapView - Roadmap & Backlog View Orchestrator
 * Manages the sub-views: Backlog (List), Quarterly Roadmap, and 3-Year Plan.
 */
class RoadmapView {
  constructor() {
    this.currentView = 'backlog'; // default
    this.pillNav = null;
    this.activeComponent = null;
    this.initiativeModal = null;

    this.viewConfigs = [
      { id: 'backlog', label: 'Backlog List', icon: 'fas fa-list' },
      { id: 'quarterly', label: 'Quarterly Roadmap', icon: 'fas fa-calendar-alt' },
      { id: '3yp', label: '3-Year Plan', icon: 'fas fa-road' },
    ];
  }

  render(container) {
    if (!container) container = document.getElementById('roadmapView');
    if (!container) {
      console.error('Roadmap container not found');
      return;
    }

    // 1. Set Workspace Metadata
    // 1. Set Workspace Metadata
    workspaceComponent.setPageMetadata({
      title: 'Roadmap & Backlog',
      breadcrumbs: ['Product', 'Roadmap'],
      actions: [], // Actions moved to toolbar body
    });

    // 2. Setup Container
    this._clearElement(container);
    const viewContainer = document.createElement('div');
    viewContainer.id = 'roadmapViewContainer';
    viewContainer.className = 'roadmap-view-container';
    container.appendChild(viewContainer);

    // 3. Setup Pill Navigation and Toolbar
    this.setupToolbar();

    // 4. Render Default View
    this.switchView(this.currentView);

    this._ensureInitiativeModal();
  }

  setupToolbar() {
    const toolbarContainer = document.createElement('div');
    toolbarContainer.className = 'roadmap-main-toolbar';

    // Row 1: Pills
    const pillsRow = document.createElement('div');
    pillsRow.className = 'roadmap-pills-row';
    this.pillNav = new PillNavigationComponent({
      items: this.viewConfigs,
      onSwitch: (viewId) => this.switchView(viewId),
    });
    pillsRow.appendChild(this.pillNav.render());
    toolbarContainer.appendChild(pillsRow);

    // Row 2: Actions
    const actionsRow = document.createElement('div');
    actionsRow.className = 'roadmap-actions-row';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-sm';
    const addIcon = document.createElement('i');
    addIcon.className = 'fas fa-plus';
    addBtn.appendChild(addIcon);
    addBtn.appendChild(document.createTextNode(' Add Initiative'));
    addBtn.onclick = () => this.openModalForAdd();
    actionsRow.appendChild(addBtn);

    const themesBtn = document.createElement('button');
    themesBtn.className = 'btn btn-secondary btn-sm';
    const themesIcon = document.createElement('i');
    themesIcon.className = 'fas fa-tags';
    themesBtn.appendChild(themesIcon);
    themesBtn.appendChild(document.createTextNode(' Manage Themes'));
    themesBtn.onclick = () => {
      navigationManager.navigateTo('managementView', { tab: 'themes' });
    };
    actionsRow.appendChild(themesBtn);

    const initiativesBtn = document.createElement('button');
    initiativesBtn.className = 'btn btn-secondary btn-sm';
    const initiativesIcon = document.createElement('i');
    initiativesIcon.className = 'fas fa-list-ul';
    initiativesBtn.appendChild(initiativesIcon);
    initiativesBtn.appendChild(document.createTextNode(' Manage Initiatives'));
    initiativesBtn.onclick = () => {
      navigationManager.navigateTo('managementView', { tab: 'initiatives' });
    };
    actionsRow.appendChild(initiativesBtn);

    const goalsBtn = document.createElement('button');
    goalsBtn.className = 'btn btn-secondary btn-sm';
    const goalsIcon = document.createElement('i');
    goalsIcon.className = 'fas fa-bullseye';
    goalsBtn.appendChild(goalsIcon);
    goalsBtn.appendChild(document.createTextNode(' Manage Goals'));
    goalsBtn.onclick = () => {
      navigationManager.navigateTo('managementView', { tab: 'goals' });
    };
    actionsRow.appendChild(goalsBtn);

    toolbarContainer.appendChild(actionsRow);

    // Row 3: View-Specific Filters
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'roadmapViewControls';
    controlsContainer.className = 'roadmap-view-controls';
    toolbarContainer.appendChild(controlsContainer);

    workspaceComponent.setToolbar(toolbarContainer);
  }

  switchView(viewId) {
    this.currentView = viewId;
    if (this.pillNav) this.pillNav.setActive(viewId);

    const container = document.getElementById('roadmapViewContainer');
    if (!container) return;

    // Clear container
    this._clearElement(container);
    const controlsContainer = document.getElementById('roadmapViewControls');
    if (controlsContainer) this._clearElement(controlsContainer);

    // Instantiate and Render Component
    if (viewId === 'backlog') {
      this.activeComponent = new BacklogComponent('roadmapViewContainer');
    } else if (viewId === 'quarterly') {
      this.activeComponent = new RoadmapComponent('roadmapViewContainer', 'quarterly');
    } else if (viewId === '3yp') {
      this.activeComponent = new RoadmapComponent('roadmapViewContainer', '3yp');
    }

    if (this.activeComponent) {
      this.activeComponent.render();

      // Inject component-specific controls into toolbar
      if (this.activeComponent.generateToolbarControls && controlsContainer) {
        controlsContainer.appendChild(this.activeComponent.generateToolbarControls());
      }
    }
  }

  // --- Modal & Data Handling (View-owned) ---

  _ensureInitiativeModal() {
    if (!this.initiativeModal) {
      this.initiativeModal = new RoadmapInitiativeModal();
    }
  }

  openModalForAdd() {
    this._ensureInitiativeModal();
    this.initiativeModal.onSave = this.handleSave.bind(this);
    this.initiativeModal.open();
  }

  openModalForEdit(initiativeId) {
    this._ensureInitiativeModal();
    this.initiativeModal.onSave = this.handleSave.bind(this);
    this.initiativeModal.open(initiativeId);
  }

  handleSave(initiativeData, isEdit) {
    const system = SystemService.getCurrentSystem();

    // Ensure planningYear is preserved or derived
    if (!initiativeData.attributes) initiativeData.attributes = {};
    if (!initiativeData.attributes.planningYear && initiativeData.targetDueDate) {
      const d = new Date(initiativeData.targetDueDate);
      if (!isNaN(d.getTime())) initiativeData.attributes.planningYear = d.getFullYear();
    }

    if (isEdit) {
      // Use Service for Update
      InitiativeService.updateInitiative(system, initiativeData.initiativeId, initiativeData);
      notificationManager.showToast(`Updated initiative "${initiativeData.title}"`, 'success');
    } else {
      // Use Service for Add
      InitiativeService.addInitiative(system, initiativeData);
      notificationManager.showToast(`Added initiative "${initiativeData.title}"`, 'success');
    }

    SystemService.save();
    this.refreshActiveView();
  }

  async handleDelete(initiativeId) {
    const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(
      (i) => i.initiativeId === initiativeId
    );
    const title = initiative ? initiative.title : initiativeId;

    if (
      await notificationManager.confirm(
        `Are you sure you want to delete initiative "${title}"?`,
        'Delete Initiative',
        { confirmStyle: 'danger' }
      )
    ) {
      const success = InitiativeService.deleteInitiative(
        SystemService.getCurrentSystem(),
        initiativeId
      );
      if (success) {
        SystemService.save();
        this.refreshActiveView();
        notificationManager.showToast('Initiative deleted', 'success');
      } else {
        notificationManager.showToast('Failed to delete initiative', 'error');
      }
    }
  }

  refreshActiveView() {
    if (this.activeComponent && this.activeComponent.render) {
      // Re-render table/grid to reflect data changes
      // For Backlog, renderTable is enough. For Roadmap, renderGrid.
      // We can just call render() again or specific refresh methods.
      if (this.activeComponent.renderTable) this.activeComponent.renderTable();
      else if (this.activeComponent.renderGrid) this.activeComponent.renderGrid();
      else this.activeComponent.render();
    }
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const initiatives = SystemService.getCurrentSystem()?.yearlyInitiatives || [];
    const goals = SystemService.getCurrentSystem()?.goals || [];
    const themes = SystemService.getCurrentSystem()?.definedThemes || [];

    return {
      viewTitle: 'Roadmap',
      currentView: this.currentView, // 'backlog', 'quarterly', or '3yearplan'
      initiatives: initiatives.map((i) => ({
        id: i.initiativeId,
        title: i.title,
        status: i.status,
        planningYear: i.attributes?.planningYear,
      })),
      initiativeCount: initiatives.length,
      goalCount: goals.length,
      themeCount: themes.length,
      quarterlyRoadmap: initiatives.filter(
        (i) => i.status === 'Committed' || i.status === 'In Progress'
      ).length,
    };
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}
