export interface Lap {
  /** Monotonic lap index, starting at 1 for the first recorded lap. */
  index: number;
  /** Total elapsed time in milliseconds when this lap was recorded. */
  totalMs: number;
  /** Time spent on this lap alone (delta from previous lap). */
  splitMs: number;
}

export type TimerMode = 'stopwatch' | 'countdown';

export interface ToolState {
  /** Timer mode: free-running stopwatch or countdown to a target duration. */
  mode: TimerMode;
  /** Elapsed time in milliseconds accumulated before/while running. */
  elapsedMs: number;
  /** True while the timer is running (elapsedMs advancing). */
  running: boolean;
  /** Wall-clock timestamp (Date.now) of the last run segment start, or null when paused. */
  startedAt: number | null;
  /** Recorded laps, oldest first. */
  laps: Lap[];
  /** Configured countdown target duration in milliseconds (countdown mode). */
  targetMs: number;
}

export const FASTEST_HIGHLIGHT = 'fastest';
export const SLOWEST_HIGHLIGHT = 'slowest';

export const DEFAULT_STATE: ToolState = {
  mode: 'stopwatch',
  elapsedMs: 0,
  running: false,
  startedAt: null,
  laps: [],
  targetMs: 5 * 60 * 1000,
};

export const MIN_TARGET_MS = 1000;
export const MAX_TARGET_MS = 24 * 60 * 60 * 1000;

/** Highlight kind for a lap row, or null when the lap is neither fastest nor slowest. */
export type LapHighlight = 'fastest' | 'slowest' | null;

/** Format milliseconds as hh:mm:ss.cc (hours omitted when zero). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const total = Math.floor(ms);
  const centis = Math.floor((total % 1000) / 10);
  const seconds = Math.floor(total / 1000) % 60;
  const minutes = Math.floor(total / 60000) % 60;
  const hours = Math.floor(total / 3600000);
  const two = (n: number) => String(n).padStart(2, '0');
  const core = `${two(minutes)}:${two(seconds)}.${two(centis)}`;
  return hours > 0 ? `${two(hours)}:${core}` : core;
}

/** Current displayed elapsed time in ms, accounting for a running segment. */
export function currentElapsedMs(state: ToolState): number {
  if (state.startedAt === null) return state.elapsedMs;
  return state.elapsedMs + Math.max(0, Date.now() - state.startedAt);
}

/** Remaining time in countdown mode, clamped at 0. */
export function remainingMs(state: ToolState): number {
  if (state.mode !== 'countdown') return 0;
  return Math.max(0, state.targetMs - currentElapsedMs(state));
}

/** Highlight flags for the laps list: fastest/slowest by split, only when 2+ laps. */
export function lapHighlights(laps: Lap[]): LapHighlight[] {
  return laps.map((lap, i) => {
    if (laps.length < 2) return null;
    const splits = laps.map((l) => l.splitMs);
    const min = Math.min(...splits);
    const max = Math.max(...splits);
    if (lap.splitMs === min && lap.splitMs === max) {
      return null;
    }
    if (lap.splitMs === min) return FASTEST_HIGHLIGHT as LapHighlight;
    if (lap.splitMs === max) {
      // Only the first occurrence of the max is marked slowest.
      const firstMax = laps.findIndex((l) => l.splitMs === max);
      return i === firstMax ? (SLOWEST_HIGHLIGHT as LapHighlight) : null;
    }
    return null;
  });
}
