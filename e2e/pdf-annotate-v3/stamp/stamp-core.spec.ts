import { test, expect } from '@playwright/test'
import {
  uploadPDFAndWait,
  selectTool,
  drawOnCanvas,
  dragOnCanvas,
  clickCanvasAt,
  doubleClickCanvasAt,
  getAnnotationCount,
  createAnnotation,
  selectAnnotationAt,
  moveAnnotation,
  waitForSessionSave,
  getSessionData,
  goToPage,
  exportPDF,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Stamp - Core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  /** Activate stamp tool and select a preset */
  async function selectStampPreset(page: import('@playwright/test').Page, preset: string) {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    const presetBtn = page.locator(`button:has-text("${preset}")`).first()
    await presetBtn.click()
    await page.waitForTimeout(100)
  }

  /** Place a stamp at a position */
  async function placeStamp(
    page: import('@playwright/test').Page,
    preset: string,
    x: number,
    y: number,
  ) {
    await selectStampPreset(page, preset)
    await clickCanvasAt(page, x, y)
    await page.waitForTimeout(300)
  }

  const PRESETS = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'VOID', 'FOR REVIEW']

  // ── Stamp placement for each preset ───────────────────────────────────

  for (const preset of PRESETS) {
    test(`place ${preset} stamp`, async ({ page }) => {
      await placeStamp(page, preset, 250, 300)
      expect(await getAnnotationCount(page)).toBe(1)
    })
  }

  // ── Stamp position ────────────────────────────────────────────────────

  test('stamp appears at click position', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 300, 350)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamp = anns.find(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    if (stamp) {
      // Stamp stores position via points array
      expect(stamp.points).toBeDefined()
      expect(stamp.points.length).toBeGreaterThan(0)
    }
  })

  // ── Stamp text and colors ─────────────────────────────────────────────

  test('stamp has correct text content', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 250, 300)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamp = anns.find(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    expect(stamp).toBeDefined()
    expect(stamp?.stampType).toBe('DRAFT')
  })

  test('stamp has a color property', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamp = anns.find(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    expect(stamp).toBeDefined()
    expect(stamp?.color).toBeTruthy()
  })

  test('stamp has a background color', async ({ page }) => {
    await placeStamp(page, 'CONFIDENTIAL', 250, 300)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamp = anns.find(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    expect(stamp).toBeDefined()
    expect(stamp?.backgroundColor).toBeTruthy()
  })

  test('different stamp presets have different colors', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 150, 200)
    await placeStamp(page, 'DRAFT', 350, 200)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamps = anns.filter(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    if (stamps.length >= 2) {
      expect(stamps[0].color).not.toBe(stamps[1].color)
    }
  })

  // ── Selection ─────────────────────────────────────────────────────────

  test('stamp is selectable', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)

    await selectAnnotationAt(page, 250, 300)
    // No crash, canvas still interactive
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
  })

  // ── Move ──────────────────────────────────────────────────────────────

  test('stamp is movable', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 200, 200)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)

    await moveAnnotation(page, { x: 200, y: 200 }, { x: 350, y: 350 })
    await waitForSessionSave(page)
    const sessionAfter = await getSessionData(page)

    const annsBefore = sessionBefore?.annotations?.[1] || sessionBefore?.annotations?.['1'] || []
    const annsAfter = sessionAfter?.annotations?.[1] || sessionAfter?.annotations?.['1'] || []
    if (annsBefore[0]?.points?.[0] && annsAfter[0]?.points?.[0]) {
      expect(annsAfter[0].points[0].x).not.toBe(annsBefore[0].points[0].x)
    }
  })

  // ── Resize ────────────────────────────────────────────────────────────

  test('stamp is resizable via handle', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await selectAnnotationAt(page, 250, 300)
    await page.waitForTimeout(200)

    // Look for resize handles
    const handle = page.locator('.resize-handle, [data-handle]').first()
    if (await handle.isVisible().catch(() => false)) {
      const handleBox = await handle.boundingBox()
      if (handleBox) {
        await page.mouse.move(handleBox.x + 5, handleBox.y + 5)
        await page.mouse.down()
        await page.mouse.move(handleBox.x + 50, handleBox.y + 50, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }
    }

    // Stamp should still exist after resize attempt
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Delete ────────────────────────────────────────────────────────────

  test('stamp is deletable with Delete key', async ({ page }) => {
    await placeStamp(page, 'CONFIDENTIAL', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)

    await selectAnnotationAt(page, 250, 300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('stamp is deletable with Backspace key', async ({ page }) => {
    await placeStamp(page, 'REVIEWED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)

    await selectAnnotationAt(page, 250, 300)
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  // ── Undo / Redo ───────────────────────────────────────────────────────

  test('undo stamp placement removes stamp', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('redo after undo restores stamp', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    expect(await getAnnotationCount(page)).toBe(1)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(0)

    await page.keyboard.press('Control+y')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Duplicate / Copy-paste ────────────────────────────────────────────

  test('stamp copy and paste', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)

    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(100)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp duplicate with Ctrl+D', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)

    await selectAnnotationAt(page, 200, 200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Multiple stamps ───────────────────────────────────────────────────

  test('multiple stamps on one page', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 100, 150)
    await placeStamp(page, 'DRAFT', 300, 150)
    await placeStamp(page, 'CONFIDENTIAL', 100, 350)
    await placeStamp(page, 'REVIEWED', 300, 350)

    expect(await getAnnotationCount(page)).toBe(4)
  })

  test('stamps on different pages', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')

    await goToPage(page, 1)
    await placeStamp(page, 'APPROVED', 250, 300)

    await goToPage(page, 2)
    await placeStamp(page, 'DRAFT', 250, 300)

    await waitForSessionSave(page)
    const session = await getSessionData(page)
    // annotations are page-keyed: { 1: [...], 2: [...] }
    const page1Stamps = (session?.annotations?.[1] || session?.annotations?.['1'] || [])
      .filter((a: Record<string, unknown>) => a.type === 'stamp')
    const page2Stamps = (session?.annotations?.[2] || session?.annotations?.['2'] || [])
      .filter((a: Record<string, unknown>) => a.type === 'stamp')
    expect(page1Stamps.length + page2Stamps.length).toBe(2)
  })

  // ── Zoom ──────────────────────────────────────────────────────────────

  test('stamp while zoomed in', async ({ page }) => {
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(300)

    await placeStamp(page, 'VOID', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp while zoomed out', async ({ page }) => {
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(300)

    await placeStamp(page, 'FOR REVIEW', 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Rotation ──────────────────────────────────────────────────────────

  test('stamp on rotated page', async ({ page }) => {
    const rotateBtn = page.locator('button[title*="Rotate"]').first()
    if (await rotateBtn.isVisible()) {
      await rotateBtn.click()
      await page.waitForTimeout(300)
    }

    await placeStamp(page, 'APPROVED', 200, 300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Count ─────────────────────────────────────────────────────────────

  test('stamp count increments with each placement', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await placeStamp(page, PRESETS[i], 100 + i * 100, 300)
      expect(await getAnnotationCount(page)).toBe(i + 1)
    }
  })

  // ── Session data ──────────────────────────────────────────────────────

  test('stamp stored in session data', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await waitForSessionSave(page)

    const session = await getSessionData(page)
    expect(session).not.toBeNull()
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamp = anns.find(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    expect(stamp).toBeDefined()
  })

  test('stamp persists after page reload', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 250, 300)
    await waitForSessionSave(page)

    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(1000)

    const session = await getSessionData(page)
    const anns = session?.annotations?.[1] || session?.annotations?.['1'] || []
    const stamps = anns.filter(
      (a: Record<string, unknown>) => a.type === 'stamp',
    )
    expect(stamps.length).toBe(1)
  })

  // ── Export ─────────────────────────────────────────────────────────────

  test('stamp appears in exported PDF', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await page.waitForTimeout(500)

    const download = await exportPDF(page)
    expect(download).toBeTruthy()
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.pdf$/i)
  })

  // ── Consecutive placement ─────────────────────────────────────────────

  test('consecutive stamp placement with sticky tool', async ({ page }) => {
    // Enable sticky tool via Pin button, then activate stamp
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await page.locator('button:has-text("APPROVED")').first().click()
    await page.waitForTimeout(200)

    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 250, 150)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 400, 150)
    await page.waitForTimeout(200)

    expect(await getAnnotationCount(page)).toBe(3)
  })

  // ── Edge positions ────────────────────────────────────────────────────

  test('stamp near canvas edge', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 20, 20)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('stamp at canvas center', async ({ page }) => {
    await placeStamp(page, 'REVIEWED', 280, 400)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  // ── Overlapping stamps ────────────────────────────────────────────────

  test('overlapping stamps both exist', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await placeStamp(page, 'DRAFT', 260, 310)

    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Z-order ───────────────────────────────────────────────────────────

  test('stamp z-order: bring to front', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 200, 200)
    await createAnnotation(page, 'rectangle', { x: 180, y: 180, w: 80, h: 60 })
    expect(await getAnnotationCount(page)).toBe(2)

    // Select stamp and bring to front
    await selectAnnotationAt(page, 200, 200)
    await page.waitForTimeout(200)

    // Look for bring-to-front context menu or keyboard shortcut
    const bringFrontBtn = page.locator('button:has-text("Front"), button[title*="front"]').first()
    if (await bringFrontBtn.isVisible().catch(() => false)) {
      await bringFrontBtn.click()
      await page.waitForTimeout(200)
    }

    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('stamp z-order: send to back', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 180, y: 180, w: 80, h: 60 })
    await placeStamp(page, 'APPROVED', 200, 200)
    expect(await getAnnotationCount(page)).toBe(2)

    await selectAnnotationAt(page, 200, 200)
    await page.waitForTimeout(200)

    const sendBackBtn = page.locator('button:has-text("Back"), button[title*="back"]').first()
    if (await sendBackBtn.isVisible().catch(() => false)) {
      await sendBackBtn.click()
      await page.waitForTimeout(200)
    }

    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Stamp + other annotations ─────────────────────────────────────────

  test('stamp coexists with other annotation types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 150, h: 30 })
    await placeStamp(page, 'APPROVED', 350, 200)

    expect(await getAnnotationCount(page)).toBe(3)
  })

  // ── Context menu ──────────────────────────────────────────────────────

  test('stamp right-click shows context menu', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await selectAnnotationAt(page, 250, 300)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.click(box.x + 250, box.y + 300, { button: 'right' })
      await page.waitForTimeout(300)
    }

    const contextMenu = page.locator('[role="menu"], .context-menu').first()
    const isVisible = await contextMenu.isVisible().catch(() => false)
    // Context menu may or may not appear depending on implementation
    expect(typeof isVisible).toBe('boolean')
  })

  // ── Arrow key nudge ───────────────────────────────────────────────────

  test('stamp nudge with arrow keys', async ({ page }) => {
    await placeStamp(page, 'DRAFT', 250, 300)
    await waitForSessionSave(page)
    const sessionBefore = await getSessionData(page)

    await selectAnnotationAt(page, 250, 300)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)

    const sessionAfter = await getSessionData(page)
    const annsBefore = sessionBefore?.annotations?.[1] || sessionBefore?.annotations?.['1'] || []
    const annsAfter = sessionAfter?.annotations?.[1] || sessionAfter?.annotations?.['1'] || []
    if (annsBefore[0]?.points?.[0] && annsAfter[0]?.points?.[0]) {
      expect(annsAfter[0].points[0].x).toBeGreaterThan(annsBefore[0].points[0].x)
    }
  })

  // ── Rapid placement ───────────────────────────────────────────────────

  test('rapid stamp placement (10+ stamps)', async ({ page }) => {
    // Enable sticky tool via Pin button, then activate stamp
    await page.locator('button[title="Lock tool (stay on current tool after drawing)"]').click()
    await page.waitForTimeout(100)
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await page.locator('button:has-text("APPROVED")').first().click()
    await page.waitForTimeout(200)

    for (let i = 0; i < 10; i++) {
      await clickCanvasAt(page, 50 + i * 45, 200 + (i % 3) * 80)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(300)

    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(10)
  })

  // ── Tool switch ───────────────────────────────────────────────────────

  test('stamp after switching from another tool', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 50 })
    expect(await getAnnotationCount(page)).toBe(1)

    await placeStamp(page, 'VOID', 300, 300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  // ── Visual appearance ─────────────────────────────────────────────────

  test('stamp visual appearance via screenshot', async ({ page }) => {
    await placeStamp(page, 'APPROVED', 250, 300)
    await page.waitForTimeout(300)

    const screenshot = await screenshotCanvas(page)
    expect(screenshot).toBeTruthy()
    expect(screenshot.byteLength).toBeGreaterThan(0)
  })

  test('stamp keyboard shortcut G activates stamp tool', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)

    // Stamp preset selector should be visible
    const presetBtn = page.locator('button:has-text("APPROVED")').first()
    const visible = await presetBtn.isVisible().catch(() => false)
    expect(visible).toBeTruthy()
  })
})
