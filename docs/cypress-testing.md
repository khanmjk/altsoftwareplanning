# Cypress E2E Testing Guide

## Purpose

Cypress is used for end-to-end UI coverage of the most important user flows
and regression risks. Tests run against a local static server and use the
sample systems bundled with the app.

## Quickstart

Headless run:

```
npm run test:e2e
```

Interactive runner:

```
npm run test:e2e:open
```

## Run a Single Spec

The built-in script does not pass through extra Cypress CLI flags. If you want
to run one spec, start the static server separately and then run Cypress:

```
python3 -m http.server 4173
```

```
npx cypress run --spec cypress/e2e/smoke.cy.js
```

## Coverage (E2E)

Collect coverage for Cypress runs:

```
npm run test:e2e:coverage
```

Outputs:

- `coverage/e2e/index.html`
- `coverage/e2e/lcov.info`
- `.nyc_output/coverage-*.json` (raw coverage data)

Notes:

- Coverage is collected from `window.__coverage__` in the app and only covers client-side code.
- Coverage data is saved per spec by `scripts/cypress-coverage.js` and merged by `scripts/generate-coverage-report.js`.
- The Cypress server instruments files under `js/` and `ai/` when `--coverage` is enabled.
- `js/sampleData/` is excluded from instrumentation.

## Spec Map

- `cypress/e2e/smoke.cy.js`: quick sanity checks for navigation and modals.
- `cypress/e2e/core-features.cy.js`: primary views, navigation, and core UI.
- `cypress/e2e/advanced-flows.cy.js`: full system creation, drag and drop, and forecasting.
- `cypress/e2e/system-edit-org.cy.js`: system edit and org design workflows.
- `cypress/e2e/product-management.cy.js`: themes, initiatives, goals, and backlog CRUD.
- `cypress/e2e/planning-detailed.cy.js`: year plan, detailed planning, capacity, and forecast.
- `cypress/e2e/settings-ai-feedback.cy.js`: AI settings, feedback, and reset flows.

## Data and State

- Tests clear local storage before each scenario to avoid cross-test state.
- Most flows load the built-in "StreamView" sample system.
- Avoid random data. Use stable names so tests remain deterministic.
- Prefer UI interactions for changes; only read from services when needed.

## Patterns and Helpers

- Sidebar navigation helpers standardize view switching.
- ThemedSelect helpers are used for custom dropdowns.
- `scrollIntoView()` plus `{ force: true }` is used only when sticky headers
  cover inputs.
- Use `cy.window()` sparingly to read data (not to mutate state).

## Debugging Tips

- Screenshots are saved to `cypress/screenshots/` on failures.
- Video capture is disabled in `cypress.config.cjs`.
- If a modal or toast blocks an element, close it before continuing.

## Adding New Tests

- Place new specs in `cypress/e2e/` and use the `*.cy.js` suffix.
- Keep each test focused on one workflow.
- Comment complex steps so future maintainers know the intent.
