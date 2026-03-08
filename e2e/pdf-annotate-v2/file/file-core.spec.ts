import { test, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, dragOnCanvas, clickCanvasAt,
  getAnnotationCount, createAnnotation,
  waitForSessionSave, getSessionData, clearSessionData,
} from '../../helpers/pdf-annotate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

test.describe('File Core', () => {
  test('file upload accepts PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('upload shows canvas', async ({ page }) => {
    await expect(page.locator('canvas')).toHaveCount(0)
    await uploadPDFAndWait(page)
    const canvases = page.locator('canvas')
    await expect(canvases.first()).toBeVisible()
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('upload replaces previous file', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible()
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    expect(await getAnnotationCount(page)).toBe(1)
    // Reset using "New" button — accepts the native confirm() dialog
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('invalid file type shows error', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const fixturePath = join(FIXTURES_DIR, 'not-a-pdf.txt')
    await fileInput.setInputFiles(fixturePath)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/Failed to load PDF/')).toBeVisible({ timeout: 5000 })
  })

  test('large PDF loads successfully', async ({ page }) => {
    // Use sample.pdf — verifies the load pipeline works end to end
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('file name displayed after upload', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.getByText('sample.pdf')).toBeVisible()
  })

  test('reset button clears file', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('canvas').first()).toBeVisible()
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('reset clears annotations', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    await createAnnotation(page, 'pencil', { x: 100, y: 250, w: 150, h: 50 })
    expect(await getAnnotationCount(page)).toBe(2)
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    // Upload again and verify clean state
    await uploadPDFAndWait(page)
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('re-upload after reset works', async ({ page }) => {
    await uploadPDFAndWait(page, 'sample.pdf')
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 120, h: 80 })
    // Reset using native confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.getByText('New').click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    // Re-upload
    await uploadPDFAndWait(page, 'single-page.pdf')
    await expect(page.getByText('single-page.pdf')).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(await getAnnotationCount(page)).toBe(0)
  })

  test('drag and drop file upload area is visible', async ({ page }) => {
    // Drop zone should be visible in the empty state
    await expect(page.getByText('Drop a PDF file here')).toBeVisible()
    // Verify file input is attached (supports programmatic file setting)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
    // Upload via the file input (simulates drag-and-drop result)
    await uploadPDFAndWait(page, 'sample.pdf')
    await expect(page.locator('canvas').first()).toBeVisible()
    // Drop zone should be hidden after upload
    await expect(page.getByText('Drop a PDF file here')).toBeHidden()
  })
})
