import { COLORS } from '../config';
import type { Squad } from './Squad';

// Gates only ever help – the choice is which upgrade you want.
export type GateType = 'add' | 'mul' | 'fire' | 'dmg';

export interface GateDef {
  type: GateType;
  value: number;
}

const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

const WEIGHTS: [GateType, number][] = [['add', 48], ['fire', 22], ['dmg', 22], ['mul', 8]];

export function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export function gateLabel(g: GateDef): string {
  switch (g.type) {
    case 'add': return '+' + g.value;
    case 'mul': return 'x' + g.value;
    case 'fire': return 'SZYBKOŚĆ\n+' + g.value + '%';
    case 'dmg': return 'MOC\n+' + fmt(g.value);
  }
}

export function gateColor(g: GateDef): number {
  return g.type === 'fire' || g.type === 'dmg' ? COLORS.stat : COLORS.good;
}

export function makeGate(stage: number, exclude?: GateType): GateDef {
  const pool = WEIGHTS.filter(([t]) => t !== exclude);
  let r = Math.random() * pool.reduce((sum, [, w]) => sum + w, 0);
  let type: GateType = pool[0][0];
  for (const [t, w] of pool) {
    r -= w;
    if (r <= 0) {
      type = t;
      break;
    }
  }
  switch (type) {
    case 'add': return { type, value: randInt(2, 4) + Math.round(stage * 1.5) };
    case 'mul': return { type, value: 2 };
    case 'fire': return { type, value: Math.random() < 0.5 ? 15 : 20 };
    case 'dmg': return { type, value: 0.5 };
  }
}

/** Two different upgrades, so picking a side is a real decision. */
export function makeGatePair(stage: number): [GateDef, GateDef] {
  const a = makeGate(stage);
  return [a, makeGate(stage, a.type)];
}

export function applyGate(squad: Squad, g: GateDef): void {
  switch (g.type) {
    case 'add': squad.count += g.value; break;
    case 'mul': squad.count *= g.value; break;
    case 'fire': squad.fireRate *= 1 + g.value / 100; break;
    case 'dmg': squad.damage += g.value; break;
  }
  squad.count = Math.round(squad.count);
}
