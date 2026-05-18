import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function selectPartScheme(
  page: Page,
  partId: 'extra' | 'envelope',
  schemeName: string,
) {
  await page
    .waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 })
    .catch(() => {})
  await page
    .locator(
      `[data-testid="ghost-card-${partId}"] [data-slot="select-trigger"]`,
    )
    .click()
  await page.waitForSelector('[role="listbox"]', { timeout: 4000 })
  await page.getByRole('option', { name: schemeName }).click()
  await page.waitForSelector('[role="listbox"]', {
    state: 'hidden',
    timeout: 3000,
  })
}

async function selectGlobalScheme(page: Page, schemeName: string) {
  await page
    .waitForSelector('[role="listbox"]', { state: 'hidden', timeout: 3000 })
    .catch(() => {})
  await page.locator('header [data-slot="select-trigger"]').first().click()
  await page.waitForSelector('[role="listbox"]', { timeout: 4000 })
  await page.getByRole('option', { name: schemeName }).click()
  await page.waitForSelector('[role="listbox"]', {
    state: 'hidden',
    timeout: 3000,
  })
}

test.describe('Part backgrounds, envelope visual, sidebar', () => {
  test('extra and envelope backgrounds follow global scheme by default', async ({
    page,
  }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await selectGlobalScheme(page, 'midnight')

    const extraCard = page
      .locator('[data-testid="ghost-card-extra"] > div')
      .first()
    await expect(extraCard).toHaveAttribute('data-scheme', 'midnight')
  })

  test('extra background can be overridden independently', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await selectGlobalScheme(page, 'midnight')
    await selectPartScheme(page, 'extra', 'cream-gold')

    // Extra ghost card should now use cream-gold
    const extraCard = page
      .locator('[data-testid="ghost-card-extra"] > div')
      .first()
    await expect(extraCard).toHaveAttribute('data-scheme', 'cream-gold')

    // Invitation ghost card should still be midnight
    const invCard = page
      .locator('[data-testid="ghost-card-invitation"] > div')
      .first()
    await expect(invCard).toHaveAttribute('data-scheme', 'midnight')
  })

  test('canvas card background updates to overridden scheme when that part is active', async ({
    page,
  }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await selectPartScheme(page, 'extra', 'midnight')

    // Activate extra
    await page.locator('[data-testid="ghost-card-extra"] > div').first().click()

    await expect(page.locator('[data-testid="canvas-card"]')).toHaveAttribute(
      'data-scheme',
      'midnight',
    )
  })

  test('envelope fold overlay appears when envelope is active', async ({
    page,
  }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await expect(
      page.locator('[data-testid="canvas-envelope-fold"]'),
    ).not.toBeVisible()

    await page
      .locator('[data-testid="ghost-card-envelope"] > div')
      .first()
      .click()

    await expect(
      page.locator('[data-testid="canvas-envelope-fold"]'),
    ).toBeVisible()
  })

  test('envelope ghost card shows fold overlay', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')
    await expect(
      page.locator('[data-testid="ghost-envelope-fold"]'),
    ).toBeVisible()
  })

  test('ghost panel collapses and expands', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await expect(
      page.locator('[data-testid="ghost-card-invitation"]'),
    ).toBeVisible()

    await page.locator('[data-testid="ghost-panel-toggle"]').click()
    await expect(
      page.locator('[data-testid="ghost-card-invitation"]'),
    ).not.toBeVisible()

    await page.locator('[data-testid="ghost-panel-toggle"]').click()
    await expect(
      page.locator('[data-testid="ghost-card-invitation"]'),
    ).toBeVisible()
  })

  test('ghost card tooltips appear on hover', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    // Hover the card preview (the TooltipTrigger), not the outer container
    await page
      .locator('[data-testid="ghost-card-invitation"] > div')
      .first()
      .hover()
    await expect(page.getByRole('tooltip').first()).toContainText(
      'Main invitation card',
      { timeout: 5000 },
    )
  })

  test('resetting extra background to default re-follows global scheme', async ({
    page,
  }) => {
    await page.goto('/editor')
    await page.waitForSelector('[data-testid="canvas-card"]')

    await selectPartScheme(page, 'extra', 'midnight')
    await selectPartScheme(page, 'extra', 'Default (scheme)')
    await selectGlobalScheme(page, 'navy')

    const extraCard = page
      .locator('[data-testid="ghost-card-extra"] > div')
      .first()
    await expect(extraCard).toHaveAttribute('data-scheme', 'navy')
  })
})
