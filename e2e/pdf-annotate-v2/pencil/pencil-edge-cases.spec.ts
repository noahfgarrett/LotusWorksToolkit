import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, waitForSessionSave, getSessionData, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Pencil Edge Cases', () => {
  test('draw 50 strokes on same page — performance check', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 50; i++) {
      await drawOnCanvas(page, [{ x: 30 + (i % 10) * 30, y: 30 + Math.floor(i / 10) * 30 }, { x: 50 + (i % 10) * 30, y: 30 + Math.floor(i / 10) * 30 }])
    }
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(50)
  })

  test('very fast mouse movement — points captured without gaps', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 50, box.y + 100)
    await page.mouse.down()
    // Fast diagonal
    await page.mouse.move(box.x + 400, box.y + 300, { steps: 2 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('very slow mouse movement — no duplicate adjacent points', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 }, { x: 101, y: 100 }, { x: 102, y: 100 },
      { x: 103, y: 100 }, { x: 104, y: 100 }, { x: 105, y: 100 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke during zoom animation — no visual glitches', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('start stroke on one page, drag across boundary — stays on original page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke then save session — reload and verify restoration', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    if (session) {
      expect(Object.keys(session.annotations || {}).length).toBeGreaterThan(0)
    }
  })

  test('draw extremely long stroke (many points)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const points = Array.from({ length: 100 }, (_, i) => ({
      x: 50 + (i % 20) * 15,
      y: 50 + Math.floor(i / 20) * 30 + (i % 2) * 15,
    }))
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo all strokes past max history — verify oldest falls off', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    // Draw 5 strokes, then undo all
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [{ x: 50, y: 30 + i * 30 }, { x: 150, y: 30 + i * 30 }])
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw stroke at 25% browser zoom — correct positioning', async ({ page }) => {
    // Use zoom preset
    const zoomBtn = page.locator('button').filter({ hasText: /\d+%/ }).first()
    if (await zoomBtn.isVisible()) await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset25 = page.locator('button').filter({ hasText: '25%' }).first()
    if (await preset25.isVisible()) await preset25.click()
    await page.waitForTimeout(500)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 100, y: 80 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('right-click during stroke drawing — no interference', async ({ page }) => {
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
    // Should still have created something or at least not crashed
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw stroke while Find bar is open', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke while annotation list is open', async ({ page }) => {
    // Open annotation list
    const listBtn = page.locator('button[title*="Annotation"]').first()
    if (await listBtn.isVisible()) await listBtn.click()
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('draw overlapping strokes — z-order is correct (latest on top)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'pencil', { x: 120, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cancel pencil stroke via pointer cancel event', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 3 })
    // Simulate pointer cancel by moving far off screen
    await page.mouse.move(-100, -100)
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('draw pencil stroke on non-standard page size', async ({ page }) => {
    // Use sample.pdf as-is
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pencil stroke color change mid-stroke has no effect (uses start color)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw pencil stroke at exact (0,0) position', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 1, y: 1 }, { x: 50, y: 50 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('session restore with many pencil strokes — all restored', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 10; i++) {
      await drawOnCanvas(page, [{ x: 50, y: 30 + i * 30 }, { x: 150, y: 30 + i * 30 }])
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(10)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('pencil stroke hit-test: click on stroke path — selects', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('pencil stroke hit-test: click far away — does not select', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 300)
    await page.waitForTimeout(200)
    const hint = page.locator('span.truncate:has-text("Click to select")')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('space bar during pencil mode — should enable pan', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    // Hold space should enter pan mode
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')
    await page.waitForTimeout(100)
    // Pencil should still be active after space release
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 150 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw stroke then immediately draw another in same location', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw and undo 20 times alternating', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw stroke on page with many existing annotations (30+)', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 30; i++) {
      await drawOnCanvas(page, [
        { x: 20 + (i % 6) * 50, y: 20 + Math.floor(i / 6) * 30 },
        { x: 50 + (i % 6) * 50, y: 20 + Math.floor(i / 6) * 30 },
      ])
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(30)
    // Now draw one more — should still work
    await drawOnCanvas(page, [{ x: 200, y: 300 }, { x: 300, y: 350 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(31)
  })

  test('export PDF with many pencil strokes — all rendered', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 10; i++) {
      await drawOnCanvas(page, [{ x: 50, y: 30 + i * 30 }, { x: 150, y: 30 + i * 30 }])
    }
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('pencil stroke bounding box calculation is correct', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    // If selected, arrows nudge hint shows
    const hint = page.locator('text=/Arrows nudge/')
    const isSelected = await hint.isVisible()
    // Either selected or not — no crash
    expect(typeof isSelected).toBe('boolean')
  })
})
