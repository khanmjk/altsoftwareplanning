import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/OrgService.js', ['OrgService']);
const OrgService = getExport('OrgService');

describe('OrgService', () => {
  it('adds an engineer to the roster and assigns to a team', () => {
    const system = getSampleSystem('StreamView');
    const teamId = system.teams[0].teamId;

    const engineer = OrgService.addEngineerToRoster(system, {
      name: 'New Engineer',
      level: 2,
      currentTeamId: teamId,
    });

    expect(engineer.name).toBe('New Engineer');
    const team = system.teams.find((t) => t.teamId === teamId);
    expect(team.engineers).toContain('New Engineer');
  });

  it('moves and deletes engineers correctly', () => {
    const system = getSampleSystem('StreamView');
    const engineerName = system.allKnownEngineers[0].name;
    const targetTeamId = system.teams[1].teamId;

    OrgService.moveEngineerToTeam(system, engineerName, targetTeamId);
    const updated = system.allKnownEngineers.find((e) => e.name === engineerName);
    expect(updated.currentTeamId).toBe(targetTeamId);

    const deleted = OrgService.deleteEngineer(system, engineerName);
    expect(deleted.name).toBe(engineerName);
    expect(system.allKnownEngineers.find((e) => e.name === engineerName)).toBeFalsy();
  });

  it('adds a new team with generated IDs', () => {
    const system = getSampleSystem('StreamView');
    const team = OrgService.addTeam(system, { teamName: 'New Team' });

    expect(team.teamId).toMatch(/^team/);
    expect(system.teams.some((t) => t.teamId === team.teamId)).toBe(true);
  });
});
