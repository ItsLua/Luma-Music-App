# YouTube migration verification

Updated October 3, 2026. This report supersedes the previous provider's verification results.

## Changes

Removed the former `src/providers/audio/AudiusProvider.ts`, its catalog entry point, direct-stream URL helper, `HTMLAudioElement` engine, provider environment variable, badges, links and home-section wording. No retired-provider endpoint remains in runtime source or the newly built browser assets. The historical provider name appears only in the storage-migration test and this removal record.

Added the official YouTube Data API v3 catalog through a Cloudflare Worker, optional server-side Apple Music catalog matching, conservative original/alternate ranking, refinement chips, pagination, and the official visible IFrame playback adapter. Branding, routes, library, playlists, likes, history, queue and PWA shell remain in place. The old catalog collection URL shows an unavailable message; local playlists keep their names and IDs during migration.

`Official` requires both a canonical artist/title match and a verified channel-ID registry entry. Heuristic identity and duration matches can produce `Likely Official`. Title keywords alone never verify a channel. Version labels are inferred from uploader metadata. Controlled tests establish ranking rules. The live search checks below also record actual YouTube responses at the time of verification; future ordering can change.

## Commands actually completed

| Command                                         | Result                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install --save-dev --save-exact wrangler`  | Passed; lockfile updated.                                                                                                                 |
| `npm run typecheck`                             | Passed.                                                                                                                                   |
| `npm run lint`                                  | Passed with zero errors/warnings.                                                                                                         |
| `npm run test`                                  | 79 tests passed across seven files.                                                                                                       |
| `npm run build`                                 | Passed. Production app, manifest and service worker generated.                                                                            |
| `npm run cf:check`                              | Cloudflare Worker dry run passed with assets and rate-limit binding. No deployment performed.                                             |
| `npm run test:e2e`                              | 15 passed across desktop Chromium, mobile Chromium and iPhone-sized WebKit; six opt-in live checks skipped in this deterministic run.     |
| `npm run test:embed`                            | Real YouTube documentation sample passed in desktop and mobile Chromium. Initial WebKit attempt through Luma's play button did not start. |
| `npm run test:embed -- --project=iphone-webkit` | Passed with a direct gesture on YouTube's own Play button. Real playback, pause, seek and resume verified.                                |

`npm run format:check` also passed, and `npm audit --audit-level=high` found zero vulnerabilities. A scan of generated browser and Worker bundles found none of the configured server secrets.

The final production build precaches 32 first-party assets (624.83 KiB before compression). The main browser JavaScript bundle is 121.37 kB gzip. No Lighthouse score is claimed.

Wrangler installation emitted package install-script review notices; Playwright emitted a color-environment warning. These were not suppressed. Vite's local-import warning was resolved by explicit TypeScript extensions.

## What the tests establish

Unit tests cover original/alternate ranking, explicit version intent, Topic identity, conservative badges, provider normalization, canonical failure, server errors, caching/deduplication, migrations including quota failures, queue state, search lifecycle and playback adapter behavior. The requested famous-artist query examples are covered by controlled ranking fixtures.

Deterministic browser tests verify responsive pages, search, version chips, pagination, the visible player adapter, likes/playlists across reload, queue actions and offline shell routing. That suite uses a clearly test-only IFrame API double. The offline test stops its production-build server and then verifies service-worker navigation; no media/API cache is created.

The separate embed tests use the real public YouTube documentation video and real IFrame API without mocked media or player events. They check advancing playback time, pause, seek, resume and player destruction on close. WebKit required an initial gesture inside YouTube's player; the app provides that instruction and leaves native controls visible.

## Live verification with the corrected key

The configured server key now works: all five requested searches returned HTTP 200. The previous `API_KEY_HTTP_REFERRER_BLOCKED` response is resolved. The local server reads saved key changes on each request without exposing the key to the browser.

Actual search results are saved in [live-searches.json](verification/live-searches.json):

- `The Weeknd Blinding Lights`: the artist's official video and official audio from TheWeekndVEVO are first and second, both conservatively labeled `Likely Official`.
- `The Weeknd Blinding Lights slowed`: slowed versions lead.
- `Eagles Hotel California live`: live recordings lead.
- `Juice WRLD unreleased`: unreleased uploads lead; uploader labels do not verify provenance.
- `Bruno Mars cover`: covers lead.

The live checks exposed an overly restrictive `videoSyndicated` search filter that excluded original artist releases. That filter was removed; `videoEmbeddable=true` and video status checks remain. Compact VEVO channel names now match spaced artist names without treating those names as verified channel identity. Unit tests cover both changes.

Real mainstream music playback is **not fully passing**. YouTube rejected the official Blinding Lights video (`4NRXx6U8ABQ`) and official audio (`fHI8X4OXluQ`) inside its player in this environment, despite the catalog reporting them as embeddable. Luma displayed the embedding restriction and a working destination link labeled “Watch on YouTube.” It did not silently substitute a cover or attempt to bypass the restriction.

The default live run failed on desktop and mobile Chromium; its WebKit attempt was interrupted after the player failed to start. A separate desktop run selecting the official audio also failed because YouTube rejected embedding. These failures are recorded separately from the successful real documentation-video playback checks above. API acceptance and search success do not guarantee that an individual music video will play inside another website.

Cloudflare publishing and physical phone installation have not been performed. The earlier automatic approval-service usage-limit failure was resolved and is no longer a blocker.

## Configuration and provider limits

Put `YOUTUBE_API_KEY` in the gitignored `.dev.vars` file locally; use `npx wrangler secret put YOUTUBE_API_KEY` for production. Optional `APPLE_MUSIC_DEVELOPER_TOKEN` enables canonical metadata. No secrets belong in `VITE_*` variables. See the README for exact Cloudflare deployment steps.

The official visible player controls ads, quality and access restrictions. Closing Now Playing, leaving the tab, covering the video or scrolling it out of view pauses playback. There is no background-audio workaround, audio extraction or offline music. YouTube search cannot guarantee original-release identity or availability, especially without canonical metadata and verified channel IDs.
