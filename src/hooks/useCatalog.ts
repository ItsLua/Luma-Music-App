import { useEffect, useState } from 'react'
export function useCatalog<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    data: T | null
    error: string | null
    loader: typeof load | null
    attempt: number
  }>({ data: null, error: null, loader: null, attempt: -1 })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loader: load, attempt })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            error: error instanceof Error ? error.message : 'Something went wrong. Please retry.',
            loader: load,
            attempt,
          })
      })
    return () => controller.abort()
  }, [load, attempt])
  const loading = state.loader !== load || state.attempt !== attempt
  return {
    data: loading ? null : state.data,
    error: loading ? null : state.error,
    loading,
    retry: () => setAttempt((a) => a + 1),
  }
}
