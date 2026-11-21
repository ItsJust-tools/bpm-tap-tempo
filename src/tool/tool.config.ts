import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: "1795259106",
  name: "Stopwatch & Lap Timer",
  description: "A browser-based stopwatch with lap recording, per-lap split deltas, keyboard shortcuts, and shareable state via URL.",
  version: "1.0.0",
  exportFormats: ["png", "jpeg", "webp", "pdf"],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: "#0ea5e9",
    accentHover: "#0284c7",
    accentSubtle: "rgba(14, 165, 233, 0.12)",
    brand: "Stopwatch & Lap Timer",
    icon: "⏱️",
  },
  shortcuts: [
    {
      title: "Timer",
      shortcuts: [
        { keys: "Space", label: "Start / Pause", description: "Toggle the timer between running and paused" },
        { keys: "L", label: "Record lap", description: "Record a lap with the current elapsed time" },
        { keys: "R", label: "Reset", description: "Reset the timer and clear all laps" },
      ],
    },
  ],
};

export default toolConfig;
