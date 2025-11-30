/**
 * ManagementView
 * Handles product management settings like Themes, Initiatives, and Goals.
 */
class ManagementView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeTab = 'themes'; // Default tab
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="management-view-container">
                <h1 class="management-header">
                    <i class="fas fa-tasks"></i> Product Management
                </h1>

                <div class="management-layout">
                    <!-- Sidebar Navigation -->
                    <div class="management-sidebar">
                        <div class="management-nav-item ${this.activeTab === 'themes' ? 'active' : ''}" 
                             onclick="window.managementViewInstance.switchTab('themes')">
                            <div class="management-nav-icon"><i class="fas fa-swatchbook"></i></div>
                            Themes
                        </div>
                        <div class="management-nav-item ${this.activeTab === 'initiatives' ? 'active' : ''}" 
                             onclick="window.managementViewInstance.switchTab('initiatives')">
                            <div class="management-nav-icon"><i class="fas fa-list-ul"></i></div>
                            Initiatives
                        </div>
                        <div class="management-nav-item ${this.activeTab === 'goals' ? 'active' : ''}" 
                             onclick="window.managementViewInstance.switchTab('goals')">
                            <div class="management-nav-icon"><i class="fas fa-bullseye"></i></div>
                            Goals
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div class="management-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;

        // Post-render actions (like attaching listeners or populating lists)
        if (this.activeTab === 'themes') {
            this.populateThemesList();
        } else if (this.activeTab === 'initiatives') {
            this.populateInitiativesList();
        } else if (this.activeTab === 'goals') {
            this.populateGoalsList();
        }
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
                        <form id="addNewThemeForm_mgmt" onsubmit="event.preventDefault(); window.managementViewInstance.saveNewTheme();">
                            <div class="management-form-group">
                                <label class="management-label">Theme Name</label>
                                <input type="text" id="newThemeName_mgmt" required class="management-input" placeholder="e.g. User Experience">
                            </div>
                            <div class="management-form-group">
                                <label class="management-label">Description</label>
                                <textarea id="newThemeDescription_mgmt" rows="3" class="management-textarea" placeholder="Brief description of the theme..."></textarea>
                            </div>
                            <button type="submit" class="btn-secondary">
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
                <button class="btn-icon" onclick="window.managementViewInstance.deleteTheme(${index})" title="Delete Theme" style="color: #ef4444;">
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
            themeId: 'theme_' + Date.now() // Ensure ID consistency
        });

        if (window.saveSystemData) window.saveSystemData();
        this.populateThemesList();
        document.getElementById('addNewThemeForm_mgmt').reset();
    }

    deleteTheme(index) {
        if (!confirm('Are you sure you want to delete this theme?')) return;
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 class="management-card-title" style="margin-bottom: 0; border-bottom: none;">Initiatives Overview</h3>
                    <button class="btn-primary" onclick="window.managementViewInstance.openAddInitiativeModal()">
                        <i class="fas fa-plus"></i> Add Initiative
                    </button>
                </div>
                
                <div id="initiativesList_mgmt" class="management-list-container" style="max-height: 600px;">
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
                    <button class="btn-icon" onclick="window.managementViewInstance.editInitiative('${init.initiativeId}')" title="Edit Initiative">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="window.managementViewInstance.deleteInitiative('${init.initiativeId}')" title="Delete Initiative" style="color: #ef4444;">
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

    deleteInitiative(initiativeId) {
        if (!confirm('Are you sure you want to delete this initiative?')) return;

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
