/**
 * BlueprintPackageService
 *
 * Parses, validates, builds, and installs blueprint packages.
 */

const BLUEPRINT_PACKAGE_FORMAT = 'smt-blueprint-package';
const BLUEPRINT_PACKAGE_SCHEMA_VERSION = 1;
const BLUEPRINT_ALLOWED_TRUST_LABELS = ['Verified', 'Community', 'Experimental'];
const LAUNCH_PACKAGE_DATA_URL = 'data/blueprints/launch25-packages.json';

let _cachedLaunchPackageMap = null;
let _cachedLaunchPackagePromise = null;

function packageDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function packageNormalizeString(value) {
  return String(value || '').trim();
}

function packageCreateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getTemplateSystemByKey(templateSystemKey) {
  const templates = {
    StreamView: sampleSystemDataStreamView,
    ConnectPro: sampleSystemDataContactCenter,
    ShopSphere: sampleSystemDataShopSphere,
    InsightAI: sampleSystemDataInsightAI,
    FinSecure: sampleSystemDataFinSecure,
  };
  return templates[templateSystemKey] || sampleSystemDataStreamView;
}

function getLaunchPackagesFromGlobal() {
  if (typeof launchBlueprintPackages === 'object' && launchBlueprintPackages) {
    return launchBlueprintPackages;
  }
  return null;
}

async function loadLaunchPackageMap() {
  if (_cachedLaunchPackageMap) {
    return _cachedLaunchPackageMap;
  }

  const globalMap = getLaunchPackagesFromGlobal();
  if (globalMap) {
    _cachedLaunchPackageMap = packageDeepClone(globalMap);
    return _cachedLaunchPackageMap;
  }

  if (_cachedLaunchPackagePromise) {
    return _cachedLaunchPackagePromise;
  }

  if (typeof fetch !== 'function') {
    _cachedLaunchPackageMap = {};
    return _cachedLaunchPackageMap;
  }

  _cachedLaunchPackagePromise = fetch(LAUNCH_PACKAGE_DATA_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load launch package data (${response.status}).`);
      }
      return response.json();
    })
    .then((payload) => {
      _cachedLaunchPackageMap = payload?.packages || {};
      return _cachedLaunchPackageMap;
    })
    .catch((error) => {
      console.error('[BlueprintPackageService] Could not load launch package data:', error);
      _cachedLaunchPackageMap = {};
      return _cachedLaunchPackageMap;
    });

  return _cachedLaunchPackagePromise;
}

function getCommunitySubmissions() {
  const submissions = systemRepository.getUiPref(
    BlueprintCatalogService.getLocalSubmissionsStorageKey(),
    []
  );
  if (!Array.isArray(submissions)) return [];
  return submissions;
}

function ensureUniqueSystemName(baseName) {
  const normalizedBase = packageNormalizeString(baseName) || 'Installed Blueprint';
  if (!SystemService.systemExists(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  let candidate = `${normalizedBase} (${suffix})`;
  while (SystemService.systemExists(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase} (${suffix})`;
  }
  return candidate;
}

function normalizeManifestInput(manifestInput) {
  const title = packageNormalizeString(manifestInput.title) || 'Untitled Blueprint';
  const sourceId = packageNormalizeString(manifestInput.blueprintId || packageCreateSlug(title));
  return {
    blueprintId: sourceId.startsWith('bp-') ? sourceId : `bp-${sourceId}`,
    title,
    summary: packageNormalizeString(manifestInput.summary) || 'Blueprint package.',
    category: packageNormalizeString(manifestInput.category) || 'Uncategorized',
    tags: Array.isArray(manifestInput.tags)
      ? manifestInput.tags.map((tag) => packageNormalizeString(tag)).filter(Boolean)
      : [],
    trustLabel: BLUEPRINT_ALLOWED_TRUST_LABELS.includes(manifestInput.trustLabel)
      ? manifestInput.trustLabel
      : 'Community',
    complexity: packageNormalizeString(manifestInput.complexity) || 'Intermediate',
    companyStage: packageNormalizeString(manifestInput.companyStage) || 'Growth',
    targetTeamSize: packageNormalizeString(manifestInput.targetTeamSize) || '50-150',
    roadmapHorizonYears: Number(manifestInput.roadmapHorizonYears || 3),
    schemaVersion: Number(manifestInput.schemaVersion || 13),
    appCompatibility: manifestInput.appCompatibility || {
      minSystemSchemaVersion: 12,
      maxSystemSchemaVersion: 13,
    },
    templateSystemKey: manifestInput.templateSystemKey || 'StreamView',
    promptPack: manifestInput.promptPack || {
      seedPrompt: '',
      variants: [],
      authorNotes: '',
    },
    learningOutcomes: Array.isArray(manifestInput.learningOutcomes)
      ? manifestInput.learningOutcomes
      : [],
    author: manifestInput.author || {
      name: 'Unknown Author',
      contact: '',
    },
    license: packageNormalizeString(manifestInput.license) || 'CC-BY-4.0',
    sourceType: packageNormalizeString(manifestInput.sourceType) || 'community',
    createdAt: manifestInput.createdAt || new Date().toISOString(),
    updatedAt: manifestInput.updatedAt || new Date().toISOString(),
  };
}

function attachBlueprintProvenance(systemData, manifest) {
  const cloned = packageDeepClone(systemData);
  const attributes = cloned.attributes || {};
  attributes.blueprint = {
    blueprintId: manifest.blueprintId,
    title: manifest.title,
    trustLabel: manifest.trustLabel,
    sourceType: manifest.sourceType || 'community',
    importedAt: new Date().toISOString(),
  };
  attributes.aiGeneration = {
    provider: 'pre-generated-catalog',
    model: 'curated-template-v1',
    seedPrompt: manifest.promptPack?.seedPrompt || '',
    promptVersion: 'v1',
    generatedAt: new Date().toISOString(),
  };
  cloned.attributes = attributes;
  return cloned;
}

function attachInstalledBlueprintMetadata(systemData, manifest, packageData) {
  const cloned = packageDeepClone(systemData);
  if (!cloned.attributes || typeof cloned.attributes !== 'object') {
    cloned.attributes = {};
  }

  const existingBlueprintMetadata =
    cloned.attributes.blueprint && typeof cloned.attributes.blueprint === 'object'
      ? cloned.attributes.blueprint
      : {};

  cloned.attributes.blueprint = {
    ...existingBlueprintMetadata,
    blueprintId: manifest.blueprintId,
    title: manifest.title,
    trustLabel: manifest.trustLabel || existingBlueprintMetadata.trustLabel || 'Community',
    sourceType: manifest.sourceType || existingBlueprintMetadata.sourceType || 'community',
    importedAt: new Date().toISOString(),
    manifestUpdatedAt: manifest.updatedAt || existingBlueprintMetadata.manifestUpdatedAt || null,
    catalogUpdatedAt: manifest.updatedAt || existingBlueprintMetadata.catalogUpdatedAt || null,
    packageExportedAt:
      packageData?.exportedAt || existingBlueprintMetadata.packageExportedAt || null,
  };

  if (
    !cloned.attributes.blueprintGeneration ||
    typeof cloned.attributes.blueprintGeneration !== 'object'
  ) {
    cloned.attributes.blueprintGeneration = {};
  }
  if (!cloned.attributes.blueprintGeneration.blueprintId) {
    cloned.attributes.blueprintGeneration.blueprintId = manifest.blueprintId;
  }

  return cloned;
}

function listPackageSecretFindings(packageData) {
  const findings = [];

  const hardPatterns = [
    { id: 'openai', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
    { id: 'github_pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
    { id: 'github_ghp', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
    { id: 'google_api', re: /\bAIza[0-9A-Za-z\-_]{30,}\b/g },
    { id: 'aws_access', re: /\bAKIA[0-9A-Z]{16}\b/g },
    { id: 'private_key', re: /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/g },
    { id: 'jwt', re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  ];

  const suspiciousKeyRe = /(api[_-]?key|secret|token|password|private[_-]?key)/i;
  const placeholderRe =
    /^(?:redacted|tbd|todo|your[_ -]?api[_ -]?key|change[_ -]?me|replace[_ -]?me|example)$/i;

  const visit = (value, path, depth) => {
    if (depth > 14) return;
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      const text = value;
      for (const pattern of hardPatterns) {
        const matches = text.match(pattern.re);
        if (matches && matches.length > 0) {
          findings.push({
            type: 'hard',
            pattern: pattern.id,
            path,
          });
          break;
        }
      }
      return;
    }

    if (typeof value !== 'object') return;

    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((entry, index) => {
        visit(entry, `${path}[${index}]`, depth + 1);
      });
      return;
    }

    const entries = Object.entries(value).slice(0, 80);
    entries.forEach(([key, entryValue]) => {
      const nextPath = path ? `${path}.${key}` : key;

      if (suspiciousKeyRe.test(key) && typeof entryValue === 'string') {
        const candidate = entryValue.trim();
        const looksLikePlaceholder = !candidate || placeholderRe.test(candidate);
        if (!looksLikePlaceholder && candidate.length >= 12) {
          findings.push({
            type: 'suspicious',
            pattern: 'suspicious_key_value',
            path: nextPath,
          });
        }
      }

      visit(entryValue, nextPath, depth + 1);
    });
  };

  visit(packageData, '', 0);
  return findings;
}

const BlueprintPackageService = {
  getPackageFormat() {
    return BLUEPRINT_PACKAGE_FORMAT;
  },

  getPackageSchemaVersion() {
    return BLUEPRINT_PACKAGE_SCHEMA_VERSION;
  },

  getTemplateMetrics(templateSystemKey) {
    const template = getTemplateSystemByKey(templateSystemKey);
    return {
      teams: Array.isArray(template.teams) ? template.teams.length : 0,
      services: Array.isArray(template.services) ? template.services.length : 0,
      goals: Array.isArray(template.goals) ? template.goals.length : 0,
      initiatives: Array.isArray(template.yearlyInitiatives)
        ? template.yearlyInitiatives.length
        : 0,
      workPackages: Array.isArray(template.workPackages) ? template.workPackages.length : 0,
    };
  },

  createPackageFromCatalogEntry(catalogEntry, options = {}) {
    const manifest = normalizeManifestInput(catalogEntry);
    const template = packageDeepClone(getTemplateSystemByKey(manifest.templateSystemKey));
    const preferredSystemName =
      packageNormalizeString(options.systemName) || `${manifest.title} Blueprint`;

    template.systemName = ensureUniqueSystemName(preferredSystemName);
    template.systemDescription = manifest.summary;
    const systemWithProvenance = attachBlueprintProvenance(template, manifest);

    return {
      format: BLUEPRINT_PACKAGE_FORMAT,
      packageSchemaVersion: BLUEPRINT_PACKAGE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      manifest,
      system: systemWithProvenance,
    };
  },

  createPackageFromSystemData(systemData, manifestInput = {}) {
    const baseSystem = packageDeepClone(systemData);
    const manifest = normalizeManifestInput({
      ...manifestInput,
      title: manifestInput.title || baseSystem.systemName,
      summary: manifestInput.summary || baseSystem.systemDescription,
      templateSystemKey: manifestInput.templateSystemKey || 'community',
    });
    const systemWithProvenance = attachBlueprintProvenance(baseSystem, manifest);
    return {
      format: BLUEPRINT_PACKAGE_FORMAT,
      packageSchemaVersion: BLUEPRINT_PACKAGE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      manifest,
      system: systemWithProvenance,
    };
  },

  validatePackage(packageData, options = {}) {
    const { strictCurated = false, failOnSecrets = false } = options;
    const errors = [];
    const warnings = [];
    const payload = packageData || {};

    if (payload.format !== BLUEPRINT_PACKAGE_FORMAT) {
      errors.push(`Package format must be "${BLUEPRINT_PACKAGE_FORMAT}".`);
    }

    if (!payload.manifest || typeof payload.manifest !== 'object') {
      errors.push('Package manifest is required.');
    }

    if (!payload.system || typeof payload.system !== 'object') {
      errors.push('Package system payload is required.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    const manifest = payload.manifest;
    const system = payload.system;

    if (!packageNormalizeString(manifest.blueprintId)) {
      errors.push('Manifest blueprintId is required.');
    }
    if (!packageNormalizeString(manifest.title)) {
      errors.push('Manifest title is required.');
    }
    if (!packageNormalizeString(manifest.promptPack?.seedPrompt)) {
      errors.push('Prompt pack seedPrompt is required.');
    }

    if (!packageNormalizeString(system.systemName)) {
      errors.push('System payload requires systemName.');
    }
    if (!Array.isArray(system.goals) || system.goals.length === 0) {
      errors.push('System payload must include at least one goal.');
    }
    if (!Array.isArray(system.yearlyInitiatives) || system.yearlyInitiatives.length === 0) {
      errors.push('System payload must include at least one yearly initiative.');
    }

    if (!Array.isArray(system.workPackages) || system.workPackages.length === 0) {
      warnings.push('System payload has no work packages.');
      if (strictCurated) {
        errors.push('Curated package must include non-empty workPackages.');
      }
    }

    if (!system.capacityConfiguration || typeof system.capacityConfiguration !== 'object') {
      errors.push('System payload must include capacityConfiguration.');
    }

    const secretFindings = listPackageSecretFindings(payload);
    if (secretFindings.length > 0) {
      const uniquePatterns = Array.from(new Set(secretFindings.map((item) => item.pattern))).slice(
        0,
        5
      );
      const samplePaths = secretFindings
        .map((item) => item.path)
        .filter(Boolean)
        .slice(0, 4);
      const detailSuffix = `patterns: ${uniquePatterns.join(', ')}; examples: ${samplePaths.join(
        ', '
      )}`;
      const message = failOnSecrets
        ? `Public publish blocked: package may contain secrets (${detailSuffix}).`
        : `Package may contain secrets (${detailSuffix}). Verify before sharing.`;
      if (failOnSecrets) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }

    const compatibilityMax = Number(manifest.appCompatibility?.maxSystemSchemaVersion || 0);
    const supportedVersion = Number(SystemService.getExportSchemaVersion());
    if (compatibilityMax && compatibilityMax > supportedVersion + 1) {
      warnings.push('Manifest compatibility appears newer than current app export schema.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  serializePackage(packageData) {
    return JSON.stringify(packageData, null, 2);
  },

  parsePackageJson(jsonText) {
    try {
      const parsed = JSON.parse(String(jsonText || ''));
      return { success: true, packageData: parsed };
    } catch (error) {
      return { success: false, error: `Invalid JSON: ${error.message}` };
    }
  },

  installBlueprintPackage(packageData, options = {}) {
    const { activateFirst = false } = options;
    const validation = this.validatePackage(packageData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(' '),
        validation,
      };
    }

    const manifest = packageData.manifest;
    const systemData = attachInstalledBlueprintMetadata(packageData.system, manifest, packageData);
    systemData.systemName = ensureUniqueSystemName(systemData.systemName);

    const importPayload = {
      format: 'smt-system-export',
      schemaVersion: SystemService.getExportSchemaVersion(),
      exportedAt: new Date().toISOString(),
      scope: 'current',
      systems: [
        {
          id: systemData.systemName,
          data: systemData,
        },
      ],
    };

    const importResult = SystemService.importFromJson(importPayload, { activateFirst });
    if (!importResult.success) {
      return {
        success: false,
        error: importResult.error || 'Failed to install blueprint package.',
        validation,
      };
    }

    return {
      success: true,
      importedSystemId: importResult.importedSystemIds[0],
      importedCount: importResult.importedCount,
      warnings: (validation.warnings || []).concat(importResult.warnings || []),
      manifest,
    };
  },

  async installCatalogBlueprint(blueprintId, options = {}) {
    const entry = BlueprintCatalogService.getBlueprintById(blueprintId);
    if (!entry) {
      return { success: false, error: `Blueprint "${blueprintId}" was not found.` };
    }

    const contributedPackage = getCommunitySubmissions().find(
      (submission) => submission?.manifest?.blueprintId === blueprintId
    );

    if (entry.sourceType === 'community') {
      if (!contributedPackage) {
        return {
          success: false,
          error: 'Community blueprint package is missing. Re-publish the contribution.',
        };
      }
      return this.installBlueprintPackage(contributedPackage, options);
    }

    if (contributedPackage) {
      return this.installBlueprintPackage(contributedPackage, options);
    }

    if (!entry.isInstallable || entry.availabilityStatus !== 'Available') {
      return {
        success: false,
        error:
          'This curated blueprint is not yet available for install. Contribute a generated package to unlock it.',
      };
    }

    const launchPackageMap = await loadLaunchPackageMap();
    const prebuiltPackage = launchPackageMap[blueprintId];
    if (!prebuiltPackage) {
      return {
        success: false,
        error: 'Curated package artifact was not found for this blueprint.',
      };
    }

    return this.installBlueprintPackage(prebuiltPackage, options);
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueprintPackageService;
}
