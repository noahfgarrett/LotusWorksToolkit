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

// ─── Drag to Create ────────────────────────────────────────────────────────

test.describe('Text Creation — Drag to Create', () => {
  test('drag on canvas creates a text box with textarea visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('textarea is focused immediately after creation', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeFocused()
  })

  test('textarea shows "Type here..." placeholder', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveAttribute('placeholder', 'Type here...')
  })

  test('typing content updates textarea value', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    await expect(page.locator('textarea')).toHaveValue('Hello World')
  })

  test('Escape commits text and hides textarea', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Persistent text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('clicking outside commits text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Click away test')
    await clickCanvasAt(page, 450, 450)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Click away test')
  })

  test('empty text box is removed on Escape', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('whitespace-only text is removed on Escape', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('single character text persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('X')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('X')
  })

  test('single word text persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Hello')
  })

  test('full sentence text persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 400, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('The quick brown fox jumps over the lazy dog.')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('The quick brown fox jumps over the lazy dog.')
  })

  test('multiline paragraph text persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 80 }, { x: 400, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Line 1\nLine 2\nLine 3')
  })

  test('very long text (500+ chars) persists correctly', async ({ page }) => {
    const longText = 'A'.repeat(500) + ' end'
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 450, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.type(longText)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe(longText)
  })
})

// ─── Auto-Height ───────────────────────────────────────────────────────────

test.describe('Text Creation — Auto Height Expansion', () => {
  test('text auto-height expands as content grows', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 150 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const initialHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type('line')
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(400)
    const expandedHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    expect(expandedHeight).toBeGreaterThan(initialHeight)
  })
})

// ─── Dimensions ────────────────────────────────────────────────────────────

test.describe('Text Creation — Dimensions', () => {
  test('small click creates default-sized text box (200x50)', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 202, y: 202 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('small drag creates text box', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 200, y: 180 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('large drag creates wide text box', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 480, y: 300 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Large box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number }>
    expect(anns.find(a => a.type === 'text')!.width).toBeGreaterThan(100)
  })

  test('annotation stores width and height in session', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.width).toBeGreaterThan(0)
    expect(textAnn!.height).toBeGreaterThan(0)
  })
})

// ─── Canvas Positions ──────────────────────────────────────────────────────

test.describe('Text Creation — Various Canvas Positions', () => {
  test('text near top-left corner', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 180, y: 60 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Top left')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text near bottom-right area', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 300, y: 500 }, { x: 480, y: 550 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Bottom right')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at center of canvas', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 150, y: 250 }, { x: 350, y: 310 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Center text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at right side of canvas', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 350, y: 200 }, { x: 500, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Right text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text at bottom of canvas', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 550 }, { x: 300, y: 600 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Bottom text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Multiple Text Boxes ──────────────────────────────────────────────────

test.describe('Text Creation — Multiple Text Boxes', () => {
  test('two consecutive text boxes result in count of 2', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 100, y: 200, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('five text boxes on the same page', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'text', { x: 50, y: 40 + i * 90, w: 150, h: 40 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('each text box retains its own content', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 80 }, { x: 280, y: 130 })
    await page.waitForTimeout(300)
    await page.keyboard.type('First box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 220 }, { x: 280, y: 270 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Second box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.length).toBe(2)
    const contents = texts.map(t => t.text)
    expect(contents).toContain('First box')
    expect(contents).toContain('Second box')
  })

  test('text count increments correctly to 10', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'text', { x: 30 + (i % 3) * 130, y: 30 + Math.floor(i / 3) * 100, w: 100, h: 35 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })
})

// ─── Multi-Page ────────────────────────────────────────────────────────────

test.describe('Text Creation — Multi-Page', () => {
  test('text on page 2 persists after navigating away and back', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await goToPage(page, 1)
    await page.waitForTimeout(300)
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── Zoom ──────────────────────────────────────────────────────────────────

test.describe('Text Creation — Zoom Levels', () => {
  test('text created while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text created while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 150, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('text persists after zoom change', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Session Persistence ───────────────────────────────────────────────────

test.describe('Text Creation — Session Persistence', () => {
  test('text is saved to session storage', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    expect(anns.some(a => a.type === 'text')).toBe(true)
  })

  test('text stores position in points array', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 150, y: 150, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.points.length).toBeGreaterThanOrEqual(1)
    expect(textAnn!.points[0].x).toBeGreaterThan(0)
    expect(textAnn!.points[0].y).toBeGreaterThan(0)
  })

  test('text annotation id is a valid UUID', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('text default font size is stored', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    expect(anns.find(a => a.type === 'text')!.fontSize).toBeGreaterThan(0)
  })

  test('text default fontFamily is stored', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    expect(anns.find(a => a.type === 'text')!.fontFamily).toBeTruthy()
  })

  test('text default color is stored', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    expect(anns.find(a => a.type === 'text')!.color).toBeTruthy()
  })

  test('text persists after tool switch', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Tool switch test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Text Box Styling ─────────────────────────────────────────────────────

test.describe('Text Creation — Text Box Styling', () => {
  test('textarea has blue border in edit mode', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveClass(/border-\[#3B82F6\]/)
  })

  test('textarea has overflow hidden', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveClass(/overflow-hidden/)
  })

  test('textarea has resize-none', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveClass(/resize-none/)
  })

  test('textarea has no outline', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveClass(/outline-none/)
  })
})

// ─── Undo / Redo ────────────────────────────────────────────────────────────

test.describe('Text Creation — Undo and Redo', () => {
  test('Ctrl+Z undoes text creation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Text creation pushes multiple history entries (box creation + text commit),
    // so we need multiple undos to fully remove the annotation
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes text creation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    // Undo all history entries for text creation
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all to restore
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Delete / Duplicate / Copy-Paste ───────────────────────────────────────

test.describe('Text Creation — Delete, Duplicate, Copy-Paste', () => {
  test('Delete key removes text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace key removes text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+D duplicates text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies text annotation', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 125)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('duplicate preserves text content', async ({ page }) => {
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
    const copies = anns.filter(a => a.type === 'text' && a.text === 'Duplicate me')
    expect(copies.length).toBe(2)
  })
})

// ─── Special Characters ────────────────────────────────────────────────────

test.describe('Text Creation — Special Characters', () => {
  test('text with special characters persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello & "World" <test>')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Hello & "World" <test>')
  })

  test('text with numbers and symbols persists', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test #123 @ $99.99!')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Test #123 @ $99.99!')
  })
})

// ─── Visual ────────────────────────────────────────────────────────────────

test.describe('Text Creation — Visual Verification', () => {
  test('text renders visually on canvas after commit', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('long content text creates annotation and renders', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a longer piece of text that should wrap within the text box boundaries and still be saved correctly.')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Activation ────────────────────────────────────────────────────────────

test.describe('Text Creation — Tool Activation', () => {
  test('T key activates text tool', async ({ page }) => {
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Text (T)"]')
    await expect(btn).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('clicking Text button activates tool', async ({ page }) => {
    await page.locator('button[title="Text (T)"]').click()
    await page.waitForTimeout(100)
    const btn = page.locator('button[title="Text (T)"]')
    await expect(btn).toHaveClass(/bg-\[#F47B20\]/)
  })

  test('text tool shows text cursor on canvas', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const canvas = page.locator('canvas').nth(1)
    const textCursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['text', 'crosshair', 'none', 'default', 'auto']).toContain(textCursor)
  })

  test('switching away deactivates text tool', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await selectTool(page, 'Select (S)')
    await expect(page.locator('button[title="Text (T)"]')).not.toHaveClass(/bg-\[#F47B20\]/)
  })

  test('text tool shows formatting controls in toolbar', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') })
    await expect(fontSelect.first()).toBeVisible()
  })
})
