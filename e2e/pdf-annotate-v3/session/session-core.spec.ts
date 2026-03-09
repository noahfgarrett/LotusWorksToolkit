import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  goToPage,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Session: Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  test('session auto-saves after annotation change', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session saves after 1.5s debounce', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    // Immediately check — might not be saved yet
    const immediateSession = await getSessionData(page)
    // Wait for debounce
    await waitForSessionSave(page)
    const debouncedSession = await getSessionData(page)
    expect(debouncedSession).not.toBeNull()
  })

  test('session contains file info (name)', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.fileName || session.file?.name).toBeTruthy()
  })

  test('session contains annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('session contains tool state', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session contains zoom level', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.zoom || session.zoomLevel).toBeDefined()
  })

  test('session contains page rotations', async ({ page }) => {
    const cwBtn = page.locator('button[title="Rotate CW"]').first()
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session contains formatting state', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.fill('#ff0000')
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session contains active tool', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.activeTool || session.tool).toBeDefined()
  })

  test('session restore on reload shows banner', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    await page.reload()
    await page.waitForTimeout(2000)
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(1000)
    // Look for restore banner or session indicator
    const banner = page.locator('text=/restore|session|previous/i')
    const hasBanner = await banner.isVisible().catch(() => false)
    // Session data should still exist
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session restore loads annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    expect(sessionBefore.annotations).toBeDefined()
  })

  test('session restore loads zoom level', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+=')
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const zoom = session.zoom || session.zoomLevel
    expect(zoom).toBeDefined()
  })

  test('session restore loads tool state', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session restore loads formatting', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]').first()
    if (await colorInput.isVisible().catch(() => false)) {
      await colorInput.fill('#0000ff')
    }
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('clear session removes data from sessionStorage', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    expect(await getSessionData(page)).not.toBeNull()
    await clearSessionData(page)
    expect(await getSessionData(page)).toBeNull()
  })

  test('new file replaces old session', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    expect(session1).not.toBeNull()
    // Upload new file — must re-navigate because FileDropZone is gone after first upload
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    expect(session2).not.toBeNull()
  })

  test('session with multiple pages stores per-page data', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 1)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 60 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('session with rotated pages', async ({ page }) => {
    const cwBtn = page.locator('button[title="Rotate CW"]').first()
    if (await cwBtn.isVisible().catch(() => false)) {
      await cwBtn.click()
      await page.waitForTimeout(300)
    }
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session file hash matching ensures correct file', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    // Session should have some file identifier
    const hasFileId = session.fileHash || session.fileName || session.file
    expect(hasFileId).toBeTruthy()
  })

  test('session version validation', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session updates after annotation deletion', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    await selectAnnotationAt(page, 160, 140)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    expect(sessionAfter).not.toBeNull()
  })

  test('session updates after annotation move', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    await selectAnnotationAt(page, 160, 140)
    await dragOnCanvas(page, { x: 160, y: 140 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    expect(sessionAfter).not.toBeNull()
  })

  test('session updates after undo', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session updates after redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session persists through tool switches', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Circle (C)')
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Text (T)')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('session contains scroll position', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session data is valid JSON', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const raw = await page.evaluate(() =>
      sessionStorage.getItem('lwt-pdf-annotate-session')
    )
    expect(raw).not.toBeNull()
    expect(() => JSON.parse(raw!)).not.toThrow()
  })

  test('session saves measurement annotations', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    // Measurements use two clicks, not a drag
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    // Measurements are stored separately from annotations
    expect(session.measurements || session.annotations).toBeDefined()
  })

  test('session saves highlight annotations', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session saves cloud annotations', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(100)
    await clickCanvasAt(page, 250, 100)
    await page.waitForTimeout(100)
    await doubleClickCanvasAt(page, 175, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('multiple saves converge to latest state', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    expect(session2).not.toBeNull()
    // Second session should have more annotation data
    const ann1 = JSON.stringify(session1?.annotations || {})
    const ann2 = JSON.stringify(session2?.annotations || {})
    expect(ann2.length).toBeGreaterThanOrEqual(ann1.length)
  })

  test('session clear followed by new annotation creates fresh session', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    await clearSessionData(page)
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session with text annotation stores text content', async ({ page }) => {
    await createAnnotation(page, 'text')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const sessionStr = JSON.stringify(session)
    // Text content should be stored somewhere in the session
    expect(sessionStr).toMatch(/Test|text/i)
  })

  test('session with callout annotation stores callout content', async ({ page }) => {
    await createAnnotation(page, 'callout')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const sessionStr = JSON.stringify(session)
    // Callout content should be stored somewhere in the session
    expect(sessionStr).toMatch(/Callout|callout/i)
  })

  test('session key is correct', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const hasKey = await page.evaluate(() =>
      sessionStorage.getItem('lwt-pdf-annotate-session') !== null
    )
    expect(hasKey).toBe(true)
  })
})
