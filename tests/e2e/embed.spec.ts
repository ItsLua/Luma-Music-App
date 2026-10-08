import { expect, test } from '@playwright/test'
import { track } from '../fixtures'
test('official YouTube documentation video plays through the real IFrame API', async ({ page }) => {
  test.skip(
    process.env.LUMA_EMBED !== '1',
    'Opt-in real embed/network smoke check; no catalog key required.',
  )
  test.setTimeout(90000)
  // Public sample ID from the official IFrame API reference. No mocked media or player APIs.
  const sample = {
    ...track('M7lc1UVf-VE'),
    title: 'YouTube Developers Live: Embedded Web Player Customization',
    channelName: 'Google for Developers',
    artist: {
      ...track().artist,
      id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      name: 'Google for Developers',
      url: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
    },
    youtubeVideoId: 'M7lc1UVf-VE',
    permalink: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  }
  await page.addInitScript(
    (value) =>
      localStorage.setItem(
        'luma:session:v2',
        JSON.stringify({
          queue: [{ key: 'official-api-sample', track: value }],
          index: 0,
          position: 0,
          volume: 0.3,
          muted: false,
          repeat: 'off',
          shuffle: false,
          originalOrder: ['official-api-sample'],
        }),
      ),
    sample,
  )
  await page.goto('/library')
  const footer = page.getByRole('contentinfo', { name: 'Music player' })
  await footer.getByRole('button', { name: 'Open Now Playing', exact: true }).click()
  const now = page.getByRole('dialog', { name: 'Now playing' })
  await expect(now.locator('iframe[src*="youtube.com/embed/"]')).toBeVisible({ timeout: 25000 })
  if (test.info().project.name === 'iphone-webkit')
    await page
      .frameLocator('iframe[src*="youtube.com/embed/"]')
      .getByRole('button', { name: 'Play video', exact: true })
      .click()
  else await now.getByRole('button', { name: 'Play', exact: true }).click()
  await expect
    .poll(async () => Number(await now.getByRole('slider', { name: 'Seek' }).inputValue()), {
      timeout: 45000,
    })
    .toBeGreaterThan(1)
  await now.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(now.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await now.getByRole('slider', { name: 'Seek' }).fill('10')
  await now.getByRole('button', { name: 'Play', exact: true }).click()
  await expect
    .poll(async () => Number(await now.getByRole('slider', { name: 'Seek' }).inputValue()))
    .toBeGreaterThan(10)
  await page.screenshot({ path: `test-results/real-embed-${test.info().project.name}.png` })
  await now.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(0)
})
