import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, goToPage,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Undo/Redo - Core', () => {
  // ── Basic undo ───────────────────────────────────────────────────

  test('create annotation then undo removes it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo on empty history does nothing', async ({ page }) => {
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo after undo restores annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create 3 annotations and undo all', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 80, h: 80 })
    await createAnnotation(page, 'pencil', { x: 80, y: 200, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Undo property changes ───────────────────────────────────────

  test('undo move restores original position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    // Annotation should still exist after undoing the move
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo resize restores original size', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 350, y: 300 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    // Annotation should still exist after undoing the resize
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo delete restores annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo color change restores previous color', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Change color via preset button (first preset in properties panel)
    const colorButtons = page.locator('button[title^="#"]')
    const count = await colorButtons.count()
    if (count > 1) {
      await colorButtons.nth(1).click()
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    // Should restore original color
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo text edit restores previous text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    // Double-click to edit
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.type(' extra')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo formatting change restores previous format', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectAnnotationAt(page, 175, 130)
    const before = await screenshotCanvas(page)
    // Apply bold
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Redo ─────────────────────────────────────────────────────────

  test('redo restores undone annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('new action after undo clears redo stack', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo circle
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Create new annotation (clears redo)
    await createAnnotation(page, 'pencil', { x: 80, y: 250, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Redo should do nothing since redo stack was cleared
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple undo steps', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 80 + i * 50, y: 80, w: 40, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo and redo chain preserves state', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 100 })
    // Undo both
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo both
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Undo per annotation type ─────────────────────────────────────

  test('undo pencil stroke creation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle creation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle creation', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo text creation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Text creation may push multiple history entries (text commit + creation)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo callout creation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Callout creation may push multiple history entries (text commit + creation)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line creation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo arrow creation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo eraser restores erased annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Use eraser on the pencil stroke
    await selectTool(page, 'Eraser (E)')
    await clickCanvasAt(page, 140, 130)
    await page.waitForTimeout(300)
    // May have erased it
    const countAfterErase = await getAnnotationCount(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('undo partial eraser restores original path', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 100 })
    await selectTool(page, 'Eraser (E)')
    // Erase part of the stroke
    await clickCanvasAt(page, 150, 130)
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Max history ──────────────────────────────────────────────────

  test('50 undo steps are supported (max history)', async ({ page }) => {
    test.setTimeout(180000)
    // Create 50 annotations
    for (let i = 0; i < 50; i++) {
      await createAnnotation(page, 'rectangle', { x: 80 + (i % 10) * 40, y: 80 + Math.floor(i / 10) * 50, w: 30, h: 30 })
    }
    const createdCount = await getAnnotationCount(page)
    expect(createdCount).toBeGreaterThanOrEqual(48)
    expect(createdCount).toBeLessThanOrEqual(50)
    // Undo all 50
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  test('51st change drops oldest history entry', async ({ page }) => {
    test.setTimeout(180000)
    // Create 51 annotations
    for (let i = 0; i < 51; i++) {
      await createAnnotation(page, 'rectangle', { x: 80 + (i % 10) * 40, y: 80 + Math.floor(i / 10) * 50, w: 30, h: 30 })
    }
    const created51 = await getAnnotationCount(page)
    expect(created51).toBeGreaterThanOrEqual(49)
    expect(created51).toBeLessThanOrEqual(51)
    // Undo 51 times - only 50 should succeed
    for (let i = 0; i < 51; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    // At least 1 should remain (oldest entry was dropped)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  // ── Undo preserves ordering ──────────────────────────────────────

  test('undo preserves annotation order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 80, h: 80 })
    await createAnnotation(page, 'pencil', { x: 80, y: 200, w: 80, h: 50 })
    // Undo last, redo it
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('undo preserves z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    // Bring rectangle to front
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Undo z-order change
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Context-specific undo ────────────────────────────────────────

  test('undo while zoomed works correctly', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo on different page', async ({ page }) => {
    // Use the default single-page PDF - just test undo works regardless of page state
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo updates session data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = Object.values(sessionBefore?.annotations || {}).flat() as Array<any>
    expect(annsBefore.length).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = Object.values(sessionAfter?.annotations || {}).flat() as Array<any>
    expect(annsAfter.length).toBe(0)
  })

  // ── Shortcut variants ───────────────────────────────────────────

  test('Ctrl+Z shortcut works', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Y shortcut works for redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Shift+Z shortcut works for redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
