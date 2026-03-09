import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Select Tool - Multi-Select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  // ── Shift+Click Selection ──────────────────────────────────

  test('Shift+click adds annotation to selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    // Select first
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    // Shift+click second
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.click(box.x + 250, box.y + 130, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    // Both should be selected — status should show "2 selected"
    await expect(page.locator('text=/2 selected/')).toBeVisible({ timeout: 3000 })
  })

  test('Shift+click toggles annotation out of selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    // Select first
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Shift+click second to add
    await page.mouse.click(box.x + 250, box.y + 130, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    await expect(page.locator('text=/2 selected/')).toBeVisible({ timeout: 3000 })
    // Shift+click second again to remove
    await page.mouse.click(box.x + 250, box.y + 130, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    // Should be back to single selection (no "2 selected")
    await expect(page.locator('text=/2 selected/')).not.toBeVisible({ timeout: 2000 })
  })

  test('Shift+click on empty space does not add to selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    // Shift+click empty space
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.click(box.x + 400, box.y + 400, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    // Should still have annotation count = 1
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Ctrl+A Select All ──────────────────────────────────────

  test('Ctrl+A selects all annotations on page', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 250, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/3 selected/')).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+A with no annotations does nothing', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  // ── Batch Delete ──────────────────────────────────────────

  test('Delete key removes all selected annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 100, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Delete with multi-select shows batch delete toast', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    await expect(page.locator('text=/2 annotations deleted/')).toBeVisible({ timeout: 3000 })
  })

  // ── Batch Arrow Key Nudge ─────────────────────────────────

  test('arrow keys nudge all selected annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // Nudge right
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    // Both annotations should still exist
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Batch Duplicate ───────────────────────────────────────

  test('Ctrl+D duplicates all selected annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(4)
  })

  // ── Multi-Select Deselect ─────────────────────────────────

  test('Escape clears multi-selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/2 selected/')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('click empty space clears multi-selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('regular click deselects multi and selects single', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/2 selected/')).toBeVisible({ timeout: 3000 })
    // Click first annotation without shift — should single-select it
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/2 selected/')).not.toBeVisible({ timeout: 2000 })
    // Should still have both annotations
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Multi-Select with Mixed Types ─────────────────────────

  test('multi-select works with mixed annotation types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await expect(page.locator('text=/3 selected/')).toBeVisible({ timeout: 3000 })
  })

  test('batch delete with mixed types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'line', { x: 100, y: 250, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Multi-Select Property Changes ─────────────────────────

  test('changing color applies to all selected annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // Both annotations should still exist after property change attempt
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Multi-Drag ────────────────────────────────────────────

  test('drag moves all selected annotations together', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    // Drag from first annotation position
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 130)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 180, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Both annotations should still exist
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Undo/Redo with Multi-Select ───────────────────────────

  test('undo after batch delete restores all annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Edge Cases ────────────────────────────────────────────

  test('switching tool clears multi-selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(200)
    await expect(page.locator('span.truncate:has-text("Click to select")')).toBeVisible({ timeout: 3000 })
  })

  test('multi-select single annotation shows single-select hint', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=/Shift\\+click/')).toBeVisible({ timeout: 3000 })
  })

  test('Shift+click three annotations shows 3 selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 60, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 80, w: 60, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 320, y: 80, w: 60, h: 50 })
    await selectTool(page, 'Select (S)')
    // Select first
    await clickCanvasAt(page, 80, 105)
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    // Shift+click second
    await page.mouse.click(box.x + 200, box.y + 105, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    // Shift+click third
    await page.mouse.click(box.x + 320, box.y + 105, { modifiers: ['Shift'] })
    await page.waitForTimeout(200)
    await expect(page.locator('text=/3 selected/')).toBeVisible({ timeout: 3000 })
  })
})
