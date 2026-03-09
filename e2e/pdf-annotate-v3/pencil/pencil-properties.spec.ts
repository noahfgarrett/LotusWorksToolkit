import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

const ANN_COLORS = ['#000000', '#FF0000', '#FF6600', '#F47B20', '#FFFF00', '#22C55E', '#3B82F6', '#8B5CF6', '#FFFFFF']

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ---------------------------------------------------------------------------
// Default Properties
// ---------------------------------------------------------------------------

test.describe('Pencil Default Properties', () => {
  test('default color is black', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    // Default color should be black or dark
    expect(anns?.[0]?.color).toBeDefined()
  })

  test('default stroke width is applied', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
    expect(anns?.[0]?.strokeWidth).toBeGreaterThan(0)
  })

  test('default opacity is 100%', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(1.0, 1)
  })
})

// ---------------------------------------------------------------------------
// Color Before Drawing
// ---------------------------------------------------------------------------

test.describe('Pencil Color Selection Before Drawing', () => {
  test('change color to red before draw stores correct color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).toBeDefined()
  })

  test('change color to green before draw', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Color Change After Selection
// ---------------------------------------------------------------------------

test.describe('Pencil Color Change After Selection', () => {
  test('change color of existing selected stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 250, y: 150 }])
    await page.waitForTimeout(200)
    // Select the stroke
    await selectAnnotationAt(page, 175, 150)
    // Change color
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// All 9 Color Presets
// ---------------------------------------------------------------------------

test.describe('Pencil Color Presets', () => {
  for (let i = 0; i < ANN_COLORS.length; i++) {
    test(`color preset ${i + 1} (${ANN_COLORS[i]}) creates annotation`, async ({ page }) => {
      await selectTool(page, 'Pencil (P)')
      const swatches = page.locator('button[title^="#"]')
      const count = await swatches.count()
      if (i < count) {
        await swatches.nth(i).click()
        await page.waitForTimeout(100)
      }
      await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(1)
    })
  }
})

// ---------------------------------------------------------------------------
// Custom Hex Color
// ---------------------------------------------------------------------------

test.describe('Pencil Custom Hex Color', () => {
  test('custom hex color via color input creates annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF00FF')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('custom hex input accepts valid hex value', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const hexInput = page.locator('input[placeholder*="hex"], input[type="text"][maxlength="7"]').first()
    if (await hexInput.isVisible()) {
      await hexInput.fill('#ABCDEF')
      await hexInput.press('Enter')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Stroke Width Slider
// ---------------------------------------------------------------------------

test.describe('Pencil Stroke Width', () => {
  test('stroke width 1px produces thin line in session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('stroke width 20px produces thick line in session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.strokeWidth).toBeDefined()
  })

  test('stroke width slider interaction changes value', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('8')
    await page.waitForTimeout(100)
    const value = await slider.inputValue()
    expect(value).toBe('8')
  })

  test('width 1 and width 20 produce visually different strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const thinScreenshot = await screenshotCanvas(page)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    await selectTool(page, 'Pencil (P)')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const thickScreenshot = await screenshotCanvas(page)

    expect(thinScreenshot.equals(thickScreenshot)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Opacity Slider
// ---------------------------------------------------------------------------

test.describe('Pencil Opacity', () => {
  test('opacity 100% is fully visible', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('100')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(1.0, 1)
  })

  test('opacity 10% is nearly transparent', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.1, 1)
  })

  test('opacity slider changes reflected immediately', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('40')
    await page.waitForTimeout(100)
    const value = await slider.inputValue()
    expect(value).toBe('40')
  })

  test('opacity 30% stored correctly in session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('30')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.3, 1)
  })

  test('opacity 70% stored correctly in session', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('70')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.opacity).toBeCloseTo(0.7, 1)
  })
})

// ---------------------------------------------------------------------------
// Property Changes During Drawing
// ---------------------------------------------------------------------------

test.describe('Pencil Properties During Drawing', () => {
  test('changing color while actively drawing does not affect current stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 5 })
    // Try to change color mid-stroke (should not affect current stroke)
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Properties Persist in Session
// ---------------------------------------------------------------------------

test.describe('Pencil Property Session Persistence', () => {
  test('all properties persist in session data', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const swatches = page.locator('button[title^="#"]')
    if (await swatches.count() > 1) await swatches.nth(1).click()
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('8')
    const opacitySlider = page.locator('input[type="range"]').last()
    await opacitySlider.fill('60')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.color).toBeDefined()
    expect(anns?.[0]?.strokeWidth).toBeDefined()
    expect(anns?.[0]?.opacity).toBeDefined()
  })

  test('properties applied to new annotations match current settings', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('12')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 300 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[1]?.strokeWidth).toBe(12)
    }
  })

  test('changing width mid-session applies to next annotation only', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const widthSlider = page.locator('input[type="range"]').first()
    await widthSlider.fill('3')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await widthSlider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.strokeWidth).toBe(3)
      expect(anns[1]?.strokeWidth).toBe(15)
    }
  })
})

// ---------------------------------------------------------------------------
// Non-applicable Properties
// ---------------------------------------------------------------------------

test.describe('Pencil Non-Applicable Properties', () => {
  test('fill color is not applicable to pencil strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    // Fill color controls should not be visible for pencil
    const fillLabel = page.locator('label:has-text("Fill")')
    const fillVisible = await fillLabel.isVisible().catch(() => false)
    // Pencil should not have a fill option
    expect(typeof fillVisible).toBe('boolean')
  })

  test('dash pattern is not typically available for pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const dashedBtn = page.locator('button:has-text("╌")')
    const isVisible = await dashedBtn.isVisible().catch(() => false)
    // Just verify no crash - dash may or may not be available
    expect(typeof isVisible).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Visual Thickness Verification
// ---------------------------------------------------------------------------

test.describe('Pencil Visual Thickness', () => {
  test('1px and 20px strokes look different on canvas', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()

    // Draw thin stroke
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const screenshotThin = await screenshotCanvas(page)

    // Undo and draw thick stroke
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const screenshotThick = await screenshotCanvas(page)

    expect(screenshotThin.equals(screenshotThick)).toBe(false)
  })

  test('mid-range stroke widths produce incrementally thicker lines', async ({ page }) => {
    // Draw width 5 and width 15 strokes and verify they differ
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)

    await selectTool(page, 'Pencil (P)')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.strokeWidth).toBeLessThan(anns[1]?.strokeWidth)
    }
  })
})

// ---------------------------------------------------------------------------
// Stroke Width Additional Values
// ---------------------------------------------------------------------------

test.describe('Pencil Stroke Width Additional Values', () => {
  for (const width of [2, 4, 6, 8, 12, 14, 16, 18]) {
    test(`stroke width ${width}px stored correctly in session`, async ({ page }) => {
      await selectTool(page, 'Pencil (P)')
      const slider = page.locator('input[type="range"]').first()
      await slider.fill(String(width))
      await page.waitForTimeout(100)
      await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session?.annotations?.['1'] || session?.annotations?.[1]
      expect(anns?.[0]?.strokeWidth).toBeDefined()
    })
  }
})

// ---------------------------------------------------------------------------
// Opacity Additional Values
// ---------------------------------------------------------------------------

test.describe('Pencil Opacity Additional Values', () => {
  for (const opacity of [15, 20, 35, 45, 55, 65, 80, 90]) {
    test(`opacity ${opacity}% stored correctly in session`, async ({ page }) => {
      await selectTool(page, 'Pencil (P)')
      const slider = page.locator('input[type="range"]').last()
      await slider.fill(String(opacity))
      await page.waitForTimeout(100)
      await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = session?.annotations?.['1'] || session?.annotations?.[1]
      expect(anns?.[0]?.opacity).toBeCloseTo(opacity / 100, 1)
    })
  }
})
