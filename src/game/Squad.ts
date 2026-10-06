import Phaser from 'phaser';
import { MAX_DRAWN, ROAD_MID, SPACING, START_FIRE_RATE, START_SOLDIERS, RUN_SPEED } from '../config';

export function formationOffset(i: number): { x: number; y: number } {
  if (i === 0) return { x: 0, y: 0 };
  const r = SPACING * Math.sqrt(i);
  const a = i * 2.39996; // golden angle – evenly packed disc
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8 };
}

export class Squad {
  x = ROAD_MID;
  y = 0;
  targetX = ROAD_MID;
  count = START_SOLDIERS;
  fireRate = START_FIRE_RATE;
  damage = 1;
  multishot = 1;
  shield = 0;
  magnet = 0;
  speed = RUN_SPEED;
  fireTimer = 0;
  step = 0;

  private sprites: Phaser.GameObjects.Image[] = [];
  private badge: Phaser.GameObjects.Text;
  private shieldRing: Phaser.GameObjects.Arc;

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < MAX_DRAWN; i++) {
      this.sprites.push(scene.add.image(0, 0, 'soldier').setDepth(20).setVisible(false));
    }
    this.shieldRing = scene.add.circle(0, 0, 10).setStrokeStyle(3, 0x7df9ff, 0.8).setDepth(21).setVisible(false);
    this.badge = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: '900',
        color: '#ffffff',
        backgroundColor: '#2b7bff',
        padding: { x: 9, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(30);
  }

  radius(): number {
    return SPACING * Math.sqrt(Math.min(Math.max(this.count, 1), MAX_DRAWN)) + 8;
  }

  render(): void {
    const n = Math.min(this.count, MAX_DRAWN);
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      if (i >= n) {
        s.setVisible(false);
        continue;
      }
      const o = formationOffset(i);
      const bob = Math.sin(this.step * 14 + i) * 1.5;
      s.setVisible(true).setPosition(this.x + o.x, this.y + o.y + bob);
      s.setDepth(20 + o.y / 100); // back rows behind front rows
    }
    const r = this.radius();
    this.badge.setText(String(this.count)).setPosition(this.x, this.y - r - 20).setVisible(this.count > 0);
    this.shieldRing
      .setVisible(this.shield > 0)
      .setPosition(this.x, this.y)
      .setRadius(r + 6);
  }

  flash(): void {
    for (const s of this.sprites) s.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => this.sprites.forEach(s => s.clearTint()));
  }

  hide(): void {
    this.sprites.forEach(s => s.setVisible(false));
    this.badge.setVisible(false);
    this.shieldRing.setVisible(false);
  }
}
