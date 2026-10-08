import type { MusicCatalog } from '../types/music.ts'
import { YouTubeSearchProvider } from './youtube/YouTubeSearchProvider.ts'
/** UI depends on this catalog boundary, not on API-specific responses or credentials. */
export const musicSearch: MusicCatalog = new YouTubeSearchProvider()
