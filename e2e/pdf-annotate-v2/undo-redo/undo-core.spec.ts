import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Undo/Redo Core', () => {
  test('Ctrl+Z undoes last annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes undone annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Y also redoes', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo button disabled when no history', async ({ page }) => {
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await expect(undoBtn).toBeDisabled()
  })

  test('redo button disabled when no future', async ({ page }) => {
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await expect(redoBtn).toBeDisabled()
  })

  test('undo then create new — redo branch discarded', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 30 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should not bring back old stroke
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo line creation', async ({ page }) => {
    await createAnnotation(page, 'line')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle creation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo circle creation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo arrow creation', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo delete — annotation restored', async ({ page }) => {
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

  test('undo duplicate — duplicate removed', async ({ page }) => {
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

  test('multiple sequential undos', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 280, w: 80, h: 60 })
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

  test('multiple sequential redos', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 60 })
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo with empty history — no crash', async ({ page }) => {
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo with no future — no crash', async ({ page }) => {
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('rapid undo (30 times quickly) — no crash', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 80, h: 20 })
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('rapid redo (30 times quickly) — no crash', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 80, h: 20 })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('undo via toolbar button', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
    const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]')
    await undoBtn.click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo via toolbar button', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const redoBtn = page.locator('button[title="Redo (Ctrl+Shift+Z)"]')
    await redoBtn.click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
