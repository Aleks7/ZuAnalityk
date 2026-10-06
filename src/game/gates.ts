import { COLORS } from '../config';
import type { Squad } from './Squad';

export type GateType = 'add' | 'sub' | 'mul' | 'div' | 'fire' | 'dmg';

export interface GateDef {
  type: GateType;
  value: number;
}

const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function gateLabel(g: GateDef): string {
  switch (g.type) {
    case 'add': return '+' + g.value;
    case 'sub': return '-' + g.value;
    case 'mul': return 'x' + g.value;
    case 'div': return '÷' + g.value;
    case 'fire': return 'SZYBKOŚĆ\n+' + g.value + '%';
    case 'dmg': return 'MOC\n+' + g.value;
  }
}

export function gateIsGood(g: GateDef): boolean {
  return g.type === 'add' || g.type === 'mul' || g.type === 'fire' || g.type === 'dmg';
}

export function gateColor(g: GateDef): number {
  if (!gateIsGood(g)) return COLORS.bad;
  return g.type === 'fire' || g.type === 'dmg' ? COLORS.stat : COLORS.good;
}

export function makeGoodGate(stage: number): GateDef {
  const r = Math.random();
  if (r < 0.45) return { type: 'add', value: randInt(3, 6) + stage * 3 };
  if (r < 0.62) return { type: 'mul', value: pick([2, 2, 3]) };
  if (r < 0.82) return { type: 'fire', value: pick([20, 25, 30]) };
  return { type: 'dmg', value: 1 };
}

export function makeBadGate(stage: number): GateDef {
  if (Math.random() < 0.7) return { type: 'sub', value: randInt(4, 8) + stage * 3 };
  return { type: 'div', value: 2 };
}

export function applyGate(squad: Squad, g: GateDef): void {
  switch (g.type) {
    case 'add': squad.count += g.value; break;
    case 'sub': squad.count -= g.value; break;
    case 'mul': squad.count *= g.value; break;
    case 'div': squad.count = Math.floor(squad.count / g.value); break;
    case 'fire': squad.fireRate *= 1 + g.value / 100; break;
    case 'dmg': squad.damage += g.value; break;
  }
  squad.count = Math.max(0, Math.round(squad.count));
}
