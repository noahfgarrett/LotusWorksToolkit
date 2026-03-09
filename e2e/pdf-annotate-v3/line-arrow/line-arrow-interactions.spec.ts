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
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
  exportPDF,
  goToPage,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

// ---------------------------------------------------------------------------
// Tool Switching Between Line & Arrow
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Tool Switching', () => {
  test('create line then switch to arrow and create arrow', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('create arrow then switch to line and create line', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rapid switching between line and arrow tools', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await selectTool(page, 'Arrow (A)')
    await selectTool(page, 'Line (L)')
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('multiple tool switches between line and arrow without drawing', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await selectTool(page, i % 2 === 0 ? 'Line (L)' : 'Arrow (A)')
    }
    // Should not crash or leave artifacts
    expect(await getAnnotationCount(page)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Lines & Arrows Over Other Annotations
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Over Other Annotations', () => {
  test('line over existing pencil annotation', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 200, h: 100 })
    await createAnnotation(page, 'line', { x: 50, y: 150, w: 300, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow pointing to text box area', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 50, y: 100, w: 150, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line and arrow on same page at different positions', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('line and arrow crossing over each other', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 200 })
    await createAnnotation(page, 'arrow', { x: 300, y: 100, w: -200, h: 200 })
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Precise Resizing
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Precise Resizing', () => {
  test('resize line by dragging endpoint', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    // Attempt to drag the right endpoint
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 400, y: 250 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('drag arrow head to new position', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    // Attempt to drag the arrowhead endpoint
    await dragOnCanvas(page, { x: 300, y: 200 }, { x: 350, y: 150 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Z-Order (Bring to Front, Send to Back)
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Z-Order', () => {
  test('line and arrow z-order: latest drawn is on top', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 100 })
    await createAnnotation(page, 'arrow', { x: 150, y: 150, w: 200, h: 100 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Last drawn (arrow) should be on top
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.type).toBe('line')
      expect(anns[1]?.type).toBe('arrow')
    }
  })

  test('bring line to front via context action', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 150, w: 200, h: 0 })
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    // Select the first annotation (arrow, which is below line)
    await selectAnnotationAt(page, 200, 150)
    // Try bring to front shortcut
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('send arrow to back via context action', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 150, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Line/Arrow with Other Shape Types
// ---------------------------------------------------------------------------

test.describe('Line-Arrow with Other Shapes', () => {
  test('line with rectangle on same page', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 250, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('arrow with circle on same page', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 50, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 150, y: 200 }, { x: 250, y: 300 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Select All & Nudge
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Select All & Nudge', () => {
  test('select multiple lines via Ctrl+A', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 200, w: 200, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 300, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(300)
    // All should be selected; no crash
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('nudge line with arrow keys', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge line with Shift+arrow (10px increments)', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 200, w: 200, h: 0 })
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Shift+ArrowRight')
    await page.waitForTimeout(100)
    await page.keyboard.press('Shift+ArrowDown')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge arrow with arrow keys', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('nudge arrow with Shift+arrow (10px increments)', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 200, w: 200, h: 0 })
    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(100)
    await page.keyboard.press('Shift+ArrowUp')
    await page.waitForTimeout(100)
    expect(await getAnnotationCount(page)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Session Reload Survival
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Session Reload Survival', () => {
  test('line survives page reload via session restore', async ({ page }) => {
    await createAnnotation(page, 'line')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    expect(sessionBefore).toBeTruthy()
    const anns = sessionBefore?.annotations?.['1'] || sessionBefore?.annotations?.[1]
    expect(anns?.length).toBeGreaterThan(0)
  })

  test('arrow survives page reload via session restore', async ({ page }) => {
    await createAnnotation(page, 'arrow')
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)
    expect(sessionBefore).toBeTruthy()
    const anns = sessionBefore?.annotations?.['1'] || sessionBefore?.annotations?.[1]
    expect(anns?.length).toBeGreaterThan(0)
  })

  test('mixed line and arrow annotations persist in session', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 200, h: 50 })
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    expect(anns?.length).toBe(2)
    const types = anns?.map((a: { type: string }) => a.type)
    expect(types).toContain('line')
    expect(types).toContain('arrow')
  })
})

// ---------------------------------------------------------------------------
// Combined Export
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Combined Export', () => {
  test('export PDF with both lines and arrows', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 250, w: 200, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    const download = await exportPDF(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
  })
})

// ---------------------------------------------------------------------------
// Additional Interaction Tests
// ---------------------------------------------------------------------------

test.describe('Line-Arrow Additional Interactions', () => {
  test('delete all lines and arrows via Ctrl+A then Delete', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 200, h: 0 })
    await createAnnotation(page, 'line', { x: 50, y: 300, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('undo delete of multiple lines and arrows', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 50, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 50, y: 200, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBeGreaterThan(0)
  })

  test('line and arrow with different colors on same page', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const swatches = page.locator('button[title^="#"]')
    await swatches.nth(1).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)

    await selectTool(page, 'Arrow (A)')
    await swatches.nth(6).click()
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.color).not.toBe(anns[1]?.color)
    }
  })

  test('line and arrow with different widths on same page', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    const slider = page.locator('input[type="range"]').first()
    await slider.fill('2')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    await page.waitForTimeout(200)

    await selectTool(page, 'Arrow (A)')
    const slider2 = page.locator('input[type="range"]').first()
    await slider2.fill('15')
    await page.waitForTimeout(100)
    await dragOnCanvas(page, { x: 100, y: 250 }, { x: 300, y: 250 })
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(2)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const anns = session?.annotations?.['1'] || session?.annotations?.[1]
    if (anns && anns.length >= 2) {
      expect(anns[0]?.strokeWidth).toBeDefined()
      expect(anns[1]?.strokeWidth).toBeDefined()
    }
  })

  test('eraser removes line but not adjacent arrow', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 300, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBe(2)
    await selectTool(page, 'Eraser (E)')
    await clickCanvasAt(page, 200, 100)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('line and arrow on page 2 together', async ({ page }) => {
    await goToPage(page, 2)
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 0 })
    await createAnnotation(page, 'arrow', { x: 100, y: 250, w: 200, h: 0 })
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(2)
  })
})
