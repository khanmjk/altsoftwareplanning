/**
 * AssignmentRow.js
 * 
 * Renders team assignment rows using pure DOM creation.
 * No innerHTML templates - all elements created programmatically.
 * 
 * Part of Gantt Table MVC Architecture - Row Components
 */

class AssignmentRow {
    /**
     * Renders a team assignment row
     * @param {object} assign - Assignment data (teamId, sdeDays, startDate, endDate)
     * @param {object} wp - Parent work package
     * @param {object} options - Rendering options
     * @returns {HTMLTableRowElement}
     */
    render(assign, wp, options = {}) {
        const {
            isFocusInitiative = false,
            isFocusRow = false,
            showManagerTeams = false,
            workingDaysPerYear = 261,
            teams = []
        } = options;

        const tr = document.createElement('tr');
        tr.className = [
            'gantt-wp-assign-row',
            isFocusRow ? 'gantt-focus-row' : '',
            isFocusInitiative ? 'gantt-focus-initiative' : ''
        ].filter(Boolean).join(' ');
        tr.dataset.wpId = wp.workPackageId;
        tr.dataset.initiativeId = wp.initiativeId;
        tr.dataset.teamId = assign.teamId;

        // Team Name Cell
        tr.appendChild(this._createTeamCell(assign, teams));

        // Empty cell for Teams column (manager view only)
        if (showManagerTeams) {
            const emptyCell = document.createElement('td');
            emptyCell.className = 'gantt-table__cell--assignment-empty';
            tr.appendChild(emptyCell);
        }

        // Start Date Cell
        tr.appendChild(this._createDateCell(assign, wp, 'startDate'));

        // End Date Cell
        tr.appendChild(this._createDateCell(assign, wp, 'endDate'));

        // SDE Years Cell
        tr.appendChild(this._createSdeCell(assign, wp, workingDaysPerYear));

        // Dependencies Cell (assignment-level dependencies)
        tr.appendChild(this._createDependenciesCell(assign, wp));

        // Actions Cell
        tr.appendChild(this._createActionsCell(assign, wp));

        return tr;
    }

    /**
     * Creates the team name cell
     */
    _createTeamCell(assign, teams) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell--assignment';

        const teamName = this._getTeamName(assign.teamId, teams);
        cell.textContent = `Team: ${teamName}`;

        return cell;
    }

    /**
     * Creates a date input cell
     */
    _createDateCell(assign, wp, field) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell--assignment-empty';

        const input = document.createElement('input');
        input.type = 'date';
        // Default to WP date if assignment date not set
        input.value = assign[field] || wp[field] || '';
        input.dataset.kind = 'wp-assign';
        input.dataset.field = field;
        input.dataset.wpId = wp.workPackageId;
        input.dataset.initiativeId = wp.initiativeId;
        input.dataset.teamId = assign.teamId || '';

        cell.appendChild(input);
        return cell;
    }

    /**
     * Creates the SDE years input cell
     */
    _createSdeCell(assign, wp, workingDaysPerYear) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell--assignment-empty';

        const sdeYears = ((assign.sdeDays || 0) / workingDaysPerYear).toFixed(2);

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = sdeYears;
        input.dataset.kind = 'wp-assign';
        input.dataset.field = 'sdeYears';
        input.dataset.wpId = wp.workPackageId;
        input.dataset.initiativeId = wp.initiativeId;
        input.dataset.teamId = assign.teamId || '';

        cell.appendChild(input);
        return cell;
    }

    /**
     * Creates the dependencies cell for assignment-level dependencies
     */
    _createDependenciesCell(assign, wp) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell--assignment-empty';

        // Get other assignments in this WP for dependency selection
        const otherAssignments = (wp.impactedTeamAssignments || [])
            .filter(a => a.teamId !== assign.teamId);

        if (otherAssignments.length > 0) {
            // Build options
            const options = [{ value: '', text: 'None' }];
            otherAssignments.forEach(other => {
                options.push({
                    value: other.teamId,
                    text: this._getTeamName(other.teamId, [])
                });
            });

            // Create ThemedSelect
            const themedSelect = new ThemedSelect({
                options: options,
                value: assign.predecessorAssignmentIds || [],
                multiple: true,
                placeholder: 'None',
                className: 'themed-select--compact',
                onChange: (value, text) => {
                    const event = new CustomEvent('themed-select-change', {
                        bubbles: true,
                        detail: { value, text }
                    });
                    selectContainer.dispatchEvent(event);
                }
            });

            const selectContainer = themedSelect.render();
            selectContainer.dataset.kind = 'wp-assign';
            selectContainer.dataset.field = 'predecessorAssignmentIds';
            selectContainer.dataset.wpId = wp.workPackageId;
            selectContainer.dataset.initiativeId = wp.initiativeId;
            selectContainer.dataset.teamId = assign.teamId || '';

            cell.appendChild(selectContainer);
        } else {
            // No dependencies available
            const span = document.createElement('span');
            span.className = 'text-muted';
            span.textContent = '—';
            cell.appendChild(span);
        }

        return cell;
    }

    /**
     * Creates the actions cell with delete button
     */
    _createActionsCell(assign, wp) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell--assignment-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger btn-sm';
        deleteBtn.dataset.action = 'delete-task';
        deleteBtn.dataset.wpId = wp.workPackageId;
        deleteBtn.dataset.initiativeId = wp.initiativeId;
        deleteBtn.dataset.teamId = assign.teamId || '';
        deleteBtn.title = 'Delete this assignment';
        deleteBtn.textContent = '×';

        cell.appendChild(deleteBtn);
        return cell;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    _getTeamName(teamId, teams) {
        if (!teamId) return '(Unassigned)';

        // Try to find team in provided teams
        const team = teams.find(t => t.teamId === teamId);
        if (team) {
            return team.teamIdentity || team.teamName || teamId;
        }

        // Fallback to SystemService
        const allTeams = SystemService.getCurrentSystem()?.teams || [];
        const foundTeam = allTeams.find(t => t.teamId === teamId);
        if (foundTeam) {
            return foundTeam.teamIdentity || foundTeam.teamName || teamId;
        }

        return teamId;
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssignmentRow;
}
