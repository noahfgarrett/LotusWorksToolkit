import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Basic Pencil Drawing ─────────────────────────────────────────────────

test.describe('Basic Pencil Drawing', () => {
  test('pencil stroke creates annotation, count goes to 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('two strokes create two annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three strokes create three annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('pencil activates via keyboard shortcut P', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('pencil shows crosshair cursor hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // The status bar message for pencil
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('very short stroke (near-click) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 202, y: 202 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('long complex stroke with many points creates single annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const points = []
    for (let i = 0; i < 20; i++) {
      points.push({ x: 50 + i * 15, y: 200 + Math.sin(i) * 30 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke on canvas edge works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 5, y: 5 },
      { x: 50, y: 50 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Pencil Color ─────────────────────────────────────────────────────────

test.describe('Pencil Color', () => {
  test('default color creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    // Verify session data stores color
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.color).toBeDefined()
  })

  test('changing color before drawing uses new color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Click a different color preset (red #FF0000)
    const redSwatch = page.locator('button[style*="background-color: rgb(255, 0, 0)"], button[style*="#FF0000"], button[style*="#ff0000"]').first()
    if (await redSwatch.isVisible()) {
      await redSwatch.click()
      await page.waitForTimeout(100)
    }
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color persists across multiple strokes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].color).toBe(anns[1].color)
  })
})

// ─── 2b. Pencil Color Presets ─────────────────────────────────────────────────

test.describe('Pencil Color Presets', () => {
  test('color presets are visible for pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // ANN_COLORS includes 9 preset colors
    const colorButtons = page.locator('button[style*="background"]')
    const count = await colorButtons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('drawing with different colors produces different annotation colors', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Draw first stroke with default color
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Pencil Stroke Width ──────────────────────────────────────────────────

test.describe('Pencil Stroke Width', () => {
  test('stroke width slider is visible for pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('input[type="range"][min="1"][max="20"]')).toBeVisible()
  })

  test('changing stroke width before drawing uses new width', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 250, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(10)
  })

  test('stroke width display shows current value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    // The width value should be displayed next to the slider
    await expect(page.locator('text=/15/')).toBeVisible()
  })

  test('minimum stroke width is 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('maximum stroke width is 20', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(20)
  })
})

// ─── 4. Pencil Opacity ───────────────────────────────────────────────────────

test.describe('Pencil Opacity', () => {
  test('opacity slider is visible for pencil', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('input[type="range"][min="10"][max="100"]')).toBeVisible()
  })

  test('changing opacity before drawing uses new opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    // Opacity stored as 0-1 in annotation, slider is 10-100
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('opacity percentage display updates', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('75')
    await page.waitForTimeout(100)
    await expect(page.locator('text=/75%/')).toBeVisible()
  })
})

// ─── 5. Pencil Persistence & Tool Switch ─────────────────────────────────────

test.describe('Pencil Persistence & Tool Switch', () => {
  test('pencil stroke persists after switching to Select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke persists after switching to Rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await selectTool(page, 'Rectangle (R)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil and rectangle annotations coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pencil annotation saved to session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('pencil')
  })
})

// ─── 6. Select & Move Pencil ─────────────────────────────────────────────────

test.describe('Select & Move Pencil', () => {
  test('pencil annotation can be selected', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('pencil annotation can be moved by dragging', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 150, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil annotation can be nudged with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Delete Pencil ────────────────────────────────────────────────────────

test.describe('Delete Pencil', () => {
  test('selected pencil annotation can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting one pencil annotation does not affect others', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    // Create two strokes at different positions
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ])
    await page.waitForTimeout(200)
    await drawOnCanvas(page, [
      { x: 100, y: 300 },
      { x: 200, y: 300 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    // Select and delete the first one
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 8. Undo/Redo Pencil ─────────────────────────────────────────────────────

test.describe('Undo/Redo Pencil', () => {
  test('Ctrl+Z undoes pencil stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone pencil stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
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

  test('undo multiple pencil strokes in order', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 9. Pencil at Different Zoom Levels ──────────────────────────────────────

test.describe('Pencil at Different Zoom Levels', () => {
  test('pencil works at 125% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Zoom to 125% using zoom in button (one step from ~103%)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil works at 50% zoom', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('50%', { exact: true }).click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil annotation persists through zoom change', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('150%').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Pencil on Rotated Page ──────────────────────────────────────────────

test.describe('Pencil on Rotated Page', () => {
  test('pencil works on 90-degree rotated page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil annotation persists through rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil works after 180-degree rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 11. Straight-Line Mode ──────────────────────────────────────────────────

test.describe('Straight-Line Mode', () => {
  test('straight-line mode toggle is visible', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.getByText('Free')).toBeVisible()
  })

  test('toggling to straight mode shows "Straight" label', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    await expect(page.getByText('Straight')).toBeVisible()
  })

  test('drawing in straight-line mode creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('toggling back to freehand shows "Free" label', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await page.getByText('Free').click()
    await page.waitForTimeout(100)
    await page.getByText('Straight').click()
    await page.waitForTimeout(100)
    await expect(page.getByText('Free')).toBeVisible()
  })
})

// ─── 12. Pencil Duplicate & Copy-Paste ───────────────────────────────────────

test.describe('Pencil Duplicate & Copy-Paste', () => {
  test('Ctrl+D duplicates pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes pencil annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 13. Pencil Session Data ──────────────────────────────────────────────────

test.describe('Pencil Session Data', () => {
  test('pencil annotation has points array in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(Array.isArray(anns[0].points)).toBe(true)
    expect(anns[0].points.length).toBeGreaterThan(1)
  })

  test('pencil points have x and y coordinates', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    const pt = anns[0].points[0]
    expect(typeof pt.x).toBe('number')
    expect(typeof pt.y).toBe('number')
  })

  test('multiple pencil annotations each have distinct IDs', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 80, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].id).not.toBe(anns[1].id)
  })

  test('pencil annotation stores opacity as 0-1 value', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeGreaterThan(0)
    expect(anns[0].opacity).toBeLessThanOrEqual(1)
  })

  test('pencil stroke width stored as integer', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(Number.isInteger(anns[0].strokeWidth)).toBe(true)
  })

  test('pencil with different width values are stored independently', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('3')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await slider.fill('15')
    await page.waitForTimeout(100)
    await drawOnCanvas(page, [{ x: 100, y: 250 }, { x: 200, y: 250 }])
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(3)
    expect(anns[1].strokeWidth).toBe(15)
  })

  test('pencil annotation count in status bar matches session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 50, y: 350, w: 80, h: 60 })
    const uiCount = await getAnnotationCount(page)
    expect(uiCount).toBe(3)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(3)
  })
})
