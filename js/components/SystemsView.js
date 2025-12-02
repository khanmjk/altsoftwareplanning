/**
 * SystemsView Component
 * Displays user systems and sample systems in a grid layout
 * Uses template loading, event delegation, and repository pattern
 */
class SystemsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.repository = window.systemRepository;
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

        try {
            // Load the template
            const template = await window.templateLoader.load('html/components/systems-view-template.html');
            this.container.innerHTML = template;

            // Update UI based on AI settings
            this.updateAIButton();

            // Bind events
            this.bindEvents();

            // Populate systems data
            this.populateSystems();
        } catch (error) {
            console.error('SystemsView: Error rendering view', error);
            this.container.innerHTML = '<p style="color: red;">Error loading systems view. Please refresh the page.</p>';
        }
    }

    /**
     * Update AI button state based on settings
     */
    updateAIButton() {
        const aiButton = document.getElementById('createWithAiBtn');
        if (!aiButton) return;

        const aiEnabled = window.globalSettings?.ai?.isEnabled || false;

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
            case 'load':
                if (systemId) this.loadSystem(systemId);
                break;
            case 'delete':
                if (systemId) this.deleteSystem(systemId);
                break;
            default:
                console.warn(`SystemsView: Unknown action "${action}"`);
        }
    }

    /**
     * Handle Create with AI button click
     */
    handleCreateWithAi() {
        const aiEnabled = window.globalSettings?.ai?.isEnabled || false;

        if (!aiEnabled) {
            if (window.notificationManager) {
                window.notificationManager.showToast('Please enable AI in Settings to use this feature.', 'warning');
            }
            return;
        }

        if (window.handleCreateWithAi) {
            window.handleCreateWithAi();
        } else {
            console.error('SystemsView: handleCreateWithAi function not found');
        }
    }

    /**
     * Handle Create New System button click
     */
    handleCreateNew() {
        if (window.createNewSystem) {
            window.createNewSystem();
        } else {
            console.error('SystemsView: createNewSystem function not found');
        }
    }

    /**
     * Populate the systems grid with data
     */
    populateSystems() {
        const grid = document.getElementById('systemsGrid');
        if (!grid) return;

        const userSystems = this.repository.getUserSystems();
        const sampleSystems = this.repository.getSampleSystems();

        let html = '';

        // 1. User Systems Section
        html += this.renderUserSystemsSection(userSystems);

        // 2. Sample Systems Section
        if (sampleSystems.length > 0) {
            html += this.renderSampleSystemsSection(sampleSystems);
        }

        grid.innerHTML = html;
    }

    /**
     * Render user systems section
     * @param {Array} userSystems - Array of user system objects
     * @returns {string} HTML string
     */
    renderUserSystemsSection(userSystems) {
        if (userSystems.length > 0) {
            return `
                <div class="systems-section">
                    <h2 class="systems-section__title">My Systems</h2>
                    <div class="systems-section__grid">
                        ${userSystems.map(sys => this.renderSystemCard(sys, true)).join('')}
                    </div>
                </div>
            `;
        } else {
            return this.renderEmptyState();
        }
    }

    /**
     * Render sample systems section
     * @param {Array} sampleSystems - Array of sample system objects
     * @returns {string} HTML string
     */
    renderSampleSystemsSection(sampleSystems) {
        return `
            <div class="systems-section">
                <h2 class="systems-section__title systems-section__title--secondary">Sample Systems</h2>
                <div class="systems-section__grid">
                    ${sampleSystems.map(sys => this.renderSystemCard(sys, false)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render empty state when no user systems exist
     * @returns {string} HTML string
     */
    renderEmptyState() {
        const aiEnabled = window.globalSettings?.ai?.isEnabled || false;
        const aiButtonClass = aiEnabled ? '' : 'disabled';
        const aiButtonDisabled = aiEnabled ? '' : 'disabled';

        return `
            <div class="systems-section">
                <h2 class="systems-section__title">My Systems</h2>
                <div class="empty-state">
                    <i class="fas fa-box-open empty-state__icon"></i>
                    <p class="empty-state__message">You haven't created any custom systems yet.</p>
                    <div class="empty-state__actions">
                        <button class="btn btn-primary btn--gradient ${aiButtonClass}" 
                                data-action="create-ai" 
                                ${aiButtonDisabled}>
                            <i class="fas fa-magic"></i> Create with AI
                        </button>
                        <button class="btn btn-primary" data-action="create-new">
                            <i class="fas fa-plus"></i> Create Your First System
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a single system card
     * @param {Object} sys - System object
     * @param {boolean} isUserSystem - Whether this is a user-created system
     * @returns {string} HTML string
     */
    renderSystemCard(sys, isUserSystem) {
        const dateDisplay = isUserSystem && sys.lastModified
            ? new Date(sys.lastModified).toLocaleDateString()
            : '';

        return `
            <div class="system-card">
                <div class="system-card__body">
                    <div class="system-card__header">
                        <div class="system-card__avatar">${sys.name.charAt(0).toUpperCase()}</div>
                        ${dateDisplay ? `<div class="system-card__date">${dateDisplay}</div>` : ''}
                    </div>
                    
                    <h3 class="system-card__title">${sys.name}</h3>
                    <p class="system-card__description">
                        ${sys.description || 'No description provided.'}
                    </p>
                </div>

                <div class="system-card__actions">
                    <button class="btn btn-primary system-card__button--load" 
                            data-action="load" 
                            data-system-id="${sys.id}">
                        <i class="fas fa-folder-open"></i> Load
                    </button>
                    ${isUserSystem ? `
                        <button class="btn btn-secondary system-card__button--delete" 
                                data-action="delete" 
                                data-system-id="${sys.id}" 
                                title="Delete System">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Load a system
     * @param {string} systemKey - The system ID to load
     */
    loadSystem(systemKey) {
        if (window.loadSavedSystem) {
            window.loadSavedSystem(systemKey);
        } else {
            console.error('SystemsView: loadSavedSystem function not found');
        }
    }

    /**
     * Delete a system
     * @param {string} systemKey - The system ID to delete
     */
    async deleteSystem(systemKey) {
        if (!window.notificationManager) {
            console.error('SystemsView: notificationManager not found');
            return;
        }

        const confirmed = await window.notificationManager.confirm(
            `Are you sure you want to permanently delete "${systemKey}"? This action cannot be undone.`,
            'Delete System',
            { confirmStyle: 'danger' }
        );

        if (confirmed) {
            const success = this.repository.deleteSystem(systemKey);
            if (success) {
                window.notificationManager.showToast(`System "${systemKey}" has been deleted.`, 'success');
                this.render(); // Refresh the view
            } else {
                window.notificationManager.showToast('Failed to delete system.', 'error');
            }
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SystemsView = SystemsView;
}
