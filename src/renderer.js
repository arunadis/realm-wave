// renderer.js — All drawing functions for Realm Weave

import { TIER_COLORS, TIER_NAMES, isTechTile } from './grid.js';
import { getRingTiles } from './ring.js';
import { isHazardTile } from './hazards.js';
import { STAGES } from './stages.js';
import { UPGRADE_DEFS, MAX_UPGRADE_LEVEL, getUpgradeCost, getLevelDescription } from './upgrades.js';

// --- Layout constants ---
export const HUD_HEIGHT = 70;
export const RING_AREA_HEIGHT = 90;
export const GRID_PADDING = 20;
export const CELL_GAP = 4;

const ERA_NAMES = [
  '', 'Dawn', 'Iron', 'Classical',
  'Renaissance', 'Industrial', 'Modern', 'Singularity',
];

const TIER_ICONS = ['🔥', '🛖', '🏘️', '🏛️', '🏙️', '👑'];

const TIER_BG_COLORS = [
  '#c87533', // tribe  — warm bronze
  '#9a7520', // hut    — dark goldenrod
  '#2e8b57', // village — sea green
  '#4682b4', // town   — steel blue
  '#7b68ee', // city   — medium slate blue
  '#e8b800', // capital — rich gold
];

const TIER_BORDER_COLORS = [
  '#e09050', // tribe
  '#c0a040', // hut
  '#50c080', // village
  '#70b0d8', // town
  '#a090ff', // city
  '#fff060', // capital
];

const ERA_THEMES = [
  null,
  { grad: ['#1a0f07', '#2a1810', '#1a1520'], halo: 'rgba(255, 140, 50, 0.2)' },  // Dawn
  { grad: ['#0a0a1a', '#15152a', '#0a1020'], halo: 'rgba(120, 140, 180, 0.2)' },  // Iron
  { grad: ['#0f0a1a', '#1a1530', '#0f0a20'], halo: 'rgba(160, 130, 200, 0.2)' },  // Classical
  { grad: ['#0a1a15', '#152a20', '#0a1a1a'], halo: 'rgba(80, 200, 160, 0.2)' },   // Renaissance
  { grad: ['#0f0f0a', '#1a1a10', '#15150a'], halo: 'rgba(180, 160, 60, 0.15)' },  // Industrial
  { grad: ['#07111f', '#122338', '#0a1729'], halo: 'rgba(89, 153, 214, 0.2)' },    // Modern
  { grad: ['#0a0520', '#150a30', '#0a0525'], halo: 'rgba(200, 100, 255, 0.25)' },  // Singularity
];

// Stage button layout constants
const STAGE_BTN_W = 340;
const STAGE_BTN_H = 90;
const STAGE_BTN_GAP = 12;
const STAGE_HEADER_H = 68;
const STAGE_CONTENT_PAD = 8;
const SHOP_BTN_W = 126;
const SHOP_BTN_H = 32;

const ERA_ICONS_SS = ['', '☀️', '🛡️', '🏛️', '🎨', '⚙️', '💡', '🌌'];
const ERA_ACCENT = [
  null,
  '#e8a84c',  // Dawn — warm amber
  '#7a9ab5',  // Iron — cool steel
  '#9b7cc8',  // Classical — imperial purple
  '#4cb89e',  // Renaissance — teal
  '#b8a644',  // Industrial — brass
  '#4a9cd6',  // Modern — blue
  '#b366e0',  // Singularity — violet
];
const ERA_CARD_GRAD = [
  null,
  ['rgba(61,42,16,0.92)', 'rgba(42,24,8,0.95)'],     // Dawn
  ['rgba(26,34,48,0.92)', 'rgba(14,21,32,0.95)'],     // Iron
  ['rgba(36,24,48,0.92)', 'rgba(22,14,34,0.95)'],     // Classical
  ['rgba(16,40,32,0.92)', 'rgba(8,26,22,0.95)'],      // Renaissance
  ['rgba(40,38,14,0.92)', 'rgba(26,24,8,0.95)'],      // Industrial
  ['rgba(14,32,56,0.92)', 'rgba(8,20,40,0.95)'],      // Modern
  ['rgba(30,14,48,0.92)', 'rgba(18,8,34,0.95)'],      // Singularity
];
const TOP_CTRL_SIZE = 40;
const TOP_CTRL_GAP = 8;
const UI_TITLE_FONT = '"Macondo", "Cinzel", "Georgia", serif';
const UI_FONT = '"Manrope", "Segoe UI", sans-serif';
const STAR_COLOR = '#f6d48e';

let accessibilityVisuals = {
  colorBlindMode: false,
};

function inRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function drawCursedTile(ctx, x, y, size) {
  const cursedGrad = ctx.createLinearGradient(x, y, x, y + size);
  cursedGrad.addColorStop(0, '#4a184f');
  cursedGrad.addColorStop(1, '#220b2b');
  ctx.fillStyle = cursedGrad;
  roundRect(ctx, x, y, size, size, 5);
  ctx.fill();

  ctx.strokeStyle = '#d16be3';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#c75bf2';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(225, 154, 244, 0.9)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();
  ctx.restore();

  if (accessibilityVisuals.colorBlindMode) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const px = x + 6 + i * ((size - 12) / 4);
      ctx.beginPath();
      ctx.moveTo(px, y + 5);
      ctx.lineTo(px, y + size - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  const iconSize = Math.max(12, Math.floor(size * 0.42));
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀', x + size / 2, y + size * 0.40);

  const nameSize = Math.max(7, Math.floor(size * 0.16));
  ctx.fillStyle = '#f5d5ff';
  ctx.font = `bold ${nameSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cursed', x + size / 2, y + size * 0.76);
}

function drawWallTile(ctx, x, y, size, tile) {
  const wallGrad = ctx.createLinearGradient(x, y, x, y + size);
  wallGrad.addColorStop(0, '#646a73');
  wallGrad.addColorStop(1, '#343944');
  ctx.fillStyle = wallGrad;
  roundRect(ctx, x, y, size, size, 5);
  ctx.fill();

  ctx.strokeStyle = '#adb4be';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();

  const durability = Math.max(1, Number(tile?.durability) || 1);
  ctx.save();
  ctx.strokeStyle = 'rgba(22, 28, 36, 0.8)';
  ctx.lineWidth = 1.5;
  const crackCount = Math.max(1, 4 - durability);
  for (let i = 0; i < crackCount; i++) {
    const ox = x + size * (0.24 + i * 0.18);
    const oy = y + size * (0.18 + i * 0.1);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + size * 0.12, oy + size * 0.16);
    ctx.lineTo(ox + size * 0.05, oy + size * 0.32);
    ctx.stroke();
  }
  ctx.restore();

  const iconSize = Math.max(12, Math.floor(size * 0.34));
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧱', x + size / 2, y + size * 0.41);

  ctx.fillStyle = '#dde6f1';
  ctx.font = `700 ${Math.max(8, Math.floor(size * 0.17))}px ${UI_FONT}`;
  ctx.fillText(`Wall ${durability}`, x + size / 2, y + size * 0.78);
}

function drawTierPattern(ctx, x, y, size, tier) {
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 250, 255, 0.45)';
  ctx.fillStyle = 'rgba(245, 250, 255, 0.35)';
  ctx.lineWidth = 1.2;

  if (tier === 1) {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y + size * 0.82);
    ctx.lineTo(x + size * 0.82, y + size * 0.18);
    ctx.stroke();
  } else if (tier === 2) {
    const y1 = y + size * 0.24;
    const y2 = y + size * 0.31;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.16, y1);
    ctx.lineTo(x + size * 0.84, y1);
    ctx.moveTo(x + size * 0.16, y2);
    ctx.lineTo(x + size * 0.84, y2);
    ctx.stroke();
  } else if (tier === 3) {
    for (let i = 0; i < 4; i++) {
      const o = i * (size * 0.16);
      ctx.beginPath();
      ctx.moveTo(x + o, y + size * 0.2);
      ctx.lineTo(x + o + size * 0.28, y + size * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + o + size * 0.28, y + size * 0.2);
      ctx.lineTo(x + o, y + size * 0.48);
      ctx.stroke();
    }
  } else if (tier === 4) {
    for (let i = 0; i < 8; i++) {
      const px = x + size * 0.14 + i * (size * 0.1);
      ctx.beginPath();
      ctx.arc(px, y + size * 0.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, y + size * 0.86, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tier >= 5) {
    ctx.strokeStyle = 'rgba(255, 246, 210, 0.6)';
    ctx.lineWidth = 1.6;
    roundRect(ctx, x + 3, y + 3, size - 6, size - 6, 5);
    ctx.stroke();
    roundRect(ctx, x + 6, y + 6, size - 12, size - 12, 4);
    ctx.stroke();
    const corners = [
      [x + size * 0.14, y + size * 0.14],
      [x + size * 0.86, y + size * 0.14],
      [x + size * 0.14, y + size * 0.86],
      [x + size * 0.86, y + size * 0.86],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 3);
      ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx, cy + 3);
      ctx.lineTo(cx - 3, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function getStatsLayout(w, h) {
  const panelW = Math.min(560, w - 40);
  const panelH = Math.min(520, h - 40);
  const panelX = Math.floor((w - panelW) / 2);
  const panelY = Math.floor((h - panelH) / 2);
  const backW = 130;
  const backH = 42;
  const backX = panelX + panelW - backW - 20;
  const backY = panelY + panelH - backH - 16;
  return { panelX, panelY, panelW, panelH, backX, backY, backW, backH };
}

export function getStatsActionAt(px, py, w, h) {
  const layout = getStatsLayout(w, h);
  if (inRect(px, py, { x: layout.backX, y: layout.backY, w: layout.backW, h: layout.backH })) {
    return { type: 'back' };
  }
  return null;
}

function drawStatsScreen(ctx, w, h, state) {
  const { panelX, panelY, panelW, panelH, backX, backY, backW, backH } = getStatsLayout(w, h);
  const bestOverall = Math.max(0, ...Object.values(state.bestScores || {}).map(v => Number(v) || 0));
  const rows = [
    ['Total Stars', Number(state.totalStars || 0).toLocaleString()],
    ['Stages Cleared', Number(state.stats?.stagesCleared || 0).toLocaleString()],
    ['Best Stage Score', bestOverall.toLocaleString()],
    ['Games Played', Number(state.stats?.gamesPlayed || 0).toLocaleString()],
    ['Total Merges', Number(state.stats?.totalMerges || 0).toLocaleString()],
    ['Highest Chain', Number(state.stats?.highestChain || 0).toLocaleString()],
    ['Hazards Survived', Number(state.stats?.hazardsSurvived || 0).toLocaleString()],
  ];

  ctx.fillStyle = 'rgba(5, 8, 14, 0.56)';
  ctx.fillRect(0, 0, w, h);

  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(32, 28, 56, 0.96)');
  panelGrad.addColorStop(1, 'rgba(18, 16, 38, 0.97)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#cbb2ef';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  ctx.fillStyle = '#f4ecff';
  ctx.font = `700 28px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Statistics', panelX + 20, panelY + 34);

  let y = panelY + 78;
  for (const [label, value] of rows) {
    ctx.fillStyle = 'rgba(48, 40, 76, 0.9)';
    roundRect(ctx, panelX + 20, y, panelW - 40, 42, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(174, 149, 222, 0.7)';
    ctx.lineWidth = 1;
    roundRect(ctx, panelX + 20, y, panelW - 40, 42, 8);
    ctx.stroke();

    ctx.fillStyle = '#d5c6ef';
    ctx.font = `600 13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, panelX + 34, y + 21);
    ctx.fillStyle = '#fff0c9';
    ctx.font = `700 14px ${UI_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(value, panelX + panelW - 34, y + 21);
    y += 50;
  }

  ctx.fillStyle = 'rgba(52, 44, 82, 0.92)';
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.fill();
  ctx.strokeStyle = '#ccb2ef';
  ctx.lineWidth = 1.5;
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.stroke();
  ctx.fillStyle = '#f4ebff';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Back [Esc]', backX + backW / 2, backY + backH / 2);

  drawTopControls(ctx, w, state);
}

function getTopControlRects(w, state) {
  const y = 8;
  const fullscreen = { x: w - 10 - TOP_CTRL_SIZE, y, w: TOP_CTRL_SIZE, h: TOP_CTRL_SIZE };
  const mute = { x: fullscreen.x - TOP_CTRL_GAP - TOP_CTRL_SIZE, y, w: TOP_CTRL_SIZE, h: TOP_CTRL_SIZE };
  const colorBlind = { x: mute.x - TOP_CTRL_GAP - TOP_CTRL_SIZE, y, w: TOP_CTRL_SIZE, h: TOP_CTRL_SIZE };
  const motion = { x: colorBlind.x - TOP_CTRL_GAP - TOP_CTRL_SIZE, y, w: TOP_CTRL_SIZE, h: TOP_CTRL_SIZE };
  const pause = (state.mode === 'playing' || state.mode === 'paused')
    ? { x: motion.x - TOP_CTRL_GAP - TOP_CTRL_SIZE, y, w: TOP_CTRL_SIZE, h: TOP_CTRL_SIZE }
    : null;
  return { mute, fullscreen, colorBlind, motion, pause };
}

export function getTopControlActionAt(px, py, w, _h, state) {
  const rects = getTopControlRects(w, state);
  if (inRect(px, py, rects.mute)) return { type: 'mute' };
  if (inRect(px, py, rects.fullscreen)) return { type: 'fullscreen' };
  if (inRect(px, py, rects.colorBlind)) return { type: 'colorBlind' };
  if (inRect(px, py, rects.motion)) return { type: 'reducedMotion' };
  if (rects.pause && inRect(px, py, rects.pause)) return { type: 'pause' };
  return null;
}

function getTutorialSkipRect(w, h) {
  const bw = 110;
  const bh = 34;
  return {
    x: w - bw - 20,
    y: h - bh - 20,
    w: bw,
    h: bh,
  };
}

export function getTutorialActionAt(px, py, w, h, state) {
  if (state.mode !== 'playing' || state.tutorialStep <= 0) return null;
  const skip = getTutorialSkipRect(w, h);
  if (inRect(px, py, skip)) return { type: 'skipTutorial' };
  return null;
}

function drawTopControls(ctx, w, state) {
  const rects = getTopControlRects(w, state);
  const buttons = [
    { rect: rects.mute, label: state.audioMuted ? '🔇' : '🔊' },
    { rect: rects.fullscreen, label: state.fullscreenActive ? '🗗' : '⛶' },
    { rect: rects.colorBlind, label: state.colorBlindMode ? '🎨' : '◌' },
    { rect: rects.motion, label: state.reducedMotion ? 'RM' : 'FX' },
  ];
  if (rects.pause) {
    buttons.push({ rect: rects.pause, label: state.mode === 'paused' ? '▶' : '⏸' });
  }

  for (const btn of buttons) {
    const grad = ctx.createLinearGradient(btn.rect.x, btn.rect.y, btn.rect.x, btn.rect.y + btn.rect.h);
    grad.addColorStop(0, 'rgba(28, 44, 62, 0.9)');
    grad.addColorStop(1, 'rgba(12, 24, 36, 0.9)');
    ctx.fillStyle = grad;
    roundRect(ctx, btn.rect.x, btn.rect.y, btn.rect.w, btn.rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(135, 188, 236, 0.9)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, btn.rect.x, btn.rect.y, btn.rect.w, btn.rect.h, 8);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = 'rgba(150, 210, 255, 0.35)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#e7f4ff';
    ctx.font = `700 ${btn.label.length > 2 ? 11 : 14}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.rect.x + btn.rect.w / 2, btn.rect.y + btn.rect.h / 2);
    ctx.restore();
  }
}

const MECHANIC_DESCRIPTIONS = {
  hold: { icon: '🤚', text: 'Hold unlocked! Press H to save a tile' },
  catalyst: { icon: '⚡', text: 'Catalyst unlocked! Press C to force-merge' },
  comboX3: { icon: '🔥', text: 'Combo ×3! Chain 3+ merges for triple score' },
  techTile: { icon: '⚙️', text: 'Tech tiles appear! They merge with anything' },
  holdCostsCharge: { icon: '⚠️', text: 'Hold now costs a rotate charge!' },
};

function drawMechanicNotification(ctx, w, _h, notification) {
  const firstMechanic = notification.mechanics?.[0];
  if (!firstMechanic) return;
  const desc = MECHANIC_DESCRIPTIONS[firstMechanic];
  if (!desc) return;

  const progress = Math.max(0, Math.min(1, notification.timer / notification.duration));
  const reveal = Math.min(1, (1 - progress) * 3);
  const hide = Math.min(1, progress * 2);
  const yOffset = Math.round((1 - reveal * hide) * -52);

  const bw = Math.min(560, w - 36);
  const bh = 44;
  const bx = Math.floor((w - bw) / 2);
  const by = 10 + yOffset;

  const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
  grad.addColorStop(0, 'rgba(34, 58, 84, 0.95)');
  grad.addColorStop(1, 'rgba(18, 34, 54, 0.96)');
  ctx.fillStyle = grad;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();

  ctx.strokeStyle = '#89bfe9';
  ctx.lineWidth = 1.6;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.stroke();

  ctx.fillStyle = '#e8f5ff';
  ctx.font = `700 13px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🆕 ${desc.icon} ${desc.text}`, bx + bw / 2, by + bh / 2);
}

function drawHint(ctx, _w, _h, layout, hint) {
  const progress = Math.max(0, Math.min(1, hint.timer / hint.duration));
  const alpha = Math.min(1, progress * 1.8);
  const y = layout.originY + layout.gridH + 18;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(16, 28, 44, 0.86)';
  const textW = Math.max(280, Math.min(520, hint.text.length * 6.4));
  const x = layout.originX + (layout.gridW - textW) / 2;
  roundRect(ctx, x, y, textW, 28, 8);
  ctx.fill();
  ctx.strokeStyle = '#8fbce3';
  ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, textW, 28, 8);
  ctx.stroke();

  ctx.fillStyle = '#d8ebff';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hint.text, x + textW / 2, y + 14);
  ctx.restore();
}

function getTutorialStepConfig(state, layout) {
  const step = state.tutorialStep;
  if (step === 1) {
    return {
      title: 'Place a tile',
      text: 'Tap any empty cell to place your current tile.',
      focus: {
        x: layout.originX - 8,
        y: layout.originY - 8,
        w: layout.gridW + 16,
        h: layout.gridH + 16,
      },
    };
  }
  if (step === 2) {
    return {
      title: 'Nice! Tiles merge',
      text: 'Matching adjacent tiles combine into higher tiers.',
      focus: {
        x: layout.originX - 8,
        y: layout.originY - 8,
        w: layout.gridW + 16,
        h: layout.gridH + 16,
      },
    };
  }
  if (step === 3) {
    return {
      title: 'Rotate the ring',
      text: 'Press Q/E (or swipe) to rotate your upcoming tiles.',
      focus: {
        x: layout.originX - 22,
        y: HUD_HEIGHT + 6,
        w: layout.gridW + 44,
        h: RING_AREA_HEIGHT - 2,
      },
    };
  }
  return {
    title: 'Reach the target',
    text: 'Fill the score bar to clear the stage and earn stars!',
    focus: {
      x: 10,
      y: 6,
      w: Math.max(120, layout.originX + layout.gridW + 20),
      h: HUD_HEIGHT - 8,
    },
  };
}

function drawTutorialOverlay(ctx, w, h, state, layout) {
  const step = getTutorialStepConfig(state, layout);
  const focus = step.focus;

  ctx.save();
  ctx.fillStyle = 'rgba(4, 10, 18, 0.52)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  roundRect(ctx, focus.x, focus.y, focus.w, focus.h, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#9ccbf2';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  roundRect(ctx, focus.x, focus.y, focus.w, focus.h, 10);
  ctx.stroke();
  ctx.restore();

  const panelW = Math.min(460, w - 32);
  const panelH = 98;
  const panelX = Math.floor((w - panelW) / 2);
  const panelY = h - panelH - 72;
  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(20, 36, 56, 0.96)');
  panelGrad.addColorStop(1, 'rgba(12, 24, 39, 0.97)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#8fc0e8';
  ctx.lineWidth = 1.6;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  ctx.fillStyle = '#f1f8ff';
  ctx.font = `700 18px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(step.title, panelX + 16, panelY + 14);

  ctx.fillStyle = '#bfd8ee';
  ctx.font = `600 13px ${UI_FONT}`;
  ctx.fillText(step.text, panelX + 16, panelY + 48);

  const skip = getTutorialSkipRect(w, h);
  ctx.fillStyle = 'rgba(34, 52, 74, 0.95)';
  roundRect(ctx, skip.x, skip.y, skip.w, skip.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#9cc4e5';
  ctx.lineWidth = 1.4;
  roundRect(ctx, skip.x, skip.y, skip.w, skip.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#e7f3ff';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Skip Tutorial', skip.x + skip.w / 2, skip.y + skip.h / 2);
}

function getTitleButtonLayout(w, h) {
  const bw = Math.min(260, w - 64);
  const bh = 50;
  const x = Math.floor((w - bw) / 2);
  const playY = Math.floor(h * 0.45);
  const upgradeY = playY + bh + 12;
  const statsY = upgradeY + bh + 12;
  const dailyY = statsY + bh + 12;
  const guideY = dailyY + bh + 12;
  return {
    play: { x, y: playY, w: bw, h: bh },
    upgrades: { x, y: upgradeY, w: bw, h: bh },
    stats: { x, y: statsY, w: bw, h: bh },
    daily: { x, y: dailyY, w: bw, h: bh },
    guide: { x, y: guideY, w: bw, h: bh },
  };
}

export function getTitleActionAt(px, py, w, h) {
  const btn = getTitleButtonLayout(w, h);
  if (inRect(px, py, btn.play)) return { type: 'play' };
  if (inRect(px, py, btn.upgrades)) return { type: 'upgrades' };
  if (inRect(px, py, btn.stats)) return { type: 'stats' };
  if (inRect(px, py, btn.daily)) return { type: 'daily' };
  if (inRect(px, py, btn.guide)) return { type: 'guide' };
  return null;
}

function drawTitleScreen(ctx, w, h, state) {
  const frame = Number(state.frameCount || 0);

  // Dynamic magical glow behind title
  const glowPulse = Math.sin(frame * 0.02) * 0.2 + 0.8;
  const bgGlow = ctx.createRadialGradient(w / 2, h * 0.24, 0, w / 2, h * 0.24, w * 0.4);
  bgGlow.addColorStop(0, `rgba(100, 160, 255, ${0.15 * glowPulse})`);
  bgGlow.addColorStop(0.4, `rgba(200, 180, 255, ${0.05 * glowPulse})`);
  bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, w, h);

  // Title gradient
  const titleGrad = ctx.createLinearGradient(w * 0.2, h * 0.18, w * 0.8, h * 0.3);
  titleGrad.addColorStop(0, '#f9e6b3');
  titleGrad.addColorStop(0.3, '#ffffff');
  titleGrad.addColorStop(0.7, '#dceaff');
  titleGrad.addColorStop(1, '#a6c8ff');
  
  ctx.fillStyle = titleGrad;
  ctx.font = `700 68px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Outer deep magical glow
  ctx.shadowColor = 'rgba(70, 130, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.fillText('Realm Weave', w / 2, h * 0.24);
  
  // Inner crisp bright glow
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText('Realm Weave', w / 2, h * 0.24);
  ctx.shadowBlur = 0;

  // Subtitle with faint glow
  ctx.shadowColor = 'rgba(180, 210, 255, 0.3)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#c8e0ff';
  ctx.font = `600 16px ${UI_FONT}`;
  ctx.fillText('Forge your civilization through the ages', w / 2, h * 0.31);
  ctx.shadowBlur = 0;

  const btn = getTitleButtonLayout(w, h);
  const drawBtn = (r, label, accent) => {
    // Subtle drop shadow for button
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    grad.addColorStop(0, 'rgba(26, 44, 66, 0.92)');
    grad.addColorStop(1, 'rgba(14, 30, 48, 0.94)');
    ctx.fillStyle = grad;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();

    // Reset shadow for border and text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.0; // Slightly thicker border
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.stroke();
    
    ctx.fillStyle = '#e9f4ff';
    ctx.font = `700 19px ${UI_FONT}`;
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  };

  drawBtn(btn.play, 'Play', '#f0c877');
  drawBtn(btn.upgrades, `Upgrades (${state.totalStars || 0}★)`, '#84d7b2');
  drawBtn(btn.stats, 'Stats [S]', '#d09fee');
  drawBtn(btn.daily, 'Daily Challenge', '#f6ad7a');
  drawBtn(btn.guide, 'How to Play [G]', '#84bff0');

  ctx.fillStyle = '#95abc6';
  ctx.font = `600 12px ${UI_FONT}`;
  ctx.fillText('Tap or click to begin', w / 2, btn.guide.y + btn.guide.h + 18);

  if (state.mode !== 'paused') {
    drawTopControls(ctx, w, state);
  }
}

function getPauseOverlayLayout(w, h) {
  const pw = Math.min(340, w - 36);
  const ph = 260; // Increased height for 3 buttons
  const x = Math.floor((w - pw) / 2);
  const y = Math.floor((h - ph) / 2);
  const bw = pw - 40;
  const bh = 44;
  return {
    panel: { x, y, w: pw, h: ph },
    resume: { x: x + 20, y: y + 80, w: bw, h: bh },
    stageSelect: { x: x + 20, y: y + 134, w: bw, h: bh },
    quit: { x: x + 20, y: y + 188, w: bw, h: bh }, // New quit button
  };
}

export function getPauseOverlayActionAt(px, py, w, h) {
  const layout = getPauseOverlayLayout(w, h);
  if (inRect(px, py, layout.resume)) return { type: 'resume' };
  if (inRect(px, py, layout.stageSelect)) return { type: 'stageSelect' };
  if (inRect(px, py, layout.quit)) return { type: 'quit' };
  return null;
}

function drawPauseOverlay(ctx, w, h, state) {
  const layout = getPauseOverlayLayout(w, h);
  ctx.fillStyle = 'rgba(4, 8, 14, 0.62)';
  ctx.fillRect(0, 0, w, h);

  const panelGrad = ctx.createLinearGradient(layout.panel.x, layout.panel.y, layout.panel.x, layout.panel.y + layout.panel.h);
  panelGrad.addColorStop(0, 'rgba(24, 36, 52, 0.97)');
  panelGrad.addColorStop(1, 'rgba(13, 24, 38, 0.98)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h, 12);
  ctx.fill();

  ctx.strokeStyle = '#3a5068';
  ctx.lineWidth = 1.5;
  roundRect(ctx, layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h, 12);
  ctx.stroke();

  ctx.fillStyle = '#f2f6ff';
  ctx.font = `700 27px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Paused', w / 2, layout.panel.y + 40);

  const drawBtn = (r, label, accent) => {
    const bg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    bg.addColorStop(0, 'rgba(32, 48, 66, 0.9)');
    bg.addColorStop(1, 'rgba(20, 32, 48, 0.9)');
    ctx.fillStyle = bg;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#e4efff';
    ctx.font = `600 16px ${UI_FONT}`;
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  };

  drawBtn(layout.resume, 'Resume [Esc]', '#6fb2df');
  drawBtn(layout.stageSelect, 'Stage Select', '#f0c877');
  drawBtn(layout.quit, 'Quit to Main Menu', '#ff8888');
  drawTopControls(ctx, w, state);
}

function getGuideLayout(w, h) {
  const panelW = Math.min(680, w - 36);
  const panelH = Math.min(760, h - 38);
  const panelX = Math.floor((w - panelW) / 2);
  const panelY = Math.floor((h - panelH) / 2);
  const backW = 160;
  const backH = 42;
  const backX = panelX + panelW - backW - 22;
  const backY = panelY + panelH - backH - 18;
  return { panelX, panelY, panelW, panelH, backX, backY, backW, backH };
}

export function getGuideActionAt(px, py, w, h) {
  const { backX, backY, backW, backH } = getGuideLayout(w, h);
  if (px >= backX && px <= backX + backW && py >= backY && py <= backY + backH) {
    return { type: 'back' };
  }
  return null;
}

function drawGuideScreen(ctx, w, h, state) {
  const { panelX, panelY, panelW, panelH, backX, backY, backW, backH } = getGuideLayout(w, h);

  ctx.fillStyle = 'rgba(5, 8, 14, 0.56)';
  ctx.fillRect(0, 0, w, h);

  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(24, 38, 56, 0.97)');
  panelGrad.addColorStop(1, 'rgba(12, 22, 36, 0.97)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, panelX, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.strokeStyle = '#88bce6';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 14);
  ctx.stroke();

  ctx.fillStyle = '#f0f7ff';
  ctx.font = `700 30px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('How to Play', panelX + 24, panelY + 22);

  ctx.fillStyle = '#aac8e5';
  ctx.font = `600 13px ${UI_FONT}`;
  ctx.fillText('Build your civilization by placing and merging tiles through the ages.', panelX + 24, panelY + 62);

  const sections = [
    {
      title: 'Core Goal',
      lines: [
        'Reach the stage target score before the board jams.',
        'Finish in fewer turns to earn more stars.'
      ],
    },
    {
      title: 'Basic Flow',
      lines: [
        '1) Place the current tile from PLACE into an empty cell.',
        '2) Matching adjacent tiles merge and increase tier/value.',
        '3) New tile appears from NEXT queue each turn.'
      ],
    },
    {
      title: 'Controls',
      lines: [
        'Mouse/Touch: tap a cell to place tile.',
        'Q / E or Swipe: rotate ring queue.',
        'H: Hold tile (when unlocked).',
        'C: Catalyst mode (when unlocked).',
        'Esc: Pause / close guide.'
      ],
    },
    {
      title: 'Hazards & Tips',
      lines: [
        'Flood/Raid/Pollution can destroy tiles and disrupt merges.',
        'Use Hold and Catalyst to rescue bad turns.',
        'Chain merges boost score fast and can grant charge bonuses.'
      ],
    },
  ];

  let y = panelY + 104;
  for (const section of sections) {
    ctx.fillStyle = '#dff0ff';
    ctx.font = `700 17px ${UI_TITLE_FONT}`;
    ctx.fillText(section.title, panelX + 24, y);
    y += 26;

    ctx.fillStyle = '#c0d6ec';
    ctx.font = `600 13px ${UI_FONT}`;
    for (const line of section.lines) {
      ctx.fillText(line, panelX + 30, y);
      y += 22;
    }
    y += 8;
  }

  ctx.fillStyle = 'rgba(34, 52, 74, 0.9)';
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.fill();
  ctx.strokeStyle = '#8ac1ea';
  ctx.lineWidth = 1.5;
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.stroke();
  ctx.fillStyle = '#e8f4ff';
  ctx.font = `700 13px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Back [Esc]', backX + backW / 2, backY + backH / 2);

  drawTopControls(ctx, w, state);
}

// --- Master render ---

export function renderFrame(ctx, w, h, state, getGridLayout) {
  accessibilityVisuals.colorBlindMode = !!state.colorBlindMode;
  // Screen shake offset
  let shakeX = 0, shakeY = 0;
  if (state.screenShake > 0) {
    const intensity = Math.min(6, state.screenShake * 18);
    shakeX = (Math.random() - 0.5) * intensity;
    shakeY = (Math.random() - 0.5) * intensity;
  }

  ctx.save();
  if (shakeX || shakeY) ctx.translate(shakeX, shakeY);

  drawBackground(ctx, w, h, state);

  if (state.mode === 'title') {
    drawTitleScreen(ctx, w, h, state);
    ctx.restore();
    return;
  }

  if (state.mode === 'stageselect') {
    drawStageSelect(ctx, w, h, state);
    ctx.restore();
    return;
  }

  if (state.mode === 'guide') {
    drawGuideScreen(ctx, w, h, state);
    ctx.restore();
    return;
  }

  if (state.mode === 'upgradeshop') {
    drawUpgradeShop(ctx, w, h, state);
    ctx.restore();
    return;
  }

  if (state.mode === 'stats') {
    drawStatsScreen(ctx, w, h, state);
    ctx.restore();
    return;
  }

  drawHUD(ctx, w, state);
  drawRingArea(ctx, w, h, state);

  const layout = getGridLayout(w, h);
  drawGrid(ctx, layout, state);

  // Merge flash glow overlays
  if (state.mergeFlashes && state.mergeFlashes.length > 0) {
    drawMergeFlashes(ctx, layout, state.mergeFlashes);
  }

  // Catalyst mode overlay
  if (state.catalystMode) {
    drawCatalystOverlay(ctx, layout, state);
  }

  // Combo popup
  if (state.comboPopup) {
    drawComboPopup(ctx, w, h, layout, state.comboPopup);
  }

  if (state.mode === 'playing' && state.mechanicNotification) {
    drawMechanicNotification(ctx, w, h, state.mechanicNotification);
  }

  if (state.mode === 'playing' && state.hint) {
    drawHint(ctx, w, h, layout, state.hint);
  }

  if (state.mode === 'playing' && state.tutorialStep > 0) {
    drawTutorialOverlay(ctx, w, h, state, layout);
  }

  if (state.mode === 'playing' && state.hazardFlash) {
    drawHazardFlash(ctx, layout, state.hazardFlash);
  }

  if (state.mode === 'paused') {
    drawPauseOverlay(ctx, w, h, state);
  }

  if (state.mode === 'stageclear') {
    drawStageClear(ctx, w, h, state);
  } else if (state.mode === 'gameover') {
    drawGameOver(ctx, w, h, state);
  }

  if (state.transition) {
    drawTransitionOverlay(ctx, w, h, state.transition);
  }

  ctx.restore();
}

function getUpgradeShopLayout(w, h) {
  const panelW = Math.min(600, w - 40);
  const panelH = Math.min(620, h - 36);
  const panelX = Math.floor((w - panelW) / 2);
  const panelY = Math.floor((h - panelH) / 2);
  const rowH = 88;
  const listX = panelX + 18;
  const listY = panelY + 88;
  const listW = panelW - 36;
  const backW = 130;
  const backH = 42;
  const backX = panelX + panelW - backW - 20;
  const backY = panelY + panelH - backH - 16;
  return { panelX, panelY, panelW, panelH, listX, listY, listW, rowH, backX, backY, backW, backH };
}

export function getUpgradeShopActionAt(px, py, w, h, state) {
  const layout = getUpgradeShopLayout(w, h);

  if (px >= layout.backX && px <= layout.backX + layout.backW && py >= layout.backY && py <= layout.backY + layout.backH) {
    return { type: 'back' };
  }

  for (let i = 0; i < UPGRADE_DEFS.length; i++) {
    const y = layout.listY + i * layout.rowH;
    if (px < layout.listX || px > layout.listX + layout.listW || py < y || py > y + layout.rowH - 10) continue;

    const def = UPGRADE_DEFS[i];
    const level = Number(state.upgradeLevels?.[def.id]) || 0;
    if (level >= MAX_UPGRADE_LEVEL) return null;
    return { type: 'upgrade', id: def.id };
  }

  return null;
}

function drawUpgradeShop(ctx, w, h, state) {
  const layout = getUpgradeShopLayout(w, h);
  const { panelX, panelY, panelW, panelH, listX, listY, listW, rowH, backX, backY, backW, backH } = layout;

  ctx.fillStyle = 'rgba(5, 8, 14, 0.5)';
  ctx.fillRect(0, 0, w, h);

  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(24, 36, 52, 0.96)');
  panelGrad.addColorStop(1, 'rgba(12, 22, 36, 0.96)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#88b6dc';
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  ctx.fillStyle = '#edf7ff';
  ctx.font = `700 26px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Meta Upgrades', panelX + 20, panelY + 28);

  ctx.fillStyle = STAR_COLOR;
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`Total Stars: ${state.totalStars || 0}`, panelX + panelW - 20, panelY + 30);

  ctx.fillStyle = '#9eb6d2';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Click an upgrade to purchase the next level', panelX + 20, panelY + 52);

  for (let i = 0; i < UPGRADE_DEFS.length; i++) {
    const def = UPGRADE_DEFS[i];
    const y = listY + i * rowH;
    const rowHActual = rowH - 10;
    const level = Number(state.upgradeLevels?.[def.id]) || 0;
    const maxed = level >= MAX_UPGRADE_LEVEL;
    const cost = getUpgradeCost(def.id, level);
    const affordable = !maxed && Number(state.totalStars || 0) >= Number(cost || 0);

    ctx.fillStyle = maxed
      ? 'rgba(44, 50, 38, 0.95)'
      : affordable
        ? 'rgba(36, 66, 40, 0.88)'
        : 'rgba(50, 36, 20, 0.88)';
    roundRect(ctx, listX, y, listW, rowHActual, 10);
    ctx.fill();

    ctx.strokeStyle = maxed ? '#7fa067' : (affordable ? '#5dcc86' : '#7c6040');
    ctx.lineWidth = 1.5;
    roundRect(ctx, listX, y, listW, rowHActual, 10);
    ctx.stroke();

    if (i === (state.selectedUpgradeIndex ?? -1)) {
      ctx.save();
      ctx.strokeStyle = '#f5d488';
      ctx.lineWidth = 2.4;
      roundRect(ctx, listX - 1, y - 1, listW + 2, rowHActual + 2, 11);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#edf7ff';
    ctx.font = `700 15px ${UI_TITLE_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(def.name, listX + 14, y + 22);

    ctx.fillStyle = '#a8c1dd';
    ctx.font = `600 10px ${UI_FONT}`;
    ctx.fillText(def.description, listX + 14, y + 38);

    const preview = getLevelDescription(def.id, level);
    ctx.fillStyle = '#cde8ff';
    ctx.font = `700 10px ${UI_FONT}`;
    ctx.fillText(preview, listX + 14, y + 51);

    const levelText = `Lvl ${level}/${MAX_UPGRADE_LEVEL}`;
    const levelBar = '★'.repeat(level) + '☆'.repeat(MAX_UPGRADE_LEVEL - level);
    ctx.fillStyle = STAR_COLOR;
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.fillText(`${levelText}  ${levelBar}`, listX + 14, y + 65);

    ctx.textAlign = 'right';
    if (maxed) {
      ctx.fillStyle = '#8fd19d';
      ctx.font = `700 13px ${UI_FONT}`;
      ctx.fillText('MAX', listX + listW - 16, y + 40);
    } else {
      ctx.fillStyle = affordable ? '#b0ffd0' : '#f0c090';
      ctx.font = `700 13px ${UI_FONT}`;
      ctx.fillText(`Cost: ${cost}★`, listX + listW - 16, y + 35);
      ctx.fillStyle = '#9ab2cd';
      ctx.font = `600 10px ${UI_FONT}`;
      ctx.fillText(affordable ? 'Click to buy' : 'Not enough stars', listX + listW - 16, y + 54);
    }
  }

  const purchase = state.lastUpgradePurchase;
  if (purchase) {
    const msg = purchase.ok
      ? 'Upgrade purchased!'
      : purchase.reason === 'insufficient'
        ? 'Not enough stars for that upgrade'
        : purchase.reason === 'maxed'
          ? 'Upgrade already maxed'
          : 'Cannot purchase right now';
    ctx.fillStyle = purchase.ok ? '#83df98' : '#f2a67b';
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(msg, panelX + 20, panelY + panelH - 24);
  }

  ctx.fillStyle = 'rgba(34, 52, 74, 0.9)';
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.fill();
  ctx.strokeStyle = '#88c0eb';
  ctx.lineWidth = 1.5;
  roundRect(ctx, backX, backY, backW, backH, 8);
  ctx.stroke();
  ctx.fillStyle = '#d8e9f7';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Back [Esc]', backX + backW / 2, backY + backH / 2);

  if (state.mode !== 'paused') {
    drawTopControls(ctx, w, state);
  }
}

// --- Background ---

function drawBackground(ctx, w, h, state) {
  const useEraTheme = ['playing', 'paused', 'stageclear', 'gameover'].includes(state.mode) && state.stageId > 0;
  const theme = useEraTheme ? ERA_THEMES[state.stageId] : null;
  const gradColors = theme?.grad || ['#07111f', '#122338', '#16314c', '#0a1729'];
  const grad = ctx.createLinearGradient(0, 0, w * 0.65, h);
  grad.addColorStop(0, gradColors[0]);
  grad.addColorStop(0.4, gradColors[1]);
  grad.addColorStop(0.75, gradColors[2] || gradColors[1]);
  grad.addColorStop(1, gradColors[3] || gradColors[2] || gradColors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const haloColor = theme?.halo || 'rgba(89, 153, 214, 0.28)';
  const haloA = ctx.createRadialGradient(w * 0.2, h * 0.15, 20, w * 0.2, h * 0.15, w * 0.45);
  haloA.addColorStop(0, haloColor);
  haloA.addColorStop(1, 'rgba(89, 153, 214, 0)');
  ctx.fillStyle = haloA;
  ctx.fillRect(0, 0, w, h);

  const haloB = ctx.createRadialGradient(w * 0.82, h * 0.2, 14, w * 0.82, h * 0.2, w * 0.38);
  haloB.addColorStop(0, 'rgba(150, 207, 178, 0.24)');
  haloB.addColorStop(1, 'rgba(150, 207, 178, 0)');
  ctx.fillStyle = haloB;
  ctx.fillRect(0, 0, w, h);

  // Subtle texture overlay — diagonal lines
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = '#98c5e8';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();

  if (state.reducedMotion) return;

  const frame = Number(state?.frameCount || 0);
  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 18; i++) {
    const phase = frame * 0.014 + i * 0.41;
    const x = (Math.sin(phase * 0.7) * 0.44 + 0.5) * w;
    const y = (Math.cos(phase * 0.53) * 0.46 + 0.5) * h;
    const r = 0.7 + (i % 3) * 0.45;
    ctx.fillStyle = i % 4 === 0 ? '#dff1ff' : '#bad8f8';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- Stage Select Screen ---

function getStageButtonLayout(w, h) {
  const compact = h < 750;
  const btnW = Math.min(STAGE_BTN_W, w - 40);
  const btnH = compact ? 76 : STAGE_BTN_H;
  const gap = compact ? 8 : STAGE_BTN_GAP;
  const contentTop = STAGE_HEADER_H + STAGE_CONTENT_PAD;
  const contentBottom = h - 6;
  const viewH = contentBottom - contentTop;
  const count = STAGES.length;
  const totalContentH = count * (btnH + gap) - gap + 16;
  const maxScroll = Math.max(0, totalContentH - viewH);
  const startX = Math.floor((w - btnW) / 2);
  return { startX, contentTop, contentBottom, viewH, btnW, btnH, gap, compact, totalContentH, maxScroll };
}

export function getStageSelectMaxScroll(w, h) {
  const { maxScroll } = getStageButtonLayout(w, h);
  return maxScroll;
}

function getNavToolbarLayout(w) {
  const toolbarY = 36;
  const btnH = SHOP_BTN_H;
  const gap = 6;
  const btnW = Math.min(88, Math.max(68, Math.floor((w - 60) / 5)));
  const totalW = btnW * 4 + gap * 3;
  const startX = Math.floor((w - totalW) / 2);
  return {
    home:     { x: startX, y: toolbarY, w: btnW, h: btnH },
    guide:    { x: startX + btnW + gap, y: toolbarY, w: btnW, h: btnH },
    stats:    { x: startX + (btnW + gap) * 2, y: toolbarY, w: btnW, h: btnH },
    upgrades: { x: startX + (btnW + gap) * 3, y: toolbarY, w: btnW, h: btnH },
  };
}

export function getStageButtonAt(px, py, w, h, _stages, scrollY) {
  const nav = getNavToolbarLayout(w);
  if (inRect(px, py, nav.upgrades)) return { type: 'shop' };
  if (inRect(px, py, nav.guide)) return { type: 'guide' };
  if (inRect(px, py, nav.stats)) return { type: 'stats' };
  if (inRect(px, py, nav.home)) return { type: 'home' };

  const layout = getStageButtonLayout(w, h);
  const scroll = scrollY || 0;
  if (py < layout.contentTop || py > layout.contentBottom) return null;

  for (let i = 0; i < STAGES.length; i++) {
    const cardY = layout.contentTop + 8 + i * (layout.btnH + layout.gap) - scroll;
    if (cardY + layout.btnH < layout.contentTop || cardY > layout.contentBottom) continue;
    if (px >= layout.startX && px <= layout.startX + layout.btnW && py >= cardY && py <= cardY + layout.btnH) {
      return { type: 'stage', stageId: STAGES[i].id };
    }
  }
  return null;
}

function drawNavToolbarBtn(ctx, rect, label, accent) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, 'rgba(28, 42, 60, 0.92)');
  grad.addColorStop(1, 'rgba(16, 26, 40, 0.94)');
  ctx.fillStyle = grad;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.3;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.stroke();
  ctx.fillStyle = '#e5f0ff';
  ctx.font = `700 10px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawStageSelect(ctx, w, h, state) {
  const layout = getStageButtonLayout(w, h);
  const scrollY = state.stageSelectScrollY || 0;
  const frame = Number(state.frameCount || 0);

  // --- Fixed header ---
  ctx.fillStyle = '#f0f6ff';
  ctx.font = `700 22px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Choose Your Era', w / 2, 14);

  // Star badge
  ctx.fillStyle = STAR_COLOR;
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`★ ${state.totalStars || 0}`, 14, 14);

  // Navigation toolbar
  const nav = getNavToolbarLayout(w);
  drawNavToolbarBtn(ctx, nav.home, '← Home', '#a8c2d9');
  drawNavToolbarBtn(ctx, nav.guide, 'Guide', '#84bff0');
  drawNavToolbarBtn(ctx, nav.stats, 'Stats', '#c8a9ee');
  drawNavToolbarBtn(ctx, nav.upgrades, 'Upgrades', '#6cc78a');

  // --- Scrollable card region ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, layout.contentTop, w, layout.viewH);
  ctx.clip();

  const cardStartY = layout.contentTop + 8 - scrollY;

  // --- Progression path (behind cards) ---
  const pathX = layout.startX + 24;
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const cardY = cardStartY + i * (layout.btnH + layout.gap);
    const nodeCY = cardY + layout.btnH / 2;
    const unlocked = s.id <= (state.highestStageUnlocked || 1);
    const completed = (state.stageStars[s.id] || 0) > 0;

    // Connecting line to next stage
    if (i < STAGES.length - 1) {
      const nextY = cardStartY + (i + 1) * (layout.btnH + layout.gap) + layout.btnH / 2;
      ctx.save();
      ctx.strokeStyle = completed ? (ERA_ACCENT[s.id] || '#4a6580') : 'rgba(80, 100, 130, 0.3)';
      ctx.lineWidth = completed ? 2.5 : 1.5;
      if (!completed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pathX, nodeCY + 8);
      ctx.lineTo(pathX, nextY - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Node circle
    const nodeR = completed ? 7 : 5;
    ctx.beginPath();
    ctx.arc(pathX, nodeCY, nodeR, 0, Math.PI * 2);
    if (completed) {
      ctx.fillStyle = ERA_ACCENT[s.id] || '#4a6580';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (unlocked) {
      ctx.fillStyle = 'rgba(40, 60, 85, 0.9)';
      ctx.fill();
      ctx.strokeStyle = ERA_ACCENT[s.id] || '#5a7a9a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(20, 25, 35, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#3a4555';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // --- Draw stage cards ---
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const cardY = cardStartY + i * (layout.btnH + layout.gap);
    const bestStars = state.stageStars[s.id] || 0;
    const bestScore = state.bestScores?.[s.id] || 0;
    const completedChallenges = state.completedChallenges?.[String(s.id)] || [];
    const unlocked = s.id <= (state.highestStageUnlocked || 1);
    const isNext = s.id === (state.highestStageUnlocked || 1) && bestStars === 0;
    const accent = ERA_ACCENT[s.id] || '#5a7a9a';
    const cardX = layout.startX + 42;
    const cardW = layout.btnW - 42;

    // Skip cards fully outside clip
    if (cardY + layout.btnH < layout.contentTop - 10 || cardY > layout.contentBottom + 10) continue;

    // Card background with era gradient
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + layout.btnH);
    const eraGrad = ERA_CARD_GRAD[s.id];
    if (unlocked && eraGrad) {
      cardGrad.addColorStop(0, eraGrad[0]);
      cardGrad.addColorStop(1, eraGrad[1]);
    } else {
      cardGrad.addColorStop(0, 'rgba(18, 20, 28, 0.94)');
      cardGrad.addColorStop(1, 'rgba(12, 14, 20, 0.96)');
    }
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cardX, cardY, cardW, layout.btnH, 10);
    ctx.fill();

    // Left accent stripe
    ctx.fillStyle = unlocked ? accent : '#2a3040';
    roundRect(ctx, cardX, cardY, 5, layout.btnH, 10);
    ctx.fill();
    ctx.fillRect(cardX + 3, cardY + 2, 3, layout.btnH - 4);

    // Card border
    ctx.strokeStyle = unlocked ? accent + '88' : '#2a3545';
    ctx.lineWidth = 1.4;
    roundRect(ctx, cardX, cardY, cardW, layout.btnH, 10);
    ctx.stroke();

    // Animated glow on "next" unlocked stage
    if (isNext && !state.reducedMotion) {
      const glowAlpha = 0.3 + Math.sin(frame * 0.06) * 0.15;
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = glowAlpha;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      roundRect(ctx, cardX - 1, cardY - 1, cardW + 2, layout.btnH + 2, 11);
      ctx.stroke();
      ctx.restore();
    }

    // Keyboard selection highlight
    if (i === (state.selectedStageIndex ?? -1)) {
      ctx.save();
      ctx.strokeStyle = STAR_COLOR;
      ctx.lineWidth = 2.5;
      roundRect(ctx, cardX - 2, cardY - 2, cardW + 4, layout.btnH + 4, 12);
      ctx.stroke();
      ctx.restore();
    }

    const textX = cardX + 16;

    if (unlocked) {
      // Era icon
      ctx.font = `24px ${UI_FONT}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(ERA_ICONS_SS[s.id] || '', cardX + cardW - 14, cardY + 22);

      // Stage title
      ctx.fillStyle = accent;
      ctx.font = `700 14px ${UI_TITLE_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Stage ${s.id}: ${s.era}`, textX, cardY + 16);

      // Stars
      const starStr = '★'.repeat(bestStars) + '☆'.repeat(3 - bestStars);
      ctx.fillStyle = bestStars > 0 ? STAR_COLOR : '#4a5d76';
      ctx.font = `700 14px ${UI_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(starStr, cardX + cardW - 14, cardY + layout.btnH - 16);

      // Target score
      ctx.fillStyle = '#b8d0e8';
      ctx.font = `700 10px ${UI_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`Target: ${s.target.toLocaleString()}`, textX, cardY + 34);

      // Best score with progress bar
      if (bestScore > 0) {
        const barX = textX;
        const barW = Math.min(140, cardW - 120);
        const barY = cardY + 44;
        const barH = 6;
        const progress = Math.min(1, bestScore / s.target);

        ctx.fillStyle = 'rgba(10, 18, 28, 0.8)';
        roundRect(ctx, barX, barY, barW, barH, 3);
        ctx.fill();

        if (progress > 0) {
          const fillW = Math.max(6, barW * progress);
          const barFillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
          barFillGrad.addColorStop(0, accent);
          barFillGrad.addColorStop(1, progress >= 1 ? STAR_COLOR : accent + 'aa');
          ctx.fillStyle = barFillGrad;
          roundRect(ctx, barX, barY, fillW, barH, 3);
          ctx.fill();
        }

        ctx.fillStyle = '#8ca4bc';
        ctx.font = `600 9px ${UI_FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(`Best: ${bestScore.toLocaleString()}`, barX + Math.min(140, cardW - 120) + 6, barY + 3);
      }

      // Description
      ctx.fillStyle = '#7a96b0';
      ctx.font = `600 9px ${UI_FONT}`;
      ctx.textAlign = 'left';
      const maxDescW = cardW - 80;
      const desc = s.description.length > 48 ? s.description.slice(0, 46) + '…' : s.description;
      ctx.fillText(desc, textX, cardY + 58);

      // Mechanic badges
      const badges = [];
      if (s.mechanics.includes('hold')) badges.push('Hold');
      if (s.mechanics.includes('catalyst')) badges.push('Catalyst');
      if (s.mechanics.includes('comboX3')) badges.push('×3');
      if (s.mechanics.includes('techTile')) badges.push('Tech');
      if (s.gridSize > 5) badges.push(`${s.gridSize}×${s.gridSize}`);

      if (badges.length > 0) {
        let badgeX = textX;
        const badgeY = cardY + layout.btnH - 18;
        ctx.font = `700 8px ${UI_FONT}`;
        for (const badge of badges) {
          const bw = ctx.measureText(badge).width + 10;
          ctx.fillStyle = accent + '44';
          roundRect(ctx, badgeX, badgeY, bw, 14, 3);
          ctx.fill();
          ctx.fillStyle = accent;
          ctx.textAlign = 'center';
          ctx.fillText(badge, badgeX + bw / 2, badgeY + 7);
          badgeX += bw + 4;
        }
      }

      // Challenge badge
      if (completedChallenges.length > 0) {
        ctx.fillStyle = 'rgba(102, 74, 24, 0.9)';
        const cbX = cardX + cardW - 70;
        const cbY = cardY + layout.btnH - 20;
        roundRect(ctx, cbX, cbY, 56, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#ffe3a1';
        ctx.font = `700 9px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`🏅 ${completedChallenges.length}`, cbX + 28, cbY + 8);
      }
    } else {
      // Locked card
      ctx.fillStyle = 'rgba(8, 10, 16, 0.5)';
      roundRect(ctx, cardX, cardY, cardW, layout.btnH, 10);
      ctx.fill();

      ctx.fillStyle = '#5a6878';
      ctx.font = `700 13px ${UI_TITLE_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Stage ${s.id}: ${s.era}`, textX, cardY + 24);

      ctx.fillStyle = '#3e4e5e';
      ctx.font = `700 24px ${UI_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('🔒', cardX + cardW - 18, cardY + layout.btnH / 2);

      ctx.fillStyle = '#4a5868';
      ctx.font = `600 10px ${UI_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('Clear previous stage to unlock', textX, cardY + 46);

      // Dim stars
      ctx.fillStyle = '#2a3545';
      ctx.font = `700 13px ${UI_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('☆☆☆', cardX + cardW - 18, cardY + layout.btnH - 14);
    }
  }

  ctx.restore(); // end clip

  // --- Scroll fade indicators ---
  if (scrollY > 0) {
    const fadeTop = ctx.createLinearGradient(0, layout.contentTop, 0, layout.contentTop + 24);
    fadeTop.addColorStop(0, 'rgba(7, 17, 31, 0.85)');
    fadeTop.addColorStop(1, 'rgba(7, 17, 31, 0)');
    ctx.fillStyle = fadeTop;
    ctx.fillRect(0, layout.contentTop, w, 24);
    ctx.fillStyle = '#8ab0d6';
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲', w / 2, layout.contentTop + 8);
  }
  if (scrollY < layout.maxScroll) {
    const fadeBot = ctx.createLinearGradient(0, layout.contentBottom - 24, 0, layout.contentBottom);
    fadeBot.addColorStop(0, 'rgba(7, 17, 31, 0)');
    fadeBot.addColorStop(1, 'rgba(7, 17, 31, 0.85)');
    ctx.fillStyle = fadeBot;
    ctx.fillRect(0, layout.contentBottom - 24, w, 24);
    ctx.fillStyle = '#8ab0d6';
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼', w / 2, layout.contentBottom - 8);
  }

  drawTopControls(ctx, w, state);
}

// --- HUD ---

function drawHUD(ctx, w, state) {
  const hudGrad = ctx.createLinearGradient(18, 4, 18, HUD_HEIGHT);
  hudGrad.addColorStop(0, 'rgba(13, 26, 42, 0.88)');
  hudGrad.addColorStop(1, 'rgba(8, 18, 30, 0.8)');
  ctx.fillStyle = hudGrad;
  roundRect(ctx, 10, 6, w - 20, HUD_HEIGHT - 8, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 172, 220, 0.35)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, 10, 6, w - 20, HUD_HEIGHT - 8, 14);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#f0f6ff';
  ctx.font = `700 20px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Realm Weave', w / 2, 16);

  // Era + Stage
  const era = ERA_NAMES[state.stage] || `Stage ${state.stage}`;
  ctx.fillStyle = '#adc9e5';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.fillText(`— ${era} Era —`, w / 2, 34);

  // Score / Turn / Combo row
  const parts = [];
  
  // Score with bleed indication
  let scoreText = `Score: ${state.score.toLocaleString()}`;
  if (state.scoreBleedActive && state.lastBleedAmount > 0) {
    scoreText += ` -${state.lastBleedAmount}`;
  }
  parts.push(scoreText);
  
  parts.push(`Turn: ${state.turn}`);
  if (state.combo > 0) {
    let comboLabel = `Combo: ×${state.combo}`;
    if (state.comboX3Unlocked && state.combo >= 3) comboLabel += ' ×3!';
    parts.push(comboLabel);
  }
  if (state.holdUnlocked) {
    parts.push(state.holdCostsCharge ? 'Hold [H]: -1 charge' : 'Hold [H]');
  }
  parts.push(`Stars: ${state.totalStars || 0}`);

  // Pulsing red effect for score when bleed is active
  if (state.scoreBleedActive) {
    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7; // Pulse between 0.4 and 1.0
    ctx.fillStyle = `rgba(224, 85, 85, ${pulse})`; // Red with pulsing alpha
    ctx.font = `700 11px ${UI_FONT}`; // Slightly larger when bleeding
  } else {
    ctx.fillStyle = '#bdd3e8';
    ctx.font = `700 10px ${UI_FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(parts.join('  |  '), w / 2, 50);

  // Target progress bar
  if (state.stageConfig) {
    const target = state.stageConfig.target;
    const progress = Math.min(1, state.score / target);
    const barW = Math.min(280, w - 80);
    const barH = 8;
    const barX = Math.floor((w - barW) / 2);
    const barY = 58;

    // Bar background
    ctx.fillStyle = 'rgba(10, 22, 36, 0.95)';
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    // Bar fill
    if (progress > 0) {
      const fillW = Math.max(8, barW * progress);
      const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      barGrad.addColorStop(0, '#69b8eb');
      barGrad.addColorStop(1, progress >= 1 ? '#f6d48e' : '#9ecbe9');
      ctx.fillStyle = barGrad;
      roundRect(ctx, barX, barY, fillW, barH, 4);
      ctx.fill();
    }

    // Target label
    ctx.fillStyle = '#9cb2c8';
    ctx.font = `700 8px ${UI_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.score.toLocaleString()}/${target.toLocaleString()}`, barX + barW, barY - 4); // Moved above bar, right aligned

    const turnColor = state.turn <= state.stageConfig.turnLimit3Star
      ? '#7dd7a0'
      : state.turn <= state.stageConfig.turnLimit2Star
        ? '#f0cd7f'
        : '#d9e7f5';
    ctx.fillStyle = turnColor;
    ctx.font = `700 8px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(
      `Turn ${state.turn} / ★★★≤${state.stageConfig.turnLimit3Star} / ★★≤${state.stageConfig.turnLimit2Star}`,
      barX,
      barY + barH + 6 // Moved closer to bar
    );

    if (state.stageConfig.hazardFreq > 0) {
      const turnsUntilHazard = state.stageConfig.hazardFreq - (state.turn % state.stageConfig.hazardFreq);
      const hazardColor = turnsUntilHazard <= 2
        ? '#f09090'
        : turnsUntilHazard <= 4
          ? '#f0cd7f'
          : '#8ad9a2';
      ctx.fillStyle = hazardColor;
      ctx.font = `700 8px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ Hazard in ${turnsUntilHazard}`, w / 2, barY + barH + 6); // Moved down and centered with turn limits
    }
  }

  drawTopControls(ctx, w, state);
}

// --- Ring Area ---

function drawRingArea(ctx, w, h, state) {
  const ringY = HUD_HEIGHT + 2;
  const slotSize = 40;
  const slotGap = 5;
  const ringTiles = getRingTiles(state.ring);
  const ringCount = ringTiles.length;
  const foresightLevel = Number(state.upgradeLevels?.foresight) || 0;
  const previewCount = Math.max(1, Math.min(ringCount, 3 + foresightLevel));
  const totalRingW = previewCount * (slotSize + slotGap) - slotGap;

  // Centering: [HOLD] [CURRENT] [--- NEXT queue ---]
  const holdSize = 40;
  const currentSize = 48;
  const gapBetween = 12;
  const totalW = holdSize + gapBetween + currentSize + gapBetween + totalRingW;
  const startX = Math.floor((w - totalW) / 2);

  const ringPanelY = ringY + 10;
  const ringPanelH = 70;
  ctx.fillStyle = 'rgba(8, 19, 32, 0.58)';
  roundRect(ctx, startX - 12, ringPanelY, totalW + 24, ringPanelH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(126, 177, 226, 0.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, startX - 12, ringPanelY, totalW + 24, ringPanelH, 12);
  ctx.stroke();

  // --- Hold slot ---
  const holdX = startX;
  const holdY = ringY + 20;

  let holdLabel = 'HOLD';
  if (state.holdUnlocked) {
    holdLabel = state.holdCostsCharge ? 'HOLD [H]-1' : 'HOLD [H]';
  }
  drawSlotLabel(ctx, holdX, holdY, holdSize, holdLabel);

  if (state.holdUnlocked) {
    drawSlotBg(ctx, holdX, holdY, holdSize);
    if (state.heldTile) {
      drawTile(ctx, holdX, holdY, holdSize, state.heldTile);
    } else {
      ctx.fillStyle = '#9db4cc';
      ctx.font = `700 14px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', holdX + holdSize / 2, holdY + holdSize / 2);
    }
  } else {
    // Locked hold slot
    ctx.fillStyle = '#172436';
    roundRect(ctx, holdX, holdY, holdSize, holdSize, 4);
    ctx.fill();
    ctx.strokeStyle = '#31465d';
    ctx.lineWidth = 1;
    roundRect(ctx, holdX, holdY, holdSize, holdSize, 4);
    ctx.stroke();
    ctx.fillStyle = '#6f88a2';
    ctx.font = `700 14px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', holdX + holdSize / 2, holdY + holdSize / 2);
  }

  // --- Current tile ---
  const currentX = holdX + holdSize + gapBetween;
  const currentY = ringY + 16;

  drawSlotLabel(ctx, currentX, currentY, currentSize, 'PLACE');

  // Gold highlight
  ctx.save();
  ctx.shadowColor = '#8cc8ff';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#8cc8ff';
  ctx.lineWidth = 2.5;
  roundRect(ctx, currentX - 2, currentY - 2, currentSize + 4, currentSize + 4, 6);
  ctx.stroke();
  ctx.restore();

  if (state.currentTile) {
    drawTile(ctx, currentX, currentY, currentSize, state.currentTile);
  }

  // --- Discard button ---
  if (state.discardUnlocked) {
    const discardSize = 24;
    const discardX = currentX + currentSize + 4;
    const discardY = currentY + currentSize - discardSize - 4;
    
    // Discard button background
    const btnGrad = ctx.createLinearGradient(discardX, discardY, discardX, discardY + discardSize);
    btnGrad.addColorStop(0, '#2a3f5f');
    btnGrad.addColorStop(1, '#1e2940');
    ctx.fillStyle = btnGrad;
    roundRect(ctx, discardX, discardY, discardSize, discardSize, 4);
    ctx.fill();
    
    // Discard button border
    ctx.strokeStyle = state.discardCount >= 2 ? '#e74c3c' : '#7ea6d8';
    ctx.lineWidth = 1.5;
    roundRect(ctx, discardX, discardY, discardSize, discardSize, 4);
    ctx.stroke();
    
    // Discard icon (X)
    ctx.fillStyle = state.discardCount >= 2 ? '#e74c3c' : '#9db4cc';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', discardX + discardSize / 2, discardY + discardSize / 2);
    
    // Discard count indicator
    const countY = discardY + discardSize + 4;
    ctx.fillStyle = state.discardCount >= 2 ? '#e74c3c' : '#9db4cc';
    ctx.font = '700 9px Manrope';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const countText = state.discardCount === 0 ? 'DISCARD [X]' : 
                     state.discardCount === 1 ? 'Discards: 1' : 
                     `Discards: ${state.discardCount} (wall!)`;
    ctx.fillText(countText, discardX + discardSize / 2, countY);
  }

  // --- Next queue ---
  const ringStartX = currentX + currentSize + gapBetween;
  const ringSlotY = ringY + 20;

  drawSlotLabel(ctx, ringStartX, ringSlotY, totalRingW, 'NEXT');

  for (let i = 0; i < previewCount; i++) {
    const sx = ringStartX + i * (slotSize + slotGap);
    drawSlotBg(ctx, sx, ringSlotY, slotSize);
    drawTile(ctx, sx, ringSlotY, slotSize, ringTiles[i]);
  }

  // --- Rotate charges ---
  const chargesY = ringSlotY + slotSize + 5;
  const ring = state.ring;
  const chargeCount = Math.max(0, Math.floor(ring.rotateCharges || 0));
  const baseMax = Math.max(0, Math.floor(ring.maxRotateCharges || 0));
  const baseFilled = Math.min(chargeCount, baseMax);
  const bonusCharges = Math.max(0, chargeCount - baseMax);
  const filled = '⬤'.repeat(baseFilled) + (bonusCharges > 0 ? `+${bonusCharges}` : '');
  const empty = '○'.repeat(Math.max(0, baseMax - baseFilled));
  ctx.fillStyle = '#9cb4ce';
  ctx.font = `700 9px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`Rotate [Q/E]  ${filled}${empty}`, ringStartX + totalRingW / 2, chargesY);

  if (state.catalystUnlocked) {
    const maxCatalystCharges = 1;
    const catalystCharges = Math.max(0, Math.floor(state.catalystCharges || 0));
    const catalystY = chargesY + 12;
    const catalystLabelColor = catalystCharges > 0 ? '#9fc3e4' : '#6c8098';
    ctx.fillStyle = catalystLabelColor;
    ctx.font = `700 9px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const catalystText = '●'.repeat(Math.min(catalystCharges, maxCatalystCharges))
      + '○'.repeat(Math.max(0, maxCatalystCharges - catalystCharges));
    ctx.fillText(`Catalyst [C]  ${catalystText}`, ringStartX + totalRingW / 2, catalystY);
  }
}

function drawSlotLabel(ctx, x, y, size, text) {
  ctx.fillStyle = '#95b2cd';
  ctx.font = `700 9px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x + size / 2, y - 2);
}

function drawSlotBg(ctx, x, y, size) {
  const grad = ctx.createLinearGradient(x, y, x, y + size);
  grad.addColorStop(0, '#21384f');
  grad.addColorStop(1, '#16283d');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, size, size, 4);
  ctx.fill();
  ctx.strokeStyle = '#4c7094';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, size, size, 4);
  ctx.stroke();
}

// --- Grid ---

function drawGrid(ctx, layout, state) {
  const { originX, originY, cellSize, gridSize } = layout;
  const grid = state.grid;
  let emptyCells = 0;

  // Grid background panel
  const panelGrad = ctx.createLinearGradient(originX, originY, originX, originY + cellSize * gridSize);
  panelGrad.addColorStop(0, 'rgba(10, 24, 38, 0.66)');
  panelGrad.addColorStop(1, 'rgba(8, 16, 28, 0.7)');
  ctx.fillStyle = panelGrad;
  const panelPad = 6;
  roundRect(ctx,
    originX - panelPad, originY - panelPad,
    cellSize * gridSize + panelPad * 2,
    cellSize * gridSize + panelPad * 2,
    8
  );
  ctx.fill();
  ctx.strokeStyle = 'rgba(137, 186, 232, 0.35)';
  ctx.lineWidth = 1.2;
  roundRect(ctx,
    originX - panelPad, originY - panelPad,
    cellSize * gridSize + panelPad * 2,
    cellSize * gridSize + panelPad * 2,
    8
  );
  ctx.stroke();

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = originX + c * cellSize + CELL_GAP / 2;
      const y = originY + r * cellSize + CELL_GAP / 2;
      const s = cellSize - CELL_GAP;

      // Cell background
      const cellGrad = ctx.createLinearGradient(x, y, x, y + s);
      cellGrad.addColorStop(0, '#21384f');
      cellGrad.addColorStop(1, '#15263a');
      ctx.fillStyle = cellGrad;
      roundRect(ctx, x, y, s, s, 5);
      ctx.fill();

      // Cell border
      ctx.strokeStyle = 'rgba(106, 154, 198, 0.48)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, s, s, 5);
      ctx.stroke();

      // Frozen cell overlay
      const frozenCell = state.frozenCells?.find(fc => fc.row === r && fc.col === c);
      if (frozenCell) {
        ctx.save();
        // Ice blue tint overlay
        ctx.globalAlpha = 0.6;
        const iceGrad = ctx.createLinearGradient(x, y, x + s, y + s);
        iceGrad.addColorStop(0, 'rgba(173, 216, 230, 0.8)');
        iceGrad.addColorStop(1, 'rgba(135, 206, 235, 0.8)');
        ctx.fillStyle = iceGrad;
        roundRect(ctx, x, y, s, s, 5);
        ctx.fill();
        
        // Ice border
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#87CEEB';
        ctx.lineWidth = 2;
        roundRect(ctx, x + 1, y + 1, s - 2, s - 2, 4);
        ctx.stroke();
        
        // Snowflake icon
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(16, Math.floor(s * 0.4))}px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', x + s / 2, y + s / 2);
        
        // Turns remaining counter
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.max(8, Math.floor(s * 0.2))}px ${UI_FONT}`;
        ctx.fillText(`${frozenCell.turnsLeft}`, x + s - 8, y + 8);
        ctx.restore();
      }

      // Tile
      const tile = grid[r][c];
      if (tile) {
        const isPlacementAnim = state.placementAnim
          && state.placementAnim.row === r
          && state.placementAnim.col === c
          && state.placementAnim.timer > 0;
        if (isHazardTile(tile)) {
          if (isPlacementAnim) {
            drawPlacementAnimatedTile(ctx, x, y, s, tile, state.placementAnim);
          } else {
            drawHazardTile(ctx, x, y, s, tile);
          }
        } else {
          if (isPlacementAnim) {
            drawPlacementAnimatedTile(ctx, x, y, s, tile, state.placementAnim);
          } else {
            drawTile(ctx, x, y, s, tile, state);
          }
        }
      } else if (
        state.mode === 'playing'
        && !state.catalystMode
        && state.hoverCell
        && state.currentTile
        && state.hoverCell.row === r
        && state.hoverCell.col === c
        && !frozenCell // Don't show ghost preview on frozen cells
      ) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        drawTile(ctx, x, y, s, state.currentTile);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(166, 210, 245, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 5);
        ctx.stroke();
        ctx.restore();
        emptyCells++;
      } else if (frozenCell) {
        // Show blocked indicator on frozen cells when hovering
        if (state.hoverCell && state.hoverCell.row === r && state.hoverCell.col === c) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 5);
          ctx.stroke();
          
          // Blocked icon
          ctx.fillStyle = 'rgba(255, 107, 107, 0.9)';
          ctx.font = `${Math.max(14, Math.floor(s * 0.35))}px ${UI_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('❄️', x + s / 2, y + s / 2);
          ctx.restore();
        }
        emptyCells++;
      } else {
        emptyCells++;
      }

      if (
        state.mode === 'playing'
        && state.catalystMode
        && state.catalystFirst
        && state.hoverCell
        && state.hoverCell.row === r
        && state.hoverCell.col === c
        && tile
        && !isHazardTile(tile)
      ) {
        const dr = Math.abs(state.catalystFirst.row - r);
        const dc = Math.abs(state.catalystFirst.col - c);
        const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        const isSameCell = state.catalystFirst.row === r && state.catalystFirst.col === c;
        if (isAdjacent && !isSameCell) {
          ctx.save();
          ctx.shadowColor = '#b9ddff';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#b9ddff';
          ctx.lineWidth = 2.5;
          roundRect(ctx, x + 1, y + 1, s - 2, s - 2, 5);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  if (emptyCells <= 3) {
    const pulse = 0.25 + (Math.sin(state.frameCount * 0.1) * 0.5 + 0.5) * 0.45;
    ctx.save();
    ctx.strokeStyle = `rgba(240, 92, 92, ${pulse})`;
    ctx.lineWidth = 3;
    roundRect(ctx, originX - 8, originY - 8, cellSize * gridSize + 16, cellSize * gridSize + 16, 10);
    ctx.stroke();
    ctx.restore();
  }
}

function easeOutQuad(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) * (1 - clamped);
}

function drawPlacementAnimatedTile(ctx, x, y, s, tile, anim) {
  const progress = 1 - (anim.timer / anim.duration);
  const eased = easeOutQuad(progress);
  const scale = 0.5 + 0.5 * eased;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = eased;
  drawTile(ctx, -s / 2, -s / 2, s, tile);
  ctx.restore();
}

function drawHazardFlash(ctx, layout, flash) {
  const { originX, originY, cellSize } = layout;
  const cx = originX + flash.col * cellSize + cellSize / 2;
  const cy = originY + flash.row * cellSize + cellSize / 2;
  const progress = 1 - (flash.timer / flash.duration);
  const eased = easeOutQuad(progress);

  const color = flash.kind === 'pollution'
    ? 'rgba(100, 220, 120, 0.9)'
    : flash.kind === 'raid'
      ? 'rgba(184, 110, 236, 0.9)'
      : flash.kind === 'earthquake'
        ? 'rgba(255, 150, 82, 0.92)'
        : 'rgba(100, 180, 255, 0.9)';

  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - eased);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, eased * cellSize * 1.25 + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTransitionOverlay(ctx, w, h, transition) {
  const progress = 1 - (transition.timer / transition.duration);
  const alpha = progress < 0.5
    ? progress * 2
    : (1 - progress) * 2;
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha * 0.9)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// --- Tile ---

export function drawTile(ctx, x, y, size, tile, state = null) {
  if (isHazardTile(tile)) {
    drawHazardTile(ctx, x, y, size, tile);
    return;
  }
  if (tile?.type === 'wall') {
    drawWallTile(ctx, x, y, size, tile);
    return;
  }
  if (tile?.isCursed) {
    drawCursedTile(ctx, x, y, size);
    return;
  }
  if (isTechTile(tile)) {
    drawTechTile(ctx, x, y, size);
    return;
  }

  const tier = tile.tier;
  const bg = TIER_BG_COLORS[tier] || '#888';
  const border = TIER_BORDER_COLORS[tier] || '#aaa';
  const icon = TIER_ICONS[tier] || '?';

  // Tile body with rounded corners
  const tileGrad = ctx.createLinearGradient(x, y, x, y + size);
  tileGrad.addColorStop(0, lightenHex(bg, 0.22));
  tileGrad.addColorStop(1, darkenHex(bg, 0.25));
  ctx.fillStyle = tileGrad;
  roundRect(ctx, x, y, size, size, 5);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.25;
  const gleam = ctx.createRadialGradient(x + size * 0.32, y + size * 0.25, 1, x + size * 0.32, y + size * 0.25, size * 0.55);
  gleam.addColorStop(0, '#ffffff');
  gleam.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gleam;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
  ctx.fill();
  ctx.restore();

  // Inner highlight border
  ctx.strokeStyle = lightenHex(border, 0.16);
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();

  // Bottom shadow edge
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(ctx, x, y + size - 4, size, 4, { tl: 0, tr: 0, bl: 5, br: 5 });
  ctx.fill();

  if (accessibilityVisuals.colorBlindMode) {
    drawTierPattern(ctx, x, y, size, tier);
  }

  // Icon (emoji) — large, centered upper
  const iconSize = Math.max(12, Math.floor(size * 0.42));
  ctx.font = `${iconSize}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + size / 2, y + size * 0.40);

  // Tier name — small, below icon
  const nameSize = Math.max(7, Math.floor(size * 0.18));
  ctx.fillStyle = '#f7fbff';
  ctx.font = `700 ${nameSize}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tile.name.charAt(0).toUpperCase() + tile.name.slice(1), x + size / 2, y + size * 0.76);

  // Decay warning overlay
  if (state && state.mode === 'playing' && state.stageConfig?.decayAfter && tile.placedTurn != null) {
    const age = state.turn - tile.placedTurn;
    const threshold = state.stageConfig.decayAfter;
    const turnsUntilDecay = threshold - age;
    
    // Show warning when within 2 turns of decay
    if (turnsUntilDecay <= 2 && turnsUntilDecay > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4 + (0.3 * Math.sin(Date.now() * 0.003)); // Pulsing effect
      ctx.strokeStyle = turnsUntilDecay === 1 ? '#ff6b6b' : '#ffa726'; // Red for 1 turn, orange for 2 turns
      ctx.lineWidth = 2;
      roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 4);
      ctx.stroke();
      
      // Add crack overlay for urgent warning
      if (turnsUntilDecay === 1) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff6b6b';
        // Draw crack lines
        ctx.beginPath();
        ctx.moveTo(x + size * 0.3, y + size * 0.2);
        ctx.lineTo(x + size * 0.4, y + size * 0.5);
        ctx.lineTo(x + size * 0.35, y + size * 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + size * 0.7, y + size * 0.3);
        ctx.lineTo(x + size * 0.6, y + size * 0.6);
        ctx.lineTo(x + size * 0.65, y + size * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  if ((tile.fortifyCharges || 0) > 0) {
    const badgeSize = Math.max(11, Math.floor(size * 0.22));
    ctx.fillStyle = 'rgba(26, 82, 60, 0.9)';
    roundRect(ctx, x + size - badgeSize - 3, y + 3, badgeSize, badgeSize, 4);
    ctx.fill();
    ctx.strokeStyle = '#6cc78a';
    ctx.lineWidth = 1;
    roundRect(ctx, x + size - badgeSize - 3, y + 3, badgeSize, badgeSize, 4);
    ctx.stroke();
    ctx.fillStyle = '#cafbe0';
    ctx.font = `700 ${Math.max(8, Math.floor(badgeSize * 0.5))}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tile.fortifyCharges}`, x + size - badgeSize / 2 - 3, y + 3 + badgeSize / 2);
  }
}

// --- Tech Tile ---

function drawTechTile(ctx, x, y, size) {
  // Electric cyan background
  const techGrad = ctx.createLinearGradient(x, y, x, y + size);
  techGrad.addColorStop(0, '#245b72');
  techGrad.addColorStop(1, '#163649');
  ctx.fillStyle = techGrad;
  roundRect(ctx, x, y, size, size, 5);
  ctx.fill();

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();

  // Pulsing glow
  ctx.save();
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();
  ctx.restore();

  // Icon
  const iconSize = Math.max(12, Math.floor(size * 0.42));
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙️', x + size / 2, y + size * 0.40);

  // Label
  const nameSize = Math.max(7, Math.floor(size * 0.16));
  ctx.fillStyle = '#00e5ff';
  ctx.font = `bold ${nameSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tech', x + size / 2, y + size * 0.76);
}

// --- Hazard Tile ---

function drawHazardTile(ctx, x, y, size, tile) {
  const kind = tile.hazardKind;
  const isPollution = kind === 'pollution';
  const isRaid = kind === 'raid';
  const isEarthquake = kind === 'earthquake';

  // Danger tile background
  const bgColor = isPollution
    ? '#1a3a1a'
    : isRaid
      ? '#4a1a40'
      : isEarthquake
        ? '#4f2c16'
        : '#6b2020';
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, size, size, 5);
  ctx.fill();

  const borderColor = isPollution ? '#44cc44' : isRaid ? '#cc44cc' : isEarthquake ? '#ff9f4d' : '#ff4444';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
  ctx.stroke();

  // Hazard icon
  const iconSize = Math.max(12, Math.floor(size * 0.45));
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icon = isPollution ? '☠️' : isRaid ? '⚔️' : isEarthquake ? '💥' : '🌊';
  ctx.fillText(icon, x + size / 2, y + size * 0.38);

  // Label
  const nameSize = Math.max(7, Math.floor(size * 0.16));
  const labelColor = isPollution ? '#88dd88' : isRaid ? '#dd88dd' : isEarthquake ? '#ffca9a' : '#ff8888';
  ctx.fillStyle = labelColor;
  ctx.font = `bold ${nameSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = isPollution ? 'Pollute' : isRaid ? 'Raid' : isEarthquake ? 'Quake' : 'Flood';
  ctx.fillText(label, x + size / 2, y + size * 0.72);

  // Pollution: show turns remaining
  if (isPollution && tile.turnsRemaining !== undefined) {
    ctx.fillStyle = '#ccff88';
    ctx.font = `bold ${Math.max(8, Math.floor(size * 0.14))}px sans-serif`;
    ctx.fillText(`${tile.turnsRemaining}t`, x + size / 2, y + size * 0.88);
  }
}

// --- Merge Flash Glow ---

function drawMergeFlashes(ctx, layout, flashes) {
  const { originX, originY, cellSize } = layout;

  for (const flash of flashes) {
    const progress = flash.timer / flash.duration; // 1.0 → 0.0
    if (progress <= 0) continue;

    const x = originX + flash.col * cellSize + CELL_GAP / 2;
    const y = originY + flash.row * cellSize + CELL_GAP / 2;
    const s = cellSize - CELL_GAP;

    // Outer glow
    ctx.save();
    const glowColor = TIER_BORDER_COLORS[flash.tier] || '#ffd700';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12 * progress;
    ctx.globalAlpha = 0.6 * progress;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    roundRect(ctx, x - 2, y - 2, s + 4, s + 4, 6);
    ctx.stroke();
    ctx.restore();

    // White flash overlay
    ctx.save();
    ctx.globalAlpha = 0.35 * progress;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, s, s, 5);
    ctx.fill();

    const sparks = 5;
    for (let i = 0; i < sparks; i++) {
      const angle = (i / sparks) * Math.PI * 2 + flash.chainIndex * 0.2;
      const radius = (1 - progress) * (8 + i * 2.2);
      const sx = x + s / 2 + Math.cos(angle) * radius;
      const sy = y + s / 2 + Math.sin(angle) * radius;
      ctx.fillStyle = '#ffe9ad';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.8, 1.7 * progress), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const rise = (1 - progress) * 20;
    const mergeScore = Math.max(0, Math.floor(flash.scoreGained || 0));
    const scoreLabel = flash.chainIndex >= 2
      ? `+${mergeScore} ×${flash.chainIndex}`
      : `+${mergeScore}`;
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = flash.chainIndex >= 2 ? STAR_COLOR : '#eaf4ff';
    ctx.font = `700 ${flash.chainIndex >= 2 ? 13 : 11}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(scoreLabel, x + s / 2, y - 4 - rise);
    ctx.restore();
  }
}

// --- Combo Counter Popup ---

function drawComboPopup(ctx, w, h, layout, popup) {
  const progress = popup.timer / popup.duration; // 1.0 → 0.0
  if (progress <= 0) return;

  // Position: centered above grid
  const centerX = layout.originX + layout.gridW / 2;
  const centerY = layout.originY + layout.gridH / 2;

  // Scale up then settle
  const scalePhase = Math.min(1, (1 - progress) * 4); // quick scale-in
  const scale = 0.5 + scalePhase * 0.5;
  const alpha = Math.min(1, progress * 2); // fade out in second half

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  // Background pill
  const pw = 160, ph = 70;
  ctx.fillStyle = 'rgba(18, 32, 48, 0.9)';
  roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 14);
  ctx.fill();
  ctx.strokeStyle = '#8fc8f1';
  ctx.lineWidth = 2;
  roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 14);
  ctx.stroke();

  // Combo number
  ctx.fillStyle = STAR_COLOR;
  ctx.font = `700 34px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`×${popup.combo} CHAIN`, 0, -8);

  // Score
  ctx.fillStyle = '#dbecff';
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.fillText(`+${popup.score.toLocaleString()}`, 0, 22);

  ctx.restore();
}

// --- Catalyst Mode Overlay ---

function drawCatalystOverlay(ctx, layout, state) {
  const { originX, originY, cellSize, gridSize } = layout;

  // Purple tint over grid
  ctx.fillStyle = 'rgba(111, 140, 214, 0.16)';
  roundRect(ctx, originX - 6, originY - 6, cellSize * gridSize + 12, cellSize * gridSize + 12, 8);
  ctx.fill();

  // "CATALYST MODE" label
  ctx.fillStyle = '#c8dcff';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const labelY = originY - 10;
  ctx.fillText(state.catalystFirst ? 'Select 2nd adjacent tile' : 'Select 1st tile [C to cancel]', originX + (cellSize * gridSize) / 2, labelY);

  // Highlight first selected tile
  if (state.catalystFirst) {
    const { row, col } = state.catalystFirst;
    const x = originX + col * cellSize + CELL_GAP / 2;
    const y = originY + row * cellSize + CELL_GAP / 2;
    const s = cellSize - CELL_GAP;
    ctx.save();
    ctx.shadowColor = '#92bff3';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#92bff3';
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, s, s, 5);
    ctx.stroke();
    ctx.restore();
  }
}

function getStageClearLayout(w, h, state) {
  const isVictory = state.stageId === STAGES.length;
  const hasNext = !isVictory;
  const pw = 340;
  const ph = isVictory ? 276 : 268;
  const px = Math.floor((w - pw) / 2);
  const py = Math.floor((h - ph) / 2);
  const btnW = hasNext ? 136 : 188;
  const btnH = 44;
  const btnY = py + ph - 104;
  const retryX = hasNext ? px + 24 : px + Math.floor((pw - btnW) / 2);
  const nextX = px + pw - btnW - 24;
  const stageSelectW = 188;
  const stageSelectH = 30;
  const stageSelectX = px + Math.floor((pw - stageSelectW) / 2);
  const stageSelectY = py + ph - 48;

  return {
    panel: { x: px, y: py, w: pw, h: ph },
    isVictory,
    hasNext,
    retry: { x: retryX, y: btnY, w: btnW, h: btnH },
    next: hasNext ? { x: nextX, y: btnY, w: btnW, h: btnH } : null,
    stageSelect: { x: stageSelectX, y: stageSelectY, w: stageSelectW, h: stageSelectH },
  };
}

export function getStageClearActionAt(px, py, w, h, state) {
  const layout = getStageClearLayout(w, h, state);
  if (inRect(px, py, layout.retry)) return { type: 'retry' };
  if (layout.next && inRect(px, py, layout.next)) return { type: 'next' };
  if (inRect(px, py, layout.stageSelect)) return { type: 'stageselect' };
  return null;
}

function getGameOverLayout(w, h) {
  const pw = 340;
  const ph = 228;
  const px = Math.floor((w - pw) / 2);
  const py = Math.floor((h - ph) / 2);
  const btnW = pw - 48;
  const btnH = 44;
  const retryY = py + 124;
  const stageSelectY = retryY + btnH + 10;
  return {
    panel: { x: px, y: py, w: pw, h: ph },
    retry: { x: px + 24, y: retryY, w: btnW, h: btnH },
    stageSelect: { x: px + 24, y: stageSelectY, w: btnW, h: btnH },
  };
}

export function getGameOverActionAt(px, py, w, h) {
  const layout = getGameOverLayout(w, h);
  if (inRect(px, py, layout.retry)) return { type: 'retry' };
  if (inRect(px, py, layout.stageSelect)) return { type: 'stageselect' };
  return null;
}

// --- Ring Area Actions ---

export function getRingAreaActionAt(px, py, w, h, state) {
  if (state.mode !== 'playing' || !state.discardUnlocked) return null;
  
  const ringY = HUD_HEIGHT + 2;
  const holdSize = 40;
  const currentSize = 48;
  const gapBetween = 12;
  const ringTiles = getRingTiles(state.ring);
  const ringCount = ringTiles.length;
  const slotSize = 40;
  const slotGap = 5;
  const foresightLevel = Number(state.upgradeLevels?.foresight) || 0;
  const previewCount = Math.max(1, Math.min(ringCount, 3 + foresightLevel));
  const totalRingW = previewCount * (slotSize + slotGap) - slotGap;
  const totalW = holdSize + gapBetween + currentSize + gapBetween + totalRingW;
  const startX = Math.floor((w - totalW) / 2);
  
  const currentX = startX + holdSize + gapBetween;
  const currentY = ringY + 16;
  
  // Discard button positioned to the right of current tile
  const discardSize = 24;
  const discardX = currentX + currentSize + 4;
  const discardY = currentY + currentSize - discardSize - 4;
  
  if (inRect(px, py, { x: discardX, y: discardY, w: discardSize, h: discardSize })) {
    return { type: 'discard' };
  }
  
  return null;
}

function drawOverlayButton(ctx, rect, text, border) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, 'rgba(36, 56, 78, 0.93)');
  grad.addColorStop(1, 'rgba(20, 34, 52, 0.95)');
  ctx.fillStyle = grad;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#e8f3ff';
  ctx.font = `700 14px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

// --- Stage Clear ---

function drawStageClear(ctx, w, h, state) {
  ctx.fillStyle = 'rgba(5, 8, 14, 0.64)';
  ctx.fillRect(0, 0, w, h);

  const layout = getStageClearLayout(w, h, state);
  const { panel, isVictory, hasNext } = layout;
  const px = panel.x;
  const py = panel.y;
  const pw = panel.w;
  const ph = panel.h;

  ctx.fillStyle = isVictory ? 'rgba(26, 38, 64, 0.95)' : 'rgba(20, 36, 56, 0.92)';
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = isVictory ? '#ffd700' : '#c8a040';
  ctx.lineWidth = isVictory ? 3 : 2;
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.stroke();

  if (isVictory) {
    // Victory title
    ctx.fillStyle = STAR_COLOR;
    ctx.font = `700 26px ${UI_TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 VICTORY! 🏆', w / 2, py + 35);

    ctx.fillStyle = '#e1f0ff';
    ctx.font = `600 13px ${UI_FONT}`;
    ctx.fillText('You conquered the Singularity!', w / 2, py + 60);

    // Stars
    const stars = state.stars || 1;
    drawAnimatedStars(ctx, w / 2, py + 95, stars, state.frameCount, 36);

    // Score + turns
    ctx.fillStyle = '#f0f6ff';
    ctx.font = `600 14px ${UI_FONT}`;
    ctx.fillText(`Score: ${state.score.toLocaleString()}  |  Turns: ${state.turn}`, w / 2, py + 130);

    // All stages complete message
    ctx.fillStyle = '#a8c6e2';
    ctx.font = `600 11px ${UI_FONT}`;
    ctx.fillText('All 10 stages complete! Replay for better stars.', w / 2, py + 160);
  } else {
    // Title
    ctx.fillStyle = STAR_COLOR;
    ctx.font = `700 28px ${UI_TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Stage Clear!', w / 2, py + 40);

    // Stars
    const stars = state.stars || 1;
    drawAnimatedStars(ctx, w / 2, py + 80, stars, state.frameCount, 36);

    // Score + turns
    ctx.fillStyle = '#f0f6ff';
    ctx.font = `600 14px ${UI_FONT}`;
    ctx.fillText(`Score: ${state.score.toLocaleString()}  |  Turns: ${state.turn}`, w / 2, py + 115);

    // Star rating explanation
    const config = state.stageConfig;
    if (config) {
      ctx.fillStyle = '#93acc5';
      ctx.font = `600 10px ${UI_FONT}`;
      ctx.fillText(`★★★ ≤${config.turnLimit3Star} turns  |  ★★ ≤${config.turnLimit2Star} turns  |  ★ any`, w / 2, py + 138);
    }
  }

  const completed = state.completedChallenges?.[String(state.stageId)] || [];
  if (completed.length > 0) {
    ctx.fillStyle = '#ffe3a1';
    ctx.font = `700 11px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🏅 Challenge badges unlocked: ${completed.length}`, w / 2, py + (isVictory ? 180 : 154));
  }
  if (state.dailyChallengeActive) {
    ctx.fillStyle = '#f6c08e';
    ctx.font = `700 11px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `Daily ${state.dailyDateKey || ''} • Score ${state.score.toLocaleString()} • Best ${Number(state.dailyBestScore || 0).toLocaleString()}`,
      w / 2,
      py + (isVictory ? 197 : 170)
    );
  }

  drawOverlayButton(ctx, layout.retry, 'Retry [R]', '#86b6df');
  if (hasNext && layout.next) {
    drawOverlayButton(ctx, layout.next, 'Next Stage [Enter] →', '#f0c877');
  }

  ctx.fillStyle = '#9eb7cf';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Stage Select [Esc]', layout.stageSelect.x + layout.stageSelect.w / 2, layout.stageSelect.y + layout.stageSelect.h / 2);
}

// --- Game Over ---

function drawGameOver(ctx, w, h, state) {
  ctx.fillStyle = 'rgba(4, 8, 14, 0.68)';
  ctx.fillRect(0, 0, w, h);

  const layout = getGameOverLayout(w, h);
  const px = layout.panel.x;
  const py = layout.panel.y;
  const pw = layout.panel.w;
  const ph = layout.panel.h;
  ctx.fillStyle = 'rgba(22, 34, 52, 0.92)';
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = '#86b6df';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.stroke();

  ctx.fillStyle = '#ff9191';
  ctx.font = `700 30px ${UI_TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Stage Failed', w / 2, py + 45);

  ctx.fillStyle = '#f0f6ff';
  ctx.font = `600 14px ${UI_FONT}`;
  ctx.fillText(`Score: ${state.score.toLocaleString()}`, w / 2, py + 80);

  drawAnimatedStars(ctx, w / 2, py + 108, 0, state.frameCount, 24);

  if (state.stageConfig) {
    ctx.fillStyle = '#97b0c9';
    ctx.font = `600 11px ${UI_FONT}`;
    ctx.fillText(`Target was: ${state.stageConfig.target.toLocaleString()}`, w / 2, py + 105);
  }

  if (state.dailyChallengeActive) {
    ctx.fillStyle = '#f6c08e';
    ctx.font = `700 10px ${UI_FONT}`;
    ctx.fillText(
      `Daily ${state.dailyDateKey || ''} • Score ${state.score.toLocaleString()} • Best ${Number(state.dailyBestScore || 0).toLocaleString()}`,
      w / 2,
      py + 120
    );
  }

  drawOverlayButton(ctx, layout.retry, 'Retry [R]', '#86b6df');
  drawOverlayButton(ctx, layout.stageSelect, 'Stage Select [Esc]', '#f0c877');
}

function drawAnimatedStars(ctx, cx, y, filledCount, frameCount, size) {
  const spacing = size * 0.9;
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * spacing;
    const pulse = 1 + 0.12 * Math.sin(frameCount * 0.16 + i * 0.9);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = i < filledCount ? STAR_COLOR : '#4f6076';
    ctx.font = `${size}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i < filledCount ? '★' : '☆', 0, 0);
    ctx.restore();
  }
}

// --- Utility: rounded rectangle ---

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') {
    r = { tl: r, tr: r, bl: r, br: r };
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = Number.parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const to2 = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function lightenHex(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

function darkenHex(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount)
  );
}
