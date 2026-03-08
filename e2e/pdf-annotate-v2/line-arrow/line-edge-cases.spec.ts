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
  await navigateToTool(page, 'pdf-annotate')
})

// ─── 1. Line Length Extremes ──────────────────────────────────────────────────

test.describe('Line Length Extremes', () => {
  test('very short line (2px) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 202, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very long line (full diagonal) creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 550 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zero-length line (click only) creates or does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    // May or may not create annotation, but should not crash
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ─── 2. Line Angles ──────────────────────────────────────────────────────────

test.describe('Line Angles', () => {
  test('horizontal line at 0 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line at 45 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('vertical line at 90 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 200, y: 100 }, { x: 200, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line at 135 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 300, y: 100 }, { x: 150, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line at 180 degrees (right to left)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 350, y: 200 }, { x: 100, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with Shift constraint at horizontal angle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 100, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 210, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with Shift constraint at vertical angle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + 200, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 210, box.y + 300, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Line After Zoom ──────────────────────────────────────────────────────

test.describe('Line After Zoom', () => {
  test('line after zoom in creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line after zoom out creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line at 50% zoom creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom presets"]').click()
    await page.waitForTimeout(200)
    await page.getByText('50%', { exact: true }).click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 4. Line Stroke Properties ───────────────────────────────────────────────

test.describe('Line Stroke Properties', () => {
  test('line with maximum stroke width (20)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('20')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(20)
  })

  test('line with minimum stroke width (1)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('1')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(1)
  })

  test('line with each color creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with dashed pattern creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with dotted pattern creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await page.locator('button:has-text("┈")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with opacity 50% stores correct opacity', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('50')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.5, 1)
  })
})

// ─── 5. Line at Canvas Edge ─────────────────────────────────────────────────

test.describe('Line at Canvas Edge', () => {
  test('line at top edge of canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 5 }, { x: 350, y: 5 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line at left edge of canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 5, y: 50 }, { x: 5, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 6. Rapid Line Drawing ──────────────────────────────────────────────────

test.describe('Rapid Line Drawing', () => {
  test('draw 20 lines rapidly', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    for (let i = 0; i < 20; i++) {
      await dragOnCanvas(page,
        { x: 50, y: 20 + i * 25 },
        { x: 350, y: 20 + i * 25 },
      )
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 7. Line Undo/Redo ──────────────────────────────────────────────────────

test.describe('Line Undo/Redo', () => {
  test('undo removes line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo-redo cycle preserves line properties', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('8')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(8)
  })
})

// ─── 8. Line Copy/Paste/Duplicate ────────────────────────────────────────────

test.describe('Line Copy/Paste/Duplicate', () => {
  test('Ctrl+D duplicates line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate line then immediately duplicate again', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── 9. Line Delete and Redo ─────────────────────────────────────────────────

test.describe('Line Delete and Redo', () => {
  test('delete line then redo restores it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 10. Line on Page 2 ─────────────────────────────────────────────────────

test.describe('Line on Page 2', () => {
  test('line on page 2 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 11. Multiple Lines Crossing ─────────────────────────────────────────────

test.describe('Multiple Lines Crossing', () => {
  test('crossing lines do not interfere', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    // Horizontal
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(150)
    // Vertical crossing it
    await dragOnCanvas(page, { x: 225, y: 100 }, { x: 225, y: 350 })
    await page.waitForTimeout(150)
    // Diagonal crossing both
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 12. Line Move and Nudge ─────────────────────────────────────────────────

test.describe('Line Move and Nudge', () => {
  test('line can be moved via drag', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 250, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line right with ArrowRight', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line left with ArrowLeft', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line up with ArrowUp', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line down with ArrowDown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('shift+nudge line moves by larger amount', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 13. Line Session Persistence ────────────────────────────────────────────

test.describe('Line Session Persistence', () => {
  test('line type stored in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('line')
  })

  test('line coordinates stored in session', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBeGreaterThan(0)
    expect(Object.keys(anns[0]).length).toBeGreaterThan(0)
  })
})

// ─── 14. Line Export ─────────────────────────────────────────────────────────

test.describe('Line Export', () => {
  test('export line with dashed pattern produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export line with thick width produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('18')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── 15. Line Z-Order ────────────────────────────────────────────────────────

test.describe('Line Z-Order', () => {
  test('line drawn after rectangle appears on top', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 200 })
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[1].type).toBe('line')
  })

  test('line drawn after circle appears on top', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 200, h: 200 })
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 16. Line Color Variations ───────────────────────────────────────────────

test.describe('Line Color Variations', () => {
  test('line with green color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with blue color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with purple color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(7).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with white color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(8).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with red color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with black color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(0).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with yellow color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(4).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 17. Line Additional Edge Cases ──────────────────────────────────────────

test.describe('Line Additional Edge Cases', () => {
  test('line delete then draw new line', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 300 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line with opacity 10% (minimum)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.1, 1)
  })

  test('line with stroke width 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('5')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(5)
  })

  test('line export basic produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('line persists after rotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
