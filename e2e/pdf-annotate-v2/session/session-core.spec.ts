import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Session Core', () => {
  test('session saves after creating annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
  })

  test('session data contains annotations array', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.annotations).toBeDefined()
    expect(typeof data.annotations).toBe('object')
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns).toBeDefined()
    expect(page1Anns.length).toBeGreaterThanOrEqual(1)
  })

  test('session saves file hash', async ({ page }) => {
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.file).toBeDefined()
    expect(data.file.fileName).toBe('sample.pdf')
    expect(data.file.fileSize).toBeGreaterThan(0)
  })

  test('clear session removes data', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    expect(await getSessionData(page)).not.toBeNull()
    await clearSessionData(page)
    expect(await getSessionData(page)).toBeNull()
  })

  test('session restores annotations on reload', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    // Reload and re-upload the same file
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await page.waitForTimeout(500)
    // Session should have restored the annotations
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('session saves tool state', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.activeTool).toBe('pencil')
  })

  test('session saves zoom level', async ({ page }) => {
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    expect(data.zoom).toBeGreaterThan(1.0)
  })

  test('multiple annotations in session', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'line', { x: 350, y: 50, w: 80, h: 30 })
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns.length).toBe(3)
  })

  test('session auto-saves on changes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Wait less than debounce — session may not yet be saved
    await page.waitForTimeout(500)
    const earlyData = await getSessionData(page)
    // Wait for full debounce
    await page.waitForTimeout(1500)
    const lateData = await getSessionData(page)
    expect(lateData).not.toBeNull()
    expect(lateData.annotations).toBeDefined()
  })

  test('session handles large annotation sets', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 20; i++) {
      await dragOnCanvas(page,
        { x: 20 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 40 },
        { x: 50 + (i % 5) * 60, y: 20 + Math.floor(i / 5) * 40 }
      )
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(20)
    await waitForSessionSave(page)
    const data = await getSessionData(page)
    const page1Anns = data.annotations['1'] || data.annotations[1]
    expect(page1Anns.length).toBe(20)
  })

  test('no session data before upload', async ({ page }) => {
    // Clear current session, then navigate to a fresh page
    await clearSessionData(page)
    // Navigate to a fresh context (new page load clears any in-memory state)
    await page.goto('/')
    // Clear session again in the fresh context (in case beforeEach saved before we cleared)
    await clearSessionData(page)
    await navigateToTool(page, 'pdf-annotate')
    // On a fresh tool load without uploading a file, there should be no session
    const data = await getSessionData(page)
    expect(data).toBeNull()
  })

  test('session persists across tool switches', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await waitForSessionSave(page)
    // Switch to another tool and back
    await navigateToTool(page, 'pdf-merge')
    await page.waitForTimeout(500)
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(500)
    // Session data should still exist
    const data = await getSessionData(page)
    expect(data).not.toBeNull()
    expect(data.annotations).toBeDefined()
  })
})
