---
description: Iterative web game build and Playwright validation loop
---

Use this workflow when building or iterating a web game in `develop-web-game`.

1. Confirm scope and capture it in `progress.md`.
   - If missing, create `progress.md` and add: `Original prompt: <user prompt>`.
   - If present, read existing notes/TODOs before changing code.

2. Implement one small game change at a time.
   - Keep each iteration focused (single mechanic, UI state, bugfix, or balancing tweak).

3. Ensure test integration hooks exist.
   - Game should expose `window.render_game_to_text` returning concise JSON state.
   - Prefer deterministic stepping through `window.advanceTime(ms)`.

4. Run the Playwright action loop after each meaningful change.
   - Command:
     `node scripts/web_game_playwright_client.js --url http://localhost:5173 --actions-file references/action_payloads.json --iterations 3 --pause-ms 250`
   - If the game needs a start click, add:
     `--click-selector "#start-btn"`

5. Review generated artifacts under `output/web-game`.
   - Inspect latest `shot-*.png` screenshots visually.
   - Inspect latest `state-*.json` text state.
   - Inspect latest `errors-*.json` and fix the first new error.

6. Validate full interaction chains, not single inputs.
   - Verify move/jump/shoot/interact/menu/pause/restart flows as applicable.
   - Confirm state transitions, score/health/resource updates, and win/lose paths.

7. Iterate until stable.
   - Adjust one variable at a time (input burst, frames, pause, entity tuning).
   - Re-run the loop and re-check screenshots/state after each adjustment.

8. Update `progress.md` after each meaningful step.
   - Record what changed, what was tested, what failed, and next TODOs.

9. Final handoff checklist.
   - No new console/page errors.
   - Screenshots reflect expected gameplay (not only start screen).
   - `render_game_to_text` matches visible game state.
   - Remaining TODOs clearly documented in `progress.md`.
