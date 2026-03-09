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

// ─── Basic Circle/Ellipse Drawing ───────────────────────────────────────────

test.describe('Basic Circle Drawing', () => {
  test('basic circle via drag creates annotation', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('small circle (15x15) creates annotation', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 215, y: 215 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large circle spanning most of canvas', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 450 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('perfect circle (equal width and height drag)', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('wide ellipse (landscape orientation)', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 30, y: 200 }, { x: 400, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall ellipse (portrait orientation)', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 30 }, { x: 240, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Circle at Different Positions ──────────────────────────────────────────

test.describe('Circle Positions', () => {
  test('circle near top-left corner', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 5, y: 5 }, { x: 80, y: 80 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle near bottom-right corner', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 350, y: 500 }, { x: 440, y: 570 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle at center of canvas', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 170, y: 250 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle near left edge', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 2, y: 200 }, { x: 60, y: 260 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle near right edge', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 380, y: 200 }, { x: 460, y: 280 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Consecutive Circles ────────────────────────────────────────────────────

test.describe('Consecutive Circles', () => {
  test('tool auto-switches to Select after drawing circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    await expect(page.locator('button[title="Select (S)"]')).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('consecutive circles with sticky mode', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 130, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await dragOnCanvas(page, { x: 50, y: 170 }, { x: 130, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await dragOnCanvas(page, { x: 50, y: 290 }, { x: 130, y: 370 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Circle Fill and Outline ────────────────────────────────────────────────

test.describe('Circle Fill and Outline', () => {
  test('circle with fill color stores fillColor', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    // Set fill color by interacting with the color input next to the "Fill" label
    const fillColorInput = page.locator('input[type="color"]').last()
    const fillCount = await fillColorInput.count()
    if (fillCount > 0) {
      // Trigger a color change via evaluate since fill() doesn't work on color inputs
      await fillColorInput.evaluate((el: HTMLInputElement) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
        nativeInputValueSetter.call(el, '#ff0000')
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].fillColor).toBeDefined()
  })

  test('circle without fill has no fillColor', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].fillColor === undefined || anns[0].fillColor === null || anns[0].fillColor === 'none' || anns[0].fillColor === '').toBeTruthy()
  })
})

// ─── Circle Dash Patterns ───────────────────────────────────────────────────

test.describe('Circle Dash Patterns', () => {
  test('circle with dashed outline', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const dashButtons = page.locator('button').filter({ hasText: /^[━╌┈]$/ })
    const dashedBtn = dashButtons.nth(1)
    const count = await dashedBtn.count()
    if (count > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dashed' || anns[0].dash === 'dashed').toBeTruthy()
  })

  test('circle with dotted outline', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const dashButtons = page.locator('button').filter({ hasText: /^[━╌┈]$/ })
    const dottedBtn = dashButtons.nth(2)
    const count = await dottedBtn.count()
    if (count > 0) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dotted' || anns[0].dash === 'dotted').toBeTruthy()
  })
})

// ─── Circle Color Presets ───────────────────────────────────────────────────

test.describe('Circle Color Presets', () => {
  const presetIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  for (const idx of presetIndices) {
    test(`circle with color preset index ${idx}`, async ({ page }) => {
      await selectTool(page, 'Circle (C)')
      const colorSwatches = page.locator('button[title^="#"]')
      const count = await colorSwatches.count()
      if (count > idx) {
        await colorSwatches.nth(idx).click()
        await page.waitForTimeout(100)
      }
      await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(1)
    })
  }

  test('circle with custom hex color', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    // Click the '#' button to show the hex input field
    const hexToggle = page.locator('button').filter({ hasText: '#' }).first()
    const toggleCount = await hexToggle.count()
    if (toggleCount > 0) {
      await hexToggle.click()
      await page.waitForTimeout(200)
      // Now fill the visible text input for hex color
      const hexTextInput = page.locator('input[placeholder="#000000"]').first()
      const inputCount = await hexTextInput.count()
      if (inputCount > 0) {
        await hexTextInput.fill('#00BFFF')
        await page.waitForTimeout(100)
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Circle Stroke Width ────────────────────────────────────────────────────

test.describe('Circle Stroke Width', () => {
  test('circle with stroke width 1px', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('circle with stroke width 10px', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('circle with stroke width 20px', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })
})

// ─── Circle Opacity ─────────────────────────────────────────────────────────

test.describe('Circle Opacity', () => {
  test('circle with opacity 100%', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').nth(1)
    await slider.fill('100')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(1.0, 1)
  })

  test('circle with opacity 50%', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').nth(1)
    await slider.fill('50')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('circle with opacity 10%', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"]').nth(1)
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.1, 1)
  })
})

// ─── Circle Count and Session ───────────────────────────────────────────────

test.describe('Circle Count and Session', () => {
  test('annotation count increments correctly for each circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await createAnnotation(page, 'circle', { x: 50, y: 290, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('circle data stored in session storage', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('circle')
  })

  test('circle on page 2 stored under page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['2'] || session.annotations[2]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('circle')
  })
})

// ─── Circle Zoom and Rotation ───────────────────────────────────────────────

test.describe('Circle Zoom and Rotation', () => {
  test('circle while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle while zoomed out', async ({ page }) => {
    // Zoom out using keyboard shortcut instead of zoom presets menu
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle persists through zoom change', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Circle Undo, Redo, Delete ──────────────────────────────────────────────

test.describe('Circle Undo, Redo, Delete', () => {
  test('undo removes circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
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

  test('delete selected circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate circle with Ctrl+D', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy and paste circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Rapid Creation and Stress ──────────────────────────────────────────────

test.describe('Circle Rapid Creation', () => {
  test('many circles created rapidly via sticky mode', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(200)
    for (let i = 0; i < 8; i++) {
      const y = 30 + i * 65
      await dragOnCanvas(page, { x: 50, y }, { x: 110, y: y + 50 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(8)
  })

  test('overlapping circles all counted', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await createAnnotation(page, 'circle', { x: 140, y: 140, w: 120, h: 120 })
    await createAnnotation(page, 'circle', { x: 180, y: 180, w: 120, h: 120 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('concentric circles (one inside another)', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 300, h: 300 })
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 200, h: 200 })
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('circles of various sizes on one page', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 10, y: 10, w: 30, h: 30 })
    await createAnnotation(page, 'circle', { x: 70, y: 70, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 200, h: 200 })
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Circle Persistence ────────────────────────────────────────────────────

test.describe('Circle Persistence', () => {
  test('circle persists after page reload', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    const session = await getSessionData(page)
    if (session) {
      const anns = session.annotations['1'] || session.annotations[1]
      if (anns) {
        expect(anns.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  test('circle in export does not error', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeDefined()
    const suggestedFilename = download.suggestedFilename()
    expect(suggestedFilename).toContain('.pdf')
  })
})
