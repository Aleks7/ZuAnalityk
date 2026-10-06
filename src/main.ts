import Phaser from 'phaser';
import { H, W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { RewardScene } from './scenes/RewardScene';
import { GameOverScene } from './scenes/GameOverScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#1b1f2e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, RewardScene, GameOverScene],
});
