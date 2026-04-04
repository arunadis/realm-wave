// state.js — Central game state for Realm Weave

import {
  createGrid, createTile, placeTile, resolveMerges,
  isGridFull, hasAnyMerge,
  TIER_NAMES, TIER_COLORS, MAX_TIER,
} from './grid.js';

import {
  createRing, peekNext, popNext, rotateRing,
  holdTile as ringHoldTile, getRingTiles, injectTechTile, injectCursedTile,
} from './ring.js';

import {
  renderFrame,
  getLayoutMetrics,
} from './renderer.js';

import { STAGES, getStage, computeStars } from './stages.js';
import { spawnHazard, tickPollution, spawnWall } from './hazards.js';
import {
  createDefaultUpgradeLevels,
  normalizeUpgradeLevels,
  getUpgradeEffect,
  UPGRADE_DEFS,
  purchaseUpgrade as purchaseMetaUpgrade,
} from './upgrades.js';

const RING_SLOT_COUNT = 6;
const SAVE_KEY = 'realmWeaveProgressV1';
const LEGACY_STARS_KEY = 'realmWeaveStars';
const CURRENT_SAVE_VERSION = 2; // v2 = 7-stage consolidation

// Old 10-stage → New 7-stage ID mapping
// Old 1,2 → New 1 | Old 3 → New 2 | Old 4,5 → New 3
// Old 6 → New 4 | Old 7 → New 5 | Old 8 → New 6 | Old 9,10 → New 7
const STAGE_MIGRATION_MAP = {
  1: 1, 2: 1, 3: 2, 4: 3, 5: 3,
  6: 4, 7: 5, 8: 6, 9: 7, 10: 7,
};

// Highest unlocked stage mapping (proportional remap)
const UNLOCK_MIGRATION_MAP = {
  1: 1, 2: 1, 3: 2, 4: 3, 5: 3,
  6: 4, 7: 5, 8: 6, 9: 7, 10: 7,
};

function migrateProgressV1ToV2(progress) {
  const newStageStars = {};
  const newBestScores = {};
  const newChallenges = {};

  for (const [oldId, stars] of Object.entries(progress.stageStars || {})) {
    const newId = STAGE_MIGRATION_MAP[Number(oldId)];
    if (!newId) continue;
    const key = String(newId);
    newStageStars[key] = Math.max(newStageStars[key] || 0, stars);
  }

  for (const [oldId, score] of Object.entries(progress.bestScores || {})) {
    const newId = STAGE_MIGRATION_MAP[Number(oldId)];
    if (!newId) continue;
    const key = String(newId);
    newBestScores[key] = Math.max(newBestScores[key] || 0, score);
  }

  for (const [oldId, challenges] of Object.entries(progress.completedChallenges || {})) {
    const newId = STAGE_MIGRATION_MAP[Number(oldId)];
    if (!newId) continue;
    const key = String(newId);
    const existing = new Set(newChallenges[key] || []);
    for (const ch of challenges) existing.add(ch);
    newChallenges[key] = [...existing];
  }

  // Recalculate totalStars from migrated data
  let totalStars = 0;
  for (const stars of Object.values(newStageStars)) {
    totalStars += stars;
  }

  const oldUnlock = Number(progress.highestStageUnlocked) || 1;
  const newUnlock = Math.max(1, Math.min(STAGES.length, UNLOCK_MIGRATION_MAP[oldUnlock] || 1));

  return {
    ...progress,
    stageStars: newStageStars,
    bestScores: newBestScores,
    completedChallenges: newChallenges,
    totalStars,
    highestStageUnlocked: newUnlock,
    saveVersion: CURRENT_SAVE_VERSION,
  };
}

function createDefaultStats() {
  return {
    gamesPlayed: 0,
    stagesCleared: 0,
    totalMerges: 0,
    highestChain: 0,
    hazardsSurvived: 0,
  };
}

function normalizeStats(raw) {
  const base = createDefaultStats();
  if (!raw || typeof raw !== 'object') return base;
  return {
    gamesPlayed: Math.max(0, Math.floor(Number(raw.gamesPlayed) || 0)),
    stagesCleared: Math.max(0, Math.floor(Number(raw.stagesCleared) || 0)),
    totalMerges: Math.max(0, Math.floor(Number(raw.totalMerges) || 0)),
    highestChain: Math.max(0, Math.floor(Number(raw.highestChain) || 0)),
    hazardsSurvived: Math.max(0, Math.floor(Number(raw.hazardsSurvived) || 0)),
  };
}

function normalizeCompletedChallenges(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [stageId, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    out[stageId] = [...new Set(list.filter(v => typeof v === 'string'))];
  }
  return out;
}

function createDefaultProgress() {
  return {
    totalStars: 0,
    stageStars: {},
    bestScores: {},
    highestStageUnlocked: 1,
    upgradeLevels: createDefaultUpgradeLevels(),
    tutorialCompleted: false,
    stats: createDefaultStats(),
    completedChallenges: {},
    dailyBestByDate: {},
    colorBlindMode: false,
    reducedMotion: false,
  };
}

function normalizeNumberMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = Math.max(0, Math.floor(n));
  }
  return out;
}

function loadProgress() {
  const fallback = createDefaultProgress();
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) {
      const legacy = localStorage.getItem(LEGACY_STARS_KEY);
      if (!legacy) return fallback;

      const legacyStageStars = normalizeNumberMap(JSON.parse(legacy));
      let totalStars = 0;
      let highestStageUnlocked = 1;
      for (const [id, stars] of Object.entries(legacyStageStars)) {
        totalStars += stars;
        const nextStage = Math.min(STAGES.length, Number(id) + 1);
        if (Number.isFinite(nextStage)) {
          highestStageUnlocked = Math.max(highestStageUnlocked, nextStage);
        }
      }

      return {
        ...fallback,
        totalStars,
        stageStars: legacyStageStars,
        highestStageUnlocked,
      };
    }

    let parsed = JSON.parse(data);

    // Migrate v1 (10-stage) → v2 (7-stage) if needed
    if (!parsed.saveVersion || parsed.saveVersion < CURRENT_SAVE_VERSION) {
      parsed = migrateProgressV1ToV2(parsed);
      // Persist migrated data immediately
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(parsed)); } catch {}
    }

    const stageStars = normalizeNumberMap(parsed.stageStars);
    const bestScores = normalizeNumberMap(parsed.bestScores);
    const totalStars = Math.max(0, Math.floor(Number(parsed.totalStars) || 0));
    const highestStageUnlocked = Math.max(
      1,
      Math.min(STAGES.length, Math.floor(Number(parsed.highestStageUnlocked) || 1))
    );
    const tutorialCompleted = !!parsed.tutorialCompleted;

    return {
      totalStars,
      stageStars,
      bestScores,
      highestStageUnlocked,
      upgradeLevels: normalizeUpgradeLevels(parsed.upgradeLevels),
      tutorialCompleted,
      stats: normalizeStats(parsed.stats),
      completedChallenges: normalizeCompletedChallenges(parsed.completedChallenges),
      dailyBestByDate: normalizeNumberMap(parsed.dailyBestByDate),
      colorBlindMode: !!parsed.colorBlindMode,
      reducedMotion: !!parsed.reducedMotion,
    };
  } catch {
    return fallback;
  }
}

function saveProgressFromState(state) {
  try {
    const payload = {
      saveVersion: CURRENT_SAVE_VERSION,
      totalStars: state.totalStars,
      stageStars: state.stageStars,
      bestScores: state.bestScores,
      highestStageUnlocked: state.highestStageUnlocked,
      upgradeLevels: state.upgradeLevels,
      tutorialCompleted: !!state.tutorialCompleted,
      stats: state.stats,
      completedChallenges: state.completedChallenges,
      dailyBestByDate: state.dailyBestByDate,
      colorBlindMode: !!state.colorBlindMode,
      reducedMotion: !!state.reducedMotion,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures
  }
}

function createStageSelectState() {
  const progress = loadProgress();
  return {
    mode: 'title',
    grid: createGrid(5),
    ring: createRing(RING_SLOT_COUNT),
    heldTile: null,
    score: 0,
    turn: 0,
    stage: 1,
    stageId: 0,
    stageConfig: null,
    combo: 0,
    gridSize: 5,
    frameCount: 0,
    currentTile: null,
    lastMergeEvents: [],
    stars: 0,
    stageStars: progress.stageStars,
    totalStars: progress.totalStars,
    bestScores: progress.bestScores,
    highestStageUnlocked: progress.highestStageUnlocked,
    upgradeLevels: progress.upgradeLevels,
    tutorialCompleted: progress.tutorialCompleted,
    shopReturnMode: 'stageselect',
    guideReturnMode: 'title',
    statsReturnMode: 'title',
    audioMuted: false,
    fullscreenActive: false,
    lastUpgradePurchase: null,
    holdUnlocked: false,
    catalystUnlocked: false,
    comboX3Unlocked: false,
    catalystMode: false,
    catalystFirst: null,
    catalystCharges: 0,
    techTileUnlocked: false,
    holdCostsCharge: false,
    lastHazardEvent: null,
    lastPollutionEvent: null,
    lastCursedEvent: null,
    lastWallEvent: null,
    lastWallBreakEvents: [],
    screenShake: 0,
    mergeFlashes: [],
    comboPopup: null,
    placementAnim: null,
    transition: null,
    hazardFlash: null,
    hoverCell: null,
    tutorialStep: 0,
    tutorialStepTimer: 0,
    tutorialPlacementCount: 0,
    mechanicNotification: null,
    hint: null,
    turnsSinceHold: 0,
    turnsSinceCatalyst: 0,
    stats: progress.stats,
    completedChallenges: progress.completedChallenges,
    challengeCounters: null,
    dailyChallengeActive: false,
    dailyDateKey: null,
    dailySeed: null,
    dailyBestScore: 0,
    dailyBestByDate: progress.dailyBestByDate,
    colorBlindMode: !!progress.colorBlindMode,
    reducedMotion: !!progress.reducedMotion,
    selectedStageIndex: 0,
    selectedUpgradeIndex: 0,
    stageSelectScrollY: 0,
  };
}

export let gameState = createStageSelectState();

export function resetState() {
  gameState = createStageSelectState();
  return gameState;
}

export function getState() {
  return gameState;
}

function setModeWithTransition(nextMode) {
  if (gameState.mode === nextMode) return;
  gameState.transition = {
    from: gameState.mode,
    to: nextMode,
    timer: 0.2,
    duration: 0.2,
  };
  gameState.mode = nextMode;
}

// --- Start a stage ---

function createChallengeCounters() {
  return {
    holdUses: 0,
    catalystTier4: false,
    raidsSurvived: 0,
    highestChain: 0,
    techMerges: 0,
    rotateUses: 0,
    floodLosses: 0,
    decayHits: 0,
    wallSpawns: 0,
    wallBreaks: 0,
  };
}

function applyCursedDecay(row, col) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const affected = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= gameState.gridSize || nc < 0 || nc >= gameState.gridSize) continue;
    const tile = gameState.grid[nr][nc];
    if (!tile || tile.type === 'hazard' || tile.type === 'wall' || tile.isTech || tile.isCursed) continue;
    if (tile.tier <= 0) {
      affected.push({ row: nr, col: nc, fromTier: tile.tier, toTier: -1, destroyed: true });
      gameState.grid[nr][nc] = null;
    } else {
      const nextTier = tile.tier - 1;
      affected.push({ row: nr, col: nc, fromTier: tile.tier, toTier: nextTier, destroyed: false });
      gameState.grid[nr][nc] = createTile(nextTier);
    }
  }
  gameState.grid[row][col] = null;
  return affected;
}

function hasPollutionOnBoard(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tile = grid[r][c];
      if (tile && tile.type === 'hazard' && tile.hazardKind === 'pollution') {
        return true;
      }
    }
  }
  return false;
}

function evaluateStageChallenges(config) {
  const list = config?.challenges || [];
  const completed = [];
  const counters = gameState.challengeCounters || createChallengeCounters();
  for (const ch of list) {
    if (!ch || !ch.id) continue;
    let ok = false;
    if (ch.type === 'maxTurn') ok = gameState.turn <= Number(ch.value || 0);
    if (ch.type === 'maxFloodLosses') ok = counters.floodLosses <= Number(ch.value || 0);
    if (ch.type === 'minHoldUses') ok = counters.holdUses >= Number(ch.value || 0);
    if (ch.type === 'catalystTier4') ok = counters.catalystTier4 === true;
    if (ch.type === 'minRaidsSurvived') ok = counters.raidsSurvived >= Number(ch.value || 0);
    if (ch.type === 'minHighestChain') ok = counters.highestChain >= Number(ch.value || 0);
    if (ch.type === 'clearWithPollution') ok = hasPollutionOnBoard(gameState.grid);
    if (ch.type === 'minTechMerges') ok = counters.techMerges >= Number(ch.value || 0);
    if (ch.type === 'maxRotateUses') ok = counters.rotateUses <= Number(ch.value || 0);
    if (ch.type === 'minScore') ok = gameState.score >= Number(ch.value || 0);
    if (ok) completed.push(ch.id);
  }
  return completed;
}

function updateDailyBest() {
  if (!gameState.dailyChallengeActive || !gameState.dailyDateKey) return;
  const prev = Number(gameState.dailyBestByDate?.[gameState.dailyDateKey]) || 0;
  if (gameState.score > prev) {
    gameState.dailyBestByDate[gameState.dailyDateKey] = gameState.score;
    gameState.dailyBestScore = gameState.score;
    saveProgressFromState(gameState);
  } else {
    gameState.dailyBestScore = prev;
  }
}

function getTodayDateKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function startDailyChallenge() {
  const dateKey = getTodayDateKey();
  const seed = Number(dateKey);
  const ok = startStage(4, {
    dailyChallenge: true,
    dailyDateKey: dateKey,
    seed,
    ignoreUnlock: true,
  });
  if (!ok) return false;
  gameState.dailyBestScore = Number(gameState.dailyBestByDate?.[dateKey]) || 0;
  return true;
}

export function startStage(stageId, options = {}) {
  const config = getStage(stageId);
  if (!config) return false;

  if (stageId > gameState.highestStageUnlocked && !options.ignoreUnlock) return false;

  const deeperRing = getUpgradeEffect('deeperRing', gameState.upgradeLevels);
  const ringSlots = (config.ringSlots || RING_SLOT_COUNT) + deeperRing;
  const ring = createRing(ringSlots, options.seed ?? null, { tierWeights: config.tierWeights });
  const currentTile = popNext(ring);

  setModeWithTransition('playing');
  gameState.grid = createGrid(config.gridSize);
  gameState.ring = ring;
  gameState.heldTile = null;
  gameState.score = 0;
  gameState.turn = 0;
  gameState.stage = config.id;
  gameState.stageId = config.id;
  gameState.stageConfig = config;
  gameState.combo = 0;
  gameState.gridSize = config.gridSize;
  gameState.currentTile = currentTile;
  gameState.lastMergeEvents = [];
  gameState.stars = 0;
  gameState.holdUnlocked = config.mechanics.includes('hold');
  gameState.catalystUnlocked = config.mechanics.includes('catalyst');
  gameState.comboX3Unlocked = config.mechanics.includes('comboX3');
  gameState.catalystMode = false;
  gameState.catalystFirst = null;
  gameState.catalystCharges = config.mechanics.includes('catalyst') ? 1 : 0;
  gameState.techTileUnlocked = config.mechanics.includes('techTile');
  gameState.holdCostsCharge = config.mechanics.includes('holdCostsCharge');
  gameState.discardUnlocked = config.mechanics.includes('discard');
  gameState.discardCount = 0;
  gameState.scoreBleedActive = false;
  gameState.lastBleedAmount = 0;
  gameState.lastHazardEvent = null;
  gameState.lastPollutionEvent = null;
  gameState.lastCursedEvent = null;
  gameState.lastWallEvent = null;
  gameState.lastWallBreakEvents = [];
  gameState.lastDecayEvent = null;
  gameState.frozenCells = [];
  gameState.screenShake = 0;
  gameState.mergeFlashes = [];
  gameState.comboPopup = null;
  gameState.placementAnim = null;
  gameState.hazardFlash = null;
  gameState.hoverCell = null;
  gameState.noMergeStreak = 0;
  gameState.tutorialPlacementCount = 0;
  if (stageId === 1 && !gameState.tutorialCompleted) {
    gameState.tutorialStep = 1;
    gameState.tutorialStepTimer = 0;
  } else {
    gameState.tutorialStep = 0;
    gameState.tutorialStepTimer = 0;
  }

  const prevConfig = getStage(stageId - 1);
  const prevMechanics = prevConfig?.mechanics || [];
  const newMechanics = (config.mechanics || []).filter(m => !prevMechanics.includes(m));
  gameState.mechanicNotification = newMechanics.length > 0
    ? { mechanics: newMechanics, timer: 4, duration: 4 }
    : null;

  gameState.hint = null;
  gameState.turnsSinceHold = 0;
  gameState.turnsSinceCatalyst = 0;
  gameState.lastUpgradePurchase = null;
  gameState.challengeCounters = createChallengeCounters();
  gameState.dailyChallengeActive = !!options.dailyChallenge;
  gameState.dailyDateKey = options.dailyDateKey || null;
  gameState.dailySeed = options.seed ?? null;
  gameState.stats.gamesPlayed += 1;

  return true;
}

export function goToStageSelect() {
  setModeWithTransition('stageselect');
  gameState.currentTile = null;
  gameState.hoverCell = null;
  gameState.hint = null;
  gameState.lastUpgradePurchase = null;
  gameState.stageSelectScrollY = 0;
  gameState.selectedStageIndex = Math.max(
    0,
    Math.min(STAGES.length - 1, (gameState.highestStageUnlocked || 1) - 1)
  );
}

export function openTitleMenu() {
  setModeWithTransition('title');
  gameState.currentTile = null;
  gameState.hoverCell = null;
  gameState.hint = null;
  gameState.lastUpgradePurchase = null;
}

export function openStageSelect() {
  setModeWithTransition('stageselect');
  gameState.currentTile = null;
  gameState.hoverCell = null;
  gameState.hint = null;
  gameState.lastUpgradePurchase = null;
  gameState.stageSelectScrollY = 0;
  gameState.selectedStageIndex = Math.max(
    0,
    Math.min(STAGES.length - 1, (gameState.highestStageUnlocked || 1) - 1)
  );
}

export function skipTutorial() {
  if (gameState.tutorialStep <= 0) return false;
  gameState.tutorialStep = -1;
  gameState.tutorialStepTimer = 0;
  gameState.tutorialCompleted = true;
  saveProgressFromState(gameState);
  return true;
}

export function setHoverCell(row, col) {
  if (gameState.mode !== 'playing') return false;
  if (row == null || col == null) {
    gameState.hoverCell = null;
    return true;
  }
  if (row < 0 || row >= gameState.gridSize || col < 0 || col >= gameState.gridSize) {
    gameState.hoverCell = null;
    return false;
  }
  gameState.hoverCell = { row, col };
  return true;
}

export function clearHoverCell() {
  gameState.hoverCell = null;
}

export function toggleColorBlindMode() {
  gameState.colorBlindMode = !gameState.colorBlindMode;
  saveProgressFromState(gameState);
  return gameState.colorBlindMode;
}

export function setReducedMotion(enabled) {
  gameState.reducedMotion = !!enabled;
  saveProgressFromState(gameState);
  return gameState.reducedMotion;
}

export function toggleReducedMotion() {
  gameState.reducedMotion = !gameState.reducedMotion;
  saveProgressFromState(gameState);
  return gameState.reducedMotion;
}

export function setStageSelectScroll(y, maxScroll) {
  gameState.stageSelectScrollY = Math.max(0, Math.min(maxScroll, y));
}

export function getStageSelectScroll() {
  return gameState.stageSelectScrollY || 0;
}

export function moveSelectedStage(delta) {
  const unlockedMax = Math.max(0, Math.min(STAGES.length - 1, (gameState.highestStageUnlocked || 1) - 1));
  const current = Math.max(0, Math.min(unlockedMax, Number(gameState.selectedStageIndex) || 0));
  const next = Math.max(0, Math.min(unlockedMax, current + delta));
  gameState.selectedStageIndex = next;
  return next;
}

export function moveSelectedUpgrade(delta) {
  const max = Math.max(0, UPGRADE_DEFS.length - 1);
  const current = Math.max(0, Math.min(max, Number(gameState.selectedUpgradeIndex) || 0));
  const next = Math.max(0, Math.min(max, current + delta));
  gameState.selectedUpgradeIndex = next;
  return next;
}

export function openUpgradeShop() {
  if (gameState.mode !== 'stageselect' && gameState.mode !== 'title') return false;
  gameState.shopReturnMode = gameState.mode;
  setModeWithTransition('upgradeshop');
  gameState.lastUpgradePurchase = null;
  gameState.selectedUpgradeIndex = Math.max(
    0,
    Math.min(UPGRADE_DEFS.length - 1, Number(gameState.selectedUpgradeIndex) || 0)
  );
  return true;
}

export function openGuide() {
  if (gameState.mode !== 'stageselect' && gameState.mode !== 'title') return false;
  gameState.guideReturnMode = gameState.mode;
  setModeWithTransition('guide');
  gameState.lastUpgradePurchase = null;
  return true;
}

export function closeGuide() {
  if (gameState.mode !== 'guide') return false;
  setModeWithTransition(gameState.guideReturnMode === 'stageselect' ? 'stageselect' : 'title');
  return true;
}

export function openStats() {
  if (gameState.mode !== 'stageselect' && gameState.mode !== 'title') return false;
  gameState.statsReturnMode = gameState.mode;
  setModeWithTransition('stats');
  return true;
}

export function closeStats() {
  if (gameState.mode !== 'stats') return false;
  setModeWithTransition(gameState.statsReturnMode === 'stageselect' ? 'stageselect' : 'title');
  return true;
}

export function closeUpgradeShop() {
  if (gameState.mode !== 'upgradeshop') return false;
  setModeWithTransition(gameState.shopReturnMode === 'title' ? 'title' : 'stageselect');
  return true;
}

export function togglePause() {
  if (gameState.mode === 'playing') {
    setModeWithTransition('paused');
    return true;
  }
  if (gameState.mode === 'paused') {
    setModeWithTransition('playing');
    return true;
  }
  return false;
}

export function leavePauseToStageSelect() {
  if (gameState.mode !== 'paused') return false;
  goToStageSelect();
  return true;
}

export function setAudioMuted(muted) {
  gameState.audioMuted = !!muted;
}

export function setFullscreenActive(active) {
  gameState.fullscreenActive = !!active;
}

export function purchaseUpgrade(id) {
  if (gameState.mode !== 'upgradeshop') return { ok: false, reason: 'mode' };
  const result = purchaseMetaUpgrade(gameState, id);
  gameState.lastUpgradePurchase = result;
  if (result.ok) saveProgressFromState(gameState);
  return result;
}

function getRotateChargeCap() {
  if (!gameState.ring) return 0;
  const echo = getUpgradeEffect('comboEcho', gameState.upgradeLevels);
  return gameState.ring.maxRotateCharges + 1 + echo;
}

function applyFortifyOnPlacedTile(row, col) {
  const tile = gameState.grid[row]?.[col];
  if (!tile || tile.type === 'hazard' || tile.isTech || tile.tier !== 0) return;
  const fortifyLevel = getUpgradeEffect('fortify', gameState.upgradeLevels);
  if (fortifyLevel <= 0) return;
  tile.fortifyCharges = fortifyLevel;
}

function applyHazardMitigationAndSalvage(destroyed) {
  if (!destroyed || destroyed.length === 0) return [];

  const fortifyEnabled = getUpgradeEffect('fortify', gameState.upgradeLevels) > 0;
  const salvageRate = getUpgradeEffect('salvage', gameState.upgradeLevels);
  const finalDestroyed = [];
  let salvageScore = 0;

  for (const victim of destroyed) {
    const tile = victim.tile;
    if (!tile || tile.type === 'hazard') continue;

    if (fortifyEnabled && tile.tier === 0 && (tile.fortifyCharges || 0) > 0) {
      tile.fortifyCharges -= 1;
      gameState.grid[victim.row][victim.col] = tile;
      continue;
    }

    finalDestroyed.push(victim);
    if (salvageRate > 0 && tile.tier >= 0) {
      const baseValue = (tile.tier + 1) * 100;
      salvageScore += Math.round(baseValue * salvageRate);
    }
  }

  if (salvageScore > 0) {
    gameState.score += salvageScore;
  }

  return finalDestroyed;
}

function handleStageClear(config) {
  const stars = computeStars(config, gameState.turn);
  gameState.stars = stars;
  setModeWithTransition('stageclear');
  gameState.currentTile = null;
  gameState.hoverCell = null;
  gameState.hint = null;

  if (config.id === 1 && !gameState.tutorialCompleted) {
    gameState.tutorialCompleted = true;
    gameState.tutorialStep = -1;
    gameState.tutorialStepTimer = 0;
  }

  const prevStars = gameState.stageStars[config.id] || 0;
  if (stars > prevStars) {
    gameState.stageStars[config.id] = stars;
    gameState.totalStars += stars - prevStars;
  }

  const prevBestScore = gameState.bestScores[config.id] || 0;
  if (gameState.score > prevBestScore) {
    gameState.bestScores[config.id] = gameState.score;
  }

  gameState.highestStageUnlocked = Math.max(
    gameState.highestStageUnlocked,
    Math.min(STAGES.length, config.id + 1)
  );

  gameState.stats.stagesCleared += 1;
  const completed = evaluateStageChallenges(config);
  const stageKey = String(config.id);
  const prior = new Set(gameState.completedChallenges[stageKey] || []);
  for (const ch of completed) prior.add(ch);
  gameState.completedChallenges[stageKey] = [...prior];

  updateDailyBest();

  saveProgressFromState(gameState);
}

// --- Serialization ---

export function renderGameToText() {
  const gridCompact = gameState.grid.map(row =>
    row.map(cell => {
      if (!cell) return null;
      if (cell.type === 'hazard') {
        const h = { type: 'hazard', kind: cell.hazardKind };
        if (cell.turnsRemaining !== undefined) h.turnsRemaining = cell.turnsRemaining;
        return h;
      }
      if (cell.type === 'wall') {
        return { type: 'wall', durability: cell.durability || 1 };
      }
      if (cell.isTech) return { type: 'tech', name: 'tech' };
      if (cell.isCursed) return { type: 'cursed', name: 'cursed' };
      const tile = { tier: cell.tier, name: cell.name };
      if (cell.placedTurn != null) tile.placedTurn = cell.placedTurn;
      return tile;
    })
  );
  const ringTiles = gameState.ring ? getRingTiles(gameState.ring).map(t => ({ tier: t.tier, name: t.name })) : [];
  return JSON.stringify({
    mode: gameState.mode,
    grid: gridCompact,
    ring: ringTiles,
    heldTile: gameState.heldTile,
    score: gameState.score,
    turn: gameState.turn,
    stageId: gameState.stageId,
    stage: gameState.stage,
    combo: gameState.combo,
    gridSize: gameState.gridSize,
    currentTile: gameState.currentTile,
    rotateCharges: gameState.ring ? gameState.ring.rotateCharges : 0,
    stars: gameState.stars,
    totalStars: gameState.totalStars,
    holdUnlocked: gameState.holdUnlocked,
    holdCostsCharge: gameState.holdCostsCharge,
    catalystUnlocked: gameState.catalystUnlocked,
    comboX3Unlocked: gameState.comboX3Unlocked,
    techTileUnlocked: gameState.techTileUnlocked,
    discardUnlocked: gameState.discardUnlocked,
    discardCount: gameState.discardCount,
    scoreBleedActive: gameState.scoreBleedActive,
    lastBleedAmount: gameState.lastBleedAmount,
    audioMuted: gameState.audioMuted,
    fullscreenActive: gameState.fullscreenActive,
    highestStageUnlocked: gameState.highestStageUnlocked,
    guideReturnMode: gameState.guideReturnMode,
    upgradeLevels: gameState.upgradeLevels,
    bestScores: gameState.bestScores,
    stats: gameState.stats,
    completedChallenges: gameState.completedChallenges,
    challengeCounters: gameState.challengeCounters,
    dailyChallengeActive: gameState.dailyChallengeActive,
    dailyDateKey: gameState.dailyDateKey,
    dailySeed: gameState.dailySeed,
    dailyBestScore: gameState.dailyBestScore,
    colorBlindMode: gameState.colorBlindMode,
    reducedMotion: gameState.reducedMotion,
    selectedStageIndex: gameState.selectedStageIndex,
    selectedUpgradeIndex: gameState.selectedUpgradeIndex,
    lastCursedEvent: gameState.lastCursedEvent,
    lastWallEvent: gameState.lastWallEvent,
    lastWallBreakEvents: gameState.lastWallBreakEvents,
    lastDecayEvent: gameState.lastDecayEvent,
    frameCount: gameState.frameCount,
    hoverCell: gameState.hoverCell,
    noMergeStreak: gameState.noMergeStreak,
    frozenCells: gameState.frozenCells,
    tutorialStep: gameState.tutorialStep,
    mechanicNotification: gameState.mechanicNotification,
  });
}

function maybeAdvanceTutorialAfterPlacement(mergeCount) {
  if (gameState.tutorialStep <= 0) return;
  if (gameState.stageId !== 1) return;

  if (gameState.tutorialStep === 1) {
    gameState.tutorialStep = 2;
    return;
  }

  if (gameState.tutorialStep === 2) {
    if (mergeCount > 0 || gameState.tutorialPlacementCount >= 2) {
      gameState.tutorialStep = 3;
    }
  }
}

function maybeSetContextHint() {
  if (gameState.mode !== 'playing') return;
  if (gameState.tutorialStep > 0) return;
  if (!gameState.stageConfig) return;

  const gridCells = gameState.gridSize * gameState.gridSize;
  let occupied = 0;
  const tierCounts = {};
  for (let r = 0; r < gameState.gridSize; r++) {
    for (let c = 0; c < gameState.gridSize; c++) {
      const tile = gameState.grid[r][c];
      if (!tile || tile.type === 'hazard' || tile.type === 'wall' || tile.isTech || tile.isCursed) continue;
      occupied++;
      tierCounts[tile.tier] = (tierCounts[tile.tier] || 0) + 1;
    }
  }
  const fillRatio = gridCells > 0 ? occupied / gridCells : 0;

  let hintText = null;
  if (fillRatio >= 0.8 && gameState.holdUnlocked && gameState.turnsSinceHold >= 5) {
    hintText = 'Tip: Press H to hold your tile';
  } else if (
    fillRatio >= 0.8
    && gameState.catalystUnlocked
    && gameState.catalystCharges > 0
    && gameState.turnsSinceCatalyst >= 5
  ) {
    hintText = 'Tip: Press C to force-merge two tiles';
  } else if (Object.values(tierCounts).some(count => count >= 3)) {
    hintText = 'Tip: Rotate the ring (Q/E) to find a match';
  } else if (
    gameState.score < gameState.stageConfig.target * 0.5
    && gameState.turn > gameState.stageConfig.turnLimit2Star * 0.7
  ) {
    hintText = 'Tip: Chain merges multiply score!';
  }

  if (!hintText) return;
  if (gameState.hint && gameState.hint.text === hintText && gameState.hint.timer > 0.8) return;

  gameState.hint = { text: hintText, timer: 3, duration: 3 };
}

// --- Grid layout helpers (exported for click mapping) ---

export function getGridLayout(canvasW, canvasH) {
  const gridSize = gameState.gridSize;
  const metrics = getLayoutMetrics(canvasW, canvasH);
  const availW = canvasW - metrics.gridPadding * 2;
  const topOffset = metrics.topInset + metrics.hudHeight + metrics.ringAreaHeight;
  const availH = canvasH - topOffset - metrics.gridPadding * 2;
  const cellSize = Math.floor(Math.min(availW, availH) / gridSize);
  const gridW = cellSize * gridSize;
  const gridH = cellSize * gridSize;
  const originX = Math.floor((canvasW - gridW) / 2);
  const originY = topOffset + Math.max(0, Math.floor((availH - gridH) / 2));
  return { originX, originY, cellSize, gridW, gridH, gridSize };
}

export function pixelToCell(px, py, canvasW, canvasH) {
  const { originX, originY, cellSize, gridSize } = getGridLayout(canvasW, canvasH);
  const col = Math.floor((px - originX) / cellSize);
  const row = Math.floor((py - originY) / cellSize);
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
  return { row, col };
}

// --- Tile placement action ---

function isCellFrozen(row, col) {
  return gameState.frozenCells.some(cell => cell.row === row && cell.col === col);
}

function tickTileDecay() {
  const threshold = gameState.stageConfig?.decayAfter;
  if (!threshold || threshold <= 0) return { decayed: [], destroyed: [] };
  
  const decayed = [];
  const destroyed = [];
  
  for (let row = 0; row < gameState.grid.length; row++) {
    for (let col = 0; col < gameState.grid[row].length; col++) {
      const tile = gameState.grid[row][col];
      if (!tile || tile.type || tile.isTech || tile.isCursed) continue; // Skip special tiles
      
      const age = gameState.turn - (tile.placedTurn || 0);
      if (age >= threshold) {
        if (tile.tier > 0) {
          // Downgrade tile
          tile.tier--;
          tile.name = TIER_NAMES[tile.tier];
          tile.placedTurn = gameState.turn; // Reset timer
          decayed.push({ row, col, fromTier: tile.tier + 1, toTier: tile.tier });
        } else {
          // Destroy tier-0 tile
          gameState.grid[row][col] = null;
          destroyed.push({ row, col });
        }
      }
    }
  }
  
  return { decayed, destroyed };
}

export function handlePlacement(row, col) {
  if (gameState.mode !== 'playing') return false;
  if (!gameState.currentTile) return false;
  if (isCellFrozen(row, col)) return false; // Block placement on frozen cells

  const success = placeTile(gameState.grid, row, col, gameState.currentTile);
  if (!success) return false;

  // Set placedTurn on the newly placed tile
  const placedTile = gameState.grid[row][col];
  if (placedTile && !placedTile.type) {
    placedTile.placedTurn = gameState.turn;
  }

  gameState.placementAnim = {
    row,
    col,
    timer: 0.15,
    duration: 0.15,
  };

  applyFortifyOnPlacedTile(row, col);

  gameState.lastCursedEvent = null;
  gameState.lastWallEvent = null;
  gameState.lastWallBreakEvents = [];

  if (gameState.currentTile?.isCursed) {
    const affected = applyCursedDecay(row, col);
    gameState.lastCursedEvent = { row, col, affected };
    if (gameState.challengeCounters) {
      gameState.challengeCounters.decayHits += affected.length;
    }
  }

  // Resolve merges
  const { events, scoreGained, wallHits, wallBroken } = resolveMerges(gameState.grid);
  let finalScore = scoreGained;

  // Combo x3 bonus: if 3+ chain merges, triple the last merge's score
  if (gameState.comboX3Unlocked && events.length >= 3) {
    const lastMerge = events[events.length - 1];
    finalScore += lastMerge.scoreGained * 2; // already counted 1x, add 2x more = 3x total
  }

  gameState.score += finalScore;
  gameState.combo = events.length;
  gameState.lastMergeEvents = events;
  gameState.lastWallBreakEvents = wallBroken;
  gameState.stats.totalMerges += events.length;
  gameState.stats.highestChain = Math.max(gameState.stats.highestChain, events.length);
  
  // Set placedTurn on merged result tiles (fresh timer)
  for (const ev of events) {
    const resultTile = gameState.grid[ev.row][ev.col];
    if (resultTile && !resultTile.type) {
      resultTile.placedTurn = gameState.turn;
    }
  }
  
  gameState.turn++;
  gameState.tutorialPlacementCount++;
  gameState.turnsSinceHold++;
  gameState.turnsSinceCatalyst++;

  maybeAdvanceTutorialAfterPlacement(events.length);

  // --- Stagnation penalty tracking ---
  if (events.length === 0) {
    gameState.noMergeStreak++;
  } else {
    gameState.noMergeStreak = 0;
  }

  // Check stagnation threshold and spawn hazard if exceeded
  const config = gameState.stageConfig;
  if (config && config.stagnationThreshold && gameState.noMergeStreak >= config.stagnationThreshold) {
    const hazardTypes = config.hazardTypes || ['flood'];
    const hazardResult = spawnHazard(gameState.grid, null, hazardTypes);
    if (hazardResult) {
      // Play stagnation warning sound
      if (window.audio) {
        window.audio.play('stagnation');
      }
      // Show stagnation notification
      gameState.hint = {
        text: 'Stagnation!',
        timer: 1.5,
        duration: 1.5,
      };
      gameState.lastHazardEvent = hazardResult;
      gameState.stats.hazardsSurvived += 1;
      if (hazardResult.row != null && hazardResult.col != null) {
        gameState.hazardFlash = {
          row: hazardResult.row,
          col: hazardResult.col,
          kind: hazardResult.kind,
          timer: hazardResult.kind === 'earthquake' ? 0.55 : 0.4,
          duration: hazardResult.kind === 'earthquake' ? 0.55 : 0.4,
        };
        if (!gameState.reducedMotion && hazardResult.kind === 'earthquake') {
          gameState.screenShake = Math.max(gameState.screenShake, 0.5);
        }
      }
    }
    gameState.noMergeStreak = 0; // Reset after triggering
  }

  // --- Score bleed logic ---
  if (config && gameState.turn > config.turnLimit3Star) {
    const rate = config.scoreBleedRate || 0.005;
    const bleed = Math.floor(config.target * rate);
    gameState.score = Math.max(0, gameState.score - bleed);
    gameState.scoreBleedActive = true;
    gameState.lastBleedAmount = bleed;
  } else {
    gameState.scoreBleedActive = false;
    gameState.lastBleedAmount = 0;
  }

  // --- Visual effects ---
  // Merge flash on each merged tile
  gameState.mergeFlashes = gameState.reducedMotion
    ? []
    : events.map(ev => ({
      row: ev.row,
      col: ev.col,
      tier: ev.toTier,
      chainIndex: ev.chainIndex,
      scoreGained: ev.scoreGained,
      timer: 0.5,
      duration: 0.5,
    }));
  // Combo popup when 2+ chain
  if (!gameState.reducedMotion && events.length >= 2) {
    gameState.comboPopup = {
      combo: events.length,
      score: finalScore,
      timer: 1.2,
      duration: 1.2,
    };
  } else {
    gameState.comboPopup = null;
  }
  // Screen shake on 3+ chain
  if (!gameState.reducedMotion && events.length >= 3) {
    gameState.screenShake = 0.35;
  }
  if (gameState.challengeCounters) {
    gameState.challengeCounters.highestChain = Math.max(
      gameState.challengeCounters.highestChain,
      events.length
    );
    if (gameState.currentTile?.isTech && events.length > 0) {
      gameState.challengeCounters.techMerges += 1;
    }
    if (wallBroken.length > 0) {
      gameState.challengeCounters.wallBreaks += wallBroken.length;
    }
  }
  // Ring charge bonus: 4+ chain grants +1 rotate charge
  if (events.length >= 4 && gameState.ring) {
    gameState.ring.rotateCharges = Math.min(
      gameState.ring.rotateCharges + 1,
      getRotateChargeCap()
    );
  }

  const comboEchoLevel = getUpgradeEffect('comboEcho', gameState.upgradeLevels);
  if (events.length >= 3 && comboEchoLevel > 0 && gameState.ring) {
    gameState.ring.rotateCharges = Math.min(
      gameState.ring.rotateCharges + comboEchoLevel,
      getRotateChargeCap()
    );
  }

  if (wallHits.length > 0 && !gameState.reducedMotion) {
    gameState.screenShake = Math.max(gameState.screenShake, 0.16);
  }

  // Check stage clear: score >= target
  if (config && gameState.score >= config.target) {
    handleStageClear(config);
    return true;
  }

  // Tick pollution tiles (damage adjacent, decrement turns)
  const pollResult = tickPollution(gameState.grid);
  const pollutionDestroyed = applyHazardMitigationAndSalvage(pollResult.destroyed);
  gameState.lastPollutionEvent = (pollutionDestroyed.length > 0 || pollResult.expired.length > 0)
    ? { ...pollResult, destroyed: pollutionDestroyed }
    : null;

  // Spawn hazard if applicable
  if (config && config.hazardFreq > 0 && gameState.turn > 0 && gameState.turn % config.hazardFreq === 0) {
    const hazardTypes = config.hazardTypes || ['flood'];
    const hazardResult = spawnHazard(gameState.grid, null, hazardTypes);
    if (hazardResult && hazardResult.destroyed) {
      const adjustedDestroyed = applyHazardMitigationAndSalvage(hazardResult.destroyed);
      gameState.lastHazardEvent = { ...hazardResult, destroyed: adjustedDestroyed };
      gameState.stats.hazardsSurvived += 1;
      if (gameState.challengeCounters) {
        if (hazardResult.kind === 'raid') {
          gameState.challengeCounters.raidsSurvived += 1;
        }
        if (hazardResult.kind === 'flood') {
          gameState.challengeCounters.floodLosses += adjustedDestroyed.length;
        }
      }
    } else {
      gameState.lastHazardEvent = hazardResult;
      if (hazardResult) gameState.stats.hazardsSurvived += 1;
    }
    if (hazardResult && hazardResult.row != null && hazardResult.col != null) {
      gameState.hazardFlash = {
        row: hazardResult.row,
        col: hazardResult.col,
        kind: hazardResult.kind,
        timer: hazardResult.kind === 'earthquake' ? 0.55 : 0.4,
        duration: hazardResult.kind === 'earthquake' ? 0.55 : 0.4,
      };
      if (!gameState.reducedMotion && hazardResult.kind === 'earthquake') {
        gameState.screenShake = Math.max(gameState.screenShake, 0.5);
      }
    }
  } else {
    gameState.lastHazardEvent = null;
  }

  if (config && config.wallFreq > 0 && gameState.turn > 0 && gameState.turn % config.wallFreq === 0) {
    const wallResult = spawnWall(gameState.grid, { rng: gameState.ring?.rng, durability: config.wallDurability || 3 });
    gameState.lastWallEvent = wallResult;
    if (wallResult && gameState.challengeCounters) {
      gameState.challengeCounters.wallSpawns += 1;
    }
  }

  // Inject tech tile into ring periodically
  if (gameState.techTileUnlocked && config && config.techTileFreq > 0 &&
      gameState.turn > 0 && gameState.turn % config.techTileFreq === 0) {
    injectTechTile(gameState.ring);
  }

  if (config && config.cursedTileFreq > 0 && gameState.turn > 0 && gameState.turn % config.cursedTileFreq === 0) {
    injectCursedTile(gameState.ring);
  }

  // Tick tile decay
  const decayResult = tickTileDecay();
  if (decayResult.decayed.length > 0 || decayResult.destroyed.length > 0) {
    gameState.lastDecayEvent = decayResult;
    // Play decay sound
    if (window.audio) {
      window.audio.play('decay');
    }
    // Add visual effects for decayed/destroyed tiles
    if (!gameState.reducedMotion) {
      for (const destroyed of decayResult.destroyed) {
        gameState.mergeFlashes.push({
          row: destroyed.row,
          col: destroyed.col,
          tier: -1, // Special tier for destroy effect
          chainIndex: -1,
          scoreGained: 0,
          timer: 0.3,
          duration: 0.3,
        });
      }
    }
  } else {
    gameState.lastDecayEvent = null;
  }

  // --- Frozen cells thaw/freeze logic ---
  // Thaw: decrement turns left and remove expired frozen cells
  const thawedCells = [];
  gameState.frozenCells = gameState.frozenCells.filter(cell => {
    cell.turnsLeft--;
    if (cell.turnsLeft <= 0) {
      thawedCells.push({ row: cell.row, col: cell.col });
      return false;
    }
    return true;
  });

  // Freeze: add new frozen cells if frequency condition met
  const newlyFrozenCells = [];
  if (config && config.frozenCellFreq && gameState.turn > 0 && gameState.turn % config.frozenCellFreq === 0) {
    const count = config.frozenCellCount || 1;
    const duration = config.frozenCellDuration || 4;
    
    // Find all empty, non-frozen cells
    const emptyCells = [];
    for (let row = 0; row < gameState.gridSize; row++) {
      for (let col = 0; col < gameState.gridSize; col++) {
        if (!gameState.grid[row][col] && !isCellFrozen(row, col)) {
          emptyCells.push({ row, col });
        }
      }
    }
    
    // Randomly select cells to freeze
    if (emptyCells.length > 0) {
      const cellsToFreeze = Math.min(count, emptyCells.length);
      for (let i = 0; i < cellsToFreeze; i++) {
        const idx = Math.floor(Math.random() * emptyCells.length);
        const cell = emptyCells.splice(idx, 1)[0];
        gameState.frozenCells.push({
          row: cell.row,
          col: cell.col,
          turnsLeft: duration
        });
        newlyFrozenCells.push(cell);
      }
    }
  }

  // Play freeze sound if new cells were frozen
  if (newlyFrozenCells.length > 0 && window.audio) {
    window.audio.play('freeze');
  }

  if (config && gameState.score >= config.target) {
    handleStageClear(config);
    return true;
  }

  // Check game over: grid full and no merges possible
  if (isGridFull(gameState.grid) && !hasAnyMerge(gameState.grid)) {
    setModeWithTransition('gameover');
    gameState.currentTile = null;
    gameState.hoverCell = null;
    gameState.hint = null;
    updateDailyBest();
  } else {
    // Pop next tile from ring
    gameState.currentTile = popNext(gameState.ring);
  }

  maybeSetContextHint();

  return true;
}

// --- Hold action ---

export function handleHold() {
  if (gameState.mode !== 'playing') return false;
  if (!gameState.holdUnlocked) return false;
  if (!gameState.currentTile) return false;

  // Stage 10: hold costs a rotate charge
  if (gameState.holdCostsCharge) {
    if (!gameState.ring || gameState.ring.rotateCharges <= 0) return false;
    gameState.ring.rotateCharges--;
  }

  const { newCurrent, newHeld } = ringHoldTile(gameState.heldTile, gameState.currentTile);
  gameState.heldTile = newHeld;

  if (newCurrent) {
    gameState.currentTile = newCurrent;
  } else {
    // No held tile was there before — pop next from ring
    gameState.currentTile = popNext(gameState.ring);
  }

  gameState.turnsSinceHold = 0;
  if (gameState.challengeCounters) {
    gameState.challengeCounters.holdUses += 1;
  }

  return true;
}

// --- Discard action ---

export function handleDiscard() {
  if (gameState.mode !== 'playing') return false;
  if (!gameState.discardUnlocked) return false;
  if (!gameState.currentTile) return false;

  // Cancel catalyst mode if active
  if (gameState.catalystMode) {
    gameState.catalystMode = false;
    gameState.catalystFirst = null;
  }

  gameState.discardCount++;
  
  // Spawn wall on 2nd+ discard
  if (gameState.discardCount >= 2) {
    spawnWall(gameState.grid, null, { durability: 2 });
  }

  // Get next tile from ring
  gameState.currentTile = popNext(gameState.ring);

  // Play discard sound
  if (window.audio) {
    window.audio.play('discard');
  }

  return true;
}

// --- Catalyst action ---

export function toggleCatalystMode() {
  if (gameState.mode !== 'playing') return false;
  if (!gameState.catalystUnlocked) return false;
  if (gameState.catalystCharges <= 0) return false;

  gameState.catalystMode = !gameState.catalystMode;
  gameState.catalystFirst = null;
  return true;
}

export function handleCatalystSelect(row, col) {
  if (!gameState.catalystMode) return false;
  if (isCellFrozen(row, col)) return false; // Block catalyst on frozen cells
  const tile = gameState.grid[row]?.[col];
  if (!tile || tile.type === 'hazard') return false;

  if (!gameState.catalystFirst) {
    // First tile selected
    gameState.catalystFirst = { row, col };
    return true;
  }

  // Second tile selected — must be adjacent to first
  const f = gameState.catalystFirst;
  const dr = Math.abs(f.row - row);
  const dc = Math.abs(f.col - col);
  if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) {
    // Not adjacent — reset selection
    gameState.catalystFirst = null;
    gameState.catalystMode = false;
    return false;
  }

  // Check if second tile is frozen
  if (isCellFrozen(row, col)) {
    gameState.catalystFirst = null;
    gameState.catalystMode = false;
    return false;
  }

  const tile1 = gameState.grid[f.row][f.col];
  const tile2 = gameState.grid[row][col];
  if (!tile1 || !tile2) {
    gameState.catalystFirst = null;
    gameState.catalystMode = false;
    return false;
  }

  if (tile1.type === 'wall' || tile2.type === 'wall') {
    let removedWalls = 0;
    if (tile1.type === 'wall') {
      gameState.grid[f.row][f.col] = null;
      removedWalls++;
    }
    if (tile2.type === 'wall') {
      gameState.grid[row][col] = null;
      removedWalls++;
    }
    gameState.lastWallBreakEvents = removedWalls > 0 ? [{ count: removedWalls }] : [];
    if (gameState.challengeCounters && removedWalls > 0) {
      gameState.challengeCounters.wallBreaks += removedWalls;
    }
    gameState.catalystCharges--;
    gameState.turnsSinceCatalyst = 0;
    gameState.catalystMode = false;
    gameState.catalystFirst = null;
    return removedWalls > 0;
  }

  // Force-merge: higher tier wins, upgrade by 1
  const higherTier = Math.max(tile1.tier, tile2.tier);
  const newTier = Math.min(higherTier + 1, MAX_TIER);
  gameState.grid[f.row][f.col] = createTile(newTier);
  gameState.grid[row][col] = null;

  const scoreGained = (newTier + 1) * 100;
  gameState.score += scoreGained;
  gameState.stats.totalMerges += 1;

  gameState.mergeFlashes = gameState.reducedMotion
    ? []
    : [{
      row: f.row,
      col: f.col,
      tier: newTier,
      chainIndex: 1,
      scoreGained,
      timer: 0.5,
      duration: 0.5,
    }];

  // Resolve any chain merges triggered by the catalyst merge
  const { events, scoreGained: chainScore } = resolveMerges(gameState.grid);
  gameState.score += chainScore;
  gameState.combo = events.length;
  gameState.lastMergeEvents = events;
  gameState.stats.totalMerges += events.length;
  gameState.stats.highestChain = Math.max(gameState.stats.highestChain, events.length);
  if (gameState.challengeCounters) {
    if (newTier >= 4) gameState.challengeCounters.catalystTier4 = true;
    gameState.challengeCounters.highestChain = Math.max(
      gameState.challengeCounters.highestChain,
      events.length
    );
  }

  if (!gameState.reducedMotion) {
    gameState.mergeFlashes.push(...events.map(ev => ({
      row: ev.row,
      col: ev.col,
      tier: ev.toTier,
      chainIndex: ev.chainIndex,
      scoreGained: ev.scoreGained,
      timer: 0.5,
      duration: 0.5,
    })));
  }

  gameState.catalystCharges--;
  gameState.turnsSinceCatalyst = 0;
  gameState.catalystMode = false;
  gameState.catalystFirst = null;

  // Check stage clear
  const config = gameState.stageConfig;
  if (config && gameState.score >= config.target) {
    handleStageClear(config);
  }

  return true;
}

// --- Ring rotate action ---

export function handleRotate(direction) {
  if (gameState.mode !== 'playing') return false;
  const success = rotateRing(gameState.ring, direction);
  if (success && gameState.tutorialStep === 3) {
    gameState.tutorialStep = 4;
    gameState.tutorialStepTimer = 3.2;
  }
  if (success && gameState.challengeCounters) {
    gameState.challengeCounters.rotateUses += 1;
  }
  return success;
}

export function update(dt) {
  gameState.frameCount++;

  // Tick down visual effects
  if (gameState.screenShake > 0) {
    gameState.screenShake = Math.max(0, gameState.screenShake - dt);
  }
  if (gameState.mergeFlashes.length > 0) {
    for (let i = gameState.mergeFlashes.length - 1; i >= 0; i--) {
      gameState.mergeFlashes[i].timer -= dt;
      if (gameState.mergeFlashes[i].timer <= 0) {
        gameState.mergeFlashes.splice(i, 1);
      }
    }
  }
  if (gameState.comboPopup) {
    gameState.comboPopup.timer -= dt;
    if (gameState.comboPopup.timer <= 0) {
      gameState.comboPopup = null;
    }
  }
  if (gameState.placementAnim) {
    gameState.placementAnim.timer -= dt;
    if (gameState.placementAnim.timer <= 0) {
      gameState.placementAnim = null;
    }
  }
  if (gameState.transition) {
    gameState.transition.timer -= dt;
    if (gameState.transition.timer <= 0) {
      gameState.transition = null;
    }
  }
  if (gameState.hazardFlash) {
    gameState.hazardFlash.timer -= dt;
    if (gameState.hazardFlash.timer <= 0) {
      gameState.hazardFlash = null;
    }
  }
  if (gameState.mechanicNotification) {
    gameState.mechanicNotification.timer -= dt;
    if (gameState.mechanicNotification.timer <= 0) {
      gameState.mechanicNotification = null;
    }
  }
  if (gameState.hint) {
    gameState.hint.timer -= dt;
    if (gameState.hint.timer <= 0) {
      gameState.hint = null;
    }
  }
  if (gameState.tutorialStep === 4 && gameState.tutorialStepTimer > 0) {
    gameState.tutorialStepTimer -= dt;
    if (gameState.tutorialStepTimer <= 0) {
      gameState.tutorialStep = -1;
      gameState.tutorialCompleted = true;
      saveProgressFromState(gameState);
    }
  }
}

// --- Rendering (delegates to renderer.js) ---

export function render(ctx, canvas) {
  renderFrame(ctx, canvas.width, canvas.height, gameState, getGridLayout);
}

export { TIER_NAMES, STAGES };
