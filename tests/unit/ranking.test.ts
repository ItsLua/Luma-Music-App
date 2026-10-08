import { describe, expect, it } from 'vitest'
import { classifyVersion } from '../../src/music/ranking/VersionClassifier'
import { parseSearchIntent } from '../../src/music/ranking/SearchIntentParser'
import { rankResults } from '../../src/music/ranking/ResultRanker'
import { scoreOfficiality } from '../../src/music/ranking/OfficialityScorer'
import { track } from '../fixtures'
import type { Track } from '../../src/types/music'
const canonical = [
  {
    id: 'apple:1',
    title: 'Blinding Lights',
    artistName: 'The Weeknd',
    durationMs: 200000,
    isrc: 'TEST00000001',
  },
]
const song = (id: string, title: string, channelName = 'The Weeknd'): Track => ({
  ...track(id),
  title,
  channelName,
  artist: { ...track().artist, name: channelName },
  versionType: classifyVersion(title),
  duration: 200,
})
const original = song('original', 'The Weeknd - Blinding Lights (Official Audio)')
const cover = song('cover', 'The Weeknd Blinding Lights cover', 'Random Singer')
const slowed = song('slowed', 'The Weeknd Blinding Lights slowed + reverb', 'Slow channel')
const topic = song('topic', 'Blinding Lights', 'The Weeknd - Topic')
describe('version classification and explicit intent', () => {
  it.each([
    ['slowed + reverb', 'slowed'],
    ['sped up', 'sped-up'],
    ['nightcore', 'sped-up'],
    ['live at Wembley', 'live'],
    ['concert', 'live'],
    ['remix', 'remix'],
    ['acoustic', 'acoustic'],
    ['unplugged', 'acoustic'],
    ['karaoke', 'instrumental'],
    ['cover', 'cover'],
    ['covered by', 'cover'],
    ['unreleased', 'unreleased'],
    ['leak', 'unreleased'],
    ['demo', 'unreleased'],
    ['lyrics', 'lyrics'],
    ['official music video', 'music-video'],
  ])('%s => %s', (title, version) => expect(classifyVersion(title)).toBe(version))
  it('does not match substrings', () =>
    expect(classifyVersion('Alive and discovered')).toBe('unknown'))
  it.each([
    ['The Weeknd Blinding Lights', undefined],
    ['The Weeknd Blinding Lights slowed', 'slowed'],
    ['Eagles Hotel California live', 'live'],
    ['Juice WRLD unreleased', 'unreleased'],
    ['Bruno Mars cover', 'cover'],
    ['Starboy remix', 'remix'],
  ])('preserves intent: %s', (q, version) => {
    const intent = parseSearchIntent(q)
    expect(intent.rawQuery).toBe(q)
    expect(intent.requestedVersion).toBe(version)
  })
})
describe('conservative identity and ranking', () => {
  it('ranks original artist and matched Topic above random covers', () => {
    const ranked = rankResults(
      [cover, slowed, topic, original],
      'The Weeknd Blinding Lights',
      canonical,
    )
    expect(ranked.slice(0, 2).map((t) => t.id)).toEqual(
      expect.arrayContaining(['topic', 'original']),
    )
    expect(ranked[3].id).toBe('cover')
  })
  it('prioritizes slowed versions when requested', () =>
    expect(
      rankResults([original, cover, slowed], 'The Weeknd Blinding Lights slowed', canonical)[0].id,
    ).toBe('slowed'))
  it.each([
    ['Eagles Hotel California live', 'Eagles - Hotel California (Live at Wembley)', 'live'],
    ['Starboy remix', 'The Weeknd Starboy remix', 'remix'],
    ['Juice WRLD unreleased', 'Juice WRLD unreleased snippet', 'unreleased'],
    ['Bruno Mars cover', 'Bruno Mars cover', 'cover'],
  ])('version intent: %s', (query, title, version) => {
    const result = rankResults(
      [
        song(
          'studio',
          title.replace(/live at wembley|remix|unreleased snippet|cover/gi, 'official audio'),
        ),
        song('version', title, 'Other channel'),
      ],
      query,
    )
    expect(result[0].versionType).toBe(version)
  })
  it('never verifies title wording alone', () =>
    expect(
      scoreOfficiality(
        song('spoof', 'The Weeknd Blinding Lights Official Audio', 'Random Official'),
        'The Weeknd Blinding Lights',
        canonical,
      ).classification,
    ).toBe('unknown'))
  it('does not treat arbitrary Topic names as artist identity', () =>
    expect(
      scoreOfficiality(
        song('fake', 'Blinding Lights', 'Random - Topic'),
        'The Weeknd Blinding Lights',
        canonical,
      ).classification,
    ).toBe('unknown'))
  it('requires both verified channel ID and canonical match for Official', () => {
    expect(scoreOfficiality(original, 'The Weeknd Blinding Lights', canonical).classification).toBe(
      'likely-official',
    )
    const trusted = [
      {
        channelId: original.artist.id,
        artistName: 'The Weeknd',
        sourceUrl: 'https://artist.example/links',
      },
    ]
    expect(
      scoreOfficiality(original, 'The Weeknd Blinding Lights', canonical, trusted).classification,
    ).toBe('official')
    expect(
      scoreOfficiality(original, 'The Weeknd Blinding Lights', [], trusted).classification,
    ).not.toBe('official')
  })
  it('still lowers covers without canonical credentials', () =>
    expect(rankResults([cover, slowed, original], 'The Weeknd Blinding Lights')[0].id).toBe(
      'original',
    ))
  it('retains canonical reference without claiming YouTube ISRC verification', () => {
    const result = rankResults([original], 'Blinding Lights', canonical)[0]
    expect(result.isrc).toBe('TEST00000001')
    expect(result.authenticityReasons.join(' ')).not.toContain('ISRC match')
  })
})
it('keeps a relevant cover above a completely unrelated original', () => {
  const unrelated = song(
    'unrelated',
    'Different artist - Different song Official Audio',
    'Different artist',
  )
  expect(rankResults([unrelated, cover], 'The Weeknd Blinding Lights')[0].id).toBe('cover')
})
it('relates compact VEVO channel handles to a matching artist title, without verifying them', () => {
  const vevo = song('vevo', 'The Weeknd - Blinding Lights (Official Video)', 'TheWeekndVEVO')
  expect(scoreOfficiality(vevo, 'The Weeknd Blinding Lights', []).classification).toBe(
    'likely-official',
  )
  expect(
    rankResults(
      [song('uploader', 'The Weeknd Blinding Lights', 'Random uploader'), cover, vevo],
      'The Weeknd Blinding Lights',
    )[0].id,
  ).toBe('vevo')
  expect(
    scoreOfficiality(
      song('mismatch', 'The Weeknd - Blinding Lights (Official Video)', 'SomeoneElseVEVO'),
      'The Weeknd Blinding Lights',
      [],
    ).classification,
  ).toBe('unknown')
})
