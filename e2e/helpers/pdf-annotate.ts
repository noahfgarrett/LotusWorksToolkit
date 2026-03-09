import { type Page, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', 'fixtures')

/** Upload a PDF and wait for the canvas to render */
export async function uploadPDFAndWait(page: Page, fileName: string = 'sample.pdf') {
  // Clear any leftover session data from previous tests to prevent state bleed
  await clearSessionData(page)
  const filePath = join(FIXTURES_DIR, fileName)
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(filePath)
  // Wait for PDF canvas to be visible
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(500) // Allow rendering to complete
}

/** Map tool labels to their keyboard shortcuts (confirmed in source at lines 2612-2626) */
const TOOL_SHORTCUTS: Record<string, string> = {
  'Select (S)': 's',
  'Pencil (P)': 'p',
  'Line (L)': 'l',
  'Arrow (A)': 'a',
  'Rectangle (R)': 'r',
  'Circle (C)': 'c',
  'Cloud (K)': 'k',
  'Text (T)': 't',
  'Callout (O)': 'o',
  'Eraser (E)': 'e',
  'Highlight (H)': 'h',
  'Measure (M)': 'm',
}

/** Select a tool using its keyboard shortcut — the most reliable method */
export async function selectTool(page: Page, toolTitle: string) {
  const key = TOOL_SHORTCUTS[toolTitle]
  if (key) {
    await page.keyboard.press(key)
    await page.waitForTimeout(100)
    return
  }
  // Fallback for tools identified by title attribute (e.g. zoom buttons)
  await page.locator(`button[title*="${toolTitle}"]`).click()
  await page.waitForTimeout(100)
}

/** Get the current page's annotation canvas locator */
function getAnnotationCanvas(page: Page) {
  // For single-page PDFs, canvas.nth(1) works. For multi-page, we need to
  // find the correct page's annotation canvas. The app renders all pages
  // stacked vertically with data-page attributes.
  // Try the data-page approach first, fall back to nth(1) for single-page.
  return page.locator('canvas.ann-canvas').first()
}

/** Get the annotation canvas for a specific page number */
function getAnnotationCanvasForPage(page: Page, pageNum: number) {
  return page.locator(`[data-page="${pageNum}"] canvas.ann-canvas`)
}

/** Get the current page number from the page input */
async function getCurrentPageNum(page: Page): Promise<number> {
  const input = page.locator('input[type="number"]')
  const count = await input.count()
  if (count === 0) return 1 // single-page PDF
  const val = await input.inputValue()
  return parseInt(val) || 1
}

/** Get the annotation canvas for the currently displayed page, ensuring it's scrolled into view */
async function getCurrentAnnotationCanvas(page: Page) {
  const pageNum = await getCurrentPageNum(page)
  // Find the canvas index for this page number
  // Each page has 2 canvases (pdf-canvas, ann-canvas), so page N's ann-canvas is at index (N-1)*2+1
  const annCanvasIndex = (pageNum - 1) * 2 + 1
  const canvas = page.locator('canvas').nth(annCanvasIndex)
  const count = await canvas.count()
  if (count > 0) {
    // Ensure canvas is in viewport
    await canvas.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    return canvas
  }
  // Fallback
  return page.locator('canvas').nth(1)
}

/** Draw on canvas by simulating pointer events at given points */
export async function drawOnCanvas(page: Page, points: { x: number; y: number }[]) {
  if (points.length < 2) return
  const canvas = await getCurrentAnnotationCanvas(page)
  let box = await canvas.boundingBox()
  // If canvas Y is negative, it's not properly scrolled into view — retry
  if (box && box.y < 0) {
    await page.waitForTimeout(200)
    box = await canvas.boundingBox()
  }
  if (!box) throw new Error('Canvas not found')

  const toAbsolute = (pt: { x: number; y: number }) => ({
    x: box.x + pt.x,
    y: box.y + pt.y,
  })

  const start = toAbsolute(points[0])
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (let i = 1; i < points.length; i++) {
    const pt = toAbsolute(points[i])
    await page.mouse.move(pt.x, pt.y, { steps: 5 })
  }
  await page.mouse.up()
}

/** Get annotation count from the status bar (UI shows "{count} ann") */
export async function getAnnotationCount(page: Page): Promise<number> {
  const statusText = await page.locator('text=/\\d+ ann/').textContent()
  const match = statusText?.match(/(\d+) ann/)
  return match ? parseInt(match[1]) : 0
}

/** Click at a specific point on the annotation canvas */
export async function clickCanvasAt(page: Page, x: number, y: number) {
  const canvas = await getCurrentAnnotationCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.click(box.x + x, box.y + y)
}

/** Double-click at a specific point on the annotation canvas */
export async function doubleClickCanvasAt(page: Page, x: number, y: number) {
  const canvas = await getCurrentAnnotationCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.dblclick(box.x + x, box.y + y)
}

/** Drag from one point to another on the annotation canvas */
export async function dragOnCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const canvas = await getCurrentAnnotationCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 5 })
  await page.mouse.up()
}

/** Wait for the debounced session save (1.5s debounce + margin) */
export async function waitForSessionSave(page: Page) {
  await page.waitForTimeout(2000)
}

/** Get the current session data from sessionStorage */
export async function getSessionData(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('lwt-pdf-annotate-session')
    return raw ? JSON.parse(raw) : null
  })
}

/** Clear session data from sessionStorage */
export async function clearSessionData(page: Page) {
  await page.evaluate(() => sessionStorage.removeItem('lwt-pdf-annotate-session'))
}

/** Create an annotation of a specific type and return the annotation count */
export async function createAnnotation(
  page: Page,
  type: 'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'callout',
  region?: { x: number; y: number; w: number; h: number },
) {
  const r = region ?? { x: 100, y: 100, w: 120, h: 80 }
  switch (type) {
    case 'pencil':
      await selectTool(page, 'Pencil (P)')
      await drawOnCanvas(page, [
        { x: r.x, y: r.y },
        { x: r.x + r.w / 3, y: r.y + r.h / 2 },
        { x: r.x + r.w, y: r.y + r.h },
      ])
      break
    case 'rectangle':
      await selectTool(page, 'Rectangle (R)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      break
    case 'circle':
      await selectTool(page, 'Circle (C)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      break
    case 'arrow':
      await selectTool(page, 'Arrow (A)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      break
    case 'line':
      await selectTool(page, 'Line (L)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      break
    case 'text':
      await selectTool(page, 'Text (T)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      // Type content and commit
      await page.keyboard.type('Test text')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      break
    case 'callout':
      await selectTool(page, 'Callout (O)')
      await dragOnCanvas(page, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h })
      await page.keyboard.type('Callout')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
      break
  }
  await page.waitForTimeout(200)
}

/** Select an annotation by clicking at its approximate center with select tool */
export async function selectAnnotationAt(page: Page, x: number, y: number) {
  await selectTool(page, 'Select (S)')
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(200)
}

/** Move a selected annotation by dragging from one point to another */
export async function moveAnnotation(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await selectTool(page, 'Select (S)')
  await clickCanvasAt(page, from.x, from.y)
  await page.waitForTimeout(200)
  await dragOnCanvas(page, from, to)
  await page.waitForTimeout(200)
}

/** Take a screenshot of just the canvas area for visual comparison */
export async function screenshotCanvas(page: Page) {
  const canvas = page.locator('canvas').first()
  return canvas.screenshot()
}

/** Navigate to a specific page number using the page input */
export async function goToPage(page: Page, pageNum: number) {
  const pageInput = page.locator('input[type="number"]')
  const inputCount = await pageInput.count()
  if (inputCount === 0) return // single-page PDF

  await pageInput.fill(String(pageNum))
  // Press Enter to trigger the onKeyDown handler which calls navigateToPage
  await pageInput.press('Enter')
  await page.waitForTimeout(400)

  // Scroll the target page into the visible area of the overflow container
  await page.evaluate((pn) => {
    const container = document.querySelector(`[data-page="${pn}"]`)
    if (container) {
      container.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, pageNum)
  await page.waitForTimeout(300)

  // Blur the input so keyboard shortcuts go to the canvas, not the input
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (el) el.blur()
  })
  await page.waitForTimeout(300)
}

/** Click Export PDF and wait for the download event */
export async function exportPDF(page: Page, timeout = 15000) {
  // Remove showSaveFilePicker so the app falls back to downloadBlob (anchor click)
  await page.evaluate(() => {
    delete (window as Record<string, unknown>)['showSaveFilePicker']
  })
  const downloadPromise = page.waitForEvent('download', { timeout })
  const exportBtn = page.locator('button').filter({ hasText: 'Export PDF' })
  await exportBtn.click()
  return downloadPromise
}
