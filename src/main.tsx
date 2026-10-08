import App from './App'
import ReactDOM from 'react-dom/client'
import { playbackEngine } from './music/youtube/YouTubePlaybackEngine'
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/manrope/wght.css'
import './styles.css'
import { initializeInstall } from './services/install'
import { initializeKeyboard } from './services/keyboard'
playbackEngine.mount()
const cleanupInstall = initializeInstall()
const cleanupKeyboard = initializeKeyboard()
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    playbackEngine.destroy()
    cleanupInstall()
    cleanupKeyboard()
  })
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
