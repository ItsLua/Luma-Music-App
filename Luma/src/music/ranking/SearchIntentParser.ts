import type { VersionType } from '../../types/music.ts'
import { versionPatterns } from './VersionClassifier.ts'
export interface SearchIntent {
  rawQuery: string
  baseQuery: string
  requestedVersion?: VersionType
}
export function parseSearchIntent(rawQuery: string): SearchIntent {
  const found = versionPatterns.find(([, pattern]) => pattern.test(rawQuery))
  const original = /\b(original|official audio|studio version)\b/i
  const pattern = found?.[1] ?? (original.test(rawQuery) ? original : undefined)
  return {
    rawQuery,
    baseQuery: pattern
      ? rawQuery.replace(new RegExp(pattern.source, 'gi'), ' ').replace(/\s+/g, ' ').trim()
      : rawQuery.trim(),
    requestedVersion: found?.[0] ?? (pattern ? 'original' : undefined),
  }
}
