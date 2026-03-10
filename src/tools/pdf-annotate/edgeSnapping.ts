import { type Point } from './types'

// ── Types ──────────────────────────────────────────

interface SnapResult {
  point: Point
  snapped: boolean
  distance: number
}

// ── Constants ──────────────────────────────────────

const DEFAULT_SEARCH_RADIUS = 15
const DEFAULT_REGION_SIZE = 30
const LUMINANCE_THRESHOLD = 80
const MAX_SNAP_DISTANCE = 20

// ── Helpers ────────────────────────────────────────

/** Compute luminance from RGB values using the BT.601 formula. */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Compute the distance between two points. */
function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Build a luminance grid from ImageData for a given region. */
function buildLuminanceGrid(imageData: ImageData): Float64Array {
  const { data, width, height } = imageData
  const grid = new Float64Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    grid[i] = luminance(data[offset], data[offset + 1], data[offset + 2])
  }
  return grid
}

// ── Exported Functions ─────────────────────────────

/**
 * Fast threshold-based edge snap.
 *
 * Samples pixels in a circular region around the click point and detects
 * contrast edges — transitions where luminance changes by more than the
 * threshold between adjacent pixels. Returns the nearest detected edge
 * point in annotation space, or the original click point if no edge is found.
 *
 * Optimised for high-contrast construction drawings (black lines on white).
 */
export function thresholdSnap(
  canvas: HTMLCanvasElement,
  clickPt: Point,
  renderScale: number,
  searchRadius: number = DEFAULT_SEARCH_RADIUS,
): SnapResult {
  const ctx = canvas.getContext('2d')!

  // Convert annotation-space click to canvas-pixel coordinates
  const cx = Math.round(clickPt.x * renderScale)
  const cy = Math.round(clickPt.y * renderScale)

  // Clamp the sampling region to canvas bounds
  const x0 = Math.max(0, cx - searchRadius)
  const y0 = Math.max(0, cy - searchRadius)
  const x1 = Math.min(canvas.width, cx + searchRadius + 1)
  const y1 = Math.min(canvas.height, cy + searchRadius + 1)

  const regionW = x1 - x0
  const regionH = y1 - y0
  if (regionW <= 1 || regionH <= 1) {
    return { point: clickPt, snapped: false, distance: 0 }
  }

  const imageData = ctx.getImageData(x0, y0, regionW, regionH)
  const grid = buildLuminanceGrid(imageData)

  const radiusSq = searchRadius * searchRadius
  let bestDistSq = Infinity
  let bestPx = cx
  let bestPy = cy
  let found = false

  for (let row = 0; row < regionH - 1; row++) {
    for (let col = 0; col < regionW - 1; col++) {
      const px = x0 + col
      const py = y0 + row
      const dx = px - cx
      const dy = py - cy

      // Only consider pixels within the circular search radius
      if (dx * dx + dy * dy > radiusSq) continue

      const idx = row * regionW + col
      const lum = grid[idx]

      // Check horizontal neighbor
      const lumRight = grid[idx + 1]
      const hDiff = Math.abs(lum - lumRight)

      // Check vertical neighbor
      const lumBelow = grid[idx + regionW]
      const vDiff = Math.abs(lum - lumBelow)

      if (hDiff >= LUMINANCE_THRESHOLD || vDiff >= LUMINANCE_THRESHOLD) {
        const dSq = dx * dx + dy * dy
        if (dSq < bestDistSq) {
          bestDistSq = dSq
          // Snap to the darker side of the edge
          if (hDiff >= LUMINANCE_THRESHOLD) {
            bestPx = lum < lumRight ? px : px + 1
            bestPy = py
          }
          if (vDiff >= LUMINANCE_THRESHOLD && vDiff > hDiff) {
            bestPx = px
            bestPy = lum < lumBelow ? py : py + 1
          }
          found = true
        }
      }
    }
  }

  if (!found) {
    return { point: clickPt, snapped: false, distance: 0 }
  }

  const snappedPt: Point = {
    x: bestPx / renderScale,
    y: bestPy / renderScale,
  }
  return {
    point: snappedPt,
    snapped: true,
    distance: dist(clickPt, snappedPt),
  }
}

/**
 * Precision Sobel-based edge snap.
 *
 * Extracts a small region around the click point and applies a Sobel edge
 * detector. Returns the pixel with the highest gradient magnitude as the
 * snap target. More accurate than threshold snapping but slower — intended
 * for use when precision mode is explicitly enabled.
 */
export function precisionSnap(
  canvas: HTMLCanvasElement,
  clickPt: Point,
  renderScale: number,
  regionSize: number = DEFAULT_REGION_SIZE,
): SnapResult {
  const ctx = canvas.getContext('2d')!
  const half = Math.floor(regionSize / 2)

  // Convert annotation-space click to canvas-pixel coordinates
  const cx = Math.round(clickPt.x * renderScale)
  const cy = Math.round(clickPt.y * renderScale)

  // Clamp region to canvas bounds
  const x0 = Math.max(0, cx - half)
  const y0 = Math.max(0, cy - half)
  const x1 = Math.min(canvas.width, cx + half + 1)
  const y1 = Math.min(canvas.height, cy + half + 1)

  const regionW = x1 - x0
  const regionH = y1 - y0
  if (regionW <= 2 || regionH <= 2) {
    return { point: clickPt, snapped: false, distance: 0 }
  }

  const imageData = ctx.getImageData(x0, y0, regionW, regionH)
  const grid = buildLuminanceGrid(imageData)

  // Sobel kernels
  //  Gx:               Gy:
  //  -1  0  +1         -1  -2  -1
  //  -2  0  +2          0   0   0
  //  -1  0  +1         +1  +2  +1

  let maxMag = 0
  let bestPx = cx
  let bestPy = cy

  for (let row = 1; row < regionH - 1; row++) {
    for (let col = 1; col < regionW - 1; col++) {
      const tl = grid[(row - 1) * regionW + (col - 1)]
      const tc = grid[(row - 1) * regionW + col]
      const tr = grid[(row - 1) * regionW + (col + 1)]
      const ml = grid[row * regionW + (col - 1)]
      const mr = grid[row * regionW + (col + 1)]
      const bl = grid[(row + 1) * regionW + (col - 1)]
      const bc = grid[(row + 1) * regionW + col]
      const br = grid[(row + 1) * regionW + (col + 1)]

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
      const mag = Math.sqrt(gx * gx + gy * gy)

      if (mag > maxMag) {
        maxMag = mag
        bestPx = x0 + col
        bestPy = y0 + row
      }
    }
  }

  // A meaningful Sobel edge should have a gradient magnitude well above noise.
  // For 8-bit luminance through a 3x3 Sobel kernel, a strong edge on a
  // construction drawing typically produces magnitudes > 200.
  const SOBEL_MIN_MAGNITUDE = 100
  if (maxMag < SOBEL_MIN_MAGNITUDE) {
    return { point: clickPt, snapped: false, distance: 0 }
  }

  const snappedPt: Point = {
    x: bestPx / renderScale,
    y: bestPy / renderScale,
  }
  return {
    point: snappedPt,
    snapped: true,
    distance: dist(clickPt, snappedPt),
  }
}

/**
 * Check whether a snap result represents a valid, usable edge snap.
 *
 * Returns `true` if snapping found an edge and the snapped point is within
 * the maximum acceptable distance from the original click.
 */
export function isValidSnap(result: SnapResult, maxDistance: number = MAX_SNAP_DISTANCE): boolean {
  return result.snapped && result.distance <= maxDistance
}

/**
 * Main entry point for edge snapping.
 *
 * Delegates to either the fast threshold-based snap or the slower
 * precision Sobel-based snap depending on the `precisionMode` flag.
 * Returns a `SnapResult` containing the snapped point in annotation space,
 * whether an edge was found, and the distance from the original click.
 */
export function snapToEdge(
  canvas: HTMLCanvasElement,
  clickPt: Point,
  renderScale: number,
  precisionMode: boolean,
): SnapResult {
  const result = precisionMode
    ? precisionSnap(canvas, clickPt, renderScale)
    : thresholdSnap(canvas, clickPt, renderScale)

  if (!isValidSnap(result)) {
    return { point: clickPt, snapped: false, distance: 0 }
  }

  return result
}

export type { SnapResult }
