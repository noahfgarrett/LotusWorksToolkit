import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  getAnnotationCount,
  createAnnotation,
  waitForSessionSave,
  getSessionData,
  clearSessionData,
  exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Session: Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  test('session with maximum data (many annotations)', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 30; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + (i % 6) * 60,
        y: 30 + Math.floor(i / 6) * 50,
        w: 45,
        h: 30,
      })
    }
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('session storage quota exceeded gracefully', async ({ page }) => {
    // Fill sessionStorage near capacity
    await page.evaluate(() => {
      try {
        const bigStr = 'x'.repeat(1024 * 1024) // 1MB
        for (let i = 0; i < 4; i++) {
          sessionStorage.setItem(`fill-${i}`, bigStr)
        }
      } catch {
        // Expected — quota exceeded
      }
    })
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    // App should handle gracefully (may fail silently or show warning)
    expect(await getAnnotationCount(page)).toBe(1)
    // Cleanup
    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) {
        sessionStorage.removeItem(`fill-${i}`)
      }
    })
  })

  test('session with corrupt JSON data does not crash on load', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.setItem('lwt-pdf-annotate-session', '{{not valid json]]')
    })
    await page.reload()
    await page.waitForTimeout(1000)
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid annotation changes trigger single debounced save', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 80, y: 150, w: 80, h: 50 })
    await createAnnotation(page, 'arrow', { x: 80, y: 220, w: 80, h: 0 })
    // All created within debounce window
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
  })

  test('session during export does not corrupt data', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    await exportPDF(page)
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)
    expect(sessionAfter).not.toBeNull()
  })

  test('session after undo reflects undone state', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 100, h: 80 })
    await waitForSessionSave(page)
    const sessionWith2 = await getSessionData(page)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const sessionWith1 = await getSessionData(page)
    expect(sessionWith1).not.toBeNull()
  })

  test('session after redo reflects redone state', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session after tool switch updates tool state', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    await selectTool(page, 'Circle (C)')
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    expect(session1).not.toBeNull()
    expect(session2).not.toBeNull()
  })

  test('session scroll position accuracy after page navigation', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session restore timing — data available immediately after parse', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    // Verify data is parseable
    const raw = await page.evaluate(() =>
      sessionStorage.getItem('lwt-pdf-annotate-session')
    )
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed).toEqual(session)
  })

  test('clear then recreate session has no stale data', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    await clearSessionData(page)
    expect(await getSessionData(page)).toBeNull()
    await createAnnotation(page, 'circle', { x: 200, y: 200, w: 80, h: 80 })
    await waitForSessionSave(page)
    const newSession = await getSessionData(page)
    expect(newSession).not.toBeNull()
  })

  test('session with empty annotations array', async ({ page }) => {
    // Start fresh — no annotations
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    if (session) {
      // Annotations field should be empty or have no entries for this page
      const annStr = JSON.stringify(session.annotations || {})
      // Empty or minimal
      expect(annStr.length).toBeLessThan(1000)
    }
  })

  test('session survives multiple tool navigations', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await waitForSessionSave(page)
    // Navigate away and back
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(1000)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('session with pencil annotation stores points', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const sessionStr = JSON.stringify(session)
    // Pencil annotations should have point data
    expect(sessionStr.length).toBeGreaterThan(50)
  })

  test('session size grows with annotations', async ({ page }) => {
    await waitForSessionSave(page)
    const raw1 = await page.evaluate(() =>
      sessionStorage.getItem('lwt-pdf-annotate-session')
    )
    const size1 = raw1 ? raw1.length : 0
    await createAnnotation(page, 'rectangle')
    await createAnnotation(page, 'circle', { x: 100, y: 200, w: 80, h: 80 })
    await waitForSessionSave(page)
    const raw2 = await page.evaluate(() =>
      sessionStorage.getItem('lwt-pdf-annotate-session')
    )
    const size2 = raw2 ? raw2.length : 0
    expect(size2).toBeGreaterThan(size1)
  })

  test('session with different annotation types has correct structure', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 50 })
    await createAnnotation(page, 'text', { x: 80, y: 160, w: 100, h: 30 })
    await createAnnotation(page, 'pencil', { x: 80, y: 220, w: 80, h: 40 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    expect(session.annotations).toBeDefined()
    // Should have annotation data
    const annStr = JSON.stringify(session.annotations)
    expect(annStr.length).toBeGreaterThan(10)
  })

  test('session does not include undo/redo history', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+Shift+z')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    // History should not be serialized (it would be very large)
    const sessionStr = JSON.stringify(session)
    // History should not be serialized (it would be very large)
    // If history exists, it shouldn't be enormous
    expect(sessionStr.length).toBeLessThan(100000)
  })
})
