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
    NOT_STARTED: 'not-started',
    COMPLETED: 'completed',
  },

  // Detailed health matrix codes
  HEALTH: {
    NO_INITIATIVES: 'no-initiatives',
    NO_DUE_DATE: 'no-due-date',
    NOT_STARTED_OK: 'not-started-ok',
    NOT_STARTED_AT_RISK: 'not-started-at-risk',
    IN_PROGRESS_OK: 'in-progress-ok',
    IN_PROGRESS_AT_RISK: 'in-progress-at-risk',
    IN_PROGRESS_SLIPPING: 'in-progress-slipping',
    IN_PROGRESS_SLIPPED_ORIGINAL_DUE: 'in-progress-slipped-original-due',
    IN_PROGRESS_ON_TRACK_NEW_DUE: 'in-progress-on-track-new-due',
    SLIPPED_DID_NOT_MEET: 'slipped-did-not-meet',
    COMPLETED_ON_TIME: 'completed-on-time',
    COMPLETED_LATE: 'completed-late',
  },

  DEFAULT_RULES: {
    notStartedAtRiskDays: 30,
    inProgressAtRiskDays: 21,
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
      targetEndDate: goalData.targetEndDate || goalData.dueDate || null,
      dueDate: goalData.dueDate || goalData.targetEndDate || null,
      plannedEndDate: null, // Computed from initiatives
      status: this.STATUS.NOT_STARTED,
      statusVisual: this.STATUS.AT_RISK,
      statusLabel: 'No initiatives linked',
      statusSeverity: 'red',
      healthCode: this.HEALTH.NO_INITIATIVES,
      statusMessage: '',
      createdAt: new Date().toISOString(),
      ...goalData,
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

    const goal = systemData.goals.find((g) => g.goalId === goalId);
    if (!goal) {
      console.warn(`GoalService.updateGoal: Goal not found: ${goalId}`);
      return null;
    }

    Object.assign(goal, updates);

    // Recalculate status if dates changed
    if (updates.targetEndDate || updates.plannedEndDate || updates.dueDate) {
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

    const index = systemData.goals.findIndex((g) => g.goalId === goalId);
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
    return systemData.goals.find((g) => g.goalId === goalId) || null;
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
    goal.plannedEndDate = this.computeGoalPlannedEndDate(goal, initiatives);
    this.refreshGoalStatus(goal, initiatives, {
      rules: systemData?.attributes?.goalStatusRules || {},
    });

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
    initiatives.forEach((init) => {
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
  refreshGoalStatus(goal, initiatives = [], options = {}) {
    const status = this.getGoalStatus(goal, initiatives, options);
    goal.status = status.status;
    goal.statusVisual = status.visualStatus;
    goal.statusLabel = status.label;
    goal.statusSeverity = status.severity;
    goal.healthCode = status.healthCode;
    goal.inheritedDueDate = status.inheritedDueDate || null;
    goal.statusMessage = status.message;
  },

  /**
   * Computes goal status based on target vs planned dates.
   * Pure calculation - doesn't modify the goal.
   *
   * @param {object} goal - The goal object with targetEndDate and plannedEndDate.
   * @returns {object} { status: string, message: string }
   */
  getGoalStatus(goal, initiatives = [], options = {}) {
    const rules = this._resolveRules(options.rules);
    const now = this._toDate(options.now || new Date());
    const linkedInitiatives = Array.isArray(initiatives) ? initiatives : [];
    const plannedEndDate =
      goal?.plannedEndDate || this.computeGoalPlannedEndDate(goal, linkedInitiatives);
    const dueDate = this._resolveGoalDueDate(goal);
    const inheritedDueDate = !dueDate && plannedEndDate ? plannedEndDate : null;

    if (linkedInitiatives.length === 0 && !plannedEndDate) {
      return this._buildStatus({
        status: this.STATUS.NOT_STARTED,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'red',
        healthCode: this.HEALTH.NO_INITIATIVES,
        label: 'No initiatives linked',
        message: 'A goal should not have empty initiatives.',
      });
    }

    if (!dueDate) {
      return this._buildStatus({
        status: this.STATUS.AT_RISK,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'red',
        healthCode: this.HEALTH.NO_DUE_DATE,
        label: 'No Due Date Set',
        message: inheritedDueDate
          ? `No due date set. Inheriting latest initiative end date (${inheritedDueDate}).`
          : 'No due date set. Define a due date to enable tracking.',
        inheritedDueDate,
      });
    }

    const due = this._toDate(dueDate);
    const planned = this._toDate(plannedEndDate || dueDate);
    const completed = linkedInitiatives.filter((init) => this._isInitiativeCompleted(init));
    const inProgress = linkedInitiatives.filter((init) => this._isInitiativeInProgress(init));
    const notStarted = linkedInitiatives.filter((init) => this._isInitiativeNotStarted(init));
    const hasExtensions = this._hasDueDateExtensions(linkedInitiatives);
    const originalDue = this._toDate(this._getOriginalDueDate(linkedInitiatives));
    const completionDate = this._toDate(this._getCompletionDate(linkedInitiatives, plannedEndDate));
    const daysToDue = this._diffDays(now, due);

    const hasInitiatives = linkedInitiatives.length > 0;
    const allCompleted = hasInitiatives && completed.length === linkedInitiatives.length;

    if (allCompleted) {
      if (completionDate && completionDate <= due) {
        return this._buildStatus({
          status: this.STATUS.COMPLETED,
          visualStatus: this.STATUS.COMPLETED,
          severity: 'green',
          healthCode: this.HEALTH.COMPLETED_ON_TIME,
          label: 'Completed',
          message: `Completed within due date (${dueDate}).`,
        });
      }
      const lateBy = completionDate ? this._diffDays(due, completionDate) : 0;
      return this._buildStatus({
        status: this.STATUS.COMPLETED,
        visualStatus: this.STATUS.COMPLETED,
        severity: 'amber',
        healthCode: this.HEALTH.COMPLETED_LATE,
        label: 'Completed Late',
        message: `Completed ${lateBy} day${lateBy === 1 ? '' : 's'} after due date.`,
      });
    }

    if (inProgress.length === 0 && completed.length === 0 && notStarted.length > 0) {
      if (daysToDue < 0) {
        return this._buildStatus({
          status: this.STATUS.AT_RISK,
          visualStatus: this.STATUS.AT_RISK,
          severity: 'red',
          healthCode: this.HEALTH.SLIPPED_DID_NOT_MEET,
          label: 'Slipped - Did Not Meet',
          message: `Past due date (${dueDate}) and work has not started.`,
        });
      }
      if (daysToDue <= rules.notStartedAtRiskDays) {
        return this._buildStatus({
          status: this.STATUS.NOT_STARTED,
          visualStatus: this.STATUS.AT_RISK,
          severity: 'amber',
          healthCode: this.HEALTH.NOT_STARTED_AT_RISK,
          label: 'Not Started - At Risk',
          message: `Due in ${daysToDue} day${daysToDue === 1 ? '' : 's'} and not started.`,
        });
      }
      return this._buildStatus({
        status: this.STATUS.NOT_STARTED,
        visualStatus: this.STATUS.ON_TRACK,
        severity: 'green',
        healthCode: this.HEALTH.NOT_STARTED_OK,
        label: 'Not Started - OK',
        message: `Not started yet. ${daysToDue} days remaining before due date.`,
      });
    }

    if (daysToDue < 0) {
      return this._buildStatus({
        status: this.STATUS.AT_RISK,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'red',
        healthCode: this.HEALTH.SLIPPED_DID_NOT_MEET,
        label: 'Slipped - Did Not Meet',
        message: `Past due date (${dueDate}) with incomplete initiatives.`,
      });
    }

    if (hasExtensions && originalDue && now > originalDue && now <= due) {
      if (planned && planned <= due) {
        return this._buildStatus({
          status: this.STATUS.ON_TRACK,
          visualStatus: this.STATUS.ON_TRACK,
          severity: 'green',
          healthCode: this.HEALTH.IN_PROGRESS_ON_TRACK_NEW_DUE,
          label: 'In Progress - On Track [New Due Date]',
          message: `Original due date slipped; currently tracking to revised due date (${dueDate}).`,
        });
      }
      return this._buildStatus({
        status: this.STATUS.AT_RISK,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'red',
        healthCode: this.HEALTH.IN_PROGRESS_SLIPPED_ORIGINAL_DUE,
        label: 'In Progress - Slipped Original Due Date, New Due Date Set',
        message: `Original due date slipped and revised due date (${dueDate}) is also at risk.`,
      });
    }

    if (planned && planned > due) {
      return this._buildStatus({
        status: this.STATUS.AT_RISK,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'red',
        healthCode: this.HEALTH.IN_PROGRESS_SLIPPING,
        label: 'In Progress - Slipping',
        message: `Planned end (${this._formatDate(planned)}) exceeds due date (${dueDate}).`,
      });
    }

    if (daysToDue <= rules.inProgressAtRiskDays) {
      return this._buildStatus({
        status: this.STATUS.AT_RISK,
        visualStatus: this.STATUS.AT_RISK,
        severity: 'amber',
        healthCode: this.HEALTH.IN_PROGRESS_AT_RISK,
        label: 'In Progress - At Risk',
        message: `In progress with only ${daysToDue} day${daysToDue === 1 ? '' : 's'} to due date.`,
      });
    }

    return this._buildStatus({
      status: this.STATUS.ON_TRACK,
      visualStatus: this.STATUS.ON_TRACK,
      severity: 'green',
      healthCode: this.HEALTH.IN_PROGRESS_OK,
      label: 'In Progress - OK',
      message: '',
    });
  },

  /**
   * Gets a human-readable status message for a goal.
   *
   * @param {object} goal - The goal object.
   * @returns {string} Status message.
   */
  getGoalStatusMessage(goal, initiatives = [], options = {}) {
    const status = this.getGoalStatus(goal, initiatives, options);
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

    return systemData.yearlyInitiatives.filter((init) => {
      // Support both direct goalId field and goalIds array
      if (init.goalId === goalId) return true;
      if (init.primaryGoalId === goalId) return true;
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

    const initiative = systemData.yearlyInitiatives.find((i) => i.initiativeId === initiativeId);

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

    const initiative = systemData.yearlyInitiatives.find((i) => i.initiativeId === initiativeId);

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

    systemData.goals.forEach((goal) => {
      this.refreshGoalDates(systemData, goal.goalId);
    });
  },

  _buildStatus({
    status,
    visualStatus,
    severity,
    healthCode,
    label,
    message,
    inheritedDueDate = null,
  }) {
    return {
      status,
      visualStatus: visualStatus || status,
      severity: severity || 'green',
      healthCode,
      label: label || '',
      message: message || '',
      inheritedDueDate,
    };
  },

  _resolveRules(overrides = {}) {
    return {
      ...this.DEFAULT_RULES,
      ...(overrides || {}),
    };
  },

  _resolveGoalDueDate(goal) {
    return goal?.targetEndDate || goal?.dueDate || null;
  },

  _toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  },

  _formatDate(value) {
    const date = this._toDate(value);
    if (!date) return '';
    return date.toISOString().slice(0, 10);
  },

  _diffDays(fromDate, toDate) {
    const start = this._toDate(fromDate);
    const end = this._toDate(toDate);
    if (!start || !end) return 0;
    const ms = end.getTime() - start.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  },

  _normalizeStatus(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  },

  _isInitiativeCompleted(initiative) {
    const status = this._normalizeStatus(initiative?.status);
    return status === 'completed' || status === 'done' || !!initiative?.actualCompletionDate;
  },

  _isInitiativeInProgress(initiative) {
    const status = this._normalizeStatus(initiative?.status);
    return status === 'in progress' || status === 'in-progress' || status === 'blocked';
  },

  _isInitiativeNotStarted(initiative) {
    const status = this._normalizeStatus(initiative?.status);
    return (
      status === 'backlog' ||
      status === 'defined' ||
      status === 'committed' ||
      status === '' ||
      status === 'not started'
    );
  },

  _hasDueDateExtensions(initiatives) {
    return (initiatives || []).some((init) => {
      const original = this._toDate(
        init?.attributes?.originalTargetDueDate || init?.originalTargetDueDate
      );
      const current = this._toDate(init?.targetDueDate || init?.computedEndDate || init?.endDate);
      return !!(original && current && current > original);
    });
  },

  _getOriginalDueDate(initiatives) {
    let latest = null;
    (initiatives || []).forEach((init) => {
      const candidate = init?.attributes?.originalTargetDueDate || init?.originalTargetDueDate;
      if (!candidate) return;
      if (!latest || candidate > latest) latest = candidate;
    });
    return latest;
  },

  _getCompletionDate(initiatives, fallback = null) {
    let latest = null;
    (initiatives || []).forEach((init) => {
      const completedDate = init?.actualCompletionDate || init?.completedAt || null;
      const candidate =
        completedDate || init?.computedEndDate || init?.targetDueDate || init?.endDate;
      if (!candidate) return;
      if (!latest || candidate > latest) latest = candidate;
    });
    return latest || fallback || null;
  },
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoalService;
}
