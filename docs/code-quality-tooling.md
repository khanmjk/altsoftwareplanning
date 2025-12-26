# Code Quality Tooling Setup

## Purpose

This repository uses lightweight, industry-standard tooling to catch regressions,
keep code style consistent, and enforce the workspace contract. The tools do not
change runtime behavior and can be removed later without refactoring.

## Daily Workflow

- Code as usual.
- Before committing, the pre-commit hook runs lint/format on staged files.
- If the hook fails, fix the reported files and re-stage.
- On push, GitHub Actions runs the full verification suite.

## Tooling Overview

- ESLint: JS linting and basic quality checks
- Prettier: formatting consistency
- Stylelint: CSS linting
- Husky + lint-staged: local pre-commit checks
- Contract scan: custom guardrails for contract violations
- depcheck: unused dependency detection
- GitHub Actions: run checks on push/PR

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Install

1. Install dependencies:

```
npm install
```

2. Enable Husky hooks:

```
npm run prepare
```

Notes:

- `npm run prepare` sets up the Git hooks folder and activates Husky.
- A pre-commit hook is already defined in `.husky/pre-commit`.

## Commands

- Lint JS:

```
npm run lint
```

- Lint CSS:

```
npm run stylelint
```

- Format code:

```
npm run format
```

- Contract scan:

```
npm run contract:check
```

- Full local verification:

```
npm run verify
```

## Where You See Issues (VSCode)

Install these extensions:

- ESLint (Microsoft)
- Prettier - Code formatter
- Stylelint

Then:

- Inline squiggles appear in files.
- View all issues in **View → Problems**.
- Terminals show exact `file:line:column` for CLI runs.

Recommended VSCode settings (optional):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
    "source.fixAll.stylelint": "always"
  }
}
```

## Contract Scan Rules

The contract scan enforces these rules:

- No `innerHTML`, `insertAdjacentHTML`, or `outerHTML` usage in JS
- No `TemplateLoader` usage
- No `window.*` assignments outside `js/main.js`
- No `localStorage` usage outside `js/repositories/SystemRepository.js`
- No HTML template files (only `index.html` is allowed)
- No raw hex colors in CSS outside theme variable usage

## GitHub Actions

Quality checks run on every push and PR:

- Lint + contract checks (`npm run verify`)
- Dependency audit (`npm audit --audit-level=high`)

Workflow file:

- `.github/workflows/quality.yml`

## ESLint Notes

This codebase uses global script loading (no module imports). To avoid false
positives, `no-undef` is disabled. If/when the codebase migrates to ES modules
or TypeScript, re-enable `no-undef` and remove globals as needed.

## Troubleshooting

- If hooks do not run, re-run:

```
npm run prepare
```

- If lint-staged fails, run its underlying command directly to see full output.
- If a warning is unclear, check the rule name in the output and search the
  rule docs, or run `npm run lint` / `npm run stylelint` for full context.
