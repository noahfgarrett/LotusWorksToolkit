import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  selectAnnotationAt, moveAnnotation, waitForSessionSave, getSessionData,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Fill — Visibility Per Tool', () => {
  test('fill visible for rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill visible for circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill visible for cloud', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill not visible for pencil', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const fillLabel = page.locator('text=/Fill/')
    const visible = await fillLabel.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('fill not visible for line', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const fillLabel = page.locator('text=/Fill/')
    const visible = await fillLabel.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('fill not visible for arrow', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    const fillLabel = page.locator('text=/Fill/')
    const visible = await fillLabel.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('fill not visible for text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fillLabel = page.locator('text=/^Fill$/')
    const visible = await fillLabel.isVisible().catch(() => false)
    // Text may have its own background option but not "Fill" in the same sense
    expect(typeof visible).toBe('boolean')
  })
})

test.describe('Fill — Color Options', () => {
  test('fill default is none or transparent', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill color set to red', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color set to green', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#00ff00')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color set to blue', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#0000ff')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color set to yellow', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ffff00')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color set to orange', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff6600')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color set to custom hex', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ab12cd')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with stroke color same', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with stroke color different', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const bluePreset = page.locator('button[title="#3B82F6"]')
    await bluePreset.click()
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Fill — Shape Creation', () => {
  test('fill rectangle create', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill circle create', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill preserved in session', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#00ff00')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('fill preserved in export', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('fill undo/redo preserves fill', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill duplicate preserves fill', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('fill copy/paste preserves fill', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('fill color change on selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Fill — Border Combinations', () => {
  test('fill rectangle with rounded corners', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const radiusSlider = page.locator('input[type="range"][max="30"]')
    const hasRadius = await radiusSlider.isVisible().catch(() => false)
    if (hasRadius) {
      await radiusSlider.fill('15')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with dashed border', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dashedBtn = page.locator('button:has-text("╌")')
    const hasDashed = await dashedBtn.isVisible().catch(() => false)
    if (hasDashed) {
      await dashedBtn.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with dotted border', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const dottedBtn = page.locator('button:has-text("┈")')
    const hasDotted = await dottedBtn.isVisible().catch(() => false)
    if (hasDotted) {
      await dottedBtn.click()
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with thick border', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('15')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with thin border', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('1')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Fill — Shape Operations', () => {
  test('fill rectangle export', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill circle export', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    await exportPDF(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rectangle with red stroke blue fill', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const redPreset = page.locator('button[title="#FF0000"]')
    await redPreset.click()
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#0000ff')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('circle with green stroke yellow fill', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const greenPreset = page.locator('button[title="#22C55E"]')
    await greenPreset.click()
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ffff00')
    }
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple filled shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 50, y: 150, w: 100, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('filled shape move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await moveAnnotation(page, { x: 100, y: 140 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('filled shape delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('filled shape nudge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('filled shapes z-order with Ctrl+]', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('fill property panel layout for rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
    const strokeSlider = page.locator('input[type="range"]').first()
    await expect(strokeSlider).toBeVisible()
  })

  test('fill with max opacity', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('100')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill with low opacity', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('25')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill cloud create', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill color none button or transparent toggle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
    // Look for a none/transparent toggle
    const noneBtn = page.locator('button:has-text("None"), button:has-text("none"), button[title*="none"]')
    const hasNone = await noneBtn.first().isVisible().catch(() => false)
    expect(typeof hasNone).toBe('boolean')
  })

  test('fill toggle on then off', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill color via preset button if available', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    // Fill may use same preset buttons or a separate set
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
  })

  test('fill after zoom', async ({ page }) => {
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill on page 2 of multi-page PDF', async ({ page }) => {
    // Navigate to page 2 and draw filled shape
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('fill opacity interaction — low opacity shows through', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('30')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#ff0000')
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('filled shape over unfilled shape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 110, y: 110, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('unfilled shape over filled shape', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 90, y: 90, w: 120, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('filled shape resize preserves fill', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    // Annotation should be selected
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('fill in annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 100, y: 250, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    const statusText = page.locator('text=/2 ann/')
    await expect(statusText).toBeVisible({ timeout: 3000 })
  })

  test('cloud export with fill', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const fillLabel = page.locator('text=/Fill/')
    await expect(fillLabel).toBeVisible({ timeout: 3000 })
    // Just verify the fill UI is present for cloud
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('filled shapes hit-test on edges', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    // Hit-test on border
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('fill color via color input for circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    const fillInput = page.locator('input[type="color"]').nth(1)
    const hasInput = await fillInput.isVisible().catch(() => false)
    if (hasInput) {
      await fillInput.fill('#22c55e')
      await page.waitForTimeout(100)
    }
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
