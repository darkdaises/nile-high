// Sound: synthesized effects + the Cairo music (see music.js).
// One mute switch covers everything, and it's remembered per device.
import { Music } from './music.js';

// [shown on screen, Gigi's own recording in public/voice] — played in this order, combo after combo
const HYPE = [
  ['Yalla!', 'yalla'],
  ['Oppa!', 'oppa'],
  ['Eshta awi!', 'eshta']
];

export class Sfx {
  constructor() {
    this.ctx = null; this.lastHype = 0;
    try { this.muted = localStorage.getItem('hop-muted') === '1'; } catch (e) { this.muted = false; }
  }

  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
      this.out = this.ctx.createGain(); this.out.gain.value = 0.35; this.out.connect(this.master);
      this.music = new Music(this.ctx, this.master);
      this.loadVoices();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('hop-muted', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  tone(freq, dur, { type = 'sine', vol = 0.5, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }

  jump(power) { this.tone(320 + power * 260, 0.16, { type: 'triangle', vol: 0.35, slide: 1.9 }); }
  land() { this.tone(140, 0.08, { type: 'sine', vol: 0.3, slide: 0.6 }); }
  bounce() { this.tone(520, 0.07, { type: 'square', vol: 0.12, slide: 0.7 }); }
  combo(n) { const f = 520 * Math.pow(1.12246, Math.min(n, 10)); this.tone(f, 0.12, { type: 'triangle', vol: 0.3 }); this.tone(f * 1.5, 0.14, { type: 'sine', vol: 0.18, delay: 0.05 }); }
  // landing a combo: a hype line, recorded by Gigi
  comboEnd() {
    const [text, clip] = HYPE[this.lastHype++ % HYPE.length];
    this.tone(660, 0.1, { type: 'triangle', vol: 0.2 }); this.tone(990, 0.16, { type: 'triangle', vol: 0.16, delay: 0.07 });
    const buf = this.voices && this.voices[clip];
    if (buf) {
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; g.gain.value = 0.9; src.connect(g); g.connect(this.master); src.start(this.ctx.currentTime + 0.05);
    }
    return text;
  }
  loadVoices() {
    this.voices = {};
    const base = import.meta.env.BASE_URL;
    for (const [, clip] of HYPE) {
      fetch(`${base}voice/${clip}.mp3`).then((r) => r.arrayBuffer())
        .then((ab) => new Promise((ok, no) => this.ctx.decodeAudioData(ab, ok, no)))
        .then((b) => { this.voices[clip] = b; }).catch(() => {});
    }
  }
  hurry() { [0, 0.12].forEach((d) => this.tone(880, 0.1, { type: 'square', vol: 0.1, delay: d })); }
  // falling off the roof: slide whistle + thud
  over() { if (this.ctx) this.music.fall(this.master); }

  // a swoosh for flips and twirls
  whoosh(turns = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, dur = 0.25 + turns * 0.12;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.music.white; f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.6); f.frequency.exponentialRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out); src.start(t); src.stop(t + dur + 0.02);
  }

  // new level: takes turns between the zaghrouta and a Saidi mizmar band
  levelUp() {
    if (!this.ctx) return;
    this.levels = (this.levels || 0) + 1;
    if (this.levels % 2) this.music.zaghrouta(this.master); else this.music.mizmar(this.master);
  }

  startMusic(zone) { if (this.ctx) this.music.start(zone); }
  setZone(zone) { if (this.ctx) this.music.setZone(zone); }
  duckMusic() { if (this.ctx) this.music.duck(); }

}
