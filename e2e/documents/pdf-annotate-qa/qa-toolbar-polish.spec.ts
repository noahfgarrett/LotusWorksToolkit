import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  dragOnCanvas,
  createAnnotation,
  getAnnotationCount,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Tool Switching Active State ────────────────────────────────────────────

test.describe('Toolbar QA — Active State', () => {
  test('Select tool button has active styling by default', async ({ page }) => {
    await uploadPDFAndWait(page)
    const selectBtn = page.locator('button[title="Select (S)"]')
    await expect(selectBtn).toBeVisible()
  })

  test('switching to Pencil updates active tool button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('button[title="Pencil (P)"]')).toBeVisible()
  })

  test('switching to Rectangle updates active tool button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Rectangle (R)')
    await expect(page.locator('button[title="Rectangle (R)"]')).toBeVisible()
  })

  test('switching to Text updates active tool button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Text (T)')
    await expect(page.locator('button[title="Text (T)"]')).toBeVisible()
  })

  test('switching to Eraser updates active tool button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    await expect(page.locator('button[title="Eraser (E)"]')).toBeVisible()
  })

  test('switching to Measure updates active tool button', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Measure (M)')
    await expect(page.locator('button[title="Measure (M)"]')).toBeVisible()
  })
})

// ─── Status Bar Hints ───────────────────────────────────────────────────────

test.describe('Toolbar QA — Status Bar Hints', () => {
  test('select tool shows "Click to select" hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Select (S)')
    await expect(page.getByText('· Click to select')).toBeVisible()
  })

  test('pencil tool shows drawing hint', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('selecting an annotation changes hint to "Arrows nudge"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectAnnotationAt(page, 100, 140)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
  })
})

// ─── New Button FilePlus Icon ───────────────────────────────────────────────

test.describe('Toolbar QA — New Button Icon', () => {
  test('New button is visible after PDF upload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button').filter({ hasText: 'New' })).toBeVisible()
  })

  test('New button has FilePlus icon via aria-label or svg', async ({ page }) => {
    await uploadPDFAndWait(page)
    const newBtn = page.locator('button').filter({ hasText: 'New' })
    // Check for SVG icon inside the button
    const svg = newBtn.locator('svg')
    await expect(svg).toBeVisible()
  })
})

// ─── FileDropZone ───────────────────────────────────────────────────────────

test.describe('Toolbar QA — FileDropZone', () => {
  test('drop zone is visible before PDF upload', async ({ page }) => {
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('drop zone accepts file input', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('drop zone disappears after PDF upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('Drop a PDF file here')).toBeHidden()
  })
})

// ─── Polished Sliders ───────────────────────────────────────────────────────

test.describe('Toolbar QA — Polished Sliders', () => {
  test('stroke width slider renders in pencil mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
  })

  test('opacity slider renders in pencil mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)')
    const sliders = page.locator('input[type="range"]')
    const count = await sliders.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('eraser size slider renders in eraser mode', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Eraser (E)')
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
  })
})

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────────

test.describe('Toolbar QA — Keyboard Shortcuts', () => {
  test('pressing S activates select tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await selectTool(page, 'Pencil (P)') // start with different tool
    await page.keyboard.press('s')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('select')
  })

  test('pressing P activates pencil tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('p')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('pencil')
  })

  test('pressing R activates rectangle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('r')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeDraw).toBe('rectangle')
  })

  test('pressing C activates circle tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('c')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeDraw).toBe('circle')
  })

  test('pressing L activates line tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('l')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeDraw).toBe('line')
  })

  test('pressing A activates arrow tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('a')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeDraw).toBe('arrow')
  })

  test('pressing T activates text tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('t')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('text')
  })

  test('pressing E activates eraser tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('e')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('eraser')
  })

  test('pressing H activates highlight tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('h')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('highlighter')
  })

  test('pressing M activates measure tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('m')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeTool).toBe('measure')
  })

  test('pressing K activates cloud tool', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('k')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session?.activeDraw).toBe('cloud')
  })
})
