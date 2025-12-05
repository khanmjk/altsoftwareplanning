/**
 * ForecastingEngine.js
 * 
 * Encapsulates the core logic for the Resource Forecasting simulation.
 * Pure logic class - no DOM manipulation.
 */
class ForecastingEngine {
    constructor(systemData) {
        this.systemData = systemData;
    }

    updateSystemData(newSystemData) {
        this.systemData = newSystemData;
    }

    /**
     * Calculates the minimum constant weekly hiring rate needed to reach the funded size by the target week.
     * @param {number} fundedSize 
     * @param {number} currentEngineers 
     * @param {number} hiringTime 
     * @param {number} rampUpTime 
     * @param {number} attritionRate (annual percentage, e.g., 0.10 for 10%)
     * @param {number} closeGapWeek 
     * @returns {number} The required weekly hiring rate.
     */
    computeHiringRate(fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, closeGapWeek) {
        let lowerBound = 0;
        let upperBound = 20; // Max plausible rate
        let tolerance = 0.01;
        let hiringRate = 0;
        let iterations = 0;

        while ((upperBound - lowerBound) > tolerance && iterations < 1000) {
            hiringRate = (upperBound + lowerBound) / 2;

            // Run simulation with null teamId to use default capacity assumptions for rate calculation
            const simulationResult = this.simulateTeamSize(
                hiringRate, fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, null
            );

            if (!simulationResult || !simulationResult.totalHeadcountArray) {
                console.error("ForecastingEngine: Simulation failed during rate computation.");
                return 0;
            }

            const totalHeadcountAtTargetWeek = simulationResult.totalHeadcountArray[closeGapWeek - 1];

            if (totalHeadcountAtTargetWeek === undefined) {
                console.error(`ForecastingEngine: Headcount for target week ${closeGapWeek} is undefined.`);
                return 0;
            }

            if (totalHeadcountAtTargetWeek >= fundedSize) {
                upperBound = hiringRate;
            } else {
                lowerBound = hiringRate;
            }
            iterations++;
        }

        return upperBound;
    }

    /**
     * Simulates the team size over 52 weeks.
     * @param {number} hiringRate 
     * @param {number} fundedSize 
     * @param {number} currentEngineers 
     * @param {number} hiringTime 
     * @param {number} rampUpTime 
     * @param {number} attritionRate 
     * @param {string|null} selectedTeamId 
     * @param {boolean} capAtFundedSize 
     * @returns {Object} Simulation results
     */
    /**
     * Calculates the estimated total hires needed, including gap filling and attrition replacement.
     */
    calculateEstimatedHiresNeeded(fundedSize, currentEngineers, hiringRate, attritionRate, closeGapWeek) {
        let estimatedAttritionByTarget = 0;
        let tempHeadcount = currentEngineers;
        let tempAttritionCounter = 0;
        const tempWeeklyAttrition = attritionRate / 52;

        for (let wk = 1; wk < closeGapWeek; wk++) {
            tempAttritionCounter += tempHeadcount * tempWeeklyAttrition;
            let attrThisWk = Math.floor(tempAttritionCounter);
            tempAttritionCounter -= attrThisWk;
            tempHeadcount -= attrThisWk;
            estimatedAttritionByTarget += attrThisWk;
            tempHeadcount += hiringRate;
            tempHeadcount = Math.min(tempHeadcount, fundedSize);
        }

        const initialGap = Math.max(0, fundedSize - currentEngineers);
        return {
            totalHiresNeeded: initialGap + estimatedAttritionByTarget,
            initialGap: initialGap,
            estimatedAttrition: estimatedAttritionByTarget
        };
    }

    /**
     * Simulates the team size over 52 weeks.
     * @param {number} hiringRate 
     * @param {number} fundedSize 
     * @param {number} currentEngineers 
     * @param {number} hiringTime 
     * @param {number} rampUpTime 
     * @param {number} attritionRate 
     * @param {string|null} selectedTeamId 
     * @param {boolean} capAtFundedSize 
     * @returns {Object} Simulation results
     */
    simulateTeamSize(hiringRate, fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, selectedTeamId = null, capAtFundedSize = true) {
        let netAvailableDaysPerWeekPerSDE = 5.0;

        // Calculate detailed capacity if team is selected
        if (selectedTeamId) {
            const team = this.systemData?.teams?.find(t => t.teamId === selectedTeamId);
            const capacityConfig = this.systemData?.capacityConfiguration;

            if (team && capacityConfig && capacityConfig.workingDaysPerYear > 0) {
                const workingDaysPerYear = capacityConfig.workingDaysPerYear;
                const globalLeaveTypes = capacityConfig.leaveTypes || [];

                // Safety check for helper functions
                if (typeof window.calculateTotalStandardLeaveDaysPerSDE !== 'function') {
                    console.warn("ForecastingEngine: Helper functions (e.g., calculateTotalStandardLeaveDaysPerSDE) not found. Using default capacity.");
                } else {
                    const stdLeave_days_per_sde = window.calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
                    const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
                    const orgEvents_days_per_sde = window.calculateOrgEventDaysPerSDE ? window.calculateOrgEventDaysPerSDE(capacityConfig) : 0;
                    const overhead_days_per_sde = window.calculateOverheadDaysPerSDE ? window.calculateOverheadDaysPerSDE(team, workingDaysPerYear) : 0;
                    const teamActivityImpacts = window.calculateTeamActivityImpacts ? window.calculateTeamActivityImpacts(team) : { daysPerSDE: 0 };
                    const teamActivity_days_per_sde = teamActivityImpacts.daysPerSDE;

                    const totalPerSdeDeductionDays = stdLeave_days_per_sde + holidays_days_per_sde + orgEvents_days_per_sde + overhead_days_per_sde + teamActivity_days_per_sde;
                    const netProjectDaysPerSdePerYear = Math.max(0, workingDaysPerYear - totalPerSdeDeductionDays);
                    netAvailableDaysPerWeekPerSDE = (netProjectDaysPerSdePerYear / workingDaysPerYear) * 5;
                }
            }
        }


        // Initialize Simulation Variables
        let productiveEngineersLocal = [];
        let totalRampedUpEngineersArrayLocal = [];
        let cumulativeAttritionArrayLocal = [];
        let totalHeadcountArrayLocal = [];
        let monthlyDataLocal = { headcount: [], sdeWeeks: [], sdeDays: [] };

        let weeks = 52;
        let totalRampedUpEngineers = currentEngineers;
        let totalHeadcount = currentEngineers;
        let hiringPipeline = [];
        let rampingEngineers = [];
        let cumulativeAttrition = 0;
        let attritionCounter = 0;
        const weeklyAttritionRate = attritionRate / 52;

        // Week to Month Mapping (Standard 52 week year)
        // Simple approximation: 4.33 weeks per month, or just mapping index to month 0-11
        // Reusing the global mapping if available, or generating a simple one.
        const weekToMonth = [];
        let currentMonth = 1;
        for (let w = 1; w <= 52; w++) {
            weekToMonth.push(currentMonth);
            if (w % 4 === 0 && w < 48) currentMonth++; // Simple 4-week blocks for simplicity or use Luxon if needed
            // Better: use the global weekToMonth_SDM if it exists, otherwise simple logic
        }
        // Actually, let's use a standard distribution for robustness
        // 1-4: Jan, 5-8: Feb, 9-13: Mar, etc.
        // For this engine, let's just use a simple array for now.
        const simpleWeekToMonth = [
            1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6,
            7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12
        ];


        for (let week = 1; week <= weeks; week++) {
            // 1. Attrition
            attritionCounter += totalHeadcount * weeklyAttritionRate;
            let attritionThisWeek = Math.floor(attritionCounter);
            attritionCounter -= attritionThisWeek;

            if (attritionThisWeek > 0) {
                totalHeadcount -= attritionThisWeek;
                let preAttritionHC = totalHeadcount + attritionThisWeek;
                let rampedProportion = (preAttritionHC > 0) ? totalRampedUpEngineers / preAttritionHC : 0;
                let attritionFromRamped = Math.round(attritionThisWeek * rampedProportion);
                let attritionFromRamping = attritionThisWeek - attritionFromRamped;

                totalRampedUpEngineers -= attritionFromRamped;

                let removedFromRamping = 0;
                for (let i = rampingEngineers.length - 1; i >= 0 && removedFromRamping < attritionFromRamping; i--) {
                    let removable = Math.min(rampingEngineers[i].count, attritionFromRamping - removedFromRamping);
                    rampingEngineers[i].count -= removable;
                    removedFromRamping += removable;
                    if (rampingEngineers[i].count <= 0) {
                        rampingEngineers.splice(i, 1);
                    }
                }
                cumulativeAttrition += attritionThisWeek;
            }

            totalRampedUpEngineers = Math.max(0, totalRampedUpEngineers);
            totalHeadcount = Math.max(0, totalHeadcount);

            // 2. Hiring
            let totalFutureHeadcount = totalHeadcount + hiringPipeline.reduce((sum, h) => sum + h.count, 0);
            if (totalFutureHeadcount < fundedSize) {
                let hiringNeeded = fundedSize - totalFutureHeadcount;
                let actualHiring = Math.min(hiringRate, hiringNeeded);
                if (actualHiring > 0) {
                    hiringPipeline.push({ weeksLeft: hiringTime, count: actualHiring });
                }
            }

            // 3. Pipeline Progression
            // Hiring -> Ramping
            for (let i = hiringPipeline.length - 1; i >= 0; i--) {
                hiringPipeline[i].weeksLeft--;
                if (hiringPipeline[i].weeksLeft <= 0) {
                    totalHeadcount += hiringPipeline[i].count;
                    rampingEngineers.push({ weeksLeft: rampUpTime, count: hiringPipeline[i].count });
                    hiringPipeline.splice(i, 1);
                }
            }

            // Ramping -> Ramped Up
            for (let i = rampingEngineers.length - 1; i >= 0; i--) {
                rampingEngineers[i].weeksLeft--;
                if (rampingEngineers[i].weeksLeft <= 0) {
                    totalRampedUpEngineers += rampingEngineers[i].count;
                    rampingEngineers.splice(i, 1);
                }
            }

            // 4. Cap at Funded Size
            if (capAtFundedSize) {
                let overflow = totalHeadcount - fundedSize;
                if (overflow > 0) {
                    totalHeadcount = fundedSize;
                    totalRampedUpEngineers = Math.min(totalRampedUpEngineers, totalHeadcount);
                }
            }

            // 5. Calculate Effective Engineers
            const weeklyAvailabilityMultiplier = netAvailableDaysPerWeekPerSDE / 5;
            const effectiveEngineers = totalRampedUpEngineers * weeklyAvailabilityMultiplier;

            // 6. Store Results
            productiveEngineersLocal.push(effectiveEngineers);
            totalRampedUpEngineersArrayLocal.push(totalRampedUpEngineers);
            totalHeadcountArrayLocal.push(totalHeadcount);
            cumulativeAttritionArrayLocal.push(cumulativeAttrition);

            // 7. Aggregate Monthly
            const monthNumber = simpleWeekToMonth[week - 1] || 12;
            const monthIndex = monthNumber - 1;

            if (monthlyDataLocal.headcount[monthIndex] === undefined) {
                monthlyDataLocal.headcount[monthIndex] = 0;
                monthlyDataLocal.sdeWeeks[monthIndex] = 0;
                monthlyDataLocal.sdeDays[monthIndex] = 0;
            }
            // Use the last week's headcount as the month's headcount (snapshot) or average?
            // Existing logic seemed to overwrite, effectively taking the last week.
            monthlyDataLocal.headcount[monthIndex] = totalHeadcount;
            monthlyDataLocal.sdeWeeks[monthIndex] += effectiveEngineers;
            monthlyDataLocal.sdeDays[monthIndex] += effectiveEngineers * netAvailableDaysPerWeekPerSDE;
        }

        // Final formatting for monthly data
        for (let i = 0; i < 12; i++) {
            monthlyDataLocal.headcount[i] = Math.round(monthlyDataLocal.headcount[i] || 0);
            monthlyDataLocal.sdeDays[i] = parseFloat((monthlyDataLocal.sdeDays[i] || 0).toFixed(2));
            monthlyDataLocal.sdeWeeks[i] = parseFloat((monthlyDataLocal.sdeWeeks[i] || 0).toFixed(2));
        }

        return {
            productiveEngineers: productiveEngineersLocal,
            totalRampedUpEngineersArray: totalRampedUpEngineersArrayLocal,
            totalHeadcountArray: totalHeadcountArrayLocal,
            cumulativeAttritionArray: cumulativeAttritionArrayLocal,
            monthlyData: monthlyDataLocal,
            calculatedNetAvailableDaysPerWeek: netAvailableDaysPerWeekPerSDE
        };
    }
}
