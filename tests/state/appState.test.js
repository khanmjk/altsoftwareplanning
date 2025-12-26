import { describe, it, expect, vi } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const SystemServiceStub = { setCurrentSystem: vi.fn() };
const sidebarComponentStub = { updateState: vi.fn() };
const navigationManagerStub = { navigateTo: vi.fn() };

const { loadScript, getExport } = createTestContext({
  SystemService: SystemServiceStub,
  sidebarComponent: sidebarComponentStub,
  navigationManager: navigationManagerStub,
});

loadScript('js/state/AppState.js', ['appState']);
const appState = getExport('appState');

describe('AppState', () => {
  it('gets and sets nested state', () => {
    appState.set('ui.loading', true);
    expect(appState.get('ui.loading')).toBe(true);
  });

  it('notifies subscribers on changes', () => {
    const handler = vi.fn();
    appState.subscribe('currentSystem', handler);

    appState.currentSystem = { systemName: 'Test' };
    expect(handler).toHaveBeenCalled();
  });

  it('closes the current system and navigates', () => {
    appState.closeCurrentSystem();
    expect(SystemServiceStub.setCurrentSystem).toHaveBeenCalledWith(null);
    expect(sidebarComponentStub.updateState).toHaveBeenCalled();
    expect(navigationManagerStub.navigateTo).toHaveBeenCalledWith('welcomeView');
  });
});
