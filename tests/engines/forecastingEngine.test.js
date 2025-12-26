import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/CapacityService.js', ['CapacityService']);
loadScript('js/engines/ForecastingEngine.js', ['ForecastingEngine']);
const ForecastingEngine = getExport('ForecastingEngine');

describe('ForecastingEngine', () => {
  it('computes hiring rates and estimated hires', () => {
    const engine = new ForecastingEngine({});
    const rate = engine.computeHiringRate(12, 4, 2, 4, 0.1, 20);
    const hires = engine.calculateEstimatedHiresNeeded(12, 4, rate, 0.1, 20);

    expect(rate).toBeGreaterThan(0);
    expect(hires.totalHiresNeeded).toBeGreaterThan(0);
  });

  it('simulates team size with selected team capacity', () => {
    const system = getSampleSystem('StreamView');
    const engine = new ForecastingEngine(system);
    const teamId = system.teams[0].teamId;
    const result = engine.simulateTeamSize(1, 10, 5, 2, 4, 0.1, teamId, true);

    expect(result.totalHeadcountArray).toHaveLength(52);
    expect(result.calculatedNetAvailableDaysPerWeek).toBeGreaterThan(0);
  });
});
