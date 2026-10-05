(() => {
  'use strict';

  // ---------- Setup ----------
  const W = 400;
  const H = 700;
  const ROAD_L = 30;
  const ROAD_R = 370;
  const ROAD_MID = (ROAD_L + ROAD_R) / 2;
  const PLAYER_SCREEN_Y = 560;
  const SPACING = 7;          // distance between soldiers in formation
  const MAX_DRAWN = 80;       // soldiers drawn / used for formation
  const MAX_SHOOTERS = 16;    // bullets per volley

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const hudLevel = document.getElementById('hudLevel');
  const hudScore = document.getElementById('hudScore');
  const progressBar = document.getElementById('progressBar');

  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  // ---------- Helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function formationOffset(i) {
    if (i === 0) return { x: 0, y: 0 };
    const r = SPACING * Math.sqrt(i);
    const a = i * 2.39996; // golden angle
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8 };
  }

  // ---------- Game state ----------
  let state = 'menu';
  let level = storage.get('sr_level', 1);
  let score = 0;
  let best = storage.get('sr_best', 0);
  let player, gates, enemies, bullets, cameraY, levelLength, boss;
  let particles = [];
  let floaters = [];
  let shake = 0;

  function squadRadius() {
    return SPACING * Math.sqrt(Math.min(player.count, MAX_DRAWN)) + 8;
  }

  // ---------- Gate definitions ----------
  // Each gate has a type and value. Good gates are blue/green, bad are red.
  function gateLabel(g) {
    switch (g.type) {
      case 'add': return '+' + g.value;
      case 'sub': return '-' + g.value;
      case 'mul': return 'x' + g.value;
      case 'div': return '÷' + g.value;
      case 'fire': return 'SZYBKOŚĆ +' + g.value + '%';
      case 'dmg': return 'MOC +' + g.value;
    }
  }

  function gateIsGood(g) {
    return g.type === 'add' || g.type === 'mul' || g.type === 'fire' || g.type === 'dmg';
  }

  function makeGoodGate() {
    const r = Math.random();
    if (r < 0.45) return { type: 'add', value: randInt(3, 6) + level * 2 };
    if (r < 0.65) return { type: 'mul', value: pick([2, 2, 3]) };
    if (r < 0.83) return { type: 'fire', value: pick([20, 25, 30]) };
    return { type: 'dmg', value: 1 };
  }

  function makeBadGate() {
    const r = Math.random();
    if (r < 0.7) return { type: 'sub', value: randInt(4, 8) + level * 2 };
    return { type: 'div', value: 2 };
  }

  function applyGate(g) {
    const before = player.count;
    switch (g.type) {
      case 'add': player.count += g.value; break;
      case 'sub': player.count -= g.value; break;
      case 'mul': player.count *= g.value; break;
      case 'div': player.count = Math.floor(player.count / g.value); break;
      case 'fire': player.fireRate *= 1 + g.value / 100; break;
      case 'dmg': player.damage += g.value; break;
    }
    player.count = Math.max(0, Math.round(player.count));
    const good = gateIsGood(g);
    addFloater(player.x, PLAYER_SCREEN_Y - 50, gateLabel(g), good ? '#7df9ff' : '#ff6b6b', true);
    burst(player.x, cameraY + PLAYER_SCREEN_Y, good ? '#7df9ff' : '#ff6b6b', 18);
    if (good) score += 10;
    if (player.count > before) shake = Math.max(shake, 2);
  }

  // A shot into a gate improves it ("shoot the gate" mechanic from the ads)
  function hitGate(g) {
    g.hits++;
    g.flash = 0.08;
    if (g.hits % 3 !== 0) return;
    switch (g.type) {
      case 'add': g.value += 1; break;
      case 'sub':
        g.value -= 1;
        if (g.value <= 0) { g.type = 'add'; g.value = 1; }
        break;
      case 'fire': g.value += 2; break;
      default: break;
    }
  }

  // ---------- Level generation ----------
  function buildLevel() {
    gates = [];
    enemies = [];
    levelLength = 3200 + level * 500;
    let y = -450;
    let step = 0;
    while (y > -levelLength + 300) {
      if (step % 2 === 0) {
        // Gate pair: at least one good option; sometimes both good with a trade-off
        const good = makeGoodGate();
        const other = Math.random() < 0.35 ? makeGoodGate() : makeBadGate();
        const leftGood = Math.random() < 0.5;
        gates.push({ y, side: 'L', ...(leftGood ? good : other), used: false, hits: 0, flash: 0 });
        gates.push({ y, side: 'R', ...(leftGood ? other : good), used: false, hits: 0, flash: 0 });
        y -= 380;
      } else {
        spawnWave(y);
        y -= 420;
      }
      step++;
    }
    boss = {
      x: ROAD_MID,
      y: -levelLength - 200,
      r: 46,
      hp: 120 + level * 90,
      maxHp: 120 + level * 90,
      speed: 28,
      active: false,
      dead: false,
      drainTimer: 0,
      flash: 0,
    };
  }

  function spawnWave(y) {
    const n = 3 + Math.floor(level * 1.3) + randInt(0, 2);
    const pattern = pick(['row', 'cluster', 'column']);
    for (let i = 0; i < n; i++) {
      const brute = Math.random() < Math.min(0.08 + level * 0.04, 0.35);
      let x, ey;
      if (pattern === 'row') {
        x = ROAD_L + 30 + (i % 7) * ((ROAD_R - ROAD_L - 60) / 6);
        ey = y - Math.floor(i / 7) * 30;
      } else if (pattern === 'cluster') {
        const cx = rand(ROAD_L + 70, ROAD_R - 70);
        x = cx + rand(-50, 50);
        ey = y + rand(-50, 50);
      } else {
        x = ROAD_MID + (i % 2 ? 40 : -40) + rand(-10, 10);
        ey = y - i * 26;
      }
      const baseHp = 2 + level * 1.2;
      enemies.push({
        x: clamp(x, ROAD_L + 15, ROAD_R - 15),
        y: ey,
        r: brute ? 17 : 10,
        hp: brute ? baseHp * 5 : baseHp,
        maxHp: brute ? baseHp * 5 : baseHp,
        power: brute ? 4 + level : 1,
        speed: brute ? 22 : rand(30, 50),
        brute,
        flash: 0,
        wobble: rand(0, Math.PI * 2),
      });
    }
  }

  function startLevel() {
    player = {
      x: ROAD_MID,
      y: 0, // world y (goes negative = up)
      count: 5 + Math.floor(level / 2),
      fireRate: 3, // volleys per second
      damage: 1,
      fireTimer: 0,
      speed: 140,
      targetX: ROAD_MID,
      step: 0,
    };
    bullets = [];
    particles = [];
    floaters = [];
    shake = 0;
    buildLevel();
    cameraY = player.y - PLAYER_SCREEN_Y;
    state = 'playing';
    overlay.classList.add('hidden');
    updateHud();
  }

  // ---------- Effects ----------
  function burst(x, worldY, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 200);
      particles.push({ x, y: worldY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, color, size: rand(2, 4) });
    }
  }

  // Floaters are in screen space so they stay readable while scrolling
  function addFloater(x, y, text, color, big) {
    floaters.push({ x, y, text, color, life: 1.1, big: !!big });
  }

  // ---------- Input ----------
  const keys = {};
  let dragging = false;
  let lastPointerX = 0;

  function toGameX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    lastPointerX = toGameX(e.clientX);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging || state !== 'playing') return;
    const gx = toGameX(e.clientX);
    player.targetX += (gx - lastPointerX) * 1.2;
    lastPointerX = gx;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if ((e.key === 'Enter' || e.key === ' ') && state !== 'playing') {
      e.preventDefault();
      onButton();
    }
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  document.getElementById('startBtn').addEventListener('click', onButton);

  function onButton() {
    if (state === 'menu' || state === 'gameover' || state === 'won') startLevel();
  }

  // ---------- Update ----------
  function update(dt) {
    if (state !== 'playing') {
      updateParticles(dt);
      return;
    }

    // Steering
    let dir = 0;
    if (keys['arrowleft'] || keys['a']) dir -= 1;
    if (keys['arrowright'] || keys['d']) dir += 1;
    player.targetX += dir * 320 * dt;
    const rad = squadRadius();
    player.targetX = clamp(player.targetX, ROAD_L + rad, ROAD_R - rad);
    player.x += (player.targetX - player.x) * Math.min(1, dt * 14);

    // Forward movement – stops at the end of the level for the boss fight
    const finishY = -levelLength;
    const bossBlocking = boss.active && !boss.dead && boss.y > player.y - squadRadius() - boss.r - 4;
    if (player.y > finishY && !bossBlocking) {
      player.y -= player.speed * dt;
      player.step += dt;
    }
    if (player.y <= finishY + 600) boss.active = true;

    cameraY += (player.y - PLAYER_SCREEN_Y - cameraY) * Math.min(1, dt * 8);

    // Shooting
    player.fireTimer -= dt;
    if (player.fireTimer <= 0 && player.count > 0) {
      player.fireTimer = 1 / player.fireRate;
      const shooters = Math.min(player.count, MAX_SHOOTERS);
      // Extra soldiers above the shooter cap boost bullet damage instead
      const dmg = player.damage * Math.max(1, player.count / MAX_SHOOTERS);
      for (let i = 0; i < shooters; i++) {
        const o = formationOffset(i);
        bullets.push({ x: player.x + o.x, y: player.y + o.y - 10, vy: -520, dmg });
      }
    }

    // Bullets
    for (const b of bullets) b.y += b.vy * dt;
    bullets = bullets.filter(b => !b.dead && b.y > cameraY - 40);

    for (const b of bullets) {
      // Gates absorb bullets and get better
      for (const g of gates) {
        if (g.used) continue;
        if (Math.abs(b.y - g.y) < 14 && inGate(g, b.x)) {
          hitGate(g);
          b.dead = true;
          break;
        }
      }
      if (b.dead) continue;
      for (const e of enemies) {
        if (e.dead) continue;
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.r + 3) * (e.r + 3)) {
          damageEnemy(e, b.dmg);
          b.dead = true;
          break;
        }
      }
      if (b.dead) continue;
      if (boss.active && !boss.dead) {
        const dx = b.x - boss.x, dy = b.y - boss.y;
        if (dx * dx + dy * dy < (boss.r + 3) * (boss.r + 3)) {
          boss.hp -= b.dmg;
          boss.flash = 0.06;
          b.dead = true;
          if (boss.hp <= 0) killBoss();
        }
      }
    }

    // Gates
    for (const g of gates) {
      g.flash = Math.max(0, g.flash - dt);
      if (!g.used && player.y < g.y) {
        const pair = gates.filter(o => o.y === g.y);
        pair.forEach(o => { o.used = true; });
        const chosen = pair.find(o => inGate(o, player.x)) || pair[0];
        applyGate(chosen);
      }
    }

    // Enemies walk towards the squad
    const sr = squadRadius();
    for (const e of enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      const screenY = e.y - cameraY;
      if (screenY > -60) {
        e.wobble += dt * 8;
        e.y += e.speed * dt;
        const dx = player.x - e.x;
        e.x += clamp(dx, -1, 1) * e.speed * 0.5 * dt;
      }
      const dx = e.x - player.x, dy = e.y - player.y;
      if (dx * dx + dy * dy < (e.r + sr) * (e.r + sr)) {
        e.dead = true;
        const lost = Math.min(player.count, e.power);
        player.count -= lost;
        burst(e.x, e.y, '#ff4d4d', 14);
        if (lost > 0) addFloater(player.x, PLAYER_SCREEN_Y - 40, '-' + lost, '#ff6b6b');
        shake = 6;
      }
      if (e.y - cameraY > H + 60) e.dead = true;
    }
    enemies = enemies.filter(e => !e.dead);

    // Boss
    if (boss.active && !boss.dead) {
      boss.flash = Math.max(0, boss.flash - dt);
      const contactDist = boss.r + sr;
      const dy = player.y - boss.y;
      if (dy > contactDist) {
        boss.y += boss.speed * dt;
        boss.x += clamp(player.x - boss.x, -1, 1) * 20 * dt;
      } else {
        // In contact – boss crushes soldiers
        boss.drainTimer -= dt;
        if (boss.drainTimer <= 0) {
          boss.drainTimer = 0.18;
          const lost = Math.min(player.count, 1 + Math.floor(level / 3));
          player.count -= lost;
          burst(player.x + rand(-sr, sr), player.y - sr * 0.5, '#ff4d4d', 4);
          shake = 4;
        }
      }
    }

    updateParticles(dt);
    shake = Math.max(0, shake - dt * 20);

    if (player.count <= 0) gameOver();
    updateHud();
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
    for (const f of floaters) {
      f.y -= 40 * dt;
      f.life -= dt;
    }
    floaters = floaters.filter(f => f.life > 0);
  }

  function inGate(g, x) {
    return g.side === 'L' ? x < ROAD_MID : x >= ROAD_MID;
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.flash = 0.06;
    if (e.hp <= 0) {
      e.dead = true;
      score += e.brute ? 15 : 3;
      burst(e.x, e.y, e.brute ? '#a24cff' : '#ff9a3c', e.brute ? 20 : 8);
    }
  }

  function killBoss() {
    boss.dead = true;
    score += 100 * level;
    burst(boss.x, boss.y, '#ffd23f', 60);
    burst(boss.x, boss.y, '#ff4d4d', 40);
    shake = 10;
    // Bonus for every surviving soldier
    score += player.count * 2;
    setTimeout(levelComplete, 900);
  }

  function levelComplete() {
    if (state !== 'playing') return;
    state = 'won';
    level++;
    storage.set('sr_level', level);
    updateHud();
    saveBest();
    showOverlay(
      'POZIOM UKOŃCZONY!',
      `Ocalali żołnierze: <b>${player.count}</b><br>Wynik: <b>${score}</b>`,
      'DALEJ'
    );
  }

  function gameOver() {
    state = 'gameover';
    burst(player.x, player.y, '#ff4d4d', 40);
    saveBest();
    const finalScore = score;
    score = 0;
    showOverlay(
      'KONIEC GRY',
      `Twój oddział poległ na poziomie ${level}.<br>Wynik: <b>${finalScore}</b>`,
      'SPRÓBUJ PONOWNIE'
    );
  }

  function saveBest() {
    if (score > best) {
      best = score;
      storage.set('sr_best', best);
    }
  }

  function showOverlay(title, html, btn) {
    overlay.innerHTML = `<h1>${title}</h1><p>${html}</p><p class="small">Rekord: ${best}</p><button id="startBtn">${btn}</button>`;
    overlay.querySelector('#startBtn').addEventListener('click', onButton);
    overlay.classList.remove('hidden');
  }

  function updateHud() {
    hudLevel.textContent = 'Poziom ' + level;
    hudScore.textContent = score + ' pkt';
    if (player) {
      const p = clamp(-player.y / levelLength, 0, 1);
      progressBar.style.width = (p * 100).toFixed(1) + '%';
    }
  }

  // ---------- Rendering ----------
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));

    drawBackground();
    if (player) {
      drawFinish();
      for (const g of gates) drawGate(g);
      for (const e of enemies) drawEnemy(e);
      if (boss && boss.active && !boss.dead) drawBoss();
      drawBullets();
      if (state !== 'gameover') drawSquad();
      drawParticles();
      drawFloaters();
    }
    ctx.restore();
  }

  function drawBackground() {
    const cy = player ? cameraY : 0;
    // Grass
    ctx.fillStyle = '#4c8c3a';
    ctx.fillRect(0, 0, W, H);
    // Road
    ctx.fillStyle = '#c9b48a';
    ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    ctx.fillStyle = '#b39d72';
    ctx.fillRect(ROAD_L - 6, 0, 6, H);
    ctx.fillRect(ROAD_R, 0, 6, H);
    // Moving stripes give a sense of speed
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const off = ((-cy) % 80 + 80) % 80;
    for (let y = -80 + off; y < H; y += 80) {
      ctx.fillRect(ROAD_MID - 3, y, 6, 40);
    }
    // Trees on the side
    const tOff = ((-cy) % 140 + 140) % 140;
    for (let y = -140 + tOff; y < H + 20; y += 140) {
      drawTree(14, y);
      drawTree(W - 14, y + 70);
    }
  }

  function drawTree(x, y) {
    ctx.fillStyle = '#2f6b25';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d8530';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFinish() {
    const y = -levelLength - cameraY;
    if (y < -20 || y > H + 20) return;
    const size = 14;
    for (let i = 0; (ROAD_L + i * size) < ROAD_R; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#222' : '#fff';
        ctx.fillRect(ROAD_L + i * size, y + j * size - size, size, size);
      }
    }
  }

  function drawGate(g) {
    const sy = g.y - cameraY;
    if (sy < -60 || sy > H + 60) return;
    const x0 = g.side === 'L' ? ROAD_L + 6 : ROAD_MID + 6;
    const w = (ROAD_R - ROAD_L) / 2 - 12;
    const h = 44;
    const good = gateIsGood(g);
    const alpha = g.used ? 0.25 : 0.75;
    let color = good ? `rgba(40, 140, 255, ${alpha})` : `rgba(235, 60, 60, ${alpha})`;
    if (g.type === 'fire' || g.type === 'dmg') color = `rgba(40, 200, 110, ${alpha})`;
    if (g.flash > 0) color = 'rgba(255,255,255,0.85)';

    ctx.fillStyle = color;
    roundRect(x0, sy - h / 2, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Posts
    ctx.fillStyle = '#555';
    ctx.fillRect(x0 - 4, sy - h / 2 - 6, 6, h + 12);
    ctx.fillRect(x0 + w - 2, sy - h / 2 - 6, 6, h + 12);

    if (!g.used) {
      const label = gateLabel(g);
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${label.length > 6 ? 15 : 26}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(label, x0 + w / 2, sy + 1);
      ctx.fillText(label, x0 + w / 2, sy + 1);
    }
  }

  function drawSoldier(x, y, color, size, step) {
    const leg = Math.sin(step) * 2.5;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - size * 0.45, y + size * 0.6, size * 0.35, size * 0.6 + leg);
    ctx.fillRect(x + size * 0.1, y + size * 0.6, size * 0.35, size * 0.6 - leg);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffdcb0';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.8, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSquad() {
    const n = Math.min(player.count, MAX_DRAWN);
    const sy = player.y - cameraY;
    // Draw back to front for nicer overlap
    const pts = [];
    for (let i = 0; i < n; i++) {
      const o = formationOffset(i);
      pts.push({ x: player.x + o.x, y: sy + o.y, i });
    }
    pts.sort((a, b) => a.y - b.y);
    for (const p of pts) drawSoldier(p.x, p.y, '#2b7bff', 7, player.step * 14 + p.i);

    // Count badge
    const r = squadRadius();
    const label = String(player.count);
    ctx.font = '900 20px system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 18;
    ctx.fillStyle = '#2b7bff';
    roundRect(player.x - tw / 2, sy - r - 34, tw, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, player.x, sy - r - 21);
  }

  function drawEnemy(e) {
    const sy = e.y - cameraY;
    if (sy < -40 || sy > H + 40) return;
    const color = e.flash > 0 ? '#fff' : (e.brute ? '#8a2be2' : '#e8432e');
    drawSoldier(e.x, sy, color, e.r * 0.8, e.wobble);
    if (e.hp < e.maxHp) drawHpBar(e.x, sy - e.r - 10, e.r * 2, e.hp / e.maxHp);
  }

  function drawBoss() {
    const sy = boss.y - cameraY;
    const r = boss.r;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(boss.x, sy + r * 0.9, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = boss.flash > 0 ? '#fff' : '#6b1a1a';
    ctx.beginPath();
    ctx.arc(boss.x, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(boss.x, sy - 4, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(boss.x - 13, sy + 6, 6, 0, Math.PI * 2);
    ctx.arc(boss.x + 13, sy + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    // Horns
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(boss.x - r * 0.7, sy - r * 0.5);
    ctx.lineTo(boss.x - r * 0.9, sy - r * 1.3);
    ctx.lineTo(boss.x - r * 0.35, sy - r * 0.8);
    ctx.moveTo(boss.x + r * 0.7, sy - r * 0.5);
    ctx.lineTo(boss.x + r * 0.9, sy - r * 1.3);
    ctx.lineTo(boss.x + r * 0.35, sy - r * 0.8);
    ctx.fill();
    drawHpBar(boss.x, sy - r - 22, 110, boss.hp / boss.maxHp, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', boss.x, sy - r - 34);
  }

  function drawHpBar(x, y, w, frac, h = 5) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = frac > 0.5 ? '#4cd964' : frac > 0.25 ? '#ffcc00' : '#ff3b30';
    ctx.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), h);
  }

  function drawBullets() {
    ctx.fillStyle = '#fff36b';
    for (const b of bullets) {
      const sy = b.y - cameraY;
      ctx.fillRect(b.x - 1.5, sy - 6, 3, 9);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - cameraY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.font = `900 ${f.big ? 30 : 20}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- Main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  document.getElementById('best').textContent = best ? 'Rekord: ' + best : '';
  updateHud();
  requestAnimationFrame(frame);

  // Exposed for debugging / automated tests
  window.__game = { get state() { return state; }, get player() { return player; }, get boss() { return boss; } };
})();
