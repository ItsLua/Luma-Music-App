import { trackSchema, type Track } from '../types/music'
const DAY = 86400000
/** Keep video references, but never retain stale provider metadata beyond 29 days. */
export function currentTrack(value: unknown): Track | null {
  const parsed = trackSchema.safeParse(value)
  if (!parsed.success) return null
  const t = parsed.data
  if (Date.now() - t.metadataFetchedAt < 29 * DAY) return t
  return {
    ...t,
    title: 'Saved YouTube video',
    channelName: 'YouTube',
    artist: {
      id: '',
      name: 'YouTube',
      url: 'https://www.youtube.com',
      bio: null,
      artwork: { small: null, medium: null, large: null },
    },
    album: null,
    albumId: null,
    artwork: { small: null, medium: null, large: null },
    duration: 0,
    genre: null,
    releaseDate: null,
    explicit: null,
    plays: 0,
    versionType: 'unknown',
    authenticity: 'unknown',
    authenticityReasons: [],
    canonicalTrackId: undefined,
    isrc: undefined,
  }
}
const tracks = (value: unknown) =>
  Array.isArray(value) ? value.map(currentTrack).filter((t): t is Track => t !== null) : []
/** Filters obsolete provider records without losing playlist names, IDs, or preferences. */
export function migrateStoredValue(key: string, value: unknown): unknown {
  if (
    key === 'library' &&
    value &&
    typeof value === 'object' &&
    'likes' in value &&
    'history' in value
  )
    return { ...value, likes: tracks(value.likes), history: tracks(value.history) }
  if (key === 'playlists' && Array.isArray(value))
    return value
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({ ...p, tracks: tracks(p.tracks) }))
  if (
    key === 'session' &&
    value &&
    typeof value === 'object' &&
    'queue' in value &&
    Array.isArray(value.queue)
  ) {
    const old = value as {
      queue: Array<{ key: string; track: unknown }>
      index?: number
      position?: number
    }
    const selected = old.queue[old.index ?? -1]?.key
    const queue = old.queue.flatMap((item) => {
      const track = currentTrack(item?.track)
      return track ? [{ key: item.key, track }] : []
    })
    const index = queue.findIndex((item) => item.key === selected)
    return {
      ...value,
      queue,
      index: index >= 0 ? index : queue.length ? 0 : -1,
      position: index >= 0 ? (old.position ?? 0) : 0,
      originalOrder: queue.map((i) => i.key),
    }
  }
  return value
}
