# Phase 5 — Stages 1–3 (Tutorial, Hazards, Hold Action) (Detail)

## Goal
First 3 playable stages with progressive mechanic unlocks: stage select screen, score targets, flood hazards, hold action, star ratings.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/stages.js` | Create | Stage config array with targets, hazard freq, mechanics |
| `src/hazards.js` | Create | Flood hazard type, resolveHazard function |
| `src/grid.js` | Update | Support hazard tile type in grid cells |
| `src/state.js` | Update | Stage flow, hold action, hazard spawning, star tracking |
| `src/main.js` | Update | H key for hold, stage select click handling |
| `src/renderer.js` | Update | Stage select screen, stage clear overlay, hazard tiles, hold feedback |

## Data Structures

### Stage Config
```js
{
  id: 1,
  era: 'Dawn',
  gridSize: 5,
  target: 500,           // score to clear
  hazardFreq: 0,         // turns between hazard spawns (0 = none)
  mechanics: [],         // ['hold'] unlocked at stage 3
  turnLimit3Star: 15,    // turns for 3-star rating
  turnLimit2Star: 25,    // turns for 2-star rating
}
```

### Hazard Tile
```js
{ type: 'hazard', hazardKind: 'flood', destroyBelow: 2 }
```
Flood: on spawn, destroys adjacent tiles below tier threshold.

### Game Mode Flow
- `'stageselect'` → player picks stage → `'playing'` → score >= target → `'stageclear'`
- Grid full with no merges → `'gameover'` (fail)
- `'stageclear'` / `'gameover'` → click → `'stageselect'`

### Star Rating
```js
stars = turn <= turnLimit3Star ? 3 : turn <= turnLimit2Star ? 2 : 1
```

## Function Signatures

### stages.js
- `STAGES[]` — config array for all stages
- `getStage(id)` → stage config object
- `computeStars(stageConfig, turn)` → 1|2|3

### hazards.js
- `createHazardTile(kind)` → hazard tile object
- `resolveHazard(grid, row, col, hazard)` → `{ destroyed: [{row,col,tile}...] }`
- `spawnHazard(grid)` → places hazard in random empty cell, returns {row,col} or null
- `isHazardTile(tile)` → boolean

### state.js changes
- `gameState.mode`: add `'stageselect'` and `'stageclear'`
- `gameState.stageId`, `gameState.stageConfig`, `gameState.stars`, `gameState.stageStars[]` (saved per-stage)
- `startStage(stageId)` — init grid/ring for stage config
- `handlePlacement()` — after merges, check target reached → stageclear; check hazard spawn turn
- `handleHold()` — swap current with held (only if 'hold' in mechanics)

### main.js changes
- H key → `handleHold()`
- Click during stageselect → `startStage(clickedId)`
- Click during stageclear/gameover → back to stageselect

### renderer.js changes
- `drawStageSelect(ctx, w, h, state)` — stage buttons with stars
- `drawStageClear(ctx, w, h, state)` — score + stars overlay
- `drawHazardTile(ctx, x, y, size, tile)` — distinct hazard visual
- Update `drawHUD` — show target progress bar
- Update `drawRingArea` — highlight hold slot when hold unlocked

## Acceptance Criteria
1. Stage select screen shows 3 stages with era names
2. Clicking stage starts it with correct config
3. Score >= target triggers stage clear with star rating
4. Grid full → game over (retry)
5. Stage 2: flood hazard spawns every 8 turns, destroys adjacent low-tier tiles
6. Stage 3: H key swaps current tile with hold slot
7. Stars computed based on turn count
8. `render_game_to_text` includes stageId, stars, stageConfig
9. Playwright captures stage select + gameplay + clear screens

---

## Post-Implementation Notes

### What was built
- `src/stages.js` — 3 stage configs (Dawn/Bronze/Iron) with target scores, hazard frequency, mechanics, star turn limits
- `src/hazards.js` — `createHazardTile`, `isHazardTile`, `resolveHazard` (destroys adjacent tiles below tier threshold), `spawnHazard` (random empty cell, immediate resolve)
- `src/state.js` — complete rewrite:
  - Game modes: `stageselect` → `playing` → `stageclear`/`gameover` → `stageselect`
  - `startStage(stageId)` initializes grid/ring per stage config
  - `handlePlacement` checks target reached → stageclear with star rating; spawns hazard on hazardFreq turns
  - `handleHold()` — swaps current tile with held (only if `hold` in stage mechanics)
  - `goToStageSelect()` — returns to stage select
  - Star persistence via localStorage
- `src/main.js` — H key for hold, stage select click routing, stageclear/gameover → stageselect on click, `window.startStage` Playwright hook
- `src/renderer.js` — complete rewrite:
  - `drawStageSelect` — 3 stage buttons with era names, targets, descriptions, gold stars
  - `getStageButtonAt` — hit testing for stage button clicks
  - `drawStageClear` — overlay with stars, score, turns, star rating explanation
  - `drawGameOver` — "Stage Failed" with target shown
  - `drawHazardTile` — red danger tile with 🌊 icon
  - `drawHUD` — target progress bar (gradient fill), "Hold [H]" indicator
  - Hold slot: 🔒 when locked, "H" placeholder when unlocked, tile when held

### Verified behavior
- **Stage select screen**: 3 stages displayed with era names, targets, descriptions, star ratings
- **Stage 1 (Dawn)**: target 500, no hazards, HOLD locked → cleared with ★★★ in 6 turns
- **Stage 2 (Bronze)**: target 1200, hazard every 8 turns, HOLD locked → plays correctly
- **Stage 3 (Iron)**: target 2500, hazard every 6 turns, HOLD unlocked → "Hold [H]" visible in HUD
- **Stage clear flow**: score ≥ target → "Stage Clear!" overlay with ★★★/★★/★ → click → stageselect with persisted stars
- **Game over flow**: grid full → "Stage Failed" overlay → click → stageselect
- **Stars**: computed from turn count, persisted to localStorage, displayed on stage select
- **Playwright**: multiple test runs, all flows verified, 0 errors

### Deviations from plan
- `grid.js` was not modified — hazard tiles are handled entirely in `hazards.js` and `renderer.js` via `isHazardTile()` check
- Hazards resolve immediately on spawn (spawn + destroy + remove self), so they're transient — no hazard tile lingers on grid
- Stage descriptions hardcoded in renderer's `drawStageSelect` in addition to `stages.js` — could be consolidated later

### Handoff notes for Phase 6
- `STAGES` array in `stages.js` easily extensible — add stages 4-6 with new mechanics
- Catalyst action needs new interaction mode (click Catalyst → click tile 1 → click tile 2)
- Grid size change (6×6) needs `stageConfig.gridSize` to propagate through layout
- Second hazard type (Raid) needs new kind in `hazards.js`
- `drawStageSelect` should read from `STAGES` array directly instead of hardcoded configs
