// hazards.js — Hazard tiles for Realm Weave

import { createWallTile } from './grid.js';

export function createHazardTile(kind) {
  const tile = {
    type: 'hazard',
    hazardKind: kind,
    tier: -1,
    name: kind,
  };
  if (kind === 'pollution') {
    tile.turnsRemaining = 3;
  }
  return tile;
}

export function spawnWall(grid, options = {}) {
  const empty = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === null) {
        empty.push({ row: r, col: c });
      }
    }
  }
  if (empty.length === 0) return null;

  const rng = options.rng || Math.random;
  const durability = Math.max(1, Math.floor(Number(options.durability) || 3));
  const cell = empty[Math.floor(rng() * empty.length)];
  grid[cell.row][cell.col] = createWallTile(durability);
  return { row: cell.row, col: cell.col, durability };
}

export function isHazardTile(tile) {
  return tile && tile.type === 'hazard';
}

export function isWallTile(tile) {
  return tile && tile.type === 'wall';
}

export function resolveHazard(grid, row, col, hazard) {
  const destroyed = [];
  const size = grid.length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  if (hazard.hazardKind === 'earthquake') {
    const cells = [{ row, col }, ...dirs.map(([dr, dc]) => ({ row: row + dr, col: col + dc }))];
    for (const cell of cells) {
      if (cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size) continue;
      const victim = grid[cell.row][cell.col];
      if (victim && !isHazardTile(victim)) {
        destroyed.push({ row: cell.row, col: cell.col, tile: victim });
      }
      grid[cell.row][cell.col] = null;
    }
    return { destroyed };
  }

  if (hazard.hazardKind === 'raid') {
    // Raid: destroy the single highest-tier adjacent tile
    let best = null;
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const neighbor = grid[nr][nc];
        if (neighbor && !isHazardTile(neighbor)) {
          if (!best || neighbor.tier > best.tile.tier) {
            best = { row: nr, col: nc, tile: neighbor };
          }
        }
      }
    }
    if (best) {
      destroyed.push(best);
      grid[best.row][best.col] = null;
    }
  } else {
    // Flood: destroy adjacent tiles below tier threshold
    const threshold = 2;
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const neighbor = grid[nr][nc];
        if (neighbor && !isHazardTile(neighbor) && neighbor.tier < threshold) {
          destroyed.push({ row: nr, col: nc, tile: neighbor });
          grid[nr][nc] = null;
        }
      }
    }
  }

  // Remove the hazard tile itself after resolving
  grid[row][col] = null;

  return { destroyed };
}

// Tick all pollution tiles on the grid: damage adjacent, decrement turns, remove expired
export function tickPollution(grid) {
  const size = grid.length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const destroyed = [];
  const expired = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = grid[r][c];
      if (!tile || tile.type !== 'hazard' || tile.hazardKind !== 'pollution') continue;

      // Damage one random adjacent non-hazard tile
      const targets = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const neighbor = grid[nr][nc];
          if (neighbor && !isHazardTile(neighbor)) {
            targets.push({ row: nr, col: nc, tile: neighbor });
          }
        }
      }
      if (targets.length > 0) {
        const victim = targets[Math.floor(Math.random() * targets.length)];
        destroyed.push(victim);
        grid[victim.row][victim.col] = null;
      }

      // Decrement turns
      tile.turnsRemaining--;
      if (tile.turnsRemaining <= 0) {
        expired.push({ row: r, col: c });
        grid[r][c] = null;
      }
    }
  }

  return { destroyed, expired };
}

export function spawnHazard(grid, kind, hazardTypes) {
  const empty = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === null) {
        empty.push({ row: r, col: c });
      }
    }
  }
  if (empty.length === 0) return null;

  // Pick hazard kind: use hazardTypes array if provided, otherwise fallback to kind
  let chosenKind = kind || 'flood';
  if (hazardTypes && hazardTypes.length > 0) {
    chosenKind = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
  }

  const cell = empty[Math.floor(Math.random() * empty.length)];
  const hazard = createHazardTile(chosenKind);
  grid[cell.row][cell.col] = hazard;

  // Pollution persists — don't resolve immediately
  if (chosenKind === 'pollution') {
    return { row: cell.row, col: cell.col, kind: chosenKind, destroyed: [] };
  }

  // Flood/Raid resolve immediately
  const result = resolveHazard(grid, cell.row, cell.col, hazard);
  return { row: cell.row, col: cell.col, kind: chosenKind, ...result };
}
