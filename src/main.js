// main.js — Canvas setup, game loop, and Playwright hooks for Realm Weave

import {
  getState, update, render, renderGameToText,
  pixelToCell, handlePlacement, handleRotate, handleHold, handleDiscard,
  toggleCatalystMode, handleCatalystSelect,
  startStage, goToStageSelect, STAGES,
  openUpgradeShop, closeUpgradeShop, purchaseUpgrade,
  openStats, closeStats,
  openGuide, closeGuide,
  openStageSelect, openTitleMenu, togglePause, leavePauseToStageSelect,
  startDailyChallenge,
  toggleColorBlindMode, toggleReducedMotion, setReducedMotion,
  moveSelectedStage, moveSelectedUpgrade,
  skipTutorial,
  setHoverCell, clearHoverCell,
  setAudioMuted, setFullscreenActive,
  setStageSelectScroll, getStageSelectScroll,
} from './state.js';

import {
  getStageButtonAt,
  getUpgradeShopActionAt,
  getTitleActionAt,
  getGuideActionAt,
  getStatsActionAt,
  getTopControlActionAt,
  getPauseOverlayActionAt,
  getStageClearActionAt,
  getGameOverActionAt,
  getTutorialActionAt,
  getRingAreaActionAt,
  getStageSelectMaxScroll,
  getStageSelectScrollInfo,
} from './renderer.js';
import { createAudioManager } from './audio.js';
import { UPGRADE_DEFS } from './upgrades.js';

const BASE_WIDTH = 540;
const BASE_HEIGHT = 960;
const SWIPE_MIN_DIST = 38;

let canvas, ctx;
let lastTimestamp = 0;
let running = true;
let touchStart = null;
const audio = createAudioManager();
const hasTouch = typeof window !== 'undefined'
  && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('wheel', onWheel, { passive: false });
  if (!hasTouch) {
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
  }
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('fullscreenchange', onFullscreenChange);

  setAudioMuted(audio.isMuted());
  applyReducedMotionPreference();
  onFullscreenChange();
}

function applyReducedMotionPreference() {
  try {
    const prefersReduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) setReducedMotion(true);
  } catch {
    // ignore media query errors
  }
}

function haptic(pattern) {
  const state = getState();
  if (state.audioMuted) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && Number.isFinite(vv.width) && Number.isFinite(vv.height)) {
    return {
      width: Math.max(1, Math.floor(vv.width)),
      height: Math.max(1, Math.floor(vv.height)),
    };
  }
  return {
    width: Math.max(1, Math.floor(window.innerWidth)),
    height: Math.max(1, Math.floor(window.innerHeight)),
  };
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const viewport = getViewportSize();
  const mobileViewport = hasTouch && viewport.width <= 1024;

  let maxW;
  let maxH;
  if (mobileViewport) {
    maxW = viewport.width;
    maxH = viewport.height;
  } else {
    const scale = Math.min(viewport.width / BASE_WIDTH, viewport.height / BASE_HEIGHT);
    maxW = Math.floor(BASE_WIDTH * scale);
    maxH = Math.floor(BASE_HEIGHT * scale);
  }

  canvas.style.width = maxW + 'px';
  canvas.style.height = maxH + 'px';
  canvas.width = Math.round(maxW * dpr);
  canvas.height = Math.round(maxH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Immediate re-render after resize
  render(ctx, { width: maxW, height: maxH });
}

function getLogicalSize() {
  const dpr = window.devicePixelRatio || 1;
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr,
  };
}

function onCanvasClick(e) {
  audio.unlock();
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  routePointer(px, py);
}

function onMouseMove(e) {
  const state = getState();
  if (state.mode !== 'playing') {
    clearHoverCell();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const { width, height } = getLogicalSize();
  const cell = pixelToCell(px, py, width, height);
  if (!cell) {
    clearHoverCell();
    return;
  }
  setHoverCell(cell.row, cell.col);
}

function onMouseLeave() {
  clearHoverCell();
}

function onWheel(e) {
  const state = getState();
  if (state.mode !== 'stageselect') return;
  e.preventDefault();
  const { width, height } = getLogicalSize();
  const maxScroll = getStageSelectMaxScroll(width, height);
  const current = getStageSelectScroll();
  setStageSelectScroll(current + e.deltaY * 0.5, maxScroll);
}

function onTouchMove(e) {
  const state = getState();
  if (state.mode === 'stageselect' && touchStart) {
    const touch = e.touches[0];
    const dy = touchStart.rawY - touch.clientY;
    if (Math.abs(dy) > 6) {
      e.preventDefault();
      const { width, height } = getLogicalSize();
      const maxScroll = getStageSelectMaxScroll(width, height);
      const current = getStageSelectScroll();
      setStageSelectScroll(current + dy, maxScroll);
      touchStart.rawY = touch.clientY;
      touchStart.scrolled = true;
    }
  }
}

function routePointer(px, py) {
  const { width, height } = getLogicalSize();
  const state = getState();

  const topAction = getTopControlActionAt(px, py, width, height, state);
  if (topAction) {
    if (topAction.type === 'mute') {
      const muted = audio.toggleMute();
      setAudioMuted(muted);
    } else if (topAction.type === 'fullscreen') {
      toggleFullscreen();
    } else if (topAction.type === 'pause') {
      const changed = togglePause();
      if (changed) audio.play('ui');
    } else if (topAction.type === 'colorBlind') {
      toggleColorBlindMode();
      audio.play('ui');
    } else if (topAction.type === 'reducedMotion') {
      toggleReducedMotion();
      audio.play('ui');
    }
    return;
  }

  if (state.mode === 'title') {
    const action = getTitleActionAt(px, py, width, height);
    if (action?.type === 'play') {
      openStageSelect();
      audio.play('ui');
    } else if (action?.type === 'upgrades') {
      openUpgradeShop();
      audio.play('ui');
    } else if (action?.type === 'stats') {
      openStats();
      audio.play('ui');
    } else if (action?.type === 'daily') {
      if (startDailyChallenge()) audio.play('ui');
    } else if (action?.type === 'guide') {
      openGuide();
      audio.play('ui');
    }
    return;
  }

  // Stage select: check if a stage button was clicked
  if (state.mode === 'stageselect') {
    const action = getStageButtonAt(px, py, width, height, STAGES, getStageSelectScroll());
    if (action?.type === 'shop') {
      openUpgradeShop();
      audio.play('ui');
      return;
    }
    if (action?.type === 'guide') {
      openGuide();
      audio.play('ui');
      return;
    }
    if (action?.type === 'stats') {
      openStats();
      audio.play('ui');
      return;
    }
    if (action?.type === 'home') {
      openTitleMenu();
      audio.play('ui');
      return;
    }
    if (action?.type === 'stage') {
      if (startStage(action.stageId)) audio.play('ui');
    }
    return;
  }

  if (state.mode === 'guide') {
    const action = getGuideActionAt(px, py, width, height);
    if (action?.type === 'back') {
      closeGuide();
      audio.play('ui');
    }
    return;
  }

  if (state.mode === 'stats') {
    const action = getStatsActionAt(px, py, width, height);
    if (action?.type === 'back') {
      closeStats();
      audio.play('ui');
    }
    return;
  }

  if (state.mode === 'upgradeshop') {
    const action = getUpgradeShopActionAt(px, py, width, height, state);
    if (!action) return;
    if (action.type === 'back') {
      closeUpgradeShop();
      audio.play('ui');
      return;
    }
    if (action.type === 'upgrade') {
      const result = purchaseUpgrade(action.id);
      if (result.ok) audio.play('upgrade');
    }
    return;
  }

  if (state.mode === 'paused') {
    const action = getPauseOverlayActionAt(px, py, width, height);
    if (!action) return;
    if (action.type === 'resume') {
      togglePause();
      audio.play('ui');
    } else if (action.type === 'stageSelect') {
      leavePauseToStageSelect();
      audio.play('ui');
    } else if (action.type === 'quit') {
      openTitleMenu();
      audio.play('ui');
    }
    return;
  }

  if (state.mode === 'stageclear') {
    const action = getStageClearActionAt(px, py, width, height, state);
    if (!action) return;
    if (action.type === 'retry') {
      if (startStage(state.stageId)) audio.play('ui');
      return;
    }
    if (action.type === 'next') {
      if (startStage(state.stageId + 1)) audio.play('ui');
      return;
    }
    if (action.type === 'stageselect') {
      goToStageSelect();
      audio.play('ui');
      return;
    }
  }

  if (state.mode === 'gameover') {
    const action = getGameOverActionAt(px, py, width, height);
    if (!action) return;
    if (action.type === 'retry') {
      if (startStage(state.stageId)) audio.play('ui');
      return;
    }
    if (action.type === 'stageselect') {
      goToStageSelect();
      audio.play('ui');
      return;
    }
    return;
  }

  // Playing: check catalyst mode or normal placement
  if (state.mode !== 'playing') return;

  const tutorialAction = getTutorialActionAt(px, py, width, height, state);
  if (tutorialAction?.type === 'skipTutorial') {
    if (skipTutorial()) audio.play('ui');
    return;
  }

  // Check for ring area actions (discard button)
  const ringAction = getRingAreaActionAt(px, py, width, height, state);
  if (ringAction?.type === 'discard') {
    if (handleDiscard()) audio.play('ui');
    return;
  }

  const cell = pixelToCell(px, py, width, height);
  if (cell) {
    const state2 = getState();
    const beforeMode = state2.mode;
    if (state2.catalystMode) {
      const ok = handleCatalystSelect(cell.row, cell.col);
      if (ok) {
        haptic(20);
        audio.play('merge');
        const after = getState();
        if (after.combo >= 2) {
          haptic([15, 30, 15]);
          audio.play('combo');
        }
        playEndStateAudio(beforeMode, after.mode);
      }
    } else {
      const ok = handlePlacement(cell.row, cell.col);
      if (ok) {
        const after = getState();
        haptic(10);
        audio.play('place');
        if (after.lastMergeEvents && after.lastMergeEvents.length > 0) {
          haptic(20);
          audio.play('merge');
        }
        if ((after.combo || 0) >= 2) {
          haptic([15, 30, 15]);
          audio.play('combo');
        }
        if (after.lastCursedEvent?.affected?.length > 0) {
          haptic([10, 20, 10]);
          audio.play('cursed');
        }
        if (after.lastWallBreakEvents && after.lastWallBreakEvents.length > 0) {
          audio.play('wallBreak');
        } else if (after.lastWallEvent) {
          audio.play('wallHit');
        }
        if (after.lastHazardEvent || after.lastPollutionEvent) {
          haptic(40);
          if (after.lastHazardEvent?.kind === 'earthquake') {
            audio.play('earthquake');
          } else {
            audio.play('hazard');
          }
        }
        if (after.scoreBleedActive && after.lastBleedAmount > 0) {
          audio.play('bleed');
        }
        playEndStateAudio(beforeMode, after.mode);
      }
    }
  }
}

function playEndStateAudio(beforeMode, afterMode) {
  if (beforeMode !== 'playing') return;
  if (afterMode === 'stageclear') {
    haptic([20, 40, 20, 40, 20]);
    audio.play('stageClear');
  }
  if (afterMode === 'gameover') {
    haptic(80);
    audio.play('gameOver');
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (canvas.requestFullscreen) {
      await canvas.requestFullscreen();
    }
  } catch {
    // ignore fullscreen errors
  }
  onFullscreenChange();
}

function onFullscreenChange() {
  setFullscreenActive(!!document.fullscreenElement);
}

function onTouchStart(e) {
  if (e.touches.length === 0) return;
  audio.unlock();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  touchStart = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
    rawY: touch.clientY,
    t: performance.now(),
    scrolled: false,
  };
  e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchStart) return;
  const rect = canvas.getBoundingClientRect();
  const changed = e.changedTouches[0];
  const endX = changed.clientX - rect.left;
  const endY = changed.clientY - rect.top;
  const dx = endX - touchStart.x;
  const dy = endY - touchStart.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const state = getState();
  const wasScrolled = touchStart.scrolled;

  if (wasScrolled) {
    // Touch was used for scrolling stage select — don't route as tap
  } else if (state.mode === 'playing' && absDx >= SWIPE_MIN_DIST && absDx > absDy * 1.2) {
    const rotated = handleRotate(dx > 0 ? 1 : -1);
    if (rotated) {
      haptic(10);
      audio.play('ui');
    }
  } else {
    routePointer(endX, endY);
  }

  touchStart = null;
  e.preventDefault();
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  audio.unlock();
  const state = getState();

  if (key === 'm') {
    const muted = audio.toggleMute();
    setAudioMuted(muted);
    return;
  }

  if (key === 'f') {
    toggleFullscreen();
    return;
  }

  if (key === 'escape' && document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  if (key === 'escape' && state.mode === 'playing') {
    togglePause();
    audio.play('ui');
    return;
  }

  if (key === 'escape' && state.mode === 'paused') {
    togglePause();
    audio.play('ui');
    return;
  }

  if (key === 'escape' && state.mode === 'guide') {
    closeGuide();
    audio.play('ui');
    return;
  }

  if (key === 'escape' && state.mode === 'stats') {
    closeStats();
    audio.play('ui');
    return;
  }

  if ((key === 'escape' || key === 'backspace') && state.mode === 'stageselect') {
    openTitleMenu();
    audio.play('ui');
    return;
  }

  if (state.mode === 'stageselect') {
    if (key === 'arrowup' || key === 'arrowdown') {
      const idx = moveSelectedStage(key === 'arrowup' ? -1 : 1);
      // Auto-scroll to keep selected card visible
      const { width, height } = getLogicalSize();
      const maxScroll = getStageSelectMaxScroll(width, height);
      if (maxScroll > 0) {
        const info = getStageSelectScrollInfo(width, height);
        const cardTop = 8 + idx * (info.btnH + info.gap);
        const cardBot = cardTop + info.btnH;
        const scroll = getStageSelectScroll();
        if (cardTop < scroll) setStageSelectScroll(cardTop, maxScroll);
        else if (cardBot > scroll + info.viewH) setStageSelectScroll(cardBot - info.viewH, maxScroll);
      }
      audio.play('ui');
      return;
    }
    if (key === 'enter') {
      const selected = Math.max(0, Number(getState().selectedStageIndex) || 0);
      const stageId = STAGES[selected]?.id;
      if (stageId && startStage(stageId)) {
        audio.play('ui');
      }
      return;
    }
  }

  if (state.mode === 'upgradeshop') {
    if (key === 'arrowup') {
      moveSelectedUpgrade(-1);
      audio.play('ui');
      return;
    }
    if (key === 'arrowdown') {
      moveSelectedUpgrade(1);
      audio.play('ui');
      return;
    }
    if (key === 'enter') {
      const selected = Math.max(0, Number(getState().selectedUpgradeIndex) || 0);
      const upgradeId = UPGRADE_DEFS[selected]?.id;
      if (upgradeId) {
        const result = purchaseUpgrade(upgradeId);
        if (result.ok) audio.play('upgrade');
      }
      return;
    }
  }

  if (state.mode === 'stageclear') {
    if (key === 'r') {
      if (startStage(state.stageId)) audio.play('ui');
      return;
    }
    if (key === 'enter') {
      if (startStage(state.stageId + 1)) audio.play('ui');
      return;
    }
    if (key === 'escape') {
      goToStageSelect();
      audio.play('ui');
      return;
    }
  }

  if (state.mode === 'gameover') {
    if (key === 'r') {
      if (startStage(state.stageId)) audio.play('ui');
      return;
    }
    if (key === 'escape') {
      goToStageSelect();
      audio.play('ui');
      return;
    }
  }

  if (state.mode === 'title') {
    if (key === 'enter' || key === ' ') {
      openStageSelect();
      audio.play('ui');
    }
    if (key === 'u') {
      openUpgradeShop();
      audio.play('ui');
    }
    if (key === 's') {
      openStats();
      audio.play('ui');
    }
    if (key === 'd') {
      if (startDailyChallenge()) audio.play('ui');
    }
    if (key === 'g') {
      openGuide();
      audio.play('ui');
    }
    return;
  }

  if (key === 'u' && state.mode === 'stageselect') {
    openUpgradeShop();
    audio.play('ui');
    return;
  }

  if (key === 'g' && state.mode === 'stageselect') {
    openGuide();
    audio.play('ui');
    return;
  }

  if (key === 's' && state.mode === 'stageselect') {
    openStats();
    audio.play('ui');
    return;
  }

  if (key === 'escape' && state.mode === 'upgradeshop') {
    closeUpgradeShop();
    audio.play('ui');
    return;
  }

  if ((key === 'g' || key === 'enter' || key === ' ') && state.mode === 'guide') {
    closeGuide();
    audio.play('ui');
    return;
  }

  if (state.mode !== 'playing') return;

  if (key === 'q') {
    if (handleRotate(-1)) audio.play('ui'); // counter-clockwise
  } else if (key === 'e') {
    if (handleRotate(1)) audio.play('ui');  // clockwise
  } else if (key === 'h') {
    if (handleHold()) audio.play('ui');
  } else if (key === 'c') {
    if (toggleCatalystMode()) audio.play('ui');
  } else if (key === 'x') {
    if (handleDiscard()) audio.play('ui');
  }
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 1 / 60;
  lastTimestamp = timestamp;

  update(Math.min(dt, 0.1)); // cap dt to avoid spiral of death
  render(ctx, getLogicalSize());

  requestAnimationFrame(gameLoop);
}

// --- Playwright hooks ---

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) {
    update(1 / 60);
  }
  render(ctx, getLogicalSize());
};

// Expose startStage for Playwright
window.startStage = startStage;

// --- Init ---

initCanvas();
requestAnimationFrame(gameLoop);
