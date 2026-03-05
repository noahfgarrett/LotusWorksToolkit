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

// ─── Keyboard Shortcut Actions (replaces context menu tests) ───────────────
// The app does not have a right-click context menu for annotations.
// Delete, Duplicate, Bring to Front, Send to Back are keyboard shortcuts:
//   Delete/Backspace  = delete selected annotation
//   Ctrl+D            = duplicate selected annotation
//   Ctrl+]            = bring to front
//   Ctrl+[            = send to back

test.describe('Annotation Keyboard Actions — Delete & Duplicate', () => {
  test('Delete key removes the selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    // Click on the rectangle border to select it
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+D duplicates the selected annotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    // Click on the rectangle border to select it
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Bring to Front (Ctrl+]) moves annotation to end of z-order', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 130, y: 120, w: 100, h: 60 })
    // Select the first annotation (rectangle at border)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1] || []
    // After bringing rectangle to front, it should be at the last index
    expect(anns[anns.length - 1]?.type).toBe('rectangle')
  })

  test('Send to Back (Ctrl+[) moves annotation to beginning of z-order', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 250, w: 100, h: 60 })
    // Select the second annotation (circle) — click its border
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 250, 280)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1] || []
    // Circle should now be at index 0
    expect(anns[0]?.type).toBe('circle')
  })
})

// ─── New Button Confirm Dialog ─────────────────────────────────────────────
// The app uses native window.confirm() — Playwright handles this via page.on('dialog')

test.describe('New Button — Native Confirm Dialog', () => {
  test('New button shows native confirm dialog and Discard resets to empty state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Auto-accept the native confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.locator('button').filter({ hasText: 'New' }).click()
    await page.waitForTimeout(500)
    // After accepting, should return to empty state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('Cancelling native confirm dialog keeps PDF loaded', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Auto-dismiss (cancel) the native confirm dialog
    page.on('dialog', dialog => dialog.dismiss())
    await page.locator('button').filter({ hasText: 'New' }).click()
    await page.waitForTimeout(200)
    // Should still show the canvas
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('Discard via New clears annotations and returns to empty state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Auto-accept the native confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.locator('button').filter({ hasText: 'New' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
  })

  test('after New discard, re-upload starts fresh with zero annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Auto-accept the native confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.locator('button').filter({ hasText: 'New' }).click()
    await page.waitForTimeout(500)
    await uploadPDFAndWait(page, 'sample.pdf')
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ─── Calibration Modal ──────────────────────────────────────────────────────
// Calibration opens by clicking on an existing measurement's label text,
// NOT via a toolbar button. The user must first create a measurement with the
// Measure tool, then click on the measurement's label to open calibration.

test.describe('Calibration Modal', () => {
  test('clicking measurement label opens calibration modal', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Measure (M)')
    // Create a measurement by clicking two points
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 200)
    await page.waitForTimeout(500)
    // Click on the measurement label (midpoint of the line)
    await clickCanvasAt(page, 300, 200)
    await page.waitForTimeout(500)
    // Calibration modal should appear with title "Calibrate Measurement"
    await expect(page.getByText('Calibrate Measurement')).toBeVisible({ timeout: 5000 })
  })

  test('calibration modal has unit selection dropdown', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Measure (M)')
    // Create a measurement
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 200)
    await page.waitForTimeout(500)
    // Click on the measurement label to open calibration
    await clickCanvasAt(page, 300, 200)
    await page.waitForTimeout(500)
    await expect(page.getByText('Calibrate Measurement')).toBeVisible({ timeout: 5000 })
    // Should have a select element for units (inches, feet, cm, mm, m)
    const unitSelect = page.locator('select')
    await expect(unitSelect).toBeVisible()
    // Check that "inches" option exists
    await expect(unitSelect.locator('option', { hasText: 'inches' })).toBeAttached()
  })
})
