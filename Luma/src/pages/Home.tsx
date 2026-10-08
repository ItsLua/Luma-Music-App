import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { AudioLines, Play, Radio, Sparkles } from 'lucide-react'
import { musicSearch } from '../music/MusicSearchService'
import { useCatalog } from '../hooks/useCatalog'
import { Artwork } from '../components/Artwork'
import { EmptyState, ErrorState, Skeletons } from '../components/Feedback'
import { TrackCards, TrackList } from '../components/TrackList'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { genres } from '../music/genres'
export default function Home() {
  const [genre, setGenre] = useState('All music'),
    history = useLibraryStore((s) => s.history),
    hideExplicit = useSettingsStore((s) => s.hideExplicit)
  const featured = useCatalog(
    useCallback(
      (signal: AbortSignal) =>
        musicSearch.getFeaturedTracks(genre === 'All music' ? undefined : genre, signal),
      [genre],
    ),
  )
  const discover = useCatalog(
    useCallback((signal: AbortSignal) => musicSearch.getRecommendations(undefined, signal), []),
  )
  const recent = useCatalog(
    useCallback((signal: AbortSignal) => musicSearch.getRecentTracks(signal), []),
  )
  const tracks = (featured.data ?? []).filter((t) => !hideExplicit || !t.explicit),
    spotlight =
      tracks.find((t) => t.duration < 420 && t.title.length < 45 && t.artwork.medium) ?? tracks[0]
  const artists = [...new Map(tracks.map((t) => [t.artist.id, t.artist])).values()].slice(0, 6)
  return (
    <div className="page home-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR DAILY ROTATION</p>
          <h1>
            Find your frequency<span>.</span>
          </h1>
          <p className="muted">A new favorite is just a play away.</p>
        </div>
        <span className="live-catalog">
          <AudioLines size={17} />
          Original releases. New perspectives.
        </span>
      </div>
      <div className="genre-tabs" aria-label="Browse genres">
        {genres.map((g) => (
          <button
            className={g === genre ? 'selected' : ''}
            key={g}
            onClick={() => setGenre(g)}
            aria-pressed={g === genre}
          >
            {g}
          </button>
        ))}
      </div>
      {featured.loading ? (
        <Skeletons />
      ) : featured.error ? (
        <ErrorState message={featured.error} retry={featured.retry} />
      ) : !spotlight ? (
        <EmptyState
          title="A quiet moment"
          description="There are no publicly streamable tracks in this category right now."
        />
      ) : (
        <>
          <section className="spotlight">
            <div className="spotlight-copy">
              <p className="eyebrow">
                <Radio size={16} /> IN THE SPOTLIGHT
              </p>
              <h2>{spotlight.title}</h2>
              <p>
                {spotlight.artist.name}
                <span> · {spotlight.genre ?? 'Music on YouTube'}</span>
              </p>
              <button
                className="button primary"
                onClick={() =>
                  usePlayerStore.getState().playTracks(
                    tracks,
                    tracks.findIndex((t) => t.id === spotlight.id),
                  )
                }
              >
                <Play size={18} fill="currentColor" />
                Listen now
              </button>
              <span className="spotlight-credit">From YouTube’s popular music videos</span>
            </div>
            <button
              className="spotlight-art"
              aria-label={`Play ${spotlight.title}`}
              onClick={() =>
                usePlayerStore.getState().playTracks(
                  tracks,
                  tracks.findIndex((t) => t.id === spotlight.id),
                )
              }
            >
              <Artwork src={spotlight.artwork.large ?? spotlight.artwork.medium} eager />
            </button>
          </section>
          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">ON REPEAT, EVERYWHERE</p>
                <h2>In the rotation</h2>
              </div>
              <span className="muted">Popular on YouTube</span>
            </div>
            <TrackCards tracks={tracks.filter((t) => t.id !== spotlight.id).slice(0, 6)} />
          </section>
          <section className="two-column-section">
            <div>
              <div className="section-heading">
                <h2>Worth a listen</h2>
                <Sparkles size={20} />
              </div>
              <TrackList tracks={tracks.slice(7, 12)} />
            </div>
            <div className="discovery-note">
              <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
              <h2>
                Less of the same.
                <br />
                More of your thing.
              </h2>
              <p>Explore artists making something all their own.</p>
              <Link className="button secondary" to="/search">
                Explore the catalog
              </Link>
              <AudioLines className="note-wave" aria-hidden="true" />
            </div>
          </section>
        </>
      )}
      {history.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Back to your favorites</h2>
            <Link to="/library?tab=history">Recently played</Link>
          </div>
          <TrackCards tracks={history.slice(0, 6)} />
        </section>
      )}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">GO A LITTLE DEEPER</p>
            <h2>Slowed & alternate versions</h2>
          </div>
          <span className="muted">Explore another version</span>
        </div>
        {discover.loading ? (
          <Skeletons />
        ) : discover.error ? (
          <ErrorState message={discover.error} retry={discover.retry} />
        ) : (
          <TrackCards tracks={discover.data?.slice(0, 6) ?? []} />
        )}
      </section>
      {artists.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Behind the sound</h2>
          </div>
          <div className="artist-grid">
            {artists.map((artist) => (
              <Link
                className="artist-card"
                to={`/artist/${encodeURIComponent(artist.id)}`}
                key={artist.id}
              >
                <Artwork src={artist.artwork.medium} />
                <strong>{artist.name}</strong>
                <span>Artist</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="section-heading">
          <h2>Live performances</h2>
          <span>From YouTube search</span>
        </div>
        {recent.loading ? (
          <Skeletons />
        ) : recent.error ? (
          <ErrorState message={recent.error} retry={recent.retry} />
        ) : (
          <TrackCards tracks={recent.data?.slice(0, 6) ?? []} />
        )}
      </section>
      <p className="catalog-footer">
        Music videos and alternate versions, powered by{' '}
        <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">
          YouTube
        </a>
        .
      </p>
    </div>
  )
}
