import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { Button } from '@/components/common/Button.tsx'
import { Modal } from '@/components/common/Modal.tsx'
import { ColorPicker } from '@/components/common/ColorPicker.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { loadPDFFile, renderPageToCanvas, generateThumbnail, removePDFFromCache, getPDFBytes, extractPositionedText, getAllPageDimensions } from '@/utils/pdf.ts'
import { downloadBlob } from '@/utils/download.ts'
import { saveSession, loadSession, clearSession, computeFileHash } from './storage.ts'
import type { PdfAnnotateSession } from './storage.ts'
import { formatFileSize } from '@/utils/fileReader.ts'
import type { PDFFile } from '@/types'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import {
  Download, RotateCcw, RotateCw, Undo2, Redo2,
  Eraser, Highlighter,
  ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronLeft, ChevronRight, PanelLeft,
  X, Ruler, TextSelect, MousePointer2, Strikethrough, Paintbrush,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript, List, ListOrdered,
  Pin, Search, Crop, Tag,
} from 'lucide-react'

// ── Extracted modules ─────────────────────────────────
import type { ToolType, Point, Annotation, PageAnnotations, Measurement, CalibrationState, HandleId, PageRefs } from './types.ts'
import {
  RENDER_SCALE, MAX_HISTORY, HANDLE_SIZE, DEFAULT_TEXTBOX_W, DEFAULT_TEXTBOX_H,
  ANN_COLORS, HIGHLIGHT_COLORS, ZOOM_PRESETS, STAMP_PRESETS,
  DRAW_TOOLS, TEXT_TOOLS, DRAW_TYPES, TEXT_TYPES,
  FONT_FAMILIES, PDF_FONT_MAP, CURSOR_MAP, HANDLE_CURSOR_MAP,
  genId, resolvePdfFont, saveWithPicker, toPdfCoords,
} from './types.ts'
import {
  wrapText, computeTextBoxHeight, nearestPointOnRect, hitTestCalloutBox,
  getHandles, hitTestHandle, ptSegDist, hitTest,
  pathHitsCircle, splitPathByEraser, shapeToPolyline, getAnnotationBounds,
  snapToContent, rotatePoint,
  isPointInAnyTextItem, findIntersectingTextItems, flowSelectTextItems,
  hitTestMeasurementLabel,
  decimatePoints,
} from './geometry.ts'
import {
  drawCloudEdge, drawSmoothPath, drawAnnotation, drawSelectionUI, drawMeasurement,
} from './drawing.ts'
import FloatingToolbar from './FloatingToolbar.tsx'

// ── Thumbnail sidebar item ──────────────────────────────

const ThumbnailItem = memo(function ThumbnailItem({ pageNum, thumbnail, isCurrent, isSelected, hasAnnotations, onVisible, onClick, onDoubleClick }: {
  pageNum: number
  thumbnail?: string
  isCurrent: boolean
  isSelected: boolean
  hasAnnotations: boolean
  onVisible: (pageNum: number) => void
  onClick: (pageNum: number) => void
  onDoubleClick: (pageNum: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (thumbnail) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onVisible(pageNum); observer.disconnect() } },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnail])

  return (
    <div
      ref={ref}
      onClick={() => onClick(pageNum)}
      onDoubleClick={() => onDoubleClick(pageNum)}
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
})

// ── Annotation label helper ────────────────────────────

function annLabel(ann: Annotation): string {
  if (ann.stampType) return `Stamp: ${ann.stampType}`
  if (ann.text) return ann.text.slice(0, 30).replace(/\n/g, ' ')
  return ann.type.charAt(0).toUpperCase() + ann.type.slice(1)
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
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [superscript, setSuperscript] = useState(false)
  const [subscript, setSubscript] = useState(false)
  const [listType, setListType] = useState<'none' | 'bullet' | 'numbered'>('none')
  const [canvasCursor, setCanvasCursor] = useState<string | null>(null)
  const [selectTextToolbar, setSelectTextToolbar] = useState<{
    rects: { x: number; y: number; w: number; h: number }[]
    items: { text: string; x: number; y: number; width: number; height: number; page: number }[]
    docPos: { x: number; y: number }
  } | null>(null)
  const clipboardRef = useRef<Annotation | null>(null)
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null)

  // Feature: sticky tool, hover tooltip, context menu, annotation list, find, stamp, crop, page input
  const [stickyTool, setStickyTool] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annId: string; pageNum: number } | null>(null)
  const [annListOpen, setAnnListOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [findMatches, setFindMatches] = useState<{ pageNum: number; item: { text: string; x: number; y: number; width: number; height: number; page: number } }[]>([])
  const [findIdx, setFindIdx] = useState(0)
  const [findCacheTick, setFindCacheTick] = useState(0)
  const [findCaseSensitive, setFindCaseSensitive] = useState(false)
  const [stampDropdownOpen, setStampDropdownOpen] = useState(false)
  const [activeStampPreset, setActiveStampPreset] = useState(STAMP_PRESETS[0])
  const [cropRegions, setCropRegions] = useState<Record<number, { x: number; y: number; w: number; h: number }>>({})
  const [pageInputActive, setPageInputActive] = useState(false)
  const copiedStyleRef = useRef<{ color: string; strokeWidth: number; opacity: number; fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean } | null>(null)

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
  const [fillColor, setFillColor] = useState<string | null>(null)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [dashPattern, setDashPattern] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [arrowStart, setArrowStart] = useState(false)

  // Eraser
  const [eraserRadius, setEraserRadius] = useState(15)
  const [eraserMode, setEraserMode] = useState<'partial' | 'object'>('partial')
  const eraserModsRef = useRef<{ removed: Set<string>; added: Annotation[] }>({ removed: new Set(), added: [] })
  const canvasSnapshotRef = useRef<ImageData | null>(null)

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
  const stampDropdownRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const hoverPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const eraserCursorDivRef = useRef<HTMLDivElement>(null)
  const tooltipDivRef = useRef<HTMLDivElement>(null)
  const cropDrawRef = useRef<{ startPt: Point } | null>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)
  const currentPtsRef = useRef<Point[]>([])
  const pdfFileRef = useRef(pdfFile)
  pdfFileRef.current = pdfFile
  const fileHashRef = useRef<string | null>(null)
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
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'text' && hitTest(pt, ann, th)) return ann
    }
    return undefined
  }, [annotations])

  const findCalloutAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      const ann = pageAnns[i]
      if (ann.type === 'callout' && hitTest(pt, ann, th)) return ann
    }
    return undefined
  }, [annotations])

  const findAnnotationAt = useCallback((pt: Point, pageNum?: number): Annotation | undefined => {
    const page = pageNum ?? activePageRef.current
    const pageAnns = annotations[page] || []
    const th = 4 / zoomRef.current
    for (let i = pageAnns.length - 1; i >= 0; i--) {
      if (hitTest(pt, pageAnns[i], th)) return pageAnns[i]
    }
    return undefined
  }, [annotations])

  /** Find which page an annotation lives on (for overlays). */
  // O(1) annotation→page lookup (js-index-maps) — rebuilt only when annotations change
  const annPageMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const [pageStr, pageAnns] of Object.entries(annotations)) {
      for (const ann of pageAnns) map.set(ann.id, Number(pageStr))
    }
    return map
  }, [annotations])

  const findAnnotationPage = useCallback((id: string): number | null =>
    annPageMap.get(id) ?? null
  , [annPageMap])

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

    // Find highlights
    if (findMatches.length > 0) {
      ctx.save()
      for (let fi = 0; fi < findMatches.length; fi++) {
        const fm = findMatches[fi]
        if (fm.pageNum !== pageNum) continue
        const item = fm.item
        ctx.globalAlpha = fi === findIdx ? 0.7 : 0.35
        ctx.fillStyle = fi === findIdx ? '#f97316' : '#facc15'
        ctx.fillRect(item.x * RENDER_SCALE, item.y * RENDER_SCALE, item.width * RENDER_SCALE, item.height * RENDER_SCALE)
      }
      ctx.restore()
    }

    // Crop region overlay
    const cropRgn = cropRegions[pageNum]
    if (cropRgn) {
      const dims = pageDimsMap.current.get(pageNum)
      if (dims) {
        ctx.save()
        ctx.globalAlpha = 0.45
        ctx.fillStyle = '#000000'
        // Outside crop: 4 rects
        ctx.fillRect(0, 0, dims.width * RENDER_SCALE, cropRgn.y * RENDER_SCALE)
        ctx.fillRect(0, (cropRgn.y + cropRgn.h) * RENDER_SCALE, dims.width * RENDER_SCALE, (dims.height - cropRgn.y - cropRgn.h) * RENDER_SCALE)
        ctx.fillRect(0, cropRgn.y * RENDER_SCALE, cropRgn.x * RENDER_SCALE, cropRgn.h * RENDER_SCALE)
        ctx.fillRect((cropRgn.x + cropRgn.w) * RENDER_SCALE, cropRgn.y * RENDER_SCALE, (dims.width - cropRgn.x - cropRgn.w) * RENDER_SCALE, cropRgn.h * RENDER_SCALE)
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(cropRgn.x * RENDER_SCALE, cropRgn.y * RENDER_SCALE, cropRgn.w * RENDER_SCALE, cropRgn.h * RENDER_SCALE)
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // Crop in-progress preview
    if (activeTool === 'crop' && isActive && cropDrawRef.current && currentPtsRef.current.length >= 2) {
      const cpts = currentPtsRef.current
      const cx = Math.min(cpts[0].x, cpts[1].x)
      const cy = Math.min(cpts[0].y, cpts[1].y)
      const cw = Math.abs(cpts[1].x - cpts[0].x)
      const ch = Math.abs(cpts[1].y - cpts[0].y)
      ctx.save()
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.globalAlpha = 0.8
      ctx.strokeRect(cx * RENDER_SCALE, cy * RENDER_SCALE, cw * RENDER_SCALE, ch * RENDER_SCALE)
      ctx.setLineDash([])
      ctx.restore()
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
            ...(fillColor && (activeTool === 'rectangle' || activeTool === 'circle') ? { fillColor } : {}),
            ...(cornerRadius > 0 && activeTool === 'rectangle' ? { cornerRadius } : {}),
            ...(dashPattern !== 'solid' ? { dashPattern } : {}),
            ...(arrowStart && activeTool === 'arrow' ? { arrowStart: true } : {}),
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

        // Snap indicator: highlight first vertex when cursor is near it
        if (preview && cpts.length >= 3) {
          const snapDist = Math.hypot(preview.x - cpts[0].x, preview.y - cpts[0].y)
          if (snapDist < 15 / zoomRef.current) {
            ctx.strokeStyle = '#22C55E'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(cpts[0].x * scale, cpts[0].y * scale, 8, 0, Math.PI * 2)
            ctx.stroke()
          }
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
  }, [annotations, activeTool, selectedAnnId, color, strokeWidth, opacity, fontSize, measurements, calibration, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId, getAnnotation, findMatches, findIdx, cropRegions])

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
    setSuperscript(ann.superscript || false)
    setSubscript(ann.subscript || false)
    setListType(ann.listType || 'none')
    // Auto-focus textarea
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }))
  }, [annotations])

  // ── Fit to window ──────────────────────────────────

  const fitToWindow = useCallback(() => {
    if (!scrollRef.current || maxCanvasWidthRef.current === 0) return
    const containerW = scrollRef.current.clientWidth - 48
    const scaleW = containerW / maxCanvasWidthRef.current
    const newZoom = Math.round(Math.max(0.25, Math.min(4.0, scaleW)) * 100) / 100
    setZoom(newZoom)
    // Reset scroll to top-left so page is fully visible
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
        scrollRef.current.scrollLeft = 0
      }
    })
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

      // Compute file hash for session matching
      const hash = await computeFileHash(file)
      fileHashRef.current = hash

      // Restore session if file matches
      const session = loadSession()
      const hashMatch = !session?.fileHash || session.fileHash === hash
      if (session?.version === 1 && session.file.fileName === file.name && session.file.fileSize === file.size && hashMatch) {
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
        setTextAlign(session.textAlign as 'left' | 'center' | 'right' | 'justify')
        setTextBgColor(session.textBgColor)
        setLineSpacing(session.lineSpacing)
        if (session.superscript !== undefined) setSuperscript(session.superscript)
        if (session.subscript !== undefined) setSubscript(session.subscript)
        if (session.listType !== undefined) setListType(session.listType as 'none' | 'bullet' | 'numbered')
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
          fileHash: fileHashRef.current ?? undefined,
          annotations, measurements, pageRotations, calibration,
          zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
          color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
          bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
          superscript, subscript, listType,
          eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
        } satisfies PdfAnnotateSession)
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [annotations, measurements, pageRotations, calibration,
      zoom, currentPage, color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      superscript, subscript, listType,
      eraserRadius, eraserMode, activeHighlight, activeDraw, activeText])

  // ── Debounced session save ─────────────────────────
  useEffect(() => {
    if (!pdfFile) return
    const timer = setTimeout(() => {
      const el = scrollRef.current
      saveSession({
        version: 1,
        file: { fileName: pdfFile.name, fileSize: pdfFile.size },
        fileHash: fileHashRef.current ?? undefined,
        annotations, measurements, pageRotations, calibration,
        zoom, scrollTop: el?.scrollTop ?? 0, scrollLeft: el?.scrollLeft ?? 0, currentPage,
        color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
        bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
        superscript, subscript, listType,
        eraserRadius, eraserMode, activeHighlight, activeDraw, activeText,
      } satisfies PdfAnnotateSession)
    }, 1500)
    return () => clearTimeout(timer)
  }, [pdfFile, annotations, measurements, pageRotations, calibration, zoom, currentPage,
      color, fontSize, fontFamily, strokeWidth, opacity, activeTool,
      bold, italic, underline, strikethrough, textAlign, textBgColor, lineSpacing,
      superscript, subscript, listType,
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

  // Stable thumbnail callbacks — required for React.memo(ThumbnailItem) to skip re-renders
  const handleThumbVisible = useCallback((pageNum: number) => { loadThumbnail(pageNum) }, [loadThumbnail])
  const handleThumbClick = useCallback((pageNum: number) => { navigateToPage(pageNum) }, [navigateToPage])

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

  // Full redraw when annotations or measurements change (affects any page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawAll() }, [annotations, measurements, calibration])

  // Scoped redraw for selection/hover changes (only affects active page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawPage(activePageRef.current) }, [selectedAnnId, selectedMeasureId, selectedArrowIdx, selectTextToolbar, hoveredAnnId])

  // Redraw all when find matches change (they span all pages)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { redrawAll() }, [findMatches, findIdx, cropRegions])

  // Find & Highlight: navigate to current match page + scroll into view
  useEffect(() => {
    if (findMatches.length === 0 || !findMatches[findIdx]) return
    const match = findMatches[findIdx]
    navigateToPage(match.pageNum)
    // Scroll the match into view within the canvas scroll container
    requestAnimationFrame(() => {
      const scrollEl = scrollRef.current
      const refs = pageRefsMap.current.get(match.pageNum)
      if (!scrollEl || !refs) return
      const scale = RENDER_SCALE * zoomRef.current
      const matchCenterX = match.item.x * scale + match.item.width * scale / 2
      const matchCenterY = match.item.y * scale + match.item.height * scale / 2
      const canvasRect = refs.annCanvas.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const targetScrollLeft = scrollEl.scrollLeft + (canvasRect.left - scrollRect.left) + matchCenterX - scrollEl.clientWidth / 2
      const targetScrollTop = scrollEl.scrollTop + (canvasRect.top - scrollRect.top) + matchCenterY - scrollEl.clientHeight / 2
      scrollEl.scrollTo({ left: Math.max(0, targetScrollLeft), top: Math.max(0, targetScrollTop), behavior: 'smooth' })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findIdx, findMatches])

  // Find & Highlight: search text items when query or cache changes
  useEffect(() => {
    if (!findQuery.trim()) { setFindMatches([]); setFindIdx(0); return }
    const q = findCaseSensitive ? findQuery : findQuery.toLowerCase()
    const matches: { pageNum: number; item: { text: string; x: number; y: number; width: number; height: number; page: number } }[] = []
    for (const [key, items] of Object.entries(textItemsCacheRef.current)) {
      const pageNum = parseInt(key.split('_')[0])
      for (const item of items) {
        const text = findCaseSensitive ? item.text : item.text.toLowerCase()
        if (text.includes(q)) matches.push({ pageNum, item })
      }
    }
    matches.sort((a, b) => a.pageNum - b.pageNum || a.item.y - b.item.y)
    setFindMatches(matches)
    setFindIdx(prev => (prev < matches.length ? prev : 0))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findQuery, findCacheTick, findCaseSensitive])

  // Context menu: close on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

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

      // ── Ctrl+F: find | F3/Shift+F3: next/prev match ──
      if (mod && e.key === 'f') {
        e.preventDefault()
        setFindOpen(o => { if (!o) setTimeout(() => findInputRef.current?.focus(), 50); return true })
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        if (!findOpen) { setFindOpen(true); setTimeout(() => findInputRef.current?.focus(), 50); return }
        setFindIdx(i => e.shiftKey ? (i - 1 + Math.max(1, findMatches.length)) % Math.max(1, findMatches.length) : (i + 1) % Math.max(1, findMatches.length))
        return
      }

      // ── Escape: context-dependent ──
      if (e.key === 'Escape') {
        e.preventDefault()
        // Close context menu
        if (contextMenu) { setContextMenu(null); return }
        // Close find bar
        if (findOpen) { setFindOpen(false); setFindQuery(''); setFindMatches([]); return }
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

      // ── Ctrl+A: Select all annotations on current page ──
      if (mod && e.key === 'a' && !editingTextId) {
        e.preventDefault()
        const pageAnns = annotations[activePageRef.current] || []
        if (pageAnns.length > 0) {
          setSelectedAnnId(pageAnns[pageAnns.length - 1].id)
          setActiveTool('select')
        }
        return
      }

      // ── Single-letter tool switching (no modifier) ──
      if (!mod && !e.shiftKey && !e.altKey) {
        const toolMap: Record<string, ToolType> = {
          s: 'select', p: 'pencil', l: 'line', a: 'arrow', r: 'rectangle', c: 'circle', k: 'cloud',
          t: 'text', o: 'callout', e: 'eraser', h: 'highlighter', m: 'measure',
          g: 'stamp', x: 'crop',
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
      redrawAll, redrawPage, annotations, commitAnnotation, updateAnnotation, fitToWindow, selectedArrowIdx, navigateToPage, selectTextToolbar, zoomAtCenter, pushHistory, addToast,
      contextMenu, findOpen, findMatches])

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
    if (eraserCursorDivRef.current) eraserCursorDivRef.current.style.display = 'none'
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
    if (editingTextId && activeTool !== 'text' && activeTool !== 'callout') {
      // Commit any open text edit when switching away from text tools
      commitTextEditing()
    }
    // Hide eraser cursor overlay when switching away from eraser tool
    if (activeTool !== 'eraser' && eraserCursorDivRef.current) {
      eraserCursorDivRef.current.style.display = 'none'
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  // ── Close dropdowns on outside click (single shared listener) ──

  useEffect(() => {
    if (!shapesDropdownOpen && !textDropdownOpen && !zoomDropdownOpen && !stampDropdownOpen) return
    const handler = (e: PointerEvent) => {
      const t = e.target as Node
      if (shapesDropdownOpen && shapesDropdownRef.current && !shapesDropdownRef.current.contains(t)) setShapesDropdownOpen(false)
      if (textDropdownOpen && textDropdownRef.current && !textDropdownRef.current.contains(t)) setTextDropdownOpen(false)
      if (zoomDropdownOpen && zoomDropdownRef.current && !zoomDropdownRef.current.contains(t)) setZoomDropdownOpen(false)
      if (stampDropdownOpen && stampDropdownRef.current && !stampDropdownRef.current.contains(t)) setStampDropdownOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [shapesDropdownOpen, textDropdownOpen, zoomDropdownOpen, stampDropdownOpen])

  // ── Cache text items for text highlight and find ───────────────

  useEffect(() => {
    if (!pdfFile || (activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'select' && !findOpen)) return
    // When find is open, cache ALL pages; otherwise only rendered pages
    const pagesToCache = findOpen
      ? Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1)
      : Array.from(renderedPagesRef.current)
    for (const pageNum of pagesToCache) {
      const rotation = pageRotations[pageNum] || 0
      const cacheKey = `${pageNum}_${rotation}`
      if (textItemsCacheRef.current[cacheKey]) continue
      extractPositionedText(pdfFile, pageNum, rotation).then(result => {
        textItemsCacheRef.current[cacheKey] = result.items
        if (findOpen) setFindCacheTick(t => t + 1)
      }).catch(() => {})
    }
  }, [pdfFile, activeTool, pageRotations, dimsReady, findOpen])

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
          ? snapToContent(pt, measureStartRef.current, annCanvas, 30, 3, RENDER_SCALE)
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

      // Check resize handles or body click on selected text/callout
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
          // Click inside selected text/callout body → double-click edits, single-click moves
          if (hitTest(pt, ann, 4 / zoom)) {
            if (isDoubleClick) {
              setActiveTool(ann.type === 'callout' ? 'callout' : 'text')
              enterEditMode(ann.id)
            } else {
              isDrawingRef.current = true
              textDragRef.current = {
                mode: 'move', startPt: pt,
                origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
                origArrows: ann.arrows ? [...ann.arrows] : undefined,
              }
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
        setFillColor(hitAnn.fillColor || null)
        setCornerRadius(hitAnn.cornerRadius || 0)
        setDashPattern(hitAnn.dashPattern || 'solid')
        setArrowStart(hitAnn.arrowStart || false)
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
          setSuperscript(hitAnn.superscript || false)
          setSubscript(hitAnn.subscript || false)
          setListType(hitAnn.listType || 'none')
        }
        // Click text/callout → double-click edits, single-click selects + moves
        if (hitAnn.type === 'text' || hitAnn.type === 'callout') {
          if (isDoubleClick) {
            setActiveTool(hitAnn.type === 'callout' ? 'callout' : 'text')
            enterEditMode(hitAnn.id)
          } else if (hitAnn.width && hitAnn.height) {
            isDrawingRef.current = true
            textDragRef.current = {
              mode: 'move', startPt: pt,
              origPoints: [...hitAnn.points], origWidth: hitAnn.width, origHeight: hitAnn.height,
              origArrows: hitAnn.arrows ? [...hitAnn.arrows] : undefined,
            }
          }
          return
        }
        // For non-text annotations, start general move drag
        isDrawingRef.current = true
        generalDragRef.current = {
          annId: hitAnn.id, startPt: pt, origPoints: [...hitAnn.points],
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

      // Auto-close: click near first vertex to close polygon
      const closeThreshold = 15 / zoom
      if (!isDbl && currentPtsRef.current.length >= 3) {
        const first = currentPtsRef.current[0]
        if (Math.hypot(pt.x - first.x, pt.y - first.y) < closeThreshold) {
          const pts = [...currentPtsRef.current]
          const ann: Annotation = {
            id: genId(), type: 'cloud',
            points: pts, color, strokeWidth, opacity: opacity / 100, fontSize,
            ...(fillColor ? { fillColor } : {}),
            ...(dashPattern !== 'solid' ? { dashPattern } : {}),
          }
          commitAnnotation(ann)
          currentPtsRef.current = []
          cloudPreviewRef.current = null
          cloudLastClickRef.current = { time: 0, pt: { x: 0, y: 0 } }
          redrawPage(pageNum)
          return
        }
      }

      // Double-click: finalize polygon if we have enough vertices
      if (isDbl && currentPtsRef.current.length >= 3) {
        const pts = [...currentPtsRef.current]
        const ann: Annotation = {
          id: genId(), type: 'cloud',
          points: pts, color, strokeWidth, opacity: opacity / 100, fontSize,
          ...(fillColor ? { fillColor } : {}),
          ...(dashPattern !== 'solid' ? { dashPattern } : {}),
        }
        commitAnnotation(ann)
        setSelectedAnnId(ann.id)
        if (!stickyTool) setActiveTool('select')
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
      // If currently editing, check if click is inside the active callout — let textarea handle it
      if (editingTextId) {
        const editAnn = getAnnotation(editingTextId)
        if (editAnn && hitTestCalloutBox(pt, editAnn)) {
          return
        }
        commitTextEditing()
      }

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

          // Click inside box → double-click edits, single-click moves
          if (hitTestCalloutBox(pt, ann)) {
            if (isDoubleClick) {
              enterEditMode(ann.id)
            } else {
              isDrawingRef.current = true
              textDragRef.current = {
                mode: 'move', startPt: pt,
                origPoints: [...ann.points], origWidth: ann.width, origHeight: ann.height,
                origArrows: ann.arrows ? [...ann.arrows] : undefined,
              }
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

      // Check if clicking on an existing callout → single-click edits (callout tool is active)
      const hitCallout = findCalloutAt(pt)
      if (hitCallout) {
        setSelectedAnnId(hitCallout.id)
        enterEditMode(hitCallout.id)
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
      // If currently editing, check if click is inside the active textbox — let textarea handle it
      if (editingTextId) {
        const editAnn = getAnnotation(editingTextId)
        if (editAnn && hitTest(pt, editAnn, 4 / zoom)) {
          // Click inside current editing textbox — do nothing, textarea handles cursor
          return
        }
        // Clicked outside — commit and continue
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
        }
      }

      // Check if clicking on any text annotation → single-click edits (text tool is active)
      const hitAnn = findTextAnnotationAt(pt)
      if (hitAnn) {
        setSelectedAnnId(hitAnn.id)
        enterEditMode(hitAnn.id)
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

    // ── Stamp tool: click to place ──
    if (activeTool === 'stamp') {
      const ann: Annotation = {
        id: genId(),
        type: 'stamp',
        points: [{ x: pt.x - 60, y: pt.y - 20 }],
        color: activeStampPreset.color,
        strokeWidth: 2,
        opacity: opacity / 100,
        fontSize: 16,
        width: 120,
        height: 40,
        stampType: activeStampPreset.label,
        backgroundColor: activeStampPreset.bg,
      }
      commitAnnotation(ann)
      setSelectedAnnId(ann.id)
      if (!stickyTool) setActiveTool('select')
      return
    }

    // ── Crop tool: start dragging crop region ──
    if (activeTool === 'crop') {
      cropDrawRef.current = { startPt: pt }
      isDrawingRef.current = true
      currentPtsRef.current = [pt]
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
          setSuperscript(hitAny.superscript || false)
          setSubscript(hitAny.subscript || false)
          setListType(hitAny.listType || 'none')
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

    // Snapshot canvas for incremental freehand rendering
    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      const annCanvas = pageRefsMap.current.get(pageNum)?.annCanvas
      if (annCanvas) {
        const ctx = annCanvas.getContext('2d')
        if (ctx) canvasSnapshotRef.current = ctx.getImageData(0, 0, annCanvas.width, annCanvas.height)
      }
    }

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
      eraserRadius, eraserMode, zoom, color, strokeWidth, fontSize, opacity, fontFamily, bold, italic, underline, textAlign,
      activeStampPreset, stickyTool])

  const handlePointerMove = useCallback((e: React.PointerEvent, pageNum: number) => {
    // Track cursor position for hover tooltip — update DOM directly to avoid re-renders on every move
    hoverPosRef.current = { x: e.clientX, y: e.clientY }
    if (tooltipDivRef.current) {
      tooltipDivRef.current.style.left = `${e.clientX + 14}px`
      tooltipDivRef.current.style.top = `${e.clientY - 28}px`
    }
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
    // Eraser cursor — update fixed overlay div directly to avoid state re-renders
    if (activeTool === 'eraser' && eraserCursorDivRef.current) {
      const size = eraserRadius * 2
      const style = eraserCursorDivRef.current.style
      style.display = 'block'
      style.left = `${e.clientX - eraserRadius}px`
      style.top = `${e.clientY - eraserRadius}px`
      style.width = `${size}px`
      style.height = `${size}px`
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

    // Crop tool: draw dashed rectangle preview
    if (activeTool === 'crop' && cropDrawRef.current && isDrawingRef.current) {
      currentPtsRef.current = [cropDrawRef.current.startPt, getPointForPage(ap, e)]
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
          if (hitTest(hoverPt, selAnn, 4 / zoom)) { setCanvasCursor('grab'); return }
        }
      }
      // Check if hovering over any text/callout annotation
      const targetType = activeTool === 'text' ? 'text' : 'callout'
      const pageAnns = annotations[ap] || []
      for (let i = pageAnns.length - 1; i >= 0; i--) {
        if (pageAnns[i].type === targetType && hitTest(hoverPt, pageAnns[i], 4 / zoom)) { setCanvasCursor('grab'); return }
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
          if (hitTest(hoverPt, selAnn, 4 / zoom)) {
            setCanvasCursor((selAnn.type === 'text' || selAnn.type === 'callout') ? 'grab' : 'move')
            return
          }
        }
      }
      // 2. Check if hovering over any annotation
      const hoveredAnn = findAnnotationAt(hoverPt, pageNum)
      setHoveredAnnId(hoveredAnn?.id ?? null)
      if (hoveredAnn) {
        // Show I-beam for text/callout annotations, move for everything else
        setCanvasCursor((hoveredAnn.type === 'text' || hoveredAnn.type === 'callout') ? 'grab' : 'move')
        return
      }
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
        setCanvasCursor('grabbing')
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
            newH = computeTextBoxHeight({ ...ann, width: newW }, DEFAULT_TEXTBOX_H)
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
          setCanvasCursor('grabbing')
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
            newH = computeTextBoxHeight({ ...ann, width: newW }, DEFAULT_TEXTBOX_H)
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
        // Incremental rendering: restore snapshot + draw only current stroke
        if (!straightLineMode && canvasSnapshotRef.current) {
          const annCanvas = pageRefsMap.current.get(ap)?.annCanvas
          if (annCanvas) {
            const ctx = annCanvas.getContext('2d')
            if (ctx) {
              ctx.putImageData(canvasSnapshotRef.current, 0, 0)
              ctx.save()
              ctx.globalAlpha = opacity / 100
              ctx.strokeStyle = color
              ctx.lineWidth = strokeWidth * RENDER_SCALE
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              if (activeTool === 'highlighter') ctx.globalCompositeOperation = 'multiply'
              drawSmoothPath(ctx, currentPtsRef.current, RENDER_SCALE)
              ctx.restore()
              return
            }
          }
        }
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
    canvasSnapshotRef.current = null
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
          superscript, subscript, listType,
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
          superscript, subscript, listType,
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

    // Crop tool: finalize crop region
    if (activeTool === 'crop') {
      if (cropDrawRef.current && currentPtsRef.current.length >= 2) {
        const cpts = currentPtsRef.current
        const x = Math.min(cpts[0].x, cpts[1].x)
        const y = Math.min(cpts[0].y, cpts[1].y)
        const w = Math.abs(cpts[1].x - cpts[0].x)
        const h = Math.abs(cpts[1].y - cpts[0].y)
        if (w > 5 && h > 5) {
          setCropRegions(prev => ({ ...prev, [ap]: { x, y, w, h } }))
        }
      }
      cropDrawRef.current = null
      currentPtsRef.current = []
      redrawPage(ap)
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
    const isPencilOrHL = activeTool === 'pencil' || isHL
    const finalPts = isPencilOrHL ? decimatePoints([...pts], isHL ? 1.0 : 0.5) : [...pts]
    const ann: Annotation = {
      id: genId(),
      type: activeTool as Exclude<ToolType, 'select' | 'eraser' | 'measure' | 'textHighlight' | 'textStrikethrough' | 'crop'>,
      points: finalPts,
      color,
      strokeWidth: isHL ? strokeWidth * 3 : strokeWidth,
      opacity: isHL ? 0.4 : opacity / 100,
      fontSize,
      ...(fillColor && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud') ? { fillColor } : {}),
      ...(cornerRadius > 0 && activeTool === 'rectangle' ? { cornerRadius } : {}),
      ...(dashPattern !== 'solid' ? { dashPattern } : {}),
      ...(arrowStart && activeTool === 'arrow' ? { arrowStart: true } : {}),
    }
    currentPtsRef.current = []
    commitAnnotation(ann)
    // Auto-select shapes/arrows/lines after drawing; skip pencil & highlighter
    if (activeTool !== 'pencil' && activeTool !== 'highlighter') {
      setSelectedAnnId(ann.id)
    }
    if (!stickyTool) setActiveTool('select')
  }, [activeTool, color, strokeWidth, opacity, fontSize, fillColor, cornerRadius, dashPattern, arrowStart, commitAnnotation,
      pushHistory, redrawPage, annotations, getAnnotation, updateAnnotation, selectedAnnId, stickyTool])

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
              } else if (ann.points.length >= 3 && ann.smooth !== false) {
                // Export as SVG cubic Bézier (Catmull-Rom) for smooth curves
                const pts = ann.points
                const first = toPC(pts[0])
                const tension = 0.3
                let svgD = `M 0 0`
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[Math.max(0, i - 1)]
                  const p1 = pts[i]
                  const p2 = pts[i + 1]
                  const p3 = pts[Math.min(pts.length - 1, i + 2)]
                  const cp1 = toPC({ x: p1.x + (p2.x - p0.x) * tension, y: p1.y + (p2.y - p0.y) * tension })
                  const cp2 = toPC({ x: p2.x - (p3.x - p1.x) * tension, y: p2.y - (p3.y - p1.y) * tension })
                  const ep = toPC(p2)
                  svgD += ` C ${cp1.x - first.x} ${-(cp1.y - first.y)} ${cp2.x - first.x} ${-(cp2.y - first.y)} ${ep.x - first.x} ${-(ep.y - first.y)}`
                }
                page.drawSvgPath(svgD, {
                  x: first.x, y: first.y,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                })
              } else {
                // Straight segments (eraser fragments or < 3 points)
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
            case 'line': {
              if (ann.points.length < 2) break
              const lineOpts: Record<string, unknown> = {
                start: toPC(ann.points[0]), end: toPC(ann.points[1]),
                thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
              }
              if (ann.dashPattern === 'dashed') lineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') lineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawLine(lineOpts as unknown as Parameters<typeof page.drawLine>[0])
              break
            }
            case 'arrow': {
              if (ann.points.length < 2) break
              const s = toPC(ann.points[0])
              const e = toPC(ann.points[1])
              const pdfAngle = Math.atan2(e.y - s.y, e.x - s.x)
              const hl = Math.min(20, Math.max(10, ann.strokeWidth * 2.5))
              const halfAngle = Math.PI / 7
              // End arrowhead base
              const baseX = e.x - hl * Math.cos(pdfAngle)
              const baseY = e.y - hl * Math.sin(pdfAngle)
              // Start arrowhead base (for double-headed)
              const lineStart = ann.arrowStart
                ? { x: s.x + hl * Math.cos(pdfAngle), y: s.y + hl * Math.sin(pdfAngle) }
                : s
              const arrowLineOpts: Record<string, unknown> = { start: lineStart, end: { x: baseX, y: baseY }, thickness: ann.strokeWidth, color: c, opacity: ann.opacity }
              if (ann.dashPattern === 'dashed') arrowLineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') arrowLineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawLine(arrowLineOpts as unknown as Parameters<typeof page.drawLine>[0])
              // End arrowhead
              const lxOff = -hl * Math.cos(pdfAngle - halfAngle)
              const lyOff = hl * Math.sin(pdfAngle - halfAngle)
              const rxOff = -hl * Math.cos(pdfAngle + halfAngle)
              const ryOff = hl * Math.sin(pdfAngle + halfAngle)
              page.drawSvgPath(`M 0 0 L ${lxOff} ${lyOff} L ${rxOff} ${ryOff} Z`, {
                x: e.x, y: e.y, color: c, opacity: ann.opacity, borderWidth: 0,
              })
              // Start arrowhead (double-headed)
              if (ann.arrowStart) {
                const revAngle = pdfAngle + Math.PI
                const slxOff = -hl * Math.cos(revAngle - halfAngle)
                const slyOff = hl * Math.sin(revAngle - halfAngle)
                const srxOff = -hl * Math.cos(revAngle + halfAngle)
                const sryOff = hl * Math.sin(revAngle + halfAngle)
                page.drawSvgPath(`M 0 0 L ${slxOff} ${slyOff} L ${srxOff} ${sryOff} Z`, {
                  x: s.x, y: s.y, color: c, opacity: ann.opacity, borderWidth: 0,
                })
              }
              break
            }
            case 'rectangle': {
              if (ann.points.length < 2) break
              const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.max(ann.points[0].y, ann.points[1].y) })
              const rw = Math.abs(ann.points[1].x - ann.points[0].x)
              const rh = Math.abs(ann.points[1].y - ann.points[0].y)
              const rectOpts: Record<string, unknown> = {
                x: tl.x, y: tl.y, width: rw, height: rh,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (ann.fillColor) {
                const fc = ann.fillColor
                const fr = parseInt(fc.slice(1, 3), 16) / 255
                const fg = parseInt(fc.slice(3, 5), 16) / 255
                const fb = parseInt(fc.slice(5, 7), 16) / 255
                rectOpts.color = rgb(fr, fg, fb)
                rectOpts.opacity = ann.opacity
              }
              if (ann.dashPattern === 'dashed') rectOpts.borderDashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') rectOpts.borderDashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawRectangle(rectOpts as Parameters<typeof page.drawRectangle>[0])
              break
            }
            case 'cloud': {
              if (ann.points.length < 3) break
              // Fill polygon if fillColor set
              if (ann.fillColor) {
                const fc = ann.fillColor
                const fr = parseInt(fc.slice(1, 3), 16) / 255
                const fg = parseInt(fc.slice(3, 5), 16) / 255
                const fb = parseInt(fc.slice(5, 7), 16) / 255
                const first = toPC(ann.points[0])
                let svgD = `M ${0} ${0}`
                for (let pi = 1; pi < ann.points.length; pi++) {
                  const pt = toPC(ann.points[pi])
                  svgD += ` L ${pt.x - first.x} ${-(pt.y - first.y)}`
                }
                svgD += ' Z'
                page.drawSvgPath(svgD, { x: first.x, y: first.y, color: rgb(fr, fg, fb), opacity: ann.opacity, borderWidth: 0 })
              }
              // Bumpy outline as SVG quadratic Bézier curves
              {
                const firstPt = toPC(ann.points[0])
                let svgPath = `M ${0} ${0}`
                for (let ei = 0; ei < ann.points.length; ei++) {
                  const edgeStart = ann.points[ei]
                  const edgeEnd = ann.points[(ei + 1) % ann.points.length]
                  const edgeLen = Math.hypot(edgeEnd.x - edgeStart.x, edgeEnd.y - edgeStart.y)
                  const arcSz = 20
                  const numBumps = Math.max(2, Math.round(edgeLen / arcSz))
                  const ddx = (edgeEnd.x - edgeStart.x) / numBumps
                  const ddy = (edgeEnd.y - edgeStart.y) / numBumps
                  const len = Math.hypot(ddx, ddy)
                  if (len === 0) continue
                  const nx = (ddy / len) * arcSz * 0.4
                  const ny = (-ddx / len) * arcSz * 0.4
                  for (let i = 0; i < numBumps; i++) {
                    const ex = edgeStart.x + ddx * (i + 1), ey = edgeStart.y + ddy * (i + 1)
                    const sx = edgeStart.x + ddx * i, sy = edgeStart.y + ddy * i
                    const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
                    const cp = toPC({ x: mx, y: my })
                    const ep = toPC({ x: ex, y: ey })
                    // SVG Y is inverted vs PDF Y — negate offsets
                    svgPath += ` Q ${cp.x - firstPt.x} ${-(cp.y - firstPt.y)} ${ep.x - firstPt.x} ${-(ep.y - firstPt.y)}`
                  }
                }
                svgPath += ' Z'
                const cloudDash = ann.dashPattern === 'dashed' ? [ann.strokeWidth * 3, ann.strokeWidth * 2]
                  : ann.dashPattern === 'dotted' ? [ann.strokeWidth, ann.strokeWidth * 2] : undefined
                const pathOpts: Record<string, unknown> = {
                  x: firstPt.x, y: firstPt.y,
                  borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
                }
                if (cloudDash) pathOpts.borderDashArray = cloudDash
                page.drawSvgPath(svgPath, pathOpts as Parameters<typeof page.drawSvgPath>[1])
              }
              break
            }
            case 'circle': {
              if (ann.points.length < 2) break
              const [c1, c2] = ann.points
              const center = toPC({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 })
              const ellipseOpts: Record<string, unknown> = {
                x: center.x, y: center.y,
                xScale: Math.abs(c2.x - c1.x) / 2,
                yScale: Math.abs(c2.y - c1.y) / 2,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (ann.fillColor) {
                const fc = ann.fillColor
                const fr = parseInt(fc.slice(1, 3), 16) / 255
                const fg = parseInt(fc.slice(3, 5), 16) / 255
                const fb = parseInt(fc.slice(5, 7), 16) / 255
                ellipseOpts.color = rgb(fr, fg, fb)
                ellipseOpts.opacity = ann.opacity
              }
              if (ann.dashPattern === 'dashed') ellipseOpts.borderDashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
              else if (ann.dashPattern === 'dotted') ellipseOpts.borderDashArray = [ann.strokeWidth, ann.strokeWidth * 2]
              page.drawEllipse(ellipseOpts as Parameters<typeof page.drawEllipse>[0])
              break
            }
            case 'text': {
              if (!ann.text || !ann.points.length) break
              const baseFsText = ann.fontSize || 16
              const fs = ann.superscript || ann.subscript ? baseFsText * 0.6 : baseFsText
              const yShift = ann.superscript ? -baseFsText * 0.4 : ann.subscript ? baseFsText * 0.2 : 0
              const pdfFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
              // Apply list prefix
              let exportText = ann.text
              if (ann.listType && ann.listType !== 'none') {
                exportText = ann.text.split('\n').map((line, idx) => {
                  if (!line.trim()) return line
                  return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
                }).join('\n')
              }
              const lines = ann.width ? wrapText(exportText, ann.width, fs, ann.bold, (t: string) => pdfFont.widthOfTextAtSize(t, fs)) : exportText.split('\n')
              const tAlign = ann.textAlign || 'left'
              for (let i = 0; i < lines.length; i++) {
                let xOff = 0
                if (ann.width && tAlign !== 'left') {
                  const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                  if (tAlign === 'center') xOff = (ann.width - tw) / 2
                  else if (tAlign === 'right') xOff = ann.width - tw
                }
                const linePt = toPC({ x: ann.points[0].x + xOff, y: ann.points[0].y + yShift + fs * (ann.lineHeight || 1.3) * i + fs })
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
                const baseCfs = cfs
                const effectiveCfs = ann.superscript || ann.subscript ? baseCfs * 0.6 : baseCfs
                const cYShift = ann.superscript ? -baseCfs * 0.4 : ann.subscript ? baseCfs * 0.2 : 0
                let cExportText = ann.text
                if (ann.listType && ann.listType !== 'none') {
                  cExportText = ann.text.split('\n').map((line, idx) => {
                    if (!line.trim()) return line
                    return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
                  }).join('\n')
                }
                const cLines = wrapText(cExportText, ann.width - 8, effectiveCfs, ann.bold, (t: string) => calloutFont.widthOfTextAtSize(t, effectiveCfs))
                const cAlign = ann.textAlign || 'left'
                for (let i = 0; i < cLines.length; i++) {
                  let cxOff = 4
                  if (cAlign !== 'left') {
                    const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                    if (cAlign === 'center') cxOff = 4 + (ann.width - 8 - ctw) / 2
                    else if (cAlign === 'right') cxOff = ann.width - 4 - ctw
                  }
                  const lPt = toPC({ x: boxPt.x + cxOff, y: boxPt.y + 4 + cYShift + effectiveCfs * (ann.lineHeight || 1.3) * i + effectiveCfs })
                  page.drawText(cLines[i], {
                    x: lPt.x, y: lPt.y,
                    size: effectiveCfs, font: calloutFont, color: c, opacity: 1,
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
            case 'stamp': {
              if (!ann.points.length || !ann.width || !ann.height) break
              const stampPt = toPC(ann.points[0])
              const stampTr = toPC({ x: ann.points[0].x + ann.width, y: ann.points[0].y })
              const stampW = Math.abs(stampTr.x - stampPt.x)
              const stampH = ann.height
              const stampX = Math.min(stampPt.x, stampTr.x)
              const stampY = stampPt.y - stampH
              // Background fill
              if (ann.backgroundColor) {
                const bgr = parseInt(ann.backgroundColor.slice(1, 3), 16) / 255
                const bgg = parseInt(ann.backgroundColor.slice(3, 5), 16) / 255
                const bgb = parseInt(ann.backgroundColor.slice(5, 7), 16) / 255
                page.drawRectangle({
                  x: stampX, y: stampY, width: stampW, height: stampH,
                  color: rgb(bgr, bgg, bgb), opacity: ann.opacity,
                })
              }
              // Border
              page.drawRectangle({
                x: stampX, y: stampY, width: stampW, height: stampH,
                borderColor: c, borderWidth: 1.5, opacity: ann.opacity,
              })
              // Text
              const stampFont = await getFont(ann.fontFamily || 'Arial', true, false)
              const stampLabel = ann.stampType || 'STAMP'
              const stampFs = Math.min(ann.height * 0.42, 18)
              const tw = stampFont.widthOfTextAtSize(stampLabel, stampFs)
              const sp = toPC({ x: ann.points[0].x + ann.width / 2, y: ann.points[0].y + ann.height / 2 })
              page.drawText(stampLabel, {
                x: sp.x - tw / 2, y: sp.y - stampFs / 2,
                size: stampFs, font: stampFont, color: c, opacity: ann.opacity,
              })
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

      // Apply crop regions
      for (const [pageStr, cropRgn] of Object.entries(cropRegions)) {
        const cropPageNum = parseInt(pageStr)
        if (cropPageNum < 1 || cropPageNum > pages.length) continue
        const cropPage = pages[cropPageNum - 1]
        const { width: cpw, height: cph } = cropPage.getSize()
        const cropRot = pageRotations[cropPageNum] || 0
        const blPdf = toPdfCoords({ x: cropRgn.x, y: cropRgn.y + cropRgn.h }, cpw, cph, cropRot)
        const trPdf = toPdfCoords({ x: cropRgn.x + cropRgn.w, y: cropRgn.y }, cpw, cph, cropRot)
        const minX = Math.min(blPdf.x, trPdf.x)
        const minY = Math.min(blPdf.y, trPdf.y)
        const cropW = Math.abs(trPdf.x - blPdf.x)
        const cropH = Math.abs(trPdf.y - blPdf.y)
        if (cropW > 0 && cropH > 0) {
          cropPage.setMediaBox(minX, minY, cropW, cropH)
        }
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
  // Memoize total annotation count so badge doesn't recompute on every render
  const totalAnnotationCount = useMemo(() =>
    Object.values(annotations).reduce((s, a) => s + a.length, 0)
  , [annotations])

  const isShapeAnnSelected = selectedAnn && !isTextAnnSelected

  // Properties bar context
  const showPropsForTool = activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'measure' && activeTool !== 'stamp' && activeTool !== 'crop'
  const showPropsForSelection = activeTool === 'select' && selectedAnn
  const showTextProps = (isTextAnnSelected && activeTool === 'select') || activeTool === 'text' || activeTool === 'callout'
  const showStrokeWidth = (isShapeAnnSelected && activeTool === 'select') ||
    (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'callout' && activeTool !== 'eraser' && activeTool !== 'measure' && activeTool !== 'textHighlight' && activeTool !== 'textStrikethrough' && activeTool !== 'stamp' && activeTool !== 'crop')
  const showOpacity = showPropsForTool || (activeTool === 'select' && selectedAnn != null)
  const showColorPicker = showPropsForTool || showPropsForSelection
  const showEraserControls = activeTool === 'eraser'
  const showMeasureControls = activeTool === 'measure'
  const showCropControls = activeTool === 'crop'

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Bar: Zoom + Export only ── */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-white/[0.06] flex-shrink-0">
        {/* Sidebar toggle */}
        {pdfFile.pageCount > 1 && (
          <>
            <button onClick={() => setSidebarOpen(o => !o)} title="Page thumbnails" aria-label="Toggle page thumbnails"
              className={`p-1 rounded-lg transition-colors ${
                sidebarOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <PanelLeft size={14} />
            </button>
            <div className="w-px h-5 bg-white/[0.08]" />
          </>
        )}

        {/* Zoom */}
        <button onClick={() => zoomAtCenter(Math.round(Math.max(0.25, zoom - 0.25) * 100) / 100)} title="Zoom out"
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomOut size={14} />
        </button>
        <div ref={zoomDropdownRef} className="relative">
          <button onClick={() => setZoomDropdownOpen(o => !o)} title="Zoom presets"
            className="text-[11px] text-white/50 hover:text-white w-10 text-center rounded-lg py-0.5 hover:bg-white/[0.06] transition-colors">
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
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ZoomIn size={14} />
        </button>
        <button onClick={fitToWindow} title="Fit to window (F)"
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <Maximize size={14} />
        </button>

        {/* Page jump input */}
        {pdfFile.pageCount > 1 && (
          <div className="flex items-center gap-0.5 ml-1">
            {pageInputActive ? (
              <input
                type="number" min={1} max={pdfFile.pageCount}
                defaultValue={currentPage} autoFocus
                className="w-14 text-center text-xs bg-white/[0.06] border border-white/20 rounded px-1 py-0.5 text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onBlur={e => { navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, Number(e.target.value)))); setPageInputActive(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, Number(e.currentTarget.value)))); setPageInputActive(false) }
                  if (e.key === 'Escape') setPageInputActive(false)
                }}
              />
            ) : (
              <button onClick={() => setPageInputActive(true)} className="text-xs text-white/40 hover:text-white/80 tabular-nums px-1 rounded hover:bg-white/[0.06]">
                {currentPage} / {pdfFile.pageCount}
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Find button */}
        <button onClick={() => { setFindOpen(o => !o); setTimeout(() => findInputRef.current?.focus(), 50) }} title="Find text (Ctrl+F)"
          className={`p-1 rounded-lg transition-colors ${findOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}>
          <Search size={14} />
        </button>

        {/* Annotation list button with count badge */}
        <button onClick={() => setAnnListOpen(o => !o)} title="Annotation list"
          className={`relative p-1 rounded-lg transition-colors ${annListOpen ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}>
          <List size={14} />
          {totalAnnotationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-[#F47B20] rounded-full text-[8px] text-white font-bold flex items-center justify-center px-0.5">
              {totalAnnotationCount > 99 ? '99+' : totalAnnotationCount}
            </span>
          )}
        </button>

        {/* Export & Reset */}
        {exportError && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
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

      {/* ── Find Bar ── */}
      {findOpen && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] bg-[#001218] flex-shrink-0">
          <Search size={12} className="text-white/40 flex-shrink-0" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find text..."
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (findMatches.length === 0) return
                if (e.shiftKey) setFindIdx(i => (i - 1 + findMatches.length) % findMatches.length)
                else setFindIdx(i => (i + 1) % findMatches.length)
              }
              if (e.key === 'Escape') { setFindOpen(false); setFindQuery(''); setFindMatches([]) }
            }}
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
          />
          {findMatches.length > 0 && (
            <span className="text-xs text-white/40 flex-shrink-0">{findIdx + 1} / {findMatches.length}</span>
          )}
          {findQuery && findMatches.length === 0 && (
            <span className="text-xs text-red-400/70 flex-shrink-0">No matches</span>
          )}
          <button
            onClick={() => setFindCaseSensitive(v => !v)}
            title="Case sensitive (Alt+C)"
            className={`px-1 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-colors ${
              findCaseSensitive ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
            }`}
          >Aa</button>
          <button onClick={() => setFindIdx(i => (i - 1 + Math.max(1, findMatches.length)) % Math.max(1, findMatches.length))} disabled={findMatches.length === 0}
            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setFindIdx(i => (i + 1) % Math.max(1, findMatches.length))} disabled={findMatches.length === 0}
            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30 rounded">
            <ChevronRight size={12} />
          </button>
          <button onClick={() => { setFindOpen(false); setFindQuery(''); setFindMatches([]) }} className="p-0.5 text-white/40 hover:text-white rounded">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Contextual Properties Bar ── */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-white/[0.06] flex-shrink-0 min-h-[28px]">
        {/* Color picker */}
        {showColorPicker && (
          <ColorPicker
            value={color}
            onChange={c => {
              setColor(c)
              if (selectedAnnId) updateAnnotation(selectedAnnId, { color: c })
            }}
            presets={(activeTool === 'highlighter' || activeTool === 'textHighlight') ? HIGHLIGHT_COLORS : ANN_COLORS}
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

        {/* Fill color — shapes only */}
        {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'cloud' ||
          (activeTool === 'select' && selectedAnn && (selectedAnn.type === 'rectangle' || selectedAnn.type === 'circle' || selectedAnn.type === 'cloud'))) && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Fill</span>
            <input type="color" value={fillColor || '#ffffff'}
              onChange={e => {
                setFillColor(e.target.value)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { fillColor: e.target.value })
              }}
              className="w-5 h-5 rounded cursor-pointer border border-white/[0.1] bg-transparent p-0"
            />
            <button
              onClick={() => {
                setFillColor(null)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { fillColor: undefined })
              }}
              className={`px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                !fillColor ? 'bg-white/10 text-white/60' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
              }`}>
              None
            </button>
          </div>
        )}

        {/* Corner radius — rectangle only */}
        {(activeTool === 'rectangle' || (activeTool === 'select' && selectedAnn?.type === 'rectangle')) && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40">Radius</span>
            <input type="range" min={0} max={30} value={cornerRadius}
              onChange={e => {
                const val = Number(e.target.value)
                setCornerRadius(val)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { cornerRadius: val })
              }}
              className="w-12 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F47B20] [&::-webkit-slider-thumb]:cursor-pointer" />
            <span className="text-[10px] text-white/40 w-4">{cornerRadius}</span>
          </div>
        )}

        {/* Dash pattern — shapes/lines */}
        {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'cloud' ||
          (activeTool === 'select' && selectedAnn && ['rectangle', 'circle', 'line', 'arrow', 'cloud'].includes(selectedAnn.type))) && (
          <div className="flex items-center gap-0.5">
            {(['solid', 'dashed', 'dotted'] as const).map(dp => (
              <button key={dp} onClick={() => {
                setDashPattern(dp)
                if (selectedAnnId) updateAnnotation(selectedAnnId, { dashPattern: dp === 'solid' ? undefined : dp })
              }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  dashPattern === dp ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
                }`}>
                {dp === 'solid' ? '━' : dp === 'dashed' ? '╌' : '┈'}
              </button>
            ))}
          </div>
        )}

        {/* Double-headed arrow */}
        {(activeTool === 'arrow' || (activeTool === 'select' && selectedAnn?.type === 'arrow')) && (
          <button onClick={() => {
            setArrowStart(!arrowStart)
            if (selectedAnnId) updateAnnotation(selectedAnnId, { arrowStart: !arrowStart })
          }}
            title={arrowStart ? 'Double-headed arrow' : 'Single arrow'}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
              arrowStart ? 'bg-[#F47B20]/20 text-[#F47B20] border border-[#F47B20]/30' : 'text-white/30 hover:text-white/50 border border-white/[0.08]'
            }`}>
            {arrowStart ? '↔' : '→'}
          </button>
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
                { align: 'justify' as const, Icon: AlignJustify, label: 'Justify' },
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
            <div className="flex items-center gap-0.5">
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = !superscript
                setSuperscript(next)
                if (next) setSubscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { superscript: next, ...(next ? { subscript: false } : {}) })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { superscript: next, ...(next ? { subscript: false } : {}) })
                }
              }} title="Superscript"
                className={`p-1 rounded transition-colors ${
                  superscript ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <Superscript size={13} />
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = !subscript
                setSubscript(next)
                if (next) setSuperscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { subscript: next, ...(next ? { superscript: false } : {}) })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { subscript: next, ...(next ? { superscript: false } : {}) })
                }
              }} title="Subscript"
                className={`p-1 rounded transition-colors ${
                  subscript ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <Subscript size={13} />
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = listType === 'bullet' ? 'none' : 'bullet'
                setListType(next)
                if (editingTextId) updateAnnotation(editingTextId, { listType: next })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { listType: next })
                }
              }} title="Bullet list"
                className={`p-1 rounded transition-colors ${
                  listType === 'bullet' ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <List size={13} />
              </button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => {
                const next = listType === 'numbered' ? 'none' : 'numbered'
                setListType(next)
                if (editingTextId) updateAnnotation(editingTextId, { listType: next })
                else if (selectedAnnId) {
                  const ann = getAnnotation(selectedAnnId)
                  if (ann && (ann.type === 'text' || ann.type === 'callout')) updateAnnotation(selectedAnnId, { listType: next })
                }
              }} title="Numbered list"
                className={`p-1 rounded transition-colors ${
                  listType === 'numbered' ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/40 hover:text-white/70'
                }`}>
                <ListOrdered size={13} />
              </button>
            </div>
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

        {/* Stamp controls — tool mode or stamp selected */}
        {(activeTool === 'stamp' || (activeTool === 'select' && selectedAnn?.type === 'stamp')) && (
          <div className="flex items-center gap-1 flex-wrap">
            {STAMP_PRESETS.map(preset => {
              const isActive = activeTool === 'stamp'
                ? activeStampPreset.label === preset.label
                : selectedAnn?.stampType === preset.label
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    if (activeTool === 'stamp') { setActiveStampPreset(preset) }
                    else if (selectedAnnId) {
                      const p = STAMP_PRESETS.find(s => s.label === preset.label)
                      if (p) updateAnnotation(selectedAnnId, { stampType: p.label, color: p.color, backgroundColor: p.bg })
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors border ${
                    isActive
                      ? 'border-current ring-1 ring-inset ring-current'
                      : 'border-white/[0.1] text-white/40 hover:border-white/30 hover:text-white/70'
                  }`}
                  style={isActive ? { color: preset.color, borderColor: preset.color } : {}}>
                  {preset.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Crop controls */}
        {showCropControls && (
          <>
            <span className="text-[10px] text-white/40">Drag to set crop region</span>
            {cropRegions[currentPage] && (
              <button
                onClick={() => { setCropRegions(prev => { const next = { ...prev }; delete next[currentPage]; return next }) }}
                className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/60 border border-white/[0.08]">
                Clear Crop
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
                  onVisible={handleThumbVisible}
                  onClick={handleThumbClick}
                  onDoubleClick={handleThumbClick}
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
                    onContextMenu={e => {
                      e.preventDefault()
                      const pt = getPointForPage(pageNum, e)
                      const ann = findAnnotationAt(pt, pageNum)
                      if (!ann) return
                      setSelectedAnnId(ann.id)
                      // Clamp to viewport so menu doesn't go off-screen
                      const menuW = 168, menuH = 200
                      const cx = Math.min(e.clientX, window.innerWidth - menuW - 8)
                      const cy = Math.min(e.clientY, window.innerHeight - menuH - 8)
                      setContextMenu({ x: cx, y: cy, annId: ann.id, pageNum })
                    }}
                    onMouseLeave={() => { if (activeTool === 'eraser') if (eraserCursorDivRef.current) eraserCursorDivRef.current.style.display = 'none' }}
                  />
                  {/* Eraser circle cursor rendered as fixed overlay at root level */}
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

        {/* ── Right Tool Panel ── */}
        <div className="w-10 border-l border-white/[0.06] bg-black/20 flex flex-col items-center py-2 gap-1 flex-shrink-0 overflow-y-auto">
          {/* Select */}
          <button onClick={() => setActiveTool('select')} title="Select (S)"
            className={`p-1.5 rounded-lg transition-colors ${
              activeTool === 'select' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <MousePointer2 size={16} />
          </button>
          <div className="h-px w-6 bg-white/[0.08]" />
          {/* Shapes dropdown */}
          <div ref={shapesDropdownRef} className="relative">
            <button
              onClick={() => { if (!isDrawTool) setActiveTool(activeDraw); setShapesDropdownOpen(o => !o) }}
              title={activeDrawDef.label}
              className={`p-1.5 rounded-lg transition-colors ${
                isDrawTool ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <ActiveDrawIcon size={16} />
            </button>
            {shapesDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
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
                const ann: Annotation = { id: genId(), type: 'highlighter', points: [{ x: 0, y: 0 }], color: '#FFFF00', strokeWidth: 0, opacity: 0.4, fontSize, rects: [...selectTextToolbar.rects] }
                commitAnnotation(ann); setSelectTextToolbar(null); redrawAll()
              } else { setActiveTool('highlighter'); setActiveHighlight('highlighter') }
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
                const ann: Annotation = { id: genId(), type: 'highlighter', points: [{ x: 0, y: 0 }], color: '#FF0000', strokeWidth: 0, opacity: 1, fontSize, rects: [...selectTextToolbar.rects], strikethrough: true }
                commitAnnotation(ann); setSelectTextToolbar(null); redrawAll()
              } else { setActiveTool('textStrikethrough'); setActiveHighlight('textStrikethrough') }
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
              className={`p-1.5 rounded-lg transition-colors ${
                isTextTool ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <ActiveTextIcon size={16} />
            </button>
            {textDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
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
          {/* Stamp */}
          <div ref={stampDropdownRef} className="relative">
            <button
              onClick={() => { setActiveTool('stamp'); setStampDropdownOpen(o => !o) }}
              title="Stamp"
              className={`p-1.5 rounded-lg transition-colors ${
                activeTool === 'stamp' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <Tag size={16} />
            </button>
            {stampDropdownOpen && (
              <div className="absolute top-0 right-full mr-1 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                {STAMP_PRESETS.map(preset => (
                  <button key={preset.label}
                    onClick={() => { setActiveStampPreset(preset); setStampDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      activeStampPreset.label === preset.label ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    <span className="font-bold text-[10px]" style={{ color: preset.color }}>{preset.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Crop */}
          <button onClick={() => setActiveTool('crop')} title="Crop page"
            className={`p-1.5 rounded-lg transition-colors ${
              activeTool === 'crop' ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}>
            <Crop size={16} />
          </button>
          <div className="h-px w-6 bg-white/[0.08]" />
          {/* Sticky tool pin */}
          <button onClick={() => setStickyTool(v => !v)} title="Lock tool (stay on current tool after drawing)">
            <Pin size={14} className={stickyTool ? 'text-[#F47B20]' : 'text-white/30'} />
          </button>
          <div className="h-px w-6 bg-white/[0.08]" />
          {/* Undo/Redo */}
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none">
            <Redo2 size={16} />
          </button>
          <div className="h-px w-6 bg-white/[0.08]" />
          {/* Rotate */}
          <button onClick={() => rotatePage(-90)} title="Rotate CCW"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => rotatePage(90)} title="Rotate CW"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Floating formatting toolbar for text editing ────────── */}
      {editingTextId && editingAnn && (() => {
        const page = findAnnotationPage(editingTextId)
        if (page === null) return null
        const activeCanvas = pageRefsMap.current.get(page)?.annCanvas
        if (!activeCanvas) return null
        const canvasRect = activeCanvas.getBoundingClientRect()
        const annX = editingAnn.points[0].x * RENDER_SCALE * zoom
        const annY = editingAnn.points[0].y * RENDER_SCALE * zoom
        const annW = (editingAnn.width || DEFAULT_TEXTBOX_W) * RENDER_SCALE * zoom
        const screenCenterX = canvasRect.left + annX + annW / 2
        const screenTopY = canvasRect.top + annY
        const spaceAbove = screenTopY > 50
        const toolbarX = Math.max(200, Math.min(window.innerWidth - 200, screenCenterX))
        const toolbarY = spaceAbove ? screenTopY - 8 : screenTopY + (editingAnn.height || DEFAULT_TEXTBOX_H) * RENDER_SCALE * zoom + 8
        return (
          <div style={{ position: 'fixed', left: toolbarX, top: toolbarY, transform: `translateX(-50%)${spaceAbove ? ' translateY(-100%)' : ''}`, zIndex: 60 }}>
            <FloatingToolbar
              x={0} y={0}
              anchor={spaceAbove ? 'above' : 'below'}
              bold={bold} italic={italic} underline={underline} strikethrough={strikethrough}
              superscript={superscript} subscript={subscript}
              textAlign={textAlign} fontSize={fontSize} color={color} listType={listType}
              visible={true}
              onToggleBold={() => {
                const v = !bold; setBold(v)
                if (editingTextId) updateAnnotation(editingTextId, { bold: v })
              }}
              onToggleItalic={() => {
                const v = !italic; setItalic(v)
                if (editingTextId) updateAnnotation(editingTextId, { italic: v })
              }}
              onToggleUnderline={() => {
                const v = !underline; setUnderline(v)
                if (editingTextId) updateAnnotation(editingTextId, { underline: v })
              }}
              onToggleStrikethrough={() => {
                const v = !strikethrough; setStrikethrough(v)
                if (editingTextId) updateAnnotation(editingTextId, { strikethrough: v })
              }}
              onToggleSuperscript={() => {
                const v = !superscript; setSuperscript(v)
                if (v) setSubscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { superscript: v, ...(v ? { subscript: false } : {}) })
              }}
              onToggleSubscript={() => {
                const v = !subscript; setSubscript(v)
                if (v) setSuperscript(false)
                if (editingTextId) updateAnnotation(editingTextId, { subscript: v, ...(v ? { superscript: false } : {}) })
              }}
              onSetTextAlign={(align) => {
                setTextAlign(align)
                if (editingTextId) updateAnnotation(editingTextId, { textAlign: align })
              }}
              onChangeFontSize={(size) => {
                setFontSize(size)
                if (editingTextId) updateAnnotation(editingTextId, { fontSize: size })
              }}
              onChangeColor={(c) => {
                setColor(c)
                if (editingTextId) updateAnnotation(editingTextId, { color: c })
              }}
              onSetListType={(lt) => {
                setListType(lt)
                if (editingTextId) updateAnnotation(editingTextId, { listType: lt })
              }}
            />
          </div>
        )
      })()}

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
                  key={currentPage}
                  defaultValue={currentPage}
                  onBlur={e => { const val = parseInt(e.target.value); if (!isNaN(val)) navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, val))) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { const val = parseInt(e.currentTarget.value); if (!isNaN(val)) { navigateToPage(Math.max(1, Math.min(pdfFile.pageCount, val))); e.currentTarget.blur() } }
                    if (e.key === 'Escape') e.currentTarget.blur()
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
            selectedAnnId ? 'Arrows nudge · Del delete · Right-click menu' :
            activeTool === 'select' ? 'Click to select · Ctrl+A all' :
            activeTool === 'text' ? 'Drag to create text' :
            activeTool === 'callout' ? 'Drag to create callout' :
            activeTool === 'cloud' ? `${currentPtsRef.current.length} pts · Dbl-click close` :
            activeTool === 'measure' ? 'Click two points' :
            activeTool === 'textHighlight' ? 'Drag to highlight' :
            activeTool === 'stamp' ? `${activeStampPreset.label} · click to place` :
            activeTool === 'crop' ? 'Drag to set crop region' :
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

      {/* ── Eraser cursor overlay — positioned via ref to avoid re-renders on mousemove ── */}
      <div
        ref={eraserCursorDivRef}
        className="pointer-events-none fixed border-2 border-white/60 rounded-full mix-blend-difference z-40"
        style={{ display: 'none' }}
      />

      {/* ── Hover Tooltip — position updated via ref to avoid re-renders on mousemove ── */}
      {hoveredAnnId && !editingTextId && activeTool === 'select' && (() => {
        const ann = annPageMap.get(hoveredAnnId) !== undefined
          ? (annotations[annPageMap.get(hoveredAnnId)!] || []).find(a => a.id === hoveredAnnId)
          : null
        if (!ann) return null
        const label = annLabel(ann)
        const opacityNote = ann.opacity < 1 ? ` · ${Math.round(ann.opacity * 100)}%` : ''
        return (
          <div
            ref={tooltipDivRef}
            className="fixed z-50 pointer-events-none bg-[#001a24] border border-white/10 text-xs text-white/70 px-2 py-1 rounded shadow-lg"
            style={{ left: hoverPosRef.current.x + 14, top: hoverPosRef.current.y - 28 }}
          >
            {label}{opacityNote}
          </div>
        )
      })()}

      {/* ── Context Menu ── */}
      {contextMenu && (() => {
        const { annId, pageNum: cmPageNum } = contextMenu
        const cmAnn = (annotations[cmPageNum] || []).find(a => a.id === annId)
        if (!cmAnn) return null

        const doAction = (fn: () => void) => { fn(); setContextMenu(null) }

        const bringToFront = () => {
          const pageAnns = annotations[cmPageNum] || []
          const idx = pageAnns.findIndex(a => a.id === annId)
          if (idx < 0 || idx === pageAnns.length - 1) return
          const next = [...pageAnns]
          next.push(next.splice(idx, 1)[0])
          const result = { ...annotations, [cmPageNum]: next }
          setAnnotations(result); pushHistory(result)
        }
        const sendToBack = () => {
          const pageAnns = annotations[cmPageNum] || []
          const idx = pageAnns.findIndex(a => a.id === annId)
          if (idx <= 0) return
          const next = [...pageAnns]
          next.unshift(next.splice(idx, 1)[0])
          const result = { ...annotations, [cmPageNum]: next }
          setAnnotations(result); pushHistory(result)
        }
        const duplicate = () => {
          const dup: Annotation = { ...structuredClone(cmAnn), id: genId(), points: cmAnn.points.map(p => ({ x: p.x + 20, y: p.y + 20 })), arrows: cmAnn.arrows?.map(p => ({ x: p.x + 20, y: p.y + 20 })) }
          commitAnnotation(dup); setSelectedAnnId(dup.id)
        }
        const del = () => { removeAnnotation(annId, cmPageNum); setSelectedAnnId(null) }
        const copyStyle = () => { copiedStyleRef.current = { color: cmAnn.color, strokeWidth: cmAnn.strokeWidth, opacity: cmAnn.opacity, fontFamily: cmAnn.fontFamily, fontSize: cmAnn.fontSize, bold: cmAnn.bold, italic: cmAnn.italic } }
        const pasteStyle = () => {
          const s = copiedStyleRef.current; if (!s) return
          updateAnnotation(annId, s, cmPageNum)
        }

        return (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-[#001a24] border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {([
              { label: 'Duplicate', hint: 'Ctrl+D', action: duplicate, cls: 'text-white/70 hover:text-white' },
              { label: 'Delete', hint: 'Del', action: del, cls: 'text-red-400 hover:text-red-300' },
            ] as { label: string; hint: string; action: () => void; cls: string }[]).map(({ label, hint, action, cls }) => (
              <button key={label} onClick={() => doAction(action)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-white/[0.06] ${cls}`}>
                <span>{label}</span>
                <span className="text-white/25 text-[10px]">{hint}</span>
              </button>
            ))}
            <div className="h-px bg-white/[0.08] my-1" />
            {([
              { label: 'Bring to Front', hint: 'Ctrl+]', action: bringToFront },
              { label: 'Send to Back', hint: 'Ctrl+[', action: sendToBack },
            ] as { label: string; hint: string; action: () => void }[]).map(({ label, hint, action }) => (
              <button key={label} onClick={() => doAction(action)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">
                <span>{label}</span>
                <span className="text-white/25 text-[10px]">{hint}</span>
              </button>
            ))}
            <div className="h-px bg-white/[0.08] my-1" />
            <button onClick={() => doAction(copyStyle)} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06]">Copy Style</button>
            <button onClick={() => doAction(pasteStyle)} disabled={!copiedStyleRef.current} className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] disabled:opacity-40">Paste Style</button>
          </div>
        )
      })()}

      {/* ── Annotation List Panel ── */}
      {annListOpen && pdfFile && (
        <div className="fixed right-12 top-[80px] z-40 w-52 max-h-[60vh] bg-[#001a24] border border-white/10 rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/70">Annotations</span>
            <button onClick={() => setAnnListOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {Object.entries(annotations).filter(([, anns]) => anns.length > 0).length === 0 ? (
              <div className="px-3 py-4 text-xs text-white/30 text-center">No annotations</div>
            ) : (
              Object.entries(annotations)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([pageStr, anns]) => anns.length === 0 ? null : (
                  <div key={pageStr}>
                    <div className="px-3 py-1 text-[10px] text-white/30 font-medium">Page {pageStr} ({anns.length})</div>
                    {anns.map(ann => (
                      <div
                        key={ann.id}
                        className={`group flex items-center gap-1 px-2 py-1 hover:bg-white/[0.06] transition-colors ${selectedAnnId === ann.id ? 'bg-white/[0.04]' : ''}`}
                      >
                        <button
                          onClick={() => {
                            navigateToPage(Number(pageStr))
                            setSelectedAnnId(ann.id)
                            setActiveTool('select')
                          }}
                          className={`flex-1 text-left text-xs flex items-center gap-1.5 min-w-0 ${selectedAnnId === ann.id ? 'text-[#F47B20]' : 'text-white/60'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                          <span className="truncate">{annLabel(ann)}</span>
                        </button>
                        <button
                          onClick={() => { removeAnnotation(ann.id, Number(pageStr)); if (selectedAnnId === ann.id) setSelectedAnnId(null) }}
                          title="Delete annotation"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
