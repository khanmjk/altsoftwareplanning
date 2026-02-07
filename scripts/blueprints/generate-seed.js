#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function readCatalog(catalogPath) {
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.blueprints || [];
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function buildSeedSystem(entry) {
  const prefix = (entry.blueprintId || 'seed').replace(/[^a-z0-9]/gi, '').slice(0, 10);
  const teamId = `team_${prefix}`;
  const goalId = `goal_${prefix}`;
  const initId = `init_${prefix}`;
  const wpId = `wp_${prefix}`;
  const currentYear = new Date().getUTCFullYear();

  return {
    systemName: `${entry.title} Seed`,
    systemDescription: entry.summary,
    teams: [
      { teamId, teamName: `${entry.category} Team`, teamIdentity: 'Seed Team', engineers: [] },
    ],
    allKnownEngineers: [
      {
        engineerId: `eng_${prefix}`,
        name: `${entry.category} Engineer`,
        level: 3,
        currentTeamId: teamId,
        attributes: {},
      },
    ],
    seniorManagers: [],
    sdms: [{ sdmId: `sdm_${prefix}`, sdmName: 'Seed SDM', attributes: {} }],
    pmts: [{ pmtId: `pmt_${prefix}`, pmtName: 'Seed PMT', attributes: {} }],
    projectManagers: [{ pmId: `pm_${prefix}`, pmName: 'Seed PM', attributes: {} }],
    services: [
      {
        serviceName: `${entry.category} Core Service`,
        serviceDescription: 'Seed service',
        owningTeamId: teamId,
        serviceDependencies: [],
        platformDependencies: [],
        attributes: {},
      },
    ],
    yearlyInitiatives: [
      {
        initiativeId: initId,
        title: `${entry.title} Year 1 Launch`,
        description: 'Seed initiative',
        status: 'Committed',
        planningYear: currentYear,
        assignments: [{ teamId, sdeYears: 1.2 }],
        impactedServiceIds: [`${entry.category} Core Service`],
        workPackageIds: [wpId],
        themes: [],
        primaryGoalId: goalId,
        owner: { type: 'pmt', id: `pmt_${prefix}`, name: 'Seed PMT' },
        projectManager: { type: 'pm', id: `pm_${prefix}`, name: 'Seed PM' },
        technicalPOC: { type: 'sdm', id: `sdm_${prefix}`, name: 'Seed SDM' },
        attributes: {},
      },
    ],
    goals: [
      {
        goalId,
        name: `${entry.title} Goal`,
        description: 'Seed goal',
        dueDate: `${currentYear + 1}-12-31`,
        initiativeIds: [initId],
        attributes: {},
      },
    ],
    definedThemes: [
      { themeId: `theme_${prefix}`, name: 'Core Growth', description: '', attributes: {} },
    ],
    workPackages: [
      {
        workPackageId: wpId,
        initiativeId: initId,
        name: `${entry.title} Work Package`,
        status: 'Defined',
        dependencies: [],
        impactedServiceIds: [`${entry.category} Core Service`],
        impactedTeamAssignments: [{ teamId, sdeDaysEstimate: 20 }],
        attributes: {},
      },
    ],
    capacityConfiguration: {
      workingDaysPerYear: 261,
      standardHoursPerDay: 8,
      globalConstraints: { publicHolidays: 10, orgEvents: [] },
      leaveTypes: [
        { id: 'annual', name: 'Annual Leave', defaultEstimatedDays: 20, attributes: {} },
        { id: 'sick', name: 'Sick Leave', defaultEstimatedDays: 7, attributes: {} },
      ],
      attributes: {},
    },
    attributes: {},
  };
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '../..');
  const catalogPath = path.resolve(repoRoot, args.catalog || 'data/blueprints/catalog.json');
  const outputPath = path.resolve(repoRoot, args.output || 'data/blueprints/generated-seed.json');
  const blueprintId = args['blueprint-id'];

  if (!blueprintId) {
    console.error(
      'Usage: node scripts/blueprints/generate-seed.js --blueprint-id <id> [--output file]'
    );
    process.exit(1);
  }

  const catalog = readCatalog(catalogPath);
  const entry = catalog.find((item) => item.blueprintId === blueprintId);
  if (!entry) {
    console.error(`Blueprint not found: ${blueprintId}`);
    process.exit(1);
  }

  const packagePayload = {
    format: 'smt-blueprint-package',
    packageSchemaVersion: 1,
    exportedAt: new Date().toISOString(),
    manifest: entry,
    system: buildSeedSystem(entry),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(packagePayload, null, 2));
  console.log(`Generated seed package: ${outputPath}`);
}

main();
