import type Phaser from 'phaser';
import type { LootDef } from './loot';
import type { EnemyKind } from './enemies';

export interface Enemy {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  armor: number;
  power: number;
  speed: number;
  kind: EnemyKind;
  r: number;
  dead: boolean;
  shootTimer: number;
}

export interface EnemyBullet {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  power: number;
  alive: boolean;
}

export interface Boss {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  active: boolean;
  dead: boolean;
  drainTimer: number;
  shootTimer: number;
  summonTimer: number;
}

export interface Loot {
  sprite: Phaser.GameObjects.Image;
  def: LootDef;
  claimed: boolean; // a falcon is carrying it
  collected: boolean;
}

/** Something that can be damaged by helpers: an enemy or the boss. */
export interface Target {
  x: number;
  y: number;
  r: number;
  hit(dmg: number): void;
  alive(): boolean;
}
