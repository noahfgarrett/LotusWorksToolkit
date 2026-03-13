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

const STRIP_WIDTH = 60
const CONFIDENCE_THRESHOLD = 0.3

/* ── Image loading ── */

function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/* ── Content bounds helper ── */

interface ContentBounds {
  contentLeft: number
  contentTop: number
  displayW: number
  displayH: number
  renderSize: number
}

function computeContentBounds(cell: GridCellData, cellSize: number, renderScale: number): ContentBounds {
  const renderSize = Math.round(cellSize * renderScale)
  const fitScaleX = cellSize / cell.nativeWidth
  const fitScaleY = cellSize / cell.nativeHeight
  const fitScale = Math.min(fitScaleX, fitScaleY)
  const baseW = cell.nativeWidth * fitScale
  const baseH = cell.nativeHeight * fitScale
  const displayW = baseW * cell.scale * renderScale
  const displayH = baseH * cell.scale * renderScale
  const contentLeft = ((cellSize - baseW * cell.scale) / 2 + cell.offsetX) * renderScale
  const contentTop = ((cellSize - baseH * cell.scale) / 2 + cell.offsetY) * renderScale
  return { contentLeft, contentTop, displayW, displayH, renderSize }
}

/* ── Pixel extraction ── */

/**
 * Render a cell's visible content onto an offscreen canvas and extract
 * a grayscale pixel strip from the specified edge of the CONTENT area
 * (not the cell area).
 *
 * Key insight: at default zoom (scale=1, contain-fit), the content is
 * centered with white margins. Extracting from cell edges would yield
 * blank white strips with zero variance → zero NCC confidence. Instead,
 * we extract from where the actual image content is rendered.
 */
export async function extractEdgeStrip(
  cell: GridCellData,
  cellSize: number,
  edge: Edge,
): Promise<{ pixels: Float32Array; width: number; height: number } | null> {
  if (!cell.thumbnail || cell.nativeWidth <= 0 || cell.nativeHeight <= 0) return null
  if (cellSize < STRIP_WIDTH) return null

  const img = await loadImageAsync(cell.thumbnail)

  const renderScale = 2
  const stripPx = Math.round(STRIP_WIDTH * renderScale)
  const bounds = computeContentBounds(cell, cellSize, renderScale)
  const { contentLeft, contentTop, displayW, displayH, renderSize } = bounds

  const canvas = document.createElement('canvas')
  canvas.width = renderSize
  canvas.height = renderSize
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  // White background — construction drawings are on white paper
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, renderSize, renderSize)

  ctx.drawImage(img, contentLeft, contentTop, displayW, displayH)

  // Visible content bounds (clipped to canvas)
  const visLeft = Math.max(0, Math.round(contentLeft))
  const visTop = Math.max(0, Math.round(contentTop))
  const visRight = Math.min(renderSize, Math.round(contentLeft + displayW))
  const visBottom = Math.min(renderSize, Math.round(contentTop + displayH))
  const visW = visRight - visLeft
  const visH = visBottom - visTop

  if (visW < 10 || visH < 10) return null

  // Determine strip region from CONTENT bounds, not cell bounds
  const effectiveStripW = Math.min(stripPx, Math.floor(visW / 2))
  const effectiveStripH = Math.min(stripPx, Math.floor(visH / 2))

  let sx: number, sy: number, sw: number, sh: number
  switch (edge) {
    case 'right':
      sx = visRight - effectiveStripW; sy = visTop; sw = effectiveStripW; sh = visH
      break
    case 'left':
      sx = visLeft; sy = visTop; sw = effectiveStripW; sh = visH
      break
    case 'bottom':
      sx = visLeft; sy = visBottom - effectiveStripH; sw = visW; sh = effectiveStripH
      break
    case 'top':
      sx = visLeft; sy = visTop; sw = visW; sh = effectiveStripH
      break
  }

  if (sw < 4 || sh < 4) return null

  const imageData = ctx.getImageData(sx, sy, sw, sh)
  const rgba = imageData.data

  // Convert to grayscale
  const pixels = new Float32Array(sw * sh)
  for (let i = 0; i < pixels.length; i++) {
    const ri = i * 4
    pixels[i] = 0.299 * rgba[ri] + 0.587 * rgba[ri + 1] + 0.114 * rgba[ri + 2]
  }

  // Check variance — skip if strip is uniform (all white or all one color)
  let min = 255, max = 0
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] < min) min = pixels[i]
    if (pixels[i] > max) max = pixels[i]
  }

  if (DEBUG) {
    console.log(`[auto-align] Strip ${edge} for "${cell.label}": ${sw}×${sh}px, range=[${min.toFixed(0)}, ${max.toFixed(0)}], vis=[${visLeft},${visTop},${visRight},${visBottom}]`)
  }

  canvas.width = 0
  canvas.height = 0

  // If the strip has no variance at all, it's blank — skip it
  if (max - min < 2) return null

  return { pixels, width: sw, height: sh }
}

/* ── Debug flag ── */

const DEBUG = false

/* ── Cross-Correlation ── */

/**
 * 2D NCC between two strips, sliding along one axis.
 *
 * Handles strips of different sizes — uses the minimum dimension
 * for the non-slide axis and slides along the other.
 */
function findBestShift(
  stripA: { pixels: Float32Array; width: number; height: number },
  stripB: { pixels: Float32Array; width: number; height: number },
  direction: 'vertical' | 'horizontal',
): AlignResult {
  // Use minimum dimensions for the shared axis
  const sharedW = Math.min(stripA.width, stripB.width)
  const sharedH = Math.min(stripA.height, stripB.height)

  const slideLen = direction === 'vertical' ? sharedH : sharedW
  const fixedLen = direction === 'vertical' ? sharedW : sharedH
  const maxShift = Math.floor(slideLen * 0.3)
  const minOverlap = Math.max(20, Math.floor(slideLen * 0.2))

  let bestOffset = 0
  let bestScore = -Infinity

  for (let d = -maxShift; d <= maxShift; d++) {
    const aStart = Math.max(0, d)
    const bStart = Math.max(0, -d)
    const overlapLen = Math.min(slideLen - aStart, slideLen - bStart)
    if (overlapLen < minOverlap) continue

    const overlapW = direction === 'vertical' ? fixedLen : overlapLen
    const overlapH = direction === 'vertical' ? overlapLen : fixedLen
    const n = overlapW * overlapH
    if (n < 100) continue

    // Compute means
    let sumA = 0, sumB = 0
    for (let row = 0; row < overlapH; row++) {
      for (let col = 0; col < overlapW; col++) {
        let aRow: number, aCol: number, bRow: number, bCol: number
        if (direction === 'vertical') {
          aRow = aStart + row; aCol = col
          bRow = bStart + row; bCol = col
        } else {
          aRow = row; aCol = aStart + col
          bRow = row; bCol = bStart + col
        }
        sumA += stripA.pixels[aRow * stripA.width + aCol]
        sumB += stripB.pixels[bRow * stripB.width + bCol]
      }
    }

    const meanA = sumA / n
    const meanB = sumB / n

    // Compute NCC
    let num = 0, denomA2 = 0, denomB2 = 0
    for (let row = 0; row < overlapH; row++) {
      for (let col = 0; col < overlapW; col++) {
        let aRow: number, aCol: number, bRow: number, bCol: number
        if (direction === 'vertical') {
          aRow = aStart + row; aCol = col
          bRow = bStart + row; bCol = col
        } else {
          aRow = row; aCol = aStart + col
          bRow = row; bCol = bStart + col
        }
        const da = stripA.pixels[aRow * stripA.width + aCol] - meanA
        const db = stripB.pixels[bRow * stripB.width + bCol] - meanB
        num += da * db
        denomA2 += da * da
        denomB2 += db * db
      }
    }

    const denom = Math.sqrt(denomA2 * denomB2)
    const score = denom > 1e-6 ? num / denom : 0

    if (score > bestScore) {
      bestScore = score
      bestOffset = d
    }
  }

  // Convert back from render-scale pixels to display pixels
  const displayOffset = Math.round(bestOffset / 2)

  if (DEBUG) {
    console.log(`[auto-align] NCC ${direction}: bestOffset=${bestOffset} (display=${displayOffset}), confidence=${bestScore.toFixed(4)}`)
  }

  return {
    dx: direction === 'horizontal' ? displayOffset : 0,
    dy: direction === 'vertical' ? displayOffset : 0,
    confidence: Math.max(0, bestScore),
  }
}

/* ── Pair alignment ── */

export async function alignPair(
  cellA: GridCellData,
  cellB: GridCellData,
  cellSize: number,
  adjacency: 'horizontal' | 'vertical',
): Promise<AlignResult | null> {
  if (DEBUG) {
    console.log(`[auto-align] Aligning pair: ${cellA.label} ↔ ${cellB.label} (${adjacency}), cellSize=${cellSize}`)
  }

  if (adjacency === 'horizontal') {
    const stripA = await extractEdgeStrip(cellA, cellSize, 'right')
    const stripB = await extractEdgeStrip(cellB, cellSize, 'left')
    if (!stripA || !stripB) {
      if (DEBUG) console.log('[auto-align] Failed to extract strips (null or no variance)')
      return null
    }
    return findBestShift(stripA, stripB, 'vertical')
  } else {
    const stripA = await extractEdgeStrip(cellA, cellSize, 'bottom')
    const stripB = await extractEdgeStrip(cellB, cellSize, 'top')
    if (!stripA || !stripB) {
      if (DEBUG) console.log('[auto-align] Failed to extract strips (null or no variance)')
      return null
    }
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

  if (DEBUG) {
    console.log(`[auto-align] Grid align: ${rows}×${cols}, anchor=${cells[anchorIdx].label} (row=${anchorRow}, col=${anchorCol}), cellSize=${cellSize}`)
  }

  const cumulativeOffset = new Map<string, { dx: number; dy: number }>()
  cumulativeOffset.set(anchorId, { dx: 0, dy: 0 })

  const totalPairs = (cols - 1) + cols * (rows - 1)
  let processed = 0

  // Step 1: Align anchor's row
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
      cumulativeOffset.set(cell.id, { dx: nOff.dx, dy: nOff.dy - result.dy })
    } else {
      cumulativeOffset.set(cell.id, { dx: nOff.dx, dy: nOff.dy + result.dy })
    }
    alignedCount++
  }

  // Step 2: Align columns from anchor row
  for (let c = 0; c < cols; c++) {
    const rowCellId = cells[anchorRow * cols + c].id
    const baseOff = cumulativeOffset.get(rowCellId) ?? { dx: 0, dy: 0 }

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

      const result = await alignPair(cell, below, cellSize, 'vertical')
      const bOff = cumulativeOffset.get(below.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { ...bOff })
        continue
      }

      cumulativeOffset.set(cell.id, { dx: bOff.dx - result.dx, dy: bOff.dy })
      alignedCount++
    }

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

      const result = await alignPair(above, cell, cellSize, 'vertical')
      const aOff = cumulativeOffset.get(above.id) ?? baseOff

      if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
        skippedCount++
        cumulativeOffset.set(cell.id, { ...aOff })
        continue
      }

      cumulativeOffset.set(cell.id, { dx: aOff.dx + result.dx, dy: aOff.dy })
      alignedCount++
    }
  }

  for (const [cellId, offset] of cumulativeOffset) {
    if (cellId === anchorId) continue
    adjustments.set(cellId, offset)
  }

  if (DEBUG) {
    console.log(`[auto-align] Done: ${alignedCount} aligned, ${skippedCount} skipped`)
  }

  return { adjustments, alignedCount, skippedCount }
}
