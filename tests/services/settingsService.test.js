import { describe, it, expect, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

class MemoryPrefs {
  constructor() {
    this.store = {};
  }
  getSettings() {
    return { ...this.store };
  }
  saveSettings(settings) {
    this.store = { ...settings };
  }
  getUiPref(key, fallback = null) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : fallback;
  }
  setUiPref(key, value) {
    this.store[key] = value;
  }
}

describe('SettingsService', () => {
  let SettingsService;
  let repo;

  beforeEach(() => {
    repo = new MemoryPrefs();
    const { loadScript, getExport } = createTestContext({ systemRepository: repo });
    loadScript('js/services/SettingsService.js', ['SettingsService']);
    SettingsService = getExport('SettingsService');
  });

  it('loads defaults when storage is empty', () => {
    const settings = SettingsService.load();
    expect(settings.theme).toBe('light');
    expect(settings.ai.isEnabled).toBe(false);
  });

  it('updates and persists settings', () => {
    SettingsService.load();
    SettingsService.update({
      theme: 'dark',
      ai: { isEnabled: true },
    });

    const stored = repo.getSettings();
    expect(stored.theme).toBe('dark');
    expect(stored.ai.isEnabled).toBe(true);
  });

  it('stores UI preferences via repository', () => {
    SettingsService.setUiPreference('ganttSplit', 0.3);
    expect(SettingsService.getUiPreference('ganttSplit')).toBe(0.3);
  });
});
