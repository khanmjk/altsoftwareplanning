import { describe, it, expect, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

function createRepositoryStub() {
  const store = {};
  return {
    getSettings() {
      return store.__settings || {};
    },
    saveSettings(settings) {
      store.__settings = { ...settings };
    },
    getUiPref(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback;
    },
    setUiPref(key, value) {
      store[key] = value;
    },
  };
}

describe('MarketplaceAuthService', () => {
  let MarketplaceAuthService;
  let systemRepository;

  beforeEach(() => {
    systemRepository = createRepositoryStub();
    const { loadScript, getExport } = createTestContext({
      systemRepository,
      URL,
      URLSearchParams,
    });
    loadScript('js/services/MarketplaceAuthService.js', ['MarketplaceAuthService']);
    MarketplaceAuthService = getExport('MarketplaceAuthService');
  });

  it('returns a Bearer auth header when a session token is stored', () => {
    systemRepository.setUiPref('smt_marketplace_session_v1', {
      token: 'test-token',
      user: { handle: 'tester' },
      workerBaseUrl: MarketplaceAuthService.getWorkerBaseUrl(),
    });

    expect(MarketplaceAuthService.getAuthHeader()).toBe('Bearer test-token');
    expect(MarketplaceAuthService.isLoggedIn()).toBe(true);
  });

  it('invalidates sessions when stored worker origin does not match canonical worker origin', () => {
    systemRepository.setUiPref('smt_marketplace_session_v1', {
      token: 'test-token',
      user: { handle: 'tester' },
      workerBaseUrl: 'https://other.example.workers.dev',
    });

    expect(MarketplaceAuthService.isLoggedIn()).toBe(false);
    expect(MarketplaceAuthService.getAuthHeader()).toBe('');
  });
});
