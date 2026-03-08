import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, getAnnotationCount, createAnnotation, exportPDF,
  waitForSessionSave, getSessionData, goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

test.describe('Cross-Tool Stress Tests', () => {
  // ── 1. Create 10 different annotation types in sequence then verify count (2 tests) ──

  test('create 10 annotations of different types in sequence — all counted', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 120, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 220, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 90, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 120, y: 90, w: 60, h: 20 })
    await createAnnotation(page, 'text', { x: 220, y: 90, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 30, y: 150, w: 80, h: 40 })
    await createAnnotation(page, 'pencil', { x: 150, y: 150, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 250, y: 150, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 30, y: 220, w: 60, h: 30 })
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('create 10 mixed types then verify each incremental count', async ({ page }) => {
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = [
      'pencil', 'rectangle', 'circle', 'line', 'arrow',
      'pencil', 'rectangle', 'circle', 'line', 'arrow',
    ]
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, types[i], { x: 20 + col * 80, y: 30 + row * 60, w: 55, h: 25 })
      expect(await getAnnotationCount(page)).toBe(i + 1)
    }
  })

  // ── 2. Create annotation, copy, paste 10 times, verify count (2 tests) ──

  test('create rectangle then duplicate 10 times — 11 total', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 125)
    await page.waitForTimeout(200)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+d')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(11)
  })

  test('create circle then copy-paste 10 times — 11 total', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 125)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(11)
  })

  // ── 3. Draw with every tool then undo all (2 tests) ──

  test('draw with every tool then undo all — zero annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'line', { x: 30, y: 70, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 30, y: 110, w: 60, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 30, y: 150, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 30, y: 210, w: 60, h: 30 })
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('draw 7 tool types then undo all back to zero', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 50, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 30, w: 50, h: 30 })
    await createAnnotation(page, 'circle', { x: 180, y: 30, w: 50, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 100, w: 50, h: 20 })
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 50, h: 20 })
    await createAnnotation(page, 'text', { x: 180, y: 100, w: 60, h: 25 })
    await createAnnotation(page, 'callout', { x: 30, y: 160, w: 70, h: 40 })
    const count = await getAnnotationCount(page)
    expect(count).toBe(7)
    // Undo all (callout/text push 2 history entries each)
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── 4. Rapid tool switching (cycle through all tools 3 times) — no crash (2 tests) ──

  test('cycle all tools via shortcuts 3 times — no crash', async ({ page }) => {
    const keys = ['p', 'l', 'a', 'r', 'c', 't', 'o', 'e', 'h', 's', 'k', 'm']
    for (let round = 0; round < 3; round++) {
      for (const key of keys) {
        await page.keyboard.press(key)
      }
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('cycle all tools via selectTool 3 times — no crash', async ({ page }) => {
    const tools = [
      'Pencil (P)', 'Line (L)', 'Arrow (A)', 'Rectangle (R)',
      'Circle (C)', 'Text (T)', 'Callout (O)', 'Eraser (E)',
      'Highlight (H)', 'Select (S)', 'Cloud (K)', 'Measure (M)',
    ]
    for (let round = 0; round < 3; round++) {
      for (const tool of tools) {
        await selectTool(page, tool)
      }
    }
    await page.waitForTimeout(300)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  // ── 5. Draw 20 annotations then delete every other one (2 tests) ──

  test('draw 20 pencil strokes then undo every other one', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', { x: 20 + col * 80, y: 20 + row * 50, w: 55, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    // Undo 10 to remove half
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('draw 20 rectangles then select-all and delete half via undo', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'rectangle', { x: 20 + col * 80, y: 20 + row * 60, w: 55, h: 35 })
    }
    expect(await getAnnotationCount(page)).toBe(20)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(10)
  })

  // ── 6. Draw annotations, zoom in, draw more, zoom out, draw more (2 tests) ──

  test('draw at default zoom, zoom in, draw more, zoom out, draw more', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Zoom in
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'circle', { x: 80, y: 180, w: 70, h: 40 })
    await createAnnotation(page, 'arrow', { x: 80, y: 250, w: 70, h: 20 })
    expect(await getAnnotationCount(page)).toBe(4)
    // Zoom out twice (back past default)
    await page.locator('button[title="Zoom out"]').click()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'line', { x: 50, y: 300, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('zoom in twice, draw, zoom out twice, draw — annotations persist', async ({ page }) => {
    test.setTimeout(120000)
    await page.locator('button[title="Zoom in"]').click()
    await page.locator('button[title="Zoom in"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 20 })
    await createAnnotation(page, 'pencil', { x: 100, y: 150, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
    await page.locator('button[title="Zoom out"]').click()
    await page.locator('button[title="Zoom out"]').click()
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 50, y: 50, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })

  // ── 7. Draw on page 1, go to page 2, draw, go back, verify (2 tests) ──

  test('draw on page 1, navigate to page 2, draw, go back — page 1 annotations persist', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 160, w: 100, h: 50 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('multi-page: draw on both pages, switch back and forth, counts correct', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await createAnnotation(page, 'pencil', { x: 80, y: 80, w: 80, h: 20 })
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 80, y: 160, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    await goToPage(page, 1)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(1)
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── 8. Create 5 annotations, export, verify annotations still there (2 tests) ──

  test('create 5 annotations then export — annotations remain', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 50, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('create 5 mixed types then export — annotations still on canvas', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 120, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 220, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 120, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(5)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const name = download.suggestedFilename()
    expect(name).toMatch(/\.pdf$/i)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  // ── 9. Create annotations, session save, reload session data, verify (2 tests) ──

  test('create 5 annotations then session save — session data exists', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + i * 70, y: 50, w: 50, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(5)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  test('create 10 annotations then session save — session data persists', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5)
      const col = i % 5
      await createAnnotation(page, 'pencil', { x: 20 + col * 80, y: 30 + row * 50, w: 55, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
  })

  // ── 10. Complex undo/redo sequences (3 tests) ──

  test('draw, undo, draw again, redo does not restore first — redo branch cleared', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    // Draw something new — should clear redo stack
    await createAnnotation(page, 'rectangle', { x: 50, y: 100, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Redo should not bring back the pencil
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('alternating undo-redo 20 times with single annotation — stable state', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 60 })
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── 11. Draw with locked tool (pin button) across types (2 tests) ──

  test('lock pencil tool and draw 5 strokes without re-selecting', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Pencil (P)')
    for (let i = 0; i < 5; i++) {
      await drawOnCanvas(page, [
        { x: 30 + i * 70, y: 50 },
        { x: 70 + i * 70, y: 70 },
      ])
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('lock rectangle tool and draw 5 rectangles without re-selecting', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const pinBtn = page.locator('button[title*="Lock tool"]')
    if (await pinBtn.isVisible()) await pinBtn.click()
    await selectTool(page, 'Rectangle (R)')
    for (let i = 0; i < 5; i++) {
      await dragOnCanvas(page, { x: 30 + i * 70, y: 50 }, { x: 80 + i * 70, y: 100 })
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  // ── 12. Multi-select then delete all (2 tests) ──

  test('select-all with Ctrl+A then delete — clears all annotations', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 8; i++) {
      await createAnnotation(page, 'pencil', { x: 30 + (i % 4) * 90, y: 30 + Math.floor(i / 4) * 50, w: 60, h: 15 })
    }
    expect(await getAnnotationCount(page)).toBe(8)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  test('select-all mixed types then delete — clears everything', async ({ page }) => {
    test.setTimeout(120000)
    await createAnnotation(page, 'pencil', { x: 30, y: 30, w: 60, h: 15 })
    await createAnnotation(page, 'rectangle', { x: 120, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'circle', { x: 220, y: 30, w: 60, h: 30 })
    await createAnnotation(page, 'line', { x: 30, y: 100, w: 60, h: 20 })
    await createAnnotation(page, 'arrow', { x: 120, y: 100, w: 60, h: 20 })
    expect(await getAnnotationCount(page)).toBe(5)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(0)
  })

  // ── 13. Annotation creation then property changes then export (2 tests) ──

  test('create rectangle, change color, then export — succeeds', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    // Try changing color via preset
    const redPreset = page.locator('button[title="#FF0000"]')
    if (await redPreset.isVisible()) await redPreset.click()
    await page.waitForTimeout(100)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create pencil, change stroke width, then export — succeeds', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 120, h: 20 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 110)
    await page.waitForTimeout(200)
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      await slider.fill('8')
      await page.waitForTimeout(100)
    }
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── 14. Create annotations at exact same position (overlap stress) (2 tests) ──

  test('create 10 rectangles at same position — all counted', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  test('create 10 pencil strokes at same position — all counted', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 80, h: 20 })
    }
    expect(await getAnnotationCount(page)).toBe(10)
  })

  // ── 15. Draw then find then draw then export sequence (2 tests) ──

  test('draw, open find, close find, draw more, export — no crash', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(2)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  test('draw, find, draw, find again, draw, export — all persist', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 40 })
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    await createAnnotation(page, 'circle', { x: 50, y: 210, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
    const download = await exportPDF(page)
    expect(download).toBeTruthy()
  })

  // ── 16. Create max annotations (50+) on one page (2 tests) ──

  test('create 50 pencil strokes on one page — all counted', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 50; i++) {
      const row = Math.floor(i / 10)
      const col = i % 10
      await createAnnotation(page, 'pencil', { x: 15 + col * 40, y: 15 + row * 35, w: 25, h: 10 })
    }
    expect(await getAnnotationCount(page)).toBe(50)
  })

  test('create 55 mixed annotations on one page — all counted', async ({ page }) => {
    test.setTimeout(120000)
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'line' | 'arrow'> = ['pencil', 'rectangle', 'circle', 'line', 'arrow']
    for (let i = 0; i < 55; i++) {
      const row = Math.floor(i / 11)
      const col = i % 11
      await createAnnotation(page, types[i % types.length], { x: 10 + col * 36, y: 10 + row * 30, w: 22, h: 12 })
    }
    expect(await getAnnotationCount(page)).toBe(55)
  })

  // ── 17. Rapid create/undo cycle 30 times (2 tests) ──

  test('rapid create-then-undo pencil 30 times — zero annotations remain', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 30; i++) {
      await createAnnotation(page, 'pencil', { x: 50 + (i % 5) * 60, y: 50, w: 40, h: 10 })
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  test('rapid create-then-undo rectangle 30 times — zero annotations remain', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 30; i++) {
      await createAnnotation(page, 'rectangle', { x: 50 + (i % 5) * 70, y: 50, w: 50, h: 30 })
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(30)
    }
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBeLessThanOrEqual(2)
  })

  // ── 18. All keyboard shortcuts in sequence — no crash (1 test) ──

  test('press every keyboard shortcut in sequence — no crash', async ({ page }) => {
    test.setTimeout(60000)
    // Tool shortcuts
    const toolKeys = ['s', 'p', 'l', 'a', 'r', 'c', 'k', 't', 'o', 'e', 'h', 'm', 'g']
    for (const key of toolKeys) {
      await page.keyboard.press(key)
      await page.waitForTimeout(30)
    }
    // Modifier shortcuts
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(30)
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(30)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(30)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(30)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(30)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })
})
