import { useState, useCallback, useRef, useEffect } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { Button } from '@/components/common/Button.tsx'
import { Modal } from '@/components/common/Modal.tsx'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { loadPDFFile, renderPageToCanvas, generateThumbnail, removePDFFromCache, getPDFBytes, extractPositionedText, getAllPageDimensions } from '@/utils/pdf.ts'
import { downloadBlob } from '@/utils/download.ts'
import { saveSession, loadSession, clearSession } from './storage.ts'
import type { PdfAnnotateSession } from './storage.ts'
import { formatFileSize } from '@/utils/fileReader.ts'
import type { PDFFile } from '@/types'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import {
  Download, RotateCcw, RotateCw, Undo2, Redo2,
  Pencil, Highlighter, Square, Circle, ArrowUpRight, Minus, Type, Eraser,
  ZoomIn, ZoomOut, Maximize, Cloud, ChevronDown, ChevronLeft, ChevronRight, PanelLeft,
  MessageSquare, X, Ruler, TextSelect, MousePointer2, Strikethrough, Paintbrush,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────

type ToolType = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'eraser' | 'cloud' | 'callout' | 'measure' | 'textHighlight' | 'textStrikethrough'

interface Point { x: number; y: number }

interface Annotation {
  id: string
  type: Exclude<ToolType, 'select' | 'eraser' | 'measure' | 'textHighlight' | 'textStrikethrough'>
  points: Point[]
  color: string
  strokeWidth: number
  opacity: number
  text?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  backgroundColor?: string
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  width?: number   // textbox width (doc space) — text & callout
  height?: number  // textbox height (doc space) — text & callout
  arrows?: Point[] // callout only: arrow tip positions
  smooth?: boolean // false = straight segments (eraser fragments from shapes)
  rects?: { x: number; y: number; w: number; h: number }[] // text highlight rectangles
}

type PageAnnotations = Record<number, Annotation[]>

interface Measurement {
  id: string
  startPt: Point
  endPt: Point
  page: number
}

interface CalibrationState {
  pixelsPerUnit: number | null
  unit: string
}

// ── Constants ──────────────────────────────────────────

const RENDER_SCALE = 1.5
const MAX_HISTORY = 50
const HANDLE_SIZE = 6
const DEFAULT_TEXTBOX_W = 200
const DEFAULT_TEXTBOX_H = 50
const ANN_COLORS = ['#000000', '#FF0000', '#FF6600', '#F47B20', '#FFFF00', '#22C55E', '#3B82F6', '#8B5CF6', '#FFFFFF']
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0] as const

type ToolDef = { type: ToolType; icon: React.ComponentType<{ size?: number }>; label: string }

const DRAW_TOOLS: ToolDef[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil (P)' },
  { type: 'line', icon: Minus, label: 'Line (L)' },
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
  { type: 'rectangle', icon: Square, label: 'Rectangle (R)' },
  { type: 'circle', icon: Circle, label: 'Circle (C)' },
  { type: 'cloud', icon: Cloud, label: 'Cloud (K)' },
]

const TEXT_TOOLS: ToolDef[] = [
  { type: 'text', icon: Type, label: 'Text (T)' },
  { type: 'callout', icon: MessageSquare, label: 'Callout (O)' },
]

const DRAW_TYPES = new Set(DRAW_TOOLS.map(s => s.type))
const TEXT_TYPES = new Set(TEXT_TOOLS.map(s => s.type))

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Calibri',
  'Times New Roman', 'Georgia', 'Palatino', 'Garamond',
  'Courier New', 'Consolas', 'Monaco', 'Lucida Console',
  'Comic Sans MS', 'Impact',
]

const PDF_FONT_MAP: Record<string, StandardFonts> = {
  'Arial': StandardFonts.Helvetica, 'Helvetica': StandardFonts.Helvetica,
  'Verdana': StandardFonts.Helvetica, 'Tahoma': StandardFonts.Helvetica,
  'Trebuchet MS': StandardFonts.Helvetica, 'Calibri': StandardFonts.Helvetica,
  'Times New Roman': StandardFonts.TimesRoman, 'Georgia': StandardFonts.TimesRoman,
  'Palatino': StandardFonts.TimesRoman, 'Garamond': StandardFonts.TimesRoman,
  'Courier New': StandardFonts.Courier, 'Consolas': StandardFonts.Courier,
  'Monaco': StandardFonts.Courier, 'Lucida Console': StandardFonts.Courier,
  'Comic Sans MS': StandardFonts.Helvetica, 'Impact': StandardFonts.Helvetica,
}

// Bold/Italic/BoldItalic variants for PDF export
type FontVariantKey = 'regular' | 'bold' | 'italic' | 'boldItalic'
const PDF_FONT_VARIANTS: Record<string, Record<FontVariantKey, StandardFonts>> = {
  helvetica: {
    regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  timesRoman: {
    regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  courier: {
    regular: StandardFonts.Courier, bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique,
  },
}

function resolvePdfFontFamily(ff: string): string {
  const base = PDF_FONT_MAP[ff] || StandardFonts.Helvetica
  if (base === StandardFonts.TimesRoman || base === StandardFonts.TimesRomanBold ||
      base === StandardFonts.TimesRomanItalic || base === StandardFonts.TimesRomanBoldItalic) return 'timesRoman'
  if (base === StandardFonts.Courier || base === StandardFonts.CourierBold ||
      base === StandardFonts.CourierOblique || base === StandardFonts.CourierBoldOblique) return 'courier'
  return 'helvetica'
}

function resolvePdfFont(ff: string, bold: boolean, italic: boolean): StandardFonts {
  const family = resolvePdfFontFamily(ff)
  const key: FontVariantKey = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular'
  return PDF_FONT_VARIANTS[family][key]
}

const CURSOR_MAP: Record<ToolType, string> = {
  select: 'default', pencil: 'crosshair', highlighter: 'crosshair', line: 'crosshair',
  arrow: 'crosshair', rectangle: 'crosshair', circle: 'crosshair',
  cloud: 'crosshair', text: 'text', eraser: 'none',
  callout: 'crosshair', measure: 'crosshair', textHighlight: 'text', textStrikethrough: 'text',
}

const HANDLE_CURSOR_MAP: Record<string, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}

function genId() { return crypto.randomUUID() }

/** Typed wrapper around the File System Access API — eliminates `any` casts */
interface PickerHandle {
  createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>
}
type PickerFn = (opts: {
  suggestedName: string
  types: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<PickerHandle>

async function saveWithPicker(
  blob: Blob,
  suggestedName: string,
  fileType: { description: string; accept: Record<string, string[]> },
): Promise<'saved' | 'fallback' | 'cancelled'> {
  if (!('showSaveFilePicker' in window)) return 'fallback'
  try {
    const picker = (window as unknown as { showSaveFilePicker: PickerFn }).showSaveFilePicker
    const handle = await picker({ suggestedName, types: [fileType] })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    return 'fallback'
  }
}

// ── Text wrapping helper ─────────────────────────────

function wrapText(text: string, maxWidth: number, fontSize: number, bold = false, measureFn?: (text: string) => number): string[] {
  const charWidth = fontSize * 0.6 * (bold ? 1.08 : 1)
  const measure = measureFn || ((t: string) => t.length * charWidth)
  const result: string[] = []
  for (const line of text.split('\n')) {
    if (!line) { result.push(''); continue }
    const words = line.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (measure(test) > maxWidth && current) {
        result.push(current)
        current = word
      } else {
        current = test
      }
    }
    result.push(current)
  }
  return result
}

// ── Auto-height text box helper ──────────────────────

function computeTextBoxHeight(ann: Annotation, measureFn?: (text: string) => number): number {
  if (!ann.text || !ann.width) return DEFAULT_TEXTBOX_H
  const fs = ann.fontSize || (ann.type === 'callout' ? 14 : 16)
  const lh = ann.lineHeight || 1.3
  const lines = wrapText(ann.text, ann.width, fs, ann.bold || false, measureFn)
  const contentH = lines.length * fs * lh
  const padding = ann.type === 'callout' ? 8 : 0
  return Math.max(DEFAULT_TEXTBOX_H, contentH + padding)
}

// ── Cloud drawing helper ─────────────────────────────

function drawCloudEdge(
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

function drawSmoothPath(ctx: CanvasRenderingContext2D, pts: Point[], scale: number) {
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

// ── Nearest point on rectangle edge ─────────────────

function nearestPointOnRect(rx: number, ry: number, rw: number, rh: number, px: number, py: number): Point {
  const cx = Math.max(rx, Math.min(rx + rw, px))
  const cy = Math.max(ry, Math.min(ry + rh, py))

  // If point is inside, project to nearest edge
  if (cx === px && cy === py) {
    const dLeft = px - rx, dRight = rx + rw - px
    const dTop = py - ry, dBottom = ry + rh - py
    const min = Math.min(dLeft, dRight, dTop, dBottom)
    if (min === dLeft) return { x: rx, y: py }
    if (min === dRight) return { x: rx + rw, y: py }
    if (min === dTop) return { x: px, y: ry }
    return { x: px, y: ry + rh }
  }
  return { x: cx, y: cy }
}

// ── Callout box hit-test ────────────────────────────

function hitTestCalloutBox(pt: Point, ann: Annotation): boolean {
  if (ann.type !== 'callout' || !ann.width || !ann.height || !ann.points.length) return false
  const { x, y } = ann.points[0]
  return pt.x >= x && pt.x <= x + ann.width && pt.y >= y && pt.y <= y + ann.height
}

// ── Resize handle helpers ────────────────────────────

type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w'

function getHandles(x: number, y: number, w: number, h: number): { id: HandleId; x: number; y: number }[] {
  return [
    { id: 'nw', x, y },
    { id: 'n', x: x + w / 2, y },
    { id: 'ne', x: x + w, y },
    { id: 'e', x: x + w, y: y + h / 2 },
    { id: 'se', x: x + w, y: y + h },
    { id: 's', x: x + w / 2, y: y + h },
    { id: 'sw', x, y: y + h },
    { id: 'w', x, y: y + h / 2 },
  ]
}

function hitTestHandle(pt: Point, ann: Annotation, threshold: number): HandleId | null {
  if ((ann.type !== 'text' && ann.type !== 'callout') || !ann.width || !ann.height || !ann.points.length) return null
  const { x, y } = ann.points[0]
  const handles = getHandles(x, y, ann.width, ann.height)
  for (const h of handles) {
    if (Math.hypot(pt.x - h.x, pt.y - h.y) < threshold) return h.id
  }
  return null
}

// ── Hit-testing helpers ────────────────────────────────

function ptSegDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function hitTest(p: Point, ann: Annotation, threshold: number): boolean {
  // strokeWidth/2 = visual extent from path centerline
  const th = threshold + ann.strokeWidth / 2
  switch (ann.type) {
    case 'pencil':
    case 'highlighter':
      if (ann.rects) {
        for (const r of ann.rects) {
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return true
        }
        return false
      }
      for (let i = 0; i < ann.points.length - 1; i++) {
        if (ptSegDist(p, ann.points[i], ann.points[i + 1]) < th) return true
      }
      return false
    case 'line':
    case 'arrow':
      return ann.points.length >= 2 && ptSegDist(p, ann.points[0], ann.points[1]) < th
    case 'rectangle': {
      if (ann.points.length < 2) return false
      const [p1, p2] = ann.points
      const c: Point[] = [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }]
      for (let i = 0; i < 4; i++) { if (ptSegDist(p, c[i], c[(i + 1) % 4]) < th) return true }
      return false
    }
    case 'cloud': {
      if (ann.points.length < 3) return false
      // 8 = bump perpendicular offset (arcSize * 0.4 = 20 * 0.4)
      const cloudTh = th + 8
      for (let i = 0; i < ann.points.length; i++) {
        if (ptSegDist(p, ann.points[i], ann.points[(i + 1) % ann.points.length]) < cloudTh) return true
      }
      return false
    }
    case 'circle': {
      if (ann.points.length < 2) return false
      const cx = (ann.points[0].x + ann.points[1].x) / 2
      const cy = (ann.points[0].y + ann.points[1].y) / 2
      const rx = Math.abs(ann.points[1].x - ann.points[0].x) / 2
      const ry = Math.abs(ann.points[1].y - ann.points[0].y) / 2
      if (rx < 1 || ry < 1) return false
      const d = Math.sqrt(((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2)
      return Math.abs(d - 1) * Math.min(rx, ry) < th
    }
    case 'text': {
      if (!ann.points.length) return false
      const { x, y } = ann.points[0]
      const tw = ann.width || (ann.text ? ann.text.length * (ann.fontSize || 16) * 0.6 : 0)
      const tLines = ann.text ? ann.text.split('\n') : ['']
      const tH = ann.height || tLines.length * (ann.fontSize || 16) * 1.3
      // Distance from point to nearest point on bounding box
      const nearX = Math.max(x, Math.min(x + tw, p.x))
      const nearY = Math.max(y, Math.min(y + tH, p.y))
      return Math.hypot(p.x - nearX, p.y - nearY) < th
    }
    case 'callout': {
      if (!ann.points.length || !ann.width || !ann.height) return false
      const { x, y } = ann.points[0]
      // Distance from point to nearest point on box
      const bNx = Math.max(x, Math.min(x + ann.width, p.x))
      const bNy = Math.max(y, Math.min(y + ann.height, p.y))
      if (Math.hypot(p.x - bNx, p.y - bNy) < th) return true
      // Hit if near any arrow line
      if (ann.arrows) {
        for (const tip of ann.arrows) {
          const origin = nearestPointOnRect(x, y, ann.width, ann.height, tip.x, tip.y)
          if (ptSegDist(p, origin, tip) < th) return true
        }
      }
      return false
    }
  }
  return false
}

// ── Eraser path splitting ──────────────────────────────

/** Find intersection points of line segment [a,b] with circle (center, radius). Returns 0-2 points sorted by t. */
function circleSegIntersections(center: Point, radius: number, a: Point, b: Point): Point[] {
  const dx = b.x - a.x, dy = b.y - a.y
  const fx = a.x - center.x, fy = a.y - center.y
  const A = dx * dx + dy * dy
  const B = 2 * (fx * dx + fy * dy)
  const C = fx * fx + fy * fy - radius * radius
  const disc = B * B - 4 * A * C
  if (disc < 0 || A === 0) return []
  const sqrtDisc = Math.sqrt(disc)
  const pts: Point[] = []
  for (const t of [(-B - sqrtDisc) / (2 * A), (-B + sqrtDisc) / (2 * A)]) {
    if (t > 0.001 && t < 0.999) pts.push({ x: a.x + t * dx, y: a.y + t * dy })
  }
  return pts
}

/** Check if any segment of a path comes within radius of center */
function pathHitsCircle(points: Point[], center: Point, radius: number): boolean {
  if (points.length === 1) return Math.hypot(points[0].x - center.x, points[0].y - center.y) < radius
  for (let i = 0; i < points.length - 1; i++) {
    if (ptSegDist(center, points[i], points[i + 1]) < radius) return true
  }
  return false
}

/** Split a pencil/highlighter path precisely at the eraser circle boundary. */
function splitPathByEraser(ann: Annotation, center: Point, radius: number): Annotation[] {
  const results: Point[][] = []
  let current: Point[] = []

  const isInside = (p: Point) => Math.hypot(p.x - center.x, p.y - center.y) <= radius

  for (let i = 0; i < ann.points.length; i++) {
    const pt = ann.points[i]
    const ptIn = isInside(pt)

    if (i === 0) {
      if (!ptIn) current.push(pt)
      continue
    }

    const prev = ann.points[i - 1]
    const prevIn = isInside(prev)

    if (!prevIn && !ptIn) {
      // Both outside — check if segment passes through circle
      const crossings = circleSegIntersections(center, radius, prev, pt)
      if (crossings.length === 2) {
        current.push(crossings[0])
        if (current.length >= 2) results.push(current)
        current = [crossings[1], pt]
      } else {
        current.push(pt)
      }
    } else if (!prevIn && ptIn) {
      // Outside → inside: find entry, end segment
      const crossings = circleSegIntersections(center, radius, prev, pt)
      if (crossings.length > 0) current.push(crossings[0])
      if (current.length >= 2) results.push(current)
      current = []
    } else if (prevIn && !ptIn) {
      // Inside → outside: find exit, start new segment
      const crossings = circleSegIntersections(center, radius, prev, pt)
      current = crossings.length > 0 ? [crossings[crossings.length - 1], pt] : [pt]
    }
    // else: both inside — skip
  }

  if (current.length >= 2) results.push(current)
  return results.map(pts => ({ ...ann, id: genId(), points: pts }))
}

// ── Shape → polyline conversion for partial erasing ──

/** Insert intermediate points every maxGap doc-units along a straight edge */
function densifyEdge(a: Point, b: Point, maxGap = 5): Point[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const n = Math.max(1, Math.ceil(d / maxGap))
  const out: Point[] = [a]
  for (let i = 1; i < n; i++) {
    const t = i / n
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  out.push(b)
  return out
}

function shapeToPolyline(ann: Annotation): Point[] {
  const pts = ann.points
  switch (ann.type) {
    case 'line':
    case 'arrow':
      // Shaft only (arrowhead is decorative), densified for precise splitting
      return pts.length >= 2 ? densifyEdge(pts[0], pts[1]) : [...pts]
    case 'rectangle': {
      if (pts.length < 2) return [...pts]
      const tl = { x: Math.min(pts[0].x, pts[1].x), y: Math.min(pts[0].y, pts[1].y) }
      const tr = { x: Math.max(pts[0].x, pts[1].x), y: Math.min(pts[0].y, pts[1].y) }
      const br = { x: Math.max(pts[0].x, pts[1].x), y: Math.max(pts[0].y, pts[1].y) }
      const bl = { x: Math.min(pts[0].x, pts[1].x), y: Math.max(pts[0].y, pts[1].y) }
      // Densify each edge so fragments stay straight under Catmull-Rom smoothing
      const edges = [
        ...densifyEdge(tl, tr),
        ...densifyEdge(tr, br).slice(1),
        ...densifyEdge(br, bl).slice(1),
        ...densifyEdge(bl, tl).slice(1),
      ]
      return edges
    }
    case 'circle': {
      if (pts.length < 2) return [...pts]
      const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2
      const rx = Math.abs(pts[1].x - pts[0].x) / 2, ry = Math.abs(pts[1].y - pts[0].y) / 2
      const out: Point[] = []
      const steps = 72
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) })
      }
      return out
    }
    case 'cloud': {
      if (pts.length < 3) return [...pts]
      const out: Point[] = []
      const arcSize = 20
      for (let ei = 0; ei < pts.length; ei++) {
        const a = pts[ei], b = pts[(ei + 1) % pts.length]
        const edgeLen = Math.hypot(b.x - a.x, b.y - a.y)
        const numBumps = Math.max(2, Math.round(edgeLen / arcSize))
        const dx = (b.x - a.x) / numBumps, dy = (b.y - a.y) / numBumps
        const len = Math.hypot(dx, dy)
        if (len === 0) continue
        const nx = (dy / len) * arcSize * 0.4, ny = (-dx / len) * arcSize * 0.4
        for (let j = 0; j < numBumps; j++) {
          const sx = a.x + dx * j, sy = a.y + dy * j
          const ex = a.x + dx * (j + 1), ey = a.y + dy * (j + 1)
          const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
          // Approximate quadratic bezier with 8 sub-segments
          for (let k = 0; k <= 8; k++) {
            const t = k / 8
            out.push({
              x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex,
              y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey,
            })
          }
        }
      }
      if (out.length > 0) out.push(out[0]) // close loop
      return out
    }
    default:
      return [...pts]
  }
}

// ── PDF coordinate transform for export ─────────────

function toPdfCoords(p: Point, origW: number, origH: number, rotation: number): { x: number; y: number } {
  switch (((rotation % 360) + 360) % 360) {
    case 90:  return { x: p.y, y: p.x }
    case 180: return { x: origW - p.x, y: p.y }
    case 270: return { x: origW - p.y, y: origH - p.x }
    default:  return { x: p.x, y: origH - p.y }
  }
}

// ── Pixel snapping for measurement tool ────────────────

/**
 * Snap a measurement endpoint to the farthest non-transparent pixel
 * along the measurement direction within a search corridor.
 * Returns the snapped point in doc-space, or the original point if no content found.
 */
function snapToContent(
  clickPt: Point,
  otherPt: Point | null,
  annCanvas: HTMLCanvasElement,
  searchRadius: number,
  corridorWidth: number,
): Point {
  // First endpoint or no direction — skip snapping
  if (!otherPt) return clickPt

  const ctx = annCanvas.getContext('2d')
  if (!ctx) return clickPt

  const scale = RENDER_SCALE
  // Direction vector from other endpoint toward click point (outward)
  const dx = clickPt.x - otherPt.x
  const dy = clickPt.y - otherPt.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return clickPt

  const dirX = dx / len
  const dirY = dy / len
  // Perpendicular
  const perpX = -dirY
  const perpY = dirX

  // Read image data for the search region
  const cx = clickPt.x * scale
  const cy = clickPt.y * scale
  const r = searchRadius * scale
  const x0 = Math.max(0, Math.floor(cx - r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const x1 = Math.min(annCanvas.width, Math.ceil(cx + r))
  const y1 = Math.min(annCanvas.height, Math.ceil(cy + r))
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return clickPt

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(x0, y0, w, h)
  } catch {
    return clickPt
  }
  const data = imageData.data

  // Walk outward from click in direction steps, scanning a narrow corridor
  let farthestPt: Point | null = null
  const halfCorridor = corridorWidth * scale

  for (let step = -searchRadius; step <= searchRadius; step++) {
    const sampleX = cx + dirX * step * scale
    const sampleY = cy + dirY * step * scale

    // Scan across corridor perpendicular to direction
    for (let c = -halfCorridor; c <= halfCorridor; c++) {
      const px = Math.round(sampleX + perpX * c - x0)
      const py = Math.round(sampleY + perpY * c - y0)
      if (px < 0 || px >= w || py < 0 || py >= h) continue

      const idx = (py * w + px) * 4
      const alpha = data[idx + 3]
      if (alpha > 10) {
        // Found content — keep if it's the farthest along direction
        const candidateX = (sampleX) / scale
        const candidateY = (sampleY) / scale
        if (!farthestPt) {
          farthestPt = { x: candidateX, y: candidateY }
        } else {
          // Compare distance along direction from otherPt
          const prevDist = (farthestPt.x - otherPt.x) * dirX + (farthestPt.y - otherPt.y) * dirY
          const newDist = (candidateX - otherPt.x) * dirX + (candidateY - otherPt.y) * dirY
          if (newDist > prevDist) {
            farthestPt = { x: candidateX, y: candidateY }
          }
        }
        break // found content in this corridor scan, move to next step
      }
    }
  }

  return farthestPt ?? clickPt
}

// ── Measurement drawing ────────────────────────────────

function drawMeasurement(
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

  // Dashed cyan line
  ctx.strokeStyle = isSelected ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = isSelected ? 2.5 : 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])

  // Endpoint circles
  ctx.fillStyle = isSelected ? '#06B6D4' : '#22D3EE'
  for (const [px, py] of [[sx, sy], [ex, ey]] as const) {
    ctx.beginPath()
    ctx.arc(px, py, isSelected ? 5 : 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Distance label at midpoint
  const mx = (sx + ex) / 2
  const my = (sy + ey) / 2
  const angle = Math.atan2(ey - sy, ex - sx)
  // Keep text readable (don't flip upside down)
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

  // Pill background
  const radius = th / 2
  ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.95)' : 'rgba(0, 40, 50, 0.85)'
  ctx.beginPath()
  ctx.roundRect(-tw / 2, -th / 2, tw, th, radius)
  ctx.fill()

  // Border
  ctx.strokeStyle = isSelected ? '#06B6D4' : '#22D3EE'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(-tw / 2, -th / 2, tw, th, radius)
  ctx.stroke()

  // Text
  ctx.fillStyle = isSelected ? '#ffffff' : '#22D3EE'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 0)

  ctx.restore()
  ctx.restore()
}

/** Check if a point is within range of a measurement's midpoint label. */
function hitTestMeasurementLabel(pt: Point, m: Measurement, threshold: number): boolean {
  const mx = (m.startPt.x + m.endPt.x) / 2
  const my = (m.startPt.y + m.endPt.y) / 2
  return Math.hypot(pt.x - mx, pt.y - my) < threshold
}

// ── Annotation bounding box ──────────────────────────────

function getAnnotationBounds(ann: Annotation): { x: number; y: number; w: number; h: number } | null {
  const pts = ann.points
  if (!pts.length) return null
  switch (ann.type) {
    case 'text':
    case 'callout': {
      if (!ann.width || !ann.height) return null
      return { x: pts[0].x, y: pts[0].y, w: ann.width, h: ann.height }
    }
    case 'rectangle': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x), h: Math.abs(pts[1].y - pts[0].y) }
    }
    case 'circle': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x), h: Math.abs(pts[1].y - pts[0].y) }
    }
    case 'line':
    case 'arrow': {
      if (pts.length < 2) return null
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      return { x, y, w: Math.abs(pts[1].x - pts[0].x) || 2, h: Math.abs(pts[1].y - pts[0].y) || 2 }
    }
    case 'pencil':
    case 'highlighter':
    case 'cloud': {
      if (ann.rects && ann.rects.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const r of ann.rects) {
          if (r.x < minX) minX = r.x
          if (r.y < minY) minY = r.y
          if (r.x + r.w > maxX) maxX = r.x + r.w
          if (r.y + r.h > maxY) maxY = r.y + r.h
        }
        return { x: minX, y: minY, w: maxX - minX || 2, h: maxY - minY || 2 }
      }
      if (pts.length < 2) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      return { x: minX, y: minY, w: maxX - minX || 2, h: maxY - minY || 2 }
    }
  }
  return null
}

// ── Canvas drawing ─────────────────────────────────────

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, scale: number) {
  const pts = ann.points
  ctx.save()
  ctx.globalAlpha = ann.opacity
  ctx.strokeStyle = ann.color
  ctx.fillStyle = ann.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = ann.strokeWidth * scale

  if (ann.type === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply'
  }

  switch (ann.type) {
    case 'pencil':
    case 'highlighter': {
      if (ann.rects && ann.rects.length > 0) {
        if (ann.strikethrough) {
          // Draw strikethrough lines through the middle of each text rect
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
        // Straight segments (eraser fragments from shapes)
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
      const sx = pts[0].x * scale, sy = pts[0].y * scale
      const ex = pts[1].x * scale, ey = pts[1].y * scale
      const angle = Math.atan2(ey - sy, ex - sx)
      const hl = Math.min(28, Math.max(14, ann.strokeWidth * scale * 2.5))
      const halfAngle = Math.PI / 7
      // Line stops at arrowhead base to avoid bleed-through
      const baseX = ex - hl * Math.cos(angle)
      const baseY = ey - hl * Math.sin(angle)
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(baseX, baseY); ctx.stroke()
      // Filled arrowhead
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - hl * Math.cos(angle - halfAngle), ey - hl * Math.sin(angle - halfAngle))
      ctx.lineTo(ex - hl * Math.cos(angle + halfAngle), ey - hl * Math.sin(angle + halfAngle))
      ctx.closePath(); ctx.fill()
      break
    }
    case 'rectangle': {
      if (pts.length < 2) break
      ctx.strokeRect(
        Math.min(pts[0].x, pts[1].x) * scale, Math.min(pts[0].y, pts[1].y) * scale,
        Math.abs(pts[1].x - pts[0].x) * scale, Math.abs(pts[1].y - pts[0].y) * scale,
      )
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
      ctx.stroke()
      break
    }
    case 'circle': {
      if (pts.length < 2) break
      const cx = ((pts[0].x + pts[1].x) / 2) * scale
      const cy = ((pts[0].y + pts[1].y) / 2) * scale
      const rx = (Math.abs(pts[1].x - pts[0].x) / 2) * scale
      const ry = (Math.abs(pts[1].y - pts[0].y) / 2) * scale
      if (rx > 0 && ry > 0) {
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
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
      // Clip text to bounding box
      if (ann.width && ann.height) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(pts[0].x * scale, pts[0].y * scale, ann.width * scale, ann.height * scale)
        ctx.clip()
      }
      const textLH = ann.lineHeight || 1.3

      // Background highlight
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
            ctx.beginPath()
            ctx.moveTo(lineX, uy)
            ctx.lineTo(lineX + tw, uy)
            ctx.lineWidth = Math.max(1, fs * 0.06)
            ctx.strokeStyle = ann.color
            ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + fs * 0.4
            ctx.beginPath()
            ctx.moveTo(lineX, sy)
            ctx.lineTo(lineX + tw, sy)
            ctx.lineWidth = Math.max(1, fs * 0.06)
            ctx.strokeStyle = ann.color
            ctx.stroke()
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
            ctx.beginPath()
            ctx.moveTo(pts[0].x * scale, uy)
            ctx.lineTo(pts[0].x * scale + tw, uy)
            ctx.lineWidth = Math.max(1, fs * 0.06)
            ctx.strokeStyle = ann.color
            ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + fs * 0.4
            ctx.beginPath()
            ctx.moveTo(pts[0].x * scale, sy)
            ctx.lineTo(pts[0].x * scale + tw, sy)
            ctx.lineWidth = Math.max(1, fs * 0.06)
            ctx.strokeStyle = ann.color
            ctx.stroke()
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

      // White-filled box with colored border
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 1
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeStyle = calloutColor
      ctx.lineWidth = 1.5 * scale
      ctx.strokeRect(bx, by, bw, bh)

      // Text inside the box
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
            ctx.beginPath()
            ctx.moveTo(lineX, uy)
            ctx.lineTo(lineX + tw, uy)
            ctx.lineWidth = Math.max(1, cfs * 0.06)
            ctx.strokeStyle = calloutColor
            ctx.stroke()
          }
          if (ann.strikethrough) {
            const tw = ctx.measureText(lines[i]).width
            const sy = lineY + cfs * 0.4
            ctx.beginPath()
            ctx.moveTo(lineX, sy)
            ctx.lineTo(lineX + tw, sy)
            ctx.lineWidth = Math.max(1, cfs * 0.06)
            ctx.strokeStyle = calloutColor
            ctx.stroke()
          }
        }
      }

      // Arrows from box to each tip
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

function drawSelectionUI(ctx: CanvasRenderingContext2D, ann: Annotation, scale: number) {
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

  // For text/callout: 8 resize handles. For lines/arrows: endpoint circles. For others: bounding box only.
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
    // Endpoint circles
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

// ── Thumbnail sidebar item ──────────────────────────────

function ThumbnailItem({ pageNum, thumbnail, isCurrent, isSelected, hasAnnotations, onVisible, onClick, onDoubleClick }: {
  pageNum: number
  thumbnail?: string
  isCurrent: boolean
  isSelected: boolean
  hasAnnotations: boolean
  onVisible: () => void
  onClick: () => void
  onDoubleClick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (thumbnail) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onVisible(); observer.disconnect() } },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnail])

  return (
    <div
      ref={ref}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${
        isCurrent ? 'border-[#F47B20]' :
        isSelected ? 'border-[#F47B20]/50' :
        'border-transparent hover:border-white/20'
      }`}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={`Page ${pageNum}`} className="w-full h-auto" draggable={false} />
      ) : (
        <div className="w-full aspect-[3/4] bg-white/[0.04] flex items-center justify-center">
          <span className="text-[10px] text-white/30">Loading...</span>
        </div>
      )}
      <div className="text-center text-[10px] text-white/40 py-0.5">
        {pageNum}
        {hasAnnotations && <span className="text-[8px] text-[#F47B20] ml-0.5">●</span>}
      </div>
    </div>
  )
}

// ── Text hit-testing helpers ─────────────────────────

function isPointInTextItem(pt: { x: number; y: number }, item: { x: number; y: number; width: number; height: number }): boolean {
  return pt.x >= item.x && pt.x <= item.x + item.width && pt.y >= item.y && pt.y <= item.y + item.height
}

function isPointInAnyTextItem(pt: { x: number; y: number }, items: { x: number; y: number; width: number; height: number }[]): boolean {
  for (const item of items) {
    if (isPointInTextItem(pt, item)) return true
  }
  return false
}

// ── Rotation coordinate transform ────────────────────

/** Transform a point between two rotation coordinate spaces via the canonical (0°) space. */
function rotatePoint(p: Point, fromRot: number, toRot: number, origW: number, origH: number): Point {
  if (fromRot === toRot) return p
  // Step 1: fromRot → 0°
  let x0: number, y0: number
  const fr = ((fromRot % 360) + 360) % 360
  switch (fr) {
    case 90:  x0 = p.y;          y0 = origH - p.x; break
    case 180: x0 = origW - p.x;  y0 = origH - p.y; break
    case 270: x0 = origW - p.y;  y0 = p.x;         break
    default:  x0 = p.x;          y0 = p.y;          break
  }
  // Step 2: 0° → toRot
  const tr = ((toRot % 360) + 360) % 360
  switch (tr) {
    case 90:  return { x: origH - y0, y: x0 }
    case 180: return { x: origW - x0, y: origH - y0 }
    case 270: return { x: y0,         y: origW - x0 }
    default:  return { x: x0,         y: y0 }
  }
}

// ── Text highlight intersection helper ───────────────

function findIntersectingTextItems(
  items: { x: number; y: number; width: number; height: number }[],
  selRect: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number }[] {
  const result: { x: number; y: number; w: number; h: number }[] = []
  for (const item of items) {
    if (item.width <= 0) continue
    if (item.x < selRect.x + selRect.w &&
        item.x + item.width > selRect.x &&
        item.y < selRect.y + selRect.h &&
        item.y + item.height > selRect.y) {
      result.push({ x: item.x, y: item.y, w: item.width, h: item.height })
    }
  }
  return result
}

// ── Flow-based text selection (browser-style, sub-item precision) ────

type TextItemLike = { x: number; y: number; width: number; height: number }

interface FlowLine { y: number; h: number; items: TextItemLike[] }

/** Group text items into lines, sorted in reading order. */
function buildTextLines(items: TextItemLike[]): { lines: FlowLine[]; ordered: TextItemLike[] } {
  const valid = items.filter(i => i.width > 0)
  if (valid.length === 0) return { lines: [], ordered: [] }
  const sorted = [...valid]
  sorted.sort((a, b) => a.y - b.y || a.x - b.x)

  const lines: FlowLine[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(item.y - last.y) < item.height * 0.5) {
      last.items.push(item)
    } else {
      lines.push({ y: item.y, h: item.height, items: [item] })
    }
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return { lines, ordered: lines.flatMap(l => l.items) }
}

/** Find the reading-order index of the item nearest to a point. */
function nearestItemIndex(pt: { x: number; y: number }, lines: FlowLine[], ordered: TextItemLike[]): number {
  let bestLine = 0, bestDist = Infinity
  for (let i = 0; i < lines.length; i++) {
    const d = Math.abs(pt.y - (lines[i].y + lines[i].h / 2))
    if (d < bestDist) { bestDist = d; bestLine = i }
  }
  const lineItems = lines[bestLine].items
  let bestItem = lineItems[0], bestXDist = Infinity
  for (const item of lineItems) {
    const d = Math.abs(pt.x - (item.x + item.width / 2))
    if (d < bestXDist) { bestXDist = d; bestItem = item }
  }
  return ordered.indexOf(bestItem)
}

/**
 * Select text items between two points with sub-item precision.
 * The first and last item rects are clipped to the exact start/end x positions
 * so the highlight matches the cursor position precisely (like browser text selection).
 */
function flowSelectTextItems(
  items: TextItemLike[],
  startPt: { x: number; y: number },
  endPt: { x: number; y: number },
): { x: number; y: number; w: number; h: number }[] {
  const { lines, ordered } = buildTextLines(items)
  if (ordered.length === 0) return []

  const startIdx = nearestItemIndex(startPt, lines, ordered)
  const endIdx = nearestItemIndex(endPt, lines, ordered)
  const from = Math.min(startIdx, endIdx)
  const to = Math.max(startIdx, endIdx)

  // Determine which point is the leading/trailing edge in reading order
  const leadPt = startIdx <= endIdx ? startPt : endPt
  const trailPt = startIdx <= endIdx ? endPt : startPt

  const result: { x: number; y: number; w: number; h: number }[] = []
  for (let i = from; i <= to; i++) {
    const item = ordered[i]
    let x = item.x
    let right = item.x + item.width

    if (from === to) {
      // Single item — clip both edges to the two points
      const leftX = Math.min(leadPt.x, trailPt.x)
      const rightX = Math.max(leadPt.x, trailPt.x)
      x = Math.max(item.x, leftX)
      right = Math.min(item.x + item.width, rightX)
    } else if (i === from) {
      // First item — clip left edge to lead point
      x = Math.max(item.x, leadPt.x)
    } else if (i === to) {
      // Last item — clip right edge to trail point
      right = Math.min(item.x + item.width, trailPt.x)
    }

    const w = right - x
    if (w > 0) {
      result.push({ x, y: item.y, w, h: item.height })
    }
  }
  return result
}

// ── Per-page canvas refs type ────────────────────────

interface PageRefs {
  pdfCanvas: HTMLCanvasElement
  annCanvas: HTMLCanvasElement
  container: HTMLDivElement
}

// ── Component ──────────────────────────────────────────

export default function PdfAnnotateTool() {
  const addToast = useAppStore(s => s.addToast)

  // State
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [color, setColor] = useState('#F47B20')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(100)
  const [fontSize, setFontSize] = useState(16)
  const [zoom, setZoom] = useState(1.0)
  const [annotations, setAnnotations] = useState<PageAnnotations>({})
  const [isExporting, setIsExporting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  // pdfReady removed — each page renders independently via IntersectionObserver

  const [fontFamily, setFontFamily] = useState('Arial')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [strikethrough, setStrikethrough] = useState(false)
  const [textBgColor, setTextBgColor] = useState<string | null>(null)
  const [lineSpacing, setLineSpacing] = useState(1.3)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [canvasCursor, setCanvasCursor] = useState<string | null>(null)
  const [selectTextToolbar, setSelectTextToolbar] = useState<{
    rects: { x: number; y: number; w: number; h: number }[]
    items: { text: string; x: number; y: number; width: number; height: number; page: number }[]
    docPos: { x: number; y: number }
  } | null>(null)
  const clipboardRef = useRef<Annotation | null>(null)
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null)

  // Shapes dropdown
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false)
  const [activeDraw, setActiveDraw] = useState<ToolType>('pencil')

  // Text tools dropdown
  const [textDropdownOpen, setTextDropdownOpen] = useState(false)
  const [activeText, setActiveText] = useState<ToolType>('text')

  // Zoom presets dropdown
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false)

  // Straight-line mode
  const [straightLineMode, setStraightLineMode] = useState(false)

  // Eraser
  const [eraserRadius, setEraserRadius] = useState(15)
  const [eraserMode, setEraserMode] = useState<'partial' | 'object'>('partial')
  const [eraserCursorPos, setEraserCursorPos] = useState<Point | null>(null)
  const eraserModsRef = useRef<{ removed: Set<string>; added: Annotation[] }>({ removed: new Set(), added: [] })

  // Rotation
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})

  // Text tool — PowerPoint style
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommittedTextRef = useRef<{ id: string; text: string } | null>(null)
  // Tracks whether the textarea was committed via Escape key so the blur handler
  // doesn't run commitTextEditing a second time (which would add a duplicate history step)
  const escapeCommittedRef = useRef(false)
  // Manual double-click detection: pointerdown events have e.detail=0 in Chromium
  // (unlike mousedown), so we must track click timestamps ourselves.
  const dblClickRef = useRef<{ time: number; pt: Point }>({ time: 0, pt: { x: 0, y: 0 } })
  const textDragRef = useRef<{
    mode: 'move' | HandleId
    startPt: Point
    origPoints: Point[]
    origWidth: number
    origHeight: number
    origArrows?: Point[]
  } | null>(null)
  const generalDragRef = useRef<{
    annId: string; startPt: Point; origPoints: Point[]
  } | null>(null)

  // Callout arrow drag
  const calloutArrowDragRef = useRef<{ tipPt: Point; arrowIdx?: number } | null>(null)
  const [selectedArrowIdx, setSelectedArrowIdx] = useState<number | null>(null)

  // Cloud polygon placement
  const cloudPreviewRef = useRef<Point | null>(null)
  const cloudLastClickRef = useRef<{ time: number; pt: Point }>({ time: 0, pt: { x: 0, y: 0 } })

  // Measurement tool
  const [measurements, setMeasurements] = useState<Record<number, Measurement[]>>({})
  const [calibration, setCalibration] = useState<CalibrationState>({ pixelsPerUnit: null, unit: 'in' })
  const [calibrateModalOpen, setCalibrateModalOpen] = useState(false)
  const [calibrateMeasureId, setCalibrateMeasureId] = useState<string | null>(null)
  const [calibrateValue, setCalibrateValue] = useState('')
  const [calibrateUnit, setCalibrateUnit] = useState('in')
  const measureStartRef = useRef<Point | null>(null)
  const measurePreviewRef = useRef<Point | null>(null)
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null)

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})
  const [selectedThumbPage, setSelectedThumbPage] = useState<number | null>(null)
  const loadingThumbs = useRef(new Set<number>())

  // Refs
  const pageRefsMap = useRef<Map<number, PageRefs>>(new Map())
  const pageDimsMap = useRef<Map<number, { width: number; height: number }>>(new Map())
  const renderedPagesRef = useRef<Set<number>>(new Set())
  const activePageRef = useRef(1)
  const maxCanvasWidthRef = useRef(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const spaceHeldRef = useRef(false)
  const shapesDropdownRef = useRef<HTMLDivElement>(null)
  const textDropdownRef = useRef<HTMLDivElement>(null)
  const zoomDropdownRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentPtsRef = useRef<Point[]>([])
  const pdfFileRef = useRef(pdfFile)
  pdfFileRef.current = pdfFile
  const pageRotationsRef = useRef(pageRotations)
  pageRotationsRef.current = pageRotations
  const [dimsReady, setDimsReady] = useState(0)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // Session restore
  const pendingScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null)
  const restoringSessionRef = useRef(false)
  const initialFitDoneRef = useRef(false)

  // Text highlight
  const textItemsCacheRef = useRef<Record<string, { text: string; x: number; y: number; width: number; height: number; page: number }[]>>({})
  const textHighlightStartRef = useRef<Point | null>(null)
  const textHighlightPreviewRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const selectTextStartRef = useRef<Point | null>(null)
  const selectTextRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([])
  const [activeHighlight, setActiveHighlight] = useState<'highlighter' | 'textHighlight' | 'textStrikethrough'>('highlighter')

  // History
  const historyRef = useRef<PageAnnotations[]>([{}])
  const historyIdxRef = useRef(0)
  const [, forceRender] = useState(0)

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  const isDrawTool = DRAW_TYPES.has(activeTool)
  const isTextTool = TEXT_TYPES.has(activeTool)
  const currentRotation = pageRotations[currentPage] || 0

  // ── Coordinate conversion (page-aware) ──────────────

  const getPointForPage = useCallback((pageNum: number, e: { clientX: number; clientY: number }): Point => {
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return { x: 0, y: 0 }
    const canvas = refs.annCanvas
    const dims = pageDimsMap.current.get(pageNum) || { width: 0, height: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(dims.width,
        ((e.clientX - rect.left) / rect.width) * canvas.width / RENDER_SCALE)),
      y: Math.max(0, Math.min(dims.height,
        ((e.clientY - rect.top) / rect.height) * canvas.height / RENDER_SCALE)),
    }
  }, [])

  // ── Annotation helpers (page-aware) ────────────────

  const getAnnotation = useCallback((id: string, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    return (annotations[page] || []).find(a => a.id === id)
  }, [annotations])

  const findTextAnnotationAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'text' && hitTest(pt, ann, 4)) return ann
    }
    return undefined
  }, [annotations])

  const findCalloutAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'callout' && hitTest(pt, ann, 4)) return ann
    }
    return undefined
  }, [annotations])

  const findAnnotationAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      if (hitTest(pt, pageAnns[i], 4)) return pageAnns[i]
    }
    return undefined
  }, [annotations])

  /** Find which page an annotation lives on (for overlays). */
  const findAnnotationPage = useCallback((id: string): number | null => {
    for (const [pageStr, pageAnns] of Object.entries(annotations)) {
      if (pageAnns.some(a => a.id === id)) return Number(pageStr)
    }
    return null
  }, [annotations])

  // ── Render helpers (page-aware) ────────────────────────

  const redrawPage = useCallback((pageNum: number) => {
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return
    const canvas = refs.annCanvas
    if (!canvas || canvas.width === 0) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isActive = pageNum === activePageRef.current
    const mods = eraserModsRef.current
    const pageAnns = (annotations[pageNum] || [])
      .filter(a => !isActive || !mods.removed.has(a.id))
    for (const ann of pageAnns) {
      drawAnnotation(ctx, ann, RENDER_SCALE)
      if (ann.id === selectedAnnId) {
        drawSelectionUI(ctx, ann, RENDER_SCALE)
        if (ann.type === 'callout' && selectedArrowIdx !== null && ann.arrows && selectedArrowIdx < ann.arrows.length) {
          const tip = ann.arrows[selectedArrowIdx]
          const origin = nearestPointOnRect(ann.points[0].x, ann.points[0].y, ann.width!, ann.height!, tip.x, tip.y)
          ctx.save()
          ctx.strokeStyle = '#EF4444'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 3])
          ctx.beginPath()
          ctx.moveTo(origin.x * RENDER_SCALE, origin.y * RENDER_SCALE)
          ctx.lineTo(tip.x * RENDER_SCALE, tip.y * RENDER_SCALE)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = '#EF4444'
          ctx.beginPath()
          ctx.arc(tip.x * RENDER_SCALE, tip.y * RENDER_SCALE, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
    }

    // Eraser-added fragments (only on active page)
    if (isActive) {
      for (const frag of mods.added) drawAnnotation(ctx, frag, RENDER_SCALE)
    }

    // Hover highlight
    if (hoveredAnnId && hoveredAnnId !== selectedAnnId) {
      const hovAnn = pageAnns.find(a => a.id === hoveredAnnId)
      if (hovAnn) {
        const bounds = getAnnotationBounds(hovAnn)
        if (bounds) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.4
          ctx.setLineDash([3, 3])
          ctx.strokeRect(bounds.x * RENDER_SCALE, bounds.y * RENDER_SCALE, bounds.w * RENDER_SCALE, bounds.h * RENDER_SCALE)
          ctx.setLineDash([])
          ctx.restore()
        }
      }
    }

    // ── In-progress elements (only on the active page) ──
    if (isActive) {
      // In-progress stroke
      if (isDrawingRef.current && activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'text' && activeTool !== 'callout' && activeTool !== 'cloud' && activeTool !== 'measure' && activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough') {
        const pts = currentPtsRef.current
        if (pts.length > 0) {
          const inProgress: Annotation = {
            id: '_progress', type: activeTool as Annotation['type'],
            points: pts, color, fontSize,
            strokeWidth: activeTool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
            opacity: activeTool === 'highlighter' ? 0.4 : opacity / 100,
          }
          drawAnnotation(ctx, inProgress, RENDER_SCALE)
        }
      }

      // Text highlight preview
      if (activeTool === 'textHighlight' && textHighlightPreviewRectsRef.current.length > 0) {
        ctx.save()
        ctx.globalAlpha = 0.4
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = color
        for (const r of textHighlightPreviewRectsRef.current) {
          ctx.fillRect(r.x * RENDER_SCALE, r.y * RENDER_SCALE, r.w * RENDER_SCALE, r.h * RENDER_SCALE)
        }
        ctx.restore()
      }

      // Text strikethrough preview
      if (activeTool === 'textStrikethrough' && textHighlightPreviewRectsRef.current.length > 0) {
        ctx.save()
        ctx.globalAlpha = 1
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, 2 * RENDER_SCALE)
        ctx.beginPath()
        for (const r of textHighlightPreviewRectsRef.current) {
          const midY = (r.y + r.h / 2) * RENDER_SCALE
          ctx.moveTo(r.x * RENDER_SCALE, midY)
          ctx.lineTo((r.x + r.w) * RENDER_SCALE, midY)
        }
        ctx.stroke()
        ctx.restore()
      }

      // Select tool: text selection highlight
      {
        const selectRects = selectTextRectsRef.current.length > 0
          ? selectTextRectsRef.current
          : selectTextToolbar?.rects ?? []
        if (selectRects.length > 0) {
          ctx.save()
          ctx.globalAlpha = 0.3
          ctx.fillStyle = '#3B82F6'
          for (const r of selectRects) {
            ctx.fillRect(r.x * RENDER_SCALE, r.y * RENDER_SCALE, r.w * RENDER_SCALE, r.h * RENDER_SCALE)
          }
          ctx.restore()
        }
      }

      // Cloud polygon vertex placement preview
      if (activeTool === 'cloud' && currentPtsRef.current.length > 0) {
        const cpts = currentPtsRef.current
        const preview = cloudPreviewRef.current
        const scale = RENDER_SCALE
        const arcSize = 20 * scale

        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth * scale
        ctx.globalAlpha = opacity / 100

        if (cpts.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(cpts[0].x * scale, cpts[0].y * scale)
          for (let i = 0; i < cpts.length - 1; i++) {
            drawCloudEdge(ctx, cpts[i].x * scale, cpts[i].y * scale, cpts[i + 1].x * scale, cpts[i + 1].y * scale, arcSize)
          }
          ctx.stroke()
        }

        if (preview) {
          ctx.globalAlpha = (opacity / 100) * 0.5
          ctx.beginPath()
          ctx.moveTo(cpts[cpts.length - 1].x * scale, cpts[cpts.length - 1].y * scale)
          drawCloudEdge(ctx, cpts[cpts.length - 1].x * scale, cpts[cpts.length - 1].y * scale, preview.x * scale, preview.y * scale, arcSize)
          ctx.stroke()

          if (cpts.length >= 2) {
            ctx.setLineDash([4, 3])
            ctx.beginPath()
            ctx.moveTo(preview.x * scale, preview.y * scale)
            drawCloudEdge(ctx, preview.x * scale, preview.y * scale, cpts[0].x * scale, cpts[0].y * scale, arcSize)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }

        ctx.globalAlpha = 1
        ctx.fillStyle = '#3B82F6'
        for (const p of cpts) {
          ctx.beginPath()
          ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.setLineDash([])
        ctx.restore()
      }

      // In-progress textbox creation
      if (isDrawingRef.current && activeTool === 'text') {
        const pts = currentPtsRef.current
        if (pts.length >= 2) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          const x = Math.min(pts[0].x, pts[1].x) * RENDER_SCALE
          const y = Math.min(pts[0].y, pts[1].y) * RENDER_SCALE
          const w = Math.abs(pts[1].x - pts[0].x) * RENDER_SCALE
          const h = Math.abs(pts[1].y - pts[0].y) * RENDER_SCALE
          ctx.strokeRect(x, y, w, h)
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // In-progress callout box creation
      if (isDrawingRef.current && activeTool === 'callout' && !calloutArrowDragRef.current) {
        const pts = currentPtsRef.current
        if (pts.length >= 2) {
          ctx.save()
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          const x = Math.min(pts[0].x, pts[1].x) * RENDER_SCALE
          const y = Math.min(pts[0].y, pts[1].y) * RENDER_SCALE
          const w = Math.abs(pts[1].x - pts[0].x) * RENDER_SCALE
          const h = Math.abs(pts[1].y - pts[0].y) * RENDER_SCALE
          ctx.strokeRect(x, y, w, h)
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // Callout arrow drag preview
      if (calloutArrowDragRef.current && selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout' && ann.width && ann.height) {
          const tip = calloutArrowDragRef.current.tipPt
          const origin = nearestPointOnRect(ann.points[0].x, ann.points[0].y, ann.width, ann.height, tip.x, tip.y)
          ctx.save()
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1.5 * RENDER_SCALE
          ctx.setLineDash([4, 3])
          ctx.beginPath()
          ctx.moveTo(origin.x * RENDER_SCALE, origin.y * RENDER_SCALE)
          ctx.lineTo(tip.x * RENDER_SCALE, tip.y * RENDER_SCALE)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // In-progress measurement preview
      if (activeTool === 'measure' && measureStartRef.current && measurePreviewRef.current) {
        const preview: Measurement = {
          id: '_measure_preview',
          startPt: measureStartRef.current,
          endPt: measurePreviewRef.current,
          page: pageNum,
        }
        drawMeasurement(ctx, preview, RENDER_SCALE, calibration, false)
      }
    }

    // Committed measurements for this page
    const pageMeasurements = measurements[pageNum] || []
    for (const m of pageMeasurements) {
      drawMeasurement(ctx, m, RENDER_SCALE, calibration, m.id === selectedMeasureId)
    }
  }, [annotations, activeTool, selectedAnnId, color, strokeWidth, opacity, fontSize, measurements, calibration, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId, getAnnotation])

  const redrawAll = useCallback(() => {
    for (const pageNum of renderedPagesRef.current) {
      redrawPage(pageNum)
    }
  }, [redrawPage])

  // ── History management ───────────────────────────────

  const pushHistory = useCallback((next: PageAnnotations) => {
    const h = historyRef.current.slice(0, historyIdxRef.current + 1)
    h.push(structuredClone(next))
    if (h.length > MAX_HISTORY) h.shift()
    historyRef.current = h
    historyIdxRef.current = h.length - 1
    forceRender(v => v + 1)
  }, [])

  const commitAnnotation = useCallback((ann: Annotation, pageNum?: number) => {
    // Compute next from current annotations state (not functional updater) so that
    // pushHistory can be called OUTSIDE setAnnotations. React StrictMode double-invokes
    // state updaters — calling pushHistory inside would push twice and corrupt undo history.
    const page = pageNum ?? activePageRef.current
    const next = { ...annotations, [page]: [...(annotations[page] || []), ann] }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  const updateAnnotation = useCallback((id: string, update: Partial<Annotation>, pageNum?: number) => {
    // Same rationale as commitAnnotation: pushHistory outside to avoid StrictMode double-invoke.
    const page = pageNum ?? activePageRef.current
    const next = {
      ...annotations,
      [page]: (annotations[page] || []).map(a => a.id === id ? { ...a, ...update } : a),
    }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  // Updates an annotation without adding a history step — used for transient
  // changes during editing (e.g. auto-grow height) that should not be undoable.
  const updateAnnotationSilent = useCallback((id: string, update: Partial<Annotation>, pageNum?: number) => {
    const page = pageNum ?? activePageRef.current
    setAnnotations(prev => ({
      ...prev,
      [page]: (prev[page] || []).map(a => a.id === id ? { ...a, ...update } : a),
    }))
  }, [])

  const removeAnnotation = useCallback((id: string, pageNum?: number) => {
    // Same rationale as commitAnnotation: pushHistory outside to avoid StrictMode double-invoke.
    const page = pageNum ?? activePageRef.current
    const next = { ...annotations, [page]: (annotations[page] || []).filter(a => a.id !== id) }
    setAnnotations(next)
    pushHistory(next)
  }, [annotations, pushHistory])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    setAnnotations(structuredClone(historyRef.current[historyIdxRef.current]))
    forceRender(v => v + 1)
    setSelectedAnnId(null)
    setEditingTextId(null)
    requestAnimationFrame(() => redrawAll())
  }, [redrawAll])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    setAnnotations(structuredClone(historyRef.current[historyIdxRef.current]))
    forceRender(v => v + 1)
    setSelectedAnnId(null)
    setEditingTextId(null)
    requestAnimationFrame(() => redrawAll())
  }, [redrawAll])

  // ── Text editing ─────────────────────────────────────

  const commitTextEditing = useCallback((preserveSelection = true) => {
    if (!editingTextId) return
    const text = editingTextValue.trim()
    if (text) {
      lastCommittedTextRef.current = { id: editingTextId, text }
      updateAnnotation(editingTextId, { text })
      if (!preserveSelection) setSelectedAnnId(null)
    } else {
      removeAnnotation(editingTextId)
      setSelectedAnnId(null)
    }
    setEditingTextId(null)
    setEditingTextValue('')
  }, [editingTextId, editingTextValue, updateAnnotation, removeAnnotation])

  const navigateToPage = useCallback((page: number | ((p: number) => number)) => {
    if (editingTextId) commitTextEditing(false)
    const target = typeof page === 'function' ? page(currentPageRef.current) : page
    const clamped = Math.max(1, Math.min(pdfFileRef.current?.pageCount || 1, target))
    const refs = pageRefsMap.current.get(clamped)
    if (refs) {
      refs.container.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setCurrentPage(clamped)
  }, [editingTextId, commitTextEditing])

  const enterEditMode = useCallback((annId: string) => {
    // Clear pending blur timeout to prevent race condition
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    const page = activePageRef.current
    const ann = (annotations[page] || []).find(a => a.id === annId)
    if (!ann || (ann.type !== 'text' && ann.type !== 'callout')) return
    setEditingTextId(annId)
    // Use last committed text if re-entering the same annotation in the same tick (stale state workaround)
    const committed = lastCommittedTextRef.current
    const textValue = (committed && committed.id === annId) ? committed.text : (ann.text || '')
    setEditingTextValue(textValue)
    lastCommittedTextRef.current = null
    setSelectedAnnId(annId)
    // Sync formatting state from annotation
    setBold(ann.bold || false)
    setItalic(ann.italic || false)
    setUnderline(ann.underline || false)
    setStrikethrough(ann.strikethrough || false)
    setTextBgColor(ann.backgroundColor || null)
    setLineSpacing(ann.lineHeight || 1.3)
    setTextAlign(ann.textAlign || 'left')
    // Auto-focus textarea
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }))
  }, [annotations])

  // ── Fit to window ──────────────────────────────────

  const fitToWindow = useCallback(() => {
    if (!scrollRef.current || maxCanvasWidthRef.current === 0) return
    const containerW = scrollRef.current.clientWidth - 48
    const scaleW = containerW / maxCanvasWidthRef.current
    setZoom(Math.round(Math.max(0.25, Math.min(4.0, scaleW)) * 100) / 100)
  }, [])

  // ── Rotation ─────────────────────────────────────────

  const rotatePage = useCallback((delta: number) => {
    const page = activePageRef.current
    const oldRot = pageRotations[page] || 0
    const newRot = ((oldRot + delta) % 360 + 360) % 360
    if (oldRot === newRot) return

    // Compute original (0° rotation) page dimensions from pageDimsMap
    const dims = pageDimsMap.current.get(page) || { width: 0, height: 0 }
    const origW = (oldRot === 90 || oldRot === 270) ? dims.height : dims.width
    const origH = (oldRot === 90 || oldRot === 270) ? dims.width : dims.height

    // Transform annotations on this page to new rotation space
    const pageAnns = annotations[page]
    if (pageAnns && pageAnns.length > 0) {
      const tp = (p: Point) => rotatePoint(p, oldRot, newRot, origW, origH)
      const transformed = pageAnns.map(ann => {
        const newPoints = ann.points.map(tp)
        let newWidth = ann.width
        let newHeight = ann.height
        // For annotations with width/height, transform the bounding box corners
        if (ann.width !== undefined && ann.height !== undefined) {
          const tl = ann.points[0]
          const br = { x: tl.x + ann.width, y: tl.y + ann.height }
          const ttl = tp(tl)
          const tbr = tp(br)
          newPoints[0] = { x: Math.min(ttl.x, tbr.x), y: Math.min(ttl.y, tbr.y) }
          newWidth = Math.abs(tbr.x - ttl.x)
          newHeight = Math.abs(tbr.y - ttl.y)
        }
        const newRects = ann.rects?.map(r => {
          const rtl = tp({ x: r.x, y: r.y })
          const rbr = tp({ x: r.x + r.w, y: r.y + r.h })
          return { x: Math.min(rtl.x, rbr.x), y: Math.min(rtl.y, rbr.y), w: Math.abs(rbr.x - rtl.x), h: Math.abs(rbr.y - rtl.y) }
        })
        const newArrows = ann.arrows?.map(tp)
        return {
          ...ann, points: newPoints,
          ...(newWidth !== undefined ? { width: newWidth } : {}),
          ...(newHeight !== undefined ? { height: newHeight } : {}),
          ...(newRects ? { rects: newRects } : {}),
          ...(newArrows ? { arrows: newArrows } : {}),
        }
      })
      setAnnotations(prev => ({ ...prev, [page]: transformed }))
    }

    // Transform measurements on this page
    const pageMeas = measurements[page]
    if (pageMeas && pageMeas.length > 0) {
      const tp = (p: Point) => rotatePoint(p, oldRot, newRot, origW, origH)
      setMeasurements(prev => ({
        ...prev,
        [page]: pageMeas.map(m => ({ ...m, startPt: tp(m.startPt), endPt: tp(m.endPt) })),
      }))
    }

    // Clear text selection and in-progress state
    setSelectTextToolbar(null)
    selectTextStartRef.current = null
    selectTextRectsRef.current = []
    setSelectedAnnId(null)
    setSelectedMeasureId(null)

    setPageRotations(prev => ({ ...prev, [page]: newRot }))
    // Clear thumbnails for this page since it changed
    setThumbnails(prev => {
      const next = { ...prev }
      delete next[page]
      return next
    })
    loadingThumbs.current.delete(page)
    // Mark page as not rendered so it gets re-rendered with new rotation
    renderedPagesRef.current.delete(page)
    // Re-fetch dimensions — the dimsReady change will trigger the observer to re-render
    if (pdfFile) {
      getAllPageDimensions(pdfFile, RENDER_SCALE, { ...pageRotations, [page]: newRot }).then(allDims => {
        const newPageDims = allDims.get(page)
        if (newPageDims) {
          pageDimsMap.current.set(page, newPageDims)
          let maxW = 0
          for (const d of pageDimsMap.current.values()) {
            if (d.width > maxW) maxW = d.width
          }
          maxCanvasWidthRef.current = maxW
        }
        setDimsReady(v => v + 1)
      }).catch(() => {})
    }
  }, [pageRotations, annotations, measurements, pdfFile])

  // ── PDF loading ──────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    // Warn if there are unsaved annotations
    if (Object.values(annotations).some(a => a.length > 0)) {
      if (!confirm('You have unsaved annotations. Load a new PDF and discard them?')) return
    }
    setLoadError(null)
    try {
      const pdf = await loadPDFFile(file)
      setPdfFile(pdf)
      setCurrentPage(1)
      setAnnotations({})
      historyRef.current = [{}]
      historyIdxRef.current = 0
      setZoom(1.0)
      setThumbnails({})
      loadingThumbs.current.clear()
      setSelectedThumbPage(null)
      setPageRotations({})
      setSelectedAnnId(null)
      setEditingTextId(null)
      setMeasurements({})
      setCalibration({ pixelsPerUnit: null, unit: 'in' })
      setSelectedMeasureId(null)
      measureStartRef.current = null
      measurePreviewRef.current = null
      textItemsCacheRef.current = {}
      selectTextStartRef.current = null
      selectTextRectsRef.current = []
      setSelectTextToolbar(null)
      initialFitDoneRef.current = false
      // Clear multi-page refs
      pageRefsMap.current.clear()
      renderedPagesRef.current.clear()
      activePageRef.current = 1
      // Compute page dimensions for all pages
      const dims = await getAllPageDimensions(pdf, RENDER_SCALE)
      pageDimsMap.current = dims
      let maxW = 0
      for (const d of dims.values()) {
        if (d.width > maxW) maxW = d.width
      }
      maxCanvasWidthRef.current = maxW
      setDimsReady(v => v + 1)

      // Restore session if file matches
      const session = loadSession()
      if (session?.version === 1 && session.file.fileName === file.name && session.file.fileSize === file.size) {
        setAnnotations(session.annotations as PageAnnotations)
        setMeasurements(session.measurements as Record<number, Measurement[]>)
        setPageRotations(session.pageRotations)
        setCalibration(session.calibration as CalibrationState)
        setZoom(session.zoom)
        setCurrentPage(session.currentPage)
        setColor(session.color)
        setFontSize(session.fontSize)
        setFontFamily(session.fontFamily)
        setStrokeWidth(session.strokeWidth)
        setOpacity(session.opacity)
        setActiveTool(session.activeTool as ToolType)
        setBold(session.bold)
        setItalic(session.italic)
        setUnderline(session.underline)
        setStrikethrough(session.strikethrough)
        setTextAlign(session.textAlign as 'left' | 'center' | 'right')
        setTextBgColor(session.textBgColor)
        setLineSpacing(session.lineSpacing)
        setEraserRadius(session.eraserRadius)
        setEraserMode(session.eraserMode as 'partial' | 'object')
        setActiveHighlight(session.activeHighlight as 'highlighter' | 'textHighlight' | 'textStrikethrough')
        setActiveDraw(session.activeDraw as ToolType)
        setActiveText(session.activeText as ToolType)
        historyRef.current = [structuredClone(session.annotations as PageAnnotations)]
        historyIdxRef.current = 0
        pendingScrollRef.current = { scrollTop: session.scrollTop, scrollLeft: session.scrollLeft }
        restoringSessionRef.current = true
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setLoadError(`Failed to load PDF: ${msg}`)
    }
  }, [annotations])

  // ── Warn before closing & flush session ─────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.values(annotations).some(a => a.length > 0)) {
        e.preventDefault()
      }
      const f = pdfFileRef.current
      if (f) {
        const el = scrollRef.current
        saveSession({
          version: 1,
          file: { fileName: f.name, fileSize: f.size },
          annotations, measurements, pageRotations, calibration,
          zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
          color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
          bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
          eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
        } satisfies PdfAnnotateSession)
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [annotations, measurements, pageRotations, calibration,
      zoom, currentPage, color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      eraserRadius, eraserMode, activeHighlight, activeDraw, activeText])

  // ── Debounced session save ─────────────────────────
  useEffect(() => {
    if (!pdfFile) return
    const timer = setTimeout(() => {
      const el = scrollRef.current
      saveSession({
        version: 1,
        file: { fileName: pdfFile.name, fileSize: pdfFile.size },
        annotations, measurements, pageRotations, calibration,
        zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
        color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
        bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
        eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
      } satisfies PdfAnnotateSession)
    }, 1500)
    return () => clearTimeout(timer)
  }, [pdfFile, annotations, measurements, pageRotations, calibration, zoom, currentPage,
      color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      eraserRadius, eraserMode, activeHighlight, activeDraw, activeText])

  // ── Thumbnail loading ────────────────────────────────

  const loadThumbnail = useCallback(async (pageNum: number) => {
    if (loadingThumbs.current.has(pageNum) || !pdfFile) return
    loadingThumbs.current.add(pageNum)
    try {
      const thumb = await generateThumbnail(pdfFile, pageNum, 300)
      setThumbnails(prev => ({ ...prev, [pageNum]: thumb }))
    } catch {
      loadingThumbs.current.delete(pageNum)
    }
  }, [pdfFile])

  // ── Render pages via IntersectionObserver + scroll tracking ──

  const renderSinglePage = useCallback(async (pageNum: number) => {
    if (!pdfFile || renderedPagesRef.current.has(pageNum)) return
    const refs = pageRefsMap.current.get(pageNum)
    if (!refs) return
    renderedPagesRef.current.add(pageNum)
    try {
      const rotation = pageRotationsRef.current[pageNum] || 0
      await renderPageToCanvas(pdfFile, pageNum, refs.pdfCanvas, RENDER_SCALE, rotation)
      refs.annCanvas.width = refs.pdfCanvas.width
      refs.annCanvas.height = refs.pdfCanvas.height
      redrawPage(pageNum)
    } catch {
      renderedPagesRef.current.delete(pageNum)
    }
  }, [pdfFile, redrawPage])

  // Set up IntersectionObserver once dims are ready
  useEffect(() => {
    if (!pdfFile || pageDimsMap.current.size === 0) return
    // Clean up previous observer
    if (observerRef.current) observerRef.current.disconnect()

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.page)
            if (pageNum && !renderedPagesRef.current.has(pageNum)) {
              renderSinglePage(pageNum)
            }
          }
        }
      },
      { root: scrollRef.current, rootMargin: '1000px 0px' },
    )
    observerRef.current = obs

    // Observe all page containers
    for (const [, refs] of pageRefsMap.current) {
      obs.observe(refs.container)
    }

    // Restore scroll from session or fit to window on initial load only
    if (restoringSessionRef.current) {
      restoringSessionRef.current = false
      initialFitDoneRef.current = true
      setTimeout(() => {
        const el = scrollRef.current
        const pending = pendingScrollRef.current
        if (el && pending) {
          el.scrollTop = pending.scrollTop
          el.scrollLeft = pending.scrollLeft
          pendingScrollRef.current = null
        }
      }, 150)
    } else if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true
      requestAnimationFrame(() => fitToWindow())
    }

    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, dimsReady, renderSinglePage, fitToWindow])

  // Scroll-based currentPage tracking
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pdfFile) return
    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const scrollRect = el.getBoundingClientRect()
        const viewCenterY = scrollRect.top + scrollRect.height / 2
        let closest = currentPageRef.current
        let minDist = Infinity
        for (const [pageNum, refs] of pageRefsMap.current) {
          const rect = refs.container.getBoundingClientRect()
          const pageCenterY = rect.top + rect.height / 2
          const dist = Math.abs(pageCenterY - viewCenterY)
          if (dist < minDist) { minDist = dist; closest = pageNum }
        }
        if (closest !== currentPageRef.current) {
          setCurrentPage(closest)
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [pdfFile, dimsReady])

  // ── Re-render annotations ────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawAll() }, [annotations, selectedAnnId, measurements, calibration, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId])

  // ── Zoom at viewport center ─────────────────────────

  const zoomAtCenter = useCallback((newZoom: number) => {
    const el = scrollRef.current
    if (!el) { setZoom(newZoom); return }
    const oldZoom = zoomRef.current
    if (newZoom === oldZoom) return
    const centerX = el.clientWidth / 2
    const centerY = el.clientHeight / 2
    const contentX = (el.scrollLeft + centerX) / oldZoom
    const contentY = (el.scrollTop + centerY) / oldZoom
    setZoom(newZoom)
    requestAnimationFrame(() => {
      el.scrollLeft = contentX * newZoom - centerX
      el.scrollTop = contentY * newZoom - centerY
    })
  }, [])

  // ── Keyboard shortcuts ───────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // ── Ctrl+B/I/U while editing text ──
      if (editingTextId && mod) {
        const k = e.key.toLowerCase()
        if (k === 'b' || k === 'i' || k === 'u') {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === editingTextId)
          if (!ann) return
          const ta = textareaRef.current
          const selStart = ta?.selectionStart ?? 0
          const selEnd = ta?.selectionEnd ?? 0
          if (k === 'b') { const v = !ann.bold; setBold(v); updateAnnotation(editingTextId, { bold: v }) }
          if (k === 'i') { const v = !ann.italic; setItalic(v); updateAnnotation(editingTextId, { italic: v }) }
          if (k === 'u') { const v = !ann.underline; setUnderline(v); updateAnnotation(editingTextId, { underline: v }) }
          requestAnimationFrame(() => {
            textareaRef.current?.focus({ preventScroll: true })
            textareaRef.current?.setSelectionRange(selStart, selEnd)
          })
          return
        }
        if (k === 'x' && e.shiftKey) {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === editingTextId)
          if (!ann) return
          const ta = textareaRef.current
          const selStart = ta?.selectionStart ?? 0
          const selEnd = ta?.selectionEnd ?? 0
          const v = !ann.strikethrough; setStrikethrough(v); updateAnnotation(editingTextId, { strikethrough: v })
          requestAnimationFrame(() => {
            textareaRef.current?.focus({ preventScroll: true })
            textareaRef.current?.setSelectionRange(selStart, selEnd)
          })
          return
        }
      }
      if (editingTextId) return // Don't intercept other keys while editing text

      // ── Escape: context-dependent ──
      if (e.key === 'Escape') {
        e.preventDefault()
        // Clear text selection toolbar
        if (selectTextToolbar) {
          setSelectTextToolbar(null); selectTextStartRef.current = null; selectTextRectsRef.current = []; redrawAll(); return
        }
        // Cancel in-progress measurement
        if (activeTool === 'measure' && measureStartRef.current) {
          measureStartRef.current = null; measurePreviewRef.current = null; redrawAll(); return
        }
        // Cancel in-progress cloud polygon
        if (activeTool === 'cloud' && currentPtsRef.current.length > 0) {
          currentPtsRef.current = []; cloudPreviewRef.current = null; redrawAll(); return
        }
        // Two-step: if selected, deselect
        if (selectedAnnId) { setSelectedAnnId(null); return }
        if (selectedMeasureId) { setSelectedMeasureId(null); return }
        return
      }

      // ── Undo/Redo ──
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (mod && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return }
      if (mod && e.key === 'y') { e.preventDefault(); redo(); return }

      // ── Delete ──
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Cloud tool: Backspace to undo last vertex
        if (e.key === 'Backspace' && activeTool === 'cloud' && currentPtsRef.current.length > 0) {
          e.preventDefault()
          currentPtsRef.current.pop()
          redrawPage(activePageRef.current)
          return
        }
        if (selectedMeasureId) {
          e.preventDefault()
          setMeasurements(prev => {
            const updated = { ...prev }
            for (const [page, list] of Object.entries(updated)) {
              updated[Number(page)] = list.filter(m => m.id !== selectedMeasureId)
            }
            return updated
          })
          setSelectedMeasureId(null)
          return
        }
        // Delete individual callout arrow
        if (selectedArrowIdx !== null && selectedAnnId) {
          e.preventDefault()
          const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
          if (ann && ann.arrows && selectedArrowIdx < ann.arrows.length) {
            const newArrows = ann.arrows.filter((_, i) => i !== selectedArrowIdx)
            updateAnnotation(selectedAnnId, { arrows: newArrows })
            setSelectedArrowIdx(null)
          }
          return
        }
        if (selectedAnnId) {
          e.preventDefault()
          removeAnnotation(selectedAnnId)
          setSelectedAnnId(null)
          setSelectedArrowIdx(null)
          addToast({ type: 'info', message: 'Annotation deleted' })
          return
        }
      }

      // ── Ctrl+D: Duplicate selected annotation ──
      if (mod && e.key === 'd' && selectedAnnId) {
        e.preventDefault()
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) {
          const dup: Annotation = {
            ...structuredClone(ann),
            id: genId(),
            points: ann.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
            arrows: ann.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          }
          commitAnnotation(dup)
          setSelectedAnnId(dup.id)
        }
        return
      }

      // ── Ctrl+C: Copy selected annotation ──
      if (mod && e.key === 'c' && selectedAnnId) {
        e.preventDefault()
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) clipboardRef.current = structuredClone(ann)
        return
      }

      // ── Ctrl+V: Paste annotation from clipboard ──
      if (mod && e.key === 'v' && clipboardRef.current) {
        e.preventDefault()
        const src = clipboardRef.current
        const pasted: Annotation = {
          ...structuredClone(src),
          id: genId(),
          points: src.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          arrows: src.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
        }
        commitAnnotation(pasted)
        setSelectedAnnId(pasted.id)
        return
      }

      // ── Arrow key nudge ──
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedAnnId) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const ann = (annotations[activePageRef.current] || []).find(a => a.id === selectedAnnId)
        if (ann) {
          updateAnnotation(selectedAnnId, {
            points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
            arrows: ann.arrows?.map(p => ({ x: p.x + dx, y: p.y + dy })),
          })
        }
        return
      }

      // ── Tab / Shift+Tab: cycle through text/callout boxes ──
      if (e.key === 'Tab') {
        const textAnns = (annotations[activePageRef.current] || []).filter(a => a.type === 'text' || a.type === 'callout')
        if (textAnns.length > 0) {
          e.preventDefault()
          const curIdx = selectedAnnId ? textAnns.findIndex(a => a.id === selectedAnnId) : -1
          const next = e.shiftKey
            ? (curIdx <= 0 ? textAnns.length - 1 : curIdx - 1)
            : (curIdx >= textAnns.length - 1 ? 0 : curIdx + 1)
          setSelectedAnnId(textAnns[next].id)
        }
        return
      }

      // ── Zoom shortcuts ──
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.min(4.0, zoomRef.current + 0.25) * 100) / 100)
        return
      }
      if (mod && e.key === '-') {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.max(0.25, zoomRef.current - 0.25) * 100) / 100)
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        fitToWindow()
        return
      }

      // ── Page navigation ──
      if (e.key === 'PageDown') {
        e.preventDefault()
        navigateToPage(p => Math.min(pdfFileRef.current?.pageCount || p, p + 1))
        return
      }
      if (e.key === 'PageUp') {
        e.preventDefault()
        navigateToPage(p => Math.max(1, p - 1))
        return
      }

      // ── Shift+H: text highlight tool ──
      if (e.shiftKey && !mod && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setActiveTool('textHighlight')
        setActiveHighlight('textHighlight')
        return
      }

      // ── Shift+X: text strikethrough tool ──
      if (e.shiftKey && !mod && !e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        setActiveTool('textStrikethrough')
        setActiveHighlight('textStrikethrough')
        return
      }

      // ── Space: temporary pan mode ──
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        spaceHeldRef.current = true
        setCanvasCursor('grab')
        return
      }

      // ── Ctrl+]: Bring to front ──
      if (mod && e.key === ']' && selectedAnnId) {
        e.preventDefault()
        const ap = activePageRef.current
        const pageAnns = annotations[ap] || []
        const idx = pageAnns.findIndex(a => a.id === selectedAnnId)
        if (idx >= 0 && idx < pageAnns.length - 1) {
          const next = [...pageAnns]
          const [item] = next.splice(idx, 1)
          next.push(item)
          const result = { ...annotations, [ap]: next }
          setAnnotations(result)
          pushHistory(result)
        }
        return
      }

      // ── Ctrl+[: Send to back ──
      if (mod && e.key === '[' && selectedAnnId) {
        e.preventDefault()
        const ap = activePageRef.current
        const pageAnns = annotations[ap] || []
        const idx = pageAnns.findIndex(a => a.id === selectedAnnId)
        if (idx > 0) {
          const next = [...pageAnns]
          const [item] = next.splice(idx, 1)
          next.unshift(item)
          const result = { ...annotations, [ap]: next }
          setAnnotations(result)
          pushHistory(result)
        }
        return
      }

      // ── F: Fit to page ──
      if (!mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        fitToWindow()
        return
      }

      // ── +/-: Zoom without modifier (10% steps) ──
      if (!mod && !e.shiftKey && !e.altKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.min(4.0, zoomRef.current + 0.1) * 100) / 100)
        return
      }
      if (!mod && !e.shiftKey && !e.altKey && e.key === '-') {
        e.preventDefault()
        zoomAtCenter(Math.round(Math.max(0.25, zoomRef.current - 0.1) * 100) / 100)
        return
      }

      // ── Single-letter tool switching (no modifier) ──
      if (!mod && !e.shiftKey && !e.altKey) {
        const toolMap: Record<string, ToolType> = {
          s: 'select', p: 'pencil', l: 'line', a: 'arrow', r: 'rectangle', c: 'circle', k: 'cloud',
          t: 'text', o: 'callout', e: 'eraser', h: 'highlighter', m: 'measure',
        }
        const mapped = toolMap[e.key.toLowerCase()]
        if (mapped) {
          e.preventDefault()
          setActiveTool(mapped)
          if (DRAW_TYPES.has(mapped)) setActiveDraw(mapped)
          if (TEXT_TYPES.has(mapped)) setActiveText(mapped)
          if (mapped === 'highlighter') setActiveHighlight('highlighter')
          return
        }
      }
    }
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceHeldRef.current = false
        panRef.current = null
        setCanvasCursor(null)
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', keyUpHandler)
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', keyUpHandler) }
  }, [undo, redo, selectedAnnId, editingTextId, removeAnnotation, activeTool, selectedMeasureId,
      redrawAll, redrawPage, annotations, commitAnnotation, updateAnnotation, fitToWindow, selectedArrowIdx, navigateToPage, selectTextToolbar, zoomAtCenter, pushHistory, addToast])

  // ── Zoom with scroll wheel (cursor-position) ────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      const oldZoom = zoomRef.current
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.round(Math.max(0.25, Math.min(4.0, oldZoom + delta)) * 100) / 100
      if (newZoom === oldZoom) return
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const contentX = (el.scrollLeft + cursorX) / oldZoom
      const contentY = (el.scrollTop + cursorY) / oldZoom
      setZoom(newZoom)
      requestAnimationFrame(() => {
        el.scrollLeft = contentX * newZoom - cursorX
        el.scrollTop = contentY * newZoom - cursorY
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Middle-mouse pan ────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: PointerEvent) => {
      if (!panRef.current) return
      el.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
      el.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
    }
    const onUp = () => {
      if (!panRef.current) return
      panRef.current = null
      el.style.cursor = ''
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ── Clear in-progress when tool changes ──────────────

  useEffect(() => {
    isDrawingRef.current = false
    currentPtsRef.current = []
    eraserModsRef.current = { removed: new Set(), added: [] }
    calloutArrowDragRef.current = null
    generalDragRef.current = null
    cloudPreviewRef.current = null
    cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
    measureStartRef.current = null
    measurePreviewRef.current = null
    setStraightLineMode(false)
    setEraserCursorPos(null)
    setSelectedAnnId(null)
    setSelectedArrowIdx(null)
    setSelectedMeasureId(null)
    textHighlightStartRef.current = null
    textHighlightPreviewRectsRef.current = []
    selectTextStartRef.current = null
    selectTextRectsRef.current = []
    setSelectTextToolbar(null)
    // Highlighter: default to yellow if color is the app default
    if ((activeTool === 'highlighter' || activeTool === 'textHighlight') && color === '#F47B20') setColor('#FFFF00')
    // Text/callout: default to black if color is the app default
    if ((activeTool === 'text' || activeTool === 'callout') && color === '#F47B20') setColor('#000000')
    // Text strikethrough: default to red
    if (activeTool === 'textStrikethrough' && (color === '#F47B20' || color === '#FFFF00')) setColor('#FF0000')
    if (editingTextId) {
      // Commit any open text edit
      commitTextEditing()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  // ── Close shapes dropdown on outside click ───────────

  useEffect(() => {
    if (!shapesDropdownOpen) return
    const handler = (e: PointerEvent) => {
      if (shapesDropdownRef.current && !shapesDropdownRef.current.contains(e.target as Node)) {
        setShapesDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [shapesDropdownOpen])

  // ── Close text dropdown on outside click ──────────────

  useEffect(() => {
    if (!textDropdownOpen) return
    const handler = (e: PointerEvent) => {
      if (textDropdownRef.current && !textDropdownRef.current.contains(e.target as Node)) {
        setTextDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [textDropdownOpen])

  // ── Close zoom dropdown on outside click ──────────────

  useEffect(() => {
    if (!zoomDropdownOpen) return
    const handler = (e: PointerEvent) => {
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target as Node)) {
        setZoomDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [zoomDropdownOpen])

  // ── Cache text items for text highlight ───────────────

  useEffect(() => {
    if (!pdfFile || (activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'select')) return
    // Cache text items for all rendered pages
    for (const pageNum of renderedPagesRef.current) {
      const rotation = pageRotations[pageNum] || 0
      const cacheKey = `${pageNum}_${rotation}`
      if (textItemsCacheRef.current[cacheKey]) continue
      extractPositionedText(pdfFile, pageNum, rotation).then(result => {
        textItemsCacheRef.current[cacheKey] = result.items
      }).catch(() => {})
    }
  }, [pdfFile, activeTool, pageRotations, dimsReady])

  // ── Focus textarea when editing ──────────────────────

  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true })
      // Place cursor at end
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editingTextId])

  // ── Close text selection toolbar on scroll ──────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !selectTextToolbar) return
    const handler = () => { setSelectTextToolbar(null); redrawAll() }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [selectTextToolbar, redrawAll])

  // ── Pointer handlers ─────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent, pageNum: number) => {
    if (e.button !== 0) return
    // Space-to-pan: start panning instead of tool action
    if (spaceHeldRef.current) {
      const el = scrollRef.current
      if (el) {
        panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
        setCanvasCursor('grabbing')
      }
      return
    }
    activePageRef.current = pageNum
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getPointForPage(pageNum, e)

    // Manual double-click detection (pointerdown.detail is always 0 in Chromium)
    const now = Date.now()
    const dblLast = dblClickRef.current
    const isDoubleClick = (now - dblLast.time) < 400 && Math.hypot(pt.x - dblLast.pt.x, pt.y - dblLast.pt.y) < 20
    dblClickRef.current = { time: now, pt }

    // ── Measure tool: click-click placement ──
    if (activeTool === 'measure') {
      // First: check if clicking an existing measurement's label → open calibration
      const pageMeas = measurements[pageNum] || []
      for (const m of pageMeas) {
        if (hitTestMeasurementLabel(pt, m, 20)) {
          setSelectedMeasureId(m.id)
          setCalibrateMeasureId(m.id)
          setCalibrateValue('')
          setCalibrateModalOpen(true)
          return
        }
      }

      // Check if clicking near an existing endpoint → start dragging it
      const endpointThreshold = 10 / zoom
      for (const m of pageMeas) {
        const dStart = Math.hypot(pt.x - m.startPt.x, pt.y - m.startPt.y)
        const dEnd = Math.hypot(pt.x - m.endPt.x, pt.y - m.endPt.y)
        if (dStart < endpointThreshold) {
          setSelectedMeasureId(m.id)
          measureStartRef.current = m.endPt
          measurePreviewRef.current = m.startPt
          setMeasurements(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).filter(ms => ms.id !== m.id),
          }))
          return
        }
        if (dEnd < endpointThreshold) {
          setSelectedMeasureId(m.id)
          measureStartRef.current = m.startPt
          measurePreviewRef.current = m.endPt
          setMeasurements(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).filter(ms => ms.id !== m.id),
          }))
          return
        }
      }

      if (measureStartRef.current) {
        // Second click: snap end point and create measurement
        const annCanvas = pageRefsMap.current.get(pageNum)?.annCanvas
        const snapped = annCanvas
          ? snapToContent(pt, measureStartRef.current, annCanvas, 30, 3)
          : pt
        const m: Measurement = {
          id: crypto.randomUUID(),
          startPt: measureStartRef.current,
          endPt: snapped,
          page: pageNum,
        }
        setMeasurements(prev => ({
          ...prev,
          [pageNum]: [...(prev[pageNum] || []), m],
        }))
        setSelectedMeasureId(m.id)
        measureStartRef.current = null
        measurePreviewRef.current = null
        redrawPage(pageNum)
      } else {
        // First click: store start point
        measureStartRef.current = pt
        measurePreviewRef.current = pt
        setSelectedMeasureId(null)
      }
      return
    }

    // ── Select tool ──
    if (activeTool === 'select') {
      // If editing text, commit first
      if (editingTextId) commitTextEditing()

      // Check resize handles on selected text/callout
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && (ann.type === 'text' || ann.type === 'callout') && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              mode: handle, startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
              origArrows: ann.arrows ? [...ann.arrows] : undefined,
            }
            return
          }
        }
      }

      // Hit-test all annotations
      const hitAnn = findAnnotationAt(pt)
      if (hitAnn) {
        setSelectedAnnId(hitAnn.id)
        // Sync properties bar to selected annotation
        setColor(hitAnn.color)
        setStrokeWidth(hitAnn.strokeWidth)
        setOpacity(Math.round(hitAnn.opacity * 100))
        if (hitAnn.type === 'text' || hitAnn.type === 'callout') {
          setFontFamily(hitAnn.fontFamily || 'Arial')
          setFontSize(hitAnn.fontSize || 16)
          setBold(hitAnn.bold || false)
          setItalic(hitAnn.italic || false)
          setUnderline(hitAnn.underline || false)
          setStrikethrough(hitAnn.strikethrough || false)
          setTextBgColor(hitAnn.backgroundColor || null)
          setLineSpacing(hitAnn.lineHeight || 1.3)
          setTextAlign(hitAnn.textAlign || 'left')
        }
        // Double-click text/callout -> edit mode
        if ((hitAnn.type === 'text' || hitAnn.type === 'callout') && isDoubleClick) {
          enterEditMode(hitAnn.id)
        }
        // Start move drag for text/callout
        if ((hitAnn.type === 'text' || hitAnn.type === 'callout') && hitAnn.width && hitAnn.height) {
          isDrawingRef.current = true
          textDragRef.current = {
            mode: 'move', startPt: pt,
            origPoints: [...hitAnn.points], origWidth: hitAnn.width, origHeight: hitAnn.height,
            origArrows: hitAnn.arrows ? [...hitAnn.arrows] : undefined,
          }
        } else if (hitAnn.type !== 'text' && hitAnn.type !== 'callout') {
          // For non-text annotations, start general move drag
          isDrawingRef.current = true
          generalDragRef.current = {
            annId: hitAnn.id, startPt: pt, origPoints: [...hitAnn.points],
          }
        }
        return
      }

      // Check if click point is on embedded PDF text → start text selection drag
      setSelectTextToolbar(null)
      const currentRotation = pageRotationsRef.current[pageNum] || 0
      const cacheKey = `${pageNum}_${currentRotation}`
      const textItems = textItemsCacheRef.current[cacheKey] || []
      if (textItems.length > 0 && isPointInAnyTextItem(pt, textItems)) {
        isDrawingRef.current = true
        selectTextStartRef.current = pt
        selectTextRectsRef.current = []
        setSelectedAnnId(null)
        return
      }

      // Click empty space -> deselect
      setSelectedAnnId(null)
      return
    }

    // ── Cloud tool: click-to-place vertices ──
    if (activeTool === 'cloud') {
      const now = Date.now()
      const last = cloudLastClickRef.current
      const isDbl = (now - last.time) < 400 && Math.hypot(pt.x - last.pt.x, pt.y - last.pt.y) < 20
      cloudLastClickRef.current = { time: now, pt }

      // Double-click: finalize polygon if we have enough vertices
      if (isDbl && currentPtsRef.current.length >= 3) {
        const pts = [...currentPtsRef.current]
        const ann: Annotation = {
          id: genId(), type: 'cloud',
          points: pts, color, strokeWidth, opacity: opacity / 100, fontSize,
        }
        commitAnnotation(ann)
        currentPtsRef.current = []
        cloudPreviewRef.current = null
        cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
        redrawPage(pageNum)
        return
      }
      // Single click: add vertex
      currentPtsRef.current.push(pt)
      cloudPreviewRef.current = pt
      redrawPage(pageNum)
      return
    }

    // ── Callout tool ──
    if (activeTool === 'callout') {
      if (editingTextId) commitTextEditing()

      // Check resize handles on selected callout
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout' && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              mode: handle, startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
            }
            return
          }

          // Click inside box → double-click to edit, single-click allows drag
          if (hitTestCalloutBox(pt, ann)) {
            if (isDoubleClick) {
              enterEditMode(ann.id)
            }
            setSelectedArrowIdx(null)
            isDrawingRef.current = true
            textDragRef.current = {
              mode: 'move', startPt: pt,
              origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
              origArrows: ann.arrows ? [...ann.arrows] : undefined,
            }
            return
          }

          // Check if clicking near an existing arrow tip → select or drag it
          if (ann.arrows && ann.arrows.length > 0) {
            const arrowThreshold = 10 / zoom
            for (let ai = 0; ai < ann.arrows.length; ai++) {
              if (Math.hypot(pt.x - ann.arrows[ai].x, pt.y - ann.arrows[ai].y) < arrowThreshold) {
                setSelectedArrowIdx(ai)
                isDrawingRef.current = true
                calloutArrowDragRef.current = { tipPt: pt, arrowIdx: ai }
                redrawPage(pageNum)
                return
              }
            }
          }

          // Click outside box → start new arrow drag
          setSelectedArrowIdx(null)
          isDrawingRef.current = true
          calloutArrowDragRef.current = { tipPt: pt }
          redrawPage(pageNum)
          return
        }
      }

      // Check if clicking on an existing callout
      const hitCallout = findCalloutAt(pt)
      if (hitCallout) {
        if (hitCallout.id !== selectedAnnId) {
          setSelectedAnnId(hitCallout.id)
        }
        // Double-click → edit mode; single-click → allow drag
        if (isDoubleClick) {
          enterEditMode(hitCallout.id)
        }
        if (hitCallout.width && hitCallout.height) {
          isDrawingRef.current = true
          textDragRef.current = {
            mode: 'move', startPt: pt,
            origPoints: [...hitCallout.points], origWidth: hitCallout.width, origHeight: hitCallout.height,
            origArrows: hitCallout.arrows ? [...hitCallout.arrows] : undefined,
          }
        }
        return
      }

      // Empty space → start creating new callout box
      setSelectedAnnId(null)
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
      return
    }

    // ── Text tool: PowerPoint-style ──
    if (activeTool === 'text') {
      // If editing, commit first
      if (editingTextId) {
        commitTextEditing()
      }

      // Check if clicking a resize handle on selected annotation
      if (selectedAnnId) {
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'text' && ann.width && ann.height) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(pt, ann, handleThreshold)
          if (handle) {
            isDrawingRef.current = true
            textDragRef.current = {
              mode: handle,
              startPt: pt,
              origPoints: [...ann.points],
              origWidth: ann.width,
              origHeight: ann.height,
            }
            return
          }

          // Check if clicking inside the selected textbox
          if (hitTest(pt, ann, 4)) {
            // Single-click on already-selected text → enter edit mode directly
            enterEditMode(ann.id)
            return
          }
        }
      }

      // Check if clicking on an existing text annotation
      const hitAnn = findTextAnnotationAt(pt)
      if (hitAnn) {
        if (hitAnn.id !== selectedAnnId) {
          setSelectedAnnId(hitAnn.id)
        }
        // Double-click → edit mode; single-click → allow drag
        if (isDoubleClick) {
          enterEditMode(hitAnn.id)
        }
        // Start move drag
        if (hitAnn.width && hitAnn.height) {
          isDrawingRef.current = true
          textDragRef.current = {
            mode: 'move',
            startPt: pt,
            origPoints: [...hitAnn.points],
            origWidth: hitAnn.width,
            origHeight: hitAnn.height,
          }
        }
        return
      }

      // Click on empty space — deselect or start creating textbox
      setSelectedAnnId(null)
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
      return
    }

    // ── Text Highlight / Strikethrough tool: click-drag selection ──
    if (activeTool === 'textHighlight' || activeTool === 'textStrikethrough') {
      isDrawingRef.current = true
      textHighlightStartRef.current = pt
      textHighlightPreviewRectsRef.current = []
      return
    }

    // ── Click-to-select (only for non-drawing tools) ──
    if (!DRAW_TYPES.has(activeTool) && activeTool !== 'eraser' && activeTool !== 'highlighter') {
      const hitAny = findAnnotationAt(pt)
      if (hitAny) {
        setSelectedAnnId(hitAny.id)
        // Sync properties bar to selected annotation
        setColor(hitAny.color)
        setStrokeWidth(hitAny.strokeWidth)
        setOpacity(Math.round(hitAny.opacity * 100))
        if (hitAny.type === 'text' || hitAny.type === 'callout') {
          setFontFamily(hitAny.fontFamily || 'Arial')
          setFontSize(hitAny.fontSize || 16)
          setBold(hitAny.bold || false)
          setItalic(hitAny.italic || false)
          setUnderline(hitAny.underline || false)
          setStrikethrough(hitAny.strikethrough || false)
          setTextBgColor(hitAny.backgroundColor || null)
          setLineSpacing(hitAny.lineHeight || 1.3)
          setTextAlign(hitAny.textAlign || 'left')
        }
        // Double-click text/callout → edit mode
        if ((hitAny.type === 'text' || hitAny.type === 'callout') && isDoubleClick) {
          enterEditMode(hitAny.id)
        }
        return
      }
      setSelectedAnnId(null)
    }

    isDrawingRef.current = true

    if (activeTool === 'eraser') {
      eraserModsRef.current = { removed: new Set(), added: [] }
      const docRadius = eraserRadius / (zoom * RENDER_SCALE)
      const pageAnns = annotations[pageNum] || []
      for (const ann of pageAnns) {
        if (eraserMode === 'object') {
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) eraserModsRef.current.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            eraserModsRef.current.removed.add(ann.id)
          }
        } else {
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            const hasHit = pathHitsCircle(ann.points, pt, effectiveR)
            if (hasHit) {
              eraserModsRef.current.removed.add(ann.id)
              eraserModsRef.current.added.push(...splitPathByEraser(ann, pt, effectiveR))
            }
          } else if (ann.type === 'text' || ann.type === 'callout') {
            if (hitTest(pt, ann, docRadius)) eraserModsRef.current.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            if (ann.rects) {
              eraserModsRef.current.removed.add(ann.id)
            } else {
              const polyline = shapeToPolyline(ann)
              const effectiveR = docRadius + ann.strokeWidth / 2
              const tempAnn: Annotation = { ...ann, type: 'pencil', points: polyline, smooth: false }
              eraserModsRef.current.removed.add(ann.id)
              eraserModsRef.current.added.push(...splitPathByEraser(tempAnn, pt, effectiveR))
            }
          }
        }
      }
      redrawPage(pageNum)
      return
    }

    currentPtsRef.current = [pt]
    redrawPage(pageNum)
  }, [getPointForPage, activeTool, annotations, editingTextId, selectedAnnId, selectTextToolbar,
      commitTextEditing, commitAnnotation, getAnnotation, findTextAnnotationAt, findCalloutAt, findAnnotationAt, enterEditMode, redrawPage,
      eraserRadius, eraserMode, zoom, color, strokeWidth, fontSize, opacity, fontFamily, bold, italic, underline, textAlign])

  const handlePointerMove = useCallback((e: React.PointerEvent, pageNum: number) => {
    // Space-to-pan: scroll viewport
    if (spaceHeldRef.current && panRef.current) {
      const el = scrollRef.current
      if (el) {
        el.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.startX)
        el.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.startY)
      }
      return
    }
    // Use active page for drawing operations (pointer capture keeps events on starting page)
    const ap = activePageRef.current
    // Eraser cursor
    if (activeTool === 'eraser') {
      const annCanvas = pageRefsMap.current.get(pageNum)?.annCanvas
      if (annCanvas) {
        const rect = annCanvas.getBoundingClientRect()
        setEraserCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    }

    // Measure tool: track cursor for preview line
    if (activeTool === 'measure' && measureStartRef.current) {
      measurePreviewRef.current = getPointForPage(ap, e)
      redrawPage(ap)
      return
    }

    // Cloud polygon: track cursor for preview
    if (activeTool === 'cloud' && currentPtsRef.current.length > 0) {
      cloudPreviewRef.current = getPointForPage(ap, e)
      redrawPage(ap)
      return
    }

    // ── Cursor tracking for handles/annotations ──
    if (!isDrawingRef.current && (activeTool === 'text' || activeTool === 'callout')) {
      const hoverPt = getPointForPage(pageNum, e)
      if (selectedAnnId) {
        const selAnn = (annotations[ap] || []).find(a => a.id === selectedAnnId)
        if (selAnn) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(hoverPt, selAnn, handleThreshold)
          if (handle) { setCanvasCursor(HANDLE_CURSOR_MAP[handle]); return }
          if (hitTest(hoverPt, selAnn, 4)) { setCanvasCursor('move'); return }
        }
      }
      // Check if hovering over any text/callout annotation
      const targetType = activeTool === 'text' ? 'text' : 'callout'
      const pageAnns = annotations[ap] || []
      for (let i = pageAnns.length - 1; i >= 0; i--) {
        if (pageAnns[i].type === targetType && hitTest(hoverPt, pageAnns[i], 4)) { setCanvasCursor('move'); return }
      }
      setCanvasCursor(null)
    }

    // ── Cursor tracking for select tool handles/annotations/text ──
    if (!isDrawingRef.current && activeTool === 'select') {
      const hoverPt = getPointForPage(pageNum, e)
      // 1. Check resize handles on selected annotation
      if (selectedAnnId) {
        const selAnn = (annotations[ap] || []).find(a => a.id === selectedAnnId)
        if (selAnn) {
          const handleThreshold = HANDLE_SIZE / zoom + 4
          const handle = hitTestHandle(hoverPt, selAnn, handleThreshold)
          if (handle) { setCanvasCursor(HANDLE_CURSOR_MAP[handle]); return }
          if (hitTest(hoverPt, selAnn, 4)) { setCanvasCursor('move'); return }
        }
      }
      // 2. Check if hovering over any annotation
      const hoveredAnn = findAnnotationAt(hoverPt, pageNum)
      setHoveredAnnId(hoveredAnn?.id ?? null)
      if (hoveredAnn) { setCanvasCursor('move'); return }
      // 3. Check if hovering over embedded PDF text → I-beam
      const currentRotation = pageRotationsRef.current[pageNum] || 0
      const cacheKey = `${pageNum}_${currentRotation}`
      const textItems = textItemsCacheRef.current[cacheKey] || []
      if (textItems.length > 0 && isPointInAnyTextItem(hoverPt, textItems)) {
        setCanvasCursor('text'); return
      }
      // 4. Default arrow
      setCanvasCursor(null)
    }

    if (!isDrawingRef.current) return
    const pt = getPointForPage(ap, e)

    // General drag (select tool: moving shapes)
    if (generalDragRef.current) {
      const drag = generalDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y
      const newPoints = drag.origPoints.map(p => ({ x: p.x + dx, y: p.y + dy }))
      setAnnotations(prev => ({
        ...prev,
        [ap]: (prev[ap] || []).map(a =>
          a.id === drag.annId ? { ...a, points: newPoints } : a
        ),
      }))
      redrawPage(ap)
      return
    }

    // Select tool: text/callout move/resize via textDragRef
    if (activeTool === 'select' && textDragRef.current) {
      const drag = textDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y
      if (drag.mode === 'move') {
        const movedArrows = drag.origArrows?.map(p => ({ x: p.x + dx, y: p.y + dy }))
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === selectedAnnId ? { ...a, points: [{ x: drag.origPoints[0].x + dx, y: drag.origPoints[0].y + dy }], ...(movedArrows ? { arrows: movedArrows } : {}) } : a
          ),
        }))
      } else {
        const { origPoints, origWidth, origHeight } = drag
        let newX = origPoints[0].x, newY = origPoints[0].y
        let newW = origWidth, newH = origHeight
        switch (drag.mode) {
          case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
          case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
          case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
          case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 's': newH = Math.max(20, origHeight + dy); break
          case 'e': newW = Math.max(40, origWidth + dx); break
          case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
        }
        // Auto-height for text/callout: recompute height based on content reflow
        if (selectedAnnId) {
          const ann = (annotations[ap] || []).find(a => a.id === selectedAnnId)
          if (ann && (ann.type === 'text' || ann.type === 'callout') && ann.text) {
            newH = computeTextBoxHeight({ ...ann, width: newW })
          }
        }
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === selectedAnnId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
          ),
        }))
      }
      return
    }

    // Select tool: flow-based text selection preview during drag
    if (activeTool === 'select' && selectTextStartRef.current) {
      const selRotation = pageRotationsRef.current[ap] || 0
      const cacheKey = `${ap}_${selRotation}`
      const items = textItemsCacheRef.current[cacheKey] || []
      selectTextRectsRef.current = flowSelectTextItems(items, selectTextStartRef.current, pt)
      redrawPage(ap)
      return
    }

    // Text highlight/strikethrough: update preview rects
    if ((activeTool === 'textHighlight' || activeTool === 'textStrikethrough') && textHighlightStartRef.current) {
      const start = textHighlightStartRef.current
      const selRect = {
        x: Math.min(start.x, pt.x),
        y: Math.min(start.y, pt.y),
        w: Math.abs(pt.x - start.x),
        h: Math.abs(pt.y - start.y),
      }
      const hlRotation = pageRotationsRef.current[ap] || 0
      const cacheKey = `${ap}_${hlRotation}`
      const items = textItemsCacheRef.current[cacheKey] || []
      textHighlightPreviewRectsRef.current = findIntersectingTextItems(items, selRect)
      redrawPage(ap)
      return
    }

    // Callout tool: arrow drag or move/resize
    if (activeTool === 'callout') {
      if (calloutArrowDragRef.current) {
        calloutArrowDragRef.current.tipPt = pt
        redrawPage(ap)
        return
      }
      if (textDragRef.current) {
        const drag = textDragRef.current
        const dx = pt.x - drag.startPt.x
        const dy = pt.y - drag.startPt.y
        if (drag.mode === 'move') {
          const movedArrows = drag.origArrows?.map(p => ({ x: p.x + dx, y: p.y + dy }))
          setAnnotations(prev => ({
            ...prev,
            [ap]: (prev[ap] || []).map(a =>
              a.id === selectedAnnId ? { ...a, points: [{ x: drag.origPoints[0].x + dx, y: drag.origPoints[0].y + dy }], ...(movedArrows ? { arrows: movedArrows } : {}) } : a
            ),
          }))
        } else {
          const { origPoints, origWidth, origHeight } = drag
          let newX = origPoints[0].x, newY = origPoints[0].y
          let newW = origWidth, newH = origHeight
          switch (drag.mode) {
            case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
            case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
            case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
            case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
            case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
            case 's': newH = Math.max(20, origHeight + dy); break
            case 'e': newW = Math.max(40, origWidth + dx); break
            case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
          }
          setAnnotations(prev => ({
            ...prev,
            [ap]: (prev[ap] || []).map(a =>
              a.id === selectedAnnId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
            ),
          }))
        }
        return
      }
      // Creating callout box
      currentPtsRef.current = [currentPtsRef.current[0], pt]
      redrawPage(ap)
      return
    }

    // Text tool: move/resize drag
    if (activeTool === 'text' && textDragRef.current) {
      const drag = textDragRef.current
      const dx = pt.x - drag.startPt.x
      const dy = pt.y - drag.startPt.y

      if (drag.mode === 'move') {
        const newX = drag.origPoints[0].x + dx
        const newY = drag.origPoints[0].y + dy
        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === selectedAnnId ? { ...a, points: [{ x: newX, y: newY }] } : a
          ),
        }))
      } else {
        const { origPoints, origWidth, origHeight } = drag
        let newX = origPoints[0].x, newY = origPoints[0].y
        let newW = origWidth, newH = origHeight

        switch (drag.mode) {
          case 'se': newW = Math.max(40, origWidth + dx); newH = Math.max(20, origHeight + dy); break
          case 'sw': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight + dy); break
          case 'ne': newW = Math.max(40, origWidth + dx); newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 'nw': newX = origPoints[0].x + dx; newY = origPoints[0].y + dy; newW = Math.max(40, origWidth - dx); newH = Math.max(20, origHeight - dy); break
          case 'n': newY = origPoints[0].y + dy; newH = Math.max(20, origHeight - dy); break
          case 's': newH = Math.max(20, origHeight + dy); break
          case 'e': newW = Math.max(40, origWidth + dx); break
          case 'w': newX = origPoints[0].x + dx; newW = Math.max(40, origWidth - dx); break
        }
        // Auto-height for text annotations
        if (selectedAnnId) {
          const ann = (annotations[ap] || []).find(a => a.id === selectedAnnId)
          if (ann && ann.type === 'text' && ann.text) {
            newH = computeTextBoxHeight({ ...ann, width: newW })
          }
        }

        setAnnotations(prev => ({
          ...prev,
          [ap]: (prev[ap] || []).map(a =>
            a.id === selectedAnnId ? { ...a, points: [{ x: newX, y: newY }], width: newW, height: newH } : a
          ),
        }))
      }
      return
    }

    // Text tool: creating textbox
    if (activeTool === 'text') {
      currentPtsRef.current = [currentPtsRef.current[0], pt]
      redrawPage(ap)
      return
    }

    if (activeTool === 'eraser') {
      const docRadius = eraserRadius / (zoom * RENDER_SCALE)
      const mods = eraserModsRef.current
      const pageAnns = annotations[ap] || []
      for (const ann of pageAnns) {
        if (mods.removed.has(ann.id)) continue
        if (eraserMode === 'object') {
          // Object mode: delete whole annotation on hit
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) mods.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            mods.removed.add(ann.id)
          }
        } else {
          // Partial mode: split paths at eraser boundary
          if ((ann.type === 'pencil' || ann.type === 'highlighter') && !ann.rects) {
            const effectiveR = docRadius + ann.strokeWidth / 2
            if (pathHitsCircle(ann.points, pt, effectiveR)) {
              mods.removed.add(ann.id)
              mods.added.push(...splitPathByEraser(ann, pt, effectiveR))
            }
          } else if (ann.type === 'text' || ann.type === 'callout') {
            if (hitTest(pt, ann, docRadius)) mods.removed.add(ann.id)
          } else if (hitTest(pt, ann, docRadius)) {
            if (ann.rects) {
              mods.removed.add(ann.id)
            } else {
              const polyline = shapeToPolyline(ann)
              const effectiveR = docRadius + ann.strokeWidth / 2
              const tempAnn: Annotation = { ...ann, type: 'pencil', points: polyline, smooth: false }
              mods.removed.add(ann.id)
              mods.added.push(...splitPathByEraser(tempAnn, pt, effectiveR))
            }
          }
        }
      }
      // In object mode, also remove any previously-added fragments that get hit
      if (eraserMode === 'object') {
        mods.added = mods.added.filter(frag => {
          const effectiveR = docRadius + frag.strokeWidth / 2
          return !pathHitsCircle(frag.points, pt, effectiveR)
        })
      } else {
        const newAdded: Annotation[] = []
        for (const frag of mods.added) {
          const effectiveR = docRadius + frag.strokeWidth / 2
          if (pathHitsCircle(frag.points, pt, effectiveR)) {
            newAdded.push(...splitPathByEraser(frag, pt, effectiveR))
          } else {
            newAdded.push(frag)
          }
        }
        mods.added = newAdded
      }
      redrawPage(ap)
      return
    }

    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      if (straightLineMode) {
        currentPtsRef.current = [currentPtsRef.current[0], pt]
      } else {
        currentPtsRef.current.push(pt)
      }
    } else {
      const start = currentPtsRef.current[0]
      let endPt = pt

      // Shift-constrain
      if (e.shiftKey && start) {
        if (activeTool === 'rectangle') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const side = Math.max(Math.abs(dx), Math.abs(dy))
          endPt = { x: start.x + side * Math.sign(dx || 1), y: start.y + side * Math.sign(dy || 1) }
        } else if (activeTool === 'circle') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const side = Math.max(Math.abs(dx), Math.abs(dy))
          endPt = { x: start.x + side * Math.sign(dx || 1), y: start.y + side * Math.sign(dy || 1) }
        } else if (activeTool === 'line' || activeTool === 'arrow') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const angle = Math.atan2(dy, dx)
          const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
          const dist = Math.hypot(dx, dy)
          endPt = { x: start.x + dist * Math.cos(snapped), y: start.y + dist * Math.sin(snapped) }
        }
      }

      currentPtsRef.current = [start, endPt]
    }
    redrawPage(ap)
  }, [getPointForPage, activeTool, annotations, redrawPage, eraserRadius, eraserMode, zoom, straightLineMode, selectedAnnId, findAnnotationAt])

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const ap = activePageRef.current

    // General drag (select tool: moving shapes)
    if (generalDragRef.current) {
      pushHistory(structuredClone(annotations))
      generalDragRef.current = null
      return
    }

    // Select tool: commit text/callout drag or finalize text selection
    if (activeTool === 'select') {
      if (textDragRef.current) {
        pushHistory(structuredClone(annotations))
        textDragRef.current = null
        return
      }
      if (selectTextStartRef.current) {
        const rects = selectTextRectsRef.current
        if (rects.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          for (const r of rects) {
            if (r.x < minX) minX = r.x
            if (r.y < minY) minY = r.y
            if (r.x + r.w > maxX) maxX = r.x + r.w
            if (r.y + r.h > maxY) maxY = r.y + r.h
          }
          const selRotation = pageRotationsRef.current[ap] || 0
          const cacheKey = `${ap}_${selRotation}`
          const allItems = textItemsCacheRef.current[cacheKey] || []
          const rectSet = new Set(rects.map(r => `${r.x},${r.y},${r.w},${r.h}`))
          const matchedItems = allItems.filter(item =>
            item.width > 0 && rectSet.has(`${item.x},${item.y},${item.width},${item.height}`)
          )
          const docPos = { x: (minX + maxX) / 2, y: minY }
          setSelectTextToolbar({ rects: [...rects], items: matchedItems, docPos })
        }
        selectTextStartRef.current = null
        selectTextRectsRef.current = []
        redrawPage(ap)
        return
      }
      return
    }

    // Callout tool: finish arrow drag, move/resize, or create box
    if (activeTool === 'callout') {
      if (calloutArrowDragRef.current && selectedAnnId) {
        const tip = calloutArrowDragRef.current.tipPt
        const arrowIdx = calloutArrowDragRef.current.arrowIdx
        const ann = getAnnotation(selectedAnnId)
        if (ann && ann.type === 'callout') {
          if (arrowIdx !== undefined && ann.arrows) {
            const newArrows = ann.arrows.map((a, i) => i === arrowIdx ? tip : a)
            updateAnnotation(selectedAnnId, { arrows: newArrows })
          } else {
            updateAnnotation(selectedAnnId, { arrows: [...(ann.arrows || []), tip] })
          }
        }
        calloutArrowDragRef.current = null
        redrawPage(ap)
        return
      }
      if (textDragRef.current) {
        const ann = getAnnotation(selectedAnnId!)
        if (ann) pushHistory(structuredClone(annotations))
        textDragRef.current = null
        return
      }
      // Creating new callout box
      const pts = currentPtsRef.current
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x)
        const y = Math.min(pts[0].y, pts[1].y)
        const w = Math.abs(pts[1].x - pts[0].x)
        const h = Math.abs(pts[1].y - pts[0].y)
        const boxW = w > 20 ? w : DEFAULT_TEXTBOX_W
        const boxH = h > 20 ? h : DEFAULT_TEXTBOX_H
        const boxX = w > 20 ? x : pts[0].x
        const boxY = h > 20 ? y : pts[0].y
        const newAnn: Annotation = {
          id: genId(), type: 'callout',
          points: [{ x: boxX, y: boxY }],
          color, fontSize, fontFamily, strokeWidth: 1,
          opacity: 1,
          text: '', width: boxW, height: boxH, arrows: [],
          bold, italic, underline, strikethrough, textAlign,
          backgroundColor: textBgColor || undefined, lineHeight: lineSpacing,
        }
        commitAnnotation(newAnn)
        setSelectedAnnId(newAnn.id)
        setEditingTextId(newAnn.id)
        setEditingTextValue('')
      }
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    // Text tool: finish move/resize or create textbox
    if (activeTool === 'text') {
      if (textDragRef.current) {
        const ann = getAnnotation(selectedAnnId!)
        if (ann) {
          pushHistory(structuredClone(annotations))
        }
        textDragRef.current = null
        return
      }

      // Creating new textbox
      const pts = currentPtsRef.current
      if (pts.length >= 2) {
        const x = Math.min(pts[0].x, pts[1].x)
        const y = Math.min(pts[0].y, pts[1].y)
        const w = Math.abs(pts[1].x - pts[0].x)
        const h = Math.abs(pts[1].y - pts[0].y)
        const boxW = w > 20 ? w : DEFAULT_TEXTBOX_W
        const boxH = h > 20 ? h : DEFAULT_TEXTBOX_H
        const boxX = w > 20 ? x : pts[0].x
        const boxY = h > 20 ? y : pts[0].y

        const newAnn: Annotation = {
          id: genId(), type: 'text',
          points: [{ x: boxX, y: boxY }],
          color, fontSize, fontFamily, strokeWidth: 1,
          opacity: opacity / 100,
          text: '',
          width: boxW,
          height: boxH,
          bold, italic, underline, strikethrough, textAlign,
          backgroundColor: textBgColor || undefined, lineHeight: lineSpacing,
        }
        commitAnnotation(newAnn)
        setSelectedAnnId(newAnn.id)
        setEditingTextId(newAnn.id)
        setEditingTextValue('')
      }
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    if (activeTool === 'eraser') {
      const mods = eraserModsRef.current
      if (mods.removed.size > 0 || mods.added.length > 0) {
        const pageAnns = annotations[ap] || []
        const surviving = pageAnns.filter(a => !mods.removed.has(a.id))
        const next = { ...annotations, [ap]: [...surviving, ...mods.added] }
        setAnnotations(next)
        pushHistory(next)
      }
      eraserModsRef.current = { removed: new Set(), added: [] }
      return
    }

    // Text highlight / strikethrough: create annotation from preview rects
    if (activeTool === 'textHighlight' || activeTool === 'textStrikethrough') {
      const rects = textHighlightPreviewRectsRef.current
      if (rects.length > 0) {
        const isStrikethrough = activeTool === 'textStrikethrough'
        const ann: Annotation = {
          id: genId(),
          type: 'highlighter',
          points: [{ x: 0, y: 0 }],
          color,
          strokeWidth: 0,
          opacity: isStrikethrough ? 1 : 0.4,
          fontSize,
          rects: [...rects],
          strikethrough: isStrikethrough || undefined,
        }
        commitAnnotation(ann)
      }
      textHighlightStartRef.current = null
      textHighlightPreviewRectsRef.current = []
      redrawPage(ap)
      return
    }

    const pts = currentPtsRef.current
    if (pts.length < 2) {
      currentPtsRef.current = []
      redrawPage(ap)
      return
    }

    const isHL = activeTool === 'highlighter'
    const ann: Annotation = {
      id: genId(),
      type: activeTool as Exclude<ToolType, 'select' | 'eraser' | 'measure' | 'textHighlight' | 'textStrikethrough'>,
      points: [...pts],
      color,
      strokeWidth: isHL ? strokeWidth * 3 : strokeWidth,
      opacity: isHL ? 0.4 : opacity / 100,
      fontSize,
    }
    currentPtsRef.current = []
    commitAnnotation(ann)
  }, [activeTool, color, strokeWidth, opacity, fontSize, commitAnnotation,
      pushHistory, redrawPage, annotations, getAnnotation, updateAnnotation, selectedAnnId])

  // ── Export annotated PDF ─────────────────────────────

  const handleExport = useCallback(async () => {
    if (!pdfFile) return
    // Commit any editing
    if (editingTextId) commitTextEditing()
    setIsExporting(true)
    setExportError(null)
    try {
      const bytes = await getPDFBytes(pdfFile)
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()
      const fontCache = new Map<StandardFonts, Awaited<ReturnType<typeof doc.embedFont>>>()
      const getFont = async (ff: string, annBold = false, annItalic = false) => {
        const std = resolvePdfFont(ff, annBold, annItalic)
        if (!fontCache.has(std)) fontCache.set(std, await doc.embedFont(std))
        return fontCache.get(std)!
      }

      for (const [pageStr, pageAnns] of Object.entries(annotations)) {
        const pageNum = parseInt(pageStr)
        if (pageNum < 1 || pageNum > pages.length || !pageAnns.length) continue

        const page = pages[pageNum - 1]
        const { width: origW, height: origH } = page.getSize()
        const rotation = pageRotations[pageNum] || 0

        // Apply rotation
        if (rotation !== 0) {
          const existingRot = page.getRotation().angle
          page.setRotation(degrees((existingRot + rotation) % 360))
        }

        for (const ann of pageAnns) {
          const r = parseInt(ann.color.slice(1, 3), 16) / 255
          const g = parseInt(ann.color.slice(3, 5), 16) / 255
          const bv = parseInt(ann.color.slice(5, 7), 16) / 255
          const c = rgb(r, g, bv)

          // Transform points to PDF coordinates
          const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

          switch (ann.type) {
            case 'pencil':
            case 'highlighter':
              if (ann.rects && ann.rects.length > 0) {
                if (ann.strikethrough) {
                  // Strikethrough lines through middle of each text rect
                  for (const rect of ann.rects) {
                    const midY = rect.y + rect.h / 2
                    const lineStart = toPC({ x: rect.x, y: midY })
                    const lineEnd = toPC({ x: rect.x + rect.w, y: midY })
                    page.drawLine({
                      start: lineStart, end: lineEnd,
                      thickness: Math.max(0.5, 1.5), color: c, opacity: ann.opacity,
                    })
                  }
                } else {
                  for (const rect of ann.rects) {
                    const tl = toPC({ x: rect.x, y: rect.y + rect.h })
                    page.drawRectangle({
                      x: tl.x, y: tl.y,
                      width: rect.w, height: rect.h,
                      color: c, opacity: ann.opacity,
                    })
                  }
                }
              } else {
                for (let i = 0; i < ann.points.length - 1; i++) {
                  const s = toPC(ann.points[i])
                  const e = toPC(ann.points[i + 1])
                  page.drawLine({
                    start: s, end: e,
                    thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
                  })
                }
              }
              break
            case 'line':
              if (ann.points.length < 2) break
              page.drawLine({
                start: toPC(ann.points[0]), end: toPC(ann.points[1]),
                thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
              })
              break
            case 'arrow': {
              if (ann.points.length < 2) break
              const s = toPC(ann.points[0])
              const e = toPC(ann.points[1])
              const pdfAngle = Math.atan2(e.y - s.y, e.x - s.x)
              const hl = Math.min(20, Math.max(10, ann.strokeWidth * 2.5))
              const halfAngle = Math.PI / 7
              // Line stops at arrowhead base
              const baseX = e.x - hl * Math.cos(pdfAngle)
              const baseY = e.y - hl * Math.sin(pdfAngle)
              page.drawLine({ start: s, end: { x: baseX, y: baseY }, thickness: ann.strokeWidth, color: c, opacity: ann.opacity })
              // Filled arrowhead via SVG path (relative offsets, Y negated for SVG Y-down)
              const lxOff = -hl * Math.cos(pdfAngle - halfAngle)
              const lyOff = hl * Math.sin(pdfAngle - halfAngle)
              const rxOff = -hl * Math.cos(pdfAngle + halfAngle)
              const ryOff = hl * Math.sin(pdfAngle + halfAngle)
              page.drawSvgPath(`M 0 0 L ${lxOff} ${lyOff} L ${rxOff} ${ryOff} Z`, {
                x: e.x, y: e.y, color: c, opacity: ann.opacity, borderWidth: 0,
              })
              break
            }
            case 'rectangle': {
              if (ann.points.length < 2) break
              const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.max(ann.points[0].y, ann.points[1].y) })
              const w = Math.abs(ann.points[1].x - ann.points[0].x)
              const h = Math.abs(ann.points[1].y - ann.points[0].y)
              page.drawRectangle({
                x: tl.x, y: tl.y,
                width: w, height: h,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              })
              break
            }
            case 'cloud': {
              if (ann.points.length < 3) break
              for (let ei = 0; ei < ann.points.length; ei++) {
                const start = ann.points[ei]
                const end = ann.points[(ei + 1) % ann.points.length]
                const edgeLen = Math.hypot(end.x - start.x, end.y - start.y)
                const arcSz = 20
                const numBumps = Math.max(2, Math.round(edgeLen / arcSz))
                const ddx = (end.x - start.x) / numBumps
                const ddy = (end.y - start.y) / numBumps
                const len = Math.hypot(ddx, ddy)
                if (len === 0) continue
                const nx = (ddy / len) * arcSz * 0.4
                const ny = (-ddx / len) * arcSz * 0.4
                for (let i = 0; i < numBumps; i++) {
                  const sx = start.x + ddx * i, sy = start.y + ddy * i
                  const ex = start.x + ddx * (i + 1), ey = start.y + ddy * (i + 1)
                  const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
                  page.drawLine({ start: toPC({ x: sx, y: sy }), end: toPC({ x: mx, y: my }), thickness: ann.strokeWidth, color: c, opacity: ann.opacity })
                  page.drawLine({ start: toPC({ x: mx, y: my }), end: toPC({ x: ex, y: ey }), thickness: ann.strokeWidth, color: c, opacity: ann.opacity })
                }
              }
              break
            }
            case 'circle': {
              if (ann.points.length < 2) break
              const [c1, c2] = ann.points
              const center = toPC({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 })
              page.drawEllipse({
                x: center.x, y: center.y,
                xScale: Math.abs(c2.x - c1.x) / 2,
                yScale: Math.abs(c2.y - c1.y) / 2,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              })
              break
            }
            case 'text': {
              if (!ann.text || !ann.points.length) break
              const fs = ann.fontSize || 16
              const pdfFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
              const lines = ann.width ? wrapText(ann.text, ann.width, fs, ann.bold, (t: string) => pdfFont.widthOfTextAtSize(t, fs)) : ann.text.split('\n')
              const tAlign = ann.textAlign || 'left'
              for (let i = 0; i < lines.length; i++) {
                let xOff = 0
                if (ann.width && tAlign !== 'left') {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  if (tAlign === 'center') xOff = (ann.width - tw) / 2
                  else if (tAlign === 'right') xOff = ann.width - tw
                }
                const linePt = toPC({ x: ann.points[0].x + xOff, y: ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs })
                page.drawText(lines[i], {
                  x: linePt.x, y: linePt.y,
                  size: fs, font: pdfFont, color: c, opacity: ann.opacity,
                })
                if (ann.underline) {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  const ulY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs + fs * 0.15
                  const ulStart = toPC({ x: ann.points[0].x + xOff, y: ulY })
                  const ulEnd = toPC({ x: ann.points[0].x + xOff + tw, y: ulY })
                  page.drawLine({ start: ulStart, end: ulEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
                }
                if (ann.strikethrough) {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  const stY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs - fs * 0.35
                  const stStart = toPC({ x: ann.points[0].x + xOff, y: stY })
                  const stEnd = toPC({ x: ann.points[0].x + xOff + tw, y: stY })
                  page.drawLine({ start: stStart, end: stEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
                }
              }
              break
            }
            case 'callout': {
              if (!ann.points.length || !ann.width || !ann.height) break
              const boxPt = ann.points[0]
              const cfs = ann.fontSize || 14

              // White-filled box with colored border
              const bl = toPC({ x: boxPt.x, y: boxPt.y + ann.height })
              page.drawRectangle({
                x: bl.x, y: bl.y,
                width: ann.width, height: ann.height,
                color: rgb(1, 1, 1), borderColor: c,
                borderWidth: 1.5, opacity: 1, borderOpacity: 1,
              })

              // Text inside box
              if (ann.text) {
                const calloutFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
                const cLines = wrapText(ann.text, ann.width - 8, cfs, ann.bold, (t: string) => calloutFont.widthOfTextAtSize(t, cfs))
                const cAlign = ann.textAlign || 'left'
                for (let i = 0; i < cLines.length; i++) {
                  let cxOff = 4
                  if (cAlign !== 'left') {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    if (cAlign === 'center') cxOff = 4 + (ann.width - 8 - ctw) / 2
                    else if (cAlign === 'right') cxOff = ann.width - 4 - ctw
                  }
                  const lPt = toPC({ x: boxPt.x + cxOff, y: boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs })
                  page.drawText(cLines[i], {
                    x: lPt.x, y: lPt.y,
                    size: cfs, font: calloutFont, color: c, opacity: 1,
                  })
                  if (ann.underline) {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    const culY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs + cfs * 0.15
                    const culStart = toPC({ x: boxPt.x + cxOff, y: culY })
                    const culEnd = toPC({ x: boxPt.x + cxOff + ctw, y: culY })
                    page.drawLine({ start: culStart, end: culEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                  }
                  if (ann.strikethrough) {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    const cstY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs - cfs * 0.35
                    const cstStart = toPC({ x: boxPt.x + cxOff, y: cstY })
                    const cstEnd = toPC({ x: boxPt.x + cxOff + ctw, y: cstY })
                    page.drawLine({ start: cstStart, end: cstEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                  }
                }
              }

              // Arrows
              if (ann.arrows) {
                for (const tip of ann.arrows) {
                  const origin = nearestPointOnRect(boxPt.x, boxPt.y, ann.width, ann.height, tip.x, tip.y)
                  const aS = toPC(origin)
                  const aE = toPC(tip)
                  const aAngle = Math.atan2(aE.y - aS.y, aE.x - aS.x)
                  const aHl = Math.min(20, Math.max(10, 1.5 * 2.5))
                  const aHalf = Math.PI / 7
                  const abX = aE.x - aHl * Math.cos(aAngle)
                  const abY = aE.y - aHl * Math.sin(aAngle)
                  page.drawLine({
                    start: aS, end: { x: abX, y: abY },
                    thickness: 1.5, color: c, opacity: 1,
                  })
                  const aLxOff = -aHl * Math.cos(aAngle - aHalf)
                  const aLyOff = aHl * Math.sin(aAngle - aHalf)
                  const aRxOff = -aHl * Math.cos(aAngle + aHalf)
                  const aRyOff = aHl * Math.sin(aAngle + aHalf)
                  page.drawSvgPath(`M 0 0 L ${aLxOff} ${aLyOff} L ${aRxOff} ${aRyOff} Z`, {
                    x: aE.x, y: aE.y, color: c, opacity: 1, borderWidth: 0,
                  })
                }
              }
              break
            }
          }
        }
      }

      // Export measurements
      const measFont = await doc.embedFont(StandardFonts.Helvetica)
      for (const [pageStr, pageMeas] of Object.entries(measurements)) {
        const pageNum = parseInt(pageStr)
        if (pageNum < 1 || pageNum > pages.length || !pageMeas.length) continue
        const page = pages[pageNum - 1]
        const { width: origW, height: origH } = page.getSize()
        const rotation = pageRotations[pageNum] || 0
        const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

        for (const m of pageMeas) {
          const s = toPC(m.startPt)
          const e = toPC(m.endPt)
          const pxDist = Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y)

          // Dashed cyan line
          page.drawLine({
            start: s, end: e,
            thickness: 1.5, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
            dashArray: [6, 4],
          })

          // Endpoint circles
          for (const pt of [s, e]) {
            page.drawCircle({
              x: pt.x, y: pt.y, size: 3,
              color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
            })
          }

          // Distance label
          let label: string
          if (calibration.pixelsPerUnit !== null) {
            const realDist = pxDist / calibration.pixelsPerUnit
            label = `${realDist.toFixed(2)} ${calibration.unit}`
          } else {
            label = `${pxDist.toFixed(1)} px`
          }
          const mid = toPC({ x: (m.startPt.x + m.endPt.x) / 2, y: (m.startPt.y + m.endPt.y) / 2 })
          const tw = measFont.widthOfTextAtSize(label, 9)
          const padX = 4
          const padY = 2
          // Label background pill
          page.drawRectangle({
            x: mid.x - tw / 2 - padX, y: mid.y - 5 - padY,
            width: tw + padX * 2, height: 10 + padY * 2,
            color: rgb(0, 0.16, 0.2), opacity: 0.85,
            borderColor: rgb(0.133, 0.827, 0.933), borderWidth: 0.5, borderOpacity: 0.9,
          })
          page.drawText(label, {
            x: mid.x - tw / 2, y: mid.y - 4,
            size: 9, font: measFont, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
          })
        }
      }

      // Apply rotation to pages without annotations too
      for (const [pageStr, rot] of Object.entries(pageRotations)) {
        const pageNum = parseInt(pageStr)
        if (rot === 0 || pageNum < 1 || pageNum > pages.length) continue
        if (annotations[pageNum]?.length) continue // already handled above
        const page = pages[pageNum - 1]
        const existingRot = page.getRotation().angle
        page.setRotation(degrees((existingRot + rot) % 360))
      }

      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const fileName = `${pdfFile.name.replace(/\.pdf$/i, '')}-annotated.pdf`

      const pickerResult = await saveWithPicker(blob, fileName, {
        description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] },
      })
      if (pickerResult === 'cancelled') return
      if (pickerResult === 'fallback') downloadBlob(blob, fileName)
      addToast({ type: 'success', message: 'PDF exported' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setExportError(`Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
    }
  }, [pdfFile, annotations, pageRotations, editingTextId, commitTextEditing, measurements, calibration])

  // ── Reset ────────────────────────────────────────────

  const handleReset = useCallback(() => {
    if (!confirm('Discard all annotations and start over?')) return
    clearSession()
    if (pdfFileRef.current) removePDFFromCache(pdfFileRef.current.id)
    setPdfFile(null)
    setAnnotations({})
    historyRef.current = [{}]
    historyIdxRef.current = 0
    setCurrentPage(1)
    setZoom(1.0)
    setThumbnails({})
    setSidebarOpen(false)
    setSelectedThumbPage(null)
    loadingThumbs.current.clear()
    setPageRotations({})
    setSelectedAnnId(null)
    setEditingTextId(null)
    setEditingTextValue('')
    setMeasurements({})
    setCalibration({ pixelsPerUnit: null, unit: 'in' })
    setCalibrateModalOpen(false)
    setCalibrateMeasureId(null)
    setSelectedMeasureId(null)
    measureStartRef.current = null
    measurePreviewRef.current = null
  }, [])

  // ── Render ───────────────────────────────────────────

  if (!pdfFile) {
    const savedSession = loadSession()
    return (
      <div className="h-full flex flex-col gap-4">
        {savedSession && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-300 flex-1">
              Previous session found. Re-select <strong>{savedSession.file.fileName}</strong> to restore your annotations.
            </p>
            <button
              onClick={() => { clearSession(); forceRender(v => v + 1) }}
              className="p-1 rounded text-blue-400/60 hover:text-blue-400 transition-colors"
              aria-label="Dismiss session banner"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <FileDropZone
          onFiles={handleFiles}
          accept="application/pdf"
          multiple={false}
          label="Drop a PDF file here"
          description="Annotate with pencil, shapes, text & more"
          className="h-full"
        />
        {loadError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 flex-1">{loadError}</p>
            <button
              onClick={() => setLoadError(null)}
              className="p-1 rounded text-red-400/60 hover:text-red-400 transition-colors"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  const zoomPct = Math.round(zoom * 100)
  const activeDrawDef = DRAW_TOOLS.find(s => s.type === activeTool) || DRAW_TOOLS.find(s => s.type === activeDraw)!
  const ActiveDrawIcon = activeDrawDef.icon
  const activeTextDef = TEXT_TOOLS.find(s => s.type === activeTool) || TEXT_TOOLS.find(s => s.type === activeText)!
  const ActiveTextIcon = activeTextDef.icon

  // Compute scaled layout dimensions for innerRef so it centers when zoomed out.
  // CSS transform: scale() shrinks visually but the layout box stays at unscaled size;
  // setting explicit width/height + margin:auto makes the box match its visual size.
  const innerScaledW = (() => {
    if (!pdfFile || maxCanvasWidthRef.current === 0) return 0
    return maxCanvasWidthRef.current * zoom
  })()
  const innerScaledH = (() => {
    if (!pdfFile) return 0
    let totalH = 0
    for (let p = 1; p <= pdfFile.pageCount; p++) {
      const d = pageDimsMap.current.get(p)
      if (d) totalH += d.height
    }
    totalH += Math.max(0, pdfFile.pageCount - 1) * 24 // gap-6 = 24px
    return totalH * zoom
  })()

  // Get the editing text annotation for textarea overlay
  const editingAnn = editingTextId ? getAnnotation(editingTextId) : null
  const selectedAnn = selectedAnnId ? getAnnotation(selectedAnnId) : null
  const isTextAnnSelected = selectedAnn && (selectedAnn.type === 'text' || selectedAnn.type === 'callout')
  const isShapeAnnSelected = selectedAnn && !isTextAnnSelected

  // Properties bar context
  const showPropsForTool = activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'measure'
  const showPropsForSelection = activeTool === 'select' && selectedAnn
  const showTextProps = (isTextAnnSelected && activeTool === 'select') || activeTool === 'text' || activeTool === 'callout'
  const showStrokeWidth = (isShapeAnnSelected && activeTool === 'select') ||
    (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'callout' && activeTool !== 'eraser' && activeTool !== 'measure' && activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough')
  const showOpacity = showPropsForTool || (activeTool === 'select' && selectedAnn != null)
  const showColorPicker = showPropsForTool || showPropsForSelection
  const showEraserControls = activeTool === 'eraser'
  const showMeasureControls = activeTool === 'measure'

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Row: Tool Selection + View Actions ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.06] flex-shrink-0">
        {/* Sidebar toggle */}
        {pdfFile.pageCount > 1 && (
          <>
            <button onClick={() => setSidebarOpen(o => !o)} title="Page thumbnails" aria-label="Toggle page thumbnails"
              className={`p-1.5 rounded-lg transition-colors ${
                sidebarOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <PanelLeft size={16} />
            </button>
            <div className="w-px h-6 bg-white/[0.08]" />
          </>
        )}

        {/* Select */}
        <button onClick={() => setActiveTool('select')} title="Select (S)"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === 'select' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <MousePointer2 size={16} />
        </button>
        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Shapes dropdown */}
        <div ref={shapesDropdownRef} className="relative">
          <button
            onClick={() => { if (!isDrawTool) setActiveTool(activeDraw); setShapesDropdownOpen(o => !o) }}
            title={activeDrawDef.label}
            className={`p-1.5 rounded-lg flex items-center gap-0.5 transition-colors ${
              isDrawTool ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <ActiveDrawIcon size={16} />
            <ChevronDown size={10} className="opacity-50" />
          </button>
          {shapesDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
              {DRAW_TOOLS.map(s => (
                <button key={s.type}
                  onClick={() => { setActiveTool(s.type); setActiveDraw(s.type); setShapesDropdownOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    activeTool === s.type ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  <s.icon size={14} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Highlight */}
        <button
          onClick={() => {
            if (selectTextToolbar) {
              const ann: Annotation = {
                id: genId(), type: 'highlighter',
                points: [{ x: 0, y: 0 }], color: '#FFFF00', strokeWidth: 0,
                opacity: 0.4, fontSize, rects: [...selectTextToolbar.rects],
              }
              commitAnnotation(ann)
              setSelectTextToolbar(null)
              redrawAll()
            } else {
              setActiveTool('highlighter')
              setActiveHighlight('highlighter')
            }
          }}
          title="Highlight (H)"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === 'highlighter' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <Highlighter size={16} />
        </button>

        {/* Strikethrough */}
        <button
          onClick={() => {
            if (selectTextToolbar) {
              const ann: Annotation = {
                id: genId(), type: 'highlighter',
                points: [{ x: 0, y: 0 }], color: '#FF0000', strokeWidth: 0,
                opacity: 1, fontSize, rects: [...selectTextToolbar.rects],
                strikethrough: true,
              }
              commitAnnotation(ann)
              setSelectTextToolbar(null)
              redrawAll()
            } else {
              setActiveTool('textStrikethrough')
              setActiveHighlight('textStrikethrough')
            }
          }}
          title="Strikethrough (Shift+X)"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === 'textStrikethrough' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <Strikethrough size={16} />
        </button>

        {/* Text tools dropdown */}
        <div ref={textDropdownRef} className="relative">
          <button
            onClick={() => { if (!isTextTool) setActiveTool(activeText); setTextDropdownOpen(o => !o) }}
            title={activeTextDef.label}
            className={`p-1.5 rounded-lg flex items-center gap-0.5 transition-colors ${
              isTextTool ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <ActiveTextIcon size={16} />
            <ChevronDown size={10} className="opacity-50" />
          </button>
          {textDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
              {TEXT_TOOLS.map(s => (
                <button key={s.type}
                  onClick={() => { setActiveTool(s.type); setActiveText(s.type); setTextDropdownOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    activeTool === s.type ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  <s.icon size={14} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Eraser */}
        <button onClick={() => setActiveTool('eraser')} title="Eraser (E)"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === 'eraser' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <Eraser size={16} />
        </button>

        {/* Measure */}
        <button onClick={() => setActiveTool('measure')} title="Measure (M)"
          className={`p-1.5 rounded-lg transition-colors ${
            activeTool === 'measure' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <Ruler size={16} />
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none">
          <Undo2 size={16} />
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none">
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Rotate */}
        <button onClick={() => rotatePage(-90)} title="Rotate CCW"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => rotatePage(90)} title="Rotate CW"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <RotateCw size={16} />
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Zoom */}
        <button onClick={() => zoomAtCenter(Math.round(Math.max(0.25, zoom - 0.25) * 100) / 100)} title="Zoom out"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomOut size={16} />
        </button>
        <div ref={zoomDropdownRef} className="relative">
          <button onClick={() => setZoomDropdownOpen(o => !o)} title="Zoom presets"
            className="text-[11px] text-white/50 hover:text-white w-12 text-center rounded-lg py-1 hover:bg-white/[0.06] transition-colors">
            {zoomPct}%
          </button>
          {zoomDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
              {ZOOM_PRESETS.map(z => (
                <button key={z} onClick={() => { zoomAtCenter(z); setZoomDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    Math.abs(zoom - z) < 0.01 ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  {Math.round(z * 100)}%
                </button>
              ))}
              <div className="h-px bg-white/[0.08] my-1" />
              <button onClick={() => { fitToWindow(); setZoomDropdownOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]">
                Fit Page
              </button>
            </div>
          )}
        </div>
        <button onClick={() => zoomAtCenter(Math.round(Math.min(4.0, zoom + 0.25) * 100) / 100)} title="Zoom in"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomIn size={16} />
        </button>
        <button onClick={fitToWindow} title="Fit to window (F)"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <Maximize size={16} />
        </button>

        <div className="flex-1" />

        {/* Export & Reset */}
        {exportError && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-[10px] text-red-400">{exportError}</span>
            <button onClick={() => setExportError(null)} className="p-0.5 text-red-400/60 hover:text-red-400"><X size={10} /></button>
          </div>
        )}
        <Button size="sm" onClick={handleExport} disabled={isExporting} icon={<Download size={12} />}>
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw size={12} />}>
          New
        </Button>
      </div>

      {/* ── Bottom Row: Contextual Properties Bar ── */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] flex-shrink-0 min-h-[32px]">
        {/* Color picker */}
        {showColorPicker && (
          <ColorPicker
            value={color}
            onChange={c => {
              setColor(c)
              if (selectedAnnId) updateAnnotation(selectedAnnId, { color: c })
            }}
            presets={ANN_COLORS}
          />
        )}

        {/* Stroke width */}
        {showStrokeWidth && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Width</span>
            <input type="range" min={1} max={20} value={strokeWidth}
              onChange={e => {
                const val = Number(e.target.value)
                setStrokeWidth(val)
                if (selectedAnnId && isShapeAnnSelected) updateAnnotation(selectedAnnId, { strokeWidth: val })
              }}
              className="w-16 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-4">{strokeWidth}</span>
          </div>
        )}

        {/* Opacity */}
        {showOpacity && activeTool !== 'highlighter' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Opacity</span>
            <input type="range" min={10} max={100} step={5} value={opacity}
              onChange={e => {
                const val = Number(e.target.value)
                setOpacity(val)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { opacity: val / 100 })
              }}
              className="w-14 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-6">{opacity}%</span>
          </div>
        )}

        {/* Straight-line mode */}
        {(activeTool === 'pencil' || activeTool === 'highlighter') && (
          <button onClick={() => setStraightLineMode(m => !m)}
            title={straightLineMode ? 'Straight line mode' : 'Freehand mode'}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              straightLineMode
                ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30'
                : 'text-white/40 hover:text-white/60 border border-white/[0.08]'
            }`}>
            {straightLineMode ? 'Straight' : 'Free'}
          </button>
        )}

        {/* Text formatting controls */}
        {showTextProps && (
          <>
            <div className="w-px h-5 bg-white/[0.08]" />
            <select value={fontFamily} onChange={e => {
              const ff = e.target.value
              setFontFamily(ff)
              if (editingTextId) updateAnnotation(editingTextId, { fontFamily: ff })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { fontFamily: ff })
              }
            }}
              className="px-1 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white max-w-[100px]">
              {FONT_FAMILIES.map(ff => (
                <option key={ff} value={ff} style={{ fontFamily: ff }}>{ff}</option>
              ))}
            </select>
            <select value={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].includes(fontSize) ? fontSize : ''}
              onChange={e => {
                const fs = Number(e.target.value)
                if (fs) {
                  setFontSize(fs)
                  if (editingTextId) updateAnnotation(editingTextId, { fontSize: fs })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { fontSize: fs })
                  }
                }
              }}
              className="w-14 px-0.5 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white">
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {![8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].includes(fontSize) && (
                <option value={fontSize}>{fontSize}</option>
              )}
            </select>
            <div className="flex items-center gap-0.5">
              {([
                { key: 'bold' as const, Icon: Bold, label: 'Bold (Ctrl+B)', val: bold, set: setBold },
                { key: 'italic' as const, Icon: Italic, label: 'Italic (Ctrl+I)', val: italic, set: setItalic },
                { key: 'underline' as const, Icon: Underline, label: 'Underline (Ctrl+U)', val: underline, set: setUnderline },
                { key: 'strikethrough' as const, Icon: Strikethrough, label: 'Strikethrough (Ctrl+Shift+X)', val: strikethrough, set: setStrikethrough },
              ] as const).map(({ key, Icon, label, val, set }) => (
                <button key={key} onMouseDown={e => e.preventDefault()} onClick={() => {
                  const next = !val
                  set(next)
                  if (editingTextId) updateAnnotation(editingTextId, { [key]: next })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { [key]: next })
                  }
                }} title={label}
                  className={`p-1 rounded transition-colors ${
                    val ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {([
                { align: 'left' as const, Icon: AlignLeft, label: 'Align Left' },
                { align: 'center' as const, Icon: AlignCenter, label: 'Align Center' },
                { align: 'right' as const, Icon: AlignRight, label: 'Align Right' },
              ] as const).map(({ align, Icon, label }) => (
                <button key={align} onMouseDown={e => e.preventDefault()} onClick={() => {
                  setTextAlign(align)
                  if (editingTextId) updateAnnotation(editingTextId, { textAlign: align })
                  else if (selectedAnnId) {
                    const ann = getAnnotation(selectedAnnId)
                    if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { textAlign: align })
                  }
                }} title={label}
                  className={`p-1 rounded transition-colors ${
                    textAlign === align ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                  }`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <button onMouseDown={e => e.preventDefault()} onClick={() => {
              const next = textBgColor ? null : color
              setTextBgColor(next)
              if (editingTextId) updateAnnotation(editingTextId, { backgroundColor: next || undefined })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { backgroundColor: next || undefined })
              }
            }} title="Text background highlight"
              className={`p-1 rounded transition-colors ${
                textBgColor ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
              }`}>
              <Paintbrush size={13} />
            </button>
            <select value={lineSpacing} onChange={e => {
              const lh = parseFloat(e.target.value)
              setLineSpacing(lh)
              if (editingTextId) updateAnnotation(editingTextId, { lineHeight: lh })
              else if (selectedAnnId) {
                const ann = getAnnotation(selectedAnnId)
                if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { lineHeight: lh })
              }
            }} title="Line spacing"
              className="px-1 py-0.5 text-[10px] bg-dark-surface border border-white/[0.1] rounded text-white">
              {[1.0, 1.15, 1.3, 1.5, 2.0].map(v => (
                <option key={v} value={v}>{v === 1.3 ? '1.3 (default)' : v.toString()}</option>
              ))}
            </select>
          </>
        )}

        {/* Eraser controls */}
        {showEraserControls && (
          <>
            <div className="flex items-center bg-white/[0.06] rounded-md p-0.5">
              <button onClick={() => setEraserMode('partial')} title="Partial erase"
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  eraserMode === 'partial' ? 'bg-[#F47B20] text-white' : 'text-white/50 hover:text-white'
                }`}>Partial</button>
              <button onClick={() => setEraserMode('object')} title="Object erase"
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  eraserMode === 'object' ? 'bg-[#F47B20] text-white' : 'text-white/50 hover:text-white'
                }`}>Object</button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/40">Size</span>
              <input type="range" min={5} max={50} value={eraserRadius}
                onChange={e => setEraserRadius(Number(e.target.value))}
                className="w-16 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
              <span className="text-[10px] text-white/40 w-5">{eraserRadius}</span>
            </div>
          </>
        )}

        {/* Measure controls */}
        {showMeasureControls && (
          <>
            {calibration.pixelsPerUnit !== null && (
              <span className="text-[10px] text-cyan-400/70">
                Scale: {calibration.pixelsPerUnit.toFixed(1)} px/{calibration.unit}
              </span>
            )}
            {(measurements[currentPage] || []).length > 0 && (
              <button
                onClick={() => {
                  setMeasurements(prev => { const next = { ...prev }; delete next[currentPage]; return next })
                  setSelectedMeasureId(null)
                }}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Clear All
              </button>
            )}
            {calibration.pixelsPerUnit !== null && (
              <button
                onClick={() => setCalibration({ pixelsPerUnit: null, unit: 'in' })}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Reset Scale
              </button>
            )}
          </>
        )}

        {/* Select hint */}
        {activeTool === 'select' && !selectedAnn && (
          <span className="text-[10px] text-white/25 italic">Click to select annotations</span>
        )}
      </div>

      {/* ── Content: sidebar + canvas ──────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnail sidebar */}
        {sidebarOpen && (
          <div className="w-48 border-r border-white/[0.06] bg-black/20 flex flex-col flex-shrink-0">
            <div className="px-3 py-2 text-xs text-white/50 font-medium border-b border-white/[0.06]">
              Pages ({pdfFile.pageCount})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1).map(pageNum => (
                <ThumbnailItem
                  key={pageNum}
                  pageNum={pageNum}
                  thumbnail={thumbnails[pageNum]}
                  isCurrent={pageNum === currentPage}
                  isSelected={pageNum === selectedThumbPage}
                  hasAnnotations={(annotations[pageNum] || []).length > 0}
                  onVisible={() => loadThumbnail(pageNum)}
                  onClick={() => navigateToPage(pageNum)}
                  onDoubleClick={() => navigateToPage(pageNum)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Canvas area ─────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-black/20 relative">
          <div className="flex justify-center p-6" style={{ minHeight: '100%', minWidth: 'fit-content' }}>
          <div ref={innerRef} style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: innerScaledW || undefined, height: innerScaledH || undefined }} className="flex flex-col items-center gap-6">
            {Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1).map(pageNum => {
              const dims = pageDimsMap.current.get(pageNum)
              const editingOnThisPage = editingAnn && findAnnotationPage(editingAnn.id) === pageNum
              return (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="relative"
                  style={dims ? { width: dims.width, height: dims.height } : undefined}
                  ref={el => {
                    if (el) {
                      const existing = pageRefsMap.current.get(pageNum)
                      if (!existing || existing.container !== el) {
                        const pdfCanvas = el.querySelector<HTMLCanvasElement>('canvas.pdf-canvas')
                        const annCanvas = el.querySelector<HTMLCanvasElement>('canvas.ann-canvas')
                        if (pdfCanvas && annCanvas) {
                          pageRefsMap.current.set(pageNum, { pdfCanvas, annCanvas, container: el })
                        }
                      }
                    }
                  }}
                >
                  <canvas
                    className="pdf-canvas block"
                    width={dims?.width ?? 0}
                    height={dims?.height ?? 0}
                  />
                  <canvas
                    className="ann-canvas absolute top-0 left-0"
                    width={dims?.width ?? 0}
                    height={dims?.height ?? 0}
                    style={{ mixBlendMode: 'multiply', cursor: canvasCursor || (activeTool === 'select' && selectedAnnId ? 'default' : CURSOR_MAP[activeTool]) }}
                    onPointerDown={e => handlePointerDown(e, pageNum)}
                    onPointerMove={e => handlePointerMove(e, pageNum)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseLeave={() => { if (activeTool === 'eraser') setEraserCursorPos(null) }}
                  />
                  {/* Eraser circle cursor on this page */}
                  {activeTool === 'eraser' && eraserCursorPos && activePageRef.current === pageNum && (
                    <div
                      className="pointer-events-none absolute border-2 border-white/60 rounded-full mix-blend-difference"
                      style={{
                        left: (eraserCursorPos.x - eraserRadius) / zoom,
                        top: (eraserCursorPos.y - eraserRadius) / zoom,
                        width: eraserRadius * 2 / zoom,
                        height: eraserRadius * 2 / zoom,
                      }}
                    />
                  )}
                  {/* Floating text editor on this page */}
                  {editingOnThisPage && editingAnn && editingAnn.width && editingAnn.height && (
                    <textarea
                      ref={textareaRef}
                      value={editingTextValue}
                      onChange={e => {
                        setEditingTextValue(e.target.value)
                        if (textareaRef.current && editingTextId) {
                          requestAnimationFrame(() => {
                            const taEl = textareaRef.current
                            if (!taEl || !editingTextId) return
                            const prev = taEl.style.height
                            taEl.style.height = '0px'
                            const needed = Math.max(DEFAULT_TEXTBOX_H, taEl.scrollHeight / RENDER_SCALE)
                            taEl.style.height = prev
                            if (Math.abs(needed - (editingAnn?.height || 0)) > 1) {
                              updateAnnotationSilent(editingTextId, { height: needed })
                            }
                          })
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          e.nativeEvent.stopImmediatePropagation()
                          escapeCommittedRef.current = true
                          commitTextEditing(true)
                        }
                      }}
                      onBlur={() => {
                        if (escapeCommittedRef.current) {
                          escapeCommittedRef.current = false
                          return
                        }
                        blurTimeoutRef.current = setTimeout(() => {
                          blurTimeoutRef.current = null
                          commitTextEditing(true)
                        }, 100)
                      }}
                      style={{
                        position: 'absolute',
                        left: editingAnn.points[0].x * RENDER_SCALE,
                        top: editingAnn.points[0].y * RENDER_SCALE,
                        width: editingAnn.width * RENDER_SCALE,
                        height: editingAnn.height * RENDER_SCALE,
                        fontSize: (editingAnn.fontSize || (editingAnn.type === 'callout' ? 14 : 16)) * RENDER_SCALE,
                        fontFamily: `"${editingAnn.fontFamily || 'Arial'}", sans-serif`,
                        fontWeight: editingAnn.bold ? 'bold' : 'normal',
                        fontStyle: editingAnn.italic ? 'italic' : 'normal',
                        textDecoration: [editingAnn.underline && 'underline', editingAnn.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
                        textAlign: editingAnn.textAlign || 'left',
                        color: editingAnn.type === 'callout' ? (editingAnn.color || '#000000') : editingAnn.color,
                        backgroundColor: editingAnn.type === 'callout' ? '#ffffff' : 'transparent',
                        lineHeight: String(editingAnn.lineHeight || 1.3),
                        opacity: editingAnn.type === 'callout' ? 1 : editingAnn.opacity,
                        padding: editingAnn.type === 'callout' ? `${4 * RENDER_SCALE}px` : '0',
                      }}
                      className={`border-2 border-[#3B82F6] outline-none resize-none font-sans m-0 overflow-hidden ${
                        editingAnn.type === 'callout' ? '' : 'bg-transparent p-0'
                      }`}
                      placeholder="Type here..."
                    />
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </div>

      {/* ── Floating text selection toolbar ────────── */}
      {selectTextToolbar && (() => {
        const activeCanvas = pageRefsMap.current.get(activePageRef.current)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        const screenX = canvasRect.left + selectTextToolbar.docPos.x * RENDER_SCALE * zoom
        const screenY = canvasRect.top + selectTextToolbar.docPos.y * RENDER_SCALE * zoom
        const clampedX = Math.max(80, Math.min(window.innerWidth - 80, screenX))
        const clampedY = Math.max(8, screenY - 44)
        return (
          <div
            style={{ position: 'fixed', left: clampedX, top: clampedY, transform: 'translateX(-50%)', zIndex: 50 }}
            className="flex items-center gap-0.5 px-1 py-0.5 bg-[#1e1e2e] border border-white/10 rounded-lg shadow-lg"
          >
            <button
              title="Highlight"
              onClick={() => {
                const ann: Annotation = {
                  id: genId(), type: 'highlighter',
                  points: [{ x: 0, y: 0 }], color: '#FFFF00', strokeWidth: 0,
                  opacity: 0.4, fontSize, rects: [...selectTextToolbar.rects],
                }
                commitAnnotation(ann)
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <Highlighter size={14} />
            </button>
            <button
              title="Strikethrough"
              onClick={() => {
                const ann: Annotation = {
                  id: genId(), type: 'highlighter',
                  points: [{ x: 0, y: 0 }], color: '#FF0000', strokeWidth: 0,
                  opacity: 1, fontSize, rects: [...selectTextToolbar.rects],
                  strikethrough: true,
                }
                commitAnnotation(ann)
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <Strikethrough size={14} />
            </button>
            <button
              title="Copy text"
              onClick={() => {
                const text = selectTextToolbar.items.map(i => i.text).join(' ')
                navigator.clipboard.writeText(text).then(() => addToast({ type: 'success', message: 'Copied to clipboard' })).catch(() => {})
                setSelectTextToolbar(null)
                redrawAll()
              }}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded text-xs"
            >
              <TextSelect size={14} />
            </button>
          </div>
        )
      })()}

      {/* ── Compact status bar ────────────────────── */}
      <div className="grid grid-cols-3 items-center px-3 py-1.5 border-t border-white/[0.06] flex-shrink-0">
        {/* Left: file info */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/30 min-w-0">
          <span className="truncate max-w-[160px]">{pdfFile.name}</span>
          <span>{formatFileSize(pdfFile.size)}</span>
          {currentRotation !== 0 && <span>{currentRotation}°</span>}
        </div>

        {/* Center: page nav */}
        <div className="flex items-center justify-center gap-1">
          {pdfFile.pageCount > 1 ? (
            <>
              <button onClick={() => navigateToPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded hover:bg-white/[0.06]">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-white/50 flex items-center gap-0.5">
                <input
                  type="number"
                  min={1}
                  max={pdfFile.pageCount}
                  value={currentPage}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 1 && val <= pdfFile.pageCount) navigateToPage(val)
                  }}
                  className="w-8 px-0.5 py-0 text-[11px] text-center text-white/50 bg-transparent border border-white/[0.1] rounded focus:border-[#F47B20]/50 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span>/ {pdfFile.pageCount}</span>
              </span>
              <button onClick={() => navigateToPage(p => Math.min(pdfFile.pageCount, p + 1))} disabled={currentPage === pdfFile.pageCount}
                className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded hover:bg-white/[0.06]">
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <span className="text-[10px] text-white/30">1 page</span>
          )}
        </div>

        {/* Right: annotations + hint */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-white/25 min-w-0">
          <span>{(annotations[currentPage] || []).length} ann</span>
          {(measurements[currentPage] || []).length > 0 && (
            <span>· {(measurements[currentPage] || []).length} meas</span>
          )}
          <span className="truncate">· {
            selectedAnnId ? 'Arrows nudge · Del delete' :
            activeTool === 'select' ? 'Click to select' :
            activeTool === 'text' ? 'Drag to create text' :
            activeTool === 'callout' ? 'Drag to create callout' :
            activeTool === 'cloud' ? `${currentPtsRef.current.length} pts · Dbl-click close` :
            activeTool === 'measure' ? 'Click two points' :
            activeTool === 'textHighlight' ? 'Drag to highlight' :
            (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow')
              ? 'Shift for perfect shapes' :
            'Ctrl+scroll zoom'
          }</span>
        </div>
      </div>

      {/* ── Calibration modal ───────────────────────── */}
      <Modal open={calibrateModalOpen} onClose={() => setCalibrateModalOpen(false)} title="Calibrate Measurement" width="sm">
        {(() => {
          const m = calibrateMeasureId
            ? (measurements[currentPage] || []).find(ms => ms.id === calibrateMeasureId)
            : null
          const pxDist = m ? Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y) : 0
          const parsedVal = parseFloat(calibrateValue)
          const isValid = !isNaN(parsedVal) && parsedVal > 0 && pxDist > 0
          const showError = calibrateValue.length > 0 && !isValid
          return (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/60">
                This measurement is <span className="text-white font-medium">{pxDist.toFixed(1)} px</span>.
                Enter the real-world distance it represents:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={calibrateValue}
                  onChange={e => setCalibrateValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && isValid) {
                      setCalibration({ pixelsPerUnit: pxDist / parsedVal, unit: calibrateUnit })
                      setCalibrateModalOpen(false)
                    }
                  }}
                  placeholder="e.g. 12"
                  className={`flex-1 px-3 py-2 text-sm bg-dark-surface border rounded-lg text-white placeholder:text-white/30 focus:outline-none ${
                    showError ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.1] focus:border-[#F47B20]/50'
                  }`}
                  autoFocus
                />
                <select
                  value={calibrateUnit}
                  onChange={e => setCalibrateUnit(e.target.value)}
                  className="px-2 py-2 text-sm bg-dark-surface border border-white/[0.1] rounded-lg text-white"
                >
                  <option value="in">inches</option>
                  <option value="ft">feet</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">meters</option>
                </select>
              </div>
              {showError && (
                <p className="text-xs text-red-400">Enter a positive number greater than 0</p>
              )}
              <div className="flex items-center justify-between">
                {calibration.pixelsPerUnit !== null && (
                  <button
                    onClick={() => {
                      setCalibration({ pixelsPerUnit: null, unit: 'in' })
                      setCalibrateModalOpen(false)
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Reset Calibration
                  </button>
                )}
                <div className="flex-1" />
                <button
                  disabled={!isValid}
                  onClick={() => {
                    if (isValid) {
                      setCalibration({ pixelsPerUnit: pxDist / parsedVal, unit: calibrateUnit })
                      setCalibrateModalOpen(false)
                    }
                  }}
                  className="px-4 py-1.5 text-sm bg-[#F47B20] text-white rounded-lg hover:bg-[#F47B20]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
