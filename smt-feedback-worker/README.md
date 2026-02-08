# SMT Feedback Worker

Cloudflare Worker that proxies feedback submissions from the SMT Platform to GitHub Issues.

Important: GitHub issues are created using the identity associated with the worker's `GITHUB_TOKEN` (typically the project maintainer/bot). Users do not authenticate with GitHub; any reporter details are included in the issue body.

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. GitHub Personal Access Token with `repo` scope

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "SMT Feedback Worker"
4. Select scope: `repo` (full control of private repositories) or `public_repo` (for public repos only)
5. Copy the generated token

### 4. Add Token as Secret

```bash
cd smt-feedback-worker
wrangler secret put GITHUB_TOKEN
# Paste your token when prompted
```

### 5. Deploy the Worker

```bash
wrangler deploy
```

After deployment, you'll see output like:

```
Published smt-feedback-worker (1.23 sec)
  https://smt-feedback-worker.<your-subdomain>.workers.dev
```

**Copy this URL** - you'll need it for the SMT Platform configuration.

## Local Development

```bash
wrangler dev
```

## Testing

Health check:

```bash
curl https://smt-feedback-worker.<your-subdomain>.workers.dev/health
```

Feedback submit:

```bash
curl -X POST https://smt-feedback-worker.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Bug Report",
    "description": "Test feedback submission",
    "email": "test@example.com"
  }'
```

## Configuration

The worker URL must be set in the SMT Platform's `FeedbackService.js`:

```javascript
const WORKER_URL = 'https://smt-feedback-worker.<your-subdomain>.workers.dev';
```
