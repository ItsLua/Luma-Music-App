import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useSearch } from '../../src/features/search/useSearch'
import { musicSearch } from '../../src/music/MusicSearchService'
import { track } from '../fixtures'
afterEach(() => vi.useRealTimers())
it('debounces typing, cancels superseded work and never displays a stale response', async () => {
  vi.useFakeTimers()
  let oldSignal: AbortSignal | undefined
  const search = vi.spyOn(musicSearch, 'searchTracks').mockImplementation((_q, signal) => {
    oldSignal = signal
    return Promise.resolve({ tracks: [track()] })
  })
  const { result, rerender } = renderHook(({ q }) => useSearch(q), { initialProps: { q: 'a' } })
  rerender({ q: 'ambient' })
  expect(search).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(351))
  expect(search).toHaveBeenCalledTimes(1)
  expect(result.current.tracks).toHaveLength(1)
  rerender({ q: 'jazz' })
  expect(oldSignal?.aborted).toBe(true)
  expect(result.current.tracks).toHaveLength(0)
  await act(() => vi.advanceTimersByTimeAsync(351))
  expect(search).toHaveBeenCalledTimes(2)
})
it('shows search errors and supports retry', async () => {
  vi.useFakeTimers()
  const search = vi
    .spyOn(musicSearch, 'searchTracks')
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValue({ tracks: [track()] })
  const { result } = renderHook(() => useSearch('ambient'))
  await act(() => vi.advanceTimersByTimeAsync(351))
  expect(result.current.error).toBe('Network unavailable')
  act(() => result.current.retry())
  await act(() => vi.advanceTimersByTimeAsync(351))
  expect(result.current.error).toBeNull()
  expect(search).toHaveBeenCalledTimes(2)
})
