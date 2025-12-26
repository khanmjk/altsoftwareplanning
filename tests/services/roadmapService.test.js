import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/RoadmapService.js', ['RoadmapService']);
const RoadmapService = getExport('RoadmapService');

describe('RoadmapService', () => {
  it('derives quarter from date strings', () => {
    expect(RoadmapService.getQuarterFromDate('2025-01-15')).toBe('Q1');
    expect(RoadmapService.getQuarterFromDate('2025-07-02')).toBe('Q3');
    expect(RoadmapService.getQuarterFromDate(null)).toBeNull();
  });

  it('returns quarter date boundaries', () => {
    expect(RoadmapService.getEndDateForQuarter('Q2', 2025)).toBe('2025-06-30');
    expect(RoadmapService.getStartDateForQuarter('Q4', 2024)).toBe('2024-10-01');
  });
});
