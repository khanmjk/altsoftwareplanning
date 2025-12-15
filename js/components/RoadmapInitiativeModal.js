/**
 * RoadmapInitiativeModal
 * Handles the creation and editing of roadmap initiatives.
 * Refactored to use ThemedSelect for consistent UI and correct Project Manager sourcing.
 */
class RoadmapInitiativeModal {
    constructor() {
        this.modalId = 'roadmapInitiativeModal';
        this.assignments = [];
        this.currentInitiativeId = null;
        this.onSave = null; // Callback function

        // Store references to ThemedSelect instances
        this.selects = new Map();

        this.render();
    }

    render() {
        if (document.getElementById(this.modalId)) return;

        // --- 1. Create Overlay ---
        const overlay = document.createElement('div');
        overlay.id = this.modalId;
        overlay.className = 'roadmap-modal-overlay';

        // --- 2. Create Content Container ---
        const content = document.createElement('div');
        content.className = 'roadmap-modal-content';

        // --- 3. Header ---
        const header = document.createElement('div');
        header.className = 'roadmap-modal-header';

        const title = document.createElement('h2');
        title.id = 'roadmapModalTitle';
        title.className = 'roadmap-modal-title';
        title.textContent = 'Add New Initiative';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'roadmap-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.dataset.action = 'close';
        header.appendChild(closeBtn);

        content.appendChild(header);

        // --- 4. Body (Form) ---
        const body = document.createElement('div');
        body.className = 'roadmap-modal-body';

        const form = document.createElement('form');
        form.id = 'roadmapInitiativeForm';

        // Title
        form.appendChild(this._createFormGroup('Title *', 'text', 'title', null, true));

        // Description
        form.appendChild(this._createFormGroup('Description', 'textarea', 'description', null, false, 3));

        // Grid: Status & Date
        const grid1 = document.createElement('div');
        grid1.className = 'roadmap-form-grid';

        // Status Select
        grid1.appendChild(this._createThemedSelect('Status', 'status', 'roadmapModalStatusSelect', [
            { value: 'Backlog', text: 'Backlog' },
            { value: 'Defined', text: 'Defined' },
            { value: 'Committed', text: 'Committed' },
            { value: 'In Progress', text: 'In Progress' },
            { value: 'Completed', text: 'Completed' }
        ]));

        grid1.appendChild(this._createFormGroup('Target Due Date *', 'date', 'targetDueDate', null, true));
        form.appendChild(grid1);

        // PM Notes
        const notesGroup = this._createFormGroup('PM Capacity/Team Notes', 'textarea', 'pmNotes', null, false, 2);
        notesGroup.querySelector('textarea').placeholder = 'Notes on PM capacity or allocation';
        form.appendChild(notesGroup);

        // Strategic Alignment
        const stratTitle = document.createElement('h3');
        stratTitle.className = 'roadmap-section-title';
        stratTitle.textContent = 'Strategic Alignment';
        form.appendChild(stratTitle);

        // Themes (Multi-Select)
        form.appendChild(this._createThemedSelect('Themes', 'themes', 'roadmapModalThemesSelect', [], true));

        // Grid: Goal & Owner
        const grid2 = document.createElement('div');
        grid2.className = 'roadmap-form-grid';
        grid2.appendChild(this._createThemedSelect('Primary Goal', 'primaryGoalId', 'roadmapModalGoalSelect'));
        grid2.appendChild(this._createThemedSelect('Owner', 'owner', 'roadmapModalOwnerSelect'));
        form.appendChild(grid2);

        // Project Manager
        form.appendChild(this._createThemedSelect('Project Manager', 'projectManager', 'roadmapModalProjectManagerSelect'));

        // Assignments
        const assignTitle = document.createElement('h3');
        assignTitle.className = 'roadmap-section-title';
        assignTitle.textContent = 'Team Assignments & Capacity';
        form.appendChild(assignTitle);

        const assignContainer = document.createElement('div');
        assignContainer.className = 'assignments-container';

        const assignList = document.createElement('div');
        assignList.id = 'roadmapModalAssignmentsList';
        assignList.className = 'assignments-list';
        assignList.innerHTML = '<em>No teams assigned yet.</em>';
        assignContainer.appendChild(assignList);

        const assignControls = document.createElement('div');
        assignControls.className = 'assignment-controls';

        // Team Select Wrapper (Using ThemedSelect)
        const teamWrap = document.createElement('div');
        teamWrap.style.flexGrow = '1';

        // We handle this one manually/separately as it's not part of the main form map necessarily, 
        // but let's use the helper and not add it to the main `this.selects` map if we want custom handling,
        // or just add it and handle it manually.
        // Actually, let's create it manually to avoid key collision or just give it a unique key.
        const teamSelect = new ThemedSelect({
            options: [{ value: '', text: '-- Select Team --' }],
            value: '',
            id: 'roadmapModalTeamSelect',
        });
        this.selects.set('assignmentTeam', teamSelect);
        teamWrap.appendChild(teamSelect.render());
        assignControls.appendChild(teamWrap);

        // SDE Input Wrapper
        const sdeWrap = document.createElement('div');
        sdeWrap.style.width = '120px';
        const sdeInput = document.createElement('input');
        sdeInput.type = 'number';
        sdeInput.id = 'roadmapModalSdeYears';
        sdeInput.className = 'roadmap-input';
        sdeInput.placeholder = 'SDE Years';
        sdeInput.step = '0.1';
        sdeInput.min = '0';
        sdeWrap.appendChild(sdeInput);
        assignControls.appendChild(sdeWrap);

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-secondary btn-sm';
        addBtn.dataset.action = 'add-assignment';
        addBtn.textContent = 'Add';
        assignControls.appendChild(addBtn);

        assignContainer.appendChild(assignControls);
        form.appendChild(assignContainer);

        // ROI Details
        const roiTitle = document.createElement('h3');
        roiTitle.className = 'roadmap-section-title';
        roiTitle.textContent = 'ROI Details';
        form.appendChild(roiTitle);

        // ROI Grid 1
        const roiGrid1 = document.createElement('div');
        roiGrid1.className = 'roadmap-form-grid';
        const catGroup = this._createFormGroup('Category', 'text', 'roiCategory', null, false);
        const catInput = catGroup.querySelector('input');
        catInput.setAttribute('list', 'roiCategoriesList');
        const datalist = document.createElement('datalist');
        datalist.id = 'roiCategoriesList';
        ['Revenue Generation', 'Cost Reduction', 'Risk Mitigation', 'Compliance', 'Strategic Alignment', 'Innovation', 'Tech Debt', 'Productivity/Efficiency', 'User Experience'].forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            datalist.appendChild(opt);
        });
        catGroup.appendChild(datalist);
        roiGrid1.appendChild(catGroup);
        const valTypeGroup = this._createFormGroup('Value Type', 'text', 'roiValueType', null, false);
        valTypeGroup.querySelector('input').placeholder = 'e.g. Hard Savings';
        roiGrid1.appendChild(valTypeGroup);
        form.appendChild(roiGrid1);

        // ROI Grid 2
        const roiGrid2 = document.createElement('div');
        roiGrid2.className = 'roadmap-form-grid';
        const valGroup = this._createFormGroup('Estimated Value', 'text', 'roiValue', null, false);
        valGroup.querySelector('input').placeholder = 'e.g. 500k';
        roiGrid2.appendChild(valGroup);
        const curGroup = this._createFormGroup('Currency', 'text', 'roiCurrency', null, false);
        curGroup.querySelector('input').placeholder = 'e.g. USD';
        roiGrid2.appendChild(curGroup);
        form.appendChild(roiGrid2);

        // ROI Grid 3
        const roiGrid3 = document.createElement('div');
        roiGrid3.className = 'roadmap-form-grid';
        const horizonGroup = this._createFormGroup('Time Horizon (Months)', 'number', 'roiTimeHorizon', null, false);
        horizonGroup.querySelector('input').placeholder = 'e.g. 12';
        roiGrid3.appendChild(horizonGroup);
        const confGroup = this._createFormGroup('Confidence Level', 'text', 'roiConfidenceLevel', null, false);
        confGroup.querySelector('input').placeholder = 'e.g. High';
        roiGrid3.appendChild(confGroup);
        form.appendChild(roiGrid3);

        // ROI Textareas
        form.appendChild(this._createFormGroup('Calculation Methodology', 'textarea', 'roiCalculationMethodology', null, false, 2));
        const bcLinkGroup = this._createFormGroup('Business Case Link (URL)', 'url', 'roiBusinessCaseLink', null, false);
        bcLinkGroup.querySelector('input').placeholder = 'https://...';
        form.appendChild(bcLinkGroup);
        form.appendChild(this._createFormGroup('Override Justification', 'textarea', 'roiOverrideJustification', null, false, 2));

        body.appendChild(form);
        content.appendChild(body);

        // --- 5. Footer ---
        const footer = document.createElement('div');
        footer.className = 'roadmap-modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.dataset.action = 'close';
        cancelBtn.textContent = 'Cancel';
        footer.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.dataset.action = 'save';
        saveBtn.textContent = 'Save Initiative';
        footer.appendChild(saveBtn);

        content.appendChild(footer);
        overlay.appendChild(content);

        // Attach to DOM
        document.body.appendChild(overlay);
        this.attachEventListeners();
    }

    attachEventListeners() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            switch (action) {
                case 'close':
                    this.close();
                    break;
                case 'save':
                    this.save();
                    break;
                case 'add-assignment':
                    this.addAssignment();
                    break;
                case 'remove-assignment':
                    const index = parseInt(e.target.dataset.index, 10);
                    if (!isNaN(index)) this.removeAssignment(index);
                    break;
            }
        });

        // Close modal on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    _createFormGroup(labelText, inputType, inputName, existingValue, isRequired, rows = 1) {
        const group = document.createElement('div');
        group.className = 'roadmap-form-group';

        const label = document.createElement('label');
        label.className = 'roadmap-label';
        label.textContent = labelText;
        group.appendChild(label);

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.rows = rows;
            input.className = 'roadmap-textarea';
        } else {
            input = document.createElement('input');
            input.type = inputType;
            input.className = 'roadmap-input';
        }
        input.name = inputName;
        if (existingValue) input.value = existingValue;
        if (isRequired) input.required = true;

        group.appendChild(input);
        return group;
    }

    _createThemedSelect(labelText, selectName, elementId, initialOptions = [], isMultiple = false) {
        const group = document.createElement('div');
        group.className = 'roadmap-form-group';

        const label = document.createElement('label');
        label.className = 'roadmap-label';
        label.textContent = labelText;
        group.appendChild(label);

        const selectOptions = initialOptions.length > 0 ? initialOptions : [{ value: '', text: 'Loading...' }];

        const select = new ThemedSelect({
            options: selectOptions,
            value: isMultiple ? [] : '',
            id: elementId,
            multiple: isMultiple
        });

        this.selects.set(selectName, select);
        group.appendChild(select.render());

        return group;
    }


    open(initiativeId = null) {
        this.currentInitiativeId = initiativeId;
        const modal = document.getElementById(this.modalId);
        const title = document.getElementById('roadmapModalTitle');
        const form = document.getElementById('roadmapInitiativeForm');

        if (!modal) return;

        // Reset state
        form.reset();
        this.assignments = [];
        this.populateDropdowns();

        if (initiativeId) {
            title.textContent = 'Edit Initiative';
            this.loadInitiativeData(initiativeId);
        } else {
            title.textContent = 'Add New Initiative';

            // Explicitly reset all ThemedSelect instances
            this.selects.forEach(select => {
                if (select.multiple) {
                    select.setValue([]);
                } else {
                    select.setValue('');
                }
            });

            this.renderAssignments();
        }

        modal.style.display = 'block';
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.style.display = 'none';
        this.currentInitiativeId = null;
    }

    populateDropdowns() {
        if (!SystemService.getCurrentSystem()) return;

        // Themes
        const themeSelect = this.selects.get('themes');
        const themes = (SystemService.getCurrentSystem().definedThemes || []).map(t => ({
            value: t.themeId,
            text: t.name
        }));
        themeSelect.setOptions(themes);

        // Goals
        const goalSelect = this.selects.get('primaryGoalId');
        const goals = [
            ...(SystemService.getCurrentSystem().goals || []),
            ...(SystemService.getCurrentSystem().subGoals || [])
        ].map(g => ({
            value: g.goalId,
            text: g.name || g.goalId
        }));
        goalSelect.setOptions([{ value: '', text: '-- None --' }, ...goals]);

        // Owners (SDMs, PMTs, Sr Mgrs)
        const ownerSelect = this.selects.get('owner');
        const owners = [
            ...(SystemService.getCurrentSystem().sdms || []).map(p => ({ value: `sdm:${p.sdmId}`, text: `${p.sdmName} (SDM)` })),
            ...(SystemService.getCurrentSystem().pmts || []).map(p => ({ value: `pmt:${p.pmtId}`, text: `${p.pmtName} (PMT)` })),
            ...(SystemService.getCurrentSystem().seniorManagers || []).map(p => ({ value: `seniorManager:${p.seniorManagerId}`, text: `${p.seniorManagerName} (Sr Mgr)` }))
        ];
        ownerSelect.setOptions([{ value: '', text: '-- Select Owner --' }, ...owners]);

        // Project Managers (TPMs / PgMs) - CORRECT SOURCE system.projectManagers
        const pmSelect = this.selects.get('projectManager');
        const pms = (SystemService.getCurrentSystem().projectManagers || []).map(p => ({
            value: `projectManager:${p.pmId}`,
            text: `${p.pmName} (PgM)`
        }));
        pmSelect.setOptions([{ value: '', text: '-- Select Project Manager --' }, ...pms]);

        // Teams (Data for assignments)
        const teamSelect = this.selects.get('assignmentTeam');
        const teams = (SystemService.getCurrentSystem().teams || []).map(t => ({
            value: t.teamId,
            text: t.teamIdentity || t.teamName
        }));
        teamSelect.setOptions([{ value: '', text: '-- Select Team --' }, ...teams]);
    }

    loadInitiativeData(initiativeId) {
        const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        if (!initiative) return;

        const form = document.getElementById('roadmapInitiativeForm');

        form.elements['title'].value = initiative.title || '';
        form.elements['description'].value = initiative.description || '';

        // Status (ThemedSelect)
        this.selects.get('status').setValue(initiative.status || 'Backlog');

        form.elements['targetDueDate'].value = initiative.targetDueDate || '';

        // Goal (ThemedSelect)
        this.selects.get('primaryGoalId').setValue(initiative.primaryGoalId || '');

        form.elements['pmNotes'].value = initiative.pmNotes || '';

        // Owner (ThemedSelect)
        if (initiative.owner) {
            this.selects.get('owner').setValue(`${initiative.owner.type}:${initiative.owner.id}`);
        } else {
            this.selects.get('owner').setValue('');
        }

        // Project Manager (ThemedSelect)
        if (initiative.projectManager) {
            this.selects.get('projectManager').setValue(`${initiative.projectManager.type}:${initiative.projectManager.id}`);
        } else {
            this.selects.get('projectManager').setValue('');
        }

        // ROI
        if (initiative.roi) {
            form.elements['roiCategory'].value = initiative.roi.category || '';
            form.elements['roiValue'].value = initiative.roi.estimatedValue || '';
            form.elements['roiValueType'].value = initiative.roi.valueType || '';
            form.elements['roiCurrency'].value = initiative.roi.currency || '';
            form.elements['roiTimeHorizon'].value = initiative.roi.timeHorizon || '';
            form.elements['roiConfidenceLevel'].value = initiative.roi.confidenceLevel || '';
            form.elements['roiCalculationMethodology'].value = initiative.roi.calculationMethodology || '';
            form.elements['roiBusinessCaseLink'].value = initiative.roi.businessCaseLink || '';
            form.elements['roiOverrideJustification'].value = initiative.roi.overrideJustification || '';
        }

        // Themes (Multi-Select)
        const initiativeThemes = initiative.themes || [];
        this.selects.get('themes').setValue(initiativeThemes);

        // Assignments
        this.assignments = initiative.assignments ? JSON.parse(JSON.stringify(initiative.assignments)) : [];
        this.renderAssignments();
    }

    addAssignment() {
        const teamSelect = this.selects.get('assignmentTeam');
        const sdeInput = document.getElementById('roadmapModalSdeYears');

        const teamId = teamSelect.getValue();
        const sdeYears = parseFloat(sdeInput.value);

        if (!teamId) {
            notificationManager.showToast('Please select a team.', 'warning');
            return;
        }
        if (isNaN(sdeYears) || sdeYears < 0) {
            notificationManager.showToast('Please enter a valid SDE Years value.', 'warning');
            return;
        }

        const existingIndex = this.assignments.findIndex(a => a.teamId === teamId);
        if (existingIndex > -1) {
            this.assignments[existingIndex].sdeYears = sdeYears;
        } else {
            this.assignments.push({ teamId, sdeYears });
        }

        this.renderAssignments();
        teamSelect.setValue('');
        sdeInput.value = '';
    }

    removeAssignment(index) {
        this.assignments.splice(index, 1);
        this.renderAssignments();
    }

    renderAssignments() {
        const container = document.getElementById('roadmapModalAssignmentsList');
        if (this.assignments.length === 0) {
            container.innerHTML = '<em>No teams assigned yet.</em>';
            return;
        }

        container.innerHTML = this.assignments.map((a, index) => {
            const team = (SystemService.getCurrentSystem().teams || []).find(t => t.teamId === a.teamId);
            const teamName = team ? (team.teamIdentity || team.teamName) : a.teamId;
            return `
                <div class="assignment-item">
                    <span><strong>${teamName}</strong>: ${a.sdeYears} SDE Years</span>
                    <button class="btn-danger btn-sm" data-action="remove-assignment" data-index="${index}">Remove</button>
                </div>
            `;
        }).join('');
    }

    save() {
        const form = document.getElementById('roadmapInitiativeForm');

        // Validation
        if (!form.elements['title'].value.trim()) {
            notificationManager.showToast('Title is required.', 'error');
            return;
        }
        if (!form.elements['targetDueDate'].value) {
            notificationManager.showToast('Target Due Date is required.', 'error');
            return;
        }

        // Construct Data Object. Using ThemedSelect getValue()
        const selectedThemes = this.selects.get('themes').getValue(); // returns array
        const status = this.selects.get('status').getValue();
        const primaryGoalId = this.selects.get('primaryGoalId').getValue();

        let ownerObj = null;
        const ownerVal = this.selects.get('owner').getValue();
        if (ownerVal) {
            const [type, id] = ownerVal.split(':');
            ownerObj = { type, id };
        }

        let pmObj = null;
        const pmVal = this.selects.get('projectManager').getValue();
        if (pmVal) {
            const [type, id] = pmVal.split(':');
            pmObj = { type, id };
        }

        const initiativeData = {
            initiativeId: this.currentInitiativeId || `init_${Date.now()}`,
            title: form.elements['title'].value.trim(),
            description: form.elements['description'].value.trim(),
            status: status,
            targetDueDate: form.elements['targetDueDate'].value,
            themes: selectedThemes,
            primaryGoalId: primaryGoalId || null,
            pmNotes: form.elements['pmNotes'].value.trim(),
            owner: ownerObj,
            projectManager: pmObj,
            assignments: this.assignments,
            roi: {
                category: form.elements['roiCategory'].value.trim(),
                estimatedValue: form.elements['roiValue'].value.trim(),
                valueType: form.elements['roiValueType'].value.trim(),
                currency: form.elements['roiCurrency'].value.trim(),
                timeHorizon: form.elements['roiTimeHorizon'].value.trim(),
                confidenceLevel: form.elements['roiConfidenceLevel'].value.trim(),
                calculationMethodology: form.elements['roiCalculationMethodology'].value.trim(),
                businessCaseLink: form.elements['roiBusinessCaseLink'].value.trim(),
                overrideJustification: form.elements['roiOverrideJustification'].value.trim()
            },
            attributes: {
                // Calculate planning year from target due date, defaulting to current year
                planningYear: form.elements['targetDueDate'].value ?
                    new Date(form.elements['targetDueDate'].value).getFullYear() :
                    new Date().getFullYear()
            }
        };

        if (this.onSave) {
            this.onSave(initiativeData, !!this.currentInitiativeId);
        }

        this.close();
    }
}

// Global singleton instance
let roadmapInitiativeModal = null;

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        roadmapInitiativeModal = new RoadmapInitiativeModal();
    });
}
