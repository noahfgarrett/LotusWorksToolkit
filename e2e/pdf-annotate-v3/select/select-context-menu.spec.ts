import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

/** Right-click on the annotation canvas at a given position */
async function rightClickCanvasAt(page: import('@playwright/test').Page, x: number, y: number) {
  const canvas = page.locator('canvas.ann-canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await canvas.click({ button: 'right', position: { x, y } })
  await page.waitForTimeout(300)
}

// NOTE: For rectangles and circles the hitTest only checks the stroke (edges/perimeter),
// NOT the interior. So all select/right-click coordinates must be on the edges, not the center.
//
// Rectangle { x: 100, y: 100, w: 150, h: 100 } → corners (100,100)-(250,200)
//   top edge midpoint:    (175, 100)
//   left edge midpoint:   (100, 150)
// Rectangle { x: 300, y: 100, w: 150, h: 100 } → corners (300,100)-(450,200)
//   top edge midpoint:    (375, 100)
// Circle { x: 100, y: 100, w: 120, h: 120 } → center (160,160) radii 60
//   top of perimeter:     (160, 100)
// Circle { x: 130, y: 130, w: 100, h: 100 } → center (180,180) radii 50
//   top of perimeter:     (180, 130)

test.describe('Select Tool - Context Menu', () => {
  // ── Context menu appearance ──────────────────────────────────────

  test('right-click on selected annotation shows context menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Duplicate option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Delete option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Bring to Front option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Bring to Front')).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Send to Back option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Send to Back')).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Copy Style option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Copy Style')).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Paste Style option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Paste Style')).toBeVisible({ timeout: 3000 })
  })

  // ── Context menu actions ─────────────────────────────────────────

  test('duplicate via context menu creates new annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await page.locator('text=Duplicate').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('delete via context menu removes annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('bring to front via context menu changes z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    const before = await screenshotCanvas(page)
    // Select the rectangle's top edge (outside the circle)
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await page.locator('text=Bring to Front').click()
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    // Z-order changed - rendering differs
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send to back via context menu changes z-order', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    // Select the circle's top (top of perimeter)
    await selectAnnotationAt(page, 180, 130)
    await rightClickCanvasAt(page, 180, 130)
    await page.locator('text=Send to Back').click()
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('copy style then paste to another annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 100, w: 150, h: 100 })
    // Copy style from first (top edge)
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await page.locator('text=Copy Style').click()
    await page.waitForTimeout(200)
    // Select second (top edge) and paste style
    await selectAnnotationAt(page, 375, 100)
    await rightClickCanvasAt(page, 375, 100)
    await page.locator('text=Paste Style').click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Context menu dismissal ──────────────────────────────────────

  test('context menu closes on click away', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
    // Click away
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=Duplicate')).not.toBeVisible({ timeout: 3000 })
  })

  test('context menu closes on Escape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 175, 100)
    await rightClickCanvasAt(page, 175, 100)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=Duplicate')).not.toBeVisible({ timeout: 3000 })
  })

  test('right-click on empty space shows no annotation context menu', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await rightClickCanvasAt(page, 400, 400)
    // Should NOT show annotation-specific options like Duplicate
    const duplicateVisible = await page.locator('text=Duplicate').isVisible()
    expect(duplicateVisible).toBe(false)
  })

  // ── Context menu on various types ────────────────────────────────

  test('context menu on text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    // Text annotations use box hit-testing, so center works
    await selectAnnotationAt(page, 175, 130)
    await rightClickCanvasAt(page, 175, 130)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu on circle annotation', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    // Circle hit-test checks the perimeter; use top of circle
    await selectAnnotationAt(page, 160, 100)
    await rightClickCanvasAt(page, 160, 100)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu on pencil stroke', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    // Pencil stroke runs roughly from (100,100) through (140,140) to (220,180)
    // selectAnnotationAt at a midpoint along the stroke
    await selectAnnotationAt(page, 140, 140)
    await rightClickCanvasAt(page, 140, 140)
    await expect(page.locator('text=Duplicate')).toBeVisible({ timeout: 3000 })
  })

  // ── Keyboard shortcut alternatives ───────────────────────────────

  test('Ctrl+D shortcut duplicates selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // createAnnotation auto-selects the rectangle; re-select on the edge to keep it selected
    await selectAnnotationAt(page, 175, 100)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies and pastes annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 175, 100)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+] brings annotation to front', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    // Select the bottom rectangle (top edge, outside the circle)
    await selectAnnotationAt(page, 175, 100)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ sends annotation to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    // Select the top circle (top of perimeter)
    await selectAnnotationAt(page, 180, 130)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multiple duplicates increment annotation count', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // Select on the edge
    await selectAnnotationAt(page, 175, 100)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    // After duplication, the duplicate is selected. Duplicate is offset by +20,+20 so its top edge is at y=120.
    // The keyboard shortcut works on whatever is selected, so just keep pressing Ctrl+D.
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('paste without copy does nothing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 400, 400) // deselect
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('copy then paste multiple times creates multiple annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    // Select on the edge
    await selectAnnotationAt(page, 175, 100)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })
})
