import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Shuffle } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { musicSearch } from '../music/MusicSearchService'
import { Artwork } from '../components/Artwork'
import { EmptyState, ErrorState, Skeletons } from '../components/Feedback'
import { TrackList } from '../components/TrackList'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
export default function Collection() {
  const { id = '' } = useParams(),
    hideExplicit = useSettingsStore((s) => s.hideExplicit)
  const result = useCatalog(
    useCallback((signal: AbortSignal) => musicSearch.getAlbum(id, signal), [id]),
  )
  if (result.loading)
    return (
      <div className="page">
        <Skeletons />
      </div>
    )
  if (result.error || !result.data)
    return (
      <div className="page">
        <ErrorState message={result.error ?? 'Collection unavailable.'} retry={result.retry} />
      </div>
    )
  const collection = result.data,
    tracks = collection.tracks.filter((t) => !hideExplicit || !t.explicit)
  return (
    <div className="page">
      <div className="collection-header">
        <Artwork src={collection.artwork.large ?? collection.artwork.medium} />
        <div>
          <p className="eyebrow">COMMUNITY COLLECTION</p>
          <h1>{collection.title}</h1>
          <p className="muted">
            By {collection.artist.name} · {tracks.length} public tracks
          </p>
          <div className="collection-actions">
            <button
              className="button primary"
              disabled={!tracks.length}
              onClick={() => usePlayerStore.getState().playTracks(tracks)}
            >
              <Play size={18} fill="currentColor" />
              Play
            </button>
            <button
              className="button secondary"
              disabled={!tracks.length}
              onClick={() => usePlayerStore.getState().playTracks(tracks, 0, true)}
            >
              <Shuffle size={18} />
              Shuffle
            </button>
          </div>
        </div>
      </div>
      {tracks.length ? (
        <TrackList tracks={tracks} />
      ) : (
        <EmptyState
          title="No public tracks available"
          description="The songs in this collection are not currently available for public streaming."
        />
      )}
    </div>
  )
}
