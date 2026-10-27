// Sound: synthesized effects + the Cairo music (see music.js) + an Arabic voice line when you fall.
// One mute switch covers everything, and it's remembered per device.
import { Music } from './music.js';

// What gets said (and shown) when you fall off the roof, in Egyptian Arabic
export const LOSE_LINES = [
  { ar: 'يا خسارة!', tr: 'Ya khsara!', en: 'What a shame!' },
  { ar: 'معلش!', tr: "Ma'lesh!", en: 'Never mind!' },
  { ar: 'يا نهار أبيض!', tr: 'Ya nahar abyad!', en: 'Oh my goodness!' },
  { ar: 'ولا يهمك، تاني!', tr: 'Wala yhemmak, tani!', en: 'No worries, again!' }
];

export class Sfx {
  constructor() {
    this.ctx = null;
    try { this.muted = localStorage.getItem('hop-muted') === '1'; } catch (e) { this.muted = false; }
    this.voice = null;
    const pickVoice = () => {
      try {
        const vs = speechSynthesis.getVoices();
        this.voice = vs.find((v) => /^ar[-_]EG/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null;
      } catch (e) {}
    };
    if (typeof speechSynthesis !== 'undefined') { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
  }

  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
      this.out = this.ctx.createGain(); this.out.gain.value = 0.35; this.out.connect(this.master);
      this.music = new Music(this.ctx, this.master);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    // iPhone only lets the page speak later if it has spoken once during a tap
    try { if (typeof speechSynthesis !== 'undefined' && !this.spoke) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this.spoke = true; } } catch (e) {}
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('hop-muted', m ? '1' : '0'); } catch (e) {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    if (m) try { speechSynthesis.cancel(); } catch (e) {}
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
  comboEnd() { [0, 0.07, 0.14].forEach((d, i) => this.tone(660 * [1, 1.26, 1.5][i], 0.18, { type: 'triangle', vol: 0.25, delay: d })); }
  hurry() { [0, 0.12].forEach((d) => this.tone(880, 0.1, { type: 'square', vol: 0.1, delay: d })); }
  over() { this.tone(420, 0.6, { type: 'triangle', vol: 0.35, slide: 0.35 }); }

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

  // new level: the zaghrouta
  levelUp() { if (this.ctx) this.music.zaghrouta(this.master); }

  startMusic(zone) { if (this.ctx) this.music.start(zone); }
  setZone(zone) { if (this.ctx) this.music.setZone(zone); }
  duckMusic() { if (this.ctx) this.music.duck(); }

  // say the line out loud in Arabic when the device has an Arabic voice (it's always shown on screen too)
  say(line) {
    if (this.muted || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(line.ar);
      u.lang = this.voice?.lang || 'ar-EG'; if (this.voice) u.voice = this.voice;
      u.rate = 0.95; u.pitch = 1.1;
      if (this.voice || /ar/i.test(navigator.language)) speechSynthesis.speak(u);
    } catch (e) {}
  }
}
