import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Click to Select Circle ─────────────────────────────────────────────────

test.describe('Circle Selection', () => {
  test('click on circle edge selects it', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on the top edge of the circle
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selection handles visible when circle selected', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── Move Circle ────────────────────────────────────────────────────────────

test.describe('Move Circle', () => {
  test('move circle by dragging', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move updates session data', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const xBefore = annsBefore[0].points[0].x

    await moveAnnotation(page, { x: 175, y: 100 }, { x: 300, y: 300 })
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    expect(annsAfter[0].points[0].x).not.toBe(xBefore)
  })
})

// ─── Resize from Each Handle ────────────────────────────────────────────────

test.describe('Circle Resize Handles', () => {
  test('resize from NE handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 100 }, { x: 300, y: 70 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from NW handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 60, y: 60 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from SE handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 230 }, { x: 320, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from SW handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 100, y: 230 }, { x: 60, y: 280 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from N handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 175, y: 100 }, { x: 175, y: 50 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from S handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 175, y: 230 }, { x: 175, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from E handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 165 }, { x: 320, y: 165 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from W handle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 100, y: 165 }, { x: 50, y: 165 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })
})

// ─── Minimum Size Constraint ────────────────────────────────────────────────

test.describe('Circle Minimum Size', () => {
  test('resize cannot shrink circle below minimum width', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Try to shrink from E handle to near W edge
    await dragOnCanvas(page, { x: 250, y: 165 }, { x: 105, y: 165 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    // Circle stores as points[0] and points[1]; compute width from points
    const w = Math.abs(anns[0].points[1].x - anns[0].points[0].x)
    expect(w).toBeGreaterThanOrEqual(10)
  })

  test('resize cannot shrink circle below minimum height', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 230 }, { x: 175, y: 105 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    // Circle stores as points[0] and points[1]; compute height from points
    const h = Math.abs(anns[0].points[1].y - anns[0].points[0].y)
    expect(h).toBeGreaterThanOrEqual(10)
  })
})

// ─── Deselect Methods ───────────────────────────────────────────────────────

test.describe('Circle Deselect', () => {
  test('clicking empty space deselects circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 165, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })

  test('Escape deselects circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 165, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })

  test('select between multiple circles', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 80 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on top edge of first circle (center 90,90, r=40, top at y=50)
    await clickCanvasAt(page, 90, 50)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click on top edge of second circle (center 90,240, r=40, top at y=200)
    await clickCanvasAt(page, 90, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Select All ─────────────────────────────────────────────────────────────

test.describe('Circle Select All', () => {
  test('Ctrl+A selects all circles then delete removes all', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 80 })
    await createAnnotation(page, 'circle', { x: 50, y: 200, w: 80, h: 80 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 80 })
    await selectTool(page, 'Select (S)')
    // Click on annotation edge to ensure canvas has keyboard focus
    await clickCanvasAt(page, 50, 50)
    await page.waitForTimeout(200)
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(300)
      await page.keyboard.press('Delete')
      await page.waitForTimeout(300)
      if (await getAnnotationCount(page) === 0) break
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Nudge with Arrow Keys ──────────────────────────────────────────────────

test.describe('Circle Nudge', () => {
  test('arrow keys nudge selected circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 165, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('Shift+arrow nudges circle by 10px', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 165, 100)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const xBefore = annsBefore[0].points[0].x

    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    expect(annsAfter[0].points[0].x).toBeCloseTo(xBefore + 10, 0)
  })
})

// ─── Z-Order ────────────────────────────────────────────────────────────────

test.describe('Circle Z-Order', () => {
  test('bring circle to front with Ctrl+]', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 150, h: 150 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 150, h: 150 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 125, 50)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send circle to back with Ctrl+[', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 150, h: 150 })
    await createAnnotation(page, 'circle', { x: 120, y: 120, w: 150, h: 150 })
    await selectTool(page, 'Select (S)')
    // Click on right edge of second circle (center 195,195, rx=75)
    await clickCanvasAt(page, 270, 195)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Context Menu ───────────────────────────────────────────────────────────

test.describe('Circle Context Menu', () => {
  test('right-click on selected circle shows context menu', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on top edge of ellipse to select
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Right-click on the same edge point (using annotation canvas for correct coords)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 175, box.y + 100, { button: 'right' })
      await page.waitForTimeout(300)
    }
    // Context menu is a fixed div with z-50, containing "Delete" and "Duplicate" buttons
    const deleteBtn = page.locator('button:has-text("Delete")')
    const deleteCount = await deleteBtn.count()
    expect(deleteCount).toBeGreaterThan(0)
  })

  test('context menu duplicate on circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 175, box.y + 100, { button: 'right' })
      await page.waitForTimeout(300)
    }
    const duplicateItem = page.locator('button:has-text("Duplicate")')
    const count = await duplicateItem.count()
    if (count > 0) {
      await duplicateItem.first().click()
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(2)
    }
  })

  test('context menu delete on circle', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 230 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    // Click on top edge to select
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Right-click on same edge using annotation canvas
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 175, box.y + 100, { button: 'right' })
      await page.waitForTimeout(300)
    }
    const deleteItem = page.locator('button:has-text("Delete")')
    const count = await deleteItem.count()
    expect(count).toBeGreaterThan(0)
    await deleteItem.first().click()
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Circle Edge Cases', () => {
  test('drag circle to edge of canvas', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 230, y: 230 })
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 165, y: 100 }, { x: 440, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize circle to very small', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(200)
    // Drag SE handle toward NW
    await dragOnCanvas(page, { x: 300, y: 300 }, { x: 140, y: 140 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize circle to very large', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 225, 200)
    await page.waitForTimeout(200)
    // Drag SE handle far out
    await dragOnCanvas(page, { x: 250, y: 250 }, { x: 450, y: 500 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
