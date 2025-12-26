import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/ForecastService.js', ['ForecastService']);
const ForecastService = getExport('ForecastService');

describe('ForecastService', () => {
  it('simulates team size across 52 weeks', () => {
    const result = ForecastService.simulateTeamSize({
      hiringRate: 1,
      fundedSize: 10,
      currentEngineers: 5,
      hiringTime: 2,
      rampUpTime: 4,
      attritionRate: 0.1,
      netAvailableDaysPerWeek: 5,
      capAtFundedSize: true,
    });

    expect(result.totalHeadcountArray).toHaveLength(52);
    expect(result.productiveEngineers).toHaveLength(52);
    expect(result.monthlyData.headcount.length).toBeGreaterThan(0);
  });

  it('computes a hiring rate to reach funded size', () => {
    const rate = ForecastService.computeHiringRate({
      fundedSize: 12,
      currentEngineers: 4,
      hiringTime: 2,
      rampUpTime: 4,
      attritionRate: 0.1,
      closeGapWeek: 20,
    });
    expect(rate).toBeGreaterThan(0);
  });
});
