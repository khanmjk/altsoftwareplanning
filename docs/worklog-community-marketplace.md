# Worklog: Community Blueprints Marketplace (Cloud)

Purpose: Persistent execution journal for the cloud-backed marketplace so future AI agents (or humans) can resume without re-deriving context.

Format: `YYYY-MM-DD HH:MM TZ - Entry`

---

## 2026-02-08

- 07:35 SAST - Initiated cloud marketplace extension. Confirmed product decisions: GitHub OAuth, auto-approve low-risk, monotonic versions, token-based search in D1 to stay free-tier friendly.
- 07:36 SAST - Contract alignment audit: reviewed `docs/coding-agent-contract.md` and `scripts/contract-scan.js`. Key constraints: no extra `.html` files, no `localStorage` outside `SystemRepository`, no `window.*` assignments outside `js/main.js`, no inline HTML APIs.
- 07:37 SAST - Prepared documentation scaffolding: added `docs/appstore-lite/community-marketplace-cloud.md` as the cloud spec (requirements + architecture + data model + API + auth flow).
- 07:38 SAST - Next implementation milestones queued:
  - Add `smt-blueprints-worker/` (Cloudflare Worker + D1 + R2) with GitHub OAuth and marketplace APIs.
  - Add app services for auth + marketplace fetch/publish; integrate into `CommunityBlueprintsView` with stars/comments and public publish button.
  - Add full-package secret scanning (manifest + system) with hard-fail for public publish.
  - Update README + AppStore-lite spec to reflect cloud sharing.
- 08:10 SAST - Implemented `smt-blueprints-worker/` (Worker + D1 + R2): OAuth popup flow (`/api/auth/github/start|callback`), publish endpoint with monotonic versions, catalog/search, package fetch, stars, comments, auto-approve heuristic, and server-side secret scanning.
- 08:20 SAST - Added app-side marketplace clients: `js/services/MarketplaceAuthService.js` (postMessage token session) and `js/services/BlueprintMarketplaceService.js` (catalog/detail/package/publish/star/comment).
- 08:30 SAST - Integrated cloud marketplace into `js/components/CommunityBlueprintsView.js`: merged local + remote catalog, added sort options, enabled remote install, added “Publish Publicly” with GitHub sign-in/out, and added preview discussion (stars + comments).
- 08:40 SAST - UX polish: added social/comment styling in `css/views/community-blueprints-view.css`.
- 08:45 SAST - Safety hardening: updated `js/services/BlueprintPackageService.js` to scan manifest + system payload for secret-like values; warning for local flows, hard-fail for public publish via `failOnSecrets` option (wired from `CommunityBlueprintsView`).
- 08:46 SAST - Added unit coverage for full-package secret scanning in `tests/services/blueprintPackageService.test.js`.
- 08:47 SAST - Verification pass: `npm run lint`, `npm run stylelint`, `npm run contract:check`, and `npm test` all passing.
- 08:55 SAST - Aligned marketplace integration with existing worker patterns: canonical worker endpoint in code (no user-facing Settings override). Added session invalidation when stored worker origin mismatches canonical origin (`MarketplaceAuthService`).
- 09:10 SAST - Cloudflare storage alignment: removed mandatory R2 dependency (account R2 not enabled) by adding D1 chunk blob storage (`blueprint_package_chunks`) with automatic R2->D1 fallback and updating `wrangler.toml` accordingly.
- 09:25 SAST - Cloudflare deployment: applied schema to remote D1 (`wrangler d1 execute --remote`) and deployed `smt-blueprints-worker` to workers.dev. Set `JWT_SECRET` via CLI. OAuth secrets (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) still pending.
- 13:10 SAST - Extended worker CORS allowlist (`ALLOWED_APP_ORIGINS`) to include VSCode Live Server origin `http://127.0.0.1:5501` for local browser testing.
- 13:20 SAST - GitHub OAuth secrets set on the worker via CLI (`wrangler secret put GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET`) and verified via `wrangler secret list` (also `JWT_SECRET` present).
- 13:25 SAST - Publish attempt failed; `wrangler tail` showed `D1_ERROR: FOREIGN KEY constraint failed` during `/api/publish` DB writes.
- 13:30 SAST - Publish hardening: added `requestId` + `code` to publish error responses and improved app toast to include `(code, ref: requestId)` + `console.error(...)` for actionable debugging.
- 13:31 SAST - Fixed publish FK ordering: on new blueprint publish insert `blueprints` row before inserting `blueprint_versions` (and before search-token refresh), all within a single D1 `batch`.
- 13:32 SAST - Redeployed `smt-blueprints-worker` (`wrangler deploy`). Deployed Version ID: `36d2c21a-2e23-43e7-8870-9c4be5ef89c3`.
