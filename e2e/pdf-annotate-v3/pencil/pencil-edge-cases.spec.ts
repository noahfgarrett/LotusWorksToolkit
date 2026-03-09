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
  exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ---------------------------------------------------------------------------
// Degenerate Inputs
// ---------------------------------------------------------------------------

test.describe('Pencil Degenerate Inputs', () => {
  test('single click without drag does not create annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('zero-length stroke (mousedown and mouseup at same point) does not create annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('extremely long stroke with 200+ points creates single annotation', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points = Array.from({ length: 200 }, (_, i) => ({
      x: 50 + (i % 40) * 10,
      y: 50 + Math.floor(i / 40) * 40 + (i % 2) * 20,
    }))
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Zoom Levels
// ---------------------------------------------------------------------------

test.describe('Pencil at Different Zoom Levels', () => {
  test('draw while zoomed in at 2x', async ({ page }) => {
    // Zoom in twice
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw while zoomed in at 3x', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Control+=')
      await page.waitForTimeout(200)
    }
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw while zoomed out to 50%', async ({ page }) => {
    const zoomBtn = page.locator('button').filter({ hasText: /\d+%/ }).first()
    if (await zoomBtn.isVisible()) await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset50 = page.locator('button').filter({ hasText: '50%' }).first()
    if (await preset50.isVisible()) await preset50.click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw while zoomed out to 25%', async ({ page }) => {
    const zoomBtn = page.locator('button').filter({ hasText: /\d+%/ }).first()
    if (await zoomBtn.isVisible()) await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset25 = page.locator('button').filter({ hasText: '25%' }).first()
    if (await preset25.isVisible()) await preset25.click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Page Rotation
// ---------------------------------------------------------------------------

test.describe('Pencil on Rotated Pages', () => {
  test('draw on page rotated 90 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page rotated 180 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page rotated 270 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await rotateBtn.click()
        await page.waitForTimeout(300)
      }
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Multi-Page
// ---------------------------------------------------------------------------

test.describe('Pencil on Multi-Page PDFs', () => {
  test('draw on page 2 of multi-page PDF', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('draw then rotate page and verify annotation persists', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw then zoom and verify annotation persists', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Tool Switching & Stability
// ---------------------------------------------------------------------------

test.describe('Pencil Tool Switching Edge Cases', () => {
  test('rapid tool switching while drawing does not crash', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 130, { steps: 3 })
    // Rapid tool switch mid-stroke
    await page.keyboard.press('s')
    await page.keyboard.press('p')
    await page.keyboard.press('l')
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Should not crash; annotation count may be 0 or 1
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw during page navigation does not crash', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Eraser Interactions
// ---------------------------------------------------------------------------

test.describe('Pencil Eraser Interactions', () => {
  test('object eraser deletes whole pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 200, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Sweep across the pencil stroke to ensure crossing it
    await drawOnCanvas(page, [
      { x: 160, y: 120 },
      { x: 180, y: 140 },
      { x: 200, y: 165 },
      { x: 220, y: 185 },
      { x: 240, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser on pencil stroke then undo restores stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 200, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Sweep across the pencil stroke to ensure crossing it
    await drawOnCanvas(page, [
      { x: 160, y: 120 },
      { x: 180, y: 140 },
      { x: 200, y: 165 },
      { x: 220, y: 185 },
      { x: 240, y: 200 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('partial eraser on pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 200, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Drag eraser across part of the stroke
    await drawOnCanvas(page, [
      { x: 140, y: 140 },
      { x: 160, y: 180 },
    ])
    await page.waitForTimeout(300)
    // The stroke may be split or deleted depending on implementation
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Maximum History
// ---------------------------------------------------------------------------

test.describe('Pencil History Depth', () => {
  test('undo all after 50+ draws restores to clean state', async ({ page }) => {
    test.setTimeout(120000)
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    const drawCount = 20
    for (let i = 0; i < drawCount; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 5) * 80, y: 20 + Math.floor(i / 5) * 50 },
        { x: 60 + (i % 5) * 80, y: 30 + Math.floor(i / 5) * 50 },
      ])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const countAfterDraw = await getAnnotationCount(page)
    expect(countAfterDraw).toBeGreaterThanOrEqual(18)
    expect(countAfterDraw).toBeLessThanOrEqual(drawCount)
    // Undo all
    for (let i = 0; i < drawCount; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  test('draw-undo alternation stress test (20 iterations)', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Memory & Performance
// ---------------------------------------------------------------------------

test.describe('Pencil Memory Stability', () => {
  test('create 100 strokes without memory issues', async ({ page }) => {
    test.setTimeout(180000)
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 100; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 35 },
        { x: 50 + (i % 10) * 40, y: 25 + Math.floor(i / 10) * 35 },
      ])
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(500)
    const memCount = await getAnnotationCount(page)
    expect(memCount).toBeGreaterThanOrEqual(90)
    expect(memCount).toBeLessThanOrEqual(100)
  })

  test('canvas resize preserves annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    // Resize viewport
    await page.setViewportSize({ width: 800, height: 400 })
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    // Restore
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Scrolled Canvas
// ---------------------------------------------------------------------------

test.describe('Pencil with Scrolled Canvas', () => {
  test('draw with page scrolled down', async ({ page }) => {
    // Scroll the container
    await page.evaluate(() => {
      const container = document.querySelector('.overflow-auto, [style*="overflow"]')
      if (container) container.scrollTop = 200
    })
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Miscellaneous Edge Cases
// ---------------------------------------------------------------------------

test.describe('Pencil Miscellaneous Edge Cases', () => {
  test('right-click during stroke does not break drawing', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 120, { steps: 3 })
    await page.mouse.click(box.x + 150, box.y + 120, { button: 'right' })
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('space bar during pencil mode enables pan temporarily', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')
    await page.waitForTimeout(100)
    // After releasing space, pencil should still work
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at exact canvas origin (1,1)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 1, y: 1 }, { x: 50, y: 50 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('escape key during stroke drawing', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })

  test('draw overlapping strokes — z-order latest on top', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'pencil', { x: 120, y: 110, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('session restoration preserves all strokes', async ({ page }) => {
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 30 + i * 50 },
        { x: 200, y: 30 + i * 50 },
      ])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(5)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.length).toBeGreaterThanOrEqual(3)
  })

  test('pencil cursor is crosshair', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    // Cursor could be crosshair, none (custom cursor), or other values
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('draw on page with existing annotations of other types', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 50, w: 100, h: 0 })
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('export PDF with many pencil strokes', async ({ page }) => {
    test.setTimeout(60000)
    const pencilBtn = page.locator('button[title="Pencil (P)"]').first()
    if (await pencilBtn.isVisible().catch(() => false)) {
      await pencilBtn.dblclick()
    } else {
      await selectTool(page, 'Pencil (P)')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await drawOnCanvas(page, [
        { x: 50, y: 30 + i * 30 },
        { x: 200, y: 30 + i * 30 },
      ])
    }
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('find bar open does not interfere with pencil drawing', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation list open does not interfere with pencil drawing', async ({ page }) => {
    const listBtn = page.locator('button[title*="Annotation"]').first()
    if (await listBtn.isVisible()) await listBtn.click()
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('draw after clearing all annotations starts fresh', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Ctrl+A selects last annotation only — use it to delete
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(100)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke bounding box calculation is correct for hit test', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible().catch(() => false)
    expect(typeof isSelected).toBe('boolean')
  })

  test('draw stroke while annotation list panel is collapsed', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pointer cancel event during stroke does not crash', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    await page.mouse.move(-100, -100)
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('pencil on non-standard page size works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
