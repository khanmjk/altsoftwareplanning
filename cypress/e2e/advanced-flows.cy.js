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

const ensureExpanded = (rootSelector, detailsSelector, headerSelector) => {
  cy.get(`${rootSelector} ${detailsSelector}`).then(($details) => {
    if (!$details.hasClass('expanded')) {
      cy.get(`${rootSelector} ${headerSelector}`).click();
    }
  });
  cy.get(`${rootSelector} ${detailsSelector}`).should('have.class', 'expanded');
};

const ensureSectionExpanded = (sectionEl, headerSelector, contentSelector) => {
  cy.wrap(sectionEl)
    .find(contentSelector)
    .then(($content) => {
      if (!$content.hasClass('expanded')) {
        cy.wrap(sectionEl).find(headerSelector).click();
      }
    });
  cy.wrap(sectionEl).find(contentSelector).should('have.class', 'expanded');
};

describe('System lifecycle: create, edit, and delete', () => {
  it('creates a full system with services, APIs, dependencies, teams, and managers', () => {
    const systemName = 'Cypress Full System';
    const initialDescription = 'End-to-end system created by Cypress.';
    const updatedDescription = 'Updated description for Cypress system.';

    cy.clearLocalStorage();

    // Start a new system from the welcome screen.
    cy.visit('/');
    cy.contains('.action-card__title', 'Create New System').click();
    cy.get('#editSystemForm', { timeout: 10000 }).should('exist');

    // Fill in system details.
    cy.get('#systemNameInput').clear().type(systemName);
    cy.get('#systemDescriptionInput').clear().type(initialDescription);

    // Add two services to enable dependencies between them.
    cy.get('#addNewServiceBtn').click();
    cy.get('#addNewServiceBtn').click();

    // Configure the first service with a platform dependency and an API.
    ensureExpanded(
      '.service-edit-item[data-service-index="0"]',
      '.service-edit-details',
      '.service-edit-header'
    );
    cy.get('input[data-service-index="0"][data-field="serviceName"]')
      .clear()
      .type('Gateway Service');
    cy.get('textarea[data-service-index="0"][data-field="serviceDescription"]')
      .clear()
      .type('Ingress and routing layer.');

    cy.contains(
      '.service-edit-item[data-service-index="0"] .service-edit-section-title',
      'Platform Dependencies'
    )
      .closest('.service-edit-section')
      .then(($section) => {
        ensureSectionExpanded(
          $section,
          '.service-edit-section-header',
          '.service-edit-section-content'
        );
        cy.wrap($section).within(() => {
          cy.get('.dual-list-add-new__input').type('Kafka');
          cy.get('.dual-list-add-new button').click();
          cy.get('select[data-field="availablePlatformDependencies"]').select('Kafka');
          cy.get('.dual-list-controls button').first().click();
          cy.get('select[data-field="currentPlatformDependencies"] option').should(
            'contain',
            'Kafka'
          );
        });
      });

    cy.contains('.service-edit-item[data-service-index="0"] .service-edit-section-title', 'APIs')
      .closest('.service-edit-section')
      .then(($section) => {
        ensureSectionExpanded(
          $section,
          '.service-edit-section-header',
          '.service-edit-section-content'
        );
        cy.wrap($section).within(() => {
          cy.contains('button', 'Add New API').click();
        });
      });

    cy.contains('.service-edit-item[data-service-index="0"] .service-edit-section-title', 'APIs')
      .closest('.service-edit-section')
      .then(($section) => {
        ensureSectionExpanded(
          $section,
          '.service-edit-section-header',
          '.service-edit-section-content'
        );
        cy.wrap($section).within(() => {
          cy.get('.service-edit-api-item')
            .first()
            .within(() => {
              cy.get('input.service-edit-input').first().clear().type('Public API');
              cy.get('textarea.service-edit-textarea')
                .first()
                .clear()
                .type('External API surface.');
            });
        });
      });

    // Configure the second service so it can be referenced as a dependency.
    ensureExpanded(
      '.service-edit-item[data-service-index="1"]',
      '.service-edit-details',
      '.service-edit-header'
    );
    cy.get('input[data-service-index="1"][data-field="serviceName"]')
      .clear()
      .type('Billing Service');
    cy.get('textarea[data-service-index="1"][data-field="serviceDescription"]')
      .clear()
      .type('Billing and invoicing engine.');

    // Link the first service to the second as a dependency.
    cy.get('.service-edit-item[data-service-index="0"] .service-edit-header').click();
    cy.get('.service-edit-item[data-service-index="0"] .service-edit-header').click();
    ensureExpanded(
      '.service-edit-item[data-service-index="0"]',
      '.service-edit-details',
      '.service-edit-header'
    );
    cy.contains(
      '.service-edit-item[data-service-index="0"] .service-edit-section-title',
      'Service Dependencies'
    )
      .closest('.service-edit-section')
      .then(($section) => {
        ensureSectionExpanded(
          $section,
          '.service-edit-section-header',
          '.service-edit-section-content'
        );
        cy.wrap($section).within(() => {
          cy.get('select[data-field="availableServiceDependencies"]').select('Billing Service');
          cy.get('.dual-list-controls button').first().click();
          cy.get('select[data-field="currentServiceDependencies"] option').should(
            'contain',
            'Billing Service'
          );
        });
      });

    // Add a team with ownership and management assignments.
    cy.get('#addNewTeamBtn').click();
    ensureExpanded('.team-edit-item', '.team-edit-details', '.team-edit-header');
    cy.get('input[data-team-index="0"][data-field="teamIdentity"]').clear().type('Core');
    cy.get('input[data-team-index="0"][data-field="teamName"]').clear().type('Core Platform');
    cy.get('textarea[data-team-index="0"][data-field="teamDescription"]')
      .clear()
      .type('Platform ownership and core services.');
    cy.get('input[data-team-index="0"][data-field="fundedHeadcount"]').clear().type('6');

    cy.contains('.team-edit-section-title', 'Services Owned')
      .closest('.team-edit-section')
      .then(($section) => {
        ensureSectionExpanded($section, '.team-edit-section-header', '.team-edit-section-content');
        cy.wrap($section).within(() => {
          cy.get('select[data-field="availableServices"]').select('Gateway Service');
          cy.get('.dual-list-controls button').first().click();
          cy.get('select[data-field="currentServices"] option').should(
            'contain',
            'Gateway Service'
          );
        });
      });

    cy.contains('.team-edit-section-title', 'SDM Assignment')
      .closest('.team-edit-section')
      .then(($section) => {
        ensureSectionExpanded($section, '.team-edit-section-header', '.team-edit-section-content');
        cy.wrap($section).within(() => {
          cy.get('.dual-list-add-new__input').type('Alex SDM');
          cy.get('.dual-list-add-new button').click();
          cy.get('select[data-field="availableSdms"]').select('Alex SDM');
          cy.get('.dual-list-controls button').first().click();
          cy.get('select[data-field="currentSdm"] option').should('contain', 'Alex SDM');
        });
      });

    // Assign a senior manager now that an SDM is set.
    cy.get('#srMgrAssignmentContainer_0').within(() => {
      cy.get('.dual-list-add-new__input').type('Casey SrMgr');
      cy.get('.dual-list-add-new button').click();
      cy.get('select[data-field^="availableSrMgrs_"]').select('Casey SrMgr');
      cy.get('.dual-list-controls button').first().click();
      cy.get('select[data-field^="currentSrMgr_"] option').should('contain', 'Casey SrMgr');
    });

    cy.contains('.team-edit-actions button', 'Save Team Changes').click();

    // Persist everything and validate it appears in Systems.
    cy.get('#saveAllChangesBtn').click();
    cy.visit('/?view=systemsView');
    cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
    cy.contains('.system-card__title', systemName).should('exist');
    cy.contains('.system-card__description', initialDescription).should('exist');

    // Edit the system description and confirm it persists.
    cy.contains('.system-card__title', systemName)
      .closest('.system-card')
      .find('button[data-action="load"]')
      .click();
    openSidebarView('systemEditForm');
    cy.get('#systemDescriptionInput').clear().type(updatedDescription);
    cy.get('#saveAllChangesBtn').click();
    cy.visit('/?view=systemsView');
    cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
    cy.contains('.system-card__description', updatedDescription).should('exist');

    // Confirm Org View reflects the new team and managers.
    cy.contains('.system-card__title', systemName)
      .closest('.system-card')
      .find('button[data-action="load"]')
      .click();
    openSidebarView('organogramView');
    cy.get('[data-pill-id="table"]').click();
    cy.get('#teamBreakdown', { timeout: 10000 }).should('contain', 'Core Platform');
    cy.get('#teamBreakdown').should('contain', 'Alex SDM');
    cy.get('#teamBreakdown').should('contain', 'Casey SrMgr');

    // Delete the system and verify it disappears from the load list.
    cy.visit('/?view=systemsView');
    cy.get('#systemsGrid', { timeout: 10000 }).should('exist');
    cy.contains('.system-card__title', systemName)
      .closest('.system-card')
      .find('button[data-action="delete"]')
      .click();
    cy.contains('.notification-modal', 'Delete System').should('exist');
    cy.contains('.notification-modal button', 'Confirm').click();
    cy.contains('.system-card__title', systemName).should('not.exist');
  });
});

describe('Year Plan interactions', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
    openSidebarView('planningView');
    cy.get('#planningTable', { timeout: 10000 }).should('exist');
  });

  it('edits team estimates and toggles scenarios/constraints', () => {
    // Expand Team Load Summary and verify the scenario header updates.
    cy.get('#teamLoadSummaryContent').should('have.class', 'is-hidden');
    cy.get('#teamLoadSummarySection h4').click();
    cy.get('#teamLoadSummaryContent').should('not.have.class', 'is-hidden');
    cy.get('#teamLoadSummarySection h4').should('contain', 'Gross');

    cy.contains('button.year-plan-scenario-btn', 'Team BIS').click();
    cy.contains('button.year-plan-scenario-btn.btn-primary', 'Team BIS').should('exist');
    cy.get('#teamLoadSummarySection h4').should('contain', 'Team BIS');

    cy.get('#applyConstraintsToggle').click();
    cy.get('#teamLoadSummarySection h4').should('contain', 'Net');

    // Update the first editable estimate and confirm it persists after re-render.
    cy.get('#planningTableBody tr')
      .find('input.year-plan-estimate-input')
      .first()
      .scrollIntoView()
      .clear({ force: true })
      .type('1.5', { force: true })
      .blur({ force: true });
    cy.get('#planningTableBody tr')
      .find('input.year-plan-estimate-input')
      .first()
      .should('have.value', '1.50');
  });

  it('reorders initiatives via drag-and-drop', () => {
    // Drag the first non-protected row below the next row and verify order changes.
    cy.get('#planningTableBody tr')
      .not('.year-plan-row--protected')
      .then(($rows) => {
        expect($rows.length).to.be.greaterThan(1);
        const source = $rows[1];
        const target = $rows[0];
        const sourceId = source.dataset.initiativeId;

        cy.wrap(target)
          .scrollIntoView()
          .then(($target) => {
            const rect = $target[0].getBoundingClientRect();
            cy.window().then((win) => {
              const view = win.navigationManager.getViewInstance('planningView');
              const dataTransfer = new win.DataTransfer();
              view.draggedInitiativeId = sourceId;
              view.draggedRowElement = source;
              view._handleDrop({
                target: $target[0],
                clientY: rect.top - 1,
                dataTransfer,
                preventDefault: () => {},
              });
            });
          });

        cy.get('#planningTableBody tr')
          .not('.year-plan-row--protected')
          .first()
          .should('have.attr', 'data-initiative-id', sourceId);
      });
  });
});

describe('Roadmap drag-and-drop planning', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
    openSidebarView('roadmapView');
    cy.get('#roadmapViewContainer', { timeout: 10000 }).should('exist');
  });

  it('moves initiatives across quarterly and 3YP buckets', () => {
    // Move a quarterly card into a different quarter.
    cy.get('[data-pill-id="quarterly"]').click();
    cy.get('#roadmapGridContainer .roadmap-card', { timeout: 10000 })
      .first()
      .then(($card) => {
        const title = $card.find('.card-title').text();
        const sourceCell = $card[0].closest('.roadmap-quarter-cell');
        const sourceQuarter = sourceCell?.dataset?.quarter;
        const targetQuarter = sourceQuarter === 'Q1' ? 'Q2' : 'Q1';

        cy.get(`.roadmap-quarter-cell[data-quarter="${targetQuarter}"]`).then(($target) => {
          cy.window().then((win) => {
            const dataTransfer = new win.DataTransfer();
            cy.wrap($card).trigger('dragstart', { dataTransfer });
            cy.wrap($target).scrollIntoView();
            cy.wrap($target).trigger('dragover', { dataTransfer, force: true });
            cy.wrap($target).trigger('drop', { dataTransfer, force: true });
          });
        });

        cy.get(`.roadmap-quarter-cell[data-quarter="${targetQuarter}"]`)
          .find('.card-title')
          .should('contain', title);
      });

    // Move a card to a different year bucket in the 3YP view.
    cy.get('[data-pill-id="3yp"]').click();
    cy.get('#roadmapGridContainer .roadmap-card', { timeout: 10000 })
      .first()
      .then(($card) => {
        const title = $card.find('.card-title').text();
        const sourceCell = $card[0].closest('.roadmap-quarter-cell');
        const sourceBucket = sourceCell?.dataset?.yearBucket;
        const targetBucket = sourceBucket === 'Future' ? 'Current Year' : 'Future';

        cy.get(`.roadmap-quarter-cell[data-year-bucket="${targetBucket}"]`).then(($target) => {
          cy.window().then((win) => {
            const dataTransfer = new win.DataTransfer();
            cy.wrap($card).trigger('dragstart', { dataTransfer });
            cy.wrap($target).scrollIntoView();
            cy.wrap($target).trigger('dragover', { dataTransfer, force: true });
            cy.wrap($target).trigger('drop', { dataTransfer, force: true });
          });
        });

        cy.get(`.roadmap-quarter-cell[data-year-bucket="${targetBucket}"]`)
          .find('.card-title')
          .should('contain', title);
      });
  });
});

describe('Resource forecasting simulation', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
    openSidebarView('sdmForecastingView');
    cy.get('#rf-chart', { timeout: 10000 }).should('exist');
  });

  it('runs a forecast and renders the narrative summary', () => {
    // Select the first team in the dropdown and run the simulation.
    cy.get('[data-themed-select-id="rf-team-select"] .themed-select__trigger').click();
    cy.get('[data-themed-select-id="rf-team-select"] .themed-select__option')
      .eq(1)
      .then(($option) => {
        const teamLabel = $option.text().trim();
        cy.wrap($option).click();

        cy.get('#rf-generate-btn').click();
        cy.get('#rf-narrative-box')
          .should('have.class', 'forecast-narrative-box--visible')
          .should('contain', teamLabel);
      });
  });
});
