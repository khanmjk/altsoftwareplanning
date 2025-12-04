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

        // Bind events
        this._boundContainerClick = this.handleContainerClick.bind(this);
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

        // 2. Set Workspace Toolbar (Pill Navigation)
        this.renderToolbar();

        // 3. Render Content Container
        this.container.innerHTML = `
            <div class="management-view-container">
                <div class="management-layout">
                    <div id="managementContent" class="management-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;

        // Bind events
        this.bindEvents();

        // Post-render actions
        this.postRender();
    }

    renderToolbar() {
        if (!window.workspaceComponent) return;

        const items = [
            { id: 'themes', label: 'Themes', icon: 'fas fa-swatchbook' },
            { id: 'initiatives', label: 'Initiatives', icon: 'fas fa-list-ul' },
            { id: 'goals', label: 'Goals', icon: 'fas fa-bullseye' }
        ];

        // Create or update PillNavigation
        if (!this.pillNav) {
            this.pillNav = new PillNavigationComponent({
                items: items,
                activeId: this.activeTab,
                onSwitch: (id) => this.switchTab(id)
            });
        } else {
            this.pillNav.setActive(this.activeTab);
        }

        window.workspaceComponent.setToolbar(this.pillNav.render());
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        const contentContainer = document.getElementById('managementContent');
        if (contentContainer) {
            contentContainer.innerHTML = this.renderActiveTab();
            this.postRender();
        }
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
        }
    }

    renderActiveTab() {
        switch (this.activeTab) {
            case 'themes': return this.renderThemesTab();
            case 'initiatives': return this.renderInitiativesTab();
            case 'goals': return this.renderGoalsTab();
            default: return this.renderThemesTab();
        }
    }

    // --- THEMES TAB ---
    renderThemesTab() {
        return `
            <div class="management-section-header">
                <h3>Themes</h3>
            </div>
            <div id="themesListContainer">
                <!-- Themes will be rendered here by ThemeEditComponent -->
            </div>
            <div class="management-list-actions">
                <button class="btn btn-primary" data-action="add-theme">
                    <i class="fas fa-plus"></i> Add Theme
                </button>
            </div>
        `;
    }

    renderThemesList() {
        if (!window.currentSystemData) return;

        // Initialize ThemeEditComponent
        if (!this.themeEditComponent) {
            this.themeEditComponent = new ThemeEditComponent('themesListContainer', window.currentSystemData);
        } else {
            this.themeEditComponent.systemData = window.currentSystemData;
            this.themeEditComponent.containerId = 'themesListContainer'; // Ensure container ID is set if re-using
        }

        this.themeEditComponent.render();
    }

    addNewTheme() {
        if (!window.currentSystemData.definedThemes) {
            window.currentSystemData.definedThemes = [];
        }

        window.currentSystemData.definedThemes.push({
            name: 'New Theme',
            description: '',
            themeId: 'theme_' + Date.now()
        });

        // Refresh Component
        if (this.themeEditComponent) {
            this.themeEditComponent.expandedIndex = window.currentSystemData.definedThemes.length - 1; // Expand new
            this.themeEditComponent.render();
        }
    }

    // --- INITIATIVES TAB ---
    renderInitiativesTab() {
        return `
            <div class="management-section-header">
                <h3>Initiatives Overview</h3>
            </div>
            
            <div id="initiativesListContainer">
                <!-- Initiatives will be rendered here by InitiativeEditComponent -->
            </div>

            <div class="management-list-actions">
                <button class="btn btn-primary" data-action="add-initiative">
                    <i class="fas fa-plus"></i> Add Initiative
                </button>
            </div>
        `;
    }

    populateInitiativesList() {
        if (!window.currentSystemData) return;

        // Initialize InitiativeEditComponent
        if (!this.initiativeEditComponent) {
            this.initiativeEditComponent = new InitiativeEditComponent('initiativesListContainer', window.currentSystemData);
        } else {
            this.initiativeEditComponent.systemData = window.currentSystemData;
            this.initiativeEditComponent.containerId = 'initiativesListContainer';
        }
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
    editInitiative(initiativeId) { }
    handleSaveInitiative(data, isEdit) { }
    async deleteInitiative(initiativeId) { }

    // --- GOALS TAB ---
    renderGoalsTab() {
        return `
            < div class="management-section-header" >
                <h3>Strategic Goals</h3>
            </div >
            <div class="settings-alert" style="margin-bottom: 20px; background-color: #e3f2fd; color: #0d47a1; padding: 12px; border-radius: 4px; border: 1px solid #bbdefb;">
                <p style="margin: 0;"><i class="fas fa-info-circle"></i> Goal management is coming soon in a future update.</p>
            </div>
            
            <div id="goalsList_mgmt" class="management-list-container">
                <p class="management-list-empty">No goals defined.</p>
            </div>
        `;
    }

    populateGoalsList() {
        const listContainer = document.getElementById('goalsList_mgmt');
        if (listContainer && window.currentSystemData && window.currentSystemData.strategicGoals) {
            const goals = window.currentSystemData.strategicGoals;
            if (goals.length > 0) {
                listContainer.innerHTML = goals.map(g => `
            < div class="management-item" >
                <div class="management-item-header" style="cursor: default;">
                    <span class="management-item-indicator" style="visibility: hidden;">-</span>
                    <span class="management-item-title">${g.name || 'Unnamed Goal'}</span>
                </div>
                    </div >
            `).join('');
            }
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.ManagementView = ManagementView;
}
