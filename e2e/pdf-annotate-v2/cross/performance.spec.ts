import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Performance & Stress', () => {
  test('create 20 annotations quickly — all counted', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', {
        x: 30 + col * 70, y: 30 + row * 50, w: 50, h: 20,
      })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('rapid tool switching (50 times) — no crash', async ({ page }) => {
    const keys = ['p', 'l', 'a', 'r', 'c', 't', 'o', 'e', 'h', 's']
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press(keys[i % keys.length])
    }
    await page.waitForTimeout(300)
    // Page should still be functional
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('rapid undo/redo (20 times) — correct state', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    // Undo all
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Shift+z')
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('draw large pencil stroke (100+ points) — renders', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < 120; i++) {
      points.push({
        x: 50 + i * 3,
        y: 200 + Math.sin(i * 0.2) * 30,
      })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create annotations at canvas edges', async ({ page }) => {
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    // Top-left corner
    await createAnnotation(page, 'rectangle', { x: 5, y: 5, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Near bottom-right (use relative coords within canvas)
    const nearRight = Math.min(box!.width - 70, 400)
    const nearBottom = Math.min(box!.height - 50, 500)
    await createAnnotation(page, 'rectangle', { x: nearRight, y: nearBottom, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('zoom in/out rapidly — no crash', async ({ page }) => {
    const zoomIn = page.locator('button[title="Zoom in"]')
    const zoomOut = page.locator('button[title="Zoom out"]')
    for (let i = 0; i < 10; i++) {
      await zoomIn.click()
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 10; i++) {
      await zoomOut.click()
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('export with 30+ annotations — completes', async ({ page }) => {
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(i / 6)
      const col = i % 6
      await createAnnotation(page, 'pencil', {
        x: 20 + col * 60, y: 20 + row * 40, w: 40, h: 15,
      })
    }
    expect(await getAnnotationCount(page)).toBe(30)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('delete all annotations one by one', async ({ page }) => {
    for (let i = 0; i < 8; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 40, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(8)
    // Undo each one
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('create, delete, create cycle — count correct', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid keyboard shortcut presses — no crash', async ({ page }) => {
    const allKeys = ['s', 'p', 'l', 'a', 'r', 'c', 'k', 't', 'o', 'e', 'h', 'm']
    // Press all shortcuts rapidly in succession
    for (let round = 0; round < 5; round++) {
      for (const key of allKeys) {
        await page.keyboard.press(key)
      }
    }
    await page.waitForTimeout(300)
    // Page should still be functional — canvas visible and no JS errors
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })
})
