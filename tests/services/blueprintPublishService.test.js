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

describe('BlueprintPublishService', () => {
  let BlueprintCatalogService;
  let BlueprintPublishService;
  let SystemService;

  beforeEach(() => {
    const systemRepository = createRepositoryStub();

    SystemService = {
      getAllSystems: vi.fn(() => [
        {
          id: 'UserSystemA',
          name: 'UserSystemA',
          description: 'User system',
          data: {
            systemName: 'UserSystemA',
            systemDescription: 'User system',
            teams: [{ teamId: 'team1' }],
            allKnownEngineers: [{ engineerId: 'eng1', name: 'A', currentTeamId: 'team1' }],
            services: [{ serviceName: 'svc1', owningTeamId: 'team1' }],
            yearlyInitiatives: [
              { initiativeId: 'init1', title: 'Init 1', workPackageIds: ['wp1'] },
            ],
            goals: [{ goalId: 'goal1', name: 'Goal 1' }],
            definedThemes: [{ themeId: 'theme1', name: 'Theme 1' }],
            sdms: [{ sdmId: 'sdm1' }],
            pmts: [{ pmtId: 'pmt1' }],
            projectManagers: [{ pmId: 'pm1' }],
            workPackages: [{ workPackageId: 'wp1', initiativeId: 'init1' }],
            capacityConfiguration: { workingDaysPerYear: 261, standardHoursPerDay: 8 },
            attributes: {},
          },
        },
      ]),
      getExportSchemaVersion: vi.fn(() => 12),
      systemExists: vi.fn(() => false),
      importFromJson: vi.fn(),
    };

    const { loadScript, getExport } = createTestContext({
      systemRepository,
      SystemService,
    });

    loadScript('js/sampleData/sampleStreamingPlatform.js', ['sampleSystemDataStreamView']);
    loadScript('js/sampleData/sampleContactCenterPlatform.js', ['sampleSystemDataContactCenter']);
    loadScript('js/sampleData/sampleShopSphere.js', ['sampleSystemDataShopSphere']);
    loadScript('js/sampleData/sampleInsightAI.js', ['sampleSystemDataInsightAI']);
    loadScript('js/sampleData/sampleFinSecure.js', ['sampleSystemDataFinSecure']);
    loadScript('js/services/BlueprintCatalogService.js', ['BlueprintCatalogService']);
    loadScript('js/services/BlueprintPackageService.js', ['BlueprintPackageService']);
    loadScript('js/services/BlueprintPublishService.js', ['BlueprintPublishService']);

    BlueprintCatalogService = getExport('BlueprintCatalogService');
    BlueprintPublishService = getExport('BlueprintPublishService');
  });

  it('creates a draft package from a local system', () => {
    const result = BlueprintPublishService.createDraftFromSystemId('UserSystemA', {
      title: 'My Community Blueprint',
      seedPrompt: 'Build system prompt.',
    });

    expect(result.success).toBe(true);
    expect(result.packageData.manifest.title).toBe('My Community Blueprint');
    expect(result.packageData.system.attributes.blueprint.title).toBe('My Community Blueprint');
  });

  it('publishes a valid draft to local catalog storage', () => {
    const draftResult = BlueprintPublishService.createDraftFromSystemId('UserSystemA', {
      title: 'Published Blueprint',
      seedPrompt: 'Build system prompt.',
    });
    expect(draftResult.success).toBe(true);

    const publishResult = BlueprintPublishService.publishDraftLocally(draftResult.packageData);
    expect(publishResult.success).toBe(true);

    const catalogResults = BlueprintCatalogService.searchCatalog({
      query: 'Published Blueprint',
      sourceType: 'community',
    });
    expect(catalogResults).toHaveLength(1);
    expect(catalogResults[0].title).toBe('Published Blueprint');
  });

  it('preserves explicit curated blueprint id for contribution packages', () => {
    const curatedEntry = BlueprintCatalogService.getCuratedCatalog()[40];
    const result = BlueprintPublishService.createDraftFromSystemId('UserSystemA', {
      blueprintId: curatedEntry.blueprintId,
      title: curatedEntry.title,
      summary: curatedEntry.summary,
      category: curatedEntry.category,
      seedPrompt: curatedEntry.promptPack.seedPrompt,
    });

    expect(result.success).toBe(true);
    expect(result.packageData.manifest.blueprintId).toBe(curatedEntry.blueprintId);
  });
});
