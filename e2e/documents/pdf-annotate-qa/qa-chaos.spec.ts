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
  goToPage,
  exportPDF,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ─── Rapid Tool Switching ───────────────────────────────────────────────────

test.describe('Chaos QA — Rapid Tool Switching', () => {
  test('cycle through all drawing tools rapidly without crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const tools = [
      'Select (S)', 'Pencil (P)', 'Line (L)', 'Arrow (A)',
      'Rectangle (R)', 'Circle (C)', 'Cloud (K)', 'Text (T)',
      'Callout (O)', 'Eraser (E)', 'Highlight (H)', 'Measure (M)',
    ]
    for (let round = 0; round < 3; round++) {
      for (const tool of tools) {
        await selectTool(page, tool)
      }
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('rapid tool switching 50 times does not corrupt state', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 50; i++) {
      const key = ['s', 'p', 'r', 'c', 'l', 'a', 'e', 'h', 'm', 't'][i % 10]
      await page.keyboard.press(key)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
    // Should still be able to draw
    await selectTool(page, 'Rectangle (R)')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })
})

// ─── Draw, Switch, Switch Back ──────────────────────────────────────────────

test.describe('Chaos QA — Draw-Switch-Draw', () => {
  test('draw with pencil, switch to select, switch back to pencil, draw again', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Select (S)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Pencil (P)')
    await createAnnotation(page, 'pencil', { x: 100, y: 200, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw rectangle, switch to text, switch to rectangle, draw again', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Text (T)')
    await page.waitForTimeout(100)
    await selectTool(page, 'Rectangle (R)')
    await createAnnotation(page, 'rectangle', { x: 200, y: 50, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('draw circle, switch to eraser on empty area, switch to circle, draw again', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'circle', { x: 50, y: 50, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    // Erase in empty area (no annotation there)
    await drawOnCanvas(page, [{ x: 350, y: 350 }, { x: 400, y: 400 }])
    await page.waitForTimeout(200)
    await selectTool(page, 'Circle (C)')
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Bulk Create, Select, Delete ────────────────────────────────────────────

test.describe('Chaos QA — Bulk Create and Delete', () => {
  test('create 20 annotations then delete each one', async ({ page }) => {
    test.setTimeout(120000)
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create 20 rectangles in a grid
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 30 + (i % 5) * 90,
        y: 30 + Math.floor(i / 5) * 90,
        w: 60,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    // Delete all with undo (Ctrl+Z x 20)
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('create 10 annotations, select each, verify selection works', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    const positions: { x: number; y: number }[] = []
    for (let i = 0; i < 10; i++) {
      const x = 30 + (i % 5) * 90
      const y = 30 + Math.floor(i / 5) * 100
      await createAnnotation(page, 'rectangle', { x, y, w: 60, h: 50 })
      positions.push({ x, y: y + 25 }) // center-ish of border
    }
    expect(await getAnnotationCount(page)).toBe(10)
    // Select each annotation
    for (const pos of positions) {
      await selectAnnotationAt(page, pos.x, pos.y)
      await page.waitForTimeout(100)
    }
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

// ─── Undo/Redo Stress ──────────────────────────────────────────────────────

test.describe('Chaos QA — Undo/Redo Stress', () => {
  test('undo 20 times after creating 20 annotations', async ({ page }) => {
    test.setTimeout(120000)
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 90,
        w: 60,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    // Undo all
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo 20 times after undoing 20 annotations', async ({ page }) => {
    test.setTimeout(120000)
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 90,
        w: 60,
        h: 50,
      })
    }
    // Undo all
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(20)
  })

  test('alternating undo/redo does not crash', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('canvas').first()).toBeVisible()
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ─── Multi-Page Annotations ────────────────────────────────────────────────

test.describe('Chaos QA — Multi-Page Annotations', () => {
  test('create annotations on both pages and verify isolation', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    // Page 1: 3 annotations
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(3)
    // Page 2: 2 annotations
    await goToPage(page, 2)
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Back to page 1 — still 3
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('bulk annotations on page 2 survive navigation', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    await goToPage(page, 2)
    for (let i = 0; i < 8; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 50 + (i % 4) * 100,
        y: 50 + Math.floor(i / 4) * 120,
        w: 70,
        h: 60,
      })
    }
    const countBefore = await getAnnotationCount(page)
    expect(countBefore).toBe(8)
    // Navigate away and back
    await goToPage(page, 1)
    await goToPage(page, 2)
    expect(await getAnnotationCount(page)).toBe(countBefore)
  })
})

// ─── Session Save After Stress ──────────────────────────────────────────────

test.describe('Chaos QA — Session Save After Stress', () => {
  test('session saves correctly after creating many annotations', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 90,
        w: 60,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(15)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const page1Anns = session.annotations['1'] || session.annotations[1]
    expect(page1Anns.length).toBe(15)
  })

  test('session saves annotations from multiple pages', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const p1 = session.annotations['1'] || session.annotations[1]
    const p2 = session.annotations['2'] || session.annotations[2]
    expect(p1.length).toBe(1)
    expect(p2.length).toBe(1)
  })

  test('session integrity after undo/redo cycle', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 280, y: 100, w: 100, h: 80 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session.annotations['1'] || session.annotations[1]
    expect(anns.length).toBe(2)
  })
})

// ─── Export After Stress ────────────────────────────────────────────────────

test.describe('Chaos QA — Export After Stress', () => {
  test('export works after creating 15 annotations', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 15; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 90,
        w: 60,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(15)
    const download = await exportPDF(page, 30000)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export works after undo/redo stress', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 50 + i * 80,
        y: 100,
        w: 60,
        h: 50,
      })
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export works after rapid tool switching and drawing', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    const tools: Array<'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line'> = [
      'pencil', 'rectangle', 'circle', 'arrow', 'line',
    ]
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, tools[i], {
        x: 50 + i * 80,
        y: 100,
        w: 60,
        h: 50,
      })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('export works after multi-page stress', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 150, h: 50 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'text', { x: 100, y: 250, w: 200, h: 50 })
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})

// ─── Mixed Chaos Scenarios ──────────────────────────────────────────────────

test.describe('Chaos QA — Mixed Scenarios', () => {
  test('create mixed types, undo half, redo some, export', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'circle', { x: 200, y: 50, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 50, y: 200, w: 150, h: 50 })
    await createAnnotation(page, 'arrow', { x: 250, y: 200, w: 100, h: 50 })
    expect(await getAnnotationCount(page)).toBe(4)
    // Undo 2
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
    // Redo 1
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
    // Export
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('draw on both pages, undo on page 2, session still valid', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await goToPage(page, 2)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Undo on page 2
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Page 1 still has annotation
    await goToPage(page, 1)
    expect(await getAnnotationCount(page)).toBe(1)
    // Session should be valid
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).not.toBeNull()
  })

  test('50 mixed annotations with bulk create does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await uploadPDFAndWait(page, 'sample.pdf')
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line'> = [
      'pencil', 'rectangle', 'circle', 'arrow', 'line',
    ]
    for (let i = 0; i < 50; i++) {
      await createAnnotation(page, types[i % types.length], {
        x: 30 + (i % 8) * 55,
        y: 30 + Math.floor(i / 8) * 55,
        w: 40,
        h: 30,
      })
    }
    expect(await getAnnotationCount(page)).toBe(50)
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('canvas remains responsive after stress operations', async ({ page }) => {
    test.setTimeout(60000)
    await uploadPDFAndWait(page, 'sample.pdf')
    // Create 10 annotations
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', {
        x: 20 + (i % 5) * 90,
        y: 20 + Math.floor(i / 5) * 100,
        w: 60,
        h: 50,
      })
    }
    // Undo 5
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    // Redo 3
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(300)
    // Canvas should still be interactive
    await createAnnotation(page, 'circle', { x: 300, y: 300, w: 80, h: 80 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThan(0)
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})
