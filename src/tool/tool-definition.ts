import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  IDLE_TIMEOUT_MS,
  MAX_WINDOW_MS,
  MIN_WINDOW_MS,
  computeBpmStats,
  formatBpm,
  nearestPreset,
  pruneTaps,
  registerTap,
  resetTaps,
  setClickEnabled,
  setWindowMs,
  type BpmStats,
  type ToolState,
} from './types';

export {
  computeBpmStats,
  computeBpm,
  formatBpm,
  nearestPreset,
  registerTap,
  resetTaps,
  pruneTaps,
  setClickEnabled,
  setWindowMs,
  DEFAULT_STATE,
  IDLE_TIMEOUT_MS,
  MIN_WINDOW_MS,
  MAX_WINDOW_MS,
} from './types';
export type { BpmStats } from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    taps: (state.taps ?? []).map((t) => Math.round(t)),
    clickEnabled: Boolean(state.clickEnabled),
    windowMs: Math.round(state.windowMs),
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { success: false, error: 'Invalid data format: expected BPM tap tempo state object' };
  }
  const v = data as {
    taps?: unknown;
    clickEnabled?: unknown;
    windowMs?: unknown;
  };
  if (!Array.isArray(v.taps)) {
    return { success: false, error: 'Invalid data format: taps must be an array of timestamps' };
  }
  const taps: number[] = [];
  for (const t of v.taps) {
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) {
      return {
        success: false,
        error: 'Invalid data format: tap timestamps must be non-negative numbers',
      };
    }
    taps.push(Math.round(t));
  }
  const clickEnabled =
    typeof v.clickEnabled === 'boolean' ? v.clickEnabled : DEFAULT_STATE.clickEnabled;
  let windowMs = DEFAULT_STATE.windowMs;
  if (typeof v.windowMs === 'number' && Number.isFinite(v.windowMs)) {
    windowMs = Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(v.windowMs)));
  }
  const restored: ToolState = { taps, clickEnabled, windowMs };
  // Taps are restored as-is so persisted sessions survive round-trips; the
  // canvas idle timer applies the 2s inactivity reset after mount.
  return { success: true, data: restored };
}

export const bpmTapTempoTool: Tool<ToolState> = {
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
