# Luma music architecture

## Catalog boundary

`MusicCatalog` is the UI-facing interface. `MusicSearchService` selects `YouTubeSearchProvider`, which calls the same-origin `/api/music` endpoint. The Worker accepts only enumerated operations, bounded queries, safe video/channel IDs and page tokens. Callers cannot provide upstream URLs. The Worker holds the YouTube key and optional Apple developer token; neither is serialized into responses or browser bundles.

YouTube normalization uses runtime schemas. Video references include uploader identity, official watch URL, safe thumbnail URLs, duration, version classification, authenticity evidence and optional canonical metadata. No direct stream URL exists in the model or catalog interface.

## Canonical metadata

`CanonicalMetadataProvider` returns ID, title, artist, optional album, duration and ISRC. `AppleMusicMetadataProvider` calls `GET /v1/catalog/{storefront}/search?types=songs` with a server-side developer JWT. Missing credentials or a failed/slow metadata lookup degrades to YouTube-only ranking. The metadata layer never supplies audio. Artwork stays sourced from YouTube to avoid mismatching alternate uploads with canonical artwork.

To add another legitimate metadata source, implement this interface server-side, handle its credentials and terms there, and supply its results to `rankResults`. UI or playback changes are unnecessary. Do not infer recording identity from uploader-entered ISRC text.

## Evidence and versions

`SearchIntentParser` retains raw user text and detects requested variants. `VersionClassifier` infers slowed/reverb, sped-up/nightcore, live/concert/performance, remix/edit/mix/mashup, covers, acoustic/unplugged, instrumental/karaoke, unreleased/leak/demo/snippet, lyrics and music videos. These are explicitly Luma's inferred labels.

`OfficialityScorer` combines canonical identity, channel relationship, duration and title evidence. Topic/VEVO normalization is only useful when the base channel name matches an artist identified in the canonical result or user query. Arbitrary Topic suffixes and “official” wording are insufficient. `Official` additionally requires a configured independently verified channel ID; there is no hard-coded mainstream artist list or invented verification badge. Registry entries must document an artist-owned verification source. Even likely matches remain fallible.

`ResultRanker` combines query relevance with intent and authenticity evidence. Original/unknown studio candidates precede marked alternates for normal queries, and covers receive a stronger penalty. A requested version receives priority among relevant results. Ties preserve the original API order. Each page is ranked independently; loading more appends deduplicated results instead of unexpectedly reordering already visible rows.

## Playback boundary

`YouTubePlaybackEngine` wraps only the official IFrame API. `YouTubePlayer` supplies a visible, unobstructed container at least 200 × 200 pixels. The singleton engine coordinates the existing Zustand queue and controls. It never creates `Audio`, extracts streams or exposes download operations.

Track selection opens Now Playing. Closing it pauses and destroys the iframe; leaving the tab, opening an overlay or scrolling the player out of view pauses playback. The engine uses native player state events for loading/buffering/playing/paused/ended/error state and samples the official current-time method for progress/history. Metadata/request races are guarded by player generation and current video ID. Errors do not automatically skip through a failing queue. Player API errors 100, 101/150 and 153 get useful messages and a normal YouTube link remains available.

Luma's Media Session handlers were removed because they could start a hidden player. YouTube/browser-provided system controls are outside Luma's guarantee. Embedded ads, age/region restrictions, sign-in requirements, owner embedding restrictions and autoplay policy remain in force.

## Storage and caching

The repository migrates v1 keys to v2, validates entries individually, preserves playlist names/IDs/settings and supported tracks, and removes obsolete provider records. Mixed queues retain the selected supported entry where possible. Unsupported tracks are not guessed into replacement songs. A visible migration notice explains the change.

Local metadata older than 29 days is stripped on load, retaining only the user's video references and neutral unavailable-metadata display values. Server query/video/page caches expire after five minutes, canonical cache after one hour, browser request cache after three minutes. In-flight requests are coalesced and bounded. The service worker caches the app shell only, never catalog API responses or media.

## Sources

- [YouTube search API and embeddability filters](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube video resource](https://developers.google.com/youtube/v3/docs/videos)
- [Official IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube developer policies, including storage and background playback](https://developers.google.com/youtube/terms/developer-policies)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
- [Cloudflare Worker assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare rate-limit bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
