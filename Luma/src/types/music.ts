import { z } from 'zod'
import { safeHttpsUrl } from '../utilities/safeUrl.ts'
const httpsUrl = z
  .string()
  .refine((value) => safeHttpsUrl(value) !== null, 'Expected a safe HTTPS URL')
export const artworkSchema = z.object({
  small: httpsUrl.nullable(),
  medium: httpsUrl.nullable(),
  large: httpsUrl.nullable(),
})
export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  artwork: artworkSchema,
  url: httpsUrl,
  bio: z.string().nullable(),
})
export const trackSchema = z.object({
  id: z.string(),
  provider: z.literal('youtube'),
  youtubeVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  channelName: z.string(),
  playbackType: z.literal('youtube-embed'),
  versionType: z.enum([
    'original',
    'music-video',
    'live',
    'slowed',
    'sped-up',
    'remix',
    'cover',
    'acoustic',
    'instrumental',
    'unreleased',
    'lyrics',
    'alternate',
    'unknown',
  ]),
  authenticity: z.enum(['official', 'likely-official', 'alternate', 'cover', 'unknown']),
  authenticityReasons: z.array(z.string()),
  canonicalTrackId: z.string().optional(),
  isrc: z.string().optional(),
  metadataFetchedAt: z.number(),
  title: z.string(),
  artist: artistSchema,
  album: z.string().nullable(),
  albumId: z.string().nullable(),
  artwork: artworkSchema,
  duration: z.number().nonnegative(),
  genre: z.string().nullable(),
  releaseDate: z.string().nullable(),
  explicit: z.boolean().nullable(),
  permalink: httpsUrl,
  plays: z.number().nonnegative(),
})
export type Track = z.infer<typeof trackSchema>
export type Artist = z.infer<typeof artistSchema>
export type Artwork = z.infer<typeof artworkSchema>
export interface Album {
  id: string
  title: string
  artist: Artist
  artwork: Artwork
  tracks: Track[]
  url: string
}
export const playlistSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  createdAt: z.number(),
  tracks: z.array(trackSchema).max(500),
})
export type Playlist = z.infer<typeof playlistSchema>
export const queueItemSchema = z.object({ key: z.string(), track: trackSchema })
export type QueueItem = z.infer<typeof queueItemSchema>
export type PlaybackStatus =
  'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'failed'
export type RepeatMode = 'off' | 'one' | 'all'
export interface SearchResult {
  tracks: Track[]
  nextPageToken?: string
  metadataStatus?: 'matched' | 'unconfigured' | 'unavailable'
}
export type VersionType = Track['versionType']
export interface MusicCatalog {
  searchTracks(query: string, signal?: AbortSignal, pageToken?: string): Promise<SearchResult>
  getTrack(id: string, signal?: AbortSignal): Promise<Track>
  getFeaturedTracks(genre?: string, signal?: AbortSignal): Promise<Track[]>
  getRecentTracks(signal?: AbortSignal): Promise<Track[]>
  getRecommendations(seed: Track | undefined, signal?: AbortSignal): Promise<Track[]>
  getArtist(id: string, signal?: AbortSignal): Promise<Artist>
  getArtistTracks(id: string, signal?: AbortSignal): Promise<Track[]>
  getAlbum(id: string, signal?: AbortSignal): Promise<Album>
}
