/**
 * GoalService.js
 * 
 * Domain logic for managing Goals.
 * Handles CRUD operations, date propagation, and status calculations.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const GoalService = {

    // Status constants
    STATUS: {
        ON_TRACK: 'on-track',
        AT_RISK: 'at-risk',
        NOT_STARTED: 'not-started'
    },

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    /**
     * Adds a new goal to systemData.goals.
     * @param {object} systemData - The global system data object.
     * @param {object} goalData - The goal object to add.
     * @returns {object|null} The added goal with an ID, or null if failed.
     */
    addGoal(systemData, goalData) {
        if (!systemData) {
            console.error('GoalService.addGoal: systemData is required');
            return null;
        }

        if (!systemData.goals) {
            systemData.goals = [];
        }

        const newGoal = {
            goalId: goalData.goalId || this._generateId('goal'),
            title: goalData.title || 'New Goal',
            description: goalData.description || '',
            targetEndDate: goalData.targetEndDate || null,
            plannedEndDate: null, // Computed from initiatives
            status: this.STATUS.NOT_STARTED,
            statusMessage: '',
            createdAt: new Date().toISOString(),
            ...goalData
        };

        systemData.goals.push(newGoal);
        return newGoal;
    },

    /**
     * Updates an existing goal in systemData.goals.
     * @param {object} systemData - The global system data object.
     * @param {string} goalId - The ID of the goal to update.
     * @param {object} updates - An object containing the fields to update.
     * @returns {object|null} The updated goal, or null if not found.
     */
    updateGoal(systemData, goalId, updates) {
        if (!systemData || !systemData.goals) {
            console.error('GoalService.updateGoal: Invalid systemData');
            return null;
        }

        const goal = systemData.goals.find(g => g.goalId === goalId);
        if (!goal) {
            console.warn(`GoalService.updateGoal: Goal not found: ${goalId}`);
            return null;
        }

        Object.assign(goal, updates);

        // Recalculate status if dates changed
        if (updates.targetEndDate || updates.plannedEndDate) {
            this.refreshGoalStatus(goal);
        }

        return goal;
    },

    /**
     * Deletes a goal from systemData.goals.
     * @param {object} systemData - The global system data object.
     * @param {string} goalId - The ID of the goal to delete.
     * @returns {boolean} True if deletion was successful.
     */
    deleteGoal(systemData, goalId) {
        if (!systemData || !systemData.goals) {
            return false;
        }

        const index = systemData.goals.findIndex(g => g.goalId === goalId);
        if (index === -1) {
            return false;
        }

        systemData.goals.splice(index, 1);
        return true;
    },

    /**
     * Gets a goal by ID.
     * @param {object} systemData - The global system data object.
     * @param {string} goalId - The goal ID.
     * @returns {object|null} The goal or null.
     */
    getGoal(systemData, goalId) {
        if (!systemData || !systemData.goals) return null;
        return systemData.goals.find(g => g.goalId === goalId) || null;
    },

    // =========================================================================
    // DATE PROPAGATION
    // =========================================================================

    /**
     * Refreshes a goal's planned end date based on its linked initiatives.
     * Rule: plannedEndDate = max(initiative.endDate) for all linked initiatives
     * 
     * @param {object} systemData - The global system data object.
     * @param {string} goalId - The goal ID to refresh.
     * @returns {object|null} Updated goal or null.
     */
    refreshGoalDates(systemData, goalId) {
        const goal = this.getGoal(systemData, goalId);
        if (!goal) return null;

        const initiatives = this.getInitiativesForGoal(systemData, goalId);

        if (initiatives.length === 0) {
            goal.plannedEndDate = null;
            goal.status = this.STATUS.NOT_STARTED;
            goal.statusMessage = '';
            return goal;
        }

        // Compute max end date from initiatives
        let maxEndDate = null;
        initiatives.forEach(init => {
            const endDate = init.computedEndDate || init.targetDueDate || init.endDate;
            if (endDate) {
                if (!maxEndDate || endDate > maxEndDate) {
                    maxEndDate = endDate;
                }
            }
        });

        goal.plannedEndDate = maxEndDate;
        this.refreshGoalStatus(goal);

        return goal;
    },

    /**
     * Computes the planned end date for a goal.
     * Pure calculation - doesn't modify the goal.
     * 
     * @param {object} goal - The goal object.
     * @param {Array} initiatives - Initiatives linked to this goal.
     * @returns {string|null} The computed planned end date.
     */
    computeGoalPlannedEndDate(goal, initiatives) {
        if (!initiatives || initiatives.length === 0) {
            return null;
        }

        let maxEndDate = null;
        initiatives.forEach(init => {
            const endDate = init.computedEndDate || init.targetDueDate || init.endDate;
            if (endDate) {
                if (!maxEndDate || endDate > maxEndDate) {
                    maxEndDate = endDate;
                }
            }
        });

        return maxEndDate;
    },

    // =========================================================================
    // STATUS CALCULATIONS
    // =========================================================================

    /**
     * Refreshes a goal's status based on dates.
     * Modifies the goal object in place.
     * 
     * @param {object} goal - The goal to update.
     */
    refreshGoalStatus(goal) {
        const status = this.getGoalStatus(goal);
        goal.status = status.status;
        goal.statusMessage = status.message;
    },

    /**
     * Computes goal status based on target vs planned dates.
     * Pure calculation - doesn't modify the goal.
     * 
     * @param {object} goal - The goal object with targetEndDate and plannedEndDate.
     * @returns {object} { status: string, message: string }
     */
    getGoalStatus(goal) {
        if (!goal.plannedEndDate) {
            return {
                status: this.STATUS.NOT_STARTED,
                message: 'No initiatives linked'
            };
        }

        if (!goal.targetEndDate) {
            return {
                status: this.STATUS.ON_TRACK,
                message: 'No target date set'
            };
        }

        const target = new Date(goal.targetEndDate);
        const planned = new Date(goal.plannedEndDate);

        if (planned <= target) {
            return {
                status: this.STATUS.ON_TRACK,
                message: ''
            };
        }

        // At Risk - calculate days over
        const diffMs = planned - target;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
            status: this.STATUS.AT_RISK,
            message: `Exceeds target by ${diffDays} day${diffDays === 1 ? '' : 's'}`
        };
    },

    /**
     * Gets a human-readable status message for a goal.
     * 
     * @param {object} goal - The goal object.
     * @returns {string} Status message.
     */
    getGoalStatusMessage(goal) {
        const status = this.getGoalStatus(goal);
        return status.message;
    },

    // =========================================================================
    // INITIATIVE LINKS
    // =========================================================================

    /**
     * Gets all initiatives linked to a goal.
     * 
     * @param {object} systemData - The global system data object.
     * @param {string} goalId - The goal ID.
     * @returns {Array} Linked initiatives.
     */
    getInitiativesForGoal(systemData, goalId) {
        if (!systemData || !systemData.yearlyInitiatives) {
            return [];
        }

        return systemData.yearlyInitiatives.filter(init => {
            // Support both direct goalId field and goalIds array
            if (init.goalId === goalId) return true;
            if (Array.isArray(init.goalIds) && init.goalIds.includes(goalId)) return true;
            return false;
        });
    },

    /**
     * Links an initiative to a goal.
     * 
     * @param {object} systemData - The global system data object.
     * @param {string} initiativeId - The initiative ID.
     * @param {string} goalId - The goal ID to link to.
     * @returns {boolean} Success status.
     */
    linkInitiativeToGoal(systemData, initiativeId, goalId) {
        if (!systemData || !systemData.yearlyInitiatives) {
            return false;
        }

        const initiative = systemData.yearlyInitiatives.find(
            i => i.initiativeId === initiativeId
        );

        if (!initiative) {
            console.warn(`GoalService.linkInitiativeToGoal: Initiative not found: ${initiativeId}`);
            return false;
        }

        // Set goalId (or add to goalIds array if supporting multiple)
        initiative.goalId = goalId;

        // Refresh goal dates after linking
        this.refreshGoalDates(systemData, goalId);

        return true;
    },

    /**
     * Unlinks an initiative from a goal.
     * 
     * @param {object} systemData - The global system data object.
     * @param {string} initiativeId - The initiative ID.
     * @param {string} goalId - The goal ID to unlink from.
     * @returns {boolean} Success status.
     */
    unlinkInitiativeFromGoal(systemData, initiativeId, goalId) {
        if (!systemData || !systemData.yearlyInitiatives) {
            return false;
        }

        const initiative = systemData.yearlyInitiatives.find(
            i => i.initiativeId === initiativeId
        );

        if (!initiative) {
            return false;
        }

        if (initiative.goalId === goalId) {
            initiative.goalId = null;
        }

        // Refresh goal dates after unlinking
        this.refreshGoalDates(systemData, goalId);

        return true;
    },

    // =========================================================================
    // UTILITIES
    // =========================================================================

    /**
     * Generates a unique ID.
     * @private
     */
    _generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Refreshes all goal dates in the system.
     * Useful after bulk initiative updates.
     * 
     * @param {object} systemData - The global system data object.
     */
    refreshAllGoalDates(systemData) {
        if (!systemData || !systemData.goals) return;

        systemData.goals.forEach(goal => {
            this.refreshGoalDates(systemData, goal.goalId);
        });
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalService;
}
