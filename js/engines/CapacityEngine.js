/**
 * CapacityEngine.js
 *
 * Encapsulates the logic for calculating capacity metrics, including:
 * - Gross Capacity (Human vs AI)
 * - Deductions (Leave, Holidays, Overhead, etc.)
 * - AI Productivity Gains
 * - Net Project Capacity
 */
class CapacityEngine {
  constructor(systemData) {
    this.systemData = systemData;
  }

  updateSystemData(systemData) {
    this.systemData = systemData;
  }

  /**
   * Calculates capacity metrics for all teams and scenarios.
   * @returns {Object} { totals: { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} }, [teamId]: { TeamBIS: {}, ... } }
   */
  calculateAllMetrics() {
    if (!this.systemData || !this.systemData.capacityConfiguration || !this.systemData.teams) {
      console.error('CapacityEngine: Missing core data (config or teams).');
      const zeroMetric = {
        totalHeadcount: 0,
        humanHeadcount: 0,
        grossYrs: 0,
        deductYrs: 0,
        netYrs: 0,
        deductionsBreakdown: {
          stdLeaveYrs: 0,
          varLeaveYrs: 0,
          holidayYrs: 0,
          orgEventYrs: 0,
          teamActivityYrs: 0,
          overheadYrs: 0,
          aiProductivityGainYrs: 0,
          specificLeaveYrs: 0,
        },
      };
      return {
        totals: {
          TeamBIS: { ...zeroMetric, deductionsBreakdown: { ...zeroMetric.deductionsBreakdown } },
          EffectiveBIS: {
            ...zeroMetric,
            deductionsBreakdown: { ...zeroMetric.deductionsBreakdown },
          },
          FundedHC: { ...zeroMetric, deductionsBreakdown: { ...zeroMetric.deductionsBreakdown } },
        },
      };
    }

    const capacityConfig = this.systemData.capacityConfiguration;
    const teams = this.systemData.teams;
    const allKnownEngineers = this.systemData.allKnownEngineers || [];
    const workingDaysPerYear = capacityConfig.workingDaysPerYear || 261;
    const sdesPerSdeYear = 1;
    const globalLeaveTypes = capacityConfig.leaveTypes || [];
    const workingDays = workingDaysPerYear || 1; // Safeguard for division by zero

    const teamMetrics = {};
    const totals = {
      TeamBIS: {
        totalHeadcount: 0,
        humanHeadcount: 0,
        grossYrs: 0,
        deductYrs: 0,
        netYrs: 0,
        deductionsBreakdown: {},
      },
      EffectiveBIS: {
        totalHeadcount: 0,
        humanHeadcount: 0,
        grossYrs: 0,
        deductYrs: 0,
        netYrs: 0,
        deductionsBreakdown: {},
      },
      FundedHC: {
        totalHeadcount: 0,
        humanHeadcount: 0,
        grossYrs: 0,
        deductYrs: 0,
        netYrs: 0,
        deductionsBreakdown: {},
      },
    };

    ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach((scenario) => {
      totals[scenario].deductionsBreakdown = {
        stdLeaveYrs: 0,
        varLeaveYrs: 0,
        holidayYrs: 0,
        orgEventYrs: 0,
        teamActivityYrs: 0,
        overheadYrs: 0,
        aiProductivityGainYrs: 0,
      };
    });

    (teams || []).forEach((team) => {
      if (!team || !team.teamId) return;
      teamMetrics[team.teamId] = { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} };

      // Differentiate human vs total engineers for the team
      const teamEngineerNames = team.engineers || [];
      const humanEngineersOnTeamList = teamEngineerNames.filter((name) => {
        const eng = allKnownEngineers.find((e) => e.name === name);
        return eng && !eng.attributes.isAISWE;
      });
      const aiEngineersOnTeamList = teamEngineerNames.filter((name) => {
        const eng = allKnownEngineers.find((e) => e.name === name);
        return eng && eng.attributes.isAISWE;
      });

      const teamHumanBIS = humanEngineersOnTeamList.length;
      const teamAIBIS = aiEngineersOnTeamList.length;
      const teamTotalBIS = team.engineers?.length ?? 0;

      const awayHumanMembers = (team.awayTeamMembers || []).filter(
        (m) => !m.attributes?.isAISWE
      ).length;
      const awayAIMembers = (team.awayTeamMembers || []).filter(
        (m) => m.attributes?.isAISWE
      ).length;
      const awayTotalMembers = (team.awayTeamMembers || []).length;

      // Pre-calculate per-SDE values and total team days using CapacityService
      const stdLeave_days_per_sde = CapacityService.calculateTotalStandardLeaveDaysPerSDE(
        team,
        globalLeaveTypes,
        capacityConfig
      );
      const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
      const orgEvents_days_per_sde = CapacityService.calculateOrgEventDaysPerSDE(capacityConfig);
      const overhead_days_per_sde = CapacityService.calculateOverheadDaysPerSDE(
        team,
        workingDaysPerYear
      );
      const variable_leave_total_team_days = CapacityService.calculateTotalVariableLeaveDays(team);
      const teamActivityImpacts = CapacityService.calculateTeamActivityImpacts(team);

      ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach((scenario) => {
        let totalHeadcount = 0;
        let humanHeadcount = 0;
        let newHireGainYrs = 0;
        let newHireRampUpSinkYrs = 0;

        switch (scenario) {
          case 'TeamBIS':
            totalHeadcount = teamTotalBIS;
            humanHeadcount = teamHumanBIS;
            // Apply new hire gain for TeamBIS - models hiring ramp-up from current to funded
            newHireGainYrs = Number(team.attributes?.newHireProductiveCapacityGain) || 0;
            break;
          case 'EffectiveBIS':
            totalHeadcount = teamTotalBIS + awayTotalMembers;
            humanHeadcount = teamHumanBIS + awayHumanMembers;
            break;
          case 'FundedHC':
            // FundedHC represents idealized full staffing
            // With constraints enabled, apply ramp-up sink and gain from forecasting
            humanHeadcount = Number(team.fundedHeadcount) || 0;
            totalHeadcount = humanHeadcount + teamAIBIS + awayAIMembers;
            // Read from forecasting module (if simulation run, else 0)
            newHireGainYrs = Number(team.attributes?.newHireProductiveCapacityGain) || 0;
            newHireRampUpSinkYrs = Number(team.attributes?.newHireRampUpSink) || 0;
            break;
        }

        const grossYrs = totalHeadcount * sdesPerSdeYear;

        const deductionsBreakdown = {
          stdLeaveYrs: (stdLeave_days_per_sde / workingDays) * humanHeadcount,
          varLeaveYrs: variable_leave_total_team_days / workingDays,
          holidayYrs: (holidays_days_per_sde / workingDays) * humanHeadcount,
          orgEventYrs: (orgEvents_days_per_sde / workingDays) * humanHeadcount,
          teamActivityYrs:
            (teamActivityImpacts.daysPerSDE / workingDays) * humanHeadcount +
            teamActivityImpacts.totalTeamDaysDuration / workingDays,
          overheadYrs: (overhead_days_per_sde / workingDays) * humanHeadcount,
          aiProductivityGainYrs: 0, // Initialize gain
          newHireGainYrs: newHireGainYrs, // Gain from new hires after ramp-up
          newHireRampUpSinkYrs: newHireRampUpSinkYrs, // Sink from new hires during ramp-up
          specificLeaveYrs: 0, // Specific Engineer Leave
        };

        // --- Calculate Specific Engineer Leave ---
        const engineerLeavePlans = team.teamCapacityAdjustments?.engineerLeavePlans || {};
        let totalSpecificLeaveDays = 0;
        Object.keys(engineerLeavePlans).forEach((engName) => {
          // Only count if engineer is in the current scenario (human and present)
          // Simplified: If they are a human engineer on the team, we count it.
          // We assume the plan is for the year.
          const isHuman =
            humanEngineersOnTeamList.includes(engName) ||
            (team.awayTeamMembers || []).some((m) => m.name === engName && !m.attributes?.isAISWE);
          if (isHuman) {
            totalSpecificLeaveDays += engineerLeavePlans[engName] || 0;
          }
        });
        deductionsBreakdown.specificLeaveYrs = totalSpecificLeaveDays / workingDays;

        // Note: newHireGainYrs is a GAIN (positive), but it's in the deductions object.
        // Sum only actual deductions so gains aren't subtracted from capacity.
        const actualDeductions =
          deductionsBreakdown.stdLeaveYrs +
          deductionsBreakdown.varLeaveYrs +
          deductionsBreakdown.holidayYrs +
          deductionsBreakdown.orgEventYrs +
          deductionsBreakdown.teamActivityYrs +
          deductionsBreakdown.overheadYrs +
          deductionsBreakdown.specificLeaveYrs;

        // --- Calculate and apply AI Productivity Gain ---
        const aiProductivityGainPercent =
          team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
        const humanGrossYrs = humanHeadcount * sdesPerSdeYear;

        // Base for AI Gain: (Human Gross - Deductions) + New Hire Capacity
        // We assume New Hires also get the AI boost.
        const humanNetWorkYrs_BeforeAIGain = humanGrossYrs - actualDeductions + newHireGainYrs;
        const aiGainInSdeYears = humanNetWorkYrs_BeforeAIGain * (aiProductivityGainPercent / 100);

        deductionsBreakdown.aiProductivityGainYrs = aiGainInSdeYears;

        // Final Net Calculation
        // Net = Gross - Deductions - RampUpSink + AIGain + NewHireGain
        const netYrs =
          grossYrs - actualDeductions - newHireRampUpSinkYrs + aiGainInSdeYears + newHireGainYrs;

        teamMetrics[team.teamId][scenario] = {
          totalHeadcount: totalHeadcount,
          humanHeadcount: humanHeadcount,
          grossYrs: grossYrs,
          deductYrs: actualDeductions, // Store actual deductions
          netYrs: netYrs,
          deductionsBreakdown: deductionsBreakdown,
        };

        totals[scenario].totalHeadcount += totalHeadcount;
        totals[scenario].humanHeadcount += humanHeadcount;
        totals[scenario].grossYrs += grossYrs;
        totals[scenario].deductYrs += actualDeductions;
        totals[scenario].netYrs += netYrs;

        Object.keys(deductionsBreakdown).forEach((key) => {
          totals[scenario].deductionsBreakdown[key] =
            (totals[scenario].deductionsBreakdown[key] || 0) + (deductionsBreakdown[key] || 0);
        });
      });
    });

    return { ...teamMetrics, totals: totals };
  }

  /**
   * Static helper to recalculate capacity metrics and store them on systemData.
   * This is a PURE DATA operation with no UI side effects.
   * Callers that need to refresh UI should do so separately.
   * @param {Object} systemData - The system data object to recalculate metrics for
   * @returns {Object|null} The calculated metrics, or null if data is invalid
   */
  static recalculate(systemData) {
    if (!systemData) {
      console.warn('[CapacityEngine] recalculate called with no systemData');
      return null;
    }

    const engine = new CapacityEngine(systemData);
    const metrics = engine.calculateAllMetrics();
    systemData.calculatedCapacityMetrics = metrics;

    console.log('[CapacityEngine] Metrics recalculated');
    return metrics;
  }
}

// Class is registered globally in main.js
