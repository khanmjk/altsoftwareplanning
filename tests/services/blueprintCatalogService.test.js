import { describe, it, expect, beforeEach } from 'vitest';

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

describe('BlueprintCatalogService', () => {
  let BlueprintCatalogService;
  let systemRepository;

  beforeEach(() => {
    systemRepository = createRepositoryStub();

    const { loadScript, getExport } = createTestContext({
      systemRepository,
    });

    loadScript('js/services/BlueprintCatalogService.js', ['BlueprintCatalogService']);
    BlueprintCatalogService = getExport('BlueprintCatalogService');
  });

  it('returns full curated top-100 catalog', () => {
    const curated = BlueprintCatalogService.getCuratedCatalog();
    expect(curated).toHaveLength(100);
    expect(curated[0].blueprintId).toContain('bp-001');
    expect(curated[0].availabilityStatus).toBe('Available');
    expect(curated[24].availabilityStatus).toBe('Available');
    expect(curated[25].availabilityStatus).toBe('Needs Contribution');
    expect(curated[0].promptPack.seedPrompt.toLowerCase()).not.toContain('strict json');
    expect(curated[0].tags.includes('and')).toBe(false);
  });

  it('filters catalog by category and query', () => {
    const fintech = BlueprintCatalogService.searchCatalog({
      category: 'Fintech',
      query: 'wallet',
    });
    expect(fintech.length).toBeGreaterThan(0);
    expect(fintech.some((entry) => entry.title.toLowerCase().includes('wallet'))).toBe(true);
  });

  it('supports robust metadata search across availability, category, trust label, and tags', () => {
    const availableResults = BlueprintCatalogService.searchCatalog({
      query: 'Available',
    });
    expect(availableResults.length).toBeGreaterThanOrEqual(25);
    expect(
      availableResults.every(
        (entry) => String(entry.availabilityStatus).toLowerCase() === 'available'
      )
    ).toBe(true);

    const categoryResults = BlueprintCatalogService.searchCatalog({
      query: 'Marketplace and Mobility',
    });
    expect(categoryResults.length).toBeGreaterThan(0);

    const trustResults = BlueprintCatalogService.searchCatalog({
      query: 'Verified',
    });
    expect(trustResults.length).toBeGreaterThan(0);
    expect(
      trustResults.every((entry) => String(entry.trustLabel).toLowerCase() === 'verified')
    ).toBe(true);

    const tagResults = BlueprintCatalogService.searchCatalog({
      query: 'mobility',
    });
    expect(tagResults.length).toBeGreaterThan(0);
  });

  it('includes local community submissions in catalog search', () => {
    const key = BlueprintCatalogService.getLocalSubmissionsStorageKey();
    systemRepository.setUiPref(key, [
      {
        manifest: {
          blueprintId: 'bp-community-demo-1',
          title: 'Community Demo Blueprint',
          summary: 'Demo',
          category: 'Community',
          tags: ['demo'],
          trustLabel: 'Community',
          complexity: 'Intermediate',
          companyStage: 'Growth',
          targetTeamSize: '20-50',
          roadmapHorizonYears: 3,
          promptPack: { seedPrompt: 'demo prompt', variants: [] },
        },
        system: { systemName: 'Demo', goals: [{}], yearlyInitiatives: [{}], workPackages: [{}] },
      },
    ]);

    const results = BlueprintCatalogService.searchCatalog({
      query: 'Community Demo Blueprint',
      sourceType: 'community',
    });

    expect(results).toHaveLength(1);
    expect(results[0].blueprintId).toBe('bp-community-demo-1');
  });

  it('marks curated entries as available when contributed package exists for the same blueprint id', () => {
    const target = BlueprintCatalogService.getCuratedCatalog()[70];
    expect(target.availabilityStatus).toBe('Needs Contribution');

    const key = BlueprintCatalogService.getLocalSubmissionsStorageKey();
    systemRepository.setUiPref(key, [
      {
        manifest: {
          blueprintId: target.blueprintId,
          title: target.title,
          summary: target.summary,
          category: target.category,
          tags: target.tags,
          trustLabel: 'Community',
          complexity: target.complexity,
          companyStage: target.companyStage,
          targetTeamSize: target.targetTeamSize,
          roadmapHorizonYears: 3,
          promptPack: { seedPrompt: 'generated prompt', variants: [] },
        },
        system: {
          systemName: `${target.title} Blueprint`,
          goals: [{ goalId: 'goal-1' }],
          yearlyInitiatives: [{ initiativeId: 'init-1' }],
          workPackages: [{ workPackageId: 'wp-1' }],
          capacityConfiguration: {},
        },
      },
    ]);

    const refreshedTarget = BlueprintCatalogService.getBlueprintById(target.blueprintId);
    expect(refreshedTarget.availabilityStatus).toBe('Available');
    expect(refreshedTarget.isInstallable).toBe(true);

    const communityResults = BlueprintCatalogService.searchCatalog({
      sourceType: 'community',
      query: target.title,
    });
    expect(communityResults).toHaveLength(0);
  });
});
