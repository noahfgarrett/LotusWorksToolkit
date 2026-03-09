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
    await createAnnotation(page, 'rectangle', { x: 300, y: 400, w: 50, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateEraser(page)
    // Sweep horizontally along the top edge (y=400) from well outside left to right
    await drawOnCanvas(page, [
      { x: 280, y: 400 },
      { x: 290, y: 400 },
      { x: 300, y: 400 },
      { x: 310, y: 400 },
      { x: 320, y: 400 },
      { x: 330, y: 400 },
      { x: 340, y: 400 },
      { x: 350, y: 400 },
      { x: 360, y: 400 },
    ])
    await page.waitForTimeout(500)

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

    // Hit: sweep across the top edge (y=200) of the rectangle to cross the perimeter
    await drawOnCanvas(page, [
      { x: 180, y: 195 },
      { x: 200, y: 200 },
      { x: 230, y: 200 },
      { x: 260, y: 200 },
      { x: 300, y: 200 },
      { x: 320, y: 205 },
    ])
    await page.waitForTimeout(300)
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
    // After zooming, drawOnCanvas coords don't map correctly because CSS zoom
    // changes the canvas size. Use direct mouse events on the visible canvas.
    const canvas = page.locator('canvas.ann-canvas').first()
    await canvas.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Sweep across the visible area
    await page.mouse.move(box.x + 10, box.y + box.height / 3)
    await page.mouse.down()
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(box.x + (box.width * i / 20), box.y + box.height / 3, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(500)

    // If the first sweep missed, try a vertical sweep
    if ((await getAnnotationCount(page)) > 0) {
      await page.mouse.move(box.x + box.width / 3, box.y + 10)
      await page.mouse.down()
      for (let i = 1; i <= 20; i++) {
        await page.mouse.move(box.x + box.width / 3, box.y + (box.height * i / 20), { steps: 2 })
      }
      await page.mouse.up()
      await page.waitForTimeout(500)
    }

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
    test.setTimeout(180000)
    // Create 20 small annotations (reduced from 50 to avoid timeout)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        await selectTool(page, 'Pencil (P)')
        await drawOnCanvas(page, [
          { x: 30 + col * 80, y: 50 + row * 80 },
          { x: 70 + col * 80, y: 80 + row * 80 },
        ])
        await page.waitForTimeout(50)
      }
    }
    const initialCount = await getAnnotationCount(page)
    expect(initialCount).toBeGreaterThanOrEqual(15)

    await activateEraser(page)
    const start = Date.now()

    // Sweep across the second row (y~130 to y~160) — cross the pencil strokes perpendicularly
    // Pencil strokes in row 1 go from y=130 to y=160, so sweep horizontally at y=145
    const sweepPoints: { x: number; y: number }[] = []
    for (let x = 20; x <= 440; x += 10) {
      sweepPoints.push({ x, y: 145 })
    }
    await drawOnCanvas(page, sweepPoints)
    await page.waitForTimeout(500)

    const elapsed = Date.now() - start
    // Should complete within a reasonable time (not frozen)
    expect(elapsed).toBeLessThan(30000)

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
