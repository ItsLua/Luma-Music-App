import { ListMusic, Maximize2, Music2 } from 'lucide-react'
import { Artwork } from '../../components/Artwork'
import { LikeButton } from '../../components/TrackList'
import { usePlayerStore } from '../../stores/playerStore'
import { PlayButton, Progress, Transport, Volume } from './Controls'
import { playbackEngine } from '../../music/youtube/YouTubePlaybackEngine'
export function MiniPlayer({ openPlayer, openQueue }: { openPlayer(): void; openQueue(): void }) {
  const track = usePlayerStore((s) => s.queue[s.index]?.track),
    status = usePlayerStore((s) => s.status),
    error = usePlayerStore((s) => s.error)
  if (!track)
    return (
      <footer className="mini-player empty-player">
        <Music2 size={24} />
        <span>
          A little discovery goes a long way.<small>Choose a track to start listening.</small>
        </span>
        <span className="player-provider">Music via YouTube</span>
      </footer>
    )
  return (
    <footer className={`mini-player ${status}`} aria-label="Music player">
      <div className="mini-track">
        <button className="mini-open" onClick={openPlayer} aria-label="Open Now Playing">
          <Artwork src={track.artwork.small} />
          <span>
            <strong className="truncate">{track.title}</strong>
            <small className="truncate">
              {status === 'loading'
                ? 'Loading YouTube…'
                : status === 'buffering'
                  ? 'Buffering…'
                  : track.artist.name}
            </small>
          </span>
        </button>
        <div className="desktop-like">
          <LikeButton track={track} />
        </div>
      </div>
      <div className="desktop-transport">
        <Transport />
        <Progress />
      </div>
      <div className="player-extras">
        <button className="icon-button" aria-label="Open queue" onClick={openQueue}>
          <ListMusic size={20} />
        </button>
        <Volume />
        <button
          className="icon-button expand-player"
          aria-label="Expand Now Playing"
          onClick={openPlayer}
        >
          <Maximize2 size={18} />
        </button>
      </div>
      <div className="mobile-play">
        <PlayButton />
      </div>
      {error && (
        <div className="playback-error" role="alert">
          <span>{error}</span>
          <button onClick={() => playbackEngine.play()}>Retry</button>
        </div>
      )}
    </footer>
  )
}
