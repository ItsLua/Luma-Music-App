import { create } from 'zustand'
import { z } from 'zod'
import { trackSchema, type Track } from '../types/music'
import { localRepository } from '../services/storage'
const schema = z.object({
  likes: z.array(trackSchema).max(2000),
  history: z.array(trackSchema).max(100),
})
const initial = () => localRepository.read('library', schema, { likes: [], history: [] })
interface LibraryState {
  likes: Track[]
  history: Track[]
  toggleLike(track: Track): boolean
  recordPlay(track: Track): void
  clearHistory(): void
  reset(): void
}
export const useLibraryStore = create<LibraryState>((set, get) => ({
  ...initial(),
  toggleLike: (track) => {
    if (get().likes.length >= 2000 && !get().likes.some((t) => t.id === track.id)) return false
    set((s) => ({
      likes: s.likes.some((t) => t.id === track.id)
        ? s.likes.filter((t) => t.id !== track.id)
        : [track, ...s.likes],
    }))
    return true
  },
  recordPlay: (track) =>
    set((s) => ({ history: [track, ...s.history.filter((t) => t.id !== track.id)].slice(0, 100) })),
  clearHistory: () => set({ history: [] }),
  reset: () => set({ likes: [], history: [] }),
}))
useLibraryStore.subscribe(({ likes, history }) => {
  localRepository.write('library', { likes, history })
})
