import { create } from 'zustand'
import { z } from 'zod'
import {
  queueItemSchema,
  type PlaybackStatus,
  type QueueItem,
  type RepeatMode,
  type Track,
} from '../types/music'
import { localRepository } from '../services/storage'
import { shuffleItems } from '../utilities/format'
const sessionSchema = z.object({
  queue: z.array(queueItemSchema).max(500),
  index: z.number().int(),
  position: z.number().nonnegative(),
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  repeat: z.enum(['off', 'one', 'all']),
  shuffle: z.boolean(),
  originalOrder: z.array(z.string()),
})
const emptySession = {
  queue: [],
  index: -1,
  position: 0,
  volume: 0.8,
  muted: false,
  repeat: 'off' as const,
  shuffle: false,
  originalOrder: [],
}
const saved = localRepository.read('session', sessionSchema, emptySession)
const restoredIndex = saved.queue.length
  ? Math.max(0, Math.min(saved.index, saved.queue.length - 1))
  : -1
export interface PlayerState {
  queue: QueueItem[]
  index: number
  position: number
  duration: number
  volume: number
  muted: boolean
  repeat: RepeatMode
  shuffle: boolean
  originalOrder: string[]
  status: PlaybackStatus
  error: string | null
  playerVisible: boolean
  playRequest: number
  playTracks(tracks: Track[], index?: number, shuffled?: boolean): void
  select(index: number): void
  next(ended?: boolean): boolean
  previous(): void
  enqueue(track: Track, next?: boolean): boolean
  remove(key: string): void
  move(key: string, direction: -1 | 1): void
  clearUpcoming(): void
  toggleShuffle(): void
  cycleRepeat(): void
  reset(): void
}
const item = (track: Track): QueueItem => ({ key: crypto.randomUUID(), track })
export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...saved,
  index: restoredIndex,
  duration: saved.queue[restoredIndex]?.track.duration ?? 0,
  status: restoredIndex >= 0 ? 'paused' : 'idle',
  error: null,
  playerVisible: false,
  playRequest: 0,
  playTracks: (tracks, index = 0, shuffled = false) => {
    if (!tracks.length) return
    const all = tracks.slice(0, 500).map(item)
    const queue = shuffled ? shuffleItems(all) : all
    const chosen = Math.max(0, Math.min(index, queue.length - 1))
    set((s) => ({
      queue,
      index: chosen,
      position: 0,
      duration: queue[chosen].track.duration,
      shuffle: shuffled,
      originalOrder: all.map((i) => i.key),
      error: null,
      playRequest: s.playRequest + 1,
    }))
  },
  select: (index) => {
    const s = get()
    if (s.queue[index])
      set({
        index,
        position: 0,
        duration: s.queue[index].track.duration,
        error: null,
        playRequest: s.playRequest + 1,
      })
  },
  next: (ended = false) => {
    const s = get()
    if (!s.queue.length) return false
    if (ended && s.repeat === 'one') {
      s.select(s.index)
      return true
    }
    if (s.index + 1 < s.queue.length) {
      s.select(s.index + 1)
      return true
    }
    if (s.repeat === 'all') {
      s.select(0)
      return true
    }
    set({ status: 'ended' })
    return false
  },
  previous: () => {
    const s = get()
    s.select(s.index > 0 ? s.index - 1 : s.repeat === 'all' ? s.queue.length - 1 : 0)
  },
  enqueue: (track, next = false) => {
    if (get().queue.length >= 500) return false
    set((s) => {
      const added = item(track)
      const queue = [...s.queue]
      queue.splice(next ? s.index + 1 : queue.length, 0, added)
      return {
        queue,
        originalOrder: [...s.originalOrder, added.key],
        index: s.index < 0 ? 0 : s.index,
        ...(s.index < 0 ? { duration: track.duration, status: 'paused' as const } : {}),
      }
    })
    return true
  },
  remove: (key) =>
    set((s) => {
      const current = s.queue[s.index]?.key
      if (key === current) return s
      const queue = s.queue.filter((i) => i.key !== key)
      return {
        queue,
        index: queue.findIndex((i) => i.key === current),
        originalOrder: s.originalOrder.filter((k) => k !== key),
      }
    }),
  move: (key, direction) =>
    set((s) => {
      const from = s.queue.findIndex((i) => i.key === key),
        to = from + direction
      if (from <= s.index || to <= s.index || to >= s.queue.length) return s
      const queue = [...s.queue]
      ;[queue[from], queue[to]] = [queue[to], queue[from]]
      return { queue, originalOrder: queue.map((i) => i.key) }
    }),
  clearUpcoming: () =>
    set((s) => ({
      queue: s.queue.slice(0, s.index + 1),
      originalOrder: s.queue.slice(0, s.index + 1).map((i) => i.key),
    })),
  toggleShuffle: () =>
    set((s) => {
      if (!s.shuffle)
        return {
          shuffle: true,
          originalOrder: s.queue.map((i) => i.key),
          queue: [...s.queue.slice(0, s.index + 1), ...shuffleItems(s.queue.slice(s.index + 1))],
        }
      const current = s.queue[s.index]?.key
      const queue = [...s.queue].sort(
        (a, b) => s.originalOrder.indexOf(a.key) - s.originalOrder.indexOf(b.key),
      )
      return { shuffle: false, queue, index: queue.findIndex((i) => i.key === current) }
    }),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
  reset: () =>
    set({
      ...emptySession,
      playerVisible: false,
      status: 'idle',
      error: null,
      duration: 0,
      playRequest: 0,
    }),
}))
export function savePlayerSession() {
  const { queue, index, position, volume, muted, repeat, shuffle, originalOrder } =
    usePlayerStore.getState()
  localRepository.write('session', {
    queue,
    index,
    position,
    volume,
    muted,
    repeat,
    shuffle,
    originalOrder,
  })
}
usePlayerStore.subscribe((s, prev) => {
  if (
    s.queue !== prev.queue ||
    s.index !== prev.index ||
    s.volume !== prev.volume ||
    s.muted !== prev.muted ||
    s.repeat !== prev.repeat ||
    s.shuffle !== prev.shuffle
  )
    savePlayerSession()
})
