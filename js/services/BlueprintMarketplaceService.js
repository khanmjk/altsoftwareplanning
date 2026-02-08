/**
 * BlueprintMarketplaceService
 *
 * Client for the Cloudflare Marketplace Worker:
 * - Remote catalog/search
 * - Blueprint detail + package fetch
 * - Publish + stars + comments (authenticated via MarketplaceAuthService bearer token)
 */

function marketplaceNormalizeString(value) {
  return String(value || '').trim();
}

const MARKETPLACE_API_WORKER_BASE_URL = 'https://smt-blueprints-worker.khanmjk.workers.dev';

async function marketplaceFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: json?.error || `Request failed (${response.status}).`,
      payload: json,
    };
  }
  return json || { success: true };
}

const BlueprintMarketplaceService = {
  getBaseUrl() {
    return MARKETPLACE_API_WORKER_BASE_URL;
  },

  isEnabled() {
    return true;
  },

  buildUrl(path, params = {}) {
    const base = this.getBaseUrl();
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const text = marketplaceNormalizeString(value);
      if (!text) return;
      url.searchParams.set(key, text);
    });
    return url.toString();
  },

  async getMe() {
    if (!MarketplaceAuthService.isLoggedIn()) {
      return { success: false, error: 'Not signed in.' };
    }
    const url = this.buildUrl('/api/me');
    return marketplaceFetchJson(url, {
      method: 'GET',
      headers: {
        Authorization: MarketplaceAuthService.getAuthHeader(),
      },
    });
  },

  async getCatalog(filters = {}) {
    const url = this.buildUrl('/api/catalog', {
      query: filters.query || '',
      category: filters.category && filters.category !== 'all' ? filters.category : '',
      trustLabel: filters.trustLabel && filters.trustLabel !== 'all' ? filters.trustLabel : '',
      complexity: filters.complexity && filters.complexity !== 'all' ? filters.complexity : '',
      companyStage:
        filters.companyStage && filters.companyStage !== 'all' ? filters.companyStage : '',
      sourceType: filters.sourceType && filters.sourceType !== 'all' ? filters.sourceType : '',
      sort: filters.sort || 'newest',
      cursor: filters.cursor || '',
      limit: filters.limit || '',
    });
    return marketplaceFetchJson(url, { method: 'GET' });
  },

  async getBlueprintDetail(blueprintId) {
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}`);
    const headers = {};
    if (MarketplaceAuthService.isLoggedIn()) {
      headers.Authorization = MarketplaceAuthService.getAuthHeader();
    }
    return marketplaceFetchJson(url, { method: 'GET', headers });
  },

  async fetchBlueprintPackage(blueprintId, versionNumber = 'latest') {
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}/package`, {
      versionNumber,
    });
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      let json = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }
      return {
        success: false,
        error: json?.error || `Failed to fetch package (${response.status}).`,
      };
    }
    try {
      const pkg = await response.json();
      return { success: true, packageData: pkg };
    } catch (error) {
      return { success: false, error: `Invalid package JSON: ${error.message}` };
    }
  },

  async publishPackage(packageData) {
    if (!MarketplaceAuthService.isLoggedIn()) {
      return { success: false, error: 'Sign in to publish publicly.' };
    }
    const url = this.buildUrl('/api/publish');
    return marketplaceFetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MarketplaceAuthService.getAuthHeader(),
      },
      body: JSON.stringify(packageData),
    });
  },

  async starBlueprint(blueprintId) {
    if (!MarketplaceAuthService.isLoggedIn()) {
      return { success: false, error: 'Sign in to star blueprints.' };
    }
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}/star`);
    return marketplaceFetchJson(url, {
      method: 'POST',
      headers: {
        Authorization: MarketplaceAuthService.getAuthHeader(),
      },
    });
  },

  async unstarBlueprint(blueprintId) {
    if (!MarketplaceAuthService.isLoggedIn()) {
      return { success: false, error: 'Sign in to unstar blueprints.' };
    }
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}/star`);
    return marketplaceFetchJson(url, {
      method: 'DELETE',
      headers: {
        Authorization: MarketplaceAuthService.getAuthHeader(),
      },
    });
  },

  async listComments(blueprintId, options = {}) {
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}/comments`, {
      cursor: options.cursor || '',
      limit: options.limit || '',
    });
    return marketplaceFetchJson(url, { method: 'GET' });
  },

  async createComment(blueprintId, body) {
    if (!MarketplaceAuthService.isLoggedIn()) {
      return { success: false, error: 'Sign in to comment.' };
    }
    const url = this.buildUrl(`/api/blueprints/${encodeURIComponent(blueprintId)}/comments`);
    return marketplaceFetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MarketplaceAuthService.getAuthHeader(),
      },
      body: JSON.stringify({ body }),
    });
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueprintMarketplaceService;
}
