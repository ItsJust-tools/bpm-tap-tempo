'use client';

import React from 'react';
import { computeBpmStats, formatBpm, registerTap, resetTaps } from '../tool-definition';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onTap?: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onTap, onCopy }) => {
  const stats = computeBpmStats(state.taps);

  const handleTap = React.useCallback(() => {
    if (onTap) {
      onTap();
      return;
    }
    onChange(registerTap(state, Date.now()));
  }, [onTap, onChange, state]);

  const handleCopy = React.useCallback(() => {
    if (onCopy) {
      onCopy();
      return;
    }
    if (stats.bpm === null) return;
    void navigator.clipboard.writeText(formatBpm(stats.bpm)).catch(() => {
      // clipboard unavailable; ignore
    });
  }, [onCopy, stats.bpm]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Tap tempo controls">
        <button
          type="button"
          onClick={handleTap}
          data-testid="btn-toolbar-tap"
          className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
        >
          Tap
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-reset"
          disabled={state.taps.length === 0}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleCopy}
          data-testid="btn-copy-bpm"
          disabled={stats.bpm === null}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Copy BPM
        </button>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="toolbar-tap-count">
        {state.taps.length} taps
      </span>
    </div>
  );
};
