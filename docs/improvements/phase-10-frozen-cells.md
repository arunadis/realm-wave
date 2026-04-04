# Phase 10 — Frozen Cells

Periodically freeze random empty cells for N turns, blocking tile placement. Forces players to plan around shrinking available space.

---

## Design

- New state field: `gameState.frozenCells` — array of `{ row, col, turnsLeft }`
- Each turn in `handlePlacement()`, after placement resolves:
  1. **Thaw**: Decrement `turnsLeft` on all frozen cells. Remove those with `turnsLeft <= 0`.
  2. **Freeze**: If `turn % frozenCellFreq === 0`, pick `frozenCellCount` random empty (non-frozen) cells and freeze them for `frozenCellDuration` turns.
- Frozen cells block `placeTile()` — treat them like occupied cells
- Frozen cells are NOT affected by hazards (ice protects them, but they're useless to the player)
- Merges and tile decay skip frozen cells

### Stage Config

New optional fields:

| Stage | `frozenCellFreq` | `frozenCellCount` | `frozenCellDuration` | Notes |
|-------|-------------------|-------------------|----------------------|-------|
| 1–3   | — (disabled)      | —                 | —                    | No freezing |
| 4     | 10                | 1                 | 4                    | Gentle intro |
| 5     | 8                 | 1                 | 5                    | Slightly more |
| 6     | 8                 | 2                 | 4                    | Two cells at a time on 6×6 |
| 7     | 7                 | 2                 | 5                    | Longer duration |
| 8     | 6                 | 2                 | 5                    | More frequent |
| 9     | 5                 | 3                 | 4                    | Three cells, frequent |
| 10    | 4                 | 3                 | 5                    | Maximum pressure |

---

## Implementation Steps

### 10.1 — State fields and initialization

- **`state.js`** `startStage()`: Initialize `gameState.frozenCells = []`
- Add `frozenCells` to `renderGameToText()` serialization

### 10.2 — Freeze/thaw logic in `handlePlacement()`

- After hazard spawning and before game-over check:
  1. Decrement all `turnsLeft`, remove expired frozen cells
  2. If freq condition met, pick random empty non-frozen cells and freeze them
- Helper: `isCellFrozen(row, col)` — checks if a cell is in the frozen list

### 10.3 — Block placement on frozen cells

- **`state.js`** `handlePlacement()`: Before calling `placeTile()`, check `isCellFrozen(row, col)`. If frozen, return false.
- Same check for catalyst placement

### 10.4 — Stage configs

- **`stages.js`**: Add `frozenCellFreq`, `frozenCellCount`, `frozenCellDuration` to stages 4–10

### 10.5 — Visual rendering

- **`renderer.js`**: Draw frozen cells with an ice-blue tint overlay and ❄️ icon
- Show turns remaining as small number on the frozen cell
- Ghost tile preview should NOT show on frozen cells

### 10.6 — Audio

- **`audio.js`**: Add `freeze` SFX (crystalline/ice sound) played when cells freeze
- Optional thaw sound when cells unfreeze

---

## Edge Cases

- If a frozen cell has a tile under it (shouldn't happen — only empty cells freeze), skip it
- If all empty cells are frozen, skip freezing new ones
- Frozen cells don't count as "occupied" for game-over check (grid is functionally full if all non-frozen cells are occupied and no merges exist)
- Hover preview should show ❄️ "blocked" indicator on frozen cells

---

## Files Touched

| File | Changes |
|------|---------|
| `src/state.js` | `frozenCells` state, freeze/thaw logic, `isCellFrozen()`, placement block, serialization |
| `src/stages.js` | New frozen cell config fields on stages 4–10 |
| `src/renderer.js` | Frozen cell overlay + icon, hover blocked indicator |
| `src/audio.js` | `freeze` SFX |
| `src/main.js` | Play freeze SFX on freeze events |
| `agents.md` | Document frozen cells mechanic |

---

## Status

- [x] 10.1 State fields and initialization
- [x] 10.2 Freeze/thaw logic
- [x] 10.3 Block placement on frozen cells
- [x] 10.4 Stage configs
- [x] 10.5 Visual rendering
- [x] 10.6 Audio

## Implementation Notes

- Added `frozenCells` state array with `{ row, col, turnsLeft }` objects
- Implemented `isCellFrozen()` helper function for placement blocking
- Added freeze/thaw logic in `handlePlacement()`: thaw expired cells, freeze new ones based on frequency
- Blocked both normal placement and catalyst selection on frozen cells
- Added frozen cell configs to stages 4-10 with progressive difficulty:
  - Stage 4: 1 cell every 10 turns for 4 turns (gentle intro)
  - Stage 5: 1 cell every 8 turns for 5 turns
  - Stage 6: 2 cells every 8 turns for 4 turns (6×6 grid)
  - Stage 7: 2 cells every 7 turns for 5 turns
  - Stage 8: 2 cells every 6 turns for 5 turns
  - Stage 9: 3 cells every 5 turns for 4 turns
  - Stage 10: 3 cells every 4 turns for 5 turns (maximum pressure)
- Visual rendering: ice-blue tint overlay, snowflake icon, turns remaining counter
- Ghost tile preview disabled on frozen cells, red blocked indicator when hovering
- Added `freeze` SFX (crystalline chime with three ascending sine tones)
- Updated `renderGameToText()` to serialize `frozenCells` array
- Updated agents.md with frozen cells mechanic, new state fields, configs, and SFX documentation
