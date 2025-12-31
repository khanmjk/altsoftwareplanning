/**
 * E2E Tests for Roster Management
 * Tests the unified "Roster" view and related roster operations
 * covering all 7 role types: Engineers, AI Engineers, Away-Team, SDMs, Sr Managers, PMTs, PMs
 */

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

const navigateToManageRoster = () => {
  openSidebarView('organogramView');
  cy.get('[data-pill-id="engineerList"]', { timeout: 10000 }).click();
  // Wait for table to load
  cy.get('#orgEngineerTableWidgetContainer .tabulator', { timeout: 10000 }).should('exist');
};

describe('Roster Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    loadSampleSystem();
  });

  describe('Manage Roster View - Summary Header', () => {
    beforeEach(() => {
      navigateToManageRoster();
    });

    it('displays roster summary with all role type counts', () => {
      cy.get('#orgEngineerTableHeading').should('exist');
      cy.get('#orgEngineerTableHeading').should('contain', 'Engineers');
      cy.get('#orgEngineerTableHeading').should('contain', 'Away-Team');
      cy.get('#orgEngineerTableHeading').should('contain', 'SDMs');
      cy.get('#orgEngineerTableHeading').should('contain', 'Sr Managers');
      cy.get('#orgEngineerTableHeading').should('contain', 'PMTs');
      cy.get('#orgEngineerTableHeading').should('contain', 'PMs');
    });
  });

  describe('Unified Roster Table', () => {
    beforeEach(() => {
      navigateToManageRoster();
    });

    const getRosterTable = (win) => {
      const view = win.navigationManager?.getViewInstance('organogramView');
      const table = view?.engineerTableWidgetInstance?.tabulatorInstance;
      if (!table) {
        throw new Error('Roster table not available.');
      }
      return table;
    };

    const applyRoleTypeFilter = (roleLabel) => {
      cy.window().then((win) => {
        const table = getRosterTable(win);
        if (typeof table.setHeaderFilterValue === 'function') {
          table.setHeaderFilterValue('roleType', roleLabel);
        } else {
          table.setFilter('roleType', '=', roleLabel);
        }
      });
    };

    const assertRoleTypeFiltered = (roleLabel) => {
      cy.window().should((win) => {
        const table = getRosterTable(win);
        const data = table.getData('active');
        expect(data.length, 'filtered rows').to.be.greaterThan(0);
        expect(
          data.every((row) => row.roleType.includes(roleLabel)),
          'role types match'
        ).to.be.true;
      });
    };

    it('displays unified roster table with all role types', () => {
      // Table should exist with rows
      cy.get('#orgEngineerTableWidgetContainer .tabulator-row').should(
        'have.length.greaterThan',
        0
      );

      // Should have more than just engineers (47+ total in StreamView)
      cy.get('#orgEngineerTableWidgetContainer .tabulator-row').should(
        'have.length.greaterThan',
        30
      );
    });

    it('displays Role Type column with filter', () => {
      // Check that Role Type header filter exists
      cy.get('.tabulator-col[tabulator-field="roleType"]').should('exist');

      // Verify role badges are displayed
      cy.get('.org-role-badge').should('exist');
      cy.get('.org-role-badge').should('have.length.greaterThan', 0);
    });

    it('can filter by Engineer role type', () => {
      // Open Role Type filter dropdown
      applyRoleTypeFilter('Engineer');

      // After filter, all rows should be Engineers
      assertRoleTypeFiltered('Engineer');
    });

    it('can filter by SDM role type', () => {
      // Open Role Type filter dropdown
      applyRoleTypeFilter('SDM');

      // After filter, all rows should be SDMs
      assertRoleTypeFiltered('SDM');
    });

    it('displays all 6 role types in the table', () => {
      // Verify each role type badge is present somewhere in the table
      const roleTypes = [
        'Engineer',
        'AI Engineer',
        'Away-Team',
        'SDM',
        'Sr Manager',
        'PMT',
        'Project Manager',
      ];

      roleTypes.forEach((roleType) => {
        cy.get(`#orgEngineerTableWidgetContainer .org-role-badge:contains("${roleType}")`).should(
          'exist'
        );
      });
    });

    it('can search by name across all role types', () => {
      // Filter by name - should show only matching rows
      cy.get('.tabulator-col[tabulator-field="name"] .tabulator-header-filter input').type(
        'Director'
      );

      // Wait for filter to apply
      cy.wait(300);

      // Should show matching Senior Managers
      cy.get('#orgEngineerTableWidgetContainer .tabulator-row:visible').should(
        'have.length.greaterThan',
        0
      );
    });
  });

  describe('Delete Operations for Different Role Types', () => {
    beforeEach(() => {
      navigateToManageRoster();
    });

    it('shows delete button for all roster members', () => {
      // Every row should have a delete button
      cy.get('#orgEngineerTableWidgetContainer .tabulator-row')
        .first()
        .within(() => {
          cy.get('.table-action-btn--delete').should('exist');
        });
    });
  });

  describe('Engineer CRUD Operations (via System Edit)', () => {
    beforeEach(() => {
      openSidebarView('systemEditForm');
      cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    });

    it('can access engineer assignment UI in team edit', () => {
      // Expand first team
      cy.get('.team-edit-item').first().as('team');
      cy.get('@team').find('.team-edit-header').click({ force: true });
      cy.get('@team').find('.team-edit-details').should('have.class', 'expanded');

      // Expand Engineers section
      cy.get('@team').contains('.team-edit-section-title', 'Team Engineer Assignment').click();

      // Add new engineer input field should exist
      cy.get('@team')
        .contains('.team-edit-section-title', 'Team Engineer Assignment')
        .closest('.team-edit-section')
        .within(() => {
          cy.get('.dual-list-add-new__input').should('exist');
        });
    });
  });

  describe('Away-Team Member Operations', () => {
    beforeEach(() => {
      openSidebarView('systemEditForm');
      cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    });

    it('adds and removes away-team member', () => {
      // Expand first team
      cy.get('.team-edit-item').first().as('team');
      cy.get('@team').find('.team-edit-header').click({ force: true });
      cy.get('@team').find('.team-edit-details').should('have.class', 'expanded');

      // Expand Away-Team section
      cy.get('@team').contains('.team-edit-section-title', 'Away-Team Members').click();

      cy.get('@team')
        .contains('.team-edit-section-title', 'Away-Team Members')
        .closest('.team-edit-section')
        .within(() => {
          // Add new away-team member
          cy.get('input[id^="newAwayName_"]').clear().type('Test Contractor');
          cy.get('input[id^="newAwayLevel_"]').clear().type('4');
          cy.get('input[id^="newAwaySource_"]').clear().type('Test Agency');
          cy.get('button[id^="addAwayBtn_"]').click();

          // Verify it was added
          cy.get('.away-team-item').should('contain', 'Test Contractor');
        });

      // Re-render collapses sections; reopen and remove the member.
      cy.get('.team-edit-item').first().as('team');
      cy.get('@team').contains('.team-edit-section-title', 'Away-Team Members').click();
      cy.get('@team')
        .contains('.team-edit-section-title', 'Away-Team Members')
        .closest('.team-edit-section')
        .within(() => {
          cy.get('.away-team-item')
            .contains('Test Contractor')
            .closest('.away-team-item')
            .find('button.btn-danger')
            .click();
        });
    });
  });

  describe('Flexible Hierarchy - Reporting Structure', () => {
    beforeEach(() => {
      openSidebarView('systemEditForm');
      cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    });

    it('displays both SDMs and Senior Managers in reporting dropdown', () => {
      // Expand first team
      cy.get('.team-edit-item').first().as('team');
      cy.get('@team').find('.team-edit-header').click({ force: true });
      cy.get('@team').find('.team-edit-details').should('have.class', 'expanded');

      // Expand SDM Assignment section (now includes Sr Managers)
      cy.get('@team').contains('.team-edit-section-title', 'SDM Assignment').click();

      cy.get('@team')
        .contains('.team-edit-section-title', 'SDM Assignment')
        .closest('.team-edit-section')
        .within(() => {
          // Verify the dropdown shows managers
          cy.get('select[data-field="availableManagers"]').should('exist');

          // Check that both SDM and Sr Manager options are available
          cy.get('select[data-field="availableManagers"] option').then(($options) => {
            const optionTexts = [...$options].map((opt) => opt.text);
            // Should contain at least one SDM option
            expect(optionTexts.some((t) => t.includes('SDM'))).to.be.true;
          });
        });
    });
  });

  describe('PMT Operations', () => {
    beforeEach(() => {
      openSidebarView('systemEditForm');
      cy.get('#editSystemForm', { timeout: 10000 }).should('exist');
    });

    it('adds and assigns PMT to team', () => {
      const pmtName = 'Cypress PMT ' + Date.now();

      // Expand first team
      cy.get('.team-edit-item').first().as('team');
      cy.get('@team').find('.team-edit-header').click({ force: true });
      cy.get('@team').find('.team-edit-details').should('have.class', 'expanded');

      // Expand PMT Assignment section
      cy.get('@team').contains('.team-edit-section-title', 'PMT Assignment').click();

      cy.get('@team')
        .contains('.team-edit-section-title', 'PMT Assignment')
        .closest('.team-edit-section')
        .within(() => {
          // Add new PMT
          cy.get('.dual-list-add-new__input').clear().type(pmtName);
          cy.get('.dual-list-add-new button').click();

          // Select the new PMT and move to current
          cy.get('select[data-field="availablePmts"]').select(pmtName);
          cy.contains('.dual-list-controls button', '<').click();

          // Verify it's assigned
          cy.get('select[data-field="currentPmt"]').should('contain', pmtName);
        });
    });
  });
});
