/** Bounded, short-lived metadata cache with per-isolate request coalescing. No media. */
export class MetadataCache {
  private values = new Map<string, { value: unknown; expires: number }>()
  private pending = new Map<string, Promise<unknown>>()
  constructor(
    private readonly ttl = 300_000,
    private readonly capacity = 200,
  ) {}
  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.values.get(key)
    if (hit && hit.expires > Date.now()) return hit.value as T
    const pending = this.pending.get(key)
    if (pending) return pending as Promise<T>
    const promise = load()
      .then((value) => {
        if (this.values.size >= this.capacity)
          this.values.delete(this.values.keys().next().value ?? '')
        this.values.set(key, { value, expires: Date.now() + this.ttl })
        return value
      })
      .finally(() => this.pending.delete(key))
    this.pending.set(key, promise)
    return promise
  }
  clear() {
    this.values.clear()
    this.pending.clear()
  }
}
