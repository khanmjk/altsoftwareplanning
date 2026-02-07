# Top-100 Seed Curation Playbook

Last updated: 2026-02-07

## Objective

Maintain a curated Top-100 blueprint catalog that is installable, educational, and consistent with SMT data contracts.

## Curation Workflow

1. Pick target blueprint from category quota list.
2. Draft prompt pack:
   - seed prompt
   - `MVP` variant
   - `Scale` variant
   - `Enterprise` variant
3. Generate or assemble package.
4. Validate package:
   - manifest required fields
   - non-empty goals + initiatives
   - capacity configuration present
   - no secret-like content
5. Smoke install in app and open major views.
6. Assign trust label (`Verified`, `Community`, `Experimental`).
7. Add/update catalog entry.

## Prompt Authoring Guide

1. Always demand strict JSON output.
2. Ask for complete linkage:
   - goals -> initiatives
   - initiatives -> work packages
   - assignments -> teams
3. Specify rolling 3-year planning horizon.
4. Specify realistic team and service complexity for declared company stage.
5. Include at least three learning outcomes.

## Quality Rubric (Suggested)

1. Structural integrity (required): pass/fail.
2. Linkage completeness: percentage of initiatives mapped to goals.
3. Work package coverage: percentage of initiatives with work packages.
4. Capacity realism: assignments not obviously impossible against team size band.
5. Educational clarity: summary + outcomes + prompt pack quality.

## Current Operating Model

1. Curated catalog is shipped as Top-100 metadata in `data/blueprints/catalog.json`.
2. Launch-wave curated packages (25) are generated in-repo via `scripts/blueprints/build-launch25-packages.js` using domain-authored profiles, not sample-template cloning.
3. App runtime uses local-first services to browse/install/publish.
4. Community submissions are stored in local preferences and merged into catalog results.
