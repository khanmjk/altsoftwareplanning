/**
 * BackendStatusService
 *
 * Lightweight, free-tier friendly "synthetic monitoring" from inside the app.
 * - Pings backend worker health endpoints
 * - Exposes a simple aggregated status for UI badges
 *
 * Notes:
 * - This is advisory only; SMT remains local-first and must function offline.
 * - Health endpoints must never leak secret values (only booleans and basic checks).
 */

function backendStatusNowIso() {
  return new Date().toISOString();
}

async function backendStatusFetchJson(url, timeoutMs) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 3000));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    const ok =
      !!response.ok &&
      (json?.ok === true ||
        json?.success === true ||
        (typeof json?.ok === 'undefined' && typeof json?.success === 'undefined'));

    return {
      ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      payload: json,
      error: ok ? null : json?.error || `Request failed (${response.status}).`,
    };
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      payload: null,
      error: aborted ? 'Request timed out.' : error?.message || 'Network error.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const BackendStatusService = {
  POLL_INTERVAL_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 3500,

  _timer: null,
  _subscribers: new Set(),
  _state: {
    lastCheckedAt: null,
    overall: { status: 'unknown', ok: null },
    services: {
      marketplace: { ok: null, status: 0, latencyMs: 0, error: null, payload: null },
      feedback: { ok: null, status: 0, latencyMs: 0, error: null, payload: null },
    },
  },

  getState() {
    return this._state;
  },

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  },

  _notify() {
    this._subscribers.forEach((fn) => {
      try {
        fn(this._state);
      } catch (error) {
        console.error('BackendStatusService subscriber error:', error);
      }
    });
  },

  _computeOverall() {
    const marketOk = this._state.services.marketplace.ok;
    const feedbackOk = this._state.services.feedback.ok;

    if (marketOk === null && feedbackOk === null) {
      this._state.overall = { status: 'unknown', ok: null };
      return;
    }

    const okCount = [marketOk, feedbackOk].filter((value) => value === true).length;
    const knownCount = [marketOk, feedbackOk].filter((value) => value !== null).length;

    if (knownCount > 0 && okCount === knownCount) {
      this._state.overall = { status: 'ok', ok: true };
      return;
    }

    if (knownCount > 0 && okCount === 0) {
      this._state.overall = { status: 'down', ok: false };
      return;
    }

    this._state.overall = { status: 'degraded', ok: false };
  },

  async refresh() {
    const marketplaceUrl =
      typeof BlueprintMarketplaceService !== 'undefined'
        ? BlueprintMarketplaceService.buildUrl('/api/health')
        : null;
    const feedbackUrl =
      typeof FeedbackService !== 'undefined' && FeedbackService.WORKER_URL
        ? new URL('/health', FeedbackService.WORKER_URL).toString()
        : null;

    const checks = await Promise.all([
      marketplaceUrl
        ? backendStatusFetchJson(marketplaceUrl, this.REQUEST_TIMEOUT_MS)
        : Promise.resolve({
            ok: false,
            status: 0,
            latencyMs: 0,
            payload: null,
            error: 'Marketplace service is unavailable (missing client).',
          }),
      feedbackUrl
        ? backendStatusFetchJson(feedbackUrl, this.REQUEST_TIMEOUT_MS)
        : Promise.resolve({
            ok: false,
            status: 0,
            latencyMs: 0,
            payload: null,
            error: 'Feedback service is unavailable (missing worker URL).',
          }),
    ]);

    const [marketplace, feedback] = checks;

    this._state.lastCheckedAt = backendStatusNowIso();
    this._state.services.marketplace = marketplace;
    this._state.services.feedback = feedback;
    this._computeOverall();
    this._notify();

    return this._state;
  },

  startPolling(options = {}) {
    const intervalMs = Math.max(30_000, Number(options.intervalMs) || this.POLL_INTERVAL_MS);
    if (this._timer) return;
    // Fire immediately, then poll.
    this.refresh();
    this._timer = setInterval(() => this.refresh(), intervalMs);
  },

  stopPolling() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackendStatusService;
}
