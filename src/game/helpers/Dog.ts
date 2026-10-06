import type Phaser from 'phaser';
import type { Target } from '../types';
import { Helper, HelperHost, moveTowards, nearest } from './Helper';

// Runs ahead of the squad and mauls enemies that come close.
export class Dog implements Helper {
  level = 1;
  private sprite: Phaser.GameObjects.Image;
  private target: Target | null = null;
  private biteTimer = 0;
  private t = 0;

  constructor(private host: HelperHost) {
    const { squad } = host;
    this.sprite = host.sceneRef.add.image(squad.x, squad.y - 40, 'dog').setDepth(25);
  }

  update(dt: number): void {
    const { squad } = this.host;
    this.t += dt;
    const homeX = squad.x;
    const homeY = squad.y - squad.radius() - 28;

    if (this.target && !this.target.alive()) this.target = null;
    if (!this.target) {
      // Only chase things in front of the squad, not too far away
      const ahead = this.host.targets().filter(t => t.y < squad.y && squad.y - t.y < 260);
      this.target = nearest(ahead, this.sprite.x, this.sprite.y, 200);
    }

    if (this.target) {
      const reach = this.target.r + 10;
      const dx = this.target.x - this.sprite.x;
      const dy = this.target.y - this.sprite.y;
      if (Math.hypot(dx, dy) > reach) {
        moveTowards(this.sprite, this.target.x, this.target.y + reach * 0.6, 360 * dt);
      } else {
        this.biteTimer -= dt;
        if (this.biteTimer <= 0) {
          this.biteTimer = 0.3;
          this.target.hit((4 + this.host.stage * 1.5) * this.level);
          this.sprite.setScale(1.25);
          this.host.sceneRef.time.delayedCall(80, () => this.sprite.setScale(1));
        }
      }
      this.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    } else {
      // Keep pace with the squad (it moves up every frame)
      moveTowards(this.sprite, homeX, homeY, 420 * dt);
      this.sprite.setRotation(Math.sin(this.t * 14) * 0.15);
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
