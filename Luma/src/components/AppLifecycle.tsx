import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { WifiOff } from 'lucide-react'
import { storageStatus } from '../services/storage'
import { useSettingsStore } from '../stores/settingsStore'
import { logger } from '../services/logger'
function onlineSubscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}
export function AppLifecycle() {
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine),
    storageError = useSyncExternalStore(storageStatus.subscribe, storageStatus.getSnapshot)
  const theme = useSettingsStore((s) => s.theme),
    [updateError, setUpdateError] = useState(false),
    [migrationNotice, setMigrationNotice] = useState(() => {
      try {
        return localStorage.getItem('luma:migration-notice')
      } catch {
        return null
      }
    })
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => logger.error('offline-shell-registration-failed') })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  return (
    <>
      {migrationNotice && (
        <div className="update-banner" role="status">
          <span>{migrationNotice}</span>
          <button
            onClick={() => {
              localStorage.removeItem('luma:migration-notice')
              setMigrationNotice(null)
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {!online && (
        <div className="network-banner" role="status">
          <WifiOff size={16} />
          You’re offline. Your library is here; streaming needs a connection.
        </div>
      )}
      {storageError && (
        <div className="storage-banner" role="alert">
          {storageError}
        </div>
      )}
      {needRefresh && (
        <div className="update-banner" role="status">
          <span>
            {updateError ? 'Update failed. Please try again.' : 'A fresh version of Luma is ready.'}
          </span>
          <button
            onClick={() => {
              void updateServiceWorker(true).catch(() => setUpdateError(true))
            }}
          >
            Update and reload
          </button>
          <button onClick={() => setNeedRefresh(false)}>Later</button>
        </div>
      )}
    </>
  )
}
