import type { Squad } from './Squad';

export type LootType = 'soldier' | 'fire' | 'dmg';

export interface LootDef {
  type: LootType;
  amount: number;
}

// Brutes always drop something, and their soldier drops are bigger
export function rollLoot(brute: boolean): LootDef {
  const r = Math.random();
  if (r < 0.7) return { type: 'soldier', amount: brute ? 3 : 1 };
  if (r < 0.87) return { type: 'fire', amount: brute ? 12 : 6 };
  return { type: 'dmg', amount: brute ? 0.4 : 0.2 };
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
      return 'MOC +' + loot.amount;
  }
}

export function lootColor(type: LootType): string {
  return type === 'soldier' ? '#7db8ff' : type === 'fire' ? '#7dffb0' : '#d4a2ff';
}
