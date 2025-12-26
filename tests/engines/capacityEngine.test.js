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
});
