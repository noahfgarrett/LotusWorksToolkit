import { useState, useCallback, useEffect, useRef, useMemo, type JSX } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { Button } from '@/components/common/Button.tsx'
import { ProgressBar } from '@/components/common/ProgressBar.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { readFileAsDataURL } from '@/utils/fileReader.ts'
import { loadImage, resizeImage, canvasToBlob } from '@/utils/imageProcessing.ts'
import { downloadBlob } from '@/utils/download.ts'
import { GridCell } from './GridCell.tsx'
import type { GridCellData } from './GridCell.tsx'
import {
  Download, Trash2, Plus, Grid3X3, ZoomIn, ZoomOut, X, Check, Eye, EyeOff, Tag,
} from 'lucide-react'

import '@/utils/pdfWorkerSetup.ts'

/* ── Constants ── */

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/bmp',
  'image/webp',
  'image/svg+xml',
]

const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp', 'svg']

const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.svg'

const MAX_GRID_DIM = 15

const GRIDLINE_WIDTH = 2
const GRIDLINE_COLOR = '#ffffff'

/* ── Helpers ── */

function computeLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ACCEPTED_EXTENSIONS.includes(ext)
}

function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function buildEmptyGrid(rows: number, cols: number): GridCellData[] {
  const cells: GridCellData[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        id: crypto.randomUUID(),
        label: computeLabel(r, c),
        file: null,
        type: null,
        thumbnail: null,
        nativeWidth: 0,
        nativeHeight: 0,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      })
    }
  }
  return cells
}

/* ── Focus Canvas ── */

interface FocusCanvasProps {
  cell: GridCellData
  onUpdateOffset: (offsetX: number, offsetY: number) => void
  onUpdateScale: (scale: number) => void
  minScale: number
  maxScale: number
  scrollStep: number
}

function FocusCanvas({ cell, onUpdateOffset, onUpdateScale, minScale, maxScale, scrollStep }: FocusCanvasProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)

  // Stable refs for the wheel handler
  const scaleRef = useRef(cell.scale)
  scaleRef.current = cell.scale
  const onUpdateScaleRef = useRef(onUpdateScale)
  onUpdateScaleRef.current = onUpdateScale

  // Native wheel listener with passive: false
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? scrollStep : -scrollStep
      const next = Math.min(maxScale, Math.max(minScale, scaleRef.current + delta))
      onUpdateScaleRef.current(next)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [minScale, maxScale, scrollStep])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: cell.offsetX,
      startOffsetY: cell.offsetY,
    }
    viewportRef.current?.setPointerCapture(e.pointerId)
  }, [cell.offsetX, cell.offsetY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    onUpdateOffset(dragRef.current.startOffsetX + dx, dragRef.current.startOffsetY + dy)
  }, [onUpdateOffset])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    viewportRef.current?.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // Compute contain-fit for the focus viewport
  const [vpSize, setVpSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setVpSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  let displayW = 0
  let displayH = 0
  let contentLeft = 0
  let contentTop = 0

  if (cell.nativeWidth > 0 && cell.nativeHeight > 0 && vpSize.width > 0 && vpSize.height > 0) {
    const fitScale = Math.min(vpSize.width / cell.nativeWidth, vpSize.height / cell.nativeHeight)
    const baseW = cell.nativeWidth * fitScale
    const baseH = cell.nativeHeight * fitScale
    displayW = baseW * cell.scale
    displayH = baseH * cell.scale
    contentLeft = (vpSize.width - displayW) / 2
    contentTop = (vpSize.height - displayH) / 2
  }

  return (
    <div
      ref={viewportRef}
      className="flex-1 min-h-0 overflow-hidden relative cursor-grab active:cursor-grabbing touch-none"
      style={{ backgroundColor: '#0a0a0a' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {displayW > 0 && displayH > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: contentLeft + cell.offsetX,
            top: contentTop + cell.offsetY,
            width: displayW,
            height: displayH,
          }}
        >
          <img
            src={cell.thumbnail!}
            alt={cell.label}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}

/* ── Component ── */

export default function GridStitchMode() {
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(2)
  const [cells, setCells] = useState<GridCellData[]>(() => buildEmptyGrid(2, 2))
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const [compression, setCompression] = useState(false)
  const [showGridlines, setShowGridlines] = useState(true)
  const [exportGridlines, setExportGridlines] = useState(true)
  const [exportLabels, setExportLabels] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null)

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; cellId: string } | null>(null)

  // Focus mode state
  const [focusCellId, setFocusCellId] = useState<string | null>(null)

  // Container measurement
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* ── Grid dimension changes ── */

  const handleDimensionChange = useCallback((newRows: number, newCols: number) => {
    setCells(prev => {
      // Check if any occupied cells would be lost
      const wouldLose = prev.some((cell, idx) => {
        const r = Math.floor(idx / cols)
        const c = idx % cols
        return cell.file !== null && (r >= newRows || c >= newCols)
      })

      if (wouldLose && !window.confirm('Some cells with content will be removed. Continue?')) {
        return prev
      }

      const newCells: GridCellData[] = []
      for (let r = 0; r < newRows; r++) {
        for (let c = 0; c < newCols; c++) {
          // Try to preserve existing cell data
          const oldIdx = r < rows && c < cols ? r * cols + c : -1
          if (oldIdx >= 0 && oldIdx < prev.length) {
            newCells.push({ ...prev[oldIdx], label: computeLabel(r, c) })
          } else {
            newCells.push({
              id: crypto.randomUUID(),
              label: computeLabel(r, c),
              file: null,
              type: null,
              thumbnail: null,
              nativeWidth: 0,
              nativeHeight: 0,
              offsetX: 0,
              offsetY: 0,
              scale: 1,
            })
          }
        }
      }
      return newCells
    })
    setRows(newRows)
    setCols(newCols)
    setSelectedCellId(null)
  }, [rows, cols])

  /* ── File upload & processing ── */

  const processFile = useCallback(async (file: File): Promise<Omit<GridCellData, 'id' | 'label' | 'offsetX' | 'offsetY'> | null> => {
    try {
      if (isPDF(file)) {
        const buffer = await file.arrayBuffer()
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
        const page = await doc.getPage(1)
        const viewport = page.getViewport({ scale: 1 })
        const nativeWidth = viewport.width
        const nativeHeight = viewport.height

        // Generate thumbnail at reasonable display size
        const thumbScale = Math.min(600 / nativeHeight, 0.5)
        const thumbViewport = page.getViewport({ scale: thumbScale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) { doc.destroy(); return null }
        canvas.width = Math.floor(thumbViewport.width)
        canvas.height = Math.floor(thumbViewport.height)
        await page.render({
          canvasContext: ctx,
          viewport: thumbViewport,
          intent: 'print',
          annotationMode: pdfjsLib.AnnotationMode.DISABLE,
        }).promise
        const thumbnail = canvas.toDataURL('image/png')
        page.cleanup()
        canvas.width = 0
        canvas.height = 0
        doc.destroy()

        return { file, type: 'pdf', thumbnail, nativeWidth, nativeHeight, scale: 1 }
      } else {
        // Image
        const dataUrl = await readFileAsDataURL(file)
        const img = await loadImage(dataUrl)
        const nativeWidth = img.naturalWidth || img.width || 1000
        const nativeHeight = img.naturalHeight || img.height || 1000

        // Use the data URL as thumbnail (already loaded)
        return { file, type: 'image', thumbnail: dataUrl, nativeWidth, nativeHeight, scale: 1 }
      }
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err)
      useAppStore.getState().addToast({ type: 'error', message: `Failed to load ${file.name}` })
      return null
    }
  }, [])

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles = newFiles.filter(isAcceptedFile)
    if (validFiles.length === 0) {
      useAppStore.getState().addToast({ type: 'warning', message: 'No supported files found' })
      return
    }

    // Find empty cells
    const emptyCellIds: string[] = []
    for (const cell of cells) {
      if (cell.file === null) emptyCellIds.push(cell.id)
    }

    const filesToProcess = validFiles.slice(0, emptyCellIds.length)
    const skipped = validFiles.length - filesToProcess.length

    if (skipped > 0) {
      useAppStore.getState().addToast({
        type: 'warning',
        message: `${skipped} file${skipped !== 1 ? 's' : ''} skipped - no empty cells`,
      })
    }

    if (filesToProcess.length === 0) return

    for (let i = 0; i < filesToProcess.length; i++) {
      const result = await processFile(filesToProcess[i])
      if (!result) continue
      const targetId = emptyCellIds[i]
      setCells(prev => prev.map(c =>
        c.id === targetId
          ? { ...c, ...result, offsetX: 0, offsetY: 0 }
          : c,
      ))
    }
  }, [cells, processFile])

  /* ── Cell actions ── */

  const handleUpdateOffset = useCallback((cellId: string, offsetX: number, offsetY: number) => {
    setCells(prev => prev.map(c =>
      c.id === cellId ? { ...c, offsetX, offsetY } : c,
    ))
  }, [])

  const handleUpdateScale = useCallback((cellId: string, scale: number) => {
    setCells(prev => prev.map(c =>
      c.id === cellId ? { ...c, scale } : c,
    ))
  }, [])

  const handleUpdateLabel = useCallback((cellId: string, label: string) => {
    setCells(prev => prev.map(c =>
      c.id === cellId ? { ...c, label } : c,
    ))
  }, [])

  const handleSwapCells = useCallback((targetId: string) => {
    if (!swapSourceId || swapSourceId === targetId) {
      setSwapSourceId(null)
      return
    }
    setCells(prev => {
      const newCells = [...prev]
      const srcIdx = newCells.findIndex(c => c.id === swapSourceId)
      const tgtIdx = newCells.findIndex(c => c.id === targetId)
      if (srcIdx === -1 || tgtIdx === -1) return prev

      // Swap content but preserve id and label (position-bound)
      const pick = (c: GridCellData) => ({
        file: c.file, type: c.type, thumbnail: c.thumbnail,
        nativeWidth: c.nativeWidth, nativeHeight: c.nativeHeight,
        offsetX: c.offsetX, offsetY: c.offsetY, scale: c.scale,
      })
      const srcContent = pick(newCells[srcIdx])
      const tgtContent = pick(newCells[tgtIdx])
      newCells[srcIdx] = { ...newCells[srcIdx], ...tgtContent }
      newCells[tgtIdx] = { ...newCells[tgtIdx], ...srcContent }
      return newCells
    })
    setSwapSourceId(null)
  }, [swapSourceId])

  const clearCell = useCallback((cellId: string) => {
    setCells(prev => prev.map(c =>
      c.id === cellId
        ? { ...c, file: null, type: null, thumbnail: null, nativeWidth: 0, nativeHeight: 0, offsetX: 0, offsetY: 0, scale: 1 }
        : c,
    ))
  }, [])

  const resetCellPosition = useCallback((cellId: string) => {
    setCells(prev => prev.map(c =>
      c.id === cellId ? { ...c, offsetX: 0, offsetY: 0, scale: 1 } : c,
    ))
  }, [])

  const replaceCell = useCallback((cellId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = FILE_ACCEPT
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file || !isAcceptedFile(file)) return
      const result = await processFile(file)
      if (!result) return
      setCells(prev => prev.map(c =>
        c.id === cellId ? { ...c, ...result, offsetX: 0, offsetY: 0 } : c,
      ))
    }
    input.click()
  }, [processFile])

  const clearAll = useCallback(() => {
    const hasContent = cells.some(c => c.file !== null)
    if (hasContent && !window.confirm('Clear all cells?')) return
    setCells(buildEmptyGrid(rows, cols))
    setSelectedCellId(null)
  }, [cells, rows, cols])

  /* ── Arrow key nudging ── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusCellId) { setFocusCellId(null); return }
        setSelectedCellId(null)
        setCtxMenu(null)
        return
      }

      if (!selectedCellId) return

      const step = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0
      switch (e.key) {
        case 'ArrowLeft': dx = -step; break
        case 'ArrowRight': dx = step; break
        case 'ArrowUp': dy = -step; break
        case 'ArrowDown': dy = step; break
        default: return
      }
      e.preventDefault()
      setCells(prev => prev.map(c =>
        c.id === selectedCellId
          ? { ...c, offsetX: c.offsetX + dx, offsetY: c.offsetY + dy }
          : c,
      ))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCellId, focusCellId])

  /* ── Context menu ── */

  const handleContextMenu = useCallback((e: React.MouseEvent, cellId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, cellId })
    setSelectedCellId(cellId)
  }, [])

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const dismiss = () => setCtxMenu(null)
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [ctxMenu])

  /* ── Export / Stitch ── */

  const occupiedCells = useMemo(() => cells.filter(c => c.file !== null), [cells])
  const canExport = occupiedCells.length > 0 && !isExporting

  const handleExport = useCallback(async () => {
    if (!canExport) return
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Acquire file handle BEFORE heavy work so user-gesture is still active
      const suggestedName = `grid-stitch-${rows}x${cols}.pdf`
      let fileHandle: { createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> } | null = null

      if ('showSaveFilePicker' in window) {
        try {
          type PickerFn = (opts: unknown) => Promise<typeof fileHandle>
          fileHandle = await (window as unknown as { showSaveFilePicker: PickerFn }).showSaveFilePicker({
            suggestedName,
            types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
          })
        } catch (e: unknown) {
          if (e instanceof Error && e.name === 'AbortError') return
          // Fall through to downloadBlob
          fileHandle = null
        }
      }

      const pdfDoc = await PDFDocument.create()

      // Square cells: find the largest native dimension to use as cell size
      let maxNativeDim = 0
      for (const cell of cells) {
        if (cell.file) {
          maxNativeDim = Math.max(maxNativeDim, cell.nativeWidth, cell.nativeHeight)
        }
      }
      if (maxNativeDim === 0) maxNativeDim = 612 // letter width fallback
      const exportCellSize = maxNativeDim

      // Grid line thickness in PDF points (scaled to be visible)
      const exportLineWidth = exportGridlines ? Math.max(1, exportCellSize * 0.003) : 0

      const totalWidth = cols * exportCellSize + (exportGridlines ? (cols + 1) * exportLineWidth : 0)
      const totalHeight = rows * exportCellSize + (exportGridlines ? (rows + 1) * exportLineWidth : 0)
      const page = pdfDoc.addPage([totalWidth, totalHeight])

      // White background for the whole page
      page.drawRectangle({ x: 0, y: 0, width: totalWidth, height: totalHeight, color: rgb(1, 1, 1) })

      // Display cell dimensions for offset scaling
      const uiGap = showGridlines ? GRIDLINE_WIDTH : 0
      const uiBorder = showGridlines ? GRIDLINE_WIDTH : 0
      const uiTotalGapW = (cols - 1) * uiGap + uiBorder * 2
      const uiTotalGapH = (rows - 1) * uiGap + uiBorder * 2
      const displayCellSize = containerSize.width > 0 && containerSize.height > 0
        ? Math.min((containerSize.width - uiTotalGapW) / cols, (containerSize.height - uiTotalGapH) / rows)
        : 1

      let processed = 0
      const totalOccupied = occupiedCells.length

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = cells[r * cols + c]
          if (!cell.file) continue

          const cellW = exportCellSize
          const cellH = exportCellSize

          // Calculate position in PDF space (Y is bottom-up)
          const xOffset = exportGridlines ? (c + 1) * exportLineWidth : 0
          const yOffset = exportGridlines ? (r + 1) * exportLineWidth : 0
          const x = c * exportCellSize + xOffset
          const yFromTop = r * exportCellSize + yOffset

          // Contain-fit the content within the square cell, then apply zoom
          const fitScale = Math.min(cellW / cell.nativeWidth, cellH / cell.nativeHeight)
          const scaledW = cell.nativeWidth * fitScale * cell.scale
          const scaledH = cell.nativeHeight * fitScale * cell.scale

          // Center scaled content within its cell
          const contentCenterX = (cellW - scaledW) / 2
          const contentCenterY = (cellH - scaledH) / 2

          // Scale offsets from display px to export PDF coordinates
          const displayFitScale = cell.nativeWidth > 0
            ? Math.min(displayCellSize / cell.nativeWidth, displayCellSize / cell.nativeHeight)
            : 1
          const nativeOffsetX = cell.offsetX / displayFitScale * fitScale
          const nativeOffsetY = cell.offsetY / displayFitScale * fitScale

          const contentX = x + contentCenterX + nativeOffsetX
          const contentYFromTop = yFromTop + contentCenterY + nativeOffsetY
          const contentY = totalHeight - contentYFromTop - scaledH

          if (cell.type === 'pdf') {
            const pdfBytes = await cell.file.arrayBuffer()
            const srcDoc = await PDFDocument.load(new Uint8Array(pdfBytes))
            const [embeddedPage] = await pdfDoc.embedPdf(srcDoc, [0])
            page.drawPage(embeddedPage, {
              x: contentX,
              y: contentY,
              width: scaledW,
              height: scaledH,
            })
          } else {
            // Image embedding
            const imageBytes = new Uint8Array(await cell.file.arrayBuffer())
            let embedded: Awaited<ReturnType<typeof pdfDoc.embedPng>>

            if (compression) {
              // Re-encode as JPEG 85%
              const dataUrl = await readFileAsDataURL(cell.file)
              const img = await loadImage(dataUrl)
              const canvas = resizeImage(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
              const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
              canvas.width = 0
              const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer())
              embedded = await pdfDoc.embedJpg(jpgBytes)
            } else if (cell.file.type === 'image/jpeg' || cell.file.name.toLowerCase().endsWith('.jpg') || cell.file.name.toLowerCase().endsWith('.jpeg')) {
              embedded = await pdfDoc.embedJpg(imageBytes)
            } else if (cell.file.type === 'image/png' || cell.file.name.toLowerCase().endsWith('.png')) {
              embedded = await pdfDoc.embedPng(imageBytes)
            } else {
              // TIFF, BMP, WebP, SVG: convert to PNG via canvas
              const dataUrl = await readFileAsDataURL(cell.file)
              const img = await loadImage(dataUrl)
              const w = img.naturalWidth || img.width || 1000
              const h = img.naturalHeight || img.height || 1000
              const canvas = resizeImage(img, w, h)
              const pngBlob = await canvasToBlob(canvas, 'image/png', 1)
              canvas.width = 0
              const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())
              embedded = await pdfDoc.embedPng(pngBytes)
            }

            page.drawImage(embedded, {
              x: contentX,
              y: contentY,
              width: scaledW,
              height: scaledH,
            })
          }

          processed++
          setExportProgress(Math.round((processed / totalOccupied) * 100))
        }
      }

      // Draw gridlines on top of content
      if (exportGridlines) {
        const lineColor = rgb(0, 0, 0)
        // Outer border
        page.drawRectangle({
          x: 0, y: 0, width: totalWidth, height: totalHeight,
          borderColor: lineColor, borderWidth: exportLineWidth,
          color: undefined,
        })
        // Vertical lines
        for (let c = 1; c < cols; c++) {
          const lx = c * exportCellSize + c * exportLineWidth + exportLineWidth / 2
          page.drawLine({
            start: { x: lx, y: 0 },
            end: { x: lx, y: totalHeight },
            thickness: exportLineWidth,
            color: lineColor,
          })
        }
        // Horizontal lines
        for (let r = 1; r < rows; r++) {
          const ly = totalHeight - (r * exportCellSize + r * exportLineWidth + exportLineWidth / 2)
          page.drawLine({
            start: { x: 0, y: ly },
            end: { x: totalWidth, y: ly },
            thickness: exportLineWidth,
            color: lineColor,
          })
        }
      }

      // Draw labels on top of everything
      if (exportLabels) {
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const labelSize = Math.max(8, Math.min(24, exportCellSize * 0.035))
        const padding = labelSize * 0.5

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cell = cells[r * cols + c]
            const xOffset = exportGridlines ? (c + 1) * exportLineWidth : 0
            const yOffset = exportGridlines ? (r + 1) * exportLineWidth : 0
            const cellX = c * exportCellSize + xOffset
            const cellYFromTop = r * exportCellSize + yOffset

            const labelText = cell.label
            const textWidth = font.widthOfTextAtSize(labelText, labelSize)
            const textHeight = labelSize

            // Position: top-left of cell
            const lx = cellX + padding
            const ly = totalHeight - cellYFromTop - padding - textHeight

            // Draw label background
            const bgPad = 2
            page.drawRectangle({
              x: lx - bgPad,
              y: ly - bgPad,
              width: textWidth + bgPad * 2,
              height: textHeight + bgPad * 2,
              color: rgb(0, 0, 0),
              opacity: 0.5,
            })

            // Draw label text
            page.drawText(labelText, {
              x: lx,
              y: ly,
              size: labelSize,
              font,
              color: rgb(1, 1, 1),
            })
          }
        }
      }

      const resultBytes = await pdfDoc.save()
      const blob = new Blob([resultBytes], { type: 'application/pdf' })

      if (fileHandle) {
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        downloadBlob(blob, suggestedName)
      }

      useAppStore.getState().addToast({ type: 'success', message: 'Grid stitched successfully!' })
    } catch (err) {
      console.error('Grid stitch export failed:', err)
      useAppStore.getState().addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Export failed',
      })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [canExport, cells, rows, cols, compression, exportGridlines, exportLabels, showGridlines, containerSize, occupiedCells.length])

  /* ── Cell dimensions for rendering (always square) ── */

  const effectiveGap = showGridlines ? GRIDLINE_WIDTH : 0
  const outerBorder = showGridlines ? GRIDLINE_WIDTH : 0
  const totalGridlineW = (cols - 1) * effectiveGap + outerBorder * 2
  const totalGridlineH = (rows - 1) * effectiveGap + outerBorder * 2
  const maxCellW = containerSize.width > 0 ? (containerSize.width - totalGridlineW) / cols : 0
  const maxCellH = containerSize.height > 0 ? (containerSize.height - totalGridlineH) / rows : 0
  const cellSize = Math.min(maxCellW, maxCellH)
  const cellWidth = cellSize
  const cellHeight = cellSize

  const hasAnyContent = cells.some(c => c.file !== null)

  /* ── Render ── */

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {/* Toolbar row 1: grid config + actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Grid dimensions */}
        <div className="flex items-center gap-1.5">
          <Grid3X3 size={14} className="text-white/40" />
          <select
            value={rows}
            onChange={(e) => handleDimensionChange(Number(e.target.value), cols)}
            title="Rows"
            className="h-8 px-2 text-xs rounded-md bg-dark-surface border border-white/[0.12] text-white cursor-pointer"
          >
            {Array.from({ length: MAX_GRID_DIM }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} row{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
          <span className="text-white/30 text-xs">&times;</span>
          <select
            value={cols}
            onChange={(e) => handleDimensionChange(rows, Number(e.target.value))}
            title="Columns"
            className="h-8 px-2 text-xs rounded-md bg-dark-surface border border-white/[0.12] text-white cursor-pointer"
          >
            {Array.from({ length: MAX_GRID_DIM }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} col{n !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {hasAnyContent && (
          <span className="text-xs text-white/40">
            {occupiedCells.length}/{rows * cols} cells filled
          </span>
        )}

        <div className="flex-1" />

        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = FILE_ACCEPT
            input.multiple = true
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement
              if (target.files) handleFiles(Array.from(target.files))
            }
            input.click()
          }}
        >
          Upload
        </Button>

        {hasAnyContent && (
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={clearAll}
          >
            Clear All
          </Button>
        )}

        <Button
          onClick={handleExport}
          disabled={!canExport}
          icon={<Download size={14} />}
        >
          {isExporting ? 'Stitching...' : 'Stitch & Download'}
        </Button>
      </div>

      {/* Toolbar row 2: display & export options */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Gridlines preview toggle */}
        <button
          onClick={() => setShowGridlines(prev => !prev)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors
            ${showGridlines ? 'bg-white/[0.08] text-white/70 hover:text-white' : 'bg-white/[0.04] text-white/30 hover:text-white/50'}
          `}
          title={showGridlines ? 'Hide gridlines in preview' : 'Show gridlines in preview'}
        >
          {showGridlines ? <Eye size={13} /> : <EyeOff size={13} />}
          Gridlines
        </button>

        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Export options */}
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Export options:</span>
        <button
          onClick={() => setExportGridlines(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            exportGridlines ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/30 hover:text-white/50'
          }`}
          title={exportGridlines ? 'Gridlines will appear in export' : 'Gridlines hidden in export'}
        >
          <Grid3X3 size={12} />
          Lines
        </button>
        <button
          onClick={() => setExportLabels(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            exportLabels ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/30 hover:text-white/50'
          }`}
          title={exportLabels ? 'Labels will appear in export' : 'Labels hidden in export'}
        >
          <Tag size={12} />
          Labels
        </button>
        <button
          onClick={() => setCompression(prev => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            compression ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/30 hover:text-white/50'
          }`}
          title={compression ? 'Compression on — images re-encoded as JPEG' : 'Compression off — full quality'}
        >
          Compress
        </button>
      </div>

      {/* Progress bar */}
      {isExporting && (
        <ProgressBar value={exportProgress} max={100} label="Stitching grid..." />
      )}

      {/* Grid area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden relative"
        onClick={() => { setSelectedCellId(null); setCtxMenu(null) }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          const droppedFiles = Array.from(e.dataTransfer.files)
          if (droppedFiles.length > 0) handleFiles(droppedFiles)
        }}
      >
        {cellSize > 0 ? (
          <div
            className="h-full flex items-center justify-center"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                gap: showGridlines ? `${GRIDLINE_WIDTH}px` : '0px',
                backgroundColor: showGridlines ? GRIDLINE_COLOR : 'transparent',
                border: showGridlines ? `${GRIDLINE_WIDTH}px solid ${GRIDLINE_COLOR}` : 'none',
              }}
            >
            {cells.map(cell => (
              <GridCell
                key={cell.id}
                cell={cell}
                isSelected={selectedCellId === cell.id}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                onSelect={() => setSelectedCellId(cell.id)}
                onUpdateOffset={(ox, oy) => handleUpdateOffset(cell.id, ox, oy)}
                onUpdateScale={(s) => handleUpdateScale(cell.id, s)}
                onSwapStart={setSwapSourceId}
                onSwapDrop={handleSwapCells}
                onContextMenu={(e) => handleContextMenu(e, cell.id)}
                onFocus={() => { setFocusCellId(cell.id); setSelectedCellId(cell.id) }}
                onUpdateLabel={(label) => handleUpdateLabel(cell.id, label)}
              />
            ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full flex items-center justify-center text-white/20 text-sm">
            Loading grid...
          </div>
        )}
      </div>

      {/* Focus mode overlay */}
      {focusCellId && (() => {
        const focusCell = cells.find(c => c.id === focusCellId)
        if (!focusCell || !focusCell.file || !focusCell.thumbnail) return null

        const FOCUS_MIN_SCALE = 0.1
        const FOCUS_MAX_SCALE = 10
        const FOCUS_SCROLL_STEP = 0.05

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Focus toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#00171F] border-b border-white/[0.08] flex-shrink-0">
              <span className="text-sm font-semibold text-[#F47B20]">{focusCell.label}</span>
              <span className="text-xs text-white/40 truncate max-w-[200px]">{focusCell.file.name}</span>

              <div className="flex-1" />

              <button
                onClick={() => handleUpdateScale(focusCellId, Math.max(FOCUS_MIN_SCALE, focusCell.scale - 0.1))}
                className="p-1.5 rounded bg-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.12] transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white/60 min-w-[40px] text-center">
                {Math.round(focusCell.scale * 100)}%
              </span>
              <button
                onClick={() => handleUpdateScale(focusCellId, Math.min(FOCUS_MAX_SCALE, focusCell.scale + 0.1))}
                className="p-1.5 rounded bg-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.12] transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>

              {(focusCell.scale !== 1 || focusCell.offsetX !== 0 || focusCell.offsetY !== 0) && (
                <button
                  onClick={() => { handleUpdateScale(focusCellId, 1); handleUpdateOffset(focusCellId, 0, 0) }}
                  className="p-1.5 rounded bg-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.12] transition-colors"
                  title="Reset zoom and position"
                >
                  <X size={16} />
                </button>
              )}

              <div className="w-px h-6 bg-white/[0.12] mx-1" />

              {(focusCell.offsetX !== 0 || focusCell.offsetY !== 0) && (
                <span className="text-[11px] text-white/40">
                  x: {focusCell.offsetX > 0 ? '+' : ''}{Math.round(focusCell.offsetX)}, y: {focusCell.offsetY > 0 ? '+' : ''}{Math.round(focusCell.offsetY)}
                </span>
              )}

              <button
                onClick={() => setFocusCellId(null)}
                className="px-3 py-1.5 rounded-md bg-[#F47B20] text-white text-sm font-medium hover:bg-[#E06D15] transition-colors flex items-center gap-1.5"
              >
                <Check size={14} />
                Done
              </button>
            </div>

            {/* Focus canvas */}
            <FocusCanvas
              cell={focusCell}
              onUpdateOffset={(ox, oy) => handleUpdateOffset(focusCellId, ox, oy)}
              onUpdateScale={(s) => handleUpdateScale(focusCellId, s)}
              minScale={FOCUS_MIN_SCALE}
              maxScale={FOCUS_MAX_SCALE}
              scrollStep={FOCUS_SCROLL_STEP}
            />

            {/* Focus footer */}
            <div className="px-4 py-2 bg-[#00171F] border-t border-white/[0.08] flex-shrink-0">
              <p className="text-[10px] text-white/30 text-center">
                Drag to reposition &middot; Scroll to zoom &middot; Arrow keys nudge (Shift for 10px) &middot; Esc to close
              </p>
            </div>
          </div>
        )
      })()}

      {/* Context menu */}
      {ctxMenu && (() => {
        const cell = cells.find(c => c.id === ctxMenu.cellId)
        if (!cell) return null
        return (
          <div
            className="fixed z-50 bg-[#00171F] border border-white/[0.12] rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors"
              onClick={() => { replaceCell(ctxMenu.cellId); setCtxMenu(null) }}
            >
              Replace file
            </button>
            {cell.file && (
              <>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors"
                  onClick={() => { clearCell(ctxMenu.cellId); setCtxMenu(null) }}
                >
                  Clear cell
                </button>
                {(cell.offsetX !== 0 || cell.offsetY !== 0 || cell.scale !== 1) && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors"
                    onClick={() => { resetCellPosition(ctxMenu.cellId); setCtxMenu(null) }}
                  >
                    Reset zoom &amp; position
                  </button>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Footer hint */}
      <p className="text-[10px] text-white/25 text-center flex-shrink-0">
        Click cell to select &middot; Drag content to reposition &middot; Arrow keys nudge (Shift for 10px) &middot; Drag label to swap cells &middot; Right-click for options
      </p>
    </div>
  )
}
