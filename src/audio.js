// audio.js — Lightweight Web Audio SFX manager for Realm Weave

const MUTE_KEY = 'realmWeaveMuted';

export function createAudioManager() {
  let ctx = null;
  let muted = loadMuted();

  function loadMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function saveMuted() {
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // ignore persistence failures
    }
  }

  function ensureContext() {
    if (ctx) return ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    return ctx;
  }

  function unlock() {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function scheduleTone(audioCtx, at, freq, duration, volume, type = 'sine') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  function play(name) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (name === 'place') {
      scheduleTone(audioCtx, now, 280, 0.08, 0.05, 'triangle');
    } else if (name === 'merge') {
      scheduleTone(audioCtx, now, 360, 0.09, 0.07, 'triangle');
      scheduleTone(audioCtx, now + 0.07, 520, 0.11, 0.06, 'triangle');
    } else if (name === 'combo') {
      scheduleTone(audioCtx, now, 420, 0.08, 0.07, 'square');
      scheduleTone(audioCtx, now + 0.06, 560, 0.09, 0.06, 'square');
      scheduleTone(audioCtx, now + 0.12, 700, 0.1, 0.05, 'square');
    } else if (name === 'hazard') {
      scheduleTone(audioCtx, now, 160, 0.16, 0.08, 'sawtooth');
    } else if (name === 'earthquake') {
      scheduleTone(audioCtx, now, 110, 0.22, 0.1, 'sawtooth');
      scheduleTone(audioCtx, now + 0.09, 85, 0.28, 0.08, 'sawtooth');
    } else if (name === 'cursed') {
      scheduleTone(audioCtx, now, 290, 0.12, 0.06, 'triangle');
      scheduleTone(audioCtx, now + 0.07, 230, 0.14, 0.06, 'triangle');
    } else if (name === 'wallHit') {
      scheduleTone(audioCtx, now, 190, 0.07, 0.055, 'square');
    } else if (name === 'wallBreak') {
      scheduleTone(audioCtx, now, 170, 0.08, 0.06, 'square');
      scheduleTone(audioCtx, now + 0.05, 130, 0.12, 0.06, 'square');
    } else if (name === 'stageClear') {
      scheduleTone(audioCtx, now, 440, 0.12, 0.07, 'triangle');
      scheduleTone(audioCtx, now + 0.11, 660, 0.14, 0.07, 'triangle');
      scheduleTone(audioCtx, now + 0.24, 880, 0.18, 0.06, 'triangle');
    } else if (name === 'gameOver') {
      scheduleTone(audioCtx, now, 220, 0.12, 0.06, 'sawtooth');
      scheduleTone(audioCtx, now + 0.12, 180, 0.16, 0.06, 'sawtooth');
      scheduleTone(audioCtx, now + 0.26, 140, 0.22, 0.05, 'sawtooth');
    } else if (name === 'upgrade') {
      scheduleTone(audioCtx, now, 540, 0.09, 0.07, 'triangle');
      scheduleTone(audioCtx, now + 0.06, 720, 0.1, 0.06, 'triangle');
    } else if (name === 'stagnation') {
      scheduleTone(audioCtx, now, 150, 0.18, 0.09, 'sawtooth');
      scheduleTone(audioCtx, now + 0.08, 130, 0.22, 0.07, 'sawtooth');
    } else if (name === 'decay') {
      scheduleTone(audioCtx, now, 210, 0.12, 0.06, 'triangle');
      scheduleTone(audioCtx, now + 0.04, 180, 0.15, 0.05, 'triangle');
      scheduleTone(audioCtx, now + 0.09, 150, 0.18, 0.04, 'triangle');
    } else if (name === 'freeze') {
      scheduleTone(audioCtx, now, 800, 0.08, 0.04, 'sine');
      scheduleTone(audioCtx, now + 0.02, 1200, 0.06, 0.03, 'sine');
      scheduleTone(audioCtx, now + 0.04, 1600, 0.08, 0.02, 'sine');
    } else if (name === 'discard') {
      scheduleTone(audioCtx, now, 440, 0.06, 0.04, 'triangle');
      scheduleTone(audioCtx, now + 0.03, 330, 0.08, 0.03, 'triangle');
    } else if (name === 'bleed') {
      scheduleTone(audioCtx, now, 180, 0.04, 0.02, 'sine');
      scheduleTone(audioCtx, now + 0.02, 160, 0.04, 0.015, 'sine');
    } else {
      scheduleTone(audioCtx, now, 320, 0.06, 0.045, 'triangle');
    }
  }

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = !!value;
    saveMuted();
  }

  function toggleMute() {
    muted = !muted;
    saveMuted();
    return muted;
  }

  return {
    unlock,
    play,
    isMuted,
    setMuted,
    toggleMute,
  };
}
