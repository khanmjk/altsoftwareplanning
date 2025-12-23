/**
 * InitiativeEditComponent
 * Encapsulates the logic for rendering and managing the Initiative Edit list.
 * Refactored to use ThemedSelect (including multi-select) and InitiativeService.
 */
class InitiativeEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
        this.draftInitiative = null;
        // Store references to ThemedSelect instances for retrieval
        this.selects = new Map();
    }

    startNewInitiative() {
        if (this.draftInitiative) {
            notificationManager.showToast('You already have an unsaved initiative.', 'warning');
            return;
        }

        this.draftInitiative = {
            initiativeId: 'init_' + Date.now(),
            title: 'New Initiative',
            status: 'Backlog',
            description: '',
            targetDueDate: '',
            themes: [],
            assignments: [],
            roi: {}
        };

        this.expandedIndex = 'draft';
        this.render();

        setTimeout(() => {
            const container = document.getElementById(this.containerId);
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`InitiativeEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        this._clearElement(container);
        container.className = 'initiative-edit-list';

        // Ensure we are working with fresh data if possible, but systemData is passed by ref.
        // Ideally we should re-fetch from SystemService if we want to be super safe, 
        // but the parent view passes it.
        if (!this.systemData.yearlyInitiatives) {
            this.systemData.yearlyInitiatives = [];
        }

        const hasItems = this.systemData.yearlyInitiatives.length > 0;
        const hasDraft = !!this.draftInitiative;

        if (!hasItems && !hasDraft) {
            const empty = document.createElement('p');
            empty.className = 'initiative-edit-list-empty';
            empty.textContent = 'No initiatives found. Click "Add Initiative" to create one.';
            container.appendChild(empty);
            return;
        }

        // Clear component-level select references on re-render
        this.selects.clear();

        // Render existing items
        this.systemData.yearlyInitiatives.forEach((init, index) => {
            if (!init) return;
            container.appendChild(this._createInitiativeItem(init, index));
        });

        // Render draft item if exists
        if (this.draftInitiative) {
            container.appendChild(this._createInitiativeItem(this.draftInitiative, 'draft'));
        }
    }

    _createInitiativeItem(init, index) {
        const isDraft = index === 'draft';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'initiative-edit-item';
        if (isDraft) itemDiv.classList.add('initiative-edit-item--draft');
        itemDiv.setAttribute('data-init-index', index);

        // Header
        const header = document.createElement('div');
        header.className = 'initiative-edit-header';

        const indicator = document.createElement('span');
        indicator.className = 'initiative-edit-indicator';
        indicator.innerText = (index === this.expandedIndex) ? '- ' : '+ ';

        const titleText = document.createElement('span');
        titleText.className = 'initiative-edit-title';
        titleText.innerText = init.title || 'New Initiative';
        if (isDraft) titleText.innerText += ' (Unsaved)';

        const statusPill = document.createElement('span');
        const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(' ', '-')}`;
        statusPill.className = `initiative-status-pill ${statusClass}`;
        statusPill.innerText = init.status || 'Backlog';

        header.appendChild(indicator);
        header.appendChild(titleText);
        header.appendChild(statusPill);

        // Details Container
        const details = document.createElement('div');
        details.className = 'initiative-edit-details';
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
                // Collapse others? Optional.
                this.render(); // Re-render to collapse others easily or just toggle class
                // Actually re-rendering is heavy. Let's just toggle.
                // But we need to update expandedIndex.
                // If we want accordion style:
                // this.expandedIndex = index;
                // this.render();
                // Let's stick to the previous pattern:
                this.expandedIndex = index;
                this.render();
                // Note: Re-rendering destroys local DOM state (focus), but it's okay for expanding/collapsing.
            }
        };

        // If not expanded, return early to save rendering cost? 
        // No, we need them in DOM for toggle animation usually, 
        // but here 'expanded' class likely controls display:none or height.
        // If we heavily re-render on toggle, we can skip building details if not expanded.
        if (index !== this.expandedIndex) {
            itemDiv.appendChild(header);
            // Append empty details so structure is consistent? Or just don't append.
            itemDiv.appendChild(details);
            return itemDiv;
        }

        // --- Content Generation (Only if Expanded) ---

        // 1. General Info
        details.appendChild(this._createFormGroup('Title', 'input', 'title', init.title, index));
        details.appendChild(this._createFormGroup('Description', 'textarea', 'description', init.description, index));

        const grid1 = document.createElement('div');
        grid1.className = 'initiative-edit-grid';

        const statusOptions = ['Backlog', 'Defined', 'Committed', 'In Progress', 'Completed'];
        grid1.appendChild(this._createSelectGroup('Status', 'status', init.status, statusOptions, index));

        grid1.appendChild(this._createFormGroup('Target Due Date', 'date', 'targetDueDate', init.targetDueDate, index));
        details.appendChild(grid1);

        // 2. Strategic Alignment
        // Themes (Multi-Select using ThemedSelect)
        const themesOptions = (this.systemData.definedThemes || []).map(t => ({ value: t.themeId, text: t.name }));
        details.appendChild(this._createMultiSelectGroup('Themes', 'themes', init.themes || [], themesOptions, index));

        const goalsOptions = [...(this.systemData.goals || []), ...(this.systemData.subGoals || [])]
            .map(g => ({ value: g.goalId, text: g.name || g.goalId }));
        details.appendChild(this._createSelectGroup('Primary Goal', 'primaryGoalId', init.primaryGoalId, goalsOptions, index, true));

        // 3. People
        const grid2 = document.createElement('div');
        grid2.className = 'initiative-edit-grid';

        const owners = [
            ...(this.systemData.sdms || []).map(p => ({ value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)` })),
            ...(this.systemData.pmts || []).map(p => ({ value: `pmt:${p.pmtId}`, text: `${p.pmtName} (PMT)` })),
            ...(this.systemData.seniorManagers || []).map(p => ({ value: `seniorManager:${p.seniorManagerId}`, text: `${p.seniorManagerName} (Sr Mgr)` }))
        ];
        const currentOwnerVal = init.owner ? `${init.owner.type}:${init.owner.id}` : '';
        grid2.appendChild(this._createSelectGroup('Owner', 'owner', currentOwnerVal, owners, index, true));

        const pms = (this.systemData.projectManagers || []).map(p => ({ value: `projectManager:${p.pmId}`, text: `${p.pmName} (PgM)` }));
        const currentPmVal = init.projectManager ? `${init.projectManager.type}:${init.projectManager.id}` : '';
        grid2.appendChild(this._createSelectGroup('Project Manager', 'projectManager', currentPmVal, pms, index, true));

        details.appendChild(grid2);

        // 4. Assignments (Collapsible)
        details.appendChild(this._createCollapsibleSection('Team Assignments', this._createAssignmentsContent(init, index)));

        // 5. ROI (Collapsible)
        details.appendChild(this._createCollapsibleSection('ROI Details', this._createROIContent(init, index)));

        // Action Buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'initiative-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerText = isDraft ? 'Create Initiative' : 'Save Changes';
        saveBtn.onclick = () => this._saveInitiative(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerText = isDraft ? 'Cancel' : 'Delete Initiative';
        deleteBtn.onclick = () => this._deleteInitiative(index);

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(deleteBtn);
        details.appendChild(actionsDiv);

        itemDiv.appendChild(header);
        itemDiv.appendChild(details);

        return itemDiv;
    }

    _createFormGroup(labelText, inputType, fieldName, value, index) {
        const group = document.createElement('div');
        group.className = 'initiative-edit-form-group';

        const label = document.createElement('label');
        label.className = 'initiative-edit-label';
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'initiative-edit-textarea';
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.className = 'initiative-edit-input';
            input.type = inputType;
        }

        input.value = value || '';
        input.setAttribute('data-init-index', index);
        input.setAttribute('data-field', fieldName);

        // Direct mutation for simple fields is mostly ok for the "live edit" feel, 
        // BUT we should avoid it if we want strict Service usage.
        // However, the Service Layer usually expects the whole object on "Save".
        // So we can mutate a local copy or the object reference in memory, 
        // and then send that to the Service on Save. This component seems to rely on mutating the reference.
        // We will keep the reference mutation for valid fields, and then call Service.update() on save.
        input.addEventListener('change', (e) => this._updateField(index, fieldName, e.target.value));

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _createSelectGroup(labelText, fieldName, selectedValue, options, index, hasNoneOption = false) {
        const group = document.createElement('div');
        group.className = 'initiative-edit-form-group';

        const label = document.createElement('label');
        label.className = 'initiative-edit-label';
        label.innerText = labelText;

        const selectOptions = [];
        if (hasNoneOption) {
            selectOptions.push({ value: '', text: '-- None --' });
        }
        options.forEach(opt => {
            const val = (typeof opt === 'string' ? opt : opt.value) || '';
            const text = (typeof opt === 'string' ? opt : opt.text) || '';
            selectOptions.push({ value: val, text: text });
        });

        // Unique ID for retrieval
        const id = `initiative-${index}-${fieldName.replace('.', '-')}`;

        const themedSelect = new ThemedSelect({
            options: selectOptions,
            value: selectedValue || '',
            id: id,
            onChange: (val) => {
                // Determine if this is Owner/PM which needs parsing
                let finalVal = val;
                if (fieldName === 'owner' || fieldName === 'projectManager') {
                    if (val) {
                        const [type, id] = val.split(':');
                        finalVal = { type, id };
                    } else {
                        finalVal = null;
                    }
                }
                this._updateField(index, fieldName, finalVal);
            }
        });

        // Store reference if needed (though we rely on onChange for live updates to the model ref)
        this.selects.set(id, themedSelect);

        group.appendChild(label);
        group.appendChild(themedSelect.render());
        return group;
    }

    _createMultiSelectGroup(labelText, fieldName, selectedValues, options, index) {
        const group = document.createElement('div');
        group.className = 'initiative-edit-form-group';

        const label = document.createElement('label');
        label.className = 'initiative-edit-label';
        label.innerText = labelText;

        const id = `initiative-${index}-${fieldName}`;

        const themedSelect = new ThemedSelect({
            options: options,
            value: selectedValues || [],
            id: id,
            multiple: true, // Enable Multi-Select
            onChange: (val) => {
                // val is array
                this._updateField(index, fieldName, val);
            }
        });

        this.selects.set(id, themedSelect);

        group.appendChild(label);
        group.appendChild(themedSelect.render());
        return group;
    }

    _createCollapsibleSection(titleText, contentNode) {
        const section = document.createElement('div');
        section.className = 'initiative-edit-section';

        const header = document.createElement('div');
        header.className = 'initiative-edit-section-header';

        const indicator = document.createElement('span');
        indicator.className = 'initiative-edit-indicator';
        indicator.innerText = '+ ';

        const title = document.createElement('h5');
        title.className = 'initiative-edit-section-title';
        title.innerText = titleText;

        header.appendChild(indicator);
        header.appendChild(title);

        const content = document.createElement('div');
        content.className = 'initiative-edit-section-content';
        content.appendChild(contentNode);

        header.onclick = () => {
            const isExpanded = content.classList.contains('expanded');
            if (isExpanded) {
                content.classList.remove('expanded');
                indicator.innerText = '+ ';
            } else {
                content.classList.add('expanded');
                indicator.innerText = '- ';
            }
        };

        section.appendChild(header);
        section.appendChild(content);
        return section;
    }

    _createAssignmentsContent(init, index) {
        const container = document.createElement('div');

        const list = document.createElement('div');
        list.className = 'initiative-assignments-list';

        const renderList = () => {
            this._clearElement(list);
            (init.assignments || []).forEach((a, aIdx) => {
                const team = (this.systemData.teams || []).find(t => t.teamId === a.teamId);
                const teamName = team ? (team.teamIdentity || team.teamName) : a.teamId;

                const item = document.createElement('div');
                item.className = 'initiative-assignment-item';

                const infoSpan = document.createElement('span');
                const teamStrong = document.createElement('strong');
                teamStrong.textContent = teamName;
                infoSpan.appendChild(teamStrong);
                infoSpan.appendChild(document.createTextNode(`: ${a.sdeYears} SDE Years`));
                item.appendChild(infoSpan);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger btn-sm';
                removeBtn.innerText = 'Remove';
                removeBtn.onclick = () => {
                    init.assignments.splice(aIdx, 1);
                    renderList();
                };

                item.appendChild(removeBtn);
                list.appendChild(item);
            });
            if (!init.assignments || init.assignments.length === 0) {
                const emptyMsg = document.createElement('em');
                emptyMsg.textContent = 'No teams assigned.';
                list.appendChild(emptyMsg);
            }
        };
        renderList();
        container.appendChild(list);

        // Add Controls
        const controls = document.createElement('div');
        controls.className = 'initiative-assignment-controls';

        // Build team options for ThemedSelect
        const teamOptions = [{ value: '', text: '-- Select Team --' }];
        (this.systemData.teams || []).forEach(t => {
            teamOptions.push({ value: t.teamId, text: t.teamIdentity || t.teamName });
        });

        const teamSelectContainer = document.createElement('div');
        teamSelectContainer.className = 'initiative-assignment-team-select';

        let selectedTeamId = '';
        const teamThemedSelect = new ThemedSelect({
            options: teamOptions,
            value: '',
            id: `assignment-team-${index}`,
            onChange: (val) => {
                selectedTeamId = val;
            }
        });
        teamSelectContainer.appendChild(teamThemedSelect.render());

        const sdeInput = document.createElement('input');
        sdeInput.type = 'number';
        sdeInput.className = 'initiative-edit-input initiative-assignment-sde';
        sdeInput.placeholder = 'SDE Years';
        sdeInput.step = '0.1';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-secondary';
        addBtn.innerText = 'Add';
        addBtn.onclick = () => {
            const teamId = selectedTeamId || teamThemedSelect.getValue();
            const sdeYears = parseFloat(sdeInput.value);
            if (!teamId || isNaN(sdeYears)) {
                notificationManager.showToast('Please select a team and enter valid SDE Years.', 'warning');
                return;
            }

            if (!init.assignments) init.assignments = [];
            // Check existing
            const existing = init.assignments.find(a => a.teamId === teamId);
            if (existing) {
                existing.sdeYears = sdeYears;
            } else {
                init.assignments.push({ teamId, sdeYears });
            }
            renderList();
            // Reset
            teamThemedSelect.setValue('');
            selectedTeamId = '';
            sdeInput.value = '';
        };

        controls.appendChild(teamSelectContainer);
        controls.appendChild(sdeInput);
        controls.appendChild(addBtn);
        container.appendChild(controls);

        return container;
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    _createROIContent(init, index) {
        const container = document.createElement('div');
        if (!init.roi) init.roi = {};
        const roi = init.roi;

        const grid = document.createElement('div');
        grid.className = 'initiative-edit-grid';

        // ROI Categories
        const categories = [
            'Revenue Generation', 'Cost Reduction', 'Risk Mitigation',
            'Compliance', 'Strategic Alignment', 'Innovation',
            'Tech Debt', 'Productivity/Efficiency', 'User Experience'
        ];
        grid.appendChild(this._createSelectGroup('Category', 'roi.category', roi.category, categories, index, true));

        // Value Type
        const valueTypes = ['Hard Savings', 'Soft Savings', 'Revenue', 'QualitativeScore', 'Narrative'];
        grid.appendChild(this._createSelectGroup('Value Type', 'roi.valueType', roi.valueType, valueTypes, index, true));

        // Estimated Value (Input) - Grid Row 2, Col 1
        grid.appendChild(this._createFormGroup('Estimated Value', 'input', 'roi.estimatedValue', roi.estimatedValue, index));

        // Currency - Grid Row 2, Col 2
        const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'INR'];
        grid.appendChild(this._createSelectGroup('Currency', 'roi.currency', roi.currency, currencies, index, true));

        container.appendChild(grid);

        const grid2 = document.createElement('div');
        grid2.className = 'initiative-edit-grid';

        // Time Horizon
        grid2.appendChild(this._createFormGroup('Time Horizon (Months)', 'number', 'roi.timeHorizon', roi.timeHorizon, index));

        // Confidence Level
        const confidenceLevels = ['High', 'Medium', 'Low'];
        grid2.appendChild(this._createSelectGroup('Confidence Level', 'roi.confidenceLevel', roi.confidenceLevel, confidenceLevels, index, true));

        container.appendChild(grid2);

        container.appendChild(this._createFormGroup('Calculation Methodology', 'textarea', 'roi.calculationMethodology', roi.calculationMethodology, index));

        return container;
    }

    _updateField(index, fieldName, value) {
        let init;
        if (index === 'draft') {
            init = this.draftInitiative;
        } else {
            init = this.systemData.yearlyInitiatives[index];
        }

        if (!init) return;

        if (fieldName.startsWith('roi.')) {
            const roiField = fieldName.split('.')[1];
            if (!init.roi) init.roi = {};
            init.roi[roiField] = value;
        } else {
            init[fieldName] = value;
        }

        // Live Header Update (Optional Visuals)
        if (fieldName === 'title' || fieldName === 'status') {
            const item = document.querySelector(`.initiative-edit-item[data-init-index="${index}"]`);
            if (item) {
                if (fieldName === 'title') {
                    let title = value || 'New Initiative';
                    if (index === 'draft') title += ' (Unsaved)';
                    const titleEl = item.querySelector('.initiative-edit-title');
                    if (titleEl) titleEl.innerText = title;
                }
                if (fieldName === 'status') {
                    const pill = item.querySelector('.initiative-status-pill');
                    if (pill) {
                        pill.className = `initiative-status-pill status-${(value || 'backlog').toLowerCase().replace(' ', '-')}`;
                        pill.innerText = value || 'Backlog';
                    }
                }
            }
        }
    }

    async _deleteInitiative(index) {
        if (index === 'draft') {
            this.draftInitiative = null;
            this.expandedIndex = -1;
            this.render();
            return;
        }

        if (await notificationManager.confirm('Are you sure you want to delete this initiative?', 'Delete Initiative', { confirmStyle: 'danger' })) {
            const init = this.systemData.yearlyInitiatives[index];
            if (init && init.initiativeId) {
                // Service Layer Call
                const success = InitiativeService.deleteInitiative(this.systemData, init.initiativeId);
                if (success) {
                    notificationManager.showToast(`Initiative "${init.title}" deleted.`, 'success');
                    // SystemService.save() is called inside InitiativeService
                    this.render();
                } else {
                    notificationManager.showToast(`Failed to delete initiative "${init.title}".`, 'error');
                }
            }
        }
    }

    _saveInitiative(index) {
        let init;
        if (index === 'draft') {
            init = this.draftInitiative;
        } else {
            init = this.systemData.yearlyInitiatives[index];
        }

        if (!init.title || init.title.trim() === '') {
            notificationManager.showToast('Title is required.', 'warning');
            return;
        }

        // Determine Planning Year
        if (!init.attributes) init.attributes = {};
        if (init.targetDueDate) {
            init.attributes.planningYear = new Date(init.targetDueDate).getFullYear();
        } else {
            init.attributes.planningYear = new Date().getFullYear();
        }

        if (index === 'draft') {
            // Service Layer: Add
            const success = InitiativeService.addInitiative(this.systemData, init);
            if (success) {
                this.draftInitiative = null;
                this.expandedIndex = -1;
                notificationManager.showToast(`Initiative "${init.title}" created successfully.`, 'success');
                this.render();
            } else {
                notificationManager.showToast(`Failed to create initiative "${init.title}".`, 'error');
            }
        } else {
            // Service Layer: Update
            const success = InitiativeService.updateInitiative(this.systemData, init.initiativeId, init);
            if (success) {
                notificationManager.showToast(`Initiative "${init.title}" updated successfully.`, 'success');
                // Typically, the list might need re-rendering if sorting changed, but we can just leave it.
            } else {
                notificationManager.showToast(`Failed to update initiative "${init.title}".`, 'error');
            }
        }
    }
}
