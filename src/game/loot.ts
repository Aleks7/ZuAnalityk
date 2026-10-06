import type { Squad } from './Squad';
import { fmt } from './gates';

export type LootType = 'soldier' | 'fire' | 'dmg';

export interface LootDef {
  type: LootType;
  amount: number;
}

// Tougher enemies (higher tier) drop bigger loot
const AMOUNTS: Record<LootType, [number, number, number]> = {
  soldier: [1, 2, 5],
  fire: [5, 10, 15],
  dmg: [0.1, 0.3, 0.6],
};

export function rollLoot(tier: 1 | 2 | 3): LootDef {
  const r = Math.random();
  const type: LootType = r < 0.65 ? 'soldier' : r < 0.83 ? 'fire' : 'dmg';
  return { type, amount: AMOUNTS[type][tier - 1] };
}

export function applyLoot(squad: Squad, loot: LootDef): string {
  switch (loot.type) {
    case 'soldier':
      squad.count += loot.amount;
      return '+' + loot.amount;
    case 'fire':
      squad.fireRate *= 1 + loot.amount / 100;
      return 'SZYBKOŚĆ +' + loot.amount + '%';
    case 'dmg':
      squad.damage += loot.amount;
      return 'MOC +' + fmt(loot.amount);
  }
}

export function lootColor(type: LootType): string {
  return type === 'soldier' ? '#7db8ff' : type === 'fire' ? '#7dffb0' : '#d4a2ff';
}
