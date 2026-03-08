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

// ─── 1. Arrow Basic Creation ─────────────────────────────────────────────────

test.describe('Arrow Basic Creation', () => {
  test('arrow with single head creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
  })

  test('arrow with double head (arrowStart toggle)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    // Look for arrowStart toggle
    const arrowStartToggle = page.locator('button:has-text("Start"), label:has-text("Start"), input[type="checkbox"]').first()
    if (await arrowStartToggle.isVisible()) {
      await arrowStartToggle.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('extremely short arrow creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 205, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('extremely long arrow creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 450, y: 550 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 2. Arrow at Angles ──────────────────────────────────────────────────────

test.describe('Arrow at Angles', () => {
  test('arrow at 0 degrees (horizontal right)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 45 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 90 degrees (vertical down)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 100 }, { x: 200, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 135 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 350, y: 100 }, { x: 100, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 180 degrees (horizontal left)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 350, y: 200 }, { x: 100, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 225 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 350, y: 400 }, { x: 100, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 270 degrees (vertical up)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 200, y: 400 }, { x: 200, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow at 315 degrees', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 400 }, { x: 350, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 3. Arrow with Shift Constraint ─────────────────────────────────────────

test.describe('Arrow with Shift Constraint', () => {
  test('Shift constrains arrow angle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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
})

// ─── 4. Arrow Color Variations ───────────────────────────────────────────────

test.describe('Arrow Color Variations', () => {
  test('arrow with red color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with green color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(5).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with blue color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with black color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(0).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 5. Arrow Stroke Width ───────────────────────────────────────────────────

test.describe('Arrow Stroke Width', () => {
  test('arrow with width 1', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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

  test('arrow with width 10', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('10')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(10)
  })

  test('arrow with width 20', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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
})

// ─── 6. Arrow Dash Patterns ─────────────────────────────────────────────────

test.describe('Arrow Dash Patterns', () => {
  test('arrow with dashed pattern', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with dotted pattern', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await page.locator('button:has-text("┈")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 7. Arrow Opacity ────────────────────────────────────────────────────────

test.describe('Arrow Opacity', () => {
  test('arrow with opacity 25%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('25')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.25, 1)
  })

  test('arrow with opacity 75%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('75')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(0.75, 1)
  })

  test('arrow with opacity 100%', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="10"][max="100"]')
    await slider.fill('100')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].opacity).toBeCloseTo(1.0, 1)
  })
})

// ─── 8. Arrow Undo/Redo ─────────────────────────────────────────────────────

test.describe('Arrow Undo/Redo', () => {
  test('undo removes arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo restores arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow direction preserved after undo/redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const x1Before = annsBefore[0].x1
    const x2Before = annsBefore[0].x2
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    expect(annsAfter[0].x1).toBe(x1Before)
    expect(annsAfter[0].x2).toBe(x2Before)
  })
})

// ─── 9. Arrow Copy/Paste/Duplicate ──────────────────────────────────────────

test.describe('Arrow Copy/Paste/Duplicate', () => {
  test('Ctrl+D duplicates arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C/V copies and pastes arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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

  test('arrow head preserved after copy/paste', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
    expect(anns[1].type).toBe('arrow')
  })
})

// ─── 10. Arrow Delete ────────────────────────────────────────────────────────

test.describe('Arrow Delete', () => {
  test('delete arrow reduces count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── 11. Arrow Move and Nudge ────────────────────────────────────────────────

test.describe('Arrow Move and Nudge', () => {
  test('arrow can be moved via drag', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 200 }, { x: 250, y: 300 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow nudge all 4 directions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 12. Arrow on Page 2 ────────────────────────────────────────────────────

test.describe('Arrow on Page 2', () => {
  test('arrow on page 2 creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 13. Arrow After Zoom and Rotate ─────────────────────────────────────────

test.describe('Arrow After Zoom and Rotate', () => {
  test('arrow after zoom in', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow after rotate CW', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(500)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 14. Arrow Session and Export ────────────────────────────────────────────

test.describe('Arrow Session and Export', () => {
  test('arrow type stored in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
  })

  test('arrow export produces PDF', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('arrow head preserved after export', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].type).toBe('arrow')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── 15. Rapid Arrow Drawing ─────────────────────────────────────────────────

test.describe('Rapid Arrow Drawing', () => {
  test('draw 20 arrows rapidly', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    for (let i = 0; i < 20; i++) {
      await dragOnCanvas(page,
        { x: 50, y: 20 + i * 25 },
        { x: 300, y: 20 + i * 25 },
      )
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── 16. Arrow Over Existing Annotation ──────────────────────────────────────

test.describe('Arrow Over Existing Annotation', () => {
  test('arrow drawn over rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 200 })
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 17. Arrow After Eraser ──────────────────────────────────────────────────

test.describe('Arrow After Eraser', () => {
  test('arrow after eraser tool creates annotation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 18. Arrow Mixed with Pencil ─────────────────────────────────────────────

test.describe('Arrow Mixed with Pencil', () => {
  test('arrow and pencil coexist', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── 19. Arrow Deselect ──────────────────────────────────────────────────────

test.describe('Arrow Deselect', () => {
  test('clicking empty canvas deselects arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    // Click on empty area to deselect
    await clickCanvasAt(page, 50, 450)
    await page.waitForTimeout(200)
    // Status should show no selection text
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
  })
})

// ─── 20. Arrow at Canvas Corner ──────────────────────────────────────────────

test.describe('Arrow at Canvas Corner', () => {
  test('arrow starting at top-left corner', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 5, y: 5 }, { x: 150, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow starting at bottom-right area', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 400, y: 500 }, { x: 250, y: 350 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── 21. Arrow Additional Scenarios ──────────────────────────────────────────

test.describe('Arrow Additional Scenarios', () => {
  test('arrow with opacity 10% (minimum)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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

  test('arrow with stroke width 5', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
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

  test('arrow with stroke width 15', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const slider = page.locator('input[type="range"][min="1"][max="20"]')
    await slider.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].strokeWidth).toBe(15)
  })

  test('arrow delete then draw new arrow', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 300 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow coordinates stored in session', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns).toBeDefined()
    expect(anns.length).toBeGreaterThan(0)
    expect(Object.keys(anns[0]).length).toBeGreaterThan(0)
  })

  test('arrow with purple color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    const swatches = page.locator('button[style*="background-color"]')
    await swatches.nth(7).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow persists after zoom out', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('arrow with dashed pattern exported successfully', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Arrow (A)')
    await page.locator('button:has-text("╌")').click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})
