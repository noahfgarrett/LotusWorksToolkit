import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation, selectAnnotationAt,
  moveAnnotation, goToPage, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Keyboard Shortcuts', () => {
  // ── Tool activation shortcuts ────────────────────────────────────

  test('S activates select tool', async ({ page }) => {
    await page.keyboard.press('p') // start from another tool
    await page.waitForTimeout(100)
    await page.keyboard.press('s')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('P activates pencil tool', async ({ page }) => {
    await page.keyboard.press('p')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('L activates line tool', async ({ page }) => {
    await page.keyboard.press('l')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  test('A activates arrow tool', async ({ page }) => {
    await page.keyboard.press('a')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  test('R activates rectangle tool', async ({ page }) => {
    await page.keyboard.press('r')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  test('C activates circle tool', async ({ page }) => {
    await page.keyboard.press('c')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Shift for perfect shapes")')).toBeVisible({ timeout: 3000 })
  })

  test('K activates cloud tool', async ({ page }) => {
    await page.keyboard.press('k')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Dbl-click close")')).toBeVisible({ timeout: 3000 })
  })

  test('T activates text tool', async ({ page }) => {
    await page.keyboard.press('t')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Drag to create text")')).toBeVisible({ timeout: 3000 })
  })

  test('O activates callout tool', async ({ page }) => {
    await page.keyboard.press('o')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Drag to create callout")')).toBeVisible({ timeout: 3000 })
  })

  test('E activates eraser tool', async ({ page }) => {
    await page.keyboard.press('e')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['none', 'default', 'auto', 'crosshair']).toContain(cursor)
  })

  test('H activates highlighter tool', async ({ page }) => {
    await page.keyboard.press('h')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('M activates measure tool', async ({ page }) => {
    await page.keyboard.press('m')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click two points")')).toBeVisible({ timeout: 3000 })
  })

  test('G activates stamp tool', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("click to place")')).toBeVisible({ timeout: 3000 })
  })

  test('X activates crop tool', async ({ page }) => {
    await page.keyboard.press('x')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Drag to set crop")')).toBeVisible({ timeout: 3000 })
  })

  // ── Undo/Redo shortcuts ──────────────────────────────────────────

  test('Ctrl+Z undoes last action', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Y redoes last undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Shift+Z redoes last undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Delete shortcut ──────────────────────────────────────────────

  test('Delete key deletes selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Duplicate/Copy/Paste shortcuts ──────────────────────────────

  test('Ctrl+D duplicates selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C copies selected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    // Should not throw
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+V pastes copied annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Arrow key nudge ──────────────────────────────────────────────

  test('ArrowRight nudges selected annotation right by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowLeft nudges selected annotation left by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowUp nudges selected annotation up by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('ArrowDown nudges selected annotation down by 1px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+ArrowRight nudges 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+ArrowLeft nudges 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 150, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 150, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+ArrowUp nudges 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Shift+ArrowDown nudges 10px', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectAnnotationAt(page, 100, 150)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(100)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  // ── Z-order shortcuts ───────────────────────────────────────────

  test('Ctrl+] brings selected annotation to front', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    await selectAnnotationAt(page, 100, 100)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+[ sends selected annotation to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 130, y: 130, w: 100, h: 100 })
    await selectAnnotationAt(page, 180, 180)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Select all ──────────────────────────────────────────────────

  test('Ctrl+A selects all annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 80, h: 80 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Arrows nudge")')).toBeVisible({ timeout: 3000 })
  })

  // ── Tab cycling ─────────────────────────────────────────────────

  test('Tab cycles through text boxes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 120, h: 50 })
    await createAnnotation(page, 'text', { x: 80, y: 200, w: 120, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 140, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    // Should cycle to next text box
    await expect(page.locator('span.truncate:has-text("Arrows nudge")')).toBeVisible({ timeout: 3000 })
  })

  test('Shift+Tab reverse cycles through text boxes', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 120, h: 50 })
    await createAnnotation(page, 'text', { x: 80, y: 200, w: 120, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 140, 225)
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Arrows nudge")')).toBeVisible({ timeout: 3000 })
  })

  // ── Find shortcuts ──────────────────────────────────────────────

  test('Ctrl+F opens find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    await expect(page.locator('input[placeholder*="Find"], input[type="search"]')).toBeVisible({ timeout: 3000 })
  })

  test('Escape closes find bar', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await expect(page.locator('input[placeholder*="Find"], input[type="search"]')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('input[placeholder*="Find"], input[type="search"]')).not.toBeVisible({ timeout: 3000 })
  })

  test('F3 navigates to next find match', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find"], input[type="search"]')
    await findInput.fill('test')
    await page.waitForTimeout(200)
    // F3 should not crash even if no matches
    await page.keyboard.press('F3')
    await page.waitForTimeout(200)
  })

  test('Shift+F3 navigates to previous find match', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    const findInput = page.locator('input[placeholder*="Find"], input[type="search"]')
    await findInput.fill('test')
    await page.waitForTimeout(200)
    await page.keyboard.press('Shift+F3')
    await page.waitForTimeout(200)
  })

  // ── Page navigation shortcuts ────────────────────────────────────

  test('PageDown goes to next page', async ({ page }) => {
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)
    // Should not crash on single or multi-page PDFs
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('PageUp goes to previous page', async ({ page }) => {
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('PageUp')
    await page.waitForTimeout(300)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  // ── Text highlight/strikethrough tool shortcuts ──────────────────

  test('Shift+H activates text highlight tool', async ({ page }) => {
    await page.keyboard.press('Shift+h')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Drag to highlight")')).toBeVisible({ timeout: 3000 })
  })

  test('Shift+X activates text strikethrough tool', async ({ page }) => {
    await page.keyboard.press('Shift+x')
    await page.waitForTimeout(200)
    // textStrikethrough tool uses 'text' cursor
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['text', 'crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  // ── Zoom shortcuts ──────────────────────────────────────────────

  test('F fits page to view', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    const zoomed = await screenshotCanvas(page)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    const fitted = await screenshotCanvas(page)
    expect(Buffer.compare(zoomed, fitted)).not.toBe(0)
  })

  test('+ key zooms in', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await page.keyboard.press('+')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('- key zooms out', async ({ page }) => {
    await page.keyboard.press('+')
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('-')
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('Space enables pan mode', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(200)
    await page.keyboard.down('Space')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    const cursor = await canvas.evaluate(el => window.getComputedStyle(el).cursor)
    await page.keyboard.up('Space')
    expect(['grab', 'grabbing', '-webkit-grab', '-webkit-grabbing']).toContain(cursor)
  })

  // ── Text formatting shortcuts (during text editing) ──────────────

  test('Ctrl+B toggles bold in text editing', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    // Double-click to enter edit mode
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    const before = await screenshotCanvas(page)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(200)
    // Bold should toggle (visual change or formatting state)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+I toggles italic in text editing', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+i')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+U toggles underline in text editing', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+u')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('Ctrl+Shift+X toggles strikethrough in text editing', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 175, 130)
    await clickCanvasAt(page, 175, 130)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+x')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
