import { test, expect } from '@playwright/test'

test.describe('Parts and guests', () => {
  test('ghost panel shows extra and envelope', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.getByTestId('canvas-card')).toBeVisible()
    // Ghost panel checkboxes for Extra and Envelope are visible
    await expect(page.getByLabel('Extra')).toBeVisible()
    await expect(page.getByLabel('Envelope')).toBeVisible()
    // Both are checked by default
    await expect(page.getByLabel('Extra')).toBeChecked()
    await expect(page.getByLabel('Envelope')).toBeChecked()
  })

  test('front/back switcher buttons are visible', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.getByRole('button', { name: 'front' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'back' })).toBeVisible()
  })

  test('guest sidebar opens', async ({ page }) => {
    await page.goto('/editor')
    await page.getByRole('button', { name: /guests/i }).waitFor()
    await page.getByRole('button', { name: /guests/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Guests & Addressants' }),
    ).toBeVisible({ timeout: 5000 })
  })

  test('guest sidebar closes with escape', async ({ page }) => {
    await page.goto('/editor')
    await page.getByTestId('guest-sidebar-toggle').waitFor()
    await page.getByTestId('guest-sidebar-toggle').click()
    await expect(page.getByText(/Guests & Addressants/i)).toBeVisible({
      timeout: 5000,
    })
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Guests & Addressants/i)).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('adding guests in sidebar', async ({ page }) => {
    await page.goto('/editor')
    await page.getByTestId('guest-sidebar-toggle').waitFor()
    await page.getByTestId('guest-sidebar-toggle').click()

    const input = page.getByPlaceholder('Guest name')
    await expect(input).toBeVisible({ timeout: 5000 })

    await input.fill('Anna Kowalska')
    await input.press('Enter')
    await expect(page.getByText('Anna Kowalska')).toBeVisible()

    await input.fill('Jakub Nowak')
    await input.press('Enter')
    await expect(page.getByText('Jakub Nowak')).toBeVisible()
  })

  test('print preview opens', async ({ page }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-testid="canvas-card"]')
    await page.getByRole('button', { name: /print/i }).click()
    await expect(page.getByText(/Print Preview/)).toBeVisible({ timeout: 3000 })
  })

  test('print preview closes with escape', async ({ page }) => {
    await page.goto('/')
    await Promise.all([
      page.waitForURL('**/editor#**'),
      page.getByRole('link', { name: 'Centered Classic' }).click(),
    ])
    await page.waitForSelector('[data-testid="canvas-card"]')
    await page.getByRole('button', { name: /print/i }).click()
    await expect(page.getByText(/Print Preview/)).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await expect(page.getByText(/Print Preview/)).not.toBeVisible({
      timeout: 3000,
    })
  })
})
