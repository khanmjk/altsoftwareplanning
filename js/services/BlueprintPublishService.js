/**
 * BlueprintPublishService
 *
 * Handles local blueprint publication workflow:
 * - draft package creation from local systems
 * - package validation
 * - local catalog submission persistence
 */

function publishDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publishNormalizeString(value) {
  return String(value || '').trim();
}

function publishCreateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getLocalSubmissionsStorageKey() {
  return BlueprintCatalogService.getLocalSubmissionsStorageKey();
}

function readLocalSubmissions() {
  const submissions = systemRepository.getUiPref(getLocalSubmissionsStorageKey(), []);
  if (!Array.isArray(submissions)) return [];
  return submissions;
}

function writeLocalSubmissions(submissions) {
  systemRepository.setUiPref(getLocalSubmissionsStorageKey(), submissions);
}

function resolveBlueprintId(title, fallbackId = '') {
  const normalizedFallback = publishNormalizeString(fallbackId);
  if (normalizedFallback.startsWith('bp-')) {
    return normalizedFallback;
  }
  const prefix = normalizedFallback || publishCreateSlug(title) || 'untitled-blueprint';
  return `bp-community-${prefix}-${Date.now()}`;
}

const BlueprintPublishService = {
  createDraftFromSystemId(systemId, metadata = {}) {
    const systemRecord = SystemService.getAllSystems().find((system) => system.id === systemId);
    if (!systemRecord) {
      return {
        success: false,
        error: `System "${systemId}" was not found.`,
      };
    }

    const title = publishNormalizeString(metadata.title) || systemRecord.name;
    const manifest = {
      blueprintId: resolveBlueprintId(title, metadata.blueprintId),
      title,
      summary:
        publishNormalizeString(metadata.summary) ||
        systemRecord.description ||
        'Community blueprint published from a local SMT system.',
      category: publishNormalizeString(metadata.category) || 'Community',
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      trustLabel: metadata.trustLabel || 'Community',
      complexity: metadata.complexity || 'Intermediate',
      companyStage: metadata.companyStage || 'Growth',
      targetTeamSize: metadata.targetTeamSize || '50-150',
      roadmapHorizonYears: Number(metadata.roadmapHorizonYears || 3),
      schemaVersion: 13,
      appCompatibility: {
        minSystemSchemaVersion: 12,
        maxSystemSchemaVersion: 13,
      },
      promptPack: {
        seedPrompt: publishNormalizeString(metadata.seedPrompt),
        variants: Array.isArray(metadata.promptVariants) ? metadata.promptVariants : [],
        authorNotes: publishNormalizeString(metadata.authorNotes),
      },
      learningOutcomes: Array.isArray(metadata.learningOutcomes) ? metadata.learningOutcomes : [],
      author: {
        name: publishNormalizeString(metadata.authorName) || 'Community Author',
        contact: publishNormalizeString(metadata.authorContact),
      },
      license: publishNormalizeString(metadata.license) || 'CC-BY-4.0',
      sourceType: 'community',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const packageData = BlueprintPackageService.createPackageFromSystemData(
      publishDeepClone(systemRecord.data),
      manifest
    );
    return {
      success: true,
      packageData,
      systemId,
    };
  },

  validateDraft(packageData, options = {}) {
    return BlueprintPackageService.validatePackage(packageData, options);
  },

  publishDraftLocally(packageData) {
    const validation = this.validateDraft(packageData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(' '),
        validation,
      };
    }

    const submissions = readLocalSubmissions();
    const packageClone = publishDeepClone(packageData);
    const blueprintId = packageClone.manifest.blueprintId;
    const existingIndex = submissions.findIndex(
      (entry) => entry?.manifest?.blueprintId === blueprintId
    );
    if (existingIndex >= 0) {
      submissions[existingIndex] = packageClone;
    } else {
      submissions.unshift(packageClone);
    }
    writeLocalSubmissions(submissions);

    return {
      success: true,
      blueprintId,
      validation,
    };
  },

  getLocalSubmissions() {
    return publishDeepClone(readLocalSubmissions());
  },

  deleteLocalSubmission(blueprintId) {
    const submissions = readLocalSubmissions();
    const filtered = submissions.filter((entry) => entry?.manifest?.blueprintId !== blueprintId);
    writeLocalSubmissions(filtered);
    return submissions.length !== filtered.length;
  },

  buildDownloadPayload(packageData) {
    const manifestTitle = publishNormalizeString(packageData?.manifest?.title) || 'blueprint';
    const safeName = publishCreateSlug(manifestTitle) || 'blueprint';
    const fileName = `smt-blueprint-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    const json = BlueprintPackageService.serializePackage(packageData);
    return { fileName, json };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueprintPublishService;
}
