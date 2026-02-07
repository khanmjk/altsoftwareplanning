# Codex 5.3 Recommendation: Next Evolution Phase (07 Feb 2026)

> **Author**: Codex 5.3  
> **Date**: February 7, 2026  
> **Inputs synthesized**:
>
> - `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/Claude Opus recommended next phase 07Jan26.md`
> - `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/Codex recommended next phase 07Jan26.md`
> - `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/Gemini 3Pro recommended next phase 07Jan26.md`

---

## Executive Recommendation

Run a **6-week phase focused on execution maturity and strategic alignment**, not framework migration.

**Recommended phase name**: **Execution-Ready Strategic Planning**  
**Primary objective**: Close the gap between planning artifacts (Goals -> Initiatives -> Work Packages) and operational execution (status, scheduling, capacity, portability, and reporting).

All three analyses agree the architecture is stable enough to ship significant business value now, and that migrating to React/Rails immediately would delay outcomes without reducing current delivery risk.

---

## Implementation Status Update (as of February 7, 2026, post-recommendation pass)

### Delivered from this recommendation

1. Goal lifecycle/status engine in `GoalService` with shared dashboard/management status behavior.
2. Goal lifecycle management UI (create/update/delete) in Product Management.
3. Goal status pills in the goals list and status propagation refresh behavior.
4. Roadmap discoverability improvements: goal and status filters in quarterly/3YP.
5. UX unblockers:
   - fixed Roadmap -> Manage Themes navigation behavior
   - added initiatives search/reset in management
   - org chart depth visualization improvements
6. Data portability: system JSON export/import via sidebar with schema-version checks and compatibility handling.
7. Year plan snapshots: save/load workflow with retention of latest 5 snapshots per planning year.
8. Scheduling baseline: dependency conflict visibility plus auto-schedule shift behavior.
9. Capacity intelligence: Hiring Gap KPI and corrected sink assumptions for open positions.
10. AI planning copilots: goal alignment and goal risk analysis tools.
11. Year Plan export actions: CSV and XLSX export from the Year Plan toolbar (metadata, team summary, initiatives).
12. Goal inspection operations: weekly owner status/PTG check-ins plus leadership-ready inspection reporting (filters, stale/mismatch signals, CSV/XLSX export).
13. AppStore-lite baseline delivered: Community Blueprints view, curated Top-100 catalog, prompt-pack preview, blueprint install path, and local publish/export workflow.

### Partially delivered / still open

1. Initiative add/edit workflow unification is partially complete (management flow unified; roadmap modal still separate).
2. Year Planning MVC refactor remains partial.
3. Leave-calendar and richer scheduling sophistication are still iterative.
4. CSV/XLSX-wide export utility standardization remains open (Year Plan CSV/XLSX is delivered; cross-view standardization remains).
5. Multi-LLM/provider expansion and backend image proxy remain out of this delivered pass.

---

## Synthesis Across the Three Recommendations

### Strong consensus (3/3)

1. **Do not migrate frameworks yet**.
2. **Prioritize goal lifecycle logic** (Green/Amber/Red, propagation, management UX).
3. **Strengthen planning execution flow** (better scheduling, filtering, and actionable status).
4. **Maintain architecture discipline** (service-first business logic, contract compliance, tests).

### Partial consensus (2/3)

1. **Data portability/liquidity** (full export/import + plan snapshots/versioning).
2. **Capacity intelligence improvements** (hiring gap, leave-based tuning).
3. **Targeted UX cleanup** (navigation/search/org-chart depth).

### Divergence to resolve

1. **AI priority direction**:
   - Claude: generative outputs first (gantt/org chart/excel/image-to-architecture).
   - Gemini: monitoring/analysis AI first (alignment and risk agents).
   - Codex: planning workflow + constraints + reporting first.

**Synthesis decision**: In this phase, ship **AI monitoring and planning-assist** as must-have; keep heavier generative AI items as stretch.

---

## Phase Scope

### In scope

1. Goal engine + lifecycle management.
2. Data liquidity: export/import + versioned plan snapshots.
3. Scheduling and capacity intelligence improvements.
4. High-impact UX fixes that unblock usage.
5. AI copilots for alignment and risk detection.
6. Contract-safe refactors needed to support the above.

### Out of scope (for this phase)

1. React/Rails replatforming.
2. Multi-user auth/collaboration backend.
3. AppStore/multi-tenant model.

---

## 6-Week Delivery Plan

## Sprint 1 (Weeks 1-2): Goals Engine + UX Unblockers

### Workstream A: Goal Lifecycle Core

**Deliverables**

1. Implement goal status matrix in `GoalService`:
   - status derived from target vs planned dates and initiative completion/slippage
   - consistent health labels and explanations
2. Propagate initiative status changes to goal health recalculation.
3. Add Goal Management workflow (CRUD + lifecycle controls) in management UI.
4. Align dashboard goal widgets to same status source-of-truth.

**Acceptance criteria**

1. Goal status changes automatically after initiative edits.
2. Dashboard and management view always display matching goal health.
3. Unit tests cover matrix rules and propagation scenarios.

### Workstream B: Immediate UX Fixes

**Deliverables**

1. Fix “Manage Themes” navigation route target.
2. Add initiatives search in management.
3. Improve org-chart rendering by depth level.
4. Add roadmap filters needed for discoverability (goal/status filters where currently missing).

**Acceptance criteria**

1. All navigation paths land on intended view/tab.
2. Initiative search supports quick narrowing and reset.
3. Org chart depth is visually differentiable and stable across reload.
4. Cypress checks cover key flows above.

---

## Sprint 2 (Weeks 3-4): Data Liquidity + Planning Portability

### Workstream C: Export/Import + Schema Safety

**Deliverables**

1. Add full system JSON export/import with explicit schema version metadata.
2. Validate import compatibility and migration path for older versions.
3. Add user-safe import behavior (validation errors are non-destructive and visible).

**Acceptance criteria**

1. Round-trip export/import reproduces system state without silent loss.
2. Import rejects incompatible payloads with clear diagnostics.
3. Automated tests cover versioned import paths.

### Workstream D: Year Plan Versioning + Interop

**Deliverables**

1. Snapshot versioning for year plans (keep latest 5 versions).
2. Ability to load prior versions read-only, then clone for edits.
3. Year Plan export to CSV and XLSX (values baseline, formulas optional if low risk).

**Acceptance criteria**

1. Users can create/retrieve snapshots consistently.
2. No overwrite of active plan unless explicit action.
3. Exported files open correctly in spreadsheet tools.

### Enabler Refactor (required in Sprint 2)

1. Continue/refine `YearPlanningView` MVC decomposition to prevent monolith growth.
2. Complete `InitiativeAdd`/`InitiativeEdit` unification to reduce duplicate logic.

---

## Sprint 3 (Weeks 5-6): Scheduling, Capacity, and AI Chief of Staff

### Workstream E: Scheduling and Capacity Intelligence

**Deliverables**

1. Add work package dependencies and dependency-aware scheduling logic.
2. Add auto-schedule mode with conflict highlighting in planning/Gantt workflows.
3. Add team-filtered plan view (“My Team” / selected team planning focus).
4. Add hiring gap KPI and fix capacity sink logic for open positions.
5. Add leave-calendar inputs to improve capacity tuning.

**Acceptance criteria**

1. Schedule recalculates deterministically from dependencies/capacity assumptions.
2. Conflicts are surfaced, not silently ignored.
3. Hiring gap KPI and sink logic align with expected planning math.
4. Team-filtered views preserve totals and traceability.

### Workstream F: AI Alignment and Risk Copilots

**Must-ship AI**

1. Alignment analysis: identify initiatives not mapped to goals.
2. Risk analysis: detect goals at risk due to initiative slippage/dependency delays.

**Stretch AI (only if schedule permits)**

1. AI-generated gantt/organogram artifacts.
2. Enhanced Excel export with richer formula scaffolding.

**Acceptance criteria**

1. AI outputs are explainable with referenced entities (goal IDs, initiative IDs, dates).
2. AI suggestions can be actioned from existing planning workflows.
3. Graceful fallback behavior exists when AI calls fail.

---

## Prioritization Framework

### Must Ship (phase exit blockers)

1. Goal status engine + lifecycle management UI.
2. Data export/import with schema versioning.
3. Plan snapshots (latest 5) + load previous version.
4. Dependency-aware scheduling baseline + conflict visibility.
5. Hiring gap KPI + corrected sink logic.
6. Critical UX fixes (themes navigation, initiative search, org-chart depth).

### Should Ship (high value, not phase blocker)

1. Team-filtered planning view.
2. XLSX export with improved formatting/formulas.
3. AI alignment + risk agents (at least baseline quality).

### Stretch

1. AI-generated gantt/organogram advanced outputs.
2. Architecture-from-image and other heavier generative features.

---

## Quality, Contracts, and Test Strategy

1. Keep business logic in services; keep views DOM-only.
2. Preserve contract constraints: no inline HTML strings/styles, no new global `window.*` usage (except approved entry point), theme variable compliance.
3. For each delivered feature:
   - Unit tests for service rules (goal matrix, scheduling, serialization/versioning).
   - Cypress regression for critical UI flows (goal management, filters, snapshots, export triggers).
4. Add migration/compatibility tests for import schema versions.
5. Ensure new/changed views maintain AI context registration paths.

---

## Phase Risks and Mitigations

1. **Risk**: Year planning complexity grows faster than expected.  
   **Mitigation**: Treat MVC refactor as prerequisite for versioning and scheduling extensions.

2. **Risk**: Export/import introduces data corruption scenarios.  
   **Mitigation**: Versioned schema, strict validation, round-trip automated tests, non-destructive import flow.

3. **Risk**: Scheduling rules become over-engineered.  
   **Mitigation**: Ship deterministic MVP first (dependencies + capacity constraints), then iterate.

4. **Risk**: AI features consume too much sprint capacity.  
   **Mitigation**: Prioritize analytic copilots; defer heavier generative features to stretch.

---

## Exit Gate (End of Week 6)

Phase is successful when all items below are true:

1. Goals are operationally managed (not metadata-only) with reliable status propagation.
2. Users can safely export/import the full system and recover prior year plan snapshots.
3. Planning supports dependency-aware scheduling and visible conflict detection.
4. Capacity insights include hiring-gap signal and corrected sink assumptions.
5. Critical UX blockers are removed.
6. Test coverage for new core logic is present and stable.

---

## Migration Re-evaluation Trigger (After This Phase)

Re-open React/Rails migration only if, after this phase, at least 3 are true:

1. Delivery velocity is constrained by current view architecture.
2. Maintainability cost is rising despite refactors.
3. Performance/rendering issues are persistent in core workflows.
4. Team composition requires framework standardization.
5. Product strategy explicitly requires backend-first multi-user capabilities.

Until then, the highest ROI remains feature completion and execution intelligence on current architecture.

---

## Appendix A: Backlog Coverage Tracker (TO DO Reconciliation)

**Source scope**: `Backlog.txt` TO DO section (`lines 230-307`)  
**Last reconciled**: February 7, 2026

### Coverage legend

1. **Covered**: explicitly planned in this 6-week recommendation.
2. **Partial**: direction included, but backlog detail is not fully specified.
3. **Deferred**: intentionally out of scope for this phase.
4. **Missing**: not represented in this plan; requires explicit prioritization.

### Execution status legend

1. **Planned**
2. **In Progress**
3. **Done**
4. **Dropped**

| ID    | Backlog item                                             | Backlog ref       | Coverage | Phase bucket       | Execution status | Tracking note                                                                                    |
| ----- | -------------------------------------------------------- | ----------------- | -------- | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------ |
| BL-01 | Manage Themes navigation bug                             | `Backlog.txt:230` | Covered  | Sprint 1           | Planned          | In Workstream B UX fixes.                                                                        |
| BL-02 | Login/Registration via Cloudflare                        | `Backlog.txt:232` | Deferred | Post-phase         | Planned          | Explicitly out of scope in this phase.                                                           |
| BL-03 | Start detailed planning features                         | `Backlog.txt:234` | Covered  | Sprint 3           | Planned          | Scheduling/capacity workstreams.                                                                 |
| BL-04 | AI diagram agents for gantt/organogram                   | `Backlog.txt:235` | Partial  | Stretch            | Planned          | Included as stretch AI only.                                                                     |
| BL-05 | AI agent performing system actions with code access      | `Backlog.txt:236` | Deferred | Later phase        | Planned          | This phase focuses on planning/risk copilots, not code-modifying agents.                         |
| BL-06 | Backlog status filter in quarterly roadmap and 3YP       | `Backlog.txt:238` | Covered  | Sprint 1           | Planned          | Included under roadmap discoverability filters.                                                  |
| BL-07 | Hiring gap KPI + sink calculation fix                    | `Backlog.txt:239` | Covered  | Sprint 3           | Planned          | Included in capacity intelligence deliverables.                                                  |
| BL-08 | Org chart by depth                                       | `Backlog.txt:240` | Covered  | Sprint 1           | Planned          | Included in UX unblockers.                                                                       |
| BL-09 | Initiatives search in management                         | `Backlog.txt:241` | Covered  | Sprint 1           | Planned          | Included in UX unblockers.                                                                       |
| BL-10 | Refactor add/edit initiative to common component         | `Backlog.txt:242` | Covered  | Sprint 2           | Planned          | Explicit Sprint 2 enabler refactor.                                                              |
| BL-11 | Year Planning MVC refactor                               | `Backlog.txt:243` | Covered  | Sprint 2           | Planned          | Explicit Sprint 2 enabler refactor.                                                              |
| BL-12 | Goal tracking status matrix and propagation rules        | `Backlog.txt:245` | Covered  | Sprint 1           | Planned          | Core Goal Lifecycle workstream.                                                                  |
| BL-13 | Goal status pills in goals list                          | `Backlog.txt:266` | Partial  | Sprint 1           | Planned          | Implied by lifecycle UI, not explicitly called out as a separate UI task.                        |
| BL-14 | Goals drop-down filter in roadmap/3YP                    | `Backlog.txt:267` | Covered  | Sprint 1           | Planned          | Included in roadmap filters.                                                                     |
| BL-15 | Goals lifecycle management interface                     | `Backlog.txt:268` | Covered  | Sprint 1           | Planned          | Explicit Goal Management workflow.                                                               |
| BL-16 | Capacity tuning with leave calendars                     | `Backlog.txt:270` | Covered  | Sprint 3           | Planned          | Included in capacity intelligence deliverables.                                                  |
| BL-17 | Intelligent scheduling with resources and auto end dates | `Backlog.txt:271` | Covered  | Sprint 3           | Planned          | Dependency-aware auto-scheduling included.                                                       |
| BL-18 | AI system prompt enrichment for planning metadata        | `Backlog.txt:272` | Missing  | Unassigned         | Planned          | Not explicitly planned in this phase.                                                            |
| BL-19 | LLM-driven Excel export with formulas                    | `Backlog.txt:273` | Partial  | Sprint 2 + Stretch | Planned          | XLSX export included; LLM-driven formula layer is stretch.                                       |
| BL-20 | Reusable export utility across views                     | `Backlog.txt:275` | Partial  | Sprint 2           | Planned          | Export direction included; shared utility implementation not explicit.                           |
| BL-21 | Top-level "Export System" JSON/CSV/Excel menu            | `Backlog.txt:279` | Partial  | Sprint 2           | Planned          | Full JSON export/import explicit; CSV/XLSX system-wide export needs explicit scope confirmation. |
| BL-22 | View planning by team                                    | `Backlog.txt:282` | Covered  | Sprint 3           | Planned          | Explicit team-filtered planning view.                                                            |
| BL-23 | Managers tune team estimates                             | `Backlog.txt:283` | Partial  | Sprint 3           | Planned          | Team planning focus included; estimate editing workflows not explicit.                           |
| BL-24 | Plan versioning (keep last 5)                            | `Backlog.txt:284` | Covered  | Sprint 2           | Planned          | Explicit snapshot versioning requirement.                                                        |
| BL-25 | Export plan to CSV/Excel                                 | `Backlog.txt:285` | Covered  | Sprint 2           | Done             | Year Plan CSV/XLSX export delivered via toolbar actions and export payload serialization.        |
| BL-26 | Outgoing away-team concept                               | `Backlog.txt:288` | Missing  | Unassigned         | Planned          | No explicit mention in this phase.                                                               |
| BL-27 | AI-generated delivery plan (gantt) per team              | `Backlog.txt:291` | Partial  | Stretch            | Planned          | AI gantt work is stretch only.                                                                   |
| BL-28 | AI recurring tasks for initiative status updates         | `Backlog.txt:292` | Missing  | Unassigned         | Planned          | Not included in this phase.                                                                      |
| BL-29 | AI-generated graphs not currently rendered               | `Backlog.txt:293` | Missing  | Unassigned         | Planned          | Not included in this phase.                                                                      |
| BL-30 | AI create system from architecture image                 | `Backlog.txt:294` | Partial  | Stretch            | Planned          | Included as stretch only.                                                                        |
| BL-31 | Self-generating code contributions                       | `Backlog.txt:296` | Deferred | Later phase        | Planned          | Out of scope due risk and governance needs.                                                      |
| BL-32 | Create new system from chat panel (AI wizard)            | `Backlog.txt:297` | Missing  | Unassigned         | Planned          | Not explicitly in this recommendation.                                                           |
| BL-33 | Export plan to Excel or Project                          | `Backlog.txt:298` | Partial  | Sprint 2           | Planned          | Excel included; MS Project export not scoped.                                                    |
| BL-34 | AI detailed quarterly release plan by team               | `Backlog.txt:299` | Missing  | Unassigned         | Planned          | Not explicitly planned.                                                                          |
| BL-35 | AI team merge/reorg action flows                         | `Backlog.txt:300` | Missing  | Unassigned         | Planned          | Not explicitly planned in this phase.                                                            |
| BL-36 | AppStore feature for sharing systems                     | `Backlog.txt:301` | Deferred | Post-phase         | Planned          | Explicitly out of scope this phase.                                                              |
| BL-37 | Internal app API for agent creation                      | `Backlog.txt:302` | Deferred | Later phase        | Planned          | Not part of current execution-focused phase.                                                     |
| BL-38 | Refactor for cleaner separation/portability              | `Backlog.txt:303` | Partial  | Continuous         | Planned          | Included as contract-safe refactors where needed.                                                |
| BL-39 | Explore BaaS for API key integrations                    | `Backlog.txt:304` | Deferred | Post-phase         | Planned          | Backend/platform exploration deferred.                                                           |
| BL-40 | Work with other LLM providers                            | `Backlog.txt:306` | Missing  | Unassigned         | Planned          | Not represented in this plan.                                                                    |
| BL-41 | Backend proxy for AI image generation                    | `Backlog.txt:307` | Missing  | Unassigned         | Planned          | Requires backend and secret management; not in this phase plan.                                  |

### Weekly backlog tracking cadence

1. Update `Execution status` for each row every Friday.
2. Move any row blocked for 2+ weeks into a risk list with owner and unblock date.
3. Promote one `Missing` or `Deferred` row only when a `Sprint` row is completed or dropped.
4. Keep `Must Ship` rows (BL-01, BL-06 to BL-12, BL-14 to BL-17, BL-24, BL-25) above all `Partial` and `Missing` rows.
