import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/GoalService.js', ['GoalService']);
const GoalService = getExport('GoalService');

describe('GoalService', () => {
  it('adds a goal with defaults', () => {
    const system = getSampleSystem('StreamView');
    const countBefore = system.goals.length;
    const goal = GoalService.addGoal(system, { title: 'New Goal' });

    expect(system.goals.length).toBe(countBefore + 1);
    expect(goal.goalId).toBeTruthy();
    expect(goal.status).toBe(GoalService.STATUS.NOT_STARTED);
  });

  it('updates a goal and recalculates status when dates change', () => {
    const system = getSampleSystem('StreamView');
    const goal = system.goals[0];
    const updated = GoalService.updateGoal(system, goal.goalId, {
      targetEndDate: '2025-12-31',
    });

    expect(updated).not.toBeNull();
    expect(updated.targetEndDate).toBe('2025-12-31');
  });

  it('refreshes planned end date based on linked initiatives', () => {
    const system = {
      goals: [
        {
          goalId: 'goal-1',
          name: 'Goal One',
          initiativeIds: ['init-1'],
        },
      ],
      yearlyInitiatives: [
        { initiativeId: 'init-1', goalId: 'goal-1', targetDueDate: '2025-11-30' },
      ],
    };

    const refreshed = GoalService.refreshGoalDates(system, 'goal-1');
    expect(refreshed.plannedEndDate).toBe('2025-11-30');
  });

  it('flags goals with no linked initiatives as red health', () => {
    const status = GoalService.getGoalStatus({ goalId: 'goal-1', dueDate: '2026-12-31' }, [], {
      now: '2026-01-01',
    });

    expect(status.healthCode).toBe(GoalService.HEALTH.NO_INITIATIVES);
    expect(status.visualStatus).toBe(GoalService.STATUS.AT_RISK);
    expect(status.status).toBe(GoalService.STATUS.NOT_STARTED);
  });

  it('marks not-started goals near due date as at risk', () => {
    const goal = { goalId: 'goal-1', dueDate: '2026-02-01' };
    const initiatives = [
      { initiativeId: 'init-1', status: 'Backlog', targetDueDate: '2026-02-01' },
    ];

    const status = GoalService.getGoalStatus(goal, initiatives, { now: '2026-01-20' });
    expect(status.healthCode).toBe(GoalService.HEALTH.NOT_STARTED_AT_RISK);
    expect(status.visualStatus).toBe(GoalService.STATUS.AT_RISK);
  });

  it('marks completed goals as late when completion exceeds due date', () => {
    const goal = { goalId: 'goal-1', dueDate: '2026-02-01' };
    const initiatives = [
      {
        initiativeId: 'init-1',
        status: 'Completed',
        targetDueDate: '2026-01-30',
        actualCompletionDate: '2026-02-05',
      },
    ];

    const status = GoalService.getGoalStatus(goal, initiatives, { now: '2026-02-06' });
    expect(status.healthCode).toBe(GoalService.HEALTH.COMPLETED_LATE);
    expect(status.status).toBe(GoalService.STATUS.COMPLETED);
  });

  it('detects in-progress slipping goals when planned end exceeds due date', () => {
    const goal = { goalId: 'goal-1', dueDate: '2026-06-30' };
    const initiatives = [
      {
        initiativeId: 'init-1',
        status: 'In Progress',
        targetDueDate: '2026-07-15',
      },
    ];

    const status = GoalService.getGoalStatus(goal, initiatives, { now: '2026-05-01' });
    expect(status.healthCode).toBe(GoalService.HEALTH.IN_PROGRESS_SLIPPING);
    expect(status.visualStatus).toBe(GoalService.STATUS.AT_RISK);
  });

  it('records weekly owner check-ins and computes stale/mismatch flags', () => {
    const system = {
      goals: [
        {
          goalId: 'goal-1',
          name: 'Reliability',
          dueDate: '2026-12-31',
          statusVisual: GoalService.STATUS.ON_TRACK,
          owner: { id: 'sdm-1', name: 'Sam Owner', type: 'sdm' },
          attributes: {},
        },
      ],
      yearlyInitiatives: [],
      attributes: {},
    };

    const saveResult = GoalService.addGoalCheckIn(
      system,
      'goal-1',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.AT_RISK,
        weekEnding: '2026-02-06',
        confidence: 40,
        comment: 'Scope pressure on API migration',
        ptg: 'Reduce scope to MVP and add temporary staffing',
      },
      { now: '2026-02-07T08:00:00Z', updatedBy: 'Sam Owner' }
    );

    expect(saveResult.success).toBe(true);
    expect(saveResult.checkIn.ownerStatus).toBe(GoalService.INSPECTION_STATUS.AT_RISK);

    const inspection = GoalService.getGoalInspectionStatus(system.goals[0], {
      now: '2026-02-08T08:00:00Z',
      computedStatus: GoalService.STATUS.ON_TRACK,
    });

    expect(inspection.ownerStatusLabel).toBe('At Risk');
    expect(inspection.isStale).toBe(false);
    expect(inspection.hasMismatch).toBe(true);
    expect(inspection.daysSinceCheckIn).toBe(1);
  });

  it('requires PTG for slipping/risk/late/blocked owner statuses', () => {
    const system = {
      goals: [
        {
          goalId: 'goal-2',
          name: 'Security posture',
          dueDate: '2026-09-30',
          owner: { id: 'sdm-2', name: 'Lee Owner', type: 'sdm' },
          attributes: {},
        },
      ],
      yearlyInitiatives: [],
      attributes: {},
    };

    const saveResult = GoalService.addGoalCheckIn(
      system,
      'goal-2',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.SLIPPING,
        comment: 'Dependencies lagging',
      },
      { now: '2026-02-07T08:00:00Z' }
    );

    expect(saveResult.success).toBe(false);
    expect(saveResult.error).toContain('Path to Green');
  });

  it('builds filtered inspection report rows and leadership summary', () => {
    const system = {
      goals: [
        {
          goalId: 'goal-a',
          name: 'Availability',
          dueDate: '2026-10-01',
          owner: { id: 'owner-1', name: 'Owner One', type: 'sdm' },
          statusVisual: GoalService.STATUS.ON_TRACK,
          attributes: {},
        },
        {
          goalId: 'goal-b',
          name: 'Latency',
          dueDate: '2026-07-01',
          owner: { id: 'owner-2', name: 'Owner Two', type: 'sdm' },
          statusVisual: GoalService.STATUS.AT_RISK,
          attributes: {},
        },
      ],
      yearlyInitiatives: [],
      attributes: {},
    };

    GoalService.addGoalCheckIn(
      system,
      'goal-a',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.ON_TRACK,
        weekEnding: '2026-02-06',
        comment: 'On plan',
      },
      { now: '2026-02-07T08:00:00Z' }
    );
    GoalService.addGoalCheckIn(
      system,
      'goal-b',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.LATE,
        weekEnding: '2026-01-20',
        comment: 'Vendor delay',
        ptg: 'Escalate vendor and parallelize testing',
        blockers: 'Vendor dependency; Integration test env',
      },
      { now: '2026-01-20T08:00:00Z' }
    );

    const filteredRows = GoalService.getGoalInspectionReportRows(system, {
      now: '2026-02-07T08:00:00Z',
      staleOnly: true,
    });
    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0].goalId).toBe('goal-b');
    expect(filteredRows[0].stale).toBe('Yes');

    const summary = GoalService.getGoalInspectionSummary(system, {
      now: '2026-02-07T08:00:00Z',
    });
    expect(summary.totalGoals).toBe(2);
    expect(summary.staleCount).toBe(1);
    expect(summary.updatedThisWeek).toBe(1);
    expect(summary.atRiskOrLateCount).toBe(1);
    expect(summary.topBlockers.length).toBeGreaterThan(0);
  });

  it('returns the latest edited owner comment in inspection reports', () => {
    const system = {
      goals: [
        {
          goalId: 'goal-c',
          name: 'Goal C',
          dueDate: '2026-12-31',
          owner: { id: 'owner-c', name: 'Owner C', type: 'sdm' },
          statusVisual: GoalService.STATUS.ON_TRACK,
          attributes: {},
        },
      ],
      yearlyInitiatives: [],
      attributes: {},
    };

    GoalService.addGoalCheckIn(
      system,
      'goal-c',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.SLIPPING,
        weekEnding: '2026-02-07',
        comment: 'Initial owner update',
        ptg: 'Initial PTG',
      },
      { now: '2026-02-07T09:00:00Z' }
    );

    GoalService.addGoalCheckIn(
      system,
      'goal-c',
      {
        ownerStatus: GoalService.INSPECTION_STATUS.ON_TRACK,
        weekEnding: '2026-02-14',
        comment: 'Edited update after mitigation actions',
      },
      { now: '2026-02-14T09:00:00Z' }
    );

    const rows = GoalService.getGoalInspectionReportRows(system, { now: '2026-02-15T09:00:00Z' });
    expect(rows).toHaveLength(1);
    expect(rows[0].comment).toBe('Edited update after mitigation actions');
    expect(rows[0].weekEnding).toBe('2026-02-14');
    expect(rows[0].ownerStatus).toBe(GoalService.INSPECTION_STATUS.ON_TRACK);
  });
});
