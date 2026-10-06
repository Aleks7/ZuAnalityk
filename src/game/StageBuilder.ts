import {
  GATE_GAP, ROAD_L, ROAD_MID, ROAD_R, STAGE_BASE_LENGTH, STAGE_LENGTH_PER_LEVEL, WAVE_GAP,
} from '../config';
import { ENEMY_KINDS, EnemyKind, stageBaseHp } from './enemies';
import { GateDef, makeGatePair } from './gates';

export interface GatePairSpec {
  y: number;
  left: GateDef;
  right: GateDef;
}

export interface EnemySpec {
  x: number;
  y: number;
  kind: EnemyKind;
  hp: number;
  armor: number;
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

  // gate, wave, then a second wave from stage 3 on (fewer upgrades per fight)
  let y = startY - 450;
  let step = 0;
  while (y > endY + 300) {
    const slot = step % 3;
    if (slot === 0 || (slot === 2 && stage < 3)) {
      const [a, b] = makeGatePair(stage);
      gates.push({ y, left: a, right: b });
      y -= GATE_GAP;
    } else {
      enemies.push(...buildWave(y, stage));
      y -= WAVE_GAP + (stage >= 3 ? 160 : 0);
    }
    step++;
  }

  return {
    startY,
    endY,
    length,
    gates,
    enemies,
    boss: { y: endY - 220, hp: 200 * Math.pow(1.6, stage - 1) },
  };
}

function pickKind(stage: number, counts: Map<EnemyKind, number>): EnemyKind {
  const pool = (Object.keys(ENEMY_KINDS) as EnemyKind[]).filter(k => {
    const d = ENEMY_KINDS[k];
    return stage >= d.minStage && (counts.get(k) ?? 0) < d.maxPerWave;
  });
  // later stages lean towards the tougher kinds
  const weight = (k: EnemyKind) => ENEMY_KINDS[k].weight * (k === 'grunt' ? 1 : 1 + stage * 0.15);
  let r = Math.random() * pool.reduce((s, k) => s + weight(k), 0);
  for (const k of pool) {
    r -= weight(k);
    if (r <= 0) return k;
  }
  return 'grunt';
}

// A group occupies only one half of the road, so it can always be dodged.
// From stage 3 a wave is two groups on alternating sides – you have to weave.
function buildWave(y: number, stage: number): EnemySpec[] {
  const firstLeft = Math.random() < 0.5;
  const total = Math.min(5 + stage * 2 + Math.floor(rand(0, 3)), 34);
  if (stage < 3) return buildGroup(y, stage, firstLeft, total);
  const half = Math.ceil(total / 2);
  return [...buildGroup(y, stage, firstLeft, half), ...buildGroup(y - 230, stage, !firstLeft, total - half)];
}

function buildGroup(y: number, stage: number, left: boolean, n: number): EnemySpec[] {
  const x0 = left ? ROAD_L + 18 : ROAD_MID + 14;
  const x1 = left ? ROAD_MID - 14 : ROAD_R - 18;
  const cols = 4;
  const colW = (x1 - x0) / (cols - 1);
  const baseHp = stageBaseHp(stage);
  const groupSpeed = rand(28, 42);
  const counts = new Map<EnemyKind, number>();

  const out: EnemySpec[] = [];
  for (let i = 0; i < n; i++) {
    const kind = pickKind(stage, counts);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    const d = ENEMY_KINDS[kind];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const pad = d.r > 15 ? d.r - 10 : 0; // keep big ones inside their half
    out.push({
      x: Math.min(Math.max(x0 + col * colW + (row % 2 ? colW / 3 : 0) + rand(-4, 4), x0 + pad), x1 - pad),
      y: y - row * 34 + rand(-4, 4),
      kind,
      hp: baseHp * d.hpMult,
      armor: baseHp * d.armorMult,
      power: d.power(stage),
      speed: groupSpeed * d.speedMult,
    });
  }
  return out;
}
