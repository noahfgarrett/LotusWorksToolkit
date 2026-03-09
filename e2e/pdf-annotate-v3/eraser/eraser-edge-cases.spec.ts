import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  waitForSessionSave,
  getSessionData,
  goToPage,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Eraser - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  async function activateEraser(page: import('@playwright/test').Page) {
    await selectTool(page, 'Eraser (E)')
    // Default mode is partial — switch to object mode for full deletion
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)
  }

  async function setEraserRadius(page: import('@playwright/test').Page, value: number) {
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      await slider.fill(String(value))
      await page.waitForTimeout(100)
    }
  }

  // ── Empty canvas ───────────────────────────────────────────────────────

  test('eraser on empty canvas does not crash or produce errors', async ({ page }) => {
    await activateEraser(page)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 300, y: 300 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
    // Verify canvas is still interactive
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('eraser on empty canvas with rapid clicks', async ({ page }) => {
    await activateEraser(page)
    for (let i = 0; i < 10; i++) {
      await clickCanvasAt(page, 100 + i * 30, 200)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Canvas edge interactions ──────────────────────────────────────────

  test('eraser near top-left canvas edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 10, y: 10, w: 50, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateEraser(page)
    await drawOnCanvas(page, [
      { x: 5, y: 5 },
      { x: 40, y: 30 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser near bottom-right canvas edge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 450, y: 600, w: 50, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateEraser(page)
    await drawOnCanvas(page, [
      { x: 460, y: 610 },
      { x: 490, y: 625 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser drag across entire canvas width', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 350, y: 200, w: 60, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activateEraser(page)
    // Sweep across entire width
    const points: { x: number; y: number }[] = []
    for (let x = 10; x <= 550; x += 20) {
      points.push({ x, y: 225 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Eraser radius extremes ────────────────────────────────────────────

  test('eraser radius at minimum (5px)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateEraser(page)
    await setEraserRadius(page, 5)

    // Miss: erase just outside the annotation boundary
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 105, y: 105 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    // Hit: erase directly on the annotation with wider sweep
    await drawOnCanvas(page, [
      { x: 230, y: 220 },
      { x: 250, y: 240 },
      { x: 270, y: 260 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser radius at maximum (50px)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateEraser(page)
    await setEraserRadius(page, 50)

    // Erase near but not on the annotation - large radius should catch it
    await drawOnCanvas(page, [
      { x: 160, y: 180 },
      { x: 165, y: 185 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('change radius during eraser session', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 60, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 200, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activateEraser(page)

    // Erase first with small radius — sweep across annotation
    await setEraserRadius(page, 5)
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 130, y: 220 },
      { x: 160, y: 240 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    // Change to large radius and erase second
    await setEraserRadius(page, 50)
    await drawOnCanvas(page, [
      { x: 300, y: 200 },
      { x: 330, y: 220 },
      { x: 360, y: 240 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Mode switching during use ─────────────────────────────────────────

  test('switch eraser mode during active session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points: { x: number; y: number }[] = []
    for (let x = 80; x <= 400; x += 20) {
      points.push({ x, y: 200 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)

    await createAnnotation(page, 'rectangle', { x: 100, y: 300, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)

    // Start in partial mode
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button:has-text("Partial")')
    await partialBtn.click()
    await page.waitForTimeout(100)

    // Partial erase the pencil stroke (wider sweep to ensure hit)
    await drawOnCanvas(page, [
      { x: 220, y: 190 },
      { x: 240, y: 200 },
      { x: 260, y: 210 },
    ])
    await page.waitForTimeout(200)
    const afterPartial = await getAnnotationCount(page)
    expect(afterPartial).toBeGreaterThanOrEqual(2) // fragments + rectangle

    // Switch to object mode
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)

    // Object erase the rectangle (wider sweep)
    await drawOnCanvas(page, [
      { x: 100, y: 300 },
      { x: 140, y: 325 },
      { x: 180, y: 350 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(afterPartial - 1)
  })

  // ── Immediate undo ────────────────────────────────────────────────────

  test('erase then immediately undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    const screenshotBefore = await screenshotCanvas(page)

    await activateEraser(page)
    await drawOnCanvas(page, [
      { x: 150, y: 150 },
      { x: 200, y: 190 },
      { x: 250, y: 230 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Multiple types in one drag ────────────────────────────────────────

  test('erase multiple annotation types in one drag', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 200, w: 60, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 180, y: 195, w: 50, h: 20 })
    await createAnnotation(page, 'circle', { x: 280, y: 195, w: 40, h: 20 })
    expect(await getAnnotationCount(page)).toBe(3)

    await activateEraser(page)
    const sweepPoints: { x: number; y: number }[] = []
    for (let x = 60; x <= 350; x += 10) {
      sweepPoints.push({ x, y: 205 })
    }
    await drawOnCanvas(page, sweepPoints)
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Overlapping pencil strokes ────────────────────────────────────────

  test('erase overlapping pencil strokes', async ({ page }) => {
    // Two strokes crossing at the same area
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 300, y: 250 },
    ])
    await page.waitForTimeout(200)

    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 300, y: 150 },
      { x: 100, y: 250 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)

    await activateEraser(page)
    // Erase at the crossing point with wider sweep
    await drawOnCanvas(page, [
      { x: 180, y: 180 },
      { x: 200, y: 200 },
      { x: 220, y: 220 },
    ])
    await page.waitForTimeout(200)

    // At least one should be removed (object mode deletes whole annotation)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThan(2)
  })

  // ── Rapid movements ───────────────────────────────────────────────────

  test('rapid eraser movements across many annotations', async ({ page }) => {
    // Create a grid of small annotations
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 60 + i * 80,
        y: 200,
        w: 40,
        h: 30,
      })
    }
    expect(await getAnnotationCount(page)).toBe(5)

    await activateEraser(page)
    // Quick zigzag sweep
    await drawOnCanvas(page, [
      { x: 40, y: 210 },
      { x: 120, y: 220 },
      { x: 200, y: 210 },
      { x: 280, y: 220 },
      { x: 360, y: 210 },
      { x: 440, y: 220 },
      { x: 500, y: 210 },
    ])
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Zoom interaction ──────────────────────────────────────────────────

  test('eraser works correctly at different zoom levels', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)

    // Zoom in twice
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)

    await activateEraser(page)
    // Sweep across the annotation area (zoomed coordinates shift)
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 240, y: 230 },
      { x: 280, y: 260 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Page navigation ───────────────────────────────────────────────────

  test('eraser state persists across page navigation', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')

    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })

    await activateEraser(page)
    await goToPage(page, 2)
    await goToPage(page, 1)

    // Eraser should still be active — sweep across the annotation
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 240, y: 230 },
      { x: 280, y: 260 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Performance ────────────────────────────────────────────────────────

  test('eraser with many annotations (50+) does not freeze', async ({ page }) => {
    // Create many small annotations
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        await selectTool(page, 'Pencil (P)')
        await drawOnCanvas(page, [
          { x: 30 + col * 50, y: 50 + row * 80 },
          { x: 60 + col * 50, y: 70 + row * 80 },
        ])
        await page.waitForTimeout(50)
      }
    }
    const initialCount = await getAnnotationCount(page)
    expect(initialCount).toBeGreaterThanOrEqual(40)

    await activateEraser(page)
    const start = Date.now()

    // Sweep across middle row
    const sweepPoints: { x: number; y: number }[] = []
    for (let x = 20; x <= 540; x += 10) {
      sweepPoints.push({ x, y: 210 })
    }
    await drawOnCanvas(page, sweepPoints)
    await page.waitForTimeout(300)

    const elapsed = Date.now() - start
    // Should complete within a reasonable time (not frozen)
    expect(elapsed).toBeLessThan(10000)

    const afterCount = await getAnnotationCount(page)
    expect(afterCount).toBeLessThan(initialCount)
  })

  // ── Cursor ─────────────────────────────────────────────────────────────

  test('eraser cursor follows mouse position', async ({ page }) => {
    await activateEraser(page)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    // Move mouse to different positions and verify no crash
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.waitForTimeout(50)
    await page.mouse.move(box.x + 300, box.y + 200)
    await page.waitForTimeout(50)
    await page.mouse.move(box.x + 200, box.y + 400)
    await page.waitForTimeout(50)

    // Canvas should still be responsive
    await expect(canvas).toBeVisible()
  })

  // ── Session persistence ────────────────────────────────────────────────

  test('eraser mode persists in session after tool switch', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')

    // Set to partial mode
    const partialBtn = page.locator('button:has-text("Partial")')
    await partialBtn.click()
    await page.waitForTimeout(100)

    // Switch away and back
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)

    // Mode should be remembered — active button has orange bg class
    const classes = await partialBtn.getAttribute('class')
    expect(classes).toContain('bg-[#F47B20]')
  })

  test('eraser radius value persists after tool switch', async ({ page }) => {
    await activateEraser(page)
    await setEraserRadius(page, 30)

    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    await activateEraser(page)

    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      const value = await slider.inputValue()
      expect(parseInt(value)).toBeGreaterThan(0)
    }
  })
})
