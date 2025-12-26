// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('NotificationManager', () => {
  it('creates toasts and stores history', () => {
    document.body.replaceChildren();
    const { loadScript, getExport } = createTestContext({ document, window });
    loadScript('js/managers/NotificationManager.js', ['NotificationManager']);
    const NotificationManager = getExport('NotificationManager');

    const manager = new NotificationManager();
    manager.showToast('Hello', 'success', 0);

    expect(manager.getNotifications().length).toBe(1);
    expect(document.querySelectorAll('.toast').length).toBe(1);
  });
});
