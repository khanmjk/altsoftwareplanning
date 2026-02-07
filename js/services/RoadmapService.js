/**
 * RoadmapService.js
 *
 * Pure business logic functions for roadmap data and date utilities.
 * NO DOM access - all functions are pure and testable.
 *
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const RoadmapService = {
  // =========================================================================
  // DATE UTILITIES (Pure)
  // =========================================================================

  /**
   * Determines the quarter (Q1-Q4) from a date string.
   *
   * @param {string} dateString - Date in 'YYYY-MM-DD' format
   * @returns {string|null} 'Q1', 'Q2', 'Q3', 'Q4', or null
   */
  getQuarterFromDate(dateString) {
    if (!dateString) return null;
    try {
      const month = parseInt(dateString.substring(5, 7), 10);
      if (month >= 1 && month <= 3) return 'Q1';
      if (month >= 4 && month <= 6) return 'Q2';
      if (month >= 7 && month <= 9) return 'Q3';
      if (month >= 10 && month <= 12) return 'Q4';
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Returns the last date of the quarter for a given year.
   *
   * @param {string} quarter - 'Q1', 'Q2', 'Q3', 'Q4'
   * @param {number} year - The year (e.g., 2025)
   * @returns {string|null} Date string 'YYYY-MM-DD'
   */
  getEndDateForQuarter(quarter, year) {
    if (!quarter || !year) return null;
    switch (quarter) {
      case 'Q1':
        return `${year}-03-31`;
      case 'Q2':
        return `${year}-06-30`;
      case 'Q3':
        return `${year}-09-30`;
      case 'Q4':
        return `${year}-12-31`;
      default:
        return null;
    }
  },

  /**
   * Returns the first date of the quarter for a given year.
   *
   * @param {string} quarter - 'Q1', 'Q2', 'Q3', 'Q4'
   * @param {number} year - The year (e.g., 2025)
   * @returns {string|null} Date string 'YYYY-MM-DD'
   */
  getStartDateForQuarter(quarter, year) {
    if (!quarter || !year) return null;
    switch (quarter) {
      case 'Q1':
        return `${year}-01-01`;
      case 'Q2':
        return `${year}-04-01`;
      case 'Q3':
        return `${year}-07-01`;
      case 'Q4':
        return `${year}-10-01`;
      default:
        return null;
    }
  },

  /**
   * Gets year bucket label for 3-year plan view.
   *
   * @param {number} planningYear - The planning year of the initiative
   * @param {number} currentYear - The current calendar year
   * @returns {string|null} 'Current Year', 'Next Year', 'Future', or null
   */
  getYearBucket(planningYear, currentYear) {
    if (!planningYear || !currentYear) return null;
    if (planningYear === currentYear) return 'Current Year';
    if (planningYear === currentYear + 1) return 'Next Year';
    if (planningYear > currentYear + 1) return 'Future';
    return null; // Past years
  },

  // =========================================================================
  // FILTERING (Pure - accepts data as parameters)
  // =========================================================================

  /**
   * Filters initiatives by organization.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {Array} sdms - Array of SDM objects
   * @param {Array} teams - Array of team objects
   * @param {string} orgId - Senior manager ID or 'all'
   * @returns {Array} Filtered initiatives
   */
  filterByOrganization(initiatives, sdms, teams, orgId) {
    if (!orgId || orgId === 'all') return initiatives;

    const teamsInOrg = new Set();
    (sdms || []).forEach((sdm) => {
      if (sdm.seniorManagerId === orgId) {
        (teams || []).forEach((team) => {
          if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
        });
      }
    });

    return initiatives.filter((init) =>
      (init.assignments || []).some((a) => teamsInOrg.has(a.teamId))
    );
  },

  /**
   * Filters initiatives by team.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {string} teamId - Team ID or 'all'
   * @returns {Array} Filtered initiatives
   */
  filterByTeam(initiatives, teamId) {
    if (!teamId || teamId === 'all') return initiatives;
    return initiatives.filter((init) => (init.assignments || []).some((a) => a.teamId === teamId));
  },

  /**
   * Filters initiatives by themes.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {Array} selectedThemeIds - Selected theme IDs
   * @param {Array} allThemeIds - All available theme IDs
   * @returns {Array} Filtered initiatives
   */
  filterByThemes(initiatives, selectedThemeIds, allThemeIds) {
    if (!selectedThemeIds || selectedThemeIds.length === 0) return initiatives;
    if (selectedThemeIds.length >= (allThemeIds || []).length) return initiatives;

    return initiatives.filter((init) => {
      const initThemes = init.themes || [];
      if (initThemes.length === 0) return false;
      return initThemes.some((themeId) => selectedThemeIds.includes(themeId));
    });
  },

  /**
   * Filters initiatives by planning year.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {number|string} year - Year to filter by or 'all'
   * @returns {Array} Filtered initiatives
   */
  filterByYear(initiatives, year) {
    if (!year || year === 'all') return initiatives;
    return initiatives.filter((init) => init.attributes?.planningYear == year);
  },

  /**
   * Filters initiatives by linked goal.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {string} goalId - Goal ID or 'all'
   * @returns {Array} Filtered initiatives
   */
  filterByGoal(initiatives, goalId) {
    if (!goalId || goalId === 'all') return initiatives;
    return initiatives.filter((init) => {
      if (init.primaryGoalId === goalId) return true;
      if (init.goalId === goalId) return true;
      if (Array.isArray(init.goalIds) && init.goalIds.includes(goalId)) return true;
      return false;
    });
  },

  /**
   * Filters initiatives by status list.
   *
   * @param {Array} initiatives - Array of initiative objects
   * @param {Array<string>} statuses - Status values (case-insensitive)
   * @returns {Array} Filtered initiatives
   */
  filterByStatuses(initiatives, statuses) {
    if (!Array.isArray(statuses) || statuses.length === 0) return initiatives;
    const allowed = new Set(
      statuses.map((status) =>
        String(status || '')
          .trim()
          .toLowerCase()
      )
    );
    if (allowed.has('all')) return initiatives;
    return initiatives.filter((init) =>
      allowed.has(
        String(init.status || '')
          .trim()
          .toLowerCase()
      )
    );
  },

  // =========================================================================
  // ROADMAP DATA STRUCTURING (Pure)
  // =========================================================================

  /**
   * Extracts and structures data for the Quarterly Roadmap view.
   * Pure version - accepts all data as parameters.
   *
   * @param {object} params - All required data
   * @param {Array} params.initiatives - Initiative objects
   * @param {Array} params.sdms - SDM objects
   * @param {Array} params.teams - Team objects
   * @param {Array} params.definedThemes - Theme definitions
   * @param {object} params.filters - { year, orgId, teamId, themeIds }
   * @returns {object} Structured data { ThemeName: { Q1: [], Q2: [], Q3: [], Q4: [] } }
   */
  getQuarterlyRoadmapData({ initiatives, sdms, teams, definedThemes, filters }) {
    const { year, orgId, teamId, themeIds, goalId, statuses } = filters || {};
    const allThemeIds = (definedThemes || []).map((t) => t.themeId);

    // Apply filters
    let filtered = [...(initiatives || [])];
    filtered = this.filterByYear(filtered, year);
    filtered = this.filterByOrganization(filtered, sdms, teams, orgId);
    filtered = this.filterByTeam(filtered, teamId);
    filtered = this.filterByGoal(filtered, goalId);
    filtered = this.filterByStatuses(filtered, statuses);
    filtered = this.filterByThemes(filtered, themeIds, allThemeIds);

    // Structure data by theme and quarter
    const roadmapData = {};
    const themeMap = new Map((definedThemes || []).map((t) => [t.themeId, t.name]));

    filtered.forEach((init) => {
      const quarter = init.targetQuarter || this.getQuarterFromDate(init.targetDueDate);
      if (!quarter) return;

      const assignedThemes =
        init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];

      assignedThemes.forEach((themeId) => {
        const themeName = themeMap.get(themeId) || 'Uncategorized';

        if (
          themeIds?.length > 0 &&
          themeIds.length < allThemeIds.length &&
          !themeIds.includes(themeId)
        ) {
          return;
        }

        if (!roadmapData[themeName]) {
          roadmapData[themeName] = { Q1: [], Q2: [], Q3: [], Q4: [] };
        }
        roadmapData[themeName][quarter].push(init);
      });
    });

    return roadmapData;
  },

  /**
   * Extracts and structures data for the 3-Year Plan view.
   * Pure version - accepts all data as parameters.
   *
   * @param {object} params - All required data
   * @param {Array} params.initiatives - Initiative objects
   * @param {Array} params.sdms - SDM objects
   * @param {Array} params.teams - Team objects
   * @param {Array} params.definedThemes - Theme definitions
   * @param {number} params.currentYear - Current calendar year
   * @param {object} params.filters - { orgId, teamId, themeIds }
   * @returns {object} Structured data { ThemeName: { 'Current Year': [], 'Next Year': [], 'Future': [] } }
   */
  get3YearPlanData({ initiatives, sdms, teams, definedThemes, currentYear, filters }) {
    const { orgId, teamId, themeIds, goalId, statuses } = filters || {};
    const allThemeIds = (definedThemes || []).map((t) => t.themeId);

    // Apply filters
    let filtered = [...(initiatives || [])];
    filtered = this.filterByOrganization(filtered, sdms, teams, orgId);
    filtered = this.filterByTeam(filtered, teamId);
    filtered = this.filterByGoal(filtered, goalId);
    filtered = this.filterByStatuses(filtered, statuses);
    filtered = this.filterByThemes(filtered, themeIds, allThemeIds);

    // Structure data by theme and year bucket
    const roadmapData = {};
    const themeMap = new Map((definedThemes || []).map((t) => [t.themeId, t.name]));
    const year = currentYear || new Date().getFullYear();

    filtered.forEach((init) => {
      const planningYear = init.attributes?.planningYear;
      const yearBucket = this.getYearBucket(planningYear, year);
      if (!yearBucket) return;

      const assignedThemes =
        init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];

      assignedThemes.forEach((themeId) => {
        const themeName = themeMap.get(themeId) || 'Uncategorized';

        if (
          themeIds?.length > 0 &&
          themeIds.length < allThemeIds.length &&
          !themeIds.includes(themeId)
        ) {
          return;
        }

        if (!roadmapData[themeName]) {
          roadmapData[themeName] = { 'Current Year': [], 'Next Year': [], Future: [] };
        }
        roadmapData[themeName][yearBucket].push(init);
      });
    });

    return roadmapData;
  },
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RoadmapService;
}
