import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: '1795266287',
  name: 'BPM Tap Tempo',
  description:
    'Tap in rhythm to compute tempo in BPM, with a sliding tap window, beat timing statistics, preset tempo grid, audio click feedback, clipboard copy and shareable state.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentSubtle: 'rgba(245, 158, 11, 0.12)',
    brand: 'BPM Tap Tempo',
    icon: '🥁',
  },
  shortcuts: [
    {
      title: 'Tap Tempo',
      shortcuts: [
        { keys: 'Space / T', label: 'Tap', description: 'register a beat tap' },
        { keys: 'R', label: 'Reset', description: 'clear the tap sequence' },
        { keys: 'C', label: 'Copy BPM', description: 'copy the computed BPM to the clipboard' },
        { keys: 'K', label: 'Click', description: 'toggle audio click feedback' },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
