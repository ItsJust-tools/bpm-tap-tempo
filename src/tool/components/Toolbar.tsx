'use client';

import React from 'react';

interface ToolbarProps {
  onClear?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
  isPlaying?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onClear, onPlay, onStop, isPlaying = false }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Playback controls">
        <button
          type="button"
          onClick={isPlaying ? onStop : onPlay}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          data-testid="dtmf-toolbar-play"
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          data-testid="dtmf-toolbar-clear"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
