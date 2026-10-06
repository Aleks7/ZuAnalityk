import Phaser from 'phaser';
import { W } from '../config';
import { loadRecords } from '../storage';
import { body, button, title } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.add.tileSprite(0, 0, W, this.scale.height, 'road').setOrigin(0);
    this.add.rectangle(0, 0, W, this.scale.height, 0x0f121e, 0.72).setOrigin(0);

    // Little marching squad for the title screen
    for (let i = 0; i < 9; i++) {
      const s = this.add.image(W / 2 + (i % 3 - 1) * 16, 150 + Math.floor(i / 3) * 14, 'soldier').setScale(1.4);
      this.tweens.add({ targets: s, y: s.y - 3, duration: 180, yoyo: true, repeat: -1, delay: i * 40 });
    }

    title(this, W / 2, 250, 'ZU', 96);
    body(this, W / 2, 360, 'Prowadź oddział w górę, strzelaj do wrogów\ni wybieraj bramki: lewo albo prawo.\nPo każdym bossie wybierasz nagrodę specjalną.');
    body(this, W / 2, 450, 'Przeciągnij palcem / myszką albo ← → / A D.\nOmijaj grupy wrogów albo zbieraj ich łupy!', 14, 0.8);

    const r = loadRecords();
    if (r.bestScore > 0) body(this, W / 2, 510, `Rekord: ${r.bestScore} pkt · etap ${r.bestStage}`, 14, 0.8);

    const start = () => this.scene.start('Game');
    button(this, W / 2, 580, 'GRAJ', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }
}
