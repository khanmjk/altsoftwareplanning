/**
 * GoalsWidget Component
 *
 * Displays Strategic Goals Dashboard within DashboardView.
 * Refactored from goalsView.js to use DOM creation pattern.
 */
class GoalsWidget {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.cardsContainer = null;
    this.planningYear = 'all'; // Default, set via setPlanningYear()
  }

  /**
   * Set the planning year filter
   * @param {string|number} year - The year to filter by, or 'all'
   */
  setPlanningYear(year) {
    this.planningYear = year;
  }

  /**
   * Render the widget
   */
  render() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('GoalsWidget: Container not found:', this.containerId);
      return;
    }

    // Clear and create structure
    this._clearElement(this.container);

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.id = 'goalCardsContainer';
    this.cardsContainer.className = 'goal-cards-container';
    this.container.appendChild(this.cardsContainer);

    // Render goal cards
    this.renderGoalCards();
  }

  /**
   * Prepare goal data for display
   * @returns {Array} Processed goals with calculated metrics
   */
  prepareGoalData() {
    const yearFilter = this.planningYear;
    const systemData = SystemService.getCurrentSystem();

    if (!systemData) return [];

    const allGoals = systemData.goals || [];
    const teamMap = new Map(
      (systemData.teams || []).map((t) => [t.teamId, t.teamIdentity || t.teamName])
    );
    const themeMap = new Map((systemData.definedThemes || []).map((t) => [t.themeId, t.name]));
    const goalStatusRules = systemData?.attributes?.goalStatusRules || {};

    return allGoals
      .map((goal) => {
        const allInitiativesForGoal = this._getInitiativesForGoal(systemData, goal);

        let initiativesForYear = allInitiativesForGoal;
        if (yearFilter !== 'all') {
          initiativesForYear = allInitiativesForGoal.filter(
            (init) => init.attributes?.planningYear == yearFilter
          );
        }

        if (initiativesForYear.length === 0 && yearFilter !== 'all') return null;

        // Calculate metrics
        const contributingTeams = new Set();
        initiativesForYear.forEach((init) => {
          (init.assignments || []).forEach((a) => contributingTeams.add(a.teamId));
        });

        const totalSde = initiativesForYear.reduce(
          (sum, init) => sum + (init.assignments || []).reduce((s, a) => s + (a.sdeYears || 0), 0),
          0
        );
        const completedInitiatives = initiativesForYear.filter((i) =>
          this._isCompletedStatus(i?.status)
        ).length;
        const totalInitiatives = initiativesForYear.length;

        const statusInfo = this._getGoalStatus(
          systemData,
          goal,
          initiativesForYear,
          goalStatusRules
        );
        const inspectionInfo = this._getGoalInspectionStatus(goal, statusInfo);

        // Contributing themes
        const contributingThemes = new Set();
        initiativesForYear.forEach((init) => {
          (init.themes || []).forEach((t) => contributingThemes.add(t));
        });

        // SDE breakdown by team
        const sdeBreakdownByTeam = {};
        initiativesForYear.forEach((init) => {
          (init.assignments || []).forEach((assignment) => {
            sdeBreakdownByTeam[assignment.teamId] =
              (sdeBreakdownByTeam[assignment.teamId] || 0) + assignment.sdeYears;
          });
        });

        return {
          ...goal,
          displayName: goal.name || goal.title || 'Untitled Goal',
          displayTotalSde: totalSde,
          displayCompletedCount: completedInitiatives,
          displayTotalInitiatives: totalInitiatives,
          displayStatus: statusInfo.label || this._toStatusLabel(statusInfo.status),
          displayStatusVisual: statusInfo.visualStatus || statusInfo.status || 'on-track',
          displayStatusReason: statusInfo.message || '',
          displayOwnerStatusLabel: inspectionInfo.label,
          displayOwnerStatusClass: inspectionInfo.className,
          displayOwnerStatusReason: inspectionInfo.message,
          displayContributingTeams: Array.from(contributingTeams),
          displaySdeBreakdown: sdeBreakdownByTeam,
          displayThemes: Array.from(contributingThemes),
          displayInitiatives: initiativesForYear,
          // Store maps for rendering
          _teamMap: teamMap,
          _themeMap: themeMap,
        };
      })
      .filter(Boolean);
  }

  /**
   * Render goal cards into the container
   */
  renderGoalCards() {
    if (!this.cardsContainer) return;

    const goalData = this.prepareGoalData();
    this._clearElement(this.cardsContainer);

    if (goalData.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'goal-cards-container__empty';
      emptyMsg.textContent = 'No goals match the current filter criteria.';
      this.cardsContainer.appendChild(emptyMsg);
      return;
    }

    goalData.forEach((goal) => {
      const card = this.createGoalCard(goal);
      this.cardsContainer.appendChild(card);
    });

    // Bind toggle events
    this.bindToggleEvents();
  }

  /**
   * Create a single goal card element
   * @param {Object} goal - Goal data with display metrics
   * @returns {HTMLElement} Goal card element
   */
  createGoalCard(goal) {
    const teamMap = goal._teamMap;
    const themeMap = goal._themeMap;

    const card = document.createElement('div');
    card.className = `goal-card status-${goal.displayStatusVisual}`;

    // Header
    const header = this._createHeader(goal);
    card.appendChild(header);

    // Description
    const desc = document.createElement('p');
    desc.className = 'goal-description';
    const descEm = document.createElement('em');
    descEm.textContent = goal.description || 'No description provided.';
    desc.appendChild(descEm);
    card.appendChild(desc);

    // Metrics
    const metrics = this._createMetrics(goal, teamMap);
    card.appendChild(metrics);

    // Ownership info
    const ownership = this._createOwnership(goal);
    card.appendChild(ownership);

    // Contributing teams
    const teamsDiv = document.createElement('div');
    teamsDiv.className = 'goal-teams';
    const teamsStrong = document.createElement('strong');
    teamsStrong.textContent = 'Contributing Teams: ';
    teamsDiv.appendChild(teamsStrong);
    const teamNames = goal.displayContributingTeams
      .map((tid) => teamMap.get(tid) || 'Unknown')
      .join(', ');
    teamsDiv.appendChild(document.createTextNode(teamNames || 'None'));
    card.appendChild(teamsDiv);

    // Themes
    const themesDiv = this._createThemes(goal, themeMap);
    card.appendChild(themesDiv);

    // Initiatives toggle
    const initiativesToggle = this._createInitiativesToggle(goal, teamMap);
    card.appendChild(initiativesToggle);

    return card;
  }

  /**
   * Create goal card header
   */
  _createHeader(goal) {
    const header = document.createElement('div');
    header.className = 'goal-card-header';

    const title = document.createElement('h3');
    title.textContent = goal.displayName;
    header.appendChild(title);

    const status = document.createElement('span');
    status.className = 'goal-status';
    status.title = goal.displayStatusReason;
    status.textContent = goal.displayStatus;
    header.appendChild(status);

    const ownerStatus = document.createElement('span');
    ownerStatus.className = `goal-owner-status ${goal.displayOwnerStatusClass}`.trim();
    ownerStatus.title = goal.displayOwnerStatusReason;
    ownerStatus.textContent = goal.displayOwnerStatusLabel;
    header.appendChild(ownerStatus);

    return header;
  }

  /**
   * Create metrics section
   */
  _createMetrics(goal, teamMap) {
    const metrics = document.createElement('div');
    metrics.className = 'goal-metrics';

    // SDE metric with tooltip
    const sdeTooltip = Object.entries(goal.displaySdeBreakdown)
      .map(([teamId, sde]) => `• ${teamMap.get(teamId) || 'Unknown'}: ${sde.toFixed(2)} SDEs`)
      .join('\n');

    const sdeDiv = document.createElement('div');
    sdeDiv.title = sdeTooltip;
    const sdeValue = document.createElement('span');
    sdeValue.className = 'metric-value';
    sdeValue.textContent = goal.displayTotalSde.toFixed(2);
    const sdeLabel = document.createElement('span');
    sdeLabel.className = 'metric-label';
    sdeLabel.textContent = 'Total SDE-Years';
    sdeDiv.appendChild(sdeValue);
    sdeDiv.appendChild(sdeLabel);
    metrics.appendChild(sdeDiv);

    // Initiatives count
    const initDiv = document.createElement('div');
    const initValue = document.createElement('span');
    initValue.className = 'metric-value';
    initValue.textContent = goal.displayTotalInitiatives;
    const initLabel = document.createElement('span');
    initLabel.className = 'metric-label';
    initLabel.textContent = 'Total Initiatives';
    initDiv.appendChild(initValue);
    initDiv.appendChild(initLabel);
    metrics.appendChild(initDiv);

    // Progress bar
    const progressDiv = document.createElement('div');
    progressDiv.className = 'metric-progress';
    const progressPct =
      goal.displayTotalInitiatives > 0
        ? (goal.displayCompletedCount / goal.displayTotalInitiatives) * 100
        : 0;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-bar-container';
    progressContainer.title = `${progressPct.toFixed(0)}% Complete`;

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-bar-fill';
    styleVars.set(progressFill, { '--goal-progress': `${progressPct}%` });
    progressContainer.appendChild(progressFill);

    const progressText = document.createElement('span');
    progressText.className = 'progress-bar-text';
    progressText.textContent = `${goal.displayCompletedCount} / ${goal.displayTotalInitiatives}`;
    progressContainer.appendChild(progressText);

    progressDiv.appendChild(progressContainer);
    const progressLabel = document.createElement('span');
    progressLabel.className = 'metric-label';
    progressLabel.textContent = 'Progress';
    progressDiv.appendChild(progressLabel);
    metrics.appendChild(progressDiv);

    return metrics;
  }

  /**
   * Create ownership section
   */
  _createOwnership(goal) {
    const ownership = document.createElement('div');
    ownership.className = 'goal-ownership';

    const fields = [
      ['Due Date', goal.targetEndDate || goal.dueDate || 'N/A'],
      ['Owner', goal.owner?.name || 'N/A'],
      ['Project Manager', goal.projectManager?.name || 'N/A'],
      ['Technical POC', goal.technicalPOC?.name || 'N/A'],
    ];

    fields.forEach(([label, value], index) => {
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      ownership.appendChild(strong);
      ownership.appendChild(document.createTextNode(value));
      if (index < fields.length - 1) {
        ownership.appendChild(document.createElement('br'));
      }
    });

    return ownership;
  }

  /**
   * Create themes section
   */
  _createThemes(goal, themeMap) {
    const themesDiv = document.createElement('div');
    themesDiv.className = 'goal-themes';

    const strong = document.createElement('strong');
    strong.textContent = 'Strategic Themes:';
    themesDiv.appendChild(strong);

    const pillsDiv = document.createElement('div');
    pillsDiv.className = 'goal-themes-pills';

    goal.displayThemes.forEach((themeId) => {
      const pill = document.createElement('span');
      pill.className = 'theme-pill';
      pill.textContent = themeMap.get(themeId) || 'Uncategorized';
      pillsDiv.appendChild(pill);
    });

    themesDiv.appendChild(pillsDiv);
    return themesDiv;
  }

  /**
   * Create initiatives toggle section
   */
  _createInitiativesToggle(goal, teamMap) {
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'goal-initiatives-toggle';

    const listId = `initiatives-list-${goal.goalId}`;

    // Toggle summary
    const summary = document.createElement('div');
    summary.className = 'toggle-summary';
    summary.dataset.targetId = listId;
    summary.textContent = `View Linked Initiatives (${goal.displayInitiatives.length}) `;

    const arrow = document.createElement('span');
    arrow.className = 'toggle-arrow';
    arrow.textContent = '▼';
    summary.appendChild(arrow);
    toggleDiv.appendChild(summary);

    // Initiatives list
    const list = document.createElement('div');
    list.id = listId;
    list.className = 'initiatives-list initiatives-list--hidden';

    if (goal.displayInitiatives.length === 0) {
      const noInit = document.createElement('div');
      noInit.className = 'no-initiatives-text';
      noInit.textContent = 'No initiatives match the current filter.';
      list.appendChild(noInit);
    } else {
      goal.displayInitiatives.forEach((init) => {
        const miniCard = this._createMiniInitiativeCard(init, teamMap);
        list.appendChild(miniCard);
      });
    }

    toggleDiv.appendChild(list);
    return toggleDiv;
  }

  /**
   * Create mini initiative card
   */
  _createMiniInitiativeCard(init, teamMap) {
    const totalSde = (init.assignments || []).reduce((s, a) => s + (a.sdeYears || 0), 0);
    const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
    const isBTL = init.attributes?.planningStatusFundedHc === 'BTL' ? 'btl' : '';

    const card = document.createElement('div');
    card.className = `mini-initiative-card ${statusClass} ${isBTL}`.trim();

    // Main row
    const mainRow = document.createElement('div');
    mainRow.className = 'mini-card-main-row';

    const title = document.createElement('span');
    title.className = 'mini-card-title';
    title.textContent = init.title;
    mainRow.appendChild(title);

    const sde = document.createElement('span');
    sde.className = 'mini-card-sde';
    sde.textContent = `Total: ${totalSde.toFixed(2)} SDEs`;
    mainRow.appendChild(sde);

    card.appendChild(mainRow);

    // Breakdown row
    const breakdown = document.createElement('div');
    breakdown.className = 'mini-card-breakdown';
    const breakdownParts = (init.assignments || [])
      .filter((a) => a.sdeYears > 0)
      .map((a) => {
        const teamName = teamMap.get(a.teamId) || '??';
        return `${teamName}: ${a.sdeYears.toFixed(2)}`;
      });
    breakdown.textContent =
      breakdownParts.length > 0 ? breakdownParts.join(', ') : 'No SDEs assigned';
    card.appendChild(breakdown);

    return card;
  }

  /**
   * Bind toggle events for expandable sections
   */
  bindToggleEvents() {
    if (!this.cardsContainer) return;

    this.cardsContainer.querySelectorAll('.toggle-summary').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.targetId;
        const targetList = document.getElementById(targetId);
        const arrow = toggle.querySelector('.toggle-arrow');

        if (targetList) {
          targetList.classList.toggle('initiatives-list--hidden');
          if (arrow) {
            arrow.textContent = targetList.classList.contains('initiatives-list--hidden')
              ? '▼'
              : '▲';
          }
        }
      });
    });
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  _isCompletedStatus(status) {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'completed' || normalized === 'done';
  }

  _getInitiativesForGoal(systemData, goal) {
    const explicitIds = new Set(goal?.initiativeIds || []);
    const initiatives = systemData?.yearlyInitiatives || [];

    const linkedByGoalService =
      typeof GoalService !== 'undefined' && GoalService.getInitiativesForGoal
        ? GoalService.getInitiativesForGoal(systemData, goal.goalId)
        : [];

    const linkedByExplicitIds = initiatives.filter((init) => explicitIds.has(init.initiativeId));

    const unique = new Map();
    [...linkedByGoalService, ...linkedByExplicitIds].forEach((init) => {
      if (init?.initiativeId) unique.set(init.initiativeId, init);
    });
    return Array.from(unique.values());
  }

  _getGoalStatus(systemData, goal, initiatives, goalStatusRules) {
    if (typeof GoalService === 'undefined' || !GoalService.getGoalStatus) {
      return {
        status: 'on-track',
        visualStatus: 'on-track',
        label: 'On Track',
        message: '',
      };
    }
    return GoalService.getGoalStatus(goal, initiatives, {
      rules: goalStatusRules,
      now: new Date(),
    });
  }

  _getGoalInspectionStatus(goal, statusInfo) {
    if (typeof GoalService === 'undefined' || !GoalService.getGoalInspectionStatus) {
      return {
        label: 'Owner: No Update',
        className: 'goal-owner-status--none',
        message: 'No owner update available.',
      };
    }

    const inspection = GoalService.getGoalInspectionStatus(goal, {
      now: new Date(),
      computedStatus: statusInfo?.visualStatus || statusInfo?.status,
    });

    let className = 'goal-owner-status--none';
    if (inspection.ownerStatus === GoalService.INSPECTION_STATUS.ON_TRACK) {
      className = 'goal-owner-status--on-track';
    } else if (inspection.ownerStatus === GoalService.INSPECTION_STATUS.ACHIEVED) {
      className = 'goal-owner-status--on-track';
    } else if (inspection.ownerStatus === GoalService.INSPECTION_STATUS.SLIPPING) {
      className = 'goal-owner-status--slipping';
    } else if (
      inspection.ownerStatus === GoalService.INSPECTION_STATUS.AT_RISK ||
      inspection.ownerStatus === GoalService.INSPECTION_STATUS.LATE ||
      inspection.ownerStatus === GoalService.INSPECTION_STATUS.BLOCKED
    ) {
      className = 'goal-owner-status--at-risk';
    }

    const staleSuffix = inspection.isStale ? ' (Stale)' : '';
    const mismatchSuffix = inspection.hasMismatch ? ' (Mismatch)' : '';

    return {
      label: `Owner: ${inspection.ownerStatusLabel}${staleSuffix}${mismatchSuffix}`,
      className,
      message: inspection.lastCheckInAt
        ? `Latest weekly update: ${inspection.lastCheckInAt.slice(0, 10)}`
        : 'Owner has not submitted a weekly goal update.',
    };
  }

  _toStatusLabel(status) {
    if (!status) return 'Unknown';
    const normalized = String(status).replace(/-/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
