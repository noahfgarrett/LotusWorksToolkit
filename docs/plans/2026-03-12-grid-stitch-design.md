# Grid Stitch — Design Document

**Date:** 2026-03-12
**Feature:** Grid Stitch mode within PDF Merge
**Version target:** TBD

---

## Overview

A new mode within PDF Merge that lets users upload PDFs and images into a configurable grid (rows x columns, 1-5 each), nudge pieces for alignment, and export the stitched result as a single-page PDF. Built for construction drawing quadrants (A1, A2, B1, B2, etc.).

## Entry Point

- Tab bar at the top of PdfMergeTool switches between "Merge" (existing) and "Grid Stitch" (new)
- Both modes share the same route (`/pdf-merge`)
- Active mode stored in component state — switching modes preserves both modes' state
- Supported inputs: PDF, PNG, JPEG, TIFF, BMP, WebP, SVG

## Grid Configuration & Upload Flow

### Toolbar
- **Rows dropdown** (1-5) — defaults to 2
- **Columns dropdown** (1-5) — defaults to 2
- **"Upload Files" button** — opens file picker accepting PDFs + images
- **"Clear All" button** — resets the grid

### Dimension changes
- Expanding the grid adds empty cells
- Shrinking drops files in removed cells (confirmation if any cells would be lost)

### Upload flow
1. User clicks "Upload Files" or drags files onto the grid area
2. Files validated (PDF or supported image type)
3. PDFs: first page rendered via pdfjs, stored as cell content
4. Images: loaded as `Image` element directly
5. Files fill cells left-to-right, top-to-bottom, skipping occupied cells
6. Excess files beyond empty cells ignored with toast notification

### Cell labels
Each cell labeled A1, A2, A3 across columns; B1, B2, B3 on next row, etc. Matches construction drawing quadrant naming.

## Grid Canvas & Interaction

### Canvas layout
- Full grid rendered fit-to-viewport by default
- Cells equally sized (canvas dimensions / rows × cols)
- Thin gridlines (1px, light gray) separate cells
- Cell content scaled to fill while maintaining aspect ratio (contain behavior), centered by default

### Drag to move (coarse adjustment)
- Click and hold on cell content to grab it
- Drag to reposition content within its cell
- Content can shift beyond cell boundaries for overlap alignment
- Cursor: `grab` / `grabbing`

### Arrow key nudging (fine adjustment)
- Click a cell to select it (highlighted border, orange)
- Arrow keys shift content by 1px per press
- Shift + Arrow shifts by 10px per press
- Selected cell shows current offset (e.g., "x: +3, y: -2") in small overlay

### Drag to rearrange cells
- Drag a cell's label badge (A1, A2, etc.) to swap with another cell
- Moves the whole assignment, not just content

### Cell context menu (right-click or button)
- Replace file
- Clear cell
- Reset position (removes nudge offset)

## Export & Compression

### Stitching process
1. Create new PDF document via `pdf-lib`
2. Calculate output page size: each cell at native resolution. Total page = sum of widest cells across columns × sum of tallest cells across rows
3. For each cell, embed content at correct position with nudge offsets applied
4. PDFs: `pdf-lib` `embedPage()` — vector data preserved, no rasterization
5. Images: `pdf-lib` `embedPng()` / `embedJpg()` — native resolution. Non-JPEG images converted to PNG first

### Compression toggle
- Toggle switch in toolbar: "Compress output" — **off by default**
- **Off:** PDF pages embedded as-is, images at full resolution. Max detail.
- **On:** Images re-encoded as JPEG at 85% quality. PDF pages stay vector.
- Suggested filename: `grid-stitch-{rows}x{cols}.pdf`

### Save flow
Same as existing PDF Merge — `showSaveFilePicker` first, fallback to blob download.

## State Management

```typescript
interface GridCell {
  id: string              // unique id
  label: string           // "A1", "B2", etc.
  file: File | null       // raw source file
  type: 'pdf' | 'image' | null
  thumbnail: string | null // data URL for display
  nativeWidth: number     // original content dimensions
  nativeHeight: number
  offsetX: number         // nudge offset in px (relative to display)
  offsetY: number
}

interface GridStitchState {
  rows: number            // 1-5
  cols: number            // 1-5
  cells: GridCell[]       // length = rows * cols
  selectedCellId: string | null
  compression: boolean    // default false
}
```

### Memory
- Thumbnails rendered at viewport-appropriate resolution (not full native)
- Raw `File` objects kept in state, bytes read only at export time
- Full-resolution rendering only during export
- Memory meter reused from PDF Merge

### No cross-mode state
Merge mode and Grid Stitch mode manage files independently. Switching tabs does not transfer files.

## File Structure

### New files
- `src/tools/pdf-merge/GridStitchMode.tsx` — Main grid stitch component (canvas, toolbar, interaction logic)
- `src/tools/pdf-merge/GridCell.tsx` — Individual cell component (content rendering, drag/nudge, selection, context menu)

### Modified files
- `src/tools/pdf-merge/PdfMergeTool.tsx` — Add tab bar, conditionally render merge UI or `<GridStitchMode />`
- `src/utils/pdf.ts` — Add helper to render PDF page to full-res image data for export embedding

### No new dependencies
- `pdf-lib`: `embedPage()`, `embedPng()`, `embedJpg()`
- `pdfjs-dist`: PDF page rendering
- Native pointer events for drag (no `@dnd-kit` needed)
- Plain keyboard handlers for arrow nudging

### Shared components reused
- `FileDropZone` — upload drag-drop
- `Button` — toolbar actions
- `ProgressBar` — export progress
