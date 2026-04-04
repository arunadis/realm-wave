# Phase 9 — Meta Upgrades & Persistence (Detail)

## Goal
Implement a star-based meta progression layer with permanent upgrades, save/load persistence, and an in-game upgrade shop UI.

## Planned Implementation (Pre-code)

### Data model
- Persistent profile saved in localStorage:
  - `totalStars: number` (spendable star currency)
  - `upgradeLevels: { deeperRing, fortify, comboEcho, foresight, salvage }`
  - `highestStageUnlocked: number`
  - `stageStars: Record<stageId, stars>`
  - `bestScores: Record<stageId, score>`
- Upgrade definitions with 3 levels and per-level costs/effects.

### New module and signatures
- `src/upgrades.js`
  - `createDefaultUpgradeLevels()`
  - `normalizeUpgradeLevels(raw)`
  - `getUpgradeDef(id)`
  - `getUpgradeCost(id, currentLevel)`
  - `getUpgradeEffect(id, upgradeLevels)`
  - `purchaseUpgrade(progress, id)`

### State integration
- Replace old stars-only save with profile load/save in `state.js`.
- Add migration from legacy `realmWeaveStars` key.
- Add shop mode actions:
  - `openUpgradeShop()`
  - `closeUpgradeShop()`
  - `purchaseUpgrade(id)`
- On stage clear:
  - Update best stage stars and award only delta stars (improvement-based)
  - Update best score per stage
  - Unlock next stage
  - Save profile

### Gameplay effect hooks
- `Deeper Ring`: add ring slots when stage starts.
- `Fortify`: tier-1 placed tiles gain hazard-resist charges.
- `Combo Echo`: chain merges grant extra rotate charges by level.
- `Foresight`: increase number of visible ring preview tiles.
- `Salvage`: hazards return % of destroyed tile value as score.

### Renderer/UI
- Stage select:
  - Show total stars
  - Show lock state based on `highestStageUnlocked`
  - Add `Upgrades [U]` entry button
- Upgrade shop screen:
  - List all upgrades, levels, costs, affordability, MAX state
  - Click to purchase
  - Back action via click and Esc
- Ring preview respects Foresight level.

## Files Changed

| File | Changes |
|------|---------|
| `src/upgrades.js` | New upgrade catalog, costs/effects, purchase helper, normalization helpers |
| `src/state.js` | New persistent profile load/save, legacy migration, stage unlock + best score/star bookkeeping, shop actions, upgrade effects in gameplay |
| `src/renderer.js` | Stage lock visuals, stage-select shop entry, total-stars HUD, upgrade shop UI + hit testing, foresight-based ring preview, fortify badge |
| `src/main.js` | Input routing for shop mode (click + keyboard), upgraded stage-select action handling |
| `docs/phases/phase-9-detail.md` | This detailed implementation and handoff doc |

## Implementation Notes

### Persistence behavior
- New key: `realmWeaveProgressV1`
- Legacy support: if only `realmWeaveStars` exists, it is read and converted into the new profile shape.
- Save points:
  - After every stage clear
  - After every successful upgrade purchase

### Star economy
- `totalStars` now acts as spendable currency.
- Stage clears award stars only when improving best stars for that stage:
  - Example: previous best 1★, new clear 3★ → gain +2 stars.

### Upgrade effects applied
- **Deeper Ring**: base ring slots + level bonus.
- **Fortify**: tier-1 tiles placed on grid receive `fortifyCharges` equal to upgrade level; hazard hit consumes one charge before destruction.
- **Combo Echo**: chain of 2+ merges grants bonus rotate charges by level (in addition to existing 3+ chain reward).
- **Foresight**: ring preview shows `3 + level` tiles (capped by ring size).
- **Salvage**: hazard-destroyed tiles grant score refund at 25/50/75%.

### Upgrade shop UX
- Accessible from stage select via:
  - Click `Upgrades [U]` button
  - Press `U`
- Shop actions:
  - Click an upgrade row to purchase next level
  - Click `Back [Esc]` or press Esc to return

## Verification
- `npm run build` passes with successful Vite bundle output.
- Manual runtime sanity checks covered in implementation logic:
  - Locked stages reject start attempts if above `highestStageUnlocked`
  - Upgrade purchase validates max level and star costs
  - Persistence writes profile fields expected by Phase 9 scope

## Deviations / Clarifications
- Fortify level scales resistance charges on tier-1 tiles (`1/2/3` charges) so all three levels are meaningful while preserving the original “resist hazard” design intent.
- Existing combo reward behavior (3+ chain base bonus) is retained and augmented by Combo Echo.

## Handoff Notes for Phase 10
- Phase 10 can reuse the new mode routing pattern (`stageselect`/`upgradeshop`/`playing`) for additional menus and pause overlays.
- The profile payload is ready for mobile/menu polish and should remain backward-compatible by versioning keys if schema changes.
- Consider adding explicit in-game tutorials/tooltips for upgrade effects on first unlock.
