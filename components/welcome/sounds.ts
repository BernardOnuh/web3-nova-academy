// components/welcome/sounds.ts — tiny sound effects synthesised with Web Audio.
// No audio files are downloaded, so this costs students 0 KB of data.
"use client";

const MUTE_KEY = 'w3n-sound-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  // browsers start audio suspended until a user gesture; every call comes from one
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable — mute just won't persist */
  }
}

/** one enveloped oscillator note */
function note(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; glideTo?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur);
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** filtered noise burst (whooshes, cymbals) */
function noise(start: number, dur: number, opts: { from: number; to: number; gain?: number; type?: BiquadFilterType }) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const len = Math.ceil(a.ctx.sampleRate * dur);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(opts.from, t);
  filter.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.25, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(a.out);
  src.start(t);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G4 = 392, A4 = 440;

export const sfx = {
  /** slide change */
  whoosh() {
    if (isMuted()) return;
    noise(0, 0.32, { from: 400, to: 3200, gain: 0.18 });
  },
  /** tap / select */
  pop() {
    if (isMuted()) return;
    note(880, 0, 0.09, { type: 'sine', gain: 0.25, glideTo: 1320 });
  },
  /** big number lands ("7 DAYS", rank reveal) */
  boom() {
    if (isMuted()) return;
    note(140, 0, 0.45, { type: 'sine', gain: 0.6, glideTo: 45 });
    noise(0, 0.25, { from: 1800, to: 300, gain: 0.12, type: 'lowpass' });
  },
  /** points reveal — rising fanfare + sparkle */
  win() {
    if (isMuted()) return;
    [C5, E5, G5, C6].forEach((f, i) => note(f, i * 0.11, 0.35, { gain: 0.28 }));
    [C6, E6, G5 * 2].forEach((f, i) => note(f, 0.5 + i * 0.07, 0.9, { type: 'sine', gain: 0.16 }));
    note(C5 / 2, 0.44, 1.1, { type: 'triangle', gain: 0.3 });
    noise(0.44, 1.2, { from: 6000, to: 9000, gain: 0.07, type: 'highpass' });
  },
  /** coin tick while points count up */
  tick() {
    if (isMuted()) return;
    note(1760 + Math.random() * 220, 0, 0.05, { type: 'square', gain: 0.05 });
  },
  /** motivational rise — Learn / Build / Earn beats, welcome */
  rise(step = 0) {
    if (isMuted()) return;
    const roots = [G4, A4, C5];
    const r = roots[step % roots.length];
    note(r, 0, 0.5, { gain: 0.26 });
    note(r * 1.5, 0.06, 0.5, { type: 'sine', gain: 0.18 });
    note(r * 2, 0.12, 0.6, { type: 'sine', gain: 0.14 });
  },
  /** final "see you tomorrow" chord */
  chime() {
    if (isMuted()) return;
    [C5, E5, G5].forEach(f => note(f, 0, 1.6, { type: 'sine', gain: 0.18 }));
    note(C6, 0.25, 1.4, { type: 'sine', gain: 0.12 });
  },
};

/* ── motivational voice ─────────────────────────────────────────
   Uses the device's built-in text-to-speech (speechSynthesis), so it also costs 0 KB of data.
   Voice quality depends on the phone/computer; we pick the best English voice available. */

const PREFERRED_VOICES = [
  /Google UK English Male/i, /Google US English/i, /Daniel/i, /Alex/i, /Samantha/i, /Microsoft (Guy|Ryan|Aria|Jenny)/i, /en-(GB|US|NG)/i,
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'));
  for (const re of PREFERRED_VOICES) {
    const v = voices.find(x => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return voices[0] ?? null;
}

export const voice = {
  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  /** speak `text` (cancels anything still talking) */
  say(text: string, opts: { rate?: number; pitch?: number } = {}) {
    if (!voice.supported() || isMuted()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-GB';
    u.rate = opts.rate ?? 1.02;
    u.pitch = opts.pitch ?? 1;
    u.volume = 1;
    u.onstart = () => anthem.duck(true);
    u.onend = () => anthem.duck(false);
    u.onerror = () => anthem.duck(false);
    synth.speak(u);
  },
  stop() {
    if (voice.supported()) window.speechSynthesis.cancel();
    anthem.duck(false);
  },
};

/* ── welcome anthem ─────────────────────────────────────────────
   A short looping clip (~300–470 KB), only fetched once the student's anthem is known. */

const ANTHEM_VOLUME = 0.42;
const DUCKED_VOLUME = 0.1;
let anthemEl: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function fadeTo(target: number, ms = 400, then?: () => void) {
  const el = anthemEl;
  if (!el) return;
  if (fadeTimer) clearInterval(fadeTimer);
  const steps = 12;
  const delta = (target - el.volume) / steps;
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    el.volume = Math.min(1, Math.max(0, i >= steps ? target : el.volume + delta));
    if (i >= steps) {
      clearInterval(fadeTimer!);
      fadeTimer = null;
      then?.();
    }
  }, ms / steps);
}

export const anthem = {
  /** start (or switch to) a looping clip; must be called from a user gesture the first time */
  play(src: string) {
    if (typeof window === 'undefined' || isMuted()) return;
    if (!anthemEl || !anthemEl.src.endsWith(src)) {
      anthemEl?.pause();
      anthemEl = new Audio(src);
      anthemEl.loop = true; // repeat until they finish the story
      anthemEl.preload = 'auto';
      anthemEl.volume = 0;
    }
    void anthemEl.play().then(() => fadeTo(ANTHEM_VOLUME, 900)).catch(() => {});
  },
  playing() {
    return !!anthemEl && !anthemEl.paused;
  },
  duck(on: boolean) {
    if (anthemEl && !anthemEl.paused) fadeTo(on ? DUCKED_VOLUME : ANTHEM_VOLUME, 300);
  },
  pause() {
    fadeTo(0, 300, () => anthemEl?.pause());
  },
  stop() {
    const el = anthemEl;
    if (!el) return;
    fadeTo(0, 600, () => {
      el.pause();
      el.currentTime = 0;
    });
  },
};

// voices load asynchronously on some browsers — warm the list up
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}
