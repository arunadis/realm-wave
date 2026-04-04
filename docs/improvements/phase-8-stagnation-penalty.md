# Phase 8 — Stagnation Penalty

Punish passive play by tracking consecutive turns without a merge and auto-spawning hazards when the player stagnates.

---

## Design

- New state field: `gameState.noMergeStreak` (integer, starts at 0)
- After each placement in `handlePlacement()`:
  - If `events.length === 0` → increment `noMergeStreak`
  - If `events.length > 0` → reset `noMergeStreak` to 0
- When `noMergeStreak >= stagnationThreshold` (per-stage config, default 3):
  - Auto-spawn a hazard from the stage's `hazardTypes` pool
  - Show a brief "Stagnation!" notification (reuse `hint` system or `hazardFlash`)
  - Play `stagnation` SFX
  - Reset `noMergeStreak` to 0

### Stage Config

New optional field on stage configs:

| Stage | `stagnationThreshold` | Notes |
|-------|-----------------------|-------|
| 1–2   | — (disabled)          | Keep beginner-friendly |
| 3–4   | 4                     | Gentle introduction |
| 5–6   | 3                     | Standard pressure |
| 7–8   | 3                     | With more hazard types in pool |
| 9–10  | 2                     | Very punishing — must merge almost every turn |

---

## Implementation Steps

### 8.1 — Add state field

- **`state.js`**: Add `noMergeStreak: 0` to `startStage()` initialization
- Add to `renderGameToText()` for Playwright observability

### 8.2 — Track streak in `handlePlacement()`

- After merge resolution: if no merges, increment; else reset
- Check threshold and spawn hazard if exceeded
- Reuse existing `spawnHazard()` function

### 8.3 — Stage configs

- **`stages.js`**: Add `stagnationThreshold` to stages 3–10

### 8.4 — Visual notification

- **`renderer.js`**: Show "Stagnation!" warning text when hazard is triggered by stagnation (can reuse hint overlay or hazard flash)

### 8.5 — Audio cue

- **`audio.js`**: Add `stagnation` SFX (low rumble / warning tone)
- **`main.js`**: Play on stagnation trigger

---

## Files Touched

| File | Changes |
|------|---------|
| `src/state.js` | `noMergeStreak` field, streak logic in `handlePlacement`, serialization |
| `src/stages.js` | New `stagnationThreshold` config field on stages 3–10 |
| `src/renderer.js` | Stagnation warning notification |
| `src/audio.js` | New `stagnation` SFX |
| `src/main.js` | Play stagnation SFX |
| `agents.md` | Document new state field and mechanic |

---

## Status

- [x] 8.1 Add state field
- [x] 8.2 Track streak + spawn hazard
- [x] 8.3 Stage configs
- [x] 8.4 Visual notification
- [x] 8.5 Audio cue

## Implementation Notes

- Added `noMergeStreak` field to gameState, initialized in `startStage()` and serialized in `renderGameToText()`
- Implemented streak tracking in `handlePlacement()` - increments on no merges, resets on merges
- Added `stagnationThreshold` config to stages 3-10: 4 for stages 3-4, 3 for stages 5-8, 2 for stages 9-10
- When threshold exceeded: spawns hazard from stage's hazardTypes, shows "Stagnation!" hint, plays warning SFX, resets streak
- Visual notification uses existing hint system in renderer.js
- Audio cue added as 'stagnation' SFX (low rumble) in audio.js, played via window.audio in state.js
- Updated agents.md with new state field, mechanic documentation, and SFX listing
