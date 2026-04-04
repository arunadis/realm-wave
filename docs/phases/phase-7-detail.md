# Phase 7 — Combo System & Visual Juice (Detail)

## Goal
Satisfying chain detection with multipliers, screen shake, combo counter display, merge flash/glow, and ring charge bonus.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/grid.js` | Update | Combo multiplier in `resolveMerges`: Nth chain merge scores N× base |
| `src/state.js` | Update | Visual effect state fields, effect triggers in `handlePlacement`, timer tick-down in `update(dt)` |
| `src/renderer.js` | Update | Screen shake, merge flash glow, combo counter popup, per-merge ×N labels |

## Mechanics Implemented

### Combo Multiplier Scoring
- `resolveMerges` now applies `scoreGained = baseScore × chainIndex`
  - 1st merge: 1× base
  - 2nd merge: 2× base
  - 3rd merge: 3× base, etc.
- Each merge event includes `chainIndex` for visual use
- The comboX3 bonus (Phase 6, Stage 6) stacks on top — triples the last merge's already-multiplied score

### Visual Effects

#### Screen Shake (3+ chain)
- `state.screenShake` timer set to 0.35s on 3+ chain merges
- Renderer applies random offset `±intensity` to canvas via `ctx.translate()`
- Intensity decays linearly: `min(6, screenShake × 18)` pixels

#### Merge Flash Glow
- `state.mergeFlashes[]` — one entry per merge event
  - Fields: `row, col, tier, chainIndex, timer, duration` (0.5s)
- Renderer draws:
  - Outer glow stroke with tier-colored shadow blur (fading)
  - White overlay fill (fading)
  - Rising `×N` multiplier label for chainIndex ≥ 2

#### Combo Counter Popup (2+ chain)
- `state.comboPopup` — `{ combo, score, timer, duration }` (1.2s)
- Renderer draws centered pill overlay with scale-in animation:
  - `×N CHAIN` in gold 34px
  - `+score` below in 14px
  - Scale: 50% → 100% quick, alpha fades in second half

### Ring Charge Bonus
- 3+ chain grants +1 rotate charge (capped at `maxRotateCharges + 1`)
- Implemented in `handlePlacement` after merge resolution

### Timer Tick-Down
- `update(dt)` decrements `screenShake`, `mergeFlashes[].timer`, `comboPopup.timer`
- Expired effects are cleaned up (spliced/nulled)

## Function Changes

### grid.js
- `resolveMerges(grid)` — added `chainIndex` to each event, `scoreGained = baseScore × chainIndex`

### state.js
- `createStageSelectState()` — added `screenShake`, `mergeFlashes`, `comboPopup` fields
- `startStage()` — initializes visual effect fields to clean state
- `handlePlacement()` — triggers mergeFlashes, comboPopup, screenShake, ring charge bonus after merge
- `update(dt)` — ticks down all visual effect timers

### renderer.js
- `renderFrame()` — applies screen shake offset, draws merge flashes and combo popup
- `drawMergeFlashes(ctx, layout, flashes)` — new function for glow/flash overlays
- `drawComboPopup(ctx, w, h, layout, popup)` — new function for centered combo display

---

## Post-Implementation Notes

### Verified behavior
- **Combo scoring**: 6 turns on Stage 6 now scores 1,000 (was 700 without multiplier)
- **Stage clear**: Stage 2 cleared with 3★ in 8 turns thanks to combo multiplier boosting score to 1,200
- **Playwright**: 3+ iterations across multiple stages, 0 errors
- **Visual effects**: Screen shake, merge glow, combo popup all render correctly with smooth fade-out

### Deviations from plan
- Multiplier applied directly in `resolveMerges` rather than in `state.js` — cleaner since the score is calculated at merge time
- Ring charge bonus allows exceeding `maxRotateCharges` by 1 (reward feel)

### Handoff notes for Phase 8
- Phase 8 adds Stages 7–10 with Pollution hazard, Tech Tile, and endgame mechanics
- The combo system is fully operational — future stages can gate higher multiplier tiers
- Visual effects infrastructure (timer-based, per-frame tick-down) can be reused for future animations
- Consider adding sound effects hooks alongside visual effects in a future phase
