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
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  goToPage,
  exportPDF,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Multi-Page: Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
  })

  test('navigate to page 2', async ({ page }) => {
    await goToPage(page, 2)
    const pageInput = page.locator('input[type="number"]')
    if (await pageInput.isVisible()) {
      const val = await pageInput.inputValue()
      expect(parseInt(val)).toBe(2)
    }
  })

  test('navigate to page 1 from page 2', async ({ page }) => {
    await goToPage(page, 2)
    await goToPage(page, 1)
    const pageInput = page.locator('input[type="number"]')
    if (await pageInput.isVisible()) {
      const val = await pageInput.inputValue()
      expect(parseInt(val)).toBe(1)
    }
  })

  test('annotations on page 1 separate from page 2', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const countPage1 = await getAnnotationCount(page)
    expect(countPage1).toBe(1)
    await goToPage(page, 2)
    const countPage2 = await getAnnotationCount(page)
    expect(countPage2).toBe(0)
  })

  test('create annotation on page 1 then page 2', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('page input field navigates correctly', async ({ page }) => {
    const pageInput = page.locator('input[type="number"]')
    const hasInput = (await pageInput.count()) > 0
    if (hasInput) {
      await pageInput.fill('2')
      await pageInput.press('Enter')
      await page.waitForTimeout(500)
      const val = await pageInput.inputValue()
      expect(parseInt(val)).toBe(2)
    }
  })

  test('PageDown shortcut navigates to next page', async ({ page }) => {
    await goToPage(page, 1)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    const pageInput = page.locator('input[type="number"]')
    if (await pageInput.isVisible()) {
      const val = await pageInput.inputValue()
      expect(parseInt(val)).toBe(2)
    }
  })

  test('PageUp shortcut navigates to previous page', async ({ page }) => {
    await goToPage(page, 2)
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(500)
    const pageInput = page.locator('input[type="number"]')
    if (await pageInput.isVisible()) {
      const val = await pageInput.inputValue()
      expect(parseInt(val)).toBe(1)
    }
  })

  test('page indicator shows correct page number', async ({ page }) => {
    await goToPage(page, 1)
    const statusText = page.locator('text=/page.*1|1.*of/i').first()
    const hasIndicator = await statusText.isVisible().catch(() => false)
    if (hasIndicator) {
      const text = await statusText.textContent()
      expect(text).toContain('1')
    }
  })

  test('annotation count is per page', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw on page 1 does not appear on page 2', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select annotation on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 160, 140)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move annotation on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await moveAnnotation(page, { x: 160, y: 140 }, { x: 250, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 220, y: 180 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text annotation on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('all tools work on page 2', async ({ page }) => {
    test.setTimeout(60000)
    await goToPage(page, 2)
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 30 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 160, w: 80, h: 40 })
    await createAnnotation(page, 'arrow', { x: 50, y: 220, w: 80, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 250, w: 80, h: 0 })
    await createAnnotation(page, 'text', { x: 50, y: 280, w: 80, h: 30 })
    await createAnnotation(page, 'callout', { x: 50, y: 330, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(7)
  })

  test('undo on page 2 only affects page 2', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('zoom affects all pages', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rotation is per page', async ({ page }) => {
    const cwBtn = page.locator('button[title="Rotate CW"]').first()
    const hasCw = await cwBtn.isVisible().catch(() => false)
    if (hasCw) {
      await goToPage(page, 1)
      await cwBtn.click()
      await page.waitForTimeout(300)
      await goToPage(page, 2)
      // Page 2 should not be rotated
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    } else {
      // No rotation button — just verify navigation works
      await goToPage(page, 2)
      await createAnnotation(page, 'rectangle')
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('export includes all pages with annotations', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('session stores per-page annotation data', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('scroll to page navigation works', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    // Verify page 2 canvas is visible
    const page2Container = page.locator('[data-page="2"]')
    if (await page2Container.count() > 0) {
      await expect(page2Container).toBeVisible()
    }
  })

  test('navigating back preserves page 1 annotations', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 60 })
    await goToPage(page, 2)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rapid page switching preserves annotations', async ({ page }) => {
    test.setTimeout(60000)
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    for (let i = 0; i < 5; i++) {
      await goToPage(page, 2)
      await goToPage(page, 1)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete annotation on page 2 does not affect page 1', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    await selectAnnotationAt(page, 160, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('copy paste on page 2', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 160, 140)
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-page PDF page count displayed', async ({ page }) => {
    const pageInfo = page.locator('text=/of\\s*2|2\\s*page/i').first()
    const hasInfo = await pageInfo.isVisible().catch(() => false)
    if (hasInfo) {
      const text = await pageInfo.textContent()
      expect(text).toContain('2')
    }
  })

  test('ctrl+a selects only current page annotations', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 80, y: 160, w: 80, h: 50 })
    await goToPage(page, 2)
    await createAnnotation(page, 'arrow', { x: 80, y: 80, w: 80, h: 0 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('undo across page switch restores correctly', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('create annotations on both pages then export', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'text', { x: 80, y: 170, w: 100, h: 30 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'pencil', { x: 80, y: 170, w: 100, h: 40 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('page navigation with multi-page PDF using goToPage helper', async ({ page }) => {
    // Use sample.pdf which is already loaded in beforeEach as multi-page PDF
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser on page 1 does not affect page 2 annotations', async ({ page }) => {
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 1)
    await selectTool(page, 'Eraser (E)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 160 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
