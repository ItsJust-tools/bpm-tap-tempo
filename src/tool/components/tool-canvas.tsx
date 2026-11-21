'use client';

import React, { useCallback, useEffect } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { resetTimer, toggleTimer, recordLap } from '../tool-definition';
import type { ToolState } from '../types';

export interface ToolCanvasHandle {
  state: ToolState;
  onStateChange?: (updater: (prev: ToolState) => ToolState) => void;
}

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
  const handleChange = useCallback(
    (updater: (prev: ToolState) => ToolState) => {
      onStateChange?.(updater);
    },
    [onStateChange]
  );

  const apply = useCallback(
    (transition: (prev: ToolState) => ToolState) => {
      onStateChange?.((prev) => transition(prev));
      readOnly;
    },
    [onStateChange, readOnly]
  );

  return (
    <div
      ref={canvasRef}
      className="stopwatch-canvas"
      role="application"
      aria-label="Stopwatch canvas"
    >
      {onClear ? (
        <Toolbar
          state={state}
          onChange={handleChange as unknown as (next: ToolState) => void}
          onClear={onClear}
        />
      ) : null}
      <KeyboardShortcuts state={state} onToggle={() => apply(toggleTimer)} onLap={() => apply(recordLap)} onReset={() => apply(resetTimer)} />
      <Canvas state={state} onChange={handleChange as unknown as (next: ToolState) => void} />
    </div>
  );
}

interface KeyboardShortcutsProps {
  state: ToolState;
  onToggle: () => void;
  onLap: () => void;
  onReset: () => void;
}

function KeyboardShortcuts({ onToggle, onLap, onReset }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        onToggle();
      } else if (event.key === 'l' || event.key === 'L') {
        event.preventDefault();
        onLap();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        onReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle, onLap, onReset]);
  return null;
}
