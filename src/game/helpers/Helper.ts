import type Phaser from 'phaser';
import type { Squad } from '../Squad';
import type { Loot, Target } from '../types';

/** What helpers need from the game scene. */
export interface HelperHost {
  sceneRef: Phaser.Scene;
  squad: Squad;
  stage: number;
  loot: Loot[];
  targets(): Target[];
  spawnBullet(x: number, y: number, vx: number, vy: number, dmg: number, texture: string): void;
  explode(x: number, y: number, radius: number, dmg: number): void;
  collectLoot(l: Loot): void;
  viewTop(): number;
  viewBottom(): number;
}

export interface Helper {
  update(dt: number): void;
  destroy(): void;
}

export function nearest(targets: Target[], x: number, y: number, maxDist: number): Target | null {
  let best: Target | null = null;
  let bestD = maxDist * maxDist;
  for (const t of targets) {
    const d = (t.x - x) ** 2 + (t.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export function moveTowards(obj: { x: number; y: number }, tx: number, ty: number, dist: number): boolean {
  const dx = tx - obj.x;
  const dy = ty - obj.y;
  const len = Math.hypot(dx, dy);
  if (len <= dist) {
    obj.x = tx;
    obj.y = ty;
    return true;
  }
  obj.x += (dx / len) * dist;
  obj.y += (dy / len) * dist;
  return false;
}
