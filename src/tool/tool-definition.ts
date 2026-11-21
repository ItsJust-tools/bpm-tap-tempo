import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_TARGET_MS,
  MIN_TARGET_MS,
  currentElapsedMs,
  formatDuration,
  lapHighlights,
  remainingMs,
  type Lap,
  type TimerMode,
  type ToolState,
} from './types';

export {
  currentElapsedMs,
  formatDuration,
  lapHighlights,
  remainingMs,
  FASTEST_HIGHLIGHT,
  SLOWEST_HIGHLIGHT,
  DEFAULT_STATE,
  MIN_TARGET_MS,
  MAX_TARGET_MS,
} from './types';

/**
 * Start the timer. No-op when already running. Marks the run segment with a
 * wall-clock timestamp so elapsed time stays accurate across reloads.
 */
export function startTimer(state: ToolState): ToolState {
  if (state.running) return state;
  return { ...state, running: true, startedAt: Date.now() };
}

/** Pause the timer, folding any running time into elapsedMs. No-op when paused. */
export function pauseTimer(state: ToolState): ToolState {
  if (!state.running) return state;
  const elapsed = state.startedAt === null ? state.elapsedMs : state.elapsedMs + (Date.now() - state.startedAt);
  return { ...state, running: false, startedAt: null, elapsedMs: Math.max(0, elapsed) };
}

/** Space bar behavior: start when paused, pause when running. */
export function toggleTimer(state: ToolState): ToolState {
  return state.running ? pauseTimer(state) : startTimer(state);
}

/** Reset clears elapsed time, run segments and all laps. */
export function resetTimer(state: ToolState): ToolState {
  return { ...state, elapsedMs: 0, running: false, startedAt: null, laps: [] };
}

/**
 * Record a lap from the current displayed elapsed time. Safe on a fresh
 * (never started) timer: records a single zero-total lap without crashing.
 */
export function recordLap(state: ToolState): ToolState {
  const total = Math.max(0, Math.round(currentElapsedMs(state)));
  const previous = state.laps[state.laps.length - 1];
  const previousTotal = previous ? previous.totalMs : 0;
  const split = Math.max(0, total - previousTotal);
  const lap: Lap = { index: state.laps.length + 1, totalMs: total, splitMs: split };
  const next: ToolState = { ...state, laps: [...state.laps, lap] };
  // In countdown mode a completed lap leaves the timer free to continue.
  return next;
}

/** Change mode; pausing and keeping elapsed time when switching. */
export function setMode(state: ToolState, mode: TimerMode): ToolState {
  const paused = state.running ? pauseTimer(state) : state;
  return { ...paused, mode };
}

/** Set the countdown target duration, clamped to supported bounds. */
export function setTargetMs(state: ToolState, targetMs: number): ToolState {
  const clamped = Math.min(MAX_TARGET_MS, Math.max(MIN_TARGET_MS, Math.round(targetMs)));
  return { ...state, targetMs: clamped };
}

/** True when a countdown has reached its configured target. */
export function isCountdownComplete(state: ToolState): boolean {
  if (state.mode !== 'countdown') return false;
  return currentElapsedMs(state) >= state.targetMs;
}

/** Formatted laps table lines suitable for clipboard / text export. */
export function formatLapsTable(laps: Lap[], format: (ms: number) => string = formatDuration): string[] {
  if (laps.length === 0) return [];
  return laps.map((lap) => `Lap ${lap.index}\tTotal ${format(lap.totalMs)}\tSplit ${format(lap.splitMs)}`);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    mode: state.mode,
    elapsedMs: Math.max(0, Math.round(state.elapsedMs)),
    running: Boolean(state.running),
    startedAt: state.startedAt === null ? null : Math.round(state.startedAt),
    laps: (state.laps ?? []).map((lap) => ({
      index: lap.index,
      totalMs: lap.totalMs,
      splitMs: lap.splitMs,
    })),
    targetMs: state.targetMs,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { success: false, error: 'Invalid data format: expected stopwatch state object' };
  }
  const v = data as Partial<ToolState> & { laps?: unknown };
  if (
    typeof v.elapsedMs !== 'number' ||
    !Number.isFinite(v.elapsedMs) ||
    v.elapsedMs < 0
  ) {
    return { success: false, error: 'Invalid data format: expected { elapsedMs: number >= 0, ... }' };
  }
  const lapsResult = deserializeLaps(v.laps);
  if (!lapsResult.success) {
    return { success: false, error: lapsResult.error };
  }
  const elapsedMs = Math.round(v.elapsedMs);
  const running = typeof v.running === 'boolean' ? v.running : false;
  let startedAt: number | null =
    typeof v.startedAt === 'number' && Number.isFinite(v.startedAt) && v.startedAt > 0
      ? Math.round(v.startedAt)
      : null;
  if (!running) startedAt = null;
  // The running segment is preserved as-is: elapsedMs holds pre-segment time
  // and startedAt keeps the live anchor, so the displayed clock is exact.
  let targetMs = DEFAULT_STATE.targetMs;
  if (typeof v.targetMs === 'number' && Number.isFinite(v.targetMs) && v.targetMs > 0) {
    targetMs = Math.min(MAX_TARGET_MS, Math.max(MIN_TARGET_MS, Math.round(v.targetMs)));
  }
  return {
    success: true,
    data: {
      mode: v.mode === 'countdown' ? 'countdown' : 'stopwatch',
      elapsedMs,
      running,
      startedAt,
      laps: lapsResult.data,
      targetMs,
    },
  };
}

function deserializeLaps(laps: unknown): DeserializeResult<Lap[]> {
  if (laps === undefined) return { success: true, data: [] };
  if (!Array.isArray(laps)) {
    return { success: false, error: 'Invalid data format: laps must be an array' };
  }
  const parsed: Lap[] = [];
  for (const entry of laps) {
    if (typeof entry !== 'object' || entry === null) {
      return { success: false, error: 'Invalid data format: lap entries must be objects' };
    }
    const l = entry as Partial<Lap>;
    if (
      typeof l.totalMs !== 'number' ||
      !Number.isFinite(l.totalMs) ||
      l.totalMs < 0 ||
      typeof l.splitMs !== 'number' ||
      !Number.isFinite(l.splitMs) ||
      l.splitMs < 0
    ) {
      return { success: false, error: 'Invalid data format: lap times must be non-negative numbers' };
    }
    parsed.push({
      index: typeof l.index === 'number' && Number.isInteger(l.index) && l.index > 0 ? l.index : parsed.length + 1,
      totalMs: Math.round(l.totalMs),
      splitMs: Math.round(l.splitMs),
    });
  }
  return { success: true, data: parsed };
}

export const stopwatchTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
