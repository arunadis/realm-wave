---
description: Add a new Realm Weave feature safely
---

Use this workflow when implementing a new gameplay/UI/meta feature in Realm Weave.

1. Define feature scope and acceptance criteria.
   - Read `docs/realm-weave-plan.md` and latest docs under `docs/phases/`.
   - Write a short spec in `docs/phases/phase-<n>-detail.md` (or append to the next phase doc) with:
     - player-facing behavior
     - state transitions
     - edge cases / failure behavior
     - verification checklist

2. Map code touchpoints before editing.
   - Core gameplay/state: `src/state.js`
   - Input routing + runtime hooks: `src/main.js`
   - UI drawing + hit testing: `src/renderer.js`
   - Stage/mechanic config: `src/stages.js`, `src/hazards.js`, `src/ring.js`, `src/grid.js`
   - Meta systems: `src/upgrades.js`, `src/audio.js`

3. Implement in vertical slices.
   - First add/extend state fields + actions in `src/state.js`.
   - Then wire input/control flow in `src/main.js`.
   - Then render UI and hit-testing in `src/renderer.js`.
   - Keep each slice testable (no large, all-at-once patch).

4. Preserve test observability.
   - Ensure new feature state is represented in `renderGameToText()` so Playwright can verify it.
   - If needed, expose minimal helper hooks on `window` for deterministic checks.

5. Run build and fix integration issues.
   - Command: `npm run build`

6. Validate feature behavior in browser automation.
   - Start dev server (if not already): `npm run dev`
   - Run Playwright loop:
     `node develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:5173 --actions-file develop-web-game/references/action_payloads.json --iterations 3 --pause-ms 250`
   - For targeted states, run a small Playwright probe using `window.render_game_to_text` and save artifacts under `output/web-game`.

7. Review artifacts and regressions.
   - Inspect `output/web-game/shot-*.png` for visual correctness.
   - Inspect `output/web-game/state-*.json` for state transitions.
   - Inspect `output/web-game/errors-*.json` (if generated) and fix first new regression.

8. Update project documentation.
   - Append concise summary to `progress.md`:
     - what changed
     - what was validated
     - remaining ideas/TODOs
   - Update the phase detail doc with actual implementation and deviations.

9. Final handoff checklist.
   - Feature is accessible from intended mode/menu.
   - Keyboard/mouse/touch behavior remains consistent.
   - No new console/runtime errors.
   - Build passes and validation artifacts are captured.
