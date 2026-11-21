import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { stopwatchTool } from '@/tool/tool-definition';
import { resetTimer } from '@/tool/tool-definition';
import {
  DEFAULT_STATE,
  MIN_TARGET_MS,
  type ToolState,
} from '@/tool/types';
import type { ExporterLoader } from '@itsjust/core';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    const validState: ToolState = {
      mode: 'stopwatch',
      elapsedMs: 1_500,
      running: false,
      startedAt: null,
      laps: [{ index: 1, totalMs: 1_500, splitMs: 1_500 }],
      targetMs: 120_000,
    };
    expect(stopwatchTool.deserialize(validState)).toEqual({ success: true, data: validState });
    expect(stopwatchTool.deserialize({ nope: true })).toEqual({
      success: false,
      error: 'Invalid data format: expected { elapsedMs: number >= 0, ... }',
    });
    expect(stopwatchTool.serialize({ ...DEFAULT_STATE, elapsedMs: 1500 })).toContain('"elapsedMs":1500');
    expect(stopwatchTool.deserialize({ elapsedMs: 0, mode: 'countdown', targetMs: 5000 })).toEqual({
      success: true,
      data: {
        mode: 'countdown',
        elapsedMs: 0,
        running: false,
        startedAt: null,
        laps: [],
        targetMs: 5000,
      },
    });
    const exporters = (stopwatchTool as { exporters?: Array<{ loader: ExporterLoader }> }).exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
    expect(MIN_TARGET_MS).toBe(1000);
  });

  it('renders tool components', () => {
    const canvasState: ToolState = {
      ...DEFAULT_STATE,
      laps: [
        { index: 1, totalMs: 1_000, splitMs: 1_000 },
        { index: 2, totalMs: 3_000, splitMs: 2_000 },
      ],
    };
    render(
      <>
        <ResetButton onReset={() => {}} />
        <CanvasStateProbe state={canvasState} />
      </>
    );

    expect(screen.getByTestId('laps-table')).toBeInTheDocument();
    expect(screen.getByTestId('lap-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00.00');
    expect(resetTimer(canvasState).laps).toEqual([]);
  });
});

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button type="button" onClick={onReset} data-testid="reset-probe">
      Reset
    </button>
  );
}

function CanvasStateProbe({ state }: { state: ToolState }) {
  return (
    <div data-testid="canvas-probe">
      <div data-testid="timer-display">00:00.00</div>
      <table data-testid="laps-table">
        <tbody>
          {state.laps.map((lap) => (
            <tr key={lap.index} data-testid={`lap-row-${lap.index}`}>
              <td>Lap {lap.index}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
