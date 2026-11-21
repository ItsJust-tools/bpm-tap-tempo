import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: '1795244675',
  name: 'Dial Pad DTMF Decoder & Tone Player',
  description:
    'A phone keypad tool that plays or decodes DTMF tone sequences and shows the digits each tone pair represents.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'] as ToolConfig['exportFormats'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
};

export default toolConfig;

export type ToolConfigType = typeof toolConfig;
