// Chroma Drift — boot and the frame loop. Wires input, world, renderer and
// audio together, translates the world's sound-cue events into effects, and
// owns the state transitions a key press can cause (launch, pause, restart).

import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { readShotRequest, stageShot } from './shots.js';
import { createWorld, startGame, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const controls = createInput(canvas);
const audio = createAudio();

const shot = readShotRequest();
let world = createWorld(renderer.size().width, renderer.size().height, shot ? shot.seed * 7919 : undefined);
if (shot) stageShot(world, shot.name);

let lastStatus = '';
function announce(text) {
  if (text !== lastStatus) {
    lastStatus = text;
    if (status) status.textContent = text;
  }
}

function playEvents() {
  for (const event of world.events) {
    if (event === 'shoot') audio.shoot();
    else if (event === 'hit') audio.enemyHit();
    else if (event === 'break') audio.enemyBreak();
    else if (event === 'dash') audio.dash();
    else if (event === 'hurt') audio.hurt();
    else if (event === 'nova') audio.nova();
    else if (event === 'waveclear') audio.waveClear();
    else if (event === 'over') audio.gameOver();
    else if (event === 'victory') audio.victory();
    else if (event.startsWith('orb:')) audio.orb(Number(event.slice(4)));
  }
}

let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // Clamp both ways: a negative step (rAF timestamps can precede the
  // performance.now() captured at boot) would poison world.time.
  let dt = Math.max(0, Math.min(0.033, (now - previous) / 1000));
  previous = now;
  if (shot) dt = 0; // staged scenes hold still for the camera

  const input = controls.input;
  const size = renderer.size();
  if (world.width !== size.width || world.height !== size.height) {
    world.width = size.width;
    world.height = size.height;
  }

  // State transitions driven by single presses.
  if (world.state === 'title' && (controls.wasPressed('Enter') || controls.wasPressed('Mouse'))) {
    audio.unlock();
    startGame(world);
  } else if ((world.state === 'over' || world.state === 'won')
      && (controls.wasPressed('KeyR') || controls.wasPressed('Enter') || controls.wasPressed('Mouse'))) {
    audio.unlock();
    startGame(world);
  } else if (world.state === 'paused' && controls.wasPressed('KeyR')) {
    startGame(world);
  }
  if (controls.wasPressed('KeyM')) {
    announce(audio.toggleMute() ? 'Sound muted' : 'Sound on');
  }

  const wasPaused = world.state === 'paused';
  updateWorld(world, dt, {
    move: controls.moveVector(),
    aimX: input.mouseX,
    aimY: input.mouseY,
    firing: controls.firing(),
    dashPressed: controls.wasPressed('ShiftLeft') || controls.wasPressed('ShiftRight'),
    novaPressed: controls.wasPressed('KeyE'),
    pausePressed: controls.wasPressed('KeyP') || controls.wasPressed('Escape'),
  });
  // Only a press that arrives while already paused resumes, so the same
  // press that paused the game does not instantly unpause it.
  if (wasPaused && (controls.wasPressed('KeyP') || controls.wasPressed('Escape'))) {
    world.state = 'playing';
  }
  playEvents();
  renderer.draw(world);

  if (world.state === 'playing') {
    announce(`Wave ${world.wave}. Score ${world.score}. ${world.player.hp} lives left.`);
  } else if (world.state === 'over') {
    announce(`Game over. Score ${world.score}. Press R to play again.`);
  } else if (world.state === 'won') {
    announce(`You restored the spectrum. Score ${world.score}. Press R to play again.`);
  } else if (world.state === 'title') {
    announce('Chroma Drift. Click or press Enter to launch.');
  }
  controls.endFrame();
}
requestAnimationFrame(frame);
