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
    calculateTeamLoadSummary({ teams, initiatives, calculatedMetrics, scenario, applyConstraints, allKnownEngineers }) {
        if (!calculatedMetrics || !teams || !initiatives) {
            console.error("PlanningService.calculateTeamLoadSummary: Missing required data.");
            return { rows: [], totals: {} };
        }

        const scenarioKey = scenario === 'funded' ? 'FundedHC' : (scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
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
        const teamAtlSdeAssigned = teams.reduce((acc, team) => { acc[team.teamId] = 0; return acc; }, {});

        for (const initiative of sortedInitiatives) {
            const initiativeTotalSde = (initiative.assignments || []).reduce((sum, a) => sum + a.sdeYears, 0);
            if (overallCumulativeSde + initiativeTotalSde <= atlBtlLimit) {
                overallCumulativeSde += initiativeTotalSde;
                (initiative.assignments || []).forEach(assignment => {
                    if (teamAtlSdeAssigned.hasOwnProperty(assignment.teamId)) {
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
            fundedHCGross: 0, teamBISHumans: 0, awayBISHumans: 0, aiEngineers: 0,
            sinks: 0, productivityGain: 0, scenarioCapacity: 0, assignedAtlSde: 0
        };

        const sortedTeams = [...teams].sort((a, b) => (a?.teamName || '').localeCompare(b?.teamName || ''));

        sortedTeams.forEach(team => {
            if (!team || !team.teamId) return;

            const teamId = team.teamId;
            const teamMetrics = calculatedMetrics[teamId];
            if (!teamMetrics) return;

            // Count AI engineers
            const teamAIBIS = (team.engineers || []).filter(name =>
                allKnownEngineers.find(e => e.name === name)?.attributes?.isAISWE
            ).length;
            const awayAIBIS = (team.awayTeamMembers || []).filter(m => m.attributes?.isAISWE).length;
            const aiEngineers = teamAIBIS + awayAIBIS;

            const teamBISHumans = teamMetrics.TeamBIS.humanHeadcount;
            const effectiveBISHumans = teamMetrics.EffectiveBIS.humanHeadcount;
            const awayBISHumans = effectiveBISHumans - teamBISHumans;
            const sinks = isNetCapacityUsed ? (teamMetrics[scenarioKey].deductYrs || 0) : 0;
            const productivityGain = teamMetrics[scenarioKey].deductionsBreakdown.aiProductivityGainYrs || 0;
            const productivityPercent = team.teamCapacityAdjustments?.aiProductivityGainPercent || 0;
            const scenarioCapacity = isNetCapacityUsed ? teamMetrics[scenarioKey].netYrs : teamMetrics[scenarioKey].grossYrs;
            const assignedAtlSde = teamAtlSdeAssigned[teamId] || 0;
            const remainingCapacity = scenarioCapacity - assignedAtlSde;

            let status = '✅ OK';
            if (remainingCapacity < 0) { status = '🛑 Overloaded'; }
            else if (remainingCapacity < 0.5 && scenarioCapacity > 0) { status = '⚠️ Near Limit'; }

            summaryRows.push({
                teamId,
                teamName: team.teamIdentity || team.teamName || teamId,
                fundedHC: teamMetrics.FundedHC.humanHeadcount,
                teamBISHumans,
                awayBISHumans,
                aiEngineers,
                sinks,
                productivityGain,
                productivityPercent,
                scenarioCapacity,
                assignedAtlSde,
                remainingCapacity,
                status
            });

            // Accumulate totals
            totals.fundedHCGross += teamMetrics.FundedHC.humanHeadcount;
            totals.teamBISHumans += teamBISHumans;
            totals.awayBISHumans += awayBISHumans;
            totals.aiEngineers += aiEngineers;
            totals.sinks += sinks;
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
            console.error("PlanningService.calculatePlanningTableData: Missing required data.");
            return [];
        }

        const scenarioKey = scenario === 'funded' ? 'FundedHC' : (scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
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
            (initiative.assignments || []).forEach(assignment => {
                initiativeTotalSde += (assignment.sdeYears || 0);
            });

            cumulativeSdeTotal += initiativeTotalSde;
            const isBTL = cumulativeSdeTotal > atlBtlCapacityLimit;
            const atlBtlStatus = isBTL ? 'BTL' : 'ATL';

            calculatedData.push({
                ...initiative,
                calculatedInitiativeTotalSde: initiativeTotalSde,
                calculatedCumulativeSde: cumulativeSdeTotal,
                calculatedAtlBtlStatus: atlBtlStatus,
                isBTL
            });
        }

        return calculatedData;
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
        const draggedIndex = result.findIndex(init => init.initiativeId === draggedId);
        const targetIndex = result.findIndex(init => init.initiativeId === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            console.error("PlanningService.reorderInitiatives: Invalid initiative IDs");
            return initiatives; // Return unchanged
        }

        // Remove dragged item
        const [draggedItem] = result.splice(draggedIndex, 1);

        // Find new target index (may have shifted)
        const newTargetIndex = result.findIndex(init => init.initiativeId === targetId);

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
        return calculatedData.filter(init => !init.isBTL);
    },

    /**
     * Gets initiatives that are Below The Line (BTL).
     * 
     * @param {Array} calculatedData - Output from calculatePlanningTableData
     * @returns {Array} BTL initiatives only
     */
    getBTLInitiatives(calculatedData) {
        return calculatedData.filter(init => init.isBTL);
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
        const scenarioKey = scenario === 'funded' ? 'FundedHC' : (scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
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
        return scenario === 'funded' ? 'FundedHC' : (scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
    }
};

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.PlanningService = PlanningService;
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningService;
}
