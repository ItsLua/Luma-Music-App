import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore, savePlayerSession } from '../../src/stores/playerStore'
import { track } from '../fixtures'
beforeEach(() => {
  localStorage.clear()
  usePlayerStore.getState().reset()
})
const play = () => usePlayerStore.getState().playTracks([track('a'), track('b'), track('c')])
const current = () => {
  const s = usePlayerStore.getState()
  return s.queue[s.index]?.track.id
}
describe('queue state', () => {
  it('advances and goes back', () => {
    play()
    expect(current()).toBe('a')
    usePlayerStore.getState().next()
    expect(current()).toBe('b')
    usePlayerStore.getState().previous()
    expect(current()).toBe('a')
  })
  it('stops at the end with repeat off', () => {
    play()
    usePlayerStore.getState().select(2)
    expect(usePlayerStore.getState().next(true)).toBe(false)
    expect(usePlayerStore.getState().status).toBe('ended')
  })
  it('repeats one on completion but manual next advances', () => {
    play()
    usePlayerStore.setState({ repeat: 'one' })
    const count = usePlayerStore.getState().playRequest
    usePlayerStore.getState().next(true)
    expect(current()).toBe('a')
    expect(usePlayerStore.getState().playRequest).toBe(count + 1)
    usePlayerStore.getState().next()
    expect(current()).toBe('b')
  })
  it('wraps both directions with repeat all', () => {
    play()
    usePlayerStore.setState({ repeat: 'all' })
    usePlayerStore.getState().previous()
    expect(current()).toBe('c')
    usePlayerStore.getState().next(true)
    expect(current()).toBe('a')
  })
  it('shuffles future tracks without losing, duplicating or replacing the current track', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    play()
    usePlayerStore.getState().toggleShuffle()
    const shuffled = usePlayerStore.getState()
    expect(current()).toBe('a')
    expect(shuffled.queue.map((i) => i.track.id)).toEqual(['a', 'c', 'b'])
    usePlayerStore.getState().next()
    expect(current()).toBe('c')
    usePlayerStore.getState().toggleShuffle()
    expect(current()).toBe('c')
    expect(usePlayerStore.getState().queue.map((i) => i.track.id)).toEqual(['a', 'b', 'c'])
  })
  it('supports duplicate tracks with distinct queue identities', () => {
    play()
    usePlayerStore.getState().enqueue(track('a'), true)
    const s = usePlayerStore.getState()
    expect(new Set(s.queue.map((i) => i.key)).size).toBe(4)
    expect(s.queue[1].track.id).toBe('a')
  })
  it('protects the current track when removing or reordering', () => {
    play()
    let s = usePlayerStore.getState()
    s.remove(s.queue[0].key)
    expect(current()).toBe('a')
    s.move(s.queue[1].key, -1)
    expect(current()).toBe('a')
    s.move(s.queue[1].key, 1)
    s = usePlayerStore.getState()
    expect(s.queue.map((i) => i.track.id)).toEqual(['a', 'c', 'b'])
    s.remove(s.queue[1].key)
    expect(usePlayerStore.getState().queue).toHaveLength(2)
  })
  it('preserves the active index when removing an earlier item', () => {
    play()
    usePlayerStore.getState().select(2)
    const key = usePlayerStore.getState().queue[0].key
    usePlayerStore.getState().remove(key)
    expect(current()).toBe('c')
    expect(usePlayerStore.getState().index).toBe(1)
  })
  it('clears upcoming tracks and persists a paused-restorable session', () => {
    play()
    usePlayerStore.setState({ position: 12, status: 'playing' })
    usePlayerStore.getState().clearUpcoming()
    savePlayerSession()
    const saved = JSON.parse(localStorage.getItem('luma:session:v2') ?? '{}')
    expect(saved.position).toBe(12)
    expect(saved.queue).toHaveLength(1)
    expect(saved.status).toBeUndefined()
  })
})
