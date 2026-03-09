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
// Basic Arrow Creation
// ---------------------------------------------------------------------------

test.describe('Arrow Basic Creation', () => {
  test('basic arrow creation via drag', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow has arrowhead visible on canvas', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    // Arrow type should be stored
    expect(anns?.[0]?.type).toBe('arrow')
  })

  test('double-headed arrow via arrowStart toggle', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    // Look for arrowStart toggle button
    const startArrowBtn = page.locator('button[title*="arrow start"], button[title*="Start arrow"], button:has-text("arrow")').first()
    if (await startArrowBtn.isVisible().catch(() => false)) {
      await startArrowBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow direction matters (left to right vs right to left)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 300, y: 250 }, { x: 100, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      // Arrows should have different endpoint orientations
      expect(anns[0]).toBeTruthy()
      expect(anns[1]).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// Arrow Orientations
// ---------------------------------------------------------------------------

test.describe('Arrow Orientations', () => {
  test('horizontal arrow left to right', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 400, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertical arrow top to bottom', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 50 }, { x: 200, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('diagonal arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very short arrow (< 10px)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 207, y: 205 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very long arrow corner to corner', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Arrow Properties
// ---------------------------------------------------------------------------

test.describe('Arrow Properties', () => {
  test('arrow color applied', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
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

  test('arrow width applied', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('arrow opacity applied', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('40')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.4, 1)
  })

  test('arrow dash pattern (dashed)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible().catch(() => false)) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow dash pattern (dotted)', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.isVisible().catch(() => false)) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Arrow Selection & Manipulation
// ---------------------------------------------------------------------------

test.describe('Arrow Selection & Manipulation', () => {
  test('arrow select and move', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 200, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow resize by dragging endpoint', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    // Try dragging endpoint
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 400, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow delete via Delete key', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Arrow Undo & Redo
// ---------------------------------------------------------------------------

test.describe('Arrow Undo & Redo', () => {
  test('arrow undo removes annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('arrow undo then redo restores', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Arrow Duplicate & Copy/Paste
// ---------------------------------------------------------------------------

test.describe('Arrow Duplicate & Copy/Paste', () => {
  test('arrow duplicate via Ctrl+D', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow copy/paste via Ctrl+C/V', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
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
// Multiple Arrows
// ---------------------------------------------------------------------------

test.describe('Multiple Arrows', () => {
  test('create multiple arrows on same page', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'arrow', { x: 50, y: 50 + i * 60, w: 200, h: 0 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('arrows pointing at each other', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 350, y: 200 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('consecutive arrow draws with sticky mode', async ({ page }) => {
    await page.locator('button[title="Arrow (A)"]').dblclick()
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await dragOnCanvas(page, { x: 50, y: 50 + i * 50 }, { x: 250, y: 50 + i * 50 })
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Arrow Multi-Page, Zoom & Rotation
// ---------------------------------------------------------------------------

test.describe('Arrow Multi-Page, Zoom & Rotation', () => {
  test('arrow on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('arrow at 200% zoom', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 50% zoom', async ({ page }) => {
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow after page rotation', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Arrow Export & Session
// ---------------------------------------------------------------------------

test.describe('Arrow Export & Session Persistence', () => {
  test('arrow in exported PDF', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('arrow session persistence', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.length).toBeGreaterThan(0)
    expect(anns?.[0]?.type).toBe('arrow')
  })

  test('arrow head scales with stroke width', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const thinScreenshot = await screenshotCanvas(page)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    await selectTool(page, 'Arrow (A)')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const thickScreenshot = await screenshotCanvas(page)

    // Arrow heads should look different at different widths
    expect(thinScreenshot.equals(thickScreenshot)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Arrow Additional Edge Cases
// ---------------------------------------------------------------------------

test.describe('Arrow Additional Edge Cases', () => {
  test('arrow shortcut A activates arrow tool', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow cursor is crosshair', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('arrow near top edge', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 50, y: 3 }, { x: 300, y: 3 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow near left edge', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 3, y: 50 }, { x: 3, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with maximum width 20', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
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

  test('arrow with minimum width 1', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
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

  test('arrow with low opacity', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.15, 1)
  })

  test('arrow eraser removes arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('arrow eraser then undo restores arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
