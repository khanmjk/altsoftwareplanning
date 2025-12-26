import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/CapacityService.js', ['CapacityService']);
const CapacityService = getExport('CapacityService');

describe('CapacityService', () => {
  it('calculates standard leave days per SDE from global defaults', () => {
    const system = getSampleSystem('StreamView');
    const team = system.teams[0];
    const config = system.capacityConfiguration;
    const globalLeaveTypes = config.leaveTypes;

    const expected = globalLeaveTypes.reduce(
      (sum, leave) => sum + (leave.defaultEstimatedDays || 0),
      0
    );

    const actual = CapacityService.calculateTotalStandardLeaveDaysPerSDE(
      team,
      globalLeaveTypes,
      config
    );

    expect(actual).toBeCloseTo(expected, 5);
  });

  it('calculates net capacity breakdown', () => {
    const system = getSampleSystem('StreamView');
    const team = system.teams[0];
    const config = system.capacityConfiguration;
    const globalLeaveTypes = config.leaveTypes;
    const workingDaysPerYear = config.workingDaysPerYear;

    const result = CapacityService.calculateNetCapacity({
      team,
      globalLeaveTypes,
      capacityConfig: config,
      workingDaysPerYear,
    });

    expect(result.workingDaysPerYear).toBe(workingDaysPerYear);
    expect(result.deductions.standardLeaveDays).toBeGreaterThan(0);
    expect(result.netDaysPerSDE).toBeLessThanOrEqual(workingDaysPerYear);
  });

  it('bulk updates capacity adjustments with team filters', () => {
    const system = getSampleSystem('StreamView');
    const teamIds = system.teams.slice(0, 2).map((team) => team.teamId);

    const summary = CapacityService.bulkUpdateTeamCapacity(system, {
      updates: { avgOverheadHoursPerWeekPerSDE: 12 },
      filter: { teamIds },
    });

    expect(summary.updatedCount).toBe(teamIds.length);
    system.teams.forEach((team) => {
      if (teamIds.includes(team.teamId)) {
        expect(team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE).toBe(12);
      }
    });
  });
});
