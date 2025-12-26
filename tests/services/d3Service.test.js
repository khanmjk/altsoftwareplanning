import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('D3Service', () => {
  it('returns null when d3 is unavailable', () => {
    const { loadScript, getExport } = createTestContext();
    loadScript('js/services/D3Service.js', ['D3Service']);
    const D3Service = getExport('D3Service');

    expect(D3Service.isAvailable()).toBe(false);
    expect(D3Service.getInstance()).toBeNull();
  });

  it('exposes d3 instance when available', () => {
    const d3Stub = { select: () => 'ok', selectAll: () => 'ok' };
    const { loadScript, getExport } = createTestContext({ d3: d3Stub });
    loadScript('js/services/D3Service.js', ['D3Service']);
    const D3Service = getExport('D3Service');

    expect(D3Service.isAvailable()).toBe(true);
    expect(D3Service.getInstance()).toBe(d3Stub);
  });
});
