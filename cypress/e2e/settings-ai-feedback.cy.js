const openSidebarView = (viewId) => {
  cy.get(`.nav-item[data-view="${viewId}"]`).click();
};

const confirmNotificationModal = (titleText, confirmText = 'Confirm') => {
  cy.contains('.notification-modal', titleText)
    .should('exist')
    .within(() => {
      cy.contains('button', confirmText).click();
    });
};

describe('Settings, AI, and feedback workflows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('enables AI settings and opens the AI chat panel', () => {
    // Enable AI in Settings and confirm the UI toggles on.
    cy.visit('/?view=settingsView');
    cy.get('[data-pill-id="ai"]').click();
    cy.get('#aiSettingsForm_view', { timeout: 10000 }).should('exist');
    cy.get('#aiConfigInputs_view').should('have.class', 'hidden');

    cy.get('#aiModeEnabled_view').check({ force: true });
    cy.get('#aiConfigInputs_view').should('not.have.class', 'hidden');
    cy.get('#aiApiKeyInput_view').clear().type('test-key');
    cy.contains('button', 'Save Changes').click();
    cy.contains('.toast-message', 'AI Settings saved successfully!').should('exist');

    // Confirm Create with AI cards/buttons are visible.
    cy.visit('/');
    cy.get('#createWithAiCard').should('exist').and('not.have.class', 'is-hidden');
    cy.visit('/?view=systemsView');
    cy.get('#createWithAiBtn').should('not.be.disabled');

    // Open and close the AI chat panel from the header.
    cy.get('#header-ai-btn').click();
    cy.get('#aiChatPanel').should('be.visible');
    cy.get('#header-ai-btn').click();
    cy.get('#aiChatPanel').should('not.be.visible');
  });

  it('submits feedback with a stubbed service call', () => {
    // Stub the feedback service to avoid external network calls.
    cy.visit('/');
    cy.window().then((win) => {
      const feedbackService = win.FeedbackService || win.eval('FeedbackService');
      cy.stub(feedbackService, 'submitFeedback').resolves({
        success: true,
        issueNumber: 321,
        issueUrl: 'https://example.com/issue/321',
      });
    });

    cy.get('#feedback-nav-item').click();
    cy.get('#feedbackModal').should('have.class', 'is-open');
    cy.get('#feedback-description').type('Feedback submitted from Cypress.');
    cy.get('#feedback-email').type('qa@example.com');
    cy.get('#feedback-submit-btn').click();

    cy.contains('.toast-message', 'Thank you! Your feedback has been submitted.').should('exist');
    cy.get('#feedbackModal').should('not.have.class', 'is-open');
  });

  it('deletes a user system and resets defaults', () => {
    const systemName = 'Temp System';

    // Create a new system so the delete button is enabled.
    cy.visit('/?view=systemsView');
    cy.get('#createSystemBtn').click();
    cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    cy.get('#systemNameInput').clear().type(systemName);
    cy.get('#systemDescriptionInput').clear().type('Temporary system for Cypress.');
    cy.get('#saveAllChangesBtn').click();
    cy.contains('.toast-message', 'saved successfully').should('exist');

    // Delete the current system via Settings.
    openSidebarView('settingsView');
    cy.contains('button[data-action="delete"]', 'Delete').should('not.be.disabled').click();
    confirmNotificationModal('Delete System', 'Delete Forever');
    cy.contains('.toast-message', `System "${systemName}" has been deleted.`).should('exist');

    // Ensure the system no longer appears in the systems grid.
    cy.visit('/?view=systemsView');
    cy.contains('.system-card__title', systemName).should('not.exist');

    // Reset defaults to restore sample data.
    cy.visit('/?view=settingsView');
    cy.contains('button[data-action="reset"]', 'Reset').click();
    confirmNotificationModal('Reset to Defaults', 'Reset');
    cy.contains('.toast-message', 'Systems have been reset to defaults.').should('exist');
    cy.visit('/?view=systemsView');
    cy.contains('.system-card__title', 'StreamView').should('exist');
  });
});
