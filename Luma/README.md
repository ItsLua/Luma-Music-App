# Luma

Luma is a React/TypeScript music PWA with a YouTube catalog, a visible official YouTube player, locally saved likes/playlists, and an offline app shell. The existing branding, navigation, library and queue remain intact.

## Local setup

Requires Node 22.12+ (Node 24 recommended).

```sh
npm install
cp .dev.vars.example .dev.vars
# Set YOUTUBE_API_KEY in .dev.vars. Never put it in a VITE_* variable.
npm run dev
```

Open `http://localhost:5173`. Vite's development middleware runs the same catalog handler used by Cloudflare. Local development reads `.dev.vars` on each API request, so saving a replacement key takes effect without a restart. The production service worker is enabled by `npm run build && npm run preview`, at `http://localhost:4173`.

Without a YouTube key, local library/settings/PWA features work, but catalog requests return a clear configuration error. There is no fallback catalog. No key is needed by the IFrame Player API itself.

## Features preserved and changed

- Existing Luma colors, navigation, responsive pages, playlist creation/rename/delete, likes, history, queue order/shuffle/repeat, themes and installation UI.
- YouTube video search, metadata normalization, pagination, search refinement chips and conservative originality ranking.
- Optional Apple Music canonical metadata (artist, title, album, duration and ISRC); a canonical failure never prevents YouTube search.
- Visible YouTube IFrame playback inside Now Playing: play/pause, seek, volume, next/previous, buffering, ended/error handling and queue continuation.
- Provider-specific migration preserves playlist IDs/names/preferences and supported entries, removes obsolete tracks and shows an explanation. It does not silently match saved songs to unrelated videos.
- Offline app shell and local library access. API responses and YouTube media are not cached by the service worker.

YouTube playback is **not background audio**. Selecting a track opens Now Playing. Closing it destroys the player and pauses playback; hiding the tab, covering the player with another dialog, or scrolling it out of view also pauses it. The mini-player reopens the visible video to resume. YouTube controls advertisements, restrictions and quality. Luma does not hide player controls, extract audio, block ads or download media. Custom lock-screen controls that could start hidden playback have been removed; YouTube/browser behavior governs system integration.

## Architecture

```text
React pages / Zustand stores
    → music/MusicSearchService.ts
    → music/youtube/YouTubeSearchProvider.ts
    → /api/music (Cloudflare Worker)
        → official YouTube Data API v3
        → optional Apple Music canonical metadata
        → OfficialityScorer + ResultRanker

Track reference → YouTubePlaybackEngine → visible official YT.Player
```

`src/music/ranking` contains version classification, intent parsing and scoring. `server/catalog.ts` handles upstream requests; `server/index.ts` validates requests and applies rate limiting. Secrets stay server-side. `localRepository` keeps versioned user data; accounts and database synchronization are not implemented or required.

The normalized model retains the fields existing UI components use and adds `youtubeVideoId`, `channelName`, `playbackType`, `versionType`, `authenticity`, evidence reasons, optional canonical ID/ISRC and metadata timestamp. Displayed uploader identity is preserved, even when canonical metadata matches.

## Originality ranking

Normal searches favor relevant original/music-video candidates and lower alternate versions, especially covers. Explicit slowed/live/remix/cover/unreleased intent reverses that preference. Refinement chips preserve the base text and add an explicit version request. Pagination appends unique results without moving already reviewed rows.

Evidence combines canonical artist/title matches, channel-name relationship, matched Topic/VEVO suffixes, title wording and duration similarity. Channel names and “official audio” titles can be spoofed. **Official** requires a canonical match and an independently verified channel ID in the server's optional registry. Heuristic matches may receive **Likely Official**; uncertain results show **YouTube**. A copied ISRC in a description is never treated as proof. An ISRC stored on a result comes from its canonical match, not verification of the video recording.

YouTube Data API does not provide an authoritative official-artist-channel badge or recording ISRC for general search results. This system improves ranking but cannot guarantee that the actual original is returned, correctly identified, or embeddable. Artist-only/title-only ambiguous searches are particularly uncertain without canonical metadata. Version labels are inferred from titles and can misclassify songs whose actual titles contain words such as “Live” or “Remix.”

## Server configuration

Set secrets using `.dev.vars` locally and Wrangler secrets in production. `.dev.vars` and environment files are gitignored.

| Variable                      | Required                | Purpose                                                                                                                      |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `YOUTUBE_API_KEY`             | Yes, for catalog search | Google Cloud API key with YouTube Data API v3 enabled. Restrict it to that API.                                              |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | No                      | Signed Apple Music developer JWT, used only by the Worker for canonical catalog search. Rotate before expiry.                |
| `APPLE_MUSIC_STOREFRONT`      | No, default `us`        | Two-letter Apple storefront.                                                                                                 |
| `YOUTUBE_REGION`              | No, default `US`        | Two-letter region for eligible results/popular music videos.                                                                 |
| `VERIFIED_ARTIST_CHANNELS`    | No, default `[]`        | JSON records: `channelId`, `artistName`, `sourceUrl`. Each ID must be independently verified against an artist-owned source. |

For Google Cloud key setup, enable YouTube Data API v3 and create a dedicated private server key. Keep its API restriction set to **YouTube Data API v3**. Website/referrer restrictions reject server requests. Use an IP restriction only when the server has fixed outbound IPs; the supplied Cloudflare deployment does not configure fixed egress. For this setup, use **Application restrictions → None** while retaining the API restriction. Never reuse or expose a browser key.

Apple's token requires a MusicKit-capable Apple Developer account/key. No Apple Music subscription or user token is needed for public catalog metadata requests. Apple Music playback and Spotify integration are not implemented. Google OAuth/user accounts are not used. Never paste private credentials into chat or use a `VITE_*` credential.

## Quota, caching and privacy

Search uses the official `search.list` API with `type=video`, `videoEmbeddable=true` and relevance order. It does not restrict searches to the Music category, which could exclude rare uploads. It deliberately omits the additional syndication filter, which excluded original artist videos in live verification even though they allow embedding. Details are batched through `videos.list` and nonpublic/nonembeddable/upcoming entries are filtered. Popular Music uses the actual `mostPopular` music-category endpoint; live and slowed home sections are labeled as discovery searches, not charts.

Search, pagination and video metadata use bounded five-minute server caches and in-flight deduplication. Canonical metadata has a one-hour cache. Browser metadata is cached for three minutes, with cancellation, debounce and shared-request deduplication. Cloudflare rate limiting is configured at 30 API requests per client IP per minute. Upstream quota errors produce a cooldown and a clear UI state; the provider key's Google quota remains the global limit. Per-isolate caches and rate limiting cannot replace quota planning or prevent all distributed abuse.

Saved likes/playlists contain references and timestamped metadata, never media. On storage load, metadata older than 29 days is stripped while preserving the user's video reference. Cleared metadata is shown as “Saved YouTube video”; playback availability is enforced by YouTube. Local data can be deleted in Settings. Search terms go to the Worker and YouTube, and optionally Apple Music. YouTube embeds can collect playback/network data and show advertisements under Google's policies. Luma adds no analytics or advertisements.

## Cloudflare deployment

This project uses **Cloudflare Workers with Static Assets**: the Vite app and the secret-bearing API are deployed together. `wrangler.jsonc` configures SPA fallback, `/api/*` Worker routing, assets and the rate limiter. A static Pages-only upload would omit the API; use this Worker deployment.

```sh
npm ci
npm run build
npm run cf:check          # Local Worker bundle dry run; no deployment
npx wrangler login
npx wrangler secret put YOUTUBE_API_KEY
# Optional:
npx wrangler secret put APPLE_MUSIC_DEVELOPER_TOKEN
npm run deploy
```

Wrangler prints the actual HTTPS deployment URL. No Cloudflare deployment has been performed by this migration. To connect a domain, open your Worker's **Settings → Domains & Routes → Add → Custom Domain** and select a domain in your Cloudflare account. Deploy at the origin root.

For production-equivalent local testing, `npm run build && npm run cf:dev` runs the Worker with `.dev.vars` and built assets. For Cloudflare's Git build integration, use `npm ci && npm run build` as the build command and `npx wrangler deploy` as the deploy command, then configure the same secrets in the Worker dashboard.

`public/_headers` provides CSP and cache headers for static assets. The referrer policy intentionally allows origin identification by YouTube to avoid player error 153. The service worker uses `no-store`; hashed assets use immutable caching. API responses are `no-store` to browsers, have fixed upstream destinations, validated input and no cross-origin access.

## Verification commands

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run cf:check
npx playwright install chromium webkit
npm run test:e2e
npm run test:live         # Requires configured YouTube key + network
npm run format:check
npm audit --audit-level=high
```

Unit tests cover normalization, original-vs-cover ranking, Topic identity, explicit version intent, canonical failure, quota failures, metadata caches, migrations, queue and persistence, search cancellation and the playback adapter. Deterministic browser tests use clearly isolated test fixtures and an IFrame API double; passing those tests is **not** evidence of real YouTube playback. The opt-in live suite requires real catalog results and advancing real player time. See [verification report](docs/VERIFICATION.md).

## Phone installation

On iPhone, open the deployed HTTPS URL in Safari → **Share → Add to Home Screen → Add** (leave **Open as Web App** enabled if offered). On Android, use Chrome → **Install app**, or Luma's Settings installation action when available. Open Luma from the Home Screen. Installation does not grant background playback or remove YouTube restrictions. Physical-device installation remains a device-level validation step.

## Provider references

See [provider documentation](docs/PROVIDERS.md), [YouTube Data API](https://developers.google.com/youtube/v3/docs/search/list), [IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies), [YouTube Terms](https://www.youtube.com/t/terms), [Google Privacy Policy](https://policies.google.com/privacy), and [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/).
