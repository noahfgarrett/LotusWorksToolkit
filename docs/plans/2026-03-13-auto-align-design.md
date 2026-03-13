# Grid Stitch Auto-Align — Smart Pixel Detection

## Problem
Construction drawings split across multiple tiles have overlapping regions at edges. Users need to manually nudge each tile to line them up. Auto-align detects matching pixel patterns at shared edges and snaps tiles into place.

## User Workflow
1. Load tiles into grid
2. Zoom/pan one tile to frame just the drawing content (exclude title block/legend)
3. "Apply zoom to all" so every tile is at the same scale
4. Click "Auto-align" — algorithm detects overlap and adjusts offsets automatically

## Algorithm: Pixel Strip Cross-Correlation

### Edge Strip Extraction
- Render each cell's thumbnail onto an offscreen canvas at current zoom/offset
- Extract a 40px-wide strip from the relevant edge (right, left, top, bottom)
- Convert to grayscale for single-channel comparison

### Normalized Cross-Correlation (NCC)
For horizontal pair (A1 → B1):
- Extract right-edge strip from A1, left-edge strip from B1
- Slide strips against each other vertically
- NCC(d) = Σ((A[i]-meanA) × (B[i+d]-meanB)) / (stdA × stdB × N)
- Search range: ±25% of strip length
- Best offset `d` → applied as `offsetY` adjustment to B1

For vertical pairs: same approach with top/bottom strips, sliding horizontally.

### Confidence
- NCC peak value is confidence (0–1)
- Threshold: 0.6 — below this, pair is skipped (no good match)
- Toast reports skipped pairs

## Full-Grid Cascade

### Anchor Selection
- Selected cell is anchor (stays fixed)
- If nothing selected → prompt user to select one
- Fallback: bottom-left cell

### Propagation Order
1. Align all cells in anchor's row (left and right, horizontal matching)
2. For each aligned row cell, align cells above and below (vertical matching)
3. Errors spread from anchor outward, not corner-to-corner

### Example (anchor B2, 3×3)
```
Step 1: B2 (fixed) → B1 (left) → B3 (right)
Step 2: B1 → A1, C1
        B2 → A2, C2
        B3 → A3, C3
```

## UI

### Toolbar
- "Auto-align" button next to "Apply zoom to all"
- Enabled when 2+ cells have content
- Magnet icon from lucide-react

### Right-Click Menu
- "Align with neighbor →" submenu
- Shows adjacent neighbors with content (← A1, → A3, ↑ B2, ↓ D2)
- Single-pair alignment only

### Feedback
- Progress: "Aligning 1/8 pairs..."
- Result toast: "Aligned 6/8 pairs (2 skipped — low confidence)"

## File Changes
- **New: `src/tools/pdf-merge/autoAlign.ts`** — pure utility: extractEdgeStrip, computeNCC, alignPair, alignGrid
- **Modified: `GridStitchMode.tsx`** — Auto-align button, right-click submenu, integration
- **No changes to GridCell.tsx**
- **No new dependencies** — Canvas API + typed arrays only

## Performance
- 40px strip width, ~400px strip height, ±100 search range
- ~8M ops per pair, <50ms per pair
- 3×3 grid (12 pairs) < 1 second total
