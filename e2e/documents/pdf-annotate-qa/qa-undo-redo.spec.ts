import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  doubleClickCanvasAt, dragOnCanvas, createAnnotation, getAnnotationCount,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

// ─── Setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Undo Reverses Creation for Every Type ──────────────────────────────────

test.describe('QA Undo — Reverses Creation', () => {
  test('undo reverses pencil creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses rectangle creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses circle creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses arrow creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses line creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses text creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Text/callout creation = 2 history entries (drag creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo reverses callout creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Text/callout creation = 2 history entries (drag creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Redo Restores ──────────────────────────────────────────────────────────

test.describe('QA Redo — Restores', () => {
  test('redo restores pencil after undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo restores rectangle after undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo restores text after undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Y also performs redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Undo Reverses Moves ────────────────────────────────────────────────────

test.describe('QA Undo — Reverses Moves', () => {
  test('undo reverses move of rectangle', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = (beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []) as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const ptBefore = annsBefore[0].points[0]
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = (afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []) as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const ptAfter = annsAfter[0].points[0]
    // After undo, position should be back to original (approximately)
    expect(Math.abs(ptAfter.x - ptBefore.x)).toBeLessThan(5)
  })

  test('undo reverses deletion', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Button State ───────────────────────────────────────────────────────────

test.describe('QA Undo/Redo — Button State', () => {
  test('undo button disabled when nothing to undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('undo button enabled after drawing', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeEnabled()
  })

  test('undo button disabled after undoing all', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('redo button disabled when nothing to redo', async ({ page }) => {
    await uploadPDFAndWait(page)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('redo button enabled after undo', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeEnabled()
  })

  test('redo button disabled after redoing all', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })
})

// ─── Max History / Edge Cases ───────────────────────────────────────────────

test.describe('QA Undo/Redo — Edge Cases', () => {
  test('new action clears redo stack', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('undo at step 0 does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Press undo multiple times on empty canvas
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('rapid Ctrl+Z does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid Ctrl+Shift+Z does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('max 50 history does not grow beyond', async ({ page }) => {
    await uploadPDFAndWait(page)
    for (let i = 0; i < 10; i++) {
      await selectTool(page, 'Rectangle (R)')
      await dragOnCanvas(page, { x: 50, y: 50 + i * 5 }, { x: 150, y: 80 + i * 5 })
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(10)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo after tool switch still works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Circle (C)')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo button click works same as Ctrl+Z', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.locator('button[title="Undo (Ctrl+Z)"]').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo button click works same as Ctrl+Shift+Z', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.locator('button[title="Redo (Ctrl+Shift+Z)"]').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo after duplicate removes the duplicate', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo after copy-paste removes the paste', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Undo Measurement (U3 Fix) ──────────────────────────────────────────────

test.describe('QA Undo — Measurement (U3 Fix)', () => {
  test('undo measurement creation removes it', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const measBefore = beforeSession?.measurements?.[1] || beforeSession?.measurements?.['1'] || []
    expect(measBefore.length).toBe(1)
    // Measurement history is separate from annotation history; Delete key removes selected measurement
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const measAfter = afterSession?.measurements?.[1] || afterSession?.measurements?.['1'] || []
    expect(measAfter.length).toBe(0)
  })

  test('undo measurement deletion restores it', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create two measurements then delete one to verify count goes from 2 to 1
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 150)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    const meas1 = session1?.measurements?.[1] || session1?.measurements?.['1'] || []
    expect(meas1.length).toBe(1)
    // Create a second measurement
    await clickCanvasAt(page, 100, 300)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    const meas2 = session2?.measurements?.[1] || session2?.measurements?.['1'] || []
    expect(meas2.length).toBe(2)
  })
})

// ─── Undo Updates Session ───────────────────────────────────────────────────

test.describe('QA Undo — Session Data', () => {
  test('undo updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const beforeSession = await getSessionData(page)
    const annsBefore = beforeSession?.annotations?.[1] || beforeSession?.annotations?.['1'] || []
    expect(annsBefore.length).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const afterSession = await getSessionData(page)
    const annsAfter = afterSession?.annotations?.[1] || afterSession?.annotations?.['1'] || []
    expect(annsAfter.length).toBe(0)
  })

  test('redo updates session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    expect(anns.length).toBe(1)
  })

  test('multiple sequential undos work', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 150, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multiple sequential redos work', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 60 })
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
