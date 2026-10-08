export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'CatalogError'
  }
}
const cache = new Map<string, { value: unknown; expires: number }>()
const pending = new Map<
  string,
  { promise: Promise<unknown>; controller: AbortController; users: number }
>()
let rateLimitUntil = 0
export async function fetchCatalog(url: string, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted()
  const hit = cache.get(url)
  if (hit && hit.expires > Date.now()) return hit.value
  if (Date.now() < rateLimitUntil)
    throw new CatalogError('The music catalog is busy. Please try again in a minute.', 429)
  let entry = pending.get(url)
  if (!entry) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const promise = (async () => {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          credentials: 'omit',
        })
        const value: unknown = await response.json().catch(() => null)
        const message =
          value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
            ? value.error.slice(0, 300)
            : undefined
        if (response.status === 429) {
          const raw = response.headers.get('Retry-After')
          const seconds =
            raw && /^\d+$/.test(raw)
              ? Number(raw)
              : raw
                ? (Date.parse(raw) - Date.now()) / 1000
                : 60
          const retry = Math.max(1, Math.min(Number.isFinite(seconds) ? seconds : 60, 3600))
          rateLimitUntil = Date.now() + retry * 1000
          throw new CatalogError(
            message ?? 'The music catalog is busy. Please try later.',
            429,
            retry,
          )
        }
        if (!response.ok)
          throw new CatalogError(
            message ??
              (response.status === 404
                ? 'This music is no longer available.'
                : 'The music catalog is unavailable. Please try again.'),
            response.status,
          )
        if (value === null) throw new CatalogError('The catalog returned an invalid response.')
        if (cache.size >= 80) cache.delete(cache.keys().next().value ?? '')
        cache.set(url, { value, expires: Date.now() + 180000 })
        return value
      } catch (error) {
        if (error instanceof CatalogError) throw error
        throw new CatalogError(
          controller.signal.aborted
            ? 'The music catalog took too long to respond. Please retry.'
            : 'Cannot reach the music catalog. Check your connection and retry.',
        )
      } finally {
        clearTimeout(timeout)
        if (pending.get(url)?.controller === controller) pending.delete(url)
      }
    })()
    entry = { promise, controller, users: 0 }
    pending.set(url, entry)
  }
  const shared = entry
  shared.users++
  return new Promise((resolve, reject) => {
    let done = false
    const finish = () => {
      if (done) return false
      done = true
      signal?.removeEventListener('abort', abort)
      shared.users--
      return true
    }
    const abort = () => {
      if (finish()) {
        if (!shared.users) {
          shared.controller.abort()
          pending.delete(url)
        }
        reject(new DOMException('Cancelled', 'AbortError'))
      }
    }
    signal?.addEventListener('abort', abort, { once: true })
    shared.promise.then(
      (value) => {
        if (finish()) resolve(value)
      },
      (error) => {
        if (finish()) reject(error)
      },
    )
  })
}
export function clearCatalogCache() {
  cache.clear()
  rateLimitUntil = 0
  pending.forEach((e) => e.controller.abort())
  pending.clear()
}
