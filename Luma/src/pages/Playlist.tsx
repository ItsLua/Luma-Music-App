import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListMusic, Pencil, Play, Shuffle, Trash2 } from 'lucide-react'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Artwork } from '../components/Artwork'
import { TrackList } from '../components/TrackList'
import { Dialog } from '../components/Dialog'
import { EmptyState } from '../components/Feedback'
export default function Playlist() {
  const { id = '' } = useParams(),
    navigate = useNavigate(),
    playlist = usePlaylistStore((s) => s.playlists.find((p) => p.id === id)),
    hideExplicit = useSettingsStore((s) => s.hideExplicit)
  const [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false),
    [name, setName] = useState('')
  if (!playlist)
    return (
      <div className="page">
        <EmptyState
          title="Playlist not found"
          description="This playlist may have been deleted or saved on another device."
        >
          <Link to="/library" className="button primary">
            Open your library
          </Link>
        </EmptyState>
      </div>
    )
  const tracks = playlist.tracks.filter((t) => !hideExplicit || !t.explicit)
  return (
    <div className="page">
      <div className="collection-header">
        {playlist.tracks[0] ? (
          <Artwork src={playlist.tracks[0].artwork.medium} />
        ) : (
          <div className="playlist-cover">
            <ListMusic size={62} />
          </div>
        )}
        <div>
          <p className="eyebrow">YOUR PLAYLIST</p>
          <h1>{playlist.name}</h1>
          <p className="muted">{playlist.tracks.length} tracks · Saved on this device</p>
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
              className="icon-button"
              aria-label="Shuffle playlist"
              disabled={!tracks.length}
              onClick={() => usePlayerStore.getState().playTracks(tracks, 0, true)}
            >
              <Shuffle />
            </button>
            <button
              className="icon-button"
              aria-label="Rename playlist"
              onClick={() => {
                setName(playlist.name)
                setEditing(true)
              }}
            >
              <Pencil size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Delete playlist"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={19} />
            </button>
          </div>
        </div>
      </div>
      {playlist.tracks.length ? (
        <TrackList
          tracks={playlist.tracks}
          onRemove={(track) => usePlaylistStore.getState().removeTrack(id, track.id)}
        />
      ) : (
        <EmptyState
          title="A fresh start"
          description="Find a song you love, open its options, and choose Add to playlist."
        >
          <Link to="/search" className="button secondary">
            Find music
          </Link>
        </EmptyState>
      )}
      {editing && (
        <Dialog title="Rename playlist" onClose={() => setEditing(false)}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) {
                usePlaylistStore.getState().rename(id, name)
                setEditing(false)
              }
            }}
          >
            <label htmlFor="rename-playlist">Playlist name</label>
            <input
              id="rename-playlist"
              value={name}
              maxLength={80}
              required
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <button className="button primary" disabled={!name.trim()}>
              Save name
            </button>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog title="Delete this playlist?" onClose={() => setDeleting(false)}>
          <p className="muted">
            “{playlist.name}” will be removed from this device. Your liked songs will stay in your
            library.
          </p>
          <div className="confirm-actions">
            <button className="button secondary" onClick={() => setDeleting(false)}>
              Keep playlist
            </button>
            <button
              className="button danger"
              onClick={() => {
                usePlaylistStore.getState().remove(id)
                navigate('/library')
              }}
            >
              Delete playlist
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
