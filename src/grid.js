// grid.js — Grid data structure, tile placement, and merge resolution

const TIER_NAMES = ['tribe', 'hut', 'village', 'town', 'city', 'capital'];
const MAX_TIER = TIER_NAMES.length - 1;

const TIER_COLORS = [
  '#c87533', // tribe  — warm bronze
  '#8b6914', // hut    — dark goldenrod
  '#2e8b57', // village — sea green
  '#4682b4', // town   — steel blue
  '#7b68ee', // city   — medium slate blue
  '#ffd700', // capital — gold
];

export function createGrid(size) {
  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(null);
    }
    grid.push(row);
  }
  return grid;
}

export function expandGrid(grid, newSize) {
  const oldSize = Array.isArray(grid) ? grid.length : 0;
  const targetSize = Math.max(oldSize, Math.floor(Number(newSize) || oldSize));
  const expanded = createGrid(targetSize);
  for (let r = 0; r < oldSize; r++) {
    for (let c = 0; c < oldSize; c++) {
      expanded[r][c] = grid[r][c];
    }
  }
  return expanded;
}

export function createTile(tier) {
  return {
    tier: Math.min(tier, MAX_TIER),
    name: TIER_NAMES[Math.min(tier, MAX_TIER)],
  };
}

export function createTechTile() {
  return {
    tier: -1,
    name: 'tech',
    isTech: true,
  };
}

export function createCursedTile() {
  return {
    tier: -1,
    name: 'cursed',
    isCursed: true,
  };
}

export function createWallTile(durability = 3) {
  return {
    tier: -1,
    type: 'wall',
    name: 'wall',
    durability: Math.max(1, Math.floor(Number(durability) || 3)),
  };
}

export function isTechTile(tile) {
  return tile && tile.isTech === true;
}

export function placeTile(grid, row, col, tile) {
  if (row < 0 || row >= grid.length) return false;
  if (col < 0 || col >= grid[0].length) return false;
  if (grid[row][col] !== null) return false;
  grid[row][col] = tile;
  return true;
}

function getAdjacentSameTier(grid, row, col) {
  const tile = grid[row][col];
  if (!tile) return [];
  if (tile.type === 'hazard' || tile.type === 'wall' || tile.isCursed) return [];
  const size = grid.length;
  const matches = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      const neighbor = grid[nr][nc];
      if (!neighbor) continue;
      if (neighbor.type === 'hazard' || neighbor.type === 'wall' || neighbor.isCursed) continue;
      // Tech tile matches any non-hazard tile
      if (tile.isTech && neighbor.tier >= 0 && !neighbor.isTech) {
        matches.push({ row: nr, col: nc });
      } else if (neighbor.isTech && tile.tier >= 0 && !tile.isTech) {
        matches.push({ row: nr, col: nc });
      } else if (neighbor.tier === tile.tier && tile.tier >= 0) {
        matches.push({ row: nr, col: nc });
      }
    }
  }
  return matches;
}

function damageAdjacentWalls(grid, row, col) {
  const hits = [];
  const broken = [];
  const size = grid.length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    const neighbor = grid[nr][nc];
    if (!neighbor || neighbor.type !== 'wall') continue;
    neighbor.durability = Math.max(0, (neighbor.durability || 1) - 1);
    hits.push({ row: nr, col: nc, durability: neighbor.durability });
    if (neighbor.durability <= 0) {
      broken.push({ row: nr, col: nc });
      grid[nr][nc] = null;
    }
  }
  return { hits, broken };
}

export function resolveMerges(grid) {
  const events = [];
  const wallHits = [];
  const wallBroken = [];
  let totalScore = 0;
  let merged = true;

  while (merged) {
    merged = false;
    const size = grid.length;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const tile = grid[r][c];
        if (!tile) continue;
        if (tile.type === 'hazard') continue;
        if (tile.type === 'wall' || tile.isCursed) continue;
        if (tile.tier >= MAX_TIER && !tile.isTech) continue;

        const adjacents = getAdjacentSameTier(grid, r, c);
        if (adjacents.length > 0) {
          // Merge with the first adjacent match
          const partner = adjacents[0];
          const partnerTile = grid[partner.row][partner.col];

          // Determine merge result: tech tile upgrades the other tile
          let fromTier, toTier;
          if (tile.isTech) {
            fromTier = partnerTile.tier;
            toTier = Math.min(partnerTile.tier + 1, MAX_TIER);
          } else if (partnerTile && partnerTile.isTech) {
            fromTier = tile.tier;
            toTier = Math.min(tile.tier + 1, MAX_TIER);
          } else {
            fromTier = tile.tier;
            toTier = tile.tier + 1;
          }

          // Upgrade this cell
          grid[r][c] = createTile(toTier);
          // Remove the partner
          grid[partner.row][partner.col] = null;

          // Combo multiplier: Nth merge in chain scores N× base
          const chainIndex = events.length + 1;
          const baseScore = (toTier + 1) * 100;
          const scoreGained = baseScore * chainIndex;
          totalScore += scoreGained;

          events.push({
            row: r,
            col: c,
            fromTier,
            toTier,
            merged: [{ row: r, col: c }, { row: partner.row, col: partner.col }],
            scoreGained,
            chainIndex,
          });

          const wallResult = damageAdjacentWalls(grid, r, c);
          wallHits.push(...wallResult.hits);
          wallBroken.push(...wallResult.broken);

          merged = true;
          break; // restart scan after a merge
        }
      }
      if (merged) break; // restart outer loop
    }
  }

  return { events, scoreGained: totalScore, wallHits, wallBroken };
}

export function isGridFull(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return true;
}

export function hasAnyMerge(grid) {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = grid[r][c];
      if (!tile) continue;
      if (tile.type === 'hazard') continue;
      if (tile.type === 'wall' || tile.isCursed) continue;
      if (tile.tier >= MAX_TIER && !tile.isTech) continue;
      if (getAdjacentSameTier(grid, r, c).length > 0) return true;
    }
  }
  return false;
}

export function generateRandomTile() {
  return createTile(0); // Always tier 0 (tribe) for now
}

export { TIER_NAMES, TIER_COLORS, MAX_TIER };
