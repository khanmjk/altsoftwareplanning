/**
 * ManagementView
 * Handles product management settings like Themes, Initiatives, and Goals.
 */
class ManagementView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeTab = 'themes'; // Default tab
        // Bind once to avoid duplicate listeners on re-render
        this._boundTabClick = this.handleTabClick.bind(this);
        this._boundButtonClick = this.handleButtonClick.bind(this);
        this._boundSubmit = this.handleThemeFormSubmit.bind(this);
        this._eventsBound = false;
    }

    render() {
        if (!this.container) return;

        // 1. Set Workspace Metadata
        if (window.workspaceComponent) {
            window.workspaceComponent.setPageMetadata({
                title: 'Product Management',
                breadcrumbs: ['Product', 'Management'],
                actions: []
            });
        }

        // 2. Set Workspace Toolbar
        const toolbar = this.generateManagementToolbar();
        if (window.workspaceComponent && toolbar) {
            window.workspaceComponent.setToolbar(toolbar);
        }

        // 3. Render Content
        this.container.innerHTML = `
            <div class="management-view-container">
                <div class="management-layout" style="grid-template-columns: 1fr;">
                    <!-- Sidebar Removed, Content Only -->
                    <div class="management-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;

        // Bind events
        this.bindEvents();

        // Post-render actions (populate lists)
        if (this.activeTab === 'themes') {
            this.populateThemesList();
        } else if (this.activeTab === 'initiatives') {
            this.populateInitiativesList();
        } else if (this.activeTab === 'goals') {
            this.populateGoalsList();
        }
    }

    /**
     * Generates the toolbar controls for Management View
     */
    generateManagementToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'management-toolbar-global';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.gap = '10px';
        toolbar.id = 'managementGlobalToolbar';

        const tabs = [
            { id: 'themes', label: 'Themes', icon: 'fa-swatchbook' },
            { id: 'initiatives', label: 'Initiatives', icon: 'fa-list-ul' },
            { id: 'goals', label: 'Goals', icon: 'fa-bullseye' }
        ];

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-sm';
            btn.innerHTML = `<i class="fas ${tab.icon}"></i> ${tab.label}`;
            btn.dataset.tab = tab.id;
            btn.onclick = () => this.switchTab(tab.id);
            toolbar.appendChild(btn);
        });

        // Set active state
        const activeBtn = toolbar.querySelector(`[data-tab="${this.activeTab}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('btn-secondary');
            activeBtn.classList.add('btn-primary');
        }

        return toolbar;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this._eventsBound) return;
        // Delegated handlers so we only bind once regardless of re-render
        this.container.addEventListener('click', this._boundTabClick);
        this.container.addEventListener('click', this._boundButtonClick);
        this.container.addEventListener('submit', this._boundSubmit);
        this._eventsBound = true;
    }

    /**
     * Handle tab clicks
     */
    handleTabClick(event) {
        // Legacy handler, no longer used with global toolbar but kept for safety
        const tabItem = event.target.closest('[data-tab]');
        if (!tabItem) return;

        const tabName = tabItem.dataset.tab;
        this.switchTab(tabName);
    }

    /**
     * Handle button clicks via delegation
     */
    handleButtonClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const index = button.dataset.index;
        const initiativeId = button.dataset.initiativeId;

        if (action === 'delete-theme' && index !== undefined) {
            this.deleteTheme(parseInt(index));
        } else if (action === 'add-initiative') {
            this.openAddInitiativeModal();
        } else if (action === 'edit-initiative' && initiativeId) {
            this.editInitiative(initiativeId);
        } else if (action === 'delete-initiative' && initiativeId) {
            this.deleteInitiative(initiativeId);
        }
    }

    /**
     * Handle theme form submission
     */
    handleThemeFormSubmit(event) {
        if (!event || event.target?.id !== 'addNewThemeForm_mgmt') return;
        event.preventDefault();
        this.saveNewTheme();
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        this.render();
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
        return `
            <div class="management-card">
                <h3 class="management-card-title">Theme Management</h3>
                
                <div class="management-grid">
                    <div>
                        <h4 class="management-section-title">Create New Theme</h4>
                        <form id="addNewThemeForm_mgmt">
                            <div class="management-form-group">
                                <label class="management-label">Theme Name</label>
                                <input type="text" id="newThemeName_mgmt" required class="management-input" placeholder="e.g. User Experience">
                            </div>
                            <div class="management-form-group">
                                <label class="management-label">Description</label>
                                <textarea id="newThemeDescription_mgmt" rows="3" class="management-textarea" placeholder="Brief description of the theme..."></textarea>
                            </div>
                            <button type="submit" class="btn btn-secondary">
                                <i class="fas fa-plus"></i> Add Theme
                            </button>
                        </form>
                    </div>

                    <div>
                        <h4 class="management-section-title">Available Themes</h4>
                        <div id="existingThemesList_mgmt" class="management-list-container">
                            <p class="management-list-empty">Loading themes...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    populateThemesList() {
        const listContainer = document.getElementById('existingThemesList_mgmt');
        if (!listContainer || !window.currentSystemData) return;

        const themes = window.currentSystemData.definedThemes || [];

        if (themes.length === 0) {
            listContainer.innerHTML = '<p class="management-list-empty">No themes defined yet.</p>';
            return;
        }

        listContainer.innerHTML = themes.map((theme, index) => `
            <div class="management-list-item">
                <div class="management-item-content">
                    <div class="management-item-title">${theme.name}</div>
                    <div class="management-item-desc">${theme.description || 'No description'}</div>
                </div>
                <button class="btn-icon btn-icon--danger" 
                        data-action="delete-theme" 
                        data-index="${index}" 
                        title="Delete Theme">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    }

    saveNewTheme() {
        const name = document.getElementById('newThemeName_mgmt').value;
        const desc = document.getElementById('newThemeDescription_mgmt').value;

        if (!name) return;

        if (!window.currentSystemData.definedThemes) {
            window.currentSystemData.definedThemes = [];
        }

        window.currentSystemData.definedThemes.push({
            name: name,
            description: desc,
            themeId: 'theme_' + Date.now()
        });

        if (window.saveSystemData) window.saveSystemData();
        this.populateThemesList();
        document.getElementById('addNewThemeForm_mgmt').reset();
    }

    async deleteTheme(index) {
        if (!await window.notificationManager.confirm('Are you sure you want to delete this theme?', 'Delete Theme', { confirmStyle: 'danger' })) return;
        if (window.currentSystemData && window.currentSystemData.definedThemes) {
            window.currentSystemData.definedThemes.splice(index, 1);
            if (window.saveSystemData) window.saveSystemData();
            this.populateThemesList();
        }
    }

    // --- INITIATIVES TAB ---
    renderInitiativesTab() {
        return `
            <div class="management-card">
                <div class="management-header-actions">
                    <h3 class="management-card-title management-card-title--no-border">Initiatives Overview</h3>
                    <button class="btn btn-primary" data-action="add-initiative">
                        <i class="fas fa-plus"></i> Add Initiative
                    </button>
                </div>
                
                <div id="initiativesList_mgmt" class="management-list-container management-list-container--tall">
                    <p class="management-list-empty">Loading initiatives...</p>
                </div>
            </div>
        `;
    }

    populateInitiativesList() {
        const listContainer = document.getElementById('initiativesList_mgmt');
        if (!listContainer || !window.currentSystemData) return;

        const initiatives = window.currentSystemData.yearlyInitiatives || [];

        if (initiatives.length === 0) {
            listContainer.innerHTML = '<p class="management-list-empty">No initiatives found. Click "Add Initiative" to create one.</p>';
            return;
        }

        listContainer.innerHTML = initiatives.map(init => `
            <div class="management-list-item">
                <div class="management-item-content">
                    <div class="management-item-title">${init.title}</div>
                    <div class="management-item-desc">
                        <span class="badge badge-${init.status ? init.status.toLowerCase().replace(' ', '-') : 'backlog'}">${init.status || 'Backlog'}</span>
                        <span style="margin-left: 10px;">Due: ${init.targetDueDate || 'N/A'}</span>
                    </div>
                </div>
                <div class="management-item-actions">
                    <button class="btn-icon" 
                            data-action="edit-initiative" 
                            data-initiative-id="${init.initiativeId}" 
                            title="Edit Initiative">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon--danger" 
                            data-action="delete-initiative" 
                            data-initiative-id="${init.initiativeId}" 
                            title="Delete Initiative">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    openAddInitiativeModal() {
        if (window.roadmapInitiativeModal) {
            window.roadmapInitiativeModal.onSave = (data, isEdit) => this.handleSaveInitiative(data, isEdit);
            window.roadmapInitiativeModal.open();
        } else {
            console.error('RoadmapInitiativeModal not initialized');
        }
    }

    editInitiative(initiativeId) {
        if (window.roadmapInitiativeModal) {
            window.roadmapInitiativeModal.onSave = (data, isEdit) => this.handleSaveInitiative(data, isEdit);
            window.roadmapInitiativeModal.open(initiativeId);
        }
    }

    handleSaveInitiative(data, isEdit) {
        if (!window.currentSystemData.yearlyInitiatives) {
            window.currentSystemData.yearlyInitiatives = [];
        }

        if (isEdit) {
            const index = window.currentSystemData.yearlyInitiatives.findIndex(i => i.initiativeId === data.initiativeId);
            if (index > -1) {
                window.currentSystemData.yearlyInitiatives[index] = data;
            }
        } else {
            window.currentSystemData.yearlyInitiatives.push(data);
        }

        if (window.saveSystemData) window.saveSystemData();
        this.populateInitiativesList();
    }

    async deleteInitiative(initiativeId) {
        if (!await window.notificationManager.confirm('Are you sure you want to delete this initiative?', 'Delete Initiative', { confirmStyle: 'danger' })) return;

        if (window.currentSystemData && window.currentSystemData.yearlyInitiatives) {
            const index = window.currentSystemData.yearlyInitiatives.findIndex(i => i.initiativeId === initiativeId);
            if (index > -1) {
                window.currentSystemData.yearlyInitiatives.splice(index, 1);
                if (window.saveSystemData) window.saveSystemData();
                this.populateInitiativesList();
            }
        }
    }

    // --- GOALS TAB ---
    renderGoalsTab() {
        return `
            <div class="management-card">
                <h3 class="management-card-title">Strategic Goals</h3>
                <div class="settings-alert" style="margin-bottom: 20px;">
                    <p><i class="fas fa-info-circle"></i> Goal management is coming soon in a future update.</p>
                </div>
                
                <div id="goalsList_mgmt" class="management-list-container">
                    <p class="management-list-empty">No goals defined.</p>
                </div>
            </div>
        `;
    }

    populateGoalsList() {
        // Placeholder for future implementation
        const listContainer = document.getElementById('goalsList_mgmt');
        if (listContainer && window.currentSystemData && window.currentSystemData.strategicGoals) {
            const goals = window.currentSystemData.strategicGoals;
            if (goals.length > 0) {
                listContainer.innerHTML = goals.map(g => `
                    <div class="management-list-item">
                        <div class="management-item-content">
                            <div class="management-item-title">${g.name || 'Unnamed Goal'}</div>
                        </div>
                    </div>
                 `).join('');
            }
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.ManagementView = ManagementView;
}
