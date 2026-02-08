import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('BlueprintMarketplaceService', () => {
  let MarketplaceAuthService;
  let BlueprintMarketplaceService;
  let systemRepository;
  let fetchStub;

  beforeEach(() => {
    systemRepository = createRepositoryStub();
    fetchStub = vi.fn();
    const { loadScript, getExport } = createTestContext({
      systemRepository,
      fetch: fetchStub,
      URL,
      URLSearchParams,
    });

    loadScript('js/services/MarketplaceAuthService.js', ['MarketplaceAuthService']);
    loadScript('js/services/BlueprintMarketplaceService.js', ['BlueprintMarketplaceService']);

    MarketplaceAuthService = getExport('MarketplaceAuthService');
    BlueprintMarketplaceService = getExport('BlueprintMarketplaceService');
  });

  it('buildUrl encodes and omits empty query params', () => {
    const url = BlueprintMarketplaceService.buildUrl('/api/catalog', {
      query: 'hello world',
      trustLabel: '',
      cursor: null,
    });

    expect(url).toBe(
      'https://smt-blueprints-worker.khanmjk.workers.dev/api/catalog?query=hello+world'
    );
  });

  it('isEnabled returns true by default', () => {
    expect(BlueprintMarketplaceService.isEnabled()).toBe(true);
  });

  it('getCatalog calls fetch and returns parsed JSON payload', async () => {
    fetchStub.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, items: [{ blueprintId: 'bp-1', title: 'Test' }] }),
    });

    const result = await BlueprintMarketplaceService.getCatalog({ query: 'test', sort: 'newest' });
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchStub.mock.calls[0];
    expect(calledUrl).toContain('/api/catalog');
    expect(calledOptions.method).toBe('GET');
  });

  it('publishPackage returns an auth error when not logged in (no fetch)', async () => {
    const pkg = { format: 'smt-blueprint-package', manifest: {}, system: {} };
    const result = await BlueprintMarketplaceService.publishPackage(pkg);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Sign in');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('publishPackage includes Authorization header when logged in', async () => {
    systemRepository.setUiPref('smt_marketplace_session_v1', {
      token: 'test-token',
      user: { handle: 'tester' },
      workerBaseUrl: MarketplaceAuthService.getWorkerBaseUrl(),
    });

    fetchStub.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, versionNumber: 1, status: 'approved' }),
    });

    const pkg = {
      format: 'smt-blueprint-package',
      manifest: {
        blueprintId: 'bp-1',
        title: 'Test',
        promptPack: { seedPrompt: 'seed', variants: [] },
      },
      system: {
        systemName: 'Test',
        goals: [{ goalId: 'g1' }],
        yearlyInitiatives: [{ initiativeId: 'i1' }],
        workPackages: [{ workPackageId: 'wp1', initiativeId: 'i1' }],
        capacityConfiguration: {},
      },
    };

    const result = await BlueprintMarketplaceService.publishPackage(pkg);
    expect(result.success).toBe(true);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [, calledOptions] = fetchStub.mock.calls[0];
    expect(calledOptions.method).toBe('POST');
    expect(calledOptions.headers.Authorization).toBe('Bearer test-token');
    expect(calledOptions.headers['Content-Type']).toBe('application/json');
  });
});
