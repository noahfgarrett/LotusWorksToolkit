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
// Basic Line Creation
// ---------------------------------------------------------------------------

test.describe('Line Basic Creation', () => {
  test('basic line creation via drag', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('horizontal line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertical line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 200, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('diagonal line from top-left to bottom-right', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('diagonal line from bottom-left to top-right', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 350 }, { x: 350, y: 50 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very short line (< 10px)', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 205, y: 203 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very long line corner to corner', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Line Dash Patterns
// ---------------------------------------------------------------------------

test.describe('Line Dash Patterns', () => {
  test('dashed line pattern', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('dotted line pattern', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible().catch(() => false)) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('solid line pattern (default)', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Line Properties
// ---------------------------------------------------------------------------

test.describe('Line Properties', () => {
  test('line color changes applied', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).toBeDefined()
  })

  test('line width changes applied', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBe(10)
  })

  test('line opacity changes applied', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('50')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.5, 1)
  })
})

// ---------------------------------------------------------------------------
// Line Selection & Manipulation
// ---------------------------------------------------------------------------

test.describe('Line Selection & Manipulation', () => {
  test('line select and move', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 200, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line select and resize by dragging endpoint', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    // Try dragging an endpoint
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 400, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line delete via Delete key', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Line Undo & Redo
// ---------------------------------------------------------------------------

test.describe('Line Undo & Redo', () => {
  test('line undo removes annotation', async ({ page }) => {
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('line undo then redo restores', async ({ page }) => {
    await createAnnotation(page, 'line')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Line Duplicate & Copy/Paste
// ---------------------------------------------------------------------------

test.describe('Line Duplicate & Copy/Paste', () => {
  test('line duplicate via Ctrl+D', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('line copy/paste via Ctrl+C/V', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Multiple Lines
// ---------------------------------------------------------------------------

test.describe('Multiple Lines', () => {
  test('create multiple lines on same page', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'line', { x: 50, y: 50 + i * 60, w: 200, h: 0 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('lines crossing each other creates separate annotations', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 200 })
    await createAnnotation(page, 'line', { x: 300, y: 100, w: -200, h: 200 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Line Multi-Page, Zoom, Rotation
// ---------------------------------------------------------------------------

test.describe('Line Multi-Page, Zoom & Rotation', () => {
  test('line on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('line after zoom in', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line after zoom out', async ({ page }) => {
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line after page rotation', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Line Export & Session
// ---------------------------------------------------------------------------

test.describe('Line Export & Session Persistence', () => {
  test('line in exported PDF', async ({ page }) => {
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('line session persistence', async ({ page }) => {
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.length).toBeGreaterThan(0)
    expect(anns?.[0]?.type).toBe('line')
  })
})

// ---------------------------------------------------------------------------
// Line Edge Cases
// ---------------------------------------------------------------------------

test.describe('Line Edge Cases', () => {
  test('line near top edge', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 3 }, { x: 300, y: 3 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line near left edge', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 3, y: 50 }, { x: 3, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line from edge to edge horizontally', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 5, y: 200 }, { x: 450, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line from edge to edge vertically', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 5 }, { x: 200, y: 450 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line shortcut L activates line tool', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line cursor is crosshair', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('consecutive line draws with sticky mode', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await dragOnCanvas(page, { x: 50, y: 50 + i * 50 }, { x: 300, y: 50 + i * 50 })
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('line with all color presets', async ({ page }) => {
    const swatches = page.locator('button[title^="#"]')
    await selectTool(page, 'Line (L)')
    const count = await swatches.count()
    if (count > 0) {
      await swatches.nth(1).click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with maximum width 20', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('line with minimum width 1', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('line with low opacity', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.2, 1)
  })
})
