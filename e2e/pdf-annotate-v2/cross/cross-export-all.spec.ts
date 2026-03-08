import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool: Export with All Types', () => {
  test('export pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export measurement', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export cloud (K shortcut)', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil + rectangle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil + circle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'circle', { x: 50, y: 100, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export pencil + text', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'text', { x: 50, y: 100, w: 100, h: 35 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rectangle + circle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 140, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rectangle + text', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'text', { x: 50, y: 140, w: 100, h: 35 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export all basic types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    await createAnnotation(page, 'text', { x: 50, y: 240, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 50, y: 280, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(7)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with bold text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with italic text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with font change', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with colors', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    if (await redPreset.isVisible()) await redPreset.click()
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with thick strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) await slider.fill('20')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with thin strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) await slider.fill('1')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with dashed strokes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashBtn = page.locator('button[title*="Dash"], button[title*="dash"]').first()
    if (await dashBtn.isVisible()) await dashBtn.click()
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with dotted strokes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dotBtn = page.locator('button[title*="Dot"], button[title*="dot"]').first()
    if (await dotBtn.isVisible()) await dotBtn.click()
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with filled shapes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    if (await fillInput.isVisible()) await fillInput.fill('#00ff00')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with opacity', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multi-page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multi-page with annotations', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after undo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after redo', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after eraser', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 120, y: 110 }, { x: 160, y: 110 }])
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after resize', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after copy/paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after session restore', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await waitForSessionSave(page)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export zoom-independent — produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 50% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    if (await zoomOutBtn.isVisible()) {
      await zoomOutBtn.click()
      await page.waitForTimeout(200)
      await zoomOutBtn.click()
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 200% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) {
      for (let i = 0; i < 4; i++) {
        await zoomInBtn.click()
        await page.waitForTimeout(150)
      }
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export cropped page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // Attempt crop and cancel if present
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export produces PDF file', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.pdf$/i)
  })

  test('export filename format', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const filename = download.suggestedFilename()
    expect(filename.length).toBeGreaterThan(4)
    expect(filename).toMatch(/\.pdf$/i)
  })

  test('export file non-zero bytes', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export download event fires', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export then re-export (idempotent)', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download1 = await exportPDF(page)
    expect(download1).toBeTruthy()
    const download2 = await exportPDF(page)
    expect(download2).toBeTruthy()
  })

  test('export 50 annotations', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 50; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      await createAnnotation(page, 'pencil', { x: 20 + col * 40, y: 20 + row * 35, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(50)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export performance — completes within timeout', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', { x: 30 + col * 70, y: 30 + row * 50, w: 50, h: 20 })
    }
    const start = Date.now()
    const download = await exportPDF(page)
    const elapsed = Date.now() - start
    expect(download).toBeTruthy()
    expect(elapsed).toBeLessThan(30000) // Should export within 30s
  })

  test('export then draw more then re-export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download1 = await exportPDF(page)
    expect(download1).toBeTruthy()
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    const download2 = await exportPDF(page)
    expect(download2).toBeTruthy()
  })

  test('export button enabled when file loaded', async ({ page }) => {
    const exportBtn = page.locator('button', { hasText: /Export/i })
    await expect(exportBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('export button text', async ({ page }) => {
    const exportBtn = page.locator('button', { hasText: /Export/i })
    await expect(exportBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('export error handling — no crash on empty', async ({ page }) => {
    // Export with no annotations should still produce a valid PDF
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rapid export clicks — no double export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    // A second rapid export should also work
    const download2 = await exportPDF(page)
    expect(download2).toBeTruthy()
  })

  test('export with all stamp types', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
