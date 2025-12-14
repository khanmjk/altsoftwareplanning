/**
 * GanttTableView.js
 * 
 * Renders the Gantt table structure and delegates row rendering to row components.
 * Emits DOM events for user interactions.
 * 
 * Responsibilities:
 * - Creates table structure (wrapper, table, thead, tbody)
 * - Iterates normalized data and calls row renderers
 * - Attaches event listeners and bubbles events to controller
 * - Handles row refresh for partial updates
 * 
 * Part of Gantt Table MVC Architecture
 */

class GanttTableView {
    /**
     * @param {HTMLElement} container - Container element for the table
     * @param {object} options - Configuration options
     */
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showManagerTeams: false,
            selectedTeam: null,
            workingDaysPerYear: 261,
            ...options
        };

        // Row renderer instances
        this.initiativeRow = new InitiativeRow();
        this.workPackageRow = new WorkPackageRow();
        this.assignmentRow = new AssignmentRow();

        // DOM references
        this.tableWrapper = null;
        this.table = null;
        this.thead = null;
        this.tbody = null;

        // Event callback
        this.onEvent = null;
    }

    /**
     * Sets event handler for table interactions
     * @param {Function} handler - Callback(eventType, eventData)
     */
    setEventHandler(handler) {
        this.onEvent = handler;
    }

    /**
     * Updates options (e.g., showManagerTeams, selectedTeam)
     * @param {object} newOptions 
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Renders the full table with normalized data
     * @param {Array} normalizedData - Data from GanttTableModel.getNormalizedData()
     * @param {object} model - GanttTableModel instance for state
     * @param {object} context - Additional context (allInitiatives, allWorkPackages, teams)
     */
    render(normalizedData, model, context = {}) {
        // Clear container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // Create table structure
        this._createTableStructure();

        // Empty state
        if (!normalizedData || normalizedData.length === 0) {
            this._renderEmptyState();
            return;
        }

        // Render rows
        this._renderRows(normalizedData, model, context);

        // Attach event listeners
        this._attachEventListeners();
    }

    /**
     * Creates the table DOM structure
     */
    _createTableStructure() {
        // Wrapper - use flex: 1 to fill available space
        this.tableWrapper = document.createElement('div');
        this.tableWrapper.className = 'gantt-table-wrapper';

        // Table
        this.table = document.createElement('table');
        this.table.className = 'gantt-table gantt-hierarchy';

        // Header
        this.thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const headerColumns = [
            'Initiative / Work Package',
            ...(this.options.showManagerTeams ? ['Teams'] : []),
            'Start',
            'Target',
            'SDEs',
            'Dependencies',
            'Actions'
        ];

        headerColumns.forEach(colText => {
            const th = document.createElement('th');
            th.className = 'gantt-table__header-cell';
            th.textContent = colText;
            headerRow.appendChild(th);
        });

        this.thead.appendChild(headerRow);
        this.table.appendChild(this.thead);

        // Body
        this.tbody = document.createElement('tbody');
        this.tbody.id = 'ganttTableBody';
        this.table.appendChild(this.tbody);

        this.tableWrapper.appendChild(this.table);
        this.container.appendChild(this.tableWrapper);
    }

    /**
     * Renders empty state when no data matches filters
     */
    _renderEmptyState() {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = this.options.showManagerTeams ? 7 : 6;
        emptyCell.className = 'gantt-table__empty';
        emptyCell.textContent = 'No initiatives match the filters.';
        emptyRow.appendChild(emptyCell);
        this.tbody.appendChild(emptyRow);
    }

    /**
     * Renders all data rows
     * @param {Array} normalizedData 
     * @param {object} model 
     * @param {object} context 
     */
    _renderRows(normalizedData, model, context) {
        const focus = model.getFocus();
        const { allInitiatives = [], filteredInitiatives = [], allWorkPackages = [], teams = [] } = context;

        normalizedData.forEach(init => {
            const isExpanded = model.isInitiativeExpanded(init.initiativeId);
            const initIdNorm = model.normalizeId(init.initiativeId);
            const isFocusInitiative = focus.initiativeId && initIdNorm === focus.initiativeId;
            const isFocusRow = focus.taskType === 'initiative' && focus.taskId && initIdNorm === focus.taskId;
            const hasWorkPackages = init.workPackages && init.workPackages.length > 0;

            // Render initiative row
            const initRow = this.initiativeRow.render(init, {
                isExpanded,
                isFocusInitiative,
                isFocusRow,
                hasWorkPackages,
                showManagerTeams: this.options.showManagerTeams,
                allInitiatives,
                filteredInitiatives,
                teams,
                filterYear: model.getFilters().year
            });
            this.tbody.appendChild(initRow);

            // Render work packages if expanded
            if (isExpanded) {
                this._renderWorkPackages(init, model, context, isFocusInitiative);
            }
        });
    }

    /**
     * Renders work package rows for an initiative
     */
    _renderWorkPackages(init, model, context, isFocusInitiative) {
        const focus = model.getFocus();
        const wps = init.workPackages || [];
        const { allWorkPackages = [], teams = [] } = context;

        if (wps.length === 0) {
            // Empty WP state
            const emptyWp = document.createElement('tr');
            emptyWp.className = 'gantt-wp-row';
            const emptyWpCell = document.createElement('td');
            emptyWpCell.colSpan = this.options.showManagerTeams ? 7 : 6;
            emptyWpCell.className = 'gantt-table__empty-wp';
            emptyWpCell.textContent = 'No work packages yet. Click "Add WP" to create one.';
            emptyWp.appendChild(emptyWpCell);
            this.tbody.appendChild(emptyWp);
            return;
        }

        wps.forEach(wp => {
            const wpExpanded = model.isWorkPackageExpanded(wp.workPackageId);
            const wpIdNorm = model.normalizeId(wp.workPackageId);
            const isFocusWp = focus.taskType === 'workPackage' && focus.taskId && wpIdNorm === focus.taskId;

            // Render WP row
            const wpRow = this.workPackageRow.render(wp, {
                isExpanded: wpExpanded,
                isFocusInitiative,
                isFocusRow: isFocusWp,
                showManagerTeams: this.options.showManagerTeams,
                selectedTeam: this.options.selectedTeam,
                workingDaysPerYear: this.options.workingDaysPerYear,
                allWorkPackages,
                teams
            });
            this.tbody.appendChild(wpRow);

            // Render assignments if expanded
            if (wpExpanded) {
                this._renderAssignments(wp, model, context, isFocusInitiative);
            }
        });
    }

    /**
     * Renders assignment rows for a work package
     */
    _renderAssignments(wp, model, context, isFocusInitiative) {
        const focus = model.getFocus();
        const assigns = wp.impactedTeamAssignments || [];
        const { teams = [] } = context;

        // Team filtering logic
        const teamFilterActive = this.options.selectedTeam && this.options.selectedTeam !== 'all';
        const selectedAssignments = teamFilterActive
            ? assigns.filter(a => a.teamId === this.options.selectedTeam)
            : assigns;
        const otherAssignments = teamFilterActive
            ? assigns.filter(a => a.teamId !== this.options.selectedTeam)
            : [];
        const showOtherTeams = !teamFilterActive || model.isOtherTeamsExpanded(wp.workPackageId);
        const visibleAssignments = showOtherTeams ? assigns : selectedAssignments;

        visibleAssignments.forEach(assign => {
            const assignTaskId = GanttService.buildAssignmentTaskId(wp.workPackageId, assign.teamId);
            const isFocusAssign = focus.taskType === 'assignment' &&
                focus.taskId &&
                assignTaskId &&
                model.normalizeId(assignTaskId) === focus.taskId;

            const assignRow = this.assignmentRow.render(assign, wp, {
                isFocusInitiative,
                isFocusRow: isFocusAssign,
                showManagerTeams: this.options.showManagerTeams,
                workingDaysPerYear: this.options.workingDaysPerYear,
                teams
            });
            this.tbody.appendChild(assignRow);
        });

        // "Other teams" toggle row
        if (teamFilterActive && otherAssignments.length > 0) {
            const toggleRow = this._createOtherTeamsToggle(wp, otherAssignments.length, showOtherTeams);
            this.tbody.appendChild(toggleRow);
        }
    }

    /**
     * Creates the "Other teams" toggle row
     */
    _createOtherTeamsToggle(wp, count, showOtherTeams) {
        const toggleRow = document.createElement('tr');

        const labelCell = document.createElement('td');
        labelCell.className = 'gantt-table__cell--other-teams';
        labelCell.textContent = `Other teams (${count})`;
        toggleRow.appendChild(labelCell);

        if (this.options.showManagerTeams) {
            const emptyCell = document.createElement('td');
            emptyCell.className = 'gantt-table__cell--other-teams-action';
            toggleRow.appendChild(emptyCell);
        }

        const actionCell = document.createElement('td');
        actionCell.colSpan = this.options.showManagerTeams ? 4 : 4;
        actionCell.className = 'gantt-table__cell--other-teams-action';

        const toggleBtn = document.createElement('button');
        toggleBtn.dataset.action = 'toggle-other-teams';
        toggleBtn.dataset.wpId = wp.workPackageId;
        toggleBtn.textContent = showOtherTeams ? 'Hide other teams' : 'Show other teams';
        actionCell.appendChild(toggleBtn);
        toggleRow.appendChild(actionCell);

        const trailingCell = document.createElement('td');
        trailingCell.className = 'gantt-table__cell--other-teams-action';
        toggleRow.appendChild(trailingCell);

        return toggleRow;
    }

    /**
     * Attaches event listeners to tbody for delegation
     */
    _attachEventListeners() {
        // Click handler
        this.tbody.addEventListener('click', (e) => {
            const target = e.target;
            const action = target.dataset.action;

            if (action) {
                this._emitEvent('action', {
                    action,
                    id: target.dataset.id,
                    wpId: target.dataset.wpId,
                    initiativeId: target.dataset.initiativeId,
                    teamId: target.dataset.teamId,
                    target
                });
            }

            // Row focus tracking
            this._emitEvent('rowClick', { target });
        });

        // Change handler for inputs
        this.tbody.addEventListener('change', (e) => {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                this._emitEvent('fieldChange', {
                    kind: target.dataset.kind,
                    field: target.dataset.field,
                    id: target.dataset.id,
                    wpId: target.dataset.wpId,
                    initiativeId: target.dataset.initiativeId,
                    teamId: target.dataset.teamId,
                    value: target.value,
                    target
                });
            }
        });

        // Keyboard navigation
        this.tbody.addEventListener('keydown', (e) => {
            this._emitEvent('keydown', {
                key: e.key,
                target: e.target,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                event: e
            });
        });

        // ThemedSelect custom event bridge
        // ThemedSelect doesn't bubble 'change' natively, so we listen for our custom event
        this.tbody.addEventListener('themed-select-change', (e) => {
            const target = e.target; // The container element that dispatched the event
            const { value, text } = e.detail;

            this._emitEvent('fieldChange', {
                kind: target.dataset.kind,
                field: target.dataset.field,
                id: target.dataset.id,
                wpId: target.dataset.wpId,
                initiativeId: target.dataset.initiativeId,
                teamId: target.dataset.teamId,
                value: value,
                target: target
            });
        });
    }

    /**
     * Emits event to controller
     */
    _emitEvent(type, data) {
        if (this.onEvent) {
            this.onEvent(type, data);
        }
    }

    /**
     * Refreshes a specific row by ID (for partial updates)
     * @param {string} rowId - Row identifier
     */
    refreshRow(rowId) {
        // TODO: Implement partial row refresh for Frappe sync
        console.log('GanttTableView: refreshRow called for', rowId);
    }

    /**
     * Gets the table container for resizer integration
     */
    getTableWrapper() {
        return this.tableWrapper;
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttTableView;
}
