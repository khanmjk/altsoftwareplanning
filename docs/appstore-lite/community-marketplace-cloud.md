# Community Blueprints Marketplace (Cloud) - Requirements + Design

Last updated: 2026-02-08
Owner: SMT Product + Engineering
Status: MVP implemented + worker deployed (D1 + JWT + GitHub OAuth).

This document extends the local-first Community Blueprints Exchange into a true community marketplace:

- Contributors publish blueprint _packages_ to a public cloud catalog.
- Anyone can browse/search, star, comment, and install packages into their local workspace.
- Local systems remain local by default; only explicitly published artifacts are uploaded.

This approach avoids forcing full workspace sync/auth immediately while still enabling real sharing.

---

## 1. Decisions (Confirmed)

1. Identity: GitHub OAuth (Cloudflare Worker as the OAuth callback host).
2. Moderation: auto-approve for low-risk accounts; otherwise pending review.
3. Versioning: monotonically increasing version numbers per blueprint.
4. Search: normalized, token-based search in D1 (no paid vector search; free-tier friendly).

---

## 2. Goals / Non-Goals

### Goals

- True community sharing: publish -> global discovery -> install.
- “Cool” social loop: stars + comments + trending discovery.
- Maintain local-first UX: app must work offline with curated + local drafts.
- Strong safety: secret scanning (manifest + system payload) blocks public publishing.
- Free-tier friendly: Cloudflare Workers + D1 + optional R2; avoid paid search/analytics.

### Non-Goals (Initial)

- Private/paid marketplaces.
- Real-time moderation dashboards.
- Full multi-device workspace sync (systems remain local).
- ML ranking, embeddings, or vector search.
- Notifications/email digests (would likely incur costs).

---

## 3. Architecture

### Components

- SMT App (static HTML/JS) - unchanged hosting model.
- Cloudflare Worker API: `smt-blueprints-worker`
- Cloudflare D1: metadata + social + moderation state + package blobs (chunked storage)
- Optional Cloudflare R2: blueprint package JSON blobs (if enabled)

### Canonical Endpoint (No User Settings)

To match existing SMT worker patterns (e.g. feedback proxy), the marketplace uses a **single canonical worker endpoint** baked into:

- `js/services/MarketplaceAuthService.js`
- `js/services/BlueprintMarketplaceService.js`

There is **no user-facing Settings override** for the worker URL.

Current canonical endpoint (as shipped): `https://smt-blueprints-worker.khanmjk.workers.dev`

### Why R2 (optional)

Blueprint packages can be large. R2 keeps D1 lean.

However, the marketplace is designed to work on the free tier even without R2 by storing package JSON in D1 as **ordered chunks** (`blueprint_package_chunks`).

---

## 4. Data Model (D1)

### 4.1 Users

- `users`
  - `id` (text, uuid)
  - `github_id` (text, unique)
  - `handle` (text, unique)
  - `display_name` (text)
  - `avatar_url` (text)
  - `created_at` (text iso)
  - `risk_level` (text: `low|unknown|high`)
  - `auto_approve` (integer 0/1)

### 4.2 Blueprints + Versions

- `blueprints`

  - `blueprint_id` (text, PK)
  - `title` (text)
  - `summary` (text)
  - `category` (text)
  - `tags_csv` (text)
  - `trust_label` (text)
  - `source_type` (text)
  - `author_user_id` (text)
  - `status` (text: `pending|approved|removed|rejected`)
  - `latest_version_id` (text)
  - `latest_version_number` (integer)
  - `stars_count` (integer)
  - `downloads_count` (integer)
  - `comments_count` (integer)
  - `created_at` (text iso)
  - `updated_at` (text iso)

- `blueprint_versions`
  - `version_id` (text, uuid, PK)
  - `blueprint_id` (text)
  - `version_number` (integer)
  - `status` (text: `pending|approved|removed|rejected`)
  - `manifest_json` (text)
  - `package_r2_key` (text)
  - `package_size_bytes` (integer)
  - Remix lineage:
    - `parent_blueprint_id` (text, nullable)
    - `parent_version_id` (text, nullable)
  - Derived metrics:
    - `teams_count`, `services_count`, `goals_count`, `initiatives_count`, `work_packages_count` (integer)
  - `created_at` (text iso)
  - `published_by_user_id` (text)

### 4.2.1 Package Blobs (D1 Chunk Storage)

If R2 is not bound/enabled, package JSON is stored in D1 as ordered chunks:

- `blueprint_package_chunks`
  - `version_id` (text)
  - `chunk_index` (integer)
  - `chunk_text` (text)

### 4.3 Search Tokens

To keep search free-tier friendly and portable, we store tokens (no paid search).

- `blueprint_search_tokens`
  - `blueprint_id` (text)
  - `token` (text)

Query strategy:

- Tokenize the query into N tokens.
- Find blueprint IDs that contain _all_ tokens via `GROUP BY/HAVING`.
- Join back to `blueprints` for filters + sort.

### 4.4 Social

- `stars`

  - `user_id` (text)
  - `blueprint_id` (text)
  - `created_at` (text iso)
  - unique `(user_id, blueprint_id)`

- `comments`
  - `comment_id` (text, uuid, PK)
  - `blueprint_id` (text)
  - `version_id` (text, nullable)
  - `user_id` (text)
  - `body` (text)
  - `status` (text: `visible|removed`)
  - `created_at` (text iso)

---

## 5. API (Worker)

Read:

- `GET /api/catalog?query=&category=&trustLabel=&sourceType=&sort=&cursor=&limit=`
- `GET /api/blueprints/:blueprintId`
- `GET /api/blueprints/:blueprintId/comments?cursor=&limit=`
- `GET /api/blueprints/:blueprintId/package?versionNumber=latest|<n>`
- `GET /api/availability?ids=bp-001-...` (optional optimization for curated unlock)

Auth:

- `GET /api/auth/github/start?origin=<appOrigin>`
- `GET /api/auth/github/callback?code=...&state=...`
- `GET /api/me` (requires bearer token)

Write (requires bearer token + rate limits; Turnstile optional later):

- `POST /api/publish`
- `POST /api/blueprints/:blueprintId/star`
- `DELETE /api/blueprints/:blueprintId/star`
- `POST /api/blueprints/:blueprintId/comments`
- `POST /api/reports` (optional in MVP)

---

## 6. Auth UX (SPA-friendly)

Because many browsers restrict third-party cookies, the app should not rely on cross-site cookies.

Instead:

1. App opens a popup to `GET /api/auth/github/start?origin=<appOrigin>`.
2. GitHub redirects to Worker callback.
3. Worker callback returns a small HTML response that:
   - uses `window.opener.postMessage(...)` to send a signed session token to the app
   - closes the popup
4. App stores the session token in `systemRepository` UI preferences and uses it in:
   - `Authorization: Bearer <token>`

---

## 7. Moderation + Auto-Approve (Low-Risk)

Auto-approve is applied when the account is “low-risk”, e.g.:

- GitHub account age >= 30 days
- public repos >= 1
- and no prior removals/rejections recorded in D1

Otherwise publish enters `pending` status.

---

## 8. Package Safety (Secrets)

Public publishing must fail if secret-like strings are detected anywhere in the package:

- manifest
- system payload (including `attributes`, service metadata, etc.)

Implementation:

- Client-side check (fast feedback)
- Server-side check (authoritative)

The Worker must reject the publish request if it detects secret-like patterns.

---

## 9. Free-Tier Guardrails

- Default `limit` for catalog endpoints (e.g. 30).
- Cache hot catalog pages in KV (optional).
- Keep D1 queries simple and indexed.
- Store package blobs in D1 chunk rows by default; optionally store in R2 if enabled.
- Enforce max package size (e.g. 2 MB) to keep storage + transfer predictable.

---

## 10. Community Features (Best-Practice Inspired, Free-Tier)

Implemented (MVP):

- Stars: lightweight “bookmark” and social proof.
- Comments: short discussion thread per blueprint (keep it simple and cheap).
- Trending: sort option based on activity signals (stars, downloads, recency).
- Trust labels: `Verified|Community|Experimental`.
- Low-risk auto-approve to reduce friction for legitimate contributors.

Planned (Phase 2+):

- Remix lineage: “Forked from …” and “Remixes” list (requires `parent_*` fields to be populated).
- Lightweight contributor reputation: “Contributor” badge for approved publishes; “Trusted” for repeated good behavior.
- Reporting/flagging: user can report spam/abuse; hides content pending review.
- Collections: curated playlists (“Backends 101”, “B2B SaaS starters”) as simple DB rows.

---

## 11. UX + Attribution (Worker Model Clarity)

### Marketplace Worker (This Feature)

- GitHub is used for **identity only** (OAuth scope: `read:user`).
- Social actions (publish, stars, comments) are stored in **D1** and attributed to the user’s GitHub handle in the SMT UI.
- The worker does **not** create GitHub issues/PRs/comments on behalf of the user or the app owner.

Implication: users get credited inside the marketplace UX, but the activity does not appear on GitHub.

### Feedback Worker (Existing Feature)

- The feedback worker creates GitHub issues using the **app owner’s GitHub token** (server-side).
- This is intentional to keep feedback **low-friction** (no sign-in required), but it means issues appear as created by the owner/bot.

If we want feedback issues to be created “as the user”, we would need an additional GitHub OAuth flow with write scopes (e.g. `public_repo`) and higher UX/security overhead. A cheaper middle-ground is: when the user is already signed into the marketplace, include their GitHub handle in the feedback payload and issue body as “reported by @handle”.

---

## 11.1 Where Social Features Live In The UI (MVP)

- Stars + comments are accessible from the **Blueprint Preview modal** (open a catalog card, click **Preview**).
- The catalog cards display lightweight social counts (stars/comments/downloads) for marketplace-published items.

---

## 12. Testing Matrix (Local Dev vs GitHub Pages)

### Local Dev Server (VSCode / localhost)

Works (no cloud required):

- Community Blueprints local-first UX: browse curated catalog, search/filter/sort, preview, install, update/open installed.
- “Contribute with AI” flow (requires user’s AI provider key/config).
- Local publish/export: download a blueprint package JSON file.

Works (cloud, read-only):

- Remote catalog merge (shows community-published items alongside curated/local), remote blueprint detail, remote package fetch/install.
- Note: for consistent browser behavior, serve the app over an origin included in the worker `ALLOWED_APP_ORIGINS` (for example VSCode Live Server on `http://127.0.0.1:5501`).

Works (cloud, write):

- GitHub sign-in popup, public publish, stars, comments.
- Requires worker secrets to be set: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`.

### GitHub Pages (HTTPS)

Works:

- All local-first Community Blueprints features (curated + local installs).
- Feedback submission via `smt-feedback-worker` (issues created by maintainer/bot token).

Works only after allowlisting the Pages origin:

- Any marketplace worker calls from the browser (read or write) require `ALLOWED_APP_ORIGINS` to include the Pages origin, e.g. `https://khanmjk.github.io` (origin is scheme + host, not the repo path).

Works only after OAuth secrets are configured:

- GitHub sign-in popup, public publish, stars, comments (same requirement as local).

Suggested release gate:

- `npm test`, `npm run lint`, `npm run stylelint`, `npm run contract:check`, `npm run test:e2e`
- Manual smoke: install a curated blueprint, publish a local system publicly, verify it appears in remote catalog, star/comment, and install it in a fresh browser profile.

Troubleshooting:

- If public publish fails, the app toast should include an error `code` and `ref` (requestId). Keep `wrangler tail` running and search logs for the same `requestId` to see the server-side reason without leaking DB details to end-users.

Design principles taken from successful contribution platforms:

- Reduce publishing friction (1-click publish after validation).
- Put social proof where it matters (catalog cards + preview metadata).
- Reward contributions with visible status (badges, author handle, “Top contributors”).
- Make abuse expensive (rate limits, auto-approve only for low-risk, reporting).

---

## 11. Implementation Plan (Phased)

### Phase 0: Foundations (Repo + Contracts)

- Add backend folder `smt-blueprints-worker/` and keep it dependency-free.
- Enforce contracts: no extra `.html` files, no direct `localStorage`, no `window.*` assignment outside `js/main.js`.

### Phase 1: Marketplace Backend (Worker + D1 + R2)

- GitHub OAuth popup flow:
  - `/api/auth/github/start`
  - `/api/auth/github/callback` returns inline HTML that `postMessage`s a JWT to the opener.
- D1 schema for:
  - users, blueprints, versions, stars, comments, search tokens
- Publish API:
  - `POST /api/publish`
  - enforce monotonic versions per blueprint
  - secret scanning server-side (authoritative) and max size caps
- Catalog + search:
  - `GET /api/catalog` with filters and token search
- Package fetch:
  - `GET /api/blueprints/:id/package` reads from R2 and increments downloads
- Social:
  - `POST/DELETE /api/blueprints/:id/star`
  - `GET/POST /api/blueprints/:id/comments`

### Phase 2: App Integration (Local-First + Cloud Optional)

- Add `MarketplaceAuthService` (session token in UI prefs).
- Add `BlueprintMarketplaceService` (catalog/detail/package/publish/social).
- Extend `CommunityBlueprintsView`:
  - merge local catalog + remote marketplace metadata
  - install from marketplace package when available
  - add “Publish Publicly” button + GitHub sign-in/out
  - show social stats and discussion in preview

### Phase 3: Safety and Moderation Hardening

- Client-side secret scanning across full package (manifest + system):
  - warn for local publish/download/install
  - hard-fail for public publish
- Moderation queue (basic):
  - `pending` blueprints not shown in public catalog
  - optional admin endpoints for approve/reject/remove (future)
- Abuse controls:
  - per-IP and per-user rate limits (publish/comment/star)
  - content length caps

### Phase 4: UX Polish + Docs

- Do not expose worker endpoint in Settings. Use a canonical marketplace worker URL in code (same pattern as `FeedbackService`). (implemented)
- Update README + spec docs:
  - local exchange vs public marketplace
  - deployment instructions for worker
  - clear privacy statement (systems remain local unless published)

---

## 12. Current Implementation Status (This Repo)

Backend (`smt-blueprints-worker/`):

- Implemented: OAuth, publish, catalog, package fetch, stars, comments, token search, auto-approve heuristic, secret scanning.
- Pending: admin moderation UI/endpoints, reporting, remix lineage population.

App:

- Implemented: marketplace auth + API service clients, remote catalog merge, public publish button, marketplace install, stars/comments UI.
- Implemented: canonical marketplace worker endpoint in code (no per-user Settings overrides).
