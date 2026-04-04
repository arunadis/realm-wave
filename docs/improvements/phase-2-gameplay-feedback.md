# Phase 2 — Gameplay Feedback

**Priority**: 🔴 High | **Effort**: Medium | **Status**: ✅ Done

Give the player better real-time information so they can make strategic decisions instead of guessing.

---

## 2.1 Ghost Tile Preview on Hover

**Problem**: Players have no preview of where a tile will land before clicking. Misclicks on mobile are especially punishing since there's no undo.

**Implementation**:
- **`state.js`**: Add `hoverCell: null` to state shape. Add `setHoverCell(row, col)` and `clearHoverCell()` exports.
- **`main.js`**: Add `mousemove` listener on canvas. On move, compute `pixelToCell()` and call `setHoverCell()`. On `mouseleave`, call `clearHoverCell()`. Skip on touch devices (hover isn't meaningful).
- **`renderer.js`**: In `drawGrid()`, if `state.hoverCell` matches `(r, c)` and cell is empty and `state.mode === 'playing'` and not in catalyst mode:
  - Draw `state.currentTile` at that cell with `globalAlpha = 0.35`
  - Add a subtle dashed border to indicate "will place here"
- **Catalyst mode**: If `catalystFirst` is set and hovering an adjacent occupied cell, highlight it with a glow to show it's a valid second target.

**State shape change**: `hoverCell: { row, col } | null`

---

## 2.2 Hazard Countdown in HUD

**Problem**: Hazards spawn every `hazardFreq` turns but the player has zero visibility into the timing. This feels unfair rather than strategic.

**Implementation**:
- **No new state needed** — computable from `state.turn` and `state.stageConfig.hazardFreq`:
  ```
  turnsUntilHazard = hazardFreq - (turn % hazardFreq)
  ```
- **`renderer.js`**: In `drawHUD()`, if `stageConfig.hazardFreq > 0`, add a small indicator:
  - Text: `⚠ Hazard in N` with color shifting from green → yellow → red as N decreases
  - Position: below the target progress bar or in the HUD info row
- **Alternative visual**: A small circular countdown badge near the grid edge.

---

## 2.3 Floating Score Numbers on Every Merge

**Problem**: Single merges (the most common event) give no visual score feedback. Only 2+ chains show a combo popup.

**Implementation**:
- **`state.js`**: Extend `mergeFlashes` entries to include `scoreGained` from each merge event (already available from `resolveMerges()` return).
- **`renderer.js`**: In `drawMergeFlashes()`, for every flash (not just `chainIndex >= 2`), draw a rising "+N" text above the merged cell. Use the flash timer for fade-out animation.
  - Single merge: small white "+100" text
  - Chain merge: larger gold "+200 ×2" text (already partially exists)

---

## 2.4 Improved Catalyst Charge Display

**Problem**: Catalyst charges are crammed into the HUD text string as `Cat [C]:2`, easy to miss.

**Implementation**:
- **`renderer.js`**: In `drawRingArea()` or below it, add a dedicated catalyst section (only when `state.catalystUnlocked`):
  - Show "Catalyst [C]" label with filled/empty charge dots (like rotate charges)
  - When charges = 0, dim the display
- Remove the `Cat [C]:N` from the HUD text parts array to avoid duplication.

---

## 2.5 Star-Threshold Turn Indicators

**Problem**: The progress bar shows score progress toward the target, but players don't know how they're performing on the star rating (which is turn-based, not score-based).

**Implementation**:
- **`renderer.js`**: In `drawHUD()`, add a small turn indicator with star thresholds:
  - Text: `Turn 12 / ★★★≤20 / ★★≤35`
  - Color-code based on current pace (green if on track for 3★, yellow for 2★, white for 1★)
- **Alternative**: Add star icons on the progress bar at the threshold positions.

---

## Verification Checklist

- [x] Ghost tile visible on hover (desktop only), transparent, correct cell
- [x] Ghost tile disappears on `mouseleave` and when not in `playing` mode
- [x] Hazard countdown visible and accurate; disappears on stages with no hazards
- [x] Floating "+N" on every merge, fading upward
- [x] Catalyst charges shown as visual dots when unlocked
- [x] Star-threshold info visible in HUD during play
- [x] `renderGameToText()` updated to include `hoverCell`
- [x] Build passes
- [x] `agents.md` updated
