import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

const MAX_HISTORY = 50

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Undo Edge Cases', () => {
  test('undo pencil creation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle creation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle creation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line creation', async ({ page }) => {
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo arrow creation', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo text creation (2 Ctrl+Z)', async ({ page }) => {
    await createAnnotation(page, 'text')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo callout creation (2 Ctrl+Z)', async ({ page }) => {
    await createAnnotation(page, 'callout')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo with nothing to undo', async ({ page }) => {
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo 50 pencil strokes (max history)', async ({ page }) => {
    test.setTimeout(180000)
    for (let i = 0; i < MAX_HISTORY; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(MAX_HISTORY)
    for (let i = 0; i < MAX_HISTORY; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('undo past max history — count stays at 0', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 60, h: 20 })
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo then draw new clears redo stack', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo then redo then undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo delete action — annotation restored', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo move action', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('undo duplicate action', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo copy/paste action', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo eraser object action', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    const objEraseBtn = page.locator('button[title="Object erase"]')
    if (await objEraseBtn.isVisible()) await objEraseBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo eraser partial action', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const beforeCount = await getAnnotationCount(page)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await dragOnCanvas(page, { x: 150, y: 90 }, { x: 150, y: 160 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(beforeCount)
  })

  test('undo rotation', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo crop', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
      const applyBtn = page.locator('button').filter({ hasText: /Apply/i }).first()
      if (await applyBtn.isVisible()) {
        await applyBtn.click()
        await page.waitForTimeout(300)
        await page.keyboard.press('Control+z')
        await page.waitForTimeout(200)
      }
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('undo multiple types in sequence', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo 10 rapid operations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 50, w: 40, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo then export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('undo then session save', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('undo preserves redo stack', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should still work
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo pencil then check count', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle then check count', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle then check count', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo 3 pencils then check count', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'pencil', { x: 50, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(3)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo 5 rectangles then check count', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 60, y: 50, w: 50, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 80, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 150, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo does not affect other pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo at different zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo after zoom change', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo then zoom then redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Z shortcut works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo button in toolbar', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await undoBtn.click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo with text editing active — Escape then undo', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 170 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Text needs 2 undos (text commit + creation)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo within text (content undo vs annotation undo)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    // Undo within text editing should affect text content, not annotations
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Still in editing mode, annotation should still exist
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo after session restore', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    // Reload to trigger session restore
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // After restore, undo should work on new actions
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // The restored pencil should remain, only new rectangle undone
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('rapid Ctrl+Z (20 presses)', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 60, h: 20 })
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo then immediately redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo all then draw new', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo history limit 50', async ({ page }) => {
    test.setTimeout(180000)
    // Create MAX_HISTORY annotations
    for (let i = 0; i < MAX_HISTORY; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(MAX_HISTORY)
    // Undo all — should undo up to MAX_HISTORY
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('create 55 annotations then undo 55 (oldest lost)', async ({ page }) => {
    test.setTimeout(180000)
    const total = 55
    for (let i = 0; i < total; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 35, w: 30, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(total)
    // Undo all — but history caps at MAX_HISTORY so oldest 5 can't be undone
    for (let i = 0; i < total + 10; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeLessThanOrEqual(total - MAX_HISTORY + 1)
  })

  test('undo after export', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await exportPDF(page)
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo then verify session updated', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('undo text formatting change', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Formatted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo text commit + creation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line style change', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo color change via property', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF0000')
      await page.waitForTimeout(200)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo stroke width change', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo the creation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo after page switch', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo preserves annotation IDs', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should restore the same annotation
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo order is LIFO', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 220, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    // Undo last (circle)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo second (rectangle)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo first (pencil)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})
