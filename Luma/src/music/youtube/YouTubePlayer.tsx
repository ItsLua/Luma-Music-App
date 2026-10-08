import { useEffect, useRef, useState } from 'react'
import { playbackEngine } from './YouTubePlaybackEngine'
export function YouTubePlayer() {
  const ref = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const container = ref.current
    if (container) void playbackEngine.attach(container)
    return () => playbackEngine.detach()
  }, [attempt])
  return (
    <div className="youtube-player-section">
      <div ref={ref} className="youtube-player" aria-label="YouTube video player" />
      <button className="text-button" onClick={() => setAttempt((n) => n + 1)}>
        Reload YouTube player
      </button>
    </div>
  )
}
