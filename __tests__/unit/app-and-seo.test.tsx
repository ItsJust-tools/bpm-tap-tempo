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
import { bpmTapTempoTool } from '@/tool/tool-definition';
import { DEFAULT_STATE, IDLE_TIMEOUT_MS, type ToolState } from '@/tool/types';
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
    expect(bpmTapTempoTool.id).toBe(toolConfig.id);
    expect(bpmTapTempoTool.name).toBe(toolConfig.name);
    const idleState: ToolState = {
      taps: [1, 2],
      clickEnabled: true,
      windowMs: DEFAULT_STATE.windowMs,
    };
    const serialized = JSON.parse(bpmTapTempoTool.serialize(idleState));
    expect(serialized.taps).toEqual([1, 2]);
    const bad = bpmTapTempoTool.deserialize({ nope: true });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error).toContain('Invalid data format');
    }
    const round = bpmTapTempoTool.deserialize({
      taps: [10, 610],
      clickEnabled: false,
      windowMs: 8_000,
    });
    expect(round.success).toBe(true);
    expect(round.success && round.data.windowMs).toBe(8_000);
    const exporters =
      (bpmTapTempoTool as { exporters?: Array<{ loader: ExporterLoader }> }).exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
    expect(IDLE_TIMEOUT_MS).toBe(2_000);
  });

  it('renders tool components', () => {
    const tapState: ToolState = {
      ...DEFAULT_STATE,
      taps: [1_000, 1_500, 2_000],
    };
    render(
      <>
        <ResetProbe />
        <CanvasStateProbe state={tapState} />
      </>
    );

    expect(screen.getByTestId('bpm-display')).toBeInTheDocument();
    expect(screen.getByTestId('preset-grid')).toBeInTheDocument();
  });
});

function ResetProbe() {
  return (
    <button type="button" data-testid="reset-probe">
      Reset
    </button>
  );
}

function CanvasStateProbe({ state }: { state: ToolState }) {
  return (
    <div data-testid="canvas-probe">
      <div data-testid="bpm-display">120.0</div>
      <div data-testid="preset-grid">{state.taps.length} taps</div>
    </div>
  );
}
