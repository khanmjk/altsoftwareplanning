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

function validatePackage(payload) {
  const errors = [];
  const warnings = [];

  if (payload.format !== 'smt-blueprint-package') {
    errors.push('format must be "smt-blueprint-package".');
  }

  const manifest = payload.manifest || {};
  const system = payload.system || {};

  if (!manifest.blueprintId) errors.push('manifest.blueprintId is required.');
  if (!manifest.title) errors.push('manifest.title is required.');
  if (!manifest.promptPack || !manifest.promptPack.seedPrompt) {
    errors.push('manifest.promptPack.seedPrompt is required.');
  }

  const requiredArrays = ['teams', 'allKnownEngineers', 'services', 'yearlyInitiatives', 'goals'];
  requiredArrays.forEach((key) => {
    if (!Array.isArray(system[key]) || system[key].length === 0) {
      errors.push(`system.${key} must be a non-empty array.`);
    }
  });

  if (!Array.isArray(system.workPackages) || system.workPackages.length === 0) {
    warnings.push('system.workPackages is empty.');
  }
  if (!system.capacityConfiguration) {
    errors.push('system.capacityConfiguration is required.');
  }

  return { isValid: errors.length === 0, errors, warnings };
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
  const result = validatePackage(payload);
  if (!result.isValid) {
    console.error('Validation failed:');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Validation passed.');
  if (result.warnings.length > 0) {
    result.warnings.forEach((warning) => console.log(`Warning: ${warning}`));
  }
}

main();
