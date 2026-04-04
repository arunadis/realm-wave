# Phase 5 — Meta-Progression & Replayability

**Priority**: 🟢 Low–Medium | **Effort**: Medium–High | **Status**: ✅ Done

Give players reasons to come back and replay stages beyond just star-chasing.

---

## 5.1 Upgrade Preview (Before/After)

**Problem**: The upgrade shop shows cost and level, but doesn't clearly communicate the concrete effect of purchasing the next level.

**Current state**: `drawUpgradeShop()` shows `def.description` (a one-line generic description) and level/cost. Players must guess what "Deeper Ring Lvl 2" actually means.

**Implementation**:
- **`upgrades.js`**: Add a `getLevelDescription(id, level)` function that returns concrete text:
  ```
  deeperRing Lvl 0 → 1: "Ring slots: 6 → 7"
  deeperRing Lvl 1 → 2: "Ring slots: 7 → 8"
  fortify Lvl 0 → 1: "Tier-0 tiles resist 1 hazard hit"
  ```
- **`renderer.js`**: In the upgrade row, replace or supplement the generic description with the level-specific preview text. Show current value → next value.

---

## 5.2 Statistics Screen

**Problem**: Players have no aggregate view of their accomplishments. Only per-stage best scores and stars are visible.

**Design**: A "Stats" screen accessible from the title menu, showing:
- Total stages cleared
- Total stars earned (already tracked)
- Best score across all stages
- Total games played
- Total merges performed
- Highest chain achieved
- Total hazards survived

**Implementation**:
- **`state.js`**: Extend saved progress with a `stats` object:
  ```js
  stats: {
    gamesPlayed: 0,
    stagesCleared: 0,
    totalMerges: 0,
    highestChain: 0,
    hazardsSurvived: 0,
  }
  ```
  Increment counters in `handlePlacement()`, `handleStageClear()`, and hazard resolution.
- **`state.js`**: Add `openStats()` / `closeStats()` mode transitions (new mode: `'stats'`).
- **`renderer.js`**: Add `drawStatsScreen()` — a panel similar to the upgrade shop but displaying stat rows.
- **`main.js`**: Add title menu button "Stats" and keyboard shortcut `S`.
- **Persistence**: Include `stats` in `saveProgressFromState()` and `loadProgress()`.

---

## 5.3 Per-Stage Challenges

**Problem**: Once a player 3-stars a stage, there's no reason to replay it.

**Design**: Each stage has 1–2 optional challenges that award bonus stars or a badge:

| Stage | Challenge | Reward |
|-------|-----------|--------|
| 1 | Clear in ≤8 turns | 🏅 Speed Runner |
| 2 | Clear without losing any tile to flood | 🏅 Floodproof |
| 3 | Use Hold at least 5 times | 🏅 Ring Master |
| 4 | Catalyst a Tier 4+ merge | 🏅 Alchemist |
| 5 | Survive 3 raids in one run | 🏅 Fortified |
| 6 | Get a 5+ chain combo | 🏅 Chain Lord |
| 7 | Clear with pollution on board | 🏅 Eco Warrior |
| 8 | Merge 3 tech tiles in one run | 🏅 Technologist |
| 9 | Clear with ≤ 2 rotate charges used | 🏅 Minimalist |
| 10 | Score 150,000+ | 🏅 Transcendent |

**Implementation**:
- **`stages.js`**: Add a `challenges` array to each stage config:
  ```js
  challenges: [
    { id: 'speed_runner', desc: 'Clear in ≤8 turns', check: (state) => state.turn <= 8 }
  ]
  ```
- **`state.js`**: Track `challengeCounters` during gameplay (holds used, catalyst merges, etc.). On stage clear, evaluate challenges and save completed ones to progress.
- **`renderer.js`**: Show challenge badges on the stage select buttons and on the stage clear overlay.
- **Persistence**: `completedChallenges: { [stageId]: [challengeId, ...] }` in saved progress.

---

## 5.4 Daily Challenge (Seeded Runs)

**Problem**: Every run is random with no competitive or communal element.

**Design**: A "Daily Challenge" mode that seeds the random tile generation so all players get the same sequence.

**Implementation**:
- **`ring.js`**: Replace `Math.random()` calls with a seeded PRNG (e.g., mulberry32). Accept an optional `seed` parameter in `createRing()` and `popNext()`.
- **`state.js`**: Add a `dailyChallenge` mode. Generate seed from current date: `seed = YYYYMMDD`.
- **`renderer.js`**: Add a "Daily Challenge" button on the title screen. Show a leaderboard-style "Your Score: X" on completion.
- **Persistence**: Save daily best in `localStorage` keyed by date.

**Note**: This is the highest-effort item and can be deferred or simplified to just a seeded mode without leaderboards.

---

## Verification Checklist

- [x] Upgrade shop shows concrete before/after values per level
- [x] Stats screen accessible from title menu, displays all counters
- [x] Stats persist correctly across sessions
- [x] Challenges visible on stage select and evaluated on stage clear
- [x] Completed challenges saved and displayed
- [x] Daily challenge seed produces deterministic tile sequence
- [x] `renderGameToText()` updated with new state fields
- [x] Build passes
- [x] `agents.md` updated
