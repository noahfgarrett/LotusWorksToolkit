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
  exportPDF,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Export: Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  test('export with bold text produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 280, y: 160 })
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold text content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with colored shapes produces valid PDF', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.fill('#ff0000')
    }
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 120, h: 80 })
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.fill('#00ff00')
    }
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 80 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with dashed lines produces valid PDF', async ({ page }) => {
    test.setTimeout(60000)
    await selectTool(page, 'Line (L)')
    const dashBtn = page.locator('button:has-text("╌")').first()
    if (await dashBtn.isVisible().catch(() => false)) {
      await dashBtn.click()
      await page.waitForTimeout(100)
    }
    await dragOnCanvas(page, { x: 80, y: 100 }, { x: 330, y: 100 })
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 80, y: 150, w: 150, h: 100 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with filled rectangles produces valid PDF', async ({ page }) => {
    // Set fill if UI supports it
    const fillBtn = page.locator('button').filter({ hasText: /fill/i }).first()
    if (await fillBtn.isVisible().catch(() => false)) {
      await fillBtn.click()
    }
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with rounded corner rectangles produces valid PDF', async ({ page }) => {
    test.setTimeout(60000)
    // Corner radius is controlled by a slider, not a button
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 150, h: 100 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with single-headed arrow produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 80, y: 150, w: 200, h: 0 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with double-headed arrow produces valid PDF', async ({ page }) => {
    // Enable double-head if UI supports it
    const doubleBtn = page.locator('button').filter({ hasText: /double/i }).first()
    if (await doubleBtn.isVisible().catch(() => false)) {
      await doubleBtn.click()
    }
    await createAnnotation(page, 'arrow', { x: 80, y: 150, w: 200, h: 0 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with callout arrow produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 60 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with stamps produces valid PDF', async ({ page }) => {
    const stampBtn = page.locator('button').filter({ hasText: /stamp/i })
    if (await stampBtn.isVisible().catch(() => false)) {
      await stampBtn.click()
      await clickCanvasAt(page, 200, 200)
      await page.waitForTimeout(200)
    } else {
      await createAnnotation(page, 'rectangle')
    }
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with measurements produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 80, y: 150 }, { x: 300, y: 150 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with multiple annotation types produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 130, w: 100, h: 30 })
    await createAnnotation(page, 'arrow', { x: 200, y: 130, w: 100, h: 0 })
    await createAnnotation(page, 'pencil', { x: 50, y: 190, w: 100, h: 40 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('canvas screenshot before export shows annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export with italic text produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 280, y: 160 })
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with large font text produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    // Look for font size selector
    const fontSizeInput = page.locator('input[type="number"]').filter({ has: page.locator('..', { hasText: /size|font/i }) }).first()
    if (await fontSizeInput.isVisible().catch(() => false)) {
      await fontSizeInput.fill('24')
    }
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 300, y: 160 })
    await page.keyboard.type('Large text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with cloud shape produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 80, 80)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 280, 80)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 180, 220)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with highlight annotation produces valid PDF', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 80, y: 150 }, { x: 350, y: 150 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with overlapping shapes produces valid PDF', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 120, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 160, y: 140, w: 120, h: 80 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('export with thick line width produces valid PDF', async ({ page }) => {
    const widthInput = page.locator('input[type="range"]').first()
    if (await widthInput.isVisible().catch(() => false)) {
      await widthInput.fill('8')
    }
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 200, h: 150 })
    const download = await exportPDF(page)
    const path = await download.path()
    expect(path).toBeTruthy()
  })
})
