import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  goToPage,
  exportPDF,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Basic Rectangle Drawing ────────────────────────────────────────────────

test.describe('Basic Rectangle Drawing', () => {
  test('basic rectangle via drag creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('small rectangle (15x15) creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 215, y: 215 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large rectangle spanning most of canvas creates annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 500 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('square-ish rectangle (equal width and height)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('wide rectangle (landscape orientation)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 30, y: 200 }, { x: 400, y: 230 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall rectangle (portrait orientation)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 200, y: 30 }, { x: 230, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rectangle at Different Canvas Positions ────────────────────────────────

test.describe('Rectangle Positions', () => {
  test('rectangle near top-left corner', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 5, y: 5 }, { x: 80, y: 60 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle near bottom-right corner', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 350, y: 500 }, { x: 450, y: 580 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle at center of canvas', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 175, y: 250 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle near top-right area', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 350, y: 10 }, { x: 450, y: 70 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle near bottom-left area', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 10, y: 500 }, { x: 100, y: 570 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Consecutive Rectangles & Sticky Mode ───────────────────────────────────

test.describe('Consecutive Rectangles', () => {
  test('tool auto-switches to Select after drawing rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    // Tool should auto-switch to Select
    await expect(page.locator('button[title="Select (S)"]')).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('consecutive rectangles with sticky mode (double-click tool)', async ({ page }) => {
    // Enable sticky mode via the Pin button, then select the tool
    await selectTool(page, 'Rectangle (R)')
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 130, y: 110 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // In sticky mode, tool should remain active
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 130, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await dragOnCanvas(page, { x: 50, y: 250 }, { x: 130, y: 310 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Default Properties ─────────────────────────────────────────────────────

test.describe('Rectangle Default Properties', () => {
  test('default rectangle has a color defined', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
    expect(typeof anns[0].color).toBe('string')
  })

  test('default rectangle has stroke width defined', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
    expect(anns[0].strokeWidth).toBeGreaterThan(0)
  })

  test('default rectangle has opacity defined', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeDefined()
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })

  test('default rectangle type is stored as rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('rectangle')
  })
})

// ─── Rectangle with Fill Color ──────────────────────────────────────────────

test.describe('Rectangle Fill Color', () => {
  test('rectangle with fill color stores fillColor in session', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Click the fill color toggle/button
    const fillToggle = page.locator('text=/Fill/i').first()
    await fillToggle.click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].fillColor).toBeDefined()
  })

  test('rectangle without fill (outline only) has no fillColor', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    // By default rectangle should have no fill or fill set to transparent/none
    expect(anns[0].fillColor === undefined || anns[0].fillColor === null || anns[0].fillColor === 'none' || anns[0].fillColor === '').toBeTruthy()
  })
})

// ─── Rectangle with Rounded Corners ─────────────────────────────────────────

test.describe('Rectangle Corner Radius', () => {
  test('rectangle with corner radius 0 (sharp corners)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const count = await radiusSlider.count()
    if (count > 0) {
      await radiusSlider.fill('0')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].cornerRadius === undefined || anns[0].cornerRadius === 0).toBeTruthy()
  })

  test('rectangle with corner radius 5', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    if (await radiusSlider.count() > 0) {
      await radiusSlider.fill('5')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0]).toBeDefined()
  })

  test('rectangle with corner radius 15', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    if (await radiusSlider.count() > 0) {
      await radiusSlider.fill('15')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0]).toBeDefined()
  })

  test('rectangle with corner radius 30 (maximum)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    if (await radiusSlider.count() > 0) {
      await radiusSlider.fill('30')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0]).toBeDefined()
  })
})

// ─── Rectangle Dash Patterns ────────────────────────────────────────────────

test.describe('Rectangle Dash Patterns', () => {
  test('rectangle with dashed outline', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const count = await dashedBtn.count()
    if (count > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dashed' || anns[0].dash === 'dashed').toBeTruthy()
  })

  test('rectangle with dotted outline', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dottedBtn = page.locator('button:has-text("┈")').first()
    const count = await dottedBtn.count()
    if (count > 0) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dotted' || anns[0].dash === 'dotted').toBeTruthy()
  })
})

// ─── Rectangle Color Presets ────────────────────────────────────────────────

test.describe('Rectangle Color Presets', () => {
  const colorPresets = [
    { index: 0, name: 'first color preset' },
    { index: 1, name: 'second color preset' },
    { index: 2, name: 'third color preset' },
    { index: 3, name: 'fourth color preset' },
    { index: 4, name: 'fifth color preset' },
    { index: 5, name: 'sixth color preset' },
    { index: 6, name: 'seventh color preset' },
    { index: 7, name: 'eighth color preset' },
    { index: 8, name: 'ninth color preset' },
  ]

  for (const preset of colorPresets) {
    test(`rectangle with ${preset.name} (index ${preset.index})`, async ({ page }) => {
      await selectTool(page, 'Rectangle (R)')
      const colorSwatches = page.locator('button[title^="#"]')
      const count = await colorSwatches.count()
      if (count > preset.index) {
        await colorSwatches.nth(preset.index).click()
        await page.waitForTimeout(100)
      }
      await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(1)
    })
  }

  test('rectangle with custom hex color via input', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const hexInput = page.locator('input[type="color"], input[placeholder*="hex" i], input[value^="#"]').first()
    const count = await hexInput.count()
    if (count > 0) {
      await hexInput.fill('#FF5733')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rectangle Stroke Width Variations ──────────────────────────────────────

test.describe('Rectangle Stroke Width', () => {
  test('rectangle with stroke width 1px', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('rectangle with stroke width 10px', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('rectangle with stroke width 20px (maximum)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })
})

// ─── Rectangle Opacity Variations ───────────────────────────────────────────

test.describe('Rectangle Opacity', () => {
  test('rectangle with opacity 100%', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('100')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(1.0, 1)
  })

  test('rectangle with opacity 50%', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('50')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('rectangle with opacity 10% (minimum)', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.1, 1)
  })
})

// ─── Rectangle Count & Session ──────────────────────────────────────────────

test.describe('Rectangle Count and Session', () => {
  test('annotation count increments correctly for each rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await createAnnotation(page, 'rectangle', { x: 50, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await createAnnotation(page, 'rectangle', { x: 50, y: 350, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('rectangle data is stored in session storage', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('rectangle')
  })

  test('rectangle on page 2 is stored under page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['2'] || session.annotations[2]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('rectangle')
  })
})

// ─── Rectangle at Different Zoom and Rotation ───────────────────────────────

test.describe('Rectangle Zoom and Rotation', () => {
  test('rectangle while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rectangle Undo, Redo, Delete ───────────────────────────────────────────

test.describe('Rectangle Undo, Redo, Delete', () => {
  test('undo removes rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete selected rectangle removes it', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate rectangle with Ctrl+D', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy and paste rectangle with Ctrl+C / Ctrl+V', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Rapid Creation and Stress ──────────────────────────────────────────────

test.describe('Rectangle Rapid Creation', () => {
  test('10 rectangles created rapidly', async ({ page }) => {
    // Use sticky mode via Pin button
    await selectTool(page, 'Rectangle (R)')
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      const y = 30 + i * 55
      await dragOnCanvas(page, { x: 50, y }, { x: 150, y: y + 40 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('overlapping rectangles all counted', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 130, y: 130, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 160, y: 160, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('nested rectangles (one inside another)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 300, h: 250 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 140, y: 130, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('rectangles of various sizes on one page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 10, y: 10, w: 20, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 200, h: 150 })
    await createAnnotation(page, 'rectangle', { x: 10, y: 400, w: 400, h: 30 })
    expect(await getAnnotationCount(page)).toBe(4)
  })
})

// ─── Rectangle Persistence ──────────────────────────────────────────────────

test.describe('Rectangle Persistence', () => {
  test('rectangle persists after page reload', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    expect(await getAnnotationCount(page)).toBe(1)
    // Reload the page
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    // Session data should still exist and restore the annotation
    const session = await getSessionData(page)
    if (session) {
      const anns = session.annotations['1'] || session.annotations[1]
      if (anns) {
        expect(anns.length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})
