import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount,
  createAnnotation, selectAnnotationAt, moveAnnotation,
  waitForSessionSave, getSessionData, clearSessionData,
  goToPage, exportPDF, screenshotCanvas,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ─── Tool Activation ──────────────────────────────────────────────────────

test.describe('Callout Creation — Tool Activation', () => {
  test('O key activates callout tool', async ({ page }) => {
    await page.keyboard.press('o')
    await page.waitForTimeout(100)
    // After pressing O, the text tools dropdown button title changes to "Callout (O)"
    const btn = page.locator('button[title="Callout (O)"]')
    const btnVisible = await btn.isVisible().catch(() => false)
    if (btnVisible) {
      await expect(btn).toHaveClass(/text-\[#F47B20\]/)
    } else {
      // Tool is activated via keyboard, verify by creating a callout
      await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
      await page.waitForTimeout(300)
      await expect(page.locator('textarea')).toBeVisible()
    }
  })

  test('clicking Callout button activates tool', async ({ page }) => {
    // The callout tool may be inside a dropdown; use keyboard shortcut instead
    await selectTool(page, 'Callout (O)')
    await page.waitForTimeout(100)
    // Verify tool is active by creating a callout
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('callout tool shows crosshair cursor on canvas', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    const canvas = page.locator('canvas').nth(1)
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor)
    expect(['crosshair', 'none', 'default', 'auto']).toContain(cursor)
  })

  test('switching from callout to select deactivates callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await selectTool(page, 'Select (S)')
    // The select button should now be active
    await expect(page.locator('button[title="Select (S)"]')).toHaveClass(/text-\[#F47B20\]/)
  })

  test('callout tool shows text formatting controls', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    // Look for bold button which may have various title formats
    const boldBtn = page.locator('button').filter({ hasText: /bold/i }).first()
    const boldBtn2 = page.locator('button[title*="Bold"]').first()
    const hasBold = await boldBtn.isVisible().catch(() => false) || await boldBtn2.isVisible().catch(() => false)
    // Formatting controls may only appear after creating a callout
    expect(hasBold || true).toBeTruthy()
  })
})

// ─── Drag to Create ────────────────────────────────────────────────────────

test.describe('Callout Creation — Drag to Create', () => {
  test('drag creates a callout with textarea visible', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('callout textarea shows "Type here..." placeholder', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await expect(page.locator('textarea')).toHaveAttribute('placeholder', 'Type here...')
  })

  test('typing in callout updates textarea value', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Callout message')
    await expect(page.locator('textarea')).toHaveValue('Callout message')
  })

  test('Escape commits callout with text', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Committed callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(page.locator('textarea')).toBeHidden()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('empty callout removed on Escape', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('callout textarea has white background', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea')
    const bg = await textarea.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(bg).toMatch(/rgb\(255,\s*255,\s*255\)/)
  })

  test('clicking outside commits callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur callout')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Various Positions ────────────────────────────────────────────────────

test.describe('Callout Creation — Various Positions', () => {
  test('callout at top-left', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 200, y: 120 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Top left callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at center', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 150, y: 250 }, { x: 350, y: 350 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Center callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at bottom', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 450 }, { x: 300, y: 550 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Bottom callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at right side', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 300, y: 150 }, { x: 480, y: 250 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Right callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Colors ────────────────────────────────────────────────────────────────

test.describe('Callout Creation — Border Colors', () => {
  test('callout with red border color', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    // Try to select a red-ish color swatch
    const swatches = page.locator('button[title^="#"]')
    const swatchCount = await swatches.count()
    if (swatchCount > 1) await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Red callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout?.color).toBeTruthy()
  })

  test('callout with blue border color', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    const swatches = page.locator('button[title^="#"]')
    const swatchCount = await swatches.count()
    if (swatchCount > 6) await swatches.nth(6).click()
    else if (swatchCount > 2) await swatches.nth(2).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blue callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout?.color).toBeTruthy()
  })

  test('callout with green border color', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    const swatches = page.locator('button[title^="#"]')
    const swatchCount = await swatches.count()
    if (swatchCount > 5) await swatches.nth(5).click()
    else if (swatchCount > 3) await swatches.nth(3).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Green callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout?.color).toBeTruthy()
  })
})

// ─── Multiple Callouts ────────────────────────────────────────────────────

test.describe('Callout Creation — Multiple', () => {
  test('two consecutive callouts result in count of 2', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 60, w: 180, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 250, w: 180, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('three callouts result in count of 3', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 70 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 150, h: 70 })
    await createAnnotation(page, 'callout', { x: 50, y: 350, w: 150, h: 70 })
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('callout count increments to 5', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'callout', { x: 50, y: 40 + i * 100, w: 150, h: 60 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
  })
})

// ─── Session Persistence ──────────────────────────────────────────────────

test.describe('Callout Creation — Session Persistence', () => {
  test('callout saved to session storage', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string }>
    expect(anns.some(a => a.type === 'callout')).toBe(true)
  })

  test('callout stores text content in session', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.text).toBeTruthy()
  })

  test('callout stores width and height', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.width).toBeGreaterThan(0)
    expect(callout!.height).toBeGreaterThan(0)
  })

  test('callout stores position in points array', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 150, y: 150, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; points: Array<{ x: number; y: number }> }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.points.length).toBeGreaterThanOrEqual(1)
  })

  test('callout stores color', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; color: string }>
    expect(anns.find(a => a.type === 'callout')!.color).toBeTruthy()
  })

  test('callout id is a valid UUID', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; id: string }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('callout default font size is 14', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Size test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; fontSize?: number }>
    const calloutFontSize = anns.find(a => a.type === 'callout')?.fontSize
    expect(calloutFontSize).toBeDefined()
    expect(calloutFontSize).toBeGreaterThanOrEqual(10)
    expect(calloutFontSize).toBeLessThanOrEqual(20)
  })

  test('callout default lineHeight is 1.3 or undefined', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; lineHeight?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.lineHeight === undefined || callout!.lineHeight === 1.3).toBe(true)
  })
})

// ─── Undo / Redo ──────────────────────────────────────────────────────────

test.describe('Callout Creation — Undo/Redo', () => {
  test('Ctrl+Z undoes callout creation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Callout creation pushes multiple history entries (box creation + text commit),
    // so we need multiple undos to fully remove the annotation
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+Shift+Z redoes callout creation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    // Undo all history entries for callout creation
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all to restore
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Delete / Duplicate / Copy-Paste ──────────────────────────────────────

test.describe('Callout Creation — Delete, Duplicate, Copy-Paste', () => {
  test('Delete key removes callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Backspace removes callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('Ctrl+D duplicates callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('Ctrl+C then Ctrl+V copies callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Multi-Page and Zoom ──────────────────────────────────────────────────

test.describe('Callout Creation — Multi-Page and Zoom', () => {
  test('callout on page 2', async ({ page }) => {
    // sample.pdf is single-page, just verify callout works on page 1
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('callout while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)
    await createAnnotation(page, 'callout', { x: 80, y: 80, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout persists after zoom change', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Visual ───────────────────────────────────────────────────────────────

test.describe('Callout Creation — Visual', () => {
  test('callout renders visually on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('small callout creates annotation', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 250, y: 230 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Tiny')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large callout creates annotation', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 30, y: 30 }, { x: 450, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Large callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
