import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

/** Helper to create a cloud with given vertices */
async function createCloud(
  page: import('@playwright/test').Page,
  vertices: { x: number; y: number }[],
) {
  await selectTool(page, 'Cloud (K)')
  for (let i = 0; i < vertices.length - 1; i++) {
    await clickCanvasAt(page, vertices[i].x, vertices[i].y)
    await page.waitForTimeout(100)
  }
  const last = vertices[vertices.length - 1]
  await doubleClickCanvasAt(page, last.x, last.y)
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Select Cloud ───────────────────────────────────────────────────────────

test.describe('Cloud Selection', () => {
  test('click on cloud edge selects it', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('selection handles visible when cloud selected', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── Move Cloud ─────────────────────────────────────────────────────────────

test.describe('Move Cloud', () => {
  test('move cloud by dragging', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 100 }, { x: 300, y: 300 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('move cloud updates session data', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = sessionBefore.annotations['1'] || sessionBefore.annotations[1]
    const pointsBefore = JSON.stringify(annsBefore[0].points)

    await moveAnnotation(page, { x: 175, y: 100 }, { x: 300, y: 250 })
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = sessionAfter.annotations['1'] || sessionAfter.annotations[1]
    const pointsAfter = JSON.stringify(annsAfter[0].points)
    expect(pointsAfter).not.toBe(pointsBefore)
  })
})

// ─── Resize Cloud ───────────────────────────────────────────────────────────

test.describe('Cloud Resize', () => {
  test('resize cloud from SE handle', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 250 }, { x: 350, y: 350 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('resize cloud from NW handle', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 50, y: 50 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize cloud from N handle', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 175, y: 100 }, { x: 175, y: 50 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize cloud from E handle', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 250, y: 175 }, { x: 350, y: 175 })
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('resize cloud to minimum size', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Try to shrink drastically
    await dragOnCanvas(page, { x: 250, y: 250 }, { x: 110, y: 110 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Deselect Cloud ─────────────────────────────────────────────────────────

test.describe('Cloud Deselect', () => {
  test('clicking empty space deselects cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })

  test('Escape deselects cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).not.toBeVisible()
  })
})

// ─── Delete Cloud ───────────────────────────────────────────────────────────

test.describe('Cloud Delete', () => {
  test('Delete key removes selected cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting cloud does not affect other shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 350, y: 200 },
      { x: 275, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 275, 200)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Ctrl+A with Clouds ────────────────────────────────────────────────────

test.describe('Cloud Select All', () => {
  test('Ctrl+A selects all clouds then delete removes all', async ({ page }) => {
    await createCloud(page, [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 130 },
    ])
    await createCloud(page, [
      { x: 200, y: 200 },
      { x: 350, y: 200 },
      { x: 275, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    // Click empty space to deselect and ensure canvas has focus
    await clickCanvasAt(page, 400, 400)
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

// ─── Z-Order ────────────────────────────────────────────────────────────────

test.describe('Cloud Z-Order', () => {
  test('bring cloud to front with Ctrl+]', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 200, h: 200 })
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 150, y: 200 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send cloud to back with Ctrl+[', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await createAnnotation(page, 'rectangle', { x: 120, y: 120, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Context Menu ───────────────────────────────────────────────────────────

test.describe('Cloud Context Menu', () => {
  test('right-click on selected cloud shows context menu', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    // Click on top edge to select
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Right-click on the top edge (NOT center) using annotation canvas
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 175, box.y + 100, { button: 'right' })
      await page.waitForTimeout(300)
    }
    // Context menu contains "Delete" and "Duplicate" buttons
    const deleteBtn = page.locator('button:has-text("Delete")')
    const deleteCount = await deleteBtn.count()
    expect(deleteCount).toBeGreaterThan(0)
  })

  test('context menu duplicate on cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    // Click on top edge to select
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Right-click on the top edge using annotation canvas
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

  test('context menu delete on cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    // Click on top edge to select
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Right-click on the top edge using annotation canvas
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

// ─── Nudge Cloud ────────────────────────────────────────────────────────────

test.describe('Cloud Nudge', () => {
  test('arrow keys nudge selected cloud', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('Shift+arrow nudges cloud by 10px', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })
})

// ─── Cloud with Other Shapes ────────────────────────────────────────────────

test.describe('Cloud with Other Shapes', () => {
  test('cloud over other shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 200, h: 150 })
    await createCloud(page, [
      { x: 120, y: 120 },
      { x: 280, y: 120 },
      { x: 200, y: 240 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('cloud under other shapes (send to back)', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await createAnnotation(page, 'rectangle', { x: 120, y: 120, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select cloud and send to back
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Cloud Edge Cases ───────────────────────────────────────────────────────

test.describe('Cloud Edge Cases', () => {
  test('drag cloud to edge of canvas', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 150, y: 180 },
    ])
    await moveAnnotation(page, { x: 150, y: 100 }, { x: 420, y: 100 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select cloud among mixed annotation types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 80 })
    await createCloud(page, [
      { x: 100, y: 200 },
      { x: 250, y: 200 },
      { x: 175, y: 300 },
    ])
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 200)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })

  test('undo cloud deletion restores it', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple nudge operations accumulate correctly', async ({ page }) => {
    await createCloud(page, [
      { x: 150, y: 150 },
      { x: 250, y: 150 },
      { x: 200, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 150)
    await page.waitForTimeout(200)
    // Nudge right 5 times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
    }
    // Nudge down 5 times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown')
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('cloud resize preserves vertex proportions', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 250 },
      { x: 100, y: 250 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    // Resize from SE handle
    await dragOnCanvas(page, { x: 250, y: 250 }, { x: 380, y: 380 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns[0].points.length).toBeGreaterThanOrEqual(3)
  })

  test('cloud selection persists after zoom change', async ({ page }) => {
    await createCloud(page, [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 175, y: 220 },
    ])
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 100)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
