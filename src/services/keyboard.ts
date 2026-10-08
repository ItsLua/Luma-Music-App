import { playbackEngine } from '../music/youtube/YouTubePlaybackEngine'
import { usePlayerStore } from '../stores/playerStore'
/** Native input/button semantics take precedence over global playback shortcuts. */
export function initializeKeyboard() {
  const keydown = (event: KeyboardEvent) => {
    const target = event.target
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select, button, a, dialog')))
    )
      return
    if (event.code === 'Space') {
      event.preventDefault()
      playbackEngine.toggle()
    } else if (event.code === 'ArrowRight') {
      event.preventDefault()
      playbackEngine.seek(usePlayerStore.getState().position + 10)
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault()
      playbackEngine.seek(usePlayerStore.getState().position - 10)
    } else if (event.key.toLowerCase() === 'm') playbackEngine.toggleMute()
  }
  window.addEventListener('keydown', keydown)
  return () => window.removeEventListener('keydown', keydown)
}
