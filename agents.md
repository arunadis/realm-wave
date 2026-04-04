# Realm Weave — Agents Guide

Comprehensive codebase reference for AI agents working on Realm Weave, a 7-stage hybrid puzzle-strategy HTML5 Canvas game.

---

## Project Overview

**Name**: Realm Weave
**Type**: Browser-based puzzle-strategy game
**Tech Stack**: Vanilla HTML5 Canvas + JavaScript (ES modules), Vite dev server/bundler, localStorage persistence, Playwright test automation
**Entry Point**: `src/index.html` → loads `src/main.js` (module). Fonts: 'Cinzel', 'Macondo', 'Manrope'
**Dev Server**: `npm run dev` → `http://localhost:5173`
**Build**: `npm run build` → outputs to `dist/`
**Deploy**: GitHub Actions auto-deploys to GitHub Pages on push to `main` → `https://arunadis.github.io/realm-wave/`
**Vite Base Path**: Conditional — `/realm-wave/` when `GITHUB_ACTIONS` env var is set, `/` otherwise (see `vite.config.js`)

### Core Game Loop

1. Tile appears in the **World Ring** (circular queue)
2. Player places tile on the **grid** (5×5 or 6×6)
3. Adjacent matching tiles **merge** (2-match), upgrading tier
4. **Ring actions** (Rotate, Hold, Catalyst, Discard) provide strategic options
5. **Hazards** (Flood, Raid, Pollution, Earthquake) and blockers periodically disrupt the board
6. **Stagnation penalty**: consecutive turns without merges auto-spawn hazards (stages 2+)
7. **Tile decay**: tiles age each turn and downgrade/destroy if left too long (stages 3+)
8. **Frozen cells**: random empty cells freeze for N turns, blocking placement (stages 2+)
9. Reach target score → **stage clear** with 1–3 stars; grid full + no merges → **game over**
10. Stars are currency for **permanent meta-upgrades**

### Tile Hierarchy

| Tier | Name     | Icon | Color          |
|------|----------|------|----------------|
| 0    | Tribe    | 🔥   | Warm bronze    |
| 1    | Hut      | 🛖   | Dark goldenrod |
| 2    | Village  | 🏘️   | Sea green      |
| 3    | Town     | 🏛️   | Steel blue     |
| 4    | City     | 🏙️   | Slate blue     |
| 5    | Capital  | 👑   | Gold           |

Special tiles: **Tech** (⚙️, wildcard — merges with any adjacent tile), **Cursed** (💀, decays adjacent progress), **Walls** (🧱, blocker tiles with durability), **Hazards** (🌊 Flood, ⚔️ Raid, ☠️ Pollution, 💥 Earthquake).

---

## File Architecture

```
src/
├── index.html      — HTML shell: centered canvas, viewport meta, Google Fonts (Cinzel + Manrope), mobile CSS
├── main.js         — Canvas init, resize, game loop (rAF), input routing (click/touch/keyboard), Playwright hooks, audio manager
├── state.js        — Central gameState object, all game actions (placement, hold, catalyst, rotate, discard), mode transitions, persistence, serialization
├── grid.js         — Grid data structure, tile creation, placement, merge resolution (chain detection), wall durability break logic, game-over checks
├── ring.js         — Circular tile queue: create, pop, rotate, hold swap, tech/cursed injection, weighted tier spawning
├── stages.js       — 7 stage configs (era, gridSize, target, hazards, mechanics, star limits)
├── hazards.js      — Hazard tile creation, flood/raid/pollution/earthquake resolution, pollution tick, hazard spawning, wall spawning
├── upgrades.js     — 5 meta-upgrade definitions, purchase logic, effect lookups
├── renderer.js     — All Canvas drawing: background, HUD, ring, grid, tiles, overlays, menus, hit-testing helpers
├── audio.js        — Web Audio API SFX manager with mute persistence

.github/
└── workflows/
    └── deploy.yml  — GitHub Actions: build & deploy to GitHub Pages on push to main

vite.config.js      — Vite config: root=src, conditional base path for GitHub Pages
```

### Dependency Graph

```
main.js
  ├── state.js (core game logic)
  │     ├── grid.js (grid + tiles + merges)
  │     ├── ring.js (tile queue)
  │     ├── stages.js (stage configs)
  │     ├── hazards.js (hazard logic)
  │     ├── upgrades.js (meta upgrades)
  │     └── renderer.js (rendering delegation)
  ├── renderer.js (hit-testing helpers for click routing)
  └── audio.js (SFX)
```

**Key rule**: `state.js` imports from all other modules. `renderer.js` imports from `grid.js`, `ring.js`, `hazards.js`, `stages.js`, `upgrades.js`. `main.js` imports from `state.js`, `renderer.js`, and `audio.js`. No circular dependencies exist.

---

## Module Details

### `state.js` — Central State & Game Logic (~688 lines)

The single source of truth. All mutations go through exported functions.

**State shape** (`gameState`):
```js
{
  mode,              // 'title' | 'stageselect' | 'playing' | 'paused' | 'stageclear' | 'gameover' | 'upgradeshop' | 'guide' | 'stats'
  grid,              // 2D array of tile objects or null
  ring,              // { slots[], slotCount, rotateCharges, maxRotateCharges }
  heldTile,          // tile object or null
  score, turn, stage, stageId, stageConfig,
  combo,             // merge chain count this turn
  gridSize,          // 5 or 6
  currentTile,       // tile to be placed
  stars,             // stars earned this run
  totalStars,        // cumulative stars (persisted)
  stageStars,        // { [stageId]: bestStars }
  bestScores,        // { [stageId]: bestScore }
  highestStageUnlocked,
  upgradeLevels,     // { deeperRing, fortify, comboEcho, foresight, salvage }
  tutorialCompleted, // persisted first-run tutorial completion flag
  stats,             // { gamesPlayed, stagesCleared, totalMerges, highestChain, hazardsSurvived }
  completedChallenges, // { [stageId]: [challengeId, ...] }
  challengeCounters, // runtime per-run counters used to evaluate stage challenges
  dailyChallengeActive, dailyDateKey, dailySeed, dailyBestScore, dailyBestByDate,
  colorBlindMode, reducedMotion,
  selectedStageIndex, selectedUpgradeIndex,
  // Mechanic flags (set per stage)
  holdUnlocked, catalystUnlocked, comboX3Unlocked, techTileUnlocked, holdCostsCharge, discardUnlocked,
  discardCount,     // discards this run (0 = free, 1+ = wall spawn)
  scoreBleedActive, // true when turn > turnLimit3Star and score is draining
  lastBleedAmount,  // amount of score lost this turn due to bleed
  catalystMode, catalystFirst, catalystCharges,
  // Visual effects
  screenShake, mergeFlashes[], comboPopup,
  placementAnim,     // { row, col, timer, duration } | null
  transition,        // { from, to, timer, duration } | null
  hazardFlash,       // { row, col, kind, timer, duration } | null
  lastCursedEvent, lastWallEvent, lastWallBreakEvents, lastDecayEvent,
  frozenCells,       // array of { row, col, turnsLeft } for frozen empty cells
  hoverCell,         // { row, col } | null for desktop hover preview
  noMergeStreak,     // consecutive turns without a merge (for stagnation penalty)
  tutorialStep,      // 0 none, 1-4 active steps, -1 completed/skipped
  tutorialStepTimer, tutorialPlacementCount,
  mechanicNotification, // { mechanics[], timer, duration } | null
  hint,              // { text, timer, duration } | null
  turnsSinceHold, turnsSinceCatalyst,
  // UI state
  audioMuted, fullscreenActive, shopReturnMode, guideReturnMode, statsReturnMode,
  lastHazardEvent, lastPollutionEvent, lastMergeEvents, lastUpgradePurchase,
  frameCount
}
```

**Key exported functions**:
- `getState()` / `resetState()` — access/reset state
- `startStage(stageId, options?)` — initialize a stage run (supports seeded/daily options)
- `startDailyChallenge()` — start a seeded daily run on stage 4 (`seed = YYYYMMDD`)
- `handlePlacement(row, col)` — place tile, resolve merges/hazards/combos/cursed decay/wall events, track stagnation streak, spawn hazard on stagnation, tick tile decay, process frozen cell thaw/freeze, check win/lose
- `handleHold()` — swap current tile with held slot
- `handleRotate(direction)` — rotate ring queue (-1 or +1)
- `handleDiscard()` — discard current tile (free first time, spawns wall on 2nd+)
- `toggleCatalystMode()` / `handleCatalystSelect(row, col)` — catalyst force-merge flow
- **Score bleed**: After exceeding 3-star turn limit, score drains by `target * scoreBleedRate` each turn (stages 4–7)
- `openStageSelect()` / `goToStageSelect()` / `openTitleMenu()` — mode navigation
- `openUpgradeShop()` / `closeUpgradeShop()` / `purchaseUpgrade(id)` — shop
- `openGuide()` / `closeGuide()` — how-to-play guide
- `openStats()` / `closeStats()` — aggregate stats panel transitions
- `toggleColorBlindMode()` / `toggleReducedMotion()` / `setReducedMotion(bool)` — accessibility options
- `moveSelectedStage(delta)` / `moveSelectedUpgrade(delta)` — keyboard menu navigation
- `togglePause()` / `leavePauseToStageSelect()` — pause flow
- `skipTutorial()` — skip Stage 1 tutorial and persist completion
- `setHoverCell(row, col)` / `clearHoverCell()` — hover preview targeting
- `setAudioMuted(bool)` / `setFullscreenActive(bool)` — UI state
- `update(dt)` — tick visual effects (screen shake, merge flashes, combo popup, placement/transition/hazard animations)
- `render(ctx, canvas)` — delegates to `renderer.js`
- `renderGameToText()` — JSON serialization for Playwright (includes wall/cursed event fields)
- `pixelToCell(px, py, canvasW, canvasH)` — click-to-grid mapping
- `getGridLayout(canvasW, canvasH)` — grid geometry calculation

**Persistence**: Saves to `localStorage` under key `realmWeaveProgressV1`. Includes legacy migration from `realmWeaveStars`. Saves stars/scores/upgrades plus `stats`, `completedChallenges`, and `dailyBestByDate`.
Also persists `colorBlindMode` and `reducedMotion` preferences.

### `main.js` — Input & Game Loop (~388 lines)

**Canvas setup**: Base resolution 800×900, responsive scaling via `devicePixelRatio` and viewport fit. CSS logical size tracked separately from physical pixels.

Desktop-only hover support: `mousemove` updates `hoverCell` and `mouseleave` clears it (skipped on touch-capable devices).

**Input routing** (`routePointer(px, py)`):
1. Check top control buttons (mute/fullscreen/pause) — all modes
2. Route by `state.mode`:
   - `title` → Play / Upgrades / Stats / Daily Challenge / Guide buttons
   - `stageselect` → Stage buttons / Shop / Guide / Stats / Home
   - `stats` → Back button
   - `guide` → Back button
   - `upgradeshop` → Upgrade rows / Back
   - `paused` → Resume / Stage Select / Quit to Main Menu
   - `stageclear` → Retry / Next Stage / Stage Select actions
   - `gameover` → Retry / Stage Select actions
   - `playing` → tutorial skip hit-test, then grid cell click (catalyst mode or normal placement)

Top controls include accessibility toggles: color-blind mode and reduced-motion mode.

**Keyboard shortcuts**:
- `M` — toggle mute (all modes)
- `F` — toggle fullscreen (all modes)
- `Esc` — exit fullscreen / pause-unpause / close guide / close shop / stage-select back to title / stageclear+gameover to stage select
- `Backspace` — return from stage select to title
- `Q`/`E` — rotate ring left/right (playing)
- `H` — hold tile (playing)
- `X` — discard current tile (playing, Stage 2+)
- `C` — catalyst mode (playing)
- `U` — open upgrade shop (title/stageselect)
- `S` — open stats screen (title/stageselect)
- `D` — start daily challenge (title)
- `G` — open guide (title/stageselect)
- `↑`/`↓` — move stage selection (stageselect)
- `Enter` — start selected stage (stageselect)
- `↑`/`↓` — move selected upgrade (upgradeshop)
- `Enter` — purchase selected upgrade (upgradeshop)
- `R` — retry current stage from stageclear/gameover
- `Enter`/`Space` — play from title / close guide (`Enter` also advances to next stage on stageclear)

**Touch**: Tap = pointer routing. Horizontal swipe (≥38px, playing mode) = ring rotate. Hover preview is disabled on touch.

**Playwright hooks** (exposed on `window`):
- `render_game_to_text()` — JSON state dump
- `advanceTime(ms)` — deterministic frame stepping
- `startStage(id)` — direct stage launch

### `grid.js` — Grid & Merge Logic (~174 lines)

- `createGrid(size)` → 2D array of `null`
- `createTile(tier)` → `{ tier, name }`
- `createTechTile()` → `{ tier: -1, name: 'tech', isTech: true }`
- `createCursedTile()` → `{ tier: -1, name: 'cursed', isCursed: true }`
- `createWallTile(durability)` → `{ type: 'wall', durability, ... }`
- `placeTile(grid, row, col, tile)` → boolean
- `resolveMerges(grid)` → `{ events[], scoreGained, wallHits[], wallBroken[] }` — iterative chain detection with combo multiplier (Nth merge scores N× base), damaging adjacent walls on each merge
- `isGridFull(grid)` / `hasAnyMerge(grid)` — game-over detection
- Tech tile adjacency: matches any non-hazard/non-wall/non-cursed tile regardless of tier

**Merge algorithm**: Scans grid top-left to bottom-right. On first match found, merges, then restarts full scan. Continues until no more matches. Each merge in a chain gets increasing multiplier (`chainIndex × baseScore`).

### `ring.js` — World Ring (~71 lines)

- `createRing(slotCount, seed?, options?)` → `{ slots[], slotCount, rotateCharges: 2, maxRotateCharges: 2, rng, tierWeights }`
- `popNext(ring)` — dequeue front, push weighted random tile to back
- `rotateRing(ring, direction)` — costs 1 charge; shifts queue order
- `holdTile(heldTile, currentTile)` — swap logic (returns `{ newCurrent, newHeld }`)
- `injectTechTile(ring)` — replaces random non-front slot with tech tile
- `injectCursedTile(ring)` — replaces random non-front slot with cursed tile

Ring randomness supports seeded PRNG (`mulberry32`) for deterministic daily runs.

### `stages.js` — Stage Configuration (~200 lines)

7 stages with progressive difficulty (consolidated from original 10):

| Stage | Era          | Grid | Target  | Key Mechanic Unlocks                    |
|-------|-------------|------|---------|------------------------------------------|
| 1     | Dawn        | 5×5  | 1,000   | Tutorial + Floods (every 6 turns)        |
| 2     | Iron        | 5×5  | 4,000   | Hold + Discard, Stagnation, Frozen cells |
| 3     | Classical   | 5×5  | 8,000   | Catalyst, Raids, Cursed, Decay, Walls    |
| 4     | Renaissance | 6×6  | 15,000  | Grid expansion, Combo ×3, Score bleed (0.5%) |
| 5     | Industrial  | 6×6  | 25,000  | Pollution, Earthquake, Score bleed (0.6%) |
| 6     | Modern      | 6×6  | 40,000  | Tech wildcard tile, Score bleed (0.6%)   |
| 7     | Singularity | 6×6  | 100,000 | Ring shrinks, Hold costs charge, Score bleed (0.8%) |

Each config has: `id`, `era`, `gridSize`, `target`, `hazardFreq`, `hazardTypes[]`, `mechanics[]`, `turnLimit3Star`, `turnLimit2Star`, `description`, optional `ringSlots`, `techTileFreq`, `tierWeights[]`, `cursedTileFreq`, `wallFreq`, `wallDurability` (stage 6–7), `stagnationThreshold` (stages 2–7), `decayAfter` (stages 3–7), `frozenCellFreq`, `frozenCellCount`, `frozenCellDuration` (stages 2–7), `scoreBleedRate` (stages 4–7, default 0.005), and `challenges[]` (Phase 5 replay badges).

**Save data migration**: `CURRENT_SAVE_VERSION = 2`. Old 10-stage save data (v1) is auto-migrated to 7-stage IDs via `STAGE_MIGRATION_MAP` on first load (old 1,2→1 | 3→2 | 4,5→3 | 6→4 | 7→5 | 8→6 | 9,10→7). Best stars/scores kept from merged pairs.

Star thresholds: ≤`turnLimit3Star` turns → 3★, ≤`turnLimit2Star` → 2★, else 1★.

### `hazards.js` — Hazard System (~138 lines)

Four hazard types:
- **Flood** — spawns in empty cell, immediately destroys adjacent tiles below tier 2, then self-destructs
- **Raid** — spawns in empty cell, destroys the single highest-tier adjacent tile, then self-destructs
- **Pollution** — spawns in empty cell, persists for 3 turns, damages one random adjacent tile per turn, blocks the cell
- **Earthquake** — spawns in empty cell, destroys a cross area (center + orthogonal neighbors), then self-destructs

Key functions: `createHazardTile(kind)`, `spawnHazard(grid, kind, hazardTypes)`, `resolveHazard(grid, row, col, hazard)`, `tickPollution(grid)`, `spawnWall(grid, options)`.

### `upgrades.js` — Meta Upgrade System (~110 lines)

5 upgrades, each with 3 levels:

| ID          | Name        | Effect per Level       | Costs (★)  |
|-------------|-------------|------------------------|------------|
| deeperRing  | Deeper Ring | +1/+2/+3 ring slots   | 3 / 6 / 10 |
| fortify     | Fortify     | Tier-1 resist charges  | 3 / 6 / 10 |
| comboEcho   | Combo Echo  | +1/+2/+3 chain charges | 4 / 8 / 12 |
| foresight   | Foresight   | +1/+2/+3 preview tiles | 2 / 5 / 9  |
| salvage     | Salvage     | 25/50/75% score refund | 3 / 7 / 11 |

Key functions: `purchaseUpgrade(progress, id)`, `getUpgradeEffect(id, upgradeLevels)`, `getUpgradeCost(id, currentLevel)`, `getLevelDescription(id, level)`.

### `renderer.js` — All Drawing & Hit Testing (~1602 lines)

The largest file. Handles all Canvas 2D rendering and UI interaction geometry.

**Layout constants**: `HUD_HEIGHT = 70`, `RING_AREA_HEIGHT = 90`, `GRID_PADDING = 20`, `CELL_GAP = 4`.

**Responsive layout metrics**: `getLayoutMetrics(w, h)` adds compact-mode scaling for mobile/small canvases (reduced HUD/ring/padding/top-control sizes). `getRingLayout(w, h, state)` centralizes ring/slot sizing so draw + hit-tests stay aligned.

**Main render entry**: `renderFrame(ctx, w, h, state, getGridLayout)` — dispatches to mode-specific draw functions.

**Drawing functions**:
- `drawBackground()` — menu default + era-themed gameplay gradients/halos + texture + floating particles
- `drawTitleScreen()` — title, Play/Upgrades/Stats/Daily/Guide buttons
- `drawStageSelect()` — stage list with stars/locks/scores/challenge badges, shop/guide/stats buttons
- `drawGuideScreen()` — how-to-play overlay with sections
- `drawStatsScreen()` — aggregate profile counters panel
- `drawUpgradeShop()` — upgrade rows with level/cost/buy UI
- `drawPauseOverlay()` — Resume / Stage Select / Quit to Main Menu buttons
- `drawHUD()` — score, turn/combo/controls info, target progress bar, hazard countdown, star-threshold pace indicator, **score bleed indicator (pulsing red)**
- `drawRingArea()` — hold slot, current tile, discard button, next queue, rotate charges, catalyst charge dots
- `drawGrid()` — cell backgrounds + tiles + ghost preview at hover target + low-empty-cell pulse warning
- `drawTile()` — per-tier gradient, icon, name, fortify badge
- `drawTechTile()` / `drawHazardTile()` / `drawCursedTile()` / `drawWallTile()` — special tile rendering
- `drawMergeFlashes()` — glow + sparks + floating `+score` text on every merge
- `drawComboPopup()` — scaled chain counter overlay
- `drawCatalystOverlay()` — purple tint + first selection highlight (second target hover glow handled in grid draw)
- `drawPlacementAnimatedTile()` — quick scale/fade placement pop-in
- `drawHazardFlash()` — hazard spawn shockwave ring by hazard kind
- `drawTransitionOverlay()` — short fade transition between modes
- `drawMechanicNotification()` — temporary top banner when new stage mechanics unlock
- `drawHint()` — contextual bottom hint pill with fade
- `drawTutorialOverlay()` — spotlight tutorial mask + instructional panel + skip button
- `drawStageClear()` / `drawGameOver()` — end-state overlays with animated stars + challenge/daily summary labels
- `drawTopControls()` — mute/fullscreen/color-blind/reduced-motion/pause buttons (top-right)

**Hit-testing exports** (used by `main.js` for click routing):
- `getTitleActionAt(px, py, w, h)` → `{ type: 'play'|'upgrades'|'stats'|'daily'|'guide' }`
- `getStageButtonAt(px, py, w, h, stages)` → `{ type: 'stage', stageId }` or `{ type: 'shop'|'guide'|'stats'|'home' }`
- `getUpgradeShopActionAt(px, py, w, h, state)` → `{ type: 'upgrade', id }` or `{ type: 'back' }`
- `getGuideActionAt(px, py, w, h)` → `{ type: 'back' }`
- `getStatsActionAt(px, py, w, h)` → `{ type: 'back' }`
- `getTopControlActionAt(px, py, w, h, state)` → `{ type: 'mute'|'fullscreen'|'colorBlind'|'reducedMotion'|'pause' }`
- `getPauseOverlayActionAt(px, py, w, h)` → `{ type: 'resume'|'stageSelect' }`
- `getTutorialActionAt(px, py, w, h, state)` → `{ type: 'skipTutorial' }`
- `getStageClearActionAt(px, py, w, h, state)` → `{ type: 'retry'|'next'|'stageselect' }`
- `getGameOverActionAt(px, py, w, h)` → `{ type: 'retry'|'stageselect' }`

**Utility helpers**: `roundRect()`, `lightenHex()`, `darkenHex()`, `hexToRgb()`, `rgbToHex()`, `drawAnimatedStars()`.

### `audio.js` — SFX Manager (~111 lines)

Factory function `createAudioManager()` returns `{ unlock, play, isMuted, setMuted, toggleMute }`.

Synthesized tones via Web Audio API oscillators (no audio files):
- `place` — single triangle tone
- `merge` — rising two-tone triangle
- `combo` — three ascending square tones
- `hazard` — low sawtooth
- `earthquake` — layered rumble
- `cursed` — descending decay pulse
- `wallHit` — short impact tick
- `wallBreak` — double crack impact
- `stageClear` — ascending triangle triad
- `gameOver` — descending sawtooth triad
- `upgrade` — two rising triangle tones
- `stagnation` — low warning rumble (two descending sawtooth tones)
- `decay` — crumbling cascade (three descending triangle tones)
- `freeze` — crystalline chime (three ascending sine tones)
- `ui` (default) — short triangle blip

Mute persisted in `localStorage` under `realmWeaveMuted`.

### `index.html` — HTML Shell (~58 lines)

Minimal HTML: centered `<canvas id="gameCanvas">`, Google Fonts (Cinzel serif for titles, Manrope sans-serif for UI), dark gradient background CSS, responsive mobile styles (no border-radius on small screens), `touch-action: none`.

### Mobile Responsiveness Notes

- `main.js#resizeCanvas()` uses `visualViewport` when available and, on touch mobile viewports, sizes canvas to full viewport width/height instead of preserving desktop aspect ratio.
- Gameplay and menu/overlay layouts use compact metrics on narrow/short screens to prevent overlap.
- Compact mode reduces HUD/ring height, ring slot size, top control size, and selected typography/button dimensions.
- Compact mode also reduces edge margins/padding for stats/guide/shop/stage-select/pause/stage-clear/game-over panels so screens fit cleanly on phones.
- `state.js#getGridLayout()` now imports and uses `renderer.js#getLayoutMetrics()` so click/touch hitboxes match rendered compact geometry.

---

## Game Mode Flow

```
title
  ├── Play → stageselect
  ├── Upgrades → upgradeshop (shopReturnMode='title')
  └── Guide → guide (guideReturnMode='title')

stageselect
  ├── Stage N → playing (if unlocked)
  ├── Upgrades → upgradeshop (shopReturnMode='stageselect')
  ├── Guide → guide (guideReturnMode='stageselect')
  └── Home/Esc/Backspace → title

playing
  ├── Esc → paused
  ├── Score ≥ target → stageclear
  └── Grid full + no merges → gameover

paused
  ├── Resume → playing
  └── Stage Select → stageselect

stageclear
  ├── Retry / [R] → restart same stage
  ├── Next Stage / [Enter] → start next stage (1–9)
  └── Stage Select / [Esc] → stageselect

gameover
  ├── Retry / [R] → restart same stage
  └── Stage Select / [Esc] → stageselect
upgradeshop → Back → (shopReturnMode)
guide → Back → (guideReturnMode)
```

---

## Phase 7 — Tighter Resources (Difficulty Overhaul)

**Resource tightening** (stages 5–10):
- Base rotate charges reduced from 3 → 2 (`ring.js`)
- Chain-bonus threshold raised from 3+ → 4+ merges for free rotate charge (`state.js`)
- Catalyst charges reduced from 2 → 1 when catalyst unlocked (`state.js`)
- Combo Echo upgrade threshold raised from 2+ → 3+ chain merges (`state.js`)
- Stage configs tightened: increased hazard frequency, decreased cursed tile frequency, tighter turn limits, wall durability 4 in stages 6–7 (`stages.js`)
- Catalyst display max updated to 1 charge (`renderer.js`)

**Impact**: Players must be more deliberate with rotate/catalyst usage and plan longer chains to earn back charges.

---

## Scoring System

- **Base merge score**: `(toTier + 1) × 100`
- **Chain multiplier**: Nth merge in a chain scores `N × baseScore`
- **Combo ×3 bonus** (stages 6+): 3+ chain merges → last merge tripled
- **Combo Echo upgrade**: 3+ chain → extra rotate charges
- **Ring charge bonus**: 4+ chain → +1 rotate charge
- **Salvage upgrade**: destroyed tiles refund a % of their base value
- **Star thresholds**: based on turn count vs stage limits

---

## Persistence Schema

**Key**: `realmWeaveProgressV1` in `localStorage`

```json
{
  "totalStars": 12,
  "stageStars": { "1": 3, "2": 2 },
  "bestScores": { "1": 1500, "2": 3200 },
  "highestStageUnlocked": 3,
  "stats": {
    "gamesPlayed": 8,
    "stagesCleared": 5,
    "totalMerges": 91,
    "highestChain": 4,
    "hazardsSurvived": 11
  },
  "completedChallenges": {
    "1": ["speed_runner"],
    "2": ["floodproof"]
  },
  "dailyBestByDate": {
    "20260403": 18740
  },
  "colorBlindMode": false,
  "reducedMotion": false,
  "upgradeLevels": {
    "deeperRing": 1,
    "fortify": 0,
    "comboEcho": 0,
    "foresight": 0,
    "salvage": 0
  }
}
```

**Audio mute**: `realmWeaveMuted` (`'1'` or `'0'`)

Legacy migration: reads old `realmWeaveStars` key if `V1` key is missing.

---

## Testing & Validation

### Playwright Hooks

Three global hooks exposed on `window`:
1. **`render_game_to_text()`** — returns JSON string with full game state snapshot
2. **`advanceTime(ms)`** — deterministic frame stepping (ms → 60fps steps)
3. **`startStage(id)`** — directly launch a stage for testing

### Test Client

```bash
node develop-web-game/scripts/web_game_playwright_client.js \
  --url http://localhost:5173 \
  --actions-file develop-web-game/references/action_payloads.json \
  --iterations 3 --pause-ms 250
```

Artifacts saved under `output/` (screenshots as `shot-N.png`, state as `state-N.json`).

### Build Verification

```bash
npm run build    # Vite production build → dist/
npm run dev      # Vite dev server on port 5173
```

### CI/CD — GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`:
1. Checks out code
2. Installs deps (`npm ci`)
3. Builds (`npm run build`) — `GITHUB_ACTIONS` env var sets Vite `base` to `/realm-wave/`
4. Configures Pages metadata (`actions/configure-pages`)
5. Uploads `dist/` artifact and deploys to GitHub Pages

Requires GitHub repo **Settings → Pages → Source** set to **GitHub Actions**.

---

## Workflows

### `/add-realm-weave-feature` (`.windsurf/workflows/add-realm-weave-feature.md`)

For adding new features: define scope → map touchpoints → implement vertically (state → input → render) → update `renderGameToText` → build → Playwright validate → review artifacts → update docs.

### `/develop-web-game` (`.windsurf/workflows/develop-web-game.md`)

General iterative game dev loop: implement small → ensure hooks → Playwright test → review artifacts → iterate → update `progress.md`.

---

## Common Modification Patterns

### Adding a New Mechanic

1. **`stages.js`** — Add mechanic string to relevant stage `mechanics[]` arrays
2. **`state.js`** — Add state field + flag, set in `startStage()`, implement action function, add to `renderGameToText()`
3. **`main.js`** — Wire keyboard shortcut and/or click routing
4. **`renderer.js`** — Add UI rendering and hit-testing export

### Adding a New Hazard Type

1. **`hazards.js`** — Handle new kind in `createHazardTile()`, `resolveHazard()`, and optionally `tickPollution()`-style tick
2. **`stages.js`** — Add to relevant stage `hazardTypes[]` arrays
3. **`renderer.js`** — Add visual in `drawHazardTile()`

### Adding a New Upgrade

1. **`upgrades.js`** — Add entry to `UPGRADE_DEFS` array with `id`, `name`, `description`, `costs[]`, `effects[]`
2. **`state.js`** — Apply effect in relevant gameplay function (e.g., `handlePlacement`, `startStage`)
3. **`renderer.js`** — Upgrade shop auto-renders from `UPGRADE_DEFS` (no changes needed unless custom visuals)

### Adding a New UI Screen/Overlay

1. **`state.js`** — Add mode string, open/close functions, wire return mode
2. **`main.js`** — Add input routing branch for new mode
3. **`renderer.js`** — Add draw function, layout function, hit-test export, integrate into `renderFrame()`

---

## Key Design Decisions

- **No framework** — Pure vanilla JS + Canvas 2D for zero-dependency portability
- **Single mutable state object** — All game state in one `gameState` object, mutated via exported functions (no Redux/store pattern)
- **Rendering separated from logic** — `state.js` owns logic, `renderer.js` owns drawing. Connected via `renderFrame()` delegation
- **Hit-testing via geometry** — No DOM buttons; all UI is canvas-drawn with manual `inRect()` checks
- **Synthesized audio** — Web Audio oscillator tones, no external audio files to load
- **Deterministic test hooks** — `advanceTime` and `render_game_to_text` enable reliable Playwright automation
- **Progressive mechanic unlocking** — Each stage introduces mechanics incrementally via `mechanics[]` config

---

## Documentation Structure

```
docs/
├── realm-weave-plan.md          — Master design doc + 10-phase implementation plan
└── phases/
    ├── phase-1-detail.md        — Scaffold & game loop
    ├── phase-2-detail.md        — Grid core
    ├── phase-3-detail.md        — World Ring
    ├── phase-4-detail.md        — Renderer polish
    ├── phase-5-detail.md        — Stages 1–3
    ├── phase-6-detail.md        — Stages 4–6
    ├── phase-7-detail.md        — Combo system
    ├── phase-8-detail.md        — Stages 7–10
    ├── phase-9-detail.md        — Meta upgrades
    └── phase-10-detail.md       — Mobile, menus, polish

progress.md                       — Running log of completed work and remaining ideas
```

Each phase detail doc contains: planned design, actual implementation, deviations, and handoff notes.

---

## Quick Reference: Important Constants

| Constant              | Location       | Value       |
|-----------------------|---------------|-------------|
| `BASE_WIDTH`          | `main.js`     | 800         |
| `BASE_HEIGHT`         | `main.js`     | 900         |
| `HUD_HEIGHT`          | `renderer.js` | 70 base (50 compact) |
| `RING_AREA_HEIGHT`    | `renderer.js` | 90 base (68 compact) |
| `GRID_PADDING`        | `renderer.js` | 20 base (12 compact) |
| `CELL_GAP`            | `renderer.js` | 4           |
| `RING_SLOT_COUNT`     | `state.js`    | 6 (default) |
| `MAX_TIER`            | `grid.js`     | 5 (capital) |
| `MAX_UPGRADE_LEVEL`   | `upgrades.js` | 3           |
| `SAVE_KEY`            | `state.js`    | `realmWeaveProgressV1` |
| `SWIPE_MIN_DIST`      | `main.js`     | 38px        |

---

## Status

Core game phases are complete. UX/improvement phases currently include:
- 10 stages with progressive difficulty
- 6 tile tiers + tech wildcard
- 3 hazard types (flood, raid, pollution)
- 3 ring actions (rotate, hold, catalyst)
- 5 permanent meta-upgrades
- Full menu system (title, stage select, pause, guide, upgrade shop, stats)
- Responsive mobile support with touch controls
- Web Audio SFX with mute toggle
- Fullscreen support
- localStorage persistence with legacy migration + stats/challenges/daily best tracking
- Playwright automation hooks
