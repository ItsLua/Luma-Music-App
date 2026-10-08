import { lazy, Suspense, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  AudioLines,
  Home,
  Search,
  Library,
  Settings,
  Plus,
  Heart,
  Download,
  ListMusic,
} from 'lucide-react'
import { MiniPlayer } from '../features/player/MiniPlayer'
import { usePlaylistStore } from '../stores/playlistStore'
import { Dialog } from '../components/Dialog'
import { AppLifecycle } from '../components/AppLifecycle'
import { usePlayerStore } from '../stores/playerStore'
import { playbackEngine } from '../music/youtube/YouTubePlaybackEngine'
import { Toast } from '../components/Feedback'
import { notify } from '../stores/toastStore'
const NowPlaying = lazy(() => import('../features/player/NowPlaying'))
const Queue = lazy(() => import('../features/player/Queue'))
const nav = [
  { to: '/', name: 'Home', icon: Home },
  { to: '/search', name: 'Search', icon: Search },
  { to: '/library', name: 'Library', icon: Library },
  { to: '/settings', name: 'Settings', icon: Settings },
]
export function AppShell() {
  const player = usePlayerStore((s) => s.playerVisible),
    setPlayer = (visible: boolean) => {
      if (!visible) playbackEngine.pause()
      usePlayerStore.setState({ playerVisible: visible })
    },
    [queue, setQueue] = useState(false),
    [create, setCreate] = useState(false),
    [name, setName] = useState(''),
    playlists = usePlaylistStore((s) => s.playlists)
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Luma home">
          <img src="/favicon.svg" width="38" height="38" alt="" />
          <span>luma</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(({ to, name, icon: Icon }) => (
            <NavLink end={to === '/'} key={to} to={to}>
              <Icon size={21} />
              {name}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-library">
          <div className="sidebar-label">
            <span>YOUR COLLECTION</span>
            <button
              className="icon-button"
              aria-label="Create playlist"
              onClick={() => setCreate(true)}
            >
              <Plus size={18} />
            </button>
          </div>
          <Link className="sidebar-liked" to="/library?tab=likes">
            <span>
              <Heart size={19} />
            </span>
            Liked songs
          </Link>
          {playlists.slice(0, 8).map((p) => (
            <Link className="sidebar-playlist" key={p.id} to={`/playlist/${p.id}`}>
              <ListMusic size={18} />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-bottom">
          <AudioLines size={28} />
          <p>
            Your music.
            <br />
            In a new light.
          </p>
          <Link to="/settings#install">
            <Download size={16} />
            Install Luma
          </Link>
          <a
            className="youtube-credit"
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by YouTube
          </a>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <Link className="mobile-brand brand" to="/">
            <img src="/favicon.svg" width="30" height="30" alt="" />
            <span>luma</span>
          </Link>
          <Link className="topbar-search" to="/search">
            <Search size={18} />
            <span>Find your next favorite</span>
            <kbd>Search</kbd>
          </Link>
          <div className="topbar-right">
            <span>YOUR MUSIC. IN A NEW LIGHT.</span>
            <Link className="guest-button" to="/settings" aria-label="Your settings">
              L
            </Link>
          </div>
        </header>
        <AppLifecycle />
        <main id="main" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="page route-loading" role="status">
                Opening Luma…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MiniPlayer openPlayer={() => setPlayer(true)} openQueue={() => setQueue(true)} />
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map(({ to, name, icon: Icon }) => (
          <NavLink end={to === '/'} key={to} to={to}>
            <Icon size={22} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={null}>
        {player && <NowPlaying onClose={() => setPlayer(false)} openQueue={() => setQueue(true)} />}{' '}
        {queue && <Queue onClose={() => setQueue(false)} />}
      </Suspense>
      {create && (
        <Dialog title="Create playlist" onClose={() => setCreate(false)}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              usePlaylistStore.getState().createPlaylist(name)
              notify('Playlist created')
              setCreate(false)
              setName('')
            }}
          >
            <label htmlFor="playlist-name">Playlist name</label>
            <input
              id="playlist-name"
              placeholder="Give it a name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoFocus
            />
            <button className="button primary" disabled={!name.trim() || playlists.length >= 100}>
              Create playlist
            </button>
          </form>
        </Dialog>
      )}
      <Toast />
    </div>
  )
}
