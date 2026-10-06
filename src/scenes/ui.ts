import Phaser from 'phaser';

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 44): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: size + 'px', fontStyle: '900', color: '#ffd23f', align: 'center', stroke: '#b3471d', strokeThickness: 8 })
    .setOrigin(0.5);
}

export function body(scene: Phaser.Scene, x: number, y: number, text: string, size = 17, alpha = 1): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: size + 'px', color: '#ffffff', align: 'center', lineSpacing: 6, wordWrap: { width: 340 } })
    .setOrigin(0.5)
    .setAlpha(alpha);
}

export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
  const text = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: '#3a2300' }).setOrigin(0.5);
  const w = Math.max(200, text.width + 60);
  const shadow = scene.add.rectangle(0, 5, w, 54, 0xb3471d).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, w, 54, 0xffd23f).setOrigin(0.5);
  const c = scene.add.container(x, y, [shadow, bg, text]).setSize(w, 54).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setY(y + 3));
  c.on('pointerout', () => c.setY(y));
  c.on('pointerup', () => {
    c.setY(y);
    onClick();
  });
  return c;
}

export function dim(scene: Phaser.Scene, alpha = 0.78): void {
  scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x0f121e, alpha).setOrigin(0).setInteractive();
}
