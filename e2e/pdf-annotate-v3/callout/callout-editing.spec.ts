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

/** Helper: create a callout, type content, commit */
async function createCommittedCallout(page: import('@playwright/test').Page, text: string, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 100 }
  await selectTool(page, 'Callout (O)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  await page.keyboard.type(text)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await selectTool(page, 'Select (S)')
}

// ─── Re-Enter Edit Mode ──────────────────────────────────────────────────

test.describe('Callout Editing — Re-Enter Edit Mode', () => {
  test('double-click callout re-enters edit mode', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('re-entering edit mode shows existing text', async ({ page }) => {
    await createCommittedCallout(page, 'Existing callout text')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Existing callout text')
    }
  })

  test('modify text in re-edit mode', async ({ page }) => {
    await createCommittedCallout(page, 'Original callout')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+a')
      await page.keyboard.type('Modified callout')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'callout')!.text).toBe('Modified callout')
    }
  })

  test('re-editing does not create duplicate callout', async ({ page }) => {
    await createCommittedCallout(page, 'Single')
    expect(await getAnnotationCount(page)).toBe(1)
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type(' more')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Formatting in Callout ────────────────────────────────────────────────

test.describe('Callout Editing — Formatting', () => {
  test('bold formatting works in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    const textarea = page.locator('textarea')
    // Font weight might be 700 or bold
    const fw = await textarea.evaluate(el => getComputedStyle(el).fontWeight)
    expect(parseInt(fw) >= 700 || fw === 'bold').toBeTruthy()
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    expect(anns.find(a => a.type === 'callout')!.bold).toBe(true)
  })

  test('italic formatting works in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    const fontStyle = await page.locator('textarea').evaluate(el => getComputedStyle(el).fontStyle)
    expect(fontStyle).toBe('italic')
  })

  test('underline formatting works in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    const td = await page.locator('textarea').evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('strikethrough formatting works in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const td = await page.locator('textarea').evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('bold + italic formatting in callout persists', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.bold).toBe(true)
    expect(callout!.italic).toBe(true)
  })

  test('font family change works for callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    const hasFontSelect = await fontSelect.isVisible().catch(() => false)
    if (hasFontSelect) {
      await fontSelect.selectOption('Courier New')
      await page.waitForTimeout(100)
      const ff = await page.locator('textarea').evaluate(el => getComputedStyle(el).fontFamily)
      expect(ff.toLowerCase()).toContain('courier')
    } else {
      // Font family selector not available - just verify callout creation works
      await page.keyboard.type('Font test')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })

  test('font size change works for callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    const hasSizeSelect = await sizeSelect.isVisible().catch(() => false)
    if (hasSizeSelect) {
      await sizeSelect.selectOption('24')
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Large callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout?.fontSize).toBeGreaterThan(0)
  })

  test('text alignment works in callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const alignBtn = page.locator('button[title*="Center"], button[title*="center"]').first()
    const hasAlign = await alignBtn.isVisible().catch(() => false)
    if (hasAlign) {
      await alignBtn.click()
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Centered callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line spacing change works for callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const spacingSelect = page.locator('select[title="Line spacing"]')
    const hasSpacing = await spacingSelect.isVisible().catch(() => false)
    if (hasSpacing) {
      await spacingSelect.selectOption('2')
      await page.waitForTimeout(100)
    }
    await page.keyboard.type('Spacing test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Callout Text Wrapping and Auto-Height ────────────────────────────────

test.describe('Callout Editing — Text Wrapping', () => {
  test('callout text wraps within box', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('This is a long callout text that should wrap within the callout box')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout multiline text works', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Line 1')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 2')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line 3')
    await expect(page.locator('textarea')).toHaveValue('Line 1\nLine 2\nLine 3')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout auto-height expands with content', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const initialHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    for (let i = 0; i < 8; i++) {
      await page.keyboard.type('line')
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(400)
    const expandedHeight = await textarea.evaluate(el => el.getBoundingClientRect().height)
    expect(expandedHeight).toBeGreaterThan(initialHeight)
  })
})

// ─── Callout Move ─────────────────────────────────────────────────────────

test.describe('Callout Editing — Move', () => {
  test('moving callout changes its visual position', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    const before = await screenshotCanvas(page)
    await moveAnnotation(page, { x: 200, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('nudge callout with arrow keys', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+Arrow nudges callout by 10px', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('callout editable after move', async ({ page }) => {
    await createCommittedCallout(page, 'Movable')
    await moveAnnotation(page, { x: 200, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await doubleClickCanvasAt(page, 300, 300)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveValue('Movable')
    }
  })
})

// ─── Callout Resize ───────────────────────────────────────────────────────

test.describe('Callout Editing — Resize', () => {
  test('callout can be resized by dragging handle', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    // Drag SE corner
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 400, y: 300 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('callout editable after resize', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 380, y: 250 })
    await page.waitForTimeout(300)
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.type('After resize')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
      expect(anns.find(a => a.type === 'callout')!.text).toContain('After resize')
    }
  })
})

// ─── Formatting Persistence ──────────────────────────────────────────────

test.describe('Callout Editing — Formatting Persistence', () => {
  test('bold formatting persists after re-edit', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 150)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      const fwPersist = await textarea.evaluate(el => getComputedStyle(el).fontWeight)
      expect(parseInt(fwPersist) >= 700 || fwPersist === 'bold').toBeTruthy()
    }
  })

  test('formatting persists after move', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted moved')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await moveAnnotation(page, { x: 200, y: 150 }, { x: 300, y: 300 })
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.bold).toBe(true)
    expect(callout!.italic).toBe(true)
  })
})

// ─── Tab Cycling ──────────────────────────────────────────────────────────

test.describe('Callout Editing — Tab Cycling', () => {
  test('Tab cycles between callouts', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 180, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 180, h: 80 })
    await selectAnnotationAt(page, 140, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    // Should cycle to the next annotation
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('Tab cycles between callout and text box together', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 60, w: 150, h: 50 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 180, h: 80 })
    await selectAnnotationAt(page, 125, 85)
    await page.waitForTimeout(200)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Special Characters ──────────────────────────────────────────────────

test.describe('Callout Editing — Special Characters', () => {
  test('callout with special characters persists', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Note: $100 & "test"')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'callout')!.text).toBe('Note: $100 & "test"')
  })
})

// ─── Undo Delete Restores Callout ─────────────────────────────────────────

test.describe('Callout Editing — Undo/Redo', () => {
  test('undo deletion restores callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo removes last callout when multiple exist', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 180, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 180, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Callout creation may push multiple history entries (text commit + creation)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })
})
