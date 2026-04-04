# Phase 3 — World Ring (Circular Queue + Preview) (Detail)

## Goal
Tiles come from a visible circular ring queue instead of random generation. Ring shows next 6 tiles, current tile = front of ring. Held tile slot displayed as placeholder.

## Files
| File | Action | Purpose |
|------|--------|---------|
| `src/ring.js` | Create | Ring data structure, popNext, rotateRing, holdTile |
| `src/state.js` | Update | Integrate ring into gameState, replace generateRandomTile, draw ring + hold UI |
| `src/main.js` | Update | Add keyboard handler for ring rotate (Q/E keys) |

## Data Structures

### Ring
```js
{
  slots: [Tile, Tile, ...],  // circular queue, index 0 = front (current)
  slotCount: 6,
  rotateCharges: 3,          // per-stage allowance
  maxRotateCharges: 3,
}
```

### Hold Slot
```js
gameState.heldTile: null | Tile  // stashed tile (Phase 5 activates swap)
```

## Function Signatures

### ring.js
- `createRing(slotCount)` → ring object with `slotCount` random tiles
- `peekNext(ring)` → returns front tile without removing
- `popNext(ring)` → removes front tile, pushes new random tile to back, returns popped tile
- `rotateRing(ring, direction)` → shifts queue: +1 = clockwise (front goes to back), -1 = counter-clockwise (back comes to front); returns success boolean (costs 1 charge)
- `holdTile(ring, currentTile)` → swaps currentTile with heldTile; returns { newCurrent, newHeld }
- `getRingTiles(ring)` → returns array copy of current slots for rendering

### state.js changes
- `createInitialState()` — init ring with `createRing(6)`, add `heldTile: null`
- `handlePlacement()` — after placing, `currentTile = popNext(ring)` instead of `generateRandomTile()`
- `handleRotate(direction)` — new export, calls `rotateRing`, updates `currentTile`
- `renderGameToText()` — include ring slots and heldTile
- `render()` — draw ring as horizontal row above grid, draw hold slot to the left

### main.js changes
- Add `keydown` listener: Q = rotate left, E = rotate right

## Ring UI Layout
- Ring row: 6 tile slots drawn horizontally, centered above grid
- First slot (current) highlighted with bright border
- Hold slot: drawn to the left of ring, labeled "Hold", dimmed until Phase 5
- Rotate charges displayed as small dots below ring

## Acceptance Criteria
1. Ring shows 6 upcoming tiles above the grid
2. Current tile = ring front, highlighted
3. Placing tile on grid pops from ring, new tile appears at back
4. Q/E keys rotate ring (costs charges)
5. Hold slot visible but inactive (placeholder)
6. `render_game_to_text` includes ring and heldTile
7. Playwright captures ring in screenshot

---

## Post-Implementation Notes

### What was built
- `src/ring.js` — `createRing(slotCount)`, `peekNext`, `popNext`, `rotateRing(ring, direction)`, `holdTile(held, current)`, `getRingTiles`
- `src/state.js` — fully rewritten: ring initialized with 6 slots, `currentTile` popped from ring on init, `handlePlacement` pops next from ring instead of `generateRandomTile`, `handleRotate(direction)` exported, ring UI drawn with HOLD/CURRENT/NEXT sections, rotate charge indicator
- `src/main.js` — added `onKeyDown` for Q (rotate left) / E (rotate right)

### Ring UI layout
- HOLD slot: left side, empty placeholder with dash (activates in Phase 5)
- CURRENT tile: gold-highlighted border, larger (44px)
- NEXT queue: 6 slots showing upcoming ring tiles (38px each)
- Rotate charges: shown as ●●● / ○○○ below ring

### Verified behavior
- Tiles flow from ring to grid: place tile → pop next from ring → new tile pushed to back
- Ring refills correctly — always 6 upcoming tiles
- Chain merges still work through ring (Tribe→Hut→Village confirmed, score 1100)
- `render_game_to_text` includes ring tiles, heldTile, rotateCharges
- Playwright: 3 iterations, multi-click actions, 0 errors
- Ring rotate via Q/E keys costs charges (3 max)

### Deviations from plan
- `holdTile` implemented in `ring.js` as a pure function (swap logic) but not yet wired into `state.js`/`main.js` — deferred to Phase 5 per plan
- All tiles in ring are tier-0 for now — variety comes later with stage configs

### Handoff notes for Phase 4
- `drawTile()` and `drawRingArea()` in `state.js` should move to `renderer.js`
- `render()` in `state.js` handles all drawing — Phase 4 extracts this into dedicated module
- Tier visuals need per-tier icons/emojis (currently just colored rectangles with text labels)
- HUD needs better styling and score/turn display
- Canvas background gradient can be enhanced
