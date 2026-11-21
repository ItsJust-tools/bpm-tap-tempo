'use client';

import { computeStats, convertAll } from '../tool-definition';
import type { ToolState } from '../types';

interface ToolSidebarProps {
  state?: ToolState;
  text?: string;
  fontSize?: number;
  onFontSizeChange?: (delta: number) => void;
}

export function ToolSidebar({ state, text, fontSize, onFontSizeChange }: ToolSidebarProps) {
  const input = state?.input ?? text ?? '';
  const stats = computeStats(input);
  const rows = state ? convertAll(state) : [];

  return (
    <div className="converter-sidebar p-3 text-sm space-y-4" data-testid="tool-sidebar">
      <div className="sidebar-section">
        <h3>Input Stats</h3>
        <dl className="stats-list text-xs">
          <div className="stat-row flex justify-between">
            <dt>Words</dt>
            <dd>{stats.words.toLocaleString()}</dd>
          </div>
          <div className="stat-row flex justify-between">
            <dt>Characters</dt>
            <dd>{stats.chars.toLocaleString()}</dd>
          </div>
          <div className="stat-row flex justify-between">
            <dt>Lines</dt>
            <dd>{stats.lines.toLocaleString()}</dd>
          </div>
          <div className="stat-row flex justify-between">
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
      {state ? (
        <div className="sidebar-section">
          <h3>Conversions</h3>
          <ul className="text-xs space-y-1">
            {rows.map((row) => (
              <li key={row.format} className="truncate">
                <span className="text-gray-500 dark:text-gray-400">{row.label}:</span>{' '}
                <code>{row.value || '—'}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
