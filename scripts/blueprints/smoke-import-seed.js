#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

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

function smokeCheck(payload) {
  const errors = [];
  const system = payload.system || {};

  if (!system.systemName) errors.push('systemName missing.');
  if (!Array.isArray(system.yearlyInitiatives)) errors.push('yearlyInitiatives missing.');
  if (!Array.isArray(system.goals)) errors.push('goals missing.');
  if (!Array.isArray(system.workPackages)) errors.push('workPackages missing.');

  const goalIds = new Set((system.goals || []).map((goal) => goal.goalId).filter(Boolean));
  (system.yearlyInitiatives || []).forEach((initiative) => {
    if (initiative.primaryGoalId && !goalIds.has(initiative.primaryGoalId)) {
      errors.push(
        `initiative "${initiative.initiativeId || initiative.title}" references missing goal "${initiative.primaryGoalId}".`
      );
    }
  });

  const initiativeIds = new Set(
    (system.yearlyInitiatives || []).map((initiative) => initiative.initiativeId).filter(Boolean)
  );
  (system.workPackages || []).forEach((wp) => {
    if (wp.initiativeId && !initiativeIds.has(wp.initiativeId)) {
      errors.push(
        `workPackage "${wp.workPackageId}" references missing initiative "${wp.initiativeId}".`
      );
    }
  });

  return errors;
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '../..');
  const inputPath = path.resolve(repoRoot, args.input || 'data/blueprints/generated-seed.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const errors = smokeCheck(payload);
  if (errors.length > 0) {
    console.error('Smoke check failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Smoke import checks passed.');
}

main();
