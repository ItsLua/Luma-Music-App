import { create } from 'zustand'
import { z } from 'zod'
import { localRepository } from '../services/storage'
const schema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  autoplay: z.boolean(),
  hideExplicit: z.boolean(),
})
export type Settings = z.infer<typeof schema>
export const defaultSettings: Settings = { theme: 'dark', autoplay: true, hideExplicit: false }
export const useSettingsStore = create<Settings & { update(settings: Partial<Settings>): void }>(
  (set) => ({
    ...localRepository.read('settings', schema, defaultSettings),
    update: (settings) => set(settings),
  }),
)
useSettingsStore.subscribe(({ theme, autoplay, hideExplicit }) => {
  localRepository.write('settings', { theme, autoplay, hideExplicit })
})
