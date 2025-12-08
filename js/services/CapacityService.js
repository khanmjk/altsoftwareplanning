/**
 * CapacityService.js
 * 
 * Pure business logic functions for team capacity calculations.
 * NO DOM access - all functions are pure and testable.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const CapacityService = {

    /**
     * Calculates total standard leave days per SDE for a team.
     * 
     * @param {object} team - Team object with teamCapacityAdjustments
     * @param {Array} globalLeaveTypes - Array of leave type definitions
     * @param {object} capacityConfig - Capacity configuration with leaveTypes
     * @returns {number} Total standard leave days per SDE
     */
    calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig) {
        if (!team || !globalLeaveTypes || !capacityConfig || !capacityConfig.leaveTypes) return 0;

        let totalEffectiveDays = 0;
        const teamUptakeEstimates = team.teamCapacityAdjustments?.leaveUptakeEstimates || [];

        globalLeaveTypes.forEach(leaveType => {
            if (!leaveType || !leaveType.id) return;
            const currentGlobalDefaultObj = capacityConfig.leaveTypes.find(lt => lt.id === leaveType.id);
            const globalDefault = currentGlobalDefaultObj ? (currentGlobalDefaultObj.defaultEstimatedDays || 0) : 0;
            const teamUptake = teamUptakeEstimates.find(est => est.leaveTypeId === leaveType.id);
            const uptakePercent = teamUptake ? (teamUptake.estimatedUptakePercent ?? 100) : 100;
            totalEffectiveDays += globalDefault * (uptakePercent / 100);
        });

        return totalEffectiveDays;
    },

    /**
     * Calculates total variable leave impact in TOTAL TEAM DAYS.
     * 
     * @param {object} team - Team object with teamCapacityAdjustments
     * @returns {number} Total variable leave days for the team
     */
    calculateTotalVariableLeaveDays(team) {
        if (!team || !team.teamCapacityAdjustments?.variableLeaveImpact) return 0;

        let totalTeamVariableDays = 0;
        const varLeaveImpacts = team.teamCapacityAdjustments.variableLeaveImpact;

        for (const leaveKey in varLeaveImpacts) {
            if (varLeaveImpacts.hasOwnProperty(leaveKey)) {
                const impact = varLeaveImpacts[leaveKey];
                totalTeamVariableDays += (impact?.affectedSDEs || 0) * (impact?.avgDaysPerAffectedSDE || 0);
            }
        }

        return totalTeamVariableDays;
    },

    /**
     * Calculates total org event days per SDE.
     * 
     * @param {object} capacityConfig - Capacity configuration with globalConstraints
     * @returns {number} Total org event days per SDE
     */
    calculateOrgEventDaysPerSDE(capacityConfig) {
        let totalDays = 0;
        const orgEvents = capacityConfig?.globalConstraints?.orgEvents || [];

        orgEvents.forEach(event => {
            totalDays += event.estimatedDaysPerSDE || 0;
        });

        return totalDays;
    },

    /**
     * Calculates team activity impacts.
     * 
     * @param {object} team - Team object with teamCapacityAdjustments
     * @returns {object} { daysPerSDE: number, totalTeamDaysDuration: number }
     */
    calculateTeamActivityImpacts(team) {
        const result = { daysPerSDE: 0, totalTeamDaysDuration: 0 };
        if (!team || !team.teamCapacityAdjustments?.teamActivities) return result;

        const teamActivities = team.teamCapacityAdjustments.teamActivities;
        teamActivities.forEach(activity => {
            const value = activity.value || 0;
            if (activity.estimateType === 'perSDE') {
                result.daysPerSDE += value;
            } else {
                result.totalTeamDaysDuration += value;
            }
        });

        return result;
    },

    /**
     * Calculates overhead days per SDE.
     * 
     * @param {object} team - Team object with teamCapacityAdjustments
     * @param {number} workingDaysPerYear - Number of working days per year
     * @returns {number} Overhead days per SDE
     */
    calculateOverheadDaysPerSDE(team, workingDaysPerYear) {
        if (!team || !team.teamCapacityAdjustments || !workingDaysPerYear || workingDaysPerYear === 0) {
            return 0;
        }

        const hoursPerWeek = team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE || 0;
        if (hoursPerWeek === 0) return 0;

        const standardHoursPerDay = 8;
        const totalAnnualOverheadHours = hoursPerWeek * (workingDaysPerYear / 5);
        const totalOverheadDays = totalAnnualOverheadHours / standardHoursPerDay;

        return totalOverheadDays;
    },

    /**
     * Calculates net available days per SDE after all deductions.
     * This is a composite calculation that uses all other capacity methods.
     * 
     * @param {object} params - Calculation parameters
     * @param {object} params.team - Team object
     * @param {Array} params.globalLeaveTypes - Leave type definitions
     * @param {object} params.capacityConfig - Capacity configuration
     * @param {number} params.workingDaysPerYear - Working days per year
     * @returns {object} Detailed breakdown of capacity calculations
     */
    calculateNetCapacity({ team, globalLeaveTypes, capacityConfig, workingDaysPerYear }) {
        const standardLeaveDays = this.calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
        const orgEventDays = this.calculateOrgEventDaysPerSDE(capacityConfig);
        const teamActivityImpacts = this.calculateTeamActivityImpacts(team);
        const overheadDays = this.calculateOverheadDaysPerSDE(team, workingDaysPerYear);
        const variableLeaveTotalDays = this.calculateTotalVariableLeaveDays(team);

        // Per-SDE deductions
        const totalPerSdeDeductions = standardLeaveDays + orgEventDays + teamActivityImpacts.daysPerSDE + overheadDays;

        // Net available days per SDE
        const netDaysPerSDE = workingDaysPerYear - totalPerSdeDeductions;

        return {
            workingDaysPerYear,
            deductions: {
                standardLeaveDays,
                orgEventDays,
                teamActivityDaysPerSDE: teamActivityImpacts.daysPerSDE,
                teamActivityTotalDays: teamActivityImpacts.totalTeamDaysDuration,
                overheadDays,
                variableLeaveTotalDays
            },
            totalPerSdeDeductions,
            netDaysPerSDE,
            netWeeksPerSDE: netDaysPerSDE / 5
        };
    },

    /**
     * Bulk-updates capacity settings for multiple teams.
     * @param {object} systemData
     * @param {object} options - Configuration options
     * @param {object} options.updates - Fields to merge into teamCapacityAdjustments
     * @param {number} options.capacityReductionPercent - Percent reduction (converted to overhead hours)
     * @param {number} options.aiProductivityGainPercent - AI productivity gain %
     * @param {number} options.avgOverheadHoursPerWeekPerSDE - Overhead hours per week
     * @param {object} options.filter - Optional filter { teamIds: [], orgIdentifier: 'sdmId|seniorManagerId|All' }
     * @returns {object} Summary of updates applied
     */
    bulkUpdateTeamCapacity(systemData, options = {}) {
        if (!systemData || !Array.isArray(systemData.teams)) {
            throw new Error('bulkUpdateTeamCapacity: systemData.teams is unavailable.');
        }
        const { updates = {}, capacityReductionPercent = null, aiProductivityGainPercent = null, avgOverheadHoursPerWeekPerSDE = null, filter = {} } = options;

        // Helper to ensure team has capacity adjustments initialized
        const ensureTeamCapacityAdjustments = (team) => {
            if (!team.teamCapacityAdjustments || typeof team.teamCapacityAdjustments !== 'object') {
                team.teamCapacityAdjustments = {
                    leaveUptakeEstimates: [],
                    variableLeaveImpact: {},
                    teamActivities: [],
                    avgOverheadHoursPerWeekPerSDE: 0,
                    aiProductivityGainPercent: 0,
                    attributes: {}
                };
            }
            const adj = team.teamCapacityAdjustments;
            if (!Array.isArray(adj.leaveUptakeEstimates)) adj.leaveUptakeEstimates = [];
            if (!adj.variableLeaveImpact || typeof adj.variableLeaveImpact !== 'object') adj.variableLeaveImpact = {};
            if (!Array.isArray(adj.teamActivities)) adj.teamActivities = [];
            if (adj.avgOverheadHoursPerWeekPerSDE === undefined || adj.avgOverheadHoursPerWeekPerSDE === null) adj.avgOverheadHoursPerWeekPerSDE = 0;
            if (adj.aiProductivityGainPercent === undefined || adj.aiProductivityGainPercent === null) adj.aiProductivityGainPercent = 0;
            if (!adj.attributes || typeof adj.attributes !== 'object') adj.attributes = {};
            return adj;
        };

        // Filter teams based on criteria
        const targets = systemData.teams.filter(team => {
            if (!filter || Object.keys(filter).length === 0) return true;

            if (Array.isArray(filter.teamIds) && filter.teamIds.length > 0) {
                return filter.teamIds.includes(team.teamId);
            }

            if (filter.orgIdentifier) {
                const ident = String(filter.orgIdentifier).trim();
                if (!ident || ident.toLowerCase() === 'all') return true;
                if ((team.sdmId || '').toLowerCase() === ident.toLowerCase()) return true;

                // Check via SDM resolution
                if (typeof OrgService !== 'undefined' && OrgService._resolveSdmIdentifier) {
                    const resolvedSdmId = OrgService._resolveSdmIdentifier(systemData, ident);
                    if (resolvedSdmId && team.sdmId && team.sdmId.toLowerCase() === resolvedSdmId.toLowerCase()) return true;
                }

                // Check via Senior Manager
                if (systemData?.sdms && typeof OrgService !== 'undefined' && OrgService._resolveSeniorManagerIdentifier) {
                    const teamSdm = (systemData.sdms || []).find(s => s.sdmId === team.sdmId);
                    const resolvedSrMgrId = OrgService._resolveSeniorManagerIdentifier(systemData, ident);
                    if (resolvedSrMgrId && teamSdm?.seniorManagerId === resolvedSrMgrId) return true;
                }
                return false;
            }

            return true;
        });

        const updatedTeams = [];
        const appliedFields = [];

        targets.forEach(team => {
            const adj = ensureTeamCapacityAdjustments(team);
            const changeLog = {};

            if (aiProductivityGainPercent !== null && aiProductivityGainPercent !== undefined) {
                adj.aiProductivityGainPercent = aiProductivityGainPercent;
                changeLog.aiProductivityGainPercent = aiProductivityGainPercent;
                if (!appliedFields.includes('aiProductivityGainPercent')) appliedFields.push('aiProductivityGainPercent');
            }
            if (avgOverheadHoursPerWeekPerSDE !== null && avgOverheadHoursPerWeekPerSDE !== undefined) {
                adj.avgOverheadHoursPerWeekPerSDE = avgOverheadHoursPerWeekPerSDE;
                changeLog.avgOverheadHoursPerWeekPerSDE = avgOverheadHoursPerWeekPerSDE;
                if (!appliedFields.includes('avgOverheadHoursPerWeekPerSDE')) appliedFields.push('avgOverheadHoursPerWeekPerSDE');
            }
            if (capacityReductionPercent !== null && capacityReductionPercent !== undefined && !isNaN(capacityReductionPercent)) {
                const percent = Number(capacityReductionPercent);
                const assumedHoursPerWeek = 40;
                const addedOverhead = Math.max(0, (percent / 100) * assumedHoursPerWeek);
                adj.avgOverheadHoursPerWeekPerSDE = (adj.avgOverheadHoursPerWeekPerSDE || 0) + addedOverhead;
                adj.strategicBufferPercent = percent;
                changeLog.capacityReductionPercent = percent;
                changeLog.addedOverheadHoursPerWeekPerSDE = addedOverhead;
                if (!appliedFields.includes('capacityReductionPercent')) appliedFields.push('capacityReductionPercent');
            }
            if (updates && typeof updates === 'object') {
                Object.keys(updates).forEach(key => {
                    adj[key] = updates[key];
                    changeLog[key] = updates[key];
                    if (!appliedFields.includes(key)) appliedFields.push(key);
                });
            }

            updatedTeams.push({
                teamId: team.teamId,
                teamName: team.teamIdentity || team.teamName || team.teamId,
                changes: changeLog
            });
        });

        return {
            updatedCount: updatedTeams.length,
            updatedTeams,
            appliedFields,
            scopeDescription: `${updatedTeams.length} ${updatedTeams.length === 1 ? 'team' : 'teams'}`,
            filterApplied: filter
        };
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CapacityService;
}
