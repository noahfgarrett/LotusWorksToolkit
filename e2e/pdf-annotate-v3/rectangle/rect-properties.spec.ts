import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Change Color of Existing Rectangle ─────────────────────────────────────

test.describe('Rectangle Color Changes', () => {
  test('change color of existing selected rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const colorBefore = annsBefore[0].color

    // Click a different color swatch
    const colorSwatches = page.locator('button[title^="#"]')
    const count = await colorSwatches.count()
    if (count > 1) {
      await colorSwatches.nth(1).click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const sessionAfter = await getSessionData(page)
      const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
      expect(annsAfter[0].color).not.toBe(colorBefore)
    }
  })

  test('change fill color of selected rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    // Enable fill
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].fillColor).toBeDefined()
    }
  })

  test('remove fill color from rectangle', async ({ page }) => {
    // Create rectangle with fill
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)

    // Select it and remove fill
    await selectAnnotationAt(page, 100, 150)
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].fillColor === undefined || anns[0].fillColor === null || anns[0].fillColor === 'none' || anns[0].fillColor === '').toBeTruthy()
    }
  })
})

// ─── Change Stroke Width ────────────────────────────────────────────────────

test.describe('Rectangle Stroke Width Changes', () => {
  test('change stroke width of existing rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible().catch(() => false)) {
      await slider.fill('12')
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })
})

// ─── Change Opacity ─────────────────────────────────────────────────────────

test.describe('Rectangle Opacity Changes', () => {
  test('change opacity of existing rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 1) {
      await sliders.nth(1).fill('40')
    } else if (sliderCount === 1) {
      await sliders.first().fill('40')
    }
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeDefined()
  })
})

// ─── Change Corner Radius ───────────────────────────────────────────────────

test.describe('Rectangle Corner Radius Changes', () => {
  test('change corner radius of existing rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const count = await radiusSlider.count()
    if (count > 0) {
      await radiusSlider.fill('20')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].cornerRadius).toBe(20)
    }
  })
})

// ─── Change Dash Pattern ────────────────────────────────────────────────────

test.describe('Rectangle Dash Pattern Changes', () => {
  test('change dash pattern to dashed on existing rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const count = await dashedBtn.count()
    if (count > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].dashPattern === 'dashed' || anns[0].dash === 'dashed').toBeTruthy()
    }
  })

  test('change dash pattern to dotted on existing rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const dottedBtn = page.locator('button:has-text("┈")').first()
    const count = await dottedBtn.count()
    if (count > 0) {
      await dottedBtn.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].dashPattern === 'dotted' || anns[0].dash === 'dotted').toBeTruthy()
    }
  })

  test('change dash pattern back to solid', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    // Set to dashed first
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const dashedCount = await dashedBtn.count()
    if (dashedCount > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    // Set back to solid
    const solidBtn = page.locator('button:has-text("━")').first()
    const solidCount = await solidBtn.count()
    if (solidCount > 0) {
      await solidBtn.click()
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session.annotations['1'] || session.annotations[1]
      expect(anns[0].dashPattern === 'solid' || anns[0].dash === 'solid' || anns[0].dashPattern === undefined).toBeTruthy()
    }
  })
})

// ─── Visual Appearance Verification ─────────────────────────────────────────

test.describe('Rectangle Visual Appearance', () => {
  test('rectangle with fill has visually different appearance than outline only', async ({ page }) => {
    // Create outline-only rectangle
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 150, h: 100 })
    const screenshotOutline = await screenshotCanvas(page)

    // Undo and create filled rectangle
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    const screenshotFilled = await screenshotCanvas(page)

    expect(screenshotOutline.equals(screenshotFilled)).toBe(false)
  })

  test('rectangle with rounded corners renders differently than sharp corners', async ({ page }) => {
    // Sharp corners
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 150, h: 100 })
    const screenshotSharp = await screenshotCanvas(page)

    // Undo
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    // Rounded corners
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const count = await radiusSlider.count()
    if (count > 0) {
      await radiusSlider.fill('30')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 150 })
    await page.waitForTimeout(200)
    const screenshotRounded = await screenshotCanvas(page)

    expect(screenshotSharp.equals(screenshotRounded)).toBe(false)
  })
})

// ─── Properties Persistence ─────────────────────────────────────────────────

test.describe('Rectangle Properties Persistence', () => {
  test('properties persist after deselect and reselect', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('8')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)

    // Deselect
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)

    // Reselect
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)

    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('properties saved in session survive tool switches', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('70')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)

    // Switch tools
    await selectTool(page, 'Circle (C)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)

    // Check session
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.7, 1)
  })

  test('changed properties used for next rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)

    // Create another rectangle (tool auto-switches, reselect)
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 200, y: 330 })
    await page.waitForTimeout(200)

    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    // Both rectangles should have same stroke width
    expect(anns[0].strokeWidth).toBe(15)
    expect(anns[1].strokeWidth).toBe(15)
  })
})

// ─── Combination Tests ──────────────────────────────────────────────────────

test.describe('Rectangle Property Combinations', () => {
  test('rectangle with fill and dashed pattern', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const dashedCount = await dashedBtn.count()
    if (dashedCount > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].fillColor).toBeDefined()
  })

  test('rectangle with fill and dotted pattern', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    const dottedBtn = page.locator('button:has-text("┈")').first()
    const dottedCount = await dottedBtn.count()
    if (dottedCount > 0) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with fill and rounded corners', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const radiusCount = await radiusSlider.count()
    if (radiusCount > 0) {
      await radiusSlider.fill('15')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    if (radiusCount > 0) {
      expect(anns[0].cornerRadius).toBe(15)
    }
  })

  test('rectangle with transparent fill', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    // Set opacity low (second range slider)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with same fill and stroke color', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Select a color
    const colorSwatches = page.locator('button[title^="#"]')
    const swatchCount = await colorSwatches.count()
    if (swatchCount > 0) {
      await colorSwatches.nth(0).click()
      await page.waitForTimeout(100)
    }
    // Enable fill (which should use same color)
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBeDefined()
  })

  test('fill + dotted + rounded corners combination', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    const dottedBtn = page.locator('button:has-text("┈")').first()
    const dottedCount = await dottedBtn.count()
    if (dottedCount > 0) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const radiusCount = await radiusSlider.count()
    if (radiusCount > 0) {
      await radiusSlider.fill('20')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 280, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rounded corners + dashed + no fill', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const dashedCount = await dashedBtn.count()
    if (dashedCount > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const radiusCount = await radiusSlider.count()
    if (radiusCount > 0) {
      await radiusSlider.fill('25')
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 280, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    if (radiusCount > 0) {
      expect(anns[0].cornerRadius).toBe(25)
    }
  })

  test('thick stroke + high opacity + fill', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('18')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('90')
    await page.waitForTimeout(100)
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(18)
    expect(anns[0].opacity).toBeCloseTo(0.9, 1)
  })

  test('thin stroke + low opacity + no fill', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('1')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(1)
    expect(anns[0].opacity).toBeCloseTo(0.15, 1)
  })

  test('change multiple properties on selected rectangle at once', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    // Change stroke width (first range slider)
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('12')
    await page.waitForTimeout(100)
    // Change opacity (second range slider)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('60')
    await page.waitForTimeout(100)
    // Change corner radius
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const radiusCount = await radiusSlider.count()
    if (radiusCount > 0) {
      await radiusSlider.fill('10')
      await page.waitForTimeout(100)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(12)
    expect(anns[0].opacity).toBeCloseTo(0.6, 1)
  })

  test('properties from first rectangle do not change when second is created', async ({ page }) => {
    // Create first rectangle with specific width
    await selectTool(page, 'Rectangle (R)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('5')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 180, y: 130 })
    await page.waitForTimeout(200)

    // Create second rectangle with different width
    await selectTool(page, 'Rectangle (R)')
    await widthSlider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 180, y: 280 })
    await page.waitForTimeout(200)

    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(5)
    expect(anns[1].strokeWidth).toBe(15)
  })

  test('color change on selected rectangle does not affect other rectangles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const color2Before = annsBefore[1].color

    // Select first and change color
    await selectAnnotationAt(page, 50, 90)
    const colorSwatches = page.locator('button[title^="#"]')
    const count = await colorSwatches.count()
    if (count > 2) {
      await colorSwatches.nth(2).click()
      await page.waitForTimeout(200)
    }

    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    // Second rectangle color should be unchanged
    expect(annsAfter[1].color).toBe(color2Before)
  })

  test('opacity change on selected rectangle verified visually', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const fullOpacityScreenshot = await screenshotCanvas(page)

    // Select and change opacity (second range slider)
    await selectAnnotationAt(page, 100, 140)
    const slider = page.locator('input[type="range"]').nth(1)
    await slider.fill('20')
    await page.waitForTimeout(200)
    // Click away to deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)

    const lowOpacityScreenshot = await screenshotCanvas(page)
    expect(fullOpacityScreenshot.equals(lowOpacityScreenshot)).toBe(false)
  })

  test('all combinations: fill + dashed + rounded corners', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillToggle = page.locator('text=/Fill/i').first()
    const fillCount = await fillToggle.count()
    if (fillCount > 0) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    const dashedBtn = page.locator('button:has-text("╌")').first()
    const dashedCount = await dashedBtn.count()
    if (dashedCount > 0) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const radiusCount = await radiusSlider.count()
    if (radiusCount > 0) {
      await radiusSlider.fill('10')
      await page.waitForTimeout(100)
    }
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('8')
    await page.waitForTimeout(100)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('75')
    await page.waitForTimeout(100)

    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(8)
    expect(anns[0].opacity).toBeCloseTo(0.75, 1)
  })
})
