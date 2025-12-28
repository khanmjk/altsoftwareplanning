const { defineConfig } = require('cypress');
const registerCoverageTasks = require('./scripts/cypress-coverage');

module.exports = defineConfig({
  video: false,
  viewportWidth: 1280,
  viewportHeight: 800,
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      return registerCoverageTasks(on, config);
    }
  }
});
