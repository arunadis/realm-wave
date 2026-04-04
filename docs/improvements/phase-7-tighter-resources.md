# Phase 7 — Tighter Resources

Reduce the generosity of rotate charges, catalyst charges, and chain bonuses so players must be deliberate with every action.

---

## Changes

### 7.1 — Reduce base rotate charges (3 → 2)

- **`ring.js`**: `createRing()` — change `rotateCharges: 3` → `2` and `maxRotateCharges: 3` → `2`
- **`renderer.js`**: Update any hardcoded max-charge display logic if present

### 7.2 — Raise chain-bonus threshold (3+ → 4+ merges)

- **`state.js`** `handlePlacement()`: Change the free rotate-charge refill condition from `events.length >= 3` to `events.length >= 4`
- This makes rotate charges genuinely scarce — players must plan longer chains to earn them back

### 7.3 — Reduce catalyst charges (2 → 1)

- **`state.js`** `startStage()`: Change `catalystCharges: config.mechanics.includes('catalyst') ? 2 : 0` → `? 1 : 0`
- **`renderer.js`**: Update hardcoded `maxCatalystCharges = 2` → `1` in ring area drawing

### 7.4 — Combo Echo upgrade threshold (2+ → 3+ chain)

- **`state.js`** `handlePlacement()`: Change `events.length >= 2 && comboEchoLevel > 0` → `events.length >= 3`
- This makes the Combo Echo upgrade feel earned rather than trivially triggered

### 7.5 — Stage config tightening

- **`stages.js`**: For stages 5–10:
  - Increase `hazardFreq` by 1 step (more frequent hazards)
  - Decrease `cursedTileFreq` by 1–2 (more cursed tiles in ring)
  - Tighten `turnLimit3Star` by ~15% and `turnLimit2Star` by ~10%
  - Stages 8–10: wall durability 3 → 4 (via new `wallDurability` config field)
- **`state.js`**: Read `wallDurability` from config when spawning walls

---

## Files Touched

| File | Changes |
|------|---------|
| `src/ring.js` | Default charges 3→2 |
| `src/state.js` | Chain bonus threshold, catalyst init, combo echo threshold, wall durability from config |
| `src/stages.js` | Tightened numbers across stages 5–10, new `wallDurability` field |
| `src/renderer.js` | Catalyst charge display max updated |
| `src/audio.js` | No changes |
| `agents.md` | Document updated defaults and config fields |

---

## Status

- [x] 7.1 Reduce base rotate charges
- [x] 7.2 Raise chain-bonus threshold
- [x] 7.3 Reduce catalyst charges
- [x] 7.4 Combo Echo threshold
- [x] 7.5 Stage config tightening
