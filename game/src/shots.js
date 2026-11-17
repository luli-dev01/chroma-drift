// Deterministic staged scenes for the maker's screenshots.
// Opening the game with ?shot=start|play|boss|end&seed=N freezes a composed
// scene instead of starting the live loop, so a screenshot is a real render
// of the game's own code — never an edited or borrowed image — and the same
// URL always renders the same frame.

import { SPECTRUM } from './config.js';
import { createWorld } from './world.js';

function place(world, kind, x, y, hp) {
  const specs = { drifter: 15, weaver: 12, splitter: 19, mini: 8, monolith: 54 };
  const e = {
    id: 900 + world.enemies.length, kind, x, y, vx: 0, vy: 0,
    angle: x * 0.01 + y * 0.013, spin: 0.4, hp: hp ?? 1, maxHp: hp ?? 1,
    radius: specs[kind], age: 1.3, dead: false, speed: 0, phase: x * 0.05,
  };
  world.enemies.push(e);
  return e;
}

function orb(world, x, y, hue) {
  world.orbs.push({
    id: 700 + world.orbs.length, kind: 'orb', x, y, vx: 0, vy: 0, angle: 0,
    spin: 0, hp: 1, maxHp: 1, radius: 9, age: 0.6, dead: false, hue, life: 8,
  });
}

function bullet(world, x, y, angle) {
  world.bullets.push({
    id: world.bullets.length + 1, kind: 'bullet', x, y,
    vx: Math.cos(angle) * 700, vy: Math.sin(angle) * 700, angle,
    radius: 4, age: 0, dead: false, life: 0.8,
  });
}

function stagePlay(world) {
  const { width: w, height: h } = world;
  const p = world.player;
  p.x = w * 0.40; p.y = h * 0.58; p.angle = -0.5;
  p.trail = Array.from({ length: 12 }, (_, i) => ({ x: p.x - 14 - i * 9, y: p.y + 16 + i * 6, age: i * 0.03 }));
  place(world, 'drifter', w * 0.66, h * 0.30);
  place(world, 'drifter', w * 0.78, h * 0.52, 1);
  place(world, 'weaver', w * 0.58, h * 0.18);
  place(world, 'weaver', w * 0.86, h * 0.24);
  place(world, 'splitter', w * 0.72, h * 0.72, 1);
  place(world, 'splitter', w * 0.24, h * 0.26, 2);
  place(world, 'mini', w * 0.55, h * 0.82);
  place(world, 'mini', w * 0.16, h * 0.66);
  place(world, 'drifter', w * 0.30, h * 0.86);
  for (let i = 0; i < 7; i += 1) bullet(world, p.x + 40 + i * 34, p.y - 22 - i * 15, -0.5);
  orb(world, w * 0.52, h * 0.40, 2);
  orb(world, w * 0.63, h * 0.62, 4);
  orb(world, w * 0.34, h * 0.36, 0);
  orb(world, w * 0.82, h * 0.80, 3);
  world.score = 12840;
  world.combo = 11;
  world.wave = 4;
  world.spectrumCharge = 5;
  world.texts.push({ id: 1, kind: 'text', x: w * 0.66, y: h * 0.26, vx: 0, vy: 0, angle: 0, spin: 0, hp: 1, maxHp: 1, radius: 1, age: 0.2, dead: false, text: '+280', color: SPECTRUM[2].hex, life: 0.8, maxLife: 0.9 });
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2;
    world.particles.push({
      id: 500 + i, kind: 'particle', x: w * 0.72 + Math.cos(a) * (18 + i * 1.7), y: h * 0.72 + Math.sin(a) * (18 + i * 1.7),
      vx: 0, vy: 0, angle: 0, spin: 0, hp: 1, maxHp: 1, radius: 1, age: 0, dead: false,
      color: i % 3 ? '#cfd4e6' : SPECTRUM[i % SPECTRUM.length].hex, life: 0.5, maxLife: 0.6, size: 2.6,
    });
  }
}

function stageBoss(world) {
  const { width: w, height: h } = world;
  const p = world.player;
  p.x = w * 0.30; p.y = h * 0.70; p.angle = -0.9;
  p.trail = Array.from({ length: 12 }, (_, i) => ({ x: p.x - 10 - i * 8, y: p.y + 18 + i * 5, age: i * 0.03 }));
  const boss = place(world, 'monolith', w * 0.62, h * 0.34, 42);
  boss.hp = 26;
  place(world, 'mini', w * 0.52, h * 0.20);
  place(world, 'mini', w * 0.74, h * 0.52);
  place(world, 'mini', w * 0.46, h * 0.48);
  place(world, 'drifter', w * 0.84, h * 0.18);
  for (let i = 0; i < 6; i += 1) bullet(world, p.x + 34 + i * 36, p.y - 30 - i * 24, -0.9);
  orb(world, w * 0.44, h * 0.56, 5);
  orb(world, w * 0.70, h * 0.66, 1);
  world.score = 34210;
  world.combo = 7;
  world.wave = 5;
  world.spectrumCharge = 6;
  world.banner = 'WAVE 5 — THE MONOLITH';
  world.bannerTimer = 3;
}

export function stageShot(world, name) {
  world.state = name === 'start' ? 'title' : 'playing';
  world.time = 2.4;
  if (name === 'play') stagePlay(world);
  if (name === 'boss') stageBoss(world);
  if (name === 'end') {
    stagePlay(world);
    world.state = 'over';
    world.player.hp = 0;
    world.score = 23150;
    world.wave = 6;
    world.kills = 148;
    world.bestCombo = 17;
  }
  return world;
}

export function readShotRequest() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  return { name: shot, seed: Number(params.get('seed') ?? 1) || 1 };
}
