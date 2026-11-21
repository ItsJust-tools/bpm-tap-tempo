'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { computeBpmStats, formatBpm, registerTap, resetTaps } from '../tool-definition';
import { IDLE_TIMEOUT_MS, type ToolState } from '../types';

interface ToolCanvasProps {
  state: ToolState;
  fontSize?: number;
  readOnly?: boolean;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onStateChange?: (updater: (prev: ToolState) => ToolState) => void;
  onClear?: () => void;
}

export function ToolCanvas({
  state,
  readOnly = false,
  canvasRef,
  onStateChange,
  onClear,
}: ToolCanvasProps) {
  const clickCtxRef = useRef<AudioContext | null>(null);
  const lastTapRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);

  const handleChange = useCallback(
    (updater: (prev: ToolState) => ToolState) => {
      onStateChange?.(updater);
    },
    [onStateChange]
  );

  const playClick = useCallback(() => {
    try {
      type LegacyWindow = typeof window & { webkitAudioContext?: unknown };
      const w = window as LegacyWindow;
      const Ctor = window.AudioContext ?? (w.webkitAudioContext as typeof AudioContext | undefined);
      if (!Ctor) return;
      if (clickCtxRef.current === null) {
        clickCtxRef.current = new Ctor();
      }
      const ctx = clickCtxRef.current;
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // audio unavailable; ignore
    }
  }, []);

  const doTap = useCallback(() => {
    const now = Date.now();
    lastTapRef.current = now;
    onStateChange?.((prev) => registerTap(prev, now));
    readOnly;
  }, [onStateChange, readOnly]);

  // Audio click fires when the state gains a tap and sound is enabled.
  const tapCountRef = useRef(state.taps.length);
  useEffect(() => {
    if (state.taps.length > tapCountRef.current && state.clickEnabled) {
      playClick();
    }
    tapCountRef.current = state.taps.length;
  }, [state.taps.length, state.clickEnabled, playClick]);

  // Idle reset: clear sequence 2s after the most recent tap.
  useEffect(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (state.taps.length === 0) return;
    const last = state.taps[state.taps.length - 1] ?? 0;
    const remaining = IDLE_TIMEOUT_MS - (Date.now() - last);
    if (remaining <= 0) {
      onStateChange?.((prev) => resetTaps(prev));
      return;
    }
    idleTimerRef.current = window.setTimeout(() => {
      onStateChange?.((prev) => resetTaps(prev));
    }, remaining);
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [state.taps, onStateChange]);

  // Keyboard shortcuts: Space/T tap, R reset, C copy, K click toggle.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Space' || event.key === 't' || event.key === 'T') {
        event.preventDefault();
        doTap();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        onStateChange?.((prev) => resetTaps(prev));
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        const stats = computeBpmStats(state.taps);
        if (stats.bpm !== null) {
          void navigator.clipboard.writeText(formatBpm(stats.bpm)).catch(() => {});
        }
      } else if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        onStateChange?.((prev) => ({ ...prev, clickEnabled: !prev.clickEnabled }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doTap, onStateChange, state.taps]);

  return (
    <div
      ref={canvasRef}
      className="bpm-canvas"
      role="application"
      aria-label="BPM tap tempo canvas"
    >
      {onClear ? (
        <Toolbar
          state={state}
          onChange={handleChange as unknown as (next: ToolState) => void}
          onClear={onClear}
          onTap={doTap}
          onCopy={() => {
            const stats = computeBpmStats(state.taps);
            if (stats.bpm !== null) {
              void navigator.clipboard.writeText(formatBpm(stats.bpm)).catch(() => {});
            }
          }}
        />
      ) : null}
      <div
        data-testid="tap-target"
        role="button"
        tabIndex={0}
        aria-label="Tap pad: activate to register a beat"
        onClick={doTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            doTap();
          }
        }}
        className="tap-target focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <Canvas state={state} />
      </div>
    </div>
  );
}
