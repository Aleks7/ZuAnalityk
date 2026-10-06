import type Phaser from 'phaser';
import type { LootDef } from './loot';

export interface Enemy {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  power: number;
  speed: number;
  brute: boolean;
  r: number;
  dead: boolean;
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
