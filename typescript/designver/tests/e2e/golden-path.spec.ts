import { test, expect } from '@playwright/test'

test.describe('Golden path', () => {
  test('landing page shows preset gallery', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Invitation Designer')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Blank canvas' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Centered Classic' }),
    ).toBeVisible()
  })

  test('opens blank editor from landing page', async ({ page }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor'),
      page.getByRole('link', { name: 'Blank canvas' }).click(),
    ])
    await expect(
      page.locator('[data-testid="ghost-card-invitation"]'),
    ).toBeVisible()
    await expect(page.locator('[data-testid="ghost-card-extra"]')).toBeVisible()
    await expect(
      page.locator('[data-testid="ghost-card-envelope"]'),
    ).toBeVisible()
  })

  test('opens preset editor from landing page and URL contains hash', async ({
    page,
  }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    expect(page.url()).toContain('/editor#')
  })

  test('editor loads design fields from hash', async ({ page }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-field-type="text"]', { timeout: 8000 })
    await expect(page.locator('[data-field-type="text"]').first()).toBeVisible()
  })

  test('editor updates hash when color scheme changes', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')
    const hashBefore = new URL(page.url()).hash

    // Ensure no leftover listbox before clicking (matches the helper used in part-backgrounds)
    await page
      .waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 })
      .catch(() => {})
    // Open the shadcn Select for color scheme (first select-trigger in toolbar)
    await page.locator('header [data-slot="select-trigger"]').first().click()
    // Radix Select renders its listbox into a portal with role="listbox"
    await page.waitForSelector('[role="listbox"]', { timeout: 4000 })
    await page.getByRole('option', { name: 'blush' }).click()

    await page.waitForTimeout(900) // debounce
    const hashAfter = new URL(page.url()).hash
    expect(hashAfter).not.toBe(hashBefore)
    expect(hashAfter.length).toBeGreaterThan(1)
  })

  test('double-click to edit text field', async ({ page }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-field-type="text"]', { timeout: 8000 })
    // The <p> has pointer-events:none — use force to target the wrapper
    await page
      .locator('[data-field-type="text"]')
      .first()
      .dblclick({ force: true })
    await expect(page.locator('textarea')).toBeVisible({ timeout: 3000 })
  })

  test('right-click on canvas shows context menu', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')
    // force:true bypasses Playwright's actionability check which is unreliable
    // on CSS-transformed elements before ResizeObserver has settled the scale
    await page
      .locator('[data-testid="canvas-card"]')
      .click({ button: 'right', force: true })
    await expect(page.getByText('Add text')).toBeVisible({ timeout: 3000 })
  })

  test('grid toggle button is accessible', async ({ page }) => {
    await page.goto('/editor')
    const btn = page.getByRole('button', { name: 'Toggle grid' })
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForTimeout(100)
    await btn.click()
  })
})
