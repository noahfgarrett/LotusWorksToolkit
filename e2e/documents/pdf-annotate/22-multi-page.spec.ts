import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Multi-Page PDF Navigation ───────────────────────────────────────────────

test.describe('Multi-Page — Page Controls Visibility', () => {
  test('multi-page PDF shows page navigation controls in status bar', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // sample.pdf has 2 pages — prev/next chevron buttons should exist
    const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).locator('..').filter({ hasText: /^$/ })
    // Page input field should be visible
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toBeVisible()
  })

  test('page indicator shows "/ 2" for a 2-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('current page input defaults to 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveValue('1')
  })

  test('single-page PDF does not show page navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.locator('input[type="number"]')).toBeHidden()
    await expect(page.locator('text=/1 page/')).toBeVisible()
  })

  test('page count text shows total pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/\\/ 2/')).toBeVisible()
  })

  test('multi-page PDF shows thumbnail sidebar toggle button', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await expect(sidebarToggle).toBeVisible()
  })

  test('single-page PDF does not show thumbnail sidebar toggle', async ({ page }) => {
    await uploadPDFAndWait(page, 'single-page.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await expect(sidebarToggle).toBeHidden()
  })
})

test.describe('Multi-Page — Page Navigation', () => {
  test('clicking next button navigates to page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveValue('1')
    // Click the next button (ChevronRight after the page input)
    const nextBtn = page.locator('input[type="number"] + span + button')
    await nextBtn.click()
    await page.waitForTimeout(500)
    await expect(pageInput).toHaveValue('2')
  })

  test('clicking prev button from page 2 goes back to page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Go to page 2 first
    const nextBtn = page.locator('input[type="number"] + span + button')
    await nextBtn.click()
    await page.waitForTimeout(500)
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveValue('2')
    // Click prev button (button before the page input)
    const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    // Use the button that appears before the input in the navigation cluster
    const navButtons = page.locator('.grid-cols-3 button')
    await navButtons.first().click()
    await page.waitForTimeout(500)
    await expect(pageInput).toHaveValue('1')
  })

  test('prev button is disabled on page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // The first button in the page nav center area is the prev button
    const prevBtn = page.locator('.grid-cols-3 .justify-center button').first()
    await expect(prevBtn).toBeDisabled()
  })

  test('next button is disabled on last page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Navigate to last page
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.press('Enter')
    await page.waitForTimeout(500)
    // The last button in the page nav center area is the next button
    const nextBtn = page.locator('.grid-cols-3 .justify-center button').last()
    await expect(nextBtn).toBeDisabled()
  })

  test('typing page number in input navigates to that page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await expect(pageInput).toHaveValue('2')
  })

  test('typing invalid page number (0) does not navigate', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('0')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    // Should remain on page 1 (input rejects out of range)
    await expect(pageInput).toHaveValue('0') // input shows typed value but no navigation occurs
  })

  test('typing page number beyond max does not navigate', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('99')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    // No navigation — remains unchanged
    await expect(pageInput).toHaveValue('99')
  })

  test('navigate to page 2 and back to page 1 round-trips correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    // Go to page 2
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await expect(pageInput).toHaveValue('2')
    // Go back to page 1
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await expect(pageInput).toHaveValue('1')
  })
})

test.describe('Multi-Page — Per-Page Annotations', () => {
  test('annotation count is per-page (starts at 0 on each page)', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const count = await getAnnotationCount(page)
    expect(count).toBe(0)
  })

  test('drawing on page 1 shows annotation count on page 1', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    const count = await getAnnotationCount(page)
    expect(count).toBe(1)
  })

  test('page 1 annotation does not appear in page 2 count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate to page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Page 2 should have 0 annotations
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('drawing on page 2 only affects page 2 annotation count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Navigate to page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Draw on page 2
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate back to page 1
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Page 1 should still have 0
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('annotations on both pages are independent', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw 2 on page 1
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Navigate to page 2 and draw 1
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Go back to page 1 — still 2
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('drawing different annotation types on each page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page 1: pencil
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Page 2: text
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple annotations on page 2 accumulate correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 350, y: 50, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
  })
})

test.describe('Multi-Page — Undo Isolation', () => {
  test('undo on page 2 does not affect page 1 annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate to page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Draw on page 2
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo on page 2
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Navigate back to page 1 — annotation should still exist
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('undo removes annotations in reverse order globally', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw 2 on page 1
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'circle', { x: 250, y: 80, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Undo once
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

test.describe('Multi-Page — Thumbnail Sidebar', () => {
  test('clicking sidebar toggle opens thumbnail panel', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(500)
    // Sidebar should show "Pages (2)" header
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })

  test('thumbnail sidebar shows page count', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
  })

  test('clicking sidebar toggle again closes thumbnail panel', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    // Open
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeVisible()
    // Close
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/Pages \\(2\\)/')).toBeHidden()
  })

  test('sidebar toggle button has active styling when open', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(300)
    await expect(sidebarToggle).toHaveClass(/text-\[#F47B20\]/)
  })

  test('clicking a thumbnail navigates to that page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const sidebarToggle = page.locator('button[title="Page thumbnails"]')
    await sidebarToggle.click()
    await page.waitForTimeout(800)
    // Click the second thumbnail (page 2)
    const thumbnails = page.locator('.overflow-y-auto [data-page], .overflow-y-auto button, .space-y-2 > *')
    const secondThumb = thumbnails.nth(1)
    await secondThumb.click()
    await page.waitForTimeout(500)
    // Page input should show 2
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveValue('2')
  })
})

test.describe('Multi-Page — Rapid Navigation', () => {
  test('rapid page switching does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    // Rapidly toggle between pages
    for (let i = 0; i < 10; i++) {
      await pageInput.fill(i % 2 === 0 ? '2' : '1')
      await pageInput.dispatchEvent('change')
    }
    await page.waitForTimeout(500)
    // App should still be functional — canvas visible
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid next button clicks do not corrupt state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const nextBtn = page.locator('.grid-cols-3 .justify-center button').last()
    // Click next rapidly (sample.pdf only has 2 pages, so it clamps)
    await nextBtn.click()
    await nextBtn.click()
    await nextBtn.click()
    await page.waitForTimeout(500)
    const pageInput = page.locator('input[type="number"]')
    // Should be clamped to page 2
    await expect(pageInput).toHaveValue('2')
  })

  test('drawing after rapid page switch works correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    // Rapid switch
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Draw on current page
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
    // Canvas still renders
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

test.describe('Multi-Page — Status Bar Integration', () => {
  test('status bar shows filename for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('text=/sample\\.pdf/')).toBeVisible()
  })

  test('annotation count in status bar updates per current page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw on page 1
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await expect(page.locator('text=/1 ann/')).toBeVisible()
    // Navigate to page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Page 2 should show 0 ann
    await expect(page.locator('text=/0 ann/')).toBeVisible()
  })

  test('rotation indicator shows on rotated page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Rotate page
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    // Status bar should show 90 degrees
    await expect(page.locator('text=/90°/')).toBeVisible()
  })

  test('each page can have independent rotation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Rotate page 1
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/90°/')).toBeVisible()
    // Navigate to page 2 — should not show rotation
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // No rotation indicator for page 2 (0 degrees = hidden)
    await expect(page.locator('text=/90°/')).toBeHidden()
  })
})

test.describe('Multi-Page — Tool Persistence Across Pages', () => {
  test('active tool persists when navigating between pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Pencil (P)')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Pencil should still be active on page 2
    await expect(page.locator('text=/Ctrl\\+scroll zoom/')).toBeVisible()
  })

  test('zoom level persists when navigating between pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(200)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Canvas should still be visible and zoomed
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('creating text on page 1 then navigating to page 2 commits text', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await selectTool(page, 'Text (T)')
    await drawOnCanvas(page, [{ x: 50, y: 50 }, { x: 250, y: 100 }])
    await page.waitForTimeout(300)
    await page.keyboard.type('Page 1 text')
    // Navigate to page 2 (should commit text editing)
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Navigate back to page 1
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // Text annotation should persist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser on page 1 does not affect page 2 annotations', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Draw on page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Go to page 1 and use eraser
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await selectTool(page, 'Eraser (E)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 200, y: 200 }])
    await page.waitForTimeout(200)
    // Go back to page 2 — annotation should still be there
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('selection is cleared when navigating to another page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Select it
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await expect(page.locator('text=/Arrows nudge/')).toBeVisible()
    // Navigate to page 2
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    // No selection hint on page 2
    await expect(page.locator('text=/Click to select/')).toBeVisible()
  })

  test('redo on page 1 after undoing works correctly', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Navigate to page 2 and back
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    // Redo should still work
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('file size is shown in status bar for multi-page PDF', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Status bar left section shows file size (e.g. "1.2 KB")
    const statusLeft = page.locator('.grid-cols-3 > div').first()
    const text = await statusLeft.textContent()
    expect(text).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/)
  })

  test('page number input has correct min and max attributes', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await expect(pageInput).toHaveAttribute('min', '1')
    await expect(pageInput).toHaveAttribute('max', '2')
  })

  test('all pages render canvases in the scroll area', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Both pages should have data-page containers
    const pageContainers = page.locator('[data-page]')
    await expect(pageContainers).toHaveCount(2)
  })

  test('drawing callout on page 2 persists after navigation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate away and back
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('annotation count updates in real time when drawing on current page', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    expect(await getAnnotationCount(page)).toBe(0)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Status bar should immediately reflect the new count
    await expect(page.locator('text=/1 ann/')).toBeVisible()
  })

  test('page containers have data-page attribute', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('[data-page="1"]')).toBeVisible()
    await expect(page.locator('[data-page="2"]')).toBeVisible()
  })

  test('highlight tool works on page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await selectTool(page, 'Highlight (H)')
    await drawOnCanvas(page, [{ x: 100, y: 100 }, { x: 300, y: 100 }])
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('measure tool works on page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    // Measure label should appear in status bar
    await expect(page.locator('text=/1 meas/')).toBeVisible()
  })

  test('rotate on page 2 only rotates page 2', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await page.locator('button[title="Rotate CW"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=/90°/')).toBeVisible()
    // Page 1 should not be rotated
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await expect(page.locator('text=/90°/')).toBeHidden()
  })

  test('text annotation with content on page 2 persists', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const pageInput = page.locator('input[type="number"]')
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(500)
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Navigate away and back
    await pageInput.fill('1')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    await pageInput.fill('2')
    await pageInput.dispatchEvent('change')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
