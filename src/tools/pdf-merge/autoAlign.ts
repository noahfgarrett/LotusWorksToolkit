/**
 * Auto-Align — Smart pixel detection for Grid Stitch
 *
 * Detects overlapping regions between adjacent grid cells by comparing
 * pixel strips at shared edges using Normalized Cross-Correlation (NCC).
 * Pure utility — no React, no dependencies.
 */

import type { GridCellData } from './GridCell.tsx'

/* ── Types ── */

export interface AlignResult {
  dx: number
  dy: number
  confidence: number
}

export interface GridAlignResult {
  /** Map of cellId → { dx, dy } offset adjustments */
  adjustments: Map<string, { dx: number; dy: number }>
  /** Number of pairs successfully aligned */
  alignedCount: number
  /** Number of pairs skipped (low confidence) */
  skippedCount: number
}

type Edge = 'left' | 'right' | 'top' | 'bottom'

/* ── Constants ── */

const STRIP_WIDTH = 40
const CONFIDENCE_THRESHOLD = 0.6

/* ── Pixel extraction ── */

/**
 * Render a cell's visible content onto an offscreen canvas and extract
 * a grayscale pixel strip from the specified edge.
 */
export function extractEdgeStrip(
  cell: GridCellData,
  cellSize: number,
  edge: Edge,
): { pixels: Float32Array; width: number; height: number } | null {
  if (!cell.thumbnail || cell.nativeWidth <= 0 || cell.nativeHeight <= 0) return null

  // Create offscreen canvas at cell display size
  const canvas = document.createElement('canvas')
  canvas.width = cellSize
  canvas.height = cellSize
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  // Load thumbnail image synchronously from data URL
  const img = new Image()
  img.src = cell.thumbnail

  // If image hasn't loaded yet, bail (thumbnails are data URLs so should be sync)
  if (img.width === 0 || img.height === 0) return null

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

  // Draw the image at the computed position
  ctx.drawImage(img, contentLeft, contentTop, displayW, displayH)

  // Extract pixel strip from the specified edge
  let sx: number, sy: number, sw: number, sh: number
  switch (edge) {
    case 'right':
      sx = cellSize - STRIP_WIDTH
      sy = 0
      sw = STRIP_WIDTH
      sh = cellSize
      break
    case 'left':
      sx = 0
      sy = 0
      sw = STRIP_WIDTH
      sh = cellSize
      break
    case 'bottom':
      sx = 0
      sy = cellSize - STRIP_WIDTH
      sw = cellSize
      sh = STRIP_WIDTH
      break
    case 'top':
      sx = 0
      sy = 0
      sw = cellSize
      sh = STRIP_WIDTH
      break
  }

  const imageData = ctx.getImageData(sx, sy, sw, sh)
  const rgba = imageData.data

  // Convert to grayscale (luminance)
  const pixels = new Float32Array(sw * sh)
  for (let i = 0; i < pixels.length; i++) {
    const ri = i * 4
    pixels[i] = 0.299 * rgba[ri] + 0.587 * rgba[ri + 1] + 0.114 * rgba[ri + 2]
  }

  // Clean up
  canvas.width = 0
  canvas.height = 0

  return { pixels, width: sw, height: sh }
}

/* ── Cross-Correlation ── */

/**
 * Compute 1D normalized cross-correlation between two strips,
 * sliding along the specified axis.
 *
 * For horizontal pairs: strips are tall (STRIP_WIDTH × cellSize),
 * we slide vertically to find dy.
 *
 * For vertical pairs: strips are wide (cellSize × STRIP_WIDTH),
 * we slide horizontally to find dx.
 */
function computeNCC(
  stripA: { pixels: Float32Array; width: number; height: number },
  stripB: { pixels: Float32Array; width: number; height: number },
  direction: 'vertical' | 'horizontal',
): AlignResult {
  // Determine slide axis dimensions
  const slideLen = direction === 'vertical' ? stripA.height : stripA.width
  const crossLen = direction === 'vertical' ? stripA.width : stripA.height

  // Search range: ±25% of slide length
  const maxShift = Math.floor(slideLen * 0.25)

  let bestOffset = 0
  let bestScore = -Infinity

  for (let d = -maxShift; d <= maxShift; d++) {
    // Compute overlap region
    const overlapStart = Math.max(0, d)
    const overlapEnd = Math.min(slideLen, slideLen + d)
    const overlapLen = overlapEnd - overlapStart
    if (overlapLen < slideLen * 0.3) continue // Need at least 30% overlap

    const n = overlapLen * crossLen
    if (n === 0) continue

    // Compute means
    let sumA = 0
    let sumB = 0

    for (let s = 0; s < overlapLen; s++) {
      for (let c = 0; c < crossLen; c++) {
        const idxA = direction === 'vertical'
          ? (overlapStart + s - d + d) * stripA.width + c  // map to A's coordinates
          : c * stripA.width + (overlapStart + s - d + d)
        const idxB = direction === 'vertical'
          ? (overlapStart + s) * stripB.width + c
          : c * stripB.width + (overlapStart + s)

        // Simplify: A index is at position (overlapStart + s - d) in slide axis
        const aSlide = overlapStart + s - d
        const bSlide = overlapStart + s

        if (aSlide < 0 || aSlide >= slideLen || bSlide < 0 || bSlide >= slideLen) continue

        const aIdx = direction === 'vertical'
          ? aSlide * stripA.width + c
          : c * stripA.width + aSlide
        const bIdx = direction === 'vertical'
          ? bSlide * stripB.width + c
          : c * stripB.width + bSlide

        sumA += stripA.pixels[aIdx]
        sumB += stripB.pixels[bIdx]
      }
    }

    const meanA = sumA / n
    const meanB = sumB / n

    // Compute NCC
    let num = 0
    let denomA = 0
    let denomB = 0

    for (let s = 0; s < overlapLen; s++) {
      for (let c = 0; c < crossLen; c++) {
        const aSlide = overlapStart + s - d
        const bSlide = overlapStart + s

        if (aSlide < 0 || aSlide >= slideLen || bSlide < 0 || bSlide >= slideLen) continue

        const aIdx = direction === 'vertical'
          ? aSlide * stripA.width + c
          : c * stripA.width + aSlide
        const bIdx = direction === 'vertical'
          ? bSlide * stripB.width + c
          : c * stripB.width + bSlide

        const da = stripA.pixels[aIdx] - meanA
        const db = stripB.pixels[bIdx] - meanB
        num += da * db
        denomA += da * da
        denomB += db * db
      }
    }

    const denom = Math.sqrt(denomA * denomB)
    const score = denom > 0 ? num / denom : 0

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
 * to align with cellA at their shared edge.
 *
 * For horizontal neighbors (A left of B): compare A's right edge with B's left edge
 * For vertical neighbors (A above B): compare A's bottom edge with B's top edge
 */
export function alignPair(
  cellA: GridCellData,
  cellB: GridCellData,
  cellSize: number,
  adjacency: 'horizontal' | 'vertical',
): AlignResult | null {
  if (adjacency === 'horizontal') {
    const stripA = extractEdgeStrip(cellA, cellSize, 'right')
    const stripB = extractEdgeStrip(cellB, cellSize, 'left')
    if (!stripA || !stripB) return null
    return computeNCC(stripA, stripB, 'vertical')
  } else {
    const stripA = extractEdgeStrip(cellA, cellSize, 'bottom')
    const stripB = extractEdgeStrip(cellB, cellSize, 'top')
    if (!stripA || !stripB) return null
    return computeNCC(stripA, stripB, 'horizontal')
  }
}

/* ── Full-grid alignment ── */

/**
 * Align the entire grid starting from an anchor cell.
 * Cascade: align anchor's row first (left/right), then align columns from each row cell.
 */
export function alignGrid(
  cells: GridCellData[],
  rows: number,
  cols: number,
  anchorId: string,
  cellSize: number,
  onProgress?: (current: number, total: number) => void,
): GridAlignResult {
  const adjustments = new Map<string, { dx: number; dy: number }>()
  let alignedCount = 0
  let skippedCount = 0

  // Find anchor position
  const anchorIdx = cells.findIndex(c => c.id === anchorId)
  if (anchorIdx === -1) return { adjustments, alignedCount, skippedCount }

  const anchorRow = Math.floor(anchorIdx / cols)
  const anchorCol = anchorIdx % cols

  // Track which cells have been aligned (anchor starts as aligned)
  const aligned = new Set<string>([anchorId])
  // Track cumulative offsets (anchor = 0,0)
  const cumulativeOffset = new Map<string, { dx: number; dy: number }>()
  cumulativeOffset.set(anchorId, { dx: 0, dy: 0 })

  // Count total pairs for progress
  let totalPairs = 0
  // Horizontal pairs in anchor row
  totalPairs += cols - 1
  // Vertical pairs from each column
  totalPairs += cols * (rows - 1)
  let processed = 0

  // Step 1: Align anchor's row — go left, then right
  const rowOrder: number[] = []
  for (let c = anchorCol - 1; c >= 0; c--) rowOrder.push(c)
  for (let c = anchorCol + 1; c < cols; c++) rowOrder.push(c)

  for (const c of rowOrder) {
    // Determine which neighbor is already aligned
    const isLeft = c < anchorCol
    const neighborCol = isLeft ? c + 1 : c - 1
    const cellIdx = anchorRow * cols + c
    const neighborIdx = anchorRow * cols + neighborCol
    const cell = cells[cellIdx]
    const neighbor = cells[neighborIdx]

    if (!cell.file || !neighbor.file) {
      skippedCount++
      processed++
      onProgress?.(processed, totalPairs)
      continue
    }

    const result = alignPair(
      isLeft ? cell : neighbor,
      isLeft ? neighbor : cell,
      cellSize,
      'horizontal',
    )

    processed++
    onProgress?.(processed, totalPairs)

    if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
      skippedCount++
      // Still mark as "aligned" position-wise so cascade can continue
      const neighborOff = cumulativeOffset.get(neighbor.id) ?? { dx: 0, dy: 0 }
      cumulativeOffset.set(cell.id, { dx: neighborOff.dx, dy: neighborOff.dy })
      aligned.add(cell.id)
      continue
    }

    // Apply offset relative to the aligned neighbor
    const neighborOff = cumulativeOffset.get(neighbor.id) ?? { dx: 0, dy: 0 }

    if (isLeft) {
      // Cell is to the left: neighbor's left edge matched with cell's right edge
      // result.dy is how much to shift neighbor relative to cell
      // But neighbor is already placed, so we shift cell by -dy
      cumulativeOffset.set(cell.id, {
        dx: neighborOff.dx,
        dy: neighborOff.dy - result.dy,
      })
    } else {
      // Cell is to the right: neighbor's right edge matched with cell's left edge
      cumulativeOffset.set(cell.id, {
        dx: neighborOff.dx,
        dy: neighborOff.dy + result.dy,
      })
    }

    aligned.add(cell.id)
    alignedCount++
  }

  // Step 2: For each column position, align up and down from the anchor row
  for (let c = 0; c < cols; c++) {
    const rowCell = cells[anchorRow * cols + c]
    const baseOff = cumulativeOffset.get(rowCell.id) ?? { dx: 0, dy: 0 }

    // Go up from anchor row
    for (let r = anchorRow - 1; r >= 0; r--) {
      const cellIdx = r * cols + c
      const belowIdx = (r + 1) * cols + c
      const cell = cells[cellIdx]
      const below = cells[belowIdx]

      if (!cell.file || !below.file) {
        skippedCount++
        processed++
        onProgress?.(processed, totalPairs)
        const belowOff = cumulativeOffset.get(below.id) ?? baseOff
        cumulativeOffset.set(cell.id, { dx: belowOff.dx, dy: belowOff.dy })
        aligned.add(cell.id)
        continue
      }

      const result = alignPair(cell, below, cellSize, 'vertical')

      processed++
      onProgress?.(processed, totalPairs)

      const belowOff = cumulativeOffset.get(below.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { dx: belowOff.dx, dy: belowOff.dy })
        aligned.add(cell.id)
        continue
      }

      // Cell is above: cell's bottom matched with below's top
      cumulativeOffset.set(cell.id, {
        dx: belowOff.dx - result.dx,
        dy: belowOff.dy,
      })

      aligned.add(cell.id)
      alignedCount++
    }

    // Go down from anchor row
    for (let r = anchorRow + 1; r < rows; r++) {
      const cellIdx = r * cols + c
      const aboveIdx = (r - 1) * cols + c
      const cell = cells[cellIdx]
      const above = cells[aboveIdx]

      if (!cell.file || !above.file) {
        skippedCount++
        processed++
        onProgress?.(processed, totalPairs)
        const aboveOff = cumulativeOffset.get(above.id) ?? baseOff
        cumulativeOffset.set(cell.id, { dx: aboveOff.dx, dy: aboveOff.dy })
        aligned.add(cell.id)
        continue
      }

      const result = alignPair(above, cell, cellSize, 'vertical')

      processed++
      onProgress?.(processed, totalPairs)

      const aboveOff = cumulativeOffset.get(above.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { dx: aboveOff.dx, dy: aboveOff.dy })
        aligned.add(cell.id)
        continue
      }

      // Cell is below: above's bottom matched with cell's top
      cumulativeOffset.set(cell.id, {
        dx: aboveOff.dx + result.dx,
        dy: aboveOff.dy,
      })

      aligned.add(cell.id)
      alignedCount++
    }
  }

  // Convert cumulative offsets to adjustments (delta from current offset)
  for (const [cellId, offset] of cumulativeOffset) {
    if (cellId === anchorId) continue // Anchor doesn't move
    adjustments.set(cellId, offset)
  }

  return { adjustments, alignedCount, skippedCount }
}
