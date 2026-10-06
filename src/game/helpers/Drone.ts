import type Phaser from 'phaser';
import { Helper, HelperHost, nearest } from './Helper';

// Orbits the squad and shoots the nearest enemy.
export class Drone implements Helper {
  private sprite: Phaser.GameObjects.Image;
  private t = 0;
  private cooldown = 0;

  constructor(private host: HelperHost, private index: number) {
    const { squad } = host;
    this.sprite = host.sceneRef.add.image(squad.x, squad.y, 'drone').setDepth(40);
  }

  update(dt: number): void {
    const { squad } = this.host;
    this.t += dt;
    const a = this.t * 1.6 + this.index * ((Math.PI * 2) / 3);
    const tx = squad.x + Math.cos(a) * (squad.radius() + 26);
    const ty = squad.y - 12 + Math.sin(a) * 18;
    this.sprite.x += (tx - this.sprite.x) * Math.min(1, dt * 8);
    this.sprite.y += (ty - this.sprite.y) * Math.min(1, dt * 8);
    this.sprite.setAngle(Math.sin(this.t * 6) * 8);

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const target = nearest(this.host.targets().filter(t => t.y < squad.y + 40), this.sprite.x, this.sprite.y, 380);
    if (!target) return;
    this.cooldown = 0.4;
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    const dmg = 2 + this.host.stage * 1.2;
    this.host.spawnBullet(this.sprite.x, this.sprite.y, (dx / len) * 620, (dy / len) * 620, dmg, 'droneBullet');
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
