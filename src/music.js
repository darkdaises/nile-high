// Background music and ambience, all synthesized live (no recordings):
//  - darbuka playing the maqsum rhythm (dum tak - tak dum - tak -)
//  - an oud-like pluck improvising in maqam Hijaz on D
//  - a soft low drone
//  - ambience that changes with the level: Cairo traffic and horns, desert wind, a temple hum, Nile crickets
// Plus the zaghrouta (celebratory ululation) for reaching a new level.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Hijaz on D: D Eb F# G A Bb C D
const HIJAZ = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78];
//            dum  tak  -   tak  dum  -   tak  -
const MAQSUM = ['D', 'T', '', 'T', 'D', '', 'T', ''];

export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(out);
    this.amb = ctx.createGain(); this.amb.gain.value = 0; this.amb.connect(out);
    // a little room reverb for the oud
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(1.8, 2.4);
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.35; this.verbIn.connect(this.verb); this.verb.connect(this.bus);
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0); let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }   // brown-ish noise
    this.white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const wd = this.white.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    this.zone = -1; this.playing = false; this.step = 0; this.note = 4; this.bpm = 104;
  }

  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }

  start(zone = 0) {
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t); this.bus.gain.setTargetAtTime(0.55, t, 0.6);
    this.amb.gain.cancelScheduledValues(t); this.amb.gain.setTargetAtTime(0.5, t, 0.8);
    this.setZone(zone);
    if (this.playing) return;
    this.playing = true; this.next = t + 0.1; this.step = 0;
    this.timer = setInterval(() => this.tick(), 30);
  }

  // softer while the game-over screen is up
  duck() { const t = this.ctx.currentTime; this.bus.gain.setTargetAtTime(0.18, t, 0.4); this.amb.gain.setTargetAtTime(0.25, t, 0.4); }
  stop() { const t = this.ctx.currentTime; this.bus.gain.setTargetAtTime(0, t, 0.3); this.amb.gain.setTargetAtTime(0, t, 0.3); clearInterval(this.timer); this.playing = false; this.stopAmbience(); }

  // ---------- sequencer: eighth notes ----------
  tick() {
    const c = this.ctx;
    while (this.next < c.currentTime + 0.15) {
      const s = this.step % 8, bar = Math.floor(this.step / 8);
      const hit = MAQSUM[s];
      if (hit === 'D') this.dum(this.next);
      if (hit === 'T') this.tak(this.next, s === 1 ? 0.5 : 0.36);
      if (hit === '' && Math.random() < 0.25) this.tak(this.next, 0.14);   // ghost notes
      if (s === 0 && bar % 4 === 0) this.drone(this.next, (60 / this.bpm) * 16);
      this.melody(this.next, s, bar);
      this.next += 60 / this.bpm / 2;
      this.step++;
    }
  }

  dum(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4);
  }
  tak(t, level) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.white; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 1.4;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(f); f.connect(g); g.connect(this.bus); src.start(t, Math.random()); src.stop(t + 0.09);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.value = 820;
    og.gain.setValueAtTime(level * 0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(og); og.connect(this.bus); o.start(t); o.stop(t + 0.06);
  }
  drone(t, len) {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len);
    for (const n of [38, 50, 57]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = Math.random() * 8 - 4; o.connect(f); o.start(t); o.stop(t + len + 0.05); }
    f.connect(g); g.connect(this.bus);
  }

  // oud-like improvisation: a short motif, then answers it, staying in Hijaz
  melody(t, s, bar) {
    const phrase = bar % 4;
    const play = phrase === 3 ? s % 4 === 0 : [0, 2, 3, 5, 6].includes(s) && Math.random() < 0.72;
    if (!play) return;
    const step = Math.random() < 0.7 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -2 : 2);
    this.note = Math.max(0, Math.min(HIJAZ.length - 1, this.note + step));
    if (phrase === 3 && s === 4) this.note = 0;   // resolve home at the end of each phrase
    const n = HIJAZ[this.note];
    this.oud(t, n, 0.16);
    if (Math.random() < 0.18) this.oud(t + 60 / this.bpm / 4, HIJAZ[Math.max(0, this.note - 1)], 0.1);   // a quick grace note
  }
  oud(t, note, vol) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle';
    o.frequency.setValueAtTime(midi(note) * 0.985, t); o.frequency.exponentialRampToValueAtTime(midi(note), t + 0.03);
    o2.frequency.value = midi(note) * 2; o2.detune.value = 6;
    f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.9);
    const g2 = c.createGain(); g2.gain.value = 0.3;
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.bus); g.connect(this.verbIn);
    o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
  }

  // ---------- ambience per level ----------
  setZone(z) {
    if (z === this.zone) return;
    this.zone = z; this.stopAmbience();
    const c = this.ctx, t = c.currentTime, nodes = this.ambNodes = [];
    const bed = (freq, q, vol, type = 'lowpass') => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 2);
      src.connect(f); f.connect(g); g.connect(this.amb); src.start(t); nodes.push(src); return { f, g };
    };
    if (z === 0) { bed(380, 0.6, 0.22); this.every(3.5, 8, () => this.horn()); }                     // city hum + horns
    if (z === 1 || z === 2) {                                                                        // desert wind
      const w = bed(700, 2.5, 0.16, 'bandpass');
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 420;
      lfo.connect(lg); lg.connect(w.f.frequency); lfo.start(t); nodes.push(lfo);
    }
    if (z === 3) { bed(160, 0.7, 0.2); this.every(5, 9, () => this.bell()); }                       // temple hum + a far bell
    if (z >= 4) { bed(240, 0.5, 0.08); this.every(0.6, 1.6, () => this.cricket()); }                // crickets by the Nile
  }
  every(min, max, fn) {
    const go = () => { fn(); this.ambTimer = setTimeout(go, (min + Math.random() * (max - min)) * 1000); };
    this.ambTimer = setTimeout(go, min * 500);
  }
  stopAmbience() {
    clearTimeout(this.ambTimer);
    const t = this.ctx.currentTime;
    for (const n of this.ambNodes || []) { try { n.stop(t + 0.5); } catch (e) {} }
    this.ambNodes = [];
  }
  horn() {   // a Cairo car horn: one or two quick honks, from near or far
    const c = this.ctx, t = c.currentTime + 0.05, far = Math.random(), base = 380 + Math.random() * 180;
    const honks = Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
    for (let i = 0; i < honks; i++) {
      const st = t + i * 0.22, len = 0.12 + Math.random() * 0.14;
      const f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 1400 - far * 800;
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.09 * (1 - far * 0.7), st + 0.01); g.gain.setValueAtTime(0.09 * (1 - far * 0.7), st + len); g.gain.exponentialRampToValueAtTime(0.0001, st + len + 0.04);
      for (const m of [1, 1.26]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = base * m; o.connect(f); o.start(st); o.stop(st + len + 0.06); }
      f.connect(g); g.connect(this.amb);
    }
  }
  bell() {
    const c = this.ctx, t = c.currentTime + 0.05, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    for (const [r, v] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) { const o = c.createOscillator(); o.frequency.value = 420 * r; const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(g); o.start(t); o.stop(t + 3); }
    g.connect(this.amb); g.connect(this.verbIn);
  }
  cricket() {
    const c = this.ctx, t = c.currentTime + 0.02, f = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator(), g = c.createGain(), st = t + i * 0.05; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.025, st + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.035);
      o.connect(g); g.connect(this.amb); o.start(st); o.stop(st + 0.04);
    }
  }

  // ---------- zaghrouta: the joyful ululation ("lililili") for a new level ----------
  zaghrouta(out) {
    const c = this.ctx, t = c.currentTime + 0.05, dur = 2.1;
    const voice = (detune, pan, vol) => {
      const o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth';
      // an opening "aaa", then the rapid tongue trill gliding up
      o.frequency.setValueAtTime(880, t); o.frequency.linearRampToValueAtTime(1020, t + 0.28);
      o.frequency.linearRampToValueAtTime(1180, t + dur * 0.7); o.frequency.linearRampToValueAtTime(1080, t + dur);
      o.detune.value = detune;
      const trill = c.createOscillator(), tg = c.createGain();
      trill.type = 'square'; trill.frequency.setValueAtTime(11, t); trill.frequency.linearRampToValueAtTime(14, t + dur);
      tg.gain.setValueAtTime(0, t); tg.gain.setValueAtTime(0, t + 0.28); tg.gain.linearRampToValueAtTime(110, t + 0.36);
      trill.connect(tg); tg.connect(o.frequency);
      // the "l" in "lililili": quick dips in loudness in time with the trill
      const am = c.createOscillator(), ag = c.createGain(), base = c.createGain();
      am.frequency.setValueAtTime(11, t); am.frequency.linearRampToValueAtTime(14, t + dur);
      ag.gain.setValueAtTime(0, t); ag.gain.setValueAtTime(0, t + 0.28); ag.gain.linearRampToValueAtTime(0.45, t + 0.36);
      base.gain.value = 0.55; am.connect(ag); ag.connect(base.gain);
      f1.type = 'bandpass'; f1.frequency.value = 1150; f1.Q.value = 5;
      f2.type = 'bandpass'; f2.frequency.value = 2900; f2.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.setValueAtTime(vol, t + dur - 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const mixf = c.createGain(); mixf.gain.value = 1;
      o.connect(base); base.connect(f1); base.connect(f2); f1.connect(mixf); f2.connect(mixf); mixf.connect(g);
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      if (p) { p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out);
      g.connect(this.verbIn);
      for (const n of [o, trill, am]) { n.start(t); n.stop(t + dur + 0.05); }
    };
    voice(0, -0.25, 0.5); voice(18, 0.3, 0.38); voice(-24, 0, 0.3);
  }
}
