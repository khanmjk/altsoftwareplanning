# AppStore-lite Use Case Journey and App Integration

Purpose: canonical journey description for README and product documentation updates.

Status: Implemented (MVP baseline with launch-wave availability)
Last updated: 2026-02-07

Related:

- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/AppStoreLiteBlueprintExchangeFeatureSpec.md`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/managers/NavigationManager.js`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/components/SidebarComponent.js`
- `/Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/components/SystemsView.js`

---

## 1. Primary Use Case

A learner, founder, manager, or educator wants to explore how a known product category (for example, a rideshare platform) could be architected and delivered over three years, then adapt and share that blueprint with the community.

---

## 2. End-to-End User Journey

### Journey A: Browse and Install a Community Blueprint

1. User opens the new `Community Blueprints` page (`communityBlueprintsView`).
2. User searches and filters by category, complexity, stage, tags, and trust label.
3. User opens a blueprint preview.
4. Preview shows:

- system summary (services, teams, goals, roadmap scope)
- prompt pack (seed prompt plus variants, for example `MVP`, `Scale`, `Enterprise`)
- trust label (`Verified`, `Community`, `Experimental`)
- availability status (`Available` or `Needs Contribution`)

5. If status is `Available`, user clicks `Install Blueprint`.
6. Blueprint is imported as a local system copy.
7. User is routed to `My Systems` (`systemsView`) or immediately loads the installed system.

### Journey A2: Contribute to Unlock a Curated Blueprint

1. User opens a curated blueprint with status `Needs Contribution`.
2. User clicks `Contribute Package` in preview.
3. Publish flow opens and targets that curated blueprint ID.
4. User selects a local system, reviews prompt metadata, and publishes the package locally.
5. The curated entry becomes installable in that workspace.

### Journey B: Learn and Remix in Core SMT Pages

1. User loads the installed blueprint from `My Systems`.
2. User explores the blueprint through existing pages:

- `System Overview` (`visualizationCarousel`)
- `Org Design` (`organogramView`)
- `Roadmap & Backlog` (`roadmapView`)
- `Management` (`managementView`)
- `Year Plan` (`planningView`)
- `Detailed Planning` (`ganttPlanningView`)
- `Dashboard` (`dashboardView`)

3. User modifies architecture, org, goals, initiatives, and plan details.
4. User saves remix as normal local system data.

### Journey C: Publish a Local System Back to Community

1. User selects `Publish System` from `My Systems` or active system actions.
2. Publish wizard captures:

- title, summary, category, tags, learning outcomes
- prompt provenance (seed prompt and optional variants)
- trust target and metadata

3. System and manifest are validated.
4. User exports/submits blueprint package.
5. Submission enters community catalog workflow with trust status.

---

## 3. Blueprint Source Model (Answer to Key Question)

### 3.1 Where do blueprints come from?

They come from three sources:

1. Curated pre-generated blueprints shipped by SMT maintainers.
2. Community-published blueprints from user local systems.
3. Optional user-generated blueprints created via `Create with AI`.

### 3.2 Is user API key required to browse and install?

No. Browsing and installing curated/community blueprints should not require an LLM API key.

### 3.3 Is SMT pre-generating the Top-100?

Partially at launch. The Top-100 catalog is curated, but installability is launch-wave based:

1. Launch wave: 25 prebuilt packages are shipped and marked `Available`.
2. Remaining curated entries start as `Needs Contribution`.
3. Contributions published against those curated blueprint IDs unlock local installability.

### 3.4 When is user API key required?

User API key is only required when the user wants to:

1. Generate a brand-new system with `Create with AI`.
2. Regenerate or extend a blueprint using prompt variants inside AI generation workflows.

### 3.5 Why keep prompt pack in pre-generated blueprints?

Even pre-generated blueprints include prompt provenance to preserve educational value and allow transparent remixing.

---

## 4. Integration with Existing App Navigation

Current main views remain unchanged. AppStore-lite adds a discovery/publish surface that feeds existing planning and modeling flows.

### 4.1 New View

1. Add `communityBlueprintsView` to navigation registry and sidebar.
2. View is accessible without active system loaded.

### 4.2 Existing Views Reused

1. `systemsView` remains the local system library.
2. `SystemService.importFromJson` remains install/import engine.
3. Existing planning and management pages remain the execution workspace after install.

### 4.3 Existing AI Path Stays Optional

1. `Create with AI` in `systemsView` continues to be BYOK.
2. AppStore-lite install path is independent from BYOK.

---

## 5. UX Promise

1. New users can get to a high-quality example in under 5 minutes without API setup.
2. Advanced users can still generate custom systems with their own API key.
3. Community value grows through local remix and publish loops.

---

## 6. Documentation Reuse Snippet (for README)

Use this wording in README:

"Community Blueprints lets you browse and install pre-generated, curated system templates (with prompt packs) without needing an API key. If you want to generate new systems or regenerate variants, enable `Create with AI` using your own API key. Any local system can be remixed and published back to the community catalog."
