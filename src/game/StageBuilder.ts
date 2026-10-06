import {
  BRUTE_HP_MULT, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE, GATE_GAP, ROAD_L, ROAD_MID, ROAD_R,
  STAGE_BASE_LENGTH, STAGE_LENGTH_PER_LEVEL, WAVE_GAP,
} from '../config';
import { GateDef, makeBadGate, makeGoodGate } from './gates';

export interface GatePairSpec {
  y: number;
  left: GateDef;
  right: GateDef;
}

export interface EnemySpec {
  x: number;
  y: number;
  brute: boolean;
  hp: number;
  power: number;
  speed: number;
}

export interface StageSpec {
  startY: number;
  endY: number; // finish line – the squad stops here for the boss
  length: number;
  gates: GatePairSpec[];
  enemies: EnemySpec[];
  boss: { y: number; hp: number };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Builds one stage above startY (world y grows downwards, so "above" is more negative).
export function buildStage(startY: number, stage: number): StageSpec {
  const length = STAGE_BASE_LENGTH + stage * STAGE_LENGTH_PER_LEVEL;
  const endY = startY - length;
  const gates: GatePairSpec[] = [];
  const enemies: EnemySpec[] = [];

  let y = startY - 450;
  let step = 0;
  while (y > endY + 300) {
    if (step % 2 === 0) {
      // At least one good option; sometimes both good, which is a real trade-off
      const good = makeGoodGate(stage);
      const other = Math.random() < 0.35 ? makeGoodGate(stage) : makeBadGate(stage);
      const leftGood = Math.random() < 0.5;
      gates.push({ y, left: leftGood ? good : other, right: leftGood ? other : good });
      y -= GATE_GAP;
    } else {
      enemies.push(...buildWave(y, stage));
      y -= WAVE_GAP;
    }
    step++;
  }

  return {
    startY,
    endY,
    length,
    gates,
    enemies,
    boss: { y: endY - 220, hp: 140 + stage * 120 + stage * stage * 15 },
  };
}

// A wave occupies only one half of the road, so it can always be dodged.
function buildWave(y: number, stage: number): EnemySpec[] {
  const left = Math.random() < 0.5;
  const x0 = left ? ROAD_L + 18 : ROAD_MID + 14;
  const x1 = left ? ROAD_MID - 14 : ROAD_R - 18;
  const n = 4 + Math.floor(stage * 1.4) + Math.floor(rand(0, 3));
  const cols = 4;
  const colW = (x1 - x0) / (cols - 1);
  const baseHp = ENEMY_BASE_HP + stage * ENEMY_HP_PER_STAGE;
  const bruteChance = Math.min(0.06 + stage * 0.04, 0.35);
  const speed = rand(28, 42); // the whole wave moves together

  const out: EnemySpec[] = [];
  for (let i = 0; i < n; i++) {
    const brute = Math.random() < bruteChance;
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({
      x: x0 + col * colW + rand(-4, 4) + (row % 2 ? colW / 3 : 0),
      y: y - row * 32 + rand(-4, 4),
      brute,
      hp: brute ? baseHp * BRUTE_HP_MULT : baseHp,
      power: brute ? 3 + stage : 1,
      speed,
    });
  }
  // keep the free half really free
  for (const e of out) e.x = Math.min(Math.max(e.x, x0), x1);
  return out;
}
