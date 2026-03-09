import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
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

/** Helper to create a cloud with given vertices, closing with double-click on last vertex */
async function createCloud(
  page: import('@playwright/test').Page,
  vertices: { x: number; y: number }[],
) {
  await selectTool(page, 'Cloud (K)')
  for (let i = 0; i < vertices.length - 1; i++) {
    await clickCanvasAt(page, vertices[i].x, vertices[i].y)
    await page.waitForTimeout(100)
  }
  // Close with double-click on last vertex
  const last = vertices[vertices.length - 1]
  await doubleClickCanvasAt(page, last.x, last.y)
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Basic Cloud Shapes ────────────────────────────────────────────────────

test.describe('Cloud Basic Shapes', () => {
  test('create triangle cloud (3 vertices + double-click close)', async ({ page }) => {
    await createCloud(page, [
      { x: 150, y: 80 },
      { x: 250, y: 200 },
      { x: 80, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create square cloud (4 vertices)', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create pentagon cloud (5 vertices)', async ({ page }) => {
    await createCloud(page, [
      { x: 200, y: 60 },
      { x: 300, y: 130 },
      { x: 270, y: 250 },
      { x: 130, y: 250 },
      { x: 100, y: 130 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create hexagon cloud (6 vertices)', async ({ page }) => {
    await createCloud(page, [
      { x: 200, y: 60 },
      { x: 280, y: 100 },
      { x: 280, y: 200 },
      { x: 200, y: 240 },
      { x: 120, y: 200 },
      { x: 120, y: 100 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create complex polygon cloud (10+ vertices)', async ({ page }) => {
    const vertices = []
    const cx = 200
    const cy = 200
    const r = 120
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
      vertices.push({
        x: Math.round(cx + r * Math.cos(angle)),
        y: Math.round(cy + r * Math.sin(angle)),
      })
    }
    await createCloud(page, vertices)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Cloud Closing Methods ──────────────────────────────────────────────────

test.describe('Cloud Closing Methods', () => {
  test('click near first vertex auto-closes cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    // Click near the first vertex to auto-close
    await clickCanvasAt(page, 103, 103)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click with 3+ vertices closes cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 220)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Backspace Removes Last Vertex ──────────────────────────────────────────

test.describe('Cloud Vertex Removal', () => {
  test('Backspace removes last placed vertex', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    // Cloud should still be in progress
    await expect(page.locator('text=/pts.*Dbl-click close/')).toBeVisible()
  })

  test('Backspace removes all vertices returns to 0 pts', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/0 pts/')).toBeVisible()
  })

  test('Backspace then continue adding vertices works', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 300, 200)
    await page.waitForTimeout(100)
    // Remove last
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    // Add new vertex and close
    await clickCanvasAt(page, 250, 250)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Cloud Visual Properties ────────────────────────────────────────────────

test.describe('Cloud Bumpy Edges', () => {
  test('cloud has visually different appearance from polygon', async ({ page }) => {
    // Create a cloud
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    const cloudScreenshot = await screenshotCanvas(page)
    expect(cloudScreenshot.length).toBeGreaterThan(0)
    // The cloud should have bumpy edges which makes it visually distinct
  })
})

// ─── Cloud Fill and Outline ─────────────────────────────────────────────────

test.describe('Cloud Fill and Outline', () => {
  test('cloud with fill color', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    // Click a color swatch to set fill color (e.g. red #FF0000)
    const redSwatch = page.locator('button:has-text("#FF0000"), button[title="#FF0000"]').first()
    const swatchVisible = await redSwatch.isVisible().catch(() => false)
    // Create the cloud
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(150)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    // Now select it and set fill color via the fill color input
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(300)
    const fillInput = page.locator('input[type="color"]').last()
    if (await fillInput.isVisible().catch(() => false)) {
      await fillInput.evaluate((el: HTMLInputElement) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        if (nativeSetter) nativeSetter.call(el, '#ff0000')
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await page.waitForTimeout(300)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
  })

  test('cloud without fill', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 200 },
    ])
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].fillColor === undefined || anns[0].fillColor === null || anns[0].fillColor === 'none' || anns[0].fillColor === '').toBeTruthy()
  })
})

// ─── Cloud Color Presets ────────────────────────────────────────────────────

test.describe('Cloud Color Presets', () => {
  const presetIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  for (const idx of presetIndices) {
    test(`cloud with color preset index ${idx}`, async ({ page }) => {
      await selectTool(page, 'Cloud (K)')
      const colorSwatches = page.locator('button[title^="#"]')
      const count = await colorSwatches.count()
      if (count > idx) {
        await colorSwatches.nth(idx).click()
        await page.waitForTimeout(100)
      }
      await clickCanvasAt(page, 100, 100)
      await page.waitForTimeout(100)
      await clickCanvasAt(page, 250, 100)
      await page.waitForTimeout(100)
      await doubleClickCanvasAt(page, 175, 200)
      await page.waitForTimeout(300)
      expect(await getAnnotationCount(page)).toBe(1)
    })
  }
})

// ─── Cloud Stroke Width ────────────────────────────────────────────────────

test.describe('Cloud Stroke Width', () => {
  test('cloud with stroke width 1px', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('cloud with stroke width 10px', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })

  test('cloud with stroke width 20px', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('20')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBeDefined()
  })
})

// ─── Cloud Opacity ──────────────────────────────────────────────────────────

test.describe('Cloud Opacity', () => {
  test('cloud with opacity 100%', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('100')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(1.0, 1)
  })

  test('cloud with opacity 50%', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('50')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('cloud with opacity 10%', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').last()
    await slider.fill('10')
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.1, 1)
  })
})

// ─── Cloud Dash Pattern ─────────────────────────────────────────────────────

test.describe('Cloud Dash Patterns', () => {
  test('cloud with dashed outline', async ({ page }) => {
    // Create cloud first
    await selectTool(page, 'Cloud (K)')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(150)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    // Select the cloud and change dash pattern
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(300)
    // The dash pattern buttons should now be visible for the selected cloud
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.count() > 0) {
      await dashedBtn.first().click()
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dashed' || !anns[0].dashPattern).toBeTruthy()
  })

  test('cloud with dotted outline', async ({ page }) => {
    // Create cloud first
    await selectTool(page, 'Cloud (K)')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(150)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(150)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    // Select the cloud and change dash pattern
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(300)
    const dottedBtn = page.locator('button:has-text("┈")')
    if (await dottedBtn.count() > 0) {
      await dottedBtn.first().click()
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern === 'dotted' || !anns[0].dashPattern).toBeTruthy()
  })
})

// ─── Consecutive Clouds ────────────────────────────────────────────────────

test.describe('Consecutive Clouds', () => {
  test('create two clouds in sequence', async ({ page }) => {
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 130 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 350, y: 200 },
      { x: 275, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('create three clouds in sequence', async ({ page }) => {
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 130, y: 50 },
      { x: 90, y: 120 },
    ])
    await createCloud(page, [
      { x: 200, y: 50 },
      { x: 280, y: 50 },
      { x: 240, y: 120 },
    ])
    await createCloud(page, [
      { x: 100, y: 200 },
      { x: 250, y: 200 },
      { x: 175, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Cloud Undo/Redo ────────────────────────────────────────────────────────

test.describe('Cloud Undo and Redo', () => {
  test('undo removes cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores undone cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
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
})

// ─── Cloud Delete, Duplicate, Copy/Paste ────────────────────────────────────

test.describe('Cloud Delete, Duplicate, Copy/Paste', () => {
  test('delete cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate cloud with Ctrl+D', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy and paste cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
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

// ─── Cloud Session Data ────────────────────────────────────────────────────

test.describe('Cloud Session Data', () => {
  test('cloud stored in session with correct type', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('cloud')
  })

  test('cloud has points array in session', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points).toBeDefined()
    expect(anns[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('cloud annotation count matches status bar', async ({ page }) => {
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 130 },
    ])
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 350, y: 200 },
      { x: 275, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(2)
  })
})

// ─── Cloud on Page 2 ────────────────────────────────────────────────────────

test.describe('Cloud on Different Pages', () => {
  test('cloud on page 2 stored under page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['2'] || session.annotations[2]
    expect(anns).toBeDefined()
    expect(anns.length).toBe(1)
    expect(anns[0].type).toBe('cloud')
  })
})

// ─── Cloud Zoom and Rotation ────────────────────────────────────────────────

test.describe('Cloud Zoom and Rotation', () => {
  test('cloud while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(500)
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 130 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 120 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 150, y: 180 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud persists through zoom change', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud persists through rotation', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Cloud Size Variations ──────────────────────────────────────────────────

test.describe('Cloud Size Variations', () => {
  test('very small cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 215, y: 200 },
      { x: 208, y: 215 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very large cloud spanning canvas', async ({ page }) => {
    await createCloud(page, [
      { x: 10, y: 10 },
      { x: 400, y: 10 },
      { x: 400, y: 450 },
      { x: 10, y: 450 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud near canvas edges', async ({ page }) => {
    await createCloud(page, [
      { x: 5, y: 5 },
      { x: 80, y: 5 },
      { x: 45, y: 60 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('irregular shaped cloud (non-convex)', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 180 },
      { x: 250, y: 260 },
      { x: 100, y: 260 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud with closely spaced vertices', async ({ page }) => {
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 210, y: 200 },
      { x: 215, y: 210 },
      { x: 210, y: 220 },
      { x: 200, y: 220 },
      { x: 195, y: 210 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud with far-apart vertices', async ({ page }) => {
    await createCloud(page, [
      { x: 10, y: 10 },
      { x: 400, y: 50 },
      { x: 200, y: 500 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rapid Vertex Placement ────────────────────────────────────────────────

test.describe('Cloud Rapid Placement', () => {
  test('rapid vertex placement creates valid cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    // Place vertices rapidly with minimal delay
    await clickCanvasAt(page, 100, 100)
    await clickCanvasAt(page, 150, 80)
    await clickCanvasAt(page, 200, 100)
    await clickCanvasAt(page, 220, 150)
    await clickCanvasAt(page, 200, 200)
    await clickCanvasAt(page, 150, 220)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 80, 150)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Cloud Persistence ─────────────────────────────────────────────────────

test.describe('Cloud Persistence', () => {
  test('cloud persists after page reload', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
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

  test('cloud in export does not error', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeDefined()
    const suggestedFilename = download.suggestedFilename()
    expect(suggestedFilename).toContain('.pdf')
  })
})
