import { expect, it, vi, beforeEach } from 'vitest'
import { CatalogService } from '../../server/catalog'
import { handleApi } from '../../server/index'
import { MetadataCache } from '../../server/cache'
import { mapYouTubeVideo, durationSeconds } from '../../src/music/youtube/youtubeTypes'
import { migrateStoredValue, currentTrack } from '../../src/services/storageMigration'
import { rawTrack, track } from '../fixtures'
import { clearCatalogCache, fetchCatalog } from '../../src/services/http'
beforeEach(() => clearCatalogCache())
it('normalizes YouTube metadata and rejects non-embeddable videos', () => {
  expect(mapYouTubeVideo(rawTrack())).toMatchObject({
    provider: 'youtube',
    playbackType: 'youtube-embed',
    duration: 20,
  })
  expect(
    mapYouTubeVideo({ ...rawTrack(), status: { embeddable: false, privacyStatus: 'public' } }),
  ).toBeNull()
  expect(
    mapYouTubeVideo({ ...rawTrack(), status: { embeddable: true, privacyStatus: 'private' } }),
  ).toBeNull()
  expect(durationSeconds('PT1H2M3S')).toBe(3723)
  expect(mapYouTubeVideo({ id: 'bad' })).toBeNull()
})
it('uses official search options, server headers, pagination and cache', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input))
    return Response.json(
      url.pathname.endsWith('/search')
        ? { items: [{ id: { videoId: rawTrack().id } }], nextPageToken: 'PAGE2' }
        : { items: [rawTrack()] },
    )
  })
  const service = new CatalogService({ YOUTUBE_API_KEY: 'test-only' }, fetcher)
  const result = await service.search('The Weeknd Blinding Lights', 'PAGE1')
  expect(result.nextPageToken).toBe('PAGE2')
  expect(result.tracks).toHaveLength(1)
  const url = new URL(String(fetcher.mock.calls[0][0]))
  expect(url.searchParams.get('videoEmbeddable')).toBe('true')
  expect(url.searchParams.has('videoSyndicated')).toBe(false)
  expect(url.searchParams.get('type')).toBe('video')
  expect(url.searchParams.get('pageToken')).toBe('PAGE1')
  expect(url.searchParams.has('key')).toBe(false)
  await service.search('The Weeknd Blinding Lights', 'PAGE1')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('degrades gracefully when canonical metadata fails', async () => {
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input))
    if (url.host === 'api.music.apple.com') return new Response('', { status: 503 })
    return Response.json(
      url.pathname.endsWith('/search')
        ? { items: [{ id: { videoId: rawTrack().id } }] }
        : { items: [rawTrack()] },
    )
  })
  const result = await new CatalogService(
    { YOUTUBE_API_KEY: 'test', APPLE_MUSIC_DEVELOPER_TOKEN: 'test' },
    fetcher,
  ).search('Test')
  expect(result.tracks).toHaveLength(1)
  expect(result.metadataStatus).toBe('unavailable')
})
it('reports quota failures without fallback tracks', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 }),
    )
  await expect(
    new CatalogService({ YOUTUBE_API_KEY: 'test' }, fetcher).search('song'),
  ).rejects.toMatchObject({ status: 429 })
})
it('server validates configuration, input, origin and rate limits', async () => {
  expect((await handleApi(new Request('https://luma.example/api/music?q=hello'), {})).status).toBe(
    503,
  )
  expect(
    (await handleApi(new Request('https://luma.example/api/music?op=track&id=bad'), {})).status,
  ).toBe(400)
  expect(
    (
      await handleApi(
        new Request('https://luma.example/api/music?q=a', {
          headers: { Origin: 'https://elsewhere.example' },
        }),
        {},
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await handleApi(new Request('https://luma.example/api/music?q=a'), {
        SEARCH_LIMITER: { limit: async () => ({ success: false }) },
      })
    ).status,
  ).toBe(429)
})
it('coalesces simultaneous cache misses and expires entries', async () => {
  vi.useFakeTimers()
  const cache = new MetadataCache(1000),
    loader = vi.fn(async () => [1])
  await Promise.all([cache.get('q', loader), cache.get('q', loader)])
  expect(loader).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1001)
  await cache.get('q', loader)
  expect(loader).toHaveBeenCalledTimes(2)
  vi.useRealTimers()
})
it('deduplicates browser requests without letting one caller cancel another', async () => {
  let finish: (r: Response) => void = () => {}
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((r) => {
        finish = r
      }),
  )
  vi.stubGlobal('fetch', fetcher)
  const controller = new AbortController()
  const first = fetchCatalog('/api/music?q=x', controller.signal),
    second = fetchCatalog('/api/music?q=x')
  const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  finish(Response.json({ tracks: [] }))
  await cancelled
  expect(await second).toEqual({ tracks: [] })
  expect(fetcher).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})
it('migrates retired-provider storage per entry and preserves playlists/preferences', () => {
  const old = { ...track(), provider: 'audius' },
    current = track('current')
  expect(migrateStoredValue('library', { likes: [old, current], history: [old] })).toEqual({
    likes: [current],
    history: [],
  })
  expect(
    migrateStoredValue('playlists', [
      { id: 'p', name: 'My list', createdAt: 1, tracks: [old, current] },
    ]),
  ).toEqual([{ id: 'p', name: 'My list', createdAt: 1, tracks: [current] }])
  const session = migrateStoredValue('session', {
    queue: [
      { key: 'a', track: old },
      { key: 'b', track: current },
    ],
    index: 1,
    position: 8,
    volume: 0.5,
  })
  expect(session).toMatchObject({
    index: 0,
    position: 8,
    volume: 0.5,
    queue: [{ key: 'b', track: current }],
  })
})
it('expires provider metadata while retaining user video references', () => {
  const expired = currentTrack({ ...track(), metadataFetchedAt: Date.now() - 30 * 86400000 })
  expect(expired?.youtubeVideoId).toBe(track().youtubeVideoId)
  expect(expired?.title).toBe('Saved YouTube video')
  expect(expired?.authenticity).toBe('unknown')
})
it('explains website-restricted credentials without disclosing upstream details', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json(
      {
        error: {
          errors: [{ reason: 'forbidden' }],
          details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }],
        },
      },
      { status: 403 },
    ),
  )
  await expect(
    new CatalogService({ YOUTUBE_API_KEY: 'test' }, fetcher).search('song'),
  ).rejects.toThrow('private server key')
})
it('maps optional canonical Apple metadata and keeps authorization server-side', async () => {
  const { AppleMusicMetadataProvider } =
    await import('../../src/music/metadata/AppleMusicMetadataProvider')
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      results: {
        songs: {
          data: [
            {
              id: '1',
              attributes: {
                name: 'Blinding Lights',
                artistName: 'The Weeknd',
                albumName: 'After Hours',
                durationInMillis: 200000,
                isrc: 'TEST00000001',
              },
            },
          ],
        },
      },
    }),
  )
  const tracks = await new AppleMusicMetadataProvider('test-token', 'us', fetcher).search(
    'Blinding Lights',
  )
  expect(tracks[0]).toMatchObject({
    id: 'apple:1',
    title: 'Blinding Lights',
    durationMs: 200000,
    isrc: 'TEST00000001',
  })
  expect(fetcher.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer test-token' })
  expect(String(fetcher.mock.calls[0][0])).not.toContain('test-token')
})
