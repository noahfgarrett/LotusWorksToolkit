import type { Point, StickyNote, CommentThread } from './types'
import { COMMENT_STATUS_COLORS } from './types'

// ── Constants ──────────────────────────────────────────

const PIN_RADIUS = 8          // circle radius at scale 1 (16px diameter)
const PIN_TRIANGLE_H = 6     // triangle point height below circle
const PIN_HIT_PADDING = 4    // extra padding for hit testing
const CARD_W = 120           // expanded card width at scale 1
const CARD_H = 80            // expanded card height at scale 1
const CARD_OFFSET_Y = -10    // card offset above pin point
const FOLD_SIZE = 10         // corner fold size at scale 1
const BADGE_RADIUS = 7       // comment count badge radius
const STATUS_DOT_RADIUS = 2  // status indicator dot radius

// ── Helpers ────────────────────────────────────────────

/** Darken a hex color by a factor (0–1, where 0 = black). */
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.round(r * factor)
  const dg = Math.round(g * factor)
  const db = Math.round(b * factor)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

/** Convert a hex color to rgba string. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Public API ─────────────────────────────────────────

/**
 * Draw a sticky note pin icon at the note's position.
 * Pin design: colored circle with a triangular point at the bottom.
 */
export function drawStickyNotePin(
  ctx: CanvasRenderingContext2D,
  note: StickyNote,
  scale: number,
  isSelected: boolean,
  thread?: CommentThread,
): void {
  const cx = note.point.x * scale
  const cy = note.point.y * scale
  const r = PIN_RADIUS * scale
  const triH = PIN_TRIANGLE_H * scale

  ctx.save()

  // Glow effect when selected
  if (isSelected) {
    ctx.shadowColor = note.color
    ctx.shadowBlur = 12 * scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // Draw pin shape: circle + triangle point
  const strokeColor = darkenColor(note.color, 0.6)

  // Circle
  ctx.beginPath()
  ctx.arc(cx, cy - triH, r, 0, Math.PI * 2)
  ctx.fillStyle = note.color
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1.5 * scale
  ctx.stroke()

  // Reset shadow before triangle so it doesn't double-glow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Triangle point below circle
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.4, cy - triH + r * 0.6)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx + r * 0.4, cy - triH + r * 0.6)
  ctx.closePath()
  ctx.fillStyle = note.color
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1.5 * scale
  ctx.stroke()

  // Comment count badge (top-right of circle)
  if (thread && thread.comments.length > 0) {
    const badgeR = BADGE_RADIUS * scale
    const badgeX = cx + r * 0.7
    const badgeY = cy - triH - r * 0.7

    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fillStyle = '#1F2937'
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold ${Math.round(9 * scale)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(thread.comments.length), badgeX, badgeY)
  }

  // Status dot (bottom-left of pin circle)
  if (thread) {
    const dotR = STATUS_DOT_RADIUS * scale
    const dotX = cx - r * 0.7
    const dotY = cy - triH + r * 0.7

    ctx.beginPath()
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = COMMENT_STATUS_COLORS[thread.status]
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draw an expanded sticky note card when the note is not minimized.
 * Card is anchored at the note's point, offset upward and to the right.
 */
export function drawStickyNoteExpanded(
  ctx: CanvasRenderingContext2D,
  note: StickyNote,
  scale: number,
): void {
  const x = note.point.x * scale
  const y = note.point.y * scale
  const w = CARD_W * scale
  const h = CARD_H * scale
  const fold = FOLD_SIZE * scale
  const offsetY = CARD_OFFSET_Y * scale

  // Card top-left corner
  const cardX = x
  const cardY = y + offsetY - h

  ctx.save()

  // Card body with fold cutout in top-right
  ctx.beginPath()
  ctx.moveTo(cardX, cardY)
  ctx.lineTo(cardX + w - fold, cardY)
  ctx.lineTo(cardX + w, cardY + fold)
  ctx.lineTo(cardX + w, cardY + h)
  ctx.lineTo(cardX, cardY + h)
  ctx.closePath()

  ctx.fillStyle = hexToRgba(note.color, 0.9)
  ctx.fill()

  const strokeColor = darkenColor(note.color, 0.6)
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1 * scale
  ctx.stroke()

  // Fold triangle effect
  ctx.beginPath()
  ctx.moveTo(cardX + w - fold, cardY)
  ctx.lineTo(cardX + w - fold, cardY + fold)
  ctx.lineTo(cardX + w, cardY + fold)
  ctx.closePath()
  ctx.fillStyle = darkenColor(note.color, 0.75)
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 0.5 * scale
  ctx.stroke()

  // Text content (truncated to fit)
  if (note.text) {
    const padding = 6 * scale
    const fontSize = Math.round(10 * scale)
    const maxTextW = w - padding * 2
    const maxTextH = h - padding * 2
    const lineH = fontSize * 1.3

    ctx.fillStyle = '#1F2937'
    ctx.font = `${fontSize}px Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Word-wrap and truncate
    const words = note.text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    const maxLines = Math.floor(maxTextH / lineH)

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const measured = ctx.measureText(testLine)
      if (measured.width > maxTextW && currentLine) {
        lines.push(currentLine)
        currentLine = word
        if (lines.length >= maxLines) break
      } else {
        currentLine = testLine
      }
    }
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine)
    }

    // If truncated, add ellipsis to last visible line
    if (lines.length === maxLines && words.length > 0) {
      const lastLine = lines[lines.length - 1]
      if (lastLine) {
        const ellipsis = lastLine + '...'
        if (ctx.measureText(ellipsis).width <= maxTextW) {
          lines[lines.length - 1] = ellipsis
        } else {
          // Trim last line to fit with ellipsis
          let trimmed = lastLine
          while (trimmed.length > 0 && ctx.measureText(trimmed + '...').width > maxTextW) {
            trimmed = trimmed.slice(0, -1)
          }
          lines[lines.length - 1] = trimmed + '...'
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cardX + padding, cardY + padding + i * lineH)
    }
  }

  ctx.restore()
}

/**
 * Hit-test whether a click point falls within a sticky note's clickable area.
 * Checks the pin circle (with padding) and, if not minimized, the expanded card.
 */
export function hitTestStickyNote(
  clickPoint: Point,
  note: StickyNote,
  scale: number,
): boolean {
  const cx = note.point.x * scale
  const cy = note.point.y * scale
  const r = PIN_RADIUS * scale
  const triH = PIN_TRIANGLE_H * scale
  const pad = PIN_HIT_PADDING * scale

  // Check pin circle area (centered above the point)
  const dx = clickPoint.x - cx
  const dy = clickPoint.y - (cy - triH)
  const distSq = dx * dx + dy * dy
  const hitRadius = r + pad
  if (distSq <= hitRadius * hitRadius) {
    return true
  }

  // Check triangle area (rough bounding box)
  if (
    clickPoint.x >= cx - r * 0.4 - pad &&
    clickPoint.x <= cx + r * 0.4 + pad &&
    clickPoint.y >= cy - triH + r * 0.6 - pad &&
    clickPoint.y <= cy + pad
  ) {
    return true
  }

  // Check expanded card if not minimized
  if (!note.minimized) {
    const w = CARD_W * scale
    const h = CARD_H * scale
    const offsetY = CARD_OFFSET_Y * scale
    const cardX = cx
    const cardY = cy + offsetY - h

    if (
      clickPoint.x >= cardX &&
      clickPoint.x <= cardX + w &&
      clickPoint.y >= cardY &&
      clickPoint.y <= cardY + h
    ) {
      return true
    }
  }

  return false
}

/**
 * Get the bounding box of a sticky note (pin only, or expanded card if not minimized).
 */
export function getStickyNoteBounds(
  note: StickyNote,
  scale: number,
): { x: number; y: number; w: number; h: number } {
  const cx = note.point.x * scale
  const cy = note.point.y * scale
  const r = PIN_RADIUS * scale
  const triH = PIN_TRIANGLE_H * scale

  if (note.minimized) {
    // Pin only: circle + triangle
    const pinTop = cy - triH - r
    const pinBottom = cy
    const pinLeft = cx - r
    const pinRight = cx + r
    return {
      x: pinLeft,
      y: pinTop,
      w: pinRight - pinLeft,
      h: pinBottom - pinTop,
    }
  }

  // Expanded: union of pin and card
  const w = CARD_W * scale
  const h = CARD_H * scale
  const offsetY = CARD_OFFSET_Y * scale
  const cardX = cx
  const cardY = cy + offsetY - h

  const pinTop = cy - triH - r
  const pinBottom = cy
  const pinLeft = cx - r

  const unionLeft = Math.min(pinLeft, cardX)
  const unionTop = Math.min(pinTop, cardY)
  const unionRight = Math.max(cx + r, cardX + w)
  const unionBottom = Math.max(pinBottom, cardY + h)

  return {
    x: unionLeft,
    y: unionTop,
    w: unionRight - unionLeft,
    h: unionBottom - unionTop,
  }
}
