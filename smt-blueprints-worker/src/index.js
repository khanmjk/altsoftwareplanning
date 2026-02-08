/**
 * SMT Blueprints Marketplace Worker
 *
 * Responsibilities:
 * - GitHub OAuth (popup flow + postMessage session token)
 * - Remote catalog browse/search
 * - Publish blueprint packages (store blob, index metadata, versioning)
 * - Social: stars + comments
 *
 * Notes:
 * - Avoid third-party cookies. Auth uses bearer tokens (signed JWT).
 * - Designed for Cloudflare free tier: simple SQL, token-based search, optional R2 blobs.
 */

const BLUEPRINT_PACKAGE_FORMAT = 'smt-blueprint-package';
const MAX_PUBLISH_BYTES = 2 * 1024 * 1024; // 2 MB
const PACKAGE_CHUNK_CHAR_SIZE = 100_000; // D1 fallback storage chunk size (chars)
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minutes
const GITHUB_OAUTH_SCOPES = 'read:user';

function parseAllowedOrigins(env) {
  return String(env.ALLOWED_APP_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function corsHeaders(origin, allowedOrigins) {
  const allowOrigin = isOriginAllowed(origin, allowedOrigins) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function withCors(response, origin, allowedOrigins) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(origin, allowedOrigins);
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  });
}

function normalizeString(value) {
  return String(value || '').trim();
}

function createSlug(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8Encode(value) {
  return new TextEncoder().encode(String(value || ''));
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

async function importHmacKey(secret) {
  const keyBytes = utf8Encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );
}

async function signHmac(secret, data) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, utf8Encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifyHmac(secret, data, signature) {
  const key = await importHmacKey(secret);
  const sigBytes = base64UrlDecodeToBytes(signature);
  return crypto.subtle.verify('HMAC', key, sigBytes, utf8Encode(data));
}

async function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = base64UrlEncode(utf8Encode(JSON.stringify(header)));
  const payloadPart = base64UrlEncode(utf8Encode(JSON.stringify(payload)));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = await signHmac(secret, signingInput);
  return `${signingInput}.${signature}`;
}

async function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { valid: false, error: 'Invalid token format.' };
  const [headerPart, payloadPart, signature] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const ok = await verifyHmac(secret, signingInput, signature);
  if (!ok) return { valid: false, error: 'Invalid token signature.' };

  let payload = null;
  try {
    payload = JSON.parse(utf8Decode(base64UrlDecodeToBytes(payloadPart)));
  } catch {
    return { valid: false, error: 'Invalid token payload.' };
  }

  const exp = Number(payload?.exp || 0);
  if (exp && Date.now() / 1000 >= exp) {
    return { valid: false, error: 'Token expired.' };
  }

  return { valid: true, payload };
}

function extractBearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function generateUuid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function tokenizeText(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2);
}

function buildBlueprintTokens(blueprint) {
  const tags = tokenizeText(blueprint.tags_csv || blueprint.tagsCsv || '');
  const base = []
    .concat(tokenizeText(blueprint.blueprint_id || blueprint.blueprintId || ''))
    .concat(tokenizeText(blueprint.title || ''))
    .concat(tokenizeText(blueprint.summary || ''))
    .concat(tokenizeText(blueprint.category || ''))
    .concat(tokenizeText(blueprint.complexity || ''))
    .concat(tokenizeText(blueprint.company_stage || blueprint.companyStage || ''))
    .concat(tokenizeText(blueprint.target_team_size || blueprint.targetTeamSize || ''))
    .concat(tokenizeText(blueprint.trust_label || blueprint.trustLabel || ''))
    .concat(tokenizeText(blueprint.source_type || blueprint.sourceType || ''))
    .concat(tokenizeText(blueprint.author_handle || blueprint.authorHandle || ''))
    .concat(tags);
  return Array.from(new Set(base)).slice(0, 80);
}

function safeJsonStringify(value) {
  return JSON.stringify(value || null);
}

function getPackageSystemCounts(system) {
  const payload = system || {};
  const count = (field) => (Array.isArray(payload[field]) ? payload[field].length : 0);
  return {
    teams: count('teams'),
    services: count('services'),
    goals: count('goals'),
    initiatives: count('yearlyInitiatives'),
    workPackages: count('workPackages'),
  };
}

function listSecretFindings(packageData) {
  const findings = [];

  const hardPatterns = [
    { id: 'openai', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
    { id: 'github_pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
    { id: 'github_ghp', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
    { id: 'google_api', re: /\bAIza[0-9A-Za-z\-_]{30,}\b/g },
    { id: 'aws_access', re: /\bAKIA[0-9A-Z]{16}\b/g },
    { id: 'private_key', re: /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/g },
    { id: 'jwt', re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  ];

  const suspiciousKeyRe = /(api[_-]?key|secret|token|password|private[_-]?key)/i;
  const placeholderRe =
    /^(?:redacted|tbd|todo|your[_ -]?api[_ -]?key|change[_ -]?me|replace[_ -]?me|example)$/i;

  const visit = (value, path, depth) => {
    if (depth > 14) return;
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      const text = value;
      for (const pattern of hardPatterns) {
        const matches = text.match(pattern.re);
        if (matches && matches.length > 0) {
          findings.push({
            type: 'hard',
            pattern: pattern.id,
            path,
          });
          break;
        }
      }
      return;
    }

    if (typeof value !== 'object') return;

    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((entry, index) => {
        visit(entry, `${path}[${index}]`, depth + 1);
      });
      return;
    }

    const entries = Object.entries(value).slice(0, 80);
    entries.forEach(([key, entryValue]) => {
      const nextPath = path ? `${path}.${key}` : key;

      if (suspiciousKeyRe.test(key) && typeof entryValue === 'string') {
        const candidate = entryValue.trim();
        const looksLikePlaceholder = !candidate || placeholderRe.test(candidate);
        if (!looksLikePlaceholder && candidate.length >= 12) {
          findings.push({
            type: 'suspicious',
            pattern: 'suspicious_key_value',
            path: nextPath,
          });
        }
      }

      visit(entryValue, nextPath, depth + 1);
    });
  };

  visit(packageData, '', 0);
  return findings;
}

function ensurePackageShape(packageData) {
  const payload = packageData || {};
  if (payload.format !== BLUEPRINT_PACKAGE_FORMAT) {
    return { ok: false, error: `Package format must be "${BLUEPRINT_PACKAGE_FORMAT}".` };
  }
  if (!payload.manifest || typeof payload.manifest !== 'object') {
    return { ok: false, error: 'Package manifest is required.' };
  }
  if (!payload.system || typeof payload.system !== 'object') {
    return { ok: false, error: 'Package system payload is required.' };
  }
  const manifest = payload.manifest;
  if (!normalizeString(manifest.blueprintId))
    return { ok: false, error: 'Manifest blueprintId is required.' };
  if (!normalizeString(manifest.title)) return { ok: false, error: 'Manifest title is required.' };
  if (!normalizeString(manifest.promptPack?.seedPrompt)) {
    return { ok: false, error: 'Prompt pack seedPrompt is required.' };
  }
  return { ok: true };
}

function sanitizeBlueprintId(input) {
  const raw = normalizeString(input);
  if (!raw) return '';
  if (raw.startsWith('bp-')) return raw;
  return `bp-${createSlug(raw)}`;
}

function buildPackageR2Key(blueprintId, versionNumber) {
  const safeBlueprint = createSlug(blueprintId) || 'bp';
  const safeVersion = Number(versionNumber) || 1;
  return `packages/${safeBlueprint}/v${safeVersion}.json`;
}

function buildD1PackageKey(versionId) {
  return `d1:${versionId}`;
}

function isD1PackageKey(value) {
  return String(value || '').startsWith('d1:');
}

function extractD1VersionIdFromKey(value) {
  const raw = String(value || '');
  if (!raw.startsWith('d1:')) return '';
  return raw.slice(3);
}

function chunkText(value, chunkSize) {
  const text = String(value || '');
  const size = Number(chunkSize) > 0 ? Number(chunkSize) : PACKAGE_CHUNK_CHAR_SIZE;
  const chunks = [];
  for (let offset = 0; offset < text.length; offset += size) {
    chunks.push(text.slice(offset, offset + size));
  }
  return chunks;
}

async function readPackageFromD1(env, versionId) {
  const rows = await env.DB.prepare(
    'SELECT chunk_text as chunkText FROM blueprint_package_chunks WHERE version_id = ? ORDER BY chunk_index ASC'
  )
    .bind(versionId)
    .all();
  const results = rows?.results || [];
  if (results.length === 0) return null;
  return results.map((row) => row.chunkText || '').join('');
}

async function readJsonBody(request, maxBytes) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength && contentLength > maxBytes) {
    return { ok: false, error: `Payload too large (>${maxBytes} bytes).` };
  }

  const reader = request.body?.getReader?.();
  if (!reader) {
    try {
      const body = await request.json();
      return { ok: true, body };
    } catch (error) {
      return { ok: false, error: `Invalid JSON: ${error.message}` };
    }
  }

  let received = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      return { ok: false, error: `Payload too large (>${maxBytes} bytes).` };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });

  try {
    const text = utf8Decode(merged);
    return { ok: true, body: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${error.message}` };
  }
}

async function exchangeGitHubCodeForToken(code, env) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SMT-Blueprints-Worker/1.0',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.access_token) {
    const details = json?.error_description || json?.error || response.status;
    throw new Error(`GitHub OAuth token exchange failed: ${details}`);
  }
  return json.access_token;
}

async function fetchGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SMT-Blueprints-Worker/1.0',
    },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.id || !json?.login) {
    throw new Error('Failed to fetch GitHub user profile.');
  }
  return json;
}

function computeUserRisk(githubUser) {
  const createdAt = githubUser?.created_at ? new Date(githubUser.created_at).getTime() : 0;
  const accountAgeDays = createdAt
    ? Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))
    : 0;
  const publicRepos = Number(githubUser?.public_repos || 0);
  const followers = Number(githubUser?.followers || 0);

  const isLowRisk = accountAgeDays >= 30 && publicRepos >= 1 && followers >= 1;
  return {
    riskLevel: isLowRisk ? 'low' : 'unknown',
    autoApprove: isLowRisk ? 1 : 0,
    accountAgeDays,
    publicRepos,
    followers,
  };
}

async function upsertUser(env, githubUser) {
  const githubId = String(githubUser.id);
  const handle = String(githubUser.login);
  const displayName = normalizeString(githubUser.name) || handle;
  const avatarUrl = normalizeString(githubUser.avatar_url);

  const risk = computeUserRisk(githubUser);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE github_id = ?')
    .bind(githubId)
    .first();

  const userId = existing?.id || generateUuid();
  const createdAt = existing?.id ? null : nowIso();

  if (existing?.id) {
    await env.DB.prepare(
      'UPDATE users SET handle = ?, display_name = ?, avatar_url = ?, risk_level = ?, auto_approve = ? WHERE id = ?'
    )
      .bind(handle, displayName, avatarUrl, risk.riskLevel, risk.autoApprove, userId)
      .run();
  } else {
    await env.DB.prepare(
      'INSERT INTO users (id, github_id, handle, display_name, avatar_url, created_at, risk_level, auto_approve) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        userId,
        githubId,
        handle,
        displayName,
        avatarUrl,
        createdAt,
        risk.riskLevel,
        risk.autoApprove
      )
      .run();
  }

  return {
    id: userId,
    handle,
    displayName,
    avatarUrl,
    autoApprove: !!risk.autoApprove,
    riskLevel: risk.riskLevel,
  };
}

async function requireSession(request, env) {
  const token = extractBearerToken(request);
  if (!token) return { ok: false, status: 401, error: 'Missing bearer token.' };

  const verified = await verifyJwt(token, env.JWT_SECRET);
  if (!verified.valid) {
    return { ok: false, status: 401, error: verified.error || 'Invalid token.' };
  }
  if (verified.payload?.typ !== 'session') {
    return { ok: false, status: 401, error: 'Invalid session token.' };
  }

  const userId = String(verified.payload?.sub || '');
  if (!userId) return { ok: false, status: 401, error: 'Invalid session subject.' };

  const user = await env.DB.prepare(
    'SELECT id, handle, display_name, avatar_url, auto_approve, risk_level FROM users WHERE id = ?'
  )
    .bind(userId)
    .first();
  if (!user?.id) {
    return { ok: false, status: 401, error: 'Session user not found.' };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      handle: user.handle,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      autoApprove: !!user.auto_approve,
      riskLevel: user.risk_level,
    },
  };
}

function jsonForInlineScript(value) {
  // Prevent breaking out of <script> and handle line separator chars in some JS engines.
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function renderOauthCallbackPage({ token, user, origin }) {
  const originLiteral = jsonForInlineScript(String(origin || ''));
  const tokenLiteral = jsonForInlineScript(String(token || ''));
  const userLiteral = jsonForInlineScript(user || null);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>SMT Login</title>
  </head>
  <body>
    <p>Authentication complete. You can close this window.</p>
    <script>
      (function () {
        var payload = { type: 'smt-marketplace-auth', token: ${tokenLiteral}, user: ${userLiteral} };
        try {
          if (window.opener) {
            window.opener.postMessage(payload, ${originLiteral});
          }
        } catch (e) {}
        try { window.close(); } catch (e) {}
      })();
    </script>
  </body>
</html>`;
}

async function handleAuthStart(request, env) {
  const url = new URL(request.url);
  const origin = normalizeString(url.searchParams.get('origin'));
  const allowedOrigins = parseAllowedOrigins(env);
  if (!isOriginAllowed(origin, allowedOrigins)) {
    return htmlResponse('Invalid origin.', 400);
  }

  if (!normalizeString(env.GITHUB_CLIENT_ID)) {
    return htmlResponse('GitHub OAuth is not configured for this worker.', 501);
  }

  const statePayload = {
    typ: 'oauth_state',
    origin,
    nonce: generateUuid(),
    exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS,
  };
  const state = await signJwt(statePayload, env.JWT_SECRET);

  const callbackUrl = `${url.origin}/api/auth/github/callback`;
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('scope', GITHUB_OAUTH_SCOPES);
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
    },
  });
}

async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = normalizeString(url.searchParams.get('code'));
  const state = normalizeString(url.searchParams.get('state'));
  if (!code || !state) {
    return htmlResponse('Missing OAuth parameters.', 400);
  }

  if (!normalizeString(env.GITHUB_CLIENT_ID) || !normalizeString(env.GITHUB_CLIENT_SECRET)) {
    return htmlResponse('GitHub OAuth is not configured for this worker.', 501);
  }

  const verifiedState = await verifyJwt(state, env.JWT_SECRET);
  if (!verifiedState.valid || verifiedState.payload?.typ !== 'oauth_state') {
    return htmlResponse('Invalid OAuth state.', 400);
  }

  const origin = normalizeString(verifiedState.payload?.origin);
  const allowedOrigins = parseAllowedOrigins(env);
  if (!isOriginAllowed(origin, allowedOrigins)) {
    return htmlResponse('Origin not allowed.', 400);
  }

  try {
    const accessToken = await exchangeGitHubCodeForToken(code, env);
    const githubUser = await fetchGitHubUser(accessToken);
    const user = await upsertUser(env, githubUser);

    const tokenPayload = {
      typ: 'session',
      sub: user.id,
      handle: user.handle,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const sessionToken = await signJwt(tokenPayload, env.JWT_SECRET);

    const html = renderOauthCallbackPage({ token: sessionToken, user, origin });
    return htmlResponse(html, 200, {
      'Cache-Control': 'no-store',
    });
  } catch (error) {
    console.error('[AuthCallback] Failed:', error);
    return htmlResponse('Authentication failed. Check worker logs.', 500);
  }
}

async function handleMe(request, env, origin) {
  const allowedOrigins = parseAllowedOrigins(env);
  const session = await requireSession(request, env);
  if (!session.ok) {
    return withCors(
      jsonResponse({ success: false, error: session.error }, session.status),
      origin,
      allowedOrigins
    );
  }
  return withCors(jsonResponse({ success: true, user: session.user }), origin, allowedOrigins);
}

async function handlePublish(request, env, origin) {
  const allowedOrigins = parseAllowedOrigins(env);
  const session = await requireSession(request, env);
  if (!session.ok) {
    return withCors(
      jsonResponse({ success: false, error: session.error }, session.status),
      origin,
      allowedOrigins
    );
  }

  const requestId = generateUuid();

  const bodyResult = await readJsonBody(request, MAX_PUBLISH_BYTES);
  if (!bodyResult.ok) {
    return withCors(
      jsonResponse(
        { success: false, error: bodyResult.error, code: 'invalid_body', requestId },
        400
      ),
      origin,
      allowedOrigins
    );
  }

  const packageData = bodyResult.body;
  const shape = ensurePackageShape(packageData);
  if (!shape.ok) {
    return withCors(
      jsonResponse({ success: false, error: shape.error, code: 'invalid_package', requestId }, 400),
      origin,
      allowedOrigins
    );
  }

  const findings = listSecretFindings(packageData);
  if (findings.length > 0) {
    return withCors(
      jsonResponse(
        {
          success: false,
          error: 'Publish blocked: potential secrets detected in package payload.',
          code: 'secrets_detected',
          requestId,
          findings: findings.slice(0, 5),
        },
        400
      ),
      origin,
      allowedOrigins
    );
  }

  const manifest = packageData.manifest || {};
  const blueprintId = sanitizeBlueprintId(manifest.blueprintId);
  if (!blueprintId) {
    return withCors(
      jsonResponse(
        { success: false, error: 'Invalid blueprintId.', code: 'invalid_blueprint_id', requestId },
        400
      ),
      origin,
      allowedOrigins
    );
  }

  const existingBlueprint = await env.DB.prepare(
    'SELECT blueprint_id, latest_version_number, status FROM blueprints WHERE blueprint_id = ?'
  )
    .bind(blueprintId)
    .first();

  if (existingBlueprint?.status === 'removed') {
    return withCors(
      jsonResponse(
        {
          success: false,
          error: 'This blueprint is removed and cannot be updated.',
          code: 'blueprint_removed',
          requestId,
        },
        403
      ),
      origin,
      allowedOrigins
    );
  }

  const nextVersionNumber = Number(existingBlueprint?.latest_version_number || 0) + 1;
  const versionId = generateUuid();
  const packageJson = safeJsonStringify(packageData);
  const packageSizeBytes = utf8Encode(packageJson).byteLength;
  if (packageSizeBytes > MAX_PUBLISH_BYTES) {
    return withCors(
      jsonResponse(
        {
          success: false,
          error: `Package too large (>${MAX_PUBLISH_BYTES} bytes).`,
          code: 'too_large',
          requestId,
        },
        400
      ),
      origin,
      allowedOrigins
    );
  }

  const r2Key = buildPackageR2Key(blueprintId, nextVersionNumber);
  const counts = getPackageSystemCounts(packageData.system);
  const createdAt = nowIso();

  const autoApprove = !!session.user.autoApprove;
  const status = autoApprove ? 'approved' : 'pending';

  const hasR2 =
    !!env.PACKAGES &&
    typeof env.PACKAGES.put === 'function' &&
    typeof env.PACKAGES.get === 'function';
  const versionPackageKey = hasR2 ? r2Key : buildD1PackageKey(versionId);
  const d1Chunks = hasR2 ? [] : chunkText(packageJson, PACKAGE_CHUNK_CHAR_SIZE);

  if (hasR2) {
    try {
      await env.PACKAGES.put(r2Key, packageJson, {
        httpMetadata: {
          contentType: 'application/json',
        },
      });
    } catch (error) {
      console.error(
        `[Publish] Failed to store package blob to R2, falling back to D1. requestId=${requestId}`,
        error
      );
      // If R2 is misconfigured, fall back to D1 chunk storage to keep publishing working.
      d1Chunks.push(...chunkText(packageJson, PACKAGE_CHUNK_CHAR_SIZE));
    }
  }

  const blueprintRow = {
    blueprint_id: blueprintId,
    title: normalizeString(manifest.title) || 'Untitled Blueprint',
    summary: normalizeString(manifest.summary) || 'Blueprint package.',
    category: normalizeString(manifest.category) || 'Uncategorized',
    tags_csv: Array.isArray(manifest.tags)
      ? manifest.tags
          .map((t) => normalizeString(t))
          .filter(Boolean)
          .join(',')
      : '',
    complexity: normalizeString(manifest.complexity) || 'Intermediate',
    company_stage: normalizeString(manifest.companyStage) || 'Growth',
    target_team_size: normalizeString(manifest.targetTeamSize) || '50-150',
    roadmap_horizon_years: Number(manifest.roadmapHorizonYears || 3),
    trust_label: normalizeString(manifest.trustLabel) || 'Community',
    source_type: normalizeString(manifest.sourceType) || 'community',
  };

  const versionRow = {
    version_id: versionId,
    blueprint_id: blueprintId,
    version_number: nextVersionNumber,
    status,
    manifest_json: safeJsonStringify(manifest),
    package_r2_key: d1Chunks.length > 0 ? buildD1PackageKey(versionId) : versionPackageKey,
    package_size_bytes: packageSizeBytes,
    parent_blueprint_id: normalizeString(manifest.parentBlueprintId) || null,
    parent_version_id: normalizeString(manifest.parentVersionId) || null,
    teams_count: counts.teams,
    services_count: counts.services,
    goals_count: counts.goals,
    initiatives_count: counts.initiatives,
    work_packages_count: counts.workPackages,
    created_at: createdAt,
    published_by_user_id: session.user.id,
  };

  const batch = [];

  // If the blueprint is new, insert it before inserting versions/tokens to satisfy FK constraints.
  if (!existingBlueprint?.blueprint_id) {
    batch.push(
      env.DB.prepare(
        'INSERT INTO blueprints (blueprint_id, title, summary, category, tags_csv, complexity, company_stage, target_team_size, roadmap_horizon_years, trust_label, source_type, author_user_id, status, latest_version_id, latest_version_number, stars_count, downloads_count, comments_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)'
      ).bind(
        blueprintId,
        blueprintRow.title,
        blueprintRow.summary,
        blueprintRow.category,
        blueprintRow.tags_csv,
        blueprintRow.complexity,
        blueprintRow.company_stage,
        blueprintRow.target_team_size,
        blueprintRow.roadmap_horizon_years,
        blueprintRow.trust_label,
        blueprintRow.source_type,
        session.user.id,
        status,
        versionId,
        nextVersionNumber,
        createdAt,
        createdAt
      )
    );
  }

  batch.push(
    env.DB.prepare(
      'INSERT INTO blueprint_versions (version_id, blueprint_id, version_number, status, manifest_json, package_r2_key, package_size_bytes, parent_blueprint_id, parent_version_id, teams_count, services_count, goals_count, initiatives_count, work_packages_count, created_at, published_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      versionRow.version_id,
      versionRow.blueprint_id,
      versionRow.version_number,
      versionRow.status,
      versionRow.manifest_json,
      versionRow.package_r2_key,
      versionRow.package_size_bytes,
      versionRow.parent_blueprint_id,
      versionRow.parent_version_id,
      versionRow.teams_count,
      versionRow.services_count,
      versionRow.goals_count,
      versionRow.initiatives_count,
      versionRow.work_packages_count,
      versionRow.created_at,
      versionRow.published_by_user_id
    )
  );

  if (d1Chunks.length > 0) {
    batch.push(
      env.DB.prepare('DELETE FROM blueprint_package_chunks WHERE version_id = ?').bind(versionId)
    );
    const chunkValues = d1Chunks.map(() => '(?, ?, ?)').join(',');
    const chunkParams = [];
    d1Chunks.forEach((chunkTextValue, index) => {
      chunkParams.push(versionId, index, chunkTextValue);
    });
    batch.push(
      env.DB.prepare(
        `INSERT INTO blueprint_package_chunks (version_id, chunk_index, chunk_text) VALUES ${chunkValues}`
      ).bind(...chunkParams)
    );
  }

  if (existingBlueprint?.blueprint_id) {
    batch.push(
      env.DB.prepare(
        'UPDATE blueprints SET title = ?, summary = ?, category = ?, tags_csv = ?, complexity = ?, company_stage = ?, target_team_size = ?, roadmap_horizon_years = ?, trust_label = ?, source_type = ?, status = ?, latest_version_id = ?, latest_version_number = ?, updated_at = ? WHERE blueprint_id = ?'
      ).bind(
        blueprintRow.title,
        blueprintRow.summary,
        blueprintRow.category,
        blueprintRow.tags_csv,
        blueprintRow.complexity,
        blueprintRow.company_stage,
        blueprintRow.target_team_size,
        blueprintRow.roadmap_horizon_years,
        blueprintRow.trust_label,
        blueprintRow.source_type,
        status,
        versionId,
        nextVersionNumber,
        createdAt,
        blueprintId
      )
    );
  }

  // Refresh search tokens
  batch.push(
    env.DB.prepare('DELETE FROM blueprint_search_tokens WHERE blueprint_id = ?').bind(blueprintId)
  );
  const tokens = buildBlueprintTokens({
    blueprint_id: blueprintId,
    title: blueprintRow.title,
    summary: blueprintRow.summary,
    category: blueprintRow.category,
    tags_csv: blueprintRow.tags_csv,
    complexity: blueprintRow.complexity,
    company_stage: blueprintRow.company_stage,
    target_team_size: blueprintRow.target_team_size,
    trust_label: blueprintRow.trust_label,
    source_type: blueprintRow.source_type,
    author_handle: session.user.handle,
  });
  if (tokens.length > 0) {
    const tokenValues = tokens.map(() => '(?, ?)').join(',');
    const tokenParams = [];
    tokens.forEach((token) => {
      tokenParams.push(blueprintId, token);
    });
    batch.push(
      env.DB.prepare(
        `INSERT INTO blueprint_search_tokens (blueprint_id, token) VALUES ${tokenValues}`
      ).bind(...tokenParams)
    );
  }

  try {
    await env.DB.batch(batch);
  } catch (error) {
    console.error(`[Publish] DB write failed. requestId=${requestId}`, error);
    return withCors(
      jsonResponse(
        {
          success: false,
          error: 'Failed to publish blueprint.',
          code: 'db_write_failed',
          requestId,
        },
        502
      ),
      origin,
      allowedOrigins
    );
  }

  return withCors(
    jsonResponse({
      success: true,
      blueprintId,
      versionId,
      versionNumber: nextVersionNumber,
      status,
      autoApproved: autoApprove,
      requestId,
    }),
    origin,
    allowedOrigins
  );
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = utf8Decode(base64UrlDecodeToBytes(cursor));
    const [updatedAt, blueprintId] = decoded.split('|');
    if (!updatedAt || !blueprintId) return null;
    return { updatedAt, blueprintId };
  } catch {
    return null;
  }
}

function encodeCursor(updatedAt, blueprintId) {
  return base64UrlEncode(utf8Encode(`${updatedAt}|${blueprintId}`));
}

async function handleCatalog(request, env, origin) {
  const allowedOrigins = parseAllowedOrigins(env);

  const url = new URL(request.url);
  const query = normalizeString(url.searchParams.get('query'));
  const category = normalizeString(url.searchParams.get('category'));
  const trustLabel = normalizeString(url.searchParams.get('trustLabel'));
  const complexity = normalizeString(url.searchParams.get('complexity'));
  const companyStage = normalizeString(url.searchParams.get('companyStage'));
  const sourceType = normalizeString(url.searchParams.get('sourceType'));
  const sort = normalizeString(url.searchParams.get('sort')) || 'newest';
  const limitParam = Number(url.searchParams.get('limit') || DEFAULT_PAGE_SIZE);
  const limit = Math.max(
    1,
    Math.min(MAX_PAGE_SIZE, Number.isFinite(limitParam) ? limitParam : DEFAULT_PAGE_SIZE)
  );
  const cursor = decodeCursor(normalizeString(url.searchParams.get('cursor')));

  const tokens = tokenizeText(query);
  const where = ['b.status = ?'];
  const params = ['approved'];

  if (category) {
    where.push('b.category = ?');
    params.push(category);
  }
  if (trustLabel) {
    where.push('b.trust_label = ?');
    params.push(trustLabel);
  }
  if (complexity) {
    where.push('b.complexity = ?');
    params.push(complexity);
  }
  if (companyStage) {
    where.push('b.company_stage = ?');
    params.push(companyStage);
  }
  if (sourceType) {
    where.push('b.source_type = ?');
    params.push(sourceType);
  }

  if (cursor) {
    where.push('(b.updated_at < ? OR (b.updated_at = ? AND b.blueprint_id < ?))');
    params.push(cursor.updatedAt, cursor.updatedAt, cursor.blueprintId);
  }

  const sortClause =
    sort === 'top'
      ? 'b.stars_count DESC, b.updated_at DESC, b.blueprint_id DESC'
      : sort === 'trending'
        ? 'b.stars_count DESC, b.updated_at DESC, b.blueprint_id DESC'
        : 'b.updated_at DESC, b.blueprint_id DESC';

  let sql = '';
  let sqlParams = [];

  if (tokens.length > 0) {
    const placeholders = tokens.map(() => '?').join(',');
    sql = `
      SELECT
        b.blueprint_id as blueprintId,
        b.title,
        b.summary,
        b.category,
        b.tags_csv as tagsCsv,
        b.complexity as complexity,
        b.company_stage as companyStage,
        b.target_team_size as targetTeamSize,
        b.roadmap_horizon_years as roadmapHorizonYears,
        b.trust_label as trustLabel,
        b.source_type as sourceType,
        b.stars_count as starsCount,
        b.downloads_count as downloadsCount,
        b.comments_count as commentsCount,
        b.latest_version_number as latestVersionNumber,
        b.updated_at as updatedAt,
        u.handle as authorHandle,
        u.avatar_url as authorAvatarUrl
      FROM blueprints b
      JOIN users u ON u.id = b.author_user_id
      JOIN blueprint_search_tokens t ON t.blueprint_id = b.blueprint_id
      WHERE ${where.join(' AND ')} AND t.token IN (${placeholders})
      GROUP BY b.blueprint_id
      HAVING COUNT(DISTINCT t.token) = ?
      ORDER BY ${sortClause}
      LIMIT ?
    `;
    sqlParams = params.concat(tokens).concat([tokens.length, limit + 1]);
  } else {
    sql = `
      SELECT
        b.blueprint_id as blueprintId,
        b.title,
        b.summary,
        b.category,
        b.tags_csv as tagsCsv,
        b.complexity as complexity,
        b.company_stage as companyStage,
        b.target_team_size as targetTeamSize,
        b.roadmap_horizon_years as roadmapHorizonYears,
        b.trust_label as trustLabel,
        b.source_type as sourceType,
        b.stars_count as starsCount,
        b.downloads_count as downloadsCount,
        b.comments_count as commentsCount,
        b.latest_version_number as latestVersionNumber,
        b.updated_at as updatedAt,
        u.handle as authorHandle,
        u.avatar_url as authorAvatarUrl
      FROM blueprints b
      JOIN users u ON u.id = b.author_user_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortClause}
      LIMIT ?
    `;
    sqlParams = params.concat([limit + 1]);
  }

  let rows = [];
  try {
    rows =
      (
        await env.DB.prepare(sql)
          .bind(...sqlParams)
          .all()
      ).results || [];
  } catch (error) {
    console.error('[Catalog] Query failed:', error);
    return withCors(
      jsonResponse({ success: false, error: 'Catalog query failed.' }, 502),
      origin,
      allowedOrigins
    );
  }

  let nextCursor = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    nextCursor = encodeCursor(last.updatedAt, last.blueprintId);
    rows = rows.slice(0, limit);
  }

  const items = rows.map((row) => ({
    blueprintId: row.blueprintId,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tags: String(row.tagsCsv || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    complexity: row.complexity || 'Intermediate',
    companyStage: row.companyStage || 'Growth',
    targetTeamSize: row.targetTeamSize || '50-150',
    roadmapHorizonYears: Number(row.roadmapHorizonYears || 3),
    trustLabel: row.trustLabel,
    sourceType: row.sourceType,
    starsCount: Number(row.starsCount || 0),
    downloadsCount: Number(row.downloadsCount || 0),
    commentsCount: Number(row.commentsCount || 0),
    latestVersionNumber: Number(row.latestVersionNumber || 0),
    updatedAt: row.updatedAt,
    author: {
      handle: row.authorHandle,
      avatarUrl: row.authorAvatarUrl,
    },
  }));

  return withCors(jsonResponse({ success: true, items, nextCursor }), origin, allowedOrigins);
}

async function getOptionalSessionUser(request, env) {
  const token = extractBearerToken(request);
  if (!token) return null;
  const verified = await verifyJwt(token, env.JWT_SECRET);
  if (!verified.valid || verified.payload?.typ !== 'session') return null;
  return String(verified.payload?.sub || '') || null;
}

async function handleBlueprintDetail(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);

  const blueprint = await env.DB.prepare(
    `SELECT
        b.blueprint_id as blueprintId,
      b.title,
      b.summary,
      b.category,
      b.tags_csv as tagsCsv,
      b.complexity as complexity,
      b.company_stage as companyStage,
      b.target_team_size as targetTeamSize,
      b.roadmap_horizon_years as roadmapHorizonYears,
      b.trust_label as trustLabel,
      b.source_type as sourceType,
      b.status,
      b.stars_count as starsCount,
      b.downloads_count as downloadsCount,
      b.comments_count as commentsCount,
        b.latest_version_id as latestVersionId,
        b.latest_version_number as latestVersionNumber,
        b.created_at as createdAt,
        b.updated_at as updatedAt,
        u.handle as authorHandle,
        u.display_name as authorDisplayName,
        u.avatar_url as authorAvatarUrl
      FROM blueprints b
      JOIN users u ON u.id = b.author_user_id
      WHERE b.blueprint_id = ?`
  )
    .bind(blueprintId)
    .first();

  if (!blueprint?.blueprintId || blueprint.status !== 'approved') {
    return withCors(
      jsonResponse({ success: false, error: 'Blueprint not found.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const latestVersion = await env.DB.prepare(
    'SELECT version_id as versionId, version_number as versionNumber, manifest_json as manifestJson, created_at as createdAt FROM blueprint_versions WHERE blueprint_id = ? AND version_number = ?'
  )
    .bind(blueprintId, Number(blueprint.latestVersionNumber || 0))
    .first();

  let manifest = null;
  try {
    manifest = latestVersion?.manifestJson ? JSON.parse(latestVersion.manifestJson) : null;
  } catch {
    manifest = null;
  }

  const viewerUserId = await getOptionalSessionUser(request, env);
  let viewerHasStarred = false;
  if (viewerUserId) {
    const star = await env.DB.prepare(
      'SELECT user_id FROM stars WHERE user_id = ? AND blueprint_id = ?'
    )
      .bind(viewerUserId, blueprintId)
      .first();
    viewerHasStarred = !!star?.user_id;
  }

  return withCors(
    jsonResponse({
      success: true,
      blueprint: {
        blueprintId: blueprint.blueprintId,
        title: blueprint.title,
        summary: blueprint.summary,
        category: blueprint.category,
        tags: String(blueprint.tagsCsv || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        complexity: blueprint.complexity || 'Intermediate',
        companyStage: blueprint.companyStage || 'Growth',
        targetTeamSize: blueprint.targetTeamSize || '50-150',
        roadmapHorizonYears: Number(blueprint.roadmapHorizonYears || 3),
        trustLabel: blueprint.trustLabel,
        sourceType: blueprint.sourceType,
        starsCount: Number(blueprint.starsCount || 0),
        downloadsCount: Number(blueprint.downloadsCount || 0),
        commentsCount: Number(blueprint.commentsCount || 0),
        latestVersionNumber: Number(blueprint.latestVersionNumber || 0),
        createdAt: blueprint.createdAt,
        updatedAt: blueprint.updatedAt,
        author: {
          handle: blueprint.authorHandle,
          displayName: blueprint.authorDisplayName,
          avatarUrl: blueprint.authorAvatarUrl,
        },
      },
      latestVersion: latestVersion
        ? {
            versionId: latestVersion.versionId,
            versionNumber: Number(latestVersion.versionNumber || 0),
            createdAt: latestVersion.createdAt,
            manifest,
          }
        : null,
      viewer: viewerUserId
        ? {
            hasStarred: viewerHasStarred,
          }
        : null,
    }),
    origin,
    allowedOrigins
  );
}

async function handlePackageFetch(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);
  const url = new URL(request.url);
  const versionParam = normalizeString(url.searchParams.get('versionNumber')) || 'latest';

  const blueprint = await env.DB.prepare(
    'SELECT blueprint_id as blueprintId, status, latest_version_number as latestVersionNumber FROM blueprints WHERE blueprint_id = ?'
  )
    .bind(blueprintId)
    .first();
  if (!blueprint?.blueprintId || blueprint.status !== 'approved') {
    return withCors(
      jsonResponse({ success: false, error: 'Blueprint not found.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const resolvedVersionNumber =
    versionParam === 'latest'
      ? Number(blueprint.latestVersionNumber || 0)
      : Number(versionParam || 0);
  if (!resolvedVersionNumber) {
    return withCors(
      jsonResponse({ success: false, error: 'Invalid versionNumber.' }, 400),
      origin,
      allowedOrigins
    );
  }

  const version = await env.DB.prepare(
    'SELECT version_id as versionId, package_r2_key as packageKey, status FROM blueprint_versions WHERE blueprint_id = ? AND version_number = ?'
  )
    .bind(blueprintId, resolvedVersionNumber)
    .first();
  if (!version?.versionId || !version?.packageKey || version.status !== 'approved') {
    return withCors(
      jsonResponse({ success: false, error: 'Package not available.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const hasR2 = !!env.PACKAGES && typeof env.PACKAGES.get === 'function';
  const packageKey = normalizeString(version.packageKey);
  const d1VersionId = isD1PackageKey(packageKey)
    ? extractD1VersionIdFromKey(packageKey) || String(version.versionId)
    : String(version.versionId);

  let payloadText = null;
  let r2Object = null;

  if (hasR2 && packageKey && !isD1PackageKey(packageKey)) {
    try {
      r2Object = await env.PACKAGES.get(packageKey);
    } catch (error) {
      console.error('[PackageFetch] R2 error:', error);
      r2Object = null;
    }
  }

  if (!r2Object) {
    try {
      payloadText = await readPackageFromD1(env, d1VersionId);
    } catch (error) {
      console.error('[PackageFetch] D1 blob error:', error);
      payloadText = null;
    }
    if (!payloadText) {
      return withCors(
        jsonResponse({ success: false, error: 'Package blob not found.' }, 404),
        origin,
        allowedOrigins
      );
    }
  }

  // best-effort increment of downloads counter
  env.DB.prepare(
    'UPDATE blueprints SET downloads_count = downloads_count + 1 WHERE blueprint_id = ?'
  )
    .bind(blueprintId)
    .run()
    .catch(() => {});

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  Object.entries(corsHeaders(origin, allowedOrigins)).forEach(([key, value]) =>
    headers.set(key, value)
  );
  if (r2Object) {
    return new Response(r2Object.body, { status: 200, headers });
  }
  return new Response(payloadText, { status: 200, headers });
}

async function handleStar(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);
  const session = await requireSession(request, env);
  if (!session.ok) {
    return withCors(
      jsonResponse({ success: false, error: session.error }, session.status),
      origin,
      allowedOrigins
    );
  }

  const exists = await env.DB.prepare(
    'SELECT blueprint_id FROM blueprints WHERE blueprint_id = ? AND status = ?'
  )
    .bind(blueprintId, 'approved')
    .first();
  if (!exists?.blueprint_id) {
    return withCors(
      jsonResponse({ success: false, error: 'Blueprint not found.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const createdAt = nowIso();
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO stars (user_id, blueprint_id, created_at) VALUES (?, ?, ?)'
    )
      .bind(session.user.id, blueprintId, createdAt)
      .run();
    await env.DB.prepare(
      'UPDATE blueprints SET stars_count = (SELECT COUNT(*) FROM stars WHERE blueprint_id = ?) WHERE blueprint_id = ?'
    )
      .bind(blueprintId, blueprintId)
      .run();
  } catch (error) {
    console.error('[Star] Failed:', error);
    return withCors(
      jsonResponse({ success: false, error: 'Failed to star blueprint.' }, 502),
      origin,
      allowedOrigins
    );
  }

  return withCors(jsonResponse({ success: true }), origin, allowedOrigins);
}

async function handleUnstar(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);
  const session = await requireSession(request, env);
  if (!session.ok) {
    return withCors(
      jsonResponse({ success: false, error: session.error }, session.status),
      origin,
      allowedOrigins
    );
  }

  try {
    await env.DB.prepare('DELETE FROM stars WHERE user_id = ? AND blueprint_id = ?')
      .bind(session.user.id, blueprintId)
      .run();
    await env.DB.prepare(
      'UPDATE blueprints SET stars_count = (SELECT COUNT(*) FROM stars WHERE blueprint_id = ?) WHERE blueprint_id = ?'
    )
      .bind(blueprintId, blueprintId)
      .run();
  } catch (error) {
    console.error('[Unstar] Failed:', error);
    return withCors(
      jsonResponse({ success: false, error: 'Failed to unstar blueprint.' }, 502),
      origin,
      allowedOrigins
    );
  }

  return withCors(jsonResponse({ success: true }), origin, allowedOrigins);
}

async function handleCommentsList(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') || 20);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 20));
  const cursor = normalizeString(url.searchParams.get('cursor'));

  const blueprint = await env.DB.prepare(
    'SELECT blueprint_id as blueprintId, status FROM blueprints WHERE blueprint_id = ?'
  )
    .bind(blueprintId)
    .first();
  if (!blueprint?.blueprintId || blueprint.status !== 'approved') {
    return withCors(
      jsonResponse({ success: false, error: 'Blueprint not found.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const where = ['c.blueprint_id = ?', "c.status = 'visible'"];
  const params = [blueprintId];
  if (cursor) {
    where.push('c.created_at < ?');
    params.push(cursor);
  }

  const sql = `
    SELECT
      c.comment_id as commentId,
      c.body,
      c.created_at as createdAt,
      u.handle as authorHandle,
      u.avatar_url as authorAvatarUrl
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC
    LIMIT ?
  `;

  let rows = [];
  try {
    rows =
      (
        await env.DB.prepare(sql)
          .bind(...params, limit + 1)
          .all()
      ).results || [];
  } catch (error) {
    console.error('[CommentsList] Failed:', error);
    return withCors(
      jsonResponse({ success: false, error: 'Failed to load comments.' }, 502),
      origin,
      allowedOrigins
    );
  }

  let nextCursor = null;
  if (rows.length > limit) {
    nextCursor = rows[limit - 1]?.createdAt || null;
    rows = rows.slice(0, limit);
  }

  const items = rows.map((row) => ({
    commentId: row.commentId,
    body: row.body,
    createdAt: row.createdAt,
    author: {
      handle: row.authorHandle,
      avatarUrl: row.authorAvatarUrl,
    },
  }));

  return withCors(jsonResponse({ success: true, items, nextCursor }), origin, allowedOrigins);
}

async function handleCommentCreate(request, env, origin, blueprintId) {
  const allowedOrigins = parseAllowedOrigins(env);
  const session = await requireSession(request, env);
  if (!session.ok) {
    return withCors(
      jsonResponse({ success: false, error: session.error }, session.status),
      origin,
      allowedOrigins
    );
  }

  const bodyResult = await readJsonBody(request, 32 * 1024);
  if (!bodyResult.ok) {
    return withCors(
      jsonResponse({ success: false, error: bodyResult.error }, 400),
      origin,
      allowedOrigins
    );
  }

  const text = normalizeString(bodyResult.body?.body);
  if (!text || text.length < 2) {
    return withCors(
      jsonResponse({ success: false, error: 'Comment body is required.' }, 400),
      origin,
      allowedOrigins
    );
  }
  if (text.length > 2000) {
    return withCors(
      jsonResponse({ success: false, error: 'Comment too long.' }, 400),
      origin,
      allowedOrigins
    );
  }

  const blueprint = await env.DB.prepare(
    'SELECT blueprint_id as blueprintId, status FROM blueprints WHERE blueprint_id = ?'
  )
    .bind(blueprintId)
    .first();
  if (!blueprint?.blueprintId || blueprint.status !== 'approved') {
    return withCors(
      jsonResponse({ success: false, error: 'Blueprint not found.' }, 404),
      origin,
      allowedOrigins
    );
  }

  const commentId = generateUuid();
  const createdAt = nowIso();
  try {
    await env.DB.prepare(
      "INSERT INTO comments (comment_id, blueprint_id, version_id, user_id, body, status, created_at) VALUES (?, ?, NULL, ?, ?, 'visible', ?)"
    )
      .bind(commentId, blueprintId, session.user.id, text, createdAt)
      .run();
    await env.DB.prepare(
      'UPDATE blueprints SET comments_count = comments_count + 1 WHERE blueprint_id = ?'
    )
      .bind(blueprintId)
      .run();
  } catch (error) {
    console.error('[CommentCreate] Failed:', error);
    return withCors(
      jsonResponse({ success: false, error: 'Failed to create comment.' }, 502),
      origin,
      allowedOrigins
    );
  }

  return withCors(jsonResponse({ success: true, commentId, createdAt }), origin, allowedOrigins);
}

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    const allowedOrigins = parseAllowedOrigins(env);
    return withCors(new Response(null, { status: 204 }), origin, allowedOrigins);
  }

  // Auth (navigation, not XHR)
  if (request.method === 'GET' && path === '/api/auth/github/start') {
    return handleAuthStart(request, env);
  }
  if (request.method === 'GET' && path === '/api/auth/github/callback') {
    return handleAuthCallback(request, env);
  }

  // API (XHR)
  if (request.method === 'GET' && path === '/api/me') {
    return handleMe(request, env, origin);
  }
  if (request.method === 'GET' && path === '/api/catalog') {
    return handleCatalog(request, env, origin);
  }

  const blueprintMatch = path.match(/^\/api\/blueprints\/([^/]+)(?:\/([^/]+))?$/);
  if (blueprintMatch) {
    const blueprintId = sanitizeBlueprintId(blueprintMatch[1]);
    const action = blueprintMatch[2] || '';

    if (request.method === 'GET' && !action) {
      return handleBlueprintDetail(request, env, origin, blueprintId);
    }
    if (request.method === 'GET' && action === 'package') {
      return handlePackageFetch(request, env, origin, blueprintId);
    }
    if (request.method === 'POST' && action === 'star') {
      return handleStar(request, env, origin, blueprintId);
    }
    if (request.method === 'DELETE' && action === 'star') {
      return handleUnstar(request, env, origin, blueprintId);
    }
    if (request.method === 'GET' && action === 'comments') {
      return handleCommentsList(request, env, origin, blueprintId);
    }
    if (request.method === 'POST' && action === 'comments') {
      return handleCommentCreate(request, env, origin, blueprintId);
    }
  }

  if (request.method === 'POST' && path === '/api/publish') {
    return handlePublish(request, env, origin);
  }

  return jsonResponse({ success: false, error: 'Not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      console.error('[Worker] Unhandled error:', error);
      return jsonResponse({ success: false, error: 'Internal error.' }, 500);
    }
  },
};
