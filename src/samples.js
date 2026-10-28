// Sounds rendered sample by sample into buffers (once), instead of from plain oscillators.
// That lets them have what makes real instruments and voices sound real: many resonances,
// tiny random irregularities, breath and a room.
//
//  - darbuka: modal synthesis of a metal Egyptian darbuka. The "doum" (center, deep and boomy),
//    "tek" (edge, bright and ringing) and "ka" (the other hand's edge, a bit softer and drier).
//    Several takes of each, so repeats never sound identical.
//  - zaghrouta: a voice built from glottal pulses through vowel formants. The tongue flicks
//    "li-li-li" about 11 times a second, each flick a little irregular, with breath noise.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

// a 2-pole resonator (a formant / a drum mode), updated per sample
class Reso {
  constructor(sr) { this.sr = sr; this.y1 = 0; this.y2 = 0; }
  set(f, bw) {
    const r = Math.exp(-Math.PI * bw / this.sr);
    this.a1 = 2 * r * Math.cos(TAU * f / this.sr); this.a2 = -r * r; this.g = 1 - r;
  }
  run(x) { const y = this.g * x + this.a1 * this.y1 + this.a2 * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
}

function normalize(d, peak) {
  let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m;
}

// ---------- darbuka ----------
// membrane modes of a goblet drum (ratios of the fundamental), plus the ring of the metal body
function drum(ctx, kind) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (kind === 'doum' ? 0.9 : 0.45));
  const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  let modes, click, clickTone;
  if (kind === 'doum') {
    const f = rnd(88, 96);
    modes = [[f, 1, 0.42], [f * 1.59, 0.45, 0.2], [f * 2.14, 0.3, 0.13], [f * 2.3, 0.22, 0.11], [f * 2.65, 0.16, 0.08], [f * 3.16, 0.1, 0.06]];
    click = 0.25; clickTone = 0.08;    // dull palm slap
  } else {
    // tek and ka ring high: the edge stroke leaves the membrane's upper modes and the shell singing
    const f = kind === 'tek' ? rnd(560, 600) : rnd(520, 560);
    const ring = kind === 'tek' ? 1 : 0.65;
    modes = [[f, 0.7, 0.07 * ring], [f * 1.59, 0.9, 0.09 * ring], [f * 2.14, 0.75, 0.1 * ring], [f * 2.65, 0.55, 0.12 * ring],
      [f * 3.16, 0.45, 0.13 * ring], [f * 3.5, 0.35, 0.1 * ring], [f * 4.06, 0.3, 0.16 * ring], [rnd(3450, 3550), 0.22 * ring, 0.22 * ring]];
    click = kind === 'tek' ? 0.9 : 0.6; clickTone = 0.7;
  }
  const ph = modes.map(() => Math.random() * TAU);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    // the membrane is tighter right after the hit, so pitch settles down a little
    const bend = 1 + (kind === 'doum' ? 0.1 : 0.03) * Math.exp(-t / 0.03);
    for (let m = 0; m < modes.length; m++) {
      const [f, a, dec] = modes[m];
      s += a * Math.exp(-t / dec) * Math.sin(ph[m] + TAU * f * bend * t);
    }
    // the hand hitting: a short noise burst
    const n = Math.random() * 2 - 1; lp += (n - lp) * clickTone;
    s += click * lp * Math.exp(-t / 0.004);
    const att = Math.min(1, t / 0.0008) * Math.min(1, (len - i) / (sr * 0.08));   // no click at the end
    d[i] = s * att;
  }
  normalize(d, 0.9);
  return buf;
}

export function makeDarbuka(ctx) {
  const kit = { doum: [], tek: [], ka: [] };
  for (let i = 0; i < 3; i++) for (const k of Object.keys(kit)) kit[k].push(drum(ctx, k));
  return kit;
}

// ---------- zaghrouta ----------
// One woman's voice. f0: pitch, rate: tongue flicks per second, dur: length of the trill.
function zVoice(d, sr, start, f0, rate, dur, vol) {
  const F = [new Reso(sr), new Reso(sr), new Reso(sr), new Reso(sr)];
  const open = 0.38;                       // the held opening "aaai" before the tongue starts
  const total = open + dur + 0.25;         // and a little rising "iii!" at the end
  const n = Math.floor(total * sr), s0 = Math.floor(start * sr);
  let phase = 0, drift = 0, tPh = 0, tRate = rate, breath = 0, hpX = 0, hpY = 0;
  for (let i = 0; i < n && s0 + i < d.length; i++) {
    const t = i / sr;
    // pitch: slides up into the call, wanders a little (jitter + slow drift), lifts at the very end
    drift += (Math.random() * 2 - 1) * 0.0006; drift *= 0.9995;
    let p = f0 * (t < open ? 0.82 + 0.18 * Math.sin((t / open) * Math.PI / 2) : 1) * (1 + drift);
    if (t > open + dur) p *= 1 + 0.07 * Math.min(1, (t - open - dur) / 0.12);
    // the tongue: a flick cycle; each cycle gets a slightly different length, like a real tongue
    let closed = 0;
    if (t > open && t < open + dur) {
      tPh += tRate / sr;
      if (tPh >= 1) { tPh -= 1; tRate = rate * rnd(0.9, 1.1); }
      // the "l": a quick closure in each cycle (about a third of it), softened at the edges
      const x = tPh < 0.32 ? Math.sin((tPh / 0.32) * Math.PI) : 0;
      closed = x * x;
      const ramp = Math.min(1, (t - open) / 0.15);
      closed *= ramp;
    }
    p *= 1 - 0.035 * closed;             // pitch dips a hair on each "l"
    // glottal source: a pulse train shaped like real vocal folds (open slowly, snap shut)
    phase += p / sr; if (phase >= 1) phase -= 1;
    const g = phase < 0.6 ? 0.5 - 0.5 * Math.cos(Math.PI * phase / 0.6) : Math.cos((Math.PI / 2) * (phase - 0.6) / 0.4);
    let src = g - 0.42;                  // remove the DC
    breath += ((Math.random() * 2 - 1) - breath) * 0.5;
    src += breath * 0.12;
    // vowel: open "a" at the start, then the tongue moves between "i" (open) and "l" (closed)
    const a = t < open ? 1 - t / open : 0;
    const f1 = 700 * a + 420 * (1 - a) - 120 * closed;
    const f2 = 1300 * a + 2500 * (1 - a) - 900 * closed;
    F[0].set(f1, 90); F[1].set(f2, 120); F[2].set(3200, 180); F[3].set(4200, 260);
    const y = F[0].run(src) * 1.0 + F[1].run(src) * 0.9 + F[2].run(src) * 0.45 + F[3].run(src) * 0.25;
    // loudness: swell in, dip on each "l", fade out
    let env = Math.min(1, t / 0.05) * Math.min(1, (total - t) / 0.12);
    env *= 1 - 0.8 * closed;
    // high-pass (DC blocker) so only the voice is left
    const o = y - hpX + 0.995 * hpY; hpX = y; hpY = o;
    d[s0 + i] += o * env * vol;
  }
}

export function makeZaghrouta(ctx) {
  const sr = ctx.sampleRate, len = Math.floor(sr * 3.8);
  const buf = ctx.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const tmp = new Float32Array(len);
  // a few women joining in, each with her own pitch, speed and place in the room
  const voices = [
    [0.0, 1010, 11.2, 2.7, 1.0, 0],      // the lead
    [0.3, 940, 10.3, 2.4, 0.38, 0.55],
    [0.5, 1090, 12.2, 2.1, 0.28, -0.55]
  ];
  for (const [st, f0, rate, dur, vol, pan] of voices) {
    tmp.fill(0);
    zVoice(tmp, sr, st, f0 * rnd(0.98, 1.02), rate, dur, vol);
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < len; i++) { L[i] += tmp[i] * l; R[i] += tmp[i] * r; }
  }
  let m = 0; for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  for (let i = 0; i < len; i++) { L[i] *= 0.9 / m; R[i] *= 0.9 / m; }
  return buf;
}
