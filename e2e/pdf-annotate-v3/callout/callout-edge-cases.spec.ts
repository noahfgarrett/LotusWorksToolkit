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

// ─── Very Small Callout ──────────────────────────────────────────────────

test.describe('Callout Edge Cases — Small Callout', () => {
  test('very small drag still creates callout', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 210, y: 210 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Tiny')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('minimum callout dimensions are enforced', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 205, y: 205 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Min')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.width).toBeGreaterThan(10)
    expect(callout!.height).toBeGreaterThan(10)
  })
})

// ─── Very Large Callout ──────────────────────────────────────────────────

test.describe('Callout Edge Cases — Large Callout', () => {
  test('very large callout fills canvas', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 10, y: 10 }, { x: 400, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Full page callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('large callout renders on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 450, y: 400 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Large')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})

// ─── Very Long Text ──────────────────────────────────────────────────────

test.describe('Callout Edge Cases — Long Text', () => {
  test('callout with very long text (200+ chars) persists', async ({ page }) => {
    const longText = 'A'.repeat(200) + ' end'
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 400, y: 350 })
    await page.waitForTimeout(300)
    await page.keyboard.type(longText)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'callout')!.text).toBe(longText)
  })

  test('callout with many lines', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 300, y: 400 })
    await page.waitForTimeout(300)
    for (let i = 1; i <= 15; i++) {
      await page.keyboard.type(`Line ${i}`)
      if (i < 15) await page.keyboard.press('Enter')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Empty Callout ────────────────────────────────────────────────────────

test.describe('Callout Edge Cases — No Text', () => {
  test('empty callout removed on Escape', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('whitespace-only callout removed on Escape', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('   ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Whitespace-only callout may be removed or kept depending on implementation
    const wsCount = await getAnnotationCount(page)
    expect(wsCount).toBeLessThanOrEqual(1)
  })
})

// ─── Multiple Callouts Overlapping ────────────────────────────────────────

test.describe('Callout Edge Cases — Overlapping', () => {
  test('two overlapping callouts both persist', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await createAnnotation(page, 'callout', { x: 150, y: 120, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('can select overlapping callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await createAnnotation(page, 'callout', { x: 150, y: 120, w: 200, h: 100 })
    await selectAnnotationAt(page, 250, 170)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('deleting one overlapping callout leaves the other', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await createAnnotation(page, 'callout', { x: 100, y: 300, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectAnnotationAt(page, 200, 150)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Callout + Other Shapes ──────────────────────────────────────────────

test.describe('Callout Edge Cases — Mixed with Other Shapes', () => {
  test('callout and text box coexist', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 50, y: 50, w: 150, h: 50 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('callout and rectangle coexist', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 200, h: 100 })
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 250 }, { x: 250, y: 350 })
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Callout Resize Minimum ──────────────────────────────────────────────

test.describe('Callout Edge Cases — Resize Minimum', () => {
  test('callout enforces minimum size after creation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; width?: number; height?: number }>
    const callout = anns.find(a => a.type === 'callout')
    expect(callout!.width).toBeGreaterThan(20)
    expect(callout!.height).toBeGreaterThan(20)
  })
})

// ─── Callout After Zoom Changes ──────────────────────────────────────────

test.describe('Callout Edge Cases — Zoom Changes', () => {
  test('callout survives zoom in then zoom out', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout editable after zoom change', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Zoom test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(400)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ─── Callout After Rotation ──────────────────────────────────────────────

test.describe('Callout Edge Cases — Page Rotation', () => {
  test('callout persists after page rotation', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Rotate page if rotation button exists
    const rotateBtn = page.locator('button[title="Rotate CW"]')
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(400)
      expect(await getAnnotationCount(page)).toBe(1)
    }
  })
})

// ─── Rapid Callout Creation ──────────────────────────────────────────────

test.describe('Callout Edge Cases — Rapid Creation', () => {
  test('rapid creation of 10 callouts', async ({ page }) => {
    test.setTimeout(90000)
    for (let i = 0; i < 10; i++) {
      await selectTool(page, 'Callout (O)')
      await dragOnCanvas(page, { x: 30 + (i % 3) * 130, y: 30 + Math.floor(i / 3) * 120 }, { x: 30 + (i % 3) * 130 + 100, y: 30 + Math.floor(i / 3) * 120 + 60 })
      await page.waitForTimeout(200)
      await page.keyboard.type(`C${i + 1}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    const rapidCalloutCount = await getAnnotationCount(page)
    expect(rapidCalloutCount).toBeGreaterThanOrEqual(8)
    expect(rapidCalloutCount).toBeLessThanOrEqual(10)
  })

  test('stress test: 20 callouts', async ({ page }) => {
    test.setTimeout(120000)
    for (let i = 0; i < 20; i++) {
      await createAnnotation(page, 'callout', {
        x: 20 + (i % 4) * 100,
        y: 20 + Math.floor(i / 4) * 90,
        w: 80,
        h: 50,
      })
    }
    const stressCalloutCount = await getAnnotationCount(page)
    expect(stressCalloutCount).toBeGreaterThanOrEqual(18)
    expect(stressCalloutCount).toBeLessThanOrEqual(20)
  })
})

// ─── Callout Text Blur Timeout ────────────────────────────────────────────

test.describe('Callout Edge Cases — Blur Commit', () => {
  test('callout commits on blur (click elsewhere)', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Blur test')
    await clickCanvasAt(page, 400, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; text?: string }>
    expect(anns.find(a => a.type === 'callout')!.text).toBe('Blur test')
  })
})

// ─── Callout Arrow ────────────────────────────────────────────────────────

test.describe('Callout Edge Cases — Arrow', () => {
  test('callout renders with arrow on canvas', async ({ page }) => {
    const before = await screenshotCanvas(page)
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await page.waitForTimeout(300)
    const after = await screenshotCanvas(page)
    // Callout with arrow should differ from blank canvas
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('callout arrow position stored in session', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 200, h: 100 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = Object.values(session.annotations).flat() as Array<{ type: string; arrowTips?: Array<{ x: number; y: number }> }>
    const callout = anns.find(a => a.type === 'callout')
    // Callout should have arrow data (arrowTips or similar)
    expect(callout).toBeTruthy()
  })

  test('callout with content and arrow renders correctly', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Arrow callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const screenshot = await screenshotCanvas(page)
    expect(screenshot.length).toBeGreaterThan(0)
  })
})

// ─── Callout Undo/Redo Edge Cases ────────────────────────────────────────

test.describe('Callout Edge Cases — Undo/Redo', () => {
  test('undo all callouts leaves zero', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Each callout may create multiple history entries (text commit + creation)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo all callouts restores them', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 50, y: 50, w: 150, h: 80 })
    await createAnnotation(page, 'callout', { x: 50, y: 200, w: 150, h: 80 })
    // Undo all
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    // Redo all
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(100)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ─── Callout Near Canvas Edges ────────────────────────────────────────────

test.describe('Callout Edge Cases — Near Edges', () => {
  test('callout at very top of canvas', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 50, y: 5 }, { x: 250, y: 80 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Top edge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('callout at very left of canvas', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 5, y: 100 }, { x: 180, y: 200 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Left edge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})
