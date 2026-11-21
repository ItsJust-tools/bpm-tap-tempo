'use client';

import React from 'react';
import { formatLapsTable } from '../tool-definition';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear }) => {
  const [copied, setCopied] = React.useState(false);

  const handleToggle = React.useCallback(() => {
    if (state.running) {
      const elapsed = state.startedAt === null ? state.elapsedMs : state.elapsedMs + (Date.now() - state.startedAt);
      onChange({ ...state, running: false, startedAt: null, elapsedMs: Math.max(0, elapsed) });
    } else {
      onChange({ ...state, running: true, startedAt: Date.now() });
    }
  }, [state, onChange]);

  const handleLap = React.useCallback(() => {
    const total = Math.max(
      0,
      Math.round(state.startedAt === null ? state.elapsedMs : state.elapsedMs + (Date.now() - state.startedAt))
    );
    const previous = state.laps[state.laps.length - 1];
    const previousTotal = previous ? previous.totalMs : 0;
    const lap = {
      index: state.laps.length + 1,
      totalMs: total,
      splitMs: Math.max(0, total - previousTotal),
    };
    onChange({ ...state, laps: [...state.laps, lap] });
  }, [state, onChange]);

  const handleCopyLaps = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatLapsTable(state.laps).join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [state.laps]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Timer controls">
        <button
          type="button"
          onClick={handleToggle}
          data-testid="btn-toggle"
          aria-pressed={state.running}
          className={`rounded-md px-4 py-1.5 text-xs font-medium ${
            state.running
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {state.running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={handleLap}
          data-testid="btn-lap"
          className="rounded-md bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-200 dark:hover:bg-sky-800"
        >
          Lap
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-reset"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleCopyLaps}
          data-testid="btn-copy-laps"
          disabled={state.laps.length === 0}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {copied ? 'Copied!' : 'Copy laps'}
        </button>
      </div>
    </div>
  );
};
