// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('NavigationManager', () => {
  let NavigationManager;
  let navigationManager;
  let workspaceComponent;
  let aiAgentController;
  let AIService;
  let SettingsService;
  let SystemService;
  let sidebar;
  let header;

  beforeEach(() => {
    document.body.replaceChildren();
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content-area';
    document.body.appendChild(mainContent);

    class StubView {
      render() {}
    }

    workspaceComponent = {
      render: vi.fn((viewId, cb) => {
        const container = document.createElement('div');
        cb(container);
      }),
      setPageMetadata: vi.fn(),
    };
    aiAgentController = { setCurrentView: vi.fn() };
    AIService = { updateAiDependentUI: vi.fn() };
    SettingsService = { get: () => ({}) };
    SystemService = { getCurrentSystem: () => ({ systemName: 'Test System' }) };
    sidebar = { setActive: vi.fn() };
    header = { update: vi.fn() };

    const { loadScript, getExport } = createTestContext({
      workspaceComponent,
      aiAgentController,
      AIService,
      SettingsService,
      SystemService,
      WelcomeView: StubView,
      YearPlanningView: StubView,
      GanttPlanningView: StubView,
      CapacityPlanningView: StubView,
      ResourceForecastView: StubView,
      RoadmapView: StubView,
      ManagementView: StubView,
      SystemOverviewView: StubView,
      OrgView: StubView,
      SystemEditView: StubView,
      DashboardView: StubView,
      HelpView: StubView,
      SettingsView: StubView,
      SystemsView: StubView,
      AboutView: StubView,
      window,
      document,
      CustomEvent,
      URL,
    });

    loadScript('js/managers/NavigationManager.js', ['NavigationManager']);
    NavigationManager = getExport('NavigationManager');
    navigationManager = new NavigationManager();
    navigationManager.init(sidebar, header);
  });

  it('navigates to a view and updates state', () => {
    navigationManager.navigateTo('welcomeView');

    expect(navigationManager.currentViewId).toBe('welcomeView');
    expect(aiAgentController.setCurrentView).toHaveBeenCalledWith('welcomeView');
    expect(sidebar.setActive).toHaveBeenCalledWith('welcomeView');
    expect(workspaceComponent.render).toHaveBeenCalled();
    expect(header.update).toHaveBeenCalledWith('welcomeView', 'Test System');
  });
});
