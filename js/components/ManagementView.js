/**
 * ManagementView
 * Handles product management settings like Themes.
 */
class ManagementView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="management-view-container">
                <h1 class="management-header">
                    <i class="fas fa-tasks"></i> Product Management
                </h1>

                <div class="settings-card">
                    <h3 class="settings-card-title">Theme Management</h3>
                    
                    <div class="management-grid">
                        <div>
                            <h4 class="management-section-title">Create New Theme</h4>
                            <form id="addNewThemeForm_mgmt" onsubmit="event.preventDefault(); window.managementViewInstance.saveNewTheme();">
                                <div class="management-form-group">
                                    <label class="management-label">Theme Name</label>
                                    <input type="text" id="newThemeName_mgmt" required class="management-input">
                                </div>
                                <div class="management-form-group">
                                    <label class="management-label">Description</label>
                                    <textarea id="newThemeDescription_mgmt" rows="3" class="management-textarea"></textarea>
                                </div>
                                <button type="submit" class="btn-secondary">
                                    <i class="fas fa-plus"></i> Add Theme
                                </button>
                            </form>
                        </div>

                        <div>
                            <h4 class="management-section-title">Available Themes</h4>
                            <div id="existingThemesList_mgmt" class="management-list-container">
                                <!-- Theme items will be populated here -->
                                <p class="management-list-empty">Loading themes...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.populateThemesList();
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
            id: 'theme_' + Date.now()
        });

        // Save system
        if (window.saveSystemData) {
            window.saveSystemData();
        }

        // Refresh list and clear form
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
}

// Expose to window
if (typeof window !== 'undefined') {
    window.ManagementView = ManagementView;
}
