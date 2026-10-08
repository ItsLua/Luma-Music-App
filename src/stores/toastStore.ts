import { create } from 'zustand'
export const useToast = create<{ text: string; sequence: number }>(() => ({
  text: '',
  sequence: 0,
}))
export function notify(text: string) {
  useToast.setState((s) => ({ text, sequence: s.sequence + 1 }))
}
