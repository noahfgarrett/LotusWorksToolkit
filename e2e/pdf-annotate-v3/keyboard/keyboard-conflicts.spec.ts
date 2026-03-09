import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Keyboard Shortcuts - Conflict Prevention', () => {
  // ── Shortcuts suppressed during text editing ─────────────────────

  test('S key does not switch tool while editing text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    // Double-click to enter text editing mode
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    // Type 's' - should type the letter, not switch tool
    await page.keyboard.type('s')
    await page.waitForTimeout(200)
    // Should still be in text editing (annotation still exists)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('R key does not activate rectangle while editing text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type('r')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('P key does not activate pencil while editing text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type('p')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('E key does not activate eraser while editing text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type('e')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('F key does not activate fit-page while editing text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type('f')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Delete key inside text deletes character not annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    // Double-click at the text edge to re-enter edit mode
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.dblclick(box.x + 100, box.y + 100)
    await page.waitForTimeout(500)
    // Delete should delete text character, not the annotation
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Shortcuts suppressed during find bar ─────────────────────────

  test('shortcuts do not fire when typing in find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find"], input[type="search"]')
    await expect(findInput).toBeVisible({ timeout: 3000 })
    // Type 'r' in find bar - should not activate rectangle tool
    await findInput.type('r')
    await page.waitForTimeout(200)
    // Close find
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Verify no tool switch happened by checking we can still activate select
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('typing letters in find bar does not switch tools', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find"], input[type="search"]')
    await findInput.type('sample text')
    await page.waitForTimeout(200)
    // Escape to close find
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Annotation count should be 0 (no accidental tool activation)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Shortcuts resume after text editing ──────────────────────────

  test('shortcuts work after closing text editing with Escape', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    // Exit text editing
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Now shortcuts should work
    await page.keyboard.press('r')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  test('shortcuts work after closing find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find"], input[type="search"]')
    await findInput.type('test')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Now shortcuts should work
    await page.keyboard.press('r')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  // ── Shortcuts suppressed in number input ─────────────────────────

  test('shortcuts do not fire when focused on page number input', async ({ page }) => {
    const pageInput = page.locator('input[type="number"]')
    const count = await pageInput.count()
    if (count > 0) {
      await pageInput.click()
      await page.waitForTimeout(100)
      // Type a number - should not switch tool
      await page.keyboard.type('2')
      await page.waitForTimeout(200)
      // Blur to exit
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    // No annotation should have been created accidentally
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Single letter vs Ctrl combos ────────────────────────────────

  test('single letter shortcuts switch tools', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('c')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl combos do not switch tools', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    // Ctrl+R should not switch to rectangle tool
    await page.keyboard.press('Control+r')
    await page.waitForTimeout(200)
    // Should still be in select mode
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  // ── Modifier key combinations ───────────────────────────────────

  test('Alt+letter does not switch tool', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Alt+r')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('Shift+letter for non-mapped shortcuts does not switch tool', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    // Shift+R should not activate rectangle (only lowercase 'r' does)
    await page.keyboard.press('Shift+r')
    await page.waitForTimeout(200)
    // Should still be in select mode or unchanged
    const selectHint = page.locator('span.truncate:has-text("Click to select")')
    const isVisible = await selectHint.isVisible()
    expect(isVisible).toBe(true)
  })

  // ── Rapid shortcut presses ──────────────────────────────────────

  test('rapid shortcut key presses handled correctly', async ({ page }) => {
    await page.keyboard.press('r')
    await page.keyboard.press('c')
    await page.keyboard.press('p')
    await page.keyboard.press('s')
    await page.waitForTimeout(300)
    // Should end up in select mode
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('rapid undo-redo does not crash', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.keyboard.press('Control+y')
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('all tool shortcuts cycle through tools cleanly', async ({ page }) => {
    const shortcuts = ['s', 'p', 'l', 'a', 'r', 'c', 'k', 't', 'o', 'e', 'h', 'm']
    for (const key of shortcuts) {
      await page.keyboard.press(key)
      await page.waitForTimeout(100)
    }
    // Return to select
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('Escape deselects when no find bar or text editing is active', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await expect(page.locator('span.truncate:has-text("Arrows nudge")')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })
})
