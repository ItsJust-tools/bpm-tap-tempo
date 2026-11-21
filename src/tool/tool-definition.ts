import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  DEFAULT_OPTIONS,
  type DocStats,
  type MarkdownOptions,
  type ToolState,
  type TocEntry,
} from './types';

/* ------------------------------- Utilities ------------------------------- */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

/** Generate a unique slug against used ids. */
export function uniqueSlug(text: string, used: Set<string>): string {
  const base = slugify(text);
  let id = base;
  let counter = 1;
  while (used.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }
  used.add(id);
  return id;
}

/* ---------------------------- Inline rendering ---------------------------- */

// Matches balanced emphasis markers (no internal whitespace adjacent to markers).
function emphasize(text: string, marker: string, tag: string): string {
  // Process left-to-right, pairs of markers.
  let result = '';
  let rest = text;
  for (;;) {
    const open = rest.indexOf(marker);
    if (open === -1) {
      result += rest;
      break;
    }
    // Marker must not be preceded by word char (avoid mid-word false positives like a_b_c)
    // nor an escape backslash
    if (
      open > 0 &&
      ((/[\w]/.test(rest[open - 1] ?? '') && marker === '_') ||
        rest[open - 1] === '\\')
    ) {
      result += rest.slice(0, open + marker.length);
      rest = rest.slice(open + marker.length);
      continue;
    }
    const close = rest.indexOf(marker, open + marker.length);
    if (close === -1) {
      result += rest;
      break;
    }
    const inner = rest.slice(open + marker.length, close);
    if (inner.trim() === '') {
      result += rest.slice(0, close + marker.length);
      rest = rest.slice(close + marker.length);
      continue;
    }
    result += rest.slice(0, open) + `<${tag}>${inner}</${tag}>`;
    rest = rest.slice(close + marker.length);
  }
  return result;
}

const ESCAPE_MAP: Record<string, string> = {
  '\\': '\\',
  '`': '`',
  '*': '*',
  '_': '_',
  '{': '{',
  '}': '}',
  '[': '[',
  ']': ']',
  '(': '(',
  ')': ')',
  '>': '>',
  '#': '#',
  '+': '+',
  '-': '-',
  '.': '.',
  '!': '!',
  '|': '|',
};

function decodeEscapes(text: string): string {
  return text.replace(/\\([\\`*_{}\[\]()#+\-.!|])/g, (_, ch: string) => ESCAPE_MAP[ch] ?? ch);
}

export function renderInlineSpans(text: string, options: MarkdownOptions): string {
  let out = escapeHtml(text);
  // code spans first-class (backticks survive escapeHtml)
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  // images and links before autolinks so urls inside constructs are not wrapped twice
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt: string, src: string, title?: string) =>
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} />`
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, label: string, href: string, title?: string) =>
      `<a href="${href}"${title ? ` title="${title}"` : ''}>${label}</a>`
  );
  if (options.gfm) {
    // strikethrough
    out = emphasize(out, '~~', 'del');
    // autolinks: bare urls and <http://...> forms (escaped in out, so & equals &amp;)
    out = out.replace(
      /&lt;(https?:\/\/[^\s&]+)&gt;/g,
      (_m, url: string) =>
        `<a href="${url.replace(/&amp;/g, '&')}">${url.replace(/&amp;/g, '&')}</a>`
    );
    out = out.replace(
      /(^|\s)((?:https?:\/\/)[^\s<>()]+[^\s<>().,;:!?'"\]])/g,
      (_m, pre: string, url: string) => `${pre}<a href="${url}">${url}</a>`
    );
  }
  out = emphasize(out, '**', 'strong');
  out = emphasize(out, '__', 'strong');
  out = emphasize(out, '*', 'em');
  out = emphasize(out, '_', 'em');
  out = decodeEscapes(out);
  return out;
}

/* ------------------------------- Sanitizing ------------------------------- */

const EVENT_ATTR_RE = /^on[a-z]+$/i;
const DANGEROUS_URL_RE = /^\s*(javascript|vbscript|data):/i;

export function isSafeUrl(url: string): boolean {
  return !DANGEROUS_URL_RE.test(url);
}

export function sanitizeHtml(html: string): string {
  let out = html;
  // Remove script/style blocks entirely
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  // Strip event handler attributes
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Neutralize javascript:/vbscript:/data: URLs in href/src
  out = out.replace(
    /\s(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (match, attr: string, _q: string, dq?: string, sq?: string) => {
      const value = dq ?? sq ?? '';
      if (DANGEROUS_URL_RE.test(value)) {
        return ` ${attr}="#"`;
      }
      return match;
    }
  );
  return out;
}

/* ------------------------------ Block parsing ----------------------------- */

interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

function parseFences(lines: string[]): Array<{ type: 'fence'; start: number; end: number; lang: string; indent: number } | null>[] {
  return [];
}
void parseFences;

function extractHeadings(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const level = Number(match[1]);
    const attrs = match[2] ?? '';
    const idMatch = /\bid="([^"]*)"/.exec(attrs);
    const text = (match[3] ?? '').replace(/<[^>]*>/g, '').trim();
    if (idMatch && idMatch[1]) {
      entries.push({ level, text, id: idMatch[1] });
    }
  }
  return entries;
}

export function extractTocFromHtml(html: string): TocEntry[] {
  return extractHeadings(html);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const body = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const cells = body.endsWith('|') && !body.endsWith('\\|') ? body.slice(0, -1) : body;
  const out: string[] = [];
  let current = '';
  let inEscape = false;
  for (const ch of cells) {
    if (inEscape) {
      current += ch;
      inEscape = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      inEscape = true;
      continue;
    }
    if (ch === '|') {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) && line.includes('|');
}

function isTaskItem(line: string): { checked: boolean } | null {
  const m = /^\s*[-*+]\s+\[([ xX])\]\s+/.exec(line);
  if (!m || !m[1]) return null;
  return { checked: m[1].toLowerCase() === 'x' };
}

function isListItem(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}

function indentOf(line: string): number {
  const m = /^(\s*)/.exec(line);
  return m ? (m[1] ?? '').replace(/\t/g, '  ').length : 0;
}

function stripListMarker(line: string): string {
  const task = isTaskItem(line);
  if (task) {
    return line.replace(/^(\s*)([-*+]|\d+[.)])\s+\[[ xX]\]\s+/, '$1');
  }
  return line.replace(/^(\s*)([-*+]|\d+[.)])\s+/, '$1');
}

function listMarkerInfo(line: string): { marker: string; ordered: boolean; index?: number } {
  const m = /^(\s*)([-*+])\s+/.exec(line);
  if (m) return { marker: m[2] ?? '-', ordered: false };
  const om = /^(\s*)(\d+)([.)])\s+/.exec(line);
  if (om) return { marker: om[2] ?? '1', ordered: true, index: Number(om[2]) };
  return { marker: '-', ordered: false };
}

interface RenderContext {
  options: MarkdownOptions;
}

function renderList(
  lines: string[],
  start: number,
  baseIndent: number,
  ctx: RenderContext
): { html: string; next: number } {
  const first = lines[start] ?? '';
  const info = listMarkerInfo(first);
  const tag = info.ordered ? 'ol' : 'ul';
  const items: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      // blank line inside list: keep going if next non-blank line continues list
      let j = i + 1;
      while (j < lines.length && !(lines[j] ?? '').trim()) j++;
      const next = lines[j] ?? '';
      if (j < lines.length && indentOf(next) >= baseIndent + 2 && isListItem(next)) {
        items.push('');
        i = j;
        continue;
      }
      break;
    }
    const indent = indentOf(line);
    if (indent < baseIndent - 1) break;
    if (indent >= baseIndent && indent < baseIndent + 2 && isListItem(line)) {
      const markerInfo = listMarkerInfo(line);
      if (markerInfo.ordered !== info.ordered) break;
      const task = isTaskItem(line);
      const contentLines = [stripListMarker(line)];
      i++;
      // Continuation lines: indented non-list lines join the item.
      // A list item at the same indent starts a new item; deeper-indented
      // lines are handled when renderList recurses for nested lists.
      while (i < lines.length) {
        const cont = lines[i] ?? '';
        if (!cont.trim()) break;
        const ci = indentOf(cont);
        if (ci >= baseIndent + 2 && !isListItem(cont)) {
          contentLines.push(cont.slice(Math.min(ci, baseIndent + 2)));
          i++;
          continue;
        }
        break;
      }
      const inner = renderBlocks(contentLines, 0, { ...ctx, inList: true }).html;
      let itemHtml: string;
      if (task) {
        itemHtml = `<li class="task-item"><input type="checkbox" disabled${task.checked ? ' checked' : ''} /> ${inner}</li>`;
      } else {
        itemHtml = `<li>${inner}</li>`;
      }
      items.push(itemHtml);
      continue;
    }
    // nested list handled by recursion through renderBlocks; deeper indentation
    if (indent >= baseIndent + 2) {
      // continue current item content with nested block
      const prev = items.length - 1;
      const nested = renderList(lines, i, indent, ctx);
      if (prev >= 0) {
        items[prev] = (items[prev] ?? '').replace(/<\/li>$/, `${nested.html}</li>`);
      } else {
        items.push(nested.html);
      }
      i = nested.next;
      continue;
    }
    break;
  }
  const startAttr = info.ordered && info.index && info.index !== 1 ? ` start="${info.index}"` : '';
  return { html: `<${tag}${startAttr}>${items.join('')}</${tag}>`, next: i };
}

interface ExtendedContext extends RenderContext {
  inList?: boolean;
}

/** Core block renderer. `start` is the line index to begin at. */
export function renderBlocks(
  lines: string[],
  start: number,
  ctx: ExtendedContext
): { html: string; next: number; headings: HeadingInfo[] } {
  const { options } = ctx;
  const htmlParts: string[] = [];
  const headings: HeadingInfo[] = [];
  const usedIds = new Set<string>();
  let i = start;

  const push = (html: string) => {
    if (html) htmlParts.push(html);
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    const fenceMatch = /^(\s{0,3})(`{3,}|~{3,})\s*([\w+#-]*)\s*$/.exec(line);
    if (fenceMatch) {
      const fence = fenceMatch[2] ?? '```';
      const lang = fenceMatch[3] ?? '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trimStart().startsWith(fence)) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing fence (or EOF)
      const code = escapeHtml(codeLines.join('\n'));
      push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${code}</code></pre>`
      );
      continue;
    }

    // ATX heading
    const headingMatch = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (headingMatch) {
      const level = (headingMatch[1] ?? '#').length;
      const rawText = headingMatch[2] ?? '';
      const inner = renderInlineSpans(rawText, options);
      let attrs = '';
      if (options.headingIds) {
        const plain = rawText.replace(/[#*`_~[\]()!]/g, '').trim() || rawText.trim();
        const id = uniqueSlug(plain, usedIds);
        attrs = ` id="${id}"`;
        headings.push({ level, text: rawText.replace(/<[^>]*>/g, ''), id });
      }
      push(`<h${level}${attrs}>${inner}</h${level}>`);
      i++;
      continue;
    }

    // Setext heading
    if (i + 1 < lines.length && /^\s*(=+|-+)\s*$/.test(lines[i + 1] ?? '') && line.trim()) {
      const level = /^\s*=+\s*$/.test(lines[i + 1] ?? '') ? 1 : 2;
      const rawText = line.trim();
      const inner = renderInlineSpans(rawText, options);
      let attrs = '';
      if (options.headingIds) {
        const id = uniqueSlug(rawText, usedIds);
        attrs = ` id="${id}"`;
        headings.push({ level, text: rawText, id });
      }
      push(`<h${level}${attrs}>${inner}</h${level}>`);
      i += 2;
      continue;
    }

    // Thematic break
    if (/^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/.test(line)) {
      push('<hr />');
      i++;
      continue;
    }

    // Table (GFM)
    if (options.gfm && line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? '')) {
      const headerCells = splitTableRow(line);
      const sep = splitTableRow(lines[i + 1] ?? '');
      const alignments = sep.map((c) => {
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        if (left && right) return ' style="text-align:center;"';
        if (right) return ' style="text-align:right;"';
        if (left) return ' style="text-align:left;"';
        return '';
      });
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && (lines[i] ?? '').trim() && (lines[i] ?? '').includes('|')) {
        rows.push(splitTableRow(lines[i] ?? ''));
        i++;
      }
      const thead = `<thead><tr>${headerCells
        .map((c, idx) => `<th${alignments[idx] ?? ''}>${renderInlineSpans(c, options)}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row
              .map((c, idx) => `<td${alignments[idx] ?? ''}>${renderInlineSpans(c, options)}</td>`)
              .join('')}</tr>`
        )
        .join('')}</tbody>`;
      push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Lists
    if (isListItem(line)) {
      const base = indentOf(line);
      if (base <= 3 || ctx.inList) {
        const list = renderList(lines, i, base, ctx);
        push(list.html);
        i = list.next;
        continue;
      }
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && (/^\s*>/.test(lines[i] ?? '') || ((lines[i] ?? '').trim() && quoteLines.length > 0 && !/^\s*$/.test(lines[i] ?? '') && !isListItem(lines[i] ?? '') && !/^#{1,6}\s/.test(lines[i] ?? '') && !/^(```|~~~)/.test(lines[i] ?? '')))) {
        quoteLines.push((lines[i] ?? '').replace(/^\s*>\s?/, ''));
        i++;
      }
      const inner = renderBlocks(quoteLines, 0, ctx);
      push(`<blockquote>${inner.html}</blockquote>`);
      for (const h of inner.headings) headings.push(h);
      continue;
    }

    // Paragraph: collect lines until blank or other block starter
    const paraLines: string[] = [];
    while (i < lines.length) {
      const p = lines[i] ?? '';
      if (!p.trim()) break;
      if (
        paraLines.length > 0 &&
        (/^#{1,6}\s/.test(p) ||
          /^(```|~~~)/.test(p) ||
          /^\s*>/.test(p) ||
          isListItem(p) ||
          (options.gfm && p.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? '')))
      ) {
        break;
      }
      if (paraLines.length === 0 && /^#{1,6}\s/.test(p)) break;
      paraLines.push(p);
      i++;
    }
    if (paraLines.length > 0) {
      let para: string;
      if (options.hardLineBreaks) {
        para = paraLines.map((l) => renderInlineSpans(l, options)).join('<br />\n');
      } else {
        // soft breaks: newline kept; trailing two spaces => <br />
        para = paraLines
          .map((l, idx) => {
            const rendered = renderInlineSpans(l, options);
            if (idx < paraLines.length - 1 && /\s{2,}$/.test(l)) {
              return `${rendered}<br />`;
            }
            return rendered;
          })
          .join('\n');
      }
      push(`<p>${para}</p>`);
      continue;
    }
    i++;
  }

  return { html: htmlParts.join('\n'), next: i, headings: headings };
}

/* ------------------------------ Document API ------------------------------ */

export interface RenderResult {
  html: string;
  toc: TocEntry[];
}

/** Convert markdown text to HTML with current options. Sanitizes by default when enabled. */
export function markdownToHtml(markdown: string, options: MarkdownOptions = { ...DEFAULT_OPTIONS }): RenderResult {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = renderBlocks(lines, 0, { options });
  let html = blocks.html;
  const toc = options.headingIds ? extractHeadings(html) : [];
  if (options.sanitize) {
    html = sanitizeHtml(html);
  }
  return { html, toc };
}

/** Render markdown and inject a TOC list at the top when headings exist. */
export function markdownToHtmlWithToc(
  markdown: string,
  options: MarkdownOptions = { ...DEFAULT_OPTIONS }
): RenderResult {
  const result = markdownToHtml(markdown, options);
  if (result.toc.length === 0) return result;
  const items = result.toc
    .map((e) => `<li class="toc-level-${e.level}"><a href="#${e.id}">${escapeHtml(e.text)}</a></li>`)
    .join('');
  const tocHtml = `<nav class="markdown-toc"><h2 id="table-of-contents">Table of Contents</h2><ul>${items}</ul></nav>`;
  return { html: `${tocHtml}\n${result.html}`, toc: result.toc };
}

export function computeStats(markdown: string, html: string): DocStats {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const characters = markdown.length;
  const headings = (html.match(/<h[1-6]\b/g) ?? []).length;
  const links = (html.match(/<a\s/g) ?? []).length;
  const images = (html.match(/<img\s/g) ?? []).length;
  // fenced blocks counted via <pre><code>; inline code counted separately
  const fenced = (html.match(/<pre><code/g) ?? []).length;
  const allCode = (html.match(/<code/g) ?? []).length;
  return {
    words,
    characters,
    headings,
    links,
    images,
    codeBlocks: Math.max(0, Math.max(fenced, allCode)),
  };
}

/* ------------------------------ Standalone doc ----------------------------- */

export function buildStyledDocument(html: string, title = 'Document'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 46rem; margin: 0 auto; padding: 2rem 1rem; line-height: 1.7; color: #1a202c; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin-top: 1.6em; }
code { background: #f1f3f5; border-radius: 4px; padding: 0.15em 0.35em; font-size: 0.9em; }
pre { background: #f6f8fa; border-radius: 6px; padding: 1em; overflow-x: auto; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #dee2e6; padding: 0.5em 0.75em; text-align: left; }
thead { background: #f8f9fa; }
blockquote { border-left: 4px solid #dee2e6; margin: 0; padding: 0.25em 1em; color: #495057; }
img { max-width: 100%; }
a { color: #0d6efd; }
.markdown-toc { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 0.75rem 1.25rem; }
@media (prefers-color-scheme: dark) { body { background: #1a202c; color: #e2e8f0; } code { background: #2d3748; } pre { background: #2d3748; } th, td { border-color: #4a5568; } thead, .markdown-toc { background: #2d3748; } blockquote { color: #a0aec0; border-color: #4a5568; } }
</style>
</head>
<body>
${html}
</body>
</html>`;
}

/* --------------------------------- Tool ----------------------------------- */

function normalizeOptions(options: unknown): MarkdownOptions {
  const o = (typeof options === 'object' && options !== null ? options : {}) as Partial<MarkdownOptions>;
  return {
    gfm: typeof o.gfm === 'boolean' ? o.gfm : DEFAULT_OPTIONS.gfm,
    hardLineBreaks:
      typeof o.hardLineBreaks === 'boolean' ? o.hardLineBreaks : DEFAULT_OPTIONS.hardLineBreaks,
    headingIds: typeof o.headingIds === 'boolean' ? o.headingIds : DEFAULT_OPTIONS.headingIds,
    sanitize: typeof o.sanitize === 'boolean' ? o.sanitize : DEFAULT_OPTIONS.sanitize,
  };
}

export const markdownTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: '1.0.0',
  config: toolConfig,
  initialState: { ...DEFAULT_STATE, options: { ...DEFAULT_STATE.options } },
  serialize: (state) => JSON.stringify(state),
  deserialize: (data): DeserializeResult<ToolState> => {
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'Invalid data format: expected markdown converter state object' };
    }
    const v = data as Partial<ToolState>;
    if (typeof v.markdown !== 'string') {
      return {
        success: false,
        error: 'Invalid data format: expected { markdown: string, options?: {...} }',
      };
    }
    return {
      success: true,
      data: { markdown: v.markdown, options: normalizeOptions(v.options) },
    };
  },
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
