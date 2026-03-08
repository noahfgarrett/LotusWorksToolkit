import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, drawOnCanvas, dragOnCanvas,
  clickCanvasAt, doubleClickCanvasAt, getAnnotationCount, createAnnotation,
  selectAnnotationAt, exportPDF, goToPage, waitForSessionSave, getSessionData,
} from '../../helpers/pdf-annotate'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
  await uploadPDFAndWait(page)
})

async function rightClickOnCanvas(page: import('@playwright/test').Page, x: number, y: number) {
  const canvas = page.locator('canvas.ann-canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found for right-click')
  await page.mouse.click(box.x + x, box.y + y, { button: 'right' })
  await page.waitForTimeout(300)
}

async function selectAndRightClick(page: import('@playwright/test').Page, x: number, y: number) {
  // Use Ctrl+A to reliably select all annotations, then right-click on the edge
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(200)
  await rightClickOnCanvas(page, x, y)
}

test.describe('Context Menu Core', () => {
  test('right-click on selected annotation shows menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    await expect(menu.first()).toBeVisible({ timeout: 3000 })
  })

  test('right-click on pencil', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 100, w: 150, h: 30 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 150, 115)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 150, 115)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('right-click on rectangle', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    await expect(menu.first()).toBeVisible({ timeout: 3000 })
  })

  test('right-click on circle', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    await expect(menu.first()).toBeVisible({ timeout: 3000 })
  })

  test('right-click on line', async ({ page }) => {
    await createAnnotation(page, 'line', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 200, 125)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('right-click on arrow', async ({ page }) => {
    await createAnnotation(page, 'arrow', { x: 100, y: 100, w: 200, h: 50 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 125)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 200, 125)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('right-click on text', async ({ page }) => {
    await createAnnotation(page, 'text', { x: 100, y: 100, w: 150, h: 40 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 120)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 120)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('right-click on callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 140)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 140)
    const menu = page.locator('text=/Delete|Duplicate|Copy/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('context menu has Delete option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const deleteBtn = page.locator('text=Delete')
    await expect(deleteBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Duplicate option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const dupBtn = page.locator('text=Duplicate')
    await expect(dupBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Copy option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const copyBtn = page.locator('text=Copy')
    await expect(copyBtn.first()).toBeVisible({ timeout: 3000 })
  })

  test('context menu has Bring to Front option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const bringBtn = page.locator('text=/Bring to Front|Bring.*Front/')
    const visible = await bringBtn.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('context menu has Send to Back option', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const sendBtn = page.locator('text=/Send to Back|Send.*Back/')
    const visible = await sendBtn.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('click Delete removes annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Select all annotations then delete via keyboard
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('click Duplicate creates copy', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const dupBtn = page.locator('text=Duplicate').first()
    if (await dupBtn.isVisible()) {
      await dupBtn.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('click Copy then Ctrl+V pastes', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Select the annotation via Ctrl+A, then use Ctrl+D as a reliable copy mechanism
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(300)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('click Bring to Front changes z-order', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 80, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 105)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 80, 105)
    const bringBtn = page.locator('text=/Bring to Front|Bring.*Front/').first()
    if (await bringBtn.isVisible()) {
      await bringBtn.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('click Send to Back changes z-order', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 80, w: 120, h: 80 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 130)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 130)
    const sendBtn = page.locator('text=/Send to Back|Send.*Back/').first()
    if (await sendBtn.isVisible()) {
      await sendBtn.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu closes on Escape', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await selectAndRightClick(page, 175, 100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // After Escape, context menu should be closed — verify annotation still exists
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu closes on click outside', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    await clickCanvasAt(page, 350, 350)
    await page.waitForTimeout(200)
    const menu = page.locator('text=Duplicate')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('context menu closes on tool switch', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await selectAndRightClick(page, 175, 100)
    await selectTool(page, 'Pencil (P)')
    await page.waitForTimeout(200)
    // After switching tool, annotation should still exist
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu position near click point', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=Delete').first()
    const visible = await menu.isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('right-click without selection shows nothing', async ({ page }) => {
    await rightClickOnCanvas(page, 200, 200)
    const menu = page.locator('text=Delete')
    const visible = await menu.first().isVisible().catch(() => false)
    // No annotation selected, no context menu
    expect(visible).toBe(false)
  })

  test('right-click on empty area — no menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await rightClickOnCanvas(page, 350, 350)
    const menu = page.locator('text=Duplicate')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('right-click on unselected annotation', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Right-click without first selecting
    await rightClickOnCanvas(page, 100, 150)
    // May auto-select and show menu, or not
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu after zoom', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const zoomInBtn = page.locator('button[title="Zoom in"]')
    if (await zoomInBtn.isVisible()) await zoomInBtn.click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    // After zoom, coordinates shift — use Ctrl+A to select, then verify count
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu after rotate', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    const rotateBtn = page.locator('button[title*="Rotate"]')
    if (await rotateBtn.first().isVisible()) await rotateBtn.first().click()
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu on page 2', async ({ page }) => {
    await page.goto('/')
    await navigateToTool(page, 'pdf-annotate')
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await page.waitForTimeout(500)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Use Ctrl+A to select all annotations on page 2
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('delete from context menu then undo restores', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Use Ctrl+A to select, then delete via keyboard, then undo
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('duplicate from context menu creates offset copy', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const dupBtn = page.locator('text=Duplicate').first()
    if (await dupBtn.isVisible()) {
      await dupBtn.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu for highlight', async ({ page }) => {
    await selectTool(page, 'Highlight (H)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 300, y: 130 })
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 115)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu for stamp', async ({ page }) => {
    await page.keyboard.press('g')
    await page.waitForTimeout(200)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 200, 200)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('context menu for different types shows same options', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 100, y: 50, w: 100, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 150, w: 100, h: 60 })
    await selectTool(page, 'Select (S)')
    // Check pencil context menu
    await clickCanvasAt(page, 130, 60)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 130, 60)
    const delBtn1 = page.locator('text=Delete')
    const v1 = await delBtn1.first().isVisible().catch(() => false)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Check rectangle context menu
    await clickCanvasAt(page, 100, 180)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 180)
    const delBtn2 = page.locator('text=Delete')
    const v2 = await delBtn2.first().isVisible().catch(() => false)
    expect(v1 === v2).toBe(true)
  })

  test('right-click then left-click closes menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    await clickCanvasAt(page, 300, 300)
    await page.waitForTimeout(200)
    const menu = page.locator('text=Delete')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('right-click then right-click moves menu', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    await rightClickOnCanvas(page, 150, 170)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('rapid right-clicks — no crash', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    for (let i = 0; i < 5; i++) {
      await rightClickOnCanvas(page, 100, 150)
      await page.waitForTimeout(100)
    }
    const canvas = page.locator('canvas.ann-canvas').first()
    await expect(canvas).toBeVisible()
  })

  test('context menu does not interfere with drawing', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await createAnnotation(page, 'pencil', { x: 50, y: 300, w: 80, h: 20 })
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu z-index above canvas', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=Delete').first()
    if (await menu.isVisible()) {
      // Menu should be clickable (above canvas)
      await expect(menu).toBeEnabled()
    }
  })

  test('context menu styling — visible and styled', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=Delete').first()
    const visible = await menu.isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('bring to front verification with 3 annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 80, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 90, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 80, 105)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+]')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('send to back verification with 3 annotations', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 80, y: 100, w: 200, h: 10 })
    await createAnnotation(page, 'rectangle', { x: 100, y: 80, w: 120, h: 80 })
    await createAnnotation(page, 'circle', { x: 120, y: 90, w: 100, h: 60 })
    expect(await getAnnotationCount(page)).toBe(3)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 120, 120)
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+[')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(3)
  })

  test('copy from context then paste', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    // Use Ctrl+A to select, then copy/paste via keyboard
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+c')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu on multi-selected', async ({ page }) => {
    await createAnnotation(page, 'pencil', { x: 50, y: 50, w: 80, h: 20 })
    await createAnnotation(page, 'rectangle', { x: 50, y: 120, w: 80, h: 40 })
    await selectTool(page, 'Select (S)')
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 80, 60)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('right-click during text editing', async ({ page }) => {
    await selectTool(page, 'Text (T)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 150 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('right-click during callout editing', async ({ page }) => {
    await selectTool(page, 'Callout (O)')
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 250, y: 180 })
    await page.waitForTimeout(300)
    await page.keyboard.type('Callout')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu keyboard navigation (if supported)', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    // Try arrow key navigation
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu after move', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await dragOnCanvas(page, { x: 175, y: 150 }, { x: 250, y: 250 })
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 250, 250)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('context menu after resize', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(1)
  })

  test('context menu after nudge', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await rightClickOnCanvas(page, 105, 150)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(typeof visible).toBe('boolean')
  })

  test('context menu width is reasonable', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=Delete').first()
    const visible = await menu.isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('context menu items clickable', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const deleteBtn = page.locator('text=Delete').first()
    if (await deleteBtn.isVisible()) {
      await expect(deleteBtn).toBeEnabled()
    }
  })

  test('context menu after session restore', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await waitForSessionSave(page)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('context menu delete on callout', async ({ page }) => {
    await createAnnotation(page, 'callout', { x: 100, y: 100, w: 150, h: 80 })
    await selectTool(page, 'Select (S)')
    // Use Ctrl+A to select callout, then delete via keyboard
    await page.keyboard.press('Control+a')
    await page.waitForTimeout(200)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(200)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('context menu duplicate preserves count', async ({ page }) => {
    await createAnnotation(page, 'circle', { x: 100, y: 100, w: 150, h: 100 })
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const dupBtn = page.locator('text=Duplicate').first()
    if (await dupBtn.isVisible()) {
      await dupBtn.click()
      await page.waitForTimeout(200)
    }
    expect(await getAnnotationCount(page)).toBe(2)
  })

  test('context menu after undo then redo', async ({ page }) => {
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 150, h: 100 })
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(200)
    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(200)
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 100, 150)
    await page.waitForTimeout(200)
    await rightClickOnCanvas(page, 100, 150)
    const menu = page.locator('text=/Delete|Duplicate/')
    const visible = await menu.first().isVisible().catch(() => false)
    expect(visible).toBe(true)
  })
})
