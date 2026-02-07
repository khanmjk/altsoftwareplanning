/**
 * BlueprintCatalogService
 *
 * Service for curated and community blueprint catalog discovery.
 * Catalog data is local-first and includes:
 * 1) Curated top-100 blueprint seeds
 * 2) Community submissions persisted in browser storage
 */

const BLUEPRINT_LOCAL_SUBMISSIONS_KEY = 'smt_blueprint_submissions_v1';
const BLUEPRINT_CATALOG_VERSION = 1;
const LAUNCH_AVAILABLE_COUNT = 25;
const CATALOG_TAG_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'style',
]);

const CURATED_BLUEPRINT_TITLES = [
  'Rideshare Platform (Uber-style)',
  'Food Delivery Platform (DoorDash-style)',
  'Grocery Delivery Platform (Instacart-style)',
  'Last-mile Courier Network',
  'Home Services Marketplace (TaskRabbit-style)',
  'Freelance Talent Marketplace (Upwork-style)',
  'Accommodation Marketplace (Airbnb-style)',
  'Travel Booking Aggregator (Booking-style)',
  'Car Rental Marketplace (Turo-style)',
  'Used Goods Marketplace (eBay-style)',
  'Ticket Resale Marketplace (StubHub-style)',
  'B2B Procurement Marketplace',
  'Short-video Social Network (TikTok-style)',
  'Photo Sharing Social App (Instagram-style)',
  'Professional Network (LinkedIn-style)',
  'Community Forum Platform (Reddit-style)',
  'Creator Subscription Platform (Patreon-style)',
  'Live Streaming Platform (Twitch-style)',
  'Podcast Distribution Platform (Spotify Podcasts-style)',
  'Newsletter Publishing Platform (Substack-style)',
  'Music Streaming Platform (Spotify-style)',
  'OTT Video Streaming Platform (Netflix-style)',
  'Personalized News Platform',
  'Social Messaging Platform (WhatsApp-style)',
  'Digital Wallet Platform (PayPal-style)',
  'Neobank Platform (Chime-style)',
  'SME Banking Platform',
  'P2P Payments Platform (Venmo-style)',
  'Cross-border Remittance Platform (Wise-style)',
  'Buy-now-pay-later Platform (Klarna-style)',
  'Consumer Lending Platform',
  'Robo-advisor Wealth Platform (Betterment-style)',
  'Crypto Exchange Platform (Coinbase-style)',
  'Fraud and Risk Intelligence Platform',
  'Subscription Billing Platform (Stripe Billing-style)',
  'Insurtech Claims and Policy Platform',
  'Team Chat Platform (Slack-style)',
  'Video Conferencing Platform (Zoom-style)',
  'Project Management Platform (Asana-style)',
  'Docs and Wiki Collaboration Platform (Notion-style)',
  'Design Collaboration Platform (Figma-style)',
  'Enterprise Knowledge Search Platform',
  'CRM Platform (Salesforce-style)',
  'Customer Support Desk Platform (Zendesk-style)',
  'Recruiting ATS Platform (Greenhouse-style)',
  'Learning Management Platform',
  'Field Service Operations Platform',
  'Marketing Automation Platform (HubSpot-style)',
  'Git Hosting Platform (GitHub-style)',
  'CI/CD Automation Platform (CircleCI-style)',
  'Error Monitoring Platform (Sentry-style)',
  'Observability Platform (Datadog-style)',
  'API Gateway Management Platform',
  'Feature Flag Platform (LaunchDarkly-style)',
  'Experimentation Platform (Optimizely-style)',
  'Package Registry and Artifacts Platform',
  'Internal Developer Portal Platform (Backstage-style)',
  'Secrets Management Platform (Vault-style)',
  'Incident Response Platform (PagerDuty-style)',
  'Test Automation Cloud Platform',
  'IaaS Cloud Platform (AWS-style)',
  'Managed Kubernetes Platform (EKS/GKE-style)',
  'Serverless Functions Platform',
  'Data Warehouse Analytics Platform (Snowflake-style)',
  'Stream Processing Platform (Kafka ecosystem style)',
  'Identity and Access Management Platform (Okta-style)',
  'Endpoint Security Platform',
  'SIEM Analytics Platform (Splunk-style)',
  'Backup and Disaster Recovery Platform',
  'CDN and Edge Compute Platform (Cloudflare-style)',
  'Email Delivery Infrastructure Platform (SendGrid-style)',
  'Message Queue Infrastructure Platform',
  'Ecommerce Storefront Platform (Shopify-style)',
  'Multi-vendor Marketplace Platform',
  'Restaurant POS and Ordering Platform',
  'Healthcare Patient Engagement Platform',
  'Telemedicine Platform',
  'Real Estate Listings Platform',
  'Property Rental Management Platform',
  'Fleet Logistics Optimization Platform',
  'Classroom and Assignments Platform',
  'Legal Case Management Platform',
  'Nonprofit Donor Management Platform',
  'Construction Project Controls Platform',
  'General AI Assistant Product',
  'AI Coding Assistant Product',
  'AI Customer Support Copilot',
  'AI Sales Copilot',
  'AI Meeting Notes and Action Tracker',
  'AI Resume and Hiring Assistant',
  'AI Content Studio Platform',
  'AI Image Generation Platform',
  'AI Video Generation Platform',
  'AI Voice and Speech Platform',
  'AI Analytics Copilot for BI',
  'AI Cybersecurity Copilot',
  'AI Legal Document Review Copilot',
  'AI Medical Scribe Platform',
  'AI Tutoring and Learning Platform',
  'Multi-agent Workflow Orchestration Platform',
];

function catalogDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function catalogCreateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveCategory(index) {
  if (index <= 12) return 'Marketplace and Mobility';
  if (index <= 24) return 'Social and Content';
  if (index <= 36) return 'Fintech';
  if (index <= 48) return 'Collaboration and Productivity';
  if (index <= 60) return 'Developer Tools';
  if (index <= 72) return 'Cloud, Infra, and Security';
  if (index <= 84) return 'Commerce and Vertical SaaS';
  return 'AI-Native Products';
}

function resolveTemplateSystemKey(category) {
  if (category === 'Marketplace and Mobility') return 'ConnectPro';
  if (category === 'Social and Content') return 'StreamView';
  if (category === 'Fintech') return 'FinSecure';
  if (category === 'Collaboration and Productivity') return 'ShopSphere';
  if (category === 'Developer Tools') return 'InsightAI';
  if (category === 'Cloud, Infra, and Security') return 'FinSecure';
  if (category === 'Commerce and Vertical SaaS') return 'ShopSphere';
  return 'InsightAI';
}

function resolveTrustLabel(index) {
  if (index <= LAUNCH_AVAILABLE_COUNT) return 'Verified';
  if (index <= 84) return 'Community';
  return 'Experimental';
}

function resolveComplexity(index) {
  if (index % 5 === 0) return 'Advanced';
  if (index % 2 === 0) return 'Intermediate';
  return 'Advanced';
}

function resolveCompanyStage(index) {
  if (index <= 20) return 'Scale-up';
  if (index <= 60) return 'Growth';
  return 'Enterprise';
}

function resolveTeamSizeBand(index) {
  if (index <= 25) return '80-200';
  if (index <= 60) return '150-400';
  return '250-800';
}

function resolveTagList(title, category) {
  const normalizeTagTokens = (value, max = 5) =>
    String(value || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .split(/[^a-z0-9]+/g)
      .filter((token) => {
        if (!token) return false;
        if (CATALOG_TAG_STOPWORDS.has(token)) return false;
        if (token === 'ai') return true;
        return token.length >= 3;
      })
      .slice(0, max);

  const baseTags = normalizeTagTokens(title, 5);
  const categoryTags = normalizeTagTokens(category, 4);
  return Array.from(new Set([...baseTags, ...categoryTags]));
}

function buildPromptPack(title, category, complexity, stage) {
  const summaryLine = `Design an inspired-by ${title} system for a ${stage} company in ${category}.`;
  return {
    seedPrompt: `${summaryLine} Include realistic services, teams, goals, and a credible rolling 3-year roadmap.`,
    variants: [
      {
        variantId: 'mvp',
        name: 'MVP',
        prompt: `${summaryLine} Keep scope MVP-first with lean team topology and Year 1 delivery focus.`,
      },
      {
        variantId: 'scale',
        name: 'Scale',
        prompt: `${summaryLine} Optimize for scale with stronger reliability, platform maturity, and cross-team dependency planning.`,
      },
      {
        variantId: 'enterprise',
        name: 'Enterprise',
        prompt: `${summaryLine} Optimize for enterprise governance, compliance, and multi-team execution controls.`,
      },
    ],
    authorNotes:
      'Use these prompts to regenerate or remix. Keep IDs stable and ensure initiative-goal-work-package linkage completeness.',
  };
}

function buildCuratedEntry(title, index) {
  const category = resolveCategory(index);
  const complexity = resolveComplexity(index);
  const companyStage = resolveCompanyStage(index);
  const templateSystemKey = resolveTemplateSystemKey(category);
  const blueprintId = `bp-${String(index).padStart(3, '0')}-${catalogCreateSlug(title)}-v1`;
  const promptPack = buildPromptPack(title, category, complexity, companyStage);
  return {
    blueprintId,
    title,
    summary: `Curated ${category} blueprint demonstrating architecture, org design, goals, and a rolling 3-year plan.`,
    category,
    tags: resolveTagList(title, category),
    trustLabel: resolveTrustLabel(index),
    complexity,
    companyStage,
    targetTeamSize: resolveTeamSizeBand(index),
    roadmapHorizonYears: 3,
    schemaVersion: 13,
    appCompatibility: {
      minSystemSchemaVersion: 12,
      maxSystemSchemaVersion: 13,
    },
    templateSystemKey,
    promptPack,
    learningOutcomes: [
      'Understand service and team decomposition for this domain.',
      'Inspect goal-to-initiative traceability over a 3-year horizon.',
      'Analyze capacity and dependency tradeoffs before roadmap commitments.',
    ],
    author: {
      name: 'SMT Curated',
      contact: 'community@placeholder',
    },
    license: 'CC-BY-4.0',
    sourceType: 'curated',
    availabilityStatus: index <= LAUNCH_AVAILABLE_COUNT ? 'Available' : 'Needs Contribution',
    isInstallable: index <= LAUNCH_AVAILABLE_COUNT,
    createdAt: '2026-02-07T00:00:00Z',
    updatedAt: '2026-02-07T00:00:00Z',
  };
}

function toDisplayEntry(rawEntry) {
  return {
    blueprintId: rawEntry.blueprintId,
    title: rawEntry.title,
    summary: rawEntry.summary,
    category: rawEntry.category,
    tags: Array.isArray(rawEntry.tags) ? rawEntry.tags : [],
    trustLabel: rawEntry.trustLabel,
    complexity: rawEntry.complexity,
    companyStage: rawEntry.companyStage,
    targetTeamSize: rawEntry.targetTeamSize,
    roadmapHorizonYears: rawEntry.roadmapHorizonYears || 3,
    schemaVersion: rawEntry.schemaVersion || 13,
    appCompatibility: rawEntry.appCompatibility || null,
    templateSystemKey: rawEntry.templateSystemKey || null,
    promptPack: rawEntry.promptPack || null,
    learningOutcomes: Array.isArray(rawEntry.learningOutcomes) ? rawEntry.learningOutcomes : [],
    author: rawEntry.author || null,
    license: rawEntry.license || null,
    sourceType: rawEntry.sourceType || 'community',
    availabilityStatus: rawEntry.availabilityStatus || 'Available',
    isInstallable: rawEntry.isInstallable !== undefined ? !!rawEntry.isInstallable : true,
    createdAt: rawEntry.createdAt || null,
    updatedAt: rawEntry.updatedAt || null,
  };
}

function compareTitleAsc(left, right) {
  return left.title.localeCompare(right.title);
}

function catalogNormalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function catalogTokenizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function catalogBuildSearchHaystack(entry) {
  const promptVariants = Array.isArray(entry.promptPack?.variants) ? entry.promptPack.variants : [];
  const learningOutcomes = Array.isArray(entry.learningOutcomes) ? entry.learningOutcomes : [];
  const tags = Array.isArray(entry.tags) ? entry.tags : [];

  return catalogNormalizeSearchText(
    [
      entry.blueprintId,
      entry.title,
      entry.summary,
      entry.category,
      entry.trustLabel,
      entry.availabilityStatus,
      entry.complexity,
      entry.companyStage,
      entry.sourceType,
      entry.targetTeamSize,
      entry.license,
      entry.templateSystemKey,
      entry.promptPack?.seedPrompt,
      entry.promptPack?.authorNotes,
      entry.author?.name,
      entry.author?.contact,
      entry.isInstallable ? 'installable available' : 'not installable unavailable',
      ...tags,
      ...learningOutcomes,
      ...promptVariants.flatMap((variant) => [variant.name, variant.prompt]),
    ].join(' ')
  );
}

function catalogMatchesQuery(entry, query) {
  const normalizedQuery = catalogNormalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystackText = catalogBuildSearchHaystack(entry);
  if (!haystackText) return false;

  const haystackTokenSet = new Set(catalogTokenizeSearchText(haystackText));
  const queryTokens = catalogTokenizeSearchText(normalizedQuery);
  if (queryTokens.length === 0) return true;

  if (queryTokens.length === 1) {
    return haystackTokenSet.has(queryTokens[0]);
  }

  if (haystackText.includes(normalizedQuery)) {
    return true;
  }

  return queryTokens.every((token) => haystackTokenSet.has(token));
}

const BlueprintCatalogService = {
  _curatedCatalogCache: null,

  getCatalog() {
    const curated = this.getCuratedCatalog();
    const community = this.getCommunityCatalog();
    return curated.concat(community).sort(compareTitleAsc);
  },

  getCatalogVersion() {
    return BLUEPRINT_CATALOG_VERSION;
  },

  getCuratedCatalog() {
    if (!this._curatedCatalogCache) {
      this._curatedCatalogCache = CURATED_BLUEPRINT_TITLES.map((title, idx) =>
        buildCuratedEntry(title, idx + 1)
      );
    }
    const contributedBlueprintIds = new Set(
      this._readLocalSubmissions()
        .map((submission) => submission?.manifest?.blueprintId)
        .filter(Boolean)
    );

    return catalogDeepClone(this._curatedCatalogCache).map((entry) => {
      if (contributedBlueprintIds.has(entry.blueprintId)) {
        return {
          ...entry,
          availabilityStatus: 'Available',
          isInstallable: true,
        };
      }
      return entry;
    });
  },

  getCommunityCatalog() {
    const curatedIds = new Set(
      (
        this._curatedCatalogCache ||
        CURATED_BLUEPRINT_TITLES.map((title, idx) => buildCuratedEntry(title, idx + 1))
      ).map((entry) => entry.blueprintId)
    );
    const submissions = this._readLocalSubmissions();
    return submissions
      .map((submission) => {
        const manifest = submission?.manifest;
        if (!manifest?.blueprintId || !manifest.title) return null;
        if (curatedIds.has(manifest.blueprintId)) return null;
        return toDisplayEntry({
          ...manifest,
          sourceType: 'community',
          trustLabel: manifest.trustLabel || 'Community',
          availabilityStatus: 'Available',
          isInstallable: true,
        });
      })
      .filter(Boolean)
      .sort(compareTitleAsc);
  },

  getBlueprintById(blueprintId) {
    const entries = this.getCatalog();
    return entries.find((entry) => entry.blueprintId === blueprintId) || null;
  },

  searchCatalog(filters = {}) {
    const {
      query = '',
      category = 'all',
      trustLabel = 'all',
      complexity = 'all',
      companyStage = 'all',
      sourceType = 'all',
    } = filters;

    return this.getCatalog().filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (trustLabel !== 'all' && entry.trustLabel !== trustLabel) return false;
      if (complexity !== 'all' && entry.complexity !== complexity) return false;
      if (companyStage !== 'all' && entry.companyStage !== companyStage) return false;
      if (sourceType !== 'all' && entry.sourceType !== sourceType) return false;
      return catalogMatchesQuery(entry, query);
    });
  },

  getFilterOptions() {
    const catalog = this.getCatalog();
    const categories = new Set();
    const trustLabels = new Set();
    const complexity = new Set();
    const companyStages = new Set();
    const sourceTypes = new Set();

    catalog.forEach((entry) => {
      categories.add(entry.category);
      trustLabels.add(entry.trustLabel);
      complexity.add(entry.complexity);
      companyStages.add(entry.companyStage);
      sourceTypes.add(entry.sourceType);
    });

    return {
      categories: Array.from(categories).sort(),
      trustLabels: Array.from(trustLabels).sort(),
      complexity: Array.from(complexity).sort(),
      companyStages: Array.from(companyStages).sort(),
      sourceTypes: Array.from(sourceTypes).sort(),
    };
  },

  getLocalSubmissionsStorageKey() {
    return BLUEPRINT_LOCAL_SUBMISSIONS_KEY;
  },

  getLaunchAvailableCount() {
    return LAUNCH_AVAILABLE_COUNT;
  },

  _readLocalSubmissions() {
    const submissions = systemRepository.getUiPref(BLUEPRINT_LOCAL_SUBMISSIONS_KEY, []);
    if (!Array.isArray(submissions)) return [];
    return submissions;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueprintCatalogService;
}
