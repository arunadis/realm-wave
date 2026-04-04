# Phase 6 — Accessibility & Mobile

**Priority**: 🟡 Medium | **Effort**: Low–Medium | **Status**: ✅ Done

Ensure the game is playable and comfortable for all users, especially on mobile and for players with visual impairments.

---

## 6.1 Larger Touch Targets

**Problem**: Several interactive elements are below the recommended 44×44px minimum for mobile:

| Element | Current Size | Location |
|---------|-------------|----------|
| Top controls (mute/fullscreen/pause) | 32×32px | `renderer.js` `TOP_CTRL_SIZE` |
| Shop button | 126×26px | `renderer.js` `SHOP_BTN_H` |
| Guide button | ~112×26px | `renderer.js` `getGuideButtonRect()` |
| Stage buttons (compact) | 240×48px | `renderer.js` `getStageButtonLayout()` — width is fine, height is borderline |
| Upgrade shop back button | 130×34px | `renderer.js` `getUpgradeShopLayout()` |

**Implementation**:
- **`renderer.js`**: Increase constants:
  - `TOP_CTRL_SIZE`: 32 → 40
  - `SHOP_BTN_H`: 26 → 38
  - Minimum compact `btnH`: 48 → 52
  - Back button heights: 34/36 → 42
- Adjust `TOP_CTRL_GAP` if buttons overlap at new sizes.
- Re-test all layouts at 360px wide (smallest common mobile viewport).

---

## 6.2 Color-Blind Friendly Tile Differentiation

**Problem**: The 6 tile tiers are primarily distinguished by color (bronze, goldenrod, green, blue, slate, gold). Color-blind players (especially protanopia/deuteranopia) may confuse Tribe/Hut/Capital or Village/Town.

**Design**: Add distinct **patterns** or **shapes** inside each tile as a secondary visual cue alongside the emoji icon:

| Tier | Icon | Pattern Addition |
|------|------|-----------------|
| 0 Tribe | 🔥 | No border pattern (base) |
| 1 Hut | 🛖 | Single diagonal stripe |
| 2 Village | 🏘️ | Double horizontal stripes |
| 3 Town | 🏛️ | Crosshatch pattern |
| 4 City | 🏙️ | Dotted border |
| 5 Capital | 👑 | Double border + diamond corners |

**Implementation**:
- **`state.js`**: Add `colorBlindMode: false` to state and persistence. Add `toggleColorBlindMode()`.
- **`renderer.js`**: In `drawTile()`, if `colorBlindMode`, draw the tier-specific pattern overlay after the tile background but before the icon.
- **`renderer.js`**: Add a color-blind toggle in the title screen or as a top control button (🎨 icon).
- **`main.js`**: Route the toggle button.

**Simpler alternative**: Since each tile already has a unique emoji icon and text name, the existing differentiation may be sufficient. The pattern approach is most valuable if players report issues.

---

## 6.3 Haptic Feedback on Mobile

**Problem**: Touch interactions on mobile feel flat — no physical feedback on tile placement, merge, or hazard events.

**Implementation**:
- **`main.js`**: Create a `haptic(pattern)` utility:
  ```js
  function haptic(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }
  ```
- Trigger on:
  - Tile placement: `haptic(10)` — light tap
  - Merge: `haptic(20)` — medium tap
  - Combo (2+ chain): `haptic([15, 30, 15])` — double pulse
  - Hazard spawn: `haptic(40)` — strong tap
  - Stage clear: `haptic([20, 40, 20, 40, 20])` — celebration pattern
  - Game over: `haptic(80)` — long buzz
- Only fire if `!state.audioMuted` (use mute as a "no feedback" toggle, or add a separate haptic setting).

---

## 6.4 Keyboard Accessibility Improvements

**Problem**: The game is mostly mouse/touch driven. Keyboard users can't navigate stage select, upgrade shop, or place tiles without a mouse.

**Implementation**:
- **Stage select**: Arrow keys (↑/↓) to highlight a stage, Enter to start.
  - Add `selectedStageIndex` to state for keyboard navigation.
  - Highlight the selected stage button with a glow border.
- **Upgrade shop**: Arrow keys to navigate upgrades, Enter to purchase.
- **Grid placement via keyboard**: This is complex and low priority — consider number keys (1–5/6 for column, then 1–5/6 for row) or arrow-key cell cursor. Mark as stretch goal.

---

## 6.5 Reduced Motion Option

**Problem**: Screen shake, merge flashes, combo popups, and floating particles may be uncomfortable for users with motion sensitivity.

**Implementation**:
- **`state.js`**: Add `reducedMotion: false` to state and persistence.
- Check `window.matchMedia('(prefers-reduced-motion: reduce)')` on init to auto-enable.
- **`state.js`**: In `handlePlacement()`, skip setting `screenShake`, `mergeFlashes`, `comboPopup` if `reducedMotion`.
- **`renderer.js`**: Skip floating star particles in `drawBackground()` if `reducedMotion`.

---

## Verification Checklist

- [x] All interactive elements ≥40px on smallest axis
- [x] Color-blind patterns render correctly per tier (if implemented)
- [x] Haptic feedback fires on supported devices; no errors on desktop
- [x] Keyboard navigation works in stage select and upgrade shop
- [x] Reduced motion auto-detected and suppressible via toggle
- [x] No layout breakage at 360×640 viewport
- [x] Build passes
- [x] `agents.md` updated
