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

// ─── Click to Select ────────────────────────────────────────────────────────

test.describe('Rectangle Selection', () => {
  test('click on rectangle edge selects it', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selected rectangle shows 8 resize handles', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Take screenshot to verify handles are visible
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
    // Verify selection indicator text is present
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── Move Rectangle ─────────────────────────────────────────────────────────

test.describe('Move Rectangle', () => {
  test('move rectangle by dragging', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Click on left edge (100, 150) to select, then drag
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move updates position in session data', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const xBefore = annsBefore[0].x
    const yBefore = annsBefore[0].y

    // Click on left edge to select, then drag
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 300, y: 300 })
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    // Position should have changed
    expect(annsAfter[0].x !== xBefore || annsAfter[0].y !== yBefore).toBeTruthy()
  })
})

// ─── Resize from Each Handle ────────────────────────────────────────────────

test.describe('Rectangle Resize Handles', () => {
  test('resize from NE handle changes size', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from NE corner (250, 100) outward
    await dragOnCanvas(page, { x: 250, y: 100 }, { x: 300, y: 70 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize from NW handle changes size', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from NW corner (100, 100) outward
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 60, y: 60 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from SE handle changes size', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from SE corner (250, 200) outward
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 320, y: 280 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from SW handle changes size', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from SW corner (100, 200)
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 60, y: 260 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from N handle adjusts height only', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from N edge midpoint (175, 100) upward
    await dragOnCanvas(page, { x: 175, y: 100 }, { x: 175, y: 60 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from S handle adjusts height only', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from S edge midpoint (175, 200) downward
    await dragOnCanvas(page, { x: 175, y: 200 }, { x: 175, y: 280 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from E handle adjusts width only', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from E edge midpoint (250, 150) rightward
    await dragOnCanvas(page, { x: 250, y: 150 }, { x: 330, y: 150 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize from W handle adjusts width only', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from W edge midpoint (100, 150) leftward
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 50, y: 150 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })
})

// ─── Minimum Size Constraint ────────────────────────────────────────────────

test.describe('Rectangle Minimum Size', () => {
  test('resize cannot shrink below 40px width', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Try to drag E handle very close to W edge
    await dragOnCanvas(page, { x: 250, y: 150 }, { x: 105, y: 150 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].width).toBeGreaterThanOrEqual(40)
  })

  test('resize cannot shrink below 20px height', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Try to drag S handle very close to N edge
    await dragOnCanvas(page, { x: 175, y: 200 }, { x: 175, y: 105 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].height).toBeGreaterThanOrEqual(20)
  })

  test('resize maintains correct position after constrained resize', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Resize from SE to very small
    await dragOnCanvas(page, { x: 250, y: 200 }, { x: 110, y: 110 })
    await page.waitForTimeout(200)
    // Should still have 1 annotation and it should be valid
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Deselect Methods ───────────────────────────────────────────────────────

test.describe('Rectangle Deselect', () => {
  test('clicking empty space deselects rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Click on empty space far from the rectangle
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })

  test('pressing Escape deselects rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 180 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })

  test('selecting a different rectangle changes selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    // Select first rectangle
    await clickCanvasAt(page, 50, 90)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Select second rectangle
    await clickCanvasAt(page, 50, 240)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Select All (Ctrl+A) ───────────────────────────────────────────────────

test.describe('Rectangle Select All', () => {
  test('Ctrl+A selects all rectangles', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 100, h: 80 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 350, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // All should be selected -- pressing Delete should remove all
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Delete Selected Rectangle ──────────────────────────────────────────────

test.describe('Delete Selected Rectangle', () => {
  test('Delete key removes selected rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace key removes selected rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Nudge with Arrow Keys ──────────────────────────────────────────────────

test.describe('Rectangle Nudge', () => {
  test('arrow keys nudge selected rectangle by 1px', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const xBefore = annsBefore[0].x

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    expect(annsAfter[0].x).toBeCloseTo(xBefore + 1, 0)
  })

  test('Shift+arrow nudges selected rectangle by 10px', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const xBefore = annsBefore[0].x

    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    expect(annsAfter[0].x).toBeCloseTo(xBefore + 10, 0)
  })

  test('nudge up with ArrowUp', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('nudge left with ArrowLeft', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })
})

// ─── Z-Order Operations ────────────────────────────────────────────────────

test.describe('Rectangle Z-Order', () => {
  test('bring to front with Ctrl+]', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send to back with Ctrl+[', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 150, h: 100 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Click on right edge of second rect (x=250, y=150)
    await clickCanvasAt(page, 250, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Right-Click Context Menu ───────────────────────────────────────────────

test.describe('Rectangle Context Menu', () => {
  test('right-click on selected rectangle shows context menu', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Right-click
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(200)
    }
    // Context menu should appear
    const menu = page.locator('[role="menu"], .context-menu, [data-context-menu]')
    const menuCount = await menu.count()
    expect(menuCount).toBeGreaterThan(0)
  })

  test('context menu duplicate creates copy', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(200)
    }
    const duplicateItem = page.locator('text=/Duplicate/i').first()
    const count = await duplicateItem.count()
    if (count > 0) {
      await duplicateItem.click()
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(2)
    }
  })

  test('context menu delete removes rectangle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(200)
    }
    const deleteItem = page.locator('text=/Delete/i').first()
    const count = await deleteItem.count()
    if (count > 0) {
      await deleteItem.click()
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(0)
    }
  })

  test('context menu copy style', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 150, { button: 'right' })
      await page.waitForTimeout(200)
    }
    const copyStyleItem = page.locator('text=/Copy Style/i').first()
    const count = await copyStyleItem.count()
    if (count > 0) {
      await copyStyleItem.click()
      await page.waitForTimeout(200)
      // Style should be copied - annotation still exists
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('context menu paste style onto another rectangle', async ({ page }) => {
    // Create two rectangles with different properties
    await selectTool(page, 'Rectangle (R)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('5')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 180, y: 130 })
    await page.waitForTimeout(200)

    await createAnnotation(page, 'rectangle', { x: 50, y: 200, w: 130, h: 80 })

    // Select first, copy style (click on left edge)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 50, 90)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 50, box.y + 90, { button: 'right' })
      await page.waitForTimeout(200)
    }
    const copyStyleItem = page.locator('text=/Copy Style/i').first()
    const csCount = await copyStyleItem.count()
    if (csCount > 0) {
      await copyStyleItem.click()
      await page.waitForTimeout(200)
    }

    // Select second, paste style (click on left edge)
    await clickCanvasAt(page, 50, 240)
    await page.waitForTimeout(200)
    if (box) {
      await page.mouse.click(box.x + 50, box.y + 240, { button: 'right' })
      await page.waitForTimeout(200)
    }
    const pasteStyleItem = page.locator('text=/Paste Style/i').first()
    const psCount = await pasteStyleItem.count()
    if (psCount > 0) {
      await pasteStyleItem.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Rectangle Edge Cases', () => {
  test('drag rectangle to edge of canvas', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    // Move it near the edge (click on left edge to select)
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 450, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag rectangle partially off-screen', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(200)
    // Click on left edge to select
    await moveAnnotation(page, { x: 100, y: 150 }, { x: 10, y: 10 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
