// Cypress support file.
const coverageDisabled = (() => {
  const env = Cypress.env('coverage');
  if (env === false) return true;
  if (typeof env === 'string' && env.toLowerCase() === 'false') return true;
  return false;
})();

if (coverageDisabled) {
  console.log('Skipping Cypress coverage hooks.');
} else {
  let windowCoverageObjects = [];

  const saveCoverageObject = (win) => {
    let coverage;
    try {
      coverage = win && win.__coverage__;
    } catch {
      return;
    }

    if (!coverage) return;

    const existing = windowCoverageObjects.find((entry) => entry.coverage === coverage);
    if (existing) {
      existing.coverage = coverage;
      return;
    }

    windowCoverageObjects.push({ coverage });
  };

  before(() => {
    cy.task('resetCoverage', { isInteractive: Cypress.config('isInteractive') }, { log: false });
  });

  beforeEach(() => {
    windowCoverageObjects = [];
    cy.on('window:load', saveCoverageObject);
    cy.window({ log: false }).then(saveCoverageObject);
  });

  afterEach(() => {
    windowCoverageObjects.forEach(({ coverage }) => {
      cy.task('combineCoverage', JSON.stringify(coverage), { log: false });
    });
  });

  after(() => {
    cy.task('coverageReport', { specName: Cypress.spec.name }, { log: false });
  });
}
