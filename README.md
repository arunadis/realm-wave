# Realm Weave

A 7-stage hybrid puzzle-strategy HTML5 Canvas game built with vanilla JavaScript and HTML5 Canvas. Guide a civilization from tribal beginnings to a technological singularity by placing and merging tiles on a grid while surviving hazards, managing resources, and chaining combos.

**Live Demo**: [https://arunadis.github.io/realm-wave/](https://arunadis.github.io/realm-wave/)

## Table of Contents

- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [How to Play](#how-to-play)
- [Stages](#stages)
- [Tile Hierarchy](#tile-hierarchy)
- [Hazards & Obstacles](#hazards--obstacles)
- [Ring Actions](#ring-actions)
- [Meta Upgrades](#meta-upgrades)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Tribute](#tribute)

---

## Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm**

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The game will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build
```

The optimized output is written to the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to **GitHub Pages** on every push to `main`.

- The Vite `base` path is set conditionally — `/realm-wave/` in CI, `/` locally — so assets resolve correctly in both environments.
- To enable, go to your GitHub repo **Settings → Pages** and set **Source** to **GitHub Actions**.
- The live site will be available at: **https://arunadis.github.io/realm-wave/**

---

## How to Play

1. A tile appears in the **World Ring** (a circular queue at the top of the screen).
2. Click an empty cell on the **grid** to place the tile.
3. When two adjacent tiles of the **same tier** touch, they **merge** into the next tier, earning points.
4. Use **ring actions** (Rotate, Hold, Catalyst, Discard) for strategic advantage.
5. Survive **hazards** (Flood, Raid, Pollution, Earthquake) that periodically disrupt the board.
6. Reach the **target score** to clear the stage and earn 1–3 stars based on how quickly you finish.
7. If the grid fills up with no possible merges, it's **game over**.
8. Spend earned stars on **permanent meta-upgrades** in the Upgrade Shop.

---

## Stages

| # | Era | Grid | Target | Key Mechanics |
|---|-----|------|--------|---------------|
| 1 | Dawn | 5×5 | 1,000 | Tutorial, floods |
| 2 | Iron | 5×5 | 4,000 | Hold, Discard, stagnation penalty, frozen cells |
| 3 | Classical | 5×5 | 8,000 | Catalyst, raids, cursed tiles, walls, tile decay |
| 4 | Renaissance | 6×6 | 15,000 | Combo ×3, score bleed |
| 5 | Industrial | 6×6 | 25,000 | Pollution, earthquakes, all hazard types |
| 6 | Modern | 6×6 | 40,000 | Tech tiles (wildcard merges) |
| 7 | Singularity | 6×6 | 100,000 | Hold costs a charge, shrunk ring, everything active |

Each stage has optional **challenges** that award badges (e.g., Speed Runner, Alchemist, Transcendent).

A **Daily Challenge** mode provides a seeded run on Stage 4 that changes every day.

---

## Tile Hierarchy

| Tier | Name | Icon | Color |
|------|----------|------|----------------|
| 0 | Tribe | 🔥 | Warm bronze |
| 1 | Hut | 🛖 | Dark goldenrod |
| 2 | Village | 🏘️ | Sea green |
| 3 | Town | 🏛️ | Steel blue |
| 4 | City | 🏙️ | Slate blue |
| 5 | Capital | 👑 | Gold |

**Special tiles:**
- **Tech** (⚙️) — Wildcard; merges with any adjacent tile
- **Cursed** (💀) — Decays adjacent tile progress
- **Walls** (🧱) — Blocker tiles with durability

---

## Hazards & Obstacles

- **Flood** (🌊) — Destroys a random tile on the board
- **Raid** (⚔️) — Targets your highest-tier tile
- **Pollution** (☠️) — Persists and damages adjacent tiles each turn
- **Earthquake** (💥) — Shakes the board and destroys multiple tiles
- **Frozen Cells** — Random empty cells freeze for N turns, blocking placement
- **Stagnation Penalty** — Consecutive turns without merges auto-spawn hazards (Stage 2+)
- **Tile Decay** — Tiles age each turn and downgrade/destroy if left too long (Stage 3+)
- **Score Bleed** — After exceeding 3-star turn limit, score drains each turn (Stage 4+)

---

## Ring Actions

| Action | Key | Description |
|--------|-----|-------------|
| **Rotate** | `Q` / `E` | Shift the ring queue left or right |
| **Hold** | `H` | Swap the current tile with a held slot |
| **Catalyst** | `C` | Force-merge a tile on the grid with an adjacent tile |
| **Discard** | `X` | Discard the current tile (free once; spawns a wall on 2nd+ use) |

---

## Meta Upgrades

Stars earned from stage clears are spent on permanent upgrades in the **Upgrade Shop**:

| Upgrade | Effect | Cost (Lvl 1/2/3) |
|---------|--------|-------------------|
| **Deeper Ring** | +1 ring slot per level | 3 / 6 / 10 |
| **Fortify** | Tier-0 tiles resist hazards | 3 / 6 / 10 |
| **Combo Echo** | Chains grant bonus rotate charges | 4 / 8 / 12 |
| **Foresight** | Peek extra ring tiles | 2 / 5 / 9 |
| **Salvage** | Destroyed tiles return score (25%/50%/75%) | 3 / 7 / 11 |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `M` | Toggle mute |
| `F` | Toggle fullscreen |
| `Esc` | Pause / back / exit fullscreen |
| `Q` / `E` | Rotate ring left / right |
| `H` | Hold tile |
| `X` | Discard tile |
| `C` | Catalyst mode |
| `U` | Open upgrade shop |
| `S` | Open stats |
| `G` | Open guide |
| `D` | Start daily challenge |
| `R` | Retry (from stage clear / game over) |
| `↑` / `↓` | Navigate menus |
| `Enter` | Confirm / start stage |

**Touch controls:** Tap to place tiles. Horizontal swipe (≥38 px) to rotate the ring.

## Mobile Layout

The canvas UI now uses a compact responsive layout for narrow/short screens to prevent overlap across gameplay and menus.

- On touch mobile viewports, the game canvas now fills the full browser viewport (instead of preserving the desktop 800×900 aspect box).
- On compact mobile viewports, HUD/ring heights and grid padding are reduced so the grid remains visible and interactive.
- Ring slots, top-control buttons, and text sizes scale down in compact mode.
- Title, stage-select, guide, stats, upgrade shop, pause, stage-clear, and game-over layouts use smaller sizing and tighter edge margins to avoid clipping.
- Click/touch hit-testing stays aligned with visuals because `state.js` grid geometry now uses the same responsive metrics as `renderer.js`.

---

## Project Structure

```
src/
├── index.html      — HTML shell with canvas, fonts, and responsive CSS
├── main.js         — Game loop, input routing (click/touch/keyboard), Playwright hooks
├── state.js        — Central game state, all game actions, persistence, serialization
├── grid.js         — Grid data structure, tile creation, merge resolution
├── ring.js         — Circular tile queue: spawn, rotate, hold, tech/cursed injection
├── stages.js       — 7 stage configs (era, grid size, target, hazards, mechanics)
├── hazards.js      — Hazard spawning and resolution logic
├── upgrades.js     — 5 meta-upgrade definitions and purchase logic
├── renderer.js     — All Canvas drawing: HUD, ring, grid, tiles, overlays, menus
├── audio.js        — Web Audio API SFX manager with mute persistence
```

---

## Tech Stack

- **Runtime**: Vanilla HTML5 Canvas + JavaScript (ES modules)
- **Bundler**: [Vite](https://vitejs.dev/) 5
- **Fonts**: Cinzel, Macondo, Manrope (Google Fonts)
- **Persistence**: `localStorage`
- **Testing**: [Playwright](https://playwright.dev/) (browser automation hooks exposed on `window`)
- **CI/CD**: GitHub Actions → GitHub Pages

---

## License

This project is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

---

## Tribute

This game is completely designed and implemented with **[Windsurf](https://codeium.com/windsurf)**, the world's first agentic IDE.
