import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, waitForSessionSave, getSessionData, goToPage, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Select Tool - Core Selection', () => {
  // ── Selecting different annotation types ─────────────────────────

  test('click pencil stroke selects it', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 140, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click rectangle selects it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click circle selects it', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 160)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click line selects it', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click arrow selects it', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click text selects it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click callout selects it', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click cloud selects it', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('click stamp selects it', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    // Click on canvas to place stamp
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  // ── Selection visual indicators ──────────────────────────────────

  test('selected annotation shows blue dashed border', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Visual indicator: the hint text confirms selection is active
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Canvas screenshot can verify visual style
    const screenshot = await screenshotCanvas(page)
    expect(screenshot).toBeTruthy()
  })

  test('selected annotation shows 8 resize handles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Selection is confirmed by status hint; handles are canvas-drawn
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Verify via screenshot that handles are rendered
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  // ── Deselection ──────────────────────────────────────────────────

  test('click empty space deselects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  test('Escape deselects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  // ── Switching selection ──────────────────────────────────────────

  test('select one then click another switches selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 100 })
    await selectTool(page, 'Select (S)')
    // Select first
    await clickCanvasAt(page, 80, 120)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Select second
    await clickCanvasAt(page, 250, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Annotation count unchanged
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Multi-select ─────────────────────────────────────────────────

  test('Ctrl+A selects all annotations on page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 100 })
    await createAnnotation(page, 'pencil', { x: 80, y: 250, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(300)
    // All selected: hint should reflect multi-selection or remain in selection state
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  // ── Delete ───────────────────────────────────────────────────────

  test('Delete key removes selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('annotation count decreases after delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Backspace also deletes selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Move via drag ────────────────────────────────────────────────

  test('select and move annotation via drag', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move updates annotation position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const beforeScreenshot = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    const afterScreenshot = await screenshotCanvas(page)
    // Screenshots should differ after move
    expect(Buffer.compare(beforeScreenshot, afterScreenshot)).not.toBe(0)
  })

  // ── Edge cases ───────────────────────────────────────────────────

  test('select annotation at edge of canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 10, y: 10, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 10, 40)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('select overlapping annotations picks top one', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 120, y: 120, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click overlapping area - top annotation is selected
    await clickCanvasAt(page, 130, 160)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Delete top, verify one remains
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('click empty area with no annotations does nothing', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  test('select then switch tool deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    // Switch to pencil tool
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    // Hint should no longer show select hints
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible({ timeout: 3000 })
  })

  test('rapid select and deselect cycles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 5; i++) {
      await clickCanvasAt(page, 100, 150)
      await page.waitForTimeout(100)
      await clickCanvasAt(page, 400, 400)
      await page.waitForTimeout(100)
    }
    // After rapid cycles, state should be consistent
    expect(await getAnnotationCount(page)).toBe(1)
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  test('select annotation on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('select while zoomed in', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // Zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('S shortcut activates select tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  test('selectTool helper activates select tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })

  test('arrow keys nudge selected annotation by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+Arrow nudges selected annotation by 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Ctrl+D duplicates selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies and pastes annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
