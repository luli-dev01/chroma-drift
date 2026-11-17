// Chroma Drift — the simulation. Entities, waves, collisions and scoring.
// Rendering lives in render.js; this file only moves things and decides
// what happened, which keeps the rules testable by reading one file.

import { COMBO, ENEMY, NOVA, PLAYER, SPECTRUM, TAU, WAVES, WORLD } from './config.js';
import { makeRandom, range } from './random.js';

let nextId = 1;

function entity(kind, x, y) {
  return {
    id: nextId++, kind, x, y, vx: 0, vy: 0,
    angle: 0, spin: range(Math.random, -1.4, 1.4),
    hp: 1, maxHp: 1, radius: 10, age: 0, dead: false,
  };
}

function rangeRandom(rng, min, max) { return min + rng() * (max - min); }

export function createWorld(width, height, seed) {
  const rng = makeRandom(seed ?? (Date.now() % 2147483647));
  const stars = [];
  for (let i = 0; i < WORLD.starCount; i += 1) {
    stars.push({ x: rng() * width, y: rng() * height, z: 0.25 + rng() * 0.75, r: rng() * 1.6 + 0.4, tw: rng() * TAU });
  }
  const nebulas = [];
  for (let i = 0; i < WORLD.nebulaCount; i += 1) {
    nebulas.push({
      x: rng() * width, y: rng() * height,
      r: rangeRandom(rng, 140, 320),
      hue: Math.floor(rng() * SPECTRUM.length),
      drift: rangeRandom(rng, 2, 7),
    });
  }

  const world = {
    width, height, rng, stars, nebulas,
    state: 'title',           // title | playing | paused | over | won
    time: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    kills: 0,
    orbsCollected: 0,
    spectrumCharge: 0,
    wave: 0,
    waveState: 'intermission', // intermission | spawning | active | boss
    waveTimer: 1.2,
    toSpawn: 0,
    spawnTimer: 0,
    shake: 0,
    flashHue: -1,
    flashTimer: 0,
    novaTimer: 0,
    banner: '',
    bannerTimer: 0,
    player: null,
    bullets: [],
    enemies: [],
    orbs: [],
    particles: [],
    texts: [],
    events: [],               // sound cues for main.js: 'shoot', 'break', ...
  };

  world.player = spawnPlayer(world);
  return world;
}

function spawnPlayer(world) {
  const p = entity('player', world.width / 2, world.height / 2);
  p.radius = PLAYER.radius;
  p.hp = PLAYER.lives;
  p.maxHp = PLAYER.lives;
  p.fireTimer = 0;
  p.shield = 0;
  p.dashTimer = 0;
  p.dashCooldown = 0;
  p.trail = [];
  return p;
}

export function startGame(world) {
  const seed = (Date.now() % 2147483647) | 0;
  const fresh = createWorld(world.width, world.height, seed);
  Object.assign(world, fresh);
  world.state = 'playing';
  beginWave(world, 1);
}

function beginWave(world, wave) {
  world.wave = wave;
  world.waveState = 'spawning';
  world.spawnTimer = 0.4;
  if (wave % WAVES.bossEvery === 0) {
    world.toSpawn = 0;
    spawnMonolith(world);
    world.waveState = 'boss';
    setBanner(world, `WAVE ${wave} — THE MONOLITH`, 2.4);
  } else {
    world.toSpawn = WAVES.firstCount + (wave - 1) * WAVES.countGrowth;
    setBanner(world, `WAVE ${wave}`, 1.8);
  }
}

function setBanner(world, text, seconds) {
  world.banner = text;
  world.bannerTimer = seconds;
}

function spawnPoint(world) {
  // Spawn on an edge, away from the player so nothing lands on top of them.
  const { width, height, player } = world;
  for (let tries = 0; tries < 12; tries += 1) {
    const edge = Math.floor(world.rng() * 4);
    const x = edge === 0 ? -30 : edge === 1 ? width + 30 : world.rng() * width;
    const y = edge === 2 ? -30 : edge === 3 ? height + 30 : world.rng() * height;
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy > 260 * 260) return { x, y };
  }
  return { x: -30, y: -30 };
}

function spawnEnemy(world, kind, at) {
  const spec = ENEMY[kind];
  const e = entity(kind, at.x, at.y);
  e.radius = spec.radius;
  e.hp = spec.hp;
  if (kind === 'drifter' && world.wave >= WAVES.hpGrowthEvery) {
    e.hp += Math.floor(world.wave / WAVES.hpGrowthEvery);
  }
  e.maxHp = e.hp;
  e.speed = spec.speed * rangeRandom(world.rng, 0.85, 1.2);
  e.phase = world.rng() * TAU;
  world.enemies.push(e);
  return e;
}

function spawnMonolith(world) {
  const at = { x: world.width / 2, y: -70 };
  const boss = spawnEnemy(world, 'monolith', at);
  boss.burstTimer = 2.2;
  return boss;
}

function chooseKind(world) {
  const r = world.rng();
  const weaverShare = Math.min(0.42, 0.12 + world.wave * 0.035);
  const splitterShare = world.wave >= 2 ? Math.min(0.3, 0.08 + world.wave * 0.02) : 0;
  if (r < splitterShare) return 'splitter';
  if (r < splitterShare + weaverShare) return 'weaver';
  return 'drifter';
}

function burst(world, x, y, color, count, speed = 260, life = 0.6, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * TAU;
    const s = rangeRandom(world.rng, speed * 0.25, speed);
    const p = entity('particle', x, y);
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.color = color;
    p.life = rangeRandom(world.rng, life * 0.4, life);
    p.maxLife = p.life;
    p.size = rangeRandom(world.rng, size * 0.5, size * 1.4);
    world.particles.push(p);
  }
}

function floatingText(world, x, y, text, color) {
  const t = entity('text', x, y);
  t.text = text;
  t.color = color;
  t.life = 0.9;
  t.maxLife = 0.9;
  t.vy = -46;
  world.texts.push(t);
}

function dropOrb(world, x, y, chance) {
  if (world.rng() > chance) return;
  const hue = Math.floor(world.rng() * SPECTRUM.length);
  const orb = entity('orb', x, y);
  orb.radius = 9;
  orb.hue = hue;
  orb.vx = rangeRandom(world.rng, -40, 40);
  orb.vy = rangeRandom(world.rng, -40, 40);
  orb.life = 9;
  world.orbs.push(orb);
}

function killEnemy(world, e) {
  e.dead = true;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = COMBO.window;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(world.combo / 5));
  const gained = ENEMY[e.kind].score * multiplier;
  world.score += gained;
  const hue = Math.floor(world.rng() * SPECTRUM.length);
  burst(world, e.x, e.y, '#cfd4e6', e.kind === 'monolith' ? 90 : 14, e.kind === 'monolith' ? 420 : 280);
  burst(world, e.x, e.y, SPECTRUM[hue].hex, e.kind === 'monolith' ? 40 : 7, 200);
  floatingText(world, e.x, e.y - e.radius, `+${gained}`, SPECTRUM[hue].hex);
  world.events.push('break');
  dropOrb(world, e.x, e.y, ENEMY[e.kind].orbChance);
  if (e.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const mini = spawnEnemy(world, 'mini', { x: e.x + rangeRandom(world.rng, -14, 14), y: e.y + rangeRandom(world.rng, -14, 14) });
      const a = world.rng() * TAU;
      mini.vx = Math.cos(a) * 120;
      mini.vy = Math.sin(a) * 120;
    }
  }
  if (e.kind === 'monolith') {
    world.shake = Math.min(18, world.shake + 12);
    for (let i = 0; i < 5; i += 1) dropOrb(world, e.x + rangeRandom(world.rng, -50, 50), e.y + rangeRandom(world.rng, -50, 50), 1);
    setBanner(world, 'THE MONOLITH SHATTERS', 2.2);
  } else {
    world.shake = Math.min(8, world.shake + 2.5);
  }
}

function hurtPlayer(world) {
  const p = world.player;
  if (p.shield > 0 || p.dashTimer > 0) return;
  p.hp -= 1;
  p.shield = PLAYER.respawnShield;
  world.combo = 0;
  world.comboTimer = 0;
  world.shake = Math.min(16, world.shake + 10);
  world.flashHue = 0;
  world.flashTimer = 0.25;
  burst(world, p.x, p.y, SPECTRUM[0].hex, 26, 320);
  world.events.push('hurt');
  if (p.hp <= 0) {
    world.state = 'over';
    burst(world, p.x, p.y, '#ffffff', 70, 420, 1.1, 4);
    world.events.push('over');
  }
}

function fireNova(world) {
  const p = world.player;
  world.spectrumCharge = 0;
  world.novaTimer = 0.45;
  world.shake = Math.min(14, world.shake + 7);
  world.events.push('nova');
  for (const e of world.enemies) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy <= NOVA.radius * NOVA.radius) {
      e.hp -= NOVA.damage;
      if (e.hp <= 0 && !e.dead) killEnemy(world, e);
    }
  }
  for (let hue = 0; hue < SPECTRUM.length; hue += 1) {
    burst(world, p.x, p.y, SPECTRUM[hue].hex, 12, 380, 0.7, 3.5);
  }
}

export function updateWorld(world, dt, controls) {
  world.time += dt;
  world.events.length = 0;
  if (world.bannerTimer > 0) world.bannerTimer -= dt;
  if (world.flashTimer > 0) world.flashTimer -= dt;
  if (world.novaTimer > 0) world.novaTimer -= dt;
  world.shake = Math.max(0, world.shake - dt * 26);
  updateBackground(world, dt);
  updateParticles(world, dt);
  updateTexts(world, dt);

  if (world.state !== 'playing') return;

  const p = world.player;
  if (controls.pausePressed) { world.state = 'paused'; return; }

  // --- player movement, dash and fire -------------------------------------
  const move = controls.move;
  p.vx += move.x * PLAYER.accel * dt;
  p.vy += move.y * PLAYER.accel * dt;
  const damp = Math.max(0, 1 - PLAYER.friction * dt);
  if (move.x === 0) p.vx *= damp;
  if (move.y === 0) p.vy *= damp;

  if (controls.dashPressed && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(p.angle);
    const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(p.angle);
    const len = Math.hypot(dx, dy) || 1;
    p.vx = (dx / len) * PLAYER.dashSpeed;
    p.vy = (dy / len) * PLAYER.dashSpeed;
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    world.events.push('dash');
    burst(world, p.x, p.y, '#9be7ff', 10, 140, 0.35, 2.5);
  }
  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.shield = Math.max(0, p.shield - dt);

  const speed = Math.hypot(p.vx, p.vy);
  const cap = p.dashTimer > 0 ? PLAYER.dashSpeed : PLAYER.maxSpeed;
  if (speed > cap) { p.vx = (p.vx / speed) * cap; p.vy = (p.vy / speed) * cap; }
  p.x = clamp(p.x + p.vx * dt, p.radius, world.width - p.radius);
  p.y = clamp(p.y + p.vy * dt, p.radius, world.height - p.radius);
  p.angle = Math.atan2(controls.aimY - p.y, controls.aimX - p.x);
  p.trail.unshift({ x: p.x, y: p.y, age: 0 });
  if (p.trail.length > 14) p.trail.pop();
  for (const t of p.trail) t.age += dt;

  p.fireTimer -= dt;
  if (controls.firing && p.fireTimer <= 0) {
    p.fireTimer = 1 / PLAYER.fireRate;
    const b = entity('bullet', p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
    b.vx = Math.cos(p.angle) * PLAYER.bulletSpeed;
    b.vy = Math.sin(p.angle) * PLAYER.bulletSpeed;
    b.radius = PLAYER.bulletRadius;
    b.life = PLAYER.bulletLife;
    b.angle = p.angle;
    world.bullets.push(b);
    world.events.push('shoot');
  }

  if (controls.novaPressed && world.spectrumCharge >= NOVA.chargeNeeded) fireNova(world);

  // --- combo ---------------------------------------------------------------
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // --- waves ----------------------------------------------------------------
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.toSpawn > 0) {
      world.spawnTimer = WAVES.spawnGap;
      world.toSpawn -= 1;
      spawnEnemy(world, chooseKind(world), spawnPoint(world));
      if (world.toSpawn === 0) world.waveState = 'active';
    }
  } else if ((world.waveState === 'active' || world.waveState === 'boss')
      && world.enemies.length === 0 && world.state === 'playing') {
    world.waveState = 'intermission';
    world.waveTimer = WAVES.intermission;
    world.score += 100 + world.wave * 25;
    world.events.push('waveclear');
    setBanner(world, `WAVE ${world.wave} CLEAR  +${100 + world.wave * 25}`, 2.0);
    if (world.wave >= 12) {
      world.state = 'won';
      world.events.push('victory');
    }
  } else if (world.waveState === 'intermission') {
    world.waveTimer -= dt;
    if (world.waveTimer <= 0) beginWave(world, world.wave + 1);
  }

  updateBullets(world, dt);
  updateEnemies(world, dt);
  updateOrbs(world, dt);
}

function updateBackground(world, dt) {
  for (const s of world.stars) {
    s.y += s.z * 9 * dt;
    if (s.y > world.height + 2) { s.y = -2; s.x = world.rng() * world.width; }
  }
  for (const n of world.nebulas) {
    n.x += n.drift * dt;
    if (n.x - n.r > world.width) n.x = -n.r;
  }
}

function updateBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.y < -20 || b.x > world.width + 20 || b.y > world.height + 20) b.dead = true;
  }
  world.bullets = world.bullets.filter((b) => !b.dead);
}

function updateEnemies(world, dt) {
  const p = world.player;
  for (const e of world.enemies) {
    e.age += dt;
    e.angle += e.spin * dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let ax = (dx / dist) * e.speed;
    let ay = (dy / dist) * e.speed;
    if (e.kind === 'weaver') {
      const sway = Math.sin(e.age * 4.2 + e.phase) * 130;
      ax += (-dy / dist) * sway;
      ay += (dx / dist) * sway;
    }
    if (e.kind === 'monolith') {
      e.burstTimer -= dt;
      if (e.burstTimer <= 0 && dist < 560) {
        e.burstTimer = 2.6;
        for (let i = 0; i < 10; i += 1) {
          const a = (i / 10) * TAU + e.phase;
          const shard = spawnEnemy(world, 'mini', { x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60 });
          shard.vx = Math.cos(a) * 170;
          shard.vy = Math.sin(a) * 170;
        }
        world.events.push('burst');
      }
      if (e.y < 130) { ax = 0; ay = 40; }
    }
    // Initial impulse (spawned minis, splitter children) decays into steering.
    e.vx = (e.vx ?? 0) * Math.max(0, 1 - 2.4 * dt) + ax * dt * 3.2;
    e.vy = (e.vy ?? 0) * Math.max(0, 1 - 2.4 * dt) + ay * dt * 3.2;
    const vx = ax + (e.vx ?? 0);
    const vy = ay + (e.vy ?? 0);
    e.x += vx * dt;
    e.y += vy * dt;

    // Bullet hits.
    for (const b of world.bullets) {
      if (b.dead) continue;
      const bx = b.x - e.x;
      const by = b.y - e.y;
      if (bx * bx + by * by <= (e.radius + b.radius) * (e.radius + b.radius)) {
        b.dead = true;
        e.hp -= 1;
        world.events.push('hit');
        burst(world, b.x, b.y, '#e8ecff', 3, 150, 0.3, 2);
        if (e.hp <= 0 && !e.dead) killEnemy(world, e);
      }
    }
    // Touching the player.
    if (!e.dead && world.state === 'playing') {
      const px = p.x - e.x;
      const py = p.y - e.y;
      const rr = e.radius + p.radius - 3;
      if (px * px + py * py <= rr * rr) {
        if (e.kind !== 'monolith') killEnemy(world, e);
        hurtPlayer(world);
      }
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);
  world.bullets = world.bullets.filter((b) => !b.dead);
}

function updateOrbs(world, dt) {
  const p = world.player;
  for (const orb of world.orbs) {
    orb.age += dt;
    orb.life -= dt;
    if (orb.life <= 0) { orb.dead = true; continue; }
    const dx = p.x - orb.x;
    const dy = p.y - orb.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 190) {
      const pull = (1 - dist / 190) * 620;
      orb.vx += (dx / dist) * pull * dt * 4;
      orb.vy += (dy / dist) * pull * dt * 4;
    }
    orb.vx *= Math.max(0, 1 - 2.6 * dt);
    orb.vy *= Math.max(0, 1 - 2.6 * dt);
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    if (dist < p.radius + orb.radius + 4) {
      orb.dead = true;
      world.orbsCollected += 1;
      world.spectrumCharge = Math.min(NOVA.chargeNeeded, world.spectrumCharge + 1);
      world.score += 15;
      world.events.push(`orb:${orb.hue}`);
      burst(world, orb.x, orb.y, SPECTRUM[orb.hue].hex, 6, 120, 0.35, 2.2);
      if (world.spectrumCharge >= NOVA.chargeNeeded) {
        floatingText(world, p.x, p.y - 30, 'NOVA READY — E', '#ffffff');
      }
    }
  }
  world.orbs = world.orbs.filter((o) => !o.dead);
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.age += dt;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - 2.2 * dt);
    p.vy *= Math.max(0, 1 - 2.2 * dt);
    if (p.life <= 0) p.dead = true;
  }
  world.particles = world.particles.filter((p) => !p.dead);
}

function updateTexts(world, dt) {
  for (const t of world.texts) {
    t.age += dt;
    t.life -= dt;
    t.y += t.vy * dt;
    if (t.life <= 0) t.dead = true;
  }
  world.texts = world.texts.filter((t) => !t.dead);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
