import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink, Play } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { musicSearch } from '../music/MusicSearchService'
import { Artwork } from '../components/Artwork'
import { EmptyState, ErrorState, Skeletons } from '../components/Feedback'
import { TrackList } from '../components/TrackList'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
export default function Artist() {
  const { id = '' } = useParams(),
    hideExplicit = useSettingsStore((s) => s.hideExplicit)
  const result = useCatalog(
    useCallback(
      async (signal: AbortSignal) => {
        const [artist, tracks] = await Promise.all([
          musicSearch.getArtist(id, signal),
          musicSearch.getArtistTracks(id, signal),
        ])
        return { artist, tracks }
      },
      [id],
    ),
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
        <ErrorState message={result.error ?? 'Artist unavailable.'} retry={result.retry} />
      </div>
    )
  const { artist, tracks } = result.data,
    playable = tracks.filter((t) => !hideExplicit || !t.explicit)
  return (
    <div className="page">
      <div className="collection-header artist-header">
        <Artwork src={artist.artwork.large ?? artist.artwork.medium} />
        <div>
          <p className="eyebrow">YOUTUBE CHANNEL</p>
          <h1>{artist.name}</h1>
          {artist.bio && <p className="artist-bio">{artist.bio}</p>}
          <div className="collection-actions">
            <button
              className="button primary"
              disabled={!playable.length}
              onClick={() => usePlayerStore.getState().playTracks(playable)}
            >
              <Play size={18} fill="currentColor" />
              Play
            </button>
            <a
              className="button secondary"
              href={artist.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} />
              YouTube profile
            </a>
          </div>
        </div>
      </div>
      <div className="section-heading">
        <h2>Tracks</h2>
      </div>
      {tracks.length ? (
        <TrackList tracks={tracks} />
      ) : (
        <EmptyState
          title="Nothing to play just yet"
          description="This artist has no publicly streamable tracks available here."
        />
      )}
    </div>
  )
}
