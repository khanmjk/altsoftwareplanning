class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeTab = 'general';
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="settings-view-container">
                <h1 class="settings-header">
                    <i class="fas fa-cog"></i> Settings
                </h1>

                <div class="settings-layout">
                    <!-- Sidebar Navigation -->
                    <div class="settings-sidebar">
                        <div class="settings-nav-item ${this.activeTab === 'general' ? 'active' : ''}" 
                             onclick="window.settingsViewInstance.switchTab('general')">
                            <i class="fas fa-sliders-h"></i> General
                        </div>
                        <div class="settings-nav-item ${this.activeTab === 'ai' ? 'active' : ''}" 
                             onclick="window.settingsViewInstance.switchTab('ai')">
                            <i class="fas fa-robot"></i> AI Assistant
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div class="settings-content">
                        ${this.renderActiveTab()}
                    </div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        this.render();
    }

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
                    <button class="btn-secondary" onclick="if(window.resetToDefaults) window.resetToDefaults()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>

                <div class="settings-row">
                    <div>
                        <h4 class="settings-item-title danger">Delete Current System</h4>
                        <p class="settings-item-desc">${deleteButtonTitle}</p>
                    </div>
                    <button class="btn-danger" 
                            style="background-color: ${canDelete ? '#fee2e2' : '#f1f5f9'}; color: ${canDelete ? '#ef4444' : '#94a3b8'}; border: 1px solid ${canDelete ? '#fecaca' : '#cbd5e1'}; cursor: ${canDelete ? 'pointer' : 'not-allowed'};" 
                            onclick="if(window.deleteSystem && ${canDelete}) window.deleteSystem()"
                            ${!canDelete ? 'disabled' : ''}
                            title="${deleteButtonTitle}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    renderAiTab() {
        const isEnabled = window.globalSettings?.ai?.isEnabled || false;
        const provider = window.globalSettings?.ai?.provider || 'google-gemini';
        const apiKey = window.globalSettings?.ai?.apiKey || '';

        return `
            <div class="settings-card">
                <h3 class="settings-card-title">AI Assistant Configuration</h3>
                
                <form id="aiSettingsForm_view" onsubmit="event.preventDefault(); window.settingsViewInstance.saveAiSettings();">
                    <div class="settings-form-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="aiModeEnabled_view" ${isEnabled ? 'checked' : ''} onchange="document.getElementById('aiConfigInputs_view').style.display = this.checked ? 'block' : 'none'">
                            <span class="toggle-label">Enable AI Assistant</span>
                        </label>
                    </div>

                    <div id="aiConfigInputs_view" class="settings-sub-section" style="display: ${isEnabled ? 'block' : 'none'};">
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
                            <div style="position: relative;">
                                <input type="password" id="aiApiKeyInput_view" value="${apiKey}" placeholder="Paste your API key here" 
                                       class="settings-input">
                            </div>
                            <p class="settings-helper-text">
                                Your key is stored locally in your browser. Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" class="settings-link">Google AI Studio</a>.
                            </p>
                        </div>

                        <div class="settings-alert">
                            <p>
                                <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                                <strong>Note:</strong> Free-tier keys have rate limits. If you see "503 Model Overloaded", please wait a moment.
                            </p>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
    }

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

            window.notificationManager.showToast('AI Settings saved successfully!', 'success');
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SettingsView = SettingsView;
}
