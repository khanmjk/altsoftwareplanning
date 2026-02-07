import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/repositories/SystemRepository.js', ['SystemRepository']);
const SystemRepository = getExport('SystemRepository');

class MemoryDriver {
  constructor() {
    this.data = {};
  }
  loadAll() {
    return { ...this.data };
  }
  saveAll(map) {
    this.data = { ...map };
  }
  clear() {
    this.data = {};
  }
}

describe('SystemRepository', () => {
  it('saves and loads system data', () => {
    const driver = new MemoryDriver();
    const repo = new SystemRepository({ driver });
    const payload = { systemName: 'Test System' };

    const saved = repo.saveSystem('Test', payload);
    expect(saved).toBe(true);
    expect(repo.getSystemData('Test').systemName).toBe('Test System');
  });

  it('deletes systems from storage', () => {
    const driver = new MemoryDriver();
    const repo = new SystemRepository({ driver });
    repo.saveSystem('Test', { systemName: 'Test' });

    expect(repo.deleteSystem('Test')).toBe(true);
    expect(repo.getSystemData('Test')).toBeNull();
  });

  it('manages settings and UI prefs', () => {
    const settingsDriver = new MemoryDriver();
    const prefsDriver = new MemoryDriver();
    const repo = new SystemRepository({ settingsDriver, prefsDriver });

    repo.saveSettings({ theme: 'dark' });
    expect(repo.getSettings().theme).toBe('dark');
    repo.clearSettings();
    expect(Object.keys(repo.getSettings()).length).toBe(0);

    repo.saveUiPrefs({ sidebar: 'collapsed' });
    expect(repo.getUiPrefs().sidebar).toBe('collapsed');
    repo.clearUiPrefs();
    expect(Object.keys(repo.getUiPrefs()).length).toBe(0);
  });

  it('migrates only user systems from previous storage version', () => {
    const currentDriver = new MemoryDriver();
    const previousDriver = new MemoryDriver();
    previousDriver.saveAll({
      StreamView: { systemName: 'StreamView', systemDescription: 'old sample' },
      ConnectPro: { systemName: 'ConnectPro', systemDescription: 'old sample' },
      UserSystemAlpha: { systemName: 'UserSystemAlpha', systemDescription: 'keep me' },
    });

    const originalCreateDriver = SystemRepository.prototype._createDriver;
    SystemRepository.prototype._createDriver = function patchedCreateDriver(
      storageMode,
      storageKey
    ) {
      if (storageKey === this.previousStorageKey) {
        return previousDriver;
      }
      return originalCreateDriver.call(this, storageMode, storageKey);
    };

    try {
      const repo = new SystemRepository({
        driver: currentDriver,
        settingsDriver: new MemoryDriver(),
        prefsDriver: new MemoryDriver(),
      });

      expect(repo.getSystemData('UserSystemAlpha')?.systemName).toBe('UserSystemAlpha');
      expect(repo.getSystemData('StreamView')).toBeNull();
      expect(repo.getSystemData('ConnectPro')).toBeNull();
    } finally {
      SystemRepository.prototype._createDriver = originalCreateDriver;
    }
  });

  it('does not migrate when current storage already has data', () => {
    const currentDriver = new MemoryDriver();
    currentDriver.saveAll({
      ExistingSystem: { systemName: 'ExistingSystem', systemDescription: 'already current' },
    });

    const previousDriver = new MemoryDriver();
    previousDriver.saveAll({
      UserSystemAlpha: { systemName: 'UserSystemAlpha', systemDescription: 'should not copy' },
    });

    const originalCreateDriver = SystemRepository.prototype._createDriver;
    SystemRepository.prototype._createDriver = function patchedCreateDriver(
      storageMode,
      storageKey
    ) {
      if (storageKey === this.previousStorageKey) {
        return previousDriver;
      }
      return originalCreateDriver.call(this, storageMode, storageKey);
    };

    try {
      const repo = new SystemRepository({
        driver: currentDriver,
        settingsDriver: new MemoryDriver(),
        prefsDriver: new MemoryDriver(),
      });

      expect(repo.getSystemData('ExistingSystem')?.systemName).toBe('ExistingSystem');
      expect(repo.getSystemData('UserSystemAlpha')).toBeNull();
    } finally {
      SystemRepository.prototype._createDriver = originalCreateDriver;
    }
  });
});
