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
            console.error("CapacityEngine: Missing core data (config or teams).");
            const zeroMetric = {
                totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0,
                deductionsBreakdown: { stdLeaveYrs: 0, varLeaveYrs: 0, holidayYrs: 0, orgEventYrs: 0, teamActivityYrs: 0, overheadYrs: 0, aiProductivityGainYrs: 0, specificLeaveYrs: 0 }
            };
            return {
                totals: {
                    TeamBIS: { ...zeroMetric, deductionsBreakdown: { ...zeroMetric.deductionsBreakdown } },
                    EffectiveBIS: { ...zeroMetric, deductionsBreakdown: { ...zeroMetric.deductionsBreakdown } },
                    FundedHC: { ...zeroMetric, deductionsBreakdown: { ...zeroMetric.deductionsBreakdown } }
                }
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
            TeamBIS: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
            EffectiveBIS: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} },
            FundedHC: { totalHeadcount: 0, humanHeadcount: 0, grossYrs: 0, deductYrs: 0, netYrs: 0, deductionsBreakdown: {} }
        };

        ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
            totals[scenario].deductionsBreakdown = { stdLeaveYrs: 0, varLeaveYrs: 0, holidayYrs: 0, orgEventYrs: 0, teamActivityYrs: 0, overheadYrs: 0, aiProductivityGainYrs: 0 };
        });

        (teams || []).forEach(team => {
            if (!team || !team.teamId) return;
            teamMetrics[team.teamId] = { TeamBIS: {}, EffectiveBIS: {}, FundedHC: {} };

            // Differentiate human vs total engineers for the team
            const teamEngineerNames = team.engineers || [];
            const humanEngineersOnTeamList = teamEngineerNames.filter(name => {
                const eng = allKnownEngineers.find(e => e.name === name);
                return eng && !eng.attributes.isAISWE;
            });
            const aiEngineersOnTeamList = teamEngineerNames.filter(name => {
                const eng = allKnownEngineers.find(e => e.name === name);
                return eng && eng.attributes.isAISWE;
            });

            const teamHumanBIS = humanEngineersOnTeamList.length;
            const teamAIBIS = aiEngineersOnTeamList.length;
            const teamTotalBIS = team.engineers?.length ?? 0;

            const awayHumanMembers = (team.awayTeamMembers || []).filter(m => !m.attributes?.isAISWE).length;
            const awayAIMembers = (team.awayTeamMembers || []).filter(m => m.attributes?.isAISWE).length;
            const awayTotalMembers = (team.awayTeamMembers || []).length;


            // Pre-calculate per-SDE values and total team days using helpers
            // Note: Assuming global helper functions are available. 
            // If strict modularity is required, these should be static methods or imported.
            const stdLeave_days_per_sde = calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
            const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
            const orgEvents_days_per_sde = calculateOrgEventDaysPerSDE(capacityConfig);
            const overhead_days_per_sde = calculateOverheadDaysPerSDE(team, workingDaysPerYear);
            const variable_leave_total_team_days = calculateTotalVariableLeaveDays(team);
            const teamActivityImpacts = calculateTeamActivityImpacts(team);

            ['TeamBIS', 'EffectiveBIS', 'FundedHC'].forEach(scenario => {
                let totalHeadcount = 0;
                let humanHeadcount = 0;

                switch (scenario) {
                    case 'TeamBIS':
                        totalHeadcount = teamTotalBIS;
                        humanHeadcount = teamHumanBIS;
                        break;
                    case 'EffectiveBIS':
                        totalHeadcount = teamTotalBIS + awayTotalMembers;
                        humanHeadcount = teamHumanBIS + awayHumanMembers;
                        break;
                    case 'FundedHC':
                        humanHeadcount = team.fundedHeadcount || 0;
                        totalHeadcount = humanHeadcount + teamAIBIS + awayAIMembers;
                        break;
                }

                const grossYrs = totalHeadcount * sdesPerSdeYear;

                const deductionsBreakdown = {
                    stdLeaveYrs: (stdLeave_days_per_sde / workingDays) * humanHeadcount,
                    varLeaveYrs: variable_leave_total_team_days / workingDays,
                    holidayYrs: (holidays_days_per_sde / workingDays) * humanHeadcount,
                    orgEventYrs: (orgEvents_days_per_sde / workingDays) * humanHeadcount,
                    teamActivityYrs: (teamActivityImpacts.daysPerSDE / workingDays) * humanHeadcount + (teamActivityImpacts.totalTeamDaysDuration / workingDays),
                    overheadYrs: (overhead_days_per_sde / workingDays) * humanHeadcount,
                    aiProductivityGainYrs: 0, // Initialize gain
                    specificLeaveYrs: 0 // New Feature: Specific Engineer Leave
                };

                // --- Calculate Specific Engineer Leave ---
                const engineerLeavePlans = team.teamCapacityAdjustments?.engineerLeavePlans || {};
                let totalSpecificLeaveDays = 0;
                Object.keys(engineerLeavePlans).forEach(engName => {
                    // Only count if engineer is in the current scenario (human and present)
                    // Simplified: If they are a human engineer on the team, we count it.
                    // We assume the plan is for the year.
                    const isHuman = humanEngineersOnTeamList.includes(engName) || (team.awayTeamMembers || []).some(m => m.name === engName && !m.attributes?.isAISWE);
                    if (isHuman) {
                        totalSpecificLeaveDays += (engineerLeavePlans[engName] || 0);
                    }
                });
                deductionsBreakdown.specificLeaveYrs = totalSpecificLeaveDays / workingDays;

                const totalDeductYrs = Object.values(deductionsBreakdown).reduce((sum, val) => sum + (val || 0), 0);

                // --- Calculate and apply AI Productivity Gain ---
                const aiProductivityGainPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
                const humanGrossYrs = humanHeadcount * sdesPerSdeYear;
                // All deductions are already based on human headcount
                const humanNetWorkYrs_BeforeGain = humanGrossYrs - totalDeductYrs;
                const aiGainInSdeYears = humanNetWorkYrs_BeforeGain * (aiProductivityGainPercent / 100);

                deductionsBreakdown.aiProductivityGainYrs = aiGainInSdeYears;

                const netYrs = (grossYrs - totalDeductYrs) + aiGainInSdeYears;

                teamMetrics[team.teamId][scenario] = {
                    totalHeadcount: totalHeadcount,
                    humanHeadcount: humanHeadcount,
                    grossYrs: grossYrs,
                    deductYrs: totalDeductYrs,
                    netYrs: netYrs,
                    deductionsBreakdown: deductionsBreakdown
                };

                totals[scenario].totalHeadcount += totalHeadcount;
                totals[scenario].humanHeadcount += humanHeadcount;
                totals[scenario].grossYrs += grossYrs;
                totals[scenario].deductYrs += totalDeductYrs;
                totals[scenario].netYrs += netYrs;

                Object.keys(deductionsBreakdown).forEach(key => {
                    totals[scenario].deductionsBreakdown[key] = (totals[scenario].deductionsBreakdown[key] || 0) + (deductionsBreakdown[key] || 0);
                });
            });
        });

        return { ...teamMetrics, totals: totals };
    }
}

// Make available globally
window.CapacityEngine = CapacityEngine;
