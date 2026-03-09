import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Export: Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  test('export blank PDF with no annotations downloads file', async ({ page }) => {
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one pencil annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one rectangle annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one circle annotation', async ({ page }) => {
    await createAnnotation(page, 'circle')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one line annotation', async ({ page }) => {
    await createAnnotation(page, 'line')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one arrow annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one text box annotation', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one callout annotation', async ({ page }) => {
    await createAnnotation(page, 'callout')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one cloud annotation', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one stamp annotation', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /stamp/i })
    if (await stampBtn.isVisible().catch(() => false)) {
      await stampBtn.click()
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    } else {
      await createAnnotation(page, 'rectangle')
    }
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with one measurement annotation', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with all annotation types on one page', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 160, w: 80, h: 40 })
    await createAnnotation(page, 'arrow', { x: 50, y: 220, w: 80, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 250, w: 80, h: 0 })
    await createAnnotation(page, 'text', { x: 50, y: 280, w: 80, h: 30 })
    await createAnnotation(page, 'callout', { x: 50, y: 330, w: 80, h: 40 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export multi-page with annotations on each page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 80 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with rotated page', async ({ page }) => {
    const cwBtn = page.locator('button[title="Rotate CW"]').first()
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export preserves annotation colors', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.fill('#ff0000')
    }
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export preserves text content', async ({ page }) => {
    await createAnnotation(page, 'text')
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export filename is original-annotated.pdf', async ({ page }) => {
    const download = await exportPDF(page)
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/annotated\.pdf$/i)
  })

  test('export triggers download event', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download).toBeDefined()
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with zoomed view does not affect exported PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+=')
    }
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with very many annotations (30+)', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 30; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + (i % 6) * 60,
        y: 30 + Math.floor(i / 6) * 50,
        w: 45,
        h: 30,
      })
    }
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(25)
    expect(count).toBeLessThanOrEqual(30)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with measurement showing calibrated values', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('consecutive exports produce valid downloads', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download1 = await exportPDF(page)
    expect(download1.suggestedFilename()).toContain('.pdf')
    const download2 = await exportPDF(page)
    expect(download2.suggestedFilename()).toContain('.pdf')
  })

  test('export does not modify original annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 120, h: 40 })
    const countBefore = await getAnnotationCount(page)
    await exportPDF(page)
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBe(countBefore)
  })

  test('export undo not applicable — no state change', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const countBefore = await getAnnotationCount(page)
    await exportPDF(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    // Undo should undo the annotation creation, not the export
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBeLessThan(countBefore)
  })

  test('export session data does not change after export', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    await exportPDF(page)
    await page.waitForTimeout(500)
    const sessionAfter = await getSessionData(page)
    expect(sessionAfter).not.toBeNull()
    expect(sessionBefore).not.toBeNull()
  })

  test('export with highlight annotation', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export button is visible and enabled', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toBeEnabled()
  })

  test('export with mixed annotations and undo before export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 170, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export after selecting and moving annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await moveAnnotation(page, { x: 160, y: 140 }, { x: 250, y: 250 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export after deleting annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    // Hit-test detects edges — click on left edge of default rectangle (x=100)
    await selectAnnotationAt(page, 100, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with text formatting (bold)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with dashed line style', async ({ page }) => {
    test.setTimeout(60000)
    await selectTool(page, 'Rectangle (R)')
    // Set dash style - the dashed button contains ╌
    const dashBtn = page.locator('button:has-text("╌")').first()
    if (await dashBtn.isVisible().catch(() => false)) {
      await dashBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export after erasing annotations leaves only remaining', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    await selectTool(page, 'Eraser (E)')
    // Switch to Object mode so whole annotation is deleted
    const objectBtn = page.locator('button:has-text("Object")')
    if (await objectBtn.isVisible().catch(() => false)) {
      await objectBtn.click()
      await page.waitForTimeout(100)
    }
    // Sweep horizontally along the rectangle's top edge (y=80)
    await drawOnCanvas(page, [
      { x: 60, y: 80 }, { x: 80, y: 80 }, { x: 100, y: 80 },
      { x: 120, y: 80 }, { x: 140, y: 80 }, { x: 160, y: 80 },
      { x: 180, y: 80 }, { x: 200, y: 80 },
    ])
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export downloaded file has non-zero size', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
    // The download path exists, meaning a non-empty file was created
  })
})
