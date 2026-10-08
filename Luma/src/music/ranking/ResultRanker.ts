import type { Track } from '../../types/music.ts'
import type { CanonicalTrack } from '../metadata/CanonicalMetadataProvider.ts'
import { normalize, scoreOfficiality, type TrustedChannel } from './OfficialityScorer.ts'
import { parseSearchIntent } from './SearchIntentParser.ts'
export function rankResults(
  tracks: Track[],
  query: string,
  canonical: CanonicalTrack[] = [],
  trusted: TrustedChannel[] = [],
): Track[] {
  const intent = parseSearchIntent(query)
  return tracks
    .map((track, index) => {
      const evidence = scoreOfficiality(track, intent.baseQuery, canonical, trusted)
      const words = normalize(intent.baseQuery).split(' ').filter(Boolean)
      const haystack = normalize(`${track.title} ${track.channelName}`)
      const relevance = words.length
        ? words.filter((w) => ` ${haystack} `.includes(` ${w} `)).length / words.length
        : 1
      const requested = intent.requestedVersion
      const versionMatch =
        requested === 'original'
          ? ['original', 'music-video', 'unknown'].includes(track.versionType)
          : track.versionType === requested
      const alternate = !['original', 'music-video', 'unknown'].includes(track.versionType)
      // Explicit intent overrides originality only among relevant results. Stable ties retain API relevance order.
      const priority = requested ? (versionMatch ? 250 : -100) : alternate ? -200 : 0
      const updated: Track = {
        ...track,
        authenticity: evidence.classification,
        authenticityReasons: evidence.reasons,
        ...(evidence.canonical
          ? {
              canonicalTrackId: evidence.canonical.id,
              isrc: evidence.canonical.isrc,
              album: evidence.canonical.albumName ?? null,
            }
          : {}),
      }
      return { track: updated, rank: relevance * 1000 + priority + evidence.score, index }
    })
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((r) => r.track)
}
