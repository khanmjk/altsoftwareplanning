import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('MarkdownService', () => {
  it('returns null when markdown-it is unavailable', () => {
    const { loadScript, getExport } = createTestContext({});
    loadScript('js/services/MarkdownService.js', ['MarkdownService']);
    const MarkdownService = getExport('MarkdownService');

    expect(MarkdownService.render('# Title')).toBeNull();
  });

  it('renders markdown with a stubbed renderer', () => {
    const markdownit = () => ({
      render: (text) => `<p>${text}</p>`,
      use() {
        return this;
      },
    });
    const markdownItAnchor = {
      permalink: { headerLink: () => () => {} },
    };

    const { loadScript, getExport } = createTestContext({
      markdownit,
      markdownItAnchor,
    });
    loadScript('js/services/MarkdownService.js', ['MarkdownService']);
    const MarkdownService = getExport('MarkdownService');

    expect(MarkdownService.render('Hello')).toBe('<p>Hello</p>');
    expect(MarkdownService.renderWithAnchors('Hello')).toBe('<p>Hello</p>');
  });
});
