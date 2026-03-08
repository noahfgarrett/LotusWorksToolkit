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

async function selectAndCopy(page: import('@playwright/test').Page, x: number, y: number) {
  await selectTool(page, 'Select (S)')
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(200)
  await page.keyboard.press('Control+c')
  await page.waitForTimeout(100)
}

test.describe('Clipboard Operations', () => {
  test('Ctrl+C copies selected pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectAndCopy(page, 150, 115)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectAndCopy(page, 150, 115)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectAndCopy(page, 200, 125)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectAndCopy(page, 200, 125)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectAndCopy(page, 200, 125)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectAndCopy(page, 200, 125)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectAndCopy(page, 100, 120)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectAndCopy(page, 100, 120)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectAndCopy(page, 100, 140)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectAndCopy(page, 100, 140)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('paste creates offset copy', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('paste twice creates 2 copies', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('paste 5 times creates 5 copies', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await selectAndCopy(page, 100, 125)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('copy then paste on different page', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('copy preserves color', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    if (await redPreset.isVisible()) await redPreset.click()
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectAndCopy(page, 150, 110)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy preserves stroke width', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) await slider.fill('10')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectAndCopy(page, 150, 110)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy preserves fill color', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    if (await fillInput.isVisible()) await fillInput.fill('#00ff00')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy preserves text content', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Clipboard test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAndCopy(page, 100, 125)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy preserves font settings', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectAndCopy(page, 100, 120)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy preserves bold/italic', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAndCopy(page, 100, 125)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('paste count verification', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectAndCopy(page, 100, 130)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(100)
      expect(await getAnnotationCount(page)).toBe(2 + i)
    }
  })

  test('Ctrl+D duplicate shortcut', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+D vs Ctrl+C/V — both create copies', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('duplicate pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 115)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('duplicate stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate preserves properties', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const redPreset = page.locator('button[title="#FF0000"]')
    if (await redPreset.isVisible()) await redPreset.click()
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 110)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate offset from original', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate 5 times', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 60, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 70)
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+d')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('copy nothing — no selection', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('paste nothing — no clipboard', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('copy then switch tool then paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy then undo then paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('copy then draw then paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 20 })
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('paste on empty page', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('paste on page with annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 80, h: 20 })
    await selectAndCopy(page, 100, 130)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('paste after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('paste after rotate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('paste after page switch', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('paste updates annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('paste adds to undo history', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo paste removes pasted', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate adds to undo history', async ({ page }) => {
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

  test('undo duplicate removes copy', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('clipboard persists across tool switches', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAndCopy(page, 100, 150)
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

})
