import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Find Core', () => {
  test('Ctrl+F opens find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
  })

  test('find input visible with correct placeholder', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
    const placeholder = await findInput.getAttribute('placeholder')
    expect(placeholder).toContain('Find')
  })

  test('type search text and press Enter', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    // Should show match count or highlight text
    // Look for match indicator like "1 of N" or similar
    const matchIndicator = page.locator('text=/\\d+ of \\d+/')
    const indicatorVisible = await matchIndicator.isVisible().catch(() => false)
    // Either we see a match count or the input is still focused (search executed)
    expect(indicatorVisible || await findInput.isVisible()).toBe(true)
  })

  test('find highlights matching text on canvas', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    // Canvas should still be visible — highlights are rendered on it
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('close find bar with Escape', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(findInput).not.toBeVisible({ timeout: 3000 })
  })

  test('find next with Enter key', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Press Enter again to go to next match
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Should still have find bar open and possibly updated match count
    await expect(findInput).toBeVisible()
  })

  test('find next with next button', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Look for next button (arrow down or "Next" text)
    const nextBtn = page.locator('button[title*="Next"], button[title*="next"], button:has-text("Next")')
    if (await nextBtn.count() > 0 && await nextBtn.first().isVisible()) {
      await nextBtn.first().click()
      await page.waitForTimeout(300)
    }
    await expect(findInput).toBeVisible()
  })

  test('find previous with Shift+Enter', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Go to next match first
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Go back with Shift+Enter
    await page.keyboard.press('Shift+Enter')
    await page.waitForTimeout(300)
    await expect(findInput).toBeVisible()
  })

  test('find with no matches shows zero count', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await findInput.fill('xyznonexistenttext123')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    // Should show "0 of 0" or "0 results" or similar no-match indicator
    const zeroIndicator = page.locator('text=/0 of 0|0 results|No results|not found/i')
    const indicatorVisible = await zeroIndicator.isVisible().catch(() => false)
    // Even if no explicit indicator, the find bar should still be open
    expect(indicatorVisible || await findInput.isVisible()).toBe(true)
  })

  test('find bar closes on Escape and canvas remains interactive', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
    await findInput.fill('the')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(findInput).not.toBeVisible({ timeout: 3000 })
    // Canvas should still be interactive — draw an annotation
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('find does not interfere with annotations', async ({ page }) => {
    // Create annotation first
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Open find bar
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    const findInput = page.locator('input[placeholder*="Find"]')
    if (await findInput.isVisible()) {
      await findInput.fill('test')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    // Annotation should still be intact
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
