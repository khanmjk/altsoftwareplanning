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

function normalizeYears(payload) {
  const currentYear = new Date().getUTCFullYear();
  const system = payload.system || {};

  (system.goals || []).forEach((goal, index) => {
    const targetYear = currentYear + Math.min(index % 3, 2);
    goal.dueDate = `${targetYear}-12-31`;
  });

  (system.yearlyInitiatives || []).forEach((initiative, index) => {
    const planningYear = currentYear + Math.min(index % 3, 2);
    if (!initiative.attributes || typeof initiative.attributes !== 'object') {
      initiative.attributes = {};
    }
    initiative.attributes.planningYear = planningYear;
    initiative.planningYear = planningYear;
  });

  if (payload.manifest) {
    payload.manifest.updatedAt = new Date().toISOString();
  }
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '../..');
  const inputPath = path.resolve(repoRoot, args.input || 'data/blueprints/generated-seed.json');
  const outputPath = path.resolve(repoRoot, args.output || inputPath);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  normalizeYears(payload);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Normalized rolling-year dates: ${outputPath}`);
}

main();
