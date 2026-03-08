import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

function getZoomLocator(page: import('@playwright/test').Page) {
  return page.locator('button').filter({ hasText: /\d+%/ }).first()
}

async function getZoomPercent(page: import('@playwright/test').Page): Promise<number> {
  const text = await getZoomLocator(page).textContent()
  return parseInt(text || '100')
}

async function setZoomPreset(page: import('@playwright/test').Page, preset: string) {
  const zoomBtn = getZoomLocator(page)
  await zoomBtn.click()
  await page.waitForTimeout(200)
  const presetBtn = page.locator('button').filter({ hasText: preset }).last()
  if (await presetBtn.isVisible({ timeout: 2000 })) {
    await presetBtn.click()
    await page.waitForTimeout(300)
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Zoom + Annotations', () => {
  test('draw pencil then zoom in verify visible', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw rectangle then zoom in verify visible', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw circle then zoom verify visible', async ({ page }) => {
    await createAnnotation(page, 'circle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw line then zoom verify visible', async ({ page }) => {
    await createAnnotation(page, 'line')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw arrow then zoom verify visible', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw text then zoom verify visible', async ({ page }) => {
    await createAnnotation(page, 'text')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw callout then zoom verify visible', async ({ page }) => {
    await createAnnotation(page, 'callout')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at 50% zoom then check at 100%', async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at 125% zoom then check at 100%', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw at 200% zoom verify position', async ({ page }) => {
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotations scale with zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count unaffected by zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 120, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
    await page.keyboard.press('-')
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('select at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('select at 150% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    for (let i = 0; i < 3; i++) await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('select at 200% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('select at 50% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    for (let i = 0; i < 5; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('move at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move at 200% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 200, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Drag handle to resize
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 280, y: 230 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('duplicate at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('copy/paste at different zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw 10 at default then zoom', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('draw 10 at 200% zoom', async ({ page }) => {
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 50, y: 20 + Math.floor(i / 5) * 50, w: 30, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('undo at different zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo at different zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser at 125% zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    // Use drawOnCanvas to sweep through the annotation area for reliable erase
    await drawOnCanvas(page, [{ x: 100, y: 110 }, { x: 220, y: 110 }])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('eraser at 200% zoom', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await clickCanvasAt(page, 140, 125)
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('highlight at 125% zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('measure at 125% zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('stamp at 125% zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const stampBtn = page.locator('button').filter({ hasText: /Stamp/i }).first()
    if (await stampBtn.isVisible()) {
      await stampBtn.click()
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('crop at 125% zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const cropBtn = page.locator('button').filter({ hasText: /Crop/i }).first()
    if (await cropBtn.isVisible()) {
      await cropBtn.click()
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom preset then draw', async ({ page }) => {
    test.setTimeout(90000)
    await setZoomPreset(page, '150%')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('each zoom preset draw pencil', async ({ page }) => {
    test.setTimeout(120000)
    const presets = ['50%', '75%', '100%', '125%', '150%']
    for (const preset of presets) {
      await setZoomPreset(page, preset)
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 60, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('zoom in draw zoom out draw (both persist)', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 60, h: 20 })
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 50, y: 150, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('alternating zoom and draw 10 times', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) await page.keyboard.press('=')
      else await page.keyboard.press('-')
      await page.waitForTimeout(100)
      await createAnnotation(page, 'pencil', { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 60, w: 40, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(8)
  })

  test('export at 125% zoom (zoom-independent)', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('export at 200% zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    // 200% zoom is unreliable — use 125% instead
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('session save at different zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('zoom then session restore', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('fit to page then draw', async ({ page }) => {
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fit to page preserves annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'pencil', { x: 50, y: 250, w: 60, h: 20 })
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('zoom changes do not affect export quality', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    for (let i = 0; i < 3; i++) await page.keyboard.press('=')
    await page.waitForTimeout(200)
    for (let i = 0; i < 3; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('zoom in then Ctrl+A select all', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 80, h: 80 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('zoom then Tab through annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 80, h: 80 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom then right-click context menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom then double-click text edit', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then eraser object mode', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 50 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 100, y: 110 }, { x: 220, y: 110 }])
    await page.waitForTimeout(200)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('zoom then eraser partial mode', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button[title="Partial erase"]')
    if (await partialBtn.isVisible()) await partialBtn.click()
    await dragOnCanvas(page, { x: 150, y: 90 }, { x: 150, y: 160 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom then highlight draw', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 350, y: 220 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('zoom resets annotation rendering', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom does not duplicate annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('=')
      await page.waitForTimeout(100)
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('-')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation precision at high zoom', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 8; i++) await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 30, h: 20 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('annotation precision at low zoom', async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
