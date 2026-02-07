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

  it('filters initiatives by goal and status', () => {
    const initiatives = [
      { initiativeId: 'i1', primaryGoalId: 'g1', status: 'Backlog' },
      { initiativeId: 'i2', primaryGoalId: 'g2', status: 'Committed' },
      { initiativeId: 'i3', goalIds: ['g1'], status: 'In Progress' },
    ];

    const byGoal = RoadmapService.filterByGoal(initiatives, 'g1');
    expect(byGoal.map((i) => i.initiativeId)).toEqual(['i1', 'i3']);

    const byStatus = RoadmapService.filterByStatuses(byGoal, ['in progress']);
    expect(byStatus.map((i) => i.initiativeId)).toEqual(['i3']);
  });

  it('applies goal and status filters to quarterly data extraction', () => {
    const initiatives = [
      {
        initiativeId: 'i1',
        title: 'Alpha',
        primaryGoalId: 'g1',
        status: 'Backlog',
        attributes: { planningYear: 2026 },
        targetDueDate: '2026-02-01',
        themes: ['t1'],
        assignments: [{ teamId: 'team-1', sdeYears: 1 }],
      },
      {
        initiativeId: 'i2',
        title: 'Beta',
        primaryGoalId: 'g1',
        status: 'Committed',
        attributes: { planningYear: 2026 },
        targetDueDate: '2026-04-01',
        themes: ['t1'],
        assignments: [{ teamId: 'team-1', sdeYears: 1 }],
      },
    ];

    const result = RoadmapService.getQuarterlyRoadmapData({
      initiatives,
      sdms: [],
      teams: [],
      definedThemes: [{ themeId: 't1', name: 'Theme 1' }],
      filters: {
        year: 2026,
        goalId: 'g1',
        statuses: ['Committed'],
      },
    });

    expect(result['Theme 1'].Q1.length).toBe(0);
    expect(result['Theme 1'].Q2.length).toBe(1);
    expect(result['Theme 1'].Q2[0].initiativeId).toBe('i2');
  });
});
