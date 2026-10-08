import { create } from 'zustand'
import { z } from 'zod'
import { playlistSchema, type Playlist, type Track } from '../types/music'
import { localRepository } from '../services/storage'
interface PlaylistsState {
  playlists: Playlist[]
  createPlaylist(name: string, track?: Track): string
  rename(id: string, name: string): void
  remove(id: string): void
  addTrack(id: string, track: Track): void
  removeTrack(id: string, trackId: string): void
  reset(): void
}
const cleanName = (name: string) => name.trim().slice(0, 80) || 'Untitled playlist'
export const usePlaylistStore = create<PlaylistsState>((set) => ({
  playlists: localRepository.read('playlists', z.array(playlistSchema).max(100), []),
  createPlaylist: (name, track) => {
    const id = crypto.randomUUID()
    set((s) => ({
      playlists: [
        { id, name: cleanName(name), createdAt: Date.now(), tracks: track ? [track] : [] },
        ...s.playlists,
      ].slice(0, 100),
    }))
    return id
  },
  rename: (id, name) =>
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, name: cleanName(name) } : p)),
    })),
  remove: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
  addTrack: (id, track) =>
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === id && !p.tracks.some((t) => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, track].slice(0, 500) }
          : p,
      ),
    })),
  removeTrack: (id, trackId) =>
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === id ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p,
      ),
    })),
  reset: () => set({ playlists: [] }),
}))
usePlaylistStore.subscribe(({ playlists }) => {
  localRepository.write('playlists', playlists)
})
