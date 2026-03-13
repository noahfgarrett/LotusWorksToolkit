/**
 * Auto-Align — Smart pixel detection for Grid Stitch
 *
 * Detects overlapping regions between adjacent grid cells by comparing
 * pixel strips at shared edges using Normalized Cross-Correlation (NCC).
 * Pure utility — no React, no dependencies beyond Canvas API.
 */

import type { GridCellData } from './GridCell.tsx'

/* ── Types ── */

export interface AlignResult {
  dx: number
  dy: number
  confidence: number
}

export interface GridAlignResult {
  adjustments: Map<string, { dx: number; dy: number }>
  alignedCount: number
  skippedCount: number
}

type Edge = 'left' | 'right' | 'top' | 'bottom'

/* ── Constants ── */

const STRIP_WIDTH = 80
const CONFIDENCE_THRESHOLD = 0.4

/* ── Image loading ── */

/** Load an image from a data URL, waiting for it to fully decode. */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/* ── Pixel extraction ── */

/**
 * Render a cell's visible content onto an offscreen canvas and extract
 * a grayscale pixel strip from the specified edge.
 */
export async function extractEdgeStrip(
  cell: GridCellData,
  cellSize: number,
  edge: Edge,
): Promise<{ pixels: Float32Array; width: number; height: number } | null> {
  if (!cell.thumbnail || cell.nativeWidth <= 0 || cell.nativeHeight <= 0) return null
  if (cellSize < STRIP_WIDTH) return null

  const img = await loadImageAsync(cell.thumbnail)

  const canvas = document.createElement('canvas')
  canvas.width = cellSize
  canvas.height = cellSize
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  // Replicate the same contain-fit + zoom + offset math as GridCell
  const fitScaleX = cellSize / cell.nativeWidth
  const fitScaleY = cellSize / cell.nativeHeight
  const fitScale = Math.min(fitScaleX, fitScaleY)
  const baseW = cell.nativeWidth * fitScale
  const baseH = cell.nativeHeight * fitScale
  const displayW = baseW * cell.scale
  const displayH = baseH * cell.scale
  const contentLeft = (cellSize - displayW) / 2 + cell.offsetX
  const contentTop = (cellSize - displayH) / 2 + cell.offsetY

  ctx.drawImage(img, contentLeft, contentTop, displayW, displayH)

  // Determine strip region
  let sx: number, sy: number, sw: number, sh: number
  switch (edge) {
    case 'right':
      sx = cellSize - STRIP_WIDTH; sy = 0; sw = STRIP_WIDTH; sh = cellSize
      break
    case 'left':
      sx = 0; sy = 0; sw = STRIP_WIDTH; sh = cellSize
      break
    case 'bottom':
      sx = 0; sy = cellSize - STRIP_WIDTH; sw = cellSize; sh = STRIP_WIDTH
      break
    case 'top':
      sx = 0; sy = 0; sw = cellSize; sh = STRIP_WIDTH
      break
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh)
  const rgba = imageData.data

  // Convert to grayscale
  const pixels = new Float32Array(sw * sh)
  for (let i = 0; i < pixels.length; i++) {
    const ri = i * 4
    pixels[i] = 0.299 * rgba[ri] + 0.587 * rgba[ri + 1] + 0.114 * rgba[ri + 2]
  }

  canvas.width = 0
  canvas.height = 0

  return { pixels, width: sw, height: sh }
}

/* ── Cross-Correlation ── */

/**
 * Compute NCC between two 1D grayscale arrays of the same length.
 * Returns correlation coefficient (-1 to 1).
 */
function ncc1d(a: Float32Array, b: Float32Array, len: number): number {
  let sumA = 0, sumB = 0
  for (let i = 0; i < len; i++) { sumA += a[i]; sumB += b[i] }
  const meanA = sumA / len
  const meanB = sumB / len

  let num = 0, denomA = 0, denomB = 0
  for (let i = 0; i < len; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    num += da * db
    denomA += da * da
    denomB += db * db
  }

  const denom = Math.sqrt(denomA * denomB)
  return denom > 1e-6 ? num / denom : 0
}

/**
 * For a horizontal pair (A's right edge, B's left edge):
 *   - Strips are STRIP_WIDTH wide × cellSize tall
 *   - We slide B's strip vertically (dy) relative to A's strip
 *   - At each dy, we collapse both strips to 1D by averaging across the STRIP_WIDTH
 *     columns, then compute NCC on the overlapping rows
 *
 * For a vertical pair (A's bottom edge, B's top edge):
 *   - Strips are cellSize wide × STRIP_WIDTH tall
 *   - We slide B's strip horizontally (dx)
 *   - Collapse rows, NCC on overlapping columns
 */
function findBestShift(
  stripA: { pixels: Float32Array; width: number; height: number },
  stripB: { pixels: Float32Array; width: number; height: number },
  direction: 'vertical' | 'horizontal',
): AlignResult {
  // For vertical sliding: slideLen = height, crossLen = width
  // For horizontal sliding: slideLen = width, crossLen = height
  const slideLen = direction === 'vertical' ? stripA.height : stripA.width
  const crossLen = direction === 'vertical' ? stripA.width : stripA.height

  // Collapse each strip along the cross axis → 1D profile of length slideLen
  const profileA = new Float32Array(slideLen)
  const profileB = new Float32Array(slideLen)

  for (let s = 0; s < slideLen; s++) {
    let sumA = 0, sumB = 0
    for (let c = 0; c < crossLen; c++) {
      // pixel index = row * width + col
      const idx = direction === 'vertical'
        ? s * stripA.width + c   // s = row, c = col
        : c * stripA.width + s   // c = row, s = col
      sumA += stripA.pixels[idx]
      sumB += stripB.pixels[idx]
    }
    profileA[s] = sumA / crossLen
    profileB[s] = sumB / crossLen
  }

  // Search range: ±30% of slide length
  const maxShift = Math.floor(slideLen * 0.3)
  const minOverlap = Math.floor(slideLen * 0.4)

  let bestOffset = 0
  let bestScore = -Infinity

  for (let d = -maxShift; d <= maxShift; d++) {
    // Overlap region in profileA: [aStart, aEnd)
    // Overlap region in profileB: [bStart, bEnd)
    const aStart = Math.max(0, d)
    const bStart = Math.max(0, -d)
    const overlapLen = Math.min(slideLen - aStart, slideLen - bStart)

    if (overlapLen < minOverlap) continue

    // Extract overlapping segments
    const segA = profileA.subarray(aStart, aStart + overlapLen)
    const segB = profileB.subarray(bStart, bStart + overlapLen)

    const score = ncc1d(segA, segB, overlapLen)

    if (score > bestScore) {
      bestScore = score
      bestOffset = d
    }
  }

  // Also try full 2D NCC at the best 1D offset for refinement
  // (the 1D profile gives the coarse shift; we verify with 2D)
  const refined = refine2D(stripA, stripB, direction, bestOffset, 3)
  if (refined.confidence > bestScore) {
    return refined
  }

  return {
    dx: direction === 'horizontal' ? bestOffset : 0,
    dy: direction === 'vertical' ? bestOffset : 0,
    confidence: Math.max(0, bestScore),
  }
}

/**
 * Refine a coarse 1D offset by doing full 2D NCC in a small window around it.
 */
function refine2D(
  stripA: { pixels: Float32Array; width: number; height: number },
  stripB: { pixels: Float32Array; width: number; height: number },
  direction: 'vertical' | 'horizontal',
  coarseOffset: number,
  radius: number,
): AlignResult {
  const slideLen = direction === 'vertical' ? stripA.height : stripA.width
  const crossLen = direction === 'vertical' ? stripA.width : stripA.height
  const minOverlap = Math.floor(slideLen * 0.4)

  let bestOffset = coarseOffset
  let bestScore = -Infinity

  for (let d = coarseOffset - radius; d <= coarseOffset + radius; d++) {
    const aStart = Math.max(0, d)
    const bStart = Math.max(0, -d)
    const overlapLen = Math.min(slideLen - aStart, slideLen - bStart)
    if (overlapLen < minOverlap) continue

    const n = overlapLen * crossLen

    // Compute means
    let sumA = 0, sumB = 0
    for (let s = 0; s < overlapLen; s++) {
      for (let c = 0; c < crossLen; c++) {
        const aIdx = direction === 'vertical'
          ? (aStart + s) * stripA.width + c
          : c * stripA.width + (aStart + s)
        const bIdx = direction === 'vertical'
          ? (bStart + s) * stripB.width + c
          : c * stripB.width + (bStart + s)
        sumA += stripA.pixels[aIdx]
        sumB += stripB.pixels[bIdx]
      }
    }

    const meanA = sumA / n
    const meanB = sumB / n

    // Compute NCC
    let num = 0, denomA = 0, denomB = 0
    for (let s = 0; s < overlapLen; s++) {
      for (let c = 0; c < crossLen; c++) {
        const aIdx = direction === 'vertical'
          ? (aStart + s) * stripA.width + c
          : c * stripA.width + (aStart + s)
        const bIdx = direction === 'vertical'
          ? (bStart + s) * stripB.width + c
          : c * stripB.width + (bStart + s)
        const da = stripA.pixels[aIdx] - meanA
        const db = stripB.pixels[bIdx] - meanB
        num += da * db
        denomA += da * da
        denomB += db * db
      }
    }

    const denom = Math.sqrt(denomA * denomB)
    const score = denom > 1e-6 ? num / denom : 0

    if (score > bestScore) {
      bestScore = score
      bestOffset = d
    }
  }

  return {
    dx: direction === 'horizontal' ? bestOffset : 0,
    dy: direction === 'vertical' ? bestOffset : 0,
    confidence: Math.max(0, bestScore),
  }
}

/* ── Pair alignment ── */

/**
 * Align two adjacent cells. Returns the offset adjustment for cellB
 * relative to cellA at their shared edge.
 */
export async function alignPair(
  cellA: GridCellData,
  cellB: GridCellData,
  cellSize: number,
  adjacency: 'horizontal' | 'vertical',
): Promise<AlignResult | null> {
  if (adjacency === 'horizontal') {
    const stripA = await extractEdgeStrip(cellA, cellSize, 'right')
    const stripB = await extractEdgeStrip(cellB, cellSize, 'left')
    if (!stripA || !stripB) return null
    return findBestShift(stripA, stripB, 'vertical')
  } else {
    const stripA = await extractEdgeStrip(cellA, cellSize, 'bottom')
    const stripB = await extractEdgeStrip(cellB, cellSize, 'top')
    if (!stripA || !stripB) return null
    return findBestShift(stripA, stripB, 'horizontal')
  }
}

/* ── Full-grid alignment ── */

export async function alignGrid(
  cells: GridCellData[],
  rows: number,
  cols: number,
  anchorId: string,
  cellSize: number,
  onProgress?: (current: number, total: number) => void,
): Promise<GridAlignResult> {
  const adjustments = new Map<string, { dx: number; dy: number }>()
  let alignedCount = 0
  let skippedCount = 0

  const anchorIdx = cells.findIndex(c => c.id === anchorId)
  if (anchorIdx === -1) return { adjustments, alignedCount, skippedCount }

  const anchorRow = Math.floor(anchorIdx / cols)
  const anchorCol = anchorIdx % cols

  const cumulativeOffset = new Map<string, { dx: number; dy: number }>()
  cumulativeOffset.set(anchorId, { dx: 0, dy: 0 })

  const totalPairs = (cols - 1) + cols * (rows - 1)
  let processed = 0

  // Step 1: Align anchor's row — left then right
  const rowOrder: number[] = []
  for (let c = anchorCol - 1; c >= 0; c--) rowOrder.push(c)
  for (let c = anchorCol + 1; c < cols; c++) rowOrder.push(c)

  for (const c of rowOrder) {
    const isLeft = c < anchorCol
    const neighborCol = isLeft ? c + 1 : c - 1
    const cell = cells[anchorRow * cols + c]
    const neighbor = cells[anchorRow * cols + neighborCol]

    processed++
    onProgress?.(processed, totalPairs)

    if (!cell.file || !neighbor.file) {
      skippedCount++
      const nOff = cumulativeOffset.get(neighbor.id) ?? { dx: 0, dy: 0 }
      cumulativeOffset.set(cell.id, { ...nOff })
      continue
    }

    // Always pass left cell as A, right cell as B
    const [leftCell, rightCell] = isLeft ? [cell, neighbor] : [neighbor, cell]
    const result = await alignPair(leftCell, rightCell, cellSize, 'horizontal')

    if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
      skippedCount++
      const nOff = cumulativeOffset.get(neighbor.id) ?? { dx: 0, dy: 0 }
      cumulativeOffset.set(cell.id, { ...nOff })
      continue
    }

    const nOff = cumulativeOffset.get(neighbor.id) ?? { dx: 0, dy: 0 }
    if (isLeft) {
      // Cell is left of neighbor. result.dy shifts right cell relative to left.
      // Neighbor (right) is already placed, cell (left) adjusts by -dy.
      cumulativeOffset.set(cell.id, { dx: nOff.dx, dy: nOff.dy - result.dy })
    } else {
      // Cell is right of neighbor. result.dy shifts right cell relative to left.
      cumulativeOffset.set(cell.id, { dx: nOff.dx, dy: nOff.dy + result.dy })
    }
    alignedCount++
  }

  // Step 2: For each column, align up and down from anchor row
  for (let c = 0; c < cols; c++) {
    const rowCellId = cells[anchorRow * cols + c].id
    const baseOff = cumulativeOffset.get(rowCellId) ?? { dx: 0, dy: 0 }

    // Go up
    for (let r = anchorRow - 1; r >= 0; r--) {
      const cell = cells[r * cols + c]
      const below = cells[(r + 1) * cols + c]

      processed++
      onProgress?.(processed, totalPairs)

      if (!cell.file || !below.file) {
        skippedCount++
        const bOff = cumulativeOffset.get(below.id) ?? baseOff
        cumulativeOffset.set(cell.id, { ...bOff })
        continue
      }

      // cell is above, below is below — pass top cell as A, bottom cell as B
      const result = await alignPair(cell, below, cellSize, 'vertical')
      const bOff = cumulativeOffset.get(below.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { ...bOff })
        continue
      }

      // result.dx shifts bottom cell relative to top. Cell (top) adjusts by -dx.
      cumulativeOffset.set(cell.id, { dx: bOff.dx - result.dx, dy: bOff.dy })
      alignedCount++
    }

    // Go down
    for (let r = anchorRow + 1; r < rows; r++) {
      const cell = cells[r * cols + c]
      const above = cells[(r - 1) * cols + c]

      processed++
      onProgress?.(processed, totalPairs)

      if (!cell.file || !above.file) {
        skippedCount++
        const aOff = cumulativeOffset.get(above.id) ?? baseOff
        cumulativeOffset.set(cell.id, { ...aOff })
        continue
      }

      // above is top, cell is bottom
      const result = await alignPair(above, cell, cellSize, 'vertical')
      const aOff = cumulativeOffset.get(above.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { ...aOff })
        continue
      }

      // result.dx shifts bottom cell relative to top. Cell (bottom) adjusts by +dx.
      cumulativeOffset.set(cell.id, { dx: aOff.dx + result.dx, dy: aOff.dy })
      alignedCount++
    }
  }

  // Build adjustments
  for (const [cellId, offset] of cumulativeOffset) {
    if (cellId === anchorId) continue
    adjustments.set(cellId, offset)
  }

  return { adjustments, alignedCount, skippedCount }
}
