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
});
