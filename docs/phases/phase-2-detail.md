# Phase 2 — Grid Core (5×5 Board + Tile Placement) (Detail)

## Goal
Functional 5×5 grid where tiles can be placed via click and basic 2-match merges resolve automatically.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/grid.js` | Create | Grid data structure, tile placement, merge resolution |
| `src/state.js` | Update | Initialize grid, currentTile, integrate grid into state/render |
| `src/main.js` | Update | Click handler, pixel-to-cell mapping, tile placement flow |

## Data Structures

### Tile Object
```js
{ tier: 0, name: 'tribe' }  // tier 0–5 maps to TIER_NAMES
```

### Grid
```js
// 2D array: grid[row][col] = null | Tile
grid = [
  [null, null, null, null, null],
  [null, null, null, null, null],
  ...
]
```

### Merge Event
```js
{ row, col, fromTier, toTier, merged: [{row, col}, ...] }
```

## Function Signatures

### grid.js
- `createGrid(size)` → 2D array of `null`
- `createTile(tier)` → `{ tier, name: TIER_NAMES[tier] }`
- `placeTile(grid, row, col, tile)` → `boolean` (false if cell occupied)
- `resolveMerges(grid)` → `{ grid, events[], scoreGained }` — scans all cells for adjacent same-tier pairs, merges into next tier at first cell, removes second, repeats until no merges remain (chain merges)
- `getAdjacentSameTier(grid, row, col)` → array of `{row, col}` with same tier (4-directional)
- `isGridFull(grid)` → `boolean`

### Merge Rules
- 2 adjacent tiles of same tier → merge into tier+1 at the position of the first found
- Capital (tier 5) cannot merge further
- After each merge, re-scan for new matches (chain merges)
- Score per merge: `(tier+1) * 100`

## Layout Constants
- Grid drawn centered horizontally, offset from top by HUD height
- Cell size: `Math.floor((canvasWidth - padding) / gridSize)`
- Grid origin: centered in canvas

## Acceptance Criteria
1. Clicking an empty cell places the current tile there
2. Adjacent same-tier tiles merge into next tier
3. Chain merges resolve automatically
4. Score increments on merge
5. Turn increments on placement
6. `render_game_to_text` shows grid contents
7. Grid full detection works
8. Playwright captures gameplay screenshot

---

## Post-Implementation Notes

### What was built
- `src/grid.js` — `createGrid`, `createTile`, `placeTile`, `resolveMerges`, `isGridFull`, `hasAnyMerge`, `generateRandomTile`, tier colors/names constants
- `src/state.js` — fully rewritten: initializes 5×5 grid, `currentTile`, `handlePlacement()` with merge resolution, grid rendering with per-tier colored tiles, HUD with score/turn/stage, current tile preview, game-over overlay with click-to-restart
- `src/main.js` — added `onCanvasClick` with pixel-to-cell mapping, imports `handlePlacement`/`pixelToCell`/`resetState`

### Verified behavior
- Clicking empty cell places Tribe tile → turn increments
- Two adjacent same-tier tiles merge into next tier (Tribe+Tribe → Hut, score +200)
- Chain merges resolve automatically (multiple merges in one placement)
- Grid renders with distinct colors per tier and abbreviated labels (Tri, Hut, Vil, Tow, Cit, Cap)
- Game over triggers when grid is full with no possible merges; click restarts
- `render_game_to_text` returns full grid contents, currentTile, score, turn
- Playwright ran 3 iterations with multi-click actions — 0 errors, screenshots correct

### Deviations from plan
- Added `hasAnyMerge()` utility (not in original plan) for game-over detection
- `generateRandomTile()` always returns tier 0 — Phase 3 replaces with ring queue
- Added click-to-restart on game over (quality of life)

### Handoff notes for Phase 3
- `generateRandomTile()` in `grid.js` is the tile source — replace with ring `popNext()`
- `state.js` `handlePlacement()` calls `generateRandomTile()` at line ~104 — swap to ring pop
- `currentTile` preview area at top of grid is ready to become ring display
- `getGridLayout()` returns layout constants for positioning ring UI above grid
