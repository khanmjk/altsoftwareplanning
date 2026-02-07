import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

function readLaunchPayload() {
  const filePath = path.resolve(process.cwd(), 'data/blueprints/launch25-packages.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('launch25 curated blueprint packages', () => {
  it('contains 25 curated installable packages', () => {
    const payload = readLaunchPayload();
    const packageIds = Object.keys(payload.packages || {});

    expect(packageIds).toHaveLength(25);

    packageIds.forEach((id) => {
      const pkg = payload.packages[id];
      expect(pkg?.format).toBe('smt-blueprint-package');
      expect(pkg?.manifest?.blueprintId).toBe(id);
      expect(pkg?.manifest?.availabilityStatus).toBe('Available');
      expect(pkg?.manifest?.isInstallable).toBe(true);
    });
  });

  it('ships structurally rich systems with valid roadmap linkage', () => {
    const payload = readLaunchPayload();
    const packages = Object.values(payload.packages || {});

    packages.forEach((pkg) => {
      const system = pkg.system || {};
      const teams = Array.isArray(system.teams) ? system.teams : [];
      const services = Array.isArray(system.services) ? system.services : [];
      const goals = Array.isArray(system.goals) ? system.goals : [];
      const initiatives = Array.isArray(system.yearlyInitiatives) ? system.yearlyInitiatives : [];
      const workPackages = Array.isArray(system.workPackages) ? system.workPackages : [];

      expect(teams.length).toBeGreaterThanOrEqual(6);
      expect(services.length).toBeGreaterThanOrEqual(8);
      expect(goals.length).toBeGreaterThanOrEqual(5);
      expect(initiatives.length).toBeGreaterThanOrEqual(12);
      expect(workPackages.length).toBeGreaterThanOrEqual(initiatives.length);

      const teamIds = new Set(teams.map((team) => team.teamId).filter(Boolean));
      const initiativeIds = new Set(
        initiatives.map((initiative) => initiative.initiativeId).filter(Boolean)
      );
      const workPackageIds = new Set(workPackages.map((wp) => wp.workPackageId).filter(Boolean));
      const goalIds = new Set(goals.map((goal) => goal.goalId).filter(Boolean));

      initiatives.forEach((initiative) => {
        expect(goalIds.has(initiative.primaryGoalId)).toBe(true);
        expect(Array.isArray(initiative.assignments)).toBe(true);
        expect(initiative.assignments.length).toBeGreaterThan(0);
        initiative.assignments.forEach((assignment) => {
          expect(teamIds.has(assignment.teamId)).toBe(true);
          expect(typeof assignment.sdeYears).toBe('number');
        });
        expect(Array.isArray(initiative.workPackageIds)).toBe(true);
        expect(initiative.workPackageIds.length).toBeGreaterThan(0);
        initiative.workPackageIds.forEach((wpId) => {
          expect(workPackageIds.has(wpId)).toBe(true);
        });
      });

      workPackages.forEach((wp) => {
        expect(initiativeIds.has(wp.initiativeId)).toBe(true);
        expect(Array.isArray(wp.impactedTeamAssignments)).toBe(true);
      });
    });
  });

  it('uses domain-specific naming and excludes legacy sample-team labels', () => {
    const payload = readLaunchPayload();
    const rideshare = payload.packages['bp-001-rideshare-platform-v1']?.system;
    const socialMessaging = payload.packages['bp-024-social-messaging-platform-v1']?.system;
    const wallet = payload.packages['bp-025-digital-wallet-platform-v1']?.system;

    expect(rideshare?.services?.some((service) => service.serviceName === 'Dispatch Engine')).toBe(
      true
    );
    expect(
      socialMessaging?.services?.some(
        (service) => service.serviceName === 'Message Delivery Service'
      )
    ).toBe(true);
    expect(
      wallet?.services?.some((service) => service.serviceName === 'KYC and Compliance Service')
    ).toBe(true);

    const legacySampleTeamLabels = new Set([
      'Avengers',
      'Spartans',
      'Crusaders',
      'Olympus',
      'Falcons',
      'Ninjas',
      'Dragons',
    ]);

    Object.values(payload.packages || {}).forEach((pkg) => {
      const teams = Array.isArray(pkg?.system?.teams) ? pkg.system.teams : [];
      teams.forEach((team) => {
        expect(legacySampleTeamLabels.has(team.teamIdentity)).toBe(false);
      });
    });
  });
});
