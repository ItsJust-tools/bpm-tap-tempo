'use client';

import React from 'react';
import { playbackDuration, scheduleTones, sanitizeSequence } from '../tool-definition';
import type { ToolState } from '../types';

interface SidebarProps {
  state?: ToolState;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  const sequence = state?.sequence ?? '';
  const keys = sanitizeSequence(sequence);
  const tones = scheduleTones(sequence, state?.toneDuration ?? 150, state?.pauseDuration ?? 60);

  return (
    <div className="dtmf-sidebar p-4 space-y-4 text-sm">
      <div className="sidebar-section">
        <h3>Sequence stats</h3>
        <dl className="stats-list">
          <div className="stat-row">
            <dt>Keys</dt>
            <dd>{keys.length}</dd>
          </div>
          <div className="stat-row">
            <dt>Total playback</dt>
            <dd>{(playbackDuration(tones) / 1000).toFixed(2)} s</dd>
          </div>
          <div className="stat-row">
            <dt>Tone duration</dt>
            <dd>{state?.toneDuration ?? 150} ms</dd>
          </div>
          <div className="stat-row">
            <dt>Pause</dt>
            <dd>{state?.pauseDuration ?? 60} ms</dd>
          </div>
        </dl>
      </div>
      <div className="sidebar-section">
        <h3>Active tones</h3>
        {tones.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No keys dialed yet.</p>
        ) : (
          <ul className="font-mono text-xs" data-testid="dtmf-sidebar-tones">
            {tones.map((tone, index) => (
              <li key={`${tone.key}-${index}`}>
                {tone.key}: {tone.lowFrequency}+{tone.highFrequency} Hz @ {tone.start} ms
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
