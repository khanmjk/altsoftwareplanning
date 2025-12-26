import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/AIService.js', ['AIService']);
const AIService = getExport('AIService');

describe('AIService', () => {
  it('formats AI stats into a readable string', () => {
    const text = AIService.formatAiStats({
      inputChars: 1200,
      outputChars: 3400,
      outputTokens: 900,
      totalTokens: 2100,
      systemPromptSummary: 'Summary goes here.',
    });

    expect(text).toContain('Input Characters: 1,200');
    expect(text).toContain('Output Characters: 3,400');
    expect(text).toContain('Output Tokens: 900');
    expect(text).toContain('Total Tokens (est.): 2,100');
    expect(text).toContain('Summary goes here.');
  });

  it('returns a fallback message when stats are missing', () => {
    expect(AIService.formatAiStats(null)).toBe('No statistics were provided.');
  });

  it('sanitizes mermaid code with subgraph normalization', () => {
    const raw = `
\`\`\`mermaid
graph TD
subgraph "Platform Dependencies"
direction LR
A["Service A"]
end
"Platform Dependencies" --> A
\`\`\`
`;
    const sanitized = AIService.sanitizeMermaidCode(raw);

    expect(sanitized).toMatch(/graph\s+TD/i);
    expect(sanitized).toMatch(/subgraph\s+sg_platform_dependencies\["Platform Dependencies"\]/i);
    expect(sanitized).not.toMatch(/direction\s+LR/i);
    expect(sanitized).toMatch(/sg_platform_dependencies\s+-->\s+A/i);
  });

  it('validates a minimal well-formed system successfully', () => {
    const validSystem = {
      systemName: 'Valid System',
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Team One',
          engineers: ['Alice'],
          fundedHeadcount: 3,
          sdmId: 'sdm-1',
          pmtId: 'pmt-1',
          teamCapacityAdjustments: {
            avgOverheadHoursPerWeekPerSDE: 0,
            aiProductivityGainPercent: 0,
          },
          attributes: {},
        },
      ],
      allKnownEngineers: [{ name: 'Alice', currentTeamId: 'team-1', attributes: {} }],
      services: [
        {
          serviceName: 'ServiceA',
          owningTeamId: 'team-1',
          serviceDependencies: ['ServiceA'],
          platformDependencies: ['PlatformX'],
          attributes: {},
        },
      ],
      yearlyInitiatives: [
        {
          initiativeId: 'init-1',
          title: 'Init One',
          primaryGoalId: 'goal-1',
          themes: ['theme-1'],
          assignments: [{ teamId: 'team-1', sdeYears: 1 }],
          owner: { type: 'sdm', id: 'sdm-1', name: 'Sdm One' },
          projectManager: { type: 'pm', id: 'pm-1', name: 'Pm One' },
          technicalPOC: { type: 'engineer', id: 'eng-1', name: 'Alice' },
          impactedServiceIds: ['ServiceA'],
          workPackageIds: ['wp-1'],
        },
      ],
      goals: [
        {
          goalId: 'goal-1',
          name: 'Goal One',
          dueDate: '2025-12-31',
          initiativeIds: ['init-1'],
        },
      ],
      definedThemes: [
        { themeId: 'theme-1', name: 'Theme One', relatedGoalIds: ['goal-1'], attributes: {} },
      ],
      sdms: [{ sdmId: 'sdm-1', sdmName: 'Sdm One' }],
      pmts: [{ pmtId: 'pmt-1', pmtName: 'Pmt One' }],
      projectManagers: [{ pmId: 'pm-1', name: 'Pm One' }],
      seniorManagers: [],
      workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
      capacityConfiguration: {
        workingDaysPerYear: 261,
        standardHoursPerDay: 8,
        globalConstraints: {},
        leaveTypes: [],
      },
    };

    const result = AIService.validateGeneratedSystem(validSystem);
    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('flags missing required fields during validation', () => {
    const result = AIService.validateGeneratedSystem({ teams: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
