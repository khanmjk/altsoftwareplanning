// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('NavigationManager', () => {
  let NavigationManager;
  let navigationManager;
  let managementViewClass;
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

    managementViewClass = class {
      constructor() {
        this.render = vi.fn();
        this.switchTab = vi.fn();
      }
    };

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
      ManagementView: managementViewClass,
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

  it('passes management tab params through render and does not skip rendering', () => {
    navigationManager.navigateTo('managementView', { tab: 'goals' });

    const managementView = navigationManager.getViewInstance('managementView');
    expect(managementView).toBeTruthy();
    expect(managementView.render).toHaveBeenCalledTimes(1);
    expect(managementView.render).toHaveBeenCalledWith(expect.any(HTMLElement), { tab: 'goals' });
    expect(managementView.switchTab).not.toHaveBeenCalled();
  });

  it('supports navigating directly to management inspections tab', () => {
    navigationManager.navigateTo('managementView', { tab: 'inspections' });

    const managementView = navigationManager.getViewInstance('managementView');
    expect(managementView).toBeTruthy();
    expect(managementView.render).toHaveBeenCalledTimes(1);
    expect(managementView.render).toHaveBeenCalledWith(expect.any(HTMLElement), {
      tab: 'inspections',
    });
    expect(managementView.switchTab).not.toHaveBeenCalled();
  });
});
