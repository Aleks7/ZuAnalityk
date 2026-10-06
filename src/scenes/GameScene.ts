import Phaser from 'phaser';
import {
  BULLET_SPEED, COLORS, H, LOOT_PICKUP_BONUS, MAX_SHOOTERS, PLAYER_SCREEN_Y,
  ROAD_L, ROAD_MID, ROAD_R, W,
} from '../config';
import { Squad, formationOffset } from '../game/Squad';
import { GateDef, applyGate, fmt, gateColor, gateLabel } from '../game/gates';
import { ENEMY_KINDS, EnemyKind, stageBaseHp as stageHp } from '../game/enemies';
import { applyLoot, lootColor, rollLoot } from '../game/loot';
import { StageSpec, buildStage } from '../game/StageBuilder';
import { HelperState, Reward, RewardHost, rollRewards } from '../game/rewards';
import type { Boss, Enemy, EnemyBullet, Loot, Target } from '../game/types';
import type { Helper, HelperHost } from '../game/helpers/Helper';
import { Drone } from '../game/helpers/Drone';
import { Dog } from '../game/helpers/Dog';
import { Plane } from '../game/helpers/Plane';
import { Falcon } from '../game/helpers/Falcon';
import { saveRecords } from '../storage';

interface Bullet {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  dmg: number;
  alive: boolean;
}

interface GatePair {
  y: number;
  left: GateDef;
  right: GateDef;
  views: Phaser.GameObjects.Container[];
  used: boolean;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export class GameScene extends Phaser.Scene implements HelperHost, RewardHost {
  squad!: Squad;
  stage = 1;
  score = 0;
  loot: Loot[] = [];
  helpers!: HelperState;

  private state: 'playing' | 'reward' | 'dead' = 'playing';
  private spec!: StageSpec;
  private enemies: Enemy[] = [];
  private gates: GatePair[] = [];
  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private boss!: Boss;
  private helperObjs: Helper[] = [];
  private dog: Dog | null = null;
  private plane: Plane | null = null;

  private bg!: Phaser.GameObjects.TileSprite;
  private bars!: Phaser.GameObjects.Graphics;
  private finish!: Phaser.GameObjects.Graphics;
  private hudStage!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudProgress!: Phaser.GameObjects.Graphics;
  private statsBar!: Phaser.GameObjects.Container;
  private statsKey = '';
  private emitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();

  private keys!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private lastPointerX: number | null = null;

  constructor() {
    super('Game');
  }

  // create() runs again on every restart, so all run state is reset here
  create(): void {
    this.stage = 1;
    this.score = 0;
    this.state = 'playing';
    this.enemies = [];
    this.gates = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.statsKey = '';
    this.loot = [];
    this.helperObjs = [];
    this.dog = null;
    this.plane = null;
    this.emitters = new Map();
    this.helpers = { drones: 0, dogLevel: 0, planeLevel: 0, falcons: 0 };

    this.bg = this.add.tileSprite(0, 0, W, H, 'road').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.finish = this.add.graphics().setDepth(1);
    this.bars = this.add.graphics().setDepth(50);
    this.squad = new Squad(this);

    this.createHud();
    this.createInput();

    this.cameras.main.scrollY = this.squad.y - PLAYER_SCREEN_Y;
    this.startStage(0);

    // Debug/test hook
    (window as unknown as { __zu: GameScene }).__zu = this;
  }

  // ---------- Setup ----------
  private createHud(): void {
    const style = { fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 10, y: 5 } };
    this.hudStage = this.add.text(10, 10, '', style).setScrollFactor(0).setDepth(100);
    this.hudScore = this.add.text(W - 10, 10, '', style).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.hudProgress = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.statsBar = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
  }

  // Bottom bar with the current stats and helpers; rebuilt only when something changes
  private updateStatsBar(): void {
    const s = this.squad;
    const h = this.helpers;
    const stats: [string, string][] = [
      ['loot_dmg', fmt(s.bulletDamage())],
      ['loot_fire', fmt(s.fireRate) + '/s'],
    ];
    if (s.multishot > 1) stats.push(['bullet', 'x' + s.multishot]);
    if (s.shield > 0) stats.push(['icon_shield', String(s.shield)]);
    if (s.magnet > 0) stats.push(['icon_magnet', '+' + s.magnet]);
    const helpers: [string, string][] = [];
    if (h.drones) helpers.push(['drone', 'x' + h.drones]);
    if (h.dogLevel) helpers.push(['dog', 'poz.' + h.dogLevel]);
    if (h.planeLevel) helpers.push(['plane', 'poz.' + h.planeLevel]);
    if (h.falcons) helpers.push(['falcon', 'x' + h.falcons]);

    const key = JSON.stringify([stats, helpers]);
    if (key === this.statsKey) return;
    this.statsKey = key;

    const bar = this.statsBar;
    bar.removeAll(true);
    const rowH = 30;
    const rows = helpers.length ? [stats, helpers] : [stats];
    const top = H - rows.length * rowH - 4;
    bar.add(this.add.rectangle(0, top, W, H - top, 0x000000, 0.5).setOrigin(0));
    rows.forEach((items, r) => {
      let x = 10;
      const y = top + 4 + r * rowH + rowH / 2;
      for (const [tex, label] of items) {
        const icon = this.add.image(x, y, tex);
        icon.setScale(Math.min(1, 22 / Math.max(icon.width, icon.height))).setOrigin(0, 0.5);
        const text = this.add
          .text(x + icon.displayWidth + 4, y, label, { fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: '#ffffff' })
          .setOrigin(0, 0.5);
        bar.add([icon, text]);
        x += icon.displayWidth + 4 + text.width + 14;
      }
    });
  }

  private createInput(): void {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = { left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D) };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.lastPointerX = p.x; });
    this.input.on('pointerup', () => { this.lastPointerX = null; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.lastPointerX === null || !p.isDown) return;
      this.squad.targetX += (p.x - this.lastPointerX) * 1.2;
      this.lastPointerX = p.x;
    });
  }

  // ---------- Stage ----------
  private startStage(startY: number): void {
    // Anything left from the previous stage is behind us now
    this.enemies.forEach(e => e.sprite.destroy());
    this.enemies = [];
    this.gates.forEach(g => g.views.forEach(v => v.destroy()));
    this.gates = [];
    this.loot.filter(l => !l.claimed).forEach(l => l.sprite.destroy());
    this.loot = this.loot.filter(l => l.claimed);
    if (this.boss) this.boss.sprite.destroy();
    this.enemyBullets.forEach(b => b.img.destroy());
    this.enemyBullets = [];

    this.spec = buildStage(startY, this.stage);

    for (const g of this.spec.gates) {
      this.gates.push({ ...g, used: false, views: [this.gateView(g.left, 'L', g.y), this.gateView(g.right, 'R', g.y), this.gateDivider(g.y)] });
    }
    for (const e of this.spec.enemies) this.spawnEnemy(e.kind, e.x, e.y, e.hp, e.armor, e.power, e.speed);
    this.boss = {
      sprite: this.add.image(ROAD_MID, this.spec.boss.y, 'boss').setDepth(19).setVisible(false),
      hp: this.spec.boss.hp,
      maxHp: this.spec.boss.hp,
      r: 46,
      speed: 28,
      active: false,
      dead: false,
      drainTimer: 0,
      shootTimer: 2,
      summonTimer: 4,
    };
    this.drawFinish();
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number, hp: number, armor: number, power: number, speed: number): Enemy {
    const d = ENEMY_KINDS[kind];
    const sprite = this.add.image(x, y, d.texture).setDepth(kind === 'tank' ? 17 : 18);
    const e: Enemy = { sprite, hp, maxHp: hp, armor, power, speed, kind, r: d.r, dead: false, shootTimer: Phaser.Math.FloatBetween(0.5, 1.5) };
    this.enemies.push(e);
    return e;
  }

  private gateView(g: GateDef, side: 'L' | 'R', y: number): Phaser.GameObjects.Container {
    const w = (ROAD_R - ROAD_L) / 2 - 12;
    const h = 46;
    const x = side === 'L' ? ROAD_L + 6 + w / 2 : ROAD_MID + 6 + w / 2;
    const rect = this.add.rectangle(0, 0, w, h, gateColor(g), 0.75).setStrokeStyle(3, 0xffffff, 0.85);
    const postL = this.add.rectangle(-w / 2, 0, 6, h + 12, 0x555555);
    const postR = this.add.rectangle(w / 2, 0, 6, h + 12, 0x555555);
    const label = gateLabel(g);
    const text = this.add
      .text(0, 1, label, { fontFamily: FONT, fontSize: label.includes('\n') ? '15px' : '26px', fontStyle: '900', color: '#ffffff', align: 'center', stroke: '#00000055', strokeThickness: 4 })
      .setOrigin(0.5)
      .setLineSpacing(-4);
    return this.add.container(x, y, [rect, postL, postR, text]).setDepth(10);
  }

  // Wall between the two gates with an "OR" badge – only one of them can be taken
  private gateDivider(y: number): Phaser.GameObjects.Container {
    const wall = this.add.rectangle(0, 0, 10, 70, 0x3a3a3a).setStrokeStyle(2, 0x222222);
    const badge = this.add.circle(0, 0, 15, 0xffd23f).setStrokeStyle(2, 0xb3471d);
    const text = this.add.text(0, 0, 'LUB', { fontFamily: FONT, fontSize: '11px', fontStyle: '900', color: '#3a2300' }).setOrigin(0.5);
    return this.add.container(ROAD_MID, y, [wall, badge, text]).setDepth(11);
  }

  private drawFinish(): void {
    const y = this.spec.endY;
    const size = 14;
    this.finish.clear();
    for (let i = 0; ROAD_L + i * size < ROAD_R; i++) {
      for (let j = 0; j < 2; j++) {
        this.finish.fillStyle((i + j) % 2 ? 0x222222 : 0xffffff);
        this.finish.fillRect(ROAD_L + i * size, y - size + j * size, size, size);
      }
    }
  }

  // ---------- HelperHost / RewardHost ----------
  get sceneRef(): Phaser.Scene {
    return this;
  }

  viewTop(): number {
    return this.cameras.main.scrollY;
  }

  viewBottom(): number {
    return this.cameras.main.scrollY + H;
  }

  targets(): Target[] {
    const out: Target[] = [];
    const top = this.viewTop() - 20;
    for (const e of this.enemies) {
      if (e.dead || e.sprite.y < top) continue;
      out.push({ x: e.sprite.x, y: e.sprite.y, r: e.r, hit: d => this.damageEnemy(e, d), alive: () => !e.dead });
    }
    const b = this.boss;
    if (b.active && !b.dead) {
      out.push({ x: b.sprite.x, y: b.sprite.y, r: b.r, hit: d => this.damageBoss(d), alive: () => !b.dead });
    }
    return out;
  }

  spawnBullet(x: number, y: number, vx: number, vy: number, dmg: number, texture: string): void {
    let b = this.bullets.find(o => !o.alive);
    if (!b) {
      b = { img: this.add.image(0, 0, texture).setDepth(30), vx: 0, vy: 0, dmg: 0, alive: false };
      this.bullets.push(b);
    }
    b.img.setTexture(texture).setPosition(x, y).setVisible(true).setRotation(Math.atan2(vy, vx) + Math.PI / 2);
    b.vx = vx;
    b.vy = vy;
    b.dmg = dmg;
    b.alive = true;
  }

  explode(x: number, y: number, radius: number, dmg: number): void {
    this.burst(x, y, 0xff9a3c, 22);
    this.burst(x, y, 0x444444, 10);
    this.cameras.main.shake(120, 0.006);
    for (const t of this.targets()) {
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < (radius + t.r) ** 2) t.hit(dmg);
    }
  }

  collectLoot(l: Loot): void {
    if (l.collected) return;
    l.collected = true;
    const text = applyLoot(this.squad, l.def);
    this.score += 1;
    this.floater(this.squad.x, this.squad.y - this.squad.radius() - 40, text, lootColor(l.def.type), 18);
    this.tweens.add({ targets: l.sprite, scale: 0, duration: 150, onComplete: () => l.sprite.destroy() });
  }

  addDrone(): void {
    this.helperObjs.push(new Drone(this, this.helpers.drones));
    this.helpers.drones++;
  }

  upgradeDog(): void {
    if (!this.dog) {
      this.dog = new Dog(this);
      this.helperObjs.push(this.dog);
    } else {
      this.dog.level++;
    }
    this.helpers.dogLevel++;
  }

  upgradePlane(): void {
    if (!this.plane) {
      this.plane = new Plane(this);
      this.helperObjs.push(this.plane);
    } else {
      this.plane.level++;
    }
    this.helpers.planeLevel++;
  }

  addFalcon(): void {
    this.helperObjs.push(new Falcon(this, this.helpers.falcons));
    this.helpers.falcons++;
  }

  // Called by RewardScene
  chooseReward(r: Reward): void {
    r.apply(this);
    this.floater(this.squad.x, this.squad.y - 90, r.title.toUpperCase(), '#ffd23f', 26);
    this.stage++;
    this.startStage(this.squad.y);
    this.state = 'playing';
    this.scene.resume();
  }

  // ---------- Combat ----------
  damageEnemy(e: Enemy, dmg: number): void {
    if (e.dead) return;
    // Armour soaks a flat amount of every hit, but at least 20% always gets through
    e.hp -= Math.max(dmg * 0.2, dmg - e.armor);
    e.sprite.setTintFill(0xffffff);
    this.time.delayedCall(50, () => e.sprite.clearTint());
    if (e.hp > 0) return;
    e.dead = true;
    const d = ENEMY_KINDS[e.kind];
    this.score += d.score;
    this.burst(e.sprite.x, e.sprite.y, d.lootTier > 1 ? 0xa24cff : 0xff9a3c, d.lootTier > 1 ? 18 : 8);
    if (e.kind === 'tank') {
      this.burst(e.sprite.x, e.sprite.y, 0x444444, 20);
      this.cameras.main.shake(200, 0.01);
    }
    if (Math.random() < d.lootChance) this.dropLoot(e.sprite.x, e.sprite.y, d.lootTier);
    e.sprite.destroy();
  }

  private damageBoss(dmg: number): void {
    const b = this.boss;
    if (b.dead) return;
    b.hp -= dmg;
    b.sprite.setTintFill(0xffffff);
    this.time.delayedCall(50, () => b.sprite.clearTint());
    if (b.hp <= 0) this.killBoss();
  }

  private dropLoot(x: number, y: number, tier: 1 | 2 | 3): void {
    const def = rollLoot(tier);
    const sprite = this.add.image(x, y, 'loot_' + def.type).setDepth(12).setScale(0);
    this.tweens.add({ targets: sprite, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: sprite, y: y - 5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });
    this.loot.push({ sprite, def, claimed: false, collected: false });
  }

  private killBoss(): void {
    const b = this.boss;
    b.dead = true;
    this.score += 100 * this.stage + this.squad.count * 2;
    this.burst(b.sprite.x, b.sprite.y, COLORS.gold, 50);
    this.burst(b.sprite.x, b.sprite.y, 0xff4d4d, 40);
    this.cameras.main.shake(300, 0.012);
    b.sprite.destroy();
    this.state = 'reward';
    this.time.delayedCall(900, () => {
      this.scene.pause();
      this.scene.launch('Reward', { choices: rollRewards(this), stage: this.stage });
    });
  }

  private gameOver(): void {
    this.state = 'dead';
    this.burst(this.squad.x, this.squad.y, 0xff4d4d, 40);
    this.squad.hide();
    this.cameras.main.shake(300, 0.015);
    const records = saveRecords(this.score, this.stage);
    this.time.delayedCall(700, () => {
      this.scene.pause();
      this.scene.launch('GameOver', { score: this.score, stage: this.stage, records });
    });
  }

  // ---------- Effects ----------
  private burst(x: number, y: number, color: number, n: number): void {
    let em = this.emitters.get(color);
    if (!em) {
      em = this.add.particles(0, 0, 'spark', {
        speed: { min: 40, max: 200 },
        lifespan: { min: 300, max: 700 },
        scale: { start: 0.7, end: 0 },
        tint: color,
        emitting: false,
      }).setDepth(70);
      this.emitters.set(color, em);
    }
    em.explode(n, x, y);
  }

  private floater(x: number, y: number, text: string, color: string, size: number): void {
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: size + 'px', fontStyle: '900', color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(90);
    // follow the squad upwards while fading out
    this.tweens.add({ targets: t, alpha: 0, duration: 1100, onUpdate: () => { t.y -= 2.8; }, onComplete: () => t.destroy() });
  }

  // ---------- Update ----------
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.033, deltaMs / 1000);
    if (this.state === 'dead') return;
    const squad = this.squad;

    if (this.state === 'playing') {
      this.steer(dt);
      this.advance(dt);
      this.shoot(dt);
      this.checkGates();
    }

    const cam = this.cameras.main;
    cam.scrollY += (squad.y - PLAYER_SCREEN_Y - cam.scrollY) * Math.min(1, dt * 8);
    this.bg.tilePositionY = cam.scrollY;

    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateEnemyBullets(dt);
    this.updateBoss(dt);
    this.updateLoot(dt);
    for (const h of this.helperObjs) h.update(dt);

    squad.render();
    this.drawBars();
    this.updateHud();
    this.updateStatsBar();

    if (this.state === 'playing' && squad.count <= 0) this.gameOver();
  }

  private steer(dt: number): void {
    const s = this.squad;
    let dir = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) dir -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) dir += 1;
    s.targetX += dir * 320 * dt;
    const r = s.radius();
    s.targetX = Phaser.Math.Clamp(s.targetX, ROAD_L + r, ROAD_R - r);
    s.x += (s.targetX - s.x) * Math.min(1, dt * 14);
  }

  private advance(dt: number): void {
    const s = this.squad;
    const b = this.boss;
    const blocked = b.active && !b.dead && b.sprite.y > s.y - s.radius() - b.r - 4;
    if (s.y > this.spec.endY && !blocked) {
      s.y -= s.speed * dt;
      s.step += dt;
    }
    if (!b.active && s.y <= this.spec.endY + 600) {
      b.active = true;
      b.sprite.setVisible(true);
    }
  }

  private shoot(dt: number): void {
    const s = this.squad;
    s.fireTimer -= dt;
    if (s.fireTimer > 0 || s.count <= 0) return;
    s.fireTimer = 1 / s.fireRate;
    const shooters = Math.min(s.count, MAX_SHOOTERS);
    const dmg = s.bulletDamage();
    for (let i = 0; i < shooters; i++) {
      const o = formationOffset(i);
      for (let k = 0; k < s.multishot; k++) {
        const spread = s.multishot === 1 ? 0 : (k / (s.multishot - 1) - 0.5) * 120;
        this.spawnBullet(s.x + o.x, s.y + o.y - 10, spread, -BULLET_SPEED, dmg, 'bullet');
      }
    }
  }

  private checkGates(): void {
    const s = this.squad;
    for (const g of this.gates) {
      if (g.used || s.y >= g.y) continue;
      g.used = true;
      const left = s.x < ROAD_MID;
      const chosen = left ? g.left : g.right;
      applyGate(s, chosen);
      this.score += 10;
      const [lv, rv, divider] = g.views;
      const [taken, other] = left ? [lv, rv] : [rv, lv];
      // the chosen gate pops, the other one collapses – you get exactly one bonus
      this.tweens.add({ targets: taken, scaleX: 1.15, scaleY: 1.3, alpha: 0, duration: 250, onComplete: () => taken.destroy() });
      this.tweens.add({ targets: other, scaleY: 0, alpha: 0, duration: 200, onComplete: () => other.destroy() });
      this.tweens.add({ targets: divider, alpha: 0, duration: 200, onComplete: () => divider.destroy() });
      this.floater(s.x, s.y - 60, gateLabel(chosen).replace('\n', ' '), '#7df9ff', 30);
      this.burst(s.x, s.y, 0x7df9ff, 18);
    }
  }

  private updateBullets(dt: number): void {
    const top = this.viewTop() - 40;
    const bottom = this.viewBottom() + 40;
    const b = this.boss;
    for (const bl of this.bullets) {
      if (!bl.alive) continue;
      const img = bl.img;
      img.x += bl.vx * dt;
      img.y += bl.vy * dt;
      if (img.y < top || img.y > bottom || img.x < 0 || img.x > W) {
        this.killBullet(bl);
        continue;
      }
      // Bullets fly straight through gates – only enemies and the boss stop them
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = img.x - e.sprite.x;
        const dy = img.y - e.sprite.y;
        if (dx * dx + dy * dy < (e.r + 3) ** 2) {
          this.damageEnemy(e, bl.dmg);
          this.killBullet(bl);
          break;
        }
      }
      if (!bl.alive) continue;
      if (b.active && !b.dead) {
        const dx = img.x - b.sprite.x;
        const dy = img.y - b.sprite.y;
        if (dx * dx + dy * dy < (b.r + 3) ** 2) {
          this.damageBoss(bl.dmg);
          this.killBullet(bl);
        }
      }
    }
  }

  private killBullet(b: Bullet): void {
    b.alive = false;
    b.img.setVisible(false);
  }

  private updateEnemies(dt: number): void {
    const s = this.squad;
    const sr = s.radius();
    const top = this.viewTop();
    const bottom = this.viewBottom();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const sp = e.sprite;
      // Waves start marching once on screen, straight down – no homing, so they can be dodged
      if (sp.y > top - 60) {
        sp.y += e.speed * dt;
        if (e.kind !== 'tank') sp.setAngle(Math.sin(this.time.now / 90 + sp.x) * 6);
        if (e.kind === 'shooter' && this.state === 'playing' && sp.y > top + 30 && sp.y < s.y - 80) {
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = 1.6;
            this.enemyShoot(sp.x, sp.y + 10, s.x, s.y, 230, e.power);
          }
        }
      }
      if (this.state === 'playing') {
        const dx = sp.x - s.x;
        const dy = sp.y - s.y;
        if (dx * dx + dy * dy < (e.r + sr) ** 2) {
          e.dead = true;
          this.burst(sp.x, sp.y, 0xff4d4d, 14);
          sp.destroy();
          this.hurtSquad(e.power);
          continue;
        }
      }
      if (sp.y > bottom + 60) {
        e.dead = true;
        sp.destroy();
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  private hurtSquad(power: number): void {
    const s = this.squad;
    const sr = s.radius();
    if (s.shield > 0) {
      s.shield--;
      this.floater(s.x, s.y - sr - 40, 'TARCZA', '#7df9ff', 18);
      return;
    }
    const lost = Math.min(s.count, power);
    s.count -= lost;
    s.flash();
    this.cameras.main.shake(120, 0.008);
    if (lost > 0) this.floater(s.x, s.y - sr - 40, '-' + lost, '#ff6b6b', 22);
  }

  private enemyShoot(x: number, y: number, tx: number, ty: number, speed: number, power: number): void {
    const a = Math.atan2(ty - y, tx - x);
    this.enemyShootAngle(x, y, a, speed, power);
  }

  private enemyShootAngle(x: number, y: number, a: number, speed: number, power: number): void {
    let b = this.enemyBullets.find(o => !o.alive);
    if (!b) {
      b = { img: this.add.image(0, 0, 'enemyBullet').setDepth(31), vx: 0, vy: 0, power: 0, alive: false };
      this.enemyBullets.push(b);
    }
    b.img.setPosition(x, y).setVisible(true);
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.power = power;
    b.alive = true;
  }

  private updateEnemyBullets(dt: number): void {
    const s = this.squad;
    const sr = s.radius();
    const top = this.viewTop() - 40;
    const bottom = this.viewBottom() + 40;
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      const hit = this.state === 'playing' && (b.img.x - s.x) ** 2 + (b.img.y - s.y) ** 2 < (sr + 4) ** 2;
      if (hit) this.hurtSquad(b.power);
      if (hit || b.img.y < top || b.img.y > bottom || b.img.x < 0 || b.img.x > W) {
        b.alive = false;
        b.img.setVisible(false);
      }
    }
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    if (!b.active || b.dead || this.state !== 'playing') return;
    const s = this.squad;
    const sr = s.radius();
    const bx = b.sprite.x;
    const by = b.sprite.y;
    // From stage 2 the boss fires spreads, from stage 4 it also calls in runners
    if (this.stage >= 2 && by > this.viewTop() + 40) {
      b.shootTimer -= dt;
      if (b.shootTimer <= 0) {
        b.shootTimer = Math.max(1.2, 2.4 - this.stage * 0.1);
        const shots = Math.min(3 + this.stage, 9);
        const base = Math.atan2(s.y - by, s.x - bx);
        for (let i = 0; i < shots; i++) {
          this.enemyShootAngle(bx, by + 30, base + (i - (shots - 1) / 2) * 0.16, 210, 1 + Math.floor(this.stage / 2));
        }
      }
    }
    if (this.stage >= 4 && by > this.viewTop() + 40) {
      b.summonTimer -= dt;
      if (b.summonTimer <= 0) {
        b.summonTimer = 5;
        const d = ENEMY_KINDS.runner;
        const hp = stageHp(this.stage) * d.hpMult;
        for (const off of [-60, 0, 60]) {
          this.spawnEnemy('runner', Phaser.Math.Clamp(bx + off, ROAD_L + 10, ROAD_R - 10), by + 40, hp, 0, d.power(this.stage), 35 * d.speedMult);
        }
      }
    }
    if (s.y - b.sprite.y > b.r + sr) {
      b.sprite.y += b.speed * dt;
      b.sprite.x += Phaser.Math.Clamp(s.x - b.sprite.x, -1, 1) * 20 * dt;
      b.sprite.setScale(1 + Math.sin(this.time.now / 150) * 0.03);
    } else {
      // In contact – the boss crushes soldiers
      b.drainTimer -= dt;
      if (b.drainTimer <= 0) {
        b.drainTimer = 0.18;
        s.count -= Math.min(s.count, 1 + Math.floor(this.stage / 3));
        this.burst(s.x + Phaser.Math.Between(-sr, sr), s.y - sr * 0.5, 0xff4d4d, 4);
        this.cameras.main.shake(80, 0.005);
      }
    }
  }

  private updateLoot(_dt: number): void {
    const s = this.squad;
    const reach = s.radius() + LOOT_PICKUP_BONUS + s.magnet;
    const bottom = this.viewBottom();
    for (const l of this.loot) {
      if (l.collected || l.claimed) continue;
      const sp = l.sprite;
      const d = Math.hypot(sp.x - s.x, sp.y - s.y);
      if (s.magnet > 0 && d < reach + 40) {
        // magnet pulls nearby loot in
        sp.x += (s.x - sp.x) * 0.15;
        sp.y += (s.y - sp.y) * 0.15;
      }
      if (this.state === 'playing' && d < reach) this.collectLoot(l);
      else if (sp.y > bottom + 40) {
        l.collected = true;
        sp.destroy();
      }
    }
    this.loot = this.loot.filter(l => !l.collected);
  }

  private drawBars(): void {
    const g = this.bars;
    g.clear();
    const bar = (x: number, y: number, w: number, frac: number, h: number) => {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - w / 2, y, w, h);
      g.fillStyle(frac > 0.5 ? 0x4cd964 : frac > 0.25 ? 0xffcc00 : 0xff3b30);
      g.fillRect(x - w / 2, y, w * Phaser.Math.Clamp(frac, 0, 1), h);
    };
    for (const e of this.enemies) {
      if (!e.dead && e.hp < e.maxHp) bar(e.sprite.x, e.sprite.y - e.r - 10, e.r * 2, e.hp / e.maxHp, 4);
    }
    const b = this.boss;
    if (b.active && !b.dead) bar(b.sprite.x, b.sprite.y - b.r - 22, 110, b.hp / b.maxHp, 10);
  }

  private updateHud(): void {
    this.hudStage.setText('Etap ' + this.stage);
    this.hudScore.setText(this.score + ' pkt');
    const frac = Phaser.Math.Clamp((this.spec.startY - this.squad.y) / this.spec.length, 0, 1);
    const g = this.hudProgress;
    const w = W * 0.5;
    const x = (W - w) / 2;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x, 48, w, 8, 4);
    g.fillStyle(COLORS.gold);
    if (frac > 0) g.fillRoundedRect(x, 48, Math.max(8, w * frac), 8, 4);
  }
}
