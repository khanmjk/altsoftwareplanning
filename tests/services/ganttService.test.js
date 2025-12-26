import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/GanttService.js', ['GanttService']);
const GanttService = getExport('GanttService');

describe('GanttService', () => {
  it('normalizes gantt IDs consistently', () => {
    expect(GanttService.normalizeGanttId(' WP 001 ')).toBe('wp-001');
    expect(GanttService.normalizeGanttId('Team@A')).toBe('team-a');
  });

  it('builds assignment task IDs', () => {
    expect(GanttService.buildAssignmentTaskId('wp-1', 'team-2')).toBe('wp-1-team-2');
    expect(GanttService.buildAssignmentTaskId(null, 'team')).toBeNull();
  });

  it('computes SDE estimates', () => {
    const init = {
      assignments: [
        { teamId: 'team-a', sdeYears: 1 },
        { teamId: 'team-b', sdeYears: 2 },
      ],
    };
    expect(GanttService.computeSdeEstimate(init)).toBe(3);
    expect(GanttService.computeSdeEstimate(init, 'team-a')).toBe(1);
  });

  it('computes initiative dates from work packages', () => {
    const initiative = { attributes: { planningYear: 2025 }, targetDueDate: '2025-12-31' };
    const workPackages = [
      { impactedTeamAssignments: [{ startDate: '2025-02-01', endDate: '2025-04-01' }] },
      { impactedTeamAssignments: [{ startDate: '2025-05-01', endDate: '2025-06-15' }] },
    ];
    const dates = GanttService.getComputedInitiativeDates(initiative, workPackages);
    expect(dates.startDate).toBe('2025-02-01');
    expect(dates.endDate).toBe('2025-06-15');
  });

  it('detects dependency cycles', () => {
    const workPackages = [
      { workPackageId: 'wp-1', dependencies: ['wp-2'] },
      { workPackageId: 'wp-2', dependencies: [] },
    ];
    expect(GanttService.wouldCreateDependencyCycle('wp-2', 'wp-1', workPackages)).toBe(true);
    expect(GanttService.wouldCreateDependencyCycle('wp-1', 'wp-2', workPackages)).toBe(false);
  });
});
