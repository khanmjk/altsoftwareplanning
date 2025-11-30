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
            <div class="management-view-container" style="padding: 40px; max-width: 1000px; margin: 0 auto;">
                <h1 style="font-size: 2rem; color: #1e293b; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                    <i class="fas fa-tasks" style="margin-right: 10px; color: #64748b;"></i> Product Management
                </h1>

                <div class="settings-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 20px; color: #0f172a;">Theme Management</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div>
                            <h4 style="color: #334155; margin-bottom: 15px;">Create New Theme</h4>
                            <form id="addNewThemeForm_mgmt" onsubmit="event.preventDefault(); window.managementViewInstance.saveNewTheme();">
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #475569;">Theme Name</label>
                                    <input type="text" id="newThemeName_mgmt" required style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px; color: #475569;">Description</label>
                                    <textarea id="newThemeDescription_mgmt" rows="3" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;"></textarea>
                                </div>
                                <button type="submit" class="btn-secondary">
                                    <i class="fas fa-plus"></i> Add Theme
                                </button>
                            </form>
                        </div>

                        <div>
                            <h4 style="color: #334155; margin-bottom: 15px;">Available Themes</h4>
                            <div id="existingThemesList_mgmt" style="border: 1px solid #e2e8f0; border-radius: 6px; height: 300px; overflow-y: auto; padding: 10px; background: #f8fafc;">
                                <!-- Theme items will be populated here -->
                                <p style="color: #94a3b8; text-align: center; margin-top: 20px;">Loading themes...</p>
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
            listContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No themes defined yet.</p>';
            return;
        }

        listContainer.innerHTML = themes.map((theme, index) => `
            <div style="background: white; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: #334155;">${theme.name}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${theme.description || 'No description'}</div>
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
