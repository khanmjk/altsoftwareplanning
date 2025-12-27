#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const args = process.argv.slice(2);

const getArgValue = (flag, defaultValue = null) => {
  const index = args.indexOf(flag);
  if (index === -1) return defaultValue;
  return args[index + 1] || defaultValue;
};

const getArgValues = (flag) =>
  args.reduce((values, arg, index) => {
    if (arg === flag && args[index + 1]) {
      values.push(args[index + 1]);
    }
    return values;
  }, []);

const tempDir = getArgValue('--temp-dir', '.nyc_output');
const reportDir = getArgValue('--report-dir', 'coverage');
const reporters = getArgValues('--reporter');

const resolvedTempDir = path.resolve(process.cwd(), tempDir);
const resolvedReportDir = path.resolve(process.cwd(), reportDir);

if (!fs.existsSync(resolvedTempDir)) {
  console.error(`Coverage temp dir not found: ${resolvedTempDir}`);
  process.exit(1);
}

const coverageMap = libCoverage.createCoverageMap({});
const files = fs
  .readdirSync(resolvedTempDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => path.join(resolvedTempDir, file));

files.forEach((file) => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  coverageMap.merge(data);
});

const context = libReport.createContext({
  dir: resolvedReportDir,
  coverageMap,
  watermarks: undefined,
});

(reporters.length ? reporters : ['text-summary']).forEach((reporter) => {
  reports
    .create(reporter, {
      projectRoot: process.cwd(),
      maxCols: process.stdout.columns || 100,
    })
    .execute(context);
});
