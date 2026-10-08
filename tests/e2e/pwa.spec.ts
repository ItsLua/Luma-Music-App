import { expect, test } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

/** Serve the actual production build on an isolated origin that the test can stop. */
async function startTestOrigin() {
  const root = resolve('dist')
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  }
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = decodeURIComponent(
          new URL(request.url ?? '/', 'http://localhost').pathname,
        )
        let file = resolve(root, `.${pathname}`)
        if (!file.startsWith(root + sep) && file !== root) {
          response.writeHead(403).end()
          return
        }
        const exists = await stat(file).catch(() => null)
        if (!exists?.isFile()) file = resolve(root, 'index.html')
        response.writeHead(200, {
          'Content-Type': types[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        })
        response.end(await readFile(file))
      } catch {
        response.writeHead(500).end()
      }
    })()
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test origin failed to start')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve()
          return
        }
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

test('PWA manifest, registered service worker, offline shell and no cached streams', async ({
  page,
  context,
}) => {
  const server = await startTestOrigin()
  try {
    await page.goto(`${server.origin}/settings`)
    const manifest = await (await page.request.get(`${server.origin}/manifest.webmanifest`)).json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true)
    const cached = await page.evaluate(async () => {
      const names = await caches.keys()
      return (
        await Promise.all(
          names.map(async (name) =>
            (await (await caches.open(name)).keys()).map((request) => request.url),
          ),
        )
      ).flat()
    })
    expect(cached.some((url) => url.includes('/assets/'))).toBe(true)
    expect(
      cached.some(
        (url) =>
          url.includes('/api/music') ||
          url.includes('youtube.com') ||
          url.includes('googlevideo.com'),
      ),
    ).toBe(false)

    // Native origin failure avoids Playwright WebKit's setOffline/SW bug:
    // https://github.com/microsoft/playwright/issues/42775
    await server.stop()
    await expect(
      page.request.get(`${server.origin}/network-probe`, { timeout: 2000 }),
    ).rejects.toThrow()
    await page.goto(`${server.origin}/library`)
    await expect(page.getByRole('heading', { name: 'Your little universe.' })).toBeVisible()
    // Check the native offline banner after the cache-only navigation has succeeded.
    await context.setOffline(true)
    await expect(page.getByRole('status').filter({ hasText: 'You’re offline' })).toBeVisible()
  } finally {
    await context.setOffline(false)
    await server.stop()
  }
})
