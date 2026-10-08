import { z } from 'zod'
import type { Track } from '../../types/music.ts'
import { safeHttpsUrl } from '../../utilities/safeUrl.ts'
import { classifyVersion } from '../ranking/VersionClassifier.ts'
export const videoSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  snippet: z.object({
    title: z.string(),
    channelId: z.string(),
    channelTitle: z.string(),
    publishedAt: z.string().optional(),
    thumbnails: z.record(z.string(), z.object({ url: z.string() })).optional(),
    liveBroadcastContent: z.string().optional(),
  }),
  contentDetails: z.object({
    duration: z.string(),
    contentRating: z.object({ ytRating: z.string().optional() }).optional(),
  }),
  status: z.object({
    embeddable: z.boolean(),
    privacyStatus: z.string(),
    uploadStatus: z.string().optional(),
  }),
})
export function durationSeconds(iso: string) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso)
  return m
    ? Number(m[1] ?? 0) * 86400 +
        Number(m[2] ?? 0) * 3600 +
        Number(m[3] ?? 0) * 60 +
        Number(m[4] ?? 0)
    : 0
}
export function mapYouTubeVideo(value: unknown): Track | null {
  const parsed = videoSchema.safeParse(value)
  if (!parsed.success) return null
  const v = parsed.data,
    s = v.snippet
  if (
    !v.status.embeddable ||
    v.status.privacyStatus !== 'public' ||
    (v.status.uploadStatus && v.status.uploadStatus !== 'processed') ||
    s.liveBroadcastContent === 'upcoming'
  )
    return null
  const img = (key: string) => safeHttpsUrl(s.thumbnails?.[key]?.url)
  const artwork = {
    small: img('default') ?? img('medium'),
    medium: img('medium') ?? img('high'),
    large: img('maxres') ?? img('standard') ?? img('high'),
  }
  return {
    id: v.id,
    provider: 'youtube',
    youtubeVideoId: v.id,
    channelName: s.channelTitle,
    playbackType: 'youtube-embed',
    title: s.title,
    artist: {
      id: s.channelId,
      name: s.channelTitle,
      url: `https://www.youtube.com/channel/${encodeURIComponent(s.channelId)}`,
      artwork: { small: null, medium: null, large: null },
      bio: null,
    },
    album: null,
    albumId: null,
    artwork,
    duration: durationSeconds(v.contentDetails.duration),
    genre: null,
    releaseDate: s.publishedAt ?? null,
    explicit: null,
    permalink: `https://www.youtube.com/watch?v=${v.id}`,
    plays: 0,
    versionType: classifyVersion(s.title),
    authenticity: 'unknown',
    authenticityReasons: [],
    metadataFetchedAt: Date.now(),
  }
}
