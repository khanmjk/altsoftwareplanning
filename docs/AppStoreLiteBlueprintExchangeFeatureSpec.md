# AppStore-lite Blueprint Exchange Feature Specification and Execution Tracker

Document purpose: single source of truth for concept, requirements, UX, artifacts, implementation plan, and execution status so AI agents can resume work without context loss.

Status: MVP Implemented (Launch-25 credibility mode, iteration ongoing)
Feature owner: SMT Product + Engineering
Last updated: 2026-02-07
Tracking mode: Living document (update at every implementation session)

Related references:

- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/README.md`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/Backlog.txt`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/Codex5.3Recommendation07Feb26.md`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/AppStoreLiteUseCaseJourney.md`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/coding-agent-contract.md`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/workspace-canvas-contract.md`

---

## 1. Product Intent

### 1.1 Problem

SMT can generate rich systems with AI, but there is no community exchange loop for discovery, reuse, remixing, and publishing. New users still face a blank-canvas barrier and cannot easily learn from curated examples.

### 1.2 Vision

Create a prompt-first "AppStore-lite" where users can:

1. Discover curated blueprint templates for classic software products.
2. Install a blueprint in one click.
3. See and reuse the exact prompt pack used to generate it.
4. Publish their own local systems back to the community catalog.

### 1.3 Outcome

Turn SMT into an educational and community platform for learning how to design systems, orgs, and 3-year roadmaps by example.

---

## 2. Success Criteria

### 2.1 Product KPIs (MVP)

1. `Time to first value`: median less than 5 minutes from opening app to loading a blueprint.
2. `Blueprint adoption`: at least 50 percent of new sessions install at least one blueprint.
3. `Remix behavior`: at least 20 percent of installations lead to edits and save under a new system name.
4. `Publish behavior`: at least 10 percent of active users submit at least one local blueprint.
5. `Catalog quality`: less than 5 percent of published blueprints fail schema validation after publish.

### 2.2 Engineering KPIs

1. Zero import regressions in existing system import/export paths.
2. Full unit coverage for blueprint manifest parsing and validation.
3. Cypress coverage for browse, preview, install, publish draft, and validation errors.

---

## 3. Scope

### 3.1 In Scope (MVP)

1. Community Blueprint Catalog view in app.
2. Prompt-first blueprint package format (manifest + prompt pack + system snapshot).
3. Install/import blueprint into local systems.
4. Publish local system flow with metadata and prompt pack capture.
5. Validation and trust labels (`Verified`, `Community`, `Experimental`).
6. Curated starter set rollout plan to reach top 100 archetypes.

### 3.2 Out of Scope (MVP)

1. Full monetized marketplace.
2. Ratings, comments, social feeds.
3. Real-time moderation dashboard.
4. Multi-tenant auth and private blueprint ACLs.
5. Auto-generated legal review of all user-submitted content.

---

## 4. Core Product Principles

1. Prompt provenance is required for educational value.
2. Local-first install and publish drafting must work without backend lock-in.
3. Blueprint quality and trust signals are as important as quantity.
4. "Inspired-by" naming is preferred over direct trademark clone claims.
5. Existing system JSON import/export compatibility must remain stable.

---

## 5. User Personas and Jobs-to-be-Done

1. Founder Learner

- Job: "Show me how to architect and plan a rideshare-like company over 3 years."

2. Engineering Manager

- Job: "Install a reference blueprint, adapt team structure and roadmap for my org."

3. Educator / Coach

- Job: "Use templates in workshops, compare variants, and share course-specific remixes."

4. Community Contributor

- Job: "Publish my local system and prompt pack so others can learn from it."

---

## 6. Functional Requirements

| ID     | Requirement                   | Priority | Acceptance Criteria                                                                       |
| ------ | ----------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| FR-001 | Catalog browse and search     | Must     | User can search/filter by domain, complexity, stage, tags, trust label                    |
| FR-002 | Blueprint preview             | Must     | User sees architecture/org/roadmap summary before install                                 |
| FR-003 | Prompt pack display           | Must     | User can view seed prompt + variants + notes                                              |
| FR-004 | One-click install             | Must     | Blueprint imports as new local system via existing compatibility path                     |
| FR-005 | Publish local system          | Must     | User can select local system, add prompt pack, validate, and export/submit package        |
| FR-006 | Validation gate               | Must     | Invalid package cannot be published; user receives actionable errors                      |
| FR-007 | Trust labeling                | Should   | Catalog entries show `Verified`, `Community`, or `Experimental`                           |
| FR-008 | Version compatibility         | Must     | Package declares schema version and minimum app compatibility                             |
| FR-009 | Provenance metadata           | Must     | Installed systems retain blueprint and generation metadata                                |
| FR-010 | Top-100 seed program tracking | Must     | Feature includes tracked list, status, and quality checklist for 100 blueprint archetypes |

---

## 7. Non-Functional Requirements

1. Performance: catalog load under 2 seconds for first 100 items from local/remote manifest cache.
2. Reliability: failed catalog fetch must degrade gracefully to bundled defaults.
3. Security: no executable script payload allowed in blueprint package.
4. Privacy: published package must never include API keys or sensitive local settings.
5. Compliance: all code paths follow contracts in coding and workspace canvas docs.

---

## 8. Data Model and Package Specification

### 8.1 Blueprint Package Structure

```text
blueprint-package/
  manifest.json
  system.json
  media/cover.png                 (optional)
  media/preview-1.png             (optional)
```

### 8.2 `manifest.json` (proposed)

```json
{
  "blueprintId": "bp-rideshare-uber-style-v1",
  "title": "Rideshare Platform (Uber-style)",
  "summary": "Reference blueprint for a two-sided mobility marketplace.",
  "category": "Marketplace",
  "tags": ["mobility", "marketplace", "dispatch", "payments"],
  "trustLabel": "Verified",
  "complexity": "Advanced",
  "companyStage": "Scale-up",
  "targetTeamSize": "150-400",
  "roadmapHorizonYears": 3,
  "schemaVersion": 13,
  "appCompatibility": {
    "minSystemSchemaVersion": 13,
    "maxSystemSchemaVersion": 13
  },
  "promptPack": {
    "seedPrompt": "Create a rideshare platform system with org and 3-year roadmap...",
    "variants": [
      {
        "variantId": "mvp",
        "name": "MVP",
        "prompt": "Generate a lean MVP rideshare platform..."
      },
      {
        "variantId": "enterprise",
        "name": "Enterprise",
        "prompt": "Generate a large-scale multi-region rideshare platform..."
      }
    ],
    "authorNotes": "Tune safety/compliance goals for your geography."
  },
  "learningOutcomes": [
    "Understand dispatch and matching architecture",
    "Model platform safety and reliability goals",
    "Plan phased org growth over 3 years"
  ],
  "author": {
    "name": "SMT Curated",
    "contact": "community@placeholder"
  },
  "license": "CC-BY-4.0",
  "createdAt": "2026-02-07T00:00:00Z",
  "updatedAt": "2026-02-07T00:00:00Z"
}
```

### 8.3 System Provenance Additions (stored in imported system)

Add to `system.attributes`:

```json
{
  "blueprint": {
    "blueprintId": "bp-rideshare-uber-style-v1",
    "title": "Rideshare Platform (Uber-style)",
    "trustLabel": "Verified",
    "importedAt": "2026-02-07T00:00:00Z"
  },
  "aiGeneration": {
    "provider": "google-gemini",
    "model": "gemini-2.5-pro",
    "seedPrompt": "...",
    "promptVersion": "v1",
    "generatedAt": "2026-02-07T00:00:00Z"
  }
}
```

### 8.4 Validation Rules (minimum)

1. `manifest.json` and `system.json` must exist.
2. Prompt pack must include non-empty `seedPrompt`.
3. `schemaVersion` must be supported by `SystemService`.
4. `system.systemName` must be non-empty.
5. System should include non-empty goals and yearly initiatives for catalog admission.
6. Package must not include secrets or API keys.

### 8.5 Code-Derived AI Generation Constraints (Current Source)

The Top-100 program must align with live app behavior in:

- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/services/AIService.js`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/components/AIGenProgressOverlayView.js`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/services/SystemService.js`

Hard constraints observed from source:

1. AI output must be raw JSON only (no prose) and parse cleanly.
2. Core arrays must be present and populated for validation pass: teams, allKnownEngineers, services, yearlyInitiatives, goals, definedThemes, sdms, pmts, projectManagers.
3. `workPackages` must exist as an array (empty is allowed but triggers warning; not acceptable for curated seeds).
4. `capacityConfiguration` is required.
5. Numeric types must be numbers, not strings (`fundedHeadcount`, `sdeYears`, and other numeric fields).
6. Referential integrity must hold (team IDs, theme IDs, goal IDs, personnel references, workPackage links).
7. AI generation currently rejects only `errors`; `warnings` do not block save. For Top-100 curation, warnings must be treated as blockers or escalations.
8. System import compatibility is enforced by `SystemService.importFromJson` against supported schema version.

Important planning note:

1. AI prompt instructions still explicitly bias Year 1/2/3 examples to 2025/2026/2027. Top-100 seeds must apply rolling-year normalization before catalog publishing.

---

## 9. UX Design Plan

### 9.1 Navigation and IA

Proposed additions:

1. Sidebar item: `Community Blueprints`.
2. Catalog view route key: `communityBlueprintsView`.
3. Detail/preview modal: `BlueprintPreviewModal`.
4. Publish flow entry:

- from Systems view: `Publish System`
- from active system menu: `Publish Current System`

### 9.2 Primary User Flows

Flow A: Browse and Install

1. Open `Community Blueprints`.
2. Filter by category or search.
3. Open blueprint preview.
4. Review prompt pack and system summary.
5. Click `Install Blueprint`.
6. System imports and becomes available in Systems list.

Flow B: Publish Local System

1. Select local system to publish.
2. Add title, summary, category, tags, trust target.
3. Paste or edit seed prompt and variants.
4. Run validation.
5. Download package and/or submit to community intake.

### 9.3 UX Artifacts to Produce

1. Catalog page wireframe.
2. Blueprint detail/preview modal wireframe.
3. Publish wizard wireframe.
4. Validation error state screen.
5. Empty state and no-results state designs.

---

## 10. Delivery Architecture (MVP)

### 10.1 Catalog Source Strategy

Phase 1:

1. Use bundled manifest JSON in repository for curated blueprints.
2. Optional remote override via static GitHub raw file.

Phase 2:

1. Add publish intake storage (GitHub-based workflow first).
2. Introduce moderation pipeline for `Community` entries.

### 10.2 Service Layer Proposal

1. `BlueprintCatalogService`

- load catalog, filter/search, fetch blueprint package metadata.

2. `BlueprintPackageService`

- parse, validate, and serialize blueprint packages.

3. `BlueprintPublishService`

- draft package from local system and submit/export.

Note: no overlap with existing SystemService domain; these are blueprint exchange concerns.

---

## 11. Implementation Plan

## Phase 0: Specification and Artifacts

1. Finalize this spec.
2. Create schema docs and sample manifest.
3. Lock naming and trust label policy.

## Phase 1: Catalog + Install (Read Path)

1. Build catalog view and filters.
2. Add preview modal with prompt pack and summary.
3. Install action through `SystemService.importFromJson`.
4. Persist provenance metadata in imported systems.
5. Add tests and update docs.

## Phase 2: Publish from Local (Write Path)

1. Build publish wizard.
2. Add prompt-pack authoring UI.
3. Implement package validation and error UX.
4. Add export package download.
5. Add optional submit-to-community flow.

## Phase 3: Trust and Scale

1. Add trust labels and moderation status.
2. Add compatibility checks and badge display.
3. Add Top-100 curation progress dashboard.

## Phase 4: Top-100 Seed Generation and Curation Operations

1. Implement seed-generation pipeline tooling.
2. Generate first 25 blueprints and pass strict validation.
3. Expand to 100 with quality scoring and moderation.
4. Publish verification metadata and curation log.

### 11.1 Top-100 Seed Generation Pipeline (Required)

Step 1: Prompt authoring

1. For each candidate, define one canonical seed prompt plus 2 to 3 variants (`MVP`, `Scale`, `Enterprise`).
2. Include category, target team-size band, and roadmap expectations in prompt metadata.

Step 2: AI generation run

1. Generate system JSON using the same schema constraints used by in-app AI generation.
2. Persist generation metadata (provider, model, timestamp, source prompt).

Step 3: Validation Gate A (existing app rules)

1. Run `AIService.validateGeneratedSystem` and fail on any `errors`.
2. Record warnings count and warning types.

Step 4: Validation Gate B (curation strict mode)

1. Treat critical warning classes as blockers for catalog seeds:

- missing due dates on goals
- missing impacted services on initiatives
- missing work package links
- missing capacity adjustment fields

2. Require non-empty `workPackages` with dependency links for curated templates.

Step 5: Rolling-year normalization

1. Normalize Year 1/2/3 dates to current rolling 3-year window.
2. Normalize year suffixes in IDs/names where required for internal consistency.

Step 6: Import smoke test

1. Package as blueprint and import through `SystemService.importFromJson`.
2. Load and activate system; verify no runtime exceptions.

Step 7: Quality scoring

1. Compute and store quality metrics:

- dependency density
- goals to initiative linkage completeness
- work package coverage for Year 1 initiatives
- team loading realism (presence of overloaded bottlenecks)

2. Require minimum quality threshold for `Verified` label.

Step 8: Catalog publish

1. Publish only validated package + prompt pack + quality metadata.
2. Mark as `Community` until human curation marks `Verified`.

### 11.2 Suggested Tooling Deliverables

1. `scripts/blueprints/generate-seed.js`

- Batch generate a seed from prompt metadata.

2. `scripts/blueprints/validate-seed.js`

- Run Gate A and Gate B checks.

3. `scripts/blueprints/normalize-seed-years.js`

- Apply rolling-year normalization.

4. `scripts/blueprints/smoke-import-seed.js`

- Verify import and activation path.

5. `scripts/blueprints/build-catalog-index.js`

- Regenerate catalog metadata index from validated packages.

### 11.3 Release Strategy for Top-100

1. Wave 1: 25 verified blueprints across all categories.
2. Wave 2: expand to 60 with community submissions enabled.
3. Wave 3: complete top 100 with moderation SLA and quality badges.

---

## 12. Task Checklist (Living)

### 12.1 Product and Requirements

- [x] PRD-level feature intent captured
- [x] Prompt-first package requirement defined
- [x] Publish-from-local requirement defined
- [x] Finalize legal naming policy for "inspired-by" templates
- [x] Define publish terms and contributor guidelines

### 12.2 UX and Content

- [ ] Catalog wireframes completed
- [ ] Preview modal wireframes completed
- [ ] Publish wizard wireframes completed
- [x] Empty/error state copy completed
- [x] Blueprint quality rubric published

### 12.3 Engineering

- [x] Add `BlueprintCatalogService`
- [x] Add `BlueprintPackageService`
- [x] Add `BlueprintPublishService`
- [x] Build `Community Blueprints` view
- [x] Build `BlueprintPreviewModal`
- [x] Build publish wizard
- [x] Implement import/install flow
- [x] Implement publish package export
- [x] Implement provenance metadata persistence
- [x] Add seed-generation scripts for Top-100 program (`generate`, `validate`, `normalize`, `smoke-import`, `catalog-index`)
- [x] Add strict curation validator profile (warnings-as-errors for curated templates)
- [x] Add rolling-year normalization pass for generated blueprint seeds

### 12.4 QA and Testing

- [x] Unit tests for manifest parser/validator
- [x] Unit tests for package serialization
- [x] Integration tests for install path
- [x] Integration tests for publish draft path
- [x] Cypress e2e for browse -> preview -> install
- [x] Cypress e2e for publish -> validate -> export
- [ ] Automated smoke import tests for every curated blueprint package
- [ ] Quality score checks and threshold assertions for `Verified` badge

### 12.5 Documentation

- [x] Update README with AppStore-lite usage
- [x] Add blueprint package format guide in `/docs`
- [x] Add contributor guide for community templates
- [x] Update backlog status and recommendation tracker
- [x] Publish Top-100 curation handbook and prompt-writing guide

---

## 13. Artifact Inventory and Status

| Artifact ID | Artifact                         | Path                                                                                                    | Owner       | Status      |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------- | ----------- |
| AR-001      | Feature specification (this doc) | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/AppStoreLiteBlueprintExchangeFeatureSpec.md`  | Product/Eng | Active      |
| AR-002      | Blueprint manifest JSON schema   | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/appstore-lite/blueprint-manifest-schema.json` | Eng         | Done        |
| AR-003      | Sample blueprint packages        | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/data/blueprints/`                                  | Eng         | In Progress |
| AR-004      | Catalog data index               | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/data/blueprints/catalog.json`                      | Eng         | Done        |
| AR-005      | UX wireframes                    | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/appstore-lite/wireframes/`                    | UX          | Not Started |
| AR-006      | Publish moderation guideline     | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/appstore-lite/moderation-guidelines.md`       | Product     | Done        |
| AR-007      | Top-100 curation tracker         | Section 17 in this doc                                                                                  | Product     | Active      |
| AR-008      | Top-100 seed generation playbook | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/appstore-lite/top100-seed-playbook.md`        | Product/Eng | Done        |
| AR-009      | Seed generation scripts          | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/scripts/blueprints/`                               | Eng         | Done        |
| AR-010      | Use case journey guide           | `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/AppStoreLiteUseCaseJourney.md`                | Product/Eng | Active      |

---

## 14. QA Strategy

1. Unit tests

- manifest validation, schema compatibility, prompt pack required fields, trust label parsing.

2. Integration tests

- package install into repository and SystemService import path.
- publish package serialization from local system.

3. E2E tests (Cypress)

- browse/filter catalog.
- preview blueprint and inspect prompt pack.
- install blueprint and verify appears in Systems view.
- publish local system draft and validate missing prompt error.

4. Regression focus

- existing import/export and system lifecycle features must remain green.

5. Top-100 curation regression

- every `Verified` blueprint must pass automated Gate A + Gate B + import smoke test in CI.

---

## 15. Risks and Mitigations

| Risk                                          | Impact | Mitigation                                         |
| --------------------------------------------- | ------ | -------------------------------------------------- |
| Low-quality catalog entries reduce trust      | High   | Add strict quality rubric and trust labels         |
| Trademark/legal concern from "clone" language | High   | Use "inspired-by" naming policy and disclaimer     |
| Users publish invalid or incomplete templates | Medium | Mandatory validation gate before publish           |
| Catalog growth causes discoverability issues  | Medium | Strong filtering/tags and curated collections      |
| Schema drift breaks older blueprints          | Medium | Explicit compatibility fields and migration checks |

---

## 16. Open Decisions

1. Should publish submission use GitHub Issues, pull requests, or both?
2. Should `Community` entries be visible immediately or post-review only?
3. Should package export be zip only, JSON only, or both?
4. Which license options will be allowed for submissions?
5. Should prompt variants be mandatory or optional in MVP?
6. Should curated seed generation use `gemini-2.5-flash` or a higher-quality model tier for final canonical packages?
7. Which warning classes become hard blockers for `Verified` status?

---

## 17. Top-100 Blueprint Seed Program Tracker

Target: curate 100 high-quality "inspired-by" blueprint archetypes with prompt packs.

Status summary:

1. Seed list created: Yes (100 candidates)
2. Curated metadata baseline: 100 of 100 (manifest/prompt-pack baseline)
3. Installable prebuilt packages: 25 of 100 (launch wave)
4. Contribution-needed backlog: 75 of 100 (unlock via community contributions against curated blueprint IDs)

### 17.1 Category Quotas

| Category                       | Target Count |
| ------------------------------ | ------------ |
| Marketplace and Mobility       | 12           |
| Social and Content             | 12           |
| Fintech                        | 12           |
| Collaboration and Productivity | 12           |
| Developer Tools                | 12           |
| Cloud, Infra, and Security     | 12           |
| Commerce and Vertical SaaS     | 12           |
| AI-Native Products             | 16           |
| Total                          | 100          |

### 17.2 Candidate List (Seed v1)

1. Rideshare platform (Uber-style)
2. Food delivery platform (DoorDash-style)
3. Grocery delivery platform (Instacart-style)
4. Last-mile courier network
5. Home services marketplace (TaskRabbit-style)
6. Freelance talent marketplace (Upwork-style)
7. Accommodation marketplace (Airbnb-style)
8. Travel booking aggregator (Booking-style)
9. Car rental marketplace (Turo-style)
10. Used goods marketplace (eBay-style)
11. Ticket resale marketplace (StubHub-style)
12. B2B procurement marketplace
13. Short-video social network (TikTok-style)
14. Photo sharing social app (Instagram-style)
15. Professional network (LinkedIn-style)
16. Community forum platform (Reddit-style)
17. Creator subscription platform (Patreon-style)
18. Live streaming platform (Twitch-style)
19. Podcast distribution platform (Spotify Podcasts-style)
20. Newsletter publishing platform (Substack-style)
21. Music streaming platform (Spotify-style)
22. OTT video streaming platform (Netflix-style)
23. Personalized news platform
24. Social messaging platform (WhatsApp-style)
25. Digital wallet platform (PayPal-style)
26. Neobank platform (Chime-style)
27. SME banking platform
28. P2P payments platform (Venmo-style)
29. Cross-border remittance platform (Wise-style)
30. Buy-now-pay-later platform (Klarna-style)
31. Consumer lending platform
32. Robo-advisor wealth platform (Betterment-style)
33. Crypto exchange platform (Coinbase-style)
34. Fraud and risk intelligence platform
35. Subscription billing platform (Stripe Billing-style)
36. Insurtech claims and policy platform
37. Team chat platform (Slack-style)
38. Video conferencing platform (Zoom-style)
39. Project management platform (Asana-style)
40. Docs and wiki collaboration platform (Notion-style)
41. Design collaboration platform (Figma-style)
42. Enterprise knowledge search platform
43. CRM platform (Salesforce-style)
44. Customer support desk platform (Zendesk-style)
45. Recruiting ATS platform (Greenhouse-style)
46. Learning management platform
47. Field service operations platform
48. Marketing automation platform (HubSpot-style)
49. Git hosting platform (GitHub-style)
50. CI/CD automation platform (CircleCI-style)
51. Error monitoring platform (Sentry-style)
52. Observability platform (Datadog-style)
53. API gateway management platform
54. Feature flag platform (LaunchDarkly-style)
55. Experimentation platform (Optimizely-style)
56. Package registry and artifacts platform
57. Internal developer portal platform (Backstage-style)
58. Secrets management platform (Vault-style)
59. Incident response platform (PagerDuty-style)
60. Test automation cloud platform
61. IaaS cloud platform (AWS-style)
62. Managed Kubernetes platform (EKS/GKE-style)
63. Serverless functions platform
64. Data warehouse analytics platform (Snowflake-style)
65. Stream processing platform (Kafka ecosystem style)
66. Identity and access management platform (Okta-style)
67. Endpoint security platform
68. SIEM analytics platform (Splunk-style)
69. Backup and disaster recovery platform
70. CDN and edge compute platform (Cloudflare-style)
71. Email delivery infrastructure platform (SendGrid-style)
72. Message queue infrastructure platform
73. Ecommerce storefront platform (Shopify-style)
74. Multi-vendor marketplace platform
75. Restaurant POS and ordering platform
76. Healthcare patient engagement platform
77. Telemedicine platform
78. Real estate listings platform
79. Property rental management platform
80. Fleet logistics optimization platform
81. Classroom and assignments platform
82. Legal case management platform
83. Nonprofit donor management platform
84. Construction project controls platform
85. General AI assistant product
86. AI coding assistant product
87. AI customer support copilot
88. AI sales copilot
89. AI meeting notes and action tracker
90. AI resume and hiring assistant
91. AI content studio platform
92. AI image generation platform
93. AI video generation platform
94. AI voice and speech platform
95. AI analytics copilot for BI
96. AI cybersecurity copilot
97. AI legal document review copilot
98. AI medical scribe platform
99. AI tutoring and learning platform
100. Multi-agent workflow orchestration platform

### 17.3 Curation Quality Gate (per blueprint)

Each candidate needs:

1. Prompt pack (`seedPrompt` plus at least one variant).
2. Valid system export importable in SMT.
3. 3-year roadmap with goals and initiatives.
4. Org structure realistic for declared stage/size.
5. At least one learning outcome statement.

---

## 18. AI Agent Handoff Protocol

This section is mandatory for quota-constrained multi-agent continuity.

### 18.1 Session Start Checklist

1. Read this document first.
2. Read latest entries in `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/worklogjournal.md`.
3. Confirm current phase and next unchecked task in Section 12.
4. Confirm no conflicting in-progress changes in git status.

### 18.2 Session End Checklist

1. Update Section 12 checklist status.
2. Update Section 13 artifact status for touched artifacts.
3. Add decisions to Section 19 decision log.
4. Add timestamped summary entry to worklog journal.
5. Run relevant tests and record result summary in handoff note.

### 18.3 Standard Handoff Snapshot Template

```text
Feature: AppStore-lite Blueprint Exchange
Date/Time:
Agent:
Phase:
Tasks completed:
Files changed:
Tests run:
Open blockers:
Next recommended task ID:
Notes for next agent:
```

---

## 19. Decision Log

| Date       | Decision                                                | Rationale                                                                     | Owner       |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| 2026-02-07 | Make AppStore-lite prompt-first                         | Educational value depends on prompt provenance, not only static data          | Product/Eng |
| 2026-02-07 | Include publish-from-local in MVP scope                 | Community growth requires user contribution path from day one                 | Product/Eng |
| 2026-02-07 | Use "inspired-by" catalog naming                        | Reduces legal and brand misuse risk                                           | Product     |
| 2026-02-07 | Treat Top-100 seed generation as a governed pipeline    | One-off manual generation will not produce consistent, valid catalog quality  | Product/Eng |
| 2026-02-07 | Use local-first publish persistence via preferences     | Keeps community flow usable offline without backend coupling                  | Product/Eng |
| 2026-02-07 | Ship curated metadata + domain-authored launch packages | Delivers installable launch wave with realistic org/architecture/roadmap data | Product/Eng |

---

## 20. Change Log

| Date       | Change                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-07 | Initial feature spec and tracker created                                                                                        |
| 2026-02-07 | Added code-derived AI constraints and Top-100 seed generation pipeline                                                          |
| 2026-02-07 | Implemented Community Blueprints view, Top-100 catalog, install/publish flows, tests, and docs                                  |
| 2026-02-07 | Replaced launch-25 template-seed generation with domain-authored curated package synthesis and added integrity regression tests |
