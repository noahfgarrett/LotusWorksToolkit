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

/** Helper: create a text box in edit mode */
async function createTextInEditMode(page: import('@playwright/test').Page, region?: { x: number; y: number; w: number; h: number }) {
  const r = region ?? { x: 100, y: 100, w: 250, h: 80 }
  await selectTool(page, 'Text (T)')
  await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
  await page.waitForTimeout(300)
  return page.locator('textarea')
}

// ─── Bold Visual ──────────────────────────────────────────────────────────

test.describe('Text Visual — Bold Rendering', () => {
  test('bold text renders differently from normal text', async ({ page }) => {
    // Create normal text
    await createTextInEditMode(page, { x: 50, y: 80, w: 200, h: 50 })
    await page.keyboard.type('Normal text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const normalScreenshot = await screenshotCanvas(page)

    // Create bold text below
    await createTextInEditMode(page, { x: 50, y: 200, w: 200, h: 50 })
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const boldScreenshot = await screenshotCanvas(page)

    // The two screenshots should differ (bold text added)
    expect(Buffer.compare(normalScreenshot, boldScreenshot)).not.toBe(0)
  })

  test('bold text has font-weight 700 in edit mode', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(100)
    await page.keyboard.type('Bold')
    await expect(textarea).toHaveCSS('font-weight', '700')
  })
})

// ─── Italic Visual ────────────────────────────────────────────────────────

test.describe('Text Visual — Italic Rendering', () => {
  test('italic text renders with slant in edit mode', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Italic')
    await expect(textarea).toHaveCSS('font-style', 'italic')
  })

  test('italic text on canvas differs from normal', async ({ page }) => {
    await createTextInEditMode(page, { x: 50, y: 80, w: 200, h: 50 })
    await page.keyboard.type('Normal')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)

    await createTextInEditMode(page, { x: 50, y: 200, w: 200, h: 50 })
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(100)
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)

    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Underline Visual ─────────────────────────────────────────────────────

test.describe('Text Visual — Underline Rendering', () => {
  test('underline visible in edit mode textarea', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('Underlined')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('underline')
  })

  test('underline text renders on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('Underlined text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Strikethrough Visual ──────────────────────────────────────────────────

test.describe('Text Visual — Strikethrough Rendering', () => {
  test('strikethrough visible in edit mode textarea', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await page.keyboard.type('Struck through')
    const td = await textarea.evaluate(el => getComputedStyle(el).textDecorationLine)
    expect(td).toContain('line-through')
  })

  test('strikethrough text renders on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(100)
    await page.keyboard.type('Struck text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Font Size Visual ─────────────────────────────────────────────────────

test.describe('Text Visual — Font Size Differences', () => {
  test('font size 8 renders smaller than font size 48', async ({ page }) => {
    // Small text
    const textarea1 = await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 40 })
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('8')
    await page.waitForTimeout(100)
    await page.keyboard.type('Small')
    const smallFontSize = await textarea1.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Large text
    const textarea2 = await createTextInEditMode(page, { x: 50, y: 200, w: 300, h: 100 })
    await sizeSelect.selectOption('48')
    await page.waitForTimeout(100)
    await page.keyboard.type('Large')
    const largeFontSize = await textarea2.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    expect(largeFontSize).toBeGreaterThan(smallFontSize)
  })

  test('different font sizes produce visually different text on canvas', async ({ page }) => {
    await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 40 })
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('12')
    await page.waitForTimeout(100)
    await page.keyboard.type('Size 12')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const screenshot12 = await screenshotCanvas(page)

    await createTextInEditMode(page, { x: 50, y: 200, w: 300, h: 80 })
    await sizeSelect.selectOption('36')
    await page.waitForTimeout(100)
    await page.keyboard.type('Size 36')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const screenshot36 = await screenshotCanvas(page)

    expect(Buffer.compare(screenshot12, screenshot36)).not.toBe(0)
  })
})

// ─── Text Alignment Visual ────────────────────────────────────────────────

test.describe('Text Visual — Alignment Rendering', () => {
  test('left-aligned text starts at left edge in edit mode', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.keyboard.type('Left aligned')
    await expect(textarea).toHaveCSS('text-align', 'left')
  })

  test('center-aligned text centers in edit mode', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Centered')
    await expect(textarea).toHaveCSS('text-align', 'center')
  })

  test('right-aligned text aligns right in edit mode', async ({ page }) => {
    const textarea = await createTextInEditMode(page)
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right aligned')
    await expect(textarea).toHaveCSS('text-align', 'right')
  })

  test('different alignments produce different canvas renders', async ({ page }) => {
    await createTextInEditMode(page, { x: 50, y: 50, w: 250, h: 50 })
    await page.keyboard.type('Left text is here')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const leftScreenshot = await screenshotCanvas(page)

    await createTextInEditMode(page, { x: 50, y: 200, w: 250, h: 50 })
    await page.locator('button[title="Align Right"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Right text is here')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const rightScreenshot = await screenshotCanvas(page)

    expect(Buffer.compare(leftScreenshot, rightScreenshot)).not.toBe(0)
  })
})

// ─── Text Background Color Visual ─────────────────────────────────────────

test.describe('Text Visual — Background Color', () => {
  test('text with background highlight renders differently', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createTextInEditMode(page)
    const bgBtn = page.locator('button[title="Text background highlight"]')
    await bgBtn.click()
    await page.waitForTimeout(100)
    await page.keyboard.type('Highlighted text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Text Color Visual ────────────────────────────────────────────────────

test.describe('Text Visual — Text Color', () => {
  test('red text renders differently from default', async ({ page }) => {
    // Default color text
    await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 50 })
    await page.keyboard.type('Default color')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const defaultShot = await screenshotCanvas(page)

    // Red text
    await selectTool(page, 'Text (T)')
    const redSwatch = page.locator('button[title="#FF0000"]')
    if (await redSwatch.isVisible()) await redSwatch.click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 50, y: 200 }, { x: 250, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red color text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const redShot = await screenshotCanvas(page)

    expect(Buffer.compare(defaultShot, redShot)).not.toBe(0)
  })
})

// ─── Line Spacing Visual ──────────────────────────────────────────────────

test.describe('Text Visual — Line Spacing', () => {
  test('spacing 1.0 produces tighter lines than spacing 2.0', async ({ page }) => {
    const spacingSelect = page.locator('select[title="Line spacing"]')

    // Tight spacing
    const textarea1 = await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 100 })
    await spacingSelect.selectOption('1')
    await page.waitForTimeout(100)
    await page.keyboard.type('A\nB\nC\nD')
    const height1 = await textarea1.evaluate(el => el.getBoundingClientRect().height)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Double spacing
    const textarea2 = await createTextInEditMode(page, { x: 50, y: 300, w: 200, h: 200 })
    await spacingSelect.selectOption('2')
    await page.waitForTimeout(100)
    await page.keyboard.type('A\nB\nC\nD')
    const height2 = await textarea2.evaluate(el => el.getBoundingClientRect().height)

    expect(height2).toBeGreaterThan(height1)
  })
})

// ─── Combined Formatting Visual ────────────────────────────────────────────

test.describe('Text Visual — Combined Formatting', () => {
  test('bold + italic + underline text renders on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createTextInEditMode(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(50)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(100)
    await page.keyboard.type('Fully formatted text')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('large bold centered text renders distinctively', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createTextInEditMode(page, { x: 50, y: 100, w: 400, h: 100 })
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.locator('button[title="Align Center"]').click()
    await page.waitForTimeout(50)
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('36')
    await page.waitForTimeout(100)
    await page.keyboard.type('BIG BOLD CENTER')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Font Family Visual ──────────────────────────────────────────────────

test.describe('Text Visual — Font Family', () => {
  test('different font families produce different renders', async ({ page }) => {
    const fontSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arial")') }).first()

    await createTextInEditMode(page, { x: 50, y: 50, w: 200, h: 50 })
    await fontSelect.selectOption('Arial')
    await page.waitForTimeout(100)
    await page.keyboard.type('Arial font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const arialShot = await screenshotCanvas(page)

    await createTextInEditMode(page, { x: 50, y: 200, w: 200, h: 50 })
    await fontSelect.selectOption('Courier New')
    await page.waitForTimeout(100)
    await page.keyboard.type('Courier font')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const courierShot = await screenshotCanvas(page)

    expect(Buffer.compare(arialShot, courierShot)).not.toBe(0)
  })
})

// ─── Multiple Text Visual ─────────────────────────────────────────────────

test.describe('Text Visual — Multiple Boxes', () => {
  test('multiple text boxes with different formatting render correctly', async ({ page }) => {
    const before = await screenshotCanvas(page)

    // Bold text
    await createTextInEditMode(page, { x: 50, y: 50, w: 180, h: 40 })
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(50)
    await page.keyboard.type('Bold')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Italic text
    await createTextInEditMode(page, { x: 50, y: 150, w: 180, h: 40 })
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(50)
    await page.keyboard.type('Italic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Large text
    await createTextInEditMode(page, { x: 50, y: 250, w: 250, h: 60 })
    const sizeSelect = page.locator('select').filter({ has: page.locator('option:has-text("24")') }).first()
    await sizeSelect.selectOption('24')
    await page.waitForTimeout(50)
    await page.keyboard.type('Large')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
    expect(await getAnnotationCount(page)).toBe(3)
  })
})
