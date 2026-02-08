import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

function createRepositoryStub() {
  const prefs = {};
  return {
    getUiPref(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : fallback;
    },
    setUiPref(key, value) {
      prefs[key] = value;
    },
  };
}

describe('BlueprintPackageService', () => {
  let BlueprintCatalogService;
  let BlueprintPackageService;
  let SystemService;
  let systemRepository;

  beforeEach(() => {
    SystemService = {
      systemExists: vi.fn(() => false),
      getExportSchemaVersion: vi.fn(() => 12),
      importFromJson: vi.fn(() => ({
        success: true,
        importedCount: 1,
        importedSystemIds: ['Installed Blueprint'],
        warnings: [],
      })),
    };

    systemRepository = createRepositoryStub();
    const { context, loadScript, getExport } = createTestContext({
      systemRepository,
      SystemService,
    });

    loadScript('js/sampleData/sampleStreamingPlatform.js', ['sampleSystemDataStreamView']);
    loadScript('js/sampleData/sampleContactCenterPlatform.js', ['sampleSystemDataContactCenter']);
    loadScript('js/sampleData/sampleShopSphere.js', ['sampleSystemDataShopSphere']);
    loadScript('js/sampleData/sampleInsightAI.js', ['sampleSystemDataInsightAI']);
    loadScript('js/sampleData/sampleFinSecure.js', ['sampleSystemDataFinSecure']);
    loadScript('js/services/BlueprintCatalogService.js', ['BlueprintCatalogService']);
    context.launchBlueprintPackages = {
      'bp-001-rideshare-platform-v1': {
        format: 'smt-blueprint-package',
        packageSchemaVersion: 1,
        manifest: {
          blueprintId: 'bp-001-rideshare-platform-v1',
          title: 'Rideshare Platform (Uber-style)',
          trustLabel: 'Verified',
          sourceType: 'curated',
          updatedAt: '2026-02-07T00:00:00Z',
          promptPack: {
            seedPrompt: 'Generate rideshare architecture JSON.',
            variants: [],
          },
          appCompatibility: {
            minSystemSchemaVersion: 12,
            maxSystemSchemaVersion: 13,
          },
        },
        system: {
          systemName: 'Rideshare Platform (Uber-style) Blueprint',
          goals: [{ goalId: 'goal-1', name: 'Goal 1' }],
          yearlyInitiatives: [{ initiativeId: 'init-1', title: 'Init 1' }],
          workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
          capacityConfiguration: {},
        },
      },
    };
    loadScript('js/services/BlueprintPackageService.js', ['BlueprintPackageService']);

    BlueprintCatalogService = getExport('BlueprintCatalogService');
    BlueprintPackageService = getExport('BlueprintPackageService');
  });

  it('creates a package with blueprint provenance metadata', () => {
    const entry = BlueprintCatalogService.getCuratedCatalog()[0];
    const pkg = BlueprintPackageService.createPackageFromCatalogEntry(entry);

    expect(pkg.format).toBe('smt-blueprint-package');
    expect(pkg.manifest.blueprintId).toBe(entry.blueprintId);
    expect(pkg.system.attributes.blueprint.blueprintId).toBe(entry.blueprintId);
    expect(pkg.system.attributes.aiGeneration.seedPrompt).toContain(entry.title);
  });

  it('validates required prompt seed and goal/initiative content', () => {
    const invalid = {
      format: 'smt-blueprint-package',
      manifest: {
        blueprintId: 'bp-invalid',
        title: 'Invalid',
        promptPack: { seedPrompt: '' },
        appCompatibility: { maxSystemSchemaVersion: 13 },
      },
      system: {
        systemName: 'Invalid',
        goals: [],
        yearlyInitiatives: [],
        workPackages: [],
        capacityConfiguration: {},
      },
    };

    const result = BlueprintPackageService.validatePackage(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('seedPrompt'))).toBe(true);
    expect(result.errors.some((error) => error.includes('goal'))).toBe(true);
  });

  it('installs available curated catalog blueprints through SystemService import path', async () => {
    const entry = BlueprintCatalogService.getCuratedCatalog()[0];
    const installResult = await BlueprintPackageService.installCatalogBlueprint(entry.blueprintId);

    expect(installResult.success).toBe(true);
    expect(SystemService.importFromJson).toHaveBeenCalledTimes(1);
    const payload = SystemService.importFromJson.mock.calls[0][0];
    expect(payload.format).toBe('smt-system-export');
    expect(payload.systems).toHaveLength(1);
    expect(payload.systems[0].data.attributes.blueprint.blueprintId).toBe(entry.blueprintId);
    expect(payload.systems[0].data.attributes.blueprint.catalogUpdatedAt).toBe(
      '2026-02-07T00:00:00Z'
    );
  });

  it('blocks curated installs when blueprint is not available and has no contribution package', async () => {
    const unavailable = BlueprintCatalogService.getCuratedCatalog()[60];
    expect(unavailable.availabilityStatus).toBe('Needs Contribution');

    const installResult = await BlueprintPackageService.installCatalogBlueprint(
      unavailable.blueprintId
    );
    expect(installResult.success).toBe(false);
    expect(installResult.error).toContain('not yet available');
    expect(SystemService.importFromJson).not.toHaveBeenCalled();
  });

  it('installs curated blueprints from local contribution package when available', async () => {
    const unavailable = BlueprintCatalogService.getCuratedCatalog()[70];
    const key = BlueprintCatalogService.getLocalSubmissionsStorageKey();
    systemRepository.setUiPref(key, [
      {
        format: 'smt-blueprint-package',
        packageSchemaVersion: 1,
        manifest: {
          blueprintId: unavailable.blueprintId,
          title: unavailable.title,
          promptPack: {
            seedPrompt: 'Community generated package for curated blueprint.',
            variants: [],
          },
          appCompatibility: {
            minSystemSchemaVersion: 12,
            maxSystemSchemaVersion: 13,
          },
        },
        system: {
          systemName: `${unavailable.title} Blueprint`,
          goals: [{ goalId: 'goal-1' }],
          yearlyInitiatives: [{ initiativeId: 'init-1' }],
          workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
          capacityConfiguration: {},
        },
      },
    ]);

    const installResult = await BlueprintPackageService.installCatalogBlueprint(
      unavailable.blueprintId
    );
    expect(installResult.success).toBe(true);
    expect(SystemService.importFromJson).toHaveBeenCalledTimes(1);
  });

  it('warns when secret-like strings are found in the system payload', () => {
    const pkg = {
      format: 'smt-blueprint-package',
      manifest: {
        blueprintId: 'bp-secret-test',
        title: 'Secret Test',
        promptPack: { seedPrompt: 'Seed prompt', variants: [] },
        appCompatibility: { minSystemSchemaVersion: 12, maxSystemSchemaVersion: 12 },
      },
      system: {
        systemName: 'Secret Test',
        goals: [{ goalId: 'goal-1', name: 'Goal' }],
        yearlyInitiatives: [{ initiativeId: 'init-1', title: 'Init' }],
        workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
        capacityConfiguration: {},
        attributes: {
          integrations: {
            apiKey: 'sk-abcdefghijklmnopqrstuvwxyz123456',
          },
        },
      },
    };

    const result = BlueprintPackageService.validatePackage(pkg);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((warning) => warning.toLowerCase().includes('secrets'))).toBe(true);
  });

  it('fails validation when failOnSecrets is enabled and secret-like strings are present', () => {
    const pkg = {
      format: 'smt-blueprint-package',
      manifest: {
        blueprintId: 'bp-secret-test',
        title: 'Secret Test',
        promptPack: { seedPrompt: 'Seed prompt', variants: [] },
        appCompatibility: { minSystemSchemaVersion: 12, maxSystemSchemaVersion: 12 },
      },
      system: {
        systemName: 'Secret Test',
        goals: [{ goalId: 'goal-1', name: 'Goal' }],
        yearlyInitiatives: [{ initiativeId: 'init-1', title: 'Init' }],
        workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
        capacityConfiguration: {},
        attributes: {
          integrations: {
            apiKey: 'sk-abcdefghijklmnopqrstuvwxyz123456',
          },
        },
      },
    };

    const result = BlueprintPackageService.validatePackage(pkg, { failOnSecrets: true });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.toLowerCase().includes('secrets'))).toBe(true);
  });

  it('does not flag placeholder apiKey values as secrets', () => {
    const pkg = {
      format: 'smt-blueprint-package',
      manifest: {
        blueprintId: 'bp-placeholder-test',
        title: 'Placeholder Test',
        promptPack: { seedPrompt: 'Seed prompt', variants: [] },
        appCompatibility: { minSystemSchemaVersion: 12, maxSystemSchemaVersion: 12 },
      },
      system: {
        systemName: 'Placeholder Test',
        goals: [{ goalId: 'goal-1', name: 'Goal' }],
        yearlyInitiatives: [{ initiativeId: 'init-1', title: 'Init' }],
        workPackages: [{ workPackageId: 'wp-1', initiativeId: 'init-1' }],
        capacityConfiguration: {},
        attributes: {
          integrations: {
            apiKey: 'YOUR_API_KEY',
          },
        },
      },
    };

    const result = BlueprintPackageService.validatePackage(pkg, { failOnSecrets: true });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
