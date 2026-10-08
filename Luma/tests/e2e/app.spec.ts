import { expect, test } from '@playwright/test'
import { mockCatalog } from './helpers'
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => mockCatalog(page))
test('all principal pages fit narrow phones, tablets and desktop screens', async ({ page }) => {
  for (const width of [320, 375, 430, 768, 1024, 1600]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/search', '/library', '/settings']) {
      await page.goto(route)
      await expect(page.locator('main h1')).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            (expectedWidth) => document.documentElement.scrollWidth <= expectedWidth,
            width,
          ),
        )
        .toBe(true)
    }
  }
})
test('search, YouTube adapter controls, likes, playlists, queue and refresh persistence', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Find your frequency.' })).toBeVisible()
  await page.goto('/search')
  await page.getByRole('textbox', { name: 'Search music' }).fill('Test track')
  await expect(page.getByRole('button', { name: 'Play Test track A', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play Test track A', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__testYouTube?.time ?? 0)).toBeGreaterThan(0.1)
  const now = page.getByRole('dialog', { name: 'Now playing' })
  await expect(now).toBeVisible()
  await expect(now.locator('iframe')).toBeVisible()
  await now.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__testYouTube?.state)).toBe(2)
  const seek = now.getByRole('slider', { name: 'Seek' })
  await seek.fill('8')
  await expect
    .poll(() => page.evaluate(() => window.__testYouTube?.time))
    .toBeGreaterThanOrEqual(7.9)
  await now.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__testYouTube?.state)).toBe(1)
  await now.getByRole('button', { name: 'Next track', exact: true }).click()
  await expect(now.getByRole('heading', { name: 'Test track B' })).toBeVisible()
  await now.getByRole('button', { name: 'Pause', exact: true }).click()
  await now.getByRole('button', { name: 'Like Test track B', exact: true }).click()
  await now.getByRole('button', { name: 'Add to playlist', exact: true }).click()
  const picker = page.getByRole('dialog', { name: 'Add to playlist', exact: true })
  await picker.getByRole('textbox', { name: 'New playlist name' }).fill('Night drive')
  await picker.getByRole('button', { name: 'Create', exact: true }).click()
  await now.getByRole('button', { name: 'Queue', exact: true }).click()
  const queue = page.getByRole('dialog', { name: 'Your queue' })
  await expect(queue.getByText('Test track C', { exact: true })).toBeVisible()
  await queue.getByRole('button', { name: 'Remove Test track C from queue' }).click()
  await expect(queue.getByText('0 up next')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Now playing' })).not.toBeVisible()
  await page.goto('/library?tab=likes')
  await expect(
    page.getByRole('button', { name: 'Unlike Test track B', exact: true }).first(),
  ).toBeVisible()
  await page.goto('/library')
  await page.locator('main').getByRole('link', { name: 'Night drive 1 tracks' }).click()
  await expect(page.getByRole('heading', { name: 'Night drive' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play Test track B', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Rename playlist' }).click()
  await page.getByRole('textbox', { name: 'Playlist name' }).fill('After dark')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('heading', { name: 'After dark' })).toBeVisible()
})
test('search failure is recoverable and mobile never overflows', async ({ page }) => {
  await page.route('**/api/music?op=search&**', (route) => route.fulfill({ status: 503, json: {} }))
  await page.goto('/search')
  await page.getByRole('textbox', { name: 'Search music' }).fill('ambient')
  await expect(page.getByRole('alert')).toContainText('unavailable')
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.goto('/settings')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('version chips preserve the base query and pagination appends unique results', async ({
  page,
}) => {
  await page.goto('/search?q=Starboy')
  await expect(page.getByRole('button', { name: 'Play Test track A', exact: true })).toBeVisible()
  const request = page.waitForRequest((r) => r.url().includes('q=Starboy+slowed'))
  await page.getByRole('button', { name: 'Slowed', exact: true }).click()
  await request
  await expect(page.getByRole('textbox', { name: 'Search music' })).toHaveValue('Starboy')
  await page.getByRole('button', { name: 'Load more results' }).click()
  await expect(page.getByRole('button', { name: 'Play Test track D', exact: true })).toBeVisible()
  await expect(page.locator('.track-row')).toHaveCount(4)
})
