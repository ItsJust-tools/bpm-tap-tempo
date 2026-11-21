'use client';

import React from 'react';
import {
  currentElapsedMs,
  formatDuration,
  isCountdownComplete,
  lapHighlights,
  remainingMs,
} from '../tool-definition';
import {
  FASTEST_HIGHLIGHT,
  SLOWEST_HIGHLIGHT,
  type Lap,
  type LapHighlight,
  type ToolState,
} from '../types';

const HIGHLIGHT_CLASS: Record<string, string> = {
  [FASTEST_HIGHLIGHT]: 'lap-fastest',
  [SLOWEST_HIGHLIGHT]: 'lap-slowest',
};

interface CanvasProps {
  state: ToolState;
  onChange: (state: ToolState) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ state }) => {
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0);
  const running = state.running;

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(forceTick, 33);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsed = currentElapsedMs(state);
  const remaining = remainingMs(state);
  const complete = isCountdownComplete(state);
  const display = state.mode === 'countdown' && state.targetMs > 0 ? remaining : elapsed;
  const highlights = lapHighlights(state.laps);

  const displayClass = running
    ? 'timer-display timer-running'
    : state.mode === 'countdown' && complete
      ? 'timer-display timer-complete'
      : 'timer-display timer-paused';

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" data-testid="stopwatch-canvas">
      <div className="flex flex-col items-center gap-1">
        <div
          className={displayClass}
          data-testid="timer-display"
          data-running={running ? 'true' : 'false'}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatDuration(display)}
        </div>
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400" role="status">
          {state.mode === 'countdown'
            ? complete
              ? 'Countdown complete'
              : `Countdown · target ${formatDuration(state.targetMs)}`
            : state.running
              ? 'Running'
              : 'Paused'}
        </p>
      </div>

      <LapsTable laps={state.laps} highlights={highlights} />
    </div>
  );
};

interface LapsTableProps {
  laps: Lap[];
  highlights: LapHighlight[];
}

export const LapsTable: React.FC<LapsTableProps> = ({ laps, highlights }) => {
  if (laps.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400" data-testid="laps-empty">
        No laps recorded yet — press <kbd>L</kbd> to capture one.
      </p>
    );
  }
  return (
    <table className="laps-table w-full text-sm" data-testid="laps-table">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <th scope="col">Lap</th>
          <th scope="col">Split</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {laps
          .slice()
          .reverse()
          .map((lap) => {
            const highlight = highlights[lap.index - 1] ?? null;
            return (
              <tr
                key={lap.index}
                data-testid={`lap-row-${lap.index}`}
                className={highlight ? HIGHLIGHT_CLASS[highlight] : undefined}
                aria-label={highlight ? `${highlight} lap` : undefined}
              >
                <td>Lap {lap.index}</td>
                <td className="font-mono">{formatDuration(lap.splitMs)}</td>
                <td className="font-mono">{formatDuration(lap.totalMs)}</td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};
