/**
 * InitiativeEditComponent
 * Encapsulates the logic for rendering and managing the Initiative Edit list.
 * Modeled after ServiceEditComponent and ThemeEditComponent for consistent UX.
 */
class InitiativeEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
        this.draftInitiative = null; // New property for draft mode
    }

    startNewInitiative() {
        if (this.draftInitiative) {
            window.notificationManager.showToast('You already have an unsaved initiative.', 'warning');
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
            console.error(`InitiativeEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        container.innerHTML = '';
        container.className = 'initiative-edit-list';

        if (!this.systemData.yearlyInitiatives) {
            this.systemData.yearlyInitiatives = [];
        }

        const hasItems = this.systemData.yearlyInitiatives.length > 0;
        const hasDraft = !!this.draftInitiative;

        if (!hasItems && !hasDraft) {
            container.innerHTML = '<p class="initiative-edit-list-empty">No initiatives found. Click "Add Initiative" to create one.</p>';
            return;
        }

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
        if (isDraft) itemDiv.classList.add('initiative-edit-item--draft'); // Optional styling
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
                details.classList.add('expanded');
                indicator.innerText = '- ';
                this.expandedIndex = index;
            }
        };

        // --- Content Generation ---

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
        const themesOptions = (this.systemData.definedThemes || []).map(t => ({ value: t.themeId, text: t.name }));
        details.appendChild(this._createMultiSelectGroup('Themes', 'themes', init.themes || [], themesOptions, index));

        const goalsOptions = [...(this.systemData.strategicGoals || []), ...(this.systemData.subGoals || [])]
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

        const tpms = (this.systemData.tpms || []).map(p => ({ value: `tpm:${p.tpmId}`, text: `${p.tpmName} (TPM)` }));
        const currentPmVal = init.projectManager ? `${init.projectManager.type}:${init.projectManager.id}` : '';
        grid2.appendChild(this._createSelectGroup('Project Manager', 'projectManager', currentPmVal, tpms, index, true));

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
        deleteBtn.style.marginLeft = '10px';
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

        const select = document.createElement('select');
        select.className = 'initiative-edit-select';

        if (hasNoneOption) {
            select.appendChild(new Option('-- None --', ''));
        }

        options.forEach(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.text;
            const option = new Option(text, val);
            if (val === selectedValue) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            let val = e.target.value;
            // Handle Owner/PM special parsing
            if (fieldName === 'owner' || fieldName === 'projectManager') {
                if (val) {
                    const [type, id] = val.split(':');
                    val = { type, id };
                } else {
                    val = null;
                }
            }
            this._updateField(index, fieldName, val);
        });

        group.appendChild(label);
        group.appendChild(select);
        return group;
    }

    _createMultiSelectGroup(labelText, fieldName, selectedValues, options, index) {
        const group = document.createElement('div');
        group.className = 'initiative-edit-form-group';

        const label = document.createElement('label');
        label.className = 'initiative-edit-label';
        label.innerText = labelText;

        const select = document.createElement('select');
        select.className = 'initiative-edit-select';
        select.multiple = true;
        select.size = 4;

        options.forEach(opt => {
            const option = new Option(opt.text, opt.value);
            if (selectedValues.includes(opt.value)) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            const values = Array.from(e.target.selectedOptions).map(o => o.value);
            this._updateField(index, fieldName, values);
        });

        group.appendChild(label);
        group.appendChild(select);
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
            list.innerHTML = '';
            (init.assignments || []).forEach((a, aIdx) => {
                const team = (this.systemData.teams || []).find(t => t.teamId === a.teamId);
                const teamName = team ? (team.teamIdentity || team.teamName) : a.teamId;

                const item = document.createElement('div');
                item.className = 'initiative-assignment-item';
                item.innerHTML = `<span><strong>${teamName}</strong>: ${a.sdeYears} SDE Years</span>`;

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
                list.innerHTML = '<em>No teams assigned.</em>';
            }
        };
        renderList();
        container.appendChild(list);

        // Add Controls
        const controls = document.createElement('div');
        controls.className = 'initiative-assignment-controls';

        const teamSelect = document.createElement('select');
        teamSelect.className = 'initiative-edit-select';
        teamSelect.appendChild(new Option('-- Select Team --', ''));
        (this.systemData.teams || []).forEach(t => {
            teamSelect.appendChild(new Option(t.teamIdentity || t.teamName, t.teamId));
        });

        const sdeInput = document.createElement('input');
        sdeInput.type = 'number';
        sdeInput.className = 'initiative-edit-input';
        sdeInput.placeholder = 'SDE Years';
        sdeInput.step = '0.1';
        sdeInput.style.width = '100px';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-secondary';
        addBtn.innerText = 'Add';
        addBtn.onclick = () => {
            const teamId = teamSelect.value;
            const sdeYears = parseFloat(sdeInput.value);
            if (!teamId || isNaN(sdeYears)) return;

            if (!init.assignments) init.assignments = [];
            init.assignments.push({ teamId, sdeYears });
            renderList();
            teamSelect.value = '';
            sdeInput.value = '';
        };

        controls.appendChild(teamSelect);
        controls.appendChild(sdeInput);
        controls.appendChild(addBtn);
        container.appendChild(controls);

        return container;
    }

    _createROIContent(init, index) {
        const container = document.createElement('div');
        if (!init.roi) init.roi = {};

        const grid = document.createElement('div');
        grid.className = 'initiative-edit-grid';

        grid.appendChild(this._createFormGroup('Category', 'input', 'roi.category', init.roi.category, index));
        grid.appendChild(this._createFormGroup('Value', 'input', 'roi.estimatedValue', init.roi.estimatedValue, index));
        grid.appendChild(this._createFormGroup('Value Type', 'input', 'roi.valueType', init.roi.valueType, index));
        grid.appendChild(this._createFormGroup('Currency', 'input', 'roi.currency', init.roi.currency, index));

        container.appendChild(grid);

        container.appendChild(this._createFormGroup('Calculation Methodology', 'textarea', 'roi.calculationMethodology', init.roi.calculationMethodology, index));

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

        // Update Header if Title/Status changed
        if (fieldName === 'title' || fieldName === 'status') {
            const item = document.querySelector(`.initiative-edit-item[data-init-index="${index}"]`);
            if (item) {
                if (fieldName === 'title') {
                    let title = value || 'New Initiative';
                    if (index === 'draft') title += ' (Unsaved)';
                    item.querySelector('.initiative-edit-title').innerText = title;
                }
                if (fieldName === 'status') {
                    const pill = item.querySelector('.initiative-status-pill');
                    pill.className = `initiative-status-pill status-${(value || 'backlog').toLowerCase().replace(' ', '-')}`;
                    pill.innerText = value || 'Backlog';
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

        if (await window.notificationManager.confirm('Are you sure you want to delete this initiative?', 'Delete Initiative', { confirmStyle: 'danger' })) {
            this.systemData.yearlyInitiatives.splice(index, 1);
            if (window.saveSystemData) window.saveSystemData();
            this.render();
            window.notificationManager.showToast('Initiative deleted.', 'success');
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
            window.notificationManager.showToast('Title is required.', 'warning');
            return;
        }

        if (index === 'draft') {
            // Commit draft
            this.systemData.yearlyInitiatives.push(init);
            this.draftInitiative = null;
            this.expandedIndex = -1; // Collapse after create? Or keep open? Let's collapse.
            window.notificationManager.showToast('Initiative created successfully.', 'success');
            this.render();
        } else {
            window.notificationManager.showToast('Initiative changes saved.', 'success');
        }

        if (window.saveSystemData) window.saveSystemData();
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.InitiativeEditComponent = InitiativeEditComponent;
}
