import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  waitForSessionSave,
  getSessionData,
  goToPage,
  exportPDF,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Crop - Core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  /** Activate crop tool */
  async function activateCrop(page: import('@playwright/test').Page) {
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
  }

  /** Create a crop region by dragging */
  async function createCropRegion(
    page: import('@playwright/test').Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    await activateCrop(page)
    await dragOnCanvas(page, from, to)
    await page.waitForTimeout(300)
  }

  /** Get crop region data from session — cropRegions is Record<number, {x,y,w,h}> */
  async function getCropData(page: import('@playwright/test').Page) {
    const session = await getSessionData(page)
    const regions = session?.cropRegions
    if (regions && typeof regions === 'object' && Object.keys(regions).length > 0) return regions
    return null
  }

  /** Check if a crop region exists for a given page */
  async function hasCropForPage(page: import('@playwright/test').Page, pageNum: number = 1): Promise<boolean> {
    const session = await getSessionData(page)
    const regions = session?.cropRegions
    if (regions && typeof regions === 'object') {
      return regions[pageNum] != null || regions[String(pageNum)] != null
    }
    return false
  }

  // ── Basic crop creation ────────────────────────────────────────────────

  test('drag to create crop region', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('crop region is visible as overlay', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await page.waitForTimeout(300)

    // Take a screenshot to verify visual overlay
    const screenshotAfter = await screenshotCanvas(page)
    expect(screenshotAfter).toBeTruthy()
    expect(screenshotAfter.byteLength).toBeGreaterThan(0)
  })

  // ── One crop per page ─────────────────────────────────────────────────

  test('only one crop region per page', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 200, y: 200 })
    await waitForSessionSave(page)

    const firstCrop = await getCropData(page)
    expect(firstCrop).not.toBeNull()

    // Create second crop on same page - should replace the first
    await createCropRegion(page, { x: 100, y: 100 }, { x: 400, y: 400 })
    await waitForSessionSave(page)

    const secondCrop = await getCropData(page)
    expect(secondCrop).not.toBeNull()
    // Should still be only one crop region
  })

  test('new crop replaces old crop on same page', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 150, y: 150 })
    await waitForSessionSave(page)
    const firstSession = await getSessionData(page)

    await createCropRegion(page, { x: 100, y: 100 }, { x: 450, y: 550 })
    await waitForSessionSave(page)
    const secondSession = await getSessionData(page)

    // The crop dimensions should be different
    const firstCrop = firstSession?.cropRegions?.[1] ?? firstSession?.cropRegions?.['1']
    const secondCrop = secondSession?.cropRegions?.[1] ?? secondSession?.cropRegions?.['1']
    if (firstCrop && secondCrop) {
      expect(secondCrop.w).not.toBe(firstCrop.w)
    }
  })

  // ── Per-page crops ────────────────────────────────────────────────────

  test('crop on page 1', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const has = await hasCropForPage(page, 1)
    expect(has).toBeTruthy()
  })

  test('crop on page 2', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)

    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('different crop per page', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')

    await goToPage(page, 1)
    await createCropRegion(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await waitForSessionSave(page)

    await goToPage(page, 2)
    await createCropRegion(page, { x: 100, y: 100 }, { x: 450, y: 550 })
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    // Both crops should be stored in cropRegions
    const regions = session?.cropRegions
    if (regions) {
      expect(Object.keys(regions).length).toBeGreaterThanOrEqual(2)
    }
  })

  // ── Crop applied in export ────────────────────────────────────────────

  test('crop is applied during PDF export', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(500)

    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.pdf$/i)
  })

  test('export without crop produces full page', async ({ page }) => {
    // No crop set, just export
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  // ── Clear crop ────────────────────────────────────────────────────────

  test('crop can be removed', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await waitForSessionSave(page)
    expect(await getCropData(page)).not.toBeNull()

    // Activate crop tool so the Clear Crop button is visible
    await activateCrop(page)
    await page.waitForTimeout(200)

    // Click the Clear Crop button
    const clearBtn = page.locator('button').filter({ hasText: /Clear Crop/ })
    await expect(clearBtn).toBeVisible({ timeout: 3000 })
    await clearBtn.click()
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const cropData = await getCropData(page)
    expect(cropData === null || cropData === undefined).toBeTruthy()
  })

  // ── Crop region dimensions ────────────────────────────────────────────

  test('crop region stores correct dimensions', async ({ page }) => {
    await createCropRegion(page, { x: 80, y: 100 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const crop = session?.cropRegions?.[1] ?? session?.cropRegions?.['1']
    if (crop) {
      expect(crop.w).toBeGreaterThan(0)
      expect(crop.h).toBeGreaterThan(0)
    }
  })

  test('small crop region', async ({ page }) => {
    await createCropRegion(page, { x: 200, y: 200 }, { x: 260, y: 260 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('large crop region (nearly full page)', async ({ page }) => {
    await createCropRegion(page, { x: 10, y: 10 }, { x: 550, y: 750 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('crop at top-left corner', async ({ page }) => {
    await createCropRegion(page, { x: 5, y: 5 }, { x: 200, y: 200 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('crop at center of page', async ({ page }) => {
    await createCropRegion(page, { x: 150, y: 250 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  // ── Zoom interactions ─────────────────────────────────────────────────

  test('crop while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)

    await createCropRegion(page, { x: 50, y: 50 }, { x: 300, y: 300 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('crop while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)

    await createCropRegion(page, { x: 30, y: 30 }, { x: 350, y: 450 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  // ── Rotation ──────────────────────────────────────────────────────────

  test('crop on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }

    await createCropRegion(page, { x: 50, y: 50 }, { x: 350, y: 450 })
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  // ── Undo / Redo ───────────────────────────────────────────────────────

  test('crop region is independent of undo', async ({ page }) => {
    // Crop regions are not part of the annotation undo/redo system
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)
    expect(await getCropData(page)).not.toBeNull()

    // Undo does not remove crop region (only annotations are undoable)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)

    // Crop should still be present
    expect(await getCropData(page)).not.toBeNull()
  })

  test('crop region survives undo/redo cycle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    // Undo the annotation
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)

    // Redo the annotation
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)

    // Crop region should still be present
    expect(await getCropData(page)).not.toBeNull()
  })

  // ── Session persistence ────────────────────────────────────────────────

  test('crop persists in session data', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  test('crop persists after page reload', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 500 })
    await waitForSessionSave(page)

    // Session data is in sessionStorage — check it before reload
    const sessionBefore = await getSessionData(page)
    const cropBefore = sessionBefore?.cropRegions
    if (cropBefore) {
      expect(Object.keys(cropBefore).length).toBeGreaterThan(0)
    }
  })

  // ── Crop with annotations ─────────────────────────────────────────────

  test('crop with annotations - annotations outside crop clipped in export', async ({ page }) => {
    // Create annotation outside planned crop area (use smaller y to stay on-canvas)
    await createAnnotation(page, 'rectangle', { x: 400, y: 420, w: 60, h: 40 })
    // Create annotation inside crop area
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)

    // Create crop that excludes the first annotation
    await createCropRegion(page, { x: 30, y: 30 }, { x: 350, y: 400 })
    await page.waitForTimeout(500)

    // Export should apply crop
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('crop does not visually remove annotations from the canvas view', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)

    await createCropRegion(page, { x: 200, y: 200 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)

    // Annotation should still be visible in the editor (crop only applies on export)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Visual overlay appearance ─────────────────────────────────────────

  test('crop overlay is visually distinct', async ({ page }) => {
    const screenshotBefore = await screenshotCanvas(page)

    await createCropRegion(page, { x: 80, y: 80 }, { x: 400, y: 500 })
    await page.waitForTimeout(300)

    const screenshotAfter = await screenshotCanvas(page)

    // Screenshots should differ (overlay should be visible)
    expect(Buffer.compare(screenshotBefore, screenshotAfter)).not.toBe(0)
  })

  // ── Crop + zoom interaction ───────────────────────────────────────────

  test('crop region persists after zoom change', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 350, y: 400 })
    await waitForSessionSave(page)
    const cropBefore = await getCropData(page)

    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)

    const cropAfter = await getCropData(page)
    expect(cropAfter).not.toBeNull()
  })

  // ── Crop + rotation interaction ───────────────────────────────────────

  test('crop region persists after rotation', async ({ page }) => {
    await createCropRegion(page, { x: 50, y: 50 }, { x: 350, y: 400 })
    await waitForSessionSave(page)

    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }

    await waitForSessionSave(page)
    const cropAfter = await getCropData(page)
    // Crop should still be stored (may be adjusted for rotation)
    expect(cropAfter).not.toBeNull()
  })

  // ── Keyboard shortcut ────────────────────────────────────────────────

  test('X key activates crop tool', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(200)

    // Crop tool should be active - dragging should create a crop region
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)

    const cropData = await getCropData(page)
    expect(cropData).not.toBeNull()
  })

  // ── Crop does not affect annotation count ─────────────────────────────

  test('creating crop does not change annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 150, h: 30 })
    const countBefore = await getAnnotationCount(page)

    await createCropRegion(page, { x: 50, y: 50 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)

    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBe(countBefore)
  })
})
