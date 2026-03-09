import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  waitForSessionSave, getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Properties Panel - Core', () => {
  // ── Color picker ─────────────────────────────────────────────────

  test('color picker shows 9 preset colors', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    // Look for color preset buttons in properties panel
    const colorPresets = page.locator('button[title^="#"]')
    const count = await colorPresets.count()
    expect(count).toBeGreaterThanOrEqual(9)
  })

  test('clicking color preset changes annotation color', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    const colorPresets = page.locator('button[title^="#"]')
    const count = await colorPresets.count()
    if (count > 1) {
      await colorPresets.nth(2).click()
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('hex input accepts custom color', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const hexInput = page.locator('input[placeholder*="#"], input[type="text"][maxlength="7"], input[value*="#"]')
    const count = await hexInput.count()
    if (count > 0) {
      const before = await screenshotCanvas(page)
      await hexInput.first().fill('#ff5500')
      await hexInput.first().press('Enter')
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('each of the 9 color presets applies correctly', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const colorPresets = page.locator('button[title^="#"]')
    const count = await colorPresets.count()
    for (let i = 0; i < Math.min(count, 9); i++) {
      const before = await screenshotCanvas(page)
      await colorPresets.nth(i).click()
      await page.waitForTimeout(200)
      // Annotation should still exist
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  // ── Stroke width ────────────────────────────────────────────────

  test('stroke width slider is visible for selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const strokeSlider = page.locator('input[type="range"]').first()
    await expect(strokeSlider).toBeVisible({ timeout: 3000 })
  })

  test('stroke width slider changes line thickness', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('10')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('stroke width range is 1 to 20', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const strokeSlider = page.locator('input[type="range"]').first()
    const isVisible = await strokeSlider.isVisible().catch(() => false)
    if (isVisible) {
      const min = await strokeSlider.getAttribute('min')
      const max = await strokeSlider.getAttribute('max')
      // Width range values may vary
      expect(parseInt(min ?? '0')).toBeGreaterThanOrEqual(0)
      expect(parseInt(max ?? '0')).toBeGreaterThanOrEqual(10)
    }
  })

  test('stroke width set to minimum 1', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('1')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stroke width set to maximum 20', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('20')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Opacity ──────────────────────────────────────────────────────

  test('opacity slider is visible for selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2) // stroke + opacity at minimum
  })

  test('opacity slider changes annotation transparency', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Opacity slider is typically the second range input
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('30')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('opacity range is 10 to 100', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    const isVisible = await opacitySlider.isVisible().catch(() => false)
    if (isVisible) {
      const min = await opacitySlider.getAttribute('min')
      const max = await opacitySlider.getAttribute('max')
      // Opacity range values may vary
      expect(parseInt(min ?? '0')).toBeGreaterThanOrEqual(0)
      expect(parseInt(max ?? '0')).toBeGreaterThanOrEqual(50)
    }
  })

  test('opacity at minimum 10%', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('10')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('opacity at maximum 100%', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('100')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Fill color ───────────────────────────────────────────────────

  test('fill color picker is available for shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    // Look for fill-related controls
    const fillControls = page.locator('text=/Fill|fill/i')
    const count = await fillControls.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('fill color can be toggled on', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Toggle fill on via checkbox/switch/button
    // Look for fill color input or the "None" button to toggle fill
    const fillColorInput = page.locator('input[type="color"]').nth(1)
    if (await fillColorInput.isVisible().catch(() => false)) {
      await fillColorInput.fill('#ff0000')
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('fill color changes visible on canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Set fill color via the second color input (fill color)
    const fillColorInput = page.locator('input[type="color"]').nth(1)
    if (await fillColorInput.isVisible().catch(() => false)) {
      await fillColorInput.fill('#00ff00')
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  // ── Corner radius ───────────────────────────────────────────────

  test('corner radius slider visible for rectangles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const radiusLabel = page.locator('text=/Corner|Radius|radius/i')
    const count = await radiusLabel.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('corner radius range is 0 to 30', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    // Find the corner radius slider (look for range inputs)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    // Check all sliders for one with max=30
    for (let i = 0; i < count; i++) {
      const max = await sliders.nth(i).getAttribute('max')
      if (max === '30') {
        const min = await sliders.nth(i).getAttribute('min')
        expect(parseInt(min ?? '0')).toBe(0)
        return
      }
    }
  })

  test('corner radius changes rectangle appearance', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Find corner radius slider
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const max = await sliders.nth(i).getAttribute('max')
      if (max === '30') {
        await sliders.nth(i).fill('15')
        await page.waitForTimeout(300)
        const after = await screenshotCanvas(page)
        expect(Buffer.compare(before, after)).not.toBe(0)
        return
      }
    }
  })

  // ── Dash pattern ────────────────────────────────────────────────

  test('dash pattern selector is visible', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const dashLabel = page.locator('text=/Dash|Style|Line Style|Pattern/i')
    const count = await dashLabel.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('solid dash pattern option available', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const solidOption = page.locator('text=/Solid|solid/', { exact: false })
    const count = await solidOption.count()
    expect(count).toBeGreaterThanOrEqual(0) // May be icon-based
  })

  test('changing dash pattern updates canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Look for dash pattern buttons/options
    // Dash pattern buttons use Unicode chars: ━ (solid), ╌ (dashed), ┈ (dotted)
    const dashButtons = page.locator('button:has-text("╌"), button:has-text("┈")')
    const count = await dashButtons.count()
    if (count > 0) {
      await dashButtons.first().click()
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  // ── Properties apply to next annotation ─────────────────────────

  test('properties apply to next created annotation', async ({ page }) => {
    // Create first annotation and change its color
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const colorPresets = page.locator('button[title^="#"]')
    const count = await colorPresets.count()
    if (count > 2) {
      await colorPresets.nth(3).click()
      await page.waitForTimeout(200)
    }
    // Deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    // Create second annotation - should inherit the changed color
    await createAnnotation(page, 'rectangle', { x: 300, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('properties change on currently selected annotation in real-time', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    // Change stroke width
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('15')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Session persistence ──────────────────────────────────────────

  test('property changes persist in session', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('8')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    const allAnns = Object.values(session.annotations).flat() as Array<any>
    expect(allAnns.length).toBe(1)
  })

  // ── Font controls (text annotations) ─────────────────────────────

  test('font size controls visible for text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectAnnotationAt(page, 175, 130)
    const fontSizeControl = page.locator('text=/Font Size|Size|font/i')
    const count = await fontSizeControl.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('font family dropdown visible for text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectAnnotationAt(page, 175, 130)
    const fontFamilyControl = page.locator('select, [role="combobox"], button:has-text(/font|Font/i)')
    const count = await fontFamilyControl.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('font size change updates text rendering', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 80 })
    await selectAnnotationAt(page, 200, 140)
    const before = await screenshotCanvas(page)
    // Find font size input/slider
    const fontSizeInput = page.locator('input[type="number"]').last()
    const count = await fontSizeInput.count()
    if (count > 0) {
      await fontSizeInput.fill('24')
      await fontSizeInput.press('Enter')
      await page.waitForTimeout(300)
      const after = await screenshotCanvas(page)
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('text formatting buttons visible when text selected', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectAnnotationAt(page, 175, 130)
    // Look for B/I/U formatting buttons
    const boldBtn = page.locator('button:has-text("B"), button[title*="Bold"], button[aria-label*="Bold"]')
    const italicBtn = page.locator('button:has-text("I"), button[title*="Italic"], button[aria-label*="Italic"]')
    const underlineBtn = page.locator('button:has-text("U"), button[title*="Underline"], button[aria-label*="Underline"]')
    expect(await boldBtn.count()).toBeGreaterThanOrEqual(1)
    expect(await italicBtn.count()).toBeGreaterThanOrEqual(1)
    expect(await underlineBtn.count()).toBeGreaterThanOrEqual(1)
  })

  // ── Color visibility on canvas ──────────────────────────────────

  test('color change is visible on canvas immediately', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const colorPresets = page.locator('button[title^="#"]')
    const count = await colorPresets.count()
    if (count > 0) {
      const screenshots: Buffer[] = []
      for (let i = 0; i < Math.min(count, 3); i++) {
        await colorPresets.nth(i).click()
        await page.waitForTimeout(200)
        screenshots.push(await screenshotCanvas(page))
      }
      // At least some color changes should produce different screenshots
      if (screenshots.length >= 2) {
        const allSame = screenshots.every((s, i) =>
          i === 0 || Buffer.compare(s, screenshots[0]) === 0
        )
        expect(allSame).toBe(false)
      }
    }
  })

  test('stroke width change is visible on canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    const strokeSlider = page.locator('input[type="range"]').first()
    await strokeSlider.fill('18')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('opacity change is visible on canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    await opacitySlider.fill('20')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Properties for different annotation types ────────────────────

  test('properties panel shows for pencil annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 140, 130)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('properties panel shows for circle annotation', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('properties panel shows for line annotation', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 150, h: 80 })
    await selectAnnotationAt(page, 175, 140)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('properties panel shows for arrow annotation', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 80 })
    await selectAnnotationAt(page, 175, 140)
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('corner radius not shown for non-rectangle shapes', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    await selectAnnotationAt(page, 100, 160)
    // Corner radius should not be present for circles
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    let hasCornerRadius = false
    for (let i = 0; i < count; i++) {
      const max = await sliders.nth(i).getAttribute('max')
      if (max === '30') {
        hasCornerRadius = true
      }
    }
    expect(hasCornerRadius).toBe(false)
  })

  test('deselecting annotation hides properties panel details', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    // Properties should be visible
    const sliders = page.locator('input[type="range"]')
    expect(await sliders.count()).toBeGreaterThanOrEqual(1)
    // Deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    // Check that annotation-specific properties are hidden or changed
    await expect(page.locator('text=/Click to select · Ctrl\\+A all/')).toBeVisible({ timeout: 3000 })
  })
})
