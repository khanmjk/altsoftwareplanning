/**
 * CommunityBlueprintsView
 *
 * AppStore-lite blueprint exchange:
 * - browse/search/filter top-100 and community blueprints
 * - preview prompt pack and system summary
 * - install blueprint into local systems
 * - publish local systems into community catalog
 */

class CommunityBlueprintsView {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.filters = {
      query: '',
      category: 'all',
      sort: 'newest',
      trustLabel: 'all',
      complexity: 'all',
      companyStage: 'all',
      sourceType: 'all',
    };
    this.filteredCatalog = [];
    this.catalogEntries = [];
    this.remoteCatalog = [];
    this.remoteCatalogStatus = { loaded: false, error: null };
    this.selectedBlueprintId = null;
    this.selectedBlueprintEntry = null;
    this.publishDraftPackage = null;
    this.publishTargetBlueprintId = null;
    this.publishTargetBlueprintEntry = null;
    this._eventsBound = false;
    this.installedBlueprintStateIndex = new Map();
    this.filterSelectInstances = {};
    this.publishSystemSelect = null;
    this.publishTrustSelect = null;
    this._boundContainer = null;
    this._remoteFetchTimer = null;
    this.previewComments = [];
    this.previewCommentsCursor = null;

    this._boundClick = this.handleClick.bind(this);
    this._boundChange = this.handleChange.bind(this);
    this._boundInput = this.handleInput.bind(this);
  }

  render(container, params = {}) {
    if (container) {
      this.container = container;
    } else if (this.containerId) {
      this.container = document.getElementById(this.containerId);
    }

    if (!this.container) {
      console.error('CommunityBlueprintsView: container not found.');
      return;
    }

    workspaceComponent.setPageMetadata({
      title: 'Community Blueprints',
      breadcrumbs: ['Community', 'Blueprints'],
      actions: [],
    });
    workspaceComponent.setToolbar(null);

    this._destroyThemedSelectInstances();
    this._clearElement(this.container);
    this.container.appendChild(this._buildViewShell());
    this.bindEvents();
    this.refreshCatalog();

    if (params.publishSystemId) {
      this.openPublishModal(params.publishSystemId);
    }
  }

  bindEvents() {
    if (!this.container) return;

    if (this._boundContainer && this._boundContainer !== this.container) {
      this._boundContainer.removeEventListener('click', this._boundClick);
      this._boundContainer.removeEventListener('change', this._boundChange);
      this._boundContainer.removeEventListener('input', this._boundInput);
      this._eventsBound = false;
      this._boundContainer = null;
    }

    if (this._eventsBound && this._boundContainer === this.container) return;
    this.container.addEventListener('click', this._boundClick);
    this.container.addEventListener('change', this._boundChange);
    this.container.addEventListener('input', this._boundInput);
    this._eventsBound = true;
    this._boundContainer = this.container;
  }

  handleClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.getAttribute('data-action');
    const blueprintId = actionTarget.getAttribute('data-blueprint-id');
    const installMode = actionTarget.getAttribute('data-install-mode') || 'default';
    const systemId = actionTarget.getAttribute('data-system-id');
    const parentBlueprintId = actionTarget
      .closest('[data-blueprint-id]')
      ?.getAttribute('data-blueprint-id');
    const parentSystemId = actionTarget.closest('[data-system-id]')?.getAttribute('data-system-id');
    const resolvedBlueprintId = blueprintId || parentBlueprintId || this.selectedBlueprintId;
    const resolvedSystemId = systemId || parentSystemId || null;

    if (action === 'open-preview' && resolvedBlueprintId) {
      this.openPreviewModal(resolvedBlueprintId);
      return;
    }
    if (action === 'close-preview') {
      this.closePreviewModal();
      return;
    }
    if (action === 'install-blueprint') {
      this.installSelectedBlueprint();
      return;
    }
    if (action === 'install-blueprint-card' && resolvedBlueprintId) {
      this.installBlueprintFromCard(resolvedBlueprintId, installMode);
      return;
    }
    if (action === 'open-installed-blueprint') {
      this.openInstalledBlueprint(resolvedBlueprintId, resolvedSystemId);
      return;
    }
    if (action === 'contribute-blueprint' && resolvedBlueprintId) {
      this.generateContributionWithAI(resolvedBlueprintId);
      return;
    }
    if (action === 'open-publish-modal') {
      this.openPublishModal({ targetBlueprintId: resolvedBlueprintId || null });
      return;
    }
    if (action === 'close-publish-modal') {
      this.closePublishModal();
      return;
    }
    if (action === 'publish-validate') {
      this.validatePublishDraft();
      return;
    }
    if (action === 'publish-save-local') {
      this.publishDraftToLocalCatalog();
      return;
    }
    if (action === 'publish-download') {
      this.downloadPublishDraft();
      return;
    }
    if (action === 'publish-save-remote') {
      this.publishDraftToMarketplace();
      return;
    }
    if (action === 'marketplace-sign-in') {
      this.signInToMarketplace();
      return;
    }
    if (action === 'marketplace-sign-out') {
      this.signOutOfMarketplace();
      return;
    }
    if (action === 'preview-star-toggle') {
      this.togglePreviewStar();
      return;
    }
    if (action === 'preview-add-comment') {
      this.submitPreviewComment();
      return;
    }
    if (action === 'preview-load-more-comments') {
      this.loadMorePreviewComments();
      return;
    }
    if (action === 'navigate-systems') {
      navigationManager.navigateTo('systemsView');
      return;
    }
  }

  handleInput(event) {
    const filterTarget = event.target.closest('[data-filter]');
    if (!filterTarget) return;

    const key = filterTarget.getAttribute('data-filter');
    if (key !== 'query') return;

    this.filters.query = filterTarget.value;
    this.refreshCatalog();
  }

  handleChange(event) {
    const filterTarget = event.target.closest('[data-filter]');
    if (filterTarget) {
      const key = filterTarget.getAttribute('data-filter');
      if (key && this.filters[key] !== undefined) {
        this.filters[key] = filterTarget.value;
        this.refreshCatalog();
      }
      return;
    }
  }

  refreshCatalog() {
    this._applyCatalogAndRender();
    this._scheduleRemoteCatalogFetch();
  }

  _applyCatalogAndRender() {
    this.catalogEntries = this._buildMergedCatalog();
    this.filteredCatalog = this._filterCatalog(this.catalogEntries, this.filters);
    this._populateFilterOptionsFromCatalog(this.catalogEntries);
    this.renderCatalogGrid();
  }

  _populateFilterOptionsFromCatalog(catalog) {
    const categories = new Set();
    const trustLabels = new Set();
    const complexity = new Set();
    const companyStages = new Set();
    const sourceTypes = new Set();

    (Array.isArray(catalog) ? catalog : []).forEach((entry) => {
      categories.add(entry.category);
      trustLabels.add(entry.trustLabel);
      complexity.add(entry.complexity);
      companyStages.add(entry.companyStage);
      sourceTypes.add(entry.sourceType);
    });

    this._renderFilterSelect(
      'blueprintCategoryFilter',
      'category',
      Array.from(categories).sort(),
      this.filters.category
    );
    this._renderFilterSelect(
      'blueprintSortFilter',
      'sort',
      [
        { value: 'newest', text: 'Newest' },
        { value: 'trending', text: 'Trending' },
        { value: 'title', text: 'Title' },
      ],
      this.filters.sort
    );
    this._renderFilterSelect(
      'blueprintTrustFilter',
      'trustLabel',
      Array.from(trustLabels).sort(),
      this.filters.trustLabel
    );
    this._renderFilterSelect(
      'blueprintComplexityFilter',
      'complexity',
      Array.from(complexity).sort(),
      this.filters.complexity
    );
    this._renderFilterSelect(
      'blueprintStageFilter',
      'companyStage',
      Array.from(companyStages).sort(),
      this.filters.companyStage
    );
    this._renderFilterSelect(
      'blueprintSourceFilter',
      'sourceType',
      Array.from(sourceTypes).sort(),
      this.filters.sourceType
    );
  }

  _renderFilterSelect(hostId, filterKey, values, selectedValue) {
    const host = this.container.querySelector(`#${hostId}`);
    if (!host) return;

    const isSort = filterKey === 'sort';
    const normalizedValues = (Array.isArray(values) ? values : [])
      .map((value) => {
        if (value && typeof value === 'object') {
          return { value: value.value, text: value.text || value.value };
        }
        return { value, text: value };
      })
      .filter((option) => option.value);

    const options = isSort
      ? normalizedValues
      : [{ value: 'all', text: 'All' }].concat(normalizedValues);
    const currentValue = selectedValue || (isSort ? options[0]?.value || 'newest' : 'all');

    const existing = this.filterSelectInstances[filterKey];
    if (existing) {
      existing.setOptions(options);
      existing.setValue(currentValue);
      return;
    }

    const themedSelect = new ThemedSelect({
      options,
      value: currentValue,
      placeholder: 'All',
      className: 'community-blueprints-filters__themed-select',
      id: `${hostId}Input`,
      name: `${hostId}Input`,
      onChange: (value) => {
        this.filters[filterKey] = value || (isSort ? 'newest' : 'all');
        this.refreshCatalog();
      },
    });

    this.filterSelectInstances[filterKey] = themedSelect;
    this._clearElement(host);
    host.appendChild(themedSelect.render());
  }

  _scheduleRemoteCatalogFetch() {
    if (!BlueprintMarketplaceService.isEnabled()) return;
    if (this._remoteFetchTimer) {
      clearTimeout(this._remoteFetchTimer);
    }
    this._remoteFetchTimer = setTimeout(() => {
      this._remoteFetchTimer = null;
      this._fetchRemoteCatalog();
    }, 400);
  }

  async _fetchRemoteCatalog() {
    if (!BlueprintMarketplaceService.isEnabled()) return;

    const remoteSort = this.filters.sort === 'title' ? 'newest' : this.filters.sort;
    const result = await BlueprintMarketplaceService.getCatalog({
      ...this.filters,
      sort: remoteSort,
      limit: 50,
    });

    if (!result?.success) {
      this.remoteCatalogStatus = { loaded: true, error: result?.error || 'Remote fetch failed.' };
      this.remoteCatalog = [];
      this._applyCatalogAndRender();
      return;
    }

    this.remoteCatalogStatus = { loaded: true, error: null };
    this.remoteCatalog = Array.isArray(result.items) ? result.items : [];
    this._applyCatalogAndRender();
  }

  _buildMergedCatalog() {
    const localCatalog = BlueprintCatalogService.getCatalog();
    const remoteItems = Array.isArray(this.remoteCatalog) ? this.remoteCatalog : [];
    const remoteMap = new Map(remoteItems.map((item) => [item.blueprintId, item]));
    const seen = new Set();

    const merged = localCatalog.map((entry) => {
      const remote = remoteMap.get(entry.blueprintId) || null;
      seen.add(entry.blueprintId);
      if (!remote) return entry;

      const latestVersionNumber = Number(remote.latestVersionNumber || 0);
      const hasRemotePackage = latestVersionNumber > 0;

      return {
        ...entry,
        availabilityStatus: hasRemotePackage ? 'Available' : entry.availabilityStatus,
        isInstallable: hasRemotePackage ? true : entry.isInstallable,
        updatedAt: remote.updatedAt || entry.updatedAt,
        marketplace: {
          isPublished: true,
          starsCount: Number(remote.starsCount || 0),
          downloadsCount: Number(remote.downloadsCount || 0),
          commentsCount: Number(remote.commentsCount || 0),
          latestVersionNumber,
          updatedAt: remote.updatedAt || null,
          author: remote.author || null,
        },
      };
    });

    remoteItems.forEach((item) => {
      if (seen.has(item.blueprintId)) return;
      merged.push({
        blueprintId: item.blueprintId,
        title: item.title,
        summary: item.summary,
        category: item.category,
        tags: Array.isArray(item.tags) ? item.tags : [],
        trustLabel: item.trustLabel || 'Community',
        complexity: item.complexity || 'Intermediate',
        companyStage: item.companyStage || 'Growth',
        targetTeamSize: item.targetTeamSize || '50-150',
        roadmapHorizonYears: Number(item.roadmapHorizonYears || 3),
        schemaVersion: 13,
        appCompatibility: null,
        templateSystemKey: 'community',
        promptPack: { seedPrompt: '', variants: [], authorNotes: '' },
        learningOutcomes: [],
        author: item.author ? { name: item.author.handle, contact: '' } : null,
        license: 'CC-BY-4.0',
        sourceType: item.sourceType || 'community',
        availabilityStatus: 'Available',
        isInstallable: true,
        createdAt: item.updatedAt || null,
        updatedAt: item.updatedAt || null,
        marketplace: {
          isPublished: true,
          starsCount: Number(item.starsCount || 0),
          downloadsCount: Number(item.downloadsCount || 0),
          commentsCount: Number(item.commentsCount || 0),
          latestVersionNumber: Number(item.latestVersionNumber || 0),
          updatedAt: item.updatedAt || null,
          author: item.author || null,
        },
      });
    });

    return merged;
  }

  _normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  _tokenizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean);
  }

  _buildSearchHaystack(entry) {
    const promptVariants = Array.isArray(entry.promptPack?.variants)
      ? entry.promptPack.variants
      : [];
    const learningOutcomes = Array.isArray(entry.learningOutcomes) ? entry.learningOutcomes : [];
    const tags = Array.isArray(entry.tags) ? entry.tags : [];

    return this._normalizeSearchText(
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
        entry.marketplace?.author?.handle,
        entry.marketplace?.isPublished ? 'marketplace published' : 'local only',
        ...tags,
        ...learningOutcomes,
        ...promptVariants.flatMap((variant) => [variant.name, variant.prompt]),
      ].join(' ')
    );
  }

  _matchesQuery(entry, query) {
    const normalizedQuery = this._normalizeSearchText(query);
    if (!normalizedQuery) return true;

    const haystackText = this._buildSearchHaystack(entry);
    if (!haystackText) return false;

    const haystackTokenSet = new Set(this._tokenizeSearchText(haystackText));
    const queryTokens = this._tokenizeSearchText(normalizedQuery);
    if (queryTokens.length === 0) return true;

    if (queryTokens.length === 1) {
      return haystackTokenSet.has(queryTokens[0]);
    }

    if (haystackText.includes(normalizedQuery)) {
      return true;
    }

    return queryTokens.every((token) => haystackTokenSet.has(token));
  }

  _filterCatalog(catalog, filters) {
    const {
      query = '',
      category = 'all',
      trustLabel = 'all',
      complexity = 'all',
      companyStage = 'all',
      sourceType = 'all',
      sort = 'newest',
    } = filters || {};

    const filtered = (Array.isArray(catalog) ? catalog : []).filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (trustLabel !== 'all' && entry.trustLabel !== trustLabel) return false;
      if (complexity !== 'all' && entry.complexity !== complexity) return false;
      if (companyStage !== 'all' && entry.companyStage !== companyStage) return false;
      if (sourceType !== 'all' && entry.sourceType !== sourceType) return false;
      return this._matchesQuery(entry, query);
    });

    if (sort === 'title') {
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === 'trending') {
      return filtered.sort((a, b) => {
        const starsA = Number(a.marketplace?.starsCount || 0);
        const starsB = Number(b.marketplace?.starsCount || 0);
        if (starsA !== starsB) return starsB - starsA;
        return this._toTimestamp(b.updatedAt) - this._toTimestamp(a.updatedAt);
      });
    }

    return filtered.sort((a, b) => this._toTimestamp(b.updatedAt) - this._toTimestamp(a.updatedAt));
  }

  renderCatalogGrid() {
    this._refreshInstalledBlueprintStateIndex();
    const grid = this.container.querySelector('#communityBlueprintGrid');
    const countLabel = this.container.querySelector('#communityBlueprintCount');
    if (!grid || !countLabel) return;

    this._clearElement(grid);
    const curatedCount = this.filteredCatalog.filter(
      (entry) => entry.sourceType === 'curated'
    ).length;
    const marketplaceCount = this.filteredCatalog.filter(
      (entry) => entry.marketplace?.isPublished
    ).length;
    const localDraftCount = this.filteredCatalog.filter(
      (entry) => entry.sourceType === 'community' && !entry.marketplace?.isPublished
    ).length;
    countLabel.textContent = `${this.filteredCatalog.length} blueprint${this.filteredCatalog.length === 1 ? '' : 's'} found (${curatedCount} curated, ${marketplaceCount} marketplace, ${localDraftCount} local drafts)`;

    if (this.filteredCatalog.length === 0) {
      grid.appendChild(this._buildEmptyState());
      return;
    }

    this.filteredCatalog.forEach((entry) => {
      grid.appendChild(this._buildBlueprintCard(entry));
    });
  }

  _buildViewShell() {
    const root = document.createElement('div');
    root.className = 'community-blueprints-view workspace-view';

    root.appendChild(this._buildHeader());
    root.appendChild(this._buildFilters());
    root.appendChild(this._buildCatalogSection());
    root.appendChild(this._buildPreviewModal());
    root.appendChild(this._buildPublishModal());

    return root;
  }

  _buildHeader() {
    const header = document.createElement('section');
    header.className = 'community-blueprints-header workspace-card';

    const textWrap = document.createElement('div');
    textWrap.className = 'community-blueprints-header__copy';

    const title = document.createElement('h1');
    title.className = 'community-blueprints-header__title';
    title.textContent = 'Community Blueprints Exchange';
    textWrap.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'community-blueprints-header__subtitle';
    subtitle.textContent =
      'Install from a curated Top-100 catalog, inspect prompt packs, and publish locally or publicly to share with the community.';
    textWrap.appendChild(subtitle);

    const actions = document.createElement('div');
    actions.className = 'community-blueprints-header__actions';

    const publishBtn = document.createElement('button');
    publishBtn.className = 'btn btn--primary';
    publishBtn.setAttribute('data-action', 'open-publish-modal');
    publishBtn.appendChild(this._createIcon('fas fa-upload'));
    publishBtn.appendChild(document.createTextNode(' Publish Local System'));
    actions.appendChild(publishBtn);

    const systemsBtn = document.createElement('button');
    systemsBtn.className = 'btn btn--secondary';
    systemsBtn.setAttribute('data-action', 'navigate-systems');
    systemsBtn.appendChild(this._createIcon('fas fa-layer-group'));
    systemsBtn.appendChild(document.createTextNode(' My Systems'));
    actions.appendChild(systemsBtn);

    if (BlueprintMarketplaceService.isEnabled()) {
      const session = MarketplaceAuthService.getSession();
      const authBtn = document.createElement('button');
      authBtn.id = 'marketplaceAuthBtn';
      authBtn.className = 'btn btn--secondary';
      if (session?.user?.handle) {
        authBtn.setAttribute('data-action', 'marketplace-sign-out');
        authBtn.appendChild(this._createIcon('fas fa-sign-out-alt'));
        authBtn.appendChild(document.createTextNode(` Sign out @${session.user.handle}`));
      } else {
        authBtn.setAttribute('data-action', 'marketplace-sign-in');
        authBtn.appendChild(this._createIcon('fab fa-github'));
        authBtn.appendChild(document.createTextNode(' Sign in to Publish'));
      }
      actions.appendChild(authBtn);
    }

    header.appendChild(textWrap);
    header.appendChild(actions);
    return header;
  }

  _buildFilters() {
    const filterCard = document.createElement('section');
    filterCard.className = 'community-blueprints-filters workspace-card';

    const queryGroup = document.createElement('div');
    queryGroup.className =
      'community-blueprints-filters__group community-blueprints-filters__group--query';
    const queryInput = document.createElement('input');
    queryInput.type = 'search';
    queryInput.id = 'blueprintQueryInput';
    queryInput.className = 'community-blueprints-filters__input';
    queryInput.placeholder = 'Search title, tags, category, trust label...';
    queryInput.setAttribute('data-filter', 'query');
    queryInput.value = this.filters.query;
    queryGroup.appendChild(queryInput);

    const dropdownWrap = document.createElement('div');
    dropdownWrap.className = 'community-blueprints-filters__grid';
    dropdownWrap.appendChild(
      this._buildFilterSelect('Category', 'blueprintCategoryFilter', 'category')
    );
    dropdownWrap.appendChild(this._buildFilterSelect('Sort', 'blueprintSortFilter', 'sort'));
    dropdownWrap.appendChild(
      this._buildFilterSelect('Trust', 'blueprintTrustFilter', 'trustLabel')
    );
    dropdownWrap.appendChild(
      this._buildFilterSelect('Complexity', 'blueprintComplexityFilter', 'complexity')
    );
    dropdownWrap.appendChild(
      this._buildFilterSelect('Stage', 'blueprintStageFilter', 'companyStage')
    );
    dropdownWrap.appendChild(
      this._buildFilterSelect('Source', 'blueprintSourceFilter', 'sourceType')
    );

    filterCard.appendChild(queryGroup);
    filterCard.appendChild(dropdownWrap);
    return filterCard;
  }

  _buildFilterSelect(labelText, selectId, filterKey) {
    const field = document.createElement('div');
    field.className = 'community-blueprints-filters__field';

    const label = document.createElement('label');
    label.setAttribute('for', `${selectId}Input`);
    label.textContent = labelText;
    field.appendChild(label);

    const selectHost = document.createElement('div');
    selectHost.id = selectId;
    selectHost.className = 'community-blueprints-filters__select-host';
    selectHost.setAttribute('data-filter-host', filterKey);
    field.appendChild(selectHost);

    return field;
  }

  _buildCatalogSection() {
    const section = document.createElement('section');
    section.className = 'community-blueprints-catalog workspace-card';

    const header = document.createElement('div');
    header.className = 'community-blueprints-catalog__header';

    const title = document.createElement('h2');
    title.className = 'community-blueprints-catalog__title';
    title.textContent = 'Blueprint Catalog';
    header.appendChild(title);

    const count = document.createElement('span');
    count.id = 'communityBlueprintCount';
    count.className = 'community-blueprints-catalog__count';
    count.textContent = '0 blueprints found';
    header.appendChild(count);

    const grid = document.createElement('div');
    grid.id = 'communityBlueprintGrid';
    grid.className = 'community-blueprints-grid';

    section.appendChild(header);
    section.appendChild(grid);
    return section;
  }

  _buildBlueprintCard(entry) {
    const installState = this._getBlueprintInstallState(entry);
    const card = document.createElement('article');
    card.className = 'community-blueprint-card';
    card.setAttribute('data-blueprint-id', entry.blueprintId);
    card.setAttribute('data-availability-status', entry.availabilityStatus || 'Available');
    card.setAttribute('data-installed-count', String(installState.installedCount || 0));
    card.setAttribute('data-update-available', installState.updateAvailable ? 'true' : 'false');

    const top = document.createElement('div');
    top.className = 'community-blueprint-card__top';

    const title = document.createElement('h3');
    title.className = 'community-blueprint-card__title';
    title.textContent = entry.title;
    top.appendChild(title);

    const badges = document.createElement('div');
    badges.className = 'community-blueprint-card__badges';

    const trust = document.createElement('span');
    trust.className = `community-blueprint-card__trust community-blueprint-card__trust--${entry.trustLabel.toLowerCase()}`;
    trust.textContent = entry.trustLabel;
    badges.appendChild(trust);

    const availability = document.createElement('span');
    availability.className = `community-blueprint-card__availability community-blueprint-card__availability--${this._toClassToken(entry.availabilityStatus)}`;
    availability.textContent = entry.availabilityStatus || 'Available';
    badges.appendChild(availability);

    if (installState.hasInstalled) {
      const installed = document.createElement('span');
      installed.className =
        'community-blueprint-card__availability community-blueprint-card__availability--installed';
      installed.textContent =
        installState.installedCount > 1
          ? `Installed (${installState.installedCount})`
          : 'Installed';
      badges.appendChild(installed);
    }

    top.appendChild(badges);

    const meta = document.createElement('p');
    meta.className = 'community-blueprint-card__meta';
    meta.textContent = `${entry.category} · ${entry.companyStage} · ${entry.complexity}`;

    const summary = document.createElement('p');
    summary.className = 'community-blueprint-card__summary';
    summary.textContent = entry.summary;

    const tagList = document.createElement('div');
    tagList.className = 'community-blueprint-card__tags';
    entry.tags.slice(0, 5).forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'community-blueprint-card__tag';
      chip.textContent = tag;
      tagList.appendChild(chip);
    });

    let social = null;
    if (entry.marketplace?.isPublished) {
      social = document.createElement('div');
      social.className = 'community-blueprint-card__social';

      const stars = document.createElement('span');
      stars.className = 'community-blueprint-card__social-item';
      stars.appendChild(this._createIcon('fas fa-star'));
      stars.appendChild(document.createTextNode(` ${Number(entry.marketplace.starsCount || 0)}`));
      social.appendChild(stars);

      const comments = document.createElement('span');
      comments.className = 'community-blueprint-card__social-item';
      comments.appendChild(this._createIcon('fas fa-comments'));
      comments.appendChild(
        document.createTextNode(` ${Number(entry.marketplace.commentsCount || 0)}`)
      );
      social.appendChild(comments);

      const downloads = document.createElement('span');
      downloads.className = 'community-blueprint-card__social-item';
      downloads.appendChild(this._createIcon('fas fa-cloud-download-alt'));
      downloads.appendChild(
        document.createTextNode(` ${Number(entry.marketplace.downloadsCount || 0)}`)
      );
      social.appendChild(downloads);
    }

    const actions = document.createElement('div');
    actions.className = 'community-blueprint-card__actions';

    const canInstall = this._isEntryInstallable(entry);
    if (canInstall) {
      if (installState.hasInstalled) {
        if (installState.updateAvailable) {
          const updateBtn = document.createElement('button');
          updateBtn.className = 'btn btn--primary';
          updateBtn.setAttribute('data-action', 'install-blueprint-card');
          updateBtn.setAttribute('data-blueprint-id', entry.blueprintId);
          updateBtn.setAttribute('data-install-mode', 'update');
          updateBtn.setAttribute('aria-label', `Update ${entry.title}`);
          updateBtn.appendChild(this._createIcon('fas fa-sync-alt'));
          updateBtn.appendChild(document.createTextNode(' Update to Latest'));
          actions.appendChild(updateBtn);

          if (installState.latestSystemId) {
            const openBtn = document.createElement('button');
            openBtn.className = 'btn btn--secondary';
            openBtn.setAttribute('data-action', 'open-installed-blueprint');
            openBtn.setAttribute('data-blueprint-id', entry.blueprintId);
            openBtn.setAttribute('data-system-id', installState.latestSystemId);
            openBtn.setAttribute('aria-label', `Open installed ${entry.title}`);
            openBtn.appendChild(this._createIcon('fas fa-folder-open'));
            openBtn.appendChild(document.createTextNode(' Open Installed'));
            actions.appendChild(openBtn);
          }
        } else {
          if (installState.latestSystemId) {
            const openBtn = document.createElement('button');
            openBtn.className = 'btn btn--primary';
            openBtn.setAttribute('data-action', 'open-installed-blueprint');
            openBtn.setAttribute('data-blueprint-id', entry.blueprintId);
            openBtn.setAttribute('data-system-id', installState.latestSystemId);
            openBtn.setAttribute('aria-label', `Open installed ${entry.title}`);
            openBtn.appendChild(this._createIcon('fas fa-folder-open'));
            openBtn.appendChild(document.createTextNode(' Open Installed'));
            actions.appendChild(openBtn);
          }

          const installAnotherBtn = document.createElement('button');
          installAnotherBtn.className = 'btn btn--secondary';
          installAnotherBtn.setAttribute('data-action', 'install-blueprint-card');
          installAnotherBtn.setAttribute('data-blueprint-id', entry.blueprintId);
          installAnotherBtn.setAttribute('data-install-mode', 'copy');
          installAnotherBtn.setAttribute('aria-label', `Install another copy of ${entry.title}`);
          installAnotherBtn.appendChild(this._createIcon('fas fa-copy'));
          installAnotherBtn.appendChild(document.createTextNode(' Install Another Copy'));
          actions.appendChild(installAnotherBtn);
        }
      } else {
        const installBtn = document.createElement('button');
        installBtn.className = 'btn btn--primary';
        installBtn.setAttribute('data-action', 'install-blueprint-card');
        installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
        installBtn.setAttribute('data-install-mode', 'initial');
        installBtn.setAttribute('aria-label', `Install ${entry.title}`);
        installBtn.appendChild(this._createIcon('fas fa-download'));
        installBtn.appendChild(document.createTextNode(' Install Blueprint'));
        actions.appendChild(installBtn);
      }
    } else if (entry.sourceType === 'curated') {
      const contributeBtn = document.createElement('button');
      contributeBtn.className = 'btn btn--primary';
      contributeBtn.setAttribute('data-action', 'contribute-blueprint');
      contributeBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      contributeBtn.setAttribute('aria-label', `Contribute ${entry.title}`);
      contributeBtn.appendChild(this._createIcon('fas fa-magic'));
      contributeBtn.appendChild(document.createTextNode(' Contribute with AI'));
      actions.appendChild(contributeBtn);

      const installBtn = document.createElement('button');
      installBtn.className = 'btn btn--secondary is-disabled';
      installBtn.setAttribute('data-action', 'install-blueprint-card');
      installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      installBtn.setAttribute('aria-label', `Install ${entry.title}`);
      installBtn.appendChild(this._createIcon('fas fa-lock'));
      installBtn.appendChild(document.createTextNode(' Install Locked'));
      installBtn.disabled = true;
      actions.appendChild(installBtn);
    } else {
      const installBtn = document.createElement('button');
      installBtn.className = 'btn btn--secondary is-disabled';
      installBtn.setAttribute('data-action', 'install-blueprint-card');
      installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      installBtn.setAttribute('aria-label', `Install ${entry.title}`);
      installBtn.appendChild(this._createIcon('fas fa-lock'));
      installBtn.appendChild(document.createTextNode(' Install Locked'));
      installBtn.disabled = true;
      actions.appendChild(installBtn);
    }

    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn btn--secondary';
    previewBtn.setAttribute('data-action', 'open-preview');
    previewBtn.setAttribute('data-blueprint-id', entry.blueprintId);
    previewBtn.setAttribute('aria-label', `Preview ${entry.title}`);
    previewBtn.appendChild(this._createIcon('fas fa-search'));
    previewBtn.appendChild(document.createTextNode(' Preview'));

    actions.appendChild(previewBtn);

    card.appendChild(top);
    card.appendChild(meta);
    card.appendChild(summary);
    card.appendChild(tagList);
    if (social) {
      card.appendChild(social);
    }
    card.appendChild(actions);

    return card;
  }

  _isEntryInstallable(entry) {
    if (!entry) return false;
    const availability = String(entry.availabilityStatus || '')
      .trim()
      .toLowerCase();
    return availability === 'available' && !!entry.isInstallable;
  }

  _toTimestamp(value) {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  _refreshInstalledBlueprintStateIndex() {
    const systems = SystemService.getAllSystems();
    const catalogEntries = BlueprintCatalogService.getCatalog();
    const legacyNameMap = new Map();
    catalogEntries.forEach((entry) => {
      const key = `${entry.title} Blueprint`.toLowerCase();
      legacyNameMap.set(key, entry.blueprintId);
    });

    const nextIndex = new Map();
    systems.forEach((record) => {
      const data = record?.data || {};
      const attrs = data.attributes || {};
      let blueprintId =
        attrs?.blueprint?.blueprintId || attrs?.blueprintGeneration?.blueprintId || null;

      const systemName = String(record?.name || data.systemName || '').trim();
      if (!blueprintId && systemName) {
        const normalizedName = systemName.toLowerCase();
        for (const [candidate, candidateBlueprintId] of legacyNameMap.entries()) {
          if (normalizedName === candidate || normalizedName.startsWith(`${candidate} (`)) {
            blueprintId = candidateBlueprintId;
            break;
          }
        }
      }

      if (!blueprintId) return;
      if (!nextIndex.has(blueprintId)) {
        nextIndex.set(blueprintId, []);
      }
      nextIndex.get(blueprintId).push({
        systemId: record?.id || systemName,
        systemName,
        lastModified: record?.lastModified || data?.lastModified || null,
        catalogUpdatedAt:
          attrs?.blueprint?.catalogUpdatedAt || attrs?.blueprint?.manifestUpdatedAt || null,
      });
    });

    nextIndex.forEach((items) => {
      items.sort(
        (left, right) =>
          this._toTimestamp(right.lastModified) - this._toTimestamp(left.lastModified)
      );
    });
    this.installedBlueprintStateIndex = nextIndex;
  }

  _getBlueprintInstallState(entry) {
    if (!entry) {
      return {
        hasInstalled: false,
        installedCount: 0,
        latestSystemId: null,
        latestSystemName: null,
        updateAvailable: false,
      };
    }

    const installedItems = this.installedBlueprintStateIndex?.get(entry.blueprintId) || [];
    const latestInstalled = installedItems[0] || null;
    const catalogUpdatedAt = this._toTimestamp(entry.updatedAt);
    const installedCatalogUpdatedAt = this._toTimestamp(latestInstalled?.catalogUpdatedAt);
    const hasInstalledVersion = installedCatalogUpdatedAt > 0;
    const updateAvailable =
      installedItems.length > 0 &&
      this._isEntryInstallable(entry) &&
      catalogUpdatedAt > 0 &&
      (!hasInstalledVersion || catalogUpdatedAt > installedCatalogUpdatedAt);

    return {
      hasInstalled: installedItems.length > 0,
      installedCount: installedItems.length,
      latestSystemId: latestInstalled?.systemId || null,
      latestSystemName: latestInstalled?.systemName || null,
      updateAvailable,
      installedCatalogUpdatedAt: latestInstalled?.catalogUpdatedAt || null,
    };
  }

  _buildEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'workspace-empty-state community-blueprints-empty';

    const icon = this._createIcon('fas fa-compass');
    icon.classList.add('community-blueprints-empty__icon');
    empty.appendChild(icon);

    const title = document.createElement('p');
    title.className = 'community-blueprints-empty__title';
    title.textContent = 'No blueprints match your filters.';
    empty.appendChild(title);

    const detail = document.createElement('p');
    detail.className = 'community-blueprints-empty__detail';
    detail.textContent = 'Try a broader search or reset one of the filter controls.';
    empty.appendChild(detail);

    return empty;
  }

  _buildPreviewModal() {
    const overlay = document.createElement('div');
    overlay.id = 'blueprintPreviewModal';
    overlay.className = 'community-blueprints-modal is-hidden';

    const dialog = document.createElement('div');
    dialog.className = 'community-blueprints-modal__dialog';

    const header = document.createElement('div');
    header.className = 'community-blueprints-modal__header';

    const title = document.createElement('h3');
    title.id = 'blueprintPreviewTitle';
    title.textContent = 'Blueprint Preview';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn--icon';
    closeBtn.setAttribute('data-action', 'close-preview');
    closeBtn.setAttribute('aria-label', 'Close preview');
    closeBtn.appendChild(this._createIcon('fas fa-times'));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.id = 'blueprintPreviewBody';
    body.className = 'community-blueprints-modal__body';

    const footer = document.createElement('div');
    footer.className = 'community-blueprints-modal__footer';

    const installBtn = document.createElement('button');
    installBtn.id = 'blueprintPreviewInstallBtn';
    installBtn.className = 'btn btn--primary';
    installBtn.setAttribute('data-action', 'install-blueprint');
    installBtn.setAttribute('data-install-mode', 'initial');
    installBtn.appendChild(this._createIcon('fas fa-download'));
    installBtn.appendChild(document.createTextNode(' Install Blueprint'));

    const openInstalledBtn = document.createElement('button');
    openInstalledBtn.id = 'blueprintPreviewOpenInstalledBtn';
    openInstalledBtn.className = 'btn btn--secondary is-hidden';
    openInstalledBtn.setAttribute('data-action', 'open-installed-blueprint');
    openInstalledBtn.appendChild(this._createIcon('fas fa-folder-open'));
    openInstalledBtn.appendChild(document.createTextNode(' Open Installed'));

    const contributeBtn = document.createElement('button');
    contributeBtn.id = 'blueprintPreviewContributeBtn';
    contributeBtn.className = 'btn btn--secondary is-hidden';
    contributeBtn.setAttribute('data-action', 'contribute-blueprint');
    contributeBtn.appendChild(this._createIcon('fas fa-hand-holding-heart'));
    contributeBtn.appendChild(document.createTextNode(' Contribute Package'));

    const starBtn = document.createElement('button');
    starBtn.id = 'blueprintPreviewStarBtn';
    starBtn.className = 'btn btn--secondary is-hidden';
    starBtn.setAttribute('data-action', 'preview-star-toggle');
    starBtn.appendChild(this._createIcon('fas fa-star'));
    starBtn.appendChild(document.createTextNode(' Star'));

    const closeFooterBtn = document.createElement('button');
    closeFooterBtn.className = 'btn btn--secondary';
    closeFooterBtn.setAttribute('data-action', 'close-preview');
    closeFooterBtn.textContent = 'Close';

    footer.appendChild(installBtn);
    footer.appendChild(openInstalledBtn);
    footer.appendChild(contributeBtn);
    footer.appendChild(starBtn);
    footer.appendChild(closeFooterBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    return overlay;
  }

  openPreviewModal(blueprintId) {
    const entry =
      (this.catalogEntries || []).find((item) => item.blueprintId === blueprintId) ||
      BlueprintCatalogService.getBlueprintById(blueprintId);
    if (!entry) {
      notificationManager.showToast('Blueprint not found.', 'error');
      return;
    }

    this.selectedBlueprintId = blueprintId;
    this.selectedBlueprintEntry = entry;
    this.previewComments = [];
    this.previewCommentsCursor = null;
    this.renderPreviewContent(entry);
    this.updatePreviewModalActions(entry);

    const modal = this.container.querySelector('#blueprintPreviewModal');
    if (modal) modal.classList.remove('is-hidden');

    if (entry.marketplace?.isPublished) {
      this._hydrateMarketplacePreview(blueprintId);
    }
  }

  closePreviewModal() {
    this.selectedBlueprintId = null;
    this.selectedBlueprintEntry = null;
    this.previewComments = [];
    this.previewCommentsCursor = null;
    const modal = this.container.querySelector('#blueprintPreviewModal');
    if (modal) modal.classList.add('is-hidden');
  }

  async _hydrateMarketplacePreview(blueprintId) {
    const detail = await BlueprintMarketplaceService.getBlueprintDetail(blueprintId);
    if (!detail?.success) {
      return;
    }

    const latestManifest = detail.latestVersion?.manifest || null;
    const blueprint = detail.blueprint || null;
    const viewer = detail.viewer || null;

    const current =
      this.selectedBlueprintEntry && this.selectedBlueprintEntry.blueprintId === blueprintId
        ? this.selectedBlueprintEntry
        : (this.catalogEntries || []).find((item) => item.blueprintId === blueprintId) || null;
    if (!current) return;

    const nextEntry = {
      ...current,
      title: latestManifest?.title || blueprint?.title || current.title,
      summary: latestManifest?.summary || blueprint?.summary || current.summary,
      category: latestManifest?.category || blueprint?.category || current.category,
      tags: Array.isArray(latestManifest?.tags)
        ? latestManifest.tags
        : Array.isArray(blueprint?.tags)
          ? blueprint.tags
          : current.tags,
      trustLabel: latestManifest?.trustLabel || blueprint?.trustLabel || current.trustLabel,
      complexity: latestManifest?.complexity || blueprint?.complexity || current.complexity,
      companyStage: latestManifest?.companyStage || blueprint?.companyStage || current.companyStage,
      targetTeamSize:
        latestManifest?.targetTeamSize || blueprint?.targetTeamSize || current.targetTeamSize,
      roadmapHorizonYears:
        Number(latestManifest?.roadmapHorizonYears || blueprint?.roadmapHorizonYears) ||
        current.roadmapHorizonYears,
      promptPack: latestManifest?.promptPack || current.promptPack,
      learningOutcomes: latestManifest?.learningOutcomes || current.learningOutcomes,
      author: latestManifest?.author || current.author,
      license: latestManifest?.license || current.license,
      updatedAt: blueprint?.updatedAt || current.updatedAt,
      marketplace: {
        ...(current.marketplace || {}),
        isPublished: true,
        starsCount: Number(blueprint?.starsCount || current.marketplace?.starsCount || 0),
        downloadsCount: Number(
          blueprint?.downloadsCount || current.marketplace?.downloadsCount || 0
        ),
        commentsCount: Number(blueprint?.commentsCount || current.marketplace?.commentsCount || 0),
        latestVersionNumber: Number(
          blueprint?.latestVersionNumber || current.marketplace?.latestVersionNumber || 0
        ),
        updatedAt: blueprint?.updatedAt || current.marketplace?.updatedAt || null,
        author: blueprint?.author || current.marketplace?.author || null,
        viewerHasStarred: !!viewer?.hasStarred,
      },
    };

    this.selectedBlueprintEntry = nextEntry;
    this.renderPreviewContent(nextEntry);
    this.updatePreviewModalActions(nextEntry);
    await this._loadPreviewComments({ reset: true });
  }

  async _loadPreviewComments(options = {}) {
    const { reset = false } = options;
    const entry = this.selectedBlueprintEntry;
    const blueprintId = entry?.blueprintId || this.selectedBlueprintId;
    if (!blueprintId || !entry?.marketplace?.isPublished) return;

    const cursor = reset ? null : this.previewCommentsCursor;
    const result = await BlueprintMarketplaceService.listComments(blueprintId, {
      cursor,
      limit: 20,
    });
    if (!result?.success) return;

    const items = Array.isArray(result.items) ? result.items : [];
    if (reset) {
      this.previewComments = items;
    } else {
      this.previewComments = (this.previewComments || []).concat(items);
    }
    this.previewCommentsCursor = result.nextCursor || null;

    const currentEntry = this.selectedBlueprintEntry;
    if (currentEntry && currentEntry.blueprintId === blueprintId) {
      this.renderPreviewContent(currentEntry);
      this.updatePreviewModalActions(currentEntry);
    }
  }

  loadMorePreviewComments() {
    return this._loadPreviewComments({ reset: false });
  }

  async submitPreviewComment() {
    const entry = this.selectedBlueprintEntry;
    if (!entry?.marketplace?.isPublished) return;

    if (!MarketplaceAuthService.isLoggedIn()) {
      const login = await this.signInToMarketplace();
      if (!login) return;
    }

    const field = this.container.querySelector('#blueprintPreviewCommentInput');
    const body = field ? String(field.value || '').trim() : '';
    if (!body) {
      notificationManager.showToast('Comment cannot be empty.', 'warning');
      return;
    }

    const result = await BlueprintMarketplaceService.createComment(entry.blueprintId, body);
    if (!result?.success) {
      notificationManager.showToast(result?.error || 'Failed to post comment.', 'error');
      return;
    }

    const session = MarketplaceAuthService.getSession();
    this.previewComments = [
      {
        commentId: result.commentId,
        body,
        createdAt: result.createdAt || new Date().toISOString(),
        author: { handle: session?.user?.handle || 'me' },
      },
    ].concat(this.previewComments || []);
    this.previewCommentsCursor = this.previewCommentsCursor || null;

    if (field) field.value = '';
    entry.marketplace.commentsCount = Number(entry.marketplace.commentsCount || 0) + 1;
    this.renderPreviewContent(entry);
    this.updatePreviewModalActions(entry);
    this._fetchRemoteCatalog();
  }

  async togglePreviewStar() {
    const entry = this.selectedBlueprintEntry;
    if (!entry?.marketplace?.isPublished) return;

    if (!MarketplaceAuthService.isLoggedIn()) {
      const login = await this.signInToMarketplace();
      if (!login) return;
    }

    const starBtn = this.container.querySelector('#blueprintPreviewStarBtn');
    if (starBtn) {
      starBtn.disabled = true;
      this._setButtonContent(starBtn, 'fas fa-spinner fa-spin', 'Working...');
    }

    const currentlyStarred = !!entry.marketplace.viewerHasStarred;
    const result = currentlyStarred
      ? await BlueprintMarketplaceService.unstarBlueprint(entry.blueprintId)
      : await BlueprintMarketplaceService.starBlueprint(entry.blueprintId);

    if (!result?.success) {
      notificationManager.showToast(result?.error || 'Star action failed.', 'error');
      if (starBtn) {
        starBtn.disabled = false;
      }
      this.updatePreviewModalActions(entry);
      return;
    }

    entry.marketplace.viewerHasStarred = !currentlyStarred;
    entry.marketplace.starsCount = Math.max(
      0,
      Number(entry.marketplace.starsCount || 0) + (currentlyStarred ? -1 : 1)
    );
    this.renderPreviewContent(entry);
    this.updatePreviewModalActions(entry);
    this._fetchRemoteCatalog();
  }

  async signInToMarketplace() {
    const result = await MarketplaceAuthService.loginWithGitHub();
    if (!result?.success) {
      notificationManager.showToast(result?.error || 'Sign-in failed.', 'error');
      return false;
    }
    const handle = result.session?.user?.handle;
    notificationManager.showToast(handle ? `Signed in as @${handle}.` : 'Signed in.', 'success');
    this._refreshMarketplaceAuthButton();
    this._updatePublishRemoteButton();
    this.refreshCatalog();
    if (this.selectedBlueprintId) {
      const entry =
        this.selectedBlueprintEntry ||
        (this.catalogEntries || []).find((item) => item.blueprintId === this.selectedBlueprintId);
      if (entry?.marketplace?.isPublished) {
        this._hydrateMarketplacePreview(this.selectedBlueprintId);
      }
    }
    return true;
  }

  async signOutOfMarketplace() {
    const confirmed = await notificationManager.confirm(
      'Sign out of the Community Marketplace on this device?',
      'Sign Out',
      { confirmText: 'Sign Out', cancelText: 'Cancel', confirmStyle: 'danger' }
    );
    if (!confirmed) return;
    MarketplaceAuthService.logout();
    notificationManager.showToast('Signed out.', 'success');
    this._refreshMarketplaceAuthButton();
    this._updatePublishRemoteButton();
    this.refreshCatalog();
    if (this.selectedBlueprintEntry) {
      const entry = this.selectedBlueprintEntry;
      if (entry.marketplace) {
        entry.marketplace.viewerHasStarred = false;
      }
      this.renderPreviewContent(entry);
      this.updatePreviewModalActions(entry);
    }
  }

  renderPreviewContent(entry) {
    const titleEl = this.container.querySelector('#blueprintPreviewTitle');
    const bodyEl = this.container.querySelector('#blueprintPreviewBody');
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = entry.title;
    this._clearElement(bodyEl);

    const metadata = document.createElement('div');
    metadata.className = 'community-blueprint-preview__metadata';
    metadata.appendChild(this._createMetaItem('Category', entry.category));
    metadata.appendChild(this._createMetaItem('Trust', entry.trustLabel));
    metadata.appendChild(
      this._createMetaItem('Availability', entry.availabilityStatus || 'Available')
    );
    metadata.appendChild(this._createMetaItem('Complexity', entry.complexity));
    metadata.appendChild(this._createMetaItem('Stage', entry.companyStage));
    metadata.appendChild(this._createMetaItem('Team Size', entry.targetTeamSize));
    metadata.appendChild(this._createMetaItem('Horizon', `${entry.roadmapHorizonYears} years`));
    bodyEl.appendChild(metadata);

    if (entry.marketplace?.isPublished) {
      const marketplaceMeta = document.createElement('div');
      marketplaceMeta.className = 'community-blueprint-preview__summary';
      marketplaceMeta.appendChild(
        this._createMetaItem('Stars', String(Number(entry.marketplace.starsCount || 0)))
      );
      marketplaceMeta.appendChild(
        this._createMetaItem('Downloads', String(Number(entry.marketplace.downloadsCount || 0)))
      );
      marketplaceMeta.appendChild(
        this._createMetaItem('Comments', String(Number(entry.marketplace.commentsCount || 0)))
      );
      marketplaceMeta.appendChild(
        this._createMetaItem(
          'Latest Version',
          entry.marketplace.latestVersionNumber ? `v${entry.marketplace.latestVersionNumber}` : 'v1'
        )
      );
      if (entry.marketplace.author?.handle) {
        marketplaceMeta.appendChild(
          this._createMetaItem('Author', `@${entry.marketplace.author.handle}`)
        );
      }
      bodyEl.appendChild(marketplaceMeta);
    }

    if (!this._isEntryInstallable(entry)) {
      const callout = document.createElement('div');
      callout.className = 'community-blueprint-preview__availability-callout';
      callout.textContent =
        'This curated blueprint is not prebuilt yet. Use Contribute Package to generate it with AI and publish it to your local marketplace.';
      bodyEl.appendChild(callout);
    }

    const installState = this._getBlueprintInstallState(entry);
    if (installState.hasInstalled && installState.latestSystemName) {
      const installedCallout = document.createElement('div');
      installedCallout.className = 'community-blueprint-preview__availability-callout';
      installedCallout.textContent = installState.updateAvailable
        ? `Installed locally as "${installState.latestSystemName}". A newer blueprint package is available.`
        : `Installed locally as "${installState.latestSystemName}".`;
      bodyEl.appendChild(installedCallout);
    }

    if (entry.sourceType === 'curated') {
      const metrics = BlueprintPackageService.getTemplateMetrics(entry.templateSystemKey);
      const summary = document.createElement('div');
      summary.className = 'community-blueprint-preview__summary';
      summary.appendChild(this._createMetaItem('Services', String(metrics.services)));
      summary.appendChild(this._createMetaItem('Teams', String(metrics.teams)));
      summary.appendChild(this._createMetaItem('Goals', String(metrics.goals)));
      summary.appendChild(this._createMetaItem('Initiatives', String(metrics.initiatives)));
      bodyEl.appendChild(summary);
    }

    const promptSection = document.createElement('section');
    promptSection.className = 'community-blueprint-preview__section';
    const promptTitle = document.createElement('h4');
    promptTitle.textContent = 'Prompt Pack';
    promptSection.appendChild(promptTitle);

    const seedPrompt = document.createElement('pre');
    seedPrompt.className = 'community-blueprint-preview__prompt';
    seedPrompt.textContent = entry.promptPack?.seedPrompt || '';
    promptSection.appendChild(seedPrompt);

    const variantsWrap = document.createElement('div');
    variantsWrap.className = 'community-blueprint-preview__variants';
    const variants = Array.isArray(entry.promptPack?.variants) ? entry.promptPack.variants : [];
    variants.forEach((variant) => {
      const variantCard = document.createElement('div');
      variantCard.className = 'community-blueprint-preview__variant';

      const variantName = document.createElement('h5');
      variantName.textContent = variant.name;
      variantCard.appendChild(variantName);

      const variantPrompt = document.createElement('p');
      variantPrompt.textContent = variant.prompt;
      variantCard.appendChild(variantPrompt);
      variantsWrap.appendChild(variantCard);
    });
    promptSection.appendChild(variantsWrap);
    bodyEl.appendChild(promptSection);

    const outcomesSection = document.createElement('section');
    outcomesSection.className = 'community-blueprint-preview__section';
    const outcomesTitle = document.createElement('h4');
    outcomesTitle.textContent = 'Learning Outcomes';
    outcomesSection.appendChild(outcomesTitle);

    const list = document.createElement('ul');
    const outcomes = Array.isArray(entry.learningOutcomes) ? entry.learningOutcomes : [];
    outcomes.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    outcomesSection.appendChild(list);
    bodyEl.appendChild(outcomesSection);

    const discussionSection = document.createElement('section');
    discussionSection.className = 'community-blueprint-preview__section';
    const discussionTitle = document.createElement('h4');
    discussionTitle.textContent = 'Discussion';
    discussionSection.appendChild(discussionTitle);

    if (!entry.marketplace?.isPublished) {
      const note = document.createElement('p');
      note.textContent = 'Publish publicly to enable stars and discussion.';
      discussionSection.appendChild(note);
      bodyEl.appendChild(discussionSection);
      return;
    }

    const commentsList = document.createElement('div');
    commentsList.className = 'community-blueprint-preview__comments';
    if (this.previewComments.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No comments yet. Be the first to share feedback.';
      commentsList.appendChild(empty);
    } else {
      this.previewComments.forEach((comment) => {
        const row = document.createElement('div');
        row.className = 'community-blueprint-preview__comment';

        const meta = document.createElement('div');
        meta.className = 'community-blueprint-preview__comment-meta';
        meta.textContent = `@${comment.author?.handle || 'unknown'} · ${new Date(
          comment.createdAt
        ).toLocaleString()}`;
        row.appendChild(meta);

        const body = document.createElement('p');
        body.className = 'community-blueprint-preview__comment-body';
        body.textContent = comment.body;
        row.appendChild(body);

        commentsList.appendChild(row);
      });
    }
    discussionSection.appendChild(commentsList);

    if (this.previewCommentsCursor) {
      const loadMore = document.createElement('button');
      loadMore.className = 'btn btn--secondary';
      loadMore.setAttribute('data-action', 'preview-load-more-comments');
      loadMore.appendChild(this._createIcon('fas fa-chevron-down'));
      loadMore.appendChild(document.createTextNode(' Load More'));
      discussionSection.appendChild(loadMore);
    }

    const canComment = MarketplaceAuthService.isLoggedIn();
    const commentBox = document.createElement('div');
    commentBox.className = 'community-blueprint-preview__comment-box';

    const textarea = document.createElement('textarea');
    textarea.id = 'blueprintPreviewCommentInput';
    textarea.className = 'community-blueprint-preview__comment-input';
    textarea.rows = 3;
    textarea.placeholder = canComment ? 'Write a comment...' : 'Sign in to leave a comment.';
    textarea.disabled = !canComment;
    commentBox.appendChild(textarea);

    const submit = document.createElement('button');
    submit.className = 'btn btn--primary';
    submit.setAttribute('data-action', 'preview-add-comment');
    submit.appendChild(this._createIcon('fas fa-paper-plane'));
    submit.appendChild(document.createTextNode(' Post Comment'));
    submit.disabled = !canComment;
    commentBox.appendChild(submit);

    discussionSection.appendChild(commentBox);
    bodyEl.appendChild(discussionSection);
  }

  updatePreviewModalActions(entry) {
    const installBtn = this.container.querySelector('#blueprintPreviewInstallBtn');
    const openInstalledBtn = this.container.querySelector('#blueprintPreviewOpenInstalledBtn');
    const contributeBtn = this.container.querySelector('#blueprintPreviewContributeBtn');
    const starBtn = this.container.querySelector('#blueprintPreviewStarBtn');
    if (!installBtn || !openInstalledBtn || !contributeBtn || !starBtn) return;

    const canInstall = this._isEntryInstallable(entry);
    const installState = this._getBlueprintInstallState(entry);
    const showContributionAction = !!entry && entry.sourceType === 'curated' && !canInstall;

    installBtn.classList.remove('btn--primary', 'btn--secondary', 'is-disabled');
    openInstalledBtn.classList.remove('btn--primary', 'btn--secondary', 'is-hidden');
    contributeBtn.classList.remove('btn--primary', 'btn--secondary', 'is-hidden');
    starBtn.classList.remove('btn--primary', 'btn--secondary', 'is-hidden', 'is-disabled');
    installBtn.removeAttribute('data-blueprint-id');
    openInstalledBtn.removeAttribute('data-blueprint-id');
    openInstalledBtn.removeAttribute('data-system-id');

    if (showContributionAction) {
      installBtn.disabled = true;
      installBtn.classList.add('btn--secondary', 'is-disabled');
      installBtn.setAttribute('data-install-mode', 'locked');
      this._setButtonContent(installBtn, 'fas fa-lock', 'Install Locked');

      openInstalledBtn.classList.add('is-hidden');
      openInstalledBtn.disabled = true;

      contributeBtn.classList.remove('btn--secondary');
      contributeBtn.classList.add('btn--primary');
      this._setButtonContent(contributeBtn, 'fas fa-magic', 'Contribute with AI');
      contributeBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      contributeBtn.classList.remove('is-hidden');
      this._updateMarketplacePreviewActions(entry, starBtn);
      return;
    }

    contributeBtn.classList.add('is-hidden');
    contributeBtn.classList.add('btn--secondary');
    contributeBtn.disabled = false;
    contributeBtn.removeAttribute('data-blueprint-id');

    if (!canInstall) {
      installBtn.disabled = true;
      installBtn.classList.add('btn--secondary', 'is-disabled');
      installBtn.setAttribute('data-install-mode', 'locked');
      this._setButtonContent(installBtn, 'fas fa-lock', 'Install Locked');
      openInstalledBtn.classList.add('is-hidden');
      openInstalledBtn.disabled = true;
      this._updateMarketplacePreviewActions(entry, starBtn);
      return;
    }

    const hasInstalled = installState.hasInstalled;
    const latestSystemId = installState.latestSystemId;

    if (!hasInstalled) {
      installBtn.disabled = false;
      installBtn.classList.add('btn--primary');
      installBtn.setAttribute('data-install-mode', 'initial');
      installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      this._setButtonContent(installBtn, 'fas fa-download', 'Install Blueprint');
      openInstalledBtn.classList.add('is-hidden');
      openInstalledBtn.disabled = true;
      this._updateMarketplacePreviewActions(entry, starBtn);
      return;
    }

    if (installState.updateAvailable) {
      installBtn.disabled = false;
      installBtn.classList.add('btn--primary');
      installBtn.setAttribute('data-install-mode', 'update');
      installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      this._setButtonContent(installBtn, 'fas fa-sync-alt', 'Update to Latest');
    } else {
      installBtn.disabled = false;
      installBtn.classList.add('btn--secondary');
      installBtn.setAttribute('data-install-mode', 'copy');
      installBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      this._setButtonContent(installBtn, 'fas fa-copy', 'Install Another Copy');
    }

    if (latestSystemId) {
      openInstalledBtn.classList.remove('is-hidden');
      openInstalledBtn.classList.add(
        installState.updateAvailable ? 'btn--secondary' : 'btn--primary'
      );
      openInstalledBtn.disabled = false;
      openInstalledBtn.setAttribute('data-blueprint-id', entry.blueprintId);
      openInstalledBtn.setAttribute('data-system-id', latestSystemId);
      this._setButtonContent(openInstalledBtn, 'fas fa-folder-open', 'Open Installed');
    } else {
      openInstalledBtn.classList.add('is-hidden');
      openInstalledBtn.disabled = true;
    }

    this._updateMarketplacePreviewActions(entry, starBtn);
  }

  async installSelectedBlueprint() {
    if (!this.selectedBlueprintId) {
      notificationManager.showToast('No blueprint selected.', 'warning');
      return;
    }

    const selectedEntry =
      this.selectedBlueprintEntry ||
      BlueprintCatalogService.getBlueprintById(this.selectedBlueprintId);
    if (!selectedEntry) {
      notificationManager.showToast('Blueprint not found.', 'error');
      return;
    }

    if (!this._isEntryInstallable(selectedEntry)) {
      notificationManager.showToast(
        'This blueprint requires a contribution package before install.',
        'warning'
      );
      return;
    }

    const installBtn = this.container.querySelector('#blueprintPreviewInstallBtn');
    const installMode = installBtn?.getAttribute('data-install-mode') || 'initial';
    if (installBtn) {
      installBtn.disabled = true;
      const progressLabel = installMode === 'update' ? 'Updating...' : 'Installing...';
      this._setButtonContent(installBtn, 'fas fa-spinner fa-spin', progressLabel);
    }

    try {
      const shouldUseMarketplacePackage =
        selectedEntry.marketplace?.isPublished &&
        Number(selectedEntry.marketplace.latestVersionNumber || 0) > 0;
      const result = shouldUseMarketplacePackage
        ? await this._installFromMarketplace(this.selectedBlueprintId, { activateFirst: false })
        : await BlueprintPackageService.installCatalogBlueprint(this.selectedBlueprintId, {
            activateFirst: false,
          });

      if (!result.success) {
        notificationManager.showToast(result.error || 'Installation failed.', 'error');
        return;
      }

      const successMessage =
        installMode === 'update'
          ? `Updated blueprint as "${result.importedSystemId}".`
          : installMode === 'copy'
            ? `Installed additional copy as "${result.importedSystemId}".`
            : `Installed blueprint as "${result.importedSystemId}".`;
      notificationManager.showToast(successMessage, 'success');
      this.closePreviewModal();
      navigationManager.navigateTo('systemsView');
    } catch (error) {
      notificationManager.showToast(error?.message || 'Installation failed.', 'error');
    } finally {
      if (installBtn) {
        this.updatePreviewModalActions(this.selectedBlueprintEntry || selectedEntry);
      }
    }
  }

  async installBlueprintFromCard(blueprintId, installMode = 'default') {
    const entry =
      (this.catalogEntries || []).find((item) => item.blueprintId === blueprintId) ||
      BlueprintCatalogService.getBlueprintById(blueprintId);
    if (!entry) {
      notificationManager.showToast('Blueprint not found.', 'error');
      return;
    }

    if (!this._isEntryInstallable(entry)) {
      notificationManager.showToast(
        'This blueprint is not available yet. Use Contribute Package to generate and unlock it.',
        'warning'
      );
      return;
    }

    try {
      const shouldUseMarketplacePackage =
        entry.marketplace?.isPublished && Number(entry.marketplace.latestVersionNumber || 0) > 0;
      const result = shouldUseMarketplacePackage
        ? await this._installFromMarketplace(blueprintId, { activateFirst: false })
        : await BlueprintPackageService.installCatalogBlueprint(blueprintId, {
            activateFirst: false,
          });

      if (!result.success) {
        notificationManager.showToast(result.error || 'Installation failed.', 'error');
        return;
      }

      const successMessage =
        installMode === 'update'
          ? `Updated blueprint as "${result.importedSystemId}".`
          : installMode === 'copy'
            ? `Installed additional copy as "${result.importedSystemId}".`
            : `Installed blueprint as "${result.importedSystemId}".`;
      notificationManager.showToast(successMessage, 'success');
      navigationManager.navigateTo('systemsView');
    } catch (error) {
      notificationManager.showToast(error?.message || 'Installation failed.', 'error');
    }
  }

  openInstalledBlueprint(blueprintId, systemId) {
    let targetSystemId = String(systemId || '').trim();

    if (!targetSystemId && blueprintId) {
      const entry = (this.catalogEntries || []).find((item) => item.blueprintId === blueprintId) ||
        BlueprintCatalogService.getBlueprintById(blueprintId) || { blueprintId };
      const installState = this._getBlueprintInstallState(entry);
      targetSystemId = installState.latestSystemId || '';
    }

    if (!targetSystemId) {
      notificationManager.showToast('No installed blueprint copy was found to open.', 'warning');
      return;
    }

    if (!SystemService.systemExists(targetSystemId)) {
      this._refreshInstalledBlueprintStateIndex();
      if (blueprintId) {
        const entry = (this.catalogEntries || []).find(
          (item) => item.blueprintId === blueprintId
        ) ||
          BlueprintCatalogService.getBlueprintById(blueprintId) || { blueprintId };
        const refreshedState = this._getBlueprintInstallState(entry);
        targetSystemId = refreshedState.latestSystemId || targetSystemId;
      }
    }

    const opened = SystemService.loadAndActivate(targetSystemId);
    if (!opened) {
      notificationManager.showToast(
        `Installed system "${targetSystemId}" could not be opened.`,
        'error'
      );
    }
  }

  _buildContributionPrompt(entry) {
    const fallbackPrompt = `Design an inspired-by ${entry.title} system with realistic architecture and team topology. Include a credible rolling 3-year roadmap with goals, initiatives, and execution sequencing.`;
    return entry.promptPack?.seedPrompt || fallbackPrompt;
  }

  _buildAiGeneratedSystemName(entry) {
    const baseName = `${entry.title} Blueprint`;
    if (!SystemService.systemExists(baseName)) return baseName;

    let suffix = 2;
    let candidate = `${baseName} (${suffix})`;
    while (SystemService.systemExists(candidate)) {
      suffix += 1;
      candidate = `${baseName} (${suffix})`;
    }
    return candidate;
  }

  async generateContributionWithAI(blueprintId) {
    const entry = BlueprintCatalogService.getBlueprintById(blueprintId);
    if (!entry) {
      notificationManager.showToast('Blueprint not found.', 'error');
      return;
    }

    const settings = SettingsService.get();
    if (!settings?.ai?.isEnabled || !settings?.ai?.apiKey) {
      notificationManager.showToast(
        'Enable AI and add your API key in Settings to contribute a generated package.',
        'warning'
      );
      return;
    }

    const confirmed = await notificationManager.confirm(
      `Generate and publish a contribution for "${entry.title}" using your configured AI key? This uses API tokens.`,
      'Contribute Blueprint',
      { confirmText: 'Generate & Publish', cancelText: 'Cancel', confirmStyle: 'primary' }
    );
    if (!confirmed) return;

    const promptSuggestion = this._buildContributionPrompt(entry);
    const customPrompt = await notificationManager.prompt(
      'Optional: refine the generation prompt before running.',
      promptSuggestion,
      'Contribution Prompt'
    );
    if (customPrompt === null) return;

    const contributionPrompt = String(customPrompt || promptSuggestion).trim();
    if (!contributionPrompt) {
      notificationManager.showToast('Contribution prompt cannot be empty.', 'warning');
      return;
    }

    const overlay = AIGenProgressOverlayView.getInstance();
    overlay.show('Generating contribution package with AI...');
    AIService.closeStatsModal();

    try {
      const result = await AIService.generateSystemFromPrompt(
        contributionPrompt,
        settings.ai.apiKey,
        settings.ai.provider,
        overlay.messageElement
      );
      const generatedSystem = result?.data;
      const stats = result?.stats;

      if (stats) {
        AIService.showStatsModal(stats);
      }

      if (!generatedSystem) {
        notificationManager.showToast('AI generation returned no system data.', 'error');
        return;
      }

      const validation = AIService.validateGeneratedSystem(generatedSystem);
      if (!validation.isValid) {
        const topErrors = validation.errors.slice(0, 5).join('; ');
        notificationManager.showToast(`AI generation failed validation: ${topErrors}`, 'error');
        return;
      }

      const systemName = this._buildAiGeneratedSystemName(entry);
      generatedSystem.systemName = systemName;
      generatedSystem.systemDescription = entry.summary || generatedSystem.systemDescription || '';
      SystemService.setCurrentSystem(generatedSystem);
      const saved = SystemService.saveSystem(generatedSystem, systemName);
      if (!saved) {
        notificationManager.showToast('Generated system could not be saved.', 'error');
        return;
      }

      const draftResult = BlueprintPublishService.createDraftFromSystemId(systemName, {
        blueprintId: entry.blueprintId,
        title: entry.title,
        summary: entry.summary,
        category: entry.category,
        tags: entry.tags || [],
        trustLabel: 'Community',
        seedPrompt: contributionPrompt,
        promptVariants: Array.isArray(entry.promptPack?.variants) ? entry.promptPack.variants : [],
        authorName: 'Community Contributor',
        authorContact: '',
        authorNotes: 'Generated via Community Blueprints AI contribution flow.',
        complexity: entry.complexity,
        companyStage: entry.companyStage,
        targetTeamSize: entry.targetTeamSize,
        roadmapHorizonYears: entry.roadmapHorizonYears || 3,
        learningOutcomes: Array.isArray(entry.learningOutcomes) ? entry.learningOutcomes : [],
      });

      if (!draftResult.success) {
        notificationManager.showToast(
          draftResult.error || 'Failed to create contribution draft.',
          'error'
        );
        return;
      }

      const publishResult = BlueprintPublishService.publishDraftLocally(draftResult.packageData);
      if (!publishResult.success) {
        notificationManager.showToast(
          publishResult.error || 'Failed to publish contribution.',
          'error'
        );
        return;
      }

      notificationManager.showToast(
        `Contribution published and "${entry.title}" is now available in your marketplace.`,
        'success'
      );
      this.refreshCatalog();

      if (this.selectedBlueprintId === entry.blueprintId) {
        const refreshed = BlueprintCatalogService.getBlueprintById(entry.blueprintId);
        if (refreshed) {
          this.selectedBlueprintEntry = refreshed;
          this.renderPreviewContent(refreshed);
          this.updatePreviewModalActions(refreshed);
        }
      }
    } catch (error) {
      notificationManager.showToast(error?.message || 'Contribution generation failed.', 'error');
      console.error('CommunityBlueprintsView contribution generation failed:', error);
    } finally {
      overlay.hide();
      setTimeout(() => overlay.updateMessage('Initializing AI...'), 300);
    }
  }

  _buildPublishModal() {
    const overlay = document.createElement('div');
    overlay.id = 'blueprintPublishModal';
    overlay.className = 'community-blueprints-modal is-hidden';

    const dialog = document.createElement('div');
    dialog.className =
      'community-blueprints-modal__dialog community-blueprints-modal__dialog--wide';

    const header = document.createElement('div');
    header.className = 'community-blueprints-modal__header';

    const title = document.createElement('h3');
    title.textContent = 'Publish Local System Blueprint';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn--icon';
    closeBtn.setAttribute('data-action', 'close-publish-modal');
    closeBtn.setAttribute('aria-label', 'Close publish flow');
    closeBtn.appendChild(this._createIcon('fas fa-times'));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'community-blueprints-modal__body';
    body.appendChild(this._buildPublishForm());

    const footer = document.createElement('div');
    footer.className = 'community-blueprints-modal__footer';

    const validateBtn = document.createElement('button');
    validateBtn.className = 'btn btn--secondary';
    validateBtn.setAttribute('data-action', 'publish-validate');
    validateBtn.appendChild(this._createIcon('fas fa-check-circle'));
    validateBtn.appendChild(document.createTextNode(' Validate'));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--secondary';
    saveBtn.setAttribute('data-action', 'publish-save-local');
    saveBtn.appendChild(this._createIcon('fas fa-share-square'));
    saveBtn.appendChild(document.createTextNode(' Publish Locally'));

    const remoteBtn = document.createElement('button');
    remoteBtn.id = 'publishRemoteBtn';
    remoteBtn.className = 'btn btn--primary';
    remoteBtn.setAttribute('data-action', 'publish-save-remote');
    remoteBtn.appendChild(this._createIcon('fas fa-cloud-upload-alt'));
    remoteBtn.appendChild(document.createTextNode(' Publish Publicly'));

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn--secondary';
    downloadBtn.setAttribute('data-action', 'publish-download');
    downloadBtn.appendChild(this._createIcon('fas fa-file-download'));
    downloadBtn.appendChild(document.createTextNode(' Download Package'));

    footer.appendChild(validateBtn);
    footer.appendChild(downloadBtn);
    footer.appendChild(saveBtn);
    footer.appendChild(remoteBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    return overlay;
  }

  _buildPublishForm() {
    const form = document.createElement('div');
    form.className = 'community-blueprint-publish-form';

    const targetNotice = document.createElement('div');
    targetNotice.id = 'publishTargetBlueprintNotice';
    targetNotice.className = 'community-blueprint-publish-form__target is-hidden';
    form.appendChild(targetNotice);

    const systemSelectHost = document.createElement('div');
    systemSelectHost.id = 'publishSystemSelect';
    systemSelectHost.className = 'community-blueprint-publish-form__select-host';
    form.appendChild(this._buildFormField('Local System', systemSelectHost));
    form.appendChild(this._buildTextInputField('Blueprint Title', 'publishTitleInput'));
    form.appendChild(
      this._buildTextareaField(
        'Summary',
        'publishSummaryInput',
        'Describe the educational value and scope.'
      )
    );
    form.appendChild(this._buildTextInputField('Category', 'publishCategoryInput'));
    form.appendChild(this._buildTextInputField('Tags (comma-separated)', 'publishTagsInput'));

    const trustSelectHost = document.createElement('div');
    trustSelectHost.id = 'publishTrustSelect';
    trustSelectHost.className = 'community-blueprint-publish-form__select-host';
    form.appendChild(this._buildFormField('Trust Label', trustSelectHost));

    form.appendChild(
      this._buildTextareaField(
        'Seed Prompt',
        'publishSeedPromptInput',
        'Prompt used to generate this system or recommended generation prompt.'
      )
    );
    form.appendChild(
      this._buildTextareaField(
        'Prompt Variant (MVP)',
        'publishPromptVariantInput',
        'Optional variant prompt for a lean version.'
      )
    );
    form.appendChild(this._buildTextInputField('Author Name', 'publishAuthorInput'));
    form.appendChild(this._buildTextInputField('Author Contact', 'publishAuthorContactInput'));

    const results = document.createElement('div');
    results.id = 'publishValidationResults';
    results.className = 'community-blueprint-publish-form__results';
    form.appendChild(results);

    return form;
  }

  _renderPublishSystemSelect(systems, selectedSystemId = null) {
    const host = this.container.querySelector('#publishSystemSelect');
    if (!host) return '';

    const options = systems.map((system) => ({
      value: system.id,
      text: system.name,
    }));
    const resolvedValue =
      selectedSystemId && options.some((option) => option.value === selectedSystemId)
        ? selectedSystemId
        : options[0]?.value || '';

    if (this.publishSystemSelect) {
      this.publishSystemSelect.destroy();
      this.publishSystemSelect = null;
    }

    this._clearElement(host);
    this.publishSystemSelect = new ThemedSelect({
      options,
      value: resolvedValue,
      placeholder: 'Select local system...',
      className: 'community-blueprint-publish-form__themed-select',
      id: 'publishSystemSelectInput',
      name: 'publishSystemSelectInput',
      onChange: (value) => {
        if (value) {
          this.prefillPublishFormFromSystem(value);
        }
      },
    });
    host.appendChild(this.publishSystemSelect.render());
    return resolvedValue;
  }

  _renderPublishTrustSelect(selectedValue = 'Community') {
    const host = this.container.querySelector('#publishTrustSelect');
    if (!host) return;

    const options = [
      { value: 'Community', text: 'Community' },
      { value: 'Experimental', text: 'Experimental' },
    ];

    if (this.publishTrustSelect) {
      this.publishTrustSelect.destroy();
      this.publishTrustSelect = null;
    }

    this._clearElement(host);
    this.publishTrustSelect = new ThemedSelect({
      options,
      value: selectedValue,
      placeholder: 'Community',
      className: 'community-blueprint-publish-form__themed-select',
      id: 'publishTrustSelectInput',
      name: 'publishTrustSelectInput',
    });
    host.appendChild(this.publishTrustSelect.render());
  }

  _buildTextInputField(label, inputId) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.className = 'community-blueprint-publish-form__input';
    return this._buildFormField(label, input);
  }

  _buildTextareaField(label, inputId, placeholder = '') {
    const input = document.createElement('textarea');
    input.id = inputId;
    input.className = 'community-blueprint-publish-form__textarea';
    input.rows = 3;
    input.placeholder = placeholder;
    return this._buildFormField(label, input);
  }

  _buildFormField(labelText, inputElement) {
    const wrapper = document.createElement('label');
    wrapper.className = 'community-blueprint-publish-form__field';

    const label = document.createElement('span');
    label.className = 'community-blueprint-publish-form__label';
    label.textContent = labelText;
    wrapper.appendChild(label);

    wrapper.appendChild(inputElement);
    return wrapper;
  }

  openPublishModal(optionsOrSystemId = null) {
    const modal = this.container.querySelector('#blueprintPublishModal');
    if (!modal) return;

    const systems = SystemService.getUserSystems();
    if (systems.length === 0) {
      notificationManager.showToast('Create or load a user system before publishing.', 'warning');
      return;
    }

    let preselectedSystemId = null;
    let targetBlueprintId = null;
    if (typeof optionsOrSystemId === 'string') {
      preselectedSystemId = optionsOrSystemId;
    } else if (optionsOrSystemId && typeof optionsOrSystemId === 'object') {
      preselectedSystemId = optionsOrSystemId.preselectedSystemId || null;
      targetBlueprintId = optionsOrSystemId.targetBlueprintId || null;
    }

    this.publishTargetBlueprintId = targetBlueprintId;
    this.publishTargetBlueprintEntry = targetBlueprintId
      ? BlueprintCatalogService.getBlueprintById(targetBlueprintId)
      : null;

    if (targetBlueprintId && !this.publishTargetBlueprintEntry) {
      notificationManager.showToast('Target blueprint was not found in catalog.', 'warning');
      this.publishTargetBlueprintId = null;
    }

    this.resetPublishForm();
    this.renderPublishTargetNotice();
    const selectedSystemId = this._renderPublishSystemSelect(systems, preselectedSystemId);
    this._renderPublishTrustSelect('Community');
    if (selectedSystemId) {
      this.prefillPublishFormFromSystem(selectedSystemId);
    }

    this._updatePublishRemoteButton();
    modal.classList.remove('is-hidden');
  }

  closePublishModal() {
    this.publishDraftPackage = null;
    this.publishTargetBlueprintId = null;
    this.publishTargetBlueprintEntry = null;
    const modal = this.container.querySelector('#blueprintPublishModal');
    if (modal) modal.classList.add('is-hidden');
  }

  resetPublishForm() {
    this.publishDraftPackage = null;
    if (this.publishTrustSelect) {
      this.publishTrustSelect.setValue('Community');
    }
    const results = this.container.querySelector('#publishValidationResults');
    if (results) {
      this._clearElement(results);
    }
  }

  renderPublishTargetNotice() {
    const host = this.container.querySelector('#publishTargetBlueprintNotice');
    if (!host) return;

    const target = this.publishTargetBlueprintEntry;
    if (!target) {
      host.classList.add('is-hidden');
      host.textContent = '';
      return;
    }

    host.classList.remove('is-hidden');
    host.textContent = `Contributing package for curated blueprint: ${target.title} (${target.blueprintId}).`;
  }

  prefillPublishFormFromSystem(systemId) {
    const systemRecord = SystemService.getAllSystems().find((system) => system.id === systemId);
    if (!systemRecord) return;

    this._setFieldValue('#publishTitleInput', `${systemRecord.name} Community Blueprint`);
    this._setFieldValue(
      '#publishSummaryInput',
      systemRecord.description || 'Community blueprint draft exported from a local SMT system.'
    );
    this._setFieldValue('#publishCategoryInput', 'Community');
    this._setFieldValue('#publishTagsInput', 'community, blueprint, remix');
    this._setFieldValue(
      '#publishSeedPromptInput',
      `Generate a complete SMT system blueprint based on "${systemRecord.name}" with realistic teams, services, goals, initiatives, and work packages for a rolling 3-year plan.`
    );
    this._setFieldValue(
      '#publishPromptVariantInput',
      `Create an MVP variant of "${systemRecord.name}" with fewer teams and Year 1 focus while preserving goal traceability.`
    );
    this._setFieldValue('#publishAuthorInput', 'Community Author');
    this._setFieldValue('#publishAuthorContactInput', '');

    if (this.publishTargetBlueprintEntry) {
      const target = this.publishTargetBlueprintEntry;
      const seedPrompt =
        target.promptPack?.seedPrompt ||
        `Generate an SMT system inspired by "${target.title}" with realistic teams, services, goals, initiatives, and work packages.`;
      const mvpVariant = Array.isArray(target.promptPack?.variants)
        ? target.promptPack.variants.find((variant) => variant.variantId === 'mvp')
        : null;

      this._setFieldValue('#publishTitleInput', target.title);
      this._setFieldValue('#publishSummaryInput', target.summary || systemRecord.description || '');
      this._setFieldValue('#publishCategoryInput', target.category || 'Community');
      this._setFieldValue(
        '#publishTagsInput',
        Array.from(new Set([...(target.tags || []), 'community-contribution'])).join(', ')
      );
      this._setFieldValue('#publishSeedPromptInput', seedPrompt);
      this._setFieldValue('#publishPromptVariantInput', mvpVariant?.prompt || '');
    }
  }

  _setFieldValue(selector, value) {
    const field = this.container.querySelector(selector);
    if (!field) return;
    field.value = value;
  }

  buildPublishMetadataFromForm() {
    const read = (selector) => {
      const field = this.container.querySelector(selector);
      return field ? String(field.value || '').trim() : '';
    };

    const tags = read('#publishTagsInput')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const variantPrompt = read('#publishPromptVariantInput');
    const promptVariants = variantPrompt
      ? [
          {
            variantId: 'mvp',
            name: 'MVP',
            prompt: variantPrompt,
          },
        ]
      : [];

    return {
      blueprintId: this.publishTargetBlueprintId || undefined,
      title: read('#publishTitleInput'),
      summary: read('#publishSummaryInput'),
      category: read('#publishCategoryInput'),
      tags,
      trustLabel: this.publishTrustSelect?.getValue() || 'Community',
      seedPrompt: read('#publishSeedPromptInput'),
      promptVariants,
      authorName: read('#publishAuthorInput'),
      authorContact: read('#publishAuthorContactInput'),
      authorNotes: 'Published from SMT local workspace.',
      complexity: 'Intermediate',
      companyStage: 'Growth',
      targetTeamSize: '50-150',
      roadmapHorizonYears: 3,
      learningOutcomes: [
        'Inspect architecture and org setup.',
        'Review roadmap and execution sequencing.',
        'Remix into your own system constraints.',
      ],
    };
  }

  createPublishDraft() {
    const selectedSystemId = this.publishSystemSelect?.getValue() || '';
    if (!selectedSystemId) {
      return { success: false, error: 'Select a local system first.' };
    }
    const metadata = this.buildPublishMetadataFromForm();
    const draftResult = BlueprintPublishService.createDraftFromSystemId(selectedSystemId, metadata);
    if (!draftResult.success) return draftResult;
    this.publishDraftPackage = draftResult.packageData;
    return draftResult;
  }

  validatePublishDraft() {
    const draftResult = this.createPublishDraft();
    if (!draftResult.success) {
      notificationManager.showToast(draftResult.error, 'error');
      return;
    }

    const validation = BlueprintPublishService.validateDraft(this.publishDraftPackage);
    this.renderPublishValidation(validation);

    if (validation.isValid) {
      notificationManager.showToast('Publish draft is valid.', 'success');
    } else {
      notificationManager.showToast('Publish draft has validation errors.', 'error');
    }
  }

  renderPublishValidation(validation) {
    const host = this.container.querySelector('#publishValidationResults');
    if (!host) return;
    this._clearElement(host);

    const status = document.createElement('p');
    status.className = validation.isValid
      ? 'community-blueprint-publish-form__status community-blueprint-publish-form__status--ok'
      : 'community-blueprint-publish-form__status community-blueprint-publish-form__status--error';
    status.textContent = validation.isValid
      ? 'Validation passed.'
      : 'Validation failed. Resolve errors before publishing.';
    host.appendChild(status);

    if (validation.errors.length > 0) {
      host.appendChild(this._buildValidationList('Errors', validation.errors));
    }
    if (validation.warnings.length > 0) {
      host.appendChild(this._buildValidationList('Warnings', validation.warnings));
    }
  }

  _buildValidationList(label, items) {
    const section = document.createElement('div');
    section.className = 'community-blueprint-publish-form__validation-section';

    const title = document.createElement('h4');
    title.textContent = label;
    section.appendChild(title);

    const list = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    section.appendChild(list);

    return section;
  }

  publishDraftToLocalCatalog() {
    const draftResult = this.createPublishDraft();
    if (!draftResult.success) {
      notificationManager.showToast(draftResult.error, 'error');
      return;
    }

    const publishResult = BlueprintPublishService.publishDraftLocally(this.publishDraftPackage);
    this.renderPublishValidation(publishResult.validation);

    if (!publishResult.success) {
      notificationManager.showToast(publishResult.error || 'Publish failed.', 'error');
      return;
    }

    notificationManager.showToast(
      'Blueprint published to your local catalog (this browser). Download the package to share.',
      'success'
    );
    this.refreshCatalog();
    this.closePublishModal();
  }

  async publishDraftToMarketplace() {
    if (!BlueprintMarketplaceService.isEnabled()) {
      notificationManager.showToast('Marketplace publishing is currently disabled.', 'warning');
      return;
    }

    if (!MarketplaceAuthService.isLoggedIn()) {
      const confirmed = await notificationManager.confirm(
        'You must sign in with GitHub to publish publicly. Continue?',
        'Sign In Required',
        { confirmText: 'Sign In', cancelText: 'Cancel', confirmStyle: 'primary' }
      );
      if (!confirmed) return;
      const ok = await this.signInToMarketplace();
      if (!ok) return;
    }

    const draftResult = this.createPublishDraft();
    if (!draftResult.success) {
      notificationManager.showToast(draftResult.error, 'error');
      return;
    }

    const validation = BlueprintPublishService.validateDraft(this.publishDraftPackage, {
      failOnSecrets: true,
    });
    this.renderPublishValidation(validation);
    if (!validation.isValid) {
      notificationManager.showToast('Resolve validation errors before publishing.', 'error');
      return;
    }

    const remoteBtn = this.container.querySelector('#publishRemoteBtn');
    if (remoteBtn) {
      remoteBtn.disabled = true;
      this._setButtonContent(remoteBtn, 'fas fa-spinner fa-spin', 'Publishing...');
    }

    try {
      const result = await BlueprintMarketplaceService.publishPackage(this.publishDraftPackage);
      if (!result?.success) {
        const requestId = result?.payload?.requestId || result?.requestId || '';
        const code = result?.payload?.code || result?.code || '';
        const suffixParts = [];
        if (code) suffixParts.push(code);
        if (requestId) suffixParts.push(`ref: ${requestId}`);
        const suffix = suffixParts.length > 0 ? ` (${suffixParts.join(', ')})` : '';
        console.error('Public publish failed:', result);
        notificationManager.showToast(
          `${result?.error || 'Public publish failed.'}${suffix}`,
          'error'
        );
        return;
      }

      const versionLabel = result.versionNumber ? `v${result.versionNumber}` : 'new version';
      const statusLabel = result.status || (result.autoApproved ? 'approved' : 'pending');
      const toastMessage =
        statusLabel === 'approved'
          ? `Published publicly (${versionLabel}).`
          : `Submitted for review (${versionLabel}).`;
      notificationManager.showToast(toastMessage, statusLabel === 'approved' ? 'success' : 'info');

      await this._fetchRemoteCatalog();
      this.closePublishModal();
    } catch (error) {
      notificationManager.showToast(error?.message || 'Public publish failed.', 'error');
    } finally {
      this._updatePublishRemoteButton();
    }
  }

  _updatePublishRemoteButton() {
    const remoteBtn = this.container.querySelector('#publishRemoteBtn');
    if (!remoteBtn) return;

    if (!BlueprintMarketplaceService.isEnabled()) {
      remoteBtn.classList.add('is-hidden');
      remoteBtn.disabled = true;
      return;
    }

    remoteBtn.classList.remove('is-hidden');
    remoteBtn.disabled = false;

    const session = MarketplaceAuthService.getSession();
    const handle = session?.user?.handle ? `@${session.user.handle}` : '';
    const label = handle ? `Publish Publicly (${handle})` : 'Sign in to Publish Publicly';
    this._setButtonContent(remoteBtn, 'fas fa-cloud-upload-alt', label);
  }

  _refreshMarketplaceAuthButton() {
    const authBtn = this.container.querySelector('#marketplaceAuthBtn');
    if (!authBtn) return;

    const session = MarketplaceAuthService.getSession();
    authBtn.className = 'btn btn--secondary';
    if (session?.user?.handle) {
      authBtn.setAttribute('data-action', 'marketplace-sign-out');
      this._setButtonContent(authBtn, 'fas fa-sign-out-alt', `Sign out @${session.user.handle}`);
      return;
    }

    authBtn.setAttribute('data-action', 'marketplace-sign-in');
    this._setButtonContent(authBtn, 'fab fa-github', 'Sign in to Publish');
  }

  _updateMarketplacePreviewActions(entry, starBtn) {
    if (!entry?.marketplace?.isPublished) {
      starBtn.classList.add('is-hidden');
      starBtn.disabled = true;
      return;
    }

    starBtn.classList.remove('is-hidden');
    starBtn.classList.add('btn--secondary');

    if (!MarketplaceAuthService.isLoggedIn()) {
      starBtn.disabled = true;
      starBtn.classList.add('is-disabled');
      this._setButtonContent(starBtn, 'fab fa-github', 'Sign in to Star');
      return;
    }

    starBtn.disabled = false;
    starBtn.classList.remove('is-disabled');
    const hasStarred = !!entry.marketplace.viewerHasStarred;
    this._setButtonContent(starBtn, 'fas fa-star', hasStarred ? 'Unstar' : 'Star');
  }

  async _installFromMarketplace(blueprintId, options = {}) {
    const packageResult = await BlueprintMarketplaceService.fetchBlueprintPackage(
      blueprintId,
      'latest'
    );
    if (!packageResult.success) {
      return packageResult;
    }
    return BlueprintPackageService.installBlueprintPackage(packageResult.packageData, options);
  }

  downloadPublishDraft() {
    const draftResult = this.createPublishDraft();
    if (!draftResult.success) {
      notificationManager.showToast(draftResult.error, 'error');
      return;
    }

    const validation = BlueprintPublishService.validateDraft(this.publishDraftPackage);
    this.renderPublishValidation(validation);
    if (!validation.isValid) {
      notificationManager.showToast('Resolve validation errors before download.', 'error');
      return;
    }

    const payload = BlueprintPublishService.buildDownloadPayload(this.publishDraftPackage);
    const blob = new Blob([payload.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = payload.fileName;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    notificationManager.showToast(`Downloaded ${payload.fileName}.`, 'success');
  }

  _toClassToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _setButtonContent(button, iconClass, text) {
    if (!button) return;
    this._clearElement(button);
    button.appendChild(this._createIcon(iconClass));
    button.appendChild(document.createTextNode(` ${text}`));
  }

  _createMetaItem(label, value) {
    const item = document.createElement('div');
    item.className = 'community-blueprint-preview__meta-item';
    const key = document.createElement('span');
    key.className = 'community-blueprint-preview__meta-label';
    key.textContent = label;
    const val = document.createElement('span');
    val.className = 'community-blueprint-preview__meta-value';
    val.textContent = value;
    item.appendChild(key);
    item.appendChild(val);
    return item;
  }

  _createIcon(iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass;
    return icon;
  }

  _clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  _destroyThemedSelectInstances() {
    Object.values(this.filterSelectInstances).forEach((instance) => {
      if (instance) {
        instance.destroy();
      }
    });
    this.filterSelectInstances = {};

    if (this.publishSystemSelect) {
      this.publishSystemSelect.destroy();
      this.publishSystemSelect = null;
    }

    if (this.publishTrustSelect) {
      this.publishTrustSelect.destroy();
      this.publishTrustSelect = null;
    }
  }

  getAIContext() {
    return {
      viewTitle: 'Community Blueprints',
      totalCatalogCount: BlueprintCatalogService.getCatalog().length,
      filteredCount: this.filteredCatalog.length,
      activeFilters: JSON.parse(JSON.stringify(this.filters)),
      selectedBlueprintId: this.selectedBlueprintId,
    };
  }
}
