export const logger = {
  error(event: string, error?: unknown) {
    if (import.meta.env.DEV) console.error(`[Luma] ${event}`, error)
    else console.error(`[Luma] ${event}`)
  },
}
