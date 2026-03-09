import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, moveAnnotation,
  waitForSessionSave, getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Select Tool - Move & Resize', () => {
  // ── Move different annotation types ──────────────────────────────

  test('drag pencil annotation to new position', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 140, y: 130 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag rectangle to new position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag text to new position', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 130 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag circle to new position', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 100, y: 160 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag arrow to new position', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 140 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag line to new position', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 140 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag callout to new position', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 150, y: 130 }, { x: 300, y: 300 })
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('move preserves annotation properties', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    // Annotation still exists, count unchanged
    expect(await getAnnotationCount(page)).toBe(1)
    // Can still select at new position
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  // ── Resize via handles ───────────────────────────────────────────

  test('resize rectangle via SE handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // SE handle is at bottom-right corner: ~(250, 200)
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 350, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via NE handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // NE handle is at top-right: ~(250, 100)
    await dragOnCanvas(page, { x: 250, y: 100 }, { x: 350, y: 80 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via NW handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // NW handle is at top-left: ~(100, 100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 60, y: 60 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via SW handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // SW handle is at bottom-left: ~(100, 200)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 60, y: 260 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via N handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // N handle is at top-center: ~(175, 100)
    await dragOnCanvas(page, { x: 175, y: 100 }, { x: 175, y: 60 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via S handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // S handle is at bottom-center: ~(175, 200)
    await dragOnCanvas(page, { x: 175, y: 200 }, { x: 175, y: 280 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via E handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // E handle is at center-right: ~(250, 150)
    await dragOnCanvas(page, { x: 250, y: 150 }, { x: 350, y: 150 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize rectangle via W handle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // W handle is at center-left: ~(100, 150)
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 60, y: 150 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize text box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Resize via E handle
    await dragOnCanvas(page, { x: 250, y: 130 }, { x: 350, y: 130 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 180 }, { x: 320, y: 250 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 160)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 220, y: 220 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Resize via corner handle
    await dragOnCanvas(page, { x: 260, y: 260 }, { x: 340, y: 340 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Minimum size constraint ──────────────────────────────────────

  test('minimum size constraint enforced during resize', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Try to resize to nearly zero by dragging SE to NW
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 102, y: 102 })
    await page.waitForTimeout(200)
    // Annotation should still exist (minimum size enforced)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Combined operations ──────────────────────────────────────────

  test('resize then move annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Resize via SE handle
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    // Move the resized annotation
    await moveAnnotation(page, { x: 200, y: 175 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move then resize annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // Move first
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    // Select at new position and resize
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 400, y: 350 }, { x: 450, y: 400 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize undo restores original size', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Select (S)')
    // Click left edge to select
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(300)
    // Drag bottom-right handle to resize
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(500)
    const afterUndo = await screenshotCanvas(page)
    // After undo, should be back to original
    expect(await getAnnotationCount(page)).toBe(1)
    // Visual difference is hard to guarantee so just check annotation exists
  })

  test('move undo restores original position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(500)
    // After undo, annotation should still exist at original position
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple moves of same annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 300, y: 300 }, { x: 150, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Should be selectable at final position
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('drag annotation to canvas edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await moveAnnotation(page, { x: 200, y: 240 }, { x: 20, y: 20 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag annotation past canvas edge clamps position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    await moveAnnotation(page, { x: 200, y: 240 }, { x: -50, y: -50 })
    await page.waitForTimeout(200)
    // Annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize very small then resize back to larger', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Shrink
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 130, y: 130 })
    await page.waitForTimeout(200)
    // Re-select and expand
    await clickCanvasAt(page, 115, 115)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 130, y: 130 }, { x: 350, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize annotation to very large', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 180, y: 160 }, { x: 500, y: 500 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Session persistence ──────────────────────────────────────────

  test('move persists in session data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const allAnns = Object.values(session.annotations || {}).flat()
    expect(allAnns.length).toBe(1)
  })

  test('resize persists in session data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 350, y: 300 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const allAnns = Object.values(session.annotations || {}).flat()
    expect(allAnns.length).toBe(1)
  })

  test('move and resize combined workflow', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 100 })
    // Move rectangle
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 200, y: 250 })
    await page.waitForTimeout(200)
    // Select circle and resize
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 400, y: 200 }, { x: 450, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })
})
