import type { Page } from '@playwright/test'
import { track } from '../fixtures'
declare global {
  interface Window {
    __testYouTube?: { state: number; time: number; videoId: string; emit(state: number): void }
  }
}
/** Test-only IFrame API double. Real YouTube playback is tested separately and never inferred from this double. */
export async function mockCatalog(page: Page) {
  await page.route('**/api/music?**', async (route) => {
    const url = new URL(route.request().url())
    const tracks = ['A', 'B', 'C'].map((id) => ({ ...track(id), title: `Test track ${id}` }))
    await route.fulfill({
      json:
        url.searchParams.get('op') === 'artist'
          ? tracks[0].artist
          : {
              tracks: url.searchParams.has('pageToken')
                ? [{ ...track('D'), title: 'Test track D' }]
                : tracks,
              nextPageToken: url.searchParams.has('pageToken') ? undefined : 'PAGE2',
            },
    })
  })
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.YT={Player:class {
      constructor(element,options){this.options=options;this.state=5;this.time=0;this.videoId='';window.__testYouTube=this;
        const iframe=document.createElement('iframe');iframe.title='YouTube test player';iframe.srcdoc='<p>Test-only YouTube API adapter</p>';element.replaceWith(iframe);this.iframe=iframe;
        this.timer=setInterval(()=>{if(this.state===1)this.time+=.25},250);setTimeout(()=>options.events.onReady(),0)}
      emit(state){this.state=state;this.options.events.onStateChange({data:state})}
      loadVideoById(o){this.videoId=o.videoId;this.time=o.startSeconds;this.emit(1)}
      cueVideoById(o){this.videoId=o.videoId;this.time=o.startSeconds;this.emit(5)}
      playVideo(){this.emit(1)} pauseVideo(){this.emit(2)} stopVideo(){this.emit(0)}
      seekTo(n){this.time=n} setVolume(){} mute(){} unMute(){}
      getCurrentTime(){return this.time} getDuration(){return 20} getPlayerState(){return this.state} getVideoData(){return {video_id:this.videoId}}
      destroy(){clearInterval(this.timer);this.iframe.remove()}
    }};window.onYouTubeIframeAPIReady();
  `,
    }),
  )
}
