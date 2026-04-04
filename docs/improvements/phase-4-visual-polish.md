# Phase 4 — Visual Polish & Juice

**Priority**: 🟡 Medium | **Effort**: Medium | **Status**: ✅ Done

Add animations and visual variety to make the game feel alive and rewarding.

---

## 4.1 Tile Placement Animation

**Problem**: Tiles appear instantly on the grid, making placement feel flat.

**Design**: A quick scale-up + fade-in animation (~150ms) when a tile is placed.

**Implementation**:
- **`state.js`**: Add `placementAnim: null` to state. In `handlePlacement()`, after successful placement, set:
  ```js
  placementAnim = { row, col, timer: 0.15, duration: 0.15 }
  ```
  Tick down in `update(dt)`.
- **`renderer.js`**: In `drawGrid()`, if `placementAnim` matches `(r, c)` and timer > 0:
  - Compute `progress = 1 - (timer / duration)` (0 → 1)
  - Apply `ctx.scale(0.5 + 0.5 * easeOut(progress))` centered on the cell
  - Apply `ctx.globalAlpha = easeOut(progress)`
  - Use `easeOut(t) = 1 - (1 - t) * (1 - t)` for smooth deceleration

---

## 4.2 Screen Transition Animations

**Problem**: Mode transitions (title → stage select → playing → stage clear) are instant cuts, feeling jarring.

**Design**: A quick fade transition (~200ms) between modes.

**Implementation**:
- **`state.js`**: Add `transition: null` to state. Wrap mode-change functions:
  ```js
  transition = { from: oldMode, to: newMode, timer: 0.2, duration: 0.2 }
  ```
  The actual `mode` changes immediately, but `transition` drives a visual overlay.
  Tick down in `update(dt)`.
- **`renderer.js`**: In `renderFrame()`, after drawing the current mode, if `transition` is active:
  - Draw a black rect with `globalAlpha = 1 - (timer / duration)` (fade in from black)
  - First half: fade to black; second half: fade from black to new mode
- **Simpler alternative**: Just a 150ms fade-from-black overlay after any mode change. Less complex, still effective.

---

## 4.3 Era-Themed Backgrounds

**Problem**: All 10 stages share the same blue gradient background. The era names (Dawn, Bronze, Iron, etc.) have no visual identity.

**Design**: Modify `drawBackground()` to accept the current `stageId` and apply era-specific color tints and particle effects.

**Implementation**:
- **`renderer.js`**: Create an `ERA_THEMES` config array:
  ```js
  const ERA_THEMES = [
    null, // index 0 unused
    { grad: ['#1a0f07', '#2a1810', '#1a1520'], halo: 'rgba(255, 140, 50, 0.2)' },  // Dawn — warm sunrise
    { grad: ['#0f1a07', '#1a2a10', '#0f1520'], halo: 'rgba(180, 160, 80, 0.2)' },  // Bronze — earthy
    { grad: ['#0a0a1a', '#15152a', '#0a1020'], halo: 'rgba(120, 140, 180, 0.2)' },  // Iron — steel grey-blue
    { grad: ['#0f0a1a', '#1a1530', '#0f0a20'], halo: 'rgba(160, 130, 200, 0.2)' },  // Classical — marble purple
    { grad: ['#1a0a0a', '#2a1515', '#1a0a15'], halo: 'rgba(180, 80, 80, 0.2)' },    // Medieval — deep red
    { grad: ['#0a1a15', '#152a20', '#0a1a1a'], halo: 'rgba(80, 200, 160, 0.2)' },   // Renaissance — teal
    { grad: ['#0f0f0a', '#1a1a10', '#15150a'], halo: 'rgba(180, 160, 60, 0.15)' },  // Industrial — smog amber
    { grad: ['#07111f', '#122338', '#0a1729'], halo: 'rgba(89, 153, 214, 0.2)' },    // Modern — current default
    { grad: ['#050a15', '#0a1528', '#05101a'], halo: 'rgba(0, 200, 255, 0.2)' },     // Digital — cyan
    { grad: ['#0a0520', '#150a30', '#0a0525'], halo: 'rgba(200, 100, 255, 0.25)' },  // Singularity — violet
  ];
  ```
- In `drawBackground()`, look up `state.stageId` in `ERA_THEMES` and use theme gradients/halos if in `playing`/`paused` mode. Fall back to default for menus.
- **Bonus**: Add era-specific floating particles (embers for Bronze, snowflakes for Iron, gears for Industrial, binary digits for Digital).

---

## 4.4 Grid-Full Warning Effect

**Problem**: When only 1–3 cells remain, there's no visual urgency. The player may not realize they're about to lose.

**Implementation**:
- **`renderer.js`**: In `drawGrid()`, count empty cells. If ≤ 3:
  - Add a pulsing red-tinted border around the grid panel (oscillate alpha using `Math.sin(frameCount * 0.1)`)
  - Optional: tint remaining empty cells with a subtle green glow to make them easy to spot
- **`state.js`**: No state changes needed — purely visual, computed from `grid`.

---

## 4.5 Hazard Spawn Animation

**Problem**: Hazard tiles appear instantly, and their destruction of adjacent tiles happens without ceremony.

**Implementation**:
- **`state.js`**: Add `hazardFlash: null` when a hazard spawns:
  ```js
  hazardFlash = { row, col, kind, timer: 0.4, duration: 0.4 }
  ```
- **`renderer.js`**: Draw a brief expanding shockwave ring from the hazard cell:
  - Flood: blue ring
  - Raid: purple ring
  - Pollution: green ring
- Tick down in `update(dt)`.

---

## Verification Checklist

- [x] Tile placement has smooth scale-up animation
- [x] Mode transitions have fade effect
- [x] Each era has distinct background colors/tints during gameplay
- [x] Grid pulses red when ≤ 3 empty cells
- [x] Hazard spawns have shockwave animation
- [x] All animations tick correctly in `update(dt)` and expire cleanly
- [x] No visual regressions on title/stage select screens
- [x] Performance: animations don't cause frame drops (keep particle count low)
- [x] Build passes
- [x] `agents.md` updated
