import { useState } from 'react'
import { ListMusic, Plus } from 'lucide-react'
import { Dialog } from '../../components/Dialog'
import { notify } from '../../stores/toastStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import type { Track } from '../../types/music'
export function PlaylistPicker({ track, onClose }: { track: Track; onClose(): void }) {
  const playlists = usePlaylistStore((s) => s.playlists),
    [name, setName] = useState('')
  return (
    <Dialog title="Add to playlist" onClose={onClose}>
      <p className="muted truncate">{track.title}</p>
      <div className="playlist-picker">
        {playlists.map((p) => {
          const included = p.tracks.some((t) => t.id === track.id)
          return (
            <button
              key={p.id}
              className="picker-row"
              disabled={included || p.tracks.length >= 500}
              onClick={() => {
                usePlaylistStore.getState().addTrack(p.id, track)
                notify(`Added to ${p.name}`)
                onClose()
              }}
            >
              <ListMusic />
              <span>
                {p.name}
                <small>{p.tracks.length} tracks</small>
              </span>
              <span className="muted">{included ? 'Added' : '+'}</span>
            </button>
          )
        })}
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          usePlaylistStore.getState().createPlaylist(name, track)
          notify(`Created ${name.trim()}`)
          onClose()
        }}
      >
        <label className="sr-only" htmlFor="new-playlist-name">
          New playlist name
        </label>
        <input
          id="new-playlist-name"
          placeholder="New playlist name"
          value={name}
          maxLength={80}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <button className="button primary" disabled={!name.trim() || playlists.length >= 100}>
          <Plus size={18} />
          Create
        </button>
      </form>
    </Dialog>
  )
}
