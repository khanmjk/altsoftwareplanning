/**
 * SettingsView Component
 * Displays application settings with tabbed navigation
 * Handles General and AI Assistant configuration
 */
class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pillNav = null;
        this.activeTab = 'general';

        this.tabs = [
            { id: 'general', label: 'General', icon: 'fas fa-sliders-h' },
            { id: 'ai', label: 'AI Assistant', icon: 'fas fa-robot' }
        ];
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

        // 2. Set Workspace Toolbar (Pill Navigation)
        this.pillNav = new PillNavigationComponent({
            items: this.tabs,
            onSwitch: (tabId) => this.switchTab(tabId)
        });

        if (window.workspaceComponent) {
            window.workspaceComponent.setToolbar(this.pillNav.render());
        }

        // 3. Render Content Structure
        this.container.innerHTML = `
            <div class="settings-view-container workspace-view">
                <div id="general" class="settings-tab-content" style="display: none;">
                    ${this.renderGeneralTab()}
                </div>
                <div id="ai" class="settings-tab-content" style="display: none;">
                    ${this.renderAiTab()}
                </div>
            </div>
        `;

        // 4. Show Active Tab
        this.switchTab(this.activeTab);

        // 5. Bind Events
        this.bindEvents();
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - Tab identifier ('general' or 'ai')
     */
    switchTab(tabId) {
        // Hide all tabs
        const allTabs = this.container.querySelectorAll('.settings-tab-content');
        allTabs.forEach(tab => tab.style.display = 'none');

        // Show active tab
        const activeContent = this.container.querySelector(`#${tabId}`);
        if (activeContent) {
            activeContent.style.display = 'block';
            this.activeTab = tabId;
            if (this.pillNav) {
                this.pillNav.setActive(tabId);
            }
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
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
     * Render General settings tab
     * @returns {string} HTML for general tab
     */
    renderGeneralTab() {
        const hasSystem = !!SystemService.getCurrentSystem();
        const systemName = hasSystem ? SystemService.getCurrentSystem().systemName : '';
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
            <div class="settings-section">
                <h3 class="settings-section-title">Application Data</h3>
                
                <div class="settings-item-card">
                    <div class="settings-row">
                        <div>
                            <h4 class="settings-item-title">Reset to Defaults</h4>
                            <p class="settings-item-desc">Clear all local data and restore the sample dataset.</p>
                        </div>
                        <button class="btn btn-secondary" data-action="reset">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                </div>

                <div class="settings-item-card">
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
            </div>
        `;
    }

    /**
     * Render AI Assistant settings tab
     * @returns {string} HTML for AI tab
     */
    renderAiTab() {
        const isEnabled = SettingsService.get()?.ai?.isEnabled || false;
        const provider = SettingsService.get()?.ai?.provider || 'google-gemini';
        const apiKey = SettingsService.get()?.ai?.apiKey || '';

        return `
            <div class="settings-section">
                <h3 class="settings-section-title">AI Assistant Configuration</h3>
                
                <form id="aiSettingsForm_view">
                    <div class="settings-item-card">
                        <div class="settings-form-group" style="margin-bottom: 0;">
                            <label class="toggle-switch">
                                <input type="checkbox" id="aiModeEnabled_view" ${isEnabled ? 'checked' : ''}>
                                <span class="toggle-label">Enable AI Assistant</span>
                            </label>
                        </div>
                    </div>

                    <div id="aiConfigInputs_view" class="settings-sub-section-wrapper ${isEnabled ? '' : 'hidden'}">
                        <div class="settings-item-card">
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

                            <div class="settings-actions">
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                            </div>
                        </div>
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
        SystemService.resetToDefaults();
    }

    /**
     * Handle delete button click
     */
    handleDelete() {
        const hasSystem = !!SystemService.getCurrentSystem();
        const systemName = hasSystem ? SystemService.getCurrentSystem().systemName : '';
        const sampleSystemNames = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];
        const isSampleSystem = sampleSystemNames.includes(systemName);
        const canDelete = hasSystem && !isSampleSystem;

        if (!canDelete) {
            return; // Button should be disabled, but extra check
        }

        SystemService.deleteCurrentSystem();
    }

    /**
     * Save AI settings to localStorage
     */
    saveAiSettings() {
        const enabled = document.getElementById('aiModeEnabled_view').checked;
        const provider = document.getElementById('aiProviderSelect_view').value;
        const apiKey = document.getElementById('aiApiKeyInput_view').value;

        if (SettingsService.get()) {
            SettingsService.get().ai.isEnabled = enabled;
            SettingsService.get().ai.provider = provider;
            SettingsService.get().ai.apiKey = apiKey;

            // Save to localStorage
            localStorage.setItem('smt_global_settings', JSON.stringify(SettingsService.get()));

            // Update UI
            if (window.headerComponent) {
                window.headerComponent.updateAiButtonVisibility();
            }

            if (window.notificationManager) {
                window.notificationManager.showToast('AI Settings saved successfully!', 'success');
            }
        }
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        return {
            viewTitle: 'Settings',
            currentTab: this.activeTab,
            aiEnabled: SettingsService.get()?.ai?.isEnabled || false,
            aiProvider: SettingsService.get()?.ai?.provider || 'google-gemini',
            hasApiKey: !!SettingsService.get()?.ai?.apiKey,
            hasSystemLoaded: !!SystemService.getCurrentSystem()
        };
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SettingsView = SettingsView;
}
