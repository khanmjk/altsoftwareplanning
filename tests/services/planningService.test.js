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

  it('builds year plan export data with metadata, summary, and initiative sections', () => {
    const exportData = PlanningService.buildYearPlanExportData({
      planningYear: 2026,
      scenario: 'effective',
      applyConstraints: true,
      teamFilter: 'all',
      teams: [
        { teamId: 'teamA', teamIdentity: 'Alpha', teamName: 'Alpha Team' },
        { teamId: 'teamB', teamIdentity: 'Beta', teamName: 'Beta Team' },
      ],
      summaryData: {
        rows: [
          {
            teamId: 'teamA',
            teamName: 'Alpha Team',
            fundedHC: 5,
            teamBISHumans: 4,
            awayBISHumans: 1,
            aiEngineers: 0,
            sinks: 0.5,
            hiringRampUpSink: 0.25,
            newHireGain: 0.75,
            productivityGain: 0.5,
            productivityPercent: 12,
            scenarioCapacity: 4.5,
            assignedAtlSde: 2,
            remainingCapacity: 2.5,
            status: '✅ OK',
          },
        ],
      },
      tableData: [
        {
          initiativeId: 'init-1',
          title: 'Platform Stabilization',
          description: 'Reduce operational toil',
          status: 'Committed',
          isProtected: true,
          calculatedInitiativeTotalSde: 2.5,
          calculatedCumulativeSde: 2.5,
          calculatedAtlBtlStatus: 'ATL',
          isBTL: false,
          primaryGoalId: 'goal-1',
          targetDueDate: '2026-09-30',
          assignments: [
            { teamId: 'teamA', sdeYears: 2 },
            { teamId: 'teamB', sdeYears: 0.5 },
          ],
        },
      ],
    });

    const scenarioRow = exportData.metadata.find((row) => row[0] === 'Scenario');
    const constraintsRow = exportData.metadata.find((row) => row[0] === 'Constraints Mode');
    const teamFocusRow = exportData.metadata.find((row) => row[0] === 'Team Focus');

    expect(scenarioRow?.[1]).toBe('Effective BIS');
    expect(constraintsRow?.[1]).toBe('Net (constraints applied)');
    expect(teamFocusRow?.[1]).toBe('All Teams');

    expect(exportData.summary.headers).toContain('Scenario Capacity');
    expect(exportData.summary.rows[0][0]).toBe('teamA');
    expect(exportData.summary.rows[0][2]).toBe('5.00');

    expect(exportData.initiatives.headers).toContain('Alpha (SDE Years)');
    expect(exportData.initiatives.headers).toContain('Beta (SDE Years)');
    expect(exportData.initiatives.rows).toHaveLength(1);
    expect(exportData.initiatives.rows[0][4]).toBe('Yes');
    expect(exportData.initiatives.rows[0][5]).toBe('2.50');
  });

  it('filters export summary and initiatives by selected team', () => {
    const exportData = PlanningService.buildYearPlanExportData({
      planningYear: 2026,
      scenario: 'funded',
      applyConstraints: false,
      teamFilter: 'teamB',
      teams: [
        { teamId: 'teamA', teamIdentity: 'Alpha', teamName: 'Alpha Team' },
        { teamId: 'teamB', teamIdentity: 'Beta', teamName: 'Beta Team' },
      ],
      summaryData: {
        rows: [
          {
            teamId: 'teamA',
            teamName: 'Alpha Team',
            fundedHC: 5,
            teamBISHumans: 4,
            awayBISHumans: 0,
            aiEngineers: 0,
            sinks: 0,
            hiringRampUpSink: 0,
            newHireGain: 0,
            productivityGain: 0,
            productivityPercent: 0,
            scenarioCapacity: 4,
            assignedAtlSde: 1,
            remainingCapacity: 3,
            status: 'OK',
          },
          {
            teamId: 'teamB',
            teamName: 'Beta Team',
            fundedHC: 4,
            teamBISHumans: 4,
            awayBISHumans: 0,
            aiEngineers: 0,
            sinks: 0,
            hiringRampUpSink: 0,
            newHireGain: 0,
            productivityGain: 0,
            productivityPercent: 0,
            scenarioCapacity: 4,
            assignedAtlSde: 2,
            remainingCapacity: 2,
            status: 'OK',
          },
        ],
      },
      tableData: [
        {
          initiativeId: 'init-a',
          title: 'Alpha-only',
          description: '',
          status: 'Backlog',
          isProtected: false,
          calculatedInitiativeTotalSde: 1,
          calculatedCumulativeSde: 1,
          calculatedAtlBtlStatus: 'ATL',
          isBTL: false,
          assignments: [{ teamId: 'teamA', sdeYears: 1 }],
        },
        {
          initiativeId: 'init-b',
          title: 'Beta-only',
          description: '',
          status: 'Committed',
          isProtected: false,
          calculatedInitiativeTotalSde: 2,
          calculatedCumulativeSde: 3,
          calculatedAtlBtlStatus: 'ATL',
          isBTL: false,
          assignments: [{ teamId: 'teamB', sdeYears: 2 }],
        },
      ],
    });

    const teamFocusRow = exportData.metadata.find((row) => row[0] === 'Team Focus');
    expect(teamFocusRow?.[1]).toBe('Beta');

    expect(exportData.summary.rows).toHaveLength(1);
    expect(exportData.summary.rows[0][0]).toBe('teamB');

    expect(exportData.initiatives.headers).toContain('Beta (SDE Years)');
    expect(exportData.initiatives.headers).not.toContain('Alpha (SDE Years)');
    expect(exportData.initiatives.rows).toHaveLength(1);
    expect(exportData.initiatives.rows[0][0]).toBe('init-b');
    expect(exportData.initiatives.rows[0].at(-1)).toBe('2.00');
  });

  it('serializes year plan export CSV with proper escaping', () => {
    const csv = PlanningService.serializeYearPlanExportToCsv({
      metadata: [
        ['Planning Year', 2026],
        ['Notes', 'Value, with comma'],
        ['Quote', 'He said "Ship it"'],
      ],
      summary: {
        headers: ['Team', 'Comment'],
        rows: [['Alpha', 'Line 1\nLine 2']],
      },
      initiatives: {
        headers: ['ID', 'Title'],
        rows: [['init-1', 'Grow "Search"']],
      },
    });

    expect(csv).toContain('Year Plan Export');
    expect(csv).toContain('"Value, with comma"');
    expect(csv).toContain('"He said ""Ship it"""');
    expect(csv).toContain('"Line 1\nLine 2"');
    expect(csv).toContain('"Grow ""Search"""');
  });
});
