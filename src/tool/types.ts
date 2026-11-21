export interface DocStats {
  words: number;
  characters: number;
  headings: number;
  links: number;
  images: number;
  codeBlocks: number;
}

export type TocEntry = { level: number; text: string; id: string };

export interface MarkdownOptions {
  gfm: boolean;
  hardLineBreaks: boolean;
  headingIds: boolean;
  sanitize: boolean;
}

export interface ToolState {
  markdown: string;
  options: MarkdownOptions;
}

export const DEFAULT_STATE: ToolState = {
  markdown: [
    '# Hello Markdown',
    '',
    'This is a **Markdown to HTML** converter with *GFM* support.',
    '',
    '- [x] Write markdown',
    '- [ ] Preview HTML',
    '',
    '| Feature | Status |',
    '| ------- | ------ |',
    '| Tables  | Works  |',
    '',
    '```js',
    "console.log('hi');",
    '```',
    '',
    'Visit <https://example.com> or see ~~strikethrough~~ text.',
  ].join('\n'),
  options: {
    gfm: true,
    hardLineBreaks: false,
    headingIds: true,
    sanitize: true,
  },
};

export const DEFAULT_OPTIONS: MarkdownOptions = { ...DEFAULT_STATE.options };
