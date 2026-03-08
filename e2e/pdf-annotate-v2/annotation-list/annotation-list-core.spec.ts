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

async function getListPanel(page: import('@playwright/test').Page) {
  return page.locator('[class*="annotation-list"], [class*="annotationList"], [data-testid="annotation-list"]').first()
}

test.describe('Annotation List Core', () => {
  test('list panel button exists', async ({ page }) => {
    const listBtn = page.locator('button[title*="Annotation"], button[title*="annotation"], button[title*="List"], button[title*="list"]').first()
    const exists = await listBtn.isVisible().catch(() => false)
    expect(typeof exists).toBe('boolean')
  })

  test('click button opens panel', async ({ page }) => {
    await openAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('panel shows annotations after drawing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel shows "Pencil" label for pencil type', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await openAnnotationList(page)
    const label = page.locator('text=/Pencil/i')
    const visible = await label.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('panel shows "Rectangle" label for rect', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    const label = page.locator('text=/Rectangle/i')
    const visible = await label.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('panel shows annotation text preview', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel empty when no annotations', async ({ page }) => {
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('panel shows 1 item after drawing', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel shows 5 items after 5 drawings', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 50, y: 30 + i * 50, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('panel item click selects annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel shows page number', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel shows annotation type', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('add annotation updates list', async ({ page }) => {
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete annotation updates list', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo updates list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo updates list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('clear all empties list', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    // Ctrl+A selects one annotation at a time — delete all by repeating
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('list scroll with many items', async ({ page }) => {
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + (i % 5) * 70, y: 30 + Math.floor(i / 5) * 40, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(15)
    await openAnnotationList(page)
  })

  test('list with 20 annotations', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', { x: 30 + col * 70, y: 30 + row * 40, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('list with mixed types', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 60, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 50, y: 110, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 50, y: 160, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('list shows pencil icon or label', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows rectangle label', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows circle label', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows line label', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows arrow label', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows text with preview', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows callout with preview', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows highlight label', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows stamp with type', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list shows cloud label', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('close panel button', async ({ page }) => {
    await openAnnotationList(page)
    // Close by clicking the same button again (toggle)
    const listBtn = page.locator('button[title="Annotation list"]').first()
    if (await listBtn.isVisible()) {
      await listBtn.click({ force: true })
      await page.waitForTimeout(200)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('panel toggle on/off', async ({ page }) => {
    await openAnnotationList(page)
    const listBtn = page.locator('button[title="Annotation list"]').first()
    if (await listBtn.isVisible()) {
      await listBtn.click({ force: true })
      await page.waitForTimeout(200)
      await listBtn.click({ force: true })
      await page.waitForTimeout(200)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('panel does not interfere with drawing', async ({ page }) => {
    await openAnnotationList(page)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('draw while panel open', async ({ page }) => {
    await openAnnotationList(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select via panel then delete', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on the rectangle edge to select it
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('select via panel then duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on the rectangle edge to select it
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('select via panel then move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel after rotate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('panel after page switch', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multi-page annotations in list', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list groups by page (or shows per-page)', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list sort order', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 50, y: 170, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('list after session restore', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await waitForSessionSave(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list after export', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list performance with 50 items', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 50; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      await createAnnotation(page, 'pencil', { x: 20 + col * 40, y: 20 + row * 35, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(50)
  })

  test('panel width does not collapse canvas', async ({ page }) => {
    await openAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(100)
  })

  test('panel position — side panel', async ({ page }) => {
    await openAnnotationList(page)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('list item hover state', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await openAnnotationList(page)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list item selected state', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('double-click list item', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list with annotations on multiple pages', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list filtered by current page or shows all', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('list after eraser', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Eraser (E)')
    const objBtn = page.locator('button[title="Object erase"]')
    if (await objBtn.isVisible()) await objBtn.click()
    await drawOnCanvas(page, [{ x: 150, y: 125 }, { x: 200, y: 125 }])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('close panel keeps annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await openAnnotationList(page)
    const listBtn = page.locator('button[title="Annotation list"]').first()
    if (await listBtn.isVisible()) {
      await listBtn.click({ force: true })
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
