'use client';

import React from 'react';
import { computeBpmStats, formatBpm, nearestPreset } from '../tool-definition';
import { PRESET_BPM, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ state }) => {
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0);

  // Keep pruning/idle-reset visible while a sequence ages out.
  React.useEffect(() => {
    if (state.taps.length === 0) return;
    const id = window.setInterval(forceTick, 250);
    return () => window.clearInterval(id);
  }, [state.taps.length]);

  // Visual pulse on the latest tap.
  const [pulse, setPulse] = React.useState(false);
  const tapsRef = React.useRef(state.taps.length);
  React.useEffect(() => {
    if (state.taps.length > tapsRef.current) {
      setPulse(true);
      const id = window.setTimeout(() => setPulse(false), 120);
      tapsRef.current = state.taps.length;
      return () => window.clearTimeout(id);
    }
    tapsRef.current = state.taps.length;
    return undefined;
  }, [state.taps.length]);

  const stats = computeBpmStats(state.taps);
  const preset = nearestPreset(stats.bpm);
  const interval = stats.intervalMs;

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="bpm-canvas">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          data-testid="btn-tap"
          onClick={() => {
            /* wired via keyboard/toolbar; click handled by parent ToolCanvas */
          }}
          className={`tap-pad ${pulse ? 'tap-pad-pulse' : ''}`}
          aria-label="Tap to register a beat"
          style={{ cursor: 'default' }}
        >
          <span className="block text-4xl font-bold tabular-nums" data-testid="bpm-display">
            {formatBpm(stats.bpm)}
          </span>
          <span className="block text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            BPM
          </span>
          <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
            Tap here or press Space to count beats
          </span>
        </button>
        <p
          className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
          role="status"
          data-testid="tap-count"
        >
          {state.taps.length} tap{state.taps.length === 1 ? '' : 's'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="bpm-stats">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Interval
          </dt>
          <dd className="mt-1 font-mono text-lg" data-testid="stat-interval">
            {interval === null ? '—' : `${Math.round(interval)} ms`}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            BPM min
          </dt>
          <dd className="mt-1 font-mono text-lg" data-testid="stat-bpm-min">
            {formatBpm(stats.bpmMin)}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            BPM max
          </dt>
          <dd className="mt-1 font-mono text-lg" data-testid="stat-bpm-max">
            {formatBpm(stats.bpmMax)}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <dt className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Span
          </dt>
          <dd className="mt-1 font-mono text-lg" data-testid="stat-span">
            {stats.minIntervalMs === null
              ? '—'
              : `${Math.round(stats.minIntervalMs)} – ${Math.round(stats.maxIntervalMs ?? 0)} ms`}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Preset tempo reference
        </h3>
        <div
          className="grid grid-cols-5 gap-2"
          data-testid="preset-grid"
          role="list"
          aria-label="Preset BPM reference grid"
        >
          {PRESET_BPM.map((value) => (
            <div
              key={value}
              role="listitem"
              aria-current={preset === value ? 'true' : undefined}
              className={`rounded-lg border p-3 text-center ${
                preset === value
                  ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              <span className="block text-lg font-mono">{value}</span>
              <span className="block text-[10px] uppercase tracking-wider">BPM</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Tap sequence resets automatically after 2 seconds of inactivity. Recent taps are averaged
        within the selected window.
      </p>
    </div>
  );
};
