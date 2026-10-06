import Phaser from 'phaser';
import { W } from '../config';
import type { Reward } from '../game/rewards';
import type { GameScene } from './GameScene';
import { FONT, body, dim, title } from './ui';

interface RewardData {
  choices: Reward[];
  stage: number;
}

// Shown over the paused game after each boss. The run continues with the chosen bonus.
export class RewardScene extends Phaser.Scene {
  private picked = false;

  constructor() {
    super('Reward');
  }

  create(data: RewardData): void {
    this.picked = false;
    const game = this.scene.get('Game') as GameScene;
    dim(this);
    title(this, W / 2, 90, `ETAP ${data.stage}\nUKOŃCZONY!`, 38);
    body(this, W / 2, 175, 'Wybierz nagrodę specjalną', 18);

    data.choices.forEach((r, i) => {
      this.card(W / 2, 270 + i * 130, r, i + 1, game);
    });

    const keys = ['ONE', 'TWO', 'THREE'];
    data.choices.forEach((r, i) => this.input.keyboard?.once(`keydown-${keys[i]}`, () => this.pick(r, game)));
  }

  private card(x: number, y: number, r: Reward, n: number, game: GameScene): void {
    const w = 330;
    const h = 112;
    const bg = this.add.rectangle(0, 0, w, h, 0x283048).setStrokeStyle(3, 0xffd23f);
    const iconBg = this.add.circle(-w / 2 + 50, 0, 34, 0x3a4566);
    const icon = this.add.image(-w / 2 + 50, 0, r.icon);
    icon.setScale(Math.min(2, 48 / Math.max(icon.width, icon.height)));
    const name = this.add.text(-w / 2 + 100, -22, r.title, { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: '#ffd23f' }).setOrigin(0, 0.5);
    const desc = this.add
      .text(-w / 2 + 100, 14, r.desc(game), { fontFamily: FONT, fontSize: '15px', color: '#ffffff', wordWrap: { width: w - 120 } })
      .setOrigin(0, 0.5);
    const key = this.add.text(w / 2 - 12, -h / 2 + 10, String(n), { fontFamily: FONT, fontSize: '13px', color: '#ffffff' }).setOrigin(1, 0).setAlpha(0.5);
    const c = this.add.container(x, y, [bg, iconBg, icon, name, desc, key]).setSize(w, h).setInteractive({ useHandCursor: true });
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 250, delay: n * 90, ease: 'Back.Out' });
    c.on('pointerover', () => bg.setFillStyle(0x34406a));
    c.on('pointerout', () => bg.setFillStyle(0x283048));
    c.on('pointerup', () => this.pick(r, game));
  }

  private pick(r: Reward, game: GameScene): void {
    if (this.picked) return;
    this.picked = true;
    this.scene.stop();
    game.chooseReward(r);
  }
}
