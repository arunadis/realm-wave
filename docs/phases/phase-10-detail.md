# Phase 10 — Mobile, Menus & Final Polish

## Scope
Implement Phase 10 from `docs/realm-weave-plan.md`:
- Touch input and mobile-friendly interaction
- Responsive canvas behavior
- Title + pause/menu polish
- Audio + mute toggle
- Fullscreen support
- Final Playwright validation and progress update

## Implementation Plan
1. Add a lightweight `audio.js` manager with Web Audio SFX and mute persistence.
2. Extend state for final-menu polish flags/actions:
   - `title` mode default
   - `togglePause`, `leavePauseToStageSelect`
   - `audioMuted` and `fullscreenActive` state flags
   - upgrade shop return mode for title/stage select
3. Expand renderer for final UX:
   - title screen with `Play` and `Upgrades`
   - top-right controls (mute/fullscreen/pause)
   - pause overlay actions
   - star animation on stage-clear/game-over overlays
   - compact stage-select layout support for shorter mobile heights
4. Update `main.js` interaction routing:
   - touch start/end handlers
   - swipe-to-rotate in playing mode
   - tap routing for title/stage/shop/pause
   - fullscreen (`F` + top button + Esc exit)
   - mute (`M` + top button)
   - audio event triggers for place/merge/combo/hazard/clear/game over
5. Update `index.html` CSS for mobile canvas ergonomics.
6. Run build + Playwright runtime checks and save outputs.

## What Was Built

### 1) Audio (`src/audio.js`)
- Added `createAudioManager()` with:
  - named SFX: `place`, `merge`, `combo`, `hazard`, `stageClear`, `gameOver`, `upgrade`, `ui`
  - `unlock()` for browser gesture-gated audio contexts
  - `toggleMute()` / `isMuted()` with `localStorage` persistence via `realmWeaveMuted`

### 2) State and mode flow (`src/state.js`)
- Initial mode is now `title`.
- Added state fields:
  - `shopReturnMode`, `audioMuted`, `fullscreenActive`
- Added actions:
  - `openTitleMenu()`, `openStageSelect()`
  - `togglePause()`, `leavePauseToStageSelect()`
  - `setAudioMuted()`, `setFullscreenActive()`
- Upgrade shop now opens from both `title` and `stageselect`, and closes back to the origin mode.
- `renderGameToText()` now includes `audioMuted` and `fullscreenActive`.

### 3) Renderer and menus (`src/renderer.js`)
- Added top controls rendering + hit-testing:
  - mute, fullscreen, pause buttons
- Added title screen with `Play` and `Upgrades` button layout/hit-testing.
- Added pause overlay with `Resume [Esc]` and `Stage Select` buttons.
- Added animated star rendering helper and integrated it into:
  - stage clear overlay
  - victory overlay
  - game-over overlay
- Stage select layout now adapts for compact heights (`h < 820`), with adjusted button size/gap/text positioning.
- Top controls are now visible in title, stage select, gameplay HUD, and upgrade shop.

### 4) Main input/runtime integration (`src/main.js`)
- Added pointer router for all modes (`title`, `stageselect`, `upgradeshop`, `paused`, `playing`, `stageclear/gameover`).
- Added touch controls:
  - tap routes through normal pointer flow
  - horizontal swipe in `playing` rotates ring
- Added keyboard controls:
  - `F` fullscreen toggle
  - `Esc` exits fullscreen; toggles pause in play/pause modes
  - `M` mute toggle
  - `Enter/Space` from title to stage select
- Added audio triggers for gameplay outcomes and UI actions.

### 5) Responsive canvas/CSS (`src/index.html`)
- Added mobile-oriented canvas styling:
  - `max-width` / `max-height`
  - `touch-action: none`
  - adaptive border/shadow via media query
- Canvas resizing in `main.js` now preserves base aspect ratio (`800x900`) while fitting viewport.

## Verification

### Build
- `npm run build` passes.

### Playwright Runtime Validation
- Mobile viewport check (`390x844`, touch enabled) with saved screenshots and state dumps under `output/web-game`:
  - `phase10-title-mobile.png`
  - `phase10-stageselect-mobile.png`
  - `phase10-stage1-mobile.png`
  - `phase10-paused-mobile.png`
  - `phase10-stage10-mobile.png`
  - `phase10-state-title.json`
  - `phase10-state-stageselect.json`
  - `phase10-state-stage1.json`
  - `phase10-state-paused.json`
  - `phase10-state-stage10.json`
- Validation summary:
  - title mode starts correctly
  - stage select opens from title
  - pause mode toggles correctly
  - stage 10 starts with expected flags (including `holdCostsCharge: true`)
  - console errors: none

## Notes / Remaining Ideas
- Audio is intentionally lightweight synthesis (no external assets) to keep bundle small.
- Future polish idea: add richer touch gestures for hold/catalyst shortcuts and optional haptic feedback on supported devices.
