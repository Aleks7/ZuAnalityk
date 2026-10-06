import { W } from '../../config';
import { Helper, HelperHost } from './Helper';

// Every few seconds flies over the road and bombs the biggest group of enemies.
export class Plane implements Helper {
  level = 1;
  private timer = 3;

  constructor(private host: HelperHost) {}

  private interval(): number {
    return Math.max(2.5, 7 - (this.level - 1) * 1.5);
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    const targets = this.host.targets().filter(t => t.y > this.host.viewTop() + 40 && t.y < this.host.squad.y - 40);
    if (targets.length === 0) {
      this.timer = 0.5;
      return;
    }
    this.timer = this.interval();

    // Densest spot: the target with most neighbours within 60px
    let best = targets[0];
    let bestN = -1;
    for (const t of targets) {
      const n = targets.filter(o => (o.x - t.x) ** 2 + (o.y - t.y) ** 2 < 3600).length;
      if (n > bestN) {
        bestN = n;
        best = t;
      }
    }
    this.raid(best.x, best.y);
  }

  private raid(tx: number, ty: number): void {
    const scene = this.host.sceneRef;
    const bottom = this.host.viewBottom();
    const top = this.host.viewTop();
    const plane = scene.add.image(tx, bottom + 60, 'plane').setDepth(60);
    const shadow = scene.add.image(tx + 20, bottom + 80, 'plane').setDepth(15).setTint(0x000000).setAlpha(0.25).setScale(0.8);
    const duration = 1100;
    scene.tweens.add({ targets: [plane, shadow], y: top - 100, duration, onComplete: () => { plane.destroy(); shadow.destroy(); } });

    // Drop the bombs when the plane passes over the target
    const frac = (bottom + 60 - ty) / (bottom + 60 - (top - 100));
    const dmg = (12 + this.host.stage * 5) * (1 + (this.level - 1) * 0.5);
    scene.time.delayedCall(Math.max(0, frac * duration - 150), () => {
      for (const off of [-30, 0, 30]) {
        const bx = Math.min(Math.max(tx + off, 20), W - 20);
        const by = ty + (off === 0 ? -10 : 10);
        const bomb = scene.add.image(bx, by, 'bomb').setDepth(55).setScale(2);
        scene.tweens.add({
          targets: bomb,
          scale: 0.8,
          duration: 300,
          onComplete: () => {
            bomb.destroy();
            this.host.explode(bx, by, 50, dmg);
          },
        });
      }
    });
  }

  destroy(): void {}
}
