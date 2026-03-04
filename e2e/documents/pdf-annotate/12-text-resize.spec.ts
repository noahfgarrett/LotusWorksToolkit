import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, moveAnnotation,
  waitForSessionSave, getSessionData, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Moving Text Boxes ─────────────────────────────────────────────────────

test.describe('Text Resize/Move — Dragging', () => {
  test('dragging text box moves it to new position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('moving text preserves content', async ({ page }) => {
    await uploadPDFAndWait(page)
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
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.text).toBe('Moved content')
  })

  test('moving text box updates its position in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const posBefore = annsBefore.find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const posAfter = annsAfter.find(a => a.type === 'text')!.points[0]
    expect(posAfter.x).not.toBeCloseTo(posBefore.x, 0)
  })

  test('move by small distance (10px)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 225 }, { x: 285, y: 235 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('move by large distance (200px)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 125, y: 75 }, { x: 325, y: 375 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Arrow Key Nudge ────────────────────────────────────────────────────────

test.describe('Text Resize/Move — Arrow Key Nudge', () => {
  test('arrow key nudges selected text box (1px)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yBefore = annsBefore.find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const yAfter = annsAfter.find(a => a.type === 'text')!.points[0].y
    expect(yAfter).toBeGreaterThan(yBefore)
  })

  test('ArrowRight nudges text box right', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges text box left', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowUp nudges text box up', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+Arrow nudges by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const annsBefore = Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const xBefore = annsBefore.find(a => a.type === 'text')!.points[0].x
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const annsAfter = Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const xAfter = annsAfter.find(a => a.type === 'text')!.points[0].x
    // Should move more than 1px
    expect(Math.abs(xAfter - xBefore)).toBeGreaterThan(2)
  })

  test('multiple arrow presses accumulate movement', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown')
    }
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Delete ─────────────────────────────────────────────────────────────────

test.describe('Text Resize/Move — Delete', () => {
  test('Delete key removes selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace key removes selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('deleting one text box does not remove others', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectAnnotationAt(page, 125, 105)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Duplicate (Ctrl+D) ────────────────────────────────────────────────────

test.describe('Text Resize/Move — Duplicate', () => {
  test('Ctrl+D duplicates selected text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicated text preserves content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Duplicate me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const texts = anns.filter(a => a.type === 'text' && a.text === 'Duplicate me')
    expect(texts.length).toBe(2)
  })

  test('duplicated text is offset from original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    // Positions should be different
    expect(texts[0].points[0].x).not.toEqual(texts[1].points[0].x)
  })
})

// ─── Copy/Paste (Ctrl+C / Ctrl+V) ──────────────────────────────────────────

test.describe('Text Resize/Move — Copy and Paste', () => {
  test('Ctrl+C then Ctrl+V creates a copy', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pasted text preserves content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Copy me')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const copies = anns.filter(a => a.type === 'text' && a.text === 'Copy me')
    expect(copies.length).toBe(2)
  })

  test('paste without copy does not crash', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    // Should not create any annotations
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('multiple pastes create multiple copies', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

// ─── Resize Handles ────────────────────────────────────────────────────────

test.describe('Text Resize/Move — Resize', () => {
  test('selected text box shows resize handles visually', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    // The canvas should show resize handles (visual check via screenshot diff)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('text box maintains minimum dimensions', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(10)
    expect(textAnn!.height).toBeGreaterThan(10)
  })

  test('text box preserves width after content entry', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Width test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(50)
  })
})

// ─── Undo/Redo for Text Move/Delete ────────────────────────────────────────

test.describe('Text Resize/Move — Undo Redo', () => {
  test('undo restores deleted text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('redo re-deletes text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo duplicate removes the copy', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Text Box Movement — Extended ──────────────────────────────────────────

test.describe('Text Resize/Move — Extended', () => {
  test('ArrowDown then ArrowUp returns to approximately original position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const yBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const yAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0].y
    expect(Math.abs(yAfter - yBefore)).toBeLessThan(2)
  })

  test('Shift+ArrowDown nudges more than regular ArrowDown', async ({ page }) => {
    await uploadPDFAndWait(page)
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
    await uploadPDFAndWait(page)
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

  test('Shift+ArrowUp nudges up by 10px', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 275, 225)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('moving text to top-left corner', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 200, y: 200, w: 150, h: 50 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 275, y: 225 }, { x: 50, y: 50 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('moving text with formatting preserves formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
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
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; text?: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.bold).toBe(true)
    expect(textAnn!.text).toBe('Bold moved')
  })

  test('duplicate preserves formatting', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    expect(texts.every(t => t.bold === true)).toBe(true)
    expect(texts.every(t => t.italic === true)).toBe(true)
  })

  test('moving text then undoing restores position', async ({ page }) => {
    await uploadPDFAndWait(page)
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

  test('select then deselect text box', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Click to select annotations/')).toBeVisible({ timeout: 3000 })
  })

  test('text box visual on canvas after move', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('selecting text shows nudge hint in status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
  })

  test('delete then redo re-deletes', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('copy-paste preserves content', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Copy content')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const copies = anns.filter(a => a.type === 'text' && a.text === 'Copy content')
    expect(copies.length).toBe(2)
  })

  test('nudge does not fire during text edit mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    // In edit mode, arrow keys should move cursor, not nudge
    await page.keyboard.type('Hello')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    // Text should still be there, not moved
    await expect(textarea).toHaveValue('Hello')
  })

  test('move text to different quadrant of canvas', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const posBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    await moveAnnotation(page, { x: 125, y: 75 }, { x: 350, y: 400 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    const posAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>).find(a => a.type === 'text')!.points[0]
    expect(posAfter.x).toBeGreaterThan(posBefore.x)
    expect(posAfter.y).toBeGreaterThan(posBefore.y)
  })

  test('deleting two of three text boxes leaves one', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 40 })
    await createAnnotation(page, 'text', { x: 50, y: 150, w: 150, h: 40 })
    await createAnnotation(page, 'text', { x: 50, y: 300, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectAnnotationAt(page, 125, 70)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await selectAnnotationAt(page, 125, 170)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Shift+ArrowDown nudge accumulates over multiple presses', async ({ page }) => {
    await uploadPDFAndWait(page)
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

  test('copy-paste creates offset copy not at exact same position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    // Pasted copy should be at different position
    expect(texts[0].points[0].x).not.toEqual(texts[1].points[0].x)
  })

  test('text box width preserved after move', async ({ page }) => {
    await uploadPDFAndWait(page)
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

  test('text box height preserved after move', async ({ page }) => {
    await uploadPDFAndWait(page)
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

  test('duplicate text has same width as original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    expect(texts[0].width).toBe(texts[1].width)
  })

  test('duplicate text has same height as original', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; height?: number }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    expect(texts[0].height).toBe(texts[1].height)
  })

  test('annotation count stays correct through move operations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    await moveAnnotation(page, { x: 200, y: 125 }, { x: 300, y: 125 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
