// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('MermaidService', () => {
  it('builds theme config based on ThemeService', () => {
    const ThemeService = {
      isDarkTheme: () => true,
      getThemeColors: () => ({
        bgSecondary: '#111111',
        bgTertiary: '#222222',
        borderColor: '#333333',
        textPrimary: '#eeeeee',
        textMuted: '#999999',
      }),
    };

    const { loadScript, getExport } = createTestContext({
      ThemeService,
      DOMParser,
    });
    loadScript('js/services/MermaidService.js', ['MermaidService']);
    const MermaidService = getExport('MermaidService');

    const config = MermaidService._getMermaidThemeConfig();
    expect(config.theme).toBe('dark');
    expect(config.themeVariables.primaryColor).toBe('#111111');
  });

  it('appends SVG markup into a container', () => {
    const ThemeService = {
      isDarkTheme: () => false,
      getThemeColors: () => ({}),
    };
    const { loadScript, getExport } = createTestContext({
      ThemeService,
      DOMParser,
      document,
    });
    loadScript('js/services/MermaidService.js', ['MermaidService']);
    const MermaidService = getExport('MermaidService');

    const container = document.createElement('div');
    const appended = MermaidService._appendSvgToContainer(container, '<svg></svg>');

    expect(appended).toBe(true);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
