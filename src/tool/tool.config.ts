import type { ExportFormat } from '@itsjust/core';

export const toolConfig = {
  id: "tool-1795251874",
  name: "Markdown to HTML Converter",
  category: "Converter",
  description: "Convert Markdown into clean, styled HTML with live preview and export options, fully client-side.",
  version: "1.0.0",
  exportFormats: ["png", "jpeg", "webp", "pdf", "json"] satisfies ExportFormat[] as ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: "Markdown to HTML Converter",
  },
  featureList: [
    "Live two-pane editor with instant Markdown->HTML rendering",
    "GitHub-flavored Markdown support: tables, task lists, strikethrough, autolinks",
    "Code blocks with language tags and syntax-highlight-ready output",
    "Options for hard line breaks, heading IDs, and sanitization",
    "Copy HTML, download .html file, or copy standalone styled document",
    "Table of contents extraction with anchor link insertion",
    "Document statistics: words, characters, headings, links, images, code blocks",
  ],
};

export default toolConfig;
