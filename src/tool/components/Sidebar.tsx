'use client';

import React from 'react';
import { markdownToHtmlWithToc, computeStats } from '../tool-definition';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onStateChange: (updater: (prev: ToolState) => ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onStateChange }) => {
  const result = React.useMemo(
    () => markdownToHtmlWithToc(state.markdown, state.options),
    [state.markdown, state.options]
  );
  const stats = React.useMemo(() => computeStats(state.markdown, result.html), [state.markdown, result.html]);
  const { toc } = result;

  const updateOption = (key: keyof ToolState['options']) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onStateChange((prev) => ({ ...prev, options: { ...prev.options, [key]: e.target.checked } }));

  return (
    <div className="converter-sidebar space-y-4" data-testid="markdown-sidebar">
      <div className="sidebar-section">
        <h3>Document Stats</h3>
        <dl className="stats-list" data-testid="doc-stats">
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
        </dl>
      </div>

      <div className="sidebar-section">
        <h3>Options</h3>
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={state.options.gfm} onChange={updateOption('gfm')} aria-label="GFM" data-testid="sidebar-option-gfm" />
            GitHub-flavored Markdown
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={state.options.hardLineBreaks} onChange={updateOption('hardLineBreaks')} aria-label="Hard line breaks" data-testid="sidebar-option-hardLineBreaks" />
            Hard line breaks
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={state.options.headingIds} onChange={updateOption('headingIds')} aria-label="Heading IDs" data-testid="sidebar-option-headingIds" />
            Heading IDs & TOC
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={state.options.sanitize} onChange={updateOption('sanitize')} aria-label="Sanitize" data-testid="sidebar-option-sanitize" />
            Sanitize HTML output
          </label>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Table of Contents</h3>
        {toc.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No headings found.</p>
        ) : (
          <ul className="toc-list text-xs space-y-1" data-testid="toc-list">
            {toc.map((entry) => (
              <li key={entry.id} style={{ paddingLeft: `${(entry.level - 1) * 10}px` }}>
                <a href={`#${entry.id}`} className="toc-link text-blue-600 dark:text-blue-400 hover:underline">
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
