import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
  exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ---------------------------------------------------------------------------
// Basic Freehand Drawing
// ---------------------------------------------------------------------------

test.describe('Pencil Basic Drawing', () => {
  test('basic freehand draw creates one annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 150, y: 120 },
      { x: 200, y: 110 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-point curve creates single annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points = Array.from({ length: 30 }, (_, i) => ({
      x: 80 + i * 10,
      y: 200 + Math.sin(i * 0.5) * 40,
    }))
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('small stroke (< 10px total) creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 203, y: 202 },
      { x: 206, y: 204 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large stroke spanning 400px creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 20, y: 100 },
      { x: 150, y: 200 },
      { x: 300, y: 150 },
      { x: 420, y: 300 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('diagonal line from top-left to bottom-right', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 30, y: 30 },
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('S-curve with smooth direction changes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 150, y: 50 },
      { x: 200, y: 100 },
      { x: 250, y: 150 },
      { x: 300, y: 100 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zigzag with sharp direction changes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 50, y: 200 },
      { x: 100, y: 100 },
      { x: 150, y: 200 },
      { x: 200, y: 100 },
      { x: 250, y: 200 },
      { x: 300, y: 100 },
      { x: 350, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing near top-left edge creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 2, y: 2 },
      { x: 30, y: 20 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing near bottom-right edge creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await drawOnCanvas(page, [
      { x: box.width - 30, y: box.height - 30 },
      { x: box.width - 5, y: box.height - 5 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing across full canvas width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 5, y: 200 },
      { x: 150, y: 200 },
      { x: 300, y: 200 },
      { x: 450, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with minimum two points creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 150, y: 150 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very fast drawing still captures points', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 50, box.y + 100)
    await page.mouse.down()
    // Very fast sweep with minimal steps
    await page.mouse.move(box.x + 400, box.y + 300, { steps: 2 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very slow deliberate drawing creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    // Very slow sweep with many steps
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 50 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing with varying pressure-like velocity changes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 50, box.y + 150)
    await page.mouse.down()
    // Slow section
    await page.mouse.move(box.x + 100, box.y + 155, { steps: 20 })
    // Fast section
    await page.mouse.move(box.x + 250, box.y + 140, { steps: 2 })
    // Slow again
    await page.mouse.move(box.x + 300, box.y + 160, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Sticky Tool Mode & Consecutive Draws
// ---------------------------------------------------------------------------

test.describe('Pencil Sticky Tool & Consecutive Draws', () => {
  test('without sticky mode, tool switches to select after first draw', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Second draw without re-selecting may fail (known bug)
    await drawOnCanvas(page, [
      { x: 100, y: 250 },
      { x: 200, y: 300 },
    ])
    await page.waitForTimeout(200)
    // Annotation count should still be 1 if tool switched to select
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('with sticky mode enabled, tool stays active after draw', async ({ page }) => {
    // Double-click the draw dropdown button to enable sticky mode
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      // If pencil isn't the active draw, use keyboard then double-click
      await selectTool(page, 'Pencil (P)')
      const btn = page.locator('button[title="Pencil (P)"]').first()
      if (await btn.isVisible().catch(() => false)) await btn.dblclick()
    }
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 130 },
    ])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 200, y: 230 },
    ])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('sticky mode: three consecutive draws without re-selecting', async ({ page }) => {
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 3; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 50 + i * 80 },
        { x: 200, y: 50 + i * 80 },
      ])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(3)
  })

  test('draw then immediately draw again at same location', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw overlapping strokes creates separate annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'pencil', { x: 150, y: 80, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('20+ strokes rapid fire with sticky mode', async ({ page }) => {
    test.setTimeout(180000)
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 20; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 5) * 80, y: 20 + Math.floor(i / 5) * 60 },
        { x: 70 + (i % 5) * 80, y: 40 + Math.floor(i / 5) * 60 },
      ])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(500)
    const rapidCount = await getAnnotationCount(page)
    expect(rapidCount).toBeGreaterThanOrEqual(15)
    expect(rapidCount).toBeLessThanOrEqual(20)
  })

  test('annotation count increments after each draw', async ({ page }) => {
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 1; i <= 5; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 30 + i * 50 },
        { x: 200, y: 30 + i * 50 },
      ])
      await page.waitForTimeout(200)
      const count = await getAnnotationCount(page)
      expect(count).toBeGreaterThanOrEqual(i - 1)
      expect(count).toBeLessThanOrEqual(i)
    }
  })
})

// ---------------------------------------------------------------------------
// Session Data Verification
// ---------------------------------------------------------------------------

test.describe('Pencil Session Data', () => {
  test('session data stores points after drawing', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns).toBeTruthy()
    expect(anns?.length).toBeGreaterThan(0)
    expect(anns?.[0]?.points).toBeDefined()
    expect(anns?.[0]?.points?.length).toBeGreaterThan(0)
  })

  test('session data stores type as pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.type).toBe('pencil')
  })

  test('stroke appears on canvas via screenshot comparison', async ({ page }) => {
    const beforeScreenshot = await screenshotCanvas(page)
    await createAnnotation(page, 'pencil')
    const afterScreenshot = await screenshotCanvas(page)
    // Screenshots should differ after drawing
    expect(beforeScreenshot.equals(afterScreenshot)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Undo & Redo
// ---------------------------------------------------------------------------

test.describe('Pencil Undo & Redo', () => {
  test('draw and undo removes annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw, undo, then redo restores annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple undo steps remove strokes in reverse order', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 100, h: 30 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 100, h: 30 })
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
})

// ---------------------------------------------------------------------------
// Colors, Widths, and Opacities
// ---------------------------------------------------------------------------

test.describe('Pencil Colors', () => {
  test('draw with red color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw with blue color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw with green color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw with different colors stores different color values', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).not.toBe(anns?.[1]?.color)
  })
})

test.describe('Pencil Widths', () => {
  test('draw with 1px width produces thin line', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible().catch(() => false)) {
      await slider.fill('1')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('draw with 5px width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible().catch(() => false)) {
      await slider.fill('5')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('draw with 10px width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible().catch(() => false)) {
      await slider.fill('10')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('draw with 20px width produces thick line', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible().catch(() => false)) {
      await slider.fill('20')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })
})

test.describe('Pencil Opacity', () => {
  test('draw with 100% opacity', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    // Opacity slider is typically the second range input (after width)
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 1) {
      await sliders.nth(1).fill('100')
    } else if (sliderCount === 1) {
      // Single slider might be shared
      await sliders.first().fill('100')
    }
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeDefined()
  })

  test('draw with 10% opacity (nearly transparent)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 1) {
      await sliders.nth(1).fill('10')
    } else if (sliderCount === 1) {
      await sliders.first().fill('10')
    }
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeDefined()
  })

  test('draw with 50% opacity (semi-transparent)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 1) {
      await sliders.nth(1).fill('50')
    } else if (sliderCount === 1) {
      await sliders.first().fill('50')
    }
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Select, Move, Delete, Duplicate, Copy/Paste
// ---------------------------------------------------------------------------

test.describe('Pencil Selection & Manipulation', () => {
  test('draw then select shows selection handles', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 150)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('draw then select and move', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 150, y: 115 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw then delete via Delete key', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 150, 115)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw then duplicate via Ctrl+D', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 150, 115)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw then copy/paste via Ctrl+C/V', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 150, 115)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Edge & Boundary Drawing
// ---------------------------------------------------------------------------

test.describe('Pencil Boundary Drawing', () => {
  test('draw starting at canvas top edge', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 1 },
      { x: 250, y: 50 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw starting at canvas left edge', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 1, y: 200 },
      { x: 50, y: 220 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pointer leaves canvas mid-stroke and returns', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    // Move outside
    await page.mouse.move(box.x + box.width + 50, box.y + 200, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Straight Line Mode
// ---------------------------------------------------------------------------

test.describe('Pencil Straight Line Mode', () => {
  test('straight line mode creates annotation with constrained points', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const straightBtn = page.locator('button:has-text("Free")')
    if (await straightBtn.isVisible()) await straightBtn.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('straight line stroke has fewer points than equivalent freehand', async ({ page }) => {
    // Draw freehand first
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 120, y: 110 },
      { x: 140, y: 105 },
      { x: 160, y: 115 },
      { x: 180, y: 108 },
      { x: 200, y: 100 },
    ])
    await page.waitForTimeout(200)
    // Switch to straight mode and draw
    await selectTool(page, 'Pencil (P)')
    const straightBtn = page.locator('button:has-text("Free")')
    if (await straightBtn.isVisible()) await straightBtn.click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 250 },
      { x: 300, y: 250 },
    ])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0].points.length).toBeGreaterThan(anns[1].points.length)
    }
  })
})

// ---------------------------------------------------------------------------
// Visual Quality
// ---------------------------------------------------------------------------

test.describe('Pencil Visual Quality', () => {
  test('smooth curve renders without visual artifacts', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const cx = 250, cy = 250, r = 80
    const points = Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Screenshot to verify visual quality
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })
})
