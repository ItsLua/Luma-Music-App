import { ListMusic, Plus } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { YouTubePlayer } from '../../music/youtube/YouTubePlayer'
import { TrackBadges } from '../../components/TrackBadges'
import { LikeButton } from '../../components/TrackList'
import { PlaylistPicker } from '../playlists/PlaylistPicker'
import { usePlayerStore } from '../../stores/playerStore'
import { Progress, Transport, Volume } from './Controls'
import { playbackEngine } from '../../music/youtube/YouTubePlaybackEngine'
export default function NowPlaying({ onClose, openQueue }: { onClose(): void; openQueue(): void }) {
  const track = usePlayerStore((s) => s.queue[s.index]?.track),
    error = usePlayerStore((s) => s.error),
    status = usePlayerStore((s) => s.status),
    [picker, setPicker] = useState(false)
  if (!track) return null
  return (
    <Dialog title="Now playing" onClose={onClose} className="now-playing">
      <div className="now-playing-content">
        <YouTubePlayer />
        <TrackBadges track={track} />
        <p className="youtube-play-hint">
          If playback does not start, tap Play inside the YouTube video.
        </p>
        <div className="now-title">
          <div>
            <h1>{track.title}</h1>
            <a href={track.artist.url} target="_blank" rel="noopener noreferrer">
              {track.artist.name}
            </a>
          </div>
          <LikeButton track={track} />
        </div>
        <p className="now-status" role="status">
          {status === 'loading'
            ? 'Loading YouTube…'
            : status === 'buffering'
              ? 'Buffering…'
              : (track.album ?? track.genre ?? 'Streaming via YouTube')}
        </p>
        {error && (
          <div className="inline-error" role="alert">
            {error}
            <button onClick={() => playbackEngine.play()}>Retry</button>
          </div>
        )}
        <Progress full />
        <Transport expanded />
        <Volume />
        <div className="now-actions">
          <button className="text-button" onClick={() => setPicker(true)}>
            <Plus size={20} />
            Add to playlist
          </button>
          <button className="text-button" onClick={openQueue}>
            <ListMusic size={20} />
            Queue
          </button>
        </div>
        <a
          className="provider-credit"
          href={track.permalink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube
        </a>
      </div>
      {picker && <PlaylistPicker track={track} onClose={() => setPicker(false)} />}
    </Dialog>
  )
}
