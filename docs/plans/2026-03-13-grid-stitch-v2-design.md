# Grid Stitch v2 — Snap, Region Focus, Apply Zoom

## Features

### 1. Apply Zoom to All
- Button in toolbar, enabled when a cell with content is selected
- Copies selected cell's `scale`, `offsetX`, `offsetY` to all other cells with content
- Pushes undo snapshot before applying

### 2. Snap-to-Position (Sticky Guides)
- During drag, content snaps to 5 anchor points: center + 4 edge alignments
- 8px magnetic threshold — snap if within 8px, keep dragging to override
- Arrow keys still work for 1px fine-tuning (Shift+Arrow for 10px)
- Visual feedback: thin dashed crosshair line (1px, white/50%) flashes for 300ms on snap
- Snap targets computed from displayW/H vs cellW/H:
  - Center: `{ x: 0, y: 0 }`
  - Left edge flush: `{ x: -(displayW - cellW) / 2, y: 0 }`
  - Right edge flush: `{ x: (displayW - cellW) / 2, y: 0 }`
  - Top edge flush: `{ x: 0, y: -(displayH - cellH) / 2 }`
  - Bottom edge flush: `{ x: 0, y: (displayH - cellH) / 2 }`

### 3. Region Focus
- Ctrl+click to multi-select cells (blue ring instead of orange)
- "Focus Region" button appears when >= 2 cells multi-selected
- Also available via right-click → "Focus region"
- View: only selected cells shown, laid out in tightest bounding rectangle at larger size
- All normal controls work inside region focus (pan, zoom, snap, per-cell focus)
- Exit: Escape or "Back to full grid" button
- Multi-selection clears on exit

## Data Model

- `GridCellData`: no changes
- New state in GridStitchMode:
  - `multiSelected: Set<string>` — Ctrl+clicked cell IDs
  - `regionFocusIds: string[] | null` — non-null = region focus active
- New prop in GridCell:
  - `isMultiSelected: boolean` — blue ring styling

## File Changes

- **GridCell.tsx**: snap logic in handlePointerMove, snap guide overlay, isMultiSelected prop
- **GridStitchMode.tsx**: multi-select state, region focus view, apply-zoom-to-all button, context menu additions
