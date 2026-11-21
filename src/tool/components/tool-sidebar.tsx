'use client';

import { setMode, setTargetMs } from '../tool-definition';
import type { ToolState } from '../types';
import { Sidebar } from './Sidebar';

interface ToolSidebarProps {
  state?: ToolState;
  fontSize?: number;
  onFontSizeChange?: (delta: number) => void;
  onStateChange?: (updater: (prev: ToolState) => ToolState) => void;
}

export function ToolSidebar({ state, onStateChange }: ToolSidebarProps) {
  if (!state || !onStateChange) {
    return (
      <div className="stopwatch-sidebar" data-testid="stopwatch-sidebar-shell">
        <p className="text-xs text-gray-500">Sidebar unavailable</p>
      </div>
    );
  }
  return <Sidebar state={state} onChange={onStateChange as unknown as (next: ToolState) => void} />;
}

export { setMode, setTargetMs };
