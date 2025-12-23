/**
 * InitiativeRow.js
 * 
 * Renders initiative rows using pure DOM creation.
 * No innerHTML templates - all elements created programmatically.
 * 
 * Part of Gantt Table MVC Architecture - Row Components
 */

class InitiativeRow {
    /**
     * Renders an initiative row
     * @param {object} init - Initiative data
     * @param {object} options - Rendering options
     * @returns {HTMLTableRowElement}
     */
    render(init, options = {}) {
        const {
            isExpanded = false,
            isFocusInitiative = false,
            isFocusRow = false,
            hasWorkPackages = false,
            showManagerTeams = false,
            allInitiatives = [],
            teams = [],
            filterYear = new Date().getFullYear()
        } = options;

        // Compute default start date if missing (first working day of year)
        const defaultStartDate = this._getFirstWorkingDay(filterYear);

        const tr = document.createElement('tr');
        tr.className = [
            'gantt-init-row',
            isFocusInitiative ? 'gantt-focus-initiative' : '',
            isFocusRow ? 'gantt-focus-row' : ''
        ].filter(Boolean).join(' ');
        tr.dataset.initiativeId = init.initiativeId;

        // Title Cell
        tr.appendChild(this._createTitleCell(init, isExpanded));

        // Teams Cell (conditional)
        if (showManagerTeams) {
            tr.appendChild(this._createTeamsCell(init, teams));
        }

        // Start Date Cell
        tr.appendChild(this._createDateCell(init, 'startDate', 'displayStart', hasWorkPackages, defaultStartDate));

        // Target Date Cell
        tr.appendChild(this._createDateCell(init, 'targetDueDate', 'displayEnd', hasWorkPackages, null));

        // SDEs Cell
        tr.appendChild(this._createSdeCell(init, hasWorkPackages));

        // Dependencies Cell
        tr.appendChild(this._createDependenciesCell(init, options));

        // Actions Cell
        tr.appendChild(this._createActionsCell(init));

        return tr;
    }

    /**
     * Creates the title cell with expander and title
     */
    _createTitleCell(init, isExpanded) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative gantt-table__cell--initiative-title';

        // Expander button
        const expanderBtn = document.createElement('button');
        expanderBtn.className = 'gantt-expander';
        expanderBtn.dataset.action = 'toggle-initiative';
        expanderBtn.dataset.id = init.initiativeId;
        expanderBtn.setAttribute('aria-label', 'Toggle work packages');
        expanderBtn.textContent = isExpanded ? '−' : '+';
        cell.appendChild(expanderBtn);

        // Title container
        const titleContainer = document.createElement('div');
        titleContainer.className = 'gantt-table__title-container';

        const titleDiv = document.createElement('div');
        titleDiv.textContent = init.title || '(Untitled)';
        titleContainer.appendChild(titleDiv);

        const idBadge = document.createElement('div');
        idBadge.className = 'gantt-table__id-badge';
        idBadge.textContent = init.initiativeId || '';
        titleContainer.appendChild(idBadge);

        cell.appendChild(titleContainer);
        return cell;
    }

    /**
     * Creates the teams cell for manager view
     */
    _createTeamsCell(init, teams) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative';

        // Get team names for this initiative
        const teamNames = this._getTeamsForInitiative(init, teams);
        cell.textContent = teamNames.join(', ');

        return cell;
    }

    /**
     * Creates a date input cell
     * @param {object} init - Initiative data
     * @param {string} field - Data field name
     * @param {string} displayField - Computed display field name
     * @param {boolean} hasWorkPackages - Whether initiative has work packages
     * @param {string} fallbackDate - Fallback date if no value exists
     */
    _createDateCell(init, field, displayField, hasWorkPackages, fallbackDate = null) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative';

        const input = document.createElement('input');
        input.type = 'date';
        // Use displayField, then field, then fallback
        input.value = init[displayField] || init[field] || fallbackDate || '';
        input.dataset.kind = 'initiative';
        input.dataset.field = field;
        input.dataset.id = init.initiativeId;

        if (hasWorkPackages) {
            input.disabled = true;
            input.title = 'Edit dates at Work Package level when WPs exist.';
        }

        cell.appendChild(input);
        return cell;
    }

    /**
     * Creates the SDE estimate cell
     */
    _createSdeCell(init, hasWorkPackages) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative';

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = this._computeSdeEstimate(init);
        input.dataset.kind = 'initiative';
        input.dataset.field = 'sdeEstimate';
        input.dataset.id = init.initiativeId;

        if (hasWorkPackages) {
            input.disabled = true;
            input.title = 'Edit SDEs at Work Package level when WPs exist.';
        }

        cell.appendChild(input);
        return cell;
    }

    /**
     * Creates the dependencies selector cell
     */
    _createDependenciesCell(init, options) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative gantt-table__cell--overflow-visible';

        // Context passed from controller contains allInitiatives and optionally filteredInitiatives
        // Use filteredInitiatives if available to respect active filters
        const candidates = options.filteredInitiatives || options.allInitiatives;

        // Build options
        const selectOptions = [{ value: '', text: 'None' }];
        candidates.forEach(other => {
            if (other.initiativeId !== init.initiativeId) {
                selectOptions.push({
                    value: other.initiativeId,
                    text: this._truncateLabel(other.title, 25)
                });
            }
        });

        // Create ThemedSelect
        const themedSelect = new ThemedSelect({
            options: selectOptions,
            value: init.dependencies || [],
            multiple: true,
            placeholder: 'None',
            className: 'themed-select--compact',
            onChange: (value, text) => {
                // Dispatch bubbling custom event for delegation
                const event = new CustomEvent('themed-select-change', {
                    bubbles: true,
                    detail: { value, text }
                });
                selectContainer.dispatchEvent(event);
            }
        });

        const selectContainer = themedSelect.render();

        // Attach data attributes for delegation handler
        selectContainer.dataset.kind = 'initiative';
        selectContainer.dataset.field = 'dependencies';
        selectContainer.dataset.id = init.initiativeId;

        cell.appendChild(selectContainer);
        return cell;
    }

    /**
     * Creates the actions cell
     */
    _createActionsCell(init) {
        const cell = document.createElement('td');
        cell.className = 'gantt-table__cell gantt-table__cell--initiative';

        const addWpBtn = document.createElement('button');
        addWpBtn.className = 'gantt-add-wp btn-primary';
        addWpBtn.dataset.action = 'add-wp';
        addWpBtn.dataset.id = init.initiativeId;
        addWpBtn.textContent = 'Add WP';

        cell.appendChild(addWpBtn);
        return cell;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    _getTeamsForInitiative(init, teams) {
        return GanttService.getTeamsForInitiative(init, teams);
    }

    _computeSdeEstimate(init) {
        return GanttService.computeSdeEstimate(init);
    }

    _truncateLabel(text, maxLen) {
        return GanttService.truncateLabel(text, maxLen);
    }

    /**
     * Gets the first working day of the year (skips weekends)
     * @param {number} year
     * @returns {string} Date in YYYY-MM-DD format
     */
    _getFirstWorkingDay(year) {
        const date = new Date(year, 0, 1); // Jan 1
        // Skip to first weekday if Jan 1 is weekend
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }
        return date.toISOString().split('T')[0];
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InitiativeRow;
}
