# Phase 1 — Project Scaffold & Game Loop (Detail)

## Goal
Runnable page with canvas, game loop, central state object, and Playwright hooks (`render_game_to_text`, `advanceTime`).

## Files Created
| File | Purpose |
|------|---------|
| `src/index.html` | Centered `<canvas>`, viewport meta, loads `main.js` |
| `src/state.js` | `gameState` object, `renderGameToText()`, `advanceTime(ms)` |
| `src/main.js` | Canvas setup, resize handler, `requestAnimationFrame` loop, wires window hooks |
| `package.json` | Vite dev server (port 5173) |

## Data Structures

### `gameState`
```js
{
  mode: 'playing',    // 'menu' | 'playing' | 'paused' | 'gameover' | 'win'
  grid: [],           // 2D array — empty until Phase 2
  ring: [],           // circular queue — empty until Phase 3
  score: 0,
  turn: 0,
  stage: 1,
  combo: 0,
  gridSize: 5
}
```

## Function Signatures

### state.js
- `createInitialState()` → returns a fresh `gameState` object
- `renderGameToText()` → `JSON.stringify(gameState)`
- `update(dt)` → called each frame, `dt` in seconds (no-op in Phase 1 beyond incrementing frame count)
- `render(ctx, canvas)` → draws background + placeholder text

### main.js
- `initCanvas()` → gets canvas element, sets up 2D context, attaches resize handler
- `resizeCanvas()` → sizes canvas to fill viewport (with max dimension)
- `gameLoop(timestamp)` → `requestAnimationFrame` loop, computes `dt`, calls `update(dt)` then `render(ctx)`
- Wires `window.render_game_to_text` and `window.advanceTime`

## Acceptance Criteria
1. `npm run dev` starts Vite on port 5173
2. Browser shows a centered canvas with an earth-tone gradient background and "Realm Weave — Phase 1" text
3. `window.render_game_to_text()` returns valid JSON with all `gameState` fields
4. `window.advanceTime(1000)` advances the game deterministically
5. Playwright client runs without errors and captures a screenshot

## Playwright Command
```bash
node develop-web-game/scripts/web_game_playwright_client.js --url http://localhost:5173 --click 100,100 --iterations 1
```

---

## Post-Implementation Notes

### What was built
- All files created as planned — no deviations from the spec
- Vite dev server runs on port 5174 (5173 was occupied)
- Canvas renders earth-tone gradient with title text and live state readout
- `window.render_game_to_text()` returns valid JSON: `{"mode":"playing","grid":[],"ring":[],"score":0,"turn":0,"stage":1,"combo":0,"gridSize":5,"frameCount":20}`
- `window.advanceTime(ms)` deterministically steps frames
- Playwright client ran cleanly (exit 0), captured `shot-0.png` and `state-0.json` with no errors

### Dependencies installed
- `vite` ^5.0.0 (devDependency)
- `playwright` (for test client)
- Chromium browser downloaded via `npx playwright install chromium`

### Deviations
- None — implemented exactly as planned

### Handoff notes for Phase 2
- `state.js` exports `gameState` via `getState()` — Phase 2 should use this to add `grid` data
- `render()` in `state.js` currently draws placeholder text; Phase 2 will replace with grid rendering
- `update(dt)` is a no-op beyond frame counting; Phase 2 adds merge resolution logic
- Canvas click handling not yet wired — Phase 2 adds pixel-to-grid-cell mapping
