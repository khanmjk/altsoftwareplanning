/**
 * SettingsView Component
 * Displays application settings with tabbed navigation
 * Handles General, AI Assistant, and Appearance configuration
 */
class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pillNav = null;
        this.activeTab = 'general';

        this.tabs = [
            { id: 'general', label: 'General', icon: 'fas fa-sliders-h' },
            { id: 'ai', label: 'AI Assistant', icon: 'fas fa-robot' },
            { id: 'appearance', label: 'Appearance', icon: 'fas fa-palette' }
        ];
    }

    /**
     * Render the settings view
     */
    render() {
        if (!this.container) return;

        // 1. Set Workspace Metadata
        workspaceComponent.setPageMetadata({
            title: 'System Settings',
            breadcrumbs: ['System', 'Settings'],
            actions: []
        });

        // 2. Set Workspace Toolbar (Pill Navigation)
        this.pillNav = new PillNavigationComponent({
            items: this.tabs,
            onSwitch: (tabId) => this.switchTab(tabId)
        });

        workspaceComponent.setToolbar(this.pillNav.render());

        // 3. Clear and create content structure using DOM
        this.container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-view-container workspace-view';

        // Create tab containers
        const generalTabContainer = document.createElement('div');
        generalTabContainer.id = 'general';
        generalTabContainer.className = 'settings-tab-content';
        generalTabContainer.style.display = 'none';
        wrapper.appendChild(generalTabContainer);

        const aiTabContainer = document.createElement('div');
        aiTabContainer.id = 'ai';
        aiTabContainer.className = 'settings-tab-content';
        aiTabContainer.style.display = 'none';
        wrapper.appendChild(aiTabContainer);

        const appearanceTabContainer = document.createElement('div');
        appearanceTabContainer.id = 'appearance';
        appearanceTabContainer.className = 'settings-tab-content';
        appearanceTabContainer.style.display = 'none';
        wrapper.appendChild(appearanceTabContainer);

        this.container.appendChild(wrapper);

        // 4. Render tab content
        this.renderGeneralTab(generalTabContainer);
        this.renderAiTab(aiTabContainer);
        this.renderAppearanceTab(appearanceTabContainer);

        // 5. Show Active Tab
        this.switchTab(this.activeTab);

        // 6. Bind Events
        this.bindEvents();
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - Tab identifier ('general', 'ai', or 'appearance')
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

        // Appearance tab events
        const themeForm = document.getElementById('themeSettingsForm_view');
        if (themeForm) {
            themeForm.addEventListener('submit', this.handleThemeApply.bind(this));
        }

        const randomBtn = document.getElementById('randomThemeBtn_view');
        if (randomBtn) {
            randomBtn.addEventListener('click', this.handleRandomTheme.bind(this));
        }

        // Note: Live preview is now handled by ThemedSelect onChange callback
    }

    /**
     * Render General settings tab using DOM creation
     * @param {HTMLElement} container - Container element to render into
     */
    renderGeneralTab(container) {
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

        // Create section
        const section = this.createSection('Application Data');

        // Reset card
        const resetCard = this.createSettingsCard();
        const resetRow = this.createSettingsRow();

        const resetInfo = document.createElement('div');
        const resetTitle = document.createElement('h4');
        resetTitle.className = 'settings-item-title';
        resetTitle.textContent = 'Reset to Defaults';
        const resetDesc = document.createElement('p');
        resetDesc.className = 'settings-item-desc';
        resetDesc.textContent = 'Clear all local data and restore the sample dataset.';
        resetInfo.appendChild(resetTitle);
        resetInfo.appendChild(resetDesc);

        const resetButton = document.createElement('button');
        resetButton.className = 'btn btn-secondary';
        resetButton.setAttribute('data-action', 'reset');
        const resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-undo';
        resetButton.appendChild(resetIcon);
        resetButton.appendChild(document.createTextNode(' Reset'));

        resetRow.appendChild(resetInfo);
        resetRow.appendChild(resetButton);
        resetCard.appendChild(resetRow);
        section.appendChild(resetCard);

        // Delete card
        const deleteCard = this.createSettingsCard();
        const deleteRow = this.createSettingsRow();

        const deleteInfo = document.createElement('div');
        const deleteTitle = document.createElement('h4');
        deleteTitle.className = 'settings-item-title danger';
        deleteTitle.textContent = 'Delete Current System';
        const deleteDesc = document.createElement('p');
        deleteDesc.className = 'settings-item-desc';
        deleteDesc.textContent = deleteButtonTitle;
        deleteInfo.appendChild(deleteTitle);
        deleteInfo.appendChild(deleteDesc);

        const deleteButton = document.createElement('button');
        deleteButton.className = `btn btn-danger ${canDelete ? 'enabled' : ''}`;
        deleteButton.setAttribute('data-action', 'delete');
        deleteButton.disabled = !canDelete;
        deleteButton.title = deleteButtonTitle;
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash-alt';
        deleteButton.appendChild(deleteIcon);
        deleteButton.appendChild(document.createTextNode(' Delete'));

        deleteRow.appendChild(deleteInfo);
        deleteRow.appendChild(deleteButton);
        deleteCard.appendChild(deleteRow);
        section.appendChild(deleteCard);

        container.appendChild(section);
    }

    /**
     * Render AI Assistant settings tab using DOM creation
     * @param {HTMLElement} container - Container element to render into
     */
    renderAiTab(container) {
        const isEnabled = SettingsService.get()?.ai?.isEnabled || false;
        const provider = SettingsService.get()?.ai?.provider || 'google-gemini';
        const apiKey = SettingsService.get()?.ai?.apiKey || '';

        // Create section
        const section = this.createSection('AI Assistant Configuration');

        // Create form
        const form = document.createElement('form');
        form.id = 'aiSettingsForm_view';

        // Enable toggle card
        const toggleCard = this.createSettingsCard();
        const toggleGroup = this.createFormGroup();
        toggleGroup.style.marginBottom = '0';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.id = 'aiModeEnabled_view';
        toggleInput.checked = isEnabled;

        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'toggle-label';
        toggleSpan.textContent = 'Enable AI Assistant';

        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSpan);
        toggleGroup.appendChild(toggleLabel);
        toggleCard.appendChild(toggleGroup);
        form.appendChild(toggleCard);

        // Config inputs wrapper
        const configWrapper = document.createElement('div');
        configWrapper.id = 'aiConfigInputs_view';
        configWrapper.className = `settings-sub-section-wrapper ${isEnabled ? '' : 'hidden'}`;

        const configCard = this.createSettingsCard();

        // Provider select - use container for ThemedSelect
        const providerGroup = this.createFormGroup();
        const providerLabel = document.createElement('label');
        providerLabel.className = 'settings-label';
        providerLabel.textContent = 'LLM Provider';

        const providerContainer = document.createElement('div');
        providerContainer.id = 'aiProviderSelectContainer_view';

        const options = [
            { value: 'google-gemini', text: 'Google (Gemini Pro)' },
            { value: 'openai-gpt4o', text: 'OpenAI (GPT-4o) - Coming Soon' },
            { value: 'anthropic-claude35', text: 'Anthropic (Claude 3.5 Sonnet) - Coming Soon' }
        ];

        this._providerSelect = new ThemedSelect({
            options: options,
            value: provider,
            id: 'aiProviderSelect_view',
            onChange: () => { } // No immediate action needed
        });

        providerContainer.appendChild(this._providerSelect.render());
        providerGroup.appendChild(providerLabel);
        providerGroup.appendChild(providerContainer);
        configCard.appendChild(providerGroup);

        // API Key input
        const keyGroup = this.createFormGroup();
        const keyLabel = document.createElement('label');
        keyLabel.className = 'settings-label';
        keyLabel.textContent = 'API Key';

        const keyWrapper = document.createElement('div');
        keyWrapper.className = 'settings-input-wrapper';

        const keyInput = document.createElement('input');
        keyInput.type = 'password';
        keyInput.id = 'aiApiKeyInput_view';
        keyInput.value = apiKey;
        keyInput.placeholder = 'Paste your API key here';
        keyInput.className = 'settings-input';

        keyWrapper.appendChild(keyInput);

        const helperText = document.createElement('p');
        helperText.className = 'settings-helper-text';
        helperText.textContent = 'Your key is stored locally in your browser. Get a free key from ';

        const link = document.createElement('a');
        link.href = 'https://aistudio.google.com/app/apikey';
        link.target = '_blank';
        link.className = 'settings-link';
        link.textContent = 'Google AI Studio';
        helperText.appendChild(link);
        helperText.appendChild(document.createTextNode('.'));

        keyGroup.appendChild(keyLabel);
        keyGroup.appendChild(keyWrapper);
        keyGroup.appendChild(helperText);
        configCard.appendChild(keyGroup);

        // Alert
        const alert = document.createElement('div');
        alert.className = 'settings-alert';
        const alertP = document.createElement('p');
        const alertIcon = document.createElement('i');
        alertIcon.className = 'fas fa-exclamation-triangle';
        alertP.appendChild(alertIcon);
        alertP.appendChild(document.createTextNode(' '));
        const alertStrong = document.createElement('strong');
        alertStrong.textContent = 'Note:';
        alertP.appendChild(alertStrong);
        alertP.appendChild(document.createTextNode(' Free-tier keys have rate limits. If you see "503 Model Overloaded", please wait a moment.'));
        alert.appendChild(alertP);
        configCard.appendChild(alert);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'settings-actions';
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Save Changes';
        actionsDiv.appendChild(submitBtn);
        configCard.appendChild(actionsDiv);

        configWrapper.appendChild(configCard);
        form.appendChild(configWrapper);
        section.appendChild(form);
        container.appendChild(section);
    }

    /**
     * Render Appearance settings tab using DOM creation
     * @param {HTMLElement} container - Container element to render into
     */
    renderAppearanceTab(container) {
        const currentTheme = ThemeService.getCurrentTheme();
        const themeList = ThemeService.getThemeList();

        // Create section
        const section = this.createSection('Theme Configuration');

        // Create form
        const form = document.createElement('form');
        form.id = 'themeSettingsForm_view';

        const themeCard = this.createSettingsCard();

        // Current theme indicator
        const currentThemeGroup = this.createFormGroup();
        const currentLabel = document.createElement('label');
        currentLabel.className = 'settings-label';
        currentLabel.textContent = 'Current Theme';

        const currentValue = document.createElement('div');
        currentValue.className = 'settings-current-value';
        currentValue.id = 'currentThemeDisplay_view';
        currentValue.textContent = themeList.find(t => t.id === currentTheme)?.name || 'Light Mode';

        currentThemeGroup.appendChild(currentLabel);
        currentThemeGroup.appendChild(currentValue);
        themeCard.appendChild(currentThemeGroup);

        // Theme selector
        const selectorGroup = this.createFormGroup();
        const selectorLabel = document.createElement('label');
        selectorLabel.className = 'settings-label';
        selectorLabel.textContent = 'Select Theme';

        const themeContainer = document.createElement('div');
        themeContainer.id = 'themeSelectContainer_view';

        const themeOptions = themeList.map(theme => ({
            value: theme.id,
            text: theme.name
        }));

        this._themeSelect = new ThemedSelect({
            options: themeOptions,
            value: currentTheme,
            id: 'themeSelect_view',
            onChange: (value) => {
                // Live preview - apply theme but don't persist
                ThemeService.applyTheme(value, false);
            }
        });

        themeContainer.appendChild(this._themeSelect.render());
        selectorGroup.appendChild(selectorLabel);
        selectorGroup.appendChild(themeContainer);
        themeCard.appendChild(selectorGroup);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'settings-actions';
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '10px';

        const applyBtn = document.createElement('button');
        applyBtn.type = 'submit';
        applyBtn.className = 'btn btn-primary';
        applyBtn.textContent = 'Apply Theme';

        const randomBtn = document.createElement('button');
        randomBtn.type = 'button';
        randomBtn.id = 'randomThemeBtn_view';
        randomBtn.className = 'btn btn-secondary';
        const randomIcon = document.createElement('i');
        randomIcon.className = 'fas fa-random';
        randomBtn.appendChild(randomIcon);
        randomBtn.appendChild(document.createTextNode(' Generate Random Theme'));

        actionsDiv.appendChild(applyBtn);
        actionsDiv.appendChild(randomBtn);
        themeCard.appendChild(actionsDiv);

        form.appendChild(themeCard);
        section.appendChild(form);
        container.appendChild(section);
    }

    /**
     * Helper: Create a settings section
     * @param {string} title - Section title
     * @returns {HTMLElement}
     */
    createSection(title) {
        const section = document.createElement('div');
        section.className = 'settings-section';

        const heading = document.createElement('h3');
        heading.className = 'settings-section-title';
        heading.textContent = title;
        section.appendChild(heading);

        return section;
    }

    /**
     * Helper: Create a settings card
     * @returns {HTMLElement}
     */
    createSettingsCard() {
        const card = document.createElement('div');
        card.className = 'settings-item-card';
        return card;
    }

    /**
     * Helper: Create a settings row
     * @returns {HTMLElement}
     */
    createSettingsRow() {
        const row = document.createElement('div');
        row.className = 'settings-row';
        return row;
    }

    /**
     * Helper: Create a form group
     * @returns {HTMLElement}
     */
    createFormGroup() {
        const group = document.createElement('div');
        group.className = 'settings-form-group';
        return group;
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
        const provider = this._providerSelect?.getValue() || 'google-gemini';
        const apiKey = document.getElementById('aiApiKeyInput_view').value;

        // Use SettingsService to update and save
        SettingsService.update({
            ai: {
                isEnabled: enabled,
                provider: provider,
                apiKey: apiKey
            }
        });

        // Update UI
        headerComponent.updateAiButtonVisibility();

        notificationManager.showToast('AI Settings saved successfully!', 'success');
    }

    /**
     * Handle theme application
     * @param {Event} event - Submit event
     */
    handleThemeApply(event) {
        event.preventDefault();

        const selectedTheme = this._themeSelect?.getValue() || ThemeService.getCurrentTheme();

        ThemeService.applyTheme(selectedTheme);

        // Update current theme display
        const currentDisplay = document.getElementById('currentThemeDisplay_view');
        if (currentDisplay) {
            const themeList = ThemeService.getThemeList();
            currentDisplay.textContent = themeList.find(t => t.id === selectedTheme)?.name || selectedTheme;
        }

        notificationManager.showToast('Theme applied successfully!', 'success');
    }

    /**
     * Handle theme preview on selection change
     * @param {Event} event - Change event
     */
    handleThemeChange(event) {
        const themeId = event.target.value;
        // Apply theme but DO NOT persist settings yet
        ThemeService.applyTheme(themeId, false);
    }

    /**
     * Handle random theme generation
     */
    handleRandomTheme() {
        const randomTheme = ThemeService.generateRandomTheme();

        // Preview random theme (do not persist)
        ThemeService.applyTheme(randomTheme.id, false);

        // Update the ThemedSelect with the new random theme option
        const themeContainer = document.getElementById('themeSelectContainer_view');
        const currentDisplay = document.getElementById('currentThemeDisplay_view');

        if (themeContainer && this._themeSelect) {
            // Get current theme list and add the random theme
            const themeList = ThemeService.getThemeList();
            const allThemes = [...themeList];

            // Add random theme if not already in list
            if (!allThemes.find(t => t.id === randomTheme.id)) {
                allThemes.push({ id: randomTheme.id, name: randomTheme.name });
            }

            // Rebuild ThemedSelect with updated options
            const themeOptions = allThemes.map(theme => ({
                value: theme.id,
                text: theme.name
            }));

            // Clear container and rebuild ThemedSelect
            themeContainer.innerHTML = '';
            this._themeSelect = new ThemedSelect({
                options: themeOptions,
                value: randomTheme.id,
                id: 'themeSelect_view',
                onChange: (value) => {
                    ThemeService.applyTheme(value, false);
                }
            });
            themeContainer.appendChild(this._themeSelect.render());
        }

        notificationManager.showToast('Random theme generated (Preview)', 'info');
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
            hasSystemLoaded: !!SystemService.getCurrentSystem(),
            currentTheme: ThemeService.getCurrentTheme()
        };
    }
}
