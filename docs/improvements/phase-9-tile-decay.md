# Phase 9 — Tile Decay

Tiles on the grid age each turn. If they sit too long without merging, they downgrade one tier. Tier-0 tiles are destroyed. This forces proactive merging instead of hoarding.

---

## Design

- Every tile gains a `placedTurn` property when created/placed on the grid
- Each turn in `handlePlacement()`, after placement and merges resolve, scan the grid:
  - For each normal tile where `(currentTurn - tile.placedTurn) >= decayAfter`:
    - If tier > 0: downgrade to tier - 1, reset `placedTurn` to current turn
    - If tier === 0: destroy tile (set cell to `null`)
- Merged tiles get their `placedTurn` reset to the current turn (fresh timer)
- **Visual warning**: Tiles within 2 turns of decay threshold show a cracked/dim overlay

### Stage Config

New optional field: `decayAfter` (number of turns before a tile decays)

| Stage | `decayAfter` | Notes |
|-------|-------------|-------|
| 1–4   | — (disabled) | No decay for early stages |
| 5     | 20           | Very gentle — rarely triggers |
| 6     | 18           | Slightly tighter |
| 7     | 15           | Noticeable pressure |
| 8     | 13           | Must merge within ~13 turns |
| 9     | 11           | Aggressive decay |
| 10    | 10           | Constant pressure |

---

## Implementation Steps

### 9.1 — Add `placedTurn` to tile creation

- **`grid.js`**: `createTile()` does NOT set `placedTurn` (it doesn't know the turn). Instead, `placedTurn` is set in `state.js` at placement time.
- **`state.js`** `handlePlacement()`: After `placeTile()` succeeds, set `gameState.grid[row][col].placedTurn = gameState.turn`
- **`state.js`** `resolveMerges()` callback: When a merge creates an upgraded tile, the new tile in `grid.js` won't have `placedTurn` — set it in `handlePlacement()` after merge resolution by scanning merge events and setting `placedTurn = gameState.turn` on each result cell

### 9.2 — Decay tick function

- **`state.js`**: New function `tickTileDecay()`:
  ```
  function tickTileDecay() {
    const threshold = gameState.stageConfig?.decayAfter;
    if (!threshold || threshold <= 0) return { decayed: [], destroyed: [] };
    const decayed = [], destroyed = [];
    for each cell in grid:
      if normal tile && (gameState.turn - tile.placedTurn) >= threshold:
        if tile.tier > 0: downgrade, reset placedTurn, push to decayed[]
        else: destroy, push to destroyed[]
    return { decayed, destroyed };
  }
  ```
- Call `tickTileDecay()` in `handlePlacement()` after hazard spawning, before game-over check

### 9.3 — Stage configs

- **`stages.js`**: Add `decayAfter` field to stages 5–10

### 9.4 — Visual decay warning

- **`renderer.js`**: When drawing a tile, check if `(currentTurn - tile.placedTurn)` is within 2 of `decayAfter`. If so, draw a cracked overlay or pulsing dim effect.
- Add a subtle timer bar or color tint showing decay proximity

### 9.5 — Serialization & audio

- **`state.js`** `renderGameToText()`: Include `placedTurn` in tile serialization
- **`audio.js`**: Add `decay` SFX (crumbling sound), played when tiles decay/destroy
- New state field: `lastDecayEvent` for renderer to show flash

---

## Files Touched

| File | Changes |
|------|---------|
| `src/state.js` | Set `placedTurn` on placement/merge, `tickTileDecay()`, `lastDecayEvent`, serialization |
| `src/grid.js` | No structural changes (placedTurn set externally) |
| `src/stages.js` | New `decayAfter` config field on stages 5–10 |
| `src/renderer.js` | Decay warning overlay on aging tiles, decay flash |
| `src/audio.js` | New `decay` SFX |
| `agents.md` | Document tile decay mechanic, `placedTurn`, `decayAfter` |

---

## Status

- [x] 9.1 Add `placedTurn` to tile placement and merge results
- [x] 9.2 Decay tick function
- [x] 9.3 Stage configs
- [x] 9.4 Visual decay warning
- [x] 9.5 Serialization & audio

## Implementation Notes

- Added `placedTurn` property to tiles set at placement time and reset on merges
- Implemented `tickTileDecay()` function that scans grid for tiles exceeding age threshold
- Added `decayAfter` config to stages 5-10: 20→18→15→13→11→10 turns
- Decay logic: tier>0 tiles downgrade, tier-0 tiles destroyed, timer resets on downgrade
- Visual warnings: pulsing orange/red borders for tiles within 2 turns of decay, crack overlay for 1-turn warning
- Added `decay` SFX (crumbling cascade) played when tiles decay/destroy
- Added `lastDecayEvent` state field for renderer to show decay effects
- Updated `renderGameToText()` to serialize `placedTurn` and `lastDecayEvent`
- Enhanced `drawTile()` to accept optional state parameter for decay warnings
- Updated agents.md with tile decay mechanic, new state fields, and SFX documentation
