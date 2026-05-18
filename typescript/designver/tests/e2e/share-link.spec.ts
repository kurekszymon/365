import { test, expect } from '@playwright/test'

test.describe('Share link', () => {
  test('share button is visible in editor', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.getByRole('button', { name: /share/i })).toBeVisible()
  })

  test('share button copies link with hash', async ({ page }) => {
    // Load a preset so there's a non-empty design
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-field-type="text"]', { timeout: 5000 })

    // Mock clipboard after page has fully loaded — avoids addInitScript race
    // conditions with non-configurable navigator.clipboard in headless Chromium.
    await page.evaluate(() => {
      ;(window as any).__clipboardText = ''
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            ;(window as any).__clipboardText = text
          },
          readText: async () => (window as any).__clipboardText,
        },
      })
    })

    await page.getByRole('button', { name: /share/i }).click()
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible({
      timeout: 3000,
    })

    const clip = await page.evaluate(
      () => (window as any).__clipboardText as string,
    )
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
