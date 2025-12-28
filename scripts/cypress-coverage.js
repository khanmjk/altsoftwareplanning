const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');

const outputDir = path.join(process.cwd(), '.nyc_output');
let coverageMap = libCoverage.createCoverageMap({});

const ensureOutputDir = () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
};

const resetCoverage = ({ isInteractive } = {}) => {
  coverageMap = libCoverage.createCoverageMap({});
  if (isInteractive && fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  return null;
};

const combineCoverage = (sentCoverage) => {
  if (!sentCoverage) return null;
  try {
    const coverage = JSON.parse(sentCoverage);
    coverageMap.merge(coverage);
  } catch (error) {
    console.error('Failed to parse coverage payload:', error);
  }
  return null;
};

const coverageReport = ({ specName } = {}) => {
  if (coverageMap.files().length === 0) return null;

  ensureOutputDir();
  const safeSpec = specName ? specName.replace(/[^A-Za-z0-9_.-]+/g, '_') : 'spec';
  const filename = `coverage-${safeSpec}-${Date.now()}-${process.pid}.json`;
  // Use per-spec files to avoid double-counting coverage across runs.
  fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(coverageMap, null, 2));
  return null;
};

module.exports = (on, config) => {
  on('task', {
    resetCoverage,
    combineCoverage,
    coverageReport,
  });

  config.env.coverageTasksRegistered = true;
  return config;
};
