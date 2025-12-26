import { describe, it, expect, vi } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/ThemeService.js', ['ThemeService']);
const ThemeService = getExport('ThemeService');

describe('ThemeService', () => {
  it('returns theme list including built-ins', () => {
    const list = ThemeService.getThemeList();
    const ids = list.map((t) => t.id);
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
  });

  it('generates random themes with color palette', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);

    const theme = ThemeService.generateRandomTheme();
    expect(theme.id.startsWith('random-')).toBe(true);
    expect(theme.colors).toHaveProperty('bgPrimary');
    expect(theme.colors).toHaveProperty('textPrimary');

    Math.random.mockRestore();
  });
});
