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

const confirmNotificationModal = (titleText, confirmText = 'Confirm') => {
  cy.contains('.notification-modal', titleText)
    .should('exist')
    .within(() => {
      cy.contains('button', confirmText).click();
    });
};

const ensureExpanded = (itemSelector, detailsSelector, headerSelector) => {
  cy.get(itemSelector).then(($item) => {
    const details = $item.find(detailsSelector);
    if (!details.hasClass('expanded')) {
      cy.wrap($item).find(headerSelector).click({ force: true });
    }
  });
  cy.get(itemSelector).find(detailsSelector).should('have.class', 'expanded');
};

describe('System Edit and Org Design', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
    openSidebarView('systemEditForm');
    cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
  });

  it('adds team details, managers, services, and away members', () => {
    const serviceName = 'Realtime API';
    const teamIdentity = 'Nova';
    const teamName = 'Nova Squad';
    const sdmName = 'Jordan SDM';
    const pmtName = 'Riley PMT';

    // Add a new service to assign to the team.
    cy.get('#addNewServiceBtn').click();
    cy.get('.service-edit-item').last().as('newService');
    cy.get('@newService').scrollIntoView();
    ensureExpanded('@newService', '.service-edit-details', '.service-edit-header');
    cy.get('@newService').find('input[data-field="serviceName"]').clear().type(serviceName);
    cy.get('@newService')
      .find('textarea[data-field="serviceDescription"]')
      .clear()
      .type('API gateway for realtime workloads.');
    cy.get('@newService').contains('button', 'Save Service Changes').click();
    cy.contains('.toast-message', 'Service changes saved.').should('exist');

    // Add a new team and fill in core details.
    cy.get('#addNewTeamBtn').click();
    cy.get('.team-edit-item').last().as('newTeam');
    cy.get('@newTeam').scrollIntoView();
    ensureExpanded('@newTeam', '.team-edit-details', '.team-edit-header');
    cy.get('@newTeam').find('input[data-field="teamIdentity"]').clear().type(teamIdentity);
    cy.get('@newTeam').find('input[data-field="teamName"]').clear().type(teamName);
    cy.get('@newTeam')
      .find('textarea[data-field="teamDescription"]')
      .clear()
      .type('Owns realtime APIs and event processing.');
    cy.get('@newTeam').find('input[data-field="fundedHeadcount"]').clear().type('6');

    // Assign the new service to the team.
    cy.get('@newTeam').contains('.team-edit-section-title', 'Services Owned').click();
    cy.get('@newTeam')
      .contains('.team-edit-section-title', 'Services Owned')
      .closest('.team-edit-section')
      .within(() => {
        cy.get('select[data-field="availableServices"]').select(serviceName);
        cy.contains('.dual-list-controls button', '<').click();
        cy.get('select[data-field="currentServices"]').should('contain', serviceName);
      });

    // Add and assign a new SDM.
    cy.get('@newTeam').contains('.team-edit-section-title', 'SDM Assignment').click();
    cy.get('@newTeam')
      .contains('.team-edit-section-title', 'SDM Assignment')
      .closest('.team-edit-section')
      .within(() => {
        const sdmLabel = `${sdmName} (SDM)`;
        cy.get('.dual-list-add-new__input').clear().type(sdmName);
        cy.get('.dual-list-add-new button').click();
        cy.get('select[data-field="availableManagers"]').select(sdmLabel);
        cy.contains('.dual-list-controls button', '<').click();
        cy.get('select[data-field="currentManager"]').should('contain', sdmName);
      });

    // Add and assign a new PMT.
    cy.get('@newTeam').contains('.team-edit-section-title', 'PMT Assignment').click();
    cy.get('@newTeam')
      .contains('.team-edit-section-title', 'PMT Assignment')
      .closest('.team-edit-section')
      .within(() => {
        cy.get('.dual-list-add-new__input').clear().type(pmtName);
        cy.get('.dual-list-add-new button').click();
        cy.get('select[data-field="availablePmts"]').select(pmtName);
        cy.contains('.dual-list-controls button', '<').click();
        cy.get('select[data-field="currentPmt"]').should('contain', pmtName);
      });

    // Add an away-team member to cover surge capacity.
    cy.get('@newTeam').contains('.team-edit-section-title', 'Away-Team Members').click();
    cy.get('@newTeam')
      .contains('.team-edit-section-title', 'Away-Team Members')
      .closest('.team-edit-section')
      .within(() => {
        cy.get('input[id^="newAwayName_"]').clear().type('Taylor');
        cy.get('input[id^="newAwayLevel_"]').clear().type('5');
        cy.get('input[id^="newAwaySource_"]').clear().type('Platform Ops');
        cy.get('button[id^="addAwayBtn_"]').click();
        cy.get('.away-team-item').should('contain', 'Taylor');
      });

    // Persist team changes and verify it appears in Org Table.
    cy.get('@newTeam').contains('button', 'Save Team Changes').click();
    cy.contains('.toast-message', 'Team changes saved.').should('exist');

    cy.get('#saveAllChangesBtn').click();
    cy.contains('.toast-message', 'saved successfully').should('exist');

    openSidebarView('organogramView');
    cy.get('[data-pill-id="table"]').click();
    cy.get('#teamBreakdown', { timeout: 10000 }).should('contain', teamName);
    cy.get('#teamBreakdown').should('contain', sdmName);
    cy.get('#teamBreakdown').should('contain', pmtName);
  });

  it('removes newly added services and teams', () => {
    const serviceName = 'Temp Service';
    const teamIdentity = 'Temp';
    const teamName = 'Temp Team';

    // Add and then remove a service to validate delete flow.
    cy.get('#addNewServiceBtn').click();
    cy.get('.service-edit-item').last().as('serviceToDelete');
    cy.get('@serviceToDelete').scrollIntoView();
    ensureExpanded('@serviceToDelete', '.service-edit-details', '.service-edit-header');
    cy.get('@serviceToDelete').find('input[data-field="serviceName"]').clear().type(serviceName);
    cy.get('@serviceToDelete').contains('button', 'Save Service Changes').click();
    cy.contains('.toast-message', 'Service changes saved.').should('exist');

    cy.get('@serviceToDelete').contains('button', 'Delete Service').click();
    confirmNotificationModal('Delete Service');
    cy.contains('.service-edit-header', serviceName).should('not.exist');

    // Add and then remove a team to validate delete flow.
    cy.get('#addNewTeamBtn').click();
    cy.get('.team-edit-item').last().as('teamToDelete');
    cy.get('@teamToDelete').scrollIntoView();
    ensureExpanded('@teamToDelete', '.team-edit-details', '.team-edit-header');
    cy.get('@teamToDelete').find('input[data-field="teamIdentity"]').clear().type(teamIdentity);
    cy.get('@teamToDelete').find('input[data-field="teamName"]').clear().type(teamName);
    cy.get('@teamToDelete').contains('button', 'Save Team Changes').click();
    cy.contains('.toast-message', 'Team changes saved.').should('exist');

    cy.get('@teamToDelete').contains('button', 'Delete Team').click();
    confirmNotificationModal('Delete Team');
    cy.contains('.team-edit-header', teamName).should('not.exist');
  });
});
