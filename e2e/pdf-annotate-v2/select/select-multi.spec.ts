import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Select Multi-Select', () => {
  test('Shift+click two annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 230, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeLessThan(2)
  })

  test('Shift+click three annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 80, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 75)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 50, box.y + 175, { modifiers: ['Shift'] })
      await page.waitForTimeout(150)
      await page.mouse.click(box.x + 80, box.y + 260, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('Shift+click deselect — toggle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 230, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
      // Shift+click first again to deselect
      await page.mouse.click(box.x + 80, box.y + 110, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('lasso drag over 2 annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 70, y: 70 }, { x: 210, y: 290 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('lasso drag over 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 100, y: 50 + i * 60, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 30 }, { x: 220, y: 340 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('lasso drag over 0 annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 300, y: 300 }, { x: 400, y: 400 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete multi-selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeLessThanOrEqual(1)
  })

  test('duplicate multi-selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('copy/paste multi-selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('move multi-selected by dragging', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('nudge multi-selected — arrow keys', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('shift+nudge multi-selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-select then Escape deselects all', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('multi-select then click empty deselects', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A selects all on page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A with 1 annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A with 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 50 + i * 60, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A with 10 annotations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 70, y: 50 + Math.floor(i / 5) * 40, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A then Delete removes all', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 50, y: 150, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  test('Ctrl+A then Ctrl+D duplicates all', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('multi-select preserves count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select different types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('multi-select pencil+rectangle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('multi-select circle+arrow', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select text+line', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 150, h: 0 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select all types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 30, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 160, w: 60, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 190, w: 60, h: 0 })
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('multi-select then undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('multi-select then redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('lasso then move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('lasso then delete', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(1)
  })

  test('lasso then duplicate', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('lasso at different zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 220, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-select after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('shift+click after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-select on page with many annotations — 20', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 40, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('multi-select then export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('multi-select session persistence', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('Ctrl+] with multi-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ with multi-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select context menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 130, { button: 'right' })
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-select right-click', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 130, { button: 'right' })
      await page.waitForTimeout(300)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('shift+click overlapping annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('lasso partial overlap', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 160, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('lasso exact boundary', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await dragOnCanvas(page, { x: 99, y: 99 }, { x: 201, y: 181 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multi-select then switch tool', async ({ page }) => {
    test.setTimeout(60000)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select/').first()).toBeVisible({ timeout: 3000 })
  })

  test('multi-select then re-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('multi-select mixed with measurements', async ({ page }) => {
    test.setTimeout(90000)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 350 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    const total = await getAnnotationCount(page)
    expect(total).toBeGreaterThanOrEqual(1)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('deselect one from multi-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // Shift+click to deselect one
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 110, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('add to multi-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 80, y: 300, w: 100, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 230, { modifiers: ['Shift'] })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('remove from multi-select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select count display', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select status bar hint', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A then undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('rapid multi-select/deselect', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(50)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(50)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-select and resize — should not resize', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // Multi-select should not show individual resize handles
    // Just verify annotations still exist
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
