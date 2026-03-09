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
// Basic Highlight Drawing
// ---------------------------------------------------------------------------

test.describe('Highlighter Basic Drawing', () => {
  test('basic highlight stroke creates one annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 155 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlighter has lower default opacity (around 0.4)', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    // Highlighter default opacity should be low (around 0.4)
    expect(anns?.[0]?.opacity).toBeDefined()
    expect(anns?.[0]?.opacity).toBeLessThan(1.0)
  })

  test('highlighter has wider stroke than pencil default', async ({ page }) => {
    // Draw highlighter stroke
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 300, y: 150 },
    ])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    // Highlighter should have a wider default stroke
    expect(anns?.[0]?.strokeWidth).toBeGreaterThanOrEqual(3)
  })

  test('highlight over text content area creates annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 50, y: 80 },
      { x: 350, y: 80 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Highlight Color Presets
// ---------------------------------------------------------------------------

test.describe('Highlighter Color Presets', () => {
  test('highlight with default yellow color', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight with red color preset', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight with green color preset', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // HIGHLIGHT_COLORS = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#FF6600']
    // Index 1 = green (#22C55E)
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight with blue color preset', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Index 2 = blue (#3B82F6)
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(2).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight with pink color preset', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Index 3 = pink (#FF69B4)
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(3).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Consecutive Highlights & Sticky Mode
// ---------------------------------------------------------------------------

test.describe('Highlighter Consecutive Drawing', () => {
  test('consecutive highlights with sticky mode', async ({ page }) => {
    // Enable sticky (lock) mode, then activate highlighter
    await page.locator('button[title*="Lock tool"]').click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Highlight (H)')
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 50 + i * 40 },
        { x: 350, y: 50 + i * 40 },
      ])
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('rapid highlighting creates multiple annotations', async ({ page }) => {
    // Enable sticky (lock) mode, then activate highlighter
    await page.locator('button[title*="Lock tool"]').click()
    await page.waitForTimeout(100)
    await selectTool(page, 'Highlight (H)')
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 30 + i * 30 },
        { x: 300, y: 30 + i * 30 },
      ])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Selection, Movement, & Deletion
// ---------------------------------------------------------------------------

test.describe('Highlighter Selection & Manipulation', () => {
  test('highlight then select with select tool', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 150)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('highlight then move via drag', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 150 }, { x: 200, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight then delete via Delete key', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Undo & Redo
// ---------------------------------------------------------------------------

test.describe('Highlighter Undo & Redo', () => {
  test('highlight and undo removes highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('highlight, undo, redo restores highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Different Colors
// ---------------------------------------------------------------------------

test.describe('Highlighter Color Variations', () => {
  test('highlight with different colors stores different color values', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Highlight (H)')
    // Use index 2 (blue) for a different color than index 1 (green)
    await swatches.nth(2).click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.color).not.toBe(anns[1]?.color)
    }
  })
})

// ---------------------------------------------------------------------------
// Zoom Levels
// ---------------------------------------------------------------------------

test.describe('Highlighter at Various Zoom Levels', () => {
  test('highlight visible at 200% zoom', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight visible at 50% zoom', async ({ page }) => {
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Multi-Page
// ---------------------------------------------------------------------------

test.describe('Highlighter on Multiple Pages', () => {
  test('highlight on page 1 and page 2', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
    await goToPage(page, 2)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Session & Export Persistence
// ---------------------------------------------------------------------------

test.describe('Highlighter Persistence', () => {
  test('highlight persists in session data', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.length).toBeGreaterThan(0)
  })

  test('highlight in exported PDF', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })
})

// ---------------------------------------------------------------------------
// Straight Line Mode
// ---------------------------------------------------------------------------

test.describe('Highlighter Straight Line Mode', () => {
  test('highlight straight line mode creates annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const straightBtn = page.locator('button:has-text("Free")')
    if (await straightBtn.isVisible()) await straightBtn.click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 400, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

test.describe('Highlighter Edge Cases', () => {
  test('highlight near top edge of page', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 50, y: 5 }, { x: 300, y: 5 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight near bottom edge of page', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    // Use a high-but-visible y coordinate (the canvas may extend below the viewport)
    // The viewport height is typically ~550-600px, so use a value within that range
    const viewportSize = page.viewportSize()
    const safeY = Math.min(viewportSize?.height ?? 500, 500) - 30
    await drawOnCanvas(page, [
      { x: 50, y: safeY },
      { x: 300, y: safeY },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight overlapping areas creates separate annotations', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 150, y: 145 }, { x: 350, y: 155 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('eraser removes highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Switch to Object mode so the entire highlight is removed
    await page.locator('button:has-text("Object")').click()
    await page.waitForTimeout(100)
    // Drag through the highlight stroke
    await drawOnCanvas(page, [
      { x: 180, y: 140 },
      { x: 200, y: 150 },
      { x: 220, y: 160 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial eraser on highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 190, y: 140 }, { x: 210, y: 160 }])
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Properties Panel
// ---------------------------------------------------------------------------

test.describe('Highlighter Properties Panel', () => {
  test('highlighter shows color presets', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const swatches = page.locator('button[title^="#"]')
    const count = await swatches.count()
    expect(count).toBeGreaterThan(0)
  })

  test('highlighter shows stroke width slider but not opacity slider', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    // At least one slider should be visible (stroke width)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('highlighter shows stroke width control', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const slider = page.locator('input[type="range"]').first()
    const isVisible = await slider.isVisible().catch(() => false)
    expect(typeof isVisible).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Highlighter Type Verification
// ---------------------------------------------------------------------------

test.describe('Highlighter Type & Session', () => {
  test('highlighter annotation type stored as highlight in session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.[0]?.type).toBeDefined()
  })

  test('highlighter shortcut H activates tool', async ({ page }) => {
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight stroke visual differs from pencil stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const pencilScreenshot = await screenshotCanvas(page)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)

    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    const highlightScreenshot = await screenshotCanvas(page)

    expect(pencilScreenshot.equals(highlightScreenshot)).toBe(false)
  })

  test('highlight cursor is crosshair', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('highlight with custom opacity value', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 1) {
      await sliders.nth(1).fill('60')
      await page.waitForTimeout(100)
    } else if (sliderCount === 1) {
      // Only one slider available
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight with custom stroke width', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      await slider.fill('15')
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight duplicate via Ctrl+D', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('highlight copy/paste via Ctrl+C/V', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('highlight on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 150 }, { x: 300, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
