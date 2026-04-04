// stages.js — Stage configurations for Realm Weave

export const STAGES = [
  // Stage 1 — Dawn (merges old 1+2): Tutorial with floods
  {
    id: 1,
    era: 'Dawn',
    gridSize: 5,
    target: 1000,
    hazardFreq: 6,
    mechanics: [],
    challenges: [
      { id: 'speed_runner', desc: 'Clear in ≤8 turns', type: 'maxTurn', value: 8, badge: '🏅 Speed Runner' },
      { id: 'floodproof', desc: 'Clear without flood losses', type: 'maxFloodLosses', value: 0, badge: '🏅 Floodproof' },
    ],
    turnLimit3Star: 10,
    turnLimit2Star: 16,
    description: 'Build your settlement. Floods arrive fast — merge quickly!',
  },
  // Stage 2 — Iron (harder old 3): Hold + Discard + Stagnation
  {
    id: 2,
    era: 'Iron',
    gridSize: 5,
    target: 4000,
    hazardFreq: 5,
    mechanics: ['hold', 'discard'],
    tierWeights: [
      { tier: 0, weight: 90 },
      { tier: 1, weight: 10 },
    ],
    challenges: [
      { id: 'ring_master', desc: 'Use Hold at least 5 times', type: 'minHoldUses', value: 5, badge: '🏅 Ring Master' },
    ],
    turnLimit3Star: 20,
    turnLimit2Star: 32,
    stagnationThreshold: 4,
    frozenCellFreq: 12,
    frozenCellCount: 1,
    frozenCellDuration: 3,
    description: 'Hold tiles for strategic merges. Stagnation spawns hazards!',
  },
  // Stage 3 — Classical (merges old 4+5): Full 5×5 endgame
  {
    id: 3,
    era: 'Classical',
    gridSize: 5,
    target: 8000,
    hazardFreq: 4,
    hazardTypes: ['flood', 'raid'],
    mechanics: ['hold', 'catalyst', 'discard'],
    tierWeights: [
      { tier: 0, weight: 85 },
      { tier: 1, weight: 15 },
    ],
    cursedTileFreq: 10,
    wallFreq: 16,
    challenges: [
      { id: 'alchemist', desc: 'Catalyst a Tier 4+ merge', type: 'catalystTier4', value: true, badge: '🏅 Alchemist' },
      { id: 'fortified', desc: 'Survive 3 raids in one run', type: 'minRaidsSurvived', value: 3, badge: '🏅 Fortified' },
    ],
    turnLimit3Star: 28,
    turnLimit2Star: 45,
    stagnationThreshold: 3,
    decayAfter: 18,
    frozenCellFreq: 8,
    frozenCellCount: 1,
    frozenCellDuration: 4,
    description: 'Catalyst force-merges. Raids strike your strongest tiles!',
  },
  // Stage 4 — Renaissance (= old 6, renumbered)
  {
    id: 4,
    era: 'Renaissance',
    gridSize: 6,
    target: 15000,
    hazardFreq: 4,
    hazardTypes: ['flood', 'raid'],
    mechanics: ['hold', 'catalyst', 'comboX3', 'discard'],
    tierWeights: [
      { tier: 0, weight: 82 },
      { tier: 1, weight: 18 },
    ],
    wallFreq: 14,
    challenges: [
      { id: 'chain_lord', desc: 'Get a 5+ chain combo', type: 'minHighestChain', value: 5, badge: '🏅 Chain Lord' },
    ],
    turnLimit3Star: 35,
    turnLimit2Star: 60,
    stagnationThreshold: 3,
    decayAfter: 18,
    frozenCellFreq: 8,
    frozenCellCount: 2,
    frozenCellDuration: 4,
    scoreBleedRate: 0.005,
    description: 'Expanded 6×6 grid. Chain 3+ merges for triple score!',
  },
  // Stage 5 — Industrial (= old 7, renumbered)
  {
    id: 5,
    era: 'Industrial',
    gridSize: 6,
    target: 25000,
    hazardFreq: 3,
    hazardTypes: ['flood', 'raid', 'pollution', 'earthquake'],
    mechanics: ['hold', 'catalyst', 'comboX3', 'discard'],
    tierWeights: [
      { tier: 0, weight: 72 },
      { tier: 1, weight: 20 },
      { tier: 2, weight: 8 },
    ],
    cursedTileFreq: 10,
    wallFreq: 13,
    challenges: [
      { id: 'eco_warrior', desc: 'Clear with pollution on board', type: 'clearWithPollution', value: true, badge: '🏅 Eco Warrior' },
    ],
    turnLimit3Star: 40,
    turnLimit2Star: 65,
    stagnationThreshold: 3,
    decayAfter: 15,
    frozenCellFreq: 7,
    frozenCellCount: 2,
    frozenCellDuration: 5,
    scoreBleedRate: 0.006,
    description: 'Pollution persists and spreads damage each turn!',
  },
  // Stage 6 — Modern (= old 8, renumbered)
  {
    id: 6,
    era: 'Modern',
    gridSize: 6,
    target: 40000,
    hazardFreq: 3,
    hazardTypes: ['flood', 'raid', 'pollution', 'earthquake'],
    mechanics: ['hold', 'catalyst', 'comboX3', 'techTile', 'discard'],
    techTileFreq: 8,
    tierWeights: [
      { tier: 0, weight: 70 },
      { tier: 1, weight: 20 },
      { tier: 2, weight: 10 },
    ],
    cursedTileFreq: 8,
    wallFreq: 11,
    wallDurability: 4,
    challenges: [
      { id: 'technologist', desc: 'Merge 3 tech tiles in one run', type: 'minTechMerges', value: 3, badge: '🏅 Technologist' },
    ],
    turnLimit3Star: 45,
    turnLimit2Star: 75,
    stagnationThreshold: 3,
    decayAfter: 13,
    frozenCellFreq: 6,
    frozenCellCount: 2,
    frozenCellDuration: 5,
    scoreBleedRate: 0.006,
    description: 'Tech tiles merge with anything. Use them wisely!',
  },
  // Stage 7 — Singularity (merges old 9+10): Everything active
  {
    id: 7,
    era: 'Singularity',
    gridSize: 6,
    target: 100000,
    hazardFreq: 2,
    hazardTypes: ['flood', 'raid', 'pollution', 'earthquake'],
    mechanics: ['hold', 'catalyst', 'comboX3', 'techTile', 'holdCostsCharge', 'discard'],
    techTileFreq: 10,
    ringSlots: 5,
    tierWeights: [
      { tier: 0, weight: 65 },
      { tier: 1, weight: 25 },
      { tier: 2, weight: 10 },
    ],
    cursedTileFreq: 6,
    wallFreq: 7,
    wallDurability: 4,
    challenges: [
      { id: 'minimalist', desc: 'Clear with ≤ 2 rotate charges used', type: 'maxRotateUses', value: 2, badge: '🏅 Minimalist' },
      { id: 'transcendent', desc: 'Score 150,000+', type: 'minScore', value: 150000, badge: '🏅 Transcendent' },
    ],
    turnLimit3Star: 55,
    turnLimit2Star: 90,
    stagnationThreshold: 2,
    decayAfter: 10,
    frozenCellFreq: 4,
    frozenCellCount: 3,
    frozenCellDuration: 5,
    scoreBleedRate: 0.008,
    description: 'The final era. Ring shrinks, hold costs a charge. Survive the singularity!',
  },
];

export function getStage(id) {
  return STAGES.find(s => s.id === id) || null;
}

export function computeStars(stageConfig, turn) {
  if (turn <= stageConfig.turnLimit3Star) return 3;
  if (turn <= stageConfig.turnLimit2Star) return 2;
  return 1;
}
