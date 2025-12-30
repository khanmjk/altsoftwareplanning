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
    expect(engineer.engineerId).toBeDefined();
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

  // --- NEW ROSTER MANAGEMENT TESTS ---

  describe('PMT Management', () => {
    it('adds and deletes PMTs correctly', () => {
      const system = getSampleSystem('StreamView');
      const initialPmtCount = system.pmts.length;

      // Add PMT
      const newPmt = OrgService.addPmt(system, 'Test PMT', { skills: ['product'] });
      expect(newPmt.pmtId).toBeDefined();
      expect(newPmt.pmtName).toBe('Test PMT');
      expect(system.pmts.length).toBe(initialPmtCount + 1);

      // Delete PMT
      const deleted = OrgService.deletePmt(system, newPmt.pmtId);
      expect(deleted.pmtId).toBe(newPmt.pmtId);
      expect(system.pmts.length).toBe(initialPmtCount);
    });
  });

  describe('Away-Team Member Management', () => {
    it('adds away-team members with generated awayMemberId', () => {
      const system = getSampleSystem('StreamView');
      const teamId = system.teams[0].teamId;
      const initialAwayCount = system.teams[0].awayTeamMembers?.length || 0;

      const member = OrgService.addAwayTeamMember(system, teamId, {
        name: 'New Contractor',
        level: 3,
        sourceTeam: 'External Firm',
      });

      expect(member.awayMemberId).toBeDefined();
      expect(member.name).toBe('New Contractor');
      expect(member.level).toBe(3);
      expect(system.teams[0].awayTeamMembers.length).toBe(initialAwayCount + 1);
    });

    it('removes away-team members by awayMemberId or name', () => {
      const system = getSampleSystem('StreamView');
      const teamId = system.teams[0].teamId;

      // Add a member first
      const member = OrgService.addAwayTeamMember(system, teamId, {
        name: 'Temp Worker',
        level: 2,
        sourceTeam: 'Agency',
      });

      const countBefore = system.teams[0].awayTeamMembers.length;

      // Remove by awayMemberId
      const removed = OrgService.removeAwayTeamMember(system, teamId, member.awayMemberId);
      expect(removed.name).toBe('Temp Worker');
      expect(system.teams[0].awayTeamMembers.length).toBe(countBefore - 1);
    });
  });

  describe('Engineer Update', () => {
    it('updates an engineer by engineerId', () => {
      const system = getSampleSystem('StreamView');
      const engineer = system.allKnownEngineers[0];
      const originalLevel = engineer.level;

      const updated = OrgService.updateEngineer(system, engineer.engineerId, {
        level: originalLevel + 1,
      });

      expect(updated.level).toBe(originalLevel + 1);
    });

    it('updates an engineer by name', () => {
      const system = getSampleSystem('StreamView');
      const engineer = system.allKnownEngineers[0];

      const updated = OrgService.updateEngineer(system, engineer.name, {
        attributes: { ...engineer.attributes, promoted: true },
      });

      expect(updated.attributes.promoted).toBe(true);
    });
  });

  describe('Flexible Team Hierarchy', () => {
    it('reassigns team to SDM', () => {
      const system = getSampleSystem('StreamView');
      const team = system.teams[0];
      const newSdm = system.sdms[1];

      OrgService.reassignTeamToManager(system, team.teamId, newSdm.sdmId, 'sdm');

      expect(team.sdmId).toBe(newSdm.sdmId);
      expect(team.seniorManagerId).toBeNull();
    });

    it('reassigns team directly to Senior Manager', () => {
      const system = getSampleSystem('StreamView');
      const team = system.teams[0];
      const seniorMgr = system.seniorManagers[0];

      OrgService.reassignTeamToManager(
        system,
        team.teamId,
        seniorMgr.seniorManagerId,
        'seniorManager'
      );

      expect(team.seniorManagerId).toBe(seniorMgr.seniorManagerId);
      expect(team.sdmId).toBeNull();
    });
  });

  describe('Roster Summary', () => {
    it('returns correct counts for all role types', () => {
      const system = getSampleSystem('StreamView');
      const summary = OrgService.getRosterSummary(system);

      expect(summary.engineers).toBe(system.allKnownEngineers.length);
      expect(summary.sdms).toBe(system.sdms.length);
      expect(summary.seniorManagers).toBe(system.seniorManagers.length);
      expect(summary.pmts).toBe(system.pmts.length);
      expect(summary.projectManagers).toBe(system.projectManagers?.length || 0);
      expect(typeof summary.awayTeam).toBe('number');
    });
  });

  describe('Project Manager Management', () => {
    it('deletes a project manager', () => {
      const system = getSampleSystem('StreamView');

      // Add a PM first if none exist
      if (!system.projectManagers || system.projectManagers.length === 0) {
        system.projectManagers = [{ pmId: 'pm1', pmName: 'Test PM' }];
      }

      const pmId = system.projectManagers[0].pmId;
      const initialCount = system.projectManagers.length;

      const deleted = OrgService.deleteProjectManager(system, pmId);
      expect(deleted.pmId).toBe(pmId);
      expect(system.projectManagers.length).toBe(initialCount - 1);
    });
  });
});
