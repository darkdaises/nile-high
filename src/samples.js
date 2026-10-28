// Sounds rendered sample by sample into buffers (once), instead of from plain oscillators.
// That lets them have what makes real instruments and voices sound real: many resonances,
// tiny random irregularities, breath and a room.
//
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

// ---------- mizmar band (Saidi, Upper Egypt) ----------
// Two mizmars (loud, nasal double reeds): one plays a riff in maqam Rast (with its quarter tones),
// the other holds the drone. Under them the tabl baladi: a big bass drum (DUM) and a thin stick (tak)
// playing the Saidi rhythm  DUM tak . DUM DUM . tak .
const RAST = { D: 0, E: 2, F: 3.5, G: 5, A: 7, B: 8.5, C: 10, d: 12, e: 14 };   // F and B are half-flat

function reed(d, sr, notes, base, vol, opts = {}) {
  const res = [new Reso(sr), new Reso(sr), new Reso(sr)];
  res[0].set(1150, 260); res[1].set(2700, 380); res[2].set(4200, 600);
  const end = notes[notes.length - 1][0] + notes[notes.length - 1][2];
  const n = Math.min(d.length, Math.floor((end + 0.1) * sr));
  let ph = 0, cur = notes[0][1], ni = 0, drift = 0, hp = 0, hpY = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    while (ni < notes.length - 1 && t >= notes[ni + 1][0]) ni++;
    const [nt, semis, nd] = notes[ni];
    cur += (semis - cur) * 0.006;                       // players slide between notes
    drift += (Math.random() * 2 - 1) * 0.0004; drift *= 0.999;
    const vib = Math.sin(TAU * 5.8 * t) * 0.12 * Math.min(1, Math.max(0, (t - nt - 0.08) / 0.15));   // vibrato on held notes
    const f = base * Math.pow(2, (cur + vib) / 12) * (1 + drift);
    ph += f / sr; if (ph > 1) ph -= 1;
    // bright, buzzy reed tone: many harmonics, odd ones a bit stronger
    let x = 0;
    const maxK = Math.min(16, Math.floor(9000 / f));
    for (let k = 1; k <= maxK; k++) x += Math.sin(TAU * k * ph) * (k % 2 ? 1 : 0.7) / Math.pow(k, 0.75);
    x += (Math.random() * 2 - 1) * 0.08;               // breath
    // tongue articulation: a quick dip at the start of each note
    const since = t - nt, left = nt + nd - t;
    let env = opts.drone ? Math.min(1, Math.pow(t / (opts.fadeIn || 0.06), 2)) : (since < 0 ? 0 : 0.55 + 0.45 * Math.min(1, since / 0.03));
    if (!opts.drone && left < 0.02 && ni < notes.length - 1 && notes[ni + 1][1] === semis) env *= left / 0.02;
    env *= Math.min(1, t / 0.06) * Math.min(1, (end - t) / 0.15 + 0);
    const y = x * 0.35 + res[0].run(x) * 2.4 + res[1].run(x) * 2.0 + res[2].run(x) * 0.8;
    const o = y - hp + 0.995 * hpY; hp = y; hpY = o;
    d[i] += o * env * vol;
  }
}

function tabl(d, sr, t0, kind, vol) {
  const s0 = Math.floor(t0 * sr), len = Math.floor(sr * (kind === 'D' ? 0.5 : 0.08));
  let lp = 0;
  for (let i = 0; i < len && s0 + i < d.length; i++) {
    const t = i / sr; let x;
    if (kind === 'D') {
      // big drum hit with a mallet: deep pitched boom + skin slap
      const f = 62 * (1 + 0.5 * Math.exp(-t / 0.02));
      x = Math.sin(TAU * f * t + 0.3) * Math.exp(-t / 0.22) + Math.sin(TAU * 1.6 * f * t) * 0.3 * Math.exp(-t / 0.08);
      const nz = Math.random() * 2 - 1; lp += (nz - lp) * 0.15; x += lp * 0.9 * Math.exp(-t / 0.012);
    } else {
      // thin stick on the other skin: a dry crack
      const nz = Math.random() * 2 - 1; lp += (nz - lp) * 0.7;
      x = lp * Math.exp(-t / 0.012) + Math.sin(TAU * 820 * t) * 0.4 * Math.exp(-t / 0.025);
    }
    d[s0 + i] += x * vol * Math.min(1, t / 0.0008);
  }
}

export function makeMizmar(ctx) {
  const sr = ctx.sampleRate, len = Math.floor(sr * 4.6);
  const buf = ctx.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const lead = new Float32Array(len), drone = new Float32Array(len), drums = new Float32Array(len);
  const e = 60 / 132 / 2;            // eighth note
  const intro = 1.1;                 // the band eases in: the drone swells and the drum rolls up, then the riff
  // the riff: a pickup run up to A, a turn around it, then down to the tonic
  const riff = 'D E F G A . A B A G A . C B A G F E D . .'.split(' ');
  const notes = []; let t = intro;
  for (const r of riff) { if (r !== '.') notes.push([t, RAST[r], e]); else notes[notes.length - 1][2] += e; t += e; }
  notes[notes.length - 1][2] += 0.3;
  reed(lead, sr, notes, 587.3, 0.5);                              // lead in D5
  reed(drone, sr, [[0, 0, t + 0.3]], 293.7, 0.3, { drone: true, fadeIn: intro });   // drone on D4, swelling in
  // drum roll: stick taps getting faster and louder, landing on a big DUM where the riff starts
  for (let i = 0, tt = 0.15; tt < intro - 0.03; i++) { tabl(drums, sr, tt, 'T', 0.12 + 0.4 * (tt / intro)); tt += Math.max(e / 2, e * (1 - tt / intro) * 1.4); }
  const saidi = ['D', 'T', '', 'D', 'D', '', 'T', ''];
  for (let i = 0, tt = intro; tt < t; i++, tt += e) { const h = saidi[i % 8]; if (h) tabl(drums, sr, tt, h, h === 'D' ? 0.8 : 0.45); }
  for (let i = 0; i < len; i++) {
    L[i] = lead[i] * 0.85 + drone[i] * 0.6 + drums[i];
    R[i] = lead[i] * 0.65 + drone[i] * 0.8 + drums[i];
  }
  let m = 0; for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  for (let i = 0; i < len; i++) { L[i] *= 0.9 / m; R[i] *= 0.9 / m; }
  return buf;
}
