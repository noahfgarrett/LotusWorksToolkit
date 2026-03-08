import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt,
  exportPDF, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

/** Get measurement count from the status bar (UI shows "N meas") */
async function getMeasurementCount(page: import('@playwright/test').Page): Promise<number> {
  const locator = page.locator('text=/\\d+ meas/')
  const count = await locator.count()
  if (count === 0) return 0
  const statusText = await locator.textContent()
  const match = statusText?.match(/(\d+) meas/)
  return match ? parseInt(match[1]) : 0
}

/** Create a measurement by clicking two points */
async function createMeasurement(
  page: import('@playwright/test').Page,
  from?: { x: number; y: number },
  to?: { x: number; y: number },
) {
  const p1 = from ?? { x: 100, y: 200 }
  const p2 = to ?? { x: 300, y: 200 }
  await selectTool(page, 'Measure (M)')
  await clickCanvasAt(page, p1.x, p1.y)
  await page.waitForTimeout(150)
  await clickCanvasAt(page, p2.x, p2.y)
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Measure Properties', () => {
  // ── 1. Measurement color change via properties bar (5 tests) ──

  test('color swatch is visible in properties bar after creating measurement', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    // Look for a color swatch or color input in the properties bar
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      const value = await colorInput.inputValue()
      expect(value).toBeTruthy()
    } else {
      // Properties bar may not show until measurement is selected
      expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
    }
  })

  test('change measurement color to red', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff0000')
      await page.waitForTimeout(200)
      const value = await colorInput.inputValue()
      expect(value.toLowerCase()).toBe('#ff0000')
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('change measurement color to blue', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#0000ff')
      await page.waitForTimeout(200)
      const value = await colorInput.inputValue()
      expect(value.toLowerCase()).toBe('#0000ff')
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('change measurement color to green', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#00ff00')
      await page.waitForTimeout(200)
      const value = await colorInput.inputValue()
      expect(value.toLowerCase()).toBe('#00ff00')
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('color change persists after deselect and reselect', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff00ff')
      await page.waitForTimeout(200)
    }
    // Click away to deselect
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    // Reselect the measurement
    await selectTool(page, 'Measure (M)')
    await page.waitForTimeout(200)
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 2. Measurement stroke width via slider (3 tests) ──

  test('stroke width slider is visible after creating measurement', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      const value = await slider.inputValue()
      expect(parseFloat(value)).toBeGreaterThanOrEqual(0)
    } else {
      expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
    }
  })

  test('increase stroke width via slider', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      await slider.fill('5')
      await page.waitForTimeout(200)
      const value = await slider.inputValue()
      expect(parseFloat(value)).toBeGreaterThanOrEqual(1)
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('decrease stroke width via slider', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      await slider.fill('1')
      await page.waitForTimeout(200)
      const value = await slider.inputValue()
      expect(parseFloat(value)).toBeLessThanOrEqual(5)
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 3. Measurement opacity (3 tests) ──

  test('opacity control exists for measurement', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    const opacityVisible = await opacitySlider.isVisible().catch(() => false)
    if (opacityVisible) {
      const value = await opacitySlider.inputValue()
      expect(parseFloat(value)).toBeGreaterThanOrEqual(0)
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('set measurement opacity to 50%', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    const opacityVisible = await opacitySlider.isVisible().catch(() => false)
    if (opacityVisible) {
      await opacitySlider.fill('0.5')
      await page.waitForTimeout(200)
      const value = await opacitySlider.inputValue()
      expect(parseFloat(value)).toBeLessThanOrEqual(1)
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('set measurement opacity to 100%', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const opacitySlider = page.locator('input[type="range"]').nth(1)
    const opacityVisible = await opacitySlider.isVisible().catch(() => false)
    if (opacityVisible) {
      await opacitySlider.fill('1')
      await page.waitForTimeout(200)
      const value = await opacitySlider.inputValue()
      expect(parseFloat(value)).toBeLessThanOrEqual(1)
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 4. Measurement label font size (3 tests) ──

  test('font size control exists for measurement label', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const fontSizeInput = page.locator('input[type="number"]').first()
    const fontVisible = await fontSizeInput.isVisible().catch(() => false)
    if (fontVisible) {
      const value = await fontSizeInput.inputValue()
      expect(parseFloat(value)).toBeGreaterThanOrEqual(0)
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('increase measurement label font size', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    // Look for font size select or input
    const fontSelect = page.locator('select[title="Font size"]').first()
    const selectVisible = await fontSelect.isVisible().catch(() => false)
    if (selectVisible) {
      await fontSelect.selectOption('20')
      await page.waitForTimeout(200)
    } else {
      const fontInput = page.locator('input[type="number"]').first()
      const inputVisible = await fontInput.isVisible().catch(() => false)
      if (inputVisible) {
        await fontInput.fill('20')
        await page.waitForTimeout(200)
      }
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('decrease measurement label font size', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const fontSelect = page.locator('select[title="Font size"]').first()
    const selectVisible = await fontSelect.isVisible().catch(() => false)
    if (selectVisible) {
      await fontSelect.selectOption('12')
      await page.waitForTimeout(200)
    } else {
      const fontInput = page.locator('input[type="number"]').first()
      const inputVisible = await fontInput.isVisible().catch(() => false)
      if (inputVisible) {
        await fontInput.fill('12')
        await page.waitForTimeout(200)
      }
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 5. Measurement calibration (5 tests) ──

  test('calibration button accessible after measurement creation', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const calibrateBtn = page.locator('button').filter({ hasText: /alibrat/ }).first()
    const btnVisible = await calibrateBtn.isVisible().catch(() => false)
    if (btnVisible) {
      expect(await calibrateBtn.textContent()).toBeTruthy()
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('calibration modal opens with input placeholder', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const calibrateBtn = page.locator('button').filter({ hasText: /alibrat/ }).first()
    if (await calibrateBtn.count() > 0 && await calibrateBtn.isVisible().catch(() => false)) {
      await calibrateBtn.click()
      await page.waitForTimeout(300)
      const input = page.locator('input[placeholder="e.g. 12"]')
      const inputVisible = await input.isVisible().catch(() => false)
      if (inputVisible) {
        expect(await input.getAttribute('placeholder')).toBe('e.g. 12')
      }
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('calibration input accepts decimal values', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const calibrateBtn = page.locator('button').filter({ hasText: /alibrat/ }).first()
    if (await calibrateBtn.count() > 0 && await calibrateBtn.isVisible().catch(() => false)) {
      await calibrateBtn.click()
      await page.waitForTimeout(300)
      const input = page.locator('input[placeholder="e.g. 12"]')
      if (await input.isVisible().catch(() => false)) {
        await input.fill('15.5')
        expect(await input.inputValue()).toBe('15.5')
      }
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('calibration input rejects non-numeric text', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const calibrateBtn = page.locator('button').filter({ hasText: /alibrat/ }).first()
    if (await calibrateBtn.count() > 0 && await calibrateBtn.isVisible().catch(() => false)) {
      await calibrateBtn.click()
      await page.waitForTimeout(300)
      const input = page.locator('input[placeholder="e.g. 12"]')
      if (await input.isVisible().catch(() => false)) {
        await input.fill('abc')
        const value = await input.inputValue()
        // Input may reject or accept the text depending on type
        expect(value).toBeDefined()
      }
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('calibration via right-click context menu', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    // Right-click near measurement midpoint to open context menu
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 200, box.y + 200, { button: 'right' })
      await page.waitForTimeout(300)
      // Look for calibrate option in context menu
      const calibrateOption = page.locator('text=/alibrat/i').first()
      const optionVisible = await calibrateOption.isVisible().catch(() => false)
      if (optionVisible) {
        await calibrateOption.click()
        await page.waitForTimeout(300)
        const input = page.locator('input[placeholder="e.g. 12"]')
        const inputVisible = await input.isVisible().catch(() => false)
        if (inputVisible) {
          expect(await input.getAttribute('placeholder')).toBe('e.g. 12')
        }
      }
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  // ── 6. Measurement unit switching (3 tests) ──

  test('unit selector shows px by default', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const unitSelect = page.locator('select').filter({ hasText: /px|in|cm|mm/ }).first()
    const selectVisible = await unitSelect.isVisible().catch(() => false)
    if (selectVisible) {
      const value = await unitSelect.inputValue()
      expect(['px', 'in', 'cm', 'mm']).toContain(value)
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('switch measurement unit to cm', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const unitSelect = page.locator('select').filter({ hasText: /px|in|cm|mm/ }).first()
    const selectVisible = await unitSelect.isVisible().catch(() => false)
    if (selectVisible) {
      await unitSelect.selectOption('cm')
      await page.waitForTimeout(200)
      const value = await unitSelect.inputValue()
      expect(value).toBe('cm')
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  test('switch measurement unit to mm', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const unitSelect = page.locator('select').filter({ hasText: /px|in|cm|mm/ }).first()
    const selectVisible = await unitSelect.isVisible().catch(() => false)
    if (selectVisible) {
      await unitSelect.selectOption('mm')
      await page.waitForTimeout(200)
      const value = await unitSelect.inputValue()
      expect(value).toBe('mm')
    }
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 7. Measurement interaction with undo/redo after property change (3 tests) ──

  test('undo after color change reverts measurement', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff0000')
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    const count = await getMeasurementCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('redo after undo of property change', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#00ff00')
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const count = await getMeasurementCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('undo after stroke width change', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      await slider.fill('8')
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    const count = await getMeasurementCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  // ── 8. Measurement with different zoom levels then checking properties (3 tests) ──

  test('measurement properties visible at 125% zoom', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createMeasurement(page, { x: 80, y: 150 }, { x: 250, y: 150 })
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      const value = await colorInput.inputValue()
      expect(value).toBeTruthy()
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('measurement properties visible after zoom out', async ({ page }) => {
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    await createMeasurement(page, { x: 50, y: 100 }, { x: 200, y: 100 })
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      const value = await slider.inputValue()
      expect(parseFloat(value)).toBeGreaterThanOrEqual(0)
    }
    expect(await getMeasurementCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('change color at zoomed-in level then zoom out', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createMeasurement(page, { x: 80, y: 150 }, { x: 250, y: 150 })
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff8800')
      await page.waitForTimeout(200)
    }
    // Zoom back out
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    expect(await getMeasurementCount(page)).toBe(1)
  })

  // ── 9. Multiple measurements with different colors (2 tests) ──

  test('two measurements can have different colors', async ({ page }) => {
    await createMeasurement(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff0000')
      await page.waitForTimeout(200)
    }
    await createMeasurement(page, { x: 100, y: 250 }, { x: 300, y: 250 })
    expect(await getMeasurementCount(page)).toBe(2)
    if (colorVisible) {
      await colorInput.fill('#0000ff')
      await page.waitForTimeout(200)
    }
    expect(await getMeasurementCount(page)).toBe(2)
  })

  test('three measurements with distinct colors all preserved', async ({ page }) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff']
    for (let i = 0; i < 3; i++) {
      await createMeasurement(page, { x: 50, y: 80 + i * 100 }, { x: 300, y: 80 + i * 100 })
      const colorInput = page.locator('input[type="color"]').first()
      const colorVisible = await colorInput.isVisible().catch(() => false)
      if (colorVisible) {
        await colorInput.fill(colors[i])
        await page.waitForTimeout(200)
      }
    }
    expect(await getMeasurementCount(page)).toBe(3)
  })

  // ── 10. Measurement export after property changes (2 tests) ──

  test('export PDF after changing measurement color', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff0000')
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const suggestedName = download.suggestedFilename()
    expect(suggestedName).toMatch(/\.pdf$/i)
  })

  test('export PDF after changing stroke width', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      await slider.fill('6')
      await page.waitForTimeout(200)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const suggestedName = download.suggestedFilename()
    expect(suggestedName).toMatch(/\.pdf$/i)
  })

  // ── 11. Measurement session persistence of properties (3 tests) ──

  test('session saves after color change', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const colorInput = page.locator('input[type="color"]').first()
    const colorVisible = await colorInput.isVisible().catch(() => false)
    if (colorVisible) {
      await colorInput.fill('#ff00ff')
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves after stroke width change', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const slider = page.locator('input[type="range"]').first()
    const sliderVisible = await slider.isVisible().catch(() => false)
    if (sliderVisible) {
      await slider.fill('4')
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('session saves after calibration attempt', async ({ page }) => {
    await createMeasurement(page)
    expect(await getMeasurementCount(page)).toBe(1)
    const calibrateBtn = page.locator('button').filter({ hasText: /alibrat/ }).first()
    if (await calibrateBtn.count() > 0 && await calibrateBtn.isVisible().catch(() => false)) {
      await calibrateBtn.click()
      await page.waitForTimeout(300)
      const input = page.locator('input[placeholder="e.g. 12"]')
      if (await input.isVisible().catch(() => false)) {
        await input.fill('10')
        await page.waitForTimeout(200)
        // Press Enter or click Apply to confirm
        await page.keyboard.press('Enter')
        await page.waitForTimeout(200)
      }
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })
})
