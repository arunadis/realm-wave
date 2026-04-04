# Phase 11 — Discard Action

New player action: discard the current tile instead of placing it. Provides an escape valve for bad tiles, but overuse fills the board with walls.

---

## Design

- New key: `X` (keyboard), new button in ring area (touch/click)
- Discarding **does not advance the turn** — no hazard/decay/freeze tick
- Pops the next tile from ring after discard
- Escalating cost:
  - 1st discard per run: free
  - 2nd+ discard: spawns a wall (durability 2) on a random empty cell
- State field: `gameState.discardCount` (integer, starts at 0 per run)
- Available from **Stage 3+** (when Hold unlocks — gives players more actions to think about)
- New stage config field: `discardUnlocked` (boolean, derived from mechanics array or explicit)

---

## Implementation Steps

### 11.1 — State fields

- **`state.js`** `startStage()`: Initialize `gameState.discardCount = 0`
- New mechanic flag: `gameState.discardUnlocked` — set from `config.mechanics.includes('discard')` or enabled when `hold` is unlocked (Stage 3+)
- Add `discardCount` and `discardUnlocked` to `renderGameToText()`

### 11.2 — `handleDiscard()` function

- **`state.js`**: New exported function:
  ```
  export function handleDiscard() {
    if (mode !== 'playing') return false;
    if (!discardUnlocked) return false;
    if (!currentTile) return false;

    discardCount++;
    if (discardCount >= 2) {
      spawnWall(grid, { rng, durability: 2 });
    }
    currentTile = popNext(ring);
    return true;
  }
  ```
- Does NOT increment `turn` — intentionally skips hazard/decay ticks

### 11.3 — Stage configs

- **`stages.js`**: Add `'discard'` to mechanics array for stages 3–10 (or derive from hold being unlocked)

### 11.4 — Input routing

- **`main.js`**: Add `X` key binding → `handleDiscard()`
- **`main.js`** `routePointer()`: Add discard button hit-test in playing mode
- Play `discard` SFX on successful discard

### 11.5 — Renderer

- **`renderer.js`**: Draw discard button in ring area (small "✕" or "🗑️" button near the current tile)
- Show discard count indicator (e.g. "Discards: 2" or wall-spawn warning after 1st use)
- Button should be visually distinct but not dominant

### 11.6 — Audio

- **`audio.js`**: Add `discard` SFX (swoosh / toss sound)

---

## Edge Cases

- Cannot discard if no `currentTile` (shouldn't happen in normal play)
- If ring is empty after discard, handle gracefully (pop returns null → game over check)
- Discard during catalyst mode: cancel catalyst mode first, then discard
- Tutorial: don't show discard button during tutorial steps

---

## Files Touched

| File | Changes |
|------|---------|
| `src/state.js` | `discardCount`, `discardUnlocked`, `handleDiscard()`, serialization |
| `src/stages.js` | `'discard'` in mechanics for stages 3–10 |
| `src/main.js` | `X` key binding, discard button click routing |
| `src/renderer.js` | Discard button in ring area, discard count indicator |
| `src/audio.js` | `discard` SFX |
| `agents.md` | Document discard mechanic |

---

## Status

- [x] 11.1 State fields
- [x] 11.2 `handleDiscard()` function
- [x] 11.3 Stage configs
- [x] 11.4 Input routing (keyboard + click)
- [x] 11.5 Renderer (button + indicator)
- [x] 11.6 Audio

**Phase 11 completed successfully** - Discard action implemented with escalating cost mechanic (free first discard, wall spawn on 2nd+), available from Stage 3+.
