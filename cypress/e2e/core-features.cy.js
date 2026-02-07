const openSidebarView = (viewId) => {
  cy.get(`.nav-item[data-view="${viewId}"]`).click();
};

// Shared helper to load a sample system and land on the System Overview.
const loadSampleSystem = () => {
  cy.visit('/?view=systemsView');
  cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
  cy.contains('.system-card__title', 'StreamView')
    .should('exist')
    .closest('.system-card')
    .find('button[data-action="load"]')
    .click({ force: true });
  cy.get('#visualizationCarousel', { timeout: 10000 }).should('exist');
};

describe('Core flows without a loaded system', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('renders the welcome action cards', () => {
    // Confirm the landing screen exposes the main entry points.
    cy.visit('/');
    cy.get('.welcome-header__title').should('contain', 'Welcome to SMT Platform');
    cy.contains('.action-card__title', 'Load Existing System').should('exist');
    cy.contains('.action-card__title', 'Create New System').should('exist');
    cy.contains('.action-card__title', 'Documentation').should('exist');
  });

  it('lists sample systems in the Systems view', () => {
    // Ensure sample systems are discoverable before loading one.
    cy.visit('/?view=systemsView');
    cy.get('#systemsGrid').should('exist');
    cy.contains('.system-card__title', 'StreamView')
      .closest('.system-card')
      .find('button[data-action="load"]')
      .should('exist');
  });

  it('creates a new system from the welcome screen', () => {
    // Validate the Create New System CTA routes to the editor.
    cy.visit('/');
    cy.contains('.action-card__title', 'Create New System').click();
    cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    cy.location('search').should('include', 'view=systemEditForm');
  });

  it('switches settings tabs and shows each form', () => {
    // Check that Settings tabs swap the visible panel content.
    cy.visit('/?view=settingsView');
    cy.get('#general').should('exist').and('not.have.class', 'is-hidden');

    cy.get('[data-pill-id="ai"]').click();
    cy.get('#ai').should('exist').and('not.have.class', 'is-hidden');
    cy.get('#aiSettingsForm_view').should('exist');

    cy.get('[data-pill-id="appearance"]').click();
    cy.get('#appearance').should('exist').and('not.have.class', 'is-hidden');
    cy.get('#themeSettingsForm_view').should('exist');
  });

  it('loads Help documentation content from a stubbed README', () => {
    // Avoid external dependency by stubbing the README fetch.
    cy.intercept(
      'GET',
      'https://raw.githubusercontent.com/khanmjk/altsoftwareplanning/refs/heads/main/README.md',
      '## Documentation\n\nTest content.'
    ).as('readme');

    cy.visit('/?view=helpView');
    cy.wait('@readme');
    cy.get('#documentationContent', { timeout: 10000 }).should('contain', 'Documentation');
    cy.get('#documentationContent').should('contain', 'Test content.');
  });

  it('renders About content from stubbed data', () => {
    // Stub AboutService calls to avoid JSONP and worker traffic.
    cy.visit('/');
    cy.window().then((win) => {
      const aboutService = win.AboutService || win.eval('AboutService');
      cy.stub(aboutService, 'getBlogPosts').resolves([
        {
          id: 'post-1',
          title: 'AI Planning Tips',
          summary: 'Short summary for Cypress.',
          date: 'Jan 1, 2025',
          url: 'https://example.com/post-1',
        },
      ]);
      cy.stub(aboutService, 'getYouTubeVideos').resolves([
        {
          id: 'vid-1',
          title: 'SMT Demo',
          description: 'Short video description.',
          thumbnail: 'https://example.com/thumbnail.jpg',
          date: 'Jan 2, 2025',
          url: 'https://example.com/video-1',
        },
      ]);
    });

    openSidebarView('aboutView');
    cy.get('#about-posts-container .about-view__post-card', { timeout: 10000 }).should(
      'have.length',
      1
    );
    cy.get('#about-videos-container .about-view__video-card').should('have.length', 1);
  });

  it('opens the feedback modal from the sidebar', () => {
    // Validate the feedback workflow entry point.
    cy.visit('/');
    cy.get('#feedback-nav-item').click();
    cy.get('#feedbackModal').should('have.class', 'is-open');
    cy.get('#feedback-description').should('exist');
    cy.get('#feedback-email').should('exist');
    cy.get('#feedback-submit-btn').should('exist');
  });
});

describe('Core flows with a loaded sample system', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
  });

  it('loads the StreamView sample system into the workspace', () => {
    // Confirm sample system load lands on System Overview.
    cy.location('search').should('include', 'view=visualizationCarousel');
    cy.get('#visualizationCarousel').should('exist');
  });

  it('renders the system architecture visualization', () => {
    // Verify the default System Overview view is active with SVG output.
    cy.get('#visualization').should('have.class', 'active');
    cy.get('#systemSvg').should('exist');
  });

  it('switches to the team relationships visualization', () => {
    // Validate pill navigation swaps to the team view.
    cy.get('[data-pill-id="teamVisualization"]').click();
    cy.get('#teamVisualization').should('have.class', 'active');
    cy.get('#teamSvg').should('exist');
  });

  it('shows the service dependencies table view', () => {
    // Ensure the dependencies table section renders on demand.
    cy.get('[data-pill-id="serviceDependenciesTableSlide"]').click();
    cy.get('#serviceDependenciesTableSlide').should('have.class', 'active');
    cy.get('#serviceDependenciesTableHost').should('exist');
  });

  it('navigates Org Design from block view to engineer list', () => {
    // Validate org view modes toggle between containers.
    openSidebarView('organogramView');
    cy.get('#organogramContent', { timeout: 10000 })
      .should('exist')
      .and('not.have.class', 'is-hidden');

    cy.get('[data-pill-id="engineerList"]').click();
    cy.get('#orgEngineerListView').should('exist').and('not.have.class', 'is-hidden');
  });

  it('loads the Roadmap backlog table and filters', () => {
    // Confirm the backlog view shows the tabular list and status filters.
    openSidebarView('roadmapView');
    cy.get('#backlogTableContainer', { timeout: 10000 }).should('exist');
    cy.get('#backlogStatusFilter_all').should('exist');
  });

  it('switches Roadmap to the quarterly grid view', () => {
    // Validate quarterly roadmap rendering and its filter bar.
    openSidebarView('roadmapView');
    cy.get('[data-pill-id="quarterly"]').click();
    cy.get('#roadmapGridContainer', { timeout: 10000 }).should('exist');
    cy.get('#roadmapTableFilters').should('exist');
  });

  it('switches Management tabs across themes, initiatives, goals, and inspections', () => {
    // Validate product management tabs render their respective lists.
    openSidebarView('managementView');
    cy.get('#themesListContainer', { timeout: 10000 }).should('exist');
    cy.get('button[data-action="add-theme"]').should('exist');

    cy.get('[data-pill-id="initiatives"]').click();
    cy.get('#initiativesListContainer').should('exist');

    cy.get('[data-pill-id="goals"]').click();
    cy.get('#goalsListContainer').should('exist');

    cy.get('[data-pill-id="inspections"]').click();
    cy.get('#goalInspectionTableContainer').should('exist');
  });

  it('renders the Year Plan summary and planning table', () => {
    // Ensure planning summary and table are present for the active year.
    openSidebarView('planningView');
    cy.get('#teamLoadSummarySection', { timeout: 10000 }).should('exist');
    cy.get('#planningTable', { timeout: 10000 }).should('exist');
  });

  it('renders the Detailed Planning Gantt layout', () => {
    // Check the split pane and chart container for detailed planning.
    openSidebarView('ganttPlanningView');
    cy.get('#ganttSplitPane', { timeout: 10000 }).should('exist');
    cy.get('#ganttChartContainer').should('exist');
    cy.get('#ganttRendererToggle').should('exist');
  });

  it('toggles Capacity Tuning to configuration', () => {
    // Validate both dashboard analysis and configuration panels render.
    openSidebarView('capacityConfigView');
    cy.contains('.capacity-chart-header', 'Capacity Waterfall Analysis', { timeout: 10000 }).should(
      'exist'
    );

    cy.get('[data-pill-id="configuration"]').click();
    cy.contains('h2', 'Capacity Configuration').should('exist');
  });

  it('renders the Resource Forecast chart and FAQ section', () => {
    // Confirm forecast inputs, chart, and FAQ container are present.
    openSidebarView('sdmForecastingView');
    cy.get('#rf-chart', { timeout: 10000 }).should('exist');
    cy.get('#rf-generate-btn').should('exist');
    cy.get('#rf-faq-container').should('exist');
  });

  it('shows the Dashboard widget and switches to Team Demand', () => {
    // Validate dashboard navigation and chart widget rendering.
    openSidebarView('dashboardView');
    cy.get('#dashboardContent', { timeout: 10000 }).should('exist');

    cy.get('[data-pill-id="teamDemandWidget"]').click();
    cy.get('#teamDemandChart', { timeout: 10000 }).should('exist');
  });
});
