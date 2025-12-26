import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('FrappeGanttService', () => {
  it('reports missing library and throws on create', () => {
    const { loadScript, getExport } = createTestContext();
    loadScript('js/services/FrappeGanttService.js', ['FrappeGanttService']);
    const FrappeGanttService = getExport('FrappeGanttService');

    expect(FrappeGanttService.isAvailable()).toBe(false);
    expect(() => FrappeGanttService.createInstance('#chart', [])).toThrow();
  });

  it('creates gantt instances when library is present', () => {
    function Gantt(selector, tasks, options) {
      this.selector = selector;
      this.tasks = tasks;
      this.options = options;
    }

    const { loadScript, getExport } = createTestContext({ Gantt });
    loadScript('js/services/FrappeGanttService.js', ['FrappeGanttService']);
    const FrappeGanttService = getExport('FrappeGanttService');

    const instance = FrappeGanttService.createInstance('#chart', [{ id: '1' }], {
      view_mode: 'Day',
    });
    expect(instance.selector).toBe('#chart');
    expect(instance.tasks.length).toBe(1);
  });
});
