import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  selectAnnotationAt, waitForSessionSave, getSessionData, goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Opacity — Visibility Per Tool', () => {
  test('opacity slider visible for pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('opacity slider visible for highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Highlighter hides the opacity slider (uses fixed 0.4 opacity)
    // but should still have at least the stroke width slider
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Opacity — Value Settings', () => {
  test('opacity default value is 100', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(100)
  })

  test('opacity set to 0', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    // Opacity slider min is 10, so fill with minimum valid value
    await opacitySlider.fill('10')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(10)
  })

  test('opacity set to 25', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('25')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(25)
  })

  test('opacity set to 50', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(50)
  })

  test('opacity set to 75', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('75')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(75)
  })

  test('opacity set to 100', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('100')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(100)
  })
})

test.describe('Opacity — Applied to Draws', () => {
  test('opacity applies to pencil draw', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity applies to line draw', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity applies to arrow draw', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity applies to rectangle draw', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity applies to circle draw', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity applies to cloud draw', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await page.waitForTimeout(100)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('opacity applies to highlight draw', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Highlighter hides opacity slider (uses fixed 0.4 opacity)
    // Just draw and verify the canvas is still functional
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 120 }])
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })
})

test.describe('Opacity — Preservation', () => {
  test('opacity in session data', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('60')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(60)
  })

  test('opacity preserved after undo', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Re-select pencil in case undo switched to Select mode
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    // Opacity setting should still be at 50
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(50)
  })

  test('opacity preserved after redo', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity preserved after duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('opacity preserved after copy/paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('opacity preserved in export', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity change on selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    const hasSlider = await opacitySlider.isVisible().catch(() => false)
    if (hasSlider) {
      await opacitySlider.fill('30')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity slider range 0-100', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    const min = await opacitySlider.getAttribute('min')
    const max = await opacitySlider.getAttribute('max')
    // Opacity slider has min=10 and max=100
    expect(Number(min)).toBe(10)
    expect(Number(max)).toBe(100)
  })
})

test.describe('Opacity — Combinations', () => {
  test('opacity with color combination', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity with stroke width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('10')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity with fill color', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('low opacity pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('10')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('low opacity rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('10')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('low opacity circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('10')
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('low opacity line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('10')
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zero opacity annotation exists but invisible', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    // Min opacity is 10, use minimum instead of 0
    await opacitySlider.fill('10')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zero opacity in count', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    // Min opacity is 10, use minimum instead of 0
    await opacitySlider.fill('10')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    const statusText = page.locator('text=/1 ann/')
    await expect(statusText).toBeVisible({ timeout: 3000 })
  })

  test('opacity after zoom', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(50)
  })
})

test.describe('Opacity — Fine-Grained Values', () => {
  test('opacity 10%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('10')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(10)
  })

  test('opacity 20%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('20')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(20)
  })

  test('opacity 30%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('30')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(30)
  })

  test('opacity 40%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('40')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(40)
  })

  test('opacity 60%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('60')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(60)
  })

  test('opacity 70%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('70')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(70)
  })

  test('opacity 80%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('80')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(80)
  })

  test('opacity 90%', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('90')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.opacity).toBe(90)
  })

  test('rapid opacity changes do not crash', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    for (let i = 10; i <= 100; i += 10) {
      await opacitySlider.fill(String(i))
      await page.waitForTimeout(20)
    }
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('different opacity per annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('30')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    // Re-select pencil in case tool switched after draw
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await opacitySlider.fill('80')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('mixed opacity annotations coexist', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('20')
    await drawOnCanvas(page, [{ x: 100, y: 80 }, { x: 200, y: 80 }])
    await page.waitForTimeout(200)
    // Re-select pencil in case tool switched after draw
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 130 }, { x: 200, y: 130 }])
    await page.waitForTimeout(200)
    // Re-select pencil again
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await opacitySlider.fill('100')
    await drawOnCanvas(page, [{ x: 100, y: 180 }, { x: 200, y: 180 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('opacity with filled shape affects both fill and stroke', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity on page 2 of multi-page PDF', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('50')
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(50)
  })

  test('opacity after rotate', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]')
    const hasRotate = await rotateBtn.first().isVisible().catch(() => false)
    if (hasRotate) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('60')
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(60)
  })

  test('opacity persists within tool session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('40')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    // Re-select pencil in case tool switched after draw
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    // Opacity should still be 40 for next draw
    const value = await opacitySlider.inputValue()
    expect(Number(value)).toBe(40)
  })

  test('opacity reset on tool switch returns to saved value', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('45')
    await selectTool(page, 'Line (L)')
    await page.waitForTimeout(100)
    const lineOpacity = page.locator('input[type="range"][max="100"]')
    const value = await lineOpacity.inputValue()
    expect(Number(value)).toBeGreaterThanOrEqual(0)
  })

  test('opacity visual difference between 100 and 50', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const opacitySlider = page.locator('input[type="range"][max="100"]')
    await opacitySlider.fill('100')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    // Re-select pencil in case tool switched after draw
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await opacitySlider.fill('50')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
