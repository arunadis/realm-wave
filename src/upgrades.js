// upgrades.js — Meta upgrade definitions and purchase helpers

export const MAX_UPGRADE_LEVEL = 3;

export const UPGRADE_DEFS = [
  {
    id: 'deeperRing',
    name: 'Deeper Ring',
    description: '+1 ring slot per level',
    costs: [3, 6, 10],
    effects: [0, 1, 2, 3],
  },
  {
    id: 'fortify',
    name: 'Fortify',
    description: 'Tier-1 tiles resist hazards',
    costs: [3, 6, 10],
    effects: [0, 1, 2, 3],
  },
  {
    id: 'comboEcho',
    name: 'Combo Echo',
    description: 'Chains grant +charges per level',
    costs: [4, 8, 12],
    effects: [0, 1, 2, 3],
  },
  {
    id: 'foresight',
    name: 'Foresight',
    description: 'Peek extra ring tiles',
    costs: [2, 5, 9],
    effects: [0, 1, 2, 3],
  },
  {
    id: 'salvage',
    name: 'Salvage',
    description: 'Destroyed tiles return score',
    costs: [3, 7, 11],
    effects: [0, 0.25, 0.5, 0.75],
  },
];

const DEF_BY_ID = Object.fromEntries(UPGRADE_DEFS.map(def => [def.id, def]));

export function createDefaultUpgradeLevels() {
  const levels = {};
  for (const def of UPGRADE_DEFS) {
    levels[def.id] = 0;
  }
  return levels;
}

export function normalizeUpgradeLevels(raw) {
  const normalized = createDefaultUpgradeLevels();
  if (!raw || typeof raw !== 'object') return normalized;

  for (const def of UPGRADE_DEFS) {
    const n = Number(raw[def.id]);
    if (Number.isFinite(n)) {
      normalized[def.id] = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(n)));
    }
  }
  return normalized;
}

export function getUpgradeDef(id) {
  return DEF_BY_ID[id] || null;
}

export function getUpgradeCost(id, currentLevel) {
  const def = getUpgradeDef(id);
  if (!def) return null;
  if (currentLevel < 0 || currentLevel >= MAX_UPGRADE_LEVEL) return null;
  return def.costs[currentLevel] ?? null;
}

export function getUpgradeEffect(id, upgradeLevels) {
  const def = getUpgradeDef(id);
  if (!def) return 0;
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Number(upgradeLevels?.[id]) || 0));
  return def.effects[level] ?? 0;
}

export function getLevelDescription(id, level) {
  const clamped = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Number(level) || 0));
  if (clamped >= MAX_UPGRADE_LEVEL) return 'Max level reached';
  const next = clamped + 1;

  if (id === 'deeperRing') {
    return `Ring slots: ${6 + clamped} → ${6 + next}`;
  }
  if (id === 'fortify') {
    return `Tier-0 resist charges: ${clamped} → ${next}`;
  }
  if (id === 'comboEcho') {
    return `Bonus rotate charges on 2+ chain: +${clamped} → +${next}`;
  }
  if (id === 'foresight') {
    return `Preview tiles: ${3 + clamped} → ${3 + next}`;
  }
  if (id === 'salvage') {
    const nowPct = Math.round((DEF_BY_ID.salvage.effects[clamped] || 0) * 100);
    const nextPct = Math.round((DEF_BY_ID.salvage.effects[next] || 0) * 100);
    return `Salvage refund: ${nowPct}% → ${nextPct}%`;
  }

  const def = getUpgradeDef(id);
  if (!def) return '';
  return `${def.name}: Lvl ${clamped} → ${next}`;
}

export function purchaseUpgrade(progress, id) {
  const def = getUpgradeDef(id);
  if (!def) return { ok: false, reason: 'missing' };

  const currentLevel = Number(progress.upgradeLevels?.[id]) || 0;
  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return { ok: false, reason: 'maxed', level: currentLevel };
  }

  const cost = getUpgradeCost(id, currentLevel);
  if (cost === null) return { ok: false, reason: 'invalid' };
  if ((progress.totalStars || 0) < cost) {
    return { ok: false, reason: 'insufficient', cost, level: currentLevel };
  }

  progress.totalStars -= cost;
  progress.upgradeLevels[id] = currentLevel + 1;

  return {
    ok: true,
    id,
    cost,
    level: progress.upgradeLevels[id],
    starsLeft: progress.totalStars,
  };
}
