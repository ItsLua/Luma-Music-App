import {
  LoaderCircle,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { playbackEngine } from '../../music/youtube/YouTubePlaybackEngine'
import { time } from '../../utilities/format'
export function PlayButton({ large = false }: { large?: boolean }) {
  const status = usePlayerStore((s) => s.status),
    hasTrack = usePlayerStore((s) => s.index >= 0)
  const busy = status === 'loading' || status === 'buffering'
  const playing = status === 'playing'
  return (
    <button
      className={`play-button ${large ? 'large' : ''} ${busy ? 'busy' : ''}`}
      disabled={!hasTrack}
      aria-label={busy ? 'Cancel loading' : playing ? 'Pause' : 'Play'}
      onClick={() => playbackEngine.toggle()}
    >
      {busy ? (
        <>
          <LoaderCircle className="spin" />
          <X className="cancel-load" size={13} />
        </>
      ) : playing ? (
        <Pause fill="currentColor" />
      ) : (
        <Play fill="currentColor" />
      )}
    </button>
  )
}
export function Transport({ expanded = false }: { expanded?: boolean }) {
  const shuffle = usePlayerStore((s) => s.shuffle),
    repeat = usePlayerStore((s) => s.repeat)
  return (
    <div className={`transport ${expanded ? 'expanded' : ''}`}>
      <button
        className={`icon-button ${shuffle ? 'active' : ''}`}
        aria-label="Shuffle"
        aria-pressed={shuffle}
        onClick={() => usePlayerStore.getState().toggleShuffle()}
      >
        <Shuffle size={19} />
      </button>
      <button
        className="icon-button"
        aria-label="Previous track"
        onClick={() => playbackEngine.previous()}
      >
        <SkipBack fill="currentColor" size={20} />
      </button>
      <PlayButton large={expanded} />
      <button className="icon-button" aria-label="Next track" onClick={() => playbackEngine.next()}>
        <SkipForward fill="currentColor" size={20} />
      </button>
      <button
        className={`icon-button ${repeat !== 'off' ? 'active' : ''}`}
        aria-label={`Repeat: ${repeat}`}
        onClick={() => usePlayerStore.getState().cycleRepeat()}
      >
        {repeat === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
      </button>
    </div>
  )
}
export function Progress({ full = false }: { full?: boolean }) {
  const position = usePlayerStore((s) => s.position),
    duration = usePlayerStore((s) => s.duration)
  return (
    <div className={`progress-control ${full ? 'full' : ''}`}>
      <span>{time(position)}</span>
      <input
        aria-label="Seek"
        type="range"
        min="0"
        max={duration || 1}
        step="0.1"
        value={Math.min(position, duration || 1)}
        disabled={!duration}
        style={
          { '--progress': `${duration ? (position / duration) * 100 : 0}%` } as React.CSSProperties
        }
        onChange={(e) => playbackEngine.seek(Number(e.target.value))}
      />
      <span>{full ? '−' + time(duration - position) : time(duration)}</span>
    </div>
  )
}
export function Volume() {
  const volume = usePlayerStore((s) => s.volume),
    muted = usePlayerStore((s) => s.muted)
  return (
    <div className="volume-control">
      <button
        className="icon-button"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        onClick={() => playbackEngine.toggleMute()}
      >
        {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>
      <input
        aria-label="Volume"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={muted ? 0 : volume}
        onChange={(e) => playbackEngine.setVolume(Number(e.target.value))}
      />
    </div>
  )
}
