import { create } from 'zustand'
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export const useInstallStore = create<{ prompt: InstallPromptEvent | null; installed: boolean }>(
  () => ({
    prompt: null,
    installed:
      matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  }),
)
export function initializeInstall() {
  const capture = (event: Event) => {
    event.preventDefault()
    useInstallStore.setState({ prompt: event as InstallPromptEvent })
  }
  const installed = () => useInstallStore.setState({ installed: true, prompt: null })
  window.addEventListener('beforeinstallprompt', capture)
  window.addEventListener('appinstalled', installed)
  return () => {
    window.removeEventListener('beforeinstallprompt', capture)
    window.removeEventListener('appinstalled', installed)
  }
}
