import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname)

export default async function globalSetup() {
  if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true })

  // Generate sample PDF (2 pages with text)
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const page1 = pdfDoc.addPage([612, 792])
  page1.drawText('Test PDF - Page 1', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) })
  page1.drawText('This is a test document for E2E testing.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) })
  page1.drawRectangle({ x: 50, y: 400, width: 200, height: 100, borderColor: rgb(0, 0, 0), borderWidth: 1 })

  const page2 = pdfDoc.addPage([612, 792])
  page2.drawText('Test PDF - Page 2', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) })
  page2.drawText('Second page of the test document.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) })

  const pdfBytes = await pdfDoc.save()
  writeFileSync(join(FIXTURES_DIR, 'sample.pdf'), Buffer.from(pdfBytes))

  // Generate single-page PDF
  const singleDoc = await PDFDocument.create()
  const singleFont = await singleDoc.embedFont(StandardFonts.Helvetica)
  const singlePage = singleDoc.addPage([612, 792])
  singlePage.drawText('Single Page PDF', { x: 50, y: 700, size: 24, font: singleFont, color: rgb(0, 0, 0) })
  const singleBytes = await singleDoc.save()
  writeFileSync(join(FIXTURES_DIR, 'single-page.pdf'), Buffer.from(singleBytes))

  // Generate sample CSV
  const csv = `Name,Age,Department,Salary
John Doe,32,Engineering,95000
Jane Smith,28,Marketing,72000
Bob Wilson,45,Sales,88000
Alice Brown,35,Engineering,102000
Charlie Davis,41,Marketing,78000`
  writeFileSync(join(FIXTURES_DIR, 'sample.csv'), csv)

  // Generate sample JSON
  const json = JSON.stringify({
    employees: [
      { name: 'John Doe', age: 32, department: 'Engineering' },
      { name: 'Jane Smith', age: 28, department: 'Marketing' },
      { name: 'Bob Wilson', age: 45, department: 'Sales' },
    ],
    metadata: { total: 3, generated: new Date().toISOString() },
  }, null, 2)
  writeFileSync(join(FIXTURES_DIR, 'sample.json'), json)

  // Generate a minimal PNG (1x1 orange pixel)
  // PNG file format: signature + IHDR + IDAT + IEND
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  // Create a simple 100x100 orange PNG using minimal encoding
  const width = 100, height = 100
  const ihdr = createIHDRChunk(width, height)
  const idat = createIDATChunk(width, height, [0xF4, 0x7B, 0x20]) // orange
  const iend = createIENDChunk()
  const png = Buffer.concat([pngSignature, ihdr, idat, iend])
  writeFileSync(join(FIXTURES_DIR, 'sample-image.png'), png)

  // Generate zero-byte file for chaos testing
  writeFileSync(join(FIXTURES_DIR, 'zero-byte.pdf'), Buffer.alloc(0))

  // Generate a text file (wrong type for PDF upload)
  writeFileSync(join(FIXTURES_DIR, 'not-a-pdf.txt'), 'This is not a PDF file')
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type)
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function createIHDRChunk(width: number, height: number): Buffer {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = 8  // bit depth
  data[9] = 2  // color type (RGB)
  data[10] = 0 // compression
  data[11] = 0 // filter
  data[12] = 0 // interlace
  return createChunk('IHDR', data)
}

function createIDATChunk(width: number, height: number, rgb: number[]): Buffer {
  // Raw image data: each row starts with filter byte 0 (none) + RGB pixels
  const rowSize = 1 + width * 3
  const rawData = Buffer.alloc(rowSize * height)
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0 // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3
      rawData[offset] = rgb[0]
      rawData[offset + 1] = rgb[1]
      rawData[offset + 2] = rgb[2]
    }
  }
  // Use zlib to compress
  const compressed = deflateSync(rawData)
  return createChunk('IDAT', compressed)
}

function createIENDChunk(): Buffer {
  return createChunk('IEND', Buffer.alloc(0))
}

// Allow running directly
globalSetup().then(() => console.log('Fixtures generated'))
