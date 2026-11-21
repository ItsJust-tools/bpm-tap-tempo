'use client';

import { Sidebar } from './Sidebar';
import type { ToolState } from '../types';

interface ToolSidebarProps {
  state?: ToolState;
}

export function ToolSidebar({ state }: ToolSidebarProps) {
  return <Sidebar state={state} />;
}
