import { CatalogService, ApiError, type Env } from './catalog.ts'
export type { Env } from './catalog.ts'
let currentConfig: string | undefined
let service: CatalogService | undefined
const localLimits = new Map<string, { count: number; expires: number }>()
const safeJson = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  })
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname !== '/api/music') return safeJson({ error: 'Not found' }, 404)
  if (request.method !== 'GET') return safeJson({ error: 'Method not allowed' }, 405)
  const origin = request.headers.get('Origin')
  if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site')
    return safeJson({ error: 'Cross-site requests are not allowed' }, 403)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (env.SEARCH_LIMITER) {
    if (!(await env.SEARCH_LIMITER.limit({ key: ip })).success)
      return safeJson({ error: 'Too many catalog requests. Try again in a minute.' }, 429)
  } else {
    const now = Date.now(),
      hit = localLimits.get(ip)
    if (hit && hit.expires > now) {
      if (++hit.count > 60)
        return safeJson({ error: 'Too many catalog requests. Try again in a minute.' }, 429)
    } else {
      if (localLimits.size > 1000) localLimits.clear()
      localLimits.set(ip, { count: 1, expires: now + 60_000 })
    }
  }
  try {
    const config = JSON.stringify([
      env.YOUTUBE_API_KEY,
      env.APPLE_MUSIC_DEVELOPER_TOKEN,
      env.APPLE_MUSIC_STOREFRONT,
      env.VERIFIED_ARTIST_CHANNELS,
      env.YOUTUBE_REGION,
    ])
    if (!service || currentConfig !== config) {
      service = new CatalogService(env)
      currentConfig = config
    }
    const op = url.searchParams.get('op') ?? 'search',
      q = (url.searchParams.get('q') ?? '').trim(),
      id = url.searchParams.get('id') ?? '',
      pageToken = url.searchParams.get('pageToken') ?? undefined
    if (q.length > 150 || (pageToken && !/^[\w=-]{1,512}$/.test(pageToken)))
      throw new ApiError('Invalid search request.', 400)
    const allowed = ['op', 'q', 'id', 'pageToken']
    if ([...url.searchParams.keys()].some((k) => !allowed.includes(k)))
      throw new ApiError('Invalid catalog parameter.', 400)
    if (op === 'search') {
      if (!q) throw new ApiError('Enter a song or artist.', 400)
      return safeJson(await service.search(q, pageToken))
    }
    if (op === 'featured') return safeJson(await service.featured())
    if (op === 'track') {
      if (!/^[\w-]{11}$/.test(id)) throw new ApiError('Invalid video ID.', 400)
      const tracks = await service.videos([id])
      if (!tracks.length)
        throw new ApiError('This YouTube video is unavailable or cannot be embedded.', 404)
      return safeJson({ tracks })
    }
    if (op === 'artist' || op === 'artistTracks') {
      if (!/^UC[\w-]{22}$/.test(id)) throw new ApiError('Invalid channel ID.', 400)
      return safeJson(
        op === 'artist' ? await service.artist(id) : await service.search('', pageToken, id),
      )
    }
    throw new ApiError('Unknown catalog request.', 400)
  } catch (error) {
    return safeJson(
      {
        error:
          error instanceof ApiError
            ? error.message
            : 'The music catalog is unavailable. Please retry.',
      },
      error instanceof ApiError ? error.status : 502,
    )
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env)
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 })
  },
}
