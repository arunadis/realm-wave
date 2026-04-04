import { chromium } from 'playwright';

function getArgValue(name) {
  const idx = process.argv.findIndex(arg => arg === name || arg.startsWith(`${name}=`));
  if (idx === -1) return null;
  const exact = process.argv[idx];
  if (exact.includes('=')) return exact.split('=').slice(1).join('=');
  return process.argv[idx + 1] || null;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const targetUrl = getArgValue('--url') || process.env.RW_VALIDATE_URL || 'http://localhost:5173/';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });

    const result = await page.evaluate(async () => {
      const mod = await import('/state.js');
      const {
        startStage,
        getState,
        advanceToNextStage,
        handleContinue,
      } = mod;

      const continuity = { ok: false };
      const continueChecks = {};

      startStage(3, { ignoreUnlock: true });
      const state = getState();

      state.highestStageUnlocked = 7;
      state.mode = 'stageclear';
      state.score = 12345;
      state.heldTile = { tier: 2, name: 'village' };
      state.grid[0][0] = { tier: 4, name: 'city' };
      state.currentTile = { tier: 1, name: 'hut' };

      const oldHeldName = state.heldTile.name;
      const oldScore = state.score;
      const oldRingFirstName = state.ring?.slots?.[0]?.name || null;

      const advanced = advanceToNextStage();
      continuity.ok = advanced;
      continuity.stageId = state.stageId;
      continuity.gridSize = state.gridSize;
      continuity.scoreKept = state.score === oldScore;
      continuity.heldKept = state.heldTile?.name === oldHeldName;
      continuity.tilePreserved = state.grid?.[0]?.[0]?.name === 'city';
      continuity.gridExpanded = state.grid?.length === 6 && state.grid?.[5]?.length === 6;
      continuity.ringKept = (state.ring?.slots?.[0]?.name || null) === oldRingFirstName;
      continuity.mode = state.mode;

      state.mode = 'gameover';
      state.continueCount = 0;
      state.totalStars = 2;
      state.currentTile = null;
      let occupiedBefore = 0;
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          state.grid[r][c] = { tier: 0, name: 'tribe' };
          occupiedBefore++;
        }
      }

      const first = handleContinue();
      let occupiedAfterFirst = 0;
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (state.grid[r][c]) occupiedAfterFirst++;
        }
      }

      continueChecks.first = {
        ok: first,
        mode: state.mode,
        continueCount: state.continueCount,
        stars: state.totalStars,
        removed: occupiedBefore - occupiedAfterFirst,
      };

      state.mode = 'gameover';
      state.continueCount = 1;
      state.totalStars = 1;
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          state.grid[r][c] = { tier: 0, name: 'tribe' };
        }
      }

      const second = handleContinue();
      continueChecks.second = {
        ok: second,
        continueCount: state.continueCount,
        stars: state.totalStars,
      };

      state.mode = 'gameover';
      state.continueCount = 2;
      state.totalStars = 0;
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          state.grid[r][c] = { tier: 0, name: 'tribe' };
        }
      }

      const third = handleContinue();
      continueChecks.third = {
        ok: third,
        continueCount: state.continueCount,
        stars: state.totalStars,
      };

      return { continuity, continueChecks };
    });

    assert(result.continuity.ok === true, 'Stage continuation failed to execute.');
    assert(result.continuity.stageId === 4, 'Stage continuation did not advance to stage 4.');
    assert(result.continuity.gridSize === 6, 'Grid did not expand to 6x6 on stage advance.');
    assert(result.continuity.scoreKept === true, 'Score was not preserved across stage advance.');
    assert(result.continuity.heldKept === true, 'Held tile was not preserved across stage advance.');
    assert(result.continuity.tilePreserved === true, 'Grid tile positions were not preserved on expansion.');
    assert(result.continuity.gridExpanded === true, 'Expanded grid shape is incorrect.');
    assert(result.continuity.ringKept === true, 'Ring queue state was not preserved.');
    assert(result.continuity.mode === 'playing', 'Game did not return to playing mode after stage advance.');

    assert(result.continueChecks.first.ok === true, 'First continue should be allowed (free).');
    assert(result.continueChecks.first.mode === 'playing', 'First continue did not return to playing mode.');
    assert(result.continueChecks.first.continueCount === 1, 'Continue count after first continue should be 1.');
    assert(result.continueChecks.first.stars === 2, 'First continue should not consume stars.');
    assert(result.continueChecks.first.removed === 3, 'First continue should remove exactly 3 tiles.');

    assert(result.continueChecks.second.ok === true, 'Second continue should be allowed with 1 star.');
    assert(result.continueChecks.second.continueCount === 2, 'Continue count after second continue should be 2.');
    assert(result.continueChecks.second.stars === 0, 'Second continue should consume 1 star.');

    assert(result.continueChecks.third.ok === false, 'Third continue should fail with 0 stars.');

    console.log('Flow validation passed.');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('Flow validation failed.');
  console.error(error?.message || error);
  process.exit(1);
});
