# SMT Blueprints Marketplace Worker

Cloudflare Worker that powers the Community Blueprints Marketplace:

- GitHub OAuth login (SPA-friendly popup flow)
- Remote catalog browse/search
- Public publish of blueprint packages (stored as blobs)
- Social: stars + comments
- Moderation: auto-approve low-risk accounts

This worker is intentionally scoped to _published blueprint packages_, not full user workspace sync.

## Attribution Model (Important)

- GitHub OAuth is used for **identity only** (scope: `read:user`).
- Marketplace activity (publish, stars, comments) is stored in **Cloudflare D1** and attributed in the SMT UI to the signed-in GitHub handle.
- The worker does **not** create GitHub issues/PRs/comments on behalf of the user or the app owner.

---

## Prerequisites

- Cloudflare account (free)
- Wrangler CLI
- GitHub OAuth App (Client ID + Client Secret)
- Cloudflare D1 database (free tier)
- Optional: Cloudflare R2 bucket (not required; improves blob storage scalability)

---

## Configuration

### 1) Create a GitHub OAuth App

In GitHub Developer Settings:

- Homepage URL: your app URL (or `http://127.0.0.1:4173` for local dev)
- Authorization callback URL:
  - `https://<your-worker-subdomain>.workers.dev/api/auth/github/callback`

Store:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 2) Create D1 + Run Schema

Create a D1 database and execute `schema.sql`.

Example (adjust names as needed):

```bash
wrangler d1 create smt-blueprints
wrangler d1 execute smt-blueprints --file=./schema.sql
```

### 3) Create an R2 Bucket (Recommended)

R2 is optional. If you skip it, the worker stores package JSON blobs in D1 as chunked rows (sufficient for MVP / free tier).

```bash
wrangler r2 bucket create smt-blueprints-packages
```

### 4) Configure `wrangler.toml`

Edit `wrangler.toml`:

- Bind the D1 database as `DB`
- Set `ALLOWED_APP_ORIGINS` (comma-separated)
- Optional: add an R2 binding as `PACKAGES` (if enabled in your Cloudflare account)

`ALLOWED_APP_ORIGINS` must include every origin that should be allowed to:

- call the worker from the browser (CORS), and
- receive the OAuth `postMessage` from the callback popup

Examples:

- Local dev: `http://127.0.0.1:4173`, `http://localhost:4173`
- VSCode Live Server (common): `http://127.0.0.1:5501`
- GitHub Pages: `https://<username>.github.io`

### 5) Set Secrets

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

`JWT_SECRET` is used to sign session tokens returned to the browser app.

### 6) Run Locally

```bash
wrangler dev
```

### 7) Deploy

```bash
wrangler deploy
```

---

## Troubleshooting

### Publish fails but the UI message is generic

The worker responds with an error `code` and `requestId` for publish failures. The SMT UI will surface these as `(code, ref: <requestId>)`.

To see the server-side cause while testing:

1. Run `wrangler tail` for `smt-blueprints-worker`
2. Reproduce the publish action in the browser
3. Search the tail output for the matching `requestId`

---

## App Integration

The SMT app calls this worker via `BlueprintMarketplaceService` using:

- `Authorization: Bearer <sessionToken>` for write actions (publish/star/comment)
- Anonymous access for read actions (catalog/package fetch)

The OAuth flow is popup-based. The worker callback returns a tiny HTML response that:

- posts the signed token to `window.opener` via `postMessage`
- closes the popup

This avoids cross-site cookie issues in modern browsers.

The worker endpoint is intentionally treated as a hidden backend detail (no user-facing Settings override), matching the existing feedback-worker pattern.
