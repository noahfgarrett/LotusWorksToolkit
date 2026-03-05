import type { Point, Annotation, CalibrationState, Measurement } from './types.ts'
import { HANDLE_SIZE } from './types.ts'
import { wrapText, nearestPointOnRect, getHandles, getAnnotationBounds } from './geometry.ts'

// ── Cloud drawing helper ─────────────────────────────

export function drawCloudEdge(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  arcSize: number,
) {
  const edgeLen = Math.hypot(bx - ax, by - ay)
  const numBumps = Math.max(2, Math.round(edgeLen / arcSize))
  const dx = (bx - ax) / numBumps
  const dy = (by - ay) / numBumps
  const len = Math.hypot(dx, dy)
  if (len === 0) return
  const nx = (dy / len) * arcSize * 0.4
  const ny = (-dx / len) * arcSize * 0.4

  for (let i = 0; i < numBumps; i++) {
    const sx = ax + dx * i
    const sy = ay + dy * i
    const ex = ax + dx * (i + 1)
    const ey = ay + dy * (i + 1)
    const mx = (sx + ex) / 2 + nx
    const my = (sy + ey) / 2 + ny
    ctx.quadraticCurveTo(mx, my, ex, ey)
  }
}

// ── Catmull-Rom path smoothing ───────────────────────

export function drawSmoothPath(ctx: CanvasRenderingContext2D, pts: Point[], scale: number) {
  if (pts.length < 3) {
    ctx.beginPath()
    ctx.moveTo(pts[0].x * scale, pts[0].y * scale)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scale, pts[i].y * scale)
    ctx.stroke()
    return
  }

  const tension = 0.3
  ctx.beginPath()
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale)

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]

    const cp1x = (p1.x + (p2.x - p0.x) * tension) * scale
    const cp1y = (p1.y + (p2.y - p0.y) * tension) * scale
    const cp2x = (p2.x - (p3.x - p1.x) * tension) * scale
    const cp2y = (p2.y - (p3.y - p1.y) * tension) * scale

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x * scale, p2.y * scale)
  }
  ctx.stroke()
}

// ── Canvas drawing ─────────────────────────────────────

export function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, scale: number) {
  const pts = ann.points
  ctx.save()
  ctx.globalAlpha = ann.opacity
  ctx.strokeStyle = ann.color
  ctx.fillStyle = ann.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = ann.strokeWidth * scale

  // Dash pattern
  if (ann.dashPattern === 'dashed') ctx.setLineDash([ann.strokeWidth * scale * 3, ann.strokeWidth * scale * 2])
  else if (ann.dashPattern === 'dotted') ctx.setLineDash([ann.strokeWidth * scale, ann.strokeWidth * scale * 2])

  if (ann.type === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply'
  }

  switch (ann.type) {
    case 'pencil':
    case 'highlighter': {
      if (ann.rects && ann.rects.length > 0) {
        if (ann.strikethrough) {
          ctx.beginPath()
          ctx.strokeStyle = ann.color
          ctx.lineWidth = Math.max(1, 2 * scale)
          for (const r of ann.rects) {
            const midY = (r.y + r.h / 2) * scale
            ctx.moveTo(r.x * scale, midY)
            ctx.lineTo((r.x + r.w) * scale, midY)
          }
          ctx.stroke()
        } else {
          for (const r of ann.rects) {
            ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale)
          }
        }
        break
      }
      if (pts.length < 2) break
      if (ann.smooth === false) {
        ctx.beginPath()
        ctx.moveTo(pts[0].x * scale, pts[0].y * scale)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scale, pts[i].y * scale)
        ctx.stroke()
      } else {
        drawSmoothPath(ctx, pts, scale)
      }
      break
    }
    case 'line': {
      if (pts.length < 2) break
      ctx.beginPath()
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale)
      ctx.lineTo(pts[1].x * scale, pts[1].y * scale)
      ctx.stroke()
      break
    }
    case 'arrow': {
      if (pts.length < 2) break
      const asx = pts[0].x * scale, asy = pts[0].y * scale
      const aex = pts[1].x * scale, aey = pts[1].y * scale
      const aAngle = Math.atan2(aey - asy, aex - asx)
      const ahl = Math.min(28, Math.max(14, ann.strokeWidth * scale * 2.5))
      const aHalfAngle = Math.PI / 7
      let lineStartX = asx, lineStartY = asy
      const lineEndX = aex - ahl * Math.cos(aAngle)
      const lineEndY = aey - ahl * Math.sin(aAngle)
      if (ann.arrowStart) {
        lineStartX = asx + ahl * Math.cos(aAngle)
        lineStartY = asy + ahl * Math.sin(aAngle)
        const sAngle = aAngle + Math.PI
        ctx.beginPath()
        ctx.moveTo(asx, asy)
        ctx.lineTo(asx - ahl * Math.cos(sAngle - aHalfAngle), asy - ahl * Math.sin(sAngle - aHalfAngle))
        ctx.lineTo(asx - ahl * Math.cos(sAngle + aHalfAngle), asy - ahl * Math.sin(sAngle + aHalfAngle))
        ctx.closePath(); ctx.fill()
      }
      ctx.beginPath(); ctx.moveTo(lineStartX, lineStartY); ctx.lineTo(lineEndX, lineEndY); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(aex, aey)
      ctx.lineTo(aex - ahl * Math.cos(aAngle - aHalfAngle), aey - ahl * Math.sin(aAngle - aHalfAngle))
      ctx.lineTo(aex - ahl * Math.cos(aAngle + aHalfAngle), aey - ahl * Math.sin(aAngle + aHalfAngle))
      ctx.closePath(); ctx.fill()
      break
    }
    case 'rectangle': {
      if (pts.length < 2) break
      const rx = Math.min(pts[0].x, pts[1].x) * scale
      const ry = Math.min(pts[0].y, pts[1].y) * scale
      const rw = Math.abs(pts[1].x - pts[0].x) * scale
      const rh = Math.abs(pts[1].y - pts[0].y) * scale
      const cr = (ann.cornerRadius || 0) * scale
      if (cr > 0) {
        ctx.beginPath()
        ctx.roundRect(rx, ry, rw, rh, cr)
        if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fill() }
        ctx.stroke()
      } else {
        if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fillRect(rx, ry, rw, rh) }
        ctx.strokeRect(rx, ry, rw, rh)
      }
      break
    }
    case 'cloud': {
      if (pts.length < 3) break
      const arcSize = 20 * scale
      ctx.beginPath()
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale)
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        drawCloudEdge(ctx, a.x * scale, a.y * scale, b.x * scale, b.y * scale, arcSize)
      }
      ctx.closePath()
      if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fill() }
      ctx.stroke()
      break
    }
    case 'circle': {
      if (pts.length < 2) break
      const ecx = ((pts[0].x + pts[1].x) / 2) * scale
      const ecy = ((pts[0].y + pts[1].y) / 2) * scale
      const erx = (Math.abs(pts[1].x - pts[0].x) / 2) * scale
      const ery = (Math.abs(pts[1].y - pts[0].y) / 2) * scale
      if (erx > 0 && ery > 0) {
        ctx.beginPath(); ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2)
        if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fill() }
        ctx.stroke()
      }
      break
    }
    case 'text': {
      if (!ann.text || !pts.length) break
      const fs = (ann.fontSize || 16) * scale
      const ff = ann.fontFamily || 'Arial'
      const fontStyle = ann.italic ? 'italic' : 'normal'
      const fontWeight = ann.bold ? 'bold' : 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fs}px "${ff}", sans-serif`
      ctx.textBaseline = 'top'
      ctx.globalAlpha = ann.opacity
      const align = ann.textAlign || 'left'
      if (ann.width && ann.height) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(pts[0].x * scale, pts[0].y * scale, ann.width * scale, ann.height * scale)
        ctx.clip()
      }
      const textLH = ann.lineHeight || 1.3

      if (ann.backgroundColor && ann.width && ann.height) {
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.fillStyle = ann.backgroundColor
        ctx.fillRect(pts[0].x * scale, pts[0].y * scale, ann.width * scale, ann.height * scale)
        ctx.restore()
        ctx.globalAlpha = ann.opacity
        ctx.fillStyle = ann.color
      }

      if (ann.width) {
        const lines = wrapText(ann.text, ann.width, ann.fontSize || 16, ann.bold, (t: string) => ctx.measureText(t).width / scale)
        const lineH = (ann.fontSize || 16) * textLH
        for (let i = 0; i < lines.length; i++) {
          const lineY = (pts[0].y + lineH * i) * scale
          let lineX = pts[0].x * scale
          if (align === 'center') lineX += (ann.width * scale - ctx.measureText(lines[i]).width) / 2
          else if (align === 'right') lineX += ann.width * scale - ctx.measureText(lines[i]).width
          ctx.fillText(lines[i], lineX, lineY)
          if (ann.underline) {
            const tw = ctx.measureText(lines[i]).width
            const uy = lineY + fs * 0.95
            ctx.beginPath(); ctx.moveTo(lineX, uy); ctx.lineTo(lineX + tw, uy)
            ctx.lineWidth = Math.max(1, fs * 0.06); ctx.strokeStyle = ann.color; ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + fs * 0.4
            ctx.beginPath(); ctx.moveTo(lineX, sy); ctx.lineTo(lineX + tw, sy)
            ctx.lineWidth = Math.max(1, fs * 0.06); ctx.strokeStyle = ann.color; ctx.stroke()
          }
        }
      } else {
        const lines = ann.text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const lineY = (pts[0].y + (ann.fontSize || 16) * textLH * i) * scale
          ctx.fillText(lines[i], pts[0].x * scale, lineY)
          if (ann.underline) {
            const tw = ctx.measureText(lines[i]).width
            const uy = lineY + fs * 0.95
            ctx.beginPath(); ctx.moveTo(pts[0].x * scale, uy); ctx.lineTo(pts[0].x * scale + tw, uy)
            ctx.lineWidth = Math.max(1, fs * 0.06); ctx.strokeStyle = ann.color; ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + fs * 0.4
            ctx.beginPath(); ctx.moveTo(pts[0].x * scale, sy); ctx.lineTo(pts[0].x * scale + tw, sy)
            ctx.lineWidth = Math.max(1, fs * 0.06); ctx.strokeStyle = ann.color; ctx.stroke()
          }
        }
      }
      if (ann.width && ann.height) ctx.restore()
      break
    }
    case 'callout': {
      if (!pts.length || !ann.width || !ann.height) break
      const bx = pts[0].x * scale, by = pts[0].y * scale
      const bw = ann.width * scale, bh = ann.height * scale
      const calloutColor = ann.color || '#000000'

      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 1
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeStyle = calloutColor
      ctx.lineWidth = 1.5 * scale
      ctx.strokeRect(bx, by, bw, bh)

      if (ann.text) {
        const cfs = (ann.fontSize || 14) * scale
        const cff = ann.fontFamily || 'Arial'
        const cFontStyle = ann.italic ? 'italic' : 'normal'
        const cFontWeight = ann.bold ? 'bold' : 'normal'
        ctx.font = `${cFontStyle} ${cFontWeight} ${cfs}px "${cff}", sans-serif`
        ctx.fillStyle = calloutColor
        ctx.textBaseline = 'top'
        const cAlign = ann.textAlign || 'left'
        const calloutLH = ann.lineHeight || 1.3
        const lines = wrapText(ann.text, ann.width - 8, ann.fontSize || 14, ann.bold, (t: string) => ctx.measureText(t).width / scale)
        const lineH = (ann.fontSize || 14) * calloutLH
        const padding = 4 * scale
        for (let i = 0; i < lines.length; i++) {
          const lineY = by + padding + lineH * i * scale
          let lineX = bx + padding
          const availW = bw - padding * 2
          if (cAlign === 'center') lineX += (availW - ctx.measureText(lines[i]).width) / 2
          else if (cAlign === 'right') lineX += availW - ctx.measureText(lines[i]).width
          ctx.fillText(lines[i], lineX, lineY)
          if (ann.underline) {
            const tw = ctx.measureText(lines[i]).width
            const uy = lineY + cfs * 0.95
            ctx.beginPath(); ctx.moveTo(lineX, uy); ctx.lineTo(lineX + tw, uy)
            ctx.lineWidth = Math.max(1, cfs * 0.06); ctx.strokeStyle = calloutColor; ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + cfs * 0.4
            ctx.beginPath(); ctx.moveTo(lineX, sy); ctx.lineTo(lineX + tw, sy)
            ctx.lineWidth = Math.max(1, cfs * 0.06); ctx.strokeStyle = calloutColor; ctx.stroke()
          }
        }
      }

      if (ann.arrows && ann.arrows.length > 0) {
        ctx.strokeStyle = calloutColor
        ctx.fillStyle = calloutColor
        ctx.lineWidth = 1.5 * scale
        ctx.globalAlpha = 1
        for (const tip of ann.arrows) {
          const origin = nearestPointOnRect(pts[0].x, pts[0].y, ann.width, ann.height, tip.x, tip.y)
          const ox = origin.x * scale, oy = origin.y * scale
          const tx = tip.x * scale, ty = tip.y * scale
          const aAngle = Math.atan2(ty - oy, tx - ox)
          const aHl = Math.min(28, Math.max(14, 1.5 * scale * 2.5))
          const aHalf = Math.PI / 7
          const abx = tx - aHl * Math.cos(aAngle)
          const aby = ty - aHl * Math.sin(aAngle)
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(abx, aby); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(tx, ty)
          ctx.lineTo(tx - aHl * Math.cos(aAngle - aHalf), ty - aHl * Math.sin(aAngle - aHalf))
          ctx.lineTo(tx - aHl * Math.cos(aAngle + aHalf), ty - aHl * Math.sin(aAngle + aHalf))
          ctx.closePath(); ctx.fill()
        }
      }
      break
    }
  }
  ctx.restore()
}

// ── Selection UI drawing ────────────────────────────────

export function drawSelectionUI(ctx: CanvasRenderingContext2D, ann: Annotation, scale: number) {
  const bounds = getAnnotationBounds(ann)
  if (!bounds) return

  const sx = bounds.x * scale, sy = bounds.y * scale
  const sw = bounds.w * scale, sh = bounds.h * scale

  ctx.save()
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])
  ctx.strokeRect(sx, sy, sw, sh)
  ctx.setLineDash([])

  if (ann.type === 'text' || ann.type === 'callout') {
    const handles = getHandles(sx, sy, sw, sh)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1.5
    for (const h of handles) {
      ctx.fillRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    }
  } else if (ann.type === 'line' || ann.type === 'arrow') {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1.5
    for (const p of ann.points.slice(0, 2)) {
      ctx.beginPath()
      ctx.arc(p.x * scale, p.y * scale, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ── Measurement drawing ────────────────────────────────

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  m: Measurement,
  scale: number,
  calibration: CalibrationState,
  isSelected: boolean,
) {
  const sx = m.startPt.x * scale
  const sy = m.startPt.y * scale
  const ex = m.endPt.x * scale
  const ey = m.endPt.y * scale
  const pxDist = Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y)

  ctx.save()

  ctx.strokeStyle = isSelected ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = isSelected ? 2.5 : 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = isSelected ? '#06B6D4' : '#22D3EE'
  for (const [px, py] of [[sx, sy], [ex, ey]] as const) {
    ctx.beginPath()
    ctx.arc(px, py, isSelected ? 5 : 4, 0, Math.PI * 2)
    ctx.fill()
  }

  const mx = (sx + ex) / 2
  const my = (sy + ey) / 2
  const angle = Math.atan2(ey - sy, ex - sx)
  const textAngle = (angle > Math.PI / 2 || angle < -Math.PI / 2)
    ? angle + Math.PI
    : angle

  let label: string
  if (calibration.pixelsPerUnit !== null) {
    const realDist = pxDist / calibration.pixelsPerUnit
    label = `${realDist.toFixed(2)} ${calibration.unit}`
  } else {
    label = `${pxDist.toFixed(1)} px`
  }

  ctx.save()
  ctx.translate(mx, my)
  ctx.rotate(textAngle)

  ctx.font = `600 11px system-ui, sans-serif`
  const metrics = ctx.measureText(label)
  const padX = 6
  const padY = 3
  const tw = metrics.width + padX * 2
  const th = 16 + padY * 2

  const radius = th / 2
  ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.95)' : 'rgba(0, 40, 50, 0.85)'
  ctx.beginPath()
  ctx.roundRect(-tw / 2, -th / 2, tw, th, radius)
  ctx.fill()

  ctx.strokeStyle = isSelected ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(-tw / 2, -th / 2, tw, th, radius)
  ctx.stroke()

  ctx.fillStyle = isSelected ? '#ffffff' : '#22D3EE'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0)

  ctx.restore()
  ctx.restore()
}
