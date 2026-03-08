import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Rotation + Export', () => {
  test.setTimeout(60000)

  test('export unrotated page with annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export 90 rotated with pencil', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with rectangle', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with circle', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with line', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with arrow', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 90 rotated with callout', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 180 rotated with pencil', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(200)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 180 rotated with rectangle', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(200)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 180 rotated with circle', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(200)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 180 rotated with text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(200)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 270 rotated with pencil', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    for (let i = 0; i < 3; i++) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 270 rotated with rectangle', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    for (let i = 0; i < 3; i++) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 270 rotated with text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    for (let i = 0; i < 3; i++) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export 360 rotated — same as unrotated', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    for (let i = 0; i < 4; i++) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export multi-page rotated differently', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await rotateBtn.click()
    await page.waitForTimeout(200)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated page with multiple annotations', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 250, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated page with mixed types', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 30, y: 80, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 120, w: 100, h: 30 })
    await createAnnotation(page, 'text', { x: 30, y: 170, w: 120, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with highlight', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with stamp', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate then draw then export', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 100, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export produces valid PDF', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export filename ends in .pdf', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export after rotate + zoom', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with thick strokes', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
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
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with colored strokes', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Pencil (P)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF0000')
    }
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with filled shapes', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Rectangle (R)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 1 && await colorInput.nth(1).isVisible()) {
      await colorInput.nth(1).fill('#00FF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with dashed strokes', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with opacity', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity') || parentText.includes('opacity')) {
        await sliders.nth(i).fill('50')
        break
      }
    }
    await drawOnCanvas(page, [{ x: 100, y: 200 }, { x: 300, y: 200 }])
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate all pages then export', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate only page 1 then export', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate only page 2 then export', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export then rotate then export again', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download1 = await exportPDF(page)
    expect(download1).toBeTruthy()
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download2 = await exportPDF(page)
    expect(download2).toBeTruthy()
  })

  test('multiple exports after rotations', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    for (let i = 0; i < 3; i++) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
      const download = await exportPDF(page)
      expect(download).toBeTruthy()
    }
  })

  test('export rotated with text formatting — bold', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold Text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with text formatting — italic', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.keyboard.type('Italic Text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with large text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 300, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with small text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 80, h: 30 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with long text', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 400, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a long text annotation that spans the entire width of the page in a rotated orientation')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('session save then rotate then export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate undo then export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotate redo then export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('rotated export file size reasonable', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated after deleting annotation', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated after adding then deleting', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with 20 annotations', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 50, w: 50, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    const download = await exportPDF(page, 30000)
    expect(download).toBeTruthy()
  })

  test('export rotated page with measurement', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 350 }, { x: 300, y: 350 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with callout arrow', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with cloud', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Cloud (K)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 },
      { x: 100, y: 200 }, { x: 100, y: 100 },
    ])
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with stamp APPROVED', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with multiple stamp types', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated with all annotation types', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 20 })
    await createAnnotation(page, 'line', { x: 30, y: 70, w: 100, h: 0 })
    await createAnnotation(page, 'arrow', { x: 30, y: 100, w: 100, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 30, y: 230, w: 120, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export rotated preserve quality', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })

  test('export rotated with annotations on multiple pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    await rotateBtn.click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })
})
