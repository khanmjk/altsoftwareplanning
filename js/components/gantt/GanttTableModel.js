/**
 * GanttTableModel.js
 * 
 * State management and data normalization for the Gantt Table.
 * Extends EventTarget for reactive updates.
 * 
 * Responsibilities:
 * - Manages UI state (expanded rows, focus, selection)
 * - Normalizes data (handles implicit WP fallback)
 * - Emits change events for view updates
 * 
 * Part of Gantt Table MVC Architecture
 */

class GanttTableModel extends EventTarget {
    constructor() {
        super();

        // UI State
        this.expandedInitiatives = new Set();
        this.expandedWorkPackages = new Set();
        this.expandedOtherTeams = new Set();

        // Focus tracking
        this.focus = {
            taskId: null,
            taskType: null,      // 'initiative' | 'workPackage' | 'assignment'
            initiativeId: null
        };

        // Multi-select for bulk operations (future)
        this.selection = new Set();

        // Filter state
        this.filters = {
            year: new Date().getFullYear(),
            groupBy: 'All Initiatives',
            groupValue: 'all',
            statusFilter: new Set(['Backlog', 'Defined', 'Committed', 'Completed'])
        };
    }

    // =========================================================================
    // EXPANSION STATE
    // =========================================================================

    /**
     * Toggles expansion state of an initiative
     * @param {string} initiativeId 
     * @returns {boolean} New expansion state
     */
    toggleInitiative(initiativeId) {
        if (this.expandedInitiatives.has(initiativeId)) {
            this.expandedInitiatives.delete(initiativeId);
        } else {
            this.expandedInitiatives.add(initiativeId);
        }
        this._emit('expand', { type: 'initiative', id: initiativeId });
        return this.expandedInitiatives.has(initiativeId);
    }

    /**
     * Toggles expansion state of a work package
     * @param {string} workPackageId 
     * @returns {boolean} New expansion state
     */
    toggleWorkPackage(workPackageId) {
        if (this.expandedWorkPackages.has(workPackageId)) {
            this.expandedWorkPackages.delete(workPackageId);
        } else {
            this.expandedWorkPackages.add(workPackageId);
        }
        this._emit('expand', { type: 'workPackage', id: workPackageId });
        return this.expandedWorkPackages.has(workPackageId);
    }

    /**
     * Toggles "other teams" expansion for a work package
     * @param {string} workPackageId 
     * @returns {boolean} New expansion state
     */
    toggleOtherTeams(workPackageId) {
        if (this.expandedOtherTeams.has(workPackageId)) {
            this.expandedOtherTeams.delete(workPackageId);
        } else {
            this.expandedOtherTeams.add(workPackageId);
        }
        this._emit('expand', { type: 'otherTeams', id: workPackageId });
        return this.expandedOtherTeams.has(workPackageId);
    }

    isInitiativeExpanded(initiativeId) {
        return this.expandedInitiatives.has(initiativeId);
    }

    isWorkPackageExpanded(workPackageId) {
        return this.expandedWorkPackages.has(workPackageId);
    }

    isOtherTeamsExpanded(workPackageId) {
        return this.expandedOtherTeams.has(workPackageId);
    }

    // =========================================================================
    // FOCUS STATE
    // =========================================================================

    /**
     * Sets focus context for highlighting
     * @param {object} context - { taskId, taskType, initiativeId }
     */
    setFocus(context) {
        this.focus = {
            taskId: context.taskId || null,
            taskType: context.taskType || null,
            initiativeId: context.initiativeId || null
        };
        this._emit('focus', this.focus);
    }

    clearFocus() {
        this.focus = { taskId: null, taskType: null, initiativeId: null };
        this._emit('focus', this.focus);
    }

    getFocus() {
        return { ...this.focus };
    }

    // =========================================================================
    // SELECTION STATE (for future bulk operations)
    // =========================================================================

    addToSelection(id) {
        this.selection.add(id);
        this._emit('selection', { action: 'add', id });
    }

    removeFromSelection(id) {
        this.selection.delete(id);
        this._emit('selection', { action: 'remove', id });
    }

    clearSelection() {
        this.selection.clear();
        this._emit('selection', { action: 'clear' });
    }

    isSelected(id) {
        return this.selection.has(id);
    }

    // =========================================================================
    // FILTER STATE
    // =========================================================================

    setFilter(key, value) {
        this.filters[key] = value;
        this._emit('filter', { key, value });
    }

    getFilters() {
        return { ...this.filters };
    }

    // =========================================================================
    // DATA NORMALIZATION
    // =========================================================================

    /**
     * Normalizes initiative data with smart WP fallback.
     * If an initiative has no WPs but has team estimates,
     * creates an implicit WP to display the tasks.
     * 
     * @param {Array} initiatives - Raw initiatives from SystemService
     * @param {Array} workPackages - All work packages
     * @returns {Array} Normalized data with workPackages attached
     */
    getNormalizedData(initiatives, workPackages) {
        return initiatives.map(init => {
            const wps = workPackages.filter(wp => wp.initiativeId === init.initiativeId);

            if (wps.length === 0 && init.assignments?.length) {
                // No WPs but has team estimates: treat Initiative as implicit WP
                return {
                    ...init,
                    workPackages: [{
                        workPackageId: `implicit-${init.initiativeId}`,
                        initiativeId: init.initiativeId,
                        title: init.title,
                        isImplicit: true,
                        startDate: init.startDate,
                        endDate: init.targetDueDate,
                        impactedTeamAssignments: init.assignments || []
                    }]
                };
            }

            // Compute displayStart/displayEnd from WP dates (project management rollup)
            // Initiative start = earliest WP start, Initiative end = latest WP end
            let displayStart = null;
            let displayEnd = null;

            wps.forEach(wp => {
                if (wp.startDate) {
                    if (!displayStart || wp.startDate < displayStart) displayStart = wp.startDate;
                }
                if (wp.endDate) {
                    if (!displayEnd || wp.endDate > displayEnd) displayEnd = wp.endDate;
                }
            });

            return {
                ...init,
                workPackages: wps,
                // Computed dates from WP rollup (priority over stored dates if WPs exist)
                displayStart: wps.length > 0 ? displayStart : (init.attributes?.startDate || init.startDate),
                displayEnd: wps.length > 0 ? displayEnd : init.targetDueDate
            };
        });
    }

    /**
     * Normalizes a Gantt ID to lowercase with hyphens.
     * Delegates to GanttService if available.
     * @param {string} value 
     * @returns {string}
     */
    normalizeId(value) {
        if (typeof GanttService !== 'undefined' && GanttService.normalizeGanttId) {
            return GanttService.normalizeGanttId(value);
        }
        if (!value) return '';
        return String(value).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    // =========================================================================
    // EVENT EMISSION
    // =========================================================================

    /**
     * Emits a custom event for model changes
     * @param {string} type - Event type
     * @param {object} payload - Event data
     */
    _emit(type, payload) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: { type, payload }
        }));
    }

    // =========================================================================
    // SERIALIZATION (for state persistence)
    // =========================================================================

    serialize() {
        return {
            expandedInitiatives: Array.from(this.expandedInitiatives),
            expandedWorkPackages: Array.from(this.expandedWorkPackages),
            expandedOtherTeams: Array.from(this.expandedOtherTeams),
            focus: this.focus,
            filters: {
                ...this.filters,
                statusFilter: Array.from(this.filters.statusFilter)
            }
        };
    }

    deserialize(state) {
        if (state.expandedInitiatives) {
            this.expandedInitiatives = new Set(state.expandedInitiatives);
        }
        if (state.expandedWorkPackages) {
            this.expandedWorkPackages = new Set(state.expandedWorkPackages);
        }
        if (state.expandedOtherTeams) {
            this.expandedOtherTeams = new Set(state.expandedOtherTeams);
        }
        if (state.focus) {
            this.focus = state.focus;
        }
        if (state.filters) {
            this.filters = {
                ...state.filters,
                statusFilter: new Set(state.filters.statusFilter || [])
            };
        }
    }
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttTableModel;
}
