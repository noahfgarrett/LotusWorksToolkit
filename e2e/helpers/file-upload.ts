import { type Page, expect } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '..', 'fixtures')

/** Upload a file to a FileDropZone (targets hidden input[type=file]) */
export async function uploadFile(page: Page, fileName: string) {
  const filePath = join(FIXTURES_DIR, fileName)
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(filePath)
}

/** Upload multiple files */
export async function uploadFiles(page: Page, fileNames: string[]) {
  const filePaths = fileNames.map(f => join(FIXTURES_DIR, f))
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(filePaths)
}

/** Get the fixture file path */
export function fixturePath(fileName: string): string {
  return join(FIXTURES_DIR, fileName)
}
