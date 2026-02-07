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
  cy.contains('.notification-modal-title', titleText)
    .parents('.notification-modal')
    .should('exist')
    .within(() => {
      cy.contains('button', confirmText).click({ force: true });
    });
};

const selectThemedOptionById = (selectId, optionText) => {
  cy.get(`[data-themed-select-id="${selectId}"]`).scrollIntoView().as('themedSelect');
  cy.get('@themedSelect').find('.themed-select__trigger').scrollIntoView().click({ force: true });
  cy.get('@themedSelect').contains('.themed-select__option', optionText).click();
  cy.get('@themedSelect').should('not.have.class', 'themed-select--open');
};

const selectThemedMultiOptionsById = (selectId, optionTexts) => {
  cy.get(`[data-themed-select-id="${selectId}"]`).scrollIntoView().as('themedSelect');
  cy.get('@themedSelect').find('.themed-select__trigger').scrollIntoView().click({ force: true });
  optionTexts.forEach((text) => {
    cy.get('@themedSelect').contains('.themed-select__option', text).click();
  });
  cy.get('@themedSelect').find('.themed-select__trigger').click({ force: true });
  cy.get('@themedSelect').should('not.have.class', 'themed-select--open');
};

const selectThemedOptionByLabel = (scopeSelector, labelText, optionText) => {
  cy.get(scopeSelector)
    .contains('label', labelText)
    .parent()
    .find('.themed-select')
    .as('themedSelect');
  cy.get('@themedSelect').find('.themed-select__trigger').click();
  cy.get('@themedSelect').contains('.themed-select__option', optionText).click();
  cy.get('@themedSelect').should('not.have.class', 'themed-select--open');
};

const selectThemedMultiOptionsByLabel = (scopeSelector, labelText, optionTexts) => {
  cy.get(scopeSelector)
    .contains('label', labelText)
    .parent()
    .find('.themed-select')
    .as('themedSelect');
  cy.get('@themedSelect').find('.themed-select__trigger').click();
  optionTexts.forEach((text) => {
    cy.get('@themedSelect').contains('.themed-select__option', text).click();
  });
  cy.get('@themedSelect').find('.themed-select__trigger').click();
  cy.get('@themedSelect').should('not.have.class', 'themed-select--open');
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

describe('Product management workflows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
  });

  it('creates, edits, and deletes themes', () => {
    const themeName = 'Reliability Investments';

    // Create a new theme and save it.
    openSidebarView('managementView');
    cy.get('#themesListContainer', { timeout: 10000 }).should('exist');
    cy.contains('button[data-action="add-theme"]', 'Add Theme').click();

    cy.get('.theme-edit-item').last().as('newTheme');
    cy.get('@newTheme').scrollIntoView();
    ensureExpanded('@newTheme', '.theme-edit-details', '.theme-edit-header');
    cy.get('@newTheme').find('input[data-field="name"]').clear().type(themeName);
    cy.get('@newTheme')
      .find('textarea[data-field="description"]')
      .clear()
      .type('Reliability work that reduces incidents and outages.');
    cy.get('@newTheme').contains('button', 'Save Theme Changes').click();
    cy.contains('.toast-message', 'Theme changes saved.').should('exist');
    cy.get('@newTheme').find('.theme-edit-title').should('contain', themeName);

    // Delete the new theme to confirm cleanup works.
    cy.get('@newTheme').contains('button', 'Delete Theme').click();
    confirmNotificationModal('Delete Theme');
    cy.contains('.theme-edit-title', themeName).should('not.exist');
  });

  it('opens Goals management from roadmap and performs goal CRUD', () => {
    const goalName = 'E2E Goal CRUD';
    const updatedDescription = 'Updated goal description from management view.';

    openSidebarView('roadmapView');
    cy.get('.roadmap-actions-row', { timeout: 10000 }).should('exist');
    cy.contains('.roadmap-actions-row button', 'Manage Goals').click();

    cy.get('#goalsListContainer', { timeout: 10000 }).should('exist');
    cy.contains('button[data-action="add-goal"]', 'Add Goal').click();

    cy.get('.inline-edit-item').last().as('draftGoal');
    ensureExpanded('@draftGoal', '.inline-edit-details', '.inline-edit-header');
    cy.get('@draftGoal').find('input[data-field="name"]').clear().type(goalName);
    cy.get('@draftGoal')
      .find('textarea[data-field="description"]')
      .clear()
      .type('Initial goal description');
    cy.get('@draftGoal').find('input[data-field="dueDate"]').clear().type('2026-12-31');
    cy.get('@draftGoal').contains('button', 'Create Goal').click();
    cy.contains('.toast-message', 'Goal created successfully.').should('exist');

    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('savedGoal');
    ensureExpanded('@savedGoal', '.inline-edit-details', '.inline-edit-header');
    cy.get('@savedGoal')
      .find('textarea[data-field="description"]')
      .clear()
      .type(updatedDescription);
    cy.get('@savedGoal').contains('button', 'Save Changes').click();
    cy.contains('.toast-message', 'Goal saved successfully.').should('exist');

    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('savedGoal');
    ensureExpanded('@savedGoal', '.inline-edit-details', '.inline-edit-header');
    cy.get('@savedGoal')
      .find('textarea[data-field="description"]')
      .should('have.value', updatedDescription);
    cy.get('@savedGoal').contains('button', 'Delete Goal').click();
    confirmNotificationModal('Delete Goal');
    cy.contains('.inline-edit-title', goalName).should('not.exist');
  });

  it('captures weekly goal inspections and reports them in management inspections', () => {
    const goalName = 'Goal Inspection E2E';
    const ownerComment = 'Migration dependency remains volatile.';
    const editedOwnerComment = 'Updated owner check-in after mitigation actions.';
    const ptgText = 'Reduce scope by one epic and add focused tiger team.';

    openSidebarView('managementView');
    cy.get('[data-pill-id="goals"]').click();
    cy.get('#goalsListContainer', { timeout: 10000 }).should('exist');
    cy.contains('button[data-action="add-goal"]', 'Add Goal').click();

    cy.get('.inline-edit-item').last().as('draftGoal');
    ensureExpanded('@draftGoal', '.inline-edit-details', '.inline-edit-header');
    cy.get('@draftGoal').find('input[data-field="name"]').clear().type(goalName);
    cy.get('@draftGoal').find('input[data-field="dueDate"]').clear().type('2026-12-31');
    cy.get('@draftGoal').contains('button', 'Create Goal').click();
    cy.contains('.toast-message', 'Goal created successfully.').should('exist');

    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('savedGoal');
    ensureExpanded('@savedGoal', '.inline-edit-details', '.inline-edit-header');
    selectThemedOptionByLabel('@savedGoal', 'Owner Status', 'At Risk');
    cy.get('@savedGoal')
      .contains('label', 'Owner Comment')
      .parent()
      .find('textarea')
      .clear()
      .type(ownerComment);
    cy.get('@savedGoal')
      .contains('label', 'Path to Green (PTG)')
      .parent()
      .find('textarea')
      .clear()
      .type(ptgText);
    cy.get('@savedGoal').contains('button', 'Log Weekly Check-In').click();
    cy.contains('.toast-message', 'Goal inspection saved.').should('exist');

    // Edit the owner update and save from goal context (without using explicit check-in button).
    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('savedGoal');
    ensureExpanded('@savedGoal', '.inline-edit-details', '.inline-edit-header');
    cy.get('@savedGoal')
      .contains('label', 'Owner Comment')
      .parent()
      .find('textarea')
      .clear()
      .type(editedOwnerComment);
    cy.get('@savedGoal').contains('button', 'Save Changes').click();
    cy.contains('.toast-message', 'Goal saved successfully.').should('exist');

    cy.get('[data-pill-id="inspections"]').click();
    cy.get('#goalInspectionSummary', { timeout: 10000 }).should('exist');
    cy.contains('#goalInspectionTableContainer .tabulator-row', goalName).should('exist');
    cy.contains('#goalInspectionTableContainer .tabulator-row', 'At Risk').should('exist');
    cy.contains('#goalInspectionTableContainer .tabulator-row', editedOwnerComment).should('exist');
    cy.contains('#goalInspectionTableContainer .tabulator-row', ownerComment).should('not.exist');
  });

  it('creates an initiative with ROI and links it to a goal', () => {
    const themeName = 'Reliability';
    const goalName = 'Reduce Incidents';
    const initiativeTitle = 'Reduce MTTR';
    const roiCategory = 'Risk Mitigation';

    openSidebarView('managementView');
    cy.get('#themesListContainer', { timeout: 10000 }).should('exist');

    // Create a theme to attach to the initiative.
    cy.contains('button[data-action="add-theme"]', 'Add Theme').click();
    cy.get('.theme-edit-item').last().as('themeItem');
    cy.get('@themeItem').scrollIntoView();
    ensureExpanded('@themeItem', '.theme-edit-details', '.theme-edit-header');
    cy.get('@themeItem').find('input[data-field="name"]').clear().type(themeName);
    cy.get('@themeItem').contains('button', 'Save Theme Changes').click();
    cy.contains('.toast-message', 'Theme changes saved.').should('exist');

    // Create a strategic goal.
    cy.get('[data-pill-id="goals"]').click();
    cy.get('#goalsListContainer', { timeout: 10000 }).should('exist');
    cy.contains('button[data-action="add-goal"]', 'Add Goal').click();

    cy.get('.inline-edit-item').last().as('goalItem');
    cy.get('@goalItem').scrollIntoView();
    ensureExpanded('@goalItem', '.inline-edit-details', '.inline-edit-header');
    cy.get('@goalItem').find('input[data-field="name"]').clear().type(goalName);
    cy.get('@goalItem')
      .find('textarea[data-field="description"]')
      .clear()
      .type('Lower incident rates across critical systems.');
    cy.get('@goalItem').contains('button', 'Create Goal').click();
    cy.contains('.toast-message', 'Goal created successfully.').should('exist');

    // Create an initiative with assignments and ROI data.
    cy.get('[data-pill-id="initiatives"]').click();
    cy.get('#initiativesListContainer', { timeout: 10000 }).should('exist');
    cy.contains('button[data-action="add-initiative"]', 'Add Initiative').click();

    cy.get('.initiative-edit-item--draft').as('draftInitiative');
    cy.get('@draftInitiative').find('.initiative-edit-details').should('have.class', 'expanded');
    cy.get('@draftInitiative').find('input[data-field="title"]').clear().type(initiativeTitle);
    cy.get('@draftInitiative')
      .find('textarea[data-field="description"]')
      .clear()
      .type('Streamline incident response and recovery workflows.');

    selectThemedOptionByLabel('@draftInitiative', 'Status', 'Committed');
    selectThemedMultiOptionsByLabel('@draftInitiative', 'Themes', [themeName]);

    // Add a team assignment for capacity planning.
    cy.window().then((win) => {
      const systemService = win.SystemService || win.eval('SystemService');
      const team = systemService.getCurrentSystem().teams[0];
      const teamName = team.teamIdentity || team.teamName;
      cy.wrap(teamName).as('teamName');
    });

    cy.get('@draftInitiative')
      .contains('.initiative-edit-section-title', 'Team Assignments')
      .click();
    cy.get('@teamName').then((teamName) => {
      selectThemedOptionById('assignment-team-draft', teamName);
    });
    cy.get('@draftInitiative').find('input.initiative-assignment-sde').clear().type('1.5');
    cy.get('@draftInitiative').contains('button', 'Add').click();
    cy.get('@draftInitiative').find('.initiative-assignments-list').should('contain', '1.5');

    // Fill ROI details to drive goal impact summaries.
    cy.get('@draftInitiative').contains('.initiative-edit-section-title', 'ROI Details').click();
    selectThemedOptionByLabel('@draftInitiative', 'Category', roiCategory);
    cy.get('@draftInitiative').find('input[data-field="roi.estimatedValue"]').clear().type('500');

    cy.get('@draftInitiative').contains('button', 'Create Initiative').click();
    cy.contains('.toast-message', 'created successfully').should('exist');

    // Link the initiative to the goal and confirm themes/ROI propagate.
    cy.get('[data-pill-id="goals"]').click();
    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('goalCard');
    ensureExpanded('@goalCard', '.inline-edit-details', '.inline-edit-header');
    cy.get('@goalCard')
      .contains('label', 'Linked Initiatives')
      .parent()
      .find('select')
      .select(initiativeTitle, { force: true });

    // Linking initiatives re-renders the list, so re-open the goal before saving.
    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('goalCard');
    ensureExpanded('@goalCard', '.inline-edit-details', '.inline-edit-header');
    cy.get('@goalCard').contains('button', 'Save Changes').click();
    cy.contains('.toast-message', 'Goal saved successfully.').should('exist');

    // Re-render goals to refresh derived theme and ROI summaries.
    cy.get('[data-pill-id="themes"]').click();
    cy.get('[data-pill-id="goals"]').click();
    cy.contains('.inline-edit-title', goalName).closest('.inline-edit-item').as('goalCard');
    cy.get('@goalCard').find('.inline-edit-header').click();
    cy.get('@goalCard').find('.goal-theme-tag').should('contain', themeName);
    cy.get('@goalCard').should('contain', roiCategory);
  });

  it('creates, edits, filters, and deletes initiatives in the roadmap backlog', () => {
    const initiativeTitle = 'Quarterly Reliability Push';
    const updatedDescription = 'Updated via roadmap modal.';

    cy.viewport(1920, 1080);
    openSidebarView('roadmapView');
    cy.get('#backlogTableContainer', { timeout: 10000 }).should('exist');

    // Add a new initiative through the roadmap modal.
    cy.get('.roadmap-actions-row').contains('button', 'Add Initiative').click();
    cy.get('#roadmapInitiativeModal').should('exist').and('have.class', 'is-open');
    cy.get('#roadmapInitiativeForm input[name="title"]').type(initiativeTitle);
    cy.get('#roadmapInitiativeForm input[name="targetDueDate"]').type('2025-10-15');
    selectThemedOptionById('roadmapModalStatusSelect', 'Committed');

    cy.window().then((win) => {
      const systemService = win.SystemService || win.eval('SystemService');
      const team = systemService.getCurrentSystem().teams[0];
      const teamName = team.teamIdentity || team.teamName;
      cy.wrap(teamName).as('teamName');
    });

    cy.get('@teamName').then((teamName) => {
      selectThemedOptionById('roadmapModalTeamSelect', teamName);
    });
    cy.get('#roadmapModalSdeYears').clear().type('2');
    cy.contains('button[data-action="add-assignment"]', 'Add').click();
    cy.get('#roadmapModalAssignmentsList').should('contain', '2');

    cy.contains('button[data-action="save"]', 'Save Initiative').click();
    cy.contains('.toast-message', 'Added initiative').should('exist');
    cy.get('#roadmapInitiativeModal').should('not.be.visible');

    // Verify it shows up in the backlog table.
    cy.contains('.tabulator-row', initiativeTitle, { timeout: 10000 }).should('exist');

    // Edit the initiative and confirm the description updates.
    cy.contains('.tabulator-row', initiativeTitle)
      .find('button[data-action="edit"]')
      .click({ force: true });
    cy.get('#roadmapInitiativeForm textarea[name="description"]').clear().type(updatedDescription);
    cy.contains('button[data-action="save"]', 'Save Initiative').click();
    cy.contains('.toast-message', 'Updated initiative').should('exist');
    cy.contains('.tabulator-row', updatedDescription).should('exist');

    // Filter out the initiative by status, then bring it back.
    cy.get('#backlogStatusFilter_committed').uncheck({ force: true });
    cy.contains('.tabulator-row', initiativeTitle).should('not.exist');
    cy.get('#backlogStatusFilter_committed').check({ force: true });
    cy.contains('.tabulator-row', initiativeTitle).should('exist');

    // Delete the initiative from the backlog.
    cy.contains('.tabulator-row', initiativeTitle)
      .find('button[data-action="delete"]')
      .click({ force: true });
    confirmNotificationModal('Delete Initiative');
    cy.contains('.tabulator-row', initiativeTitle).should('not.exist');
  });
});
