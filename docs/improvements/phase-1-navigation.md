# Phase 1 — Navigation & Flow

**Priority**: 🔴 High | **Effort**: Low | **Status**: 🔄 In progress

Fix the most obvious navigation friction points. Players should never feel "stuck" or forced to click through unnecessary screens.

---

## 1.1 Back Button on Stage Select → Title

**Problem**: There is no way to return from the stage select screen to the title screen. The only option is to reload the page.

**Current state**: `drawStageSelect()` in `renderer.js` renders a header with "Realm Weave" / "Select a Stage", a Guide button (top-left), and a Shop button (top-right) — but no Home/Back button.

**Implementation**:
- **`renderer.js`**: Add a `getHomeButtonRect(w)` function returning a `{ x, y, w, h }` rect (top-left area, below or beside the Guide button). Draw a "← Home" styled button in `drawStageSelect()`.
- **`renderer.js`**: Update `getStageButtonAt()` to check the home button rect and return `{ type: 'home' }`.
- **`main.js`**: In the `stageselect` branch of `routePointer()`, handle `action.type === 'home'` → call `openTitleMenu()`.
- **`main.js`**: Add keyboard shortcut: `Backspace` or `Escape` in `stageselect` → `openTitleMenu()`.

**Touch target**: Button should be ≥44×30px.

---

## 1.2 Retry & Next Stage Buttons on Stage Clear Overlay

**Problem**: After clearing a stage, the only action is "Click to continue" which dumps the player back to stage select. Players usually want to either retry for better stars or advance to the next stage.

**Current state**: `drawStageClear()` in `renderer.js` (line ~1412) shows a panel with stars, score, and "Click to continue". `main.js` line 171–174 routes any click on `stageclear` to `goToStageSelect()`.

**Implementation**:
- **`renderer.js`**: Expand the stage-clear panel height by ~50px. Add two buttons inside:
  - **"Retry"** — restarts the same stage
  - **"Next Stage →"** — starts the next stage (disabled/hidden on Stage 10 victory)
  - Keep a smaller "Stage Select" link/text below
- **`renderer.js`**: Add `getStageClearActionAt(px, py, w, h, state)` returning `{ type: 'retry' }`, `{ type: 'next' }`, or `{ type: 'stageselect' }`.
- **`main.js`**: Replace the blanket `goToStageSelect()` with:
  - `retry` → `startStage(state.stageId)`
  - `next` → `startStage(state.stageId + 1)` (if unlocked)
  - `stageselect` → `goToStageSelect()`
- **Keyboard**: `R` = retry, `Enter` = next stage, `Esc` = stage select.

---

## 1.3 Retry Button on Game Over Overlay

**Problem**: Same issue as stage clear — "Click to retry" goes to stage select, not actual retry.

**Current state**: `drawGameOver()` in `renderer.js` (line ~1492) shows "Stage Failed" + "Click to retry". `main.js` routes `gameover` click to `goToStageSelect()`.

**Implementation**:
- **`renderer.js`**: Add two buttons in the game-over panel:
  - **"Retry"** — restart the same stage
  - **"Stage Select"** — go back to stage select
- **`renderer.js`**: Add `getGameOverActionAt(px, py, w, h)` returning `{ type: 'retry' }` or `{ type: 'stageselect' }`.
- **`main.js`**: Route accordingly.
- **Keyboard**: `R` = retry, `Esc` = stage select.

---

## 1.4 Escape Key Consistency

**Problem**: `Esc` behavior is inconsistent across modes — works for pause, guide, upgrade shop, and fullscreen, but does nothing on stage select, stage clear, or game over.

**Implementation** (in `main.js` `onKeyDown`):
- `stageselect` + `Esc` → `openTitleMenu()`
- `stageclear` + `Esc` → `goToStageSelect()`
- `gameover` + `Esc` → `goToStageSelect()`

---

## Verification Checklist

- [x] Stage select has a visible Home/Back button → returns to title
- [x] Stage clear overlay shows Retry + Next Stage + Stage Select
- [x] Game over overlay shows Retry + Stage Select
- [x] `Esc` works sensibly in every mode
- [x] All new buttons ≥44px touch target
- [x] `renderGameToText()` unchanged (no new state fields needed)
- [x] Build passes (`npm run build`)
- [ ] Playwright: navigate title → stage select → back to title
- [ ] Playwright: clear stage → retry → verify stage restarts
- [x] `agents.md` updated with new hit-test functions
