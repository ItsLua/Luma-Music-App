import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, ListMusic, Plus, Play } from 'lucide-react'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import { TrackList } from '../components/TrackList'
import { EmptyState } from '../components/Feedback'
import { Artwork } from '../components/Artwork'
import { Dialog } from '../components/Dialog'
export default function Library() {
  const [params, setParams] = useSearchParams(),
    tab = params.get('tab') ?? 'playlists',
    navigate = useNavigate()
  const likes = useLibraryStore((s) => s.likes),
    history = useLibraryStore((s) => s.history),
    playlists = usePlaylistStore((s) => s.playlists)
  const [create, setCreate] = useState(false),
    [name, setName] = useState('')
  const tracks = tab === 'history' ? history : likes
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COLLECT WHAT MOVES YOU</p>
          <h1>
            Your little universe<span>.</span>
          </h1>
          <p className="muted">Saved on this device. Ready whenever you are.</p>
        </div>
        <button className="button primary create-playlist-button" onClick={() => setCreate(true)}>
          <Plus size={18} />
          <span>Create playlist</span>
        </button>
      </div>
      <div className="filter-tabs" aria-label="Library view">
        {['playlists', 'likes', 'history'].map((value) => (
          <button
            key={value}
            className={tab === value ? 'selected' : ''}
            aria-pressed={tab === value}
            onClick={() => setParams({ tab: value })}
          >
            {value === 'playlists'
              ? 'Playlists'
              : value === 'likes'
                ? `Liked songs · ${likes.length}`
                : 'Recently played'}
          </button>
        ))}
      </div>
      {tab === 'playlists' ? (
        <div className="library-grid">
          <Link to="/library?tab=likes" className="library-card">
            <div className="liked-cover">
              <Heart size={60} fill="currentColor" />
            </div>
            <h3>Liked songs</h3>
            <p>{likes.length} tracks</p>
          </Link>
          {playlists.map((p) => (
            <Link className="library-card" to={`/playlist/${p.id}`} key={p.id}>
              {p.tracks[0] ? (
                <Artwork src={p.tracks[0].artwork.medium} />
              ) : (
                <div className="playlist-cover">
                  <ListMusic size={48} />
                </div>
              )}
              <h3>{p.name}</h3>
              <p>{p.tracks.length} tracks</p>
            </Link>
          ))}
          <button className="new-playlist-card" onClick={() => setCreate(true)}>
            <Plus size={35} />
            <span>Make something yours</span>
            <small>Create a playlist</small>
          </button>
        </div>
      ) : tracks.length ? (
        <>
          <div className="section-heading">
            <h2>{tab === 'history' ? 'Recently played' : 'Liked songs'}</h2>
            <button
              className="button secondary"
              onClick={() => usePlayerStore.getState().playTracks(tracks)}
            >
              <Play size={16} fill="currentColor" />
              Play all
            </button>
          </div>
          <TrackList tracks={tracks} />
        </>
      ) : (
        <EmptyState
          title={tab === 'history' ? 'Your listening story starts here' : 'Keep the ones you love'}
          description={
            tab === 'history'
              ? 'Listen for 10 seconds and your track will appear here.'
              : 'Tap the heart beside a track to save it to your library.'
          }
        >
          <Link to="/search" className="button primary">
            Find some music
          </Link>
        </EmptyState>
      )}
      {create && (
        <Dialog title="Create playlist" onClose={() => setCreate(false)}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              const id = usePlaylistStore.getState().createPlaylist(name)
              setCreate(false)
              navigate(`/playlist/${id}`)
            }}
          >
            <label htmlFor="library-playlist-name">Playlist name</label>
            <input
              id="library-playlist-name"
              required
              autoFocus
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A name for this feeling"
            />
            <button className="button primary" disabled={!name.trim() || playlists.length >= 100}>
              Create playlist
            </button>
          </form>
        </Dialog>
      )}
    </div>
  )
}
