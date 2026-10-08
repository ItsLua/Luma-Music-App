import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCatalogCache, fetchCatalog } from '../../src/services/http'
beforeEach(() => clearCatalogCache())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('network reliability', () => {
  it('handles network failure without exposing internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('private network detail')))
    await expect(fetchCatalog('https://example.com')).rejects.toThrow('Check your connection')
  })
  it('handles HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(fetchCatalog('https://example.com')).rejects.toThrow('unavailable')
  })
  it('honors Retry-After and prevents retry storms', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '90' } }))
    vi.stubGlobal('fetch', fetcher)
    await expect(fetchCatalog('https://example.com')).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 90,
    })
    await expect(fetchCatalog('https://example.com/other')).rejects.toThrow('busy')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('caches metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"data":[]}'))
    vi.stubGlobal('fetch', fetcher)
    await fetchCatalog('https://example.com')
    await fetchCatalog('https://example.com')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('supports cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchCatalog('https://example.com', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
  it('times out hung requests', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
          }),
      ),
    )
    const request = expect(fetchCatalog('https://example.com')).rejects.toThrow('took too long')
    await vi.advanceTimersByTimeAsync(15_001)
    await request
  })
})
