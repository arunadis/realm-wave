# Phase 12 — Score Bleed

In later stages, score slowly drains each turn after the 3-star turn limit is exceeded. Creates urgency — dawdling costs score, incentivizing efficient play over safe play.

---

## Design

- After `turn > turnLimit3Star`, subtract `bleedPerTurn` from score each turn
- `bleedPerTurn = Math.floor(stageTarget * 0.005)` — 0.5% of the stage target per turn
- Score cannot drop below 0
- Active in **stages 6–10** (where stakes are higher and grids are 6×6)
- Visual: HUD score text pulses red when bleed is active
- Optional stage config override: `scoreBleedRate` (multiplier, default 0.005)

---

## Implementation Steps

### 12.1 — Bleed logic in `handlePlacement()`

- **`state.js`**: After incrementing `turn`, before stage-clear check:
  ```
  const config = gameState.stageConfig;
  if (config && gameState.turn > config.turnLimit3Star) {
    const rate = config.scoreBleedRate || 0.005;
    const bleed = Math.floor(config.target * rate);
    gameState.score = Math.max(0, gameState.score - bleed);
    gameState.scoreBleedActive = true;
    gameState.lastBleedAmount = bleed;
  } else {
    gameState.scoreBleedActive = false;
    gameState.lastBleedAmount = 0;
  }
  ```

### 12.2 — State fields

- **`state.js`** `startStage()`: Initialize `scoreBleedActive: false`, `lastBleedAmount: 0`
- Add both to `renderGameToText()` for Playwright observability

### 12.3 — Stage configs (optional override)

- **`stages.js`**: Stages 1–5 have no `scoreBleedRate` (bleed only kicks in at stage 6+ where `turnLimit3Star` is meaningful enough)
- Stages 6–10: optionally set `scoreBleedRate` for fine-tuning (default 0.005 if absent)
- Can increase rate in stages 9–10 for extra pressure (e.g. 0.008)

### 12.4 — Visual indicator

- **`renderer.js`** `drawHUD()`: When `scoreBleedActive` is true:
  - Score text color changes to pulsing red/orange
  - Show small "-X" bleed indicator next to score
  - Optional: thin red progress bar under HUD showing turns elapsed past 3-star limit

### 12.5 — Audio

- **`audio.js`**: Add subtle `bleed` SFX (quiet tick/drain sound) played each turn when bleed is active
- Should be unobtrusive — a soft background cue, not alarming

---

## Edge Cases

- Bleed cannot reduce score below 0
- If score bleeds below a previously-achieved stage target mid-run, the stage is NOT un-cleared (score just needs to reach target at some point during the run — but with the current check at each turn, bleed after clearing is irrelevant since `handleStageClear` triggers immediately)
- Bleed does NOT apply during discard (discard doesn't advance turn)
- Daily challenge mode: bleed applies normally (adds strategic depth)

---

## Files Touched

| File | Changes |
|------|---------|
| `src/state.js` | `scoreBleedActive`, `lastBleedAmount`, bleed logic in `handlePlacement`, serialization |
| `src/stages.js` | Optional `scoreBleedRate` field on stages 9–10 |
| `src/renderer.js` | Pulsing red score, bleed amount indicator in HUD |
| `src/audio.js` | `bleed` SFX |
| `src/main.js` | Play bleed SFX |
| `agents.md` | Document score bleed mechanic |

---

## Status

- [x] 12.1 Bleed logic
- [x] 12.2 State fields
- [x] 12.3 Stage configs
- [x] 12.4 Visual indicator
- [x] 12.5 Audio

**Phase 12 completed successfully** - Score bleed mechanic implemented with progressive rates (0.5% to 0.8%) in stages 6-10, creating urgency after 3-star turn limits.
