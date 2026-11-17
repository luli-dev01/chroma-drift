// Procedural sound effects with the Web Audio API — no audio files.
// Every effect is a short oscillator or noise burst shaped by an envelope,
// so the game stays a folder of static text files and still has a voice.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      context = new AudioCtor();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone({ freq = 440, slide = 0, type = 'square', dur = 0.12, vol = 0.16, delay = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + dur);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise({ dur = 0.25, vol = 0.2, delay = 0, low = 400, high = 2400 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(high, start);
    filter.frequency.exponentialRampToValueAtTime(low, start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    shoot() { tone({ freq: 880, slide: -520, type: 'square', dur: 0.07, vol: 0.05 }); },
    enemyHit() { tone({ freq: 300, slide: -120, type: 'triangle', dur: 0.05, vol: 0.06 }); },
    enemyBreak(hueIndex = 0) {
      const base = 340 + hueIndex * 70;
      tone({ freq: base, slide: 260, type: 'triangle', dur: 0.16, vol: 0.12 });
      noise({ dur: 0.18, vol: 0.1 });
    },
    orb(hueIndex = 0) {
      const base = 620 + hueIndex * 90;
      tone({ freq: base, type: 'sine', dur: 0.09, vol: 0.1 });
      tone({ freq: base * 1.5, type: 'sine', dur: 0.12, vol: 0.08, delay: 0.05 });
    },
    dash() { noise({ dur: 0.14, vol: 0.07, low: 900, high: 300 }); },
    hurt() {
      tone({ freq: 160, slide: -90, type: 'sawtooth', dur: 0.28, vol: 0.18 });
      noise({ dur: 0.3, vol: 0.16 });
    },
    nova() {
      tone({ freq: 180, slide: 900, type: 'sawtooth', dur: 0.45, vol: 0.14 });
      noise({ dur: 0.5, vol: 0.14, low: 200, high: 3200 });
      [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, type: 'sine', dur: 0.3, vol: 0.07, delay: 0.05 * i }));
    },
    waveClear() {
      [440, 554, 659, 880].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.16, vol: 0.09, delay: 0.07 * i }));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.3, vol: 0.11, delay: 0.16 * i }));
    },
    victory() {
      [523, 659, 784, 1046, 1318].forEach((freq, i) => tone({ freq, type: 'triangle', dur: 0.24, vol: 0.1, delay: 0.09 * i }));
    },
  };
}
