import { mapYouTubeVideo } from '../src/music/youtube/youtubeTypes'
import type { Track } from '../src/types/music'
const fixtureTime = Date.now()
/** Test-only data. Never imported by production modules. */
export function rawTrack(id = 'testA', title = `Test track ${id}`) {
  return {
    id: id.padEnd(11, '_').slice(0, 11),
    snippet: {
      title,
      channelId: 'UCabcdefghijklmnopqrstuv',
      channelTitle: 'Test artist',
      publishedAt: '2026-10-01',
      thumbnails: {},
    },
    contentDetails: { duration: 'PT20S' },
    status: { embeddable: true, privacyStatus: 'public', uploadStatus: 'processed' },
  }
}
export function track(id = 'testA'): Track {
  return { ...mapYouTubeVideo(rawTrack(id))!, id, metadataFetchedAt: fixtureTime }
}
