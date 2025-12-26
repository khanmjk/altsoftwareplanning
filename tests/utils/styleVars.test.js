// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('styleVars', () => {
  it('sets CSS custom properties on elements', () => {
    const { loadScript, getExport } = createTestContext({ document });
    loadScript('js/utils/StyleVars.js', ['styleVars']);
    const styleVars = getExport('styleVars');

    const el = document.createElement('div');
    styleVars.set(el, { '--test-color': 'red' });

    expect(el.style.getPropertyValue('--test-color')).toBe('red');
  });
});
