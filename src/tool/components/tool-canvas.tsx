'use client';

import { useCallback } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import type { DtmfKey, ToolState } from '../types';

interface ToolCanvasProps {
  state: ToolState;
  readOnly?: boolean;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onStateChange?: (updater: (prev: ToolState) => ToolState) => void;
  onClear?: () => void;
  activeKey?: DtmfKey | null;
  isPlaying?: boolean;
  onPlaySequence?: () => void;
  onStopPlayback?: () => void;
  onCopySequence?: () => void;
  copyLabel?: string;
}

export function ToolCanvas({
  state,
  readOnly = false,
  canvasRef,
  onStateChange,
  onClear,
  activeKey,
  isPlaying,
  onPlaySequence,
  onStopPlayback,
  onCopySequence,
  copyLabel,
}: ToolCanvasProps) {
  const handleChange = useCallback(
    (next: ToolState) => {
      onStateChange?.(() => next);
    },
    [onStateChange]
  );

  return (
    <div
      ref={canvasRef}
      className="dtmf-canvas"
      role="application"
      aria-label="DTMF dial pad canvas"
    >
      <Canvas
        state={state}
        onChange={handleChange}
        activeKey={activeKey}
        isPlaying={isPlaying}
        onPlaySequence={onPlaySequence}
        onStopPlayback={onStopPlayback}
        onCopySequence={onCopySequence}
        copyLabel={copyLabel}
      />
      {readOnly ? null : null}
    </div>
  );
}
