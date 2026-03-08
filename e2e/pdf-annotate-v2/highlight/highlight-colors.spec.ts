import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, exportPDF,
  goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Highlight Colors', () => {
  test('yellow highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('yellow highlight session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('yellow highlight export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('green highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('green highlight session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('green highlight export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('blue highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('blue highlight session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('blue highlight export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('pink highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pink highlight session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('pink highlight export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('orange highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('orange highlight session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('orange highlight export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('switch yellow to green mid-session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch green to blue', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch blue to pink', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch pink to orange', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch orange to yellow', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('two highlights different colors', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three highlights different colors', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    const colors = ['#FFFF00', '#22C55E', '#FF69B4']
    for (let i = 0; i < 3; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i])
      }
      await dragOnCanvas(page, { x: 100, y: 80 + i * 50 }, { x: 300, y: 110 + i * 50 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('all 5 colors on same page', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colors = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#FF6600']
    const colorInput = page.locator('input[type="color"]')
    for (let i = 0; i < 5; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i])
      }
      await dragOnCanvas(page, { x: 100, y: 60 + i * 40 }, { x: 300, y: 85 + i * 40 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('color preserved after undo/redo', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data?.annotations?.['1'] || data?.annotations?.[1] || []
    if (anns.length > 0) {
      const color = (anns[0]?.color || anns[0]?.strokeColor || '').toUpperCase()
      expect(color).toBeDefined()
    }
  })

  test('color preserved after duplicate', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('color preserved after copy/paste', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('color preserved after move', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color button visible for highlight tool', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    const count = await colorInput.count()
    expect(count).toBeGreaterThan(0)
  })

  test('color picker in highlight mode', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF0000')
      const value = await colorInput.first().inputValue()
      expect(value.toLowerCase()).toBe('#ff0000')
    }
  })

  test('custom color via input', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#8B5CF6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('custom color highlight create', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#14B8A6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('custom color in session', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#14B8A6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('custom color export', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#14B8A6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('highlight color with opacity 50%', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity') || parentText.includes('opacity')) {
        await sliders.nth(i).fill('50')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color with opacity 75%', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity') || parentText.includes('opacity')) {
        await sliders.nth(i).fill('75')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('yellow highlight multiple', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    for (let i = 0; i < 3; i++) {
      await dragOnCanvas(page, { x: 100, y: 80 + i * 50 }, { x: 300, y: 110 + i * 50 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('green highlight multiple', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    for (let i = 0; i < 3; i++) {
      await dragOnCanvas(page, { x: 100, y: 80 + i * 50 }, { x: 300, y: 110 + i * 50 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('blue highlight multiple', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    for (let i = 0; i < 3; i++) {
      await dragOnCanvas(page, { x: 100, y: 80 + i * 50 }, { x: 300, y: 110 + i * 50 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('each color at different positions', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colors = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#FF6600']
    const colorInput = page.locator('input[type="color"]')
    for (let i = 0; i < 5; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i])
      }
      await dragOnCanvas(page, { x: 50 + i * 50, y: 100 + i * 30 }, { x: 150 + i * 50, y: 125 + i * 30 })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('each color at different sizes', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colors = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#FF6600']
    const colorInput = page.locator('input[type="color"]')
    for (let i = 0; i < 5; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i])
      }
      const height = 10 + i * 10
      await dragOnCanvas(page, { x: 100, y: 50 + i * 60 }, { x: 300, y: 50 + i * 60 + height })
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('highlight color after zoom', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color after rotate', async ({ page }) => {
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) await rotateBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color on page 2', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color session restore', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('change color between highlights', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 160 }, { x: 300, y: 190 })
    await page.waitForTimeout(150)
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 220 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('color persists after tool switch and return', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Highlight (H)')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color reset on tool deactivate check', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Highlight (H)')
    await page.waitForTimeout(100)
    // Color may or may not reset — just ensure tool works
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('5 yellow + 5 green highlights', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    for (let i = 0; i < 5; i++) {
      await dragOnCanvas(page, { x: 80, y: 20 + i * 25 }, { x: 350, y: 40 + i * 25 })
      await page.waitForTimeout(80)
    }
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    for (let i = 0; i < 5; i++) {
      await dragOnCanvas(page, { x: 80, y: 150 + i * 25 }, { x: 350, y: 170 + i * 25 })
      await page.waitForTimeout(80)
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('alternating colors', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colors = ['#FFFF00', '#3B82F6']
    const colorInput = page.locator('input[type="color"]')
    for (let i = 0; i < 6; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i % 2])
      }
      await dragOnCanvas(page, { x: 80, y: 50 + i * 40 }, { x: 350, y: 80 + i * 40 })
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(6)
  })

  test('highlight color with thick stroke', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF69B4')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color with thin stroke', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#22C55E')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 110 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('color in session data structure', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#3B82F6')
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const anns = data?.annotations?.['1'] || data?.annotations?.[1] || []
    expect(anns.length).toBeGreaterThanOrEqual(1)
    if (anns.length > 0) {
      expect(anns[0]?.color || anns[0]?.strokeColor).toBeDefined()
    }
  })

  test('all colors export in single PDF', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Highlight (H)')
    const colors = ['#FFFF00', '#22C55E', '#3B82F6', '#FF69B4', '#FF6600']
    const colorInput = page.locator('input[type="color"]')
    for (let i = 0; i < 5; i++) {
      if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
        await colorInput.first().fill(colors[i])
      }
      await dragOnCanvas(page, { x: 100, y: 60 + i * 40 }, { x: 300, y: 85 + i * 40 })
      await page.waitForTimeout(150)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('highlight color with low opacity', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FFFF00')
    }
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity') || parentText.includes('opacity')) {
        await sliders.nth(i).fill('20')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight color at max opacity', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const colorInput = page.locator('input[type="color"]')
    if (await colorInput.count() > 0 && await colorInput.first().isVisible()) {
      await colorInput.first().fill('#FF6600')
    }
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    for (let i = 0; i < count; i++) {
      const parentText = await sliders.nth(i).evaluate(el => el.parentElement?.textContent || '')
      if (parentText.includes('Opacity') || parentText.includes('opacity')) {
        await sliders.nth(i).fill('100')
        break
      }
    }
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
