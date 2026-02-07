/**
 * PlanningService.js
 *
 * Pure business logic functions for Year Planning calculations.
 * NO DOM access - all functions are pure and testable.
 *
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const PlanningService = {
  /**
   * Calculates team load summary data for ATL initiatives.
   *
   * @param {object} params - Input parameters
   * @param {Array} params.teams - Array of team objects
   * @param {Array} params.initiatives - Array of initiative objects for the planning year
   * @param {object} params.calculatedMetrics - Pre-calculated capacity metrics from CapacityEngine
   * @param {string} params.scenario - 'funded' | 'team_bis' | 'effective'
   * @param {boolean} params.applyConstraints - Whether to use net (true) or gross (false) capacity
   * @param {Array} params.allKnownEngineers - Array of all known engineers for AI SWE lookup
   * @returns {object} { rows: Array, totals: object }
   */
  calculateTeamLoadSummary({
    teams,
    initiatives,
    calculatedMetrics,
    scenario,
    applyConstraints,
    allKnownEngineers,
  }) {
    if (!calculatedMetrics || !teams || !initiatives) {
      console.error('PlanningService.calculateTeamLoadSummary: Missing required data.');
      return { rows: [], totals: {} };
    }

    const scenarioKey =
      scenario === 'funded' ? 'FundedHC' : scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS';
    const isNetCapacityUsed = applyConstraints;
    const atlBtlLimit = isNetCapacityUsed
      ? calculatedMetrics.totals[scenarioKey].netYrs
      : calculatedMetrics.totals[scenarioKey].grossYrs;

    // Sort initiatives: protected first
    const sortedInitiatives = [...initiatives].sort((a, b) => {
      if (a.isProtected && !b.isProtected) return -1;
      if (!a.isProtected && b.isProtected) return 1;
      return 0;
    });

    // Calculate ATL SDEs assigned to each team
    let overallCumulativeSde = 0;
    const teamAtlSdeAssigned = teams.reduce((acc, team) => {
      acc[team.teamId] = 0;
      return acc;
    }, {});

    for (const initiative of sortedInitiatives) {
      const initiativeTotalSde = (initiative.assignments || []).reduce(
        (sum, a) => sum + a.sdeYears,
        0
      );
      if (overallCumulativeSde + initiativeTotalSde <= atlBtlLimit) {
        overallCumulativeSde += initiativeTotalSde;
        (initiative.assignments || []).forEach((assignment) => {
          if (Object.prototype.hasOwnProperty.call(teamAtlSdeAssigned, assignment.teamId)) {
            teamAtlSdeAssigned[assignment.teamId] += assignment.sdeYears;
          }
        });
      } else {
        break; // Past ATL/BTL line
      }
    }

    // Build summary rows
    let summaryRows = [];
    let totals = {
      fundedHCGross: 0,
      teamBISHumans: 0,
      awayBISHumans: 0,
      aiEngineers: 0,
      sinks: 0,
      hiringRampUpSink: 0,
      newHireGain: 0,
      productivityGain: 0,
      scenarioCapacity: 0,
      assignedAtlSde: 0,
    };

    const sortedTeams = [...teams].sort((a, b) =>
      (a?.teamName || '').localeCompare(b?.teamName || '')
    );

    sortedTeams.forEach((team) => {
      if (!team || !team.teamId) return;

      const teamId = team.teamId;
      const teamMetrics = calculatedMetrics[teamId];
      if (!teamMetrics) return;

      // Count AI engineers
      const teamAIBIS = (team.engineers || []).filter(
        (name) => allKnownEngineers.find((e) => e.name === name)?.attributes?.isAISWE
      ).length;
      const awayAIBIS = (team.awayTeamMembers || []).filter((m) => m.attributes?.isAISWE).length;
      const aiEngineers = teamAIBIS + awayAIBIS;

      const teamBISHumans = teamMetrics.TeamBIS.humanHeadcount;
      const effectiveBISHumans = teamMetrics.EffectiveBIS.humanHeadcount;
      const awayBISHumans = effectiveBISHumans - teamBISHumans;
      const sinks = isNetCapacityUsed ? teamMetrics[scenarioKey].deductYrs || 0 : 0;
      const hiringRampUpSink = isNetCapacityUsed
        ? teamMetrics[scenarioKey].deductionsBreakdown?.newHireRampUpSinkYrs || 0
        : 0;
      const newHireGain = isNetCapacityUsed
        ? teamMetrics[scenarioKey].deductionsBreakdown?.newHireGainYrs || 0
        : 0;
      const productivityGain =
        teamMetrics[scenarioKey].deductionsBreakdown.aiProductivityGainYrs || 0;
      const productivityPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
      const scenarioCapacity = isNetCapacityUsed
        ? teamMetrics[scenarioKey].netYrs
        : teamMetrics[scenarioKey].grossYrs;
      const assignedAtlSde = teamAtlSdeAssigned[teamId] || 0;
      const remainingCapacity = scenarioCapacity - assignedAtlSde;

      let status = '✅ OK';
      if (remainingCapacity < 0) {
        status = '🛑 Overloaded';
      } else if (remainingCapacity < 0.5 && scenarioCapacity > 0) {
        status = '⚠️ Near Limit';
      }

      summaryRows.push({
        teamId,
        teamName: team.teamIdentity || team.teamName || teamId,
        fundedHC: teamMetrics.FundedHC.humanHeadcount,
        teamBISHumans,
        awayBISHumans,
        aiEngineers,
        sinks,
        hiringRampUpSink,
        newHireGain,
        productivityGain,
        productivityPercent,
        scenarioCapacity,
        assignedAtlSde,
        remainingCapacity,
        status,
      });

      // Accumulate totals
      totals.fundedHCGross += teamMetrics.FundedHC.humanHeadcount;
      totals.teamBISHumans += teamBISHumans;
      totals.awayBISHumans += awayBISHumans;
      totals.aiEngineers += aiEngineers;
      totals.sinks += sinks;
      totals.hiringRampUpSink += hiringRampUpSink;
      totals.newHireGain += newHireGain;
      totals.productivityGain += productivityGain;
      totals.scenarioCapacity += scenarioCapacity;
      totals.assignedAtlSde += assignedAtlSde;
    });

    totals.remainingCapacity = totals.scenarioCapacity - totals.assignedAtlSde;

    return { rows: summaryRows, totals };
  },

  /**
   * Calculates planning table data with ATL/BTL status for each initiative.
   *
   * @param {object} params - Input parameters
   * @param {Array} params.initiatives - Array of initiative objects for the planning year
   * @param {object} params.calculatedMetrics - Pre-calculated capacity metrics
   * @param {string} params.scenario - 'funded' | 'team_bis' | 'effective'
   * @param {boolean} params.applyConstraints - Whether to use net or gross capacity
   * @returns {Array} Array of initiatives with calculated fields added
   */
  calculatePlanningTableData({ initiatives, calculatedMetrics, scenario, applyConstraints }) {
    if (!calculatedMetrics || !initiatives) {
      console.error('PlanningService.calculatePlanningTableData: Missing required data.');
      return [];
    }

    const scenarioKey =
      scenario === 'funded' ? 'FundedHC' : scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS';
    const isNetCapacityUsed = applyConstraints;
    const atlBtlCapacityLimit = isNetCapacityUsed
      ? calculatedMetrics.totals[scenarioKey].netYrs
      : calculatedMetrics.totals[scenarioKey].grossYrs;

    // Sort: protected first
    const sortedInitiatives = [...initiatives].sort((a, b) => {
      if (a.isProtected && !b.isProtected) return -1;
      if (!a.isProtected && b.isProtected) return 1;
      return 0;
    });

    let cumulativeSdeTotal = 0;
    const calculatedData = [];

    for (const initiative of sortedInitiatives) {
      let initiativeTotalSde = 0;
      (initiative.assignments || []).forEach((assignment) => {
        initiativeTotalSde += assignment.sdeYears || 0;
      });

      cumulativeSdeTotal += initiativeTotalSde;
      const isBTL = cumulativeSdeTotal > atlBtlCapacityLimit;
      const atlBtlStatus = isBTL ? 'BTL' : 'ATL';

      calculatedData.push({
        ...initiative,
        calculatedInitiativeTotalSde: initiativeTotalSde,
        calculatedCumulativeSde: cumulativeSdeTotal,
        calculatedAtlBtlStatus: atlBtlStatus,
        isBTL,
      });
    }

    return calculatedData;
  },

  /**
   * Builds normalized export data for Year Plan CSV/XLSX downloads.
   *
   * @param {object} params
   * @param {Array} params.tableData - Planning table data (typically from calculatePlanningTableData).
   * @param {object} params.summaryData - Team load summary ({ rows, totals }).
   * @param {Array} params.teams - Team list from system data.
   * @param {number|string} params.planningYear - Active planning year.
   * @param {string} params.scenario - 'funded' | 'team_bis' | 'effective'
   * @param {boolean} params.applyConstraints - Net/gross toggle state.
   * @param {string} [params.teamFilter='all'] - Team focus filter.
   * @returns {object} Export payload with metadata, summary, and initiatives sections.
   */
  buildYearPlanExportData({
    tableData = [],
    summaryData = {},
    teams = [],
    planningYear,
    scenario,
    applyConstraints,
    teamFilter = 'all',
  }) {
    const filteredTeams =
      teamFilter && teamFilter !== 'all'
        ? teams.filter((team) => team?.teamId === teamFilter)
        : [...teams];

    const teamColumns = filteredTeams.map((team) => ({
      teamId: team.teamId,
      label: team.teamIdentity || team.teamName || team.teamId,
    }));

    const displayTableData =
      teamFilter && teamFilter !== 'all'
        ? (tableData || []).filter((initiative) =>
            (initiative.assignments || []).some((assignment) => assignment.teamId === teamFilter)
          )
        : tableData || [];

    const summaryRowsRaw = Array.isArray(summaryData?.rows) ? summaryData.rows : [];
    const summaryRows =
      teamFilter && teamFilter !== 'all'
        ? summaryRowsRaw.filter((row) => row.teamId === teamFilter)
        : summaryRowsRaw;

    const summaryHeaders = [
      'Team ID',
      'Team',
      'Funded HC',
      'Team BIS (Humans)',
      'Away BIS (Humans)',
      'AI Engineers',
      'Sinks (SDE/Yrs)',
      'Hire Ramp-up Sink',
      'New Hire Gain',
      'AI Productivity Gain',
      'AI Gain %',
      'Scenario Capacity',
      'Assigned ATL SDEs',
      'Remaining Capacity',
      'ATL Status',
    ];

    const summaryMatrix = summaryRows.map((row) => [
      row.teamId || '',
      row.teamName || '',
      this._formatExportNumber(row.fundedHC),
      this._formatExportNumber(row.teamBISHumans),
      this._formatExportNumber(row.awayBISHumans),
      this._formatExportNumber(row.aiEngineers),
      this._formatExportNumber(row.sinks),
      this._formatExportNumber(row.hiringRampUpSink),
      this._formatExportNumber(row.newHireGain),
      this._formatExportNumber(row.productivityGain),
      this._formatExportNumber(row.productivityPercent),
      this._formatExportNumber(row.scenarioCapacity),
      this._formatExportNumber(row.assignedAtlSde),
      this._formatExportNumber(row.remainingCapacity),
      row.status || '',
    ]);

    const initiativeHeaders = [
      'Initiative ID',
      'Title',
      'Description',
      'Status',
      'Protected',
      'Total SDE Years',
      'Cumulative SDE Years',
      'ATL/BTL',
      'Capacity Status',
      'Primary Goal ID',
      'Target Due Date',
      ...teamColumns.map((column) => `${column.label} (SDE Years)`),
    ];

    const initiativeMatrix = (displayTableData || []).map((initiative) => {
      const assignments = new Map(
        (initiative.assignments || []).map((assignment) => [
          assignment.teamId,
          assignment.sdeYears || 0,
        ])
      );

      const totalSde = Number.isFinite(initiative.calculatedInitiativeTotalSde)
        ? initiative.calculatedInitiativeTotalSde
        : (initiative.assignments || []).reduce(
            (sum, assignment) => sum + (assignment.sdeYears || 0),
            0
          );

      const cumulativeSde = Number.isFinite(initiative.calculatedCumulativeSde)
        ? initiative.calculatedCumulativeSde
        : '';

      return [
        initiative.initiativeId || '',
        initiative.title || '',
        initiative.description || '',
        initiative.status || '',
        initiative.isProtected ? 'Yes' : 'No',
        this._formatExportNumber(totalSde),
        cumulativeSde === '' ? '' : this._formatExportNumber(cumulativeSde),
        initiative.calculatedAtlBtlStatus || (initiative.isBTL ? 'BTL' : 'ATL'),
        initiative.isBTL ? 'Beyond Capacity (BTL)' : 'Within Capacity (ATL)',
        initiative.primaryGoalId || '',
        initiative.targetDueDate || '',
        ...teamColumns.map((column) =>
          this._formatExportNumber(assignments.get(column.teamId) || 0)
        ),
      ];
    });

    const scenarioLabel =
      scenario === 'funded' ? 'Funded HC' : scenario === 'team_bis' ? 'Team BIS' : 'Effective BIS';
    const filteredTeamName =
      teamFilter && teamFilter !== 'all' ? teamColumns[0]?.label || teamFilter : 'All Teams';

    return {
      metadata: [
        ['Planning Year', planningYear ?? ''],
        ['Scenario', scenarioLabel],
        [
          'Constraints Mode',
          applyConstraints ? 'Net (constraints applied)' : 'Gross (no constraints)',
        ],
        ['Team Focus', filteredTeamName],
        ['Generated At', new Date().toISOString()],
      ],
      summary: {
        headers: summaryHeaders,
        rows: summaryMatrix,
      },
      initiatives: {
        headers: initiativeHeaders,
        rows: initiativeMatrix,
      },
    };
  },

  /**
   * Serializes Year Plan export payload to CSV text.
   *
   * @param {object} exportData - Payload from buildYearPlanExportData().
   * @returns {string} CSV content.
   */
  serializeYearPlanExportToCsv(exportData) {
    const rows = [];
    rows.push(['Year Plan Export']);
    rows.push([]);

    rows.push(...(exportData?.metadata || []));
    rows.push([]);

    rows.push(['Team Load Summary']);
    rows.push(exportData?.summary?.headers || []);
    rows.push(...(exportData?.summary?.rows || []));
    rows.push([]);

    rows.push(['Initiatives']);
    rows.push(exportData?.initiatives?.headers || []);
    rows.push(...(exportData?.initiatives?.rows || []));

    return rows
      .map((row) => (row || []).map((cell) => this._escapeCsvCell(cell)).join(','))
      .join('\n');
  },

  /**
   * Reorders initiatives based on drag-drop operation.
   * Pure function - returns new array, does not mutate input.
   *
   * @param {Array} initiatives - Current initiatives array
   * @param {string} draggedId - ID of dragged initiative
   * @param {string} targetId - ID of drop target initiative
   * @returns {Array} New array with reordered initiatives
   */
  reorderInitiatives(initiatives, draggedId, targetId) {
    const result = [...initiatives];
    const draggedIndex = result.findIndex((init) => init.initiativeId === draggedId);
    const targetIndex = result.findIndex((init) => init.initiativeId === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('PlanningService.reorderInitiatives: Invalid initiative IDs');
      return initiatives; // Return unchanged
    }

    // Remove dragged item
    const [draggedItem] = result.splice(draggedIndex, 1);

    // Find new target index (may have shifted)
    const newTargetIndex = result.findIndex((init) => init.initiativeId === targetId);

    // Insert before target
    result.splice(newTargetIndex, 0, draggedItem);

    return result;
  },

  /**
   * Gets initiatives that are Above The Line (ATL).
   *
   * @param {Array} calculatedData - Output from calculatePlanningTableData
   * @returns {Array} ATL initiatives only
   */
  getATLInitiatives(calculatedData) {
    return calculatedData.filter((init) => !init.isBTL);
  },

  /**
   * Gets initiatives that are Below The Line (BTL).
   *
   * @param {Array} calculatedData - Output from calculatePlanningTableData
   * @returns {Array} BTL initiatives only
   */
  getBTLInitiatives(calculatedData) {
    return calculatedData.filter((init) => init.isBTL);
  },

  /**
   * Gets the total capacity for a given scenario.
   *
   * @param {object} calculatedMetrics - Capacity metrics from CapacityEngine
   * @param {string} scenario - 'funded' | 'team_bis' | 'effective'
   * @param {boolean} applyConstraints - Use net or gross
   * @returns {number} Total capacity in SDE/Years
   */
  getTotalCapacity(calculatedMetrics, scenario, applyConstraints) {
    if (!calculatedMetrics?.totals) return 0;
    const scenarioKey =
      scenario === 'funded' ? 'FundedHC' : scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS';
    return applyConstraints
      ? calculatedMetrics.totals[scenarioKey].netYrs
      : calculatedMetrics.totals[scenarioKey].grossYrs;
  },

  /**
   * Scenario key mapping helper.
   *
   * @param {string} scenario - 'funded' | 'team_bis' | 'effective'
   * @returns {string} Metrics key
   */
  getScenarioKey(scenario) {
    return scenario === 'funded'
      ? 'FundedHC'
      : scenario === 'team_bis'
        ? 'TeamBIS'
        : 'EffectiveBIS';
  },

  // =========================================================================
  // YEAR PLANNING SERVICE COMMANDS (mutating operations)
  // =========================================================================

  /**
   * Reorders initiatives in place based on drag-drop operation.
   * Service command - mutates systemData.yearlyInitiatives in place.
   *
   * Enforces constraints:
   * - Cannot drag a protected initiative
   * - Cannot drop onto a protected initiative
   * - Cannot move an item above the protected block
   *
   * @param {object} systemData - The global system data object.
   * @param {string} draggedId - ID of the dragged initiative.
   * @param {string} targetId - ID of the drop target initiative.
   * @param {boolean} insertBefore - If true, insert before target; else after.
   * @returns {boolean} True if reorder was successful, false if blocked by constraints.
   */
  reorderInitiativesInPlace(systemData, draggedId, targetId, insertBefore) {
    if (!systemData || !Array.isArray(systemData.yearlyInitiatives)) {
      console.error('PlanningService.reorderInitiativesInPlace: Invalid systemData');
      return false;
    }

    const initiatives = systemData.yearlyInitiatives;
    const draggedIndex = initiatives.findIndex((init) => init.initiativeId === draggedId);
    const targetIndex = initiatives.findIndex((init) => init.initiativeId === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('PlanningService.reorderInitiativesInPlace: Invalid initiative IDs');
      return false;
    }

    const draggedInitiative = initiatives[draggedIndex];
    const targetInitiative = initiatives[targetIndex];

    // Constraint 0: Cannot drag a protected item
    if (draggedInitiative.isProtected) {
      console.warn('PlanningService: Cannot drag a protected initiative');
      return false;
    }

    // Constraint 1: Cannot drop ONTO a protected row
    if (targetInitiative.isProtected) {
      console.warn('PlanningService: Cannot drop onto a protected initiative');
      return false;
    }

    // Constraint 2: Cannot move above the protected block
    const firstNonProtectedIndex = initiatives.findIndex((init) => !init.isProtected);
    if (targetIndex < firstNonProtectedIndex && firstNonProtectedIndex !== -1) {
      console.warn('PlanningService: Cannot move item above the protected block');
      return false;
    }

    // Perform reorder
    const [movedItem] = initiatives.splice(draggedIndex, 1);
    const newTargetIndex = initiatives.findIndex((init) => init.initiativeId === targetId);

    if (insertBefore) {
      initiatives.splice(newTargetIndex, 0, movedItem);
    } else {
      initiatives.splice(newTargetIndex + 1, 0, movedItem);
    }

    console.log(
      `PlanningService: Reordered initiative ${draggedId} ${insertBefore ? 'before' : 'after'} ${targetId}`
    );
    return true;
  },

  /**
   * Commits plan statuses in place based on ATL/BTL from the computed table data.
   * Service command - mutates systemData.yearlyInitiatives in place.
   *
   * Status transitions:
   * - Completed: unchanged
   * - ATL + (Backlog|Defined) → Committed
   * - BTL + (Committed|In Progress) → Backlog
   *
   * @param {object} systemData - The global system data object.
   * @param {object} options - Options object.
   * @param {number} options.planningYear - The planning year to filter.
   * @param {Array} options.planningTable - The computed table data from calculatePlanningTableData.
   * @returns {object} Summary of status changes { updated: number, changes: [] }.
   */
  commitPlanStatusesInPlace(systemData, { planningYear, planningTable }) {
    if (!systemData || !Array.isArray(systemData.yearlyInitiatives)) {
      console.error('PlanningService.commitPlanStatusesInPlace: Invalid systemData');
      return { updated: 0, changes: [] };
    }

    const changes = [];

    // Build lookup from planningTable
    const statusLookup = new Map();
    (planningTable || []).forEach((item) => {
      statusLookup.set(
        item.initiativeId,
        item.calculatedAtlBtlStatus || (item.isBTL ? 'BTL' : 'ATL')
      );
    });

    // Filter to planning year and apply status transitions
    systemData.yearlyInitiatives
      .filter((init) => init.attributes?.planningYear == planningYear)
      .forEach((initiative) => {
        const planningStatus = statusLookup.get(initiative.initiativeId);
        const oldStatus = initiative.status;

        if (initiative.status === 'Completed') {
          // Do nothing - completed stays completed
          return;
        }

        if (planningStatus === 'ATL') {
          if (initiative.status === 'Backlog' || initiative.status === 'Defined') {
            initiative.status = 'Committed';
            changes.push({
              initiativeId: initiative.initiativeId,
              from: oldStatus,
              to: 'Committed',
            });
          }
        } else if (planningStatus === 'BTL') {
          if (initiative.status === 'Committed' || initiative.status === 'In Progress') {
            initiative.status = 'Backlog';
            changes.push({ initiativeId: initiative.initiativeId, from: oldStatus, to: 'Backlog' });
          }
        }

        // Also store the planning status on the initiative for reference
        if (!initiative.attributes) initiative.attributes = {};
        initiative.attributes.planningStatusFundedHc = planningStatus;
      });

    console.log(
      `PlanningService: Committed ${changes.length} status changes for year ${planningYear}`
    );
    return { updated: changes.length, changes };
  },

  /**
   * Creates a snapshot of planning data for a specific year and keeps latest 5 snapshots.
   *
   * @param {object} systemData - The global system data object.
   * @param {object} options
   * @param {number} options.planningYear - Planning year to snapshot.
   * @param {string} [options.scenario] - Scenario active at snapshot time.
   * @param {boolean} [options.applyConstraints] - Constraints toggle state.
   * @param {string} [options.label] - Optional snapshot label.
   * @returns {object|null} Snapshot object.
   */
  createPlanSnapshot(systemData, { planningYear, scenario, applyConstraints, label = '' } = {}) {
    if (!systemData || !Array.isArray(systemData.yearlyInitiatives)) {
      console.error('PlanningService.createPlanSnapshot: Invalid systemData.');
      return null;
    }
    if (!planningYear) {
      console.error('PlanningService.createPlanSnapshot: planningYear is required.');
      return null;
    }

    if (!Array.isArray(systemData.archivedYearlyPlans)) {
      systemData.archivedYearlyPlans = [];
    }

    const initiativesForYear = (systemData.yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear == planningYear
    );
    const initiativeIds = new Set(initiativesForYear.map((init) => init.initiativeId));
    const workPackagesForYear = (systemData.workPackages || []).filter((wp) =>
      initiativeIds.has(wp.initiativeId)
    );

    const snapshot = {
      snapshotId: `plan-${planningYear}-${Date.now()}`,
      planningYear: Number(planningYear),
      createdAt: new Date().toISOString(),
      label: label || `Snapshot ${new Date().toISOString()}`,
      scenario: scenario || null,
      applyConstraints: !!applyConstraints,
      initiatives: this._clone(initiativesForYear),
      workPackages: this._clone(workPackagesForYear),
    };

    systemData.archivedYearlyPlans.push(snapshot);

    // Keep latest 5 snapshots per planning year.
    const yearlySnapshots = systemData.archivedYearlyPlans
      .filter((entry) => entry.planningYear == planningYear)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const overflow = yearlySnapshots.slice(5).map((entry) => entry.snapshotId);
    if (overflow.length > 0) {
      const overflowSet = new Set(overflow);
      systemData.archivedYearlyPlans = systemData.archivedYearlyPlans.filter(
        (entry) => !overflowSet.has(entry.snapshotId)
      );
    }

    return snapshot;
  },

  /**
   * Gets snapshots for a planning year sorted by newest first.
   *
   * @param {object} systemData - The global system data object.
   * @param {number} planningYear - Planning year.
   * @returns {Array}
   */
  getPlanSnapshots(systemData, planningYear) {
    if (!systemData || !Array.isArray(systemData.archivedYearlyPlans)) return [];
    return systemData.archivedYearlyPlans
      .filter((entry) => entry.planningYear == planningYear)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Restores a saved planning snapshot into active system data.
   *
   * @param {object} systemData - The global system data object.
   * @param {string} snapshotId - Snapshot identifier.
   * @returns {{success: boolean, snapshot?: object, restoredInitiatives?: number, error?: string}}
   */
  restorePlanSnapshotInPlace(systemData, snapshotId) {
    if (!systemData || !Array.isArray(systemData.archivedYearlyPlans)) {
      return { success: false, error: 'No archived snapshots are available.' };
    }

    const snapshot = systemData.archivedYearlyPlans.find(
      (entry) => entry.snapshotId === snapshotId
    );
    if (!snapshot) {
      return { success: false, error: `Snapshot "${snapshotId}" was not found.` };
    }

    const planningYear = snapshot.planningYear;
    const existingYearInitiatives = (systemData.yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear == planningYear
    );
    const existingYearIds = new Set(existingYearInitiatives.map((init) => init.initiativeId));

    const restoredInitiatives = this._clone(snapshot.initiatives || []);
    const restoredWorkPackages = this._clone(snapshot.workPackages || []);
    const restoredIds = new Set(restoredInitiatives.map((init) => init.initiativeId));

    systemData.yearlyInitiatives = (systemData.yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear != planningYear
    );
    restoredInitiatives.forEach((initiative) => systemData.yearlyInitiatives.push(initiative));

    systemData.workPackages = (systemData.workPackages || []).filter(
      (wp) => !existingYearIds.has(wp.initiativeId) && !restoredIds.has(wp.initiativeId)
    );
    restoredWorkPackages.forEach((wp) => systemData.workPackages.push(wp));

    return {
      success: true,
      snapshot,
      restoredInitiatives: restoredInitiatives.length,
    };
  },

  _clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  _formatExportNumber(value) {
    if (!Number.isFinite(value)) return '';
    return Number(value).toFixed(2);
  },

  _escapeCsvCell(value) {
    const text = value === null || value === undefined ? '' : String(value);
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  },
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanningService;
}
