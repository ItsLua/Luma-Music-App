import { useEffect, useState } from 'react'
import { z } from 'zod'
import { musicSearch } from '../../music/MusicSearchService'
import { localRepository } from '../../services/storage'
import type { Track } from '../../types/music'
export function useSearch(query: string) {
  const text = query.trim().slice(0, 150)
  const [result, setResult] = useState<{
    query: string
    tracks: Track[]
    error: string | null
    loading: boolean
    nextPageToken?: string
  }>({ query: '', tracks: [], error: null, loading: false })
  const [recent, setRecent] = useState(() =>
    localRepository.read('searches', z.array(z.string()).max(8), []),
  )
  const [attempt, setAttempt] = useState(0),
    [page, setPage] = useState<{ query: string; token: string } | null>(null)
  const token = page?.query === text ? page.token : undefined
  useEffect(() => {
    if (!text) return
    const controller = new AbortController()
    const timer = setTimeout(
      () => {
        setResult((prev) => ({
          query: text,
          tracks: token && prev.query === text ? prev.tracks : [],
          error: null,
          loading: true,
        }))
        void musicSearch
          .searchTracks(text, controller.signal, token)
          .then((data) => {
            if (controller.signal.aborted) return
            setResult((prev) => ({
              query: text,
              tracks:
                token && prev.query === text
                  ? [...new Map([...prev.tracks, ...data.tracks].map((t) => [t.id, t])).values()]
                  : data.tracks,
              error: null,
              loading: false,
              nextPageToken: data.nextPageToken,
            }))
            if (!token && data.tracks.length)
              setRecent((prev) => {
                const updated = [text, ...prev.filter((q) => q !== text)].slice(0, 8)
                localRepository.write('searches', updated)
                return updated
              })
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted)
              setResult((prev) => ({
                query: text,
                tracks: token && prev.query === text ? prev.tracks : [],
                error:
                  error instanceof Error ? error.message : 'Search is unavailable. Please retry.',
                loading: false,
                nextPageToken: token,
              }))
          })
      },
      token ? 0 : 350,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, token, attempt])
  const current = text === result.query
  return {
    tracks: current ? result.tracks : [],
    loading: Boolean(text) && (result.loading || !current),
    error: current ? result.error : null,
    recent,
    hasMore: current && Boolean(result.nextPageToken),
    loadMore: () => {
      if (result.nextPageToken && !result.loading)
        setPage({ query: text, token: result.nextPageToken })
    },
    retry: () => setAttempt((n) => n + 1),
    clearRecent: () => {
      localRepository.write('searches', [])
      setRecent([])
    },
  }
}
