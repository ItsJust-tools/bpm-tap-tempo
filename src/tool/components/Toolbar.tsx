'use client';

import React from 'react';
import { markdownToHtmlWithToc, buildStyledDocument } from '../tool-definition';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
  onClear?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear }) => {
  const [copied, setCopied] = React.useState<'html' | 'doc' | null>(null);

  const result = React.useMemo(
    () => markdownToHtmlWithToc(state.markdown, state.options),
    [state.markdown, state.options]
  );

  const copy = async (kind: 'html' | 'doc') => {
    try {
      const value =
        kind === 'html' ? result.html : buildStyledDocument(result.html, 'Document');
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  const insertSnippet = (snippet: string) => {
    onChange({ ...state, markdown: state.markdown.length ? `${state.markdown}\n${snippet}` : snippet });
  };

  return (
    <div className="converter-toolbar flex flex-wrap items-center gap-2">
      <button type="button" className="toolbar-btn" aria-label="Copy HTML" onClick={() => copy('html')}>
        {copied === 'html' ? 'Copied!' : 'Copy HTML'}
      </button>
      <button
        type="button"
        className="toolbar-btn"
        aria-label="Copy styled document"
        onClick={() => copy('doc')}
      >
        {copied === 'doc' ? 'Copied!' : 'Copy styled document'}
      </button>
      <button
        type="button"
        className="toolbar-btn"
        aria-label="Insert table"
        onClick={() => insertSnippet('| Column A | Column B |\n| -------- | -------- |\n| value    | value    |')}
      >
        + Table
      </button>
      <button
        type="button"
        className="toolbar-btn"
        aria-label="Insert code block"
        onClick={() => insertSnippet('```js\nconsole.log("hello");\n```')}
      >
        + Code
      </button>
      {onClear ? (
        <button type="button" className="toolbar-btn" aria-label="Clear markdown" onClick={onClear}>
          Clear
        </button>
      ) : null}
    </div>
  );
};
