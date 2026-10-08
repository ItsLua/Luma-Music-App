import { savePlayerSession, usePlayerStore } from '../../stores/playerStore.ts'
import { useLibraryStore } from '../../stores/libraryStore.ts'
import { useSettingsStore } from '../../stores/settingsStore.ts'
export interface YouTubePlayer {
  loadVideoById(options: { videoId: string; startSeconds: number }): void
  cueVideoById(options: { videoId: string; startSeconds: number }): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  getVideoData(): { video_id?: string }
  destroy(): void
}
export interface PlayerOptions {
  width: string
  height: string
  playerVars: Record<string, string | number>
  events: {
    onReady(): void
    onStateChange(event: { data: number }): void
    onError(event: { data: number }): void
    onAutoplayBlocked(): void
  }
}
export interface YouTubeAPI {
  Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer
}
declare global {
  interface Window {
    YT?: YouTubeAPI
    onYouTubeIframeAPIReady?: () => void
  }
}
let apiPromise: Promise<YouTubeAPI> | undefined
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    const script = document.createElement('script')
    const timeout = setTimeout(() => {
      script.remove()
      reject(new Error('YouTube player timed out.'))
    }, 15000)
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      clearTimeout(timeout)
      if (window.YT) resolve(window.YT)
      else reject(new Error('YouTube player unavailable.'))
    }
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      clearTimeout(timeout)
      script.remove()
      reject(new Error('Unable to load the YouTube player.'))
    }
    document.head.append(script)
  }).catch((error: unknown) => {
    apiPromise = undefined
    throw error
  })
  return apiPromise
}
/** Owns exactly one visible official player. No extracted streams, hidden audio, or background playback. */
export class YouTubePlaybackEngine {
  private player: YouTubePlayer | null = null
  private container: HTMLElement | null = null
  private ready = false
  private generation = 0
  private loadedKey: string | null = null
  private pendingPlay = false
  private visible = false
  private cleanups: Array<() => void> = []
  private interval: ReturnType<typeof setInterval> | undefined
  private watchdog: ReturnType<typeof setTimeout> | undefined
  private observer: IntersectionObserver | undefined
  private elapsed = 0
  private lastPosition = 0
  private recorded = false
  constructor(private readonly loader = loadYouTubeAPI) {}
  mount() {
    if (this.cleanups.length) return
    this.cleanups.push(
      usePlayerStore.subscribe((s, prev) => {
        if (s.playRequest !== prev.playRequest && s.queue[s.index]) {
          this.pendingPlay = true
          usePlayerStore.setState({ playerVisible: true, status: 'loading', error: null })
          if (this.ready) this.load()
        }
        if (s.volume !== prev.volume) this.player?.setVolume(s.volume * 100)
        if (s.muted !== prev.muted) {
          if (s.muted) this.player?.mute()
          else this.player?.unMute()
        }
        if (!s.queue.length && prev.queue.length) {
          this.detach()
          usePlayerStore.setState({ playerVisible: false, status: 'idle' })
        }
      }),
    )
    const hide = () => {
      if (document.hidden) this.pause()
    }
    const overlay = () => this.pause()
    const pagehide = () => {
      this.pause()
      savePlayerSession()
    }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('luma:overlay', overlay)
    this.cleanups.push(
      () => document.removeEventListener('visibilitychange', hide),
      () => window.removeEventListener('pagehide', pagehide),
      () => window.removeEventListener('luma:overlay', overlay),
    )
  }
  async attach(container: HTMLElement) {
    this.container = container
    const generation = ++this.generation
    this.visible = true
    try {
      const api = await this.loader()
      if (generation !== this.generation) return
      const element = document.createElement('div')
      container.replaceChildren(element)
      this.player = new api.Player(element, {
        width: '100%',
        height: '100%',
        playerVars: { controls: 1, playsinline: 1, origin: location.origin, autoplay: 0, rel: 0 },
        events: {
          onReady: () => {
            if (generation !== this.generation) return
            this.ready = true
            const s = usePlayerStore.getState()
            this.player?.setVolume(s.volume * 100)
            if (s.muted) this.player?.mute()
            this.load()
          },
          onStateChange: ({ data }) => {
            if (generation === this.generation) this.stateChanged(data)
          },
          onError: ({ data }) => {
            if (generation === this.generation)
              this.fail(
                data === 100
                  ? 'This video was removed or made private.'
                  : data === 101 || data === 150
                    ? 'The owner does not allow embedded playback. Open it on YouTube.'
                    : data === 153
                      ? 'YouTube could not identify this site. Check the site referrer policy.'
                      : 'Unable to play this YouTube video. Try again or open it on YouTube.',
              )
          },
          onAutoplayBlocked: () => {
            this.pendingPlay = false
            clearTimeout(this.watchdog)
            usePlayerStore.setState({
              status: 'paused',
              error: 'Tap play in the YouTube player to start.',
            })
          },
        },
      })
      this.interval = setInterval(() => this.tick(), 500)
      if (typeof IntersectionObserver !== 'undefined') {
        this.observer = new IntersectionObserver(
          (entries) => {
            this.visible = (entries[0]?.intersectionRatio ?? 0) >= 0.95
            if (!this.visible) this.pause()
          },
          { threshold: [0, 0.95, 1] },
        )
        this.observer.observe(container)
      }
    } catch {
      if (generation === this.generation)
        this.fail('Unable to load the YouTube player. Check your connection and retry.')
    }
  }
  private current() {
    const s = usePlayerStore.getState()
    return s.queue[s.index]
  }
  private load() {
    const current = this.current(),
      s = usePlayerStore.getState()
    if (!this.ready || !this.player || !current) return
    if (current.key !== this.loadedKey) {
      this.elapsed = 0
      this.recorded = false
    }
    this.loadedKey = current.key
    this.lastPosition = s.position
    const options = {
      videoId: current.track.youtubeVideoId,
      startSeconds: s.status === 'ended' ? 0 : s.position,
    }
    if (this.pendingPlay && this.visible && !document.hidden) {
      usePlayerStore.setState({ status: 'loading', error: null })
      this.player.loadVideoById(options)
      this.startWatchdog()
    } else {
      this.player.cueVideoById(options)
      usePlayerStore.setState({ status: 'paused' })
    }
  }
  private startWatchdog() {
    clearTimeout(this.watchdog)
    this.watchdog = setTimeout(
      () =>
        this.fail('YouTube has not started. Try its play button or open this video on YouTube.'),
      30000,
    )
  }
  private stateChanged(state: number) {
    if (
      state === 1 &&
      (!this.visible || document.hidden || !usePlayerStore.getState().playerVisible)
    ) {
      this.pause()
      return
    }
    // Ignore late state events for the previous video during a queue transition.
    const id = this.player?.getVideoData().video_id
    if (id && id !== this.current()?.track.youtubeVideoId) return
    if (state === 1) {
      clearTimeout(this.watchdog)
      this.pendingPlay = false
      usePlayerStore.setState({ status: 'playing', error: null })
    } else if (state === 2) {
      clearTimeout(this.watchdog)
      usePlayerStore.setState({ status: 'paused' })
      savePlayerSession()
    } else if (state === 3) {
      usePlayerStore.setState({ status: 'buffering' })
      this.startWatchdog()
    } else if (state === 0) {
      clearTimeout(this.watchdog)
      usePlayerStore.setState({ status: 'ended' })
      if (this.visible && !document.hidden && useSettingsStore.getState().autoplay)
        usePlayerStore.getState().next(true)
    } else if (state === 5 && usePlayerStore.getState().status !== 'failed')
      usePlayerStore.setState({ status: 'paused' })
  }
  private tick() {
    if (!this.ready || !this.player) return
    const position = this.player.getCurrentTime() || 0,
      duration = this.player.getDuration() || 0
    const delta = position - this.lastPosition
    if (this.player.getPlayerState() === 1 && delta > 0 && delta < 1.5) this.elapsed += delta
    this.lastPosition = position
    if (Number.isFinite(position) && Number.isFinite(duration))
      usePlayerStore.setState({ position, duration })
    const track = this.current()?.track
    if (track && !this.recorded && this.elapsed >= Math.min(10, Math.max(1, duration / 2))) {
      this.recorded = true
      useLibraryStore.getState().recordPlay(track)
    }
    if (this.elapsed > 0 && Math.floor(this.elapsed) % 10 === 0) savePlayerSession()
  }
  private fail(message: string) {
    clearTimeout(this.watchdog)
    this.pendingPlay = false
    this.player?.pauseVideo()
    usePlayerStore.setState({ status: 'failed', error: message })
  }
  play() {
    if (!this.current()) return
    this.pendingPlay = true
    usePlayerStore.setState({ playerVisible: true, error: null })
    if (!this.ready) {
      if (this.container && usePlayerStore.getState().status === 'failed') {
        const container = this.container
        this.detach()
        this.pendingPlay = true
        usePlayerStore.setState({ status: 'loading' })
        void this.attach(container)
      }
      return
    }
    if (document.hidden || !this.visible) {
      this.pendingPlay = false
      return
    }
    if (
      this.loadedKey !== this.current()?.key ||
      usePlayerStore.getState().status === 'failed' ||
      usePlayerStore.getState().status === 'ended'
    )
      this.load()
    else {
      this.player?.playVideo()
      usePlayerStore.setState({ status: 'loading' })
      this.startWatchdog()
    }
  }
  pause() {
    this.pendingPlay = false
    clearTimeout(this.watchdog)
    this.player?.pauseVideo()
    usePlayerStore.setState({ status: this.current() ? 'paused' : 'idle' })
    savePlayerSession()
  }
  toggle() {
    if (['playing', 'loading', 'buffering'].includes(usePlayerStore.getState().status)) this.pause()
    else this.play()
  }
  seek(position: number) {
    const s = usePlayerStore.getState(),
      value = Math.max(0, Math.min(Number.isFinite(position) ? position : 0, s.duration))
    this.lastPosition = value
    this.player?.seekTo(value, true)
    usePlayerStore.setState({ position: value })
    savePlayerSession()
  }
  next() {
    this.pause()
    usePlayerStore.getState().next()
  }
  previous() {
    if (usePlayerStore.getState().position > 3) this.seek(0)
    else usePlayerStore.getState().previous()
  }
  setVolume(value: number) {
    usePlayerStore.setState({ volume: Math.max(0, Math.min(1, value)), muted: false })
  }
  toggleMute() {
    usePlayerStore.setState((s) => ({ muted: !s.muted }))
  }
  detach() {
    this.generation++
    this.pause()
    clearInterval(this.interval)
    this.observer?.disconnect()
    this.observer = undefined
    this.player?.destroy()
    this.player = null
    this.container = null
    this.ready = false
    this.visible = false
    this.loadedKey = null
  }
  destroy() {
    this.detach()
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }
}
export const playbackEngine = new YouTubePlaybackEngine()
