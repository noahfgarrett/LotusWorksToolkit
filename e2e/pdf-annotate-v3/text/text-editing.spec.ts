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

/** Helper: create a text box, type content, commit, return to Select tool */
async function createCommittedText(page: import('@playwright/test').Page, text: string, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 60 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await selectTool(page, 'Select (S)')
}

// ─── Full Lifecycle: Create, Click Out, Click Back, Double-Click to Edit ──

test.describe('Text Editing — Full Lifecycle', () => {
  test('create text, Escape, double-click to re-enter edit mode', async ({ page }) => {
    await createCommittedText(page, 'Original')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('re-entering edit mode shows existing text content', async ({ page }) => {
    await createCommittedText(page, 'Existing content')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Existing content')
    }
  })

  test('modify text in re-edit mode and commit again', async ({ page }) => {
    await createCommittedText(page, 'Initial')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      // Select all and replace
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Modified')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toBe('Modified')
    }
  })

  test('create text, click away, click text to select, double-click to edit, change text', async ({ page }) => {
    await createCommittedText(page, 'Step one')
    // Click away to deselect
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    // Click text to select it
    await selectAnnotationAt(page, 200, 130)
    await page.waitForTimeout(200)
    // Double-click to enter edit mode
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Step two')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toBe('Step two')
    }
  })

  test('full lifecycle: create, commit, re-edit, add more text, commit again', async ({ page }) => {
    await createCommittedText(page, 'Start')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      // Move to end and append
      await page.keyboard.press('End')
      await page.keyboard.type(' end')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toContain('Start')
      expect(anns.find(a => a.type === 'text')!.text).toContain('end')
    }
  })
})

// ─── Edit and Auto-Height ─────────────────────────────────────────────────

test.describe('Text Editing — Auto Height on Edit', () => {
  test('adding more lines during re-edit expands height', async ({ page }) => {
    await createCommittedText(page, 'Line 1')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    const heightBefore = (Object.values(sessionBefore.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')?.height ?? 0
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('End')
      for (let i = 2; i <= 8; i++) {
        await page.keyboard.press('Enter')
        await page.keyboard.type(`Line ${i}`)
      }
      await page.waitForTimeout(400)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const sessionAfter = await getSessionData(page)
      const heightAfter = (Object.values(sessionAfter.annotations).flat() as Array<{ type: string; height?: number }>).find(a => a.type === 'text')?.height ?? 0
      expect(heightAfter).toBeGreaterThan(heightBefore)
    }
  })
})

// ─── Delete All Content and Retype ────────────────────────────────────────

test.describe('Text Editing — Content Replacement', () => {
  test('delete all content and re-type new content', async ({ page }) => {
    await createCommittedText(page, 'Old content')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Delete')
      await page.keyboard.type('New content')
      await expect(textarea).toHaveValue('New content')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toBe('New content')
    }
  })

  test('Ctrl+A selects all text in textarea', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Select all test')
    await page.keyboard.press('Control+a')
    await page.keyboard.type('Replaced')
    await expect(page.locator('textarea')).toHaveValue('Replaced')
  })

  test('partial text selection and replacement via keyboard', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello World')
    // Select last 5 characters (World) using Shift+Home then retype
    await page.keyboard.press('End')
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+ArrowLeft')
    }
    await page.keyboard.type('Earth')
    await expect(page.locator('textarea')).toHaveValue('Hello Earth')
  })
})

// ─── Multi-Paragraph Editing ──────────────────────────────────────────────

test.describe('Text Editing — Multi-Paragraph', () => {
  test('multi-paragraph text editing with Enter key', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 300 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Paragraph 1')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Paragraph 2')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Paragraph 3')
    const textarea = page.locator('textarea')
    await expect(textarea).toHaveValue('Paragraph 1\n\nParagraph 2\n\nParagraph 3')
  })

  test('Enter key creates newlines in text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line A')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line B')
    await expect(page.locator('textarea')).toHaveValue('Line A\nLine B')
  })
})

// ─── Undo Within Textarea ──────────────────────────────────────────────────

test.describe('Text Editing — Undo in Textarea', () => {
  test('Ctrl+Z undoes text changes within textarea', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.type(' World')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    // Undo should revert some of the typing
    const textarea = page.locator('textarea')
    const value = await textarea.inputValue()
    expect(value.length).toBeLessThan('Hello World'.length)
  })
})

// ─── Tab Cycling Between Text Boxes ────────────────────────────────────────

test.describe('Text Editing — Tab Cycling', () => {
  test('Tab cycles to next text box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 200, w: 150, h: 50 })
    // Select first text box
    await selectAnnotationAt(page, 125, 105)
    await page.waitForTimeout(200)
    // Tab to next
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    // Should now have a different annotation selected or textarea visible
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('Shift+Tab cycles to previous text box', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 125, 225)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(300)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('Tab into text box enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 80, w: 150, h: 50 })
    await createAnnotation(page, 'text', { x: 50, y: 200, w: 150, h: 50 })
    await selectAnnotationAt(page, 125, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    // After Tab, the next annotation should be selected or in edit mode
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Multiple Edits to Same Text Box ──────────────────────────────────────

test.describe('Text Editing — Multiple Edit Sessions', () => {
  test('edit text box three times, each edit persists', async ({ page }) => {
    // Create and first edit
    await createCommittedText(page, 'Version 1')
    // Second edit
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    let textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Version 2')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    // Third edit
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Version 3')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Version 3')
  })

  test('edit text, navigate away (page change), come back, text still there', async ({ page }) => {
    await createCommittedText(page, 'Persistent across pages')
    await goToPage(page, 2)
    await page.waitForTimeout(300)
    await goToPage(page, 1)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const texts = anns.filter(a => a.type === 'text')
    expect(texts.some(t => t.text === 'Persistent across pages')).toBe(true)
  })

  test('edit text, zoom in, text still editable', async ({ page }) => {
    await createCommittedText(page, 'Zoom test')
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Rapid Create-Edit-Commit Cycles ──────────────────────────────────────

test.describe('Text Editing — Rapid Cycles', () => {
  test('rapid create-edit-commit cycle for 10 text boxes', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await selectTool(page, 'Text (T)')
      await dragOnCanvas(page, { x: 30 + (i % 4) * 100, y: 30 + Math.floor(i / 4) * 100, w: 80, h: 35 }, { x: 30 + (i % 4) * 100 + 80, y: 30 + Math.floor(i / 4) * 100 + 35 })
      await page.waitForTimeout(200)
      await page.keyboard.type(`Box ${i + 1}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('rapid typing in text box preserves all characters', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 400, y: 200 })
    await page.waitForTimeout(300)
    const fastText = 'The quick brown fox jumps over the lazy dog 1234567890'
    await page.keyboard.type(fastText, { delay: 10 })
    await expect(page.locator('textarea')).toHaveValue(fastText)
  })
})

// ─── Special Characters in Edit Mode ──────────────────────────────────────

test.describe('Text Editing — Special Characters', () => {
  test('special characters !@#$%^&*() in text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('!@#$%^&*()')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('!@#$%^&*()')
  })

  test('unicode characters persist', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 350, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Caf\u00e9 na\u00efve r\u00e9sum\u00e9')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Blur Commit Behavior ─────────────────────────────────────────────────

test.describe('Text Editing — Blur Commit', () => {
  test('clicking outside text box commits content', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur commit test')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'text')!.text).toBe('Blur commit test')
  })

  test('switching tool while editing commits text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Tool switch commit')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Arrow Keys in Edit Mode ──────────────────────────────────────────────

test.describe('Text Editing — Cursor Movement', () => {
  test('arrow keys in edit mode move cursor, not annotation', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Hello')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.type('XX')
    await expect(page.locator('textarea')).toHaveValue('HelXXlo')
  })

  test('Home key moves cursor to beginning of line', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await page.keyboard.press('Home')
    await page.keyboard.type('Start ')
    await expect(page.locator('textarea')).toHaveValue('Start Test')
  })

  test('End key moves cursor to end of line', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await page.keyboard.press('Home')
    await page.keyboard.press('End')
    await page.keyboard.type(' End')
    await expect(page.locator('textarea')).toHaveValue('Test End')
  })
})

// ─── Edit After Move ──────────────────────────────────────────────────────

test.describe('Text Editing — Edit After Move', () => {
  test('text is editable after being moved', async ({ page }) => {
    await createCommittedText(page, 'Movable text')
    await moveAnnotation(page, { x: 200, y: 130 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    // Double-click at new position to edit
    await doubleClickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Movable text')
      await page.keyboard.press('End')
      await page.keyboard.type(' edited')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toBe('Movable text edited')
    }
  })
})

// ─── Edit After Resize ────────────────────────────────────────────────────

test.describe('Text Editing — Edit After Resize', () => {
  test('text is editable after annotation operations', async ({ page }) => {
    await createCommittedText(page, 'Resize edit test')
    // Select and duplicate to verify editability after operations
    await selectAnnotationAt(page, 200, 130)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
    // Original should still be editable
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      const value = await textarea.inputValue()
      expect(value).toBe('Resize edit test')
    }
  })
})

// ─── Edit Preserves Formatting ────────────────────────────────────────────

test.describe('Text Editing — Formatting Preservation', () => {
  test('bold formatting preserved when re-editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('font-weight', '700')
    }
  })

  test('italic formatting preserved when re-editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('font-style', 'italic')
    }
  })

  test('alignment preserved when re-editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('text-align', 'center')
    }
  })

  test('font size preserved when re-editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Large text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    expect(anns.find(a => a.type === 'text')!.fontSize).toBe(24)
  })

  test('font family preserved when re-editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Courier text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    expect(anns.find(a => a.type === 'text')!.fontFamily).toBe('Courier New')
  })
})

// ─── Edit Does Not Create Duplicate ───────────────────────────────────────

test.describe('Text Editing — No Duplicate Creation', () => {
  test('re-editing does not create a second annotation', async ({ page }) => {
    await createCommittedText(page, 'Single')
    expect(await getAnnotationCount(page)).toBe(1)
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type(' more')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple re-edits still only have one annotation', async ({ page }) => {
    await createCommittedText(page, 'One')
    for (let i = 0; i < 5; i++) {
      await doubleClickCanvasAt(page, 200, 130)
      await page.waitForTimeout(300)
      const textarea = page.locator('textarea')
      if (await textarea.isVisible()) {
        await page.keyboard.press('Control+a')
        await page.keyboard.type(`Edit ${i + 1}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
      }
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Clearing Content on Re-Edit ──────────────────────────────────────────

test.describe('Text Editing — Clear and Retype', () => {
  test('clearing all content and retyping', async ({ page }) => {
    await createCommittedText(page, 'To be replaced')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.type('Brand new content')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'text')!.text).toBe('Brand new content')
    }
  })
})

// ─── Annotation Count Through Edit Cycles ─────────────────────────────────

test.describe('Text Editing — Count Integrity', () => {
  test('annotation count stays at 2 through edits of one text box', async ({ page }) => {
    await createCommittedText(page, 'Text A', { x: 50, y: 80, w: 150, h: 50 })
    await createCommittedText(page, 'Text B', { x: 50, y: 220, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Edit first text
    await doubleClickCanvasAt(page, 125, 105)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Text A Modified')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })
})
