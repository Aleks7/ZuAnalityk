export type EnemyKind = 'grunt' | 'runner' | 'brute' | 'shielder' | 'shooter' | 'tank';

export interface EnemyKindDef {
  texture: string;
  r: number;
  hpMult: number;     // × stage base HP
  armorMult: number;  // flat damage removed from every bullet, × stage base HP
  speedMult: number;
  power(stage: number): number; // soldiers lost on contact
  minStage: number;
  weight: number;     // spawn weight within a wave
  maxPerWave: number;
  lootChance: number;
  lootTier: 1 | 2 | 3;
  score: number;
}

export const ENEMY_KINDS: Record<EnemyKind, EnemyKindDef> = {
  grunt:    { texture: 'enemy',    r: 9,  hpMult: 1,   armorMult: 0,    speedMult: 1,   power: s => 1 + Math.floor(s / 2), minStage: 1, weight: 10, maxPerWave: 99, lootChance: 0.4, lootTier: 1, score: 3 },
  runner:   { texture: 'runner',   r: 8,  hpMult: 0.6, armorMult: 0,    speedMult: 2.6, power: s => 1 + Math.floor(s / 2), minStage: 2, weight: 4,  maxPerWave: 8,  lootChance: 0.3, lootTier: 1, score: 4 },
  brute:    { texture: 'brute',    r: 15, hpMult: 5,   armorMult: 0,    speedMult: 0.7, power: s => 3 + s,                 minStage: 1, weight: 2,  maxPerWave: 4,  lootChance: 1,   lootTier: 2, score: 15 },
  shielder: { texture: 'shielder', r: 12, hpMult: 3,   armorMult: 0.35, speedMult: 0.8, power: s => 2 + s,                 minStage: 2, weight: 3,  maxPerWave: 6,  lootChance: 1,   lootTier: 2, score: 12 },
  shooter:  { texture: 'shooter',  r: 10, hpMult: 2,   armorMult: 0,    speedMult: 0.4, power: s => 1 + Math.floor(s / 3), minStage: 3, weight: 2,  maxPerWave: 3,  lootChance: 0.8, lootTier: 2, score: 10 },
  tank:     { texture: 'tank',     r: 24, hpMult: 25,  armorMult: 0.6,  speedMult: 0.5, power: s => 8 + 2 * s,             minStage: 4, weight: 1,  maxPerWave: 1,  lootChance: 1,   lootTier: 3, score: 40 },
};

/** HP of a basic enemy on a given stage – grows exponentially. */
export function stageBaseHp(stage: number): number {
  return 2 * Math.pow(1.45, stage - 1);
}
