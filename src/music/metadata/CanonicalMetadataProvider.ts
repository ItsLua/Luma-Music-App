export interface CanonicalTrack {
  id: string
  title: string
  artistName: string
  albumName?: string
  durationMs?: number
  isrc?: string
}
export interface CanonicalMetadataProvider {
  search(query: string, signal?: AbortSignal): Promise<CanonicalTrack[]>
}
