class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.activeTab = 'general';
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="settings-view-container" style="padding: 40px; max-width: 1000px; margin: 0 auto;">
                <h1 style="font-size: 2rem; color: #1e293b; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                    <i class="fas fa-cog" style="margin-right: 10px; color: #64748b;"></i> Settings
                </h1>

                <div class="settings-layout" style="display: flex; gap: 40px;">
                    <!-- Sidebar Navigation -->
                    <div class="settings-sidebar" style="width: 250px; flex-shrink: 0;">
                        <div class="settings-nav-item ${this.activeTab === 'general' ? 'active' : ''}" 
                             onclick="window.settingsViewInstance.switchTab('general')"
                             style="padding: 12px 15px; cursor: pointer; border-radius: 6px; margin-bottom: 5px; color: ${this.activeTab === 'general' ? '#2563eb' : '#475569'}; background: ${this.activeTab === 'general' ? '#eff6ff' : 'transparent'}; font-weight: ${this.activeTab === 'general' ? '600' : '400'}; transition: all 0.2s;">
                            <i class="fas fa-sliders-h" style="width: 25px;"></i> General
                        </div>
                        <div class="settings-nav-item ${this.activeTab === 'ai' ? 'active' : ''}" 
                             onclick="window.settingsViewInstance.switchTab('ai')"
                             style="padding: 12px 15px; cursor: pointer; border-radius: 6px; margin-bottom: 5px; color: ${this.activeTab === 'ai' ? '#2563eb' : '#475569'}; background: ${this.activeTab === 'ai' ? '#eff6ff' : 'transparent'}; font-weight: ${this.activeTab === 'ai' ? '600' : '400'}; transition: all 0.2s;">
                            <i class="fas fa-robot" style="width: 25px;"></i> AI Assistant
                        </div>

                    </div>

                    <!-- Content Area -->
                    <div class="settings-content" style="flex-grow: 1;">
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
            case 'themes':
                return this.renderThemesTab();
            default:
                return this.renderGeneralTab();
        }
    }

    renderGeneralTab() {
        const hasSystem = !!window.currentSystemData;
        return `
            <div class="settings-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #0f172a;">Application Data</h3>
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #334155;">Reset to Defaults</h4>
                        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Clear all local data and restore the sample dataset.</p>
                    </div>
                    <button class="btn-secondary" onclick="if(window.resetToDefaults) window.resetToDefaults()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 0;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #ef4444;">Delete Current System</h4>
                        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Permanently delete the currently loaded system.</p>
                    </div>
                    <button class="btn-danger" 
                            style="background-color: ${hasSystem ? '#fee2e2' : '#f1f5f9'}; color: ${hasSystem ? '#ef4444' : '#94a3b8'}; border: 1px solid ${hasSystem ? '#fecaca' : '#cbd5e1'}; cursor: ${hasSystem ? 'pointer' : 'not-allowed'};" 
                            onclick="if(window.deleteSystem && ${hasSystem}) window.deleteSystem()"
                            ${!hasSystem ? 'disabled' : ''}>
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
            <div class="settings-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px;">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #0f172a;">AI Assistant Configuration</h3>
                
                <form id="aiSettingsForm_view" onsubmit="event.preventDefault(); window.settingsViewInstance.saveAiSettings();">
                    <div style="margin-bottom: 20px;">
                        <label class="toggle-switch" style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="aiModeEnabled_view" ${isEnabled ? 'checked' : ''} onchange="document.getElementById('aiConfigInputs_view').style.display = this.checked ? 'block' : 'none'">
                            <span style="margin-left: 10px; font-weight: 500; color: #334155;">Enable AI Assistant</span>
                        </label>
                    </div>

                    <div id="aiConfigInputs_view" style="display: ${isEnabled ? 'block' : 'none'}; padding-left: 20px; border-left: 3px solid #e2e8f0;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #475569;">LLM Provider</label>
                            <select id="aiProviderSelect_view" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc;">
                                <option value="google-gemini" ${provider === 'google-gemini' ? 'selected' : ''}>Google (Gemini Pro)</option>
                                <option value="openai-gpt4o" disabled>OpenAI (GPT-4o) - Coming Soon</option>
                                <option value="anthropic-claude35" disabled>Anthropic (Claude 3.5 Sonnet) - Coming Soon</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #475569;">API Key</label>
                            <div style="position: relative;">
                                <input type="password" id="aiApiKeyInput_view" value="${apiKey}" placeholder="Paste your API key here" 
                                       style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <p style="margin-top: 8px; font-size: 0.85rem; color: #64748b;">
                                Your key is stored locally in your browser. Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #2563eb;">Google AI Studio</a>.
                            </p>
                        </div>

                        <div class="alert-box" style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #92400e; font-size: 0.9rem;">
                                <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                                <strong>Note:</strong> Free-tier keys have rate limits. If you see "503 Model Overloaded", please wait a moment.
                            </p>
                        </div>
                    </div>

                    <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
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

            alert('AI Settings saved successfully!');
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SettingsView = SettingsView;
}
