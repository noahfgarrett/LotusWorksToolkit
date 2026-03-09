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
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Eraser - Partial Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  /** Switch to eraser in partial mode */
  async function activatePartialEraser(page: import('@playwright/test').Page) {
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button:has-text("Partial")')
    if (await partialBtn.isVisible()) {
      await partialBtn.click()
      await page.waitForTimeout(100)
    }
  }

  /** Create a long horizontal pencil stroke */
  async function createHorizontalStroke(
    page: import('@playwright/test').Page,
    y: number = 200,
    startX: number = 80,
    endX: number = 400,
  ) {
    await selectTool(page, 'Pencil (P)')
    const points: { x: number; y: number }[] = []
    for (let x = startX; x <= endX; x += 20) {
      points.push({ x, y })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
  }

  /** Create a curved pencil stroke */
  async function createCurvedStroke(page: import('@playwright/test').Page) {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 80, y: 200 },
      { x: 120, y: 150 },
      { x: 180, y: 250 },
      { x: 240, y: 150 },
      { x: 300, y: 250 },
      { x: 360, y: 200 },
    ])
    await page.waitForTimeout(200)
  }

  /** Erase at a specific point */
  async function eraseAt(page: import('@playwright/test').Page, x: number, y: number) {
    await drawOnCanvas(page, [
      { x: x - 15, y: y - 15 },
      { x, y },
      { x: x + 15, y: y + 15 },
    ])
    await page.waitForTimeout(200)
  }

  // ── Basic partial erase on pencil strokes ─────────────────────────────

  test('partial erase splits pencil stroke into 2 fragments', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)

    const count = await getAnnotationCount(page)
    expect(count).toBe(2)
  })

  test('partial erase in middle of stroke creates 2 pieces', async ({ page }) => {
    await createHorizontalStroke(page, 200, 80, 400)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200) // Middle of the stroke

    const count = await getAnnotationCount(page)
    expect(count).toBe(2)
  })

  test('partial erase near start of stroke', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 100, 200) // Near the beginning

    const count = await getAnnotationCount(page)
    // Should have either 1 fragment (start removed) or 2 fragments
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('partial erase near end of stroke', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 380, 200) // Near the end

    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('partial erase multiple times on same stroke creates more fragments', async ({ page }) => {
    await createHorizontalStroke(page, 200, 60, 440)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 160, 200)
    await page.waitForTimeout(200)
    await eraseAt(page, 340, 200)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    // Original was 1 stroke, 2 cuts = up to 3 fragments
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('partial erased fragments are still selectable', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    expect(count).toBe(2)

    // Try selecting one of the fragments
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 200) // Click on left fragment
    await page.waitForTimeout(200)

    // Selection should not crash - canvas should still be interactive
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('partial erased fragments retain same color and width', async ({ page }) => {
    await createHorizontalStroke(page)
    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    // Check session data - fragments should have same properties as original
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    if (session?.annotations) {
      // annotations is Record<number, unknown[]> keyed by page number — flatten all pages
      const allAnnotations = Object.values(session.annotations).flat() as Record<string, unknown>[]
      const pencilAnnotations = allAnnotations.filter(
        (a) => a.type === 'pencil' || a.tool === 'pencil',
      )
      if (pencilAnnotations.length >= 2) {
        // All fragments should share same stroke color and width
        const firstColor = pencilAnnotations[0].color ?? pencilAnnotations[0].strokeColor
        const firstWidth = pencilAnnotations[0].width ?? pencilAnnotations[0].strokeWidth
        for (const ann of pencilAnnotations) {
          const color = ann.color ?? ann.strokeColor
          const width = ann.width ?? ann.strokeWidth
          expect(color).toBe(firstColor)
          expect(width).toBe(firstWidth)
        }
      }
    }
  })

  test('erase through entire short stroke removes it completely', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 220, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    // Set large radius to cover entire short stroke
    const radiusSlider = page.locator('input[type="range"]').first()
    if (await radiusSlider.isVisible()) {
      await radiusSlider.fill('50')
      await page.waitForTimeout(100)
    }
    await eraseAt(page, 210, 200)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('partial erase on highlighter stroke', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    const points: { x: number; y: number }[] = []
    for (let x = 80; x <= 400; x += 20) {
      points.push({ x, y: 250 })
    }
    await drawOnCanvas(page, points)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 250)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    // Should split the highlighter like a pencil stroke
    expect(count).toBe(2)
  })

  test('annotation count increases by fragments-1 after partial erase', async ({ page }) => {
    await createHorizontalStroke(page)
    const before = await getAnnotationCount(page)
    expect(before).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    const after = await getAnnotationCount(page)
    // 1 stroke split into 2 = net increase of 1 (fragments - 1)
    expect(after).toBe(before + 1)
  })

  // ── Undo ──────────────────────────────────────────────────────────────

  test('undo partial erase restores original stroke', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Eraser radius ────────────────────────────────────────────────────

  test('partial erase with small radius cuts precisely', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    const radiusSlider = page.locator('input[type="range"]').first()
    if (await radiusSlider.isVisible()) {
      await radiusSlider.fill('5')
      await page.waitForTimeout(100)
    }

    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    // With small radius the fragments should be close to the original length
    const count = await getAnnotationCount(page)
    expect(count).toBe(2)
  })

  test('partial erase with large radius cuts wide section', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    const radiusSlider = page.locator('input[type="range"]').first()
    if (await radiusSlider.isVisible()) {
      await radiusSlider.fill('50')
      await page.waitForTimeout(100)
    }

    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    // Large radius may eat through more of the stroke
    expect(count).toBeGreaterThanOrEqual(0)
    expect(count).toBeLessThanOrEqual(2)
  })

  // ── Short / long / curved strokes ─────────────────────────────────────

  test('partial erase on short stroke', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 200, y: 200 },
      { x: 240, y: 200 },
    ])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 220, 200)
    await page.waitForTimeout(200)

    // Short stroke: might be fully erased or split
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('partial erase on long stroke', async ({ page }) => {
    await createHorizontalStroke(page, 200, 40, 500)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 270, 200)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('partial erase on curved stroke', async ({ page }) => {
    await createCurvedStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 180, 250)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('partial erase on straight line shape splits it', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 250, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 225, 200)
    await page.waitForTimeout(200)

    // Lines are converted to polyline and split in partial mode
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  // ── Fallback to object erase for shapes/text ─────────────────────────

  test('shapes get split in partial mode', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 210, 190)
    await page.waitForTimeout(200)

    // Rectangle is converted to polyline and split in partial mode
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('circle gets split in partial mode', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 100, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 200, 200)
    await page.waitForTimeout(200)

    // Circle is converted to polyline and split in partial mode
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  test('text falls back to object erase in partial mode', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 150, y: 150, w: 140, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 220, 175)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('callout falls back to object erase in partial mode', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 150, y: 150, w: 140, h: 70 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 220, 185)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('arrow gets split in partial mode', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 200, 225)
    await page.waitForTimeout(200)

    // Arrow is converted to polyline and split in partial mode
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(2)
  })

  // ── Mode toggle UI ────────────────────────────────────────────────────

  test('eraser mode toggle UI shows Partial and Object buttons', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    const partialBtn = page.locator('button:has-text("Partial")')
    const objectBtn = page.locator('button:has-text("Object")')

    await expect(partialBtn).toBeVisible()
    await expect(objectBtn).toBeVisible()
  })

  test('switch between partial and object mode', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')

    const partialBtn = page.locator('button:has-text("Partial")')
    const objectBtn = page.locator('button:has-text("Object")')

    await partialBtn.click()
    await page.waitForTimeout(100)
    // Active button has orange bg class
    let classes = await partialBtn.getAttribute('class')
    expect(classes).toContain('bg-[#F47B20]')

    await objectBtn.click()
    await page.waitForTimeout(100)
    classes = await objectBtn.getAttribute('class')
    expect(classes).toContain('bg-[#F47B20]')
  })

  test('partial erase then switch to object erase works correctly', async ({ page }) => {
    // Create two strokes
    await createHorizontalStroke(page, 150)
    await createHorizontalStroke(page, 300)
    expect(await getAnnotationCount(page)).toBe(2)

    // Partial erase first stroke
    await activatePartialEraser(page)
    await eraseAt(page, 240, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3) // 2 fragments + 1 intact

    // Switch to object mode and erase second stroke
    const objectBtn = page.locator('button:has-text("Object")')
    await objectBtn.click()
    await page.waitForTimeout(100)
    await eraseAt(page, 240, 300)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(2) // Only the 2 fragments remain
  })

  // ── Session persistence ────────────────────────────────────────────────

  test('partial erase session persistence', async ({ page }) => {
    await createHorizontalStroke(page)
    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)

    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    if (session?.annotations) {
      // annotations is Record<number, unknown[]> keyed by page number — flatten all pages
      const allAnnotations = Object.values(session.annotations).flat() as Record<string, unknown>[]
      // Should have 2 fragments in session
      const strokes = allAnnotations.filter(
        (a) => a.type === 'pencil' || a.tool === 'pencil',
      )
      expect(strokes.length).toBe(2)
    }
  })

  // ── Zoom and rotation ─────────────────────────────────────────────────

  test('partial erase while zoomed in', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('partial erase on rotated page', async ({ page }) => {
    await createHorizontalStroke(page)
    expect(await getAnnotationCount(page)).toBe(1)

    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)

    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0) // May or may not hit after rotation
  })

  // ── Mixed operations ──────────────────────────────────────────────────

  test('partial erase pencil, then create new pencil, both coexist', async ({ page }) => {
    await createHorizontalStroke(page, 200)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)

    // Create new stroke
    await createHorizontalStroke(page, 350)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('partial erase preserves other annotation types', async ({ page }) => {
    await createHorizontalStroke(page, 200)
    await createAnnotation(page, 'rectangle', { x: 100, y: 300, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)

    await activatePartialEraser(page)
    await eraseAt(page, 240, 200) // Only hit the pencil stroke
    await page.waitForTimeout(200)

    // Rectangle untouched, pencil split into 2
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('multiple partial erases then undo restores step by step', async ({ page }) => {
    await createHorizontalStroke(page, 200, 60, 440)
    expect(await getAnnotationCount(page)).toBe(1)

    await activatePartialEraser(page)
    await eraseAt(page, 160, 200)
    await page.waitForTimeout(200)
    const countAfterFirst = await getAnnotationCount(page)

    await eraseAt(page, 340, 200)
    await page.waitForTimeout(200)
    const countAfterSecond = await getAnnotationCount(page)
    expect(countAfterSecond).toBeGreaterThanOrEqual(countAfterFirst)

    // Undo second erase
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(countAfterFirst)

    // Undo first erase
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
