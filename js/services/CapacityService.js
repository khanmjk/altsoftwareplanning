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
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CapacityService;
}
