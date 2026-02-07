import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/CapacityService.js', ['CapacityService']);
loadScript('js/engines/CapacityEngine.js', ['CapacityEngine']);

const CapacityEngine = getExport('CapacityEngine');

describe('CapacityEngine', () => {
  it('recalculates capacity metrics and stores them on system data', () => {
    const system = getSampleSystem('StreamView');
    CapacityEngine.recalculate(system);

    expect(system.calculatedCapacityMetrics).toBeTruthy();
    expect(system.calculatedCapacityMetrics.totals).toBeTruthy();
    expect(system.calculatedCapacityMetrics.totals.FundedHC).toBeTruthy();
  });

  it('calculates metrics through instance API', () => {
    const system = getSampleSystem('StreamView');
    const engine = new CapacityEngine(system);
    const metrics = engine.calculateAllMetrics();

    expect(metrics.totals).toBeTruthy();
    expect(Object.keys(metrics).length).toBeGreaterThan(0);
  });

  it('uses staffed humans (not funded headcount) as sink base when hiring gap exists', () => {
    const system = {
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Team One',
          teamIdentity: 'TEAM1',
          engineers: ['Engineer A'],
          awayTeamMembers: [],
          fundedHeadcount: 4,
          teamCapacityAdjustments: {
            leaveUptakeEstimates: [],
            variableLeaveImpact: {
              maternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
              paternity: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
              familyResp: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
              medical: { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 },
            },
            teamActivities: [],
            avgOverheadHoursPerWeekPerSDE: 0,
            aiProductivityGainPercent: 0,
            engineerLeavePlans: {},
          },
          attributes: {},
        },
      ],
      allKnownEngineers: [{ name: 'Engineer A', attributes: { isAISWE: false } }],
      capacityConfiguration: {
        workingDaysPerYear: 260,
        leaveTypes: [],
        globalConstraints: {
          publicHolidays: 10,
          orgEvents: [],
        },
      },
    };

    const engine = new CapacityEngine(system);
    const metrics = engine.calculateAllMetrics();
    const funded = metrics['team-1'].FundedHC;

    expect(funded.hiringGap).toBe(3);
    expect(funded.sinkBaseHumanHeadcount).toBe(1);
    expect(funded.deductionsBreakdown.holidayYrs).toBeCloseTo(10 / 260, 5);
  });
});
