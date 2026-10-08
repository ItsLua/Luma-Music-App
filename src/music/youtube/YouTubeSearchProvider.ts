import { z } from 'zod'
import {
  artistSchema,
  trackSchema,
  type MusicCatalog,
  type SearchResult,
  type Track,
} from '../../types/music.ts'
import { fetchCatalog } from '../../services/http.ts'
const searchSchema = z.object({
  tracks: z.array(trackSchema),
  nextPageToken: z.string().optional(),
  metadataStatus: z.enum(['matched', 'unconfigured', 'unavailable']).optional(),
})
export class YouTubeSearchProvider implements MusicCatalog {
  private request(params: Record<string, string>, signal?: AbortSignal) {
    return fetchCatalog(`/api/music?${new URLSearchParams(params)}`, signal)
  }
  async searchTracks(
    query: string,
    signal?: AbortSignal,
    pageToken?: string,
  ): Promise<SearchResult> {
    return searchSchema.parse(
      await this.request({ op: 'search', q: query, ...(pageToken ? { pageToken } : {}) }, signal),
    )
  }
  async getTrack(id: string, signal?: AbortSignal) {
    const result = searchSchema.parse(await this.request({ op: 'track', id }, signal))
    if (!result.tracks[0]) throw new Error('Video unavailable')
    return result.tracks[0]
  }
  async getFeaturedTracks(genre?: string, signal?: AbortSignal) {
    return genre
      ? (await this.searchTracks(`${genre} music`, signal)).tracks
      : searchSchema.parse(await this.request({ op: 'featured' }, signal)).tracks
  }
  async getRecentTracks(signal?: AbortSignal) {
    return (await this.searchTracks('music live performance', signal)).tracks
  }
  async getRecommendations(_seed: Track | undefined, signal?: AbortSignal) {
    return (await this.searchTracks('music slowed reverb', signal)).tracks
  }
  async getArtist(id: string, signal?: AbortSignal) {
    return artistSchema.parse(await this.request({ op: 'artist', id }, signal))
  }
  async getArtistTracks(id: string, signal?: AbortSignal) {
    return searchSchema.parse(await this.request({ op: 'artistTracks', id }, signal)).tracks
  }
  async getAlbum(): Promise<never> {
    throw new Error(
      'This old catalog collection is unavailable. Your Luma playlists are in Library.',
    )
  }
}
