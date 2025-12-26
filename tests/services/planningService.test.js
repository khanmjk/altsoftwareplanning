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
});
