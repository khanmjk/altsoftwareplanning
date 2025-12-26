import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

function createRepo() {
  const systems = {};
  return {
    configure: vi.fn(),
    getAllSystemsMap: () => ({ ...systems }),
    getSystemData: (id) => systems[id] || null,
    saveSystem: (id, data) => {
      systems[id] = { ...data };
      return true;
    },
    deleteSystem: (id) => {
      if (!systems[id]) return false;
      delete systems[id];
      return true;
    },
  };
}

describe('SystemService', () => {
  let systemRepository;
  let SystemService;
  let navigationManager;
  let aiAgentController;
  let sidebarComponent;
  let notificationManager;

  beforeEach(() => {
    systemRepository = createRepo();
    navigationManager = { navigateTo: vi.fn() };
    aiAgentController = { startSession: vi.fn() };
    sidebarComponent = { updateState: vi.fn() };
    notificationManager = { showToast: vi.fn() };
    const WorkPackageService = { ensureWorkPackagesForInitiatives: vi.fn() };
    const appState = { currentSystem: null };

    const { loadScript, getExport } = createTestContext({
      systemRepository,
      navigationManager,
      aiAgentController,
      sidebarComponent,
      notificationManager,
      WorkPackageService,
      appState,
    });

    loadScript('js/sampleData/sampleStreamingPlatform.js', ['sampleSystemDataStreamView']);
    loadScript('js/sampleData/sampleContactCenterPlatform.js', ['sampleSystemDataContactCenter']);
    loadScript('js/sampleData/sampleShopSphere.js', ['sampleSystemDataShopSphere']);
    loadScript('js/sampleData/sampleInsightAI.js', ['sampleSystemDataInsightAI']);
    loadScript('js/sampleData/sampleFinSecure.js', ['sampleSystemDataFinSecure']);

    loadScript('js/services/SystemService.js', ['SystemService']);
    SystemService = getExport('SystemService');
  });

  it('initializes default sample systems', () => {
    SystemService.initializeDefaults({ forceOverwrite: true });
    const map = systemRepository.getAllSystemsMap();
    expect(Object.keys(map).length).toBeGreaterThan(0);
    expect(map.StreamView.systemName).toBe('StreamView');
  });

  it('creates a default system structure', () => {
    const system = SystemService.createSystem();
    expect(system.systemName).toBe('New Software System');
    expect(Array.isArray(system.teams)).toBe(true);
    expect(Array.isArray(system.yearlyInitiatives)).toBe(true);
  });

  it('saves and loads systems', () => {
    const system = getSampleSystem('StreamView');
    const saved = SystemService.saveSystem(system);
    expect(saved).toBe(true);

    const loaded = SystemService.loadSystem('StreamView');
    expect(loaded.systemName).toBe('StreamView');
  });

  it('activates a system and triggers navigation', () => {
    const system = getSampleSystem('StreamView');
    systemRepository.saveSystem('StreamView', system);

    const success = SystemService.loadAndActivate('StreamView');
    expect(success).toBe(true);
    expect(SystemService.getCurrentSystem().systemName).toBe('StreamView');
    expect(aiAgentController.startSession).toHaveBeenCalled();
    expect(navigationManager.navigateTo).toHaveBeenCalledWith('visualizationCarousel');
  });
});
