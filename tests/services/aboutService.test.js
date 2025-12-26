// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';

describe('AboutService', () => {
  it('extracts summaries and decodes entities', () => {
    const { loadScript, getExport } = createTestContext({
      window,
      document,
      DOMParser,
    });
    loadScript('js/services/AboutService.js', ['AboutService']);
    const AboutService = getExport('AboutService');

    const summary = AboutService._extractSummary(
      '<p>Hello <strong>World</strong></p><script>alert(1)</script>'
    );
    expect(summary.startsWith('Hello World')).toBe(true);

    const decoded = AboutService._decodeHtmlEntities('Tom &amp; Jerry');
    expect(decoded).toBe('Tom & Jerry');
  });

  it('maps YouTube API results', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      json: async () => ({
        items: [
          {
            id: { videoId: 'abc' },
            snippet: {
              title: 'Test &amp; Video',
              description: 'Long description',
              thumbnails: { medium: { url: 'thumb' } },
              publishedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
      }),
    });

    const { loadScript, getExport } = createTestContext({
      window,
      document,
      DOMParser,
      fetch: fetchSpy,
    });
    loadScript('js/services/AboutService.js', ['AboutService']);
    const AboutService = getExport('AboutService');

    const videos = await AboutService.getYouTubeVideos('https://example.com');
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe('Test & Video');
    expect(videos[0].url).toContain('youtube.com');
  });

  it('handles Blogger JSONP callbacks', async () => {
    class DateStub extends Date {
      static now() {
        return 123;
      }
    }

    const { loadScript, getExport } = createTestContext({
      window,
      document,
      DOMParser,
      Date: DateStub,
    });
    loadScript('js/services/AboutService.js', ['AboutService']);
    const AboutService = getExport('AboutService');

    const promise = AboutService.getBlogPosts('blog', 'label', 1);
    const callbackName = 'bloggerCallback_123';
    window[callbackName]({
      feed: {
        entry: [
          {
            id: { $t: 'id-1' },
            title: { $t: 'Post 1' },
            content: { $t: '<p>Body</p>' },
            published: { $t: '2024-01-01T00:00:00Z' },
            link: [{ rel: 'alternate', href: 'https://example.com' }],
          },
        ],
      },
    });

    const posts = await promise;
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Post 1');
  });
});
