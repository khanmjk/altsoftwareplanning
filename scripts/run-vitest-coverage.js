#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const nycOutputDir = path.join(rootDir, '.nyc_output');
const unitCoverageDir = path.join(rootDir, 'coverage', 'unit');

const cleanDir = (dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

cleanDir(nycOutputDir);
cleanDir(unitCoverageDir);

const vitestBin = process.platform === 'win32' ? 'vitest.cmd' : 'vitest';
const vitestPath = path.join(rootDir, 'node_modules', '.bin', vitestBin);

const vitest = spawn(vitestPath, ['run'], {
  stdio: 'inherit',
  cwd: rootDir,
  env: { ...process.env, UNIT_COVERAGE: '1' },
});

vitest.on('error', (error) => {
  console.error('Failed to start Vitest:', error);
  process.exit(1);
});

vitest.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const reportScript = path.join(rootDir, 'scripts', 'generate-coverage-report.js');
  const reportArgs = [
    reportScript,
    '--temp-dir',
    '.nyc_output',
    '--report-dir',
    path.join('coverage', 'unit'),
    '--reporter',
    'lcov',
    '--reporter',
    'text-summary',
    '--reporter',
    'html',
  ];

  const report = spawn('node', reportArgs, { stdio: 'inherit', cwd: rootDir });

  report.on('error', (error) => {
    console.error('Failed to generate coverage report:', error);
    process.exit(1);
  });

  report.on('exit', (reportCode) => {
    process.exit(reportCode ?? 1);
  });
});
