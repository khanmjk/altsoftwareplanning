import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/InitiativeService.js', ['InitiativeService']);
loadScript('js/services/WorkPackageService.js', ['WorkPackageService']);
const WorkPackageService = getExport('WorkPackageService');

describe('WorkPackageService', () => {
  it('creates default work packages when missing', () => {
    const system = {
      capacityConfiguration: { workingDaysPerYear: 261 },
      yearlyInitiatives: [
        {
          initiativeId: 'init-1',
          assignments: [{ teamId: 'team-1', sdeYears: 1 }],
          attributes: { planningYear: 2025 },
          targetDueDate: '2025-11-01',
          workPackageIds: [],
        },
      ],
      workPackages: [],
    };

    WorkPackageService.ensureWorkPackagesForInitiatives(system);

    expect(system.workPackages.length).toBe(1);
    expect(system.yearlyInitiatives[0].workPackageIds.length).toBe(1);
  });

  it('recalculates work package dates from assignments', () => {
    const wp = {
      impactedTeamAssignments: [
        { startDate: '2025-02-01', endDate: '2025-05-01' },
        { startDate: '2025-01-15', endDate: '2025-06-15' },
      ],
      startDate: null,
      endDate: null,
    };

    WorkPackageService.recalculateWorkPackageDates(wp);
    expect(wp.startDate).toBe('2025-01-15');
    expect(wp.endDate).toBe('2025-06-15');
  });

  it('deletes a work package and removes initiative references', () => {
    const system = {
      yearlyInitiatives: [{ initiativeId: 'init-1', workPackageIds: ['wp-1'] }],
      workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
    };

    const deleted = WorkPackageService.deleteWorkPackage(system, 'wp-1');
    expect(deleted).toBe(true);
    expect(system.workPackages.length).toBe(0);
    expect(system.yearlyInitiatives[0].workPackageIds).toHaveLength(0);
  });
});
