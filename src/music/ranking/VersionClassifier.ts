import type { VersionType } from '../../types/music.ts'
export const versionPatterns: Array<[VersionType, RegExp]> = [
  ['slowed', /\b(slowed|slow\s*(?:down|version)|reverb)\b/i],
  ['sped-up', /\b(sped[ -]?up|speed[ -]?up|nightcore)\b/i],
  ['cover', /\b(covers?|covered by)\b/i],
  ['unreleased', /\b(unreleased|leaks?|demo|snippet)\b/i],
  ['acoustic', /\b(acoustic|unplugged)\b/i],
  ['instrumental', /\b(instrumental|karaoke)\b/i],
  ['live', /\b(live(?: at)?|concert|performance)\b/i],
  ['remix', /\b(remix|edit|mix|mashup)\b/i],
  ['lyrics', /\b(lyrics?|lyric video)\b/i],
]
/** Metadata-derived hints, not provider-certified release types. */
export function classifyVersion(title: string): VersionType {
  for (const [version, pattern] of versionPatterns) if (pattern.test(title)) return version
  if (/\b(?:official )?(?:music video|official video)\b/i.test(title)) return 'music-video'
  if (/\b(?:official audio|original|studio version)\b/i.test(title)) return 'original'
  return 'unknown'
}
export const versionLabels: Record<VersionType, string> = {
  original: 'Original',
  'music-video': 'Music video',
  live: 'Live',
  slowed: 'Slowed',
  'sped-up': 'Sped up',
  remix: 'Remix',
  cover: 'Cover',
  acoustic: 'Acoustic',
  instrumental: 'Instrumental',
  unreleased: 'Unreleased',
  lyrics: 'Lyrics',
  alternate: 'Alternate version',
  unknown: 'YouTube',
}
