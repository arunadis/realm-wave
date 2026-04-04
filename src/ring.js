// ring.js — Circular tile queue (World Ring) for Realm Weave

import { createTile, createTechTile, createCursedTile } from './grid.js';

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeTierWeights(weights) {
  if (!Array.isArray(weights) || weights.length === 0) {
    return [{ tier: 0, weight: 1 }];
  }
  const out = [];
  for (const item of weights) {
    if (!item || typeof item !== 'object') continue;
    const tier = Math.max(0, Math.floor(Number(item.tier) || 0));
    const weight = Number(item.weight);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    out.push({ tier, weight });
  }
  return out.length > 0 ? out : [{ tier: 0, weight: 1 }];
}

function randomTierTile(rng = Math.random, tierWeights = null) {
  const normalized = normalizeTierWeights(tierWeights);
  let total = 0;
  for (const item of normalized) total += item.weight;
  let pick = rng() * total;
  for (const item of normalized) {
    if (pick <= item.weight) {
      return createTile(item.tier);
    }
    pick -= item.weight;
  }
  return createTile(normalized[0].tier);
}

export function createRing(slotCount, seed = null, options = {}) {
  const rng = Number.isFinite(Number(seed)) ? mulberry32(Number(seed)) : Math.random;
  const tierWeights = normalizeTierWeights(options.tierWeights);
  const slots = [];
  for (let i = 0; i < slotCount; i++) {
    slots.push(randomTierTile(rng, tierWeights));
  }
  return {
    slots,
    slotCount,
    rotateCharges: 2,
    maxRotateCharges: 2,
    rng,
    tierWeights,
  };
}

export function peekNext(ring) {
  return ring.slots[0] || null;
}

export function popNext(ring) {
  if (ring.slots.length === 0) return null;
  const tile = ring.slots.shift();
  ring.slots.push(randomTierTile(ring.rng || Math.random, ring.tierWeights));
  return tile;
}

export function rotateRing(ring, direction) {
  if (ring.rotateCharges <= 0) return false;
  if (ring.slots.length <= 1) return false;

  ring.rotateCharges--;

  if (direction > 0) {
    // Clockwise: front goes to back
    const front = ring.slots.shift();
    ring.slots.push(front);
  } else {
    // Counter-clockwise: back comes to front
    const back = ring.slots.pop();
    ring.slots.unshift(back);
  }

  return true;
}

export function holdTile(heldTile, currentTile) {
  // Swap current tile with held tile
  // If no held tile, stash current and return null (caller must pop next from ring)
  if (!heldTile) {
    return { newCurrent: null, newHeld: currentTile };
  }
  return { newCurrent: heldTile, newHeld: currentTile };
}

export function injectTechTile(ring) {
  if (ring.slots.length <= 1) return;
  // Replace a random slot (not the first/current) with a tech tile
  const rng = ring.rng || Math.random;
  const idx = 1 + Math.floor(rng() * (ring.slots.length - 1));
  ring.slots[idx] = createTechTile();
}

export function injectCursedTile(ring) {
  if (ring.slots.length <= 1) return;
  const rng = ring.rng || Math.random;
  const idx = 1 + Math.floor(rng() * (ring.slots.length - 1));
  ring.slots[idx] = createCursedTile();
}

export function getRingTiles(ring) {
  return [...ring.slots];
}

export function updateRingTierWeights(ring, tierWeights) {
  if (!ring || !Array.isArray(ring.slots)) return false;
  ring.tierWeights = normalizeTierWeights(tierWeights);
  return true;
}
