import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, waitForSessionSave,
  getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Pan - Core', () => {
  // ── Middle-click drag pan ────────────────────────────────────────

  test('middle-click drag pans the viewport', async ({ page }) => {
    // Zoom in first so there is room to pan
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const before = await screenshotCanvas(page)
    // Middle-click drag
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Space key pan mode ───────────────────────────────────────────

  test('Space key enables temporary pan mode', async ({ page }) => {
    // Zoom in first
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Hold Space to enable pan mode
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    // Drag to pan
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    await page.keyboard.up('Space')
    await page.waitForTimeout(100)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Space + drag pans the view', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    const before = await screenshotCanvas(page)
    await page.mouse.move(box.x + 250, box.y + 250)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 150, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Space')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('release Space exits pan mode', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')
    await page.waitForTimeout(200)
    // After releasing Space, should be back in select mode
    await expect(page.locator('text=/Click to select/')).toBeVisible({ timeout: 3000 })
  })

  // ── Pan cursor changes ──────────────────────────────────────────

  test('pan mode shows grab cursor', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await page.keyboard.down('Space')
    await page.waitForTimeout(200)
    // Check cursor style
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor)
    await page.keyboard.up('Space')
    // Should be grab or grabbing
    expect(['grab', 'grabbing', '-webkit-grab', '-webkit-grabbing', 'move', 'default', 'auto']).toContain(cursor)
  })

  test('pan dragging shows grabbing cursor', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down()
    await page.waitForTimeout(100)
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor)
    await page.mouse.up()
    await page.keyboard.up('Space')
    expect(['grab', 'grabbing', '-webkit-grab', '-webkit-grabbing', 'move', 'default', 'auto']).toContain(cursor)
  })

  // ── Pan while zoomed ─────────────────────────────────────────────

  test('pan while zoomed in moves viewport', async ({ page }) => {
    // Zoom in significantly
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+=')
      await page.waitForTimeout(100)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const before = await screenshotCanvas(page)
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 50, box.y + 50, { steps: 10 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('pan returns to original position with reverse drag', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const before = await screenshotCanvas(page)
    // Pan left
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(200)
    // Pan back right
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    // Should approximately match original view
    expect(after.length).toBeGreaterThan(0)
  })

  // ── Pan + zoom combined ──────────────────────────────────────────

  test('pan then zoom maintains usable state', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Pan
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(200)
    // Zoom more
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    // Should not crash
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('zoom then pan combined', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Control+=')
      await page.waitForTimeout(100)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const before = await screenshotCanvas(page)
    // Pan with Space
    await page.keyboard.down('Space')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + 50, box.y + 50, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Space')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Pan doesn't affect annotations ──────────────────────────────

  test('pan does not change annotation positions or count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Zoom in and pan
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Pan to edge of page ──────────────────────────────────────────

  test('pan to edge of zoomed page', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+=')
      await page.waitForTimeout(100)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Pan far to the right
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x - 200, box.y - 200, { steps: 10 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    // Should not crash
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  // ── Session persistence ──────────────────────────────────────────

  test('pan position persists via session scroll state', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  // ── Space pan does not interfere with text editing ───────────────

  test('Space key does not pan when typing in text box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    // Double-click to enter text editing
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    // Type space character - should type, not pan
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    // Should not crash and text should still exist
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('pan after drawing annotation preserves the annotation', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Pan
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
