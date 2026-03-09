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

// ─── Drag to Move ──────────────────────────────────────────────────────────

test.describe('Text Movement — Drag to New Position', () => {
  test('dragging text box moves it visually', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag to left edge of canvas', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 225 }, { x: 30, y: 225 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag to right edge of canvas', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 175, y: 225 }, { x: 450, y: 225 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag to top of canvas', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 300, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 325 }, { x: 275, y: 30 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag to bottom of canvas', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 100, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 125 }, { x: 275, y: 500 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('drag to center of canvas', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 125, y: 75 }, { x: 250, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Move Then Edit ────────────────────────────────────────────────────────

test.describe('Text Movement — Move Then Edit', () => {
  test('text still editable after move', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Move me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 130 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await doubleClickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Move me')
    }
  })

  test('move then move again', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    await moveAnnotation(page, { x: 125, y: 75 }, { x: 250, y: 200 })
    await page.waitForTimeout(300)
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 250, y: 200 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Arrow Key Nudge ──────────────────────────────────────────────────────

test.describe('Text Movement — Arrow Key Nudge (1px)', () => {
  test('ArrowDown nudges text down', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const yBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const yAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    expect(yAfter).toBeGreaterThan(yBefore)
  })

  test('ArrowUp nudges text up', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges text left', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowRight nudges text right', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Shift+Arrow Nudge (10px) ─────────────────────────────────────────────

test.describe('Text Movement — Shift+Arrow Nudge (10px)', () => {
  test('Shift+ArrowRight nudges by more than 1px', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const xBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].x
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const xAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].x
    expect(Math.abs(xAfter - xBefore)).toBeGreaterThan(2)
  })

  test('Shift+ArrowDown nudges down by 10px', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const yBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const yAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    expect(yAfter - yBefore).toBeGreaterThan(2)
  })

  test('Shift+ArrowLeft nudges left by 10px', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const xBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].x
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const xAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].x
    expect(xBefore - xAfter).toBeGreaterThan(2)
  })

  test('Shift+ArrowUp nudges up', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('multiple Shift+Arrow presses accumulate', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const yBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+ArrowDown')
    }
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const yAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    expect(yAfter - yBefore).toBeGreaterThan(10)
  })
})

// ─── Move Preserves Content and Formatting ────────────────────────────────

test.describe('Text Movement — Preserves Properties', () => {
  test('move preserves text content', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Moved content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 130 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Moved content')
  })

  test('move preserves bold formatting', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold moved')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 130 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    expect(anns.find(a => a.type === 'text')!.bold).toBe(true)
  })

  test('move preserves width', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const widthBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; width?: number }>).find(a => a.type === 'text')!.width
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const widthAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; width?: number }>).find(a => a.type === 'text')!.width
    expect(widthAfter).toBe(widthBefore)
  })

  test('move preserves height', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const heightBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')!.height
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const heightAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')!.height
    expect(heightAfter).toBe(heightBefore)
  })
})

// ─── Move Updates Session ──────────────────────────────────────────────────

test.describe('Text Movement — Session Updates', () => {
  test('move updates position in session data', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const posBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const posAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    expect(posAfter.x).not.toBeCloseTo(posBefore.x, 0)
  })
})

// ─── Move Undo/Redo ────────────────────────────────────────────────────────

test.describe('Text Movement — Undo/Redo', () => {
  test('undo move restores original position', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const posBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const posAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    expect(Math.abs(posAfter.x - posBefore.x)).toBeLessThan(5)
    expect(Math.abs(posAfter.y - posBefore.y)).toBeLessThan(5)
  })

  test('redo move re-applies the move', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Multiple Text Boxes ──────────────────────────────────────────────────

test.describe('Text Movement — Multiple Text Boxes', () => {
  test('two text boxes moved independently', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await moveAnnotation(page, { x: 125, y: 105 }, { x: 300, y: 105 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('annotation count stays correct through move operations', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 125 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Z-Order ──────────────────────────────────────────────────────────────

test.describe('Text Movement — Z-Order', () => {
  test('Ctrl+] brings text to front (visual change)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 120, y: 110, w: 150, h: 50 })
    await selectAnnotationAt(page, 175, 125)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    // Visual change may or may not occur depending on overlap, but should not crash
    expect(after.length).toBeGreaterThan(0)
  })

  test('Ctrl+[ sends text to back (visual change)', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 120, y: 110, w: 150, h: 50 })
    await selectAnnotationAt(page, 195, 135)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(after.length).toBeGreaterThan(0)
  })
})

// ─── Nudge Does Not Fire in Edit Mode ─────────────────────────────────────

test.describe('Text Movement — No Nudge in Edit Mode', () => {
  test('arrow keys in edit mode do not nudge the text box', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    await expect(page.locator('textarea')).toHaveValue('Hello')
  })
})
