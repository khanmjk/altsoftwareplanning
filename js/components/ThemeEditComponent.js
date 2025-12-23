/**
 * ThemeEditComponent
 * Encapsulates the logic for rendering and managing the Theme Edit list.
 * Modeled directly after ServiceEditComponent for consistent UX.
 */
class ThemeEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`ThemeEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        this._clearElement(container);
        // Reuse service-edit-list class for identical styling if available, 
        // or use management-list-container which mimics it.
        // Given the user wants "exact behavior", reusing the class structure is safest if CSS supports it.
        // However, management-view.css defines .management-item etc. 
        // Let's use the .management-* classes which I've already aligned to .service-* classes.
        container.className = 'theme-edit-list';

        if (!this.systemData.definedThemes) {
            this.systemData.definedThemes = [];
        }

        if (this.systemData.definedThemes.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'theme-edit-list-empty';
            emptyState.textContent = 'No themes defined yet.';
            container.appendChild(emptyState);
            return;
        }

        this.systemData.definedThemes.forEach((theme, index) => {
            if (!theme) return;
            container.appendChild(this._createThemeItem(theme, index));
        });
    }

    _createThemeItem(theme, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'theme-edit-item'; // Matches .service-edit-item
        itemDiv.setAttribute('data-theme-index', index);

        // Header
        const header = document.createElement('div');
        header.className = 'theme-edit-header'; // Matches .service-edit-header

        const indicator = document.createElement('span');
        indicator.className = 'theme-edit-indicator'; // Matches .service-edit-indicator
        indicator.innerText = (index === this.expandedIndex) ? '- ' : '+ ';

        const titleText = document.createElement('span');
        titleText.className = 'theme-edit-title';
        titleText.innerText = `Theme: ${theme.name || 'New Theme'}`;

        header.appendChild(indicator);
        header.appendChild(titleText);

        // Details Container
        const details = document.createElement('div');
        details.className = 'theme-edit-details'; // Matches .service-edit-details
        if (index === this.expandedIndex) {
            details.classList.add('expanded');
        }

        // Toggle Logic
        header.onclick = () => {
            const isExpanded = details.classList.contains('expanded');

            if (isExpanded) {
                details.classList.remove('expanded');
                indicator.innerText = '+ ';
                this.expandedIndex = -1;
            } else {
                // Collapse others? ServiceEditComponent doesn't seem to enforce single expansion explicitly in the toggle logic shown, 
                // but it sets this.expandedIndex. Let's stick to the behavior: expand one, close others if re-rendered, 
                // but here we are just toggling classes. 
                // To match ServiceEdit exactly, we should probably re-render or handle single expansion if that's the desired behavior.
                // ServiceEditComponent's toggle logic:
                // if (isExpanded) { ... expandedIndex = -1 } else { ... expandedIndex = index; _refreshLists... }
                // It doesn't auto-close others in the DOM immediately unless we re-render. 
                // But let's keep it simple: toggle this one.

                // If we want to close others, we'd need to query them. 
                // For now, let's just toggle.
                details.classList.add('expanded');
                indicator.innerText = '- ';
                this.expandedIndex = index;
            }
        };

        // --- Content Generation ---

        // Theme Name
        details.appendChild(this._createFormGroup('Theme Name', 'input', 'name', theme.name, index));

        // Theme Description
        details.appendChild(this._createFormGroup('Description', 'textarea', 'description', theme.description, index));

        // Action Buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'theme-edit-actions'; // Matches .service-edit-actions

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerText = 'Save Theme Changes';
        saveBtn.onclick = () => this._saveThemeChanges(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerText = 'Delete Theme';
        deleteBtn.onclick = () => this._deleteTheme(index);

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(deleteBtn);
        details.appendChild(actionsDiv);

        itemDiv.appendChild(header);
        itemDiv.appendChild(details);

        return itemDiv;
    }

    _createFormGroup(labelText, inputType, fieldName, value, index) {
        const group = document.createElement('div');
        group.className = 'theme-edit-form-group'; // Matches .service-edit-form-group

        const label = document.createElement('label');
        label.className = 'theme-edit-label'; // Matches .service-edit-label
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'theme-edit-textarea'; // Matches .service-edit-textarea
            input.rows = 3; // Slightly larger for description
        } else {
            input = document.createElement('input');
            input.className = 'theme-edit-input'; // Matches .service-edit-input
            input.type = 'text';
        }

        input.value = value || '';
        input.setAttribute('data-theme-index', index);
        input.setAttribute('data-field', fieldName);

        input.addEventListener('change', (e) => {
            const val = e.target.value;
            if (this.systemData.definedThemes[index]) {
                this.systemData.definedThemes[index][fieldName] = val;

                if (fieldName === 'name') {
                    const headerTitle = e.target.closest('.theme-edit-item').querySelector('.theme-edit-header .theme-edit-title');
                    if (headerTitle) headerTitle.innerText = `Theme: ${val || 'New Theme'}`;
                }
            }
        });

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    async _deleteTheme(index) {
        if (await notificationManager.confirm('Are you sure you want to delete this theme?', 'Delete Theme', { confirmStyle: 'danger' })) {
            this.systemData.definedThemes.splice(index, 1);

            // Save immediately as per ManagementView logic
            SystemService.save();

            this.render();
            notificationManager.showToast('Theme deleted.', 'success');
        }
    }

    _saveThemeChanges(index) {
        const theme = this.systemData.definedThemes[index];
        if (!theme.name || theme.name.trim() === '') {
            notificationManager.showToast('Theme name cannot be empty.', 'warning');
            return;
        }

        SystemService.save();
        notificationManager.showToast('Theme changes saved.', 'success');

        // No need to re-render entire list if we just saved, 
        // but if we want to ensure state consistency:
        // this.render(); 
        // However, re-rendering collapses the item unless we handle expandedIndex carefully.
        // Since we update the title on 'change', we might not need to re-render.
    }
}
