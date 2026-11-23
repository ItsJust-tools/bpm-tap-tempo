'use client';

import React from 'react';
import { computeBpmStats, formatBpm, setClickEnabled, setWindowMs } from '../tool-definition';
import { MAX_WINDOW_MS, MIN_WINDOW_MS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const stats = computeBpmStats(state.taps);

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="bpm-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Audio click</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.clickEnabled}
            onChange={(e) => onChange(setClickEnabled(state, e.target.checked))}
            data-testid="toggle-click"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">
            Play a click sound on every tap
          </span>
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Tap window</h3>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Seconds
          <input
            type="number"
            min={MIN_WINDOW_MS / 1000}
            max={MAX_WINDOW_MS / 1000}
            step={1}
            value={state.windowMs / 1000}
            onChange={(e) => {
              const seconds = Number(e.target.value);
              if (Number.isFinite(seconds)) onChange(setWindowMs(state, seconds * 1000));
            }}
            data-testid="input-window"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Average is computed over taps within the last {Math.round(state.windowMs / 1000)}s (2–30s
          supported).
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current estimate</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-bpm">
          {stats.bpm === null
            ? 'Not enough taps yet — tap at least twice.'
            : `${formatBpm(stats.bpm)} BPM from ${state.taps.length} taps.`}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>Space</kbd> / <kbd>T</kbd> — Tap
          </li>
          <li>
            <kbd>R</kbd> — Reset
          </li>
          <li>
            <kbd>C</kbd> — Copy BPM
          </li>
          <li>
            <kbd>K</kbd> — Toggle click
          </li>
        </ul>
      </div>
    </div>
  );
};
