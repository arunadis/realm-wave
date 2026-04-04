# Realm Weave — Multi-Phase Implementation Plan

Expanded step-by-step build plan for a 10-stage hybrid puzzle-strategy game — each phase is self-contained and can be executed in a single conversation without overloading the context window.

---

## Design Reference (keep handy across all phases)

- **Core loop**: tile appears in World Ring → player places on grid → merges resolve → ring actions → next turn
- **Grid**: 5×5 (stages 1–5), 6×6 (stages 6–10)
- **Tile tiers**: Tribe → Hut → Village → Town → City → Capital (2-match merges each tier)
- **Ring actions**: Rotate (reorder queue), Hold (stash 1 tile), Catalyst (force-merge at cost)
- **Hazards**: flood, raid, pollution — destroy low-tier adjacents, frequency scales per stage
- **Win/lose**: reach target score to clear stage; grid full with no merge = run ends
- **Stars**: 1★ target score, 2★ zero damage, 3★ within N turns → currency for permanent upgrades
- **Tech**: vanilla HTML5 Canvas + JS, `localStorage` persistence, Playwright test loop

### File Structure
```
src/
  index.html       main.js        grid.js        ring.js
  stages.js        hazards.js     upgrades.js    renderer.js
  audio.js         state.js
```

### Phase Detail Docs Convention

Before implementing each phase, a detailed plan is created at `docs/phases/phase-N-detail.md` with exact function signatures, data structures, edge cases, and acceptance criteria. After implementation, the detail doc is updated with what was actually built, deviations, and handoff notes for the next phase. This ensures each conversation inherits full context without re-reading all source files.

---

## Phase 1 — Project Scaffold & Game Loop

> **Detail doc**: [`docs/phases/phase-1-detail.md`](phases/phase-1-detail.md)

**Goal**: runnable page with canvas, game loop, central state, and Playwright hooks.

**Files to create**: `index.html`, `main.js`, `state.js`

**Tasks**:
1. Create `index.html` with a centered `<canvas>` and viewport meta for mobile.
2. Create `state.js`:
   - `gameState` object: `{ mode, grid, ring, score, turn, stage, combo }`.
   - Export `render_game_to_text()` → returns `JSON.stringify(gameState)`.
   - Export `advanceTime(ms)` → calls `update()` N times deterministically.
3. Create `main.js`:
   - Canvas setup + resize handler.
   - `requestAnimationFrame` game loop calling `update(dt)` → `render(ctx)`.
   - Wire `window.render_game_to_text` and `window.advanceTime`.
4. Verify: open in browser, canvas renders a colored background, Playwright client runs without errors and captures a screenshot.

**Playwright check**: `node scripts/web_game_playwright_client.js --url http://localhost:5173 --click 100,100 --iterations 1`

**Done when**: canvas visible, state hook returns valid JSON, screenshot captured.

---

## Phase 2 — Grid Core (5×5 Board + Tile Placement)

> **Detail doc**: [`docs/phases/phase-2-detail.md`](phases/phase-2-detail.md)

**Goal**: functional 5×5 grid where tiles can be placed and basic 2-match merges resolve.

**Files to create/edit**: `grid.js`, update `state.js`, update `main.js`

**Tasks**:
1. Create `grid.js`:
   - `createGrid(size)` → 2D array of `null` cells.
   - `placeTile(grid, row, col, tile)` → returns success/fail.
   - `resolveMerges(grid)` → scan adjacents, merge matching tiers, return list of merge events.
   - Tile object: `{ tier, name }` using hierarchy: `['tribe','hut','village','town','city','capital']`.
2. Update `state.js` to hold `grid` in `gameState`, initialize 5×5 on new game.
3. Update `main.js`:
   - On canvas click → map pixel to grid cell → place current tile → call `resolveMerges`.
   - Temporary: generate a random tier-1 tile each turn (ring comes in Phase 3).
4. Minimal rendering: draw grid lines + colored rectangles per tier.
5. Test: place tiles, see merges happen (2 adjacent Tribes → 1 Hut).

**Done when**: clicking grid places tiles, adjacent matches merge visually, `render_game_to_text` shows grid state.

---

## Phase 3 — World Ring (Circular Queue + Preview)

> **Detail doc**: [`docs/phases/phase-3-detail.md`](phases/phase-3-detail.md)

**Goal**: tiles come from a visible circular ring queue instead of random generation.

**Files to create/edit**: `ring.js`, update `state.js`, update `main.js`

**Tasks**:
1. Create `ring.js`:
   - `createRing(slotCount)` → circular array of upcoming tiles.
   - `popNext(ring)` → dequeue front tile, push new random tile to back.
   - `rotateRing(ring, direction)` → shift queue order (costs 1 charge).
   - `holdTile(ring, tile)` → stash tile, swap with hold slot.
2. Update `state.js`: add `ring` and `heldTile` to `gameState`.
3. Update `main.js`:
   - Draw ring as a row/arc above the grid showing next 6 tiles.
   - Current tile = ring front; on grid click → place, then `popNext`.
   - Display held tile slot (placeholder — Hold action comes in Phase 5).
4. Test: tiles flow from ring to grid, ring refills, queue visible.

**Done when**: ring queue drives tile flow, preview is visible, placement works end-to-end.

---

## Phase 4 — Renderer Polish & Score HUD

> **Detail doc**: [`docs/phases/phase-4-detail.md`](phases/phase-4-detail.md)

**Goal**: clean visuals — distinct tile icons per tier, grid styling, score/turn display.

**Files to create/edit**: `renderer.js`, update `main.js`

**Tasks**:
1. Create `renderer.js` with dedicated draw functions:
   - `drawGrid(ctx, grid)` — cell backgrounds, borders, tile icons.
   - `drawRing(ctx, ring)` — circular or horizontal tile preview.
   - `drawHUD(ctx, state)` — score, turn count, current stage/era name.
   - `drawTile(ctx, x, y, tile)` — per-tier color + simple icon (emoji or geometric shape).
2. Tile visuals: campfire 🔥, hut 🛖, village cluster, town, city skyline, golden capital.
3. Background: canvas-drawn earth-tone gradient (not CSS).
4. Move all drawing from `main.js` into `renderer.js`.
5. Test: screenshot should show clean, readable board with distinguishable tiers.

**Done when**: all tiers visually distinct, HUD readable, screenshots look presentable.

---

## Phase 5 — Stages 1–3 (Tutorial, Hazards, Hold Action)

> **Detail doc**: [`docs/phases/phase-5-detail.md`](phases/phase-5-detail.md)

**Goal**: first 3 playable stages with progressive mechanic unlocks.

**Files to create/edit**: `stages.js`, `hazards.js`, update `state.js`, update `main.js`

**Tasks**:
1. Create `stages.js`:
   - Stage config array: `{ id, era, gridSize, target, hazardFreq, mechanics[], turnLimit3Star }`.
   - Stage 1 (Dawn): target 500, no hazards, tutorial overlay.
   - Stage 2 (Bronze): target 1200, hazard tiles every 8 turns.
   - Stage 3 (Iron): target 2500, Hold action unlocked.
2. Create `hazards.js`:
   - Hazard tile type: `{ type: 'flood', destroyBelow: 2 }`.
   - `resolveHazard(grid, row, col, hazard)` → destroy adjacent tiles below threshold, return damage events.
3. Stage flow: start screen → select stage → play → score check → win/lose screen.
4. Hold action (stage 3+): press H or tap hold-slot → swap current ring tile with held tile.
5. Star tracking: compute 1/2/3 stars on stage completion, store in `gameState`.
6. Test each stage: reach target, trigger hazard, use hold, verify star awards.

**Done when**: stages 1–3 playable end-to-end, hazards destroy tiles, hold works, stars awarded.

---

## Phase 6 — Stages 4–6 (Catalyst, Dual Hazards, Grid Expansion)

> **Detail doc**: [`docs/phases/phase-6-detail.md`](phases/phase-6-detail.md)

**Goal**: mid-game stages introducing Catalyst action, second hazard type, and 6×6 grid.

**Files to edit**: `stages.js`, `hazards.js`, `ring.js`, `grid.js`, `renderer.js`

**Tasks**:
1. Stage 4 (Classical): target 5000, Catalyst action unlocked.
   - Catalyst: select 2 adjacent non-matching tiles → force-merge into the higher tier, costs 1 charge.
   - UI: click Catalyst button → click first tile → click second tile → resolve.
2. Stage 5 (Medieval): target 9000, add Raid hazard type.
   - Raid: destroys the single highest-tier tile adjacent (targeted destruction).
3. Stage 6 (Renaissance): target 15000, grid expands to 6×6.
   - `grid.js`: `createGrid(size)` already parameterized; update stage config.
   - Combo chain x3: any chain of 3+ merges in one turn triples the last merge score.
4. Adjust renderer for 6×6 grid scaling.
5. Test all three stages thoroughly — catalyst edge cases, raid targeting, grid resize.

**Done when**: stages 4–6 playable, catalyst works, raid hazard correct, 6×6 renders properly.

---

## Phase 7 — Combo System & Visual Juice

> **Detail doc**: [`docs/phases/phase-7-detail.md`](phases/phase-7-detail.md)

**Goal**: satisfying chain detection with multipliers, screen shake, and combo counter display.

**Files to edit**: `grid.js`, `renderer.js`, `state.js`, `main.js`

**Tasks**:
1. Update `resolveMerges` to detect chains (merge → new match → another merge → …).
2. Track combo counter in `gameState.combo`; reset each turn.
3. Score multiplier: base × combo_count (2× for 2-chain, 3× for 3-chain, etc.).
4. Visual effects in `renderer.js`:
   - Combo counter popup (large number, fades out).
   - Screen shake on 3+ chains (offset canvas draw briefly).
   - Merge flash/glow on merged tile.
5. Ring charge bonus: 3+ chain grants +1 ring action charge.
6. Test: set up a board state that triggers a long chain, verify multiplier and visuals.

**Done when**: chains detected and scored correctly, visual feedback feels satisfying, combo counter visible.

---

## Phase 8 — Stages 7–10 (Pollution, Tech Tile, Endgame)

> **Detail doc**: [`docs/phases/phase-8-detail.md`](phases/phase-8-detail.md)

**Goal**: final four stages with remaining mechanics and difficulty ramp.

**Files to edit**: `stages.js`, `hazards.js`, `ring.js`, `grid.js`

**Tasks**:
1. Stage 7 (Industrial): target 25000, Pollution hazard.
   - Pollution: placed like a tile, persists for 3 turns, blocks the cell, damages adjacent each turn.
   - Track `turnsRemaining` on pollution tiles.
2. Stage 8 (Modern): target 40000, Tech tile (wildcard).
   - Tech tile merges with any adjacent tile regardless of tier match.
   - Appears in ring occasionally (configurable frequency).
3. Stage 9 (Digital): target 60000, ring shrinks to 5 slots, hazard frequency doubles.
4. Stage 10 (Singularity): target 100000, all 3 hazard types active, no free holds (hold costs a charge).
5. Balance pass: playtest each stage, adjust targets/frequencies so difficulty is hard but fair.
6. Game-over and victory screens for completing all 10 stages.

**Done when**: all 10 stages playable, pollution/tech/wildcard work, final stage is challenging but beatable.

---

## Phase 9 — Meta Upgrades & Persistence

> **Detail doc**: [`docs/phases/phase-9-detail.md`](phases/phase-9-detail.md)

**Goal**: star-based upgrade shop and localStorage save/load.

**Files to create/edit**: `upgrades.js`, update `state.js`, update `renderer.js`

**Tasks**:
1. Create `upgrades.js`:
   - 5 upgrades, each with 3 levels and star costs:
     - **Deeper Ring**: +1 ring slot per level (cost: 3/6/10 stars).
     - **Fortify**: tier-1 tiles resist 1 hazard (cost: 3/6/10).
     - **Combo Echo**: chains grant +1 charge per level (cost: 4/8/12).
     - **Foresight**: peek at +1/+2/+3 extra ring tiles (cost: 2/5/9).
     - **Salvage**: destroyed tiles return 25/50/75% score (cost: 3/7/11).
   - `purchaseUpgrade(id)`, `getUpgradeEffect(id)`.
2. Persistence (`localStorage`):
   - Save: total stars, upgrade levels, highest stage unlocked, best scores per stage.
   - Load on startup, save after each stage completion.
3. Upgrade shop screen: show upgrades, current level, star cost, total stars.
4. Apply upgrade effects to gameplay (ring size, hazard resistance, etc.).
5. Test: earn stars → buy upgrade → verify effect in next run.

**Done when**: upgrades purchasable, effects apply in gameplay, progress persists across browser refresh.

---

## Phase 10 — Mobile, Menus & Final Polish

> **Detail doc**: [`docs/phases/phase-10-detail.md`](phases/phase-10-detail.md)

**Goal**: responsive mobile support, touch controls, menus, and audio.

**Files to edit**: `index.html`, `main.js`, `renderer.js`, create `audio.js`

**Tasks**:
1. **Touch input**: tap-to-place on grid, swipe/tap ring actions, touch-friendly button sizes.
2. **Responsive canvas**: resize to fill viewport while maintaining aspect ratio; CSS media queries for layout.
3. **Menus**:
   - Title/start screen with "Play" and "Upgrades" buttons.
   - Stage select screen showing era names, stars earned, lock icons.
   - Pause overlay (tap pause icon or press Esc).
   - Game-over / stage-clear screens with star animation.
4. **Audio** (`audio.js`):
   - Web Audio API or simple `<audio>` elements.
   - Sounds: tile place, merge, chain combo, hazard strike, stage clear, game over.
   - Mute toggle.
5. **Fullscreen**: press `F` or tap button to toggle; `Esc` to exit.
6. **Final Playwright validation**: run full loop across multiple stages, verify screenshots/state/errors.
7. **progress.md** final update: mark all TODOs done, note any remaining ideas.

**Done when**: playable on mobile browser, all menus functional, audio present, fullscreen works, Playwright clean.

---

## Quick Reference: Prompt Per Phase

Use these as conversation starters for each phase:

| Phase | Starter prompt |
|-------|---------------|
| 1 | "Implement Phase 1 of Realm Weave: project scaffold, canvas, game loop, state.js with render_game_to_text and advanceTime hooks." |
| 2 | "Implement Phase 2: 5×5 grid in grid.js, tile placement via click, 2-match merge resolution, minimal rendering." |
| 3 | "Implement Phase 3: World Ring queue in ring.js, tile preview display, ring-to-grid placement flow." |
| 4 | "Implement Phase 4: renderer.js with per-tier tile visuals, grid styling, score/turn HUD, canvas background." |
| 5 | "Implement Phase 5: stages 1–3 in stages.js + hazards.js, tutorial flow, hazard tiles, Hold action, star tracking." |
| 6 | "Implement Phase 6: stages 4–6, Catalyst action, Raid hazard, 6×6 grid expansion, combo x3 bonus." |
| 7 | "Implement Phase 7: combo chain system in grid.js, score multipliers, screen shake, combo counter UI." |
| 8 | "Implement Phase 8: stages 7–10, Pollution hazard, Tech wildcard tile, endgame difficulty, balance pass." |
| 9 | "Implement Phase 9: upgrades.js with 5 upgrades, localStorage persistence, upgrade shop screen." |
| 10 | "Implement Phase 10: mobile touch, responsive canvas, menus (start/stage-select/pause/game-over), audio, fullscreen." |
