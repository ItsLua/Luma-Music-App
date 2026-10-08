import type { z } from 'zod'
import { migrateStoredValue } from './storageMigration'
let lastStorageError: string | null = null
const listeners = new Set<() => void>()
function fail() {
  lastStorageError =
    'Your browser could not save Luma data. Free some device storage or allow site storage to keep your library.'
  listeners.forEach((fn) => fn())
}
export const storageStatus = {
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  getSnapshot: () => lastStorageError,
}
/** Replace this adapter with an authenticated repository to add account sync. */
export const localRepository = {
  read<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
    try {
      const legacy = localStorage.getItem(`luma:${key}:v1`)
      const raw = localStorage.getItem(`luma:${key}:v2`) ?? legacy
      if (!raw) return fallback
      const migrated = migrateStoredValue(key, JSON.parse(raw))
      const result = schema.safeParse(migrated)
      if (result.success) {
        try {
          const serialized = JSON.stringify(result.data)
          if (legacy || serialized !== raw) localStorage.setItem(`luma:${key}:v2`, serialized)
          if (legacy) {
            localStorage.removeItem(`luma:${key}:v1`)
            if (
              ['library', 'playlists', 'session'].includes(key) &&
              JSON.stringify(migrated) !== legacy
            )
              localStorage.setItem(
                'luma:migration-notice',
                'Your playlist names and settings were kept. Entries from the retired music source were removed; search YouTube to add replacement versions.',
              )
          }
        } catch {
          fail()
        }
      }
      return result.success ? result.data : fallback
    } catch {
      return fallback
    }
  },
  write(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(`luma:${key}:v2`, JSON.stringify(value))
      return true
    } catch {
      fail()
      return false
    }
  },
  clear(): boolean {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('luma:'))
        .forEach((key) => localStorage.removeItem(key))
      return true
    } catch {
      fail()
      return false
    }
  },
}
