import type { Track } from '../../types/music.ts'
import type { CanonicalTrack } from '../metadata/CanonicalMetadataProvider.ts'
export interface TrustedChannel {
  channelId: string
  artistName: string
  sourceUrl: string
}
export interface AuthenticityScore {
  score: number
  classification: Track['authenticity']
  reasons: string[]
  canonical?: CanonicalTrack
}
export const normalize = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const contains = (text: string, part: string) => Boolean(part) && ` ${text} `.includes(` ${part} `)
const sameIdentity = (a: string, b: string) =>
  Boolean(a && b) && normalize(a).replace(/\s/g, '') === normalize(b).replace(/\s/g, '')
export function scoreOfficiality(
  track: Track,
  query: string,
  canonical: CanonicalTrack[],
  trusted: TrustedChannel[] = [],
): AuthenticityScore {
  const title = normalize(track.title),
    channel = normalize(track.channelName),
    q = normalize(query)
  const reasons: string[] = []
  const baseChannel = channel
    .replace(/ topic$/, '')
    .replace(/vevo$/, '')
    .trim()
  const match = canonical.find(
    (c) =>
      contains(title, normalize(c.title)) &&
      (contains(title, normalize(c.artistName)) || sameIdentity(baseChannel, c.artistName)),
  )
  // Compact VEVO handles still need an artist relationship from canonical data or the title/query.
  const titleArtist = track.title.match(/^(.+?)\s+[-–—]\s+/)?.[1] ?? ''
  const titleArtistMatch =
    sameIdentity(baseChannel, titleArtist) &&
    (contains(q, normalize(titleArtist)) || contains(title, q))
  const artist =
    match?.artistName ??
    (contains(q, baseChannel) ? baseChannel : titleArtistMatch ? titleArtist : '')
  const identity = sameIdentity(artist, baseChannel)
  const verified = trusted.find(
    (c) => c.channelId === track.artist.id && normalize(c.artistName) === normalize(artist),
  )
  let score = 0
  if (match) {
    score += 35
    reasons.push('Canonical title and artist match')
  }
  if (identity) {
    score += 24
    reasons.push('Channel name matches the identified artist')
  }
  if (identity && / topic$/.test(channel)) {
    score += 14
    reasons.push('Artist-matched Topic channel name (not verification)')
  }
  if (identity && /vevo$/.test(channel)) {
    score += 10
    reasons.push('Artist-matched VEVO channel name (not verification)')
  }
  if (/\bofficial (?:audio|music video|video)\b/i.test(track.title)) {
    score += 5
    reasons.push('Title describes official audio/video (uploader supplied)')
  }
  if (match?.durationMs && Math.abs(track.duration * 1000 - match.durationMs) < 12000) {
    score += 12
    reasons.push('Duration is close to canonical recording')
  }
  if (verified && match) {
    score += 40
    reasons.push(`Channel ID independently verified: ${verified.sourceUrl}`)
  }
  const alternate = !['unknown', 'original', 'music-video'].includes(track.versionType)
  if (alternate) {
    score -= track.versionType === 'cover' ? 90 : 65
    reasons.push(`Title indicates ${track.versionType}; classification is inferred`)
  }
  const classification =
    track.versionType === 'cover'
      ? 'cover'
      : alternate
        ? 'alternate'
        : verified && match
          ? 'official'
          : identity && score >= 38
            ? 'likely-official'
            : 'unknown'
  return { score, classification, reasons, canonical: match }
}
