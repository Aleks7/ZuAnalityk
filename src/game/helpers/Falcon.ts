import type Phaser from 'phaser';
import type { Loot } from '../types';
import { Helper, HelperHost, moveTowards } from './Helper';

// Flies out to grab loot (also on the side the squad avoided) and brings it back.
export class Falcon implements Helper {
  private sprite: Phaser.GameObjects.Image;
  private carrying: Loot | null = null;
  private target: Loot | null = null;
  private t = 0;

  constructor(private host: HelperHost, private index: number) {
    const { squad } = host;
    this.sprite = host.sceneRef.add.image(squad.x, squad.y - 60, 'falcon').setDepth(45);
  }

  update(dt: number): void {
    const { squad } = this.host;
    this.t += dt;
    const flap = 1 + Math.sin(this.t * 18) * 0.15;
    this.sprite.setScale(flap, 1);

    if (this.carrying) {
      const loot = this.carrying;
      const arrived = moveTowards(this.sprite, squad.x, squad.y - 10, 480 * dt);
      loot.sprite.setPosition(this.sprite.x, this.sprite.y + 10);
      this.face(squad.x, squad.y);
      if (arrived || Math.hypot(this.sprite.x - squad.x, this.sprite.y - squad.y) < squad.radius()) {
        this.carrying = null;
        this.host.collectLoot(loot);
      }
      return;
    }

    if (this.target && (this.target.collected || this.target.sprite.y > this.host.viewBottom() + 20)) {
      this.target.claimed = false;
      this.target = null;
    }
    if (!this.target) {
      const free = this.host.loot.filter(l => !l.claimed && !l.collected && l.sprite.y > this.host.viewTop());
      free.sort((a, b) => Math.abs(a.sprite.y - squad.y) - Math.abs(b.sprite.y - squad.y));
      if (free.length) {
        this.target = free[0];
        this.target.claimed = true;
      }
    }

    if (this.target) {
      const l = this.target;
      this.face(l.sprite.x, l.sprite.y);
      if (moveTowards(this.sprite, l.sprite.x, l.sprite.y, 420 * dt)) {
        this.carrying = l;
        this.target = null;
      }
    } else {
      // Circle above the squad
      const a = this.t * 2 + this.index * Math.PI;
      moveTowards(this.sprite, squad.x + Math.cos(a) * 50, squad.y - 70 + Math.sin(a) * 20, 400 * dt);
      this.sprite.setRotation(0);
    }
  }

  private face(x: number, y: number): void {
    this.sprite.setRotation(Math.atan2(y - this.sprite.y, x - this.sprite.x) + Math.PI / 2);
  }

  destroy(): void {
    if (this.target) this.target.claimed = false;
    this.sprite.destroy();
  }
}
