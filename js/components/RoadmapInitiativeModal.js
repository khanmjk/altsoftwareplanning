/**
 * RoadmapInitiativeModal
 * Handles the creation and editing of roadmap initiatives.
 */
class RoadmapInitiativeModal {
    constructor() {
        this.modalId = 'roadmapInitiativeModal';
        this.assignments = [];
        this.currentInitiativeId = null;
        this.onSave = null; // Callback function
        this.render();
    }

    render() {
        // Check if modal already exists
        if (document.getElementById(this.modalId)) return;

        const modalHtml = `
            <div id="${this.modalId}" class="roadmap-modal-overlay">
                <div class="roadmap-modal-content">
                    <div class="roadmap-modal-header">
                        <h2 id="roadmapModalTitle" class="roadmap-modal-title">Add New Initiative</h2>
                        <button class="roadmap-modal-close" data-action="close">&times;</button>
                    </div>
                    <div class="roadmap-modal-body">
                        <form id="roadmapInitiativeForm">
                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Title *</label>
                                <input type="text" name="title" class="roadmap-input" required>
                            </div>
                            
                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Description</label>
                                <textarea name="description" class="roadmap-textarea" rows="3"></textarea>
                            </div>

                            <div class="roadmap-form-grid">
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Status</label>
                                    <select name="status" class="roadmap-select">
                                        <option value="Backlog">Backlog</option>
                                        <option value="Defined">Defined</option>
                                        <option value="Committed">Committed</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Target Due Date *</label>
                                    <input type="date" name="targetDueDate" class="roadmap-input" required>
                                </div>
                            </div>

                            <div class="roadmap-form-group">
                                <label class="roadmap-label">PM Capacity/Team Notes</label>
                                <textarea name="pmNotes" class="roadmap-textarea" rows="2" placeholder="Notes on PM capacity or allocation"></textarea>
                            </div>

                            <h3 class="roadmap-section-title">Strategic Alignment</h3>
                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Themes</label>
                                <select name="themes" class="roadmap-select" multiple size="4" id="roadmapModalThemesSelect">
                                    <!-- Populated dynamically -->
                                </select>
                                <small style="color: #64748b; display: block; margin-top: 5px;">Hold Ctrl/Cmd to select multiple</small>
                            </div>

                            <div class="roadmap-form-grid">
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Primary Goal</label>
                                    <select name="primaryGoalId" class="roadmap-select" id="roadmapModalGoalSelect">
                                        <option value="">-- None --</option>
                                        <!-- Populated dynamically -->
                                    </select>
                                </div>
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Owner</label>
                                    <select name="owner" class="roadmap-select" id="roadmapModalOwnerSelect">
                                        <option value="">-- Select Owner --</option>
                                        <!-- Populated dynamically -->
                                    </select>
                                </div>
                            </div>

                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Project Manager</label>
                                <select name="projectManager" class="roadmap-select" id="roadmapModalProjectManagerSelect">
                                    <option value="">-- Select Project Manager --</option>
                                    <!-- Populated dynamically -->
                                </select>
                            </div>

                            <h3 class="roadmap-section-title">Team Assignments & Capacity</h3>
                            <div class="assignments-container">
                                <div id="roadmapModalAssignmentsList" class="assignments-list">
                                    <em>No teams assigned yet.</em>
                                </div>
                                <div class="assignment-controls">
                                    <div style="flex-grow: 1;">
                                        <select id="roadmapModalTeamSelect" class="roadmap-select">
                                            <option value="">-- Select Team --</option>
                                            <!-- Populated dynamically -->
                                        </select>
                                    </div>
                                    <div style="width: 120px;">
                                        <input type="number" id="roadmapModalSdeYears" class="roadmap-input" placeholder="SDE Years" step="0.1" min="0">
                                    </div>
                                    <button type="button" class="btn-secondary btn-sm" data-action="add-assignment">Add</button>
                                </div>
                            </div>

                            <h3 class="roadmap-section-title">ROI Details</h3>
                            <div class="roadmap-form-grid">
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Category</label>
                                    <input type="text" name="roiCategory" class="roadmap-input" list="roiCategoriesList">
                                    <datalist id="roiCategoriesList">
                                        <option value="Revenue Generation">
                                        <option value="Cost Reduction">
                                        <option value="Risk Mitigation">
                                        <option value="Compliance">
                                        <option value="Strategic Alignment">
                                        <option value="Innovation">
                                        <option value="Tech Debt">
                                        <option value="Productivity/Efficiency">
                                        <option value="User Experience">
                                    </datalist>
                                </div>
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Value Type</label>
                                    <input type="text" name="roiValueType" class="roadmap-input" placeholder="e.g. Hard Savings">
                                </div>
                            </div>
                            
                            <div class="roadmap-form-grid">
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Estimated Value</label>
                                    <input type="text" name="roiValue" class="roadmap-input" placeholder="e.g. 500k">
                                </div>
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Currency</label>
                                    <input type="text" name="roiCurrency" class="roadmap-input" placeholder="e.g. USD">
                                </div>
                            </div>

                            <div class="roadmap-form-grid">
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Time Horizon (Months)</label>
                                    <input type="number" name="roiTimeHorizon" class="roadmap-input" placeholder="e.g. 12">
                                </div>
                                <div class="roadmap-form-group">
                                    <label class="roadmap-label">Confidence Level</label>
                                    <input type="text" name="roiConfidenceLevel" class="roadmap-input" placeholder="e.g. High">
                                </div>
                            </div>

                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Calculation Methodology</label>
                                <textarea name="roiCalculationMethodology" class="roadmap-textarea" rows="2"></textarea>
                            </div>

                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Business Case Link (URL)</label>
                                <input type="url" name="roiBusinessCaseLink" class="roadmap-input" placeholder="https://...">
                            </div>

                            <div class="roadmap-form-group">
                                <label class="roadmap-label">Override Justification</label>
                                <textarea name="roiOverrideJustification" class="roadmap-textarea" rows="2"></textarea>
                            </div>

                        </form>
                    </div>
                    <div class="roadmap-modal-footer">
                        <button class="btn-secondary" data-action="close">Cancel</button>
                        <button class="btn-primary" data-action="save">Save Initiative</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.attachEventListeners();
    }

    /**
     * Attach event listeners using event delegation
     */
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
        const themesSelect = document.getElementById('roadmapModalThemesSelect');
        themesSelect.innerHTML = (SystemService.getCurrentSystem().definedThemes || []).map(t =>
            `<option value="${t.themeId}">${t.name}</option>`
        ).join('');

        // Goals
        const goalSelect = document.getElementById('roadmapModalGoalSelect');
        const goals = [
            ...(SystemService.getCurrentSystem().goals || []),
            ...(SystemService.getCurrentSystem().subGoals || [])
        ];
        goalSelect.innerHTML = '<option value="">-- None --</option>' +
            goals.map(g => `<option value="${g.goalId}">${g.name || g.goalId}</option>`).join('');

        // Owners (SDMs, PMTs, Sr Mgrs)
        const ownerSelect = document.getElementById('roadmapModalOwnerSelect');
        const owners = [
            ...(SystemService.getCurrentSystem().sdms || []).map(p => ({ id: `sdm:${p.sdmId}`, name: `${p.sdmName} (SDM)` })),
            ...(SystemService.getCurrentSystem().pmts || []).map(p => ({ id: `pmt:${p.pmtId}`, name: `${p.pmtName} (PMT)` })),
            ...(SystemService.getCurrentSystem().seniorManagers || []).map(p => ({ id: `seniorManager:${p.seniorManagerId}`, name: `${p.seniorManagerName} (Sr Mgr)` }))
        ];
        ownerSelect.innerHTML = '<option value="">-- Select Owner --</option>' +
            owners.map(o => `<option value="${o.id}">${o.name}</option>`).join('');

        // Project Managers (TPMs)
        const pmSelect = document.getElementById('roadmapModalProjectManagerSelect');
        const tpms = (SystemService.getCurrentSystem().tpms || []).map(p => ({ id: `tpm:${p.tpmId}`, name: `${p.tpmName} (TPM)` }));
        pmSelect.innerHTML = '<option value="">-- Select Project Manager --</option>' +
            tpms.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        // Teams
        const teamSelect = document.getElementById('roadmapModalTeamSelect');
        teamSelect.innerHTML = '<option value="">-- Select Team --</option>' +
            (SystemService.getCurrentSystem().teams || []).map(t => `<option value="${t.teamId}">${t.teamIdentity || t.teamName}</option>`).join('');
    }

    loadInitiativeData(initiativeId) {
        const initiative = (SystemService.getCurrentSystem().yearlyInitiatives || []).find(i => i.initiativeId === initiativeId);
        if (!initiative) return;

        const form = document.getElementById('roadmapInitiativeForm');

        form.elements['title'].value = initiative.title || '';
        form.elements['description'].value = initiative.description || '';
        form.elements['status'].value = initiative.status || 'Backlog';
        form.elements['targetDueDate'].value = initiative.targetDueDate || '';
        form.elements['primaryGoalId'].value = initiative.primaryGoalId || '';
        form.elements['pmNotes'].value = initiative.pmNotes || '';

        if (initiative.owner) {
            form.elements['owner'].value = `${initiative.owner.type}:${initiative.owner.id}`;
        }

        if (initiative.projectManager) {
            form.elements['projectManager'].value = `${initiative.projectManager.type}:${initiative.projectManager.id}`;
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

        // Themes
        const themesSelect = document.getElementById('roadmapModalThemesSelect');
        const initiativeThemes = initiative.themes || [];
        Array.from(themesSelect.options).forEach(opt => {
            opt.selected = initiativeThemes.includes(opt.value);
        });

        // Assignments
        this.assignments = initiative.assignments ? JSON.parse(JSON.stringify(initiative.assignments)) : [];
        this.renderAssignments();
    }

    addAssignment() {
        const teamSelect = document.getElementById('roadmapModalTeamSelect');
        const sdeInput = document.getElementById('roadmapModalSdeYears');

        const teamId = teamSelect.value;
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
        teamSelect.value = '';
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

        // Construct Data Object
        const selectedThemes = Array.from(form.elements['themes'].selectedOptions).map(opt => opt.value);

        let ownerObj = null;
        if (form.elements['owner'].value) {
            const [type, id] = form.elements['owner'].value.split(':');
            ownerObj = { type, id };
        }

        let pmObj = null;
        if (form.elements['projectManager'].value) {
            const [type, id] = form.elements['projectManager'].value.split(':');
            pmObj = { type, id };
        }

        const initiativeData = {
            initiativeId: this.currentInitiativeId || `init_${Date.now()}`,
            title: form.elements['title'].value.trim(),
            description: form.elements['description'].value.trim(),
            status: form.elements['status'].value,
            targetDueDate: form.elements['targetDueDate'].value,
            themes: selectedThemes,
            primaryGoalId: form.elements['primaryGoalId'].value || null,
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
