import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deserializeState,
  formatDuration,
  formatLapsTable,
  isCountdownComplete,
  lapHighlights,
  pauseTimer,
  recordLap,
  resetTimer,
  serializeState,
  setMode,
  setTargetMs,
  startTimer,
  toggleTimer,
  stopwatchTool,
  currentElapsedMs,
  remainingMs,
} from '../../src/tool/tool-definition';
import {
  DEFAULT_STATE,
  FASTEST_HIGHLIGHT,
  SLOWEST_HIGHLIGHT,
  type Lap,
  type ToolState,
} from '../../src/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('formatDuration', () => {
  it('formats minutes, seconds and centiseconds', () => {
    expect(formatDuration(0)).toBe('00:00.00');
    expect(formatDuration(1234)).toBe('00:01.23');
    expect(formatDuration(61_500)).toBe('01:01.50');
    expect(formatDuration(3_600_000 + 61_500)).toBe('01:01:01.50');
  });

  it('shows hours when needed and clamps invalid input', () => {
    expect(formatDuration(3_661_000)).toBe('01:01:01.00');
    expect(formatDuration(-5)).toBe('00:00.00');
    expect(formatDuration(Number.NaN)).toBe('00:00.00');
  });
});

describe('start / pause / toggle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start sets running and marks the segment start', () => {
    const next = startTimer(state());
    expect(next.running).toBe(true);
    expect(next.startedAt).toBe(1_000_000);
    expect(next.elapsedMs).toBe(0);
  });

  it('start is a no-op when already running', () => {
    const running = state({ running: true, startedAt: 500_000 });
    expect(startTimer(running)).toEqual(running);
  });

  it('pause folds running time into elapsedMs', () => {
    vi.setSystemTime(1_003_250);
    const paused = pauseTimer(state({ running: true, startedAt: 1_000_000, elapsedMs: 100 }));
    expect(paused.running).toBe(false);
    expect(paused.startedAt).toBeNull();
    expect(paused.elapsedMs).toBe(3_350);
  });

  it('pause is a no-op when not running', () => {
    const paused = state({ elapsedMs: 42 });
    expect(pauseTimer(paused)).toEqual(paused);
  });

  it('multiple start/pause cycles accumulate elapsed time', () => {
    let s = state();
    // 1st run: 2000ms
    vi.setSystemTime(10_000);
    s = startTimer(s);
    vi.setSystemTime(12_000);
    s = pauseTimer(s);
    expect(s.elapsedMs).toBe(2_000);
    // 2nd run: 1500ms
    vi.setSystemTime(20_000);
    s = startTimer(s);
    vi.setSystemTime(21_500);
    s = pauseTimer(s);
    expect(s.elapsedMs).toBe(3_500);
    // 3rd run: 500ms
    s = startTimer(s);
    vi.setSystemTime(22_000);
    s = pauseTimer(s);
    expect(s.elapsedMs).toBe(4_000);
    expect(s.startedAt).toBeNull();
    expect(s.running).toBe(false);
  });

  it('toggle switches between running and paused', () => {
    let s = state({ startedAt: 1_000_000 });
    s = toggleTimer(s);
    expect(s.running).toBe(true);
    vi.setSystemTime(1_002_000);
    s = toggleTimer(s);
    expect(s.running).toBe(false);
    expect(s.elapsedMs).toBe(2_000);
    s = toggleTimer(s);
    expect(s.running).toBe(true);
  });
});

describe('recordLap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a lap from the live displayed time while running', () => {
    const s = state({ running: true, startedAt: 999_000, elapsedMs: 500 });
    vi.setSystemTime(1_001_000);
    const next = recordLap(s);
    expect(next.laps).toHaveLength(1);
    expect(next.laps[0]).toMatchObject({ index: 1, totalMs: 2_500, splitMs: 2_500 });
    expect(next.running).toBe(true);
  });

  it('second lap computes split delta from previous lap total', () => {
    const s = state({
      running: true,
      startedAt: 999_000,
      elapsedMs: 500,
      laps: [{ index: 1, totalMs: 2_500, splitMs: 2_500 }],
    });
    vi.setSystemTime(1_004_000);
    const next = recordLap(s);
    expect(next.laps).toHaveLength(2);
    expect(next.laps[1]).toMatchObject({ index: 2, totalMs: 5_500, splitMs: 3_000 });
  });

  it('recording a lap with zero elapsed time does not crash', () => {
    const next = recordLap(state());
    expect(next.laps).toHaveLength(1);
    expect(next.laps[0]).toEqual({ index: 1, totalMs: 0, splitMs: 0 });
    expect(() => recordLap(state())).not.toThrow();
  });

  it('records zero-split laps without crashing on a paused timer', () => {
    const paused = pauseTimer(startTimer(state()));
    const next = recordLap(paused);
    expect(next.laps[0]).toEqual({ index: 1, totalMs: paused.elapsedMs, splitMs: paused.elapsedMs });
  });
});

describe('lapHighlights', () => {
  const lap = (index: number, splitMs: number): Lap => ({ index, totalMs: 0, splitMs });

  it('marks no highlights with fewer than two laps', () => {
    expect(lapHighlights([lap(1, 100)])).toEqual([null]);
    expect(lapHighlights([])).toEqual([]);
  });

  it('marks fastest and slowest laps', () => {
    const highlights = lapHighlights([lap(1, 300), lap(2, 100), lap(3, 200)]);
    expect(highlights).toEqual([SLOWEST_HIGHLIGHT, FASTEST_HIGHLIGHT, null]);
  });

  it('marks nothing when all splits are equal', () => {
    expect(lapHighlights([lap(1, 100), lap(2, 100)])).toEqual([null, null]);
  });

  it('marks only the first occurrence as slowest on ties', () => {
    const highlights = lapHighlights([lap(1, 300), lap(2, 100), lap(3, 300)]);
    expect(highlights[0]).toBe(SLOWEST_HIGHLIGHT);
    expect(highlights[2]).toBeNull();
    expect(highlights[1]).toBe(FASTEST_HIGHLIGHT);
  });
});

describe('serialize / deserialize round-trip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips laps and elapsed time', () => {
    const original: ToolState = state({
      elapsedMs: 12_345,
      running: false,
      startedAt: null,
      laps: [
        { index: 1, totalMs: 5_000, splitMs: 5_000 },
        { index: 2, totalMs: 12_345, splitMs: 7_345 },
      ],
      targetMs: 120_000,
    });
    const restored = deserializeState(JSON.parse(serializeState(original)));
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.elapsedMs).toBe(original.elapsedMs);
    expect(restored.data.laps).toEqual(original.laps);
    expect(restored.data.running).toBe(false);
    expect(restored.data.startedAt).toBeNull();
    expect(restored.data.targetMs).toBe(original.targetMs);
  });

  it('round-trips a running state keeping the running segment exact', () => {
    const original = state({ running: true, startedAt: 995_000, elapsedMs: 1_000 });
    const restored = deserializeState(JSON.parse(serializeState(original)));
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.running).toBe(true);
    expect(restored.data.startedAt).toBe(original.startedAt);
    // Round-trip restores the exact original state; displayed time stays identical.
    expect(restored.data.elapsedMs).toBe(original.elapsedMs);
    expect(currentElapsedMs(restored.data)).toBe(currentElapsedMs(original));
  });

  it('preserves mode through serialization', () => {
    const original = setMode(state({ targetMs: 60_000 }), 'countdown');
    const restored = deserializeState(JSON.parse(serializeState(original)));
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.mode).toBe('countdown');
    expect(restored.data.targetMs).toBe(60_000);
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState({}).success).toBe(false);
  });

  it('rejects invalid laps', () => {
    expect(deserializeState({ elapsedMs: 0, laps: 'nope' }).success).toBe(false);
    expect(deserializeState({ elapsedMs: 0, laps: [{ totalMs: -1, splitMs: 0 }] }).success).toBe(false);
    expect(deserializeState({ elapsedMs: 0, laps: [null] }).success).toBe(false);
  });

  it('coerces missing running/startedAt fields safely', () => {
    const restored = deserializeState({ elapsedMs: 42, laps: [] });
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.running).toBe(false);
    expect(restored.data.startedAt).toBeNull();
    expect(restored.data.elapsedMs).toBe(42);
  });

  it('clamps out-of-range targetMs to defaults', () => {
    const restored = deserializeState({ elapsedMs: 0, targetMs: 1e12 });
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.targetMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });
});

describe('tool contract', () => {
  it('exposes identity matching config', () => {
    expect(stopwatchTool.id).toBe('1795259106');
    expect(stopwatchTool.name).toBe('Stopwatch & Lap Timer');
    expect(stopwatchTool.initialState).toEqual(DEFAULT_STATE);
    expect(stopwatchTool.version).toBe('1.0.0');
  });
});

describe('reset', () => {
  it('clears laps, elapsed time, running state and highlight source data', () => {
    const dirty = state({
      running: true,
      startedAt: 1,
      elapsedMs: 9_999,
      laps: [
        { index: 1, totalMs: 1_000, splitMs: 1_000 },
        { index: 2, totalMs: 9_999, splitMs: 8_999 },
      ],
    });
    const clean = resetTimer(dirty);
    expect(clean.laps).toEqual([]);
    expect(clean.elapsedMs).toBe(0);
    expect(clean.running).toBe(false);
    expect(clean.startedAt).toBeNull();
    expect(lapHighlights(clean.laps)).toEqual([]);
    expect(isCountdownComplete(clean)).toBe(false);
  });

  it('reset is safe on an untouched timer', () => {
    expect(resetTimer(state())).toEqual(DEFAULT_STATE);
  });
});

describe('countdown helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('remainingMs counts down to zero and clamps', () => {
    const s = setMode(state({ targetMs: 10_000 }), 'countdown');
    expect(remainingMs(s)).toBe(10_000);
    const advanced = { ...s, elapsedMs: 4_000 };
    expect(remainingMs(advanced)).toBe(6_000);
    const done = { ...s, elapsedMs: 15_000 };
    expect(remainingMs(done)).toBe(0);
    expect(isCountdownComplete(done)).toBe(true);
  });

  it('stopwatch mode has no countdown behavior', () => {
    expect(remainingMs(state())).toBe(0);
    expect(isCountdownComplete({ ...state(), elapsedMs: 1e9 })).toBe(false);
  });
});

describe('setMode and setTargetMs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('setMode pauses a running timer and keeps elapsed time', () => {
    const running = startTimer(state());
    vi.setSystemTime(1_003_000);
    const switched = setMode(running, 'countdown');
    expect(switched.mode).toBe('countdown');
    expect(switched.running).toBe(false);
    expect(switched.elapsedMs).toBe(3_000);
  });

  it('setTargetMs clamps to [1s, 24h]', () => {
    expect(setTargetMs(state(), 500).targetMs).toBe(1_000);
    expect(setTargetMs(state(), 1e12).targetMs).toBe(24 * 60 * 60 * 1000);
    expect(setTargetMs(state(), 90_000).targetMs).toBe(90_000);
  });
});

describe('formatLapsTable', () => {
  it('returns empty array for no laps', () => {
    expect(formatLapsTable([])).toEqual([]);
  });

  it('formats lap rows with totals and splits', () => {
    const rows = formatLapsTable([
      { index: 1, totalMs: 1_500, splitMs: 1_500 },
      { index: 2, totalMs: 3_000, splitMs: 1_500 },
    ]);
    expect(rows).toEqual([
      'Lap 1\tTotal 00:01.50\tSplit 00:01.50',
      'Lap 2\tTotal 00:03.00\tSplit 00:01.50',
    ]);
  });
});
