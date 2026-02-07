import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/CapacityService.js', ['CapacityService']);
loadScript('js/engines/CapacityEngine.js', ['CapacityEngine']);
loadScript('js/services/PlanningService.js', ['PlanningService']);

const CapacityEngine = getExport('CapacityEngine');
const PlanningService = getExport('PlanningService');

describe('PlanningService', () => {
  it('calculates team load summary and totals', () => {
    const system = getSampleSystem('StreamView');
    CapacityEngine.recalculate(system);

    const summary = PlanningService.calculateTeamLoadSummary({
      teams: system.teams,
      initiatives: system.yearlyInitiatives,
      calculatedMetrics: system.calculatedCapacityMetrics,
      scenario: 'funded',
      applyConstraints: true,
      allKnownEngineers: system.allKnownEngineers,
    });

    expect(summary.rows.length).toBeGreaterThan(0);
    expect(summary.totals).toBeTruthy();
  });

  it('calculates planning table data and ATL/BTL flags', () => {
    const system = getSampleSystem('StreamView');
    CapacityEngine.recalculate(system);

    const table = PlanningService.calculatePlanningTableData({
      initiatives: system.yearlyInitiatives,
      calculatedMetrics: system.calculatedCapacityMetrics,
      scenario: 'funded',
      applyConstraints: true,
    });

    expect(table.length).toBe(system.yearlyInitiatives.length);
    expect(table[0]).toHaveProperty('isBTL');
    expect(table[0]).toHaveProperty('calculatedAtlBtlStatus');
  });

  it('stores at most five snapshots per planning year', () => {
    const system = getSampleSystem('StreamView');
    const planningYear = system.yearlyInitiatives[0].attributes?.planningYear;

    for (let i = 0; i < 6; i += 1) {
      PlanningService.createPlanSnapshot(system, {
        planningYear,
        scenario: 'funded',
        applyConstraints: true,
        label: `Snapshot ${i + 1}`,
      });
    }

    const snapshots = PlanningService.getPlanSnapshots(system, planningYear);
    expect(snapshots.length).toBe(5);
  });

  it('restores yearly initiatives from a saved snapshot', () => {
    const system = getSampleSystem('StreamView');
    const planningYear = system.yearlyInitiatives[0].attributes?.planningYear;
    const targetInitiative = system.yearlyInitiatives.find(
      (init) => init.attributes?.planningYear == planningYear
    );

    const snapshot = PlanningService.createPlanSnapshot(system, {
      planningYear,
      scenario: 'effective',
      applyConstraints: false,
      label: 'Before mutation',
    });

    targetInitiative.title = 'Mutated Initiative Title';

    const restored = PlanningService.restorePlanSnapshotInPlace(system, snapshot.snapshotId);
    const restoredInitiative = system.yearlyInitiatives.find(
      (init) => init.initiativeId === targetInitiative.initiativeId
    );

    expect(restored.success).toBe(true);
    expect(restoredInitiative.title).not.toBe('Mutated Initiative Title');
  });
});
