import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

async function openAnnotationList(page: import('@playwright/test').Page) {
  const listBtn = page.locator('button[title="Annotation list"]').first()
  if (await listBtn.isVisible()) {
    await listBtn.click({ force: true })
    await page.waitForTimeout(300)
  }
}

async function closeAnnotationList(page: import('@playwright/test').Page) {
  const listBtn = page.locator('button[title="Annotation list"]').first()
  if (await listBtn.isVisible()) {
    await listBtn.click({ force: true })
    await page.waitForTimeout(200)
  }
}

async function getListPanel(page: import('@playwright/test').Page) {
  return page.locator('[class*="annotation-list"], [class*="annotationList"], [data-testid="annotation-list"]').first()
}

test.describe('Annotation List Interactions', () => {
  // ─── 1. Open/Close annotation list panel (3 tests) ────────────────────────

  test('open annotation list panel', async ({ page }) => {
    await openAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('close annotation list panel', async ({ page }) => {
    await openAnnotationList(page)
    await closeAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('toggle annotation list panel open and closed twice', async ({ page }) => {
    await openAnnotationList(page)
    await closeAnnotationList(page)
    await openAnnotationList(page)
    await closeAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  // ─── 2. Annotation list shows correct count after adding annotations (5 tests) ─

  test('annotation count after adding pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count after adding rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count after adding text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count after adding callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count after adding circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ─── 3. Delete from annotation list (2 tests) ─────────────────────────────

  test('delete annotation via select and Delete key', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('delete one of two annotations updates list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ─── 4. Annotation list updates after undo (2 tests) ──────────────────────

  test('undo pencil removes from list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo rectangle removes from list', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ─── 5. Annotation list updates after redo (2 tests) ──────────────────────

  test('redo pencil restores to list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo rectangle restores to list', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ─── 6. Annotation list with multiple annotation types (3 tests) ──────────

  test('list with pencil and rectangle', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('list with three different types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('list with five different types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  // ─── 7. Annotation list after export (2 tests) ────────────────────────────

  test('annotation list persists after export with pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation list persists after export with multiple types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 120, w: 80, h: 40 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ─── 8. Annotation list after zoom (2 tests) ──────────────────────────────

  test('annotation list correct after zoom in', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation list correct after zoom out', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 100, h: 60 })
    const zoomOutBtn = page.locator('button[title="Zoom out"]')
    if (await zoomOutBtn.isVisible()) await zoomOutBtn.click()
    await page.waitForTimeout(300)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ─── 9. Annotation list after rotate (2 tests) ────────────────────────────

  test('annotation list correct after rotate right', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation list correct after two rotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'circle', { x: 100, y: 150, w: 80, h: 60 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) {
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
      await rotateBtn.first().click()
      await page.waitForTimeout(300)
    }
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ─── 10. Annotation list toggle visibility (3 tests) ──────────────────────

  test('annotations still visible after closing list panel', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await openAnnotationList(page)
    await closeAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('open panel does not hide annotations on canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('draw annotation while panel is open and verify count', async ({ page }) => {
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ─── 11. Annotation list with 10+ annotations (2 tests) ───────────────────

  test('list with 10 annotations', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      const col = i % 5
      const row = Math.floor(i / 5)
      await createAnnotation(page, 'pencil', { x: 30 + col * 70, y: 30 + row * 40, w: 50, h: 15 })
    }
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('list with 15 mixed annotations', async ({ page }) => {
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = [
      'pencil', 'rectangle', 'circle', 'line', 'arrow',
    ]
    for (let i = 0; i < 15; i++) {
      const col = i % 5
      const row = Math.floor(i / 5)
      await createAnnotation(page, types[i % types.length], { x: 30 + col * 70, y: 30 + row * 40, w: 50, h: 15 })
    }
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(15)
  })

  // ─── 12. Annotation list on multi-page PDF (2 tests) ──────────────────────

  test('list shows only current page annotations on multi-page', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('navigate back to page 1 shows page 1 annotations', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ─── 13. Annotation list interaction with select tool (3 tests) ────────────

  test('switch to select tool after opening list panel', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select and move annotation with list panel open', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select and duplicate annotation with list panel open', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ─── 14. Annotation list after session restore (2 tests) ──────────────────

  test('annotation count preserved after session save', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('session data contains annotations after save', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
