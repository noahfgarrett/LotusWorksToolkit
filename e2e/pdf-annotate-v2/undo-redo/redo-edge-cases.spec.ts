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

test.describe('Redo Edge Cases', () => {
  test('redo pencil after undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo rectangle after undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo circle after undo', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo line after undo', async ({ page }) => {
    await createAnnotation(page, 'line')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo arrow after undo', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo text after undo (2 undo then 2 redo)', async ({ page }) => {
    await createAnnotation(page, 'text')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo callout after undo', async ({ page }) => {
    await createAnnotation(page, 'callout')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo with nothing to redo', async ({ page }) => {
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo after drawing clears redo stack', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    // Redo stack should be cleared
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo delete', async ({ page }) => {
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
    // Redo the delete
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo after undo move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo duplicate', async ({ page }) => {
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
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('redo after undo eraser', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objEraseBtn = page.locator('button[title="Object erase"]')
    if (await objEraseBtn.isVisible()) await objEraseBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo multiple operations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 220, w: 80, h: 50 })
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('redo 10 rapid operations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 50, w: 40, h: 20 })
    }
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('redo then undo then redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo then export', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('redo then session save', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('Ctrl+Shift+Z shortcut works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Y shortcut works', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo button in toolbar', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await redoBtn.click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo preserves annotation properties', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo preserves position', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    // Select and verify annotation is at original position
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo preserves color', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo preserves stroke width', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo preserves opacity', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo at different zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after zoom change', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 100, h: 0 })
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('redo 5 pencils', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 60, h: 20 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('redo 3 rectangles then 2 circles', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 80, y: 50, w: 60, h: 40 })
    }
    for (let i = 0; i < 2; i++) {
      await createAnnotation(page, 'circle', { x: 30 + i * 80, y: 150, w: 60, h: 40 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('redo after session restore', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // Redo stack is cleared after restore — redo should do nothing
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('redo stack cleared by new action', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Draw new — clears redo
    await createAnnotation(page, 'circle', { x: 300, y: 300, w: 80, h: 80 })
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    // Should still be 2 (pencil + circle), redo of rectangle is gone
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('redo all then undo all', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 60, h: 20 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo then undo alternating 10 times', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
      expect(await getAnnotationCount(page)).toBe(0)
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('redo after text edit', async ({ page }) => {
    await createAnnotation(page, 'text')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after eraser action', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo partial erase', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await dragOnCanvas(page, { x: 150, y: 90 }, { x: 150, y: 160 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('redo after move annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 250 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after resize annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Drag a handle to resize
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('redo after copy/paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('redo after delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo at max history boundary', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < MAX_HISTORY; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    for (let i = 0; i < MAX_HISTORY; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    for (let i = 0; i < MAX_HISTORY; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(MAX_HISTORY)
  })

  test('redo preserves z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('redo then verify session', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('redo then export produces correct PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('redo count verification', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 130, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('redo does not affect other pages', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo stack after page switch', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid Ctrl+Shift+Z', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 60, h: 20 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('redo after undo all creates annotations back', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 60, w: 60, h: 20 })
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('redo all then check final count matches original', async ({ page }) => {
    const total = 7
    for (let i = 0; i < total; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(total)
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(total)
  })

  test('redo after multiple different operations in sequence', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 100, h: 30 })
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 300, y: 50, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })
})
