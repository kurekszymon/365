import { test, expect } from '@playwright/test'

test.describe('Share link', () => {
  test('share button is visible in editor', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.getByRole('button', { name: /share/i })).toBeVisible()
  })

  test('share button copies link with hash', async ({ page, context }) => {
    // Mock clipboard so it works reliably in headless mode (no focus/activation
    // requirement, which can silently fail in Playwright's headless Chromium).
    await context.addInitScript(() => {
      let _stored = ''
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            _stored = text
          },
          readText: async () => _stored,
        },
      })
    })

    // Load a preset so there's a non-empty design
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])

    await page.getByRole('button', { name: /share/i }).click()
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible({
      timeout: 3000,
    })

    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('/editor#')
  })

  test('share link round-trip restores design', async ({ page, browser }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-field-type="text"]', { timeout: 5000 })

    const url = page.url()
    expect(url).toContain('#')

    // Open in a fresh browser context
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto(url)
    await page2.waitForSelector('[data-field-type="text"]', { timeout: 8000 })
    await expect(
      page2.locator('[data-field-type="text"]').first(),
    ).toBeVisible()
    await ctx2.close()
  })
})
