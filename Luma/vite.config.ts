import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite'
import { readFileSync, existsSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { handleApi, type Env } from './server/index.ts'
function localCatalog(): Plugin {
  const localEnv = (): Env => ({
    ...process.env,
    ...(existsSync('.dev.vars') ? parseEnv(readFileSync('.dev.vars', 'utf8')) : {}),
  })
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api/music', async (req, res) => {
      try {
        const url = new URL(req.originalUrl ?? '/api/music', `http://${req.headers.host}`)
        const response = await handleApi(
          new Request(url, {
            method: req.method,
            headers: { ...(req.headers.origin ? { Origin: req.headers.origin } : {}) },
          }),
          localEnv(),
        )
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(await response.text())
      } catch {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'The local catalog server is unavailable.' }))
      }
    })
  }
  return { name: 'local-catalog', configureServer: install, configurePreviewServer: install }
}
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of Object.keys(env)) {
    if (/^VITE_.*(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)/i.test(key))
      throw new Error(`Remove ${key}: private credentials must never enter browser bundles.`)
  }
  return {
    plugins: [
      react(),
      localCatalog(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifestFilename: 'manifest.webmanifest',
        manifest: {
          id: '/',
          name: 'Luma — Music, in your light',
          short_name: 'Luma',
          description: 'Find original releases and alternate versions with YouTube.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#101113',
          theme_color: '#101113',
          lang: 'en',
          categories: ['music', 'entertainment'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
          clientsClaim: true,
          skipWaiting: false,
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
      restoreMocks: true,
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  }
})
