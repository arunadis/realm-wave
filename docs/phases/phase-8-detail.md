# Phase 8 — Stages 7–10 (Pollution, Tech Tile, Endgame) Detail

## Goal
Final four stages with remaining mechanics and difficulty ramp: Pollution hazard, Tech wildcard tile, ring shrink, hold-costs-charge, and victory screen.

## Files Changed

| File | Changes |
|------|---------|
| `src/stages.js` | Added stages 7–10 configs with new mechanics, hazard types, ring slot counts |
| `src/hazards.js` | Pollution hazard: `createHazardTile` adds `turnsRemaining`, `tickPollution()` function, `spawnHazard` skips immediate resolve for pollution |
| `src/grid.js` | Tech tile: `createTechTile()`, `isTechTile()`, updated `getAdjacentSameTier` for wildcard matching, updated `resolveMerges` and `hasAnyMerge` to handle tech + hazard tiles |
| `src/ring.js` | `injectTechTile()` function to replace a random ring slot with a tech tile |
| `src/state.js` | Configurable ring slots, pollution tick, tech tile injection, `holdCostsCharge` mechanic, new state fields |
| `src/renderer.js` | Pollution tile visual (green/☠️/turns indicator), Tech tile visual (cyan/⚙️), compact stage select for 10 stages, victory screen for stage 10 |

## Stage Configs

| Stage | Era | Grid | Target | Hazards | New Mechanic |
|-------|-----|------|--------|---------|--------------|
| 7 | Industrial | 6×6 | 25,000 | flood, raid, **pollution** | Pollution persists 3 turns |
| 8 | Modern | 6×6 | 40,000 | flood, raid, pollution | **Tech tile** (wildcard merge) every 8 turns |
| 9 | Digital | 6×6 | 60,000 | flood, raid, pollution | **Ring shrinks to 5**, hazards every 3 turns |
| 10 | Singularity | 6×6 | 100,000 | flood, raid, pollution | **Hold costs a charge**, tech tile every 10 turns |

## Mechanics Implemented

### Pollution Hazard (Stage 7+)
- Created via `createHazardTile('pollution')` with `turnsRemaining: 3`
- **Persists** on the grid — not resolved immediately like flood/raid
- Each turn, `tickPollution(grid)` runs:
  - Destroys one random adjacent non-hazard tile per pollution tile
  - Decrements `turnsRemaining`; removes pollution when it hits 0
- Visual: dark green background, ☠️ icon, green border, "Pollute" label, turns remaining indicator (e.g., "3t")

### Tech Wildcard Tile (Stage 8+)
- Created via `createTechTile()` — `{ tier: -1, name: 'tech', isTech: true }`
- Merges with **any** adjacent non-hazard, non-tech tile regardless of tier
- Result: upgrades the partner tile by +1 tier, tech tile consumed
- Injected into ring every `techTileFreq` turns via `injectTechTile(ring)`
- Visual: dark cyan background, ⚙️ icon, electric cyan glow border, "Tech" label

### Ring Shrink (Stage 9+)
- `config.ringSlots` overrides default 6-slot ring
- Stage 9/10: 5 slots — less buffer, more pressure

### Hold Costs Charge (Stage 10)
- `holdCostsCharge` mechanic flag
- Using Hold [H] now costs 1 rotate charge (fails if 0 charges left)
- Adds resource tension in the final stage

### Victory Screen (Stage 10 clear)
- Special "🏆 VICTORY! 🏆" overlay with "You conquered the Singularity!" message
- Shows stars, score, turns, and replay prompt

## Function Signatures

### hazards.js
- `createHazardTile(kind)` — now adds `turnsRemaining: 3` for pollution
- `tickPollution(grid)` → `{ destroyed: [{row, col, tile}], expired: [{row, col}] }`
- `spawnHazard(grid, kind, hazardTypes)` — pollution placed but not resolved immediately

### grid.js
- `createTechTile()` → `{ tier: -1, name: 'tech', isTech: true }`
- `isTechTile(tile)` → boolean
- `getAdjacentSameTier(grid, row, col)` — now handles tech wildcard matching
- `resolveMerges(grid)` — skips hazard tiles, handles tech-regular merges

### ring.js
- `injectTechTile(ring)` — replaces random non-first slot with tech tile

### state.js
- New state fields: `techTileUnlocked`, `holdCostsCharge`, `lastPollutionEvent`
- `startStage()` — reads `config.ringSlots`, sets new mechanic flags
- `handlePlacement()` — calls `tickPollution()`, injects tech tiles on schedule
- `handleHold()` — costs a rotate charge when `holdCostsCharge` is true

---

## Verified Behavior
- **Stage select**: All 10 stages render in compact layout, fitting the screen
- **Stage 7**: Industrial Era loads, pollution hazard type included in pool
- **Stage 8**: Modern Era, tech tile appears in ring at turn 8 (techTileFreq: 8), pollution tile spawned with "3t" indicator visible
- **Stage 9**: Digital Era, ring has 5 slots, hazard freq 3
- **Stage 10**: Singularity Era, ring 5 slots, target 100K, holdCostsCharge active
- **Multi-iteration**: 5 Playwright iterations, 0 errors, stars persisting

## Handoff Notes for Phase 9
- Phase 9 adds meta upgrades and persistence (upgrade shop, localStorage save/load)
- The `holdCostsCharge` mechanic could be offset by the "Combo Echo" upgrade (+1 charge per combo)
- Tech tile frequency could be modified by upgrades (e.g., "Foresight" upgrade)
- Star system is already saving per-stage via `localStorage`; Phase 9 extends this to upgrade purchases
- All 10 stages are playable — balance pass may be needed after upgrades are added
