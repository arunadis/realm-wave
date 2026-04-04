# Realm Weave — Progress

Original prompt: Implement Phase 1 of Realm Weave (project scaffold, canvas, game loop, state.js with render_game_to_text and advanceTime hooks).

## Phase 1 — Project Scaffold & Game Loop

### Completed
- Created `src/index.html` — centered canvas, viewport meta, mobile-ready
- Created `src/state.js` — `gameState` object, `renderGameToText()`, `update(dt)`, `render(ctx)`
- Created `src/main.js` — canvas init, resize handler, `requestAnimationFrame` loop, Playwright hooks
- Created `package.json` + `vite.config.js` — Vite dev server on port 5173
- Created `docs/phases/phase-1-detail.md` — detailed phase plan

### Phase 2 — Completed
- Created `src/grid.js` — createGrid, placeTile, resolveMerges, isGridFull, hasAnyMerge, tier hierarchy + colors
- Updated `src/state.js` — 5×5 grid init, currentTile, handlePlacement with merge resolution, grid rendering, HUD, game-over overlay
- Updated `src/main.js` — click handler with pixel-to-cell mapping, click-to-restart on game over
- Merges verified: Tribe+Tribe → Hut (score +200), chain merges work
- Playwright: 3 iterations, multi-click actions, 0 errors

### Phase 3 — Completed
- Created `src/ring.js` — createRing, popNext, rotateRing, holdTile, getRingTiles
- Updated `src/state.js` — ring with 6 slots drives tile flow, HOLD/CURRENT/NEXT UI, rotate charges
- Updated `src/main.js` — Q/E keyboard handler for ring rotation
- Tiles flow ring→grid correctly, merges chain through ring, 0 errors

### Phase 4 — Completed
- Created `src/renderer.js` — all drawing extracted from state.js: background, HUD, ring, grid, tiles, game over
- Per-tier emoji icons: 🔥 Tribe, 🛖 Hut, 🏘️ Village, 🏛️ Town, 🏙️ City, 👑 Capital
- Rounded corners on cells/tiles, grid panel background, diagonal texture overlay
- HUD: serif font, era name ("Dawn Era"), comma-formatted scores, combo counter
- `state.js` reduced to pure state logic (~142 lines)
- Playwright: 3 iterations, 0 errors

### Phase 5 — Completed
- Created `src/stages.js` — 3 stage configs (Dawn/Bronze/Iron) with targets, hazard freq, mechanics, star limits
- Created `src/hazards.js` — flood hazard: spawns in random cell, destroys adjacent low-tier tiles, resolves immediately
- Updated `src/state.js` — stage flow (stageselect→playing→stageclear/gameover), startStage, handleHold, hazard spawning, star tracking + localStorage
- Updated `src/main.js` — H key for hold, stage select click routing, stageclear/gameover→stageselect
- Updated `src/renderer.js` — stage select screen, stage clear overlay with stars, hazard tile (🌊), target progress bar, hold slot (🔒/H/tile)
- Stage 1 cleared with ★★★, stars persist on stage select screen
- Playwright: multiple test runs, all flows verified, 0 errors

### TODOs for Phase 6
- Completed in later phases (historical section retained for continuity).

---

## Phase 9 — Completed (Meta Upgrades & Persistence)

### Completed
- Added `src/upgrades.js` with 5 upgrades, level/cost/effect tables, normalization, and purchase helper.
- Reworked persistence in `src/state.js` to save/load profile data under `realmWeaveProgressV1`:
  - `totalStars`, `upgradeLevels`, `highestStageUnlocked`, `stageStars`, `bestScores`
  - Legacy migration from `realmWeaveStars`
- Added stage lock progression and stage-clear persistence updates.
- Added upgrade shop mode/actions in state (`openUpgradeShop`, `closeUpgradeShop`, `purchaseUpgrade`).
- Applied gameplay upgrade effects:
  - `Deeper Ring` increases stage ring slots
  - `Fortify` gives tier-1 tile hazard-resist charges
  - `Combo Echo` grants extra rotate charges on chain merges
  - `Foresight` increases visible NEXT ring tiles
  - `Salvage` refunds score on hazard destruction
- Updated `src/renderer.js`:
  - Stage select lock visuals + total stars + `Upgrades [U]` button
  - Full upgrade shop screen + click hit testing
  - Foresight ring preview + fortify charge badge
- Updated `src/main.js` click/keyboard flow for shop navigation and purchases.
- Added `docs/phases/phase-9-detail.md` with planned design, implementation, verification, and handoff notes.

### Verification
- `npm run build` passes.
- Playwright screenshot/state check confirms:
  - Stage select shows star/shop/lock UI
  - Upgrade shop opens and renders correctly (`mode: "upgradeshop"` in state dump)

## Stage 10 — Implementation Confirmed

### Completed
- Confirmed Stage 10 config in `src/stages.js` is active with:
  - target `100000`
  - hazards `flood + raid + pollution`
  - ring slots `5`
  - tech tile frequency `10`
  - `holdCostsCharge` enabled
- Added explicit Stage 10 visibility in state text output (`renderGameToText`) for automation:
  - `holdCostsCharge`, `catalystUnlocked`, `comboX3Unlocked`, `techTileUnlocked`
- Added Stage 10 UX indicator in `src/renderer.js`:
  - HUD now shows `Hold [H]: -1 charge` when hold costs are active
  - Hold slot label now shows `HOLD [H]-1` in Stage 10

### Verification
- `npm run build` passes after changes.
- Playwright runtime probe confirms Stage 10 starts with expected flags:
  - `stageId: 10`, `gridSize: 6`, `ring.length: 5`
  - `holdCostsCharge: true`, `catalystUnlocked: true`, `comboX3Unlocked: true`, `techTileUnlocked: true`

## Phase 10 — Completed (Mobile, Menus & Final Polish)

### Completed
- Added responsive/mobile polish:
  - Aspect-ratio-preserving canvas resize to fit viewport
  - Mobile canvas CSS (`touch-action: none`, adaptive frame styling)
- Added full menu flow:
  - Title screen (`Play`, `Upgrades`)
  - Pause overlay (`Resume`, `Stage Select`) with `Esc` support
  - Existing stage select and overlays preserved and integrated
- Added top control buttons (tap/click): mute, fullscreen, pause.
- Added fullscreen controls:
  - Keyboard: `F` toggle, `Esc` exits fullscreen
  - UI button toggle
- Added touch support improvements:
  - Tap routing for all menu/game states
  - Horizontal swipe-to-rotate while playing
- Added `src/audio.js` Web Audio manager with SFX and mute persistence.
- Added star animation for stage-clear and game-over overlays.
- Added Phase 10 implementation notes in `docs/phases/phase-10-detail.md`.

### Verification
- `npm run build` passes.
- Playwright mobile validation (390×844, touch enabled) passes with no console errors:
  - Modes verified: `title` → `stageselect` → `playing` → `paused`
  - Stage 10 verified: `stageId: 10`, `gridSize: 6`, `holdCostsCharge: true`
  - Captured screenshots/state dumps in `output/web-game` (`phase10-*`).

### Remaining ideas
- Optional future polish: richer touch gestures for hold/catalyst shortcuts and optional haptic feedback.
