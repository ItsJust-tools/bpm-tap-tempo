import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlState } from '../../src/hooks/use-url-state';

interface Options {
  toolId: string;
  serialize: () => string;
  deserialize: (
    data: unknown
  ) => { success: true; data: unknown } | { success: false; error: string };
  onStateLoaded: (data: unknown) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const base = {
  toolId: 'test-tool',
  serialize: () => JSON.stringify({ value: 1 }),
  deserialize: (data: unknown) => ({ success: true, data }),
  onStateLoaded: vi.fn(),
  showToast: vi.fn(),
};

function setHashSearch(search: string) {
  window.history.replaceState(null, '', search || '/');
}

beforeEach(() => {
  vi.stubGlobal('navigator', {
    share: vi.fn().mockRejectedValue(new DOMException('denied', 'AbortError')),
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setHashSearch('/');
});

describe('useUrlState', () => {
  it('does nothing when there is no state query param', () => {
    setHashSearch('/');
    renderHook(() => useUrlState(base as Options));
    expect(base.onStateLoaded).not.toHaveBeenCalled();
    expect(base.showToast).not.toHaveBeenCalled();
  });

  it('shows an error when the encoded state decompresses to null', async () => {
    // a value that lz-string cannot decompress
    setHashSearch('/?state=not-valid-compressed-data');
    renderHook(() => useUrlState(base as Options));
    await act(async () => {});
    expect(base.onStateLoaded).not.toHaveBeenCalled();
    expect(base.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('shows an error when deserialization fails', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string');
    const encoded = compressToEncodedURIComponent(JSON.stringify({ value: 1 }));
    setHashSearch(`/?state=${encoded}`);
    const opts = {
      ...base,
      deserialize: () => ({ success: false, error: 'bad payload' }),
    };
    renderHook(() => useUrlState(opts as Options));
    await act(async () => {});
    expect(base.onStateLoaded).not.toHaveBeenCalled();
    expect(opts.showToast).toHaveBeenCalledWith('bad payload', 'error');
  });

  it('loads and applies state from a valid shared URL', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string');
    const encoded = compressToEncodedURIComponent(JSON.stringify({ value: 42 }));
    setHashSearch(`/?state=${encoded}`);
    renderHook(() => useUrlState(base as Options));
    await act(async () => {});
    expect(base.onStateLoaded).toHaveBeenCalledWith({ value: 42 });
    expect(base.showToast).toHaveBeenCalledWith('Loaded state from shared URL', 'success');
  });

  it('surfaces unknown (non-Error) failures as a generic message', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string');
    // valid compression of invalid JSON
    const encoded = compressToEncodedURIComponent('this is not json');
    setHashSearch(`/?state=${encoded}`);
    renderHook(() => useUrlState(base as Options));
    await act(async () => {});
    expect(base.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('creates a share URL and copies it to the clipboard when no share/title', async () => {
    const { result } = renderHook(() => useUrlState(base as Options));
    const url = await act(async () => result.current.createShareUrl());
    expect(url).toContain('state=');
    expect(url).toContain('tool=test-tool');
    expect(
      navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>
    ).toHaveBeenCalledWith(url);
    expect(base.showToast).toHaveBeenCalledWith('Share URL copied to clipboard', 'success');
  });

  it('returns the share URL when navigator.share is aborted by the user', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    const { result } = renderHook(() => useUrlState(base as Options));
    const url = await act(async () => result.current.createShareUrl('My title'));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My title', url: expect.any(String) })
    );
    expect(typeof url).toBe('string');
    expect(url).toContain('state=');
    expect(base.showToast).toHaveBeenCalledWith('Share URL copied to clipboard', 'success');
  });

  it('treats a non-AbortError share rejection as a failure', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('not allowed'), { name: 'NotAllowedError' }));
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    const { result } = renderHook(() => useUrlState(base as Options));
    const url = await act(async () => result.current.createShareUrl('My title'));
    expect(url).toBeNull();
    expect(base.showToast).toHaveBeenCalledWith('not allowed', 'error');
  });

  it('treats a non-object share rejection as a failure with a generic message', async () => {
    const share = vi.fn().mockRejectedValue('plain failure');
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    const { result } = renderHook(() => useUrlState(base as Options));
    const url = await act(async () => result.current.createShareUrl('My title'));
    expect(url).toBeNull();
    expect(base.showToast).toHaveBeenCalledWith('Failed to create share URL', 'error');
  });

  it('reports a failure when the serializer throws', async () => {
    const opts = {
      ...base,
      serialize: () => {
        throw new Error('cannot serialize');
      },
    };
    const { result } = renderHook(() => useUrlState(opts as Options));
    const url = await act(async () => result.current.createShareUrl());
    expect(url).toBeNull();
    expect(base.showToast).toHaveBeenCalledWith('cannot serialize', 'error');
  });
});
