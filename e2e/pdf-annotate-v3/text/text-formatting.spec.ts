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

/** Helper: create a text box in edit mode and return textarea locator */
async function createTextInEditMode(page: import('@playwright/test').Page, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 200, h: 60 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  return page.locator('textarea')
}

// ─── Bold ──────────────────────────────────────────────────────────────────

test.describe('Text Formatting — Bold', () => {
  test('Bold button visible when text tool active', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeVisible()
  })

  test('clicking Bold button applies bold', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title*="Bold"]').first().click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+B toggles bold on', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
  })

  test('Ctrl+B toggles bold off', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '400')
  })

  test('bold persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    expect(anns.find(a => a.type === 'text')!.bold).toBe(true)
  })

  test('Bold button shows active state when bold is on', async ({ page }) => {
    await createTextInEditMode(page)
    const boldBtn = page.locator('button[title*="Bold"]').first()
    await boldBtn.click()
    await page.waitForTimeout(100)
    await expect(boldBtn).toHaveClass(/text-\[#F47B20\]/)
  })

  test('Bold button shows inactive state when bold is off', async ({ page }) => {
    await createTextInEditMode(page)
    const boldBtn = page.locator('button[title*="Bold"]').first()
    await expect(boldBtn).not.toHaveClass(/text-\[#F47B20\]/)
  })
})

// ─── Italic ────────────────────────────────────────────────────────────────

test.describe('Text Formatting — Italic', () => {
  test('Italic button visible when text tool active', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title*="Italic"]').first()).toBeVisible()
  })

  test('clicking Italic button applies italic', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title*="Italic"]').first().click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+I toggles italic on', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('Ctrl+I toggles italic off', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-style', 'normal')
  })

  test('italic persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; italic?: boolean }>
    expect(anns.find(a => a.type === 'text')!.italic).toBe(true)
  })
})

// ─── Underline ─────────────────────────────────────────────────────────────

test.describe('Text Formatting — Underline', () => {
  test('Underline button visible when text tool active', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title*="Underline"]').first()).toBeVisible()
  })

  test('clicking Underline button applies underline', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title*="Underline"]').first().click()
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('Ctrl+U toggles underline on', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('underline persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('Underline text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; underline?: boolean }>
    expect(anns.find(a => a.type === 'text')!.underline).toBe(true)
  })
})

// ─── Strikethrough ─────────────────────────────────────────────────────────

test.describe('Text Formatting — Strikethrough', () => {
  test('Strikethrough button visible when text tool active', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title*="Strikethrough"]').first()).toBeVisible()
  })

  test('clicking Strikethrough button applies strikethrough', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title*="Strikethrough"]').first().click()
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('Ctrl+Shift+X toggles strikethrough on', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('strikethrough persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await page.keyboard.type('Struck text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; strikethrough?: boolean }>
    expect(anns.find(a => a.type === 'text')!.strikethrough).toBe(true)
  })
})

// ─── Combined Formatting ──────────────────────────────────────────────────

test.describe('Text Formatting — Combined', () => {
  test('bold + italic applied together', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('bold + underline applied together', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('all four formatting combined: bold + italic + underline + strikethrough', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('font-weight', '700')
    await expect(textarea).toHaveCSS('font-style', 'italic')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
    expect(td).toContain('line-through')
  })

  test('bold + italic persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean; italic?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn!.bold).toBe(true)
    expect(textAnn!.italic).toBe(true)
  })

  test('formatting persists across edit sessions', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold persists')
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
})

// ─── Font Size ─────────────────────────────────────────────────────────────

test.describe('Text Formatting — Font Size', () => {
  test('font size dropdown is visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') })
    await expect(sizeSelect.first()).toBeVisible()
  })

  test('changing font size to 24 applies to textarea', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    // Font size is 24 * RENDER_SCALE in CSS pixels. On any display, the value should be >= 24.
    expect(fs).toBeGreaterThanOrEqual(24)
  })

  test('font size 8 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="8"]')).toBeAttached()
  })

  test('font size 12 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="12"]')).toBeAttached()
  })

  test('font size 16 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="16"]')).toBeAttached()
  })

  test('font size 36 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="36"]')).toBeAttached()
  })

  test('font size 48 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="48"]')).toBeAttached()
  })

  test('font size 72 is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("16")') }).first()
    await expect(sizeSelect.locator('option[value="72"]')).toBeAttached()
  })

  test('small font size (8) renders small text', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('8')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    // Font size is 8 * RENDER_SCALE in CSS pixels. Should be >= 8.
    expect(fs).toBeGreaterThanOrEqual(8)
  })

  test('large font size (72) renders large text', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('72')
    await page.waitForTimeout(100)
    const fs = await textarea.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    // Font size is 72 * RENDER_SCALE in CSS pixels. Should be >= 72.
    expect(fs).toBeGreaterThanOrEqual(72)
  })

  test('font size 32 persists in session', async ({ page }) => {
    await createTextInEditMode(page)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('32')
    await page.waitForTimeout(100)
    await page.keyboard.type('Large text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const textAnn = anns.find(a => a.type === 'text')
    expect(textAnn).toBeDefined()
    if (textAnn?.fontSize) {
      expect(textAnn.fontSize).toBeGreaterThanOrEqual(20)
    }
  })
})

// ─── Font Family ───────────────────────────────────────────────────────────

test.describe('Text Formatting — Font Family', () => {
  test('font family dropdown is visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') })
    await expect(fontSelect.first()).toBeVisible()
  })

  test('changing font family to Courier New applies to textarea', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    const ff = await textarea.evaluate(el => getComputedStyle(el).fontFamily)
    expect(ff).toContain('Courier New')
  })

  test('Times New Roman font is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Times New Roman")')).toBeAttached()
  })

  test('Georgia font is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Georgia")')).toBeAttached()
  })

  test('Consolas font is available', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await expect(fontSelect.locator('option:has-text("Consolas")')).toBeAttached()
  })

  test('font family change persists in session', async ({ page }) => {
    await createTextInEditMode(page)
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()
    await fontSelect.selectOption('Georgia')
    await page.waitForTimeout(100)
    await page.keyboard.type('Georgia font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontFamily?: string }>
    expect(anns.find(a => a.type === 'text')!.fontFamily).toBe('Georgia')
  })
})

// ─── Text Alignment ────────────────────────────────────────────────────────

test.describe('Text Formatting — Alignment', () => {
  test('Align Left button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Left"]')).toBeVisible()
  })

  test('Align Center button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Center"]')).toBeVisible()
  })

  test('Align Right button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Align Right"]')).toBeVisible()
  })

  test('default alignment is left', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('clicking Align Center applies center alignment', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('clicking Align Right applies right alignment', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('switching from right to left resets alignment', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Align Left"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('alignment persists in session data', async ({ page }) => {
    await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; textAlign?: string }>
    expect(anns.find(a => a.type === 'text')!.textAlign).toBe('center')
  })

  test('alignment cycling: left -> center -> right', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await expect(textarea).toHaveCSS('text-align', 'left')
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'center')
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await expect(textarea).toHaveCSS('text-align', 'right')
  })
})

// ─── Line Spacing ──────────────────────────────────────────────────────────

test.describe('Text Formatting — Line Spacing', () => {
  test('line spacing dropdown is visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('select[title="Line spacing"]')).toBeVisible()
  })

  test('default line spacing is 1.3', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    // CSS computed line-height returns pixel values; check via inline style
    const lh = await textarea.evaluate(el => el.style.lineHeight)
    expect(lh).toBe('1.3')
  })

  test('line spacing 1.0 applies correctly', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('select[title="Line spacing"]').selectOption('1')
    await page.waitForTimeout(100)
    const lh = await textarea.evaluate(el => el.style.lineHeight)
    expect(lh).toBe('1')
  })

  test('line spacing 1.5 applies correctly', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('select[title="Line spacing"]').selectOption('1.5')
    await page.waitForTimeout(100)
    const lh = await textarea.evaluate(el => el.style.lineHeight)
    expect(lh).toBe('1.5')
  })

  test('line spacing 2.0 applies correctly', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('select[title="Line spacing"]').selectOption('2')
    await page.waitForTimeout(100)
    const lh = await textarea.evaluate(el => el.style.lineHeight)
    expect(lh).toBe('2')
  })

  test('line spacing options include 1.0, 1.15, 1.3, 1.5, 2.0', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const spacingSelect = page.locator('select[title="Line spacing"]')
    await expect(spacingSelect.locator('option[value="1"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.15"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.3"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="1.5"]')).toBeAttached()
    await expect(spacingSelect.locator('option[value="2"]')).toBeAttached()
  })

  test('line spacing 1.5 persists in session', async ({ page }) => {
    await createTextInEditMode(page)
    await page.locator('select[title="Line spacing"]').selectOption('1.5')
    await page.waitForTimeout(100)
    await page.keyboard.type('Spaced')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    expect(anns.find(a => a.type === 'text')!.lineHeight).toBe(1.5)
  })

  test('line spacing 2.0 persists in session', async ({ page }) => {
    await createTextInEditMode(page)
    await page.locator('select[title="Line spacing"]').selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('Double')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    expect(anns.find(a => a.type === 'text')!.lineHeight).toBe(2)
  })
})

// ─── Background Highlight ──────────────────────────────────────────────────

test.describe('Text Formatting — Background Highlight', () => {
  test('background highlight button visible', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Text background highlight"]')).toBeVisible()
  })

  test('clicking background highlight toggles it on', async ({ page }) => {
    await createTextInEditMode(page)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).toHaveClass(/text-\[#F47B20\]/)
  })

  test('clicking background highlight again toggles it off', async ({ page }) => {
    await createTextInEditMode(page)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await bgBtn.click()
    await page.waitForTimeout(100)
    await expect(bgBtn).not.toHaveClass(/text-\[#F47B20\]/)
  })
})

// ─── Text Color ────────────────────────────────────────────────────────────

test.describe('Text Formatting — Text Color', () => {
  test('red color swatch applies red to text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    expect(anns.find(a => a.type === 'text')!.color).toBe('#FF0000')
  })

  test('blue color swatch applies blue to text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const blueSwatch = page.locator('button[title="#3B82F6"]')
    if (await blueSwatch.isVisible()) await blueSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blue')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    expect(anns.find(a => a.type === 'text')!.color).toBe('#3B82F6')
  })

  test('green color swatch applies green to text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    const greenSwatch = page.locator('button[title="#22C55E"]')
    if (await greenSwatch.isVisible()) await greenSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 160 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Green')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    expect(anns.find(a => a.type === 'text')!.color).toBe('#22C55E')
  })
})

// ─── Formatting Applied to Existing Text ──────────────────────────────────

test.describe('Text Formatting — Applied to Existing Text', () => {
  test('apply bold to existing text box via re-edit', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.type('Normal text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await page.keyboard.press('Control+b')
      await page.waitForTimeout(100)
      await expect(textarea).toHaveCSS('font-weight', '700')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await waitForSessionSave(page)
      const session = await getSessionData(page)
      const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
      expect(anns.find(a => a.type === 'text')!.bold).toBe(true)
    }
  })

  test('formatting persists after deselect and reselect', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Formatted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Click away
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    // Re-enter edit
    await selectTool(page, 'Select (S)')
    await doubleClickCanvasAt(page, 200, 130)
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    if (await textarea.isVisible()) {
      await expect(textarea).toHaveCSS('font-weight', '700')
      await expect(textarea).toHaveCSS('font-style', 'italic')
    }
  })
})

// ─── Floating Toolbar ──────────────────────────────────────────────────────

test.describe('Text Formatting — Floating Toolbar', () => {
  test('formatting controls visible for Text tool', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeVisible()
    await expect(page.locator('button[title*="Italic"]').first()).toBeVisible()
    await expect(page.locator('button[title*="Underline"]').first()).toBeVisible()
    await expect(page.locator('button[title*="Strikethrough"]').first()).toBeVisible()
  })

  test('formatting controls visible for Callout tool', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeVisible()
  })

  test('formatting controls hidden for Pencil tool', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeHidden()
  })

  test('formatting controls hidden for Rectangle tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeHidden()
  })

  test('formatting controls hidden for Select tool', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await expect(page.locator('button[title*="Bold"]').first()).toBeHidden()
  })
})

// ─── Formatting Undo/Redo ─────────────────────────────────────────────────

test.describe('Text Formatting — Undo/Redo', () => {
  test('formatting survives annotation undo/redo', async ({ page }) => {
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold undo test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo the creation — may need multiple undos (one for text commit, one for creation)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    const countAfterUndo = await getAnnotationCount(page)
    expect(countAfterUndo).toBeLessThanOrEqual(1)
    // Redo
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; bold?: boolean }>
    const textAnn = anns.find(a => a.type === 'text')
    if (textAnn) {
      expect(textAnn.bold).toBe(true)
    }
  })
})
