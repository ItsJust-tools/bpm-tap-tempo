'use client';

import React from 'react';
import { setMode, setTargetMs } from '../tool-definition';
import { MAX_TARGET_MS, MIN_TARGET_MS, formatDuration, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const update = React.useCallback(
    (next: ToolState) => onChange(next),
    [onChange]
  );

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="stopwatch-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Mode</h3>
        <div className="flex gap-2">
          {(['stopwatch', 'countdown'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update(setMode(state, mode))}
              aria-pressed={state.mode === mode}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                state.mode === mode
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {state.mode === 'countdown' ? (
        <div>
          <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Countdown target</h3>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Minutes
            <input
              type="number"
              min={MIN_TARGET_MS / 60000}
              max={MAX_TARGET_MS / 60000}
              step={1}
              value={state.targetMs / 60000}
              onChange={(e) => {
                const minutes = Number(e.target.value);
                if (Number.isFinite(minutes)) update(setTargetMs(state, minutes * 60000));
              }}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Target: {formatDuration(state.targetMs)} ({MIN_TARGET_MS / 1000}s – 24h)
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li><kbd>Space</kbd> — Start / Pause</li>
          <li><kbd>L</kbd> — Record lap</li>
          <li><kbd>R</kbd> — Reset</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Laps</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {state.laps.length} lap{state.laps.length === 1 ? '' : 's'} recorded. Fastest and slowest laps are
          highlighted once two or more laps exist.
        </p>
      </div>
    </div>
  );
};
