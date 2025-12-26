import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/InitiativeService.js', ['InitiativeService']);
const InitiativeService = getExport('InitiativeService');

describe('InitiativeService', () => {
  it('adds an initiative with defaults', () => {
    const system = getSampleSystem('StreamView');
    const countBefore = system.yearlyInitiatives.length;
    const initiative = InitiativeService.addInitiative(system, { title: 'New Initiative' });

    expect(system.yearlyInitiatives.length).toBe(countBefore + 1);
    expect(initiative.initiativeId).toMatch(/^init-/);
    expect(initiative.status).toBe('Backlog');
  });

  it('updates and deletes initiatives', () => {
    const system = getSampleSystem('StreamView');
    const target = system.yearlyInitiatives[0];

    const updated = InitiativeService.updateInitiative(system, target.initiativeId, {
      title: 'Updated Title',
    });
    expect(updated.title).toBe('Updated Title');

    const deleted = InitiativeService.deleteInitiative(system, target.initiativeId);
    expect(deleted).toBe(true);
    expect(
      system.yearlyInitiatives.find((i) => i.initiativeId === target.initiativeId)
    ).toBeFalsy();
  });

  it('ensures planning years for initiatives', () => {
    const initiatives = [
      { initiativeId: 'init-1', targetDueDate: '2026-05-15', attributes: {} },
      { initiativeId: 'init-2', targetDueDate: null, attributes: {} },
    ];

    InitiativeService.ensureInitiativePlanningYears(initiatives);

    expect(initiatives[0].attributes.planningYear).toBe(2026);
    expect(initiatives[1].attributes.planningYear).toBe(new Date().getFullYear());
    expect(initiatives[1].targetDueDate).toMatch(/-12-31$/);
  });
});
