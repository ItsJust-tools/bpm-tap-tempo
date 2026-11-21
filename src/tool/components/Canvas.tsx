'use client';

import React from 'react';
import { markdownToHtml, markdownToHtmlWithToc, buildStyledDocument, computeStats } from '../tool-definition';
import type { ToolState, DocStats } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="copy-btn text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={label}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function DownloadButton({ content, filename }: { content: string; filename: string }) {
  const handleDownload = React.useCallback(() => {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [content, filename]);
  return (
    <button
      type="button"
      onClick={handleDownload}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Download HTML file"
    >
      Download .html
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const { markdown, options } = state;
  const result = React.useMemo(
    () => markdownToHtmlWithToc(markdown, options),
    [markdown, options]
  );
  const stats: DocStats = React.useMemo(
    () => computeStats(markdown, result.html),
    [markdown, result.html]
  );

  const update = (patch: Partial<ToolState>) => onChange({ ...state, ...patch });
  const updateOption = (key: keyof ToolState['options']) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ options: { ...options, [key]: e.target.checked } });

  return (
    <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto" data-testid="markdown-canvas">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['gfm', 'GFM'],
            ['hardLineBreaks', 'Hard breaks'],
            ['headingIds', 'Heading IDs'],
            ['sanitize', 'Sanitize'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={updateOption(key)}
              aria-label={label}
              data-testid={`option-${key}`}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Markdown
            </span>
            <span className="text-xs text-gray-500">{stats.words} words</span>
          </div>
          <textarea
            aria-label="Markdown input"
            data-testid="markdown-input"
            className="markdown-textarea flex-1 min-h-[300px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 font-mono text-sm text-gray-900 dark:text-gray-100 resize-y"
            value={markdown}
            onChange={(e) => update({ markdown: e.target.value })}
            placeholder="# Write markdown here"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
              HTML Preview
            </span>
            <div className="flex items-center gap-1">
              <CopyButton value={result.html} label="Copy HTML" />
              <DownloadButton
                content={buildStyledDocument(result.html, 'Document')}
                filename="document.html"
              />
            </div>
          </div>
          <div
            aria-label="HTML preview"
            data-testid="html-preview"
            className="flex-1 min-h-[300px] overflow-auto rounded-md border border-gray-200 dark:border-gray-800 p-3 prose-preview"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        </div>
      </div>

      <div className="stats-strip flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300" data-testid="canvas-stats">
        <span>Words: {stats.words}</span>
        <span>Characters: {stats.characters}</span>
        <span>Headings: {stats.headings}</span>
        <span>Links: {stats.links}</span>
        <span>Images: {stats.images}</span>
        <span>Code blocks: {stats.codeBlocks}</span>
      </div>
    </div>
  );
};
