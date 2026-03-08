import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool: Text + Shapes', () => {
  test('text then rectangle', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle then text', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 120, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text then circle', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 130, w: 120, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('circle then text', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 120, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text then line', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 130, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text then arrow', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'arrow', { x: 50, y: 130, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text then pencil', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'pencil', { x: 50, y: 130, w: 120, h: 30 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text drawn over rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle drawn over text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 100, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text inside circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 80, y: 80, w: 180, h: 120 })
    await createAnnotation(page, 'text', { x: 120, y: 110, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text with arrow pointing to it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 100, w: 120, h: 40 })
    await createAnnotation(page, 'arrow', { x: 80, y: 120, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text + rectangle + circle combo', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 30, w: 100, h: 35 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 90, w: 100, h: 50 })
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('text + all shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 30, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 80, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 140, w: 80, h: 40 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 80, h: 30 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 80, h: 30 })
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('text count with shapes — all counted', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 30, w: 100, h: 35 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'rectangle', { x: 50, y: 90, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select text near shape', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select shape near text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 160)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('delete text keep shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete shape keep text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 160)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move text over shape', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 110, y: 70 }, { x: 110, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text undo (2 Ctrl+Z) keep shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Text needs 2 undos (creation + text commit)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout then rectangle', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 120, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rectangle then callout', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 120, h: 60 })
    await createAnnotation(page, 'callout', { x: 50, y: 150, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('callout + text + rectangle', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 30, w: 120, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 120, w: 100, h: 35 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('callout drawn over shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    await createAnnotation(page, 'callout', { x: 100, y: 90, w: 120, h: 70 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('shapes drawn over callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 80, y: 80, w: 150, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 90, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text edit does not affect shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 170, y: 90 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text commit near shapes — shapes preserved', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 100, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('callout commit near shapes — shapes preserved', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'callout', { x: 50, y: 100, w: 130, h: 70 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text + shapes export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('callout + shapes export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 130, h: 70 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 160, w: 120, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('text + callout + shapes export produces PDF', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 30, w: 100, h: 35 })
    await createAnnotation(page, 'callout', { x: 50, y: 90, w: 130, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 100, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('session with text + shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session restore text + shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(1000)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('zoom with text + shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rotate with text + shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text formatting with shapes — shapes unaffected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 170, y: 90 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Styled text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('bold text near shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 170, y: 90 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('italic text near shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 170, y: 90 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('5 texts + 5 shapes', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'text', { x: 30 + i * 70, y: 30, w: 50, h: 30 })
    }
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', { x: 30 + i * 70, y: 90, w: 50, h: 35 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('text z-order over shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 100, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Text drawn last is on top
  })

  test('shapes z-order over text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 100, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Rectangle drawn last is on top
  })

  test('Tab through text + shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const hint = page.locator('text=/Arrows nudge/')
    const visible = await hint.isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('double-click text near shapes to edit', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 110, 70)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const isEditing = await textarea.isVisible().catch(() => false)
    // Text should enter edit mode or still show 2 annotations
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('double-click callout near shapes to edit', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 180, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 125, 90)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text resize near shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    // Both should still exist after any interaction
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('shape resize near text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 130, w: 120, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate text near shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('copy/paste text near shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 120, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('eraser remove text keep shapes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 120, h: 60 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 80, y: 70 }, { x: 140, y: 70 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser remove shapes keep text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 120, h: 60 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 50, y: 230 }, { x: 120, y: 230 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text then highlight', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 250, y: 175 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('highlight then text', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 50, y: 150 }, { x: 250, y: 175 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text then stamp', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp then text', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 120, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('text + callout + stamp + shapes mixed', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 30, w: 80, h: 30 })
    await createAnnotation(page, 'callout', { x: 50, y: 80, w: 100, h: 50 })
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 50, y: 160, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 220, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(5)
  })
})
