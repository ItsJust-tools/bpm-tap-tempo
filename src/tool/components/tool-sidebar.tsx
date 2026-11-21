'use client';

import { markdownToHtmlWithToc, computeStats } from '../tool-definition';
import type { ToolState } from '../types';

interface ToolSidebarProps {
  state?: ToolState;
  fontSize?: number;
  onFontSizeChange?: (delta: number) => void;
}

export function ToolSidebar({ state, fontSize, onFontSizeChange }: ToolSidebarProps) {
  const markdown = state?.markdown ?? '';
  const result = markdownToHtmlWithToc(markdown, state?.options ?? { gfm: true, hardLineBreaks: false, headingIds: true, sanitize: true });
  const stats = computeStats(markdown, result.html);

  return (
    <div className="converter-sidebar">
      <div className="sidebar-section">
        <h3>Document Stats</h3>
        <dl className="stats-list" data-testid="tool-sidebar-stats">
          <div className="stat-row">
            <dt>Words</dt>
            <dd>{stats.words.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Characters</dt>
            <dd>{stats.characters.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Headings</dt>
            <dd>{stats.headings.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Links</dt>
            <dd>{stats.links.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Images</dt>
            <dd>{stats.images.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Code blocks</dt>
            <dd>{stats.codeBlocks.toLocaleString()}</dd>
          </div>
          <div className="stat-row">
            <dt>Font size</dt>
            <dd>
              <button
                type="button"
                aria-label="Decrease font size"
                onClick={() => onFontSizeChange?.(-2)}
                className="mr-2 rounded border border-gray-300 px-2 text-xs dark:border-gray-700"
              >
                A-
              </button>
              <span className="font-mono text-xs">{fontSize ?? 16}px</span>
              <button
                type="button"
                aria-label="Increase font size"
                onClick={() => onFontSizeChange?.(2)}
                className="ml-2 rounded border border-gray-300 px-2 text-xs dark:border-gray-700"
              >
                A+
              </button>
            </dd>
          </div>
        </dl>
      </div>
      <div className="sidebar-section">
        <h3>Table of Contents</h3>
        {result.toc.length === 0 ? (
          <p className="text-xs leading-relaxed">No headings yet. Add `# Heading` in the editor.</p>
        ) : (
          <ul className="toc-list text-xs space-y-1" data-testid="tool-sidebar-toc">
            {result.toc.map((entry) => (
              <li key={entry.id} style={{ paddingLeft: `${(entry.level - 1) * 10}px` }}>
                <a href={`#${entry.id}`} className="toc-link">
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
