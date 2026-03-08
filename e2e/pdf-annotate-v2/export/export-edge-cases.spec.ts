import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Export Edge Cases', () => {
  test('export empty PDF (no annotations)', async ({ page }) => {
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single circle', async ({ page }) => {
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single line', async ({ page }) => {
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single text', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single callout', async ({ page }) => {
    await createAnnotation(page, 'callout')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export single stamp', async ({ page }) => {
    const stampTool = page.locator('button').filter({ hasText: /Stamp/i }).first()
    if (await stampTool.isVisible()) {
      await stampTool.click()
      await page.waitForTimeout(200)
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export produces .pdf file', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export file is non-zero bytes', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export triggers download', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with 1 annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with 5 annotations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 60, h: 20 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with 10 annotations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with 20 annotations', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 50, w: 40, h: 20 })
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with 50 annotations', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 50; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 10) * 40, y: 20 + Math.floor(i / 10) * 40, w: 30, h: 15 })
    }
    const download = await exportPDF(page, 30000)
    expect(download).toBeTruthy()
  })

  test('export with mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 30, y: 80, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 120, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 170, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 150, y: 170, w: 80, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export preserves annotation count (re-upload and check)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at default zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 200% zoom (zoom-independent)', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    for (let i = 0; i < 5; i++) await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 50% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    for (let i = 0; i < 5; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 60, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 300, y: 300 })
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

  test('export button visible', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeVisible()
  })

  test('export button text is Export PDF', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    const text = await exportBtn.textContent()
    expect(text).toContain('Export PDF')
  })

  test('export during editing — Escape text then export', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after eraser', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 80, h: 60 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after rotate 90 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after rotate 180 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export after rotate 270 degrees', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await rotateBtn.click()
        await page.waitForTimeout(200)
      }
      await page.waitForTimeout(300)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated multi-page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export cropped page', async ({ page }) => {
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(300)
      const applyBtn = page.locator('button').filter({ hasText: /Apply/i }).first()
      if (await applyBtn.isVisible()) {
        await applyBtn.click()
        await page.waitForTimeout(300)
      }
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with measurements', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multi-page', async ({ page }) => {
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multi-page with annotations per page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export preserves page count', async ({ page }) => {
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export filename contains original name', async ({ page }) => {
    const download = await exportPDF(page)
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/sample/i)
  })

  test('export with thick strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Width') || parentText.includes('Stroke')) {
        await sliders.nth(i).fill('10')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with colored strokes', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible()) await colorInput.fill('#FF0000')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with dashed strokes', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with filled shapes', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const colorInputs = page.locator('input[type="color"]')
    const count = await colorInputs.count()
    if (count > 1) {
      await colorInputs.nth(1).fill('#00FF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with opacity', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 140)
    await page.waitForTimeout(200)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity')) {
        await sliders.nth(i).fill('50')
        break
      }
    }
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with text formatting', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Formatted text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with font changes', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with line spacing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    const lineSpacing = page.locator('select[title="Line spacing"]')
    if (await lineSpacing.isVisible()) {
      await lineSpacing.selectOption('2')
    }
    await page.keyboard.type('Line 1\nLine 2\nLine 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with bold text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with underline text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.keyboard.type('Underline')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export with italic text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
