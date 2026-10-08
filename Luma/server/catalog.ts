import { z } from 'zod'
import { MetadataCache } from './cache.ts'
import { mapYouTubeVideo } from '../src/music/youtube/youtubeTypes.ts'
import { rankResults } from '../src/music/ranking/ResultRanker.ts'
import { parseSearchIntent } from '../src/music/ranking/SearchIntentParser.ts'
import { AppleMusicMetadataProvider } from '../src/music/metadata/AppleMusicMetadataProvider.ts'
import type { CanonicalTrack } from '../src/music/metadata/CanonicalMetadataProvider.ts'
import type { Artist, SearchResult, Track } from '../src/types/music.ts'
import { safeHttpsUrl } from '../src/utilities/safeUrl.ts'
export interface Env {
  YOUTUBE_API_KEY?: string
  APPLE_MUSIC_DEVELOPER_TOKEN?: string
  APPLE_MUSIC_STOREFRONT?: string
  VERIFIED_ARTIST_CHANNELS?: string
  YOUTUBE_REGION?: string
  ASSETS?: { fetch(request: Request): Promise<Response> }
  SEARCH_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message)
  }
}
const listSchema = z.object({ items: z.array(z.unknown()), nextPageToken: z.string().optional() })
const trustedSchema = z
  .array(
    z.object({
      channelId: z.string().regex(/^UC[\w-]{22}$/),
      artistName: z.string().min(1),
      sourceUrl: z.url().refine((v) => v.startsWith('https://')),
    }),
  )
  .max(1000)
const searchItem = z.object({ id: z.object({ videoId: z.string() }) })
export class CatalogService {
  readonly cache = new MetadataCache()
  private quotaUntil = 0
  private canonicalCache = new MetadataCache(3_600_000)
  constructor(
    private readonly env: Env,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  private async youtube(path: string, params: Record<string, string>) {
    if (!this.env.YOUTUBE_API_KEY)
      throw new ApiError(
        'YouTube search is not configured. Add YOUTUBE_API_KEY to the server environment.',
        503,
      )
    if (Date.now() < this.quotaUntil)
      throw new ApiError('YouTube API quota is temporarily exhausted. Please try later.', 429)
    return this.cache.get(`yt:${path}:${new URLSearchParams(params)}`, async () => {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
      url.search = new URLSearchParams(params).toString()
      const response = await this.fetcher(url, {
        headers: { 'X-Goog-Api-Key': this.env.YOUTUBE_API_KEY!, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const reason = z
          .object({
            error: z.object({
              errors: z.array(z.object({ reason: z.string() })).optional(),
              details: z
                .array(z.object({ reason: z.string().optional() }).passthrough())
                .optional(),
            }),
          })
          .safeParse(body)
        const quota =
          reason.success &&
          reason.data.error.errors?.some((e) => /quota|rateLimit|dailyLimit/i.test(e.reason))
        const detailReasons = reason.success ? reason.data.error.details?.map((d) => d.reason) : []
        if (detailReasons?.includes('API_KEY_HTTP_REFERRER_BLOCKED'))
          throw new ApiError(
            'This YouTube key only allows website requests. Configure a private server key restricted to YouTube Data API v3.',
            503,
          )
        if (detailReasons?.includes('SERVICE_DISABLED'))
          throw new ApiError(
            'Enable YouTube Data API v3 in the Google Cloud project that owns this key.',
            503,
          )
        if (quota || response.status === 429) {
          this.quotaUntil = Date.now() + 60000
          throw new ApiError('YouTube API quota is temporarily exhausted. Please try later.', 429)
        }
        throw new ApiError(
          response.status === 403
            ? 'YouTube API access was denied. Check server key restrictions and API enablement.'
            : 'YouTube is unavailable. Please try again.',
          502,
        )
      }
      return listSchema.parse(await response.json())
    })
  }
  private trusted() {
    if (!this.env.VERIFIED_ARTIST_CHANNELS) return []
    const parsed = trustedSchema.safeParse(JSON.parse(this.env.VERIFIED_ARTIST_CHANNELS))
    if (!parsed.success)
      throw new ApiError('The server channel-verification configuration is invalid.', 503)
    return parsed.data
  }
  async videos(ids: string[]): Promise<Track[]> {
    if (!ids.length) return []
    const result = await this.youtube('videos', {
      part: 'snippet,contentDetails,status',
      id: ids.slice(0, 50).join(','),
    })
    return result.items.map(mapYouTubeVideo).filter((t): t is Track => t !== null)
  }
  async search(query: string, pageToken?: string, channelId?: string): Promise<SearchResult> {
    const intent = parseSearchIntent(query)
    let metadataStatus: SearchResult['metadataStatus'] = 'unconfigured'
    const metadataTask = (async () => {
      if (!this.env.APPLE_MUSIC_DEVELOPER_TOKEN) return [] as CanonicalTrack[]
      try {
        const result = await this.canonicalCache.get(intent.baseQuery, () =>
          new AppleMusicMetadataProvider(
            this.env.APPLE_MUSIC_DEVELOPER_TOKEN!,
            this.env.APPLE_MUSIC_STOREFRONT ?? 'us',
            this.fetcher,
          ).search(intent.baseQuery, AbortSignal.timeout(4000)),
        )
        metadataStatus = 'matched'
        return result
      } catch {
        metadataStatus = 'unavailable'
        return [] as CanonicalTrack[]
      }
    })()
    // Keep the user's version intent intact. Do not restrict category: rare uploads may be uncategorized.
    const result = await this.youtube('search', {
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: '25',
      videoEmbeddable: 'true',
      order: 'relevance',
      ...(pageToken ? { pageToken } : {}),
      ...(channelId ? { channelId } : {}),
      regionCode: this.env.YOUTUBE_REGION ?? 'US',
    })
    const ids = result.items
      .map((i) => searchItem.safeParse(i))
      .flatMap((i) => (i.success ? [i.data.id.videoId] : []))
    const [tracks, canonical] = await Promise.all([this.videos(ids), metadataTask])
    return {
      tracks: rankResults(tracks, query, canonical, this.trusted()),
      nextPageToken: result.nextPageToken,
      metadataStatus,
    }
  }
  async featured(): Promise<SearchResult> {
    const result = await this.youtube('videos', {
      part: 'snippet,contentDetails,status',
      chart: 'mostPopular',
      videoCategoryId: '10',
      maxResults: '25',
      regionCode: this.env.YOUTUBE_REGION ?? 'US',
    })
    return { tracks: result.items.map(mapYouTubeVideo).filter((t): t is Track => t !== null) }
  }
  async artist(id: string): Promise<Artist> {
    const result = await this.youtube('channels', { part: 'snippet', id })
    const raw = z
      .object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string(),
          thumbnails: z.record(z.string(), z.object({ url: z.string() })),
        }),
      })
      .safeParse(result.items[0])
    if (!raw.success) throw new ApiError('This YouTube channel is unavailable.', 404)
    const { snippet: s } = raw.data
    return {
      id,
      name: s.title,
      bio: s.description,
      url: `https://www.youtube.com/channel/${id}`,
      artwork: {
        small: safeHttpsUrl(s.thumbnails.default?.url),
        medium: safeHttpsUrl(s.thumbnails.medium?.url),
        large: safeHttpsUrl(s.thumbnails.high?.url),
      },
    }
  }
}
