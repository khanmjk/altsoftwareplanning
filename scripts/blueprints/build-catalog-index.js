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

function normalizeCatalog(payload) {
  const blueprints = Array.isArray(payload.blueprints) ? payload.blueprints : [];
  blueprints.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  return {
    catalogVersion: payload.catalogVersion || 1,
    generatedAt: new Date().toISOString(),
    count: blueprints.length,
    blueprints,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '../..');
  const inputPath = path.resolve(repoRoot, args.input || 'data/blueprints/catalog.json');
  const outputPath = path.resolve(repoRoot, args.output || inputPath);

  if (!fs.existsSync(inputPath)) {
    console.error(`Catalog file not found: ${inputPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const normalized = normalizeCatalog(payload);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
  console.log(`Catalog index rebuilt: ${outputPath}`);
}

main();
