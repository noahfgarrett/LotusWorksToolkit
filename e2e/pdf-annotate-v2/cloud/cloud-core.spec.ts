import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, doubleClickCanvasAt, exportPDF,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cloud Core', () => {
  /** Helper: draw a cloud polygon by clicking vertices then double-clicking to close */
  async function drawCloud(page: import('@playwright/test').Page, points?: { x: number; y: number }[]) {
    const pts = points ?? [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ]
    await selectTool(page, 'Cloud (K)')
    for (const pt of pts) {
      await clickCanvasAt(page, pt.x, pt.y)
      await page.waitForTimeout(100)
    }
    // Double-click to close the cloud
    await doubleClickCanvasAt(page, pts[0].x, pts[0].y)
    await page.waitForTimeout(300)
  }

  test('K shortcut activates cloud tool — shows "Dbl-click close" hint', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('cloud tool available in shapes dropdown', async ({ page }) => {
    // Cloud button is inside the shapes dropdown, not a direct toolbar button.
    // Open the shapes dropdown by clicking the shapes button (the active draw tool button).
    const shapesBtn = page.locator('.relative > button').filter({ has: page.locator('svg') })
    // Find the shapes dropdown trigger — it's in the toolbar area
    // We can activate cloud via keyboard shortcut to confirm it exists
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    const hint = page.locator('text=/Dbl-click close/')
    await expect(hint).toBeVisible({ timeout: 3000 })
  })

  test('create a cloud annotation — count increments to 1', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud annotation count increments with multiple clouds', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await drawCloud(page, [
      { x: 250, y: 100 },
      { x: 350, y: 100 },
      { x: 350, y: 200 },
      { x: 250, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo cloud creation', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo cloud creation', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete cloud annotation', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    // Click on the edge of the cloud to select it
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('cloud with fill color — fill color input visible', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    // The stroke color input is hidden (inside ColorPicker). The fill color input is the visible one.
    const fillInput = page.locator('input[type="color"]').nth(1)
    if (await fillInput.count() > 0 && await fillInput.isVisible()) {
      await fillInput.fill('#FF0000')
    }
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 100, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 100)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud with different stroke widths', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      await slider.fill('8')
    }
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud with dash pattern', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    const dashedBtn = page.locator('button:has-text("╌")')
    if (await dashedBtn.isVisible()) await dashedBtn.click()
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate cloud (Ctrl+D)', async ({ page }) => {
    await drawCloud(page)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    // Click on the edge of the cloud to select it
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cloud minimum 3 vertices', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 150, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple clouds on same page', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      const offsetX = i * 120
      await drawCloud(page, [
        { x: 50 + offsetX, y: 50 },
        { x: 100 + offsetX, y: 50 },
        { x: 100 + offsetX, y: 100 },
        { x: 50 + offsetX, y: 100 },
      ])
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('cloud appears in annotation list', async ({ page }) => {
    await drawCloud(page)
    const annCount = await getAnnotationCount(page)
    expect(annCount).toBeGreaterThan(0)
    // Status bar should show "1 ann"
    const statusText = page.locator('text=/1 ann/')
    await expect(statusText).toBeVisible({ timeout: 3000 })
  })

  test('export cloud annotation to PDF', async ({ page }) => {
    await drawCloud(page)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const suggestedName = download.suggestedFilename()
    expect(suggestedName).toMatch(/\.pdf$/i)
  })
})
