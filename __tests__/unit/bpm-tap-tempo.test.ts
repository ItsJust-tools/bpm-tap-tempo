import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bpmTapTempoTool,
  computeBpm,
  computeBpmStats,
  deserializeState,
  formatBpm,
  nearestPreset,
  pruneTaps,
  registerTap,
  resetTaps,
  serializeState,
  setClickEnabled,
  setWindowMs,
} from '../../src/tool/tool-definition';
import {
  DEFAULT_STATE,
  DEFAULT_WINDOW_MS,
  IDLE_TIMEOUT_MS,
  MAX_WINDOW_MS,
  MIN_TAP_INTERVAL_MS,
  MIN_WINDOW_MS,
  PRESET_BPM,
  type ToolState,
} from '../../src/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('computeBpmStats / computeBpm', () => {
  it('computes BPM correctly from a sequence of tap timestamps', () => {
    // 500ms intervals → 120 BPM
    const taps = [1_000, 1_500, 2_000, 2_500];
    expect(computeBpm(taps)).toBeCloseTo(120, 5);
    const stats = computeBpmStats(taps);
    expect(stats.intervalMs).toBe(500);
    expect(stats.minIntervalMs).toBe(500);
    expect(stats.maxIntervalMs).toBe(500);
  });

  it('handles uneven intervals and derives min/max confidence bounds', () => {
    const taps = [0, 400, 1_000]; // intervals 400, 600 → avg 500 → 120 BPM
    const stats = computeBpmStats(taps);
    expect(stats.bpm).toBeCloseTo(120, 5);
    expect(stats.minIntervalMs).toBe(400);
    expect(stats.maxIntervalMs).toBe(600);
    expect(stats.bpmMax).toBeCloseTo(150, 5);
    expect(stats.bpmMin).toBeCloseTo(100, 5);
  });

  it('returns nulls below two taps', () => {
    expect(computeBpm([])).toBeNull();
    expect(computeBpm([123])).toBeNull();
    const stats = computeBpmStats([123]);
    expect(stats.bpm).toBeNull();
    expect(stats.bpmMin).toBeNull();
    expect(stats.bpmMax).toBeNull();
  });
});

describe('registerTap', () => {
  it('appends taps and keeps the sequence', () => {
    let s = state();
    s = registerTap(s, 1_000);
    s = registerTap(s, 1_500);
    s = registerTap(s, 2_000);
    expect(s.taps).toEqual([1_000, 1_500, 2_000]);
  });

  it('ignores taps faster than the debounce floor', () => {
    let s = state();
    s = registerTap(s, 1_000);
    s = registerTap(s, 1_000 + MIN_TAP_INTERVAL_MS - 1);
    expect(s.taps).toEqual([1_000]);
  });

  it('resets the sequence after the idle timeout elapses', () => {
    let s = state();
    s = registerTap(s, 1_000);
    s = registerTap(s, 1_500);
    expect(s.taps).toHaveLength(2);
    // Tap long after the last one: older taps are pruned away.
    s = registerTap(s, 1_500 + IDLE_TIMEOUT_MS + 10);
    expect(s.taps).toEqual([1_500 + IDLE_TIMEOUT_MS + 10]);
  });

  it('drops taps outside the sliding window while idle tolerance holds', () => {
    const custom = state({ windowMs: 5_000 });
    let s = registerTap(custom, 0);
    s = registerTap(s, 4_000);
    s = registerTap(s, 6_000);
    expect(s.taps).toEqual([4_000, 6_000]);
    s = registerTap(s, 6_500);
    expect(s.taps).toEqual([4_000, 6_000, 6_500]);
    expect(pruneTaps(s, 6_600).taps).toEqual([4_000, 6_000, 6_500].filter((t) => t > 1_600));
  });
});

describe('pruneTaps', () => {
  it('clears state after idle timeout and manual reset', () => {
    const s = state({ taps: [1_000, 1_500, 2_000] });
    expect(pruneTaps(s, 2_000 + IDLE_TIMEOUT_MS + 1).taps).toEqual([]);
    expect(resetTaps(s).taps).toEqual([]);
  });

  it('prunes only taps older than the window while idle tolerance holds', () => {
    const s = state({ taps: [1_000, 9_000, 11_000], windowMs: 5_000 });
    const pruned = pruneTaps(s, 11_500);
    expect(pruned.taps).toEqual([9_000, 11_000]);
  });

  it('keeps state unchanged when nothing expires', () => {
    const s = state({ taps: [1_000, 1_400] });
    expect(pruneTaps(s, 1_500)).toBe(s);
  });
});

describe('settings updates', () => {
  it('clamps the window to supported bounds', () => {
    expect(setWindowMs(state(), 100).windowMs).toBe(MIN_WINDOW_MS);
    expect(setWindowMs(state(), 60_000).windowMs).toBe(MAX_WINDOW_MS);
    expect(setWindowMs(state(), 8_000).windowMs).toBe(8_000);
  });

  it('toggles audio click', () => {
    expect(setClickEnabled(state(), false).clickEnabled).toBe(false);
    expect(setClickEnabled(state({ clickEnabled: false }), true).clickEnabled).toBe(true);
  });
});

describe('formatting and presets', () => {
  it('formats BPM with one decimal', () => {
    expect(formatBpm(null)).toBe('—');
    expect(formatBpm(120)).toBe('120.0');
    expect(formatBpm(120.04)).toBe('120.0');
    expect(formatBpm(119.96)).toBe('120.0');
    expect(formatBpm(Number.NaN)).toBe('—');
  });

  it('finds the nearest preset', () => {
    expect(nearestPreset(118)).toBe(120);
    expect(nearestPreset(88)).toBe(90);
    expect(nearestPreset(160)).toBe(150);
    expect(nearestPreset(null)).toBeNull();
  });
});

describe('serialization round-trip', () => {
  it('round-trips taps and settings through tool-definition', () => {
    const s: ToolState = state({
      taps: [1_000, 1_500, 2_000],
      clickEnabled: false,
      windowMs: 15_000,
    });
    const round = deserializeState(JSON.parse(serializeState(s)));
    expect(round.success).toBe(true);
    if (round.success) {
      expect(round.data.taps).toEqual([1_000, 1_500, 2_000]);
      expect(round.data.clickEnabled).toBe(false);
      expect(round.data.windowMs).toBe(15_000);
    }
  });

  it('round-trips an empty state', () => {
    const round = deserializeState(JSON.parse(serializeState(state())));
    expect(round.success).toBe(true);
    if (round.success) {
      expect(round.data.taps).toEqual([]);
      expect(round.data.clickEnabled).toBe(DEFAULT_STATE.clickEnabled);
    }
  });

  it('rejects invalid payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([]).success).toBe(false);
    expect(deserializeState({ taps: 'x' }).success).toBe(false);
    expect(deserializeState({ taps: [-5] }).success).toBe(false);
    expect(deserializeState({ taps: [1, 'a'] }).success).toBe(false);
  });

  it('uses defaults for missing settings', () => {
    const round = deserializeState({ taps: [Date.now()] });
    expect(round.success).toBe(true);
    if (round.success) {
      expect(round.data.windowMs).toBe(DEFAULT_WINDOW_MS);
      expect(round.data.clickEnabled).toBe(DEFAULT_STATE.clickEnabled);
    }
  });

  it('drops an idled-out restored sequence on next prune', () => {
    const round = deserializeState({ taps: [100, 200] });
    expect(round.success).toBe(true);
    if (round.success) {
      expect(round.data.taps).toEqual([100, 200]);
      expect(pruneTaps(round.data, Date.now()).taps).toEqual([]);
    }
  });
});

describe('tool contract', () => {
  it('exposes metadata matching the task', () => {
    expect(bpmTapTempoTool.id).toBeDefined();
    expect(bpmTapTempoTool.name).toContain('BPM');
    expect(bpmTapTempoTool.version).toBe('1.0.0');
  });

  it('initial state is empty and sound-enabled', () => {
    expect(bpmTapTempoTool.initialState.taps).toEqual([]);
    expect(bpmTapTempoTool.initialState.clickEnabled).toBe(true);
  });
});

describe('presets list', () => {
  it('matches the requested reference grid', () => {
    expect(PRESET_BPM).toEqual([60, 90, 120, 150, 180]);
  });
});
