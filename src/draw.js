// All the art is drawn in code: no image files.
// Five worlds, one every 25 floors: Cairo rooftops → the desert road → the pyramids of Giza → a temple of stars → above the Nile.
// The sky moves from sunset to a starry night as you climb.

import { LEVEL_FLOORS } from './levels.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// sky (top, bottom) by floor
const SKY = [
  [0, '#ff8c5a', '#ffd38a'],     // golden hour over Cairo
  [25, '#f0646e', '#ffb06a'],    // deep sunset over the desert
  [50, '#9a4a8e', '#f08a6e'],    // dusk at Giza
  [75, '#2e2462', '#8a4a8a'],    // blue hour at the temple
  [100, '#070a1f', '#1a1f4a']    // night over the Nile
];
function skyAt(h) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h <= h1) { const k = clamp((h - h0) / (h1 - h0)); return [mix(t0, t1, k), mix(b0, b1, k)]; }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
}
const duskAt = (h) => clamp(h / 100);   // 0 = sunset, 1 = night

const STARS = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6 }));

export function drawSky(g, W, H, height, t) {
  const [top, bottom] = skyAt(height);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);

  // the sun sinks lower as you climb
  const sunY = H * 0.6 + height * 4.2;
  if (sunY < H + 140) {
    const r = 72, sx = W * 0.62;
    const sg = g.createRadialGradient(sx, sunY, 0, sx, sunY, r * 2.4);
    sg.addColorStop(0, 'rgba(255,240,200,.95)'); sg.addColorStop(0.32, 'rgba(255,196,120,.75)'); sg.addColorStop(1, 'rgba(255,150,100,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sunY, r * 2.4, 0, Math.PI * 2); g.fill();
  }
  const night = clamp((height - 55) / 45);
  if (night > 0) {
    for (const s of STARS) {
      g.globalAlpha = night * (0.5 + 0.5 * Math.sin(t * 1.5 + s.tw));
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x * W, s.y * H * 0.92, s.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
  const moon = clamp((height - 80) / 25);
  if (moon > 0) {   // a big crescent moon over the Nile
    g.globalAlpha = moon;
    const mx = W * 0.3, my = H * 0.2;
    const mg = g.createRadialGradient(mx, my, 0, mx, my, 70); mg.addColorStop(0, 'rgba(255,240,200,.25)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = top; g.beginPath(); g.arc(mx + 11, my - 6, 22, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
}

// ---------- backdrops: each world fades in as you reach it ----------
function weight(height, k, last) {
  const start = k * LEVEL_FLOORS, end = (k + 1) * LEVEL_FLOORS;
  const inA = k === 0 ? 1 : clamp((height - (start - 8)) / 10);
  const outA = last ? 1 : 1 - clamp((height - (end - 8)) / 10);
  return Math.min(inA, outA);
}

export function drawBackdrop(g, W, H, camY, height, t) {
  const dusk = duskAt(height);
  const scenes = [cityScene, desertScene, gizaScene, templeScene, nileScene];
  scenes.forEach((scene, k) => {
    const a = weight(height, k, k === scenes.length - 1);
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a; scene(g, W, H, camY, height, t, dusk); g.restore();
  });
}

// World 1: the Cairo skyline of domes and minarets, sinking as you climb
const CITY = (() => {
  const items = []; let x = -10;
  while (x < 420) {
    const r = Math.random();
    if (r < 0.18) { items.push({ k: 'minaret', x, w: 10, h: 120 + Math.random() * 70 }); x += 18; }
    else if (r < 0.35) { items.push({ k: 'dome', x, w: 54 + Math.random() * 20, h: 50 + Math.random() * 25 }); x += 60; }
    else { const w = 26 + Math.random() * 40; items.push({ k: 'block', x, w, h: 40 + Math.random() * 90, win: Math.random() }); x += w - 2; }
  }
  return items;
})();
function cityScene(g, W, H, camY, height, t, dusk) {
  const base = H + 30 + Math.max(0, -camY) * 0.25;
  if (base - 230 > H) return;
  g.fillStyle = mix('#7a3b57', '#2a1840', dusk);
  for (const b of CITY) {
    if (b.k === 'block') g.fillRect(b.x, base - b.h, b.w, b.h);
    if (b.k === 'dome') {
      g.fillRect(b.x, base - b.h * 0.55, b.w, b.h * 0.55);
      g.beginPath(); g.ellipse(b.x + b.w / 2, base - b.h * 0.55, b.w * 0.42, b.h * 0.5, 0, Math.PI, 0); g.fill();
      g.fillRect(b.x + b.w / 2 - 1, base - b.h * 1.08 - 10, 2, 12);
    }
    if (b.k === 'minaret') {
      g.fillRect(b.x, base - b.h, b.w, b.h); g.fillRect(b.x - 3, base - b.h * 0.72, b.w + 6, 5); g.fillRect(b.x - 2, base - b.h * 0.9, b.w + 4, 4);
      g.beginPath(); g.moveTo(b.x - 1, base - b.h); g.lineTo(b.x + b.w / 2, base - b.h - 22); g.lineTo(b.x + b.w + 1, base - b.h); g.fill();
    }
  }
}

// World 2: rolling dunes, palms, and the pyramids far away on the horizon
function desertScene(g, W, H, camY, height, t, dusk) {
  const hz = H * 0.74;
  // distant pyramids
  g.fillStyle = mix('#c26a5a', '#5a3a6a', dusk);
  pyramid(g, W * 0.58, hz, 70); pyramid(g, W * 0.78, hz, 52); pyramid(g, W * 0.44, hz, 34);
  // dunes
  dune(g, W, H, hz + 6, 14, 0.02, mix('#e89a62', '#6a4466', dusk), t * 0);
  dune(g, W, H, hz + 40, 22, 0.015, mix('#d8834e', '#553658', dusk), 2);
  dune(g, W, H, hz + 80, 26, 0.012, mix('#c06e40', '#44294a', dusk), 4);
  // palms
  g.fillStyle = mix('#5a2e3a', '#1e1230', dusk);
  palm(g, W * 0.16, hz + 52, 1); palm(g, W * 0.24, hz + 60, 0.75); palm(g, W * 0.86, hz + 70, 0.9);
}

// World 3: up close with the Great Pyramid, Khafre with its white cap, and the Sphinx
function gizaScene(g, W, H, camY, height, t, dusk) {
  const hz = H * 0.8;
  const lit = mix('#f0a466', '#8a5a7a', dusk), shade = mix('#b8643f', '#4a2a50', dusk);
  bigPyramid(g, W * 0.3, hz, 200, lit, shade);
  bigPyramid(g, W * 0.78, hz + 10, 150, lit, shade, true);
  // the Sphinx resting in front
  g.fillStyle = mix('#7a3e3a', '#2a1832', dusk);
  const sx = W * 0.52, sy = hz + 26;
  g.beginPath(); g.moveTo(sx - 60, sy); g.lineTo(sx - 58, sy - 14); g.quadraticCurveTo(sx - 30, sy - 22, sx + 8, sy - 18);
  g.lineTo(sx + 14, sy - 36); g.lineTo(sx + 28, sy - 40); g.lineTo(sx + 36, sy - 30); g.lineTo(sx + 34, sy - 16); g.lineTo(sx + 52, sy - 10); g.lineTo(sx + 56, sy); g.fill();
  dune(g, W, H, hz + 26, 10, 0.02, mix('#d07a48', '#3a2244', dusk), 1);
}

// World 4: obelisks and columns at blue hour, torches flickering
function templeScene(g, W, H, camY, height, t, dusk) {
  const hz = H * 0.82;
  g.fillStyle = mix('#3a2a5a', '#1a1434', dusk);
  obelisk(g, W * 0.2, hz, 150); obelisk(g, W * 0.8, hz, 120);
  for (let i = 0; i < 5; i++) { const cx = W * (0.34 + i * 0.08); g.fillRect(cx, hz - 90, 14, 90); g.fillRect(cx - 4, hz - 96, 22, 8); }
  g.fillRect(W * 0.32, hz - 104, W * 0.36, 10);
  g.fillRect(0, hz, W, H - hz);
  for (const tx of [W * 0.31, W * 0.69]) {
    const f = 0.7 + 0.3 * Math.sin(t * 9 + tx);
    const fg = g.createRadialGradient(tx, hz - 30, 0, tx, hz - 30, 40 * f); fg.addColorStop(0, 'rgba(255,190,90,.6)'); fg.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = fg; g.beginPath(); g.arc(tx, hz - 30, 40 * f, 0, Math.PI * 2); g.fill();
  }
}

// World 5: the Nile at night, the moon on the water, tiny pyramids far below
function nileScene(g, W, H, camY, height, t, dusk) {
  const hz = H * 0.84;
  g.fillStyle = '#100c2a'; g.fillRect(0, hz, W, H - hz);
  g.fillStyle = '#1a2252'; g.beginPath(); g.moveTo(0, hz + 30); g.quadraticCurveTo(W * 0.5, hz + 4, W, hz + 26); g.lineTo(W, hz + 54); g.quadraticCurveTo(W * 0.5, hz + 34, 0, hz + 60); g.fill();
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(255,240,200,${0.12 + 0.12 * Math.sin(t * 2 + i)})`; g.fillRect(W * 0.3 - 18 + Math.sin(i * 2.1) * 10, hz + 18 + i * 4, 36 - i * 2, 1.5); }
  g.fillStyle = '#1c1640'; pyramid(g, W * 0.7, hz, 24); pyramid(g, W * 0.78, hz, 18);
}

// ---------- shape helpers ----------
function pyramid(g, cx, base, h) { g.beginPath(); g.moveTo(cx - h * 1.05, base); g.lineTo(cx, base - h); g.lineTo(cx + h * 1.05, base); g.fill(); }
function bigPyramid(g, cx, base, h, lit, shade, cap) {
  g.fillStyle = lit; g.beginPath(); g.moveTo(cx - h * 1.05, base); g.lineTo(cx, base - h); g.lineTo(cx + h * 0.15, base); g.fill();
  g.fillStyle = shade; g.beginPath(); g.moveTo(cx, base - h); g.lineTo(cx + h * 1.05, base); g.lineTo(cx + h * 0.15, base); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
  for (let y = base - 8; y > base - h; y -= 8) { const k = (base - y) / h; g.beginPath(); g.moveTo(cx - h * 1.05 * (1 - k), y); g.lineTo(cx + h * 1.05 * (1 - k), y); g.stroke(); }
  if (cap) { g.fillStyle = 'rgba(255,240,220,.85)'; g.beginPath(); g.moveTo(cx - h * 0.18, base - h * 0.83); g.lineTo(cx, base - h); g.lineTo(cx + h * 0.18, base - h * 0.83); g.fill(); }
}
function dune(g, W, H, y, amp, freq, color, phase) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x * freq + phase) * amp);
  g.lineTo(W, H); g.fill();
}
function palm(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(4, -40, 2, -78); g.lineTo(6, -78); g.quadraticCurveTo(9, -40, 3, 0); g.fill();
  for (let i = 0; i < 6; i++) { g.save(); g.translate(4, -80); g.rotate(-2.6 + i * 0.95); g.beginPath(); g.ellipse(18, 0, 20, 4, 0.35, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
}
function obelisk(g, x, base, h) { g.beginPath(); g.moveTo(x - 9, base); g.lineTo(x - 6, base - h); g.lineTo(x, base - h - 14); g.lineTo(x + 6, base - h); g.lineTo(x + 9, base); g.fill(); }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- walls: each world has its own ----------
const WALLS = [
  { stone: ['#d9a066', '#8a5a6e'], light: ['#ecc08a', '#a07888'], dark: ['#b97f4c', '#6a4258'], rows: 26 },   // sandstone buildings
  { stone: ['#c98552', '#7a4a5a'], light: ['#e0a370', '#946274'], dark: ['#a8663c', '#5a3446'], rows: 18 },   // mudbrick
  { stone: ['#e8c48e', '#9a7a8e'], light: ['#f6dcae', '#b49aaa'], dark: ['#c9a06a', '#76586e'], rows: 40 },   // limestone pyramid blocks
  { stone: ['#4a3a6a', '#2e2450'], light: ['#5e4c82', '#3c3062'], dark: ['#33284c', '#201a38'], rows: 34 },   // temple stone
  { stone: ['#1e2250', '#141838'], light: ['#2a3068', '#1c2148'], dark: ['#141838', '#0c0f26'], rows: 30 }    // night stone
];

export function drawWalls(g, W, camY, H, WALL, height, levelAtY, t) {
  const dusk = duskAt(height);
  const top = camY - 30, bottom = camY + H + 30;
  for (let y = Math.floor(top / 6) * 6; y < bottom; y += 6) {
    const lv = levelAtY(y), S = WALLS[lv];
    for (const side of [0, 1]) {
      const x = side ? W - WALL : 0;
      g.fillStyle = mix(S.stone[0], S.stone[1], dusk); g.fillRect(x, y, WALL, 6);
      g.fillStyle = mix(side ? S.dark[0] : S.light[0], side ? S.dark[1] : S.light[1], dusk); g.fillRect(side ? x : x + WALL - 3, y, 3, 6);
      if (((y % S.rows) + S.rows) % S.rows < 6) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y, WALL, 2); }
      // vertical joints for bricks and blocks
      if (lv >= 1 && lv <= 3) {
        const row = Math.floor(y / S.rows), off = row % 2 ? WALL * 0.5 : 0;
        g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x + ((off + (lv === 1 ? 11 : 17)) % WALL), y, 1.5, 6);
      }
    }
  }
  // details per world, on a coarser grid
  for (let y = Math.floor((top - 160) / 156) * 156; y < bottom + 160; y += 156) {
    for (const side of [0, 1]) {
      const wy = y + (side ? 70 : 0), lv = levelAtY(wy + 20), x = side ? W - WALL : 0, wx = x + 8, ww = WALL - 16;
      if (lv === 0) {   // shuttered window with a mashrabiya
        const lit = (Math.abs(Math.floor(wy / 156)) + side) % 3 === 0;
        g.fillStyle = lit ? `rgba(255,205,120,${0.45 + dusk * 0.5})` : 'rgba(40,20,30,.45)';
        g.beginPath(); g.moveTo(wx, wy + 40); g.lineTo(wx, wy + 10); g.quadraticCurveTo(wx + ww / 2, wy - 2, wx + ww, wy + 10); g.lineTo(wx + ww, wy + 40); g.fill();
        if ((Math.abs(Math.floor(wy / 156)) + side) % 2 === 0) {
          g.strokeStyle = 'rgba(70,35,30,.55)'; g.lineWidth = 1;
          for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(wx, wy + 10 + i * 8); g.lineTo(wx + ww, wy + 10 + i * 8); g.stroke(); }
        }
      } else if (lv === 1) {   // small arched vent in the mudbrick
        g.fillStyle = 'rgba(60,25,25,.45)'; g.beginPath(); g.arc(wx + ww / 2, wy + 20, 6, Math.PI, 0); g.fillRect(wx + ww / 2 - 6, wy + 20, 12, 10); g.fill();
      } else if (lv === 2) {   // carved cartouche
        g.strokeStyle = 'rgba(120,80,40,.4)'; g.lineWidth = 1.4; roundRect(g, wx + 2, wy, ww - 4, 44, 8); g.stroke();
        g.fillStyle = 'rgba(120,80,40,.4)'; g.fillRect(wx + 7, wy + 9, ww - 14, 2); g.beginPath(); g.arc(wx + ww / 2, wy + 22, 4, 0, Math.PI * 2); g.fill(); g.fillRect(wx + 8, wy + 32, ww - 16, 2);
      } else if (lv === 3) {   // glowing hieroglyph band
        const glow = 0.5 + 0.5 * Math.sin(t * 2 + wy * 0.01);
        g.fillStyle = `rgba(255,200,110,${0.35 + 0.4 * glow})`;
        glyphs(g, wx + ww / 2, wy, Math.abs(Math.floor(wy / 156)) + side);
      } else {   // star marks in the night stone
        const glow = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + wy));
        g.fillStyle = `rgba(190,210,255,${0.35 * glow + 0.15})`; star(g, wx + ww / 2, wy + 20, 4);
      }
    }
  }
}

function glyphs(g, cx, y, seed) {
  // a tiny column of simple symbols: eye, ankh, bird, wave
  const k = seed % 4;
  g.beginPath(); g.ellipse(cx, y + 6, 6, 3, 0, 0, Math.PI * 2); g.fill();
  if (k % 2) { g.fillRect(cx - 1, y + 14, 2, 12); g.fillRect(cx - 5, y + 17, 10, 2); g.beginPath(); g.arc(cx, y + 13, 3, 0, Math.PI * 2); g.fill(); }
  else { g.beginPath(); g.moveTo(cx - 6, y + 24); g.quadraticCurveTo(cx, y + 14, cx + 6, y + 18); g.lineTo(cx + 3, y + 26); g.fill(); }
  for (let i = 0; i < 3; i++) g.fillRect(cx - 6 + i * 4.5, y + 32 + (i % 2) * 2, 3, 2);
}
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }

// ---------- ledges ----------
const LEDGES = [
  { top: ['#f2c58e', '#a888a8'], face: ['#c98c55', '#6a4a68'], lip: ['#fff0d6', '#c8b0cc'] },   // rooftop edge
  { top: ['#f4c27e', '#a4809a'], face: ['#c27c46', '#664058'], lip: ['#ffe2b0', '#c6a4b8'] },   // sandstone slab with sand
  { top: ['#f6deb0', '#c0aac0'], face: ['#d6b07a', '#8a6e88'], lip: ['#fff6e2', '#ddd0e0'] },   // limestone pyramid block
  { top: ['#6a5a92', '#4a3e72'], face: ['#43376a', '#2e2652'], lip: ['#ffcf7a', '#ffcf7a'] },   // temple slab, gold edge
  { top: ['#3a4690', '#2c3676'], face: ['#232a5e', '#1a2048'], lip: ['#bcd0ff', '#bcd0ff'] }    // floating night stone
];

export function drawLedge(g, L, t, height) {
  const dusk = duskAt(height), S = LEDGES[L.lvl || 0];
  const top = mix(S.top[0], S.top[1], dusk), face = mix(S.face[0], S.face[1], dusk), lip = mix(S.lip[0], S.lip[1], dusk);
  const { x, y, w, lvl } = L;
  g.fillStyle = 'rgba(20,8,24,.2)'; g.fillRect(x + 4, y + 14, w - 4, 6);
  g.fillStyle = face; g.fillRect(x, y + 4, w, 12);
  g.fillStyle = top; g.fillRect(x, y, w, 6);
  if (lvl >= 3) { g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2.5 + L.seed * 6); }
  g.fillStyle = lip; g.fillRect(x, y, w, 2);
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(0,0,0,.09)';
  if (lvl === 0) for (let i = x + 8; i < x + w - 6; i += 16) g.fillRect(i, y + 8, 8, 5);
  if (lvl === 1) { g.fillStyle = mix('#ffd9a0', '#c0a0b0', dusk); for (let i = 0; i < w; i += 22) { g.beginPath(); g.ellipse(x + i + 10, y + 1, 9, 2.5, 0, Math.PI, 0); g.fill(); } }
  if (lvl === 2) for (let i = x + 26; i < x + w - 4; i += 30) g.fillRect(i, y + 4, 1.5, 12);
  if (lvl === 3) { g.fillStyle = 'rgba(255,200,110,.35)'; for (let i = x + 10; i < x + w - 10; i += 14) g.fillRect(i, y + 9, 6, 2); }
  if (lvl === 4) { g.fillStyle = 'rgba(188,208,255,.25)'; g.fillRect(x + 6, y + 16, w - 12, 2); }

  if (L.i > 0 && L.i % 10 === 0 && !L.full) {   // floor number plaque
    g.fillStyle = 'rgba(30,15,30,.55)'; roundRect(g, x + w / 2 - 20, y + 18, 40, 16, 4); g.fill();
    g.fillStyle = '#ffe9c4'; g.font = '800 11px "DM Sans Variable", sans-serif'; g.textAlign = 'center'; g.fillText(L.i, x + w / 2, y + 30);
  }
  drawProp(g, L, t, dusk);
}

function drawProp(g, L, t, dusk) {
  const { x, y, w, prop, seed } = L; if (!prop) return;
  const px = x + 10 + seed * Math.max(0, w - 46);
  g.save();
  if (prop === 'dish') {
    g.fillStyle = mix('#eae4dc', '#a59ab2', dusk); g.beginPath(); g.ellipse(px + 12, y - 12, 11, 8, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(px + 13, y - 11, 7, 5, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b6470'; g.fillRect(px + 11, y - 6, 3, 6);
  } else if (prop === 'tank') {
    g.fillStyle = mix('#9fb4c2', '#5d6a86', dusk); roundRect(g, px, y - 20, 22, 18, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(px + 3, y - 17, 4, 12);
    g.fillStyle = '#5b5560'; g.fillRect(px + 2, y - 2, 3, 2); g.fillRect(px + 17, y - 2, 3, 2);
  } else if (prop === 'plant') {
    g.fillStyle = mix('#c06a3d', '#6b3a46', dusk); g.fillRect(px + 3, y - 9, 12, 9);
    g.fillStyle = mix('#4f9a5a', '#2f5a52', dusk);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(px + 5 + i * 3, y - 12 - (i % 2) * 3, 3, 7, (i - 1.5) * 0.4, 0, Math.PI * 2); g.fill(); }
  } else if (prop === 'laundry') {
    const lw = Math.min(54, w - 20), sway = Math.sin(t * 2 + seed * 6) * 2;
    g.fillStyle = '#6b5a60'; g.fillRect(px, y - 22, 2, 22); g.fillRect(px + lw, y - 22, 2, 22);
    g.strokeStyle = 'rgba(80,60,70,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, y - 21); g.quadraticCurveTo(px + lw / 2, y - 16, px + lw, y - 21); g.stroke();
    const cols = ['#e76f51', '#2a9d8f', '#f4e3c1'];
    for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect(px + 8 + i * (lw / 3.2) + sway, y - 19, 9, 10); }
  } else if (prop === 'lantern') {   // fanous
    const glow = 0.5 + dusk * 0.5;
    g.fillStyle = `rgba(255,190,90,${0.25 * glow})`; g.beginPath(); g.arc(px + 7, y - 12, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a2a'; g.fillRect(px + 5, y - 22, 4, 3);
    g.fillStyle = `rgba(255,200,100,${0.7 + 0.3 * glow})`; g.beginPath(); g.moveTo(px + 1, y - 18); g.lineTo(px + 13, y - 18); g.lineTo(px + 11, y - 4); g.lineTo(px + 3, y - 4); g.fill();
    g.fillStyle = '#7a4a2a'; g.fillRect(px + 2, y - 4, 10, 4);
  } else if (prop === 'palm') {
    g.fillStyle = mix('#8a5a3a', '#4a3048', dusk); g.fillRect(px + 9, y - 30, 4, 30);
    g.fillStyle = mix('#4f8a4a', '#2a4a48', dusk);
    for (let i = 0; i < 5; i++) { g.save(); g.translate(px + 11, y - 31); g.rotate(-2.7 + i * 0.85); g.beginPath(); g.ellipse(10, 0, 11, 3, 0.3, 0, Math.PI * 2); g.fill(); g.restore(); }
  } else if (prop === 'jar') {   // clay amphora
    g.fillStyle = mix('#c4683c', '#6a3a4a', dusk);
    g.beginPath(); g.moveTo(px + 6, y); g.quadraticCurveTo(px - 2, y - 12, px + 6, y - 18); g.lineTo(px + 12, y - 18); g.quadraticCurveTo(px + 20, y - 12, px + 12, y); g.fill();
    g.fillRect(px + 6, y - 22, 6, 4); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px + 5, y - 13, 2, 7);
  } else if (prop === 'camel') {   // a tiny camel resting
    g.fillStyle = mix('#b87a4a', '#5a3a50', dusk);
    g.beginPath(); g.ellipse(px + 14, y - 7, 12, 6, 0, Math.PI, 0); g.fill();
    g.beginPath(); g.ellipse(px + 11, y - 11, 5, 4, 0, Math.PI, 0); g.fill();
    g.fillRect(px + 22, y - 16, 3, 10); g.beginPath(); g.ellipse(px + 27, y - 16, 4, 2.5, 0.2, 0, Math.PI * 2); g.fill();
    g.fillRect(px + 4, y - 3, 22, 3);
  } else if (prop === 'glyph') {   // carved stone tablet
    g.fillStyle = mix('#e6c896', '#8a7090', dusk); roundRect(g, px, y - 24, 16, 24, 3); g.fill();
    g.fillStyle = 'rgba(110,70,40,.55)'; glyphs(g, px + 8, y - 22, Math.floor(seed * 4));
  } else if (prop === 'torch') {
    const f = 0.75 + 0.25 * Math.sin(t * 12 + seed * 9);
    g.fillStyle = 'rgba(255,170,80,.25)'; g.beginPath(); g.arc(px + 6, y - 24, 16 * f, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a3a2a'; g.fillRect(px + 4, y - 18, 4, 18);
    g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(px + 6, y - 23, 4 * f, 7 * f, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff1a8'; g.beginPath(); g.ellipse(px + 6, y - 21, 2, 3.5, 0, 0, Math.PI * 2); g.fill();
  } else if (prop === 'ankh') {
    const gl = 0.6 + 0.4 * Math.sin(t * 2 + seed * 5);
    g.fillStyle = `rgba(255,205,120,${0.22 * gl})`; g.beginPath(); g.arc(px + 8, y - 14, 15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(255,210,130,${0.7 + 0.3 * gl})`; g.lineWidth = 3; g.beginPath(); g.ellipse(px + 8, y - 22, 4, 5, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(255,210,130,${0.7 + 0.3 * gl})`; g.fillRect(px + 2, y - 16, 12, 3); g.fillRect(px + 6.5, y - 16, 3, 16);
  } else if (prop === 'star') {
    const gl = 0.5 + 0.5 * Math.sin(t * 3 + seed * 7);
    g.fillStyle = `rgba(200,220,255,${0.3 + 0.6 * gl})`; star(g, px + 8, y - 16 - gl * 3, 6);
  } else if (prop === 'garden') {   // the landing at the start of each level, strung with lights
    g.strokeStyle = 'rgba(255,230,180,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 6, y - 40);
    for (let i = 1; i <= 6; i++) g.quadraticCurveTo(x + (w / 6) * (i - 0.5), y - 30, x + (w / 6) * i, y - 40);
    g.stroke();
    for (let i = 0; i < 18; i++) {
      const lx = x + 10 + (i * (w - 20)) / 17; g.fillStyle = i % 2 ? '#ffd27a' : '#ff9a7a';
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i); g.beginPath(); g.arc(lx, y - 34 + Math.sin(i * 1.1) * 3, 2.2, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (L.i > 0) {
      g.fillStyle = 'rgba(30,15,30,.6)'; roundRect(g, x + w / 2 - 34, y + 18, 68, 18, 5); g.fill();
      g.fillStyle = '#ffe9c4'; g.font = '800 11px "DM Sans Variable", sans-serif'; g.textAlign = 'center'; g.fillText(`LEVEL ${L.i / LEVEL_FLOORS + 1}`, x + w / 2, y + 31);
    }
  }
  g.restore();
}

export function drawParticles(g, list) {
  for (const q of list) { g.fillStyle = q.c + Math.max(0, q.life / q.max) + ')'; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill(); }
}
