/**
 * SettingsView Component
 * Displays application settings with tabbed navigation
 * Handles General and AI Assistant configuration
 */
class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeTab = 'general';
    }

    /**
     * Render the settings view
     */
    render() {
        if (!this.container) return;

        // 1. Set Workspace Metadata
        if (window.workspaceComponent) {
            window.workspaceComponent.setPageMetadata({
                title: 'System Settings',
                breadcrumbs: ['System', 'Settings'],
                actions: []
            });
        }

        // 2. Set Workspace Toolbar
        const toolbar = this.generateSettingsToolbar();
        if (window.workspaceComponent && toolbar) {
            window.workspaceComponent.setToolbar(toolbar);
        }

        // 3. Render Content
        this.container.innerHTML = `
            <div class="settings-view-container">
                <div class="settings-layout" style="grid-template-columns: 1fr;">
                    <!-- Sidebar Removed, Content Only -->
                    <div class="settings-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;

        // Bind events after rendering
        this.bindEvents();
    }

    /**
     * Generates the toolbar controls for Settings View
     */
    generateSettingsToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'settings-toolbar-global';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.gap = '10px';
        toolbar.id = 'settingsGlobalToolbar';

        const tabs = [
            { id: 'general', label: 'General', icon: 'fa-sliders-h' },
            { id: 'ai', label: 'AI Assistant', icon: 'fa-robot' }
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
        // Tab switching handled by toolbar now

        // Form submission for AI settings
        const aiForm = document.getElementById('aiSettingsForm_view');
        if (aiForm) {
            aiForm.addEventListener('submit', this.handleAiFormSubmit.bind(this));
        }

        // AI enabled checkbox toggle
        const aiCheckbox = document.getElementById('aiModeEnabled_view');
        if (aiCheckbox) {
            aiCheckbox.addEventListener('change', this.handleAiToggle.bind(this));
        }

        // General settings buttons
        const resetBtn = this.container.querySelector('[data-action="reset"]');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.handleReset.bind(this));
        }

        const deleteBtn = this.container.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.handleDelete.bind(this));
        }
    }

    /**
     * Handle tab click
     * @param {Event} event - Click event
     */
    /**
     * Handle tab click (Legacy)
     * @param {Event} event - Click event
     */
    handleTabClick(event) {
        // Legacy handler
        const tabItem = event.target.closest('[data-tab]');
        if (!tabItem) return;

        const tabName = tabItem.dataset.tab;
        this.switchTab(tabName);
    }

    /**
     * Switch to a different tab
     * @param {string} tabName - Tab identifier ('general' or 'ai')
     */
    switchTab(tabName) {
        this.activeTab = tabName;
        this.render();
    }

    /**
     * Render the currently active tab
     * @returns {string} HTML for active tab
     */
    renderActiveTab() {
        switch (this.activeTab) {
            case 'general':
                return this.renderGeneralTab();
            case 'ai':
                return this.renderAiTab();
            default:
                return this.renderGeneralTab();
        }
    }

    /**
     * Render General settings tab
     * @returns {string} HTML for general tab
     */
    renderGeneralTab() {
        const hasSystem = !!window.currentSystemData;
        const systemName = hasSystem ? window.currentSystemData.systemName : '';
        const sampleSystemNames = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];
        const isSampleSystem = sampleSystemNames.includes(systemName);

        const canDelete = hasSystem && !isSampleSystem;

        let deleteButtonTitle = "Permanently delete the currently loaded system.";
        if (isSampleSystem) {
            deleteButtonTitle = "Built-in sample systems cannot be deleted.";
        } else if (!hasSystem) {
            deleteButtonTitle = "No system loaded.";
        }

        return `
            <div class="settings-card">
                <h3 class="settings-card-title">Application Data</h3>
                
                <div class="settings-row border-bottom">
                    <div>
                        <h4 class="settings-item-title">Reset to Defaults</h4>
                        <p class="settings-item-desc">Clear all local data and restore the sample dataset.</p>
                    </div>
                    <button class="btn btn-secondary" data-action="reset">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>

                <div class="settings-row">
                    <div>
                        <h4 class="settings-item-title danger">Delete Current System</h4>
                        <p class="settings-item-desc">${deleteButtonTitle}</p>
                    </div>
                    <button class="btn btn-danger ${canDelete ? 'enabled' : ''}" 
                            data-action="delete"
                            ${!canDelete ? 'disabled' : ''}
                            title="${deleteButtonTitle}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render AI Assistant settings tab
     * @returns {string} HTML for AI tab
     */
    renderAiTab() {
        const isEnabled = window.globalSettings?.ai?.isEnabled || false;
        const provider = window.globalSettings?.ai?.provider || 'google-gemini';
        const apiKey = window.globalSettings?.ai?.apiKey || '';

        return `
            <div class="settings-card">
                <h3 class="settings-card-title">AI Assistant Configuration</h3>
                
                <form id="aiSettingsForm_view">
                    <div class="settings-form-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="aiModeEnabled_view" ${isEnabled ? 'checked' : ''}>
                            <span class="toggle-label">Enable AI Assistant</span>
                        </label>
                    </div>

                    <div id="aiConfigInputs_view" class="settings-sub-section ${isEnabled ? '' : 'hidden'}">
                        <div class="settings-form-group">
                            <label class="settings-label">LLM Provider</label>
                            <select id="aiProviderSelect_view" class="settings-select">
                                <option value="google-gemini" ${provider === 'google-gemini' ? 'selected' : ''}>Google (Gemini Pro)</option>
                                <option value="openai-gpt4o" disabled>OpenAI (GPT-4o) - Coming Soon</option>
                                <option value="anthropic-claude35" disabled>Anthropic (Claude 3.5 Sonnet) - Coming Soon</option>
                            </select>
                        </div>

                        <div class="settings-form-group">
                            <label class="settings-label">API Key</label>
                            <div class="settings-input-wrapper">
                                <input type="password" 
                                       id="aiApiKeyInput_view" 
                                       value="${apiKey}" 
                                       placeholder="Paste your API key here" 
                                       class="settings-input">
                            </div>
                            <p class="settings-helper-text">
                                Your key is stored locally in your browser. Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" class="settings-link">Google AI Studio</a>.
                            </p>
                        </div>

                        <div class="settings-alert">
                            <p>
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Note:</strong> Free-tier keys have rate limits. If you see "503 Model Overloaded", please wait a moment.
                            </p>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Handle AI form submission
     * @param {Event} event - Submit event
     */
    handleAiFormSubmit(event) {
        event.preventDefault();
        this.saveAiSettings();
    }

    /**
     * Handle AI enabled checkbox toggle
     * @param {Event} event - Change event
     */
    handleAiToggle(event) {
        const configInputs = document.getElementById('aiConfigInputs_view');
        if (configInputs) {
            if (event.target.checked) {
                configInputs.classList.remove('hidden');
            } else {
                configInputs.classList.add('hidden');
            }
        }
    }

    /**
     * Handle reset button click
     */
    handleReset() {
        if (window.resetToDefaults) {
            window.resetToDefaults();
        } else {
            console.error('SettingsView: resetToDefaults function not found');
        }
    }

    /**
     * Handle delete button click
     */
    handleDelete() {
        const hasSystem = !!window.currentSystemData;
        const systemName = hasSystem ? window.currentSystemData.systemName : '';
        const sampleSystemNames = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];
        const isSampleSystem = sampleSystemNames.includes(systemName);
        const canDelete = hasSystem && !isSampleSystem;

        if (!canDelete) {
            return; // Button should be disabled, but extra check
        }

        if (window.deleteSystem) {
            window.deleteSystem();
        } else {
            console.error('SettingsView: deleteSystem function not found');
        }
    }

    /**
     * Save AI settings to localStorage
     */
    saveAiSettings() {
        const enabled = document.getElementById('aiModeEnabled_view').checked;
        const provider = document.getElementById('aiProviderSelect_view').value;
        const apiKey = document.getElementById('aiApiKeyInput_view').value;

        if (window.globalSettings) {
            window.globalSettings.ai.isEnabled = enabled;
            window.globalSettings.ai.provider = provider;
            window.globalSettings.ai.apiKey = apiKey;

            // Save to localStorage
            localStorage.setItem('smt_global_settings', JSON.stringify(window.globalSettings));

            // Update UI
            if (window.headerComponent) {
                window.headerComponent.updateAiButtonVisibility();
            }

            if (window.notificationManager) {
                window.notificationManager.showToast('AI Settings saved successfully!', 'success');
            }
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SettingsView = SettingsView;
}
