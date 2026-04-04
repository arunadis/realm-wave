# Phase 3 — Onboarding & Tutorials

**Priority**: 🟡 Medium | **Effort**: Medium–High | **Status**: 🔄 In progress

Reduce the learning curve so new players understand the game without reading a wall of text.

---

## 3.1 Interactive Tutorial for Stage 1

**Problem**: Stage 1 is labeled as tutorial (`description: 'Build your first settlement'`) but has no guided instructions. New players are dropped into a 5×5 grid with zero context. The static "How to Play" guide exists but requires reading before playing.

**Design**:
A lightweight step-based overlay system that triggers only on the player's **first ever Stage 1 run** (check via a `tutorialCompleted` flag in saved progress).

**Tutorial Steps**:
1. **"Place a tile"** — Highlight the grid, show arrow from PLACE tile to an empty cell. Wait for player to place.
2. **"Nice! Tiles merge"** — After first merge (or if no merge, after 2nd placement), explain matching. Highlight the merged result.
3. **"Rotate the ring"** — Highlight NEXT queue and rotate controls. Prompt player to press Q or E (or swipe).
4. **"Reach the target"** — Point at the progress bar. Explain the goal. Dismiss overlay and let player continue freely.

**Implementation**:
- **`state.js`**:
  - Add `tutorialStep: 0` to state (0 = not in tutorial, 1–4 = steps, -1 = completed/skipped)
  - Add `tutorialCompleted` to saved progress
  - On `startStage(1)`, if `!progress.tutorialCompleted`, set `tutorialStep = 1`
  - After each relevant action, advance `tutorialStep`
  - Add `skipTutorial()` export
- **`renderer.js`**:
  - Add `drawTutorialOverlay(ctx, w, h, state, layout)` — draws a semi-transparent mask with a highlighted "spotlight" region and instruction text with a "Skip" button
  - Call it at the end of the playing-mode render path if `tutorialStep > 0`
- **`main.js`**:
  - Tutorial overlay should not block normal input — player still clicks normally, but the overlay guides them
  - Add hit-test for "Skip" button → `skipTutorial()`

**Progress persistence**: Save `tutorialCompleted: true` in `realmWeaveProgressV1` payload.

---

## 3.2 Mechanic Unlock Notifications

**Problem**: Stages 3–8 each unlock new mechanics (Hold, Catalyst, ComboX3, Tech tiles), but the player gets no in-game notification. They might not notice the new Hold slot or Catalyst button.

**Design**: A brief toast/banner that appears at the start of a stage when new mechanics are present (compared to the previous stage the player has completed).

**Implementation**:
- **`state.js`**:
  - Add `mechanicNotification: null` to state shape
  - In `startStage()`, compare current stage mechanics vs previous stage. If new ones exist, set:
    ```js
    mechanicNotification = { mechanics: ['hold'], timer: 4.0, duration: 4.0 }
    ```
  - Tick down in `update(dt)` like other visual effects
- **`renderer.js`**:
  - Add `drawMechanicNotification(ctx, w, h, notification)` — a top banner that slides in/out:
    - "🆕 Hold unlocked! Press H to save a tile for later"
    - "🆕 Catalyst unlocked! Press C to force-merge two tiles"
    - "🆕 Combo ×3! Chain 3+ merges for triple score"
    - "🆕 Tech tiles! ⚙️ merges with any adjacent tile"

**Mechanic descriptions map**:
```js
const MECHANIC_DESCRIPTIONS = {
  hold: { icon: '🤚', text: 'Hold unlocked! Press H to save a tile' },
  catalyst: { icon: '⚡', text: 'Catalyst unlocked! Press C to force-merge' },
  comboX3: { icon: '🔥', text: 'Combo ×3! Chain 3+ merges for triple score' },
  techTile: { icon: '⚙️', text: 'Tech tiles appear! They merge with anything' },
  holdCostsCharge: { icon: '⚠️', text: 'Hold now costs a rotate charge!' },
};
```

---

## 3.3 Contextual Hints

**Problem**: Players may forget about available tools (Hold, Catalyst, Rotate) when they're struggling.

**Design**: Subtle, non-intrusive hint text that appears after detecting specific situations:

| Condition | Hint |
|-----------|------|
| Grid ≥80% full + Hold available + not used in 5 turns | "Tip: Press H to hold your tile" |
| Grid ≥80% full + Catalyst charges > 0 + not used recently | "Tip: Press C to force-merge two tiles" |
| 3+ same-tier tiles adjacent but not mergeable from placement | "Tip: Rotate the ring (Q/E) to find a match" |
| Score < 50% of target at > 70% of turn limit | "Tip: Chain merges multiply score!" |

**Implementation**:
- **`state.js`**: Add `hint: null`, `turnsSinceHold: 0`, `turnsSinceCatalyst: 0` to state. Increment counters in `handlePlacement()`, reset on use.
- **`renderer.js`**: Draw hint as a small fading text below the grid, visible for 3 seconds.
- Hints should not appear during tutorial (Phase 3.1) to avoid clutter.

---

## Verification Checklist

- [x] Tutorial triggers on first Stage 1 run only
- [x] Tutorial steps advance correctly: place → merge → rotate → target
- [x] "Skip" button works and persists `tutorialCompleted`
- [x] Tutorial does not trigger on subsequent Stage 1 runs
- [x] Mechanic notifications appear for each new mechanic per stage
- [x] Notifications auto-dismiss after ~4 seconds
- [x] Contextual hints appear under correct conditions
- [x] Hints don't overlap with tutorial
- [x] `renderGameToText()` includes `tutorialStep`, `mechanicNotification`
- [x] Build passes
- [x] `agents.md` updated
