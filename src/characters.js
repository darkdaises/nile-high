// The climbers. Every one is drawn in code, fits the same 34x30 box, squashes when it lands,
// stretches when it jumps, blinks, and looks the way it's moving.

export const CHARACTERS = [
  { id: 'blob', name: 'Mishmish', about: 'an apricot-sweet blob' },
  { id: 'cat', name: 'Bosbos', about: 'a Cairo street cat' },
  { id: 'scarab', name: 'Khepri', about: 'a lucky scarab' },
  { id: 'camel', name: 'Gamal', about: 'a baby camel' },
  { id: 'mummy', name: 'Tut', about: 'a tiny mummy' },
  { id: 'fennec', name: 'Zizo', about: 'a desert fennec' }
];

const INK = '#1a1030';

function eyes(g, xs, y, look, up, blink, r = 5, pupil = 2.8, white = '#fff') {
  for (const ex of xs) {
    g.fillStyle = white; g.beginPath(); g.ellipse(ex + look * 0.6, y + up, r, blink ? 1 : r * 1.15, 0, 0, Math.PI * 2); g.fill();
    if (!blink) {
      g.fillStyle = INK; g.beginPath(); g.arc(ex + look, y + up + 1, pupil, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + look + 1, y + up - 0.6, pupil * 0.35, 0, Math.PI * 2); g.fill();
    }
  }
}
function mouth(g, x, y, state, vy, s = 1) {
  g.strokeStyle = INK; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath();
  if (state === 'over') g.arc(x, y + 3 * s, 3 * s, Math.PI * 1.15, Math.PI * 1.85);
  else if (vy < -2) g.ellipse(x, y + 1, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
  else g.arc(x, y - 1, 3.2 * s, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
}
function cheeks(g, xs, y, color = 'rgba(255,120,150,.45)') { g.fillStyle = color; g.beginPath(); for (const x of xs) g.ellipse(x, y, 3.4, 2, 0, 0, Math.PI * 2); g.fill(); }
function shadow(g, w) { g.fillStyle = 'rgba(30,10,30,.22)'; g.beginPath(); g.ellipse(0, 1, w * 0.45, 3, 0, 0, Math.PI * 2); g.fill(); }
function blobShape(g, w, h) {
  g.beginPath(); g.moveTo(-w / 2, -4);
  g.bezierCurveTo(-w / 2, -h * 0.75, -w * 0.32, -h - 2, 0, -h - 2);
  g.bezierCurveTo(w * 0.32, -h - 2, w / 2, -h * 0.75, w / 2, -4);
  g.quadraticCurveTo(w / 2, 0, w / 2 - 4, 0); g.lineTo(-w / 2 + 4, 0); g.quadraticCurveTo(-w / 2, 0, -w / 2, -4);
}
function grad(g, h, a, b) { const gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }

const DRAW = {
  blob(g, w, h, c) {
    g.fillStyle = grad(g, h, '#5ef2d0', '#1fb5a3'); blobShape(g, w, h); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-w * 0.2, -h * 0.72, 5, 3, -0.5, 0, Math.PI * 2); g.fill();
    eyes(g, [-6.5, 6.5], -h * 0.55, c.look, c.up, c.blink);
    cheeks(g, [-11, 11], -h * 0.32);
    mouth(g, c.look * 0.5, -h * 0.32, c.state, c.vy);
  },

  cat(g, w, h, c) {
    // tail curling up behind
    g.strokeStyle = '#a8946e'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-c.face * 12, -6); g.quadraticCurveTo(-c.face * 24, -14, -c.face * (20 + Math.sin(c.t * 5) * 3), -26); g.stroke();
    g.fillStyle = grad(g, h, '#e3d3b0', '#b9a37c');
    g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-16, -h * 0.9, 0, -h); g.quadraticCurveTo(16, -h * 0.9, 14, 0); g.closePath(); g.fill();
    // ears
    g.beginPath(); g.moveTo(-13, -h * 0.72); g.lineTo(-11, -h - 9); g.lineTo(-3, -h * 0.95); g.moveTo(13, -h * 0.72); g.lineTo(11, -h - 9); g.lineTo(3, -h * 0.95); g.fill();
    g.fillStyle = '#f2a0a8'; g.beginPath(); g.moveTo(-11, -h * 0.86); g.lineTo(-10.5, -h - 4); g.lineTo(-6, -h * 0.96); g.moveTo(11, -h * 0.86); g.lineTo(10.5, -h - 4); g.lineTo(6, -h * 0.96); g.fill();
    // spots
    g.fillStyle = 'rgba(110,85,60,.35)'; for (const [x, y] of [[-9, -10], [8, -8], [-3, -5], [10, -17]]) { g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
    eyes(g, [-6, 6], -h * 0.6, c.look, c.up, c.blink, 4.6, 2.2, '#c8f07a');
    g.fillStyle = '#e88a9a'; g.beginPath(); g.moveTo(c.look * 0.5 - 2, -h * 0.4); g.lineTo(c.look * 0.5 + 2, -h * 0.4); g.lineTo(c.look * 0.5, -h * 0.34); g.fill();
    g.strokeStyle = 'rgba(60,40,30,.5)'; g.lineWidth = 0.8;
    for (const s of [-1, 1]) for (const dy of [-1.5, 1.5]) { g.beginPath(); g.moveTo(s * 8, -h * 0.36 + dy); g.lineTo(s * 16, -h * 0.38 + dy * 1.6); g.stroke(); }
    // golden collar with a blue bead
    g.fillStyle = '#f2c14e'; g.fillRect(-11, -h * 0.2, 22, 3.5);
    g.fillStyle = '#2e7ff0'; g.beginPath(); g.arc(0, -h * 0.2 + 4, 2.4, 0, Math.PI * 2); g.fill();
  },

  scarab(g, w, h, c) {
    // little legs scurry while running
    g.strokeStyle = INK; g.lineWidth = 1.6; g.lineCap = 'round';
    const k = Math.sin(c.t * 22) * Math.min(1, Math.abs(c.vx) / 3) * 3;
    for (const s of [-1, 1]) [-4, -9, -14].forEach((y, i) => {
      g.beginPath(); g.moveTo(s * 12, y); g.lineTo(s * 18, y + 2 + (i % 2 ? k : -k)); g.stroke();
    });
    // shell
    g.fillStyle = grad(g, h, '#4be3c8', '#127a7a');
    g.beginPath(); g.ellipse(0, -h * 0.42, 15, h * 0.46, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(10,40,40,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -h * 0.66); g.lineTo(0, -2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-6, -h * 0.55, 3, 6, -0.3, 0, Math.PI * 2); g.fill();
    // head + antennae
    g.fillStyle = '#123a4a'; g.beginPath(); g.ellipse(0, -h * 0.82, 10, 7, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#123a4a'; g.lineWidth = 1.4;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4, -h * 0.98); g.quadraticCurveTo(s * 8, -h - 8, s * 12, -h - 6); g.stroke(); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(s * 12, -h - 6, 1.8, 0, Math.PI * 2); g.fill(); }
    eyes(g, [-4.2, 4.2], -h * 0.83, c.look * 0.6, c.up * 0.6, c.blink, 3.2, 1.8);
  },

  camel(g, w, h, c) {
    g.fillStyle = grad(g, h, '#e8b878', '#c48a4e');
    // body with a hump
    g.beginPath(); g.moveTo(-15, 0); g.quadraticCurveTo(-17, -h * 0.75, -6, -h * 0.82);
    g.quadraticCurveTo(-c.face * 2, -h - 8, 6, -h * 0.82); g.quadraticCurveTo(17, -h * 0.75, 15, 0); g.closePath(); g.fill();
    // little legs
    g.fillStyle = '#b07a44'; g.fillRect(-10, -3, 5, 3); g.fillRect(5, -3, 5, 3);
    // fluffy forelock + ears
    g.fillStyle = '#9a6234'; for (const x of [-4, 0, 4]) { g.beginPath(); g.arc(x, -h * 0.84, 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#d9a466'; g.beginPath(); g.ellipse(-12, -h * 0.72, 4, 2.4, -0.6, 0, Math.PI * 2); g.ellipse(12, -h * 0.72, 4, 2.4, 0.6, 0, Math.PI * 2); g.fill();
    // snout
    g.fillStyle = '#f6d6a6'; g.beginPath(); g.ellipse(c.look * 0.6, -h * 0.28, 8, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(80,40,20,.55)'; g.beginPath(); g.ellipse(c.look * 0.6 - 3, -h * 0.32, 1.2, 1.8, 0, 0, Math.PI * 2); g.ellipse(c.look * 0.6 + 3, -h * 0.32, 1.2, 1.8, 0, 0, Math.PI * 2); g.fill();
    eyes(g, [-6, 6], -h * 0.6, c.look, c.up, c.blink, 4.2, 2.4);
    // long lashes
    if (!c.blink) { g.strokeStyle = INK; g.lineWidth = 1; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 6 + c.look * 0.6 - 3, -h * 0.6 - 4.5 + c.up); g.lineTo(s * 6 + c.look * 0.6 - 5, -h * 0.6 - 7 + c.up); g.stroke(); } }
  },

  mummy(g, w, h, c) {
    // a loose wrap flutters behind
    g.fillStyle = '#ece4cf';
    g.beginPath(); g.moveTo(-c.face * 10, -h * 0.5); g.quadraticCurveTo(-c.face * 22, -h * 0.5 + Math.sin(c.t * 8) * 4, -c.face * 26, -h * 0.3 + Math.sin(c.t * 8 + 1) * 5); g.lineTo(-c.face * 24, -h * 0.24); g.quadraticCurveTo(-c.face * 18, -h * 0.4, -c.face * 10, -h * 0.4); g.fill();
    g.fillStyle = grad(g, h, '#fbf6e6', '#d9cfb4'); blobShape(g, w * 0.9, h); g.fill();
    // bandage lines
    g.save(); blobShape(g, w * 0.9, h); g.clip();
    g.strokeStyle = 'rgba(150,130,100,.45)'; g.lineWidth = 1.1;
    for (let y = -h + 2; y < 0; y += 5) { g.beginPath(); g.moveTo(-18, y + 3); g.lineTo(18, y - 2); g.stroke(); }
    // the eye gap
    g.fillStyle = '#3a2a3a'; g.fillRect(-16, -h * 0.68, 32, 9);
    g.restore();
    eyes(g, [-6, 6], -h * 0.6, c.look, c.up * 0.5, c.blink, 3.6, 2.2);
    cheeks(g, [-10, 10], -h * 0.3, 'rgba(255,140,150,.35)');
    mouth(g, c.look * 0.5, -h * 0.26, c.state, c.vy, 0.85);
  },

  fennec(g, w, h, c) {
    // bushy tail
    g.fillStyle = '#e8a65c'; g.beginPath(); g.ellipse(-c.face * 15, -9, 9, 5, -c.face * (0.6 + Math.sin(c.t * 6) * 0.15), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff3e0'; g.beginPath(); g.ellipse(-c.face * 21, -12, 3.5, 3, 0, 0, Math.PI * 2); g.fill();
    // the famous giant ears
    for (const s of [-1, 1]) {
      g.fillStyle = '#f0b36a'; g.beginPath(); g.moveTo(s * 4, -h * 0.85); g.lineTo(s * 17, -h - 16); g.lineTo(s * 14, -h * 0.6); g.fill();
      g.fillStyle = '#f7c8b4'; g.beginPath(); g.moveTo(s * 6, -h * 0.82); g.lineTo(s * 15, -h - 11); g.lineTo(s * 13, -h * 0.66); g.fill();
    }
    g.fillStyle = grad(g, h, '#f6c27e', '#e39a4e'); blobShape(g, w * 0.88, h * 0.95); g.fill();
    // white cheeks and chest
    g.fillStyle = '#fff3e0'; g.beginPath(); g.ellipse(c.look * 0.5, -h * 0.3, 10, 7, 0, 0, Math.PI * 2); g.fill();
    eyes(g, [-6, 6], -h * 0.58, c.look, c.up, c.blink, 4, 2.6, '#2a1a1a');
    g.fillStyle = INK; g.beginPath(); g.ellipse(c.look * 0.6, -h * 0.4, 2.2, 1.6, 0, 0, Math.PI * 2); g.fill();
    mouth(g, c.look * 0.6, -h * 0.28, c.state, c.vy, 0.8);
  }
};

// Draw any climber at its player position
export function drawCharacter(g, p, t, state, id = 'blob') {
  const sq = p.squash, sx = 1 + sq * 0.5, sy = 1 - sq * 0.5;
  g.save();
  // spins rotate around the middle of the body; twirls squeeze it sideways like a pirouette
  g.translate(p.x + p.w / 2, p.y + p.h / 2);
  if (p.rot) g.rotate(p.rot);
  g.scale(sx * (p.twirl ?? 1), sy);
  g.translate(0, p.h / 2);
  if (!p.air) shadow(g, p.w);
  const c = {
    look: Math.max(-1, Math.min(1, p.vx / 5)) * 3,
    up: p.vy < -2 ? -2 : p.vy > 3 ? 1.5 : 0,
    blink: p.blink > 0 || state === 'over',
    state, vy: p.vy, vx: p.vx, face: p.face || 1, t
  };
  (DRAW[id] || DRAW.blob)(g, p.w, p.h, c);
  g.restore();
}
