import { expect, test } from '@playwright/test'
test('live YouTube search and visible official IFrame playback', async ({ page, request }) => {
  test.skip(
    process.env.LUMA_LIVE !== '1',
    'Opt-in: requires server-side YouTube key and network access.',
  )
  test.setTimeout(120000)
  const query = process.env.LUMA_LIVE_QUERY ?? 'The Weeknd Blinding Lights'
  const targetIndex = Number(process.env.LUMA_LIVE_TRACK_INDEX ?? 0)
  const response = await request.get(
    '/api/music?' + new URLSearchParams({ op: 'search', q: query }),
  )
  expect(response.ok(), 'The live catalog must be configured; no mock fallback is accepted.').toBe(
    true,
  )
  await page.goto('/search?' + new URLSearchParams({ q: query }))
  await expect(page.locator('.track-row').first()).toBeVisible({ timeout: 30000 })
  await page.locator('.track-row .track-play').nth(targetIndex).click()
  const dialog = page.getByRole('dialog', { name: 'Now playing' })
  await expect(dialog.locator('iframe[src*="youtube.com/embed/"]')).toBeVisible({ timeout: 30000 })
  if (test.info().project.name === 'iphone-webkit')
    await page
      .frameLocator('iframe[src*="youtube.com/embed/"]')
      .getByRole('button', { name: 'Play video', exact: true })
      .click()
  // Real native player state is reflected by the application timer; loading an iframe alone is insufficient.
  await expect(dialog.getByRole('button', { name: 'Pause', exact: true })).toBeVisible({
    timeout: 45000,
  })
  await expect
    .poll(async () => Number(await dialog.getByRole('slider', { name: 'Seek' }).inputValue()), {
      timeout: 45000,
    })
    .toBeGreaterThan(1)
  await dialog.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await dialog.getByRole('slider', { name: 'Seek' }).fill('10')
  await dialog.getByRole('button', { name: 'Play', exact: true }).click()
  await expect
    .poll(async () => Number(await dialog.getByRole('slider', { name: 'Seek' }).inputValue()))
    .toBeGreaterThan(10)
  await page.screenshot({ path: `test-results/live-youtube-${test.info().project.name}.png` })
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(0)
})
