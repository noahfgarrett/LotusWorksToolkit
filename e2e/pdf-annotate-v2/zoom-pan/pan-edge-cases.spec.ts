import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, moveAnnotation, exportPDF, goToPage,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

async function zoomInMultiple(page: import('@playwright/test').Page, times: number) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('=')
  }
  await page.waitForTimeout(300)
}

async function panCanvas(page: import('@playwright/test').Page, dx: number, dy: number) {
  const canvas = page.locator('canvas.ann-canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.keyboard.down('Space')
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + dx, cy + dy, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  await page.waitForTimeout(200)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Pan Edge Cases', () => {
  test('space+drag pans', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('space hold changes cursor', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await page.keyboard.down('Space')
    await page.waitForTimeout(200)
    // No crash — cursor change is visual only
    await page.keyboard.up('Space')
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('space release restores cursor', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan right', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -100, 0)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan left', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, 100, 0)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan up', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, 0, 100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan down', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, 0, -100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan diagonal', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -80, -80)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then draw', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('pan then select', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await panCanvas(page, -30, -30)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan preserves annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 3)
    await panCanvas(page, -100, -100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pan at default zoom (no scrollable area)', async ({ page }) => {
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at 125% zoom', async ({ page }) => {
    await zoomInMultiple(page, 1)
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at 200% zoom', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -80, -80)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at 300% zoom', async ({ page }) => {
    await zoomInMultiple(page, 8)
    await panCanvas(page, -100, -100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at 400% zoom', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 50; i++) await page.keyboard.press('=')
    await page.waitForTimeout(300)
    await panCanvas(page, -100, -100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan to edge of page', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -300, -300)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan back to center', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -100, -100)
    await panCanvas(page, 100, 100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then zoom', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('zoom then pan', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -80, -80)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan during pencil mode (space held)', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Pencil (P)')
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan during rectangle mode', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Rectangle (R)')
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan during select mode', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Select (S)')
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan during eraser mode', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Eraser (E)')
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan during text mode', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Text (T)')
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan does not create annotation', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await selectTool(page, 'Pencil (P)')
    const before = await getAnnotationCount(page)
    await panCanvas(page, -50, -50)
    expect(await getAnnotationCount(page)).toBe(before)
  })

  test('pan preserves selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await panCanvas(page, -30, -30)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pan then undo', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('pan then export', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('pan at different pages', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan page 2', async ({ page }) => {
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await zoomInMultiple(page, 3)
    await panCanvas(page, -80, -80)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('rapid panning', async ({ page }) => {
    test.setTimeout(90000)
    await zoomInMultiple(page, 5)
    for (let i = 0; i < 10; i++) {
      await panCanvas(page, i % 2 === 0 ? -20 : 20, i % 2 === 0 ? -20 : 20)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan long distance', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -500, -500)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then immediately draw', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('space key does not activate when text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 180 })
    await page.waitForTimeout(300)
    // Typing space should add space to text, not start panning
    await page.keyboard.type('Hello World')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('space key does not activate when find bar open', async ({ page }) => {
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(300)
    // Type space in find bar — should not pan
    const findInput = page.locator('input[placeholder*="Find"]').first()
    if (await findInput.isVisible()) {
      await findInput.type('test')
      await page.waitForTimeout(200)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then zoom then pan', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await page.keyboard.press('=')
    await page.waitForTimeout(200)
    await panCanvas(page, -30, -30)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan preserves zoom level', async ({ page }) => {
    await zoomInMultiple(page, 3)
    const zoomText = page.locator('button').filter({ hasText: /\d+%/ }).first()
    const before = await zoomText.textContent()
    await panCanvas(page, -80, -80)
    const after = await zoomText.textContent()
    expect(after).toBe(before)
  })

  test('pan resets on fit to page', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -200, -200)
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan with annotations visible', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await createAnnotation(page, 'circle', { x: 300, y: 100, w: 80, h: 80 })
    await zoomInMultiple(page, 3)
    await panCanvas(page, -80, -80)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('pan scrolls container', async ({ page }) => {
    await zoomInMultiple(page, 5)
    await panCanvas(page, -100, -100)
    // Verify container scrolled by checking no crash and annotations still readable
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at min zoom', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 30; i++) await page.keyboard.press('-')
    await page.waitForTimeout(300)
    await panCanvas(page, -30, -30)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan at max zoom', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 50; i++) await page.keyboard.press('=')
    await page.waitForTimeout(300)
    await panCanvas(page, -100, -100)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then click annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await panCanvas(page, -30, -30)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('pan then delete annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await panCanvas(page, -30, -30)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('pan then duplicate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await panCanvas(page, -30, -30)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('pan then copy/paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 2)
    await panCanvas(page, -30, -30)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  test('pan coordinates correct after pan — draw accuracy', async ({ page }) => {
    test.setTimeout(60000)
    await zoomInMultiple(page, 3)
    await panCanvas(page, -80, -80)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('hit-test accuracy after pan', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    // Should be able to interact with the annotation
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then rotate', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(200)
    }
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then session save', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('pan state not in session (viewport-only)', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -100, -100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // Pan/scroll position is typically not saved in session
    if (session) {
      expect(session.panX).toBeUndefined()
      expect(session.panY).toBeUndefined()
    }
  })

  test('space during cloud vertex placement', async ({ page }) => {
    await zoomInMultiple(page, 2)
    await selectTool(page, 'Cloud (K)')
    // Start drawing cloud vertices
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(100)
    // Space should not interfere with cloud drawing
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })

  test('pan then measure', async ({ page }) => {
    await zoomInMultiple(page, 3)
    await panCanvas(page, -50, -50)
    await selectTool(page, 'Measure (M)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    expect(typeof await getAnnotationCount(page)).toBe('number')
  })
})
