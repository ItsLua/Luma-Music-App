import { Search as SearchIcon, X, Clock3, AudioLines } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useSearch } from '../features/search/useSearch'
import { TrackList } from '../components/TrackList'
import { EmptyState, ErrorState, Skeletons } from '../components/Feedback'
import { parseSearchIntent } from '../music/ranking/SearchIntentParser'
import { genres } from '../music/genres'
export default function Search() {
  const [params, setParams] = useSearchParams(),
    query = params.get('q') ?? '',
    refinement = params.get('version') ?? '',
    refinedQuery = refinement ? `${parseSearchIntent(query).baseQuery} ${refinement}` : query,
    search = useSearch(refinedQuery)
  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true })
  return (
    <div className="page search-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">GOOD THINGS ARE WAITING</p>
          <h1>
            Follow the sound<span>.</span>
          </h1>
        </div>
      </div>
      <form className="search-field" role="search" onSubmit={(e) => e.preventDefault()}>
        <SearchIcon size={24} />
        <label className="sr-only" htmlFor="music-search">
          Search music
        </label>
        <input
          id="music-search"
          placeholder="Songs, artists, and new obsessions"
          autoComplete="off"
          value={query}
          maxLength={150}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Clear search"
            type="button"
            onClick={() => setQuery('')}
          >
            <X size={20} />
          </button>
        )}
      </form>
      {query.trim() && (
        <div className="genre-tabs search-refinements" aria-label="Version refinements">
          {[
            ['', 'All'],
            ['original', 'Original'],
            ['slowed', 'Slowed'],
            ['sped up', 'Sped Up'],
            ['live', 'Live'],
            ['remix', 'Remix'],
            ['acoustic', 'Acoustic'],
            ['instrumental', 'Instrumental'],
            ['unreleased', 'Unreleased'],
            ['cover', 'Covers'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={refinement === value}
              className={refinement === value ? 'selected' : ''}
              onClick={() =>
                setParams({ q: query, ...(value ? { version: value } : {}) }, { replace: true })
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!query.trim() ? (
        <>
          {search.recent.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Recent searches</h2>
                <button className="text-button" onClick={search.clearRecent}>
                  Clear all
                </button>
              </div>
              <div className="recent-searches">
                {search.recent.map((q) => (
                  <button onClick={() => setQuery(q)} key={q}>
                    <Clock3 size={16} />
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="section-heading">
              <h2>A sound for every side of you</h2>
            </div>
            <div className="genre-grid">
              {genres.slice(1).map((g, index) => (
                <button key={g} className={`genre-card genre-${index}`} onClick={() => setQuery(g)}>
                  <span>{g}</span>
                  <AudioLines aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
          <p className="catalog-footer">
            Search YouTube for original releases and alternate versions. Availability is controlled
            by YouTube and uploaders.
          </p>
        </>
      ) : search.loading && !search.tracks.length ? (
        <Skeletons />
      ) : search.error && !search.tracks.length ? (
        <ErrorState message={search.error} retry={search.retry} />
      ) : search.tracks.length ? (
        <section>
          <div className="section-heading">
            <h2>Tracks</h2>
            <span>{search.tracks.length} results</span>
          </div>
          <p className="catalog-footer">
            Ranked by Luma using title, channel and available catalog matches. Version labels are
            inferred; channel names alone are not verification.
          </p>
          <TrackList tracks={search.tracks} />
          {search.error && <ErrorState message={search.error} retry={search.retry} />}
          {search.hasMore && (
            <button
              className="button secondary"
              disabled={search.loading}
              onClick={search.loadMore}
            >
              {search.loading ? 'Loading…' : 'Load more results'}
            </button>
          )}
        </section>
      ) : (
        <EmptyState
          title="No tracks found"
          description={`We couldn’t find publicly streamable music for “${query}”. Try an artist name or a different spelling.`}
        />
      )}
    </div>
  )
}
