import { z } from 'zod'
import type { CanonicalMetadataProvider, CanonicalTrack } from './CanonicalMetadataProvider.ts'
const responseSchema = z.object({
  results: z.object({
    songs: z
      .object({
        data: z.array(
          z.object({
            id: z.string(),
            attributes: z.object({
              name: z.string(),
              artistName: z.string(),
              albumName: z.string().optional(),
              durationInMillis: z.number().optional(),
              isrc: z.string().optional(),
            }),
          }),
        ),
      })
      .optional(),
  }),
})
/** Server-side only. Apple developer token never enters the client module graph. */
export class AppleMusicMetadataProvider implements CanonicalMetadataProvider {
  constructor(
    private readonly token: string,
    private readonly storefront = 'us',
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async search(query: string, signal?: AbortSignal): Promise<CanonicalTrack[]> {
    const url = new URL(`https://api.music.apple.com/v1/catalog/${this.storefront}/search`)
    url.search = new URLSearchParams({ term: query, types: 'songs', limit: '10' }).toString()
    const response = await this.fetcher(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      signal,
    })
    if (!response.ok) throw new Error('Canonical metadata unavailable')
    return (responseSchema.parse(await response.json()).results.songs?.data ?? []).map(
      ({ id, attributes: a }) => ({
        id: `apple:${id}`,
        title: a.name,
        artistName: a.artistName,
        albumName: a.albumName,
        durationMs: a.durationInMillis,
        isrc: a.isrc,
      }),
    )
  }
}
