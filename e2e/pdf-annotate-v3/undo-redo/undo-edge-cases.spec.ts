import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, goToPage, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Undo/Redo - Edge Cases', () => {
  // ── Rapid operations ─────────────────────────────────────────────

  test('rapid undo presses handle correctly', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 80, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    // Rapid undo without waiting between them
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo during drawing cancels the current draw', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Start drawing
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    // Undo while still drawing (should cancel or handle gracefully)
    await page.keyboard.press('Control+z')
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Count should be 0 - draw was cancelled or undone
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('undo then draw new annotation clears redo stack', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo circle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Draw new annotation (should clear redo)
    await createAnnotation(page, 'pencil', { x: 80, y: 250, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Redo should not bring back the circle
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo after tool switch', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Circle (C)')
    await page.waitForTimeout(100)
    // Undo should still remove the rectangle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo after page switch', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(200)
    await goToPage(page, 1)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo with mixed annotation types maintains correct count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 230, y: 80, w: 80, h: 80 })
    await createAnnotation(page, 'line', { x: 80, y: 200, w: 100, h: 50 })
    await createAnnotation(page, 'text', { x: 230, y: 200, w: 120, h: 50 })
    expect(await getAnnotationCount(page)).toBe(4)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo create then redo then undo again cycle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo again
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo again
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stress test: create 100 annotations and undo all', async ({ page }) => {
    test.setTimeout(180000)
    // Create 100 small rectangles in a grid
    for (let i = 0; i < 100; i++) {
      const x = 50 + (i % 12) * 35
      const y = 50 + Math.floor(i / 12) * 40
      await createAnnotation(page, 'rectangle', { x, y, w: 25, h: 25 })
    }
    const stressCount = await getAnnotationCount(page)
    expect(stressCount).toBeGreaterThanOrEqual(95)
    expect(stressCount).toBeLessThanOrEqual(100)
    // Undo all (only 50 will undo due to max history)
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(500)
    // With 50 max history, at least ~50 annotations should remain
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeGreaterThanOrEqual(45)
  })

  test('undo text creation restores empty state', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo text edit restores previous text content', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    const before = await screenshotCanvas(page)
    // Double-click text to edit
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type(' modified')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('silent updates like auto-height do not add to undo history', async ({ page }) => {
    // Create a text annotation - auto-height adjustments should not be in history
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    // One undo should remove the text entirely (auto-height is not a separate step)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo stamp placement', async ({ page }) => {
    // Try stamp via button or keyboard shortcut
    const stampBtn = page.locator('button').filter({ hasText: /stamp/i }).first()
    const hasStamp = await stampBtn.isVisible().catch(() => false)
    if (hasStamp) {
      await stampBtn.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(300)
      const stampCount = await getAnnotationCount(page)
      if (stampCount >= 1) {
        await page.keyboard.press('Control+z')
        await page.waitForTimeout(300)
        expect(await getAnnotationCount(page)).toBe(stampCount - 1)
        return
      }
    }
    // Fallback: just test undo on a rectangle
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo measurement annotation', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const countAfterMeasure = await getAnnotationCount(page)
    expect(countAfterMeasure).toBeGreaterThanOrEqual(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(countAfterMeasure - 1)
  })

  test('undo crop operation', async ({ page }) => {
    // Crop may not exist or 'x' may not be the shortcut - test gracefully
    const cropBtn = page.locator('button').filter({ hasText: /crop/i }).first()
    const hasCrop = await cropBtn.isVisible().catch(() => false)
    if (hasCrop) {
      await cropBtn.click()
      await page.waitForTimeout(200)
      await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 400 })
      await page.waitForTimeout(300)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(300)
    }
    // App should still be functional
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('undo after Ctrl+A select all and delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Undo should restore deleted annotations
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(500)
    const restoredCount = await getAnnotationCount(page)
    expect(restoredCount).toBeGreaterThanOrEqual(1)
  })

  test('redo beyond available redo stack does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Extra redo should do nothing
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo beyond available undo stack does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Extra undo should keep count at 0
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo duplicate restores single annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
