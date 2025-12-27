const openSidebarView = (viewId) => {
  cy.get(`.nav-item[data-view="${viewId}"]`).click();
};

const loadSampleSystem = () => {
  cy.visit('/?view=systemsView');
  cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
  cy.contains('.system-card__title', 'StreamView')
    .closest('.system-card')
    .find('button[data-action="load"]')
    .click({ force: true });
  cy.get('#visualizationCarousel', { timeout: 10000 }).should('exist');
};

const selectThemedOptionById = (selectId, optionText) => {
  cy.get(`[data-themed-select-id="${selectId}"]`).within(() => {
    cy.get('.themed-select__trigger').click();
    cy.contains('.themed-select__option', optionText).click();
  });
  cy.get('body').click(0, 0);
};

const ensureWorkPackageExpanded = (wpId) => {
  cy.get('body').then(($body) => {
    if ($body.find(`tr.gantt-wp-assign-row[data-wp-id="${wpId}"]`).length === 0) {
      cy.get(`tr.gantt-wp-row[data-wp-id="${wpId}"]`)
        .find('button[data-action="toggle-wp"]')
        .scrollIntoView()
        .click({ force: true });
    }
  });
  cy.get(`tr.gantt-wp-assign-row[data-wp-id="${wpId}"]`, { timeout: 10000 }).should('exist');
};

describe('Planning and capacity workflows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
  });

  it('toggles constraints and saves the year plan', () => {
    openSidebarView('planningView');
    cy.get('#teamLoadSummarySection', { timeout: 10000 }).should('exist');
    cy.get('#teamLoadSummarySection h4').should('contain', 'Gross');

    // Flip constraints to verify the Net scenario is reflected.
    cy.get('#applyConstraintsToggle').check({ force: true });
    cy.get('#teamLoadSummarySection h4').should('contain', 'Net');

    // Persist the plan for the current year.
    cy.contains('button', 'Save Plan').click();
    cy.contains('.toast-message', 'saved successfully').should('exist');
  });

  it('adds work packages and assignments in detailed planning', () => {
    openSidebarView('ganttPlanningView');
    cy.get('#ganttSplitPane', { timeout: 10000 }).should('exist');
    cy.get('#ganttPlanningTableContainer').should('exist');

    // Ensure the table controller uses the Frappe renderer before interacting with rows.
    cy.window().then((win) => {
      const featureFlags = win.FeatureFlags || win.eval('FeatureFlags');
      const navManager = win.navigationManager || win.eval('navigationManager');
      featureFlags.setRenderer('frappe');
      const ganttView = navManager.getViewInstance('ganttPlanningView');
      ganttView.chartRenderer = null;
      ganttView.renderGanttChart();
      ganttView.renderGanttTable();
    });

    // Expand the first initiative and add a work package.
    cy.get('tr.gantt-init-row')
      .first()
      .as('initiativeRow')
      .invoke('attr', 'data-initiative-id')
      .then((initiativeId) => {
        cy.wrap(initiativeId).as('initiativeId');
      });
    cy.get('@initiativeRow').find('button[data-action="toggle-initiative"]').click();
    cy.get('@initiativeRow')
      .find('button[data-action="add-wp"]')
      .scrollIntoView()
      .click({ force: true });

    cy.get('@initiativeId').then((initiativeId) => {
      cy.get(`tr.gantt-wp-row[data-initiative-id="${initiativeId}"]`)
        .not('.gantt-wp-row--implicit')
        .last()
        .as('workPackageRow');
    });

    cy.get('@workPackageRow')
      .invoke('attr', 'data-wp-id')
      .then((wpId) => {
        cy.wrap(wpId).as('wpId');
      });

    // Fill in work package details.
    cy.get('@workPackageRow').find('input[data-field="title"]').clear().type('Delivery Prep');
    // Scroll to avoid the sticky header covering date inputs.
    cy.get('@workPackageRow')
      .find('input[data-field="startDate"]')
      .scrollIntoView()
      .clear({ force: true })
      .type('2025-01-15', { force: true });
    cy.get('@workPackageRow')
      .find('input[data-field="endDate"]')
      .scrollIntoView()
      .clear({ force: true })
      .type('2025-03-15', { force: true });

    // Work packages include team assignments by default; expand and update one.
    cy.get('@wpId').then((wpId) => {
      ensureWorkPackageExpanded(wpId);
      cy.get(`tr.gantt-wp-assign-row[data-wp-id="${wpId}"]`)
        .first()
        .find('input[data-field="sdeYears"]')
        .scrollIntoView()
        .clear({ force: true })
        .type('0.5', { force: true })
        .blur();
    });

    // Save should become active after edits.
    cy.get('.gantt-save-btn').should('have.class', 'gantt-save-btn--active');
    cy.window().then((win) => {
      if (!win.ToastComponent) {
        win.ToastComponent = { show: () => {} };
      }
    });
    cy.get('.gantt-save-btn').click();
    cy.get('.gantt-save-btn').should('not.have.class', 'gantt-save-btn--active');
  });

  it('updates capacity configuration and saves changes', () => {
    openSidebarView('capacityConfigView');
    cy.contains('.capacity-chart-header', 'Capacity Waterfall Analysis', { timeout: 10000 }).should(
      'exist'
    );

    cy.get('[data-pill-id="configuration"]').click();
    cy.contains('h2', 'Capacity Configuration').should('exist');

    // Company policy section updates.
    cy.contains('.capacity-section-title', '1. Company Policy Leave').click();
    cy.contains('label', 'Standard Working Days / Year').parent().find('input').clear().type('260');

    // Divisional events section updates.
    cy.contains('.capacity-section-title', '2. Divisional Events').click();
    cy.contains('button', 'Add Event').click();
    cy.get('.capacity-org-events-table tbody tr')
      .last()
      .within(() => {
        cy.get('input').first().clear().type('QBR');
        cy.get('input').last().clear().type('2');
      });

    // Team-specific adjustments updates.
    cy.contains('.capacity-section-title', '3. Team-Specific Adjustments').click();
    cy.get('.capacity-team-item').first().as('teamCard');
    cy.get('@teamCard').find('.capacity-team-header').click();
    cy.get('@teamCard')
      .contains('label', 'Avg. Overhead (Hrs/Week/SDE)')
      .parent()
      .find('input')
      .clear()
      .type('6');
    cy.get('@teamCard')
      .contains('label', 'AI Productivity Gain (%)')
      .parent()
      .find('input')
      .clear()
      .type('12');

    cy.get('@teamCard').contains('button', 'Add Activity').click();
    cy.get('@teamCard')
      .find('table tbody tr')
      .last()
      .within(() => {
        cy.get('input').eq(0).clear().type('On-call');
        cy.get('input').eq(1).clear().type('4');
        cy.get('select').select('total');
      });

    cy.contains('button', 'Save Changes').click();
    cy.contains('.toast-message', 'Capacity configuration saved.').should('exist');
  });

  it('validates forecast inputs and saves team results', () => {
    openSidebarView('sdmForecastingView');
    cy.get('#rf-chart', { timeout: 10000 }).should('exist');

    // Playground mode should allow manual input.
    cy.get('#rf-funded-size').should('have.prop', 'readOnly', false).clear().type('10');
    cy.get('#rf-current-eng').should('have.prop', 'readOnly', false).clear().type('6');
    cy.get('#rf-hiring-time').clear().type('12');
    cy.get('#rf-target-week').clear().type('8');
    cy.get('#rf-generate-btn').click();
    cy.contains('.toast-message', 'Target week cannot be less than hiring time.').should('exist');
    cy.contains('.toast', 'Target week cannot be less than hiring time.')
      .find('.toast-close')
      .click();

    // Select a real team and confirm forecast values are stored.
    cy.window().then((win) => {
      const systemService = win.SystemService || win.eval('SystemService');
      const team = systemService.getCurrentSystem().teams[0];
      const teamName = team.teamIdentity || team.teamName;
      cy.wrap(teamName).as('teamName');
    });

    cy.get('@teamName').then((teamName) => {
      selectThemedOptionById('rf-team-select', teamName);
    });

    cy.get('#rf-funded-size').should('have.prop', 'readOnly', true);
    cy.get('#rf-current-eng').should('have.prop', 'readOnly', true);
    cy.get('#rf-target-week').clear().type('26');
    cy.get('#rf-generate-btn').click();
    cy.get('#rf-narrative-box').should('have.class', 'forecast-narrative-box--visible');

    cy.window().then((win) => {
      const systemService = win.SystemService || win.eval('SystemService');
      const team = systemService.getCurrentSystem().teams[0];
      expect(team.attributes?.newHireProductiveCapacityGain).to.be.a('number');
    });
  });
});
