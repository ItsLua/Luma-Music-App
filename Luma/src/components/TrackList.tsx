import { useState } from 'react'
import {
  Heart,
  ListPlus,
  MoreHorizontal,
  Play,
  ListEnd,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrackBadges } from './TrackBadges'
import { Artwork } from './Artwork'
import { Dialog } from './Dialog'
import { notify } from '../stores/toastStore'
import { PlaylistPicker } from '../features/playlists/PlaylistPicker'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { safeHttpsUrl } from '../utilities/safeUrl'
import { time } from '../utilities/format'
import type { Track } from '../types/music'
export function LikeButton({ track }: { track: Track }) {
  const liked = useLibraryStore((s) => s.likes.some((t) => t.id === track.id))
  return (
    <button
      className={`icon-button like-button ${liked ? 'active' : ''}`}
      aria-label={`${liked ? 'Unlike' : 'Like'} ${track.title}`}
      aria-pressed={liked}
      onClick={() => {
        if (!useLibraryStore.getState().toggleLike(track))
          notify('Your liked songs are full. Remove a song before adding another.')
      }}
    >
      <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
    </button>
  )
}
export function TrackActions({ track, onRemove }: { track: Track; onRemove?: () => void }) {
  const [open, setOpen] = useState(false),
    [picker, setPicker] = useState(false)
  return (
    <>
      <button
        className="icon-button more-button"
        aria-label={`More options for ${track.title}`}
        onClick={() => setOpen(true)}
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <Dialog title={track.title} onClose={() => setOpen(false)}>
          <div className="action-list">
            <button
              onClick={() => {
                notify(
                  usePlayerStore.getState().enqueue(track, true)
                    ? 'Added to play next'
                    : 'Your queue is full. Remove a track first.',
                )
                setOpen(false)
              }}
            >
              <ListPlus />
              Play next
            </button>
            <button
              onClick={() => {
                notify(
                  usePlayerStore.getState().enqueue(track)
                    ? 'Added to queue'
                    : 'Your queue is full. Remove a track first.',
                )
                setOpen(false)
              }}
            >
              <ListEnd />
              Add to queue
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setPicker(true)
              }}
            >
              <Plus />
              Add to playlist
            </button>
            <a
              href={safeHttpsUrl(track.permalink) ?? 'https://www.youtube.com'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              View on YouTube
            </a>
            {onRemove && (
              <button
                onClick={() => {
                  onRemove()
                  setOpen(false)
                }}
              >
                <Trash2 />
                Remove from playlist
              </button>
            )}
          </div>
        </Dialog>
      )}
      {picker && <PlaylistPicker track={track} onClose={() => setPicker(false)} />}
    </>
  )
}
export function TrackList({
  tracks,
  onRemove,
}: {
  tracks: Track[]
  onRemove?: (track: Track) => void
}) {
  const hideExplicit = useSettingsStore((s) => s.hideExplicit),
    activeId = usePlayerStore((s) => s.queue[s.index]?.track.id),
    status = usePlayerStore((s) => s.status)
  const visible = hideExplicit ? tracks.filter((t) => t.explicit !== true) : tracks
  return (
    <div className="track-list">
      {visible.map((track, index) => (
        <div
          className={`track-row ${activeId === track.id ? 'current' : ''}`}
          key={`${track.id}-${index}`}
        >
          <button
            className="track-play"
            aria-label={`Play ${track.title}`}
            onClick={() => usePlayerStore.getState().playTracks(visible, index)}
          >
            <span className="track-number">
              {activeId === track.id && status === 'playing' ? (
                <span className="equalizer">
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            <Play className="row-play-icon" size={17} fill="currentColor" />
          </button>
          <Artwork src={track.artwork.small} />
          <div className="track-description">
            <button
              className="text-button track-title truncate"
              onClick={() => usePlayerStore.getState().playTracks(visible, index)}
            >
              {track.title}
            </button>
            <Link
              className="track-artist truncate"
              to={`/artist/${encodeURIComponent(track.artist.id)}`}
            >
              {track.explicit && (
                <span className="explicit" title="Explicit">
                  E
                </span>
              )}
              {track.artist.name}
            </Link>
            <span className="mobile-track-badges">
              <TrackBadges track={track} />
            </span>
          </div>
          <span className="track-genre">
            <TrackBadges track={track} />
          </span>
          <span className="track-duration">{time(track.duration)}</span>
          <LikeButton track={track} />
          <TrackActions track={track} onRemove={onRemove ? () => onRemove(track) : undefined} />
        </div>
      ))}
    </div>
  )
}
export function TrackCards({ tracks }: { tracks: Track[] }) {
  const hideExplicit = useSettingsStore((s) => s.hideExplicit),
    visible = hideExplicit ? tracks.filter((t) => t.explicit !== true) : tracks
  return (
    <div className="card-grid">
      {visible.map((track, index) => (
        <article className="music-card" key={track.id}>
          <button
            className="card-play"
            aria-label={`Play ${track.title}`}
            onClick={() => usePlayerStore.getState().playTracks(visible, index)}
          >
            <Artwork src={track.artwork.medium} />
            <span className="floating-play">
              <Play size={22} fill="currentColor" />
            </span>
          </button>
          <div className="card-info">
            <div>
              <button
                className="text-button track-title truncate"
                onClick={() => usePlayerStore.getState().playTracks(visible, index)}
              >
                {track.title}
              </button>
              <Link
                className="track-artist truncate"
                to={`/artist/${encodeURIComponent(track.artist.id)}`}
              >
                {track.artist.name}
              </Link>
            </div>
            <TrackActions track={track} />
          </div>
        </article>
      ))}
    </div>
  )
}
