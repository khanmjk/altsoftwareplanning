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

  it('exports current system with schema metadata', () => {
    const system = getSampleSystem('StreamView');
    SystemService.setCurrentSystem(system);

    const exported = SystemService.exportSystemsAsJson();
    expect(exported.payload.format).toBe('smt-system-export');
    expect(exported.payload.schemaVersion).toBe(SystemService.getExportSchemaVersion());
    expect(exported.payload.systems[0].id).toBe('StreamView');
  });

  it('imports a legacy single-system payload using compatibility mode', () => {
    const legacyPayload = {
      systemName: 'Imported Legacy',
      teams: [],
      allKnownEngineers: [],
      services: [],
      yearlyInitiatives: [],
      goals: [],
      definedThemes: [],
      sdms: [],
      pmts: [],
      seniorManagers: [],
      projectManagers: [],
      workPackages: [],
    };

    const result = SystemService.importFromJson(JSON.stringify(legacyPayload), {
      activateFirst: false,
    });

    expect(result.success).toBe(true);
    expect(result.importedSystemIds).toContain('Imported Legacy');
    expect(systemRepository.getSystemData('Imported Legacy')).toBeTruthy();
  });

  it('rejects imports from unsupported newer schema versions', () => {
    const payload = {
      format: 'smt-system-export',
      schemaVersion: 999,
      systems: [{ id: 'Any', data: { systemName: 'Any' } }],
    };

    const result = SystemService.importFromJson(payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('newer than supported');
  });
});
