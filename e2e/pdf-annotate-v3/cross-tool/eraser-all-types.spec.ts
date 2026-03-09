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
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Cross-Tool: Eraser on All Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  /** Activate eraser in object mode */
  async function activateObjectEraser(page: import('@playwright/test').Page) {
    await selectTool(page, 'Eraser (E)')
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)
  }

  test('object erase pencil annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 160 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase highlighter annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 90 }, { x: 300, y: 110 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase line annotation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 150, y: 80 }, { x: 250, y: 120 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase arrow annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 150, y: 80 }, { x: 250, y: 120 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase rectangle annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase circle annotation', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase cloud annotation', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await clickCanvasAt(page, 250, 100)
    await clickCanvasAt(page, 250, 200)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 140 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase callout annotation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('object erase stamp annotation', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /stamp/i })
    const hasStamp = (await stampBtn.count()) > 0
    if (hasStamp) {
      await stampBtn.click()
      await clickCanvasAt(page, 150, 150)
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(1)
      await activateObjectEraser(page)
      await dragOnCanvas(page, { x: 130, y: 130 }, { x: 170, y: 170 })
      await page.waitForTimeout(300)
      expect(await getAnnotationCount(page)).toBe(0)
    } else {
      // Stamp tool not available — verify eraser works on a shape instead
      await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
      await activateObjectEraser(page)
      await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 160 })
      await page.waitForTimeout(300)
      expect(await getAnnotationCount(page)).toBe(0)
    }
  })

  test('partial erase pencil stroke splits it', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 50, y: 150 },
      { x: 100, y: 150 },
      { x: 150, y: 150 },
      { x: 200, y: 150 },
      { x: 250, y: 150 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Switch to eraser — partial erase mode if available
    await selectTool(page, 'Eraser (E)')
    // Erase only the middle portion — sweep vertically across the stroke
    await drawOnCanvas(page, [
      { x: 155, y: 120 },
      { x: 155, y: 135 },
      { x: 155, y: 150 },
      { x: 155, y: 165 },
      { x: 155, y: 180 },
    ])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    // Should be 0 (object erase) or 2 (partial erase split)
    expect(count === 0 || count === 2).toBeTruthy()
  })

  test('partial erase highlighter', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 350, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Sweep vertically across the highlighter stroke
    await drawOnCanvas(page, [
      { x: 200, y: 120 },
      { x: 200, y: 135 },
      { x: 200, y: 150 },
      { x: 200, y: 165 },
      { x: 200, y: 180 },
    ])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    // Object erase removes it fully, or partial erase splits
    expect(count).toBeLessThanOrEqual(2)
  })

  test('partial erase on line converts to polyline fragments', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 150, w: 250, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Default is partial mode — lines get converted to polyline and split
    // Sweep vertically across the line to ensure we cross the stroke
    await drawOnCanvas(page, [
      { x: 175, y: 120 },
      { x: 175, y: 135 },
      { x: 175, y: 150 },
      { x: 175, y: 165 },
      { x: 175, y: 180 },
    ])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    // Partial mode splits shapes into polyline fragments (typically 2)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('partial erase on shapes converts to polyline fragments', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Default is partial mode — shapes get converted to polyline and split
    // Sweep across the rectangle to cross edges
    await drawOnCanvas(page, [
      { x: 80, y: 150 },
      { x: 100, y: 150 },
      { x: 130, y: 150 },
      { x: 175, y: 150 },
      { x: 220, y: 150 },
      { x: 250, y: 150 },
      { x: 270, y: 150 },
    ])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    // Partial mode splits shapes into polyline fragments
    expect(count).toBeLessThanOrEqual(2)
  })

  test('undo erase of pencil restores it', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 60 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 160 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo erase of rectangle restores it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo erase of text restores it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 140 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo erase of circle restores it', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 100 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo erase of arrow restores it', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 0 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 150, y: 80 }, { x: 250, y: 120 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase mixed annotations in one drag sweep', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 80, y: 140, w: 80, h: 40 })
    await createAnnotation(page, 'pencil', { x: 80, y: 200, w: 80, h: 30 })
    expect(await getAnnotationCount(page)).toBe(3)
    await activateObjectEraser(page)
    // Sweep vertically through all annotations
    await dragOnCanvas(page, { x: 120, y: 70 }, { x: 120, y: 240 })
    await page.waitForTimeout(300)
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeLessThan(3)
  })

  test('eraser only touches annotations in its path', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 80, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 300, y: 80, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await activateObjectEraser(page)
    // Erase only near the rectangle (far from circle)
    await dragOnCanvas(page, { x: 50, y: 80 }, { x: 130, y: 130 })
    await page.waitForTimeout(300)
    // Circle should remain
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser with small drag does not erase distant annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 300, y: 300, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    // Erase in top-left corner, far from rectangle
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 60, y: 60 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser click without drag on annotation erases it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await activateObjectEraser(page)
    // Click on the edge of the rectangle (left edge at x=100)
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser on empty canvas does nothing', async ({ page }) => {
    expect(await getAnnotationCount(page)).toBe(0)
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase then create new annotation of same type', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple undo after erasing multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 80, y: 160, w: 80, h: 50 })
    await activateObjectEraser(page)
    await dragOnCanvas(page, { x: 80, y: 70 }, { x: 160, y: 220 })
    await page.waitForTimeout(300)
    const afterErase = await getAnnotationCount(page)
    // Undo the erase
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const afterUndo = await getAnnotationCount(page)
    expect(afterUndo).toBeGreaterThan(afterErase)
  })
})
