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
});
