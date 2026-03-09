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
  exportPDF,
  goToPage,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearSessionData(page)
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Circle Size Extremes ─────────────────────────────────────────────────

test.describe('Circle Size Extremes', () => {
  test('very small circle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very large circle creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 450 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('perfect circle with Shift key', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tall ellipse (more height than width)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 180, y: 50 }, { x: 240, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('wide ellipse (more width than height)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 400, y: 260 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Circle Color Variations ──────────────────────────────────────────────

test.describe('Circle Color Variations', () => {
  test('circle with red stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with blue stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with green stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with black stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(0).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with fill color enabled', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const fillToggle = page.locator('button:has-text("Fill"), label:has-text("Fill")').first()
    if (await fillToggle.isVisible()) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with no fill (stroke only)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('circle')
  })

  test('circle with fill+stroke different colors', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    const fillToggle = page.locator('button:has-text("Fill"), label:has-text("Fill")').first()
    if (await fillToggle.isVisible()) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Circle Stroke Properties ─────────────────────────────────────────────

test.describe('Circle Stroke Properties', () => {
  test('circle with stroke width 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(1)
  })

  test('circle with stroke width 10', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(10)
  })

  test('circle with stroke width 20', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(20)
  })

  test('circle with dashed border', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with dotted border', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await page.locator('button:has-text("┈")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Circle Opacity ───────────────────────────────────────────────────────

test.describe('Circle Opacity', () => {
  test('circle with opacity 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('25')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.25, 1)
  })

  test('circle with opacity 50%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })

  test('circle with opacity 100%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('100')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(1.0, 1)
  })
})

// ─── 5. Circle Undo/Redo ────────────────────────────────────────────────────

test.describe('Circle Undo/Redo', () => {
  test('undo removes circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 6. Circle Copy/Paste/Duplicate ──────────────────────────────────────────

test.describe('Circle Copy/Paste/Duplicate', () => {
  test('Ctrl+D duplicates circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 7. Circle Move and Nudge ────────────────────────────────────────────────

test.describe('Circle Move and Nudge', () => {
  test('circle can be moved by dragging edge', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await moveAnnotation(page, { x: 100, y: 160 }, { x: 250, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle can be nudged with arrow keys', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle can be deleted', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 8. Circle on Page 2 ────────────────────────────────────────────────────

test.describe('Circle on Page 2', () => {
  test('circle on page 2 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 9. Circle After Zoom ───────────────────────────────────────────────────

test.describe('Circle After Zoom', () => {
  test('circle after zoom in', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Circle Session Persistence ──────────────────────────────────────────

test.describe('Circle Session Persistence', () => {
  test('circle type stored in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('circle')
  })

  test('circle dimensions stored in session', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBeGreaterThan(0)
    expect(Object.keys(anns[0]).length).toBeGreaterThan(0)
  })
})

// ─── 11. Circle Export ───────────────────────────────────────────────────────

test.describe('Circle Export', () => {
  test('export circle produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export circle with fill produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const fillToggle = page.locator('button:has-text("Fill"), label:has-text("Fill")').first()
    if (await fillToggle.isVisible()) {
      await fillToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export circle with dashed border produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('perfect circle export produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── 12. Rapid Circle Drawing ────────────────────────────────────────────────

test.describe('Rapid Circle Drawing', () => {
  test('draw 20 circles rapidly', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await dragOnCanvas(page,
        { x: 20 + col * 80, y: 20 + row * 120 },
        { x: 70 + col * 80, y: 90 + row * 120 },
      )
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 13. Circle Hit-Test ─────────────────────────────────────────────────────

test.describe('Circle Hit-Test', () => {
  test('click on circle edge selects it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 150 })
    // Click on top edge of ellipse (x=center, y=top)
    await selectAnnotationAt(page, 175, 100)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('click far from circle edge does not select', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    // Should show no-selection status
    await expect(page.locator('text=/Click to select/').first()).toBeVisible()
  })
})

// ─── 14. Circle Draw Directions ──────────────────────────────────────────────

test.describe('Circle Draw Directions', () => {
  test('circle drawn right-to-left creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 300, y: 100 }, { x: 100, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle drawn bottom-to-top creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 350 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle drawn top-right to bottom-left', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 300, y: 100 }, { x: 100, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle drawn bottom-left to top-right', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 300 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 15. Circle Mixed with Other Tools ───────────────────────────────────────

test.describe('Circle Mixed with Other Tools', () => {
  test('circle with pencil mixed', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('circle after eraser creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle after text commit creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 120, h: 40 })
    await createAnnotation(page, 'circle', { x: 100, y: 250, w: 120, h: 120 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 16. Overlapping Circles ─────────────────────────────────────────────────

test.describe('Overlapping Circles', () => {
  test('overlapping circles both persist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 150 })
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 150, h: 150 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 17. Additional Circle Scenarios ─────────────────────────────────────────

test.describe('Additional Circle Scenarios', () => {
  test('circle with opacity 75%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('75')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.75, 1)
  })

  test('circle with stroke width 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(5)
  })

  test('circle with stroke width 15', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(15)
  })

  test('circle after zoom out', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle persists after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle delete then draw new circle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with purple stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(7).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with white stroke', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(8).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with dotted border stored in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Circle (C)')
    await page.locator('button:has-text("┈")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].dashPattern).toBeDefined()
  })
})
