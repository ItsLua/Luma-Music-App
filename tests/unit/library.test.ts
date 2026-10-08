import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useLibraryStore } from '../../src/stores/libraryStore'
import { usePlaylistStore } from '../../src/stores/playlistStore'
import { localRepository } from '../../src/services/storage'
import { playlistSchema } from '../../src/types/music'
import { track } from '../fixtures'
beforeEach(() => {
  localStorage.clear()
  useLibraryStore.getState().reset()
  usePlaylistStore.getState().reset()
})
describe('local library', () => {
  it('persists likes and unlike without duplicates', () => {
    const s = useLibraryStore.getState()
    s.toggleLike(track())
    expect(JSON.parse(localStorage.getItem('luma:library:v2') ?? '{}').likes).toHaveLength(1)
    s.toggleLike(track())
    expect(useLibraryStore.getState().likes).toHaveLength(0)
  })
  it('deduplicates and bounds listening history', () => {
    for (let i = 0; i < 105; i++) useLibraryStore.getState().recordPlay(track(String(i)))
    useLibraryStore.getState().recordPlay(track('104'))
    expect(useLibraryStore.getState().history).toHaveLength(100)
    expect(useLibraryStore.getState().history[0].id).toBe('104')
  })
  it('persists playlist creation, rename, insertion and removal', () => {
    const s = usePlaylistStore.getState()
    const id = s.createPlaylist(' Night drive ')
    s.addTrack(id, track())
    s.addTrack(id, track())
    s.rename(id, 'After dark')
    const read = localRepository.read('playlists', z.array(playlistSchema), [])
    expect(read[0]).toMatchObject({ name: 'After dark', tracks: [track()] })
    s.removeTrack(id, track().id)
    expect(usePlaylistStore.getState().playlists[0].tracks).toHaveLength(0)
    s.remove(id)
    expect(usePlaylistStore.getState().playlists).toHaveLength(0)
  })
  it('recovers from corrupt storage without crashing', () => {
    localStorage.setItem('luma:playlists:v2', '{oops')
    expect(localRepository.read('playlists', z.array(playlistSchema), [])).toEqual([])
    localStorage.setItem('luma:playlists:v2', '[{"id":0}]')
    expect(localRepository.read('playlists', z.array(playlistSchema), [])).toEqual([])
  })
  it('clears only Luma data', () => {
    localStorage.setItem('other-app', 'keep')
    localRepository.clear()
    expect(localStorage.getItem('other-app')).toBe('keep')
    expect(localStorage.getItem('luma:playlists:v2')).toBeNull()
  })
})
it('keeps readable legacy playlists when migration cannot write to storage', async () => {
  const { vi } = await import('vitest')
  const playlist = { id: 'keep', name: 'Keep this list', createdAt: 1, tracks: [track()] }
  localStorage.removeItem('luma:playlists:v2')
  localStorage.setItem('luma:playlists:v1', JSON.stringify([playlist]))
  const writer = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  expect(localRepository.read('playlists', z.array(playlistSchema), [])).toEqual([playlist])
  expect(localStorage.getItem('luma:playlists:v1')).not.toBeNull()
  writer.mockRestore()
})
