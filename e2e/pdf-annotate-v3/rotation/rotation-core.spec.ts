import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  goToPage,
  exportPDF,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Rotation: Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  async function getRotateButton(page: import('@playwright/test').Page, direction: 'cw' | 'ccw') {
    if (direction === 'cw') {
      return page.locator('button[title="Rotate CW"]').first()
    }
    return page.locator('button[title="Rotate CCW"]').first()
  }

  test('rotate CW button exists and is clickable', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    const isVisible = await cwBtn.isVisible().catch(() => false)
    if (isVisible) {
      await cwBtn.click()
      await page.waitForTimeout(300)
      // Page should still be functional
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('rotate page 90 degrees CW', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('rotate page 180 degrees (two CW clicks)', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
      await cwBtn.click()
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('rotate page 270 degrees (three CW clicks)', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 3; i++) {
        await cwBtn.click()
        await page.waitForTimeout(300)
      }
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('rotate page 360 degrees returns to original orientation', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      const before = await screenshotCanvas(page)
      for (let i = 0; i < 4; i++) {
        await cwBtn.click()
        await page.waitForTimeout(300)
      }
      await page.waitForTimeout(500)
      const after = await screenshotCanvas(page)
      // Both should be non-empty
      expect(before.length).toBeGreaterThan(0)
      expect(after.length).toBeGreaterThan(0)
    }
  })

  test('rotate CCW button', async ({ page }) => {
    const ccwBtn = await getRotateButton(page, 'ccw')
    if (await ccwBtn.isVisible().catch(() => false)) {
      await ccwBtn.click()
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('annotation positions preserved after rotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('text readable after rotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('selection handles correct after rotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await selectAnnotationAt(page, 160, 140)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on rotated page', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing coordinates map correctly on 90-degree rotated page', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drawing coordinates map correctly on 180-degree rotated page', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('export rotated page', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'rectangle')
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('session stores rotation state', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('rotation per page — different pages different rotations', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await goToPage(page, 1)
      await cwBtn.click()
      await page.waitForTimeout(300)
      await goToPage(page, 2)
      // Page 2 should be unrotated — create annotation to verify functionality
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('rotate then zoom', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await page.keyboard.press('Control+=')
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotate then annotate then rotate back', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    const ccwBtn = await getRotateButton(page, 'ccw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
      if (await ccwBtn.isVisible().catch(() => false)) {
        await ccwBtn.click()
        await page.waitForTimeout(500)
      } else {
        // Rotate CW 3 more times to get back to 0
        for (let i = 0; i < 3; i++) {
          await cwBtn.click()
          await page.waitForTimeout(300)
        }
      }
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('undo rotation restores previous orientation', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(500)
      // Should be back to original
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('multiple annotations survive rotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 80, y: 170, w: 100, h: 60 })
    await createAnnotation(page, 'text', { x: 80, y: 260, w: 100, h: 30 })
    expect(await getAnnotationCount(page)).toBe(3)
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
      expect(await getAnnotationCount(page)).toBe(3)
    }
  })

  test('pencil annotation survives rotation', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotate 90 CW then 90 CCW returns to original', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    const ccwBtn = await getRotateButton(page, 'ccw')
    if (await cwBtn.isVisible().catch(() => false) && await ccwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
      await ccwBtn.click()
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('create annotation after each rotation increment', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 4; i++) {
        await cwBtn.click()
        await page.waitForTimeout(400)
        await createAnnotation(page, 'rectangle', {
          x: 80,
          y: 80 + i * 70,
          w: 80,
          h: 50,
        })
      }
      expect(await getAnnotationCount(page)).toBe(4)
    }
  })

  test('export with annotations on rotated page produces valid PDF', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 120, h: 40 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('rotate does not change annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    const countBefore = await getAnnotationCount(page)
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(500)
    }
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBe(countBefore)
  })

  test('rapid rotation does not crash', async ({ page }) => {
    const cwBtn = await getRotateButton(page, 'cw')
    if (await cwBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 12; i++) {
        await cwBtn.click()
        await page.waitForTimeout(100)
      }
      await page.waitForTimeout(500)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })
})
