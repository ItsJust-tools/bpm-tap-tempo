import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  markdownToHtmlWithToc,
  sanitizeHtml,
  slugify,
  uniqueSlug,
  escapeHtml,
  computeStats,
  buildStyledDocument,
  extractTocFromHtml,
  isSafeUrl,
  markdownTool,
} from '../../src/tool/tool-definition';
import { DEFAULT_STATE } from '../../src/tool/types';
import type { MarkdownOptions } from '../../src/tool/types';

const opts = (patch: Partial<MarkdownOptions> = {}): MarkdownOptions => ({
  gfm: true,
  hardLineBreaks: false,
  headingIds: true,
  sanitize: false,
  ...patch,
});

describe('basic markdown', () => {
  it('converts headings, bold, italic, lists, links, code', () => {
    const { html } = markdownToHtml(
      '# Title\n\nSome **bold** and *italic* text.\n\n- one\n- two\n\n1. first\n2. second\n\nA [link](https://example.com) and `code`.',
      opts()
    );
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<code>code</code>');
  });

  it('renders setext and multiple heading levels', () => {
    const { html } = markdownToHtml('Heading\n=======\n\n### deep', opts({ headingIds: false }));
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<h3>deep</h3>');
  });

  it('supports blockquotes and hr', () => {
    const { html } = markdownToHtml('> quoted text\n\n---', opts());
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<p>quoted text</p>');
    expect(html).toContain('<hr />');
  });

  it('escapes html in inline content', () => {
    const { html } = markdownToHtml('Text with <b>bold</b> tag', opts());
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>bold</b>');
  });

  it('handles empty input', () => {
    const { html, toc } = markdownToHtml('', opts());
    expect(html).toBe('');
    expect(toc).toEqual([]);
  });

  it('handles malformed constructs without crashing', () => {
    const inputs = [
      '**unmatched bold',
      '[broken link(',
      '```unclosed fence',
      '| bad | table',
      '1. bad start',
      '> ',
      '```\njs',
    ];
    for (const input of inputs) {
      expect(() => markdownToHtml(input, opts())).not.toThrow();
    }
  });

  it('handles escaped markdown characters', () => {
    const { html } = markdownToHtml('\\*not italic\\*', opts());
    expect(html).toContain('*not italic*');
    expect(html).not.toContain('<em>');
  });

  it('respects hard line breaks option', () => {
    const soft = markdownToHtml('line one\nline two', opts());
    expect(soft.html).not.toContain('<br />');
    const hard = markdownToHtml('line one\nline two', opts({ hardLineBreaks: true }));
    expect(hard.html).toContain('line one<br />\nline two');
  });

  it('supports trailing two spaces as br', () => {
    const { html } = markdownToHtml('line one  \nline two', opts());
    expect(html).toContain('<br />');
  });
});

describe('fenced code blocks', () => {
  it('wraps code with language tag', () => {
    const { html } = markdownToHtml('```js\nconst x = 1;\n```', opts());
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('const x = 1;');
  });

  it('escapes code content', () => {
    const { html } = markdownToHtml('```html\n<div>&amp;</div>\n```', opts());
    expect(html).toContain('&lt;div&gt;&amp;amp;&lt;/div&gt;');
  });

  it('supports tilde fences and no language', () => {
    const { html } = markdownToHtml('~~~\nplain\n~~~', opts());
    expect(html).toContain('<pre><code>plain</code></pre>');
  });
});

describe('GFM features', () => {
  it('renders tables with alignment', () => {
    const md = '| Left | Center | Right |\n| :--- | :----: | ----: |\n| a    | b      | c     |';
    const { html } = markdownToHtml(md, opts());
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th style="text-align:left;">Left</th>');
    expect(html).toContain('<th style="text-align:center;">Center</th>');
    expect(html).toContain('<th style="text-align:right;">Right</th>');
    expect(html).toContain('<td style="text-align:left;">a</td>');
  });

  it('renders task lists', () => {
    const { html } = markdownToHtml('- [x] done\n- [ ] pending', opts());
    expect(html).toContain('<ul>');
    expect(html).toContain('<input type="checkbox" disabled checked />');
    expect(html).toContain('<input type="checkbox" disabled />');
    expect(html).toContain('done');
    expect(html).toContain('pending');
  });

  it('renders strikethrough', () => {
    const { html } = markdownToHtml('~~struck~~', opts());
    expect(html).toContain('<del>struck</del>');
  });

  it('renders autolinks from angle and bare urls', () => {
    const { html } = markdownToHtml('See <https://example.com> and https://foo.bar/baz.', opts());
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(html).toContain('<a href="https://foo.bar/baz">https://foo.bar/baz</a>');
  });

  it('disables GFM features when gfm is off', () => {
    const table = markdownToHtml('| a | b |\n| - | - |\n| 1 | 2 |', opts({ gfm: false }));
    expect(table.html).not.toContain('<table>');
    const strike = markdownToHtml('~~x~~', opts({ gfm: false }));
    expect(strike.html).not.toContain('<del>');
  });
});

describe('sanitize toggle', () => {
  it('strips script tags and event handlers when enabled', () => {
    const dirty = '<p onclick="alert(1)">hi</p><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('hi');
  });

  it('strips script content entirely', () => {
    const clean = sanitizeHtml('<p>ok</p><script>var x = "<b>evil</b>";</script>');
    expect(clean).not.toContain('evil');
    expect(clean).toContain('<p>ok</p>');
  });

  it('neutralizes javascript: urls in href and src', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">x</a><img src="javascript:evil()">');
    expect(clean).toContain('href="#"');
    expect(clean).toContain('src="#"');
    expect(clean).not.toContain('javascript:');
  });

  it('isSafeUrl rejects dangerous schemes', () => {
    expect(isSafeUrl('javascript:x')).toBe(false);
    expect(isSafeUrl('data:text/html,x')).toBe(false);
    expect(isSafeUrl('vbscript:x')).toBe(false);
    expect(isSafeUrl(' https://ok.com ')).toBe(true);
  });

  it('sanitize option can be disabled to keep raw html', () => {
    const md = '<p onclick="x()">raw</p>';
    const raw = markdownToHtml(md, opts({ sanitize: false }));
    expect(raw.html).toContain('onclick');
    const safe = markdownToHtml(md, opts({ sanitize: true }));
    expect(safe.html).not.toContain('onclick');
  });
});

describe('heading ids and TOC', () => {
  it('generates slugs and unique ids', () => {
    const { html, toc } = markdownToHtml('## Hello World\n\n## Hello World\n\n### Hello World!', opts());
    const ids = toc.map((t) => t.id);
    expect(ids[0]).toBe('hello-world');
    expect(ids[1]).toBe('hello-world-1');
    expect(ids[2]).toBe('hello-world-2');
    expect(html).toContain('id="hello-world"');
  });

  it('toc anchors match generated heading ids', () => {
    const md = '# Alpha\n\nSome text\n\n## Beta section\n\n## Gamma';
    const { html, toc } = markdownToHtml(md, opts());
    for (const entry of toc) {
      expect(html).toContain(`id="${entry.id}"`);
      expect(html).toContain(`<h${entry.level} id="${entry.id}">`);
    }
    expect(toc.map((t) => t.text)).toEqual(['Alpha', 'Beta section', 'Gamma']);
  });

  it('markdownToHtmlWithToc injects navigation', () => {
    const { html } = markdownToHtmlWithToc('# Title\n\ntext', opts());
    expect(html).toContain('<nav class="markdown-toc">');
    expect(html).toContain('<a href="#title">Title</a>');
  });

  it('extractTocFromHtml parses heading entries', () => {
    const toc = extractTocFromHtml('<h2 id="x">X</h2><h1 id="y">Y <em>z</em></h1>');
    expect(toc).toEqual([
      { level: 2, text: 'X', id: 'x' },
      { level: 1, text: 'Y z', id: 'y' },
    ]);
  });

  it('skips headings without ids', () => {
    expect(extractTocFromHtml('<h2>plain</h2>')).toEqual([]);
  });
});

describe('slugify and uniqueSlug', () => {
  it('slugifies text', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  Multi   space  ')).toBe('multi-space');
    expect(slugify('## weird **chars**')).toBe('weird-chars');
    expect(slugify('')).toBe('section');
  });

  it('uniqueSlug appends counters', () => {
    const used = new Set<string>(['x']);
    expect(uniqueSlug('x', used)).toBe('x-1');
    expect(uniqueSlug('x', used)).toBe('x-2');
  });
});

describe('stats', () => {
  it('computes document statistics', () => {
    const md = '# Title\n\nWords are here.\n\nA [link](https://x.com) and ![img](https://x.com/i.png)\n\n- item\n\n```js\ncode\n```';
    const { html } = markdownToHtml(md, opts());
    const stats = computeStats(md, html);
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.headings).toBe(1);
    expect(stats.links).toBeGreaterThanOrEqual(1);
    expect(stats.images).toBe(1);
    expect(stats.codeBlocks).toBe(1);
    expect(stats.characters).toBe(md.length);
  });

  it('counts empty doc as zero', () => {
    const stats = computeStats('', '');
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
    expect(stats.headings).toBe(0);
    expect(stats.codeBlocks).toBe(0);
  });
});

describe('styled document', () => {
  it('wraps html in a full document with css', () => {
    const doc = buildStyledDocument('<h1>Hi</h1>', 'My Title');
    expect(doc.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc).toContain('<title>My Title</title>');
    expect(doc).toContain('<h1>Hi</h1>');
    expect(doc).toContain('<style>');
  });

  it('escapes the title', () => {
    expect(buildStyledDocument('', '<script>x</script>')).toContain('&lt;script&gt;');
  });
});

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

describe('markdownTool serialize/deserialize', () => {
  it('round-trips full state', () => {
    const s = {
      markdown: '# Hello\n\ncontent',
      options: { gfm: false, hardLineBreaks: true, headingIds: false, sanitize: false },
    };
    const json = markdownTool.serialize(s);
    const result = markdownTool.deserialize(JSON.parse(json));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(s);
  });

  it('rejects non-object payloads', () => {
    expect(markdownTool.deserialize(null).success).toBe(false);
    expect(markdownTool.deserialize('string').success).toBe(false);
    expect(markdownTool.deserialize(42).success).toBe(false);
    expect(markdownTool.deserialize({ options: {} }).success).toBe(false);
  });

  it('defaults missing options', () => {
    const result = markdownTool.deserialize({ markdown: '# hi' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toEqual(DEFAULT_STATE.options);
    }
  });

  it('defaults invalid option values safely', () => {
    const result = markdownTool.deserialize({
      markdown: 'x',
      options: { gfm: 'yes', hardLineBreaks: null, headingIds: 1, sanitize: false },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options.gfm).toBe(DEFAULT_STATE.options.gfm);
      expect(result.data.options.hardLineBreaks).toBe(DEFAULT_STATE.options.hardLineBreaks);
      expect(result.data.options.headingIds).toBe(DEFAULT_STATE.options.headingIds);
      expect(result.data.options.sanitize).toBe(false);
    }
  });

  it('serializes to valid json containing markdown', () => {
    const json = markdownTool.serialize(DEFAULT_STATE);
    expect(json).toContain('"markdown"');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
