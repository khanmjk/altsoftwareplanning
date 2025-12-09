/**
 * GanttTableController.js
 * 
 * Coordinates Model and View, handles user events, and syncs with Frappe.
 * 
 * Responsibilities:
 * - Handles events from GanttTableView
 * - Updates GanttTableModel state
 * - Persists changes via Services
 * - Syncs with FrappeGanttRenderer (bidirectional)
 * - Triggers view re-renders
 * 
 * Part of Gantt Table MVC Architecture
 */

class GanttTableController {
    /**
     * @param {object} options
     * @param {HTMLElement} options.container - Table container element
     * @param {object} options.frappeRenderer - FrappeGanttRenderer instance (optional)
     */
    constructor(options = {}) {
        this.container = options.container;
        this.frappeRenderer = options.frappeRenderer || null;

        // MVC components
        this.model = new GanttTableModel();
        this.view = new GanttTableView(this.container);

        // Data context
        this.systemData = null;

        // Bind view events
        this.view.setEventHandler(this._handleViewEvent.bind(this));

        // Listen for model changes
        this.model.addEventListener('change', this._handleModelChange.bind(this));

        // Listen for Frappe sync events
        if (this.frappeRenderer) {
            this._setupFrappeSync();
        }
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initializes with system data and renders the table
     * @param {object} systemData - Global system data
     * @param {object} options - View options
     */
    init(systemData, options = {}) {
        this.systemData = systemData;
        this.view.updateOptions(options);
        this.render();
    }

    /**
     * Updates options and re-renders
     * @param {object} options
     */
    updateOptions(options) {
        this.view.updateOptions(options);
        this.render();
    }

    /**
     * Sets the Frappe renderer for bidirectional sync
     * @param {object} frappeRenderer 
     */
    setFrappeRenderer(frappeRenderer) {
        this.frappeRenderer = frappeRenderer;
        this._setupFrappeSync();
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    /**
     * Full render of the table
     */
    render() {
        if (!this.systemData) {
            console.warn('GanttTableController: No system data available');
            return;
        }

        const initiatives = this.systemData.yearlyInitiatives || [];
        const workPackages = this.systemData.workPackages || [];
        const teams = this.systemData.teams || [];

        // Apply filters
        const filtered = this._getFilteredInitiatives(initiatives);

        // Normalize data (handles implicit WP fallback)
        const normalizedData = this.model.getNormalizedData(filtered, workPackages);

        // Context for row renderers
        const context = {
            allInitiatives: initiatives,
            allWorkPackages: workPackages,
            teams
        };

        this.view.render(normalizedData, this.model, context);
    }

    /**
     * Filters initiatives based on model filter state
     * @param {Array} initiatives 
     * @returns {Array}
     */
    _getFilteredInitiatives(initiatives) {
        const filters = this.model.getFilters();

        if (typeof GanttService !== 'undefined' && GanttService.getFilteredInitiatives) {
            return GanttService.getFilteredInitiatives({
                initiatives,
                year: filters.year,
                statusFilter: filters.statusFilter,
                groupBy: filters.groupBy,
                groupValue: filters.groupValue,
                teams: this.systemData?.teams || [],
                sdms: this.systemData?.sdms || []
            });
        }

        // Fallback: basic filtering
        return initiatives.filter(init => {
            const year = new Date(init.targetDueDate).getFullYear();
            return year === filters.year && filters.statusFilter.has(init.status);
        });
    }

    // =========================================================================
    // VIEW EVENT HANDLERS
    // =========================================================================

    /**
     * Handles all events from the view
     * @param {string} type - Event type
     * @param {object} data - Event data
     */
    _handleViewEvent(type, data) {
        switch (type) {
            case 'action':
                this._handleAction(data);
                break;
            case 'fieldChange':
                this._handleFieldChange(data);
                break;
            case 'rowClick':
                this._handleRowClick(data);
                break;
            case 'keydown':
                this._handleKeydown(data);
                break;
            default:
                console.warn('GanttTableController: Unknown event type', type);
        }
    }

    /**
     * Handles action button clicks
     */
    _handleAction(data) {
        switch (data.action) {
            case 'toggle-initiative':
                this.model.toggleInitiative(data.id);
                this.render();
                this._syncExpansionToChart();
                break;

            case 'toggle-wp':
                this.model.toggleWorkPackage(data.wpId);
                this.render();
                this._syncExpansionToChart();
                break;

            case 'toggle-other-teams':
                this.model.toggleOtherTeams(data.wpId);
                this.render();
                this._syncExpansionToChart();
                break;

            case 'add-wp':
                this._addWorkPackage(data.id);
                break;

            case 'delete-wp':
                this._deleteWorkPackage(data.id, data.initiativeId);
                break;

            case 'add-task':
                this._addTask(data.wpId, data.initiativeId);
                break;

            case 'delete-task':
                this._deleteTask(data.wpId, data.initiativeId, data.teamId);
                break;

            default:
                console.log('GanttTableController: Unhandled action', data.action);
        }
    }

    /**
     * Handles field value changes
     */
    _handleFieldChange(data) {
        const { kind, field, value, id, wpId, initiativeId, teamId } = data;

        switch (kind) {
            case 'initiative':
                this._updateInitiativeField(id, field, value);
                break;

            case 'work-package':
                this._updateWorkPackageField(wpId, initiativeId, field, value);
                break;

            case 'wp-assign':
                this._updateAssignmentField(wpId, initiativeId, teamId, field, value);
                break;

            default:
                console.warn('GanttTableController: Unknown field kind', kind);
        }

        // Sync to Frappe if date changed
        if (['startDate', 'endDate', 'targetDueDate'].includes(field)) {
            this._syncToFrappe();
        }
    }

    /**
     * Handles row focus
     */
    _handleRowClick(data) {
        const target = data.target;
        const context = this._captureFocusFromTarget(target);
        if (context) {
            this.model.setFocus(context);
            this._syncFocusToFrappe(context);
        }
    }

    /**
     * Handles keyboard navigation
     */
    _handleKeydown(data) {
        const { key, target, event } = data;

        // TODO: Implement keyboard navigation
        // Arrow keys to move focus
        // Enter to edit
        // Escape to cancel

        if (key === 'Escape' && target.tagName === 'INPUT') {
            target.blur();
        }
    }

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    _addWorkPackage(initiativeId) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.addWorkPackage) {
            // Service signature: addWorkPackage(systemData, initiativeId, wpData)
            const newWp = WorkPackageService.addWorkPackage(this.systemData, initiativeId, {
                title: 'New Work Package',
                startDate: '',
                endDate: ''
            });
            if (newWp) {
                this.model.expandedInitiatives.add(initiativeId); // Ensure expanded
                this.render();
                this._syncToFrappe();
            }
        } else {
            console.warn('WorkPackageService not available');
        }
    }

    _deleteWorkPackage(wpId, initiativeId) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.deleteWorkPackage) {
            if (confirm('Delete this work package and all its assignments?')) {
                WorkPackageService.deleteWorkPackage(this.systemData, wpId);
                this._propagateDates(initiativeId); // Refresh initiative dates
                this.render();
                this._syncToFrappe();
            }
        }
    }

    _addTask(wpId, initiativeId) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.addAssignment) {
            // Get first available team
            const teams = this.systemData?.teams || [];
            const wp = (this.systemData?.workPackages || []).find(w => w.workPackageId === wpId);
            const existingTeamIds = (wp?.impactedTeamAssignments || []).map(a => a.teamId);
            const availableTeam = teams.find(t => !existingTeamIds.includes(t.teamId));

            if (availableTeam) {
                WorkPackageService.addAssignment(this.systemData, wpId, {
                    teamId: availableTeam.teamId,
                    sdeDays: 0,
                    startDate: wp?.startDate || '',
                    endDate: wp?.endDate || ''
                });
                this.model.expandedWorkPackages.add(wpId); // Ensure expanded
                this._propagateDates(initiativeId, wpId); // Cascade dates up
                this.render();
                this._syncToFrappe();
            } else {
                alert('All teams are already assigned to this work package.');
            }
        }
    }

    _deleteTask(wpId, initiativeId, teamId) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.removeAssignment) {
            WorkPackageService.removeAssignment(this.systemData, wpId, teamId);
            this._propagateDates(initiativeId, wpId); // Cascade dates up
            this.render();
            this._syncToFrappe();
        }
    }

    // =========================================================================
    // FIELD UPDATES
    // =========================================================================

    _updateInitiativeField(initiativeId, field, value) {
        if (typeof InitiativeService !== 'undefined' && InitiativeService.updateInitiative) {
            InitiativeService.updateInitiative(this.systemData, initiativeId, { [field]: value });

            // Trigger date propagation if date changed
            if (['startDate', 'targetDueDate'].includes(field)) {
                this._propagateDates(initiativeId);
            }
        }
    }

    _updateWorkPackageField(wpId, initiativeId, field, value) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.updateWorkPackage) {
            WorkPackageService.updateWorkPackage(this.systemData, wpId, { [field]: value });

            // Propagate dates up
            if (['startDate', 'endDate'].includes(field)) {
                this._propagateDates(initiativeId);
            }
        }
    }

    _updateAssignmentField(wpId, initiativeId, teamId, field, value) {
        if (typeof WorkPackageService !== 'undefined' && WorkPackageService.updateAssignment) {
            // Convert sdeYears to sdeDays if needed
            let updates = { [field]: value };
            if (field === 'sdeYears') {
                const workingDays = this.view.options.workingDaysPerYear || 261;
                updates = { sdeDays: parseFloat(value) * workingDays };
            }

            WorkPackageService.updateAssignment(this.systemData, wpId, teamId, updates);

            // Propagate dates up: Task → WP → Initiative → Goal
            if (['startDate', 'endDate'].includes(field)) {
                this._propagateDates(initiativeId, wpId);
                this.render(); // Re-render to show updated WP/Init dates
                this._syncToFrappe();
            }
        }
    }

    // =========================================================================
    // DATE PROPAGATION
    // =========================================================================

    /**
     * Propagates date changes up the hierarchy
     * Task → WP → Initiative → Goal
     * @param {string} initiativeId - Initiative ID
     * @param {string} [wpId] - Work Package ID (optional, for WP-level propagation)
     */
    _propagateDates(initiativeId, wpId = null) {
        // Step 1: If WP is specified, recalculate WP dates from its tasks/assignments
        if (wpId && typeof WorkPackageService !== 'undefined' && WorkPackageService.recalculateWorkPackageDates) {
            const wp = (this.systemData?.workPackages || []).find(w => w.workPackageId === wpId);
            if (wp) {
                WorkPackageService.recalculateWorkPackageDates(wp);
            }
        }

        // Step 2: Refresh initiative dates from all its WPs (also triggers Goal refresh)
        if (typeof InitiativeService !== 'undefined' && InitiativeService.refreshInitiativeDates) {
            InitiativeService.refreshInitiativeDates(this.systemData, initiativeId);
        }
    }

    // =========================================================================
    // FOCUS CAPTURE
    // =========================================================================

    _captureFocusFromTarget(target) {
        if (!target || !target.dataset) return null;

        const wpId = target.dataset.wpId;
        const initId = target.dataset.initiativeId || target.dataset.id;
        const teamId = target.dataset.teamId;
        const kind = target.dataset.kind;

        if (teamId && wpId) {
            return {
                taskType: 'assignment',
                taskId: GanttService.buildAssignmentTaskId(wpId, teamId),
                initiativeId: initId
            };
        } else if (wpId) {
            return {
                taskType: 'workPackage',
                taskId: this.model.normalizeId(wpId),
                initiativeId: initId
            };
        } else if (initId && kind === 'initiative') {
            return {
                taskType: 'initiative',
                taskId: this.model.normalizeId(initId),
                initiativeId: initId
            };
        }

        return null;
    }

    // =========================================================================
    // FRAPPE SYNC
    // =========================================================================

    /**
     * Sets up bidirectional Frappe sync
     */
    _setupFrappeSync() {
        if (!this.frappeRenderer) return;

        // Listen for Frappe drag events
        if (typeof this.frappeRenderer.addEventListener === 'function') {
            this.frappeRenderer.addEventListener('task:dateChange', (e) => {
                this._handleFrappeDateChange(e.detail);
            });

            this.frappeRenderer.addEventListener('task:click', (e) => {
                this._handleFrappeTaskClick(e.detail);
            });
        }
    }

    /**
     * Syncs table changes to Frappe chart
     */
    _syncToFrappe() {
        if (this.frappeRenderer && typeof this.frappeRenderer.refresh === 'function') {
            this.frappeRenderer.refresh();
        }
    }

    /**
     * Syncs focus to Frappe chart
     */
    _syncFocusToFrappe(context) {
        if (this.frappeRenderer && typeof this.frappeRenderer.highlightTask === 'function') {
            this.frappeRenderer.highlightTask(context.taskId);
        }
    }

    /**
     * Syncs table expansion state to chart by triggering re-render.
     * This ensures the Gantt chart shows/hides rows matching the table expansion.
     */
    _syncExpansionToChart() {
        // Sync MVC model state to legacy globals so renderGanttChart can read them
        if (typeof ganttExpandedInitiatives !== 'undefined') {
            ganttExpandedInitiatives.clear();
            this.model.expandedInitiatives.forEach(id => ganttExpandedInitiatives.add(id));
        }
        if (typeof ganttExpandedWorkPackages !== 'undefined') {
            ganttExpandedWorkPackages.clear();
            this.model.expandedWorkPackages.forEach(id => ganttExpandedWorkPackages.add(id));
        }

        // Call the legacy renderGanttChart if available
        if (typeof renderGanttChart === 'function') {
            renderGanttChart();
        } else if (this.frappeRenderer && typeof this.frappeRenderer.refresh === 'function') {
            // Fallback to Frappe refresh
            this.frappeRenderer.refresh();
        }
    }


    /**
     * Handles date change from Frappe drag
     */
    _handleFrappeDateChange(detail) {
        const { taskId, start, end } = detail;

        // Determine task type and update
        // This would require parsing the taskId format
        console.log('Frappe date change:', taskId, start, end);

        // Re-render table
        this.render();
    }

    /**
     * Handles task click from Frappe
     */
    _handleFrappeTaskClick(detail) {
        const { taskId } = detail;

        // Set focus in model
        this.model.setFocus({
            taskId: this.model.normalizeId(taskId),
            taskType: 'workPackage', // Default assumption
            initiativeId: null // Would need to look up
        });

        this.render();
    }

    // =========================================================================
    // MODEL CHANGE HANDLER
    // =========================================================================

    /**
     * Handles model state changes
     */
    _handleModelChange(event) {
        const { type, payload } = event.detail;

        // Most changes trigger re-render
        // Focus changes might just update CSS classes
        if (type === 'focus') {
            // Could optimize to just update focus styles
        }
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================

    destroy() {
        // Remove event listeners
        this.model.removeEventListener('change', this._handleModelChange);

        // Clear references
        this.model = null;
        this.view = null;
        this.frappeRenderer = null;
        this.systemData = null;
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttTableController;
}
