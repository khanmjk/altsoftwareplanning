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

                // Use CapacityService for capacity calculations
                if (typeof CapacityService !== 'undefined') {
                    const stdLeave_days_per_sde = CapacityService.calculateTotalStandardLeaveDaysPerSDE(team, globalLeaveTypes, capacityConfig);
                    const holidays_days_per_sde = capacityConfig.globalConstraints?.publicHolidays || 0;
                    const orgEvents_days_per_sde = CapacityService.calculateOrgEventDaysPerSDE(capacityConfig);
                    const overhead_days_per_sde = CapacityService.calculateOverheadDaysPerSDE(team, workingDaysPerYear);
                    const teamActivityImpacts = CapacityService.calculateTeamActivityImpacts(team);
                    const teamActivity_days_per_sde = teamActivityImpacts.daysPerSDE;

                    const totalPerSdeDeductionDays = stdLeave_days_per_sde + holidays_days_per_sde + orgEvents_days_per_sde + overhead_days_per_sde + teamActivity_days_per_sde;
                    const netProjectDaysPerSdePerYear = Math.max(0, workingDaysPerYear - totalPerSdeDeductionDays);
                    netAvailableDaysPerWeekPerSDE = (netProjectDaysPerSdePerYear / workingDaysPerYear) * 5;
                } else {
                    console.warn("ForecastingEngine: CapacityService not found. Using default capacity.");
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

        // New Hire Tracking
        let newHiresRampedUpCount = 0;
        let totalNewHireSdeWeeks = 0;

        // Week to Month Mapping (Standard 52 week year)
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

                // Proportion of attrition applied to ramped up engineers
                let rampedProportion = (preAttritionHC > 0) ? totalRampedUpEngineers / preAttritionHC : 0;
                let attritionFromRamped = Math.round(attritionThisWeek * rampedProportion);

                // Proportion of attrition applied specifically to NEW HIRES who are ramped up
                // (Assuming new hires attrite at same rate as existing ramped engineers for simplicity)
                let newHireRampedProportion = (totalRampedUpEngineers > 0) ? newHiresRampedUpCount / totalRampedUpEngineers : 0;
                let attritionFromNewHiresRamped = Math.round(attritionFromRamped * newHireRampedProportion);

                totalRampedUpEngineers -= attritionFromRamped;
                newHiresRampedUpCount -= attritionFromNewHiresRamped;
                newHiresRampedUpCount = Math.max(0, newHiresRampedUpCount); // Safety

                let attritionFromRamping = attritionThisWeek - attritionFromRamped;

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
                    newHiresRampedUpCount += rampingEngineers[i].count; // Track new hires becoming productive
                    rampingEngineers.splice(i, 1);
                }
            }

            // 4. Cap at Funded Size
            if (capAtFundedSize) {
                let overflow = totalHeadcount - fundedSize;
                if (overflow > 0) {
                    totalHeadcount = fundedSize;
                    // If we reduce headcount, we must reduce ramped/new hires too
                    // Simplified: just cap them proportionally if needed, but for now assuming overflow is rare/small
                    totalRampedUpEngineers = Math.min(totalRampedUpEngineers, totalHeadcount);
                    newHiresRampedUpCount = Math.min(newHiresRampedUpCount, totalRampedUpEngineers);
                }
            }

            // 5. Calculate Effective Engineers
            const weeklyAvailabilityMultiplier = netAvailableDaysPerWeekPerSDE / 5;
            const effectiveEngineers = totalRampedUpEngineers * weeklyAvailabilityMultiplier;

            // Calculate New Hire Specific Capacity
            const newHireEffectiveCapacity = newHiresRampedUpCount * weeklyAvailabilityMultiplier;
            totalNewHireSdeWeeks += newHireEffectiveCapacity;

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
            calculatedNetAvailableDaysPerWeek: netAvailableDaysPerWeekPerSDE,
            newHireCapacityGainSdeYears: totalNewHireSdeWeeks / 52 // Return Gain in Years
        };
    }
}
