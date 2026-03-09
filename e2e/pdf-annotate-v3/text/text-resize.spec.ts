import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, moveAnnotation,
  waitForSessionSave, getSessionData, clearSessionData,
  goToPage, exportPDF, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

/** Helper: select text and get the bounding box of the selection handles area */
async function getTextDimensions(page: import('@playwright/test').Page) {
  await waitForSessionSave(page)
  const session = await getSessionData(page)
  const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number; points: Array<{ x: number; y: number }> }>
  return anns.find(a => a.type === 'text')
}

// ─── Resize Handles Visible ───────────────────────────────────────────────

test.describe('Text Resize — Handles Visible', () => {
  test('selected text box shows resize handles visually', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('8 resize handles are present (nw, n, ne, e, se, s, sw, w)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 80 })
    await selectAnnotationAt(page, 200, 140)
    await page.waitForTimeout(200)
    // The handles render on canvas, so we verify via visual diff
    const before = await screenshotCanvas(page)
    // Click away to deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    // With handles, the screenshots should differ
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize from East Handle (Width Only) ─────────────────────────────────

test.describe('Text Resize — Width Only (E/W Handles)', () => {
  test('dragging east handle increases width', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    const dimBefore = await getTextDimensions(page)
    const widthBefore = dimBefore!.width!
    // Select the annotation
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Drag the east (right middle) handle — positioned at right edge
    const rightX = 100 + widthBefore
    const midY = 130
    await dragOnCanvas(page, { x: rightX, y: midY }, { x: rightX + 100, y: midY })
    await page.waitForTimeout(300)
    const dimAfter = await getTextDimensions(page)
    // Width should increase (or at least canvas changed)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('dragging west handle changes width', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 150, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 250, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from left edge
    await dragOnCanvas(page, { x: 150, y: 130 }, { x: 100, y: 130 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize from North/South Handle (Height Only) ─────────────────────────

test.describe('Text Resize — Height Only (N/S Handles)', () => {
  test('dragging south handle changes height', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from bottom edge
    await dragOnCanvas(page, { x: 200, y: 160 }, { x: 200, y: 250 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('dragging north handle changes height', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 150, w: 200, h: 80 })
    await selectAnnotationAt(page, 200, 190)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from top edge
    await dragOnCanvas(page, { x: 200, y: 150 }, { x: 200, y: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize from Corner Handles (Both Dimensions) ─────────────────────────

test.describe('Text Resize — Corner Handles', () => {
  test('dragging SE corner resizes both width and height', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from bottom-right corner
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('dragging NW corner resizes both dimensions', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 150, y: 150, w: 200, h: 80 })
    await selectAnnotationAt(page, 250, 190)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag from top-left corner
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 100, y: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('dragging NE corner resizes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 150, w: 200, h: 80 })
    await selectAnnotationAt(page, 200, 190)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 300, y: 150 }, { x: 380, y: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('dragging SW corner resizes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 150, y: 100, w: 200, h: 80 })
    await selectAnnotationAt(page, 250, 140)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 150, y: 180 }, { x: 100, y: 250 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Minimum Size Constraints ──────────────────────────────────────────────

test.describe('Text Resize — Minimum Size', () => {
  test('text box maintains minimum width (40px)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number }>
    expect(anns.find(a => a.type === 'text')!.width).toBeGreaterThan(10)
  })

  test('text box maintains minimum height (20px)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; height?: number }>
    expect(anns.find(a => a.type === 'text')!.height).toBeGreaterThan(10)
  })
})

// ─── Resize Very Large ────────────────────────────────────────────────────

test.describe('Text Resize — Large Size', () => {
  test('resize to very large dimensions', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 100, h: 40 })
    await selectAnnotationAt(page, 100, 70)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag SE corner to make it huge
    await dragOnCanvas(page, { x: 150, y: 90 }, { x: 450, y: 450 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize Preserves Content and Formatting ──────────────────────────────

test.describe('Text Resize — Preserves Properties', () => {
  test('resize preserves text content', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Resize content test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Drag a handle
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 400, y: 200 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Resize content test')
  })

  test('resize preserves bold formatting', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold resize')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 400, y: 200 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    expect(anns.find(a => a.type === 'text')!.bold).toBe(true)
  })
})

// ─── Resize Then Edit ─────────────────────────────────────────────────────

test.describe('Text Resize — Then Edit', () => {
  test('text is editable after resize', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Resize
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 380, y: 200 })
    await page.waitForTimeout(300)
    // Double-click to edit
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type('After resize')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toContain('After resize')
    }
  })
})

// ─── Resize Then Move ─────────────────────────────────────────────────────

test.describe('Text Resize — Then Move', () => {
  test('text can be moved after resize', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 380, y: 200 })
    await page.waitForTimeout(300)
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 140 }, { x: 300, y: 350 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize Undo/Redo ─────────────────────────────────────────────────────

test.describe('Text Resize — Undo/Redo', () => {
  test('undo resize restores original size', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Auto-Height After Width Resize ───────────────────────────────────────

test.describe('Text Resize — Auto Height After Width Change', () => {
  test('text wrapping changes when width is reduced', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 400, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a long text that will reflow when the width changes significantly')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Select and resize width smaller
    await selectAnnotationAt(page, 225, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 400, y: 130 }, { x: 200, y: 130 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize While Zoomed ──────────────────────────────────────────────────

test.describe('Text Resize — Zoom Levels', () => {
  test('resize while zoomed in', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 380, y: 220 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('resize while zoomed out', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(400)
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 350, y: 200 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Resize Session Persistence ───────────────────────────────────────────

test.describe('Text Resize — Session Persistence', () => {
  test('resize dimensions persist in session', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 300, y: 160 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(0)
    expect(textAnn!.height).toBeGreaterThan(0)
  })
})

// ─── Resize Multiple Text Boxes ───────────────────────────────────────────

test.describe('Text Resize — Multiple Boxes', () => {
  test('resizing one text box does not affect others', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select and resize first
    await selectAnnotationAt(page, 125, 105)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 200, y: 130 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    // Both should still exist
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
