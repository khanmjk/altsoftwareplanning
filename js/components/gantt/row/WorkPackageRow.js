/**
 * WorkPackageRow.js
 * 
 * Renders work package rows using pure DOM creation.
 * No innerHTML templates - all elements created programmatically.
 * 
 * Part of Gantt Table MVC Architecture - Row Components
 */

class WorkPackageRow {
    /**
     * Renders a work package row
     * @param {object} wp - Work package data
     * @param {object} options - Rendering options
     * @returns {HTMLTableRowElement}
     */
    render(wp, options = {}) {
        const {
            isExpanded = false,
            isFocusInitiative = false,
            isFocusRow = false,
            showManagerTeams = false,
            selectedTeam = null,
            workingDaysPerYear = 261,
            allWorkPackages = [],
            teams = []
        } = options;

        const tr = document.createElement('tr');
        tr.className = [
            'gantt-wp-row',
            isFocusRow ? 'gantt-focus-row' : '',
            isFocusInitiative ? 'gantt-focus-initiative' : '',
            wp.isImplicit ? 'gantt-wp-row--implicit' : ''
        ].filter(Boolean).join(' ');
        tr.dataset.wpId = wp.workPackageId;
        tr.dataset.initiativeId = wp.initiativeId;

        // Title Cell
        tr.appendChild(this._createTitleCell(wp, isExpanded));

        // Teams Cell (conditional)
        if (showManagerTeams) {
            tr.appendChild(this._createTeamsCell(wp, teams, selectedTeam));
        }

        // Start Date Cell
        tr.appendChild(this._createDateCell(wp, 'startDate'));

        // End Date Cell
        tr.appendChild(this._createDateCell(wp, 'endDate'));

        // SDEs Cell (computed, read-only)
        tr.appendChild(this._createSdeCell(wp, workingDaysPerYear, selectedTeam));

        // Dependencies Cell
        tr.appendChild(this._createDependenciesCell(wp, allWorkPackages));

        // Actions Cell
        tr.appendChild(this._createActionsCell(wp));

        return tr;
    }

    /**
     * Creates the title cell with expander and editable title
     */
    _createTitleCell(wp, isExpanded) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-title';

        const wrapper = document.createElement('div');

        // Expander button
        const expanderBtn = document.createElement('button');
        expanderBtn.className = 'gantt-expander';
        expanderBtn.dataset.action = 'toggle-wp';
        expanderBtn.dataset.wpId = wp.workPackageId;
        expanderBtn.setAttribute('aria-label', 'Toggle team assignments');
        expanderBtn.textContent = isExpanded ? '−' : '+';
        wrapper.appendChild(expanderBtn);

        // Title input (editable)
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = wp.title || '';
        titleInput.dataset.kind = 'work-package';
        titleInput.dataset.field = 'title';
        titleInput.dataset.wpId = wp.workPackageId;
        titleInput.dataset.initiativeId = wp.initiativeId;

        if (wp.isImplicit) {
            titleInput.disabled = true;
            titleInput.title = 'Implicit work package from initiative';
        }

        wrapper.appendChild(titleInput);

        cell.appendChild(wrapper);
        return cell;
    }

    /**
     * Creates the teams cell for manager view
     */
    _createTeamsCell(wp, teams, selectedTeam) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-teams';

        const teamNames = this._formatWorkPackageTeams(wp, teams, selectedTeam);
        cell.textContent = teamNames;

        return cell;
    }

    /**
     * Creates a date input cell
     */
    _createDateCell(wp, field) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp';

        const input = document.createElement('input');
        input.type = 'date';
        input.value = wp[field] || '';
        input.dataset.kind = 'work-package';
        input.dataset.field = field;
        input.dataset.wpId = wp.workPackageId;
        input.dataset.initiativeId = wp.initiativeId;

        if (wp.isImplicit) {
            input.disabled = true;
        }

        cell.appendChild(input);
        return cell;
    }

    /**
     * Creates the computed SDE cell (read-only)
     */
    _createSdeCell(wp, workingDaysPerYear, selectedTeam) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-sde';

        const sdeYears = this._computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam);
        cell.textContent = sdeYears;

        return cell;
    }

    /**
     * Creates the dependencies selector cell
     * WP dependencies are scoped to sibling WPs within the same initiative only
     */
    _createDependenciesCell(wp, allWorkPackages) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp';

        // Filter to only sibling WPs (same initiative, different WP)
        const siblingWPs = allWorkPackages.filter(other =>
            other.initiativeId === wp.initiativeId &&
            other.workPackageId !== wp.workPackageId
        );

        // If no sibling WPs exist, show placeholder text instead of dropdown
        if (siblingWPs.length === 0) {
            cell.textContent = '—';
            cell.title = 'No other work packages in this initiative to depend on';
            return cell;
        }

        // Multi-select for WP dependencies (can select multiple predecessor WPs)
        const currentDeps = wp.dependencies || [];

        const options = siblingWPs.map(other => {
            const wouldCycle = this._wouldCreateCycle(wp.workPackageId, other.workPackageId, allWorkPackages);
            return {
                value: other.workPackageId,
                text: this._truncateLabel(other.title, 20),
                disabled: wouldCycle,
                // Note: ThemedSelect handles 'selected' state via the 'value' prop passed to constructor,
                // but we can add title/tooltip logic if ThemedSelect supports it or via custom render if needed.
                // For now, ThemedSelect renders standard options.
            };
        });

        const themedSelect = new ThemedSelect({
            options: options,
            value: currentDeps,
            multiple: true,
            placeholder: 'None',
            className: 'themed-select--compact',
            onChange: (value, text) => {
                // Dispatch bubbling custom event for delegation
                // Value is array of strings
                const event = new CustomEvent('themed-select-change', {
                    bubbles: true,
                    detail: { value, text }
                });
                selectContainer.dispatchEvent(event);
            }
        });

        const selectContainer = themedSelect.render();
        selectContainer.style.minWidth = '120px';
        selectContainer.dataset.kind = 'work-package';
        selectContainer.dataset.field = 'dependencies';
        selectContainer.dataset.wpId = wp.workPackageId;
        selectContainer.dataset.initiativeId = wp.initiativeId;

        if (wp.isImplicit) {
            themedSelect.setDisabled(true);
        }

        cell.appendChild(selectContainer);
        return cell;
    }

    /**
     * Creates the actions cell with Add Task and Delete buttons
     */
    _createActionsCell(wp) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--wp gantt-table__cell--wp-actions';

        // Add Task button
        const addTaskBtn = document.createElement('button');
        addTaskBtn.className = 'btn-secondary btn-sm';
        addTaskBtn.dataset.action = 'add-task';
        addTaskBtn.dataset.wpId = wp.workPackageId;
        addTaskBtn.dataset.initiativeId = wp.initiativeId;
        addTaskBtn.title = 'Add team assignment';
        addTaskBtn.textContent = '+ Task';
        cell.appendChild(addTaskBtn);

        // Delete button (not for implicit WPs)
        if (!wp.isImplicit) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-danger btn-sm';
            deleteBtn.dataset.action = 'delete-wp';
            deleteBtn.dataset.id = wp.workPackageId;
            deleteBtn.dataset.initiativeId = wp.initiativeId;
            deleteBtn.textContent = 'Delete';
            cell.appendChild(deleteBtn);
        }

        return cell;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    _formatWorkPackageTeams(wp, teams, selectedTeam) {
        return GanttService.formatWorkPackageTeams(wp, teams, selectedTeam);
    }

    _computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam) {
        return GanttService.computeWorkPackageSdeYears(wp, workingDaysPerYear, selectedTeam);
    }

    _wouldCreateCycle(fromWpId, toWpId, allWorkPackages) {
        return GanttService.wouldCreateDependencyCycle(fromWpId, toWpId, allWorkPackages);
    }

    _truncateLabel(text, maxLen) {
        return GanttService.truncateLabel(text, maxLen);
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkPackageRow;
}
