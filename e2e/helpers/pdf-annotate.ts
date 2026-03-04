import { type Page, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', 'fixtures')

/** Upload a PDF and wait for the canvas to render */
export async function uploadPDFAndWait(page: Page, fileName: string = 'sample.pdf') {
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

/** Draw on canvas by simulating pointer events at given points */
export async function drawOnCanvas(page: Page, points: { x: number; y: number }[]) {
  if (points.length < 2) return
  const canvas = page.locator('canvas').nth(1) // annotation canvas is the second canvas
  const box = await canvas.boundingBox()
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
  const canvas = page.locator('canvas').nth(1)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.click(box.x + x, box.y + y)
}

/** Double-click at a specific point on the annotation canvas */
export async function doubleClickCanvasAt(page: Page, x: number, y: number) {
  const canvas = page.locator('canvas').nth(1)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.dblclick(box.x + x, box.y + y)
}

/** Drag from one point to another on the annotation canvas */
export async function dragOnCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const canvas = page.locator('canvas').nth(1)
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
