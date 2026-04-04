# Phase 6 — Stages 4–6 (Catalyst, Dual Hazards, Grid Expansion) (Detail)

## Goal
Mid-game stages introducing Catalyst action, Raid hazard type, and 6×6 grid with combo x3 bonus.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/stages.js` | Update | Add stage 4–6 configs with new mechanics |
| `src/hazards.js` | Update | Add Raid hazard type (targeted highest-tier destruction) |
| `src/state.js` | Update | Wire catalyst action, combo x3 scoring, hazardTypes from config |
| `src/main.js` | Update | C key for catalyst, route clicks through catalyst mode |
| `src/renderer.js` | Update | Dynamic stage select, raid tile visuals, catalyst overlay, 6×6 scaling |

## Stage Configs Added

| Stage | Era | Grid | Target | Hazards | Mechanics | 3★ / 2★ turns |
|-------|-----|------|--------|---------|-----------|---------------|
| 4 | Classical | 5×5 | 5,000 | flood @6 | hold, catalyst | 30 / 50 |
| 5 | Medieval | 5×5 | 9,000 | flood+raid @5 | hold, catalyst | 35 / 55 |
| 6 | Renaissance | 6×6 | 15,000 | flood+raid @5 | hold, catalyst, comboX3 | 40 / 65 |

## New Mechanics

### Catalyst (Stage 4+)
- Press **C** to enter catalyst mode (2 charges per stage)
- Click first tile → click adjacent second tile → force-merge to higher tier + 1
- Consumes 1 charge, resolves chain merges after catalyst merge
- Purple overlay + glow on selected tile during selection
- HUD shows `Cat [C]:N` with remaining charges

### Raid Hazard (Stage 5+)
- New hazard kind `'raid'` in `hazards.js`
- Destroys the single highest-tier adjacent tile (targeted, not area-of-effect like flood)
- Purple-tinted tile with ⚔️ icon
- `spawnHazard()` accepts `hazardTypes` array, picks randomly

### Combo x3 Bonus (Stage 6)
- When 3+ chain merges occur in one turn, the last merge's score is tripled
- Implementation: `finalScore += lastMerge.scoreGained * 2` (adds 2x on top of existing 1x)
- HUD shows `Combo: ×N ×3!` when active

### 6×6 Grid (Stage 6)
- `createGrid(6)` via `stageConfig.gridSize = 6`
- Renderer auto-scales — `getGridLayout()` already parameterized by gridSize
- Stage select shows purple `6×6` badge on stages with gridSize > 5

## Function Signatures

### state.js — new exports
- `toggleCatalystMode()` → enter/exit catalyst selection (C key)
- `handleCatalystSelect(row, col)` → two-click tile selection for force-merge

### hazards.js — updated
- `resolveHazard(grid, row, col, hazard)` — now handles `'raid'` kind (highest-tier adjacent)
- `spawnHazard(grid, kind, hazardTypes)` — picks from hazardTypes array if provided

### renderer.js — new
- `drawCatalystOverlay(ctx, layout, state)` — purple tint + selection glow
- `drawHazardTile` — handles both flood (🌊 red) and raid (⚔️ purple) visuals
- `drawStageSelect` — reads from `STAGES` array dynamically instead of hardcoded

---

## Post-Implementation Notes

### What was built
- All 3 stage configs added to `stages.js` with correct mechanics arrays
- Raid hazard: targeted destruction of highest-tier adjacent tile, purple ⚔️ visual
- Catalyst action: full two-click interaction flow with purple overlay, charge tracking
- Combo x3: triples last merge score on 3+ chain, shown in HUD
- 6×6 grid: renders correctly with auto-scaling, purple badge on stage select
- Stage select: fully dynamic from `STAGES` array, supports any number of stages

### Verified behavior
- **Stage select**: all 6 stages displayed with era names, targets, descriptions, star slots
- **Stage 6**: 6×6 grid renders, merges work (Tribe→Hut→Village chain confirmed), score 700 in 6 turns
- **HUD**: shows Hold [H], Cat [C]:2, combo indicator, progress bar 700/15000
- **6×6 badge**: purple badge shown on Stage 6 button
- **Playwright**: 3 iterations stage select + gameplay, 0 errors

### Deviations from plan
- Catalyst charges set to 2 per stage (plan said "costs 1 charge" but didn't specify total)
- Combo x3 bonus added to `handlePlacement` in state.js rather than modifying `resolveMerges` in grid.js — cleaner separation

### Handoff notes for Phase 7
- Combo system foundation exists (events array from resolveMerges tracks chain length)
- Phase 7 adds visual juice: screen shake, combo popup, merge flash/glow
- `gameState.combo` already tracked per turn — Phase 7 extends with multiplier display
- Ring charge bonus for 3+ chains (Phase 7 task) not yet implemented
- Consider adding combo multiplier to all merges (not just last) in Phase 7
