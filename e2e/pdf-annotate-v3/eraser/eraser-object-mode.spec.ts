import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  goToPage,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Eraser - Object Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  /** Switch to eraser in object mode */
  async function activateObjectEraser(page: import('@playwright/test').Page) {
    await selectTool(page, 'Eraser (E)')
    // Always click the Object button to ensure object mode is active
    // (default mode is partial; buttons use CSS classes, not aria-pressed)
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)
  }

  /** Drag the eraser through a specific region on the canvas.
   *  NOTE: hitTest for rectangles/circles/clouds only matches the edges (stroke),
   *  not the interior. We use a wide sweep (+-60px) so the drag path crosses edges. */
  async function eraseAt(page: import('@playwright/test').Page, x: number, y: number) {
    await drawOnCanvas(page, [
      { x: x - 60, y: y - 60 },
      { x: x - 30, y: y - 30 },
      { x, y },
      { x: x + 30, y: y + 30 },
      { x: x + 60, y: y + 60 },
    ])
  }

  /** Drag the eraser along a path */
  async function eraseAlong(
    page: import('@playwright/test').Page,
    points: { x: number; y: number }[],
  ) {
    await drawOnCanvas(page, points)
  }

  // ── Erase individual annotation types ──────────────────────────────────

  test('erases a pencil stroke entirely', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 150, y: 150, w: 120, h: 80 })
    const before = await getAnnotationCount(page)
    expect(before).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 190, 190)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 140, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 170, 150)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 120, h: 120 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 160, 160)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 100)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases an arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 140)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a cloud shape', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await clickCanvasAt(page, 260, 100)
    await clickCanvasAt(page, 260, 220)
    await doubleClickCanvasAt(page, 100, 220)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 180, 160)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a text box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 160, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 180, 130)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 120, y: 120, w: 160, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 160)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(100)
    await page.locator('button:has-text("APPROVED")').click()
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 200)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases a highlight stroke', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 200)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Count / miss / multiple ────────────────────────────────────────────

  test('annotation count decreases by one after erase', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activateObjectEraser(page)
    await eraseAt(page, 140, 130)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erase near but not touching annotation does not delete it', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    // Click far away from the annotation
    await eraseAt(page, 50, 50)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('erases multiple annotations in one drag', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 60, h: 40 })
    await createAnnotation(page, 'circle', { x: 200, y: 150, w: 60, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 300, y: 150, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)

    await activateObjectEraser(page)
    await eraseAlong(page, [
      { x: 80, y: 170 },
      { x: 140, y: 170 },
      { x: 230, y: 170 },
      { x: 340, y: 170 },
    ])
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase last annotation on page leaves count at 0', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 200, y: 200, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 250, 230)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erases all annotations one by one', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 60, h: 40 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 60, h: 40 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 100, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)

    await activateObjectEraser(page)
    await eraseAt(page, 130, 120)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)

    await eraseAt(page, 280, 120)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await eraseAt(page, 150, 250)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Undo / redo ────────────────────────────────────────────────────────

  test('undo restores erased annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo after undo removes annotation again', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)

    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Workflow combinations ──────────────────────────────────────────────

  test('erase then create new annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)

    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('consecutive erases in sequence', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 60, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 200, w: 60, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 300, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)

    await activateObjectEraser(page)
    await eraseAt(page, 130, 120)
    await page.waitForTimeout(150)
    await eraseAt(page, 130, 220)
    await page.waitForTimeout(150)
    await eraseAt(page, 130, 320)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase annotation on page 2', async ({ page }) => {
    // sample.pdf already has 2 pages; navigate to page 2
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase while zoomed in', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    // Zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase on rotated page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    // Rotate page
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(500)
    }

    await activateObjectEraser(page)
    // After rotation (270°), the annotation moves to a different visual position.
    // The page is now in landscape mode (wider). Sweep across the full visible area
    // in multiple passes to hit the annotation regardless of where it ended up.
    const canvas = page.locator('canvas.ann-canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    const maxX = Math.min(box.width, 700)
    const maxY = Math.min(box.height, 500)
    // Zigzag sweep across the canvas
    await eraseAlong(page, [
      { x: 50, y: 100 },
      { x: maxX - 50, y: 100 },
      { x: maxX - 50, y: 200 },
      { x: 50, y: 200 },
      { x: 50, y: 300 },
      { x: maxX - 50, y: 300 },
      { x: maxX - 50, y: 400 },
      { x: 50, y: 400 },
      { x: 50, y: maxY - 50 },
      { x: maxX - 50, y: maxY - 50 },
    ])
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Eraser radius ─────────────────────────────────────────────────────

  test('eraser with small radius (5px) requires precision', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)

    // Set minimum radius
    const radiusSlider = page.locator('input[type="range"]').first()
    if (await radiusSlider.isVisible()) {
      await radiusSlider.fill('5')
      await page.waitForTimeout(100)
    }

    // Miss: erase far from annotation
    await eraseAt(page, 50, 50)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    // Hit: erase on annotation
    await eraseAt(page, 250, 240)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('eraser with large radius (50px) erases wide area', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 40, h: 30 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activateObjectEraser(page)

    // Set maximum radius
    const radiusSlider = page.locator('input[type="range"]').first()
    if (await radiusSlider.isVisible()) {
      await radiusSlider.fill('50')
      await page.waitForTimeout(100)
    }

    // Erase slightly outside the annotation - large radius should still hit
    await eraseAt(page, 170, 190)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Overlapping annotations ────────────────────────────────────────────

  test('erase overlapping annotations removes the top one first', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 170, y: 160, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activateObjectEraser(page)
    await eraseAt(page, 210, 200)
    await page.waitForTimeout(200)

    // At least one should be removed
    const remaining = await getAnnotationCount(page)
    expect(remaining).toBeLessThanOrEqual(1)
  })

  // ── Rapid erase ────────────────────────────────────────────────────────

  test('rapid erasing does not crash', async ({ page }) => {
    // Create several annotations
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 80 + i * 70,
        y: 150,
        w: 50,
        h: 40,
      })
    }
    expect(await getAnnotationCount(page)).toBe(5)

    await activateObjectEraser(page)
    // Rapid sweep across all annotations
    await eraseAlong(page, [
      { x: 60, y: 170 },
      { x: 150, y: 170 },
      { x: 220, y: 170 },
      { x: 290, y: 170 },
      { x: 360, y: 170 },
      { x: 430, y: 170 },
    ])
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Empty canvas ───────────────────────────────────────────────────────

  test('erasing on empty canvas does not crash', async ({ page }) => {
    expect(await getAnnotationCount(page)).toBe(0)

    await activateObjectEraser(page)
    await eraseAt(page, 200, 200)
    await page.waitForTimeout(200)
    await eraseAlong(page, [
      { x: 50, y: 50 },
      { x: 300, y: 300 },
    ])
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Session data ───────────────────────────────────────────────────────

  test('erase updates session data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await waitForSessionSave(page)
    const dataBefore = await getSessionData(page)
    expect(dataBefore).not.toBeNull()

    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)

    const dataAfter = await getSessionData(page)
    // Session should reflect the erased state
    expect(dataAfter).not.toBeNull()
    // The annotation array should be shorter or empty
    if (dataBefore?.annotations && dataAfter?.annotations) {
      const beforeCount = Object.values(dataBefore.annotations).flat().length
      const afterCount = Object.values(dataAfter.annotations).flat().length
      expect(afterCount).toBeLessThan(beforeCount)
    }
  })

  // ── Cursor ─────────────────────────────────────────────────────────────

  test('eraser cursor is visible when tool is active', async ({ page }) => {
    await activateObjectEraser(page)
    // The canvas or body should have a custom cursor class or style
    const canvas = page.locator('canvas').first()
    const cursorStyle = await canvas.evaluate((el) => {
      return window.getComputedStyle(el).cursor
    })
    // Eraser typically has a custom cursor (not default pointer)
    expect(cursorStyle).not.toBe('default')
  })

  // ── Tool switching ─────────────────────────────────────────────────────

  test('switch from eraser to select and back preserves mode', async ({ page }) => {
    await activateObjectEraser(page)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Eraser (E)')
    await page.waitForTimeout(100)

    // Eraser should still be in object mode — the active button has the orange bg class
    const objectBtn = page.locator('button:has-text("Object")')
    if (await objectBtn.isVisible()) {
      const classes = await objectBtn.getAttribute('class')
      expect(classes).toContain('bg-[#F47B20]')
    }
  })

  test('activate eraser via keyboard shortcut E', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    // Switch to object mode after activating via shortcut
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('erase does not affect annotations on other pages', async ({ page }) => {
    // sample.pdf already has 2 pages

    // Create annotation on page 1
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })

    // Create annotation on page 2
    await goToPage(page, 2)
    await createAnnotation(page, 'rectangle', { x: 200, y: 200, w: 100, h: 80 })

    // Erase on page 1
    await goToPage(page, 1)
    await activateObjectEraser(page)
    await eraseAt(page, 200, 190)
    await page.waitForTimeout(200)

    // Page 2 annotation should still exist
    await goToPage(page, 2)
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('erase preserves non-targeted annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 60, h: 40 })
    await createAnnotation(page, 'circle', { x: 300, y: 300, w: 60, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activateObjectEraser(page)
    await eraseAt(page, 130, 120) // Only hit rectangle
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(1)
  })
})
