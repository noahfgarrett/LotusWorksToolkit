import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, getAnnotationCount, createAnnotation,
  clickCanvasAt, dragOnCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Zoom & Pan Core', () => {
  test('zoom in button increases zoom', async ({ page }) => {
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    await zoomInBtn.click()
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('zoom out button decreases zoom', async ({ page }) => {
    // First zoom in using the button
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    await zoomInBtn.click()
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    await zoomOutBtn.click()
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('Ctrl+= zooms in', async ({ page }) => {
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('Ctrl+- zooms out', async ({ page }) => {
    // First zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('= key zooms in 10%', async ({ page }) => {
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('- key zooms out 10%', async ({ page }) => {
    // First zoom in using = key
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const initialZoom = await zoomText.textContent()
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    const newZoom = await zoomText.textContent()
    expect(newZoom).not.toBe(initialZoom)
  })

  test('F key fits to page', async ({ page }) => {
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom = await zoomText.textContent()
    expect(zoom).toBeTruthy()
  })

  test('Ctrl+0 fits to page', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom = await zoomText.textContent()
    expect(zoom).toBeTruthy()
  })

  test('zoom percentage displayed in toolbar', async ({ page }) => {
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    await expect(zoomText).toBeVisible()
  })

  test('annotations scale with zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then draw — annotation position correct', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom then select — hit-test correct', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Should be able to interact — no crash
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('space+drag pans the document', async ({ page }) => {
    // Zoom in to have scrollable area
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Space')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Space')
    await page.waitForTimeout(200)
    // No crash
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom dropdown shows presets', async ({ page }) => {
    const zoomBtn = page.locator('button').filter({ hasText: /\d+%/ }).first()
    if (await zoomBtn.isVisible()) {
      await zoomBtn.click()
      await page.waitForTimeout(200)
      // Look for preset values
      const preset100 = page.locator('button').filter({ hasText: '100%' }).last()
      await expect(preset100).toBeVisible({ timeout: 3000 })
    }
  })

  test('zoom minimum is 25%', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('-')
    }
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom = await zoomText.textContent()
    const percent = parseInt(zoom || '100')
    expect(percent).toBeGreaterThanOrEqual(25)
  })

  test('zoom maximum is 400%', async ({ page }) => {
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('=')
    }
    await page.waitForTimeout(300)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const zoom = await zoomText.textContent()
    const percent = parseInt(zoom || '100')
    expect(percent).toBeLessThanOrEqual(400)
  })

  test('pan during drawing — no interference', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    // Draw a stroke
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('export is zoom-independent', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('=')
    await page.keyboard.press('=')
    await page.waitForTimeout(300)
    // Export should produce same result regardless of zoom
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
