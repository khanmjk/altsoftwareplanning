/**
 * SystemsView Component
 * Displays user systems and sample systems in a grid layout
 * Uses template loading, event delegation, and service layer access
 */
class SystemsView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._boundClickHandler = this.handleClick.bind(this);
    this._eventsBound = false;
  }

  /**
   * Render the systems view
   * @returns {Promise<void>}
   */
  async render() {
    if (!this.container) {
      console.error('SystemsView: Container not found');
      return;
    }

    workspaceComponent.setPageMetadata({
      title: 'My Systems',
      breadcrumbs: ['My Systems'],
      actions: [],
    });
    workspaceComponent.setToolbar(null);

    try {
      this._clearElement(this.container);
      this.container.appendChild(this._buildViewShell());

      // Update UI based on AI settings
      this.updateAIButton();

      // Bind events
      this.bindEvents();

      // Populate systems data
      this.populateSystems();
    } catch (error) {
      console.error('SystemsView: Error rendering view', error);
      this._renderError('Error loading systems view. Please refresh the page.');
    }
  }

  _clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  _buildViewShell() {
    const wrapper = document.createElement('div');
    wrapper.className = 'systems-view';

    const header = document.createElement('div');
    header.className = 'systems-view__header';

    const title = document.createElement('h1');
    title.className = 'systems-view__title';
    const titleIcon = document.createElement('i');
    titleIcon.className = 'fas fa-server systems-view__icon';
    title.appendChild(titleIcon);
    title.appendChild(document.createTextNode(' My Systems'));

    const actions = document.createElement('div');
    actions.className = 'systems-view__actions';

    const createWithAiBtn = document.createElement('button');
    createWithAiBtn.id = 'createWithAiBtn';
    createWithAiBtn.className = 'btn btn--primary btn--gradient';
    createWithAiBtn.setAttribute('data-action', 'create-ai');
    const createWithAiIcon = document.createElement('i');
    createWithAiIcon.className = 'fas fa-magic';
    createWithAiBtn.appendChild(createWithAiIcon);
    createWithAiBtn.appendChild(document.createTextNode(' Create with AI'));

    const createSystemBtn = document.createElement('button');
    createSystemBtn.id = 'createSystemBtn';
    createSystemBtn.className = 'btn btn--primary';
    createSystemBtn.setAttribute('data-action', 'create-new');
    const createSystemIcon = document.createElement('i');
    createSystemIcon.className = 'fas fa-plus';
    createSystemBtn.appendChild(createSystemIcon);
    createSystemBtn.appendChild(document.createTextNode(' Create New System'));

    const browseBlueprintsBtn = document.createElement('button');
    browseBlueprintsBtn.id = 'browseBlueprintsBtn';
    browseBlueprintsBtn.className = 'btn btn--secondary';
    browseBlueprintsBtn.setAttribute('data-action', 'open-blueprints');
    const browseBlueprintsIcon = document.createElement('i');
    browseBlueprintsIcon.className = 'fas fa-store';
    browseBlueprintsBtn.appendChild(browseBlueprintsIcon);
    browseBlueprintsBtn.appendChild(document.createTextNode(' Community Blueprints'));

    actions.appendChild(createWithAiBtn);
    actions.appendChild(createSystemBtn);
    actions.appendChild(browseBlueprintsBtn);

    header.appendChild(title);
    header.appendChild(actions);

    const grid = document.createElement('div');
    grid.id = 'systemsGrid';
    grid.className = 'systems-grid';
    const loading = document.createElement('p');
    loading.textContent = 'Loading systems...';
    grid.appendChild(loading);

    wrapper.appendChild(header);
    wrapper.appendChild(grid);

    return wrapper;
  }

  _renderError(message) {
    this._clearElement(this.container);
    const error = document.createElement('div');
    error.className = 'systems-view__error';
    error.textContent = message;
    this.container.appendChild(error);
  }

  /**
   * Update AI button state based on settings
   */
  updateAIButton() {
    const aiButton = document.getElementById('createWithAiBtn');
    if (!aiButton) return;

    const aiEnabled = SettingsService.get()?.ai?.isEnabled || false;

    if (!aiEnabled) {
      aiButton.classList.add('disabled');
      aiButton.disabled = true;
      aiButton.title = 'Enable AI in Settings to use this feature';
    } else {
      aiButton.classList.remove('disabled');
      aiButton.disabled = false;
      aiButton.title = 'Create a new system using AI';
    }
  }

  /**
   * Bind event listeners using event delegation
   */
  bindEvents() {
    if (this._eventsBound) return;
    // Event delegation for all clicks within the container
    this.container.addEventListener('click', this._boundClickHandler);
    this._eventsBound = true;
  }

  /**
   * Handle all click events via delegation
   * @param {Event} event - The click event
   */
  handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const systemId = target.dataset.systemId;

    switch (action) {
      case 'create-ai':
        this.handleCreateWithAi();
        break;
      case 'create-new':
        this.handleCreateNew();
        break;
      case 'open-blueprints':
        this.handleOpenBlueprints();
        break;
      case 'load':
        if (systemId) this.loadSystem(systemId);
        break;
      case 'delete':
        if (systemId) this.deleteSystem(systemId);
        break;
      case 'publish-system':
        if (systemId) this.handlePublishSystem(systemId);
        break;
      default:
        console.warn(`SystemsView: Unknown action "${action}"`);
    }
  }

  /**
   * Handle Create with AI button click
   */
  handleCreateWithAi() {
    const aiEnabled = SettingsService.get()?.ai?.isEnabled || false;

    if (!aiEnabled) {
      notificationManager.showToast('Please select a system to load.', 'warning');
      return;
    }

    AIGenProgressOverlayView.getInstance().startGenerationFlow();
  }

  /**
   * Handle Create New System button click
   */
  handleCreateNew() {
    SystemService.createAndActivate();
  }

  /**
   * Open Community Blueprints view.
   */
  handleOpenBlueprints() {
    navigationManager.navigateTo('communityBlueprintsView');
  }

  /**
   * Open publish flow in Community Blueprints for a given system.
   * @param {string} systemId
   */
  handlePublishSystem(systemId) {
    navigationManager.navigateTo('communityBlueprintsView', { publishSystemId: systemId });
  }

  /**
   * Populate the systems grid with data
   */
  populateSystems() {
    const grid = document.getElementById('systemsGrid');
    if (!grid) return;

    this._clearElement(grid);

    const userSystems = SystemService.getUserSystems();
    const sampleSystems = SystemService.getSampleSystems();

    // 1. User Systems Section
    grid.appendChild(this.renderUserSystemsSection(userSystems));

    // 2. Sample Systems Section
    if (sampleSystems.length > 0) {
      grid.appendChild(this.renderSampleSystemsSection(sampleSystems));
    }
  }

  /**
   * Render user systems section
   * @param {Array} userSystems - Array of user system objects
   * @returns {string} HTML string
   */
  renderUserSystemsSection(userSystems) {
    if (userSystems.length > 0) {
      const section = document.createElement('div');
      section.className = 'systems-section';

      const title = document.createElement('h2');
      title.className = 'systems-section__title';
      title.textContent = 'My Systems';
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'systems-section__grid';
      userSystems.forEach((sys) => {
        grid.appendChild(this.renderSystemCard(sys, true));
      });
      section.appendChild(grid);

      return section;
    }

    return this.renderEmptyState();
  }

  /**
   * Render sample systems section
   * @param {Array} sampleSystems - Array of sample system objects
   * @returns {string} HTML string
   */
  renderSampleSystemsSection(sampleSystems) {
    const section = document.createElement('div');
    section.className = 'systems-section';

    const title = document.createElement('h2');
    title.className = 'systems-section__title systems-section__title--secondary';
    title.textContent = 'Sample Systems';
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'systems-section__grid';
    sampleSystems.forEach((sys) => {
      grid.appendChild(this.renderSystemCard(sys, false));
    });
    section.appendChild(grid);

    return section;
  }

  /**
   * Render empty state when no user systems exist
   * @returns {string} HTML string
   */
  renderEmptyState() {
    const aiEnabled = SettingsService.get()?.ai?.isEnabled || false;

    const section = document.createElement('div');
    section.className = 'systems-section';

    const title = document.createElement('h2');
    title.className = 'systems-section__title';
    title.textContent = 'My Systems';
    section.appendChild(title);

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('i');
    icon.className = 'fas fa-box-open empty-state__icon';
    emptyState.appendChild(icon);

    const message = document.createElement('p');
    message.className = 'empty-state__message';
    message.textContent = "You haven't created any custom systems yet.";
    emptyState.appendChild(message);

    const actions = document.createElement('div');
    actions.className = 'empty-state__actions';

    const aiButton = document.createElement('button');
    aiButton.className = 'btn btn-primary btn--gradient';
    aiButton.setAttribute('data-action', 'create-ai');
    if (!aiEnabled) {
      aiButton.classList.add('disabled');
      aiButton.disabled = true;
    }
    const aiIcon = document.createElement('i');
    aiIcon.className = 'fas fa-magic';
    aiButton.appendChild(aiIcon);
    aiButton.appendChild(document.createTextNode(' Create with AI'));
    actions.appendChild(aiButton);

    const createButton = document.createElement('button');
    createButton.className = 'btn btn-primary';
    createButton.setAttribute('data-action', 'create-new');
    const createIcon = document.createElement('i');
    createIcon.className = 'fas fa-plus';
    createButton.appendChild(createIcon);
    createButton.appendChild(document.createTextNode(' Create Your First System'));
    actions.appendChild(createButton);

    emptyState.appendChild(actions);
    section.appendChild(emptyState);

    return section;
  }

  /**
   * Render a single system card
   * @param {Object} sys - System object
   * @param {boolean} isUserSystem - Whether this is a user-created system
   * @returns {string} HTML string
   */
  renderSystemCard(sys, isUserSystem) {
    const dateDisplay =
      isUserSystem && sys.lastModified ? new Date(sys.lastModified).toLocaleDateString() : '';

    const card = document.createElement('div');
    card.className = 'system-card';

    const body = document.createElement('div');
    body.className = 'system-card__body';

    const header = document.createElement('div');
    header.className = 'system-card__header';

    const avatar = document.createElement('div');
    avatar.className = 'system-card__avatar';
    const nameText = sys.name || sys.id || '';
    avatar.textContent = nameText ? nameText.charAt(0).toUpperCase() : '?';
    header.appendChild(avatar);

    if (dateDisplay) {
      const date = document.createElement('div');
      date.className = 'system-card__date';
      date.textContent = dateDisplay;
      header.appendChild(date);
    }

    body.appendChild(header);

    const title = document.createElement('h3');
    title.className = 'system-card__title';
    title.textContent = sys.name || sys.id || 'Untitled System';
    body.appendChild(title);

    const description = document.createElement('p');
    description.className = 'system-card__description';
    description.textContent = sys.description || 'No description provided.';
    body.appendChild(description);

    const actions = document.createElement('div');
    actions.className = 'system-card__actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-primary system-card__button--load';
    loadBtn.setAttribute('data-action', 'load');
    loadBtn.setAttribute('data-system-id', sys.id);
    const loadIcon = document.createElement('i');
    loadIcon.className = 'fas fa-folder-open';
    loadBtn.appendChild(loadIcon);
    loadBtn.appendChild(document.createTextNode(' Load'));
    actions.appendChild(loadBtn);

    if (isUserSystem) {
      const publishBtn = document.createElement('button');
      publishBtn.className = 'btn btn-secondary system-card__button--publish';
      publishBtn.setAttribute('data-action', 'publish-system');
      publishBtn.setAttribute('data-system-id', sys.id);
      publishBtn.title = 'Publish to Community Blueprints';
      const publishIcon = document.createElement('i');
      publishIcon.className = 'fas fa-upload';
      publishBtn.appendChild(publishIcon);
      publishBtn.appendChild(document.createTextNode(' Publish'));
      actions.appendChild(publishBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-secondary system-card__button--delete';
      deleteBtn.setAttribute('data-action', 'delete');
      deleteBtn.setAttribute('data-system-id', sys.id);
      deleteBtn.title = 'Delete System';
      const deleteIcon = document.createElement('i');
      deleteIcon.className = 'fas fa-trash-alt';
      deleteBtn.appendChild(deleteIcon);
      deleteBtn.appendChild(document.createTextNode(' Delete'));
      actions.appendChild(deleteBtn);
    }

    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

  /**
   * Load a system
   * @param {string} systemKey - The system ID to load
   */
  loadSystem(systemKey) {
    SystemService.loadAndActivate(systemKey);
  }

  /**
   * Delete a system
   * @param {string} systemKey - The system ID to delete
   */
  async deleteSystem(systemKey) {
    if (!notificationManager) {
      console.error('SystemsView: notificationManager not found');
      return;
    }

    const confirmed = await notificationManager.confirm(
      `Are you sure you want to permanently delete "${systemKey}"? This action cannot be undone.`,
      'Delete System',
      { confirmStyle: 'danger' }
    );

    if (confirmed) {
      // Use SystemService if available for consistency
      let success = false;
      success = SystemService.deleteSystem(systemKey);

      if (success) {
        notificationManager.showToast(`System "${systemKey}" has been deleted.`, 'success');
        this.render(); // Refresh the view
      } else {
        notificationManager.showToast('Failed to delete system.', 'error');
      }
    }
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const userSystems = SystemService.getUserSystems();
    const sampleSystems = SystemService.getSampleSystems();

    return {
      viewTitle: 'Systems',
      userSystemCount: userSystems.length,
      sampleSystemCount: sampleSystems.length,
      userSystems: userSystems.map((s) => ({ id: s.id, name: s.name })),
      sampleSystems: sampleSystems.map((s) => ({ id: s.id, name: s.name })),
      currentSystemLoaded: !!SystemService.getCurrentSystem(),
      currentSystemName: SystemService.getCurrentSystem()?.systemName || null,
    };
  }
}
