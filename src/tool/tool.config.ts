import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: '1795244675',
  name: 'Case Converter Pro',
  description:
    'A text case conversion toolbox with camelCase, snake_case, PascalCase, kebab-case, CONSTANT_CASE, Title Case, dot.case, train-case and sentence case conversions plus live word/char counts and copy-to-clipboard.',
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
