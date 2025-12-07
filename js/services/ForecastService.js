/**
 * ForecastService.js
 * 
 * Pure business logic functions for SDM team size forecasting.
 * NO DOM access - all functions are pure and testable.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

// Week to month mapping (used for monthly aggregation)
const WEEK_TO_MONTH = [
    1, 1, 1, 1, 2, 2, 2, 2, 2,            // Weeks 1-9
    3, 3, 3, 3, 4, 4, 4, 4,               // Weeks 10-17
    5, 5, 5, 5, 6, 6, 6, 6, 6,            // Weeks 18-26
    7, 7, 7, 7, 8, 8, 8, 8,               // Weeks 27-34
    9, 9, 9, 9, 10, 10, 10, 10, 10,       // Weeks 35-43
    11, 11, 11, 11, 12, 12, 12, 12, 12    // Weeks 44-52
];

const ForecastService = {

    /**
     * Calculates the required hiring rate to reach funded size by target week.
     * Uses binary search to find optimal rate.
     * 
     * @param {object} params - Calculation parameters
     * @param {number} params.fundedSize - Target team size
     * @param {number} params.currentEngineers - Current team size
     * @param {number} params.hiringTime - Weeks from hire to start
     * @param {number} params.rampUpTime - Weeks to full productivity
     * @param {number} params.attritionRate - Annual attrition rate (0-1)
     * @param {number} params.closeGapWeek - Target week to reach funded size
     * @returns {number} Required weekly hiring rate
     */
    computeHiringRate({ fundedSize, currentEngineers, hiringTime, rampUpTime, attritionRate, closeGapWeek }) {
        let lowerBound = 0;
        let upperBound = 20; // Max plausible rate
        let tolerance = 0.01;
        let hiringRate = 0;
        let iterations = 0;

        while ((upperBound - lowerBound) > tolerance && iterations < 1000) {
            hiringRate = (upperBound + lowerBound) / 2;

            // Run simulation with default capacity (5 days/week)
            const simulationResult = this.simulateTeamSize({
                hiringRate,
                fundedSize,
                currentEngineers,
                hiringTime,
                rampUpTime,
                attritionRate,
                netAvailableDaysPerWeek: 5.0,
                capAtFundedSize: true
            });

            if (!simulationResult || !simulationResult.totalHeadcountArray) {
                console.error("ForecastService: Simulation failed during hiring rate computation.");
                return 0;
            }

            const totalHeadcountAtTargetWeek = simulationResult.totalHeadcountArray[closeGapWeek - 1];

            if (totalHeadcountAtTargetWeek === undefined) {
                console.error(`ForecastService: Headcount for target week ${closeGapWeek} is undefined.`);
                return 0;
            }

            if (totalHeadcountAtTargetWeek >= fundedSize) {
                upperBound = hiringRate;
            } else {
                lowerBound = hiringRate;
            }
            iterations++;
        }

        if (iterations >= 1000) {
            console.warn("ForecastService: computeHiringRate reached max iterations.");
        }

        return upperBound;
    },

    /**
     * Simulates team size over 52 weeks given hiring parameters.
     * Pure function - no global state access.
     * 
     * @param {object} params - Simulation parameters
     * @param {number} params.hiringRate - Weekly hiring rate
     * @param {number} params.fundedSize - Target team size
     * @param {number} params.currentEngineers - Starting productive engineers
     * @param {number} params.hiringTime - Weeks from hire to start
     * @param {number} params.rampUpTime - Weeks to full productivity
     * @param {number} params.attritionRate - Annual attrition rate (0-1)
     * @param {number} params.netAvailableDaysPerWeek - Net productive days per week per SDE
     * @param {boolean} [params.capAtFundedSize=true] - Whether to cap at funded size
     * @returns {object} Simulation results with weekly and monthly data
     */
    simulateTeamSize({
        hiringRate,
        fundedSize,
        currentEngineers,
        hiringTime,
        rampUpTime,
        attritionRate,
        netAvailableDaysPerWeek = 5.0,
        capAtFundedSize = true
    }) {
        // Simulation state
        let productiveEngineers = [];
        let totalRampedUpEngineersArray = [];
        let cumulativeAttritionArray = [];
        let totalHeadcountArray = [];
        let monthlyData = { headcount: [], sdeWeeks: [], sdeDays: [] };

        const weeks = 52;
        let totalRampedUpEngineers = currentEngineers;
        let totalHeadcount = currentEngineers;
        let hiringPipeline = [];
        let rampingEngineers = [];
        let cumulativeAttrition = 0;
        let attritionCounter = 0;
        const weeklyAttritionRate = attritionRate / 52;

        // Weekly simulation loop
        for (let week = 1; week <= weeks; week++) {
            // Attrition (based on total headcount)
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

            // Hiring (target fundedSize)
            let totalFutureHeadcount = totalHeadcount + hiringPipeline.reduce((sum, h) => sum + h.count, 0);
            if (totalFutureHeadcount < fundedSize) {
                let hiringNeeded = fundedSize - totalFutureHeadcount;
                let actualHiring = Math.min(hiringRate, hiringNeeded);
                if (actualHiring > 0) {
                    hiringPipeline.push({ weeksLeft: hiringTime, count: actualHiring });
                }
            }

            // Advance hiring pipeline -> Ramping
            for (let i = hiringPipeline.length - 1; i >= 0; i--) {
                hiringPipeline[i].weeksLeft--;
                if (hiringPipeline[i].weeksLeft <= 0) {
                    totalHeadcount += hiringPipeline[i].count;
                    rampingEngineers.push({ weeksLeft: rampUpTime, count: hiringPipeline[i].count });
                    hiringPipeline.splice(i, 1);
                }
            }

            // Advance ramp-up pipeline -> Ramped Up
            for (let i = rampingEngineers.length - 1; i >= 0; i--) {
                rampingEngineers[i].weeksLeft--;
                if (rampingEngineers[i].weeksLeft <= 0) {
                    totalRampedUpEngineers += rampingEngineers[i].count;
                    rampingEngineers.splice(i, 1);
                }
            }

            // Cap total headcount at funded size if required
            if (capAtFundedSize) {
                let overflow = totalHeadcount - fundedSize;
                if (overflow > 0) {
                    totalHeadcount = fundedSize;
                    totalRampedUpEngineers = Math.min(totalRampedUpEngineers, totalHeadcount);
                }
            }

            // Calculate effective engineers using NET available days
            const weeklyAvailabilityMultiplier = netAvailableDaysPerWeek / 5;
            const effectiveEngineers = totalRampedUpEngineers * weeklyAvailabilityMultiplier;

            // Store weekly results
            productiveEngineers.push(effectiveEngineers);
            totalRampedUpEngineersArray.push(totalRampedUpEngineers);
            totalHeadcountArray.push(totalHeadcount);
            cumulativeAttritionArray.push(cumulativeAttrition);

            // Aggregate monthly data
            const weekArrayIndex = week - 1;
            if (weekArrayIndex >= 0 && weekArrayIndex < WEEK_TO_MONTH.length) {
                const monthNumber = WEEK_TO_MONTH[weekArrayIndex];
                if (typeof monthNumber === 'number' && monthNumber >= 1 && monthNumber <= 12) {
                    let monthIndex = monthNumber - 1;
                    if (monthlyData.headcount[monthIndex] === undefined) {
                        monthlyData.headcount[monthIndex] = 0;
                        monthlyData.sdeWeeks[monthIndex] = 0;
                        monthlyData.sdeDays[monthIndex] = 0;
                    }
                    monthlyData.headcount[monthIndex] = totalHeadcount;
                    monthlyData.sdeWeeks[monthIndex] += effectiveEngineers;
                    monthlyData.sdeDays[monthIndex] += effectiveEngineers * netAvailableDaysPerWeek;
                }
            }
        }

        // Final formatting for monthly data
        for (let i = 0; i < 12; i++) {
            monthlyData.headcount[i] = Math.round(monthlyData.headcount[i] || 0);
            monthlyData.sdeDays[i] = parseFloat((monthlyData.sdeDays[i] || 0).toFixed(2));
            monthlyData.sdeWeeks[i] = parseFloat((monthlyData.sdeWeeks[i] || 0).toFixed(2));
        }

        return {
            productiveEngineers,
            totalRampedUpEngineersArray,
            totalHeadcountArray,
            cumulativeAttritionArray,
            monthlyData,
            calculatedNetAvailableDaysPerWeek: netAvailableDaysPerWeek
        };
    },

    /**
     * Calculates total annual SDE-Years from simulation result.
     * 
     * @param {object} simulationResult - Result from simulateTeamSize
     * @returns {number} Total SDE-Years for the year
     */
    calculateAnnualSdeYears(simulationResult) {
        if (!simulationResult?.productiveEngineers) return 0;
        const totalSdeWeeks = simulationResult.productiveEngineers.reduce((sum, val) => sum + val, 0);
        return totalSdeWeeks / 52;
    },

    /**
     * Finds the week when team reaches a specific size threshold.
     * 
     * @param {Array} headcountArray - Weekly headcount array
     * @param {number} threshold - Target headcount
     * @returns {number|null} Week number (1-52) or null if never reached
     */
    findWeekReachingThreshold(headcountArray, threshold) {
        if (!headcountArray) return null;
        for (let i = 0; i < headcountArray.length; i++) {
            if (headcountArray[i] >= threshold) {
                return i + 1; // Week is 1-indexed
            }
        }
        return null;
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForecastService;
}
