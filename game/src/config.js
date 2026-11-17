// Chroma Drift — tuning constants and the spectrum palette.
// Everything the game balances on lives here so a wave, a weapon or a colour
// can be retuned in one place without touching the simulation.

export const TAU = Math.PI * 2;

// The six spectrum colours the player restores, in order. Enemies are grey
// until they break; everything they drop carries one of these hues.
export const SPECTRUM = [
  { name: 'red',    hex: '#ff4d6d' },
  { name: 'orange', hex: '#ff9f43' },
  { name: 'yellow', hex: '#ffd93d' },
  { name: 'green',  hex: '#6bf178' },
  { name: 'blue',   hex: '#4dc9ff' },
  { name: 'violet', hex: '#b388ff' },
];

export const PLAYER = {
  radius: 13,
  accel: 2400,
  maxSpeed: 335,
  friction: 5.2,
  fireRate: 7.5,          // shots per second while firing
  bulletSpeed: 760,
  bulletLife: 0.85,
  bulletRadius: 4,
  lives: 3,
  respawnShield: 2.0,     // seconds of invulnerability after a hit
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.6,
};

export const NOVA = {
  chargeNeeded: 6,        // orbs that fill the spectrum meter
  radius: 265,
  damage: 3,
};

export const WAVES = {
  firstCount: 5,
  countGrowth: 3,
  hpGrowthEvery: 3,       // every Nth wave, drifters gain a hit point
  spawnGap: 0.55,         // seconds between spawns inside a wave
  intermission: 2.6,      // calm seconds between waves
  bossEvery: 5,           // every Nth wave is a Monolith boss wave
};

export const ENEMY = {
  drifter: { radius: 15, speed: 74,  hp: 1, score: 40,  orbChance: 0.55 },
  weaver:  { radius: 12, speed: 118, hp: 1, score: 70,  orbChance: 0.65 },
  splitter:{ radius: 19, speed: 58,  hp: 2, score: 90,  orbChance: 0.8 },
  mini:    { radius: 8,  speed: 148, hp: 1, score: 25,  orbChance: 0.3 },
  monolith:{ radius: 54, speed: 26,  hp: 42, score: 1500, orbChance: 1.0 },
};

export const COMBO = {
  window: 2.2,            // seconds to chain a kill before the combo resets
  maxMultiplier: 8,
};

export const WORLD = {
  starCount: 150,
  nebulaCount: 7,
};
