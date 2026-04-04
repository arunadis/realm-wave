# Phase 4 — Renderer Polish & Score HUD (Detail)

## Goal
Clean visuals — extract all drawing into `renderer.js`, distinct tile icons per tier, grid styling, score/turn HUD, canvas background.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/renderer.js` | Create | All draw functions: background, HUD, ring, grid, tiles, overlays |
| `src/state.js` | Update | Remove all render code, export `render()` that delegates to renderer |
| `src/main.js` | Update | Minor — import render from correct module |

## Renderer Functions

### renderer.js exports
- `renderFrame(ctx, canvasW, canvasH, state, layout)` — master draw call
- `drawBackground(ctx, w, h)` — earth-tone gradient
- `drawHUD(ctx, w, state)` — title, stage/era name, score, turn, combo
- `drawRingArea(ctx, w, state, ringTiles)` — HOLD + CURRENT + NEXT queue + rotate charges
- `drawGrid(ctx, layout, grid)` — cell backgrounds, borders, tiles
- `drawTile(ctx, x, y, size, tile)` — per-tier color + icon/emoji
- `drawGameOver(ctx, w, h, score)` — overlay

### Per-Tier Tile Visuals
| Tier | Name | Color | Icon | Label |
|------|------|-------|------|-------|
| 0 | Tribe | #c87533 bronze | 🔥 | Tribe |
| 1 | Hut | #8b6914 goldenrod | 🛖 | Hut |
| 2 | Village | #2e8b57 green | 🏘️ | Village |
| 3 | Town | #4682b4 blue | 🏛️ | Town |
| 4 | City | #7b68ee purple | 🏙️ | City |
| 5 | Capital | #ffd700 gold | 👑 | Capital |

## Layout Constants (moved to renderer)
- HUD_HEIGHT, RING_AREA_HEIGHT, GRID_PADDING, CELL_GAP
- These are renderer concerns, not state concerns

## Acceptance Criteria
1. All tiers visually distinct with emoji icons and colors
2. HUD shows title, era name, score, turn count clearly
3. Ring area shows HOLD/CURRENT/NEXT with labels
4. Grid cells have rounded corners and subtle shadow
5. Game over overlay is readable
6. No rendering code in state.js
7. Playwright screenshot looks presentable

---

## Post-Implementation Notes

### What was built
- `src/renderer.js` — complete rendering module with:
  - `renderFrame()` master draw call
  - `drawBackground()` — earth-tone diagonal gradient + subtle diagonal line texture overlay
  - `drawHUD()` — serif title "Realm Weave", era name ("Dawn Era"), formatted score with commas, turn, combo counter
  - `drawRingArea()` — HOLD/PLACE/NEXT sections with proper centering, gold glow on current tile, rotate charges
  - `drawGrid()` — dark panel background, rounded-corner cells with subtle borders
  - `drawTile()` — per-tier emoji icons (🔥🛖🏘️🏛️🏙️👑), rounded corners, inner highlight border, bottom shadow edge, full tier name label
  - `drawGameOver()` — centered panel with rounded corners, title, score, "Click to restart" hint
  - `roundRect()` utility supporting per-corner radii
- `src/state.js` — stripped of all drawing code (~180 lines removed), `render()` now single-line delegation to `renderFrame()`
- Layout constants (`HUD_HEIGHT`, `RING_AREA_HEIGHT`, `GRID_PADDING`) exported from renderer, imported by state for layout calculations

### Visual improvements
- **Tile icons**: emoji per tier instead of text abbreviations
- **Rounded corners**: grid cells, tiles, ring slots, game over panel
- **Grid panel**: semi-transparent dark background panel behind grid
- **Background**: diagonal gradient + subtle texture lines (3% opacity)
- **HUD**: serif font, era name, comma-formatted scores, combo display
- **Ring area**: properly centered HOLD + PLACE + NEXT layout with consistent spacing

### Verified behavior
- All tiers visually distinct: Tribe (🔥 bronze), Hut (🛖 goldenrod), Village (🏘️ green)
- Chain merges render correctly with new visuals
- Combo counter shows in HUD (e.g. "Combo: ×2")
- Playwright: 3 iterations, multi-click, 0 errors
- Score formatted with commas (e.g. "1,100")

### Deviations from plan
- No changes to `main.js` needed — it already imports `render` from `state.js` which now delegates
- ERA_NAMES array added to renderer for stage name display
- TIER_BG_COLORS and TIER_BORDER_COLORS defined separately from TIER_COLORS in grid.js for finer control

### Handoff notes for Phase 5
- `state.js` is now purely state logic (~142 lines) — clean separation
- `holdTile` in `ring.js` ready to wire: needs `handleHold()` export in `state.js` + key binding in `main.js`
- Stage progression logic needed: advance stage after score threshold or capital merge
- Hazard tiles (stone, swamp) need new tile types in `grid.js`
