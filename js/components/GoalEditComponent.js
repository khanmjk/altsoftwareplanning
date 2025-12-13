/**
 * GoalEditComponent
 * Encapsulates the logic for rendering and managing the Strategic Goals list.
 * Modeled after InitiativeEditComponent for consistent UX.
 */
class GoalEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
        this.draftGoal = null; // New property for draft mode
    }

    startNewGoal() {
        if (this.draftGoal) {
            notificationManager.showToast('You already have an unsaved goal.', 'warning');
            return;
        }

        this.draftGoal = {
            goalId: 'goal-' + Date.now(),
            name: 'New Strategic Goal',
            description: '',
            strategyLink: '',
            owner: null,
            projectManager: null,
            technicalPOC: null,
            initiativeIds: [],
            attributes: {},
            dueDate: null
        };

        this.expandedIndex = 'draft'; // Special index for draft
        this.render();

        // Scroll to bottom
        setTimeout(() => {
            const container = document.getElementById(this.containerId);
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`GoalEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        container.innerHTML = '';
        container.className = 'inline-edit-list';

        if (!this.systemData.goals) {
            this.systemData.goals = [];
        }

        const hasItems = this.systemData.goals.length > 0;
        const hasDraft = !!this.draftGoal;

        if (!hasItems && !hasDraft) {
            container.innerHTML = '<p class="inline-edit-list-empty">No strategic goals defined. Click "Add Goal" to create one.</p>';
            return;
        }

        // Render existing items
        this.systemData.goals.forEach((goal, index) => {
            container.appendChild(this._createGoalItem(goal, index));
        });

        // Render draft item if exists
        if (this.draftGoal) {
            container.appendChild(this._createGoalItem(this.draftGoal, 'draft'));
        }
    }

    _createGoalItem(goal, index) {
        const isDraft = index === 'draft';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inline-edit-item';
        itemDiv.setAttribute('data-goal-index', index);

        // Header
        const header = document.createElement('div');
        header.className = 'inline-edit-header';

        const indicator = document.createElement('span');
        indicator.className = 'inline-edit-indicator';
        indicator.innerText = (index === this.expandedIndex) ? '- ' : '+ ';

        const titleText = document.createElement('span');
        titleText.className = 'inline-edit-title';
        titleText.innerText = goal.name || 'New Goal';
        if (isDraft) titleText.innerText += ' (Unsaved)';

        header.appendChild(indicator);
        header.appendChild(titleText);

        // Details Container
        const details = document.createElement('div');
        details.className = 'inline-edit-details';
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
                details.classList.add('expanded');
                indicator.innerText = '- ';
                this.expandedIndex = index;
            }
        };

        // --- Content Generation ---

        // 1. General Info
        details.appendChild(this._createFormGroup('Goal Name', 'input', 'name', goal.name, index));
        details.appendChild(this._createFormGroup('Description', 'textarea', 'description', goal.description, index));
        details.appendChild(this._createFormGroup('Strategy Link (URL)', 'url', 'strategyLink', goal.strategyLink, index));
        details.appendChild(this._createFormGroup('Due Date', 'date', 'dueDate', goal.dueDate, index));

        // 2. People
        const grid = document.createElement('div');
        grid.className = 'inline-edit-grid';

        const owners = [
            ...(this.systemData.seniorManagers || []).map(p => ({ value: `seniorManager:${p.seniorManagerId}`, text: `${p.seniorManagerName} (Sr Mgr)` })),
            ...(this.systemData.sdms || []).map(p => ({ value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)` })),
            ...(this.systemData.pmts || []).map(p => ({ value: `pmt:${p.pmtId}`, text: `${p.pmtName} (PMT)` }))
        ];
        const currentOwnerVal = goal.owner ? `${goal.owner.type}:${goal.owner.id}` : '';
        grid.appendChild(this._createSelectGroup('Owner', 'owner', currentOwnerVal, owners, index, true));

        const pms = (this.systemData.projectManagers || []).map(p => ({ value: `projectManager:${p.pmId}`, text: `${p.pmName} (PgM)` }));
        const currentPmVal = goal.projectManager ? `${goal.projectManager.type}:${goal.projectManager.id}` : '';
        grid.appendChild(this._createSelectGroup('Project Manager', 'projectManager', currentPmVal, pms, index, true));

        const tpocs = (this.systemData.sdms || []).map(p => ({ value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)` }));
        const currentTpocVal = goal.technicalPOC ? `${goal.technicalPOC.type}:${goal.technicalPOC.id}` : '';
        grid.appendChild(this._createSelectGroup('Technical POC', 'technicalPOC', currentTpocVal, tpocs, index, true));

        details.appendChild(grid);

        // 3. Strategic Context (Themes & ROI)
        const contextGrid = document.createElement('div');
        contextGrid.className = 'inline-edit-grid';

        // Related Themes (Dynamic - Derived from Linked Initiatives)
        // Logic: Find all linked initiatives -> collect their themes -> unique list
        const linkedInitiatives = (this.systemData.yearlyInitiatives || []).filter(i => (goal.initiativeIds || []).includes(i.initiativeId));

        const uniqueThemeIds = new Set();
        linkedInitiatives.forEach(init => {
            if (init.themes && Array.isArray(init.themes)) {
                init.themes.forEach(tId => uniqueThemeIds.add(tId));
            }
        });

        const relatedThemes = (this.systemData.definedThemes || []).filter(t => uniqueThemeIds.has(t.themeId));

        const themesList = relatedThemes.length > 0
            ? relatedThemes.map(t => `<span class="goal-theme-tag">${t.name}</span>`).join('')
            : '<span class="text-muted">No themes linked via initiatives.</span>';

        const themesDiv = document.createElement('div');
        themesDiv.className = 'inline-edit-form-group';
        themesDiv.innerHTML = `<label class="inline-edit-label">Related Themes (via Initiatives)</label><div class="inline-edit-static-value">${themesList}</div>`;
        contextGrid.appendChild(themesDiv);

        // Aggregated ROI (Read-Only)
        let roiSummary = 'No linked initiatives.';

        if (linkedInitiatives.length > 0) {
            const roiMap = {};
            linkedInitiatives.forEach(init => {
                if (init.roi && init.roi.category) {
                    if (!roiMap[init.roi.category]) roiMap[init.roi.category] = 0;
                    roiMap[init.roi.category]++;
                }
            });

            const roiParts = Object.entries(roiMap).map(([cat, count]) => `${count} ${cat}`);
            if (roiParts.length > 0) {
                roiSummary = roiParts.join(', ');
            } else {
                roiSummary = `${linkedInitiatives.length} initiatives (No ROI data)`;
            }
        }

        const roiDiv = document.createElement('div');
        roiDiv.className = 'inline-edit-form-group';
        roiDiv.innerHTML = `<label class="inline-edit-label">Aggregated ROI Impact</label><div class="inline-edit-static-value"><strong>${roiSummary}</strong></div>`;
        contextGrid.appendChild(roiDiv);

        details.appendChild(contextGrid);

        // 4. Linked Initiatives
        const initiativesOptions = (this.systemData.yearlyInitiatives || [])
            .map(i => ({ value: i.initiativeId, text: i.title || 'Untitled Initiative' }));

        // Ensure goal.initiativeIds is initialized
        if (!goal.initiativeIds) goal.initiativeIds = [];

        details.appendChild(this._createMultiSelectGroup('Linked Initiatives', 'initiativeIds', goal.initiativeIds, initiativesOptions, index));

        // Action Buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'inline-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerText = isDraft ? 'Create Goal' : 'Save Changes';
        saveBtn.onclick = () => this._saveGoal(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerText = isDraft ? 'Cancel' : 'Delete Goal';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.onclick = () => this._deleteGoal(index);

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(deleteBtn);
        details.appendChild(actionsDiv);

        itemDiv.appendChild(header);
        itemDiv.appendChild(details);

        return itemDiv;
    }

    _createFormGroup(labelText, inputType, fieldName, value, index) {
        const group = document.createElement('div');
        group.className = 'inline-edit-form-group';

        const label = document.createElement('label');
        label.className = 'inline-edit-label';
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'inline-edit-textarea';
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.className = 'inline-edit-input';
            input.type = inputType;
        }

        input.value = value || '';
        input.setAttribute('data-goal-index', index);
        input.setAttribute('data-field', fieldName);

        input.addEventListener('change', (e) => this._updateField(index, fieldName, e.target.value));

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _createSelectGroup(labelText, fieldName, selectedValue, options, index, hasNoneOption = false) {
        const group = document.createElement('div');
        group.className = 'inline-edit-form-group';

        const label = document.createElement('label');
        label.className = 'inline-edit-label';
        label.innerText = labelText;

        // Build options array for ThemedSelect
        const selectOptions = [];
        if (hasNoneOption) {
            selectOptions.push({ value: '', text: '-- None --' });
        }
        options.forEach(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.text;
            selectOptions.push({ value: val, text: text });
        });

        const selectContainer = document.createElement('div');
        selectContainer.className = 'inline-edit-select-container';

        const themedSelect = new ThemedSelect({
            options: selectOptions,
            value: selectedValue || '',
            id: `goal-${index}-${fieldName}`,
            onChange: (val) => {
                // Handle Person special parsing
                if (['owner', 'projectManager', 'technicalPOC'].includes(fieldName)) {
                    if (val) {
                        const [type, id] = val.split(':');
                        val = { type, id };
                    } else {
                        val = null;
                    }
                }
                this._updateField(index, fieldName, val);
            }
        });

        selectContainer.appendChild(themedSelect.render());
        group.appendChild(label);
        group.appendChild(selectContainer);
        return group;
    }

    _createMultiSelectGroup(labelText, fieldName, selectedValues, options, index) {
        const group = document.createElement('div');
        group.className = 'inline-edit-form-group';

        const label = document.createElement('label');
        label.className = 'inline-edit-label';
        label.innerText = labelText;

        const select = document.createElement('select');
        select.className = 'inline-edit-select';
        select.multiple = true;
        select.size = 6; // Slightly larger for better visibility

        options.forEach(opt => {
            const option = new Option(opt.text, opt.value);
            if (selectedValues.includes(opt.value)) option.selected = true;
            select.appendChild(option);
        });

        const helpText = document.createElement('small');
        helpText.style.color = 'var(--theme-text-muted)';
        helpText.style.display = 'block';
        helpText.style.marginTop = '4px';
        helpText.innerText = 'Hold Ctrl/Cmd to select multiple initiatives';

        select.addEventListener('change', (e) => {
            const values = Array.from(e.target.selectedOptions).map(o => o.value);
            this._updateField(index, fieldName, values);
        });

        group.appendChild(label);
        group.appendChild(select);
        group.appendChild(helpText);
        return group;
    }

    _updateField(index, fieldName, value) {
        let goal;
        if (index === 'draft') {
            goal = this.draftGoal;
        } else {
            goal = this.systemData.goals[index];
        }

        if (!goal) return;

        if (fieldName === 'initiativeIds') {
            // Sync logic: Update initiatives' primaryGoalId
            const oldIds = goal.initiativeIds || [];
            const newIds = value;

            // Find added
            const addedIds = newIds.filter(id => !oldIds.includes(id));
            // Find removed
            const removedIds = oldIds.filter(id => !newIds.includes(id));

            // Update added initiatives
            addedIds.forEach(initId => {
                const init = (this.systemData.yearlyInitiatives || []).find(i => i.initiativeId === initId);
                if (init) {
                    init.primaryGoalId = goal.goalId;
                }
            });

            // Update removed initiatives
            removedIds.forEach(initId => {
                const init = (this.systemData.yearlyInitiatives || []).find(i => i.initiativeId === initId);
                if (init && init.primaryGoalId === goal.goalId) {
                    init.primaryGoalId = null;
                }
            });

            goal.initiativeIds = newIds;

            // Re-render to update Derived Themes and ROI
            // We need to save the expanded state or just re-render the item content?
            // For simplicity, let's re-render the whole list but keep expanded index
            this.render();

        } else {
            goal[fieldName] = value;
        }

        // Update Header if Name changed
        if (fieldName === 'name') {
            const item = document.querySelector(`.inline-edit-item[data-goal-index="${index}"]`);
            if (item) {
                let title = value || 'New Goal';
                if (index === 'draft') title += ' (Unsaved)';
                item.querySelector('.inline-edit-title').innerText = title;
            }
        }
    }

    async _deleteGoal(index) {
        if (index === 'draft') {
            this.draftGoal = null;
            this.expandedIndex = -1;
            this.render();
            return;
        }

        if (await notificationManager.confirm('Are you sure you want to delete this goal?', 'Delete Goal', { confirmStyle: 'danger' })) {
            const goal = this.systemData.goals[index];

            // Unlink initiatives
            if (goal && goal.initiativeIds) {
                goal.initiativeIds.forEach(initId => {
                    const init = (this.systemData.yearlyInitiatives || []).find(i => i.initiativeId === initId);
                    if (init && init.primaryGoalId === goal.goalId) {
                        init.primaryGoalId = null;
                    }
                });
            }

            this.systemData.goals.splice(index, 1);
            SystemService.save();
            this.render();
            notificationManager.showToast('Goal deleted.', 'success');
        }
    }

    _saveGoal(index) {
        let goal;
        if (index === 'draft') {
            goal = this.draftGoal;
        } else {
            goal = this.systemData.goals[index];
        }

        if (!goal.name || goal.name.trim() === '') {
            notificationManager.showToast('Goal Name is required.', 'warning');
            return;
        }

        if (index === 'draft') {
            // Commit draft
            this.systemData.goals.push(goal);
            this.draftGoal = null;
            this.expandedIndex = -1;
            notificationManager.showToast('Goal created successfully.', 'success');
            this.render();
        } else {
            notificationManager.showToast('Goal saved successfully.', 'success');
        }

        SystemService.save();
    }
}
