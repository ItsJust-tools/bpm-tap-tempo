export interface ToolState {
  /** Wall-clock timestamps (Date.now, ms) of recent taps, oldest first. */
  taps: number[];
  /** Play an audio click on every tap (Web Audio API). */
  clickEnabled: boolean;
  /** Sliding window duration in ms; taps older than this are dropped. */
  windowMs: number;
}

export const DEFAULT_WINDOW_MS = 10_000;
export const MIN_WINDOW_MS = 2_000;
export const MAX_WINDOW_MS = 30_000;
/** Reset tap sequence after this much inactivity since the last tap. */
export const IDLE_TIMEOUT_MS = 2_000;
/** Minimum interval accepted between two taps (ms); faster taps are ignored. */
export const MIN_TAP_INTERVAL_MS = 50;
/** Reference tempo presets highlighted in the BPM grid. */
export const PRESET_BPM = [60, 90, 120, 150, 180];

export const DEFAULT_STATE: ToolState = {
  taps: [],
  clickEnabled: true,
  windowMs: DEFAULT_WINDOW_MS,
};

/** Number of taps required before a BPM estimate is shown. */
export function minTapsForBpm(): number {
  return 2;
}

/**
 * Drop taps that fall outside the sliding window and clear the sequence when
 * the idle timeout (since the last tap) has elapsed. Pure: pass `now` in tests.
 */
export function pruneTaps(state: ToolState, now: number): ToolState {
  const taps = state.taps;
  if (taps.length === 0) return state;
  const last = taps[taps.length - 1] ?? 0;
  if (now - last > IDLE_TIMEOUT_MS) {
    return { ...state, taps: [] };
  }
  const cutoff = now - state.windowMs;
  const kept = taps.filter((t) => t >= cutoff);
  if (kept.length === taps.length) return state;
  return { ...state, taps: kept };
}

/** Register a tap at `now`. Ignores taps faster than the debounce floor. */
export function registerTap(state: ToolState, now: number): ToolState {
  const pruned = pruneTaps(state, now);
  const last = pruned.taps.length > 0 ? (pruned.taps[pruned.taps.length - 1] ?? 0) : 0;
  if (pruned.taps.length > 0 && now - last < MIN_TAP_INTERVAL_MS) {
    return pruned;
  }
  return { ...pruned, taps: [...pruned.taps, now] };
}

/** Manual reset clears the whole tap sequence. */
export function resetTaps(state: ToolState): ToolState {
  return { ...state, taps: [] };
}

/** Toggle audio click feedback. */
export function setClickEnabled(state: ToolState, enabled: boolean): ToolState {
  return { ...state, clickEnabled: enabled };
}

/** Set the sliding window duration, clamped to supported bounds. */
export function setWindowMs(state: ToolState, windowMs: number): ToolState {
  const clamped = Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(windowMs)));
  return { ...state, windowMs: clamped };
}

export interface BpmStats {
  /** Average BPM across intervals between consecutive kept taps; null with fewer than 2 taps. */
  bpm: number | null;
  /** Average interval in milliseconds; null with fewer than 2 taps. */
  intervalMs: number | null;
  /** Fastest interval (min) among recent taps in ms; null with fewer than 2 taps. */
  minIntervalMs: number | null;
  /** Slowest interval (max) among recent taps in ms; null with fewer than 2 taps. */
  maxIntervalMs: number | null;
  /** BPM implied by the fastest interval (upper confidence bound); null with fewer than 2 taps. */
  bpmMax: number | null;
  /** BPM implied by the slowest interval (lower confidence bound); null with fewer than 2 taps. */
  bpmMin: number | null;
}

/** Compute BPM statistics from kept tap timestamps. */
export function computeBpmStats(taps: number[]): BpmStats {
  if (taps.length < 2) {
    return {
      bpm: null,
      intervalMs: null,
      minIntervalMs: null,
      maxIntervalMs: null,
      bpmMin: null,
      bpmMax: null,
    };
  }
  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i++) {
    const prev = taps[i - 1];
    const cur = taps[i];
    if (prev !== undefined && cur !== undefined) {
      intervals.push(Math.max(1, cur - prev));
    }
  }
  if (intervals.length === 0) {
    return {
      bpm: null,
      intervalMs: null,
      minIntervalMs: null,
      maxIntervalMs: null,
      bpmMin: null,
      bpmMax: null,
    };
  }
  const avg = intervals.reduce((sum, d) => sum + d, 0) / intervals.length;
  const minIntervalMs = Math.min(...intervals);
  const maxIntervalMs = Math.max(...intervals);
  const bpm = 60_000 / avg;
  return {
    bpm,
    intervalMs: avg,
    minIntervalMs,
    maxIntervalMs,
    bpmMin: 60_000 / maxIntervalMs,
    bpmMax: 60_000 / minIntervalMs,
  };
}

/** BPM from a sequence of tap timestamps (convenience for tests/serialization). */
export function computeBpm(taps: number[]): number | null {
  return computeBpmStats(taps).bpm;
}

/** Round BPM to one decimal for display. */
export function formatBpm(bpm: number | null): string {
  if (bpm === null || !Number.isFinite(bpm)) return '—';
  return (Math.round(bpm * 10) / 10).toFixed(1);
}

/** Nearest preset BPM value, or null when no BPM is available. */
export function nearestPreset(bpm: number | null): number | null {
  if (bpm === null || !Number.isFinite(bpm)) return null;
  let best: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const preset of PRESET_BPM) {
    const delta = Math.abs(preset - bpm);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = preset;
    }
  }
  return best;
}
