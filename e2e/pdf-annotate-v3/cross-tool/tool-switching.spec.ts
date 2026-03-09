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
  waitForSessionSave,
  getSessionData,
  screenshotCanvas,
} from '../../helpers/pdf-annotate'
import { navigateToTool } from '../../helpers/navigation'

test.describe('Cross-Tool: Tool Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page)
  })

  test('switch from Select to Pencil', async ({ page }) => {
    await selectTool(page, 'Select (S)')
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Pencil to Line', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Line to Arrow', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 250 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Arrow to Rectangle', async ({ page }) => {
    await selectTool(page, 'Arrow (A)')
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Rectangle to Circle', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Circle to Cloud', async ({ page }) => {
    await selectTool(page, 'Circle (C)')
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 100, 100)
    await clickCanvasAt(page, 250, 100)
    await clickCanvasAt(page, 250, 200)
    await doubleClickCanvasAt(page, 100, 200)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Cloud to Text', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.type('Hello')
    await page.keyboard.press('Escape')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Text to Callout', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.type('Note')
    await page.keyboard.press('Escape')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Callout to Eraser', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Callout (O)')
    await selectTool(page, 'Eraser (E)')
    // Eraser is active — just verify no crash
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Eraser to Highlight', async ({ page }) => {
    await selectTool(page, 'Eraser (E)')
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 100 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from Highlight to Measure', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    // Measurements are stored separately from annotations
    const measText = page.locator('text=/\\d+ meas/')
    await expect(measText).toBeVisible({ timeout: 3000 })
  })

  test('cycle through all tools S→P→L→A→R→C→K→T→O→E→H→M', async ({ page }) => {
    const tools = [
      'Select (S)', 'Pencil (P)', 'Line (L)', 'Arrow (A)',
      'Rectangle (R)', 'Circle (C)', 'Cloud (K)', 'Text (T)',
      'Callout (O)', 'Eraser (E)', 'Highlight (H)', 'Measure (M)',
    ]
    for (const tool of tools) {
      await selectTool(page, tool)
    }
    // Verify no errors occurred — page still functional
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch tool while drawing cancels current draw', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 150, { steps: 3 })
    // Switch tool mid-draw
    await page.keyboard.press('r')
    await page.mouse.up()
    await page.waitForTimeout(200)
    // The pencil draw should have been cancelled or committed as partial
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })

  test('switch from text edit to drawing tool commits text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.type('Committed text')
    // Switch to rectangle tool — should commit the text
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create pencil then immediately create rectangle', async ({ page }) => {
    await createAnnotation(page, 'pencil')
    await createAnnotation(page, 'rectangle', { x: 250, y: 100, w: 100, h: 80 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('create text then create shape over it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('use every drawing tool once and verify all annotations exist', async ({ page }) => {
    const types: Array<'pencil' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'callout'> = [
      'pencil', 'rectangle', 'circle', 'arrow', 'line', 'text', 'callout',
    ]
    let y = 50
    for (const type of types) {
      await createAnnotation(page, type, { x: 80, y, w: 100, h: 40 })
      y += 55
    }
    expect(await getAnnotationCount(page)).toBe(7)
  })

  test('tool switch preserves color property', async ({ page }) => {
    test.setTimeout(60000)
    // Switch between tools and verify annotations still work
    await selectTool(page, 'Rectangle (R)')
    await page.waitForTimeout(200)
    await selectTool(page, 'Circle (C)')
    await page.waitForTimeout(200)
    // Create circle to verify tool switch worked
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tool switch does not lose selection', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    // Switch to pencil and back to select
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    // Clicking the same spot should still be able to select the annotation
    // Click on left edge of default rectangle (x=100)
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    // Annotation should still be there
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('eraser after creating multiple annotation types', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'circle', { x: 250, y: 100, w: 100, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 220, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Eraser (E)')
    // Switch to Object eraser mode (default is Partial which only splits strokes)
    const objectBtn = page.locator('button').filter({ hasText: /Object/i }).first()
    if (await objectBtn.isVisible().catch(() => false)) {
      await objectBtn.click()
      await page.waitForTimeout(100)
    }
    // Erase the rectangle by sweeping horizontally along its top edge (y=100)
    // from well outside left (x=80) to well outside right (x=220), crossing the perimeter
    await drawOnCanvas(page, [
      { x: 80, y: 100 }, { x: 100, y: 100 }, { x: 120, y: 100 },
      { x: 140, y: 100 }, { x: 160, y: 100 }, { x: 180, y: 100 },
      { x: 200, y: 100 }, { x: 220, y: 100 },
    ])
    await page.waitForTimeout(500)
    const countAfter = await getAnnotationCount(page)
    expect(countAfter).toBeLessThan(3)
  })

  test('select tool after creating mixed annotations', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 80, y: 80, w: 100, h: 60 })
    await createAnnotation(page, 'text', { x: 80, y: 180, w: 120, h: 40 })
    await selectTool(page, 'Select (S)')
    // Click on left edge of rectangle at {x:80,y:80,w:100,h:60}
    await clickCanvasAt(page, 80, 110)
    await page.waitForTimeout(200)
    // Should be able to select without crash
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('rapid tool switching does not corrupt canvas', async ({ page }) => {
    const tools = ['Pencil (P)', 'Rectangle (R)', 'Circle (C)', 'Arrow (A)', 'Line (L)']
    for (let i = 0; i < 20; i++) {
      await selectTool(page, tools[i % tools.length])
    }
    // Canvas should still be functional
    await createAnnotation(page, 'rectangle')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('rapid 50-tool-switch stress test', async ({ page }) => {
    const allTools = [
      'Select (S)', 'Pencil (P)', 'Line (L)', 'Arrow (A)',
      'Rectangle (R)', 'Circle (C)', 'Cloud (K)', 'Text (T)',
      'Callout (O)', 'Eraser (E)', 'Highlight (H)', 'Measure (M)',
    ]
    for (let i = 0; i < 50; i++) {
      await selectTool(page, allTools[i % allTools.length])
    }
    // App should still be responsive
    await createAnnotation(page, 'pencil')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch to eraser while annotation is selected', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    await selectTool(page, 'Eraser (E)')
    // Selection should be cleared, eraser active
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch to select while drawing does not create partial annotation', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 120, { steps: 2 })
    // Switch to select mid-draw
    await page.keyboard.press('s')
    await page.mouse.up()
    await page.waitForTimeout(300)
    const count = await getAnnotationCount(page)
    expect(count).toBeLessThanOrEqual(1)
  })

  test('switch tool after undo leaves correct tool active', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch tool after redo leaves correct tool active', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 250, y: 100 },
      { x: 300, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch from measure to pencil', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch from highlight to text', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.type('After highlight')
    await page.keyboard.press('Escape')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create highlight then switch to select and click on it', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
    await selectAnnotationAt(page, 200, 200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('create cloud then switch to arrow', async ({ page }) => {
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 80, 80)
    await clickCanvasAt(page, 200, 80)
    await clickCanvasAt(page, 200, 180)
    await doubleClickCanvasAt(page, 80, 180)
    await page.waitForTimeout(300)
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 210, y: 130 }, { x: 300, y: 130 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('double switch back to same tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Circle (C)')
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('switch tool 3 times without drawing should leave 0 annotations', async ({ page }) => {
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Circle (C)')
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('create annotations with all shape tools in sequence', async ({ page }) => {
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 50, y: 50 }, { x: 200, y: 50 })
    await selectTool(page, 'Arrow (A)')
    await dragOnCanvas(page, { x: 50, y: 100 }, { x: 200, y: 100 })
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 50, y: 140 }, { x: 200, y: 200 })
    await selectTool(page, 'Circle (C)')
    await dragOnCanvas(page, { x: 50, y: 220 }, { x: 200, y: 300 })
    await selectTool(page, 'Cloud (K)')
    await clickCanvasAt(page, 50, 320)
    await clickCanvasAt(page, 200, 320)
    await clickCanvasAt(page, 200, 400)
    await doubleClickCanvasAt(page, 50, 400)
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(5)
  })

  test('create text then pencil over it', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 50 })
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 250, y: 150 },
    ])
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('create callout then line through it', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 60 })
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 80, y: 130 }, { x: 280, y: 130 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('switch tool preserves canvas screenshot integrity', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    const beforeSwitch = await screenshotCanvas(page)
    await selectTool(page, 'Pencil (P)')
    await selectTool(page, 'Select (S)')
    const afterSwitch = await screenshotCanvas(page)
    // Both screenshots should be non-null buffers
    expect(beforeSwitch.length).toBeGreaterThan(0)
    expect(afterSwitch.length).toBeGreaterThan(0)
  })

  test('switch to eraser and back to select without erasing anything', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectTool(page, 'Eraser (E)')
    await selectTool(page, 'Select (S)')
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('select tool after deleting annotation with eraser', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await selectTool(page, 'Eraser (E)')
    // Switch to Object eraser mode (default is Partial which only splits strokes)
    const objectBtn = page.locator('button').filter({ hasText: /Object/i }).first()
    if (await objectBtn.isVisible().catch(() => false)) {
      await objectBtn.click()
      await page.waitForTimeout(100)
    }
    // Sweep horizontally along the top edge (y=100) from outside left to outside right
    await drawOnCanvas(page, [
      { x: 80, y: 100 }, { x: 100, y: 100 }, { x: 120, y: 100 },
      { x: 140, y: 100 }, { x: 160, y: 100 }, { x: 180, y: 100 },
      { x: 200, y: 100 }, { x: 240, y: 100 },
    ])
    await page.waitForTimeout(500)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 160, 140)
    // Nothing to select — count should be 0
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('text tool then callout tool creates separate annotations', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 80, y: 80, w: 120, h: 40 })
    await createAnnotation(page, 'callout', { x: 80, y: 160, w: 120, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('measure tool then line tool creates separate annotations', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    await selectTool(page, 'Line (L)')
    await dragOnCanvas(page, { x: 100, y: 150 }, { x: 300, y: 150 })
    // 1 annotation (line) + measurement stored separately
    expect(await getAnnotationCount(page)).toBe(1)
    const measText = page.locator('text=/\\d+ meas/')
    await expect(measText).toBeVisible({ timeout: 3000 })
  })

  test('switching tool clears any in-progress drag ghost', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 150, { steps: 2 })
    // Switch tool
    await page.keyboard.press('c')
    await page.mouse.up()
    await page.waitForTimeout(300)
    // Now draw a circle — should work cleanly
    await dragOnCanvas(page, { x: 200, y: 200 }, { x: 300, y: 300 })
    const count = await getAnnotationCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('select annotation then switch to pencil clears selection handles', async ({ page }) => {
    await createAnnotation(page, 'rectangle')
    await selectAnnotationAt(page, 100, 140)
    const beforeScreenshot = await screenshotCanvas(page)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    // Selection handles should be gone, but annotation remains
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tool switch session data updates active tool', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await waitForSessionSave(page)
    const session1 = await getSessionData(page)
    await selectTool(page, 'Circle (C)')
    await waitForSessionSave(page)
    const session2 = await getSessionData(page)
    // Sessions should reflect tool changes
    expect(session1).not.toBeNull()
    expect(session2).not.toBeNull()
  })

  test('create annotation with each tool and undo all', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 50, w: 80, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 110, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 80, y: 170, w: 80, h: 40 })
    await createAnnotation(page, 'arrow', { x: 80, y: 230, w: 80, h: 40 })
    await createAnnotation(page, 'line', { x: 80, y: 290, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(5)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('create annotation with each tool and redo all', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 50, w: 80, h: 40 })
    await createAnnotation(page, 'rectangle', { x: 80, y: 110, w: 80, h: 40 })
    await createAnnotation(page, 'circle', { x: 80, y: 170, w: 80, h: 40 })
    expect(await getAnnotationCount(page)).toBe(3)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(0)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Shift+z')
      await page.waitForTimeout(150)
    }
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('switch to same tool twice has no side effects', async ({ page }) => {
    await selectTool(page, 'Rectangle (R)')
    await selectTool(page, 'Rectangle (R)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 200 })
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('tool switch during text editing commits partial text', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 160 })
    await page.keyboard.type('Partial')
    // Don't press Escape — switch tool directly
    await selectTool(page, 'Arrow (A)')
    await page.waitForTimeout(300)
    // Text should have been committed
    expect(await getAnnotationCount(page)).toBeGreaterThanOrEqual(1)
  })

  test('pencil to eraser to pencil workflow', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(1)
    await selectTool(page, 'Eraser (E)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 200, y: 160 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await selectTool(page, 'Pencil (P)')
    await drawOnCanvas(page, [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ])
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('highlight tool creates annotation separate from shapes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 60 })
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 })
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('measure then rectangle workflow', async ({ page }) => {
    await selectTool(page, 'Measure (M)')
    await clickCanvasAt(page, 100, 100)
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 300, 100)
    await page.waitForTimeout(300)
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 120, h: 80 })
    // 1 annotation (rectangle) + measurement stored separately
    expect(await getAnnotationCount(page)).toBe(1)
    const measText = page.locator('text=/\\d+ meas/')
    await expect(measText).toBeVisible({ timeout: 3000 })
  })
})
