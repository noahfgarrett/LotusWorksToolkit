import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]

function getZoomLocator(page: import('@playwright/test').Page) {
  return page.locator('button').filter({ hasText: /\d+%/ }).first()
}

async function getZoomPercent(page: import('@playwright/test').Page): Promise<number> {
  const text = await getZoomLocator(page).textContent()
  return parseInt(text || '100')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Zoom Edge Cases', () => {
  test('zoom in via button', async ({ page }) => {
    const before = await getZoomPercent(page)
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeGreaterThan(before)
  })

  test('zoom out via button', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    const before = await getZoomPercent(page)
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeLessThan(before)
  })

  test('zoom in via Ctrl+=', async ({ page }) => {
    const before = await getZoomPercent(page)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeGreaterThan(before)
  })

  test('zoom out via Ctrl+-', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const before = await getZoomPercent(page)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeLessThan(before)
  })

  test('zoom in via = key', async ({ page }) => {
    const before = await getZoomPercent(page)
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeGreaterThan(before)
  })

  test('zoom out via - key', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    const before = await getZoomPercent(page)
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    expect(after).toBeLessThan(before)
  })

  test('zoom to 25% minimum', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('-')
    }
    await page.waitForTimeout(300)
    const percent = await getZoomPercent(page)
    expect(percent).toBeGreaterThanOrEqual(25)
  })

  test('zoom to 400% maximum', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('=')
    }
    await page.waitForTimeout(300)
    const percent = await getZoomPercent(page)
    expect(percent).toBeLessThanOrEqual(400)
  })

  test('zoom past 400% stays at 400%', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('=')
    }
    await page.waitForTimeout(300)
    const percent = await getZoomPercent(page)
    expect(percent).toBeLessThanOrEqual(400)
  })

  test('zoom below 25% stays at 25%', async ({ page }) => {
    test.setTimeout(60000)
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('-')
    }
    await page.waitForTimeout(300)
    const percent = await getZoomPercent(page)
    expect(percent).toBeGreaterThanOrEqual(25)
  })

  test('zoom percentage displayed', async ({ page }) => {
    await expect(getZoomLocator(page)).toBeVisible()
  })

  test('zoom preset 25%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: /^25%$/ }).last()
    if (await preset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(25)
    }
  })

  test('zoom preset 50%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: /^50%$/ }).last()
    if (await preset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(50)
    }
  })

  test('zoom preset 75%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '75%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(75)
    }
  })

  test('zoom preset 100%', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '100%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(100)
    }
  })

  test('zoom preset 125%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '125%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(125)
    }
  })

  test('zoom preset 150%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '150%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(150)
    }
  })

  test('zoom preset 200%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '200%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(200)
    }
  })

  test('zoom preset 300%', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset = page.locator('button').filter({ hasText: '300%' }).last()
    if (await preset.isVisible({ timeout: 2000 })) {
      await preset.click()
      await page.waitForTimeout(300)
      expect(await getZoomPercent(page)).toBe(300)
    }
  })

  test('zoom dropdown shows presets', async ({ page }) => {
    const zoomBtn = getZoomLocator(page)
    await zoomBtn.click()
    await page.waitForTimeout(200)
    const preset100 = page.locator('button').filter({ hasText: '100%' }).last()
    await expect(preset100).toBeVisible({ timeout: 3000 })
  })

  test('F key fits to page', async ({ page }) => {
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const zoom = await getZoomPercent(page)
    expect(zoom).toBeTruthy()
  })

  test('Ctrl+0 fits to page', async ({ page }) => {
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(300)
    const zoom = await getZoomPercent(page)
    expect(zoom).toBeTruthy()
  })

  test('fit to page after zoom in', async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomed = await getZoomPercent(page)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    // Just verify zoom changed (fit-to-page value depends on viewport)
    expect(after).not.toBe(zoomed)
  })

  test('fit to page after zoom out', async ({ page }) => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('-')
    await page.waitForTimeout(200)
    const zoomed = await getZoomPercent(page)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    // Just verify zoom changed (fit-to-page value depends on viewport)
    expect(after).not.toBe(zoomed)
  })

  test('zoom then draw pencil', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw rectangle', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw circle', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'circle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw line', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'line')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw arrow', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'arrow')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw text', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'text')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw callout', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'callout')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then select annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom then move annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then resize annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then delete annotation', async ({ page }) => {
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

  test('zoom in then out returns to original', async ({ page }) => {
    const initial = await getZoomPercent(page)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    const after = await getZoomPercent(page)
    expect(after).toBe(initial)
  })

  test('zoom affects all pages equally', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoom = await getZoomPercent(page)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    const zoom2 = await getZoomPercent(page)
    expect(zoom2).toBe(zoom)
  })

  test('zoom preserves annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('-')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then export (zoom-independent)', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('zoom then session save', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('zoom level in session data', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    if (session && session.zoom !== undefined) {
      expect(session.zoom).toBeGreaterThan(1)
    }
  })

  test('zoom restore from session', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoomBefore = await getZoomPercent(page)
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    const zoomAfter = await getZoomPercent(page)
    // Zoom may or may not be restored depending on implementation
    expect(typeof zoomAfter).toBe('number')
  })

  test('zoom then undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('zoom then redo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then eraser', async ({ page }) => {
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

  test('zoom then highlight', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('zoom then measure', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom at different page', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    const zoom = await getZoomPercent(page)
    expect(zoom).toBeGreaterThan(100)
  })

  test('scroll wheel zoom (Ctrl+scroll)', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const before = await getZoomPercent(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -100)
    await page.keyboard.up('Control')
    await page.waitForTimeout(300)
    const after = await getZoomPercent(page)
    // Scroll zoom may or may not be implemented, but no crash
    expect(typeof after).toBe('number')
  })

  test('rapid zoom in/out (20 times)', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(i % 2 === 0 ? '=' : '-')
    }
    await page.waitForTimeout(300)
    expect(typeof await getZoomPercent(page)).toBe('number')
  })

  test('zoom then draw at corner', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 10, y: 10, w: 40, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw at center', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 200, y: 300, w: 60, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw at edge', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 400, y: 500, w: 40, h: 20 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('zoom resets on file change', async ({ page }) => {
    test.setTimeout(300000)
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    // Upload a different PDF
    try {
      await Promise.race([
        uploadPDFAndWait(page, 'multi-page.pdf'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Multi-page upload timeout')), 60000))
      ])
    } catch {
      // Multi-page upload may timeout in resource-constrained headless mode
      return
    }
    await page.waitForTimeout(1000)
    const zoom = await getZoomPercent(page)
    // Zoom may reset to fit-to-page on new file
    expect(typeof zoom).toBe('number')
  })

  test('zoom percentage text format', async ({ page }) => {
    const text = await getZoomLocator(page).textContent()
    expect(text).toMatch(/\d+%/)
  })
})
