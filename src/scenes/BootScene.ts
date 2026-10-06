import Phaser from 'phaser';
import { COLORS } from '../config';

// All textures are drawn in code for now, so the game has no external assets.
// Swap any key below for a loaded sprite later without touching game logic.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.person('soldier', COLORS.squad, 16);
    this.person('enemy', COLORS.enemy, 18);
    this.person('brute', COLORS.brute, 30);
    this.boss();
    this.bullet();
    this.loot();
    this.drone();
    this.dog();
    this.plane();
    this.falcon();
    this.misc();
    this.scene.start('Menu');
  }

  private g(): Phaser.GameObjects.Graphics {
    return this.make.graphics({ x: 0, y: 0 }, false);
  }

  // A small top-down-ish person: legs, body, head
  private person(key: string, color: number, size: number): void {
    const g = this.g();
    const s = size;
    g.fillStyle(0x333333);
    g.fillRect(s * 0.28, s * 0.66, s * 0.17, s * 0.3);
    g.fillRect(s * 0.55, s * 0.66, s * 0.17, s * 0.3);
    g.fillStyle(color);
    g.fillCircle(s * 0.5, s * 0.55, s * 0.32);
    g.fillStyle(0xffdcb0);
    g.fillCircle(s * 0.5, s * 0.24, s * 0.2);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  private boss(): void {
    const g = this.g();
    const s = 110;
    const c = s / 2;
    g.fillStyle(0xeeeeee);
    g.fillTriangle(c - 34, c - 18, c - 44, 4, c - 16, c - 30);
    g.fillTriangle(c + 34, c - 18, c + 44, 4, c + 16, c - 30);
    g.fillStyle(0x6b1a1a);
    g.fillCircle(c, c + 6, 46);
    g.fillStyle(0xc0392b);
    g.fillCircle(c, c + 2, 35);
    g.fillStyle(COLORS.gold);
    g.fillCircle(c - 13, c + 10, 6);
    g.fillCircle(c + 13, c + 10, 6);
    g.generateTexture('boss', s, s);
    g.destroy();
  }

  private bullet(): void {
    const g = this.g();
    g.fillStyle(0xfff36b);
    g.fillRoundedRect(0, 0, 4, 10, 2);
    g.generateTexture('bullet', 4, 10);
    g.clear();
    g.fillStyle(0x7df9ff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('droneBullet', 8, 8);
    g.clear();
    g.fillStyle(0x222222);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xff9a3c);
    g.fillCircle(6, 6, 2);
    g.generateTexture('bomb', 12, 12);
    g.destroy();
  }

  private loot(): void {
    const items: [string, number, (g: Phaser.GameObjects.Graphics) => void][] = [
      ['loot_soldier', COLORS.squad, g => {
        g.fillStyle(0xffffff);
        g.fillCircle(14, 10, 4);
        g.fillCircle(14, 18, 6);
      }],
      ['loot_fire', COLORS.stat, g => {
        g.fillStyle(0xffffff);
        g.fillTriangle(16, 5, 9, 16, 14, 16);
        g.fillTriangle(12, 23, 19, 12, 14, 12);
      }],
      ['loot_dmg', 0xa24cff, g => {
        g.fillStyle(0xffffff);
        g.fillRect(12, 6, 4, 12);
        g.fillTriangle(10, 18, 18, 18, 14, 23);
      }],
    ];
    for (const [key, color, icon] of items) {
      const g = this.g();
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(14, 26, 22, 6);
      g.fillStyle(color);
      g.fillCircle(14, 14, 12);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(14, 14, 12);
      icon(g);
      g.generateTexture(key, 28, 30);
      g.destroy();
    }
  }

  private drone(): void {
    const g = this.g();
    g.lineStyle(3, 0x333333);
    g.lineBetween(5, 5, 23, 23);
    g.lineBetween(23, 5, 5, 23);
    g.fillStyle(0x9aa4b5);
    for (const [x, y] of [[5, 5], [23, 5], [5, 23], [23, 23]]) g.fillCircle(x, y, 5);
    g.fillStyle(0x2f3a4f);
    g.fillRoundedRect(8, 8, 12, 12, 3);
    g.fillStyle(0x7df9ff);
    g.fillCircle(14, 14, 3);
    g.generateTexture('drone', 28, 28);
    g.destroy();
  }

  private dog(): void {
    const g = this.g();
    g.fillStyle(0x8b5a2b);
    g.fillEllipse(12, 18, 14, 22); // body
    g.fillCircle(12, 7, 6);        // head
    g.fillStyle(0x5c3a1a);
    g.fillEllipse(6, 6, 4, 8);     // ears
    g.fillEllipse(18, 6, 4, 8);
    g.fillRect(11, 27, 2, 5);      // tail
    g.fillStyle(0x000000);
    g.fillCircle(12, 2, 1.5);      // nose
    g.generateTexture('dog', 24, 32);
    g.destroy();
  }

  private plane(): void {
    const g = this.g();
    g.fillStyle(0x556b2f);
    g.fillRoundedRect(25, 2, 10, 56, 5);  // fuselage
    g.fillRoundedRect(0, 18, 60, 12, 4);  // wings
    g.fillRoundedRect(16, 48, 28, 7, 3);  // tail
    g.fillStyle(0x7df9ff);
    g.fillEllipse(30, 12, 6, 9);          // cockpit
    g.generateTexture('plane', 60, 60);
    g.destroy();
  }

  private falcon(): void {
    const g = this.g();
    g.fillStyle(0x8c6239);
    g.fillTriangle(16, 10, 0, 18, 16, 16);
    g.fillTriangle(16, 10, 32, 18, 16, 16);
    g.fillEllipse(16, 14, 8, 16);
    g.fillStyle(0xffd23f);
    g.fillTriangle(14, 6, 18, 6, 16, 2);
    g.generateTexture('falcon', 32, 24);
    g.destroy();
  }

  private misc(): void {
    const g = this.g();
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.clear();
    g.fillStyle(0x7df9ff);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(30, 8);
    g.lineTo(28, 22);
    g.lineTo(16, 34);
    g.lineTo(4, 22);
    g.lineTo(2, 8);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(14, 8, 4, 20);
    g.generateTexture('icon_shield', 32, 36);
    g.clear();
    g.lineStyle(9, 0xe8432e);
    g.beginPath();
    g.arc(16, 14, 11, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0xe8432e);
    g.fillRect(1, 14, 9, 12);
    g.fillRect(22, 14, 9, 12);
    g.fillStyle(0xdddddd);
    g.fillRect(1, 26, 9, 6);
    g.fillRect(22, 26, 9, 6);
    g.generateTexture('icon_magnet', 32, 34);
    g.clear();
    // Grass + road strip, tiled vertically for the scrolling background
    g.fillStyle(0x4c8c3a);
    g.fillRect(0, 0, 400, 140);
    g.fillStyle(0xb39d72);
    g.fillRect(24, 0, 352, 140);
    g.fillStyle(0xc9b48a);
    g.fillRect(30, 0, 340, 140);
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(197, 10, 6, 40);
    g.fillRect(197, 80, 6, 40);
    for (const [x, y] of [[14, 30], [386, 100]]) {
      g.fillStyle(0x2f6b25);
      g.fillCircle(x, y, 13);
      g.fillStyle(0x3d8530);
      g.fillCircle(x - 3, y - 3, 8);
    }
    g.generateTexture('road', 400, 140);
    g.destroy();
  }
}
