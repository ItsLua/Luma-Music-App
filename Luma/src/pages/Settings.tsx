import { useState } from 'react'
import { Check, Download, ExternalLink, Share, Smartphone } from 'lucide-react'
import { defaultSettings, useSettingsStore } from '../stores/settingsStore'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import { useInstallStore } from '../services/install'
import { localRepository } from '../services/storage'
import { clearCatalogCache } from '../services/http'
import { playbackEngine } from '../music/youtube/YouTubePlaybackEngine'
import { Dialog } from '../components/Dialog'
import { notify } from '../stores/toastStore'
export default function Settings() {
  const settings = useSettingsStore(),
    installed = useInstallStore((s) => s.installed),
    prompt = useInstallStore((s) => s.prompt)
  const [confirm, setConfirm] = useState<'history' | 'all' | null>(null),
    [installing, setInstalling] = useState(false)
  async function install() {
    if (!prompt) return
    setInstalling(true)
    try {
      await prompt.prompt()
      await prompt.userChoice
      useInstallStore.setState({ prompt: null })
    } catch {
      notify('Use your browser’s menu to install Luma.')
    } finally {
      setInstalling(false)
    }
  }
  function clear() {
    if (confirm === 'history') useLibraryStore.getState().clearHistory()
    else {
      playbackEngine.pause()
      usePlayerStore.getState().reset()
      useLibraryStore.getState().reset()
      usePlaylistStore.getState().reset()
      useSettingsStore.getState().update(defaultSettings)
      clearCatalogCache()
      localRepository.clear()
    }
    setConfirm(null)
    notify(confirm === 'history' ? 'Listening history cleared' : 'Local Luma data cleared')
  }
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>
            Your Luma<span>.</span>
          </h1>
          <p className="muted">A few things to make the music yours.</p>
        </div>
      </div>
      <section className="settings-section">
        <h2>Listening & appearance</h2>
        <div className="setting-row">
          <div>
            <label htmlFor="theme">Theme</label>
            <p>Set the mood for your space.</p>
          </div>
          <select
            id="theme"
            value={settings.theme}
            onChange={(e) => settings.update({ theme: e.target.value as typeof settings.theme })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Follow system</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="autoplay">Continue the queue</label>
            <p>Play the next track when a song finishes.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            id="autoplay"
            checked={settings.autoplay}
            onChange={(e) => settings.update({ autoplay: e.target.checked })}
          />
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="explicit">Hide marked explicit tracks</label>
            <p>Uses artist-provided labels. Unlabelled songs may still contain explicit content.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            id="explicit"
            checked={settings.hideExplicit}
            onChange={(e) => settings.update({ hideExplicit: e.target.checked })}
          />
        </div>
        <div className="setting-note">
          Video quality and advertisements are handled by YouTube. On iPhone, use your device’s
          volume buttons if the browser ignores the volume slider.
        </div>
      </section>
      <section className="install-section" id="install">
        <div className="install-symbol">
          <Smartphone size={34} />
        </div>
        <div>
          <p className="eyebrow">ALWAYS WITHIN REACH</p>
          <h2>{installed ? 'Luma is at home here' : 'A little closer to your music.'}</h2>
          <p>
            {installed
              ? 'You’re using Luma as an installed app.'
              : 'Add Luma to your Home Screen for a space that’s all music.'}
          </p>
          {installed ? (
            <span className="installed-badge">
              <Check size={18} />
              Installed
            </span>
          ) : (
            <>
              {prompt && (
                <button
                  className="button primary"
                  disabled={installing}
                  onClick={() => {
                    void install()
                  }}
                >
                  <Download size={17} />
                  {installing ? 'Opening install…' : 'Install Luma'}
                </button>
              )}
              <div className="install-instructions">
                <h3>On iPhone or iPad</h3>
                <ol>
                  <li>Open Luma in Safari.</li>
                  <li>
                    Tap <Share size={14} aria-hidden="true" /> <strong>Share</strong>, then{' '}
                    <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> and open Luma from your Home Screen.
                  </li>
                </ol>
                <h3>On Android</h3>
                <p>
                  Open Luma in Chrome. Tap the browser menu, then <strong>Install app</strong> or{' '}
                  <strong>Add to Home screen</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="settings-section">
        <h2>Your data</h2>
        <p className="section-description">
          Likes, playlists, recent searches, and your queue stay in this browser. They do not sync
          across devices. Clearing site storage removes them.
        </p>
        <div className="setting-row">
          <div>
            <strong>Listening history</strong>
            <p>Start fresh without changing your library.</p>
          </div>
          <button className="button secondary" onClick={() => setConfirm('history')}>
            Clear history
          </button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Local Luma data</strong>
            <p>Remove likes, playlists, queue, and preferences from this device.</p>
          </div>
          <button className="button secondary" onClick={() => setConfirm('all')}>
            Clear data
          </button>
        </div>
      </section>
      <section className="settings-section about-section">
        <img src="/favicon.svg" width="42" height="42" alt="" />
        <div>
          <h2>Music, in a new light.</h2>
          <p>Luma 1.0.0 · Music on YouTube, without ads from Luma.</p>
          <p>
            Playback uses the visible official YouTube player. YouTube controls ads and
            availability. Closing Now Playing, covering the video, or leaving this tab pauses
            playback. Downloads and background playback are not supported.
          </p>
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
            YouTube terms <ExternalLink size={13} />
          </a>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            YouTube privacy <ExternalLink size={13} />
          </a>
          <p className="privacy-note">
            Luma does not insert ads or analytics. YouTube may show ads and collect playback data.
            Searches pass through our server to YouTube and, when configured, Apple Music for
            metadata. Local likes and playlists store video references, never media.
          </p>
        </div>
      </section>
      {confirm && (
        <Dialog
          title={confirm === 'history' ? 'Clear listening history?' : 'Clear all local Luma data?'}
          onClose={() => setConfirm(null)}
        >
          <p className="muted">
            {confirm === 'history'
              ? 'Your recently played tracks will be removed. Likes and playlists will stay.'
              : 'This permanently removes your likes, playlists, queue, searches, and preferences from this browser.'}
          </p>
          <div className="confirm-actions">
            <button className="button secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="button danger" onClick={clear}>
              Clear {confirm === 'history' ? 'history' : 'all data'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
