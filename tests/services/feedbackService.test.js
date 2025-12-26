import { describe, it, expect, vi } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('FeedbackService', () => {
  it('validates required fields before submit', async () => {
    const { loadScript, getExport } = createTestContext({
      fetch: vi.fn(),
      navigator: { userAgent: 'test-agent' },
      navigationManager: { currentView: 'welcomeView' },
      SystemService: { getCurrentSystem: () => null },
      SettingsService: { get: () => ({}) },
    });

    loadScript('js/services/FeedbackService.js', ['FeedbackService']);
    const FeedbackService = getExport('FeedbackService');

    const result = await FeedbackService.submitFeedback({ description: 'Missing type' });
    expect(result.success).toBe(false);
  });

  it('submits feedback with context when requested', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ issueNumber: 123, issueUrl: 'https://example.com' }),
    });

    const { loadScript, getExport } = createTestContext({
      fetch: fetchSpy,
      navigator: { userAgent: 'test-agent' },
      navigationManager: { currentView: 'settingsView' },
      SystemService: {
        getCurrentSystem: () => ({
          systemName: 'StreamView',
          teams: [],
          services: [],
          initiatives: [],
        }),
      },
      SettingsService: { get: () => ({ theme: { mode: 'light' }, ai: { isEnabled: false } }) },
    });

    loadScript('js/services/FeedbackService.js', ['FeedbackService']);
    const FeedbackService = getExport('FeedbackService');

    const result = await FeedbackService.submitFeedback({
      type: 'Bug Report',
      description: 'Issue description',
      includeContext: true,
    });

    expect(result.success).toBe(true);
    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(payload.context).toBeTruthy();
    expect(payload.currentView).toBe('settingsView');
  });
});
