import Phaser from 'phaser';
import { W } from '../config';
import type { Records } from '../storage';
import { body, button, dim, title } from './ui';

interface GameOverData {
  score: number;
  stage: number;
  records: Records;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    dim(this);
    title(this, W / 2, 220, 'KONIEC GRY', 46);
    body(this, W / 2, 320, `Oddział poległ na etapie ${data.stage}.\nWynik: ${data.score} pkt`, 20);
    body(this, W / 2, 390, `Rekord: ${data.records.bestScore} pkt · etap ${data.records.bestStage}`, 15, 0.8);
    const again = () => {
      this.scene.stop();
      this.scene.get('Game').scene.restart();
    };
    button(this, W / 2, 480, 'ZAGRAJ PONOWNIE', again);
    this.input.keyboard?.once('keydown-ENTER', again);
  }
}
