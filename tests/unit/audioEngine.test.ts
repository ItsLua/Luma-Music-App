import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  YouTubePlaybackEngine,
  type PlayerOptions,
  type YouTubePlayer,
} from '../../src/music/youtube/YouTubePlaybackEngine'
import { usePlayerStore } from '../../src/stores/playerStore'
import { useSettingsStore } from '../../src/stores/settingsStore'
import { useLibraryStore } from '../../src/stores/libraryStore'
import { track } from '../fixtures'
class TestPlayer implements YouTubePlayer {
  static latest: TestPlayer
  currentTime = 0
  duration = 20
  state = 5
  videoId = ''
  volume = 100
  muted = false
  constructor(
    _element: HTMLElement,
    public options: PlayerOptions,
  ) {
    TestPlayer.latest = this
    queueMicrotask(() => options.events.onReady())
  }
  emit(state: number) {
    this.state = state
    this.options.events.onStateChange({ data: state })
  }
  loadVideoById = vi.fn((o: { videoId: string; startSeconds: number }) => {
    this.videoId = o.videoId
    this.currentTime = o.startSeconds
    this.emit(3)
  })
  cueVideoById = vi.fn((o: { videoId: string; startSeconds: number }) => {
    this.videoId = o.videoId
    this.currentTime = o.startSeconds
    this.emit(5)
  })
  playVideo = vi.fn(() => this.emit(1))
  pauseVideo = vi.fn(() => this.emit(2))
  stopVideo = vi.fn(() => this.emit(0))
  seekTo = vi.fn((n: number) => {
    this.currentTime = n
  })
  setVolume = (n: number) => {
    this.volume = n
  }
  mute = () => {
    this.muted = true
  }
  unMute = () => {
    this.muted = false
  }
  getCurrentTime = () => this.currentTime
  getDuration = () => this.duration
  getPlayerState = () => this.state
  getVideoData = () => ({ video_id: this.videoId })
  destroy = vi.fn()
}
let engine: YouTubePlaybackEngine
beforeEach(() => {
  vi.useFakeTimers()
  usePlayerStore.getState().reset()
  useLibraryStore.getState().reset()
  useSettingsStore.getState().update({ autoplay: true })
  engine = new YouTubePlaybackEngine(async () => ({ Player: TestPlayer }))
  engine.mount()
})
afterEach(() => {
  engine.destroy()
  vi.useRealTimers()
})
async function start() {
  usePlayerStore.getState().playTracks([track('a'), track('b')])
  await engine.attach(document.createElement('div'))
  await vi.advanceTimersByTimeAsync(0)
  return TestPlayer.latest
}
describe('visible official YouTube playback adapter', () => {
  it('does not claim playing until the player reports it', async () => {
    const player = await start()
    expect(player.loadVideoById).toHaveBeenCalledOnce()
    expect(usePlayerStore.getState().status).toBe('buffering')
    player.emit(1)
    expect(usePlayerStore.getState().status).toBe('playing')
  })
  it('supports pause, seek, volume and mute', async () => {
    const player = await start()
    player.emit(1)
    engine.pause()
    expect(player.pauseVideo).toHaveBeenCalled()
    engine.seek(8)
    expect(player.seekTo).toHaveBeenCalledWith(8, true)
    engine.setVolume(0.3)
    expect(player.volume).toBe(30)
    engine.toggleMute()
    expect(player.muted).toBe(true)
  })
  it('loads the next video and implements repeat-one without another player', async () => {
    const player = await start()
    player.emit(1)
    player.emit(0)
    expect(usePlayerStore.getState().index).toBe(1)
    expect(player.videoId).toBe(track('b').youtubeVideoId)
    usePlayerStore.setState({ repeat: 'one' })
    player.emit(1)
    player.emit(0)
    expect(player.loadVideoById).toHaveBeenCalledTimes(3)
    expect(TestPlayer.latest).toBe(player)
  })
  it('restores queue position paused until a gesture', async () => {
    usePlayerStore.getState().enqueue(track())
    usePlayerStore.setState({ position: 12, playerVisible: true })
    await engine.attach(document.createElement('div'))
    await vi.advanceTimersByTimeAsync(0)
    expect(TestPlayer.latest.cueVideoById).toHaveBeenCalledWith({
      videoId: track().youtubeVideoId,
      startSeconds: 12,
    })
    expect(TestPlayer.latest.loadVideoById).not.toHaveBeenCalled()
  })
  it('does not skip into a failure loop on embed errors', async () => {
    const player = await start()
    player.options.events.onError({ data: 150 })
    expect(usePlayerStore.getState().status).toBe('failed')
    expect(usePlayerStore.getState().index).toBe(0)
  })
  it('pauses under another dialog and destroys the player on close', async () => {
    const player = await start()
    player.emit(1)
    window.dispatchEvent(new Event('luma:overlay'))
    expect(usePlayerStore.getState().status).toBe('paused')
    engine.detach()
    expect(player.destroy).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('pauses on hidden document and refuses background play events', async () => {
    const player = await start()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    player.emit(1)
    expect(usePlayerStore.getState().status).toBe('paused')
    expect(player.state).toBe(2)
  })
  it('times out buffering with a recoverable error', async () => {
    await start()
    await vi.advanceTimersByTimeAsync(30001)
    expect(usePlayerStore.getState().status).toBe('failed')
  })
  it('records listening but excludes seeks', async () => {
    const player = await start()
    player.emit(1)
    engine.seek(18)
    await vi.advanceTimersByTimeAsync(500)
    expect(useLibraryStore.getState().history).toHaveLength(0)
    engine.seek(0)
    for (let i = 1; i <= 20; i++) {
      player.currentTime = i * 0.5
      await vi.advanceTimersByTimeAsync(500)
    }
    expect(useLibraryStore.getState().history).toHaveLength(1)
  })
})
