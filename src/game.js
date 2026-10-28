// Nile High: an endless climb from the rooftops of Cairo to the pyramids and the stars.
// Run to build speed, and the faster you run the higher you jump. Bounce off the walls.
// Once you start climbing the city scrolls up, and it speeds up every 30 seconds. Fall off the bottom and it's over.
// Jumping two or more ledges at once starts a combo; keep chaining big jumps to grow it.

import { Sfx } from './sfx.js';
import { drawSky, drawBackdrop, drawWalls, drawLedge, drawParticles } from './draw.js';
import { drawCharacter } from './characters.js';
import { LEVELS, LEVEL_FLOORS, levelOf } from './levels.js';

export const W = 400;                    // the tower is always 400 units wide; the screen shows as much height as fits
const BASE = 600;                         // world y of the ground floor
export const WALL = 34;                  // side wall thickness
const GAP = 78;                           // vertical distance between ledges
const G = 0.58, RUN = 0.62, AIR = 0.42, FRICTION = 0.86, MAXV = 8.2;
const JUMP = 10.6, JUMP_BOOST = 0.9;
const COMBO_TIME = 3;                     // seconds to land the next big jump

const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(canvas, onHud, onOver) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.onHud = onHud; this.onOver = onOver;
    this.keys = { left: false, right: false, jump: false };
    this.tilt = 0;                 // -1..1 from tilting the phone (0 when not used)
    this.sfx = new Sfx();
    this.resize();
    this.reset();
    this.state = 'menu';
    this.character = 'blob';
    this.last = 0; this.acc = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // Full screen on any shape. Phones (tall): the tower fills the width and you see more height.
  // Wide screens: the tower stays centered at a comfortable height and the scenery fills the sides.
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    const cw = this.canvas.width = Math.max(1, Math.round(r.width * dpr)), ch = this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    if (cw / ch <= W / 720) {
      // phones: zoom in so the climber is bigger. You see about 600 units of height, and the view
      // pans sideways to follow the climber (the walls slide out of view on the far side).
      this.vw = Math.min(W, Math.max(260, (cw / ch) * 600)); this.scale = cw / this.vw; this.vh = ch / this.scale;
    }
    else { this.vh = 720; this.scale = ch / this.vh; this.vw = cw / this.scale; }
    this.ox = (this.vw - W) / 2;
    const oldY0 = this.camY0;
    // on touch screens keep the ground a little above the bottom edge (home bar)
    this.pad = matchMedia('(pointer: coarse)').matches ? 24 : 0;
    this.camY0 = BASE + 40 + this.pad - this.vh;   // camera position with the ground at the bottom of the screen
    if (this.camY !== undefined && oldY0 !== undefined && this.state !== 'playing') this.camY += this.camY0 - oldY0;
  }

  reset() {
    this.ledges = [];
    for (let i = 0; i < 14; i++) this.addLedge(i);
    const p = this.player = { x: W / 2 - 17, y: this.ledges[0].y - 30, w: 34, h: 30, vx: 0, vy: 0, ground: 0, face: 1, squash: 0, blink: 0, air: 0, rot: 0, twirl: 1, trick: null };
    p.lastFloor = 0;
    this.camY = this.camY0;        // world y at the top of the screen
    this.speed = 0;                // auto-scroll speed (px per frame)
    this.scrolling = false;
    this.time = 0; this.hurry = 0; this.level = 0; this.zone = 0;
    this.floor = 0; this.maxFloor = 0;
    this.combo = null;             // { floors, jumps, timer }
    this.comboPoints = 0; this.bestCombo = 0;
    this.jumpBuffer = 0; this.coyote = 0;
    this.particles = []; this.popups = [];
    this.shake = 0;
  }

  addLedge(i) {
    const base = BASE;
    if (i === 0) { this.ledges[0] = { i: 0, x: WALL, w: W - WALL * 2, y: base, full: true, prop: null }; return; }
    // the first ledge of every level is a full-width landing
    const milestone = i % LEVEL_FLOORS === 0;
    const hard = Math.min(1, i / 160);
    const w = milestone ? W - WALL * 2 : rand(lerp(150, 78, hard), lerp(230, 116, hard));
    const x = milestone ? WALL : rand(WALL, W - WALL - w);
    const lvl = levelOf(i), props = LEVELS[lvl].props;
    this.ledges[i] = { i, x, w, y: base - i * GAP, full: milestone, lvl, prop: milestone ? 'garden' : props[Math.floor(Math.random() * props.length)], seed: Math.random() };
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.sfx.unlock();
    this.sfx.lastHype = 0;          // every game starts with "Yalla!"
    this.sfx.startMusic(0);
  }

  setKey(k, down) {
    if (k === 'jump' && down && !this.keys.jump) this.jumpBuffer = 0.12;
    this.keys[k] = down;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    if (this.state === 'playing') {
      this.acc += dt;
      while (this.acc >= 1 / 60) { this.step(1 / 60); this.acc -= 1 / 60; }
    } else this.idle(dt);
    this.render(now / 1000);
    requestAnimationFrame(this.loop);
  }

  // menu / game over: nothing moves except particles (the climber just rests on game over)
  idle(dt) {
    const p = this.player; this.time += dt;
    const floorY = this.ledges[p.ground]?.y ?? this.ledges[0].y;
    p.y = floorY - p.h; p.vy = 0; p.rot = 0; p.twirl = 1;
    p.squash *= 0.85;
    this.updateParticles(dt);
  }

  step(dt) {
    const p = this.player, k = this.keys;
    this.time += dt;

    // run: accelerate toward the held direction, slide to a stop otherwise
    const accel = p.air ? AIR : RUN;
    if (k.left && !k.right) { p.vx -= accel; p.face = -1; }
    else if (k.right && !k.left) { p.vx += accel; p.face = 1; }
    else if (this.tilt) {
      // phone tilt is analog: lean a little to walk, lean more to sprint
      const target = MAXV * this.tilt;
      p.vx += Math.max(-accel, Math.min(accel, target - p.vx));
      if (Math.abs(this.tilt) > 0.15) p.face = this.tilt < 0 ? -1 : 1;
    }
    else if (!p.air) p.vx *= FRICTION;
    p.vx = Math.max(-MAXV, Math.min(MAXV, p.vx));

    // jump (with a tiny buffer and coyote time so it feels forgiving)
    this.jumpBuffer -= dt; this.coyote -= dt;
    if (!p.air) this.coyote = 0.08;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -(JUMP + Math.abs(p.vx) * JUMP_BOOST);
      p.air = 1; this.coyote = 0; this.jumpBuffer = 0; p.squash = -0.35;
      this.sfx.jump(Math.abs(p.vx) / MAXV);
      // tricks: faster jumps twirl, big ones spin, and during a combo you pull a double flip
      const power = Math.abs(p.vx) / MAXV, dir = p.vx >= 0 ? 1 : -1, air = (2 * -p.vy / G) / 60;
      if (this.combo && power > 0.5) p.trick = { type: 'spin', turns: 2, dir, dur: air * 0.9, t: 0 };
      else if (power > 0.75) p.trick = { type: 'spin', turns: 1, dir, dur: air * 0.85, t: 0 };
      else if (power > 0.45) p.trick = { type: 'twirl', turns: 2, dir, dur: air * 0.8, t: 0 };
      else p.trick = null;
      if (p.trick) this.sfx.whoosh(p.trick.turns);
      this.dust(p.x + p.w / 2, p.y + p.h, 5);
    }
    if (!k.jump && p.vy < -4) p.vy += G * 0.6;   // let go early for a shorter hop

    p.vy = Math.min(p.vy + G, 16);
    const prevBottom = p.y + p.h;
    p.x += p.vx; p.y += p.vy;

    // walls: bounce off and keep most of your speed (great for big jumps)
    if (p.x < WALL) { p.x = WALL; if (Math.abs(p.vx) > 2) { p.vx = -p.vx * 0.85; p.face = 1; this.sfx.bounce(); } else p.vx = 0; }
    if (p.x + p.w > W - WALL) { p.x = W - WALL - p.w; if (Math.abs(p.vx) > 2) { p.vx = -p.vx * 0.85; p.face = -1; this.sfx.bounce(); } else p.vx = 0; }

    // landing: only when falling through a ledge top
    let landed = null;
    if (p.vy >= 0) {
      for (const L of this.ledges) {
        if (!L) continue;
        if (prevBottom <= L.y + 1 && p.y + p.h >= L.y && p.x + p.w > L.x + 4 && p.x < L.x + L.w - 4) { landed = L; break; }
      }
    }
    // trick animation (rotation for spins, horizontal squeeze for twirls)
    if (p.trick && p.air) {
      const T = p.trick; T.t += dt; const k = Math.min(1, T.t / T.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (T.type === 'spin') { p.rot = T.dir * Math.PI * 2 * T.turns * e; p.twirl = 1; }
      else { p.rot = 0; p.twirl = Math.cos(Math.PI * 2 * T.turns * e); }
    } else if (!p.trick) { p.rot = p.air ? Math.max(-0.25, Math.min(0.25, p.vx * 0.03)) : 0; p.twirl = 1; }

    if (landed) {
      const wasAir = p.air;
      p.y = landed.y - p.h; p.vy = 0; p.air = 0; p.rot = 0; p.twirl = 1; p.trick = null;
      if (wasAir) { p.squash = 0.4; this.land(landed); }
      p.ground = landed.i;
    } else if (!p.air && !this.onLedge()) p.air = 1;

    // camera: starts scrolling once you reach floor 5, speeds up every 30 seconds
    if (!this.scrolling && this.floor >= 5) { this.scrolling = true; this.scrollStart = this.time; this.speed = 0.7; this.level = 1; }
    if (this.scrolling) {
      const lvl = 1 + Math.floor((this.time - this.scrollStart) / 30);
      if (lvl > this.level) { this.level = lvl; this.hurry = 2.2; this.sfx.hurry(); }
      // speed grows with time and with each new level
      this.speed = Math.min(3.4, 0.7 + (this.level - 1) * 0.36 + this.zone * 0.22);
      this.camY -= this.speed;
    }
    const topZone = this.vh * 0.32;
    if (p.y - this.camY < topZone) this.camY = p.y - topZone;
    this.hurry = Math.max(0, this.hurry - dt);

    // keep ledges coming above the screen
    const need = Math.ceil((BASE - this.camY + 200) / GAP);
    for (let i = this.ledges.length; i <= need; i++) this.addLedge(i);

    // combo timer
    if (this.combo) { this.combo.timer -= dt; if (this.combo.timer <= 0) this.endCombo(); }

    p.squash *= 0.82; p.blink -= dt; if (p.blink < -3) p.blink = 0.12;
    this.shake *= 0.85;
    this.updateParticles(dt);

    // fell off the bottom
    if (p.y - this.camY > this.vh + 40) this.gameOver();
    if (Math.random() < 0.1) this.emitHud();
  }

  onLedge() {
    const p = this.player, L = this.ledges[p.ground];
    return L && p.x + p.w > L.x + 4 && p.x < L.x + L.w - 4 && Math.abs(p.y + p.h - L.y) < 2;
  }

  land(L) {
    const p = this.player, jumped = L.i - p.lastFloor;
    p.lastFloor = L.i;
    this.floor = L.i; this.maxFloor = Math.max(this.maxFloor, L.i);
    this.dust(p.x + p.w / 2, L.y, 4);
    if (jumped >= 2) {
      if (!this.combo) this.combo = { floors: 0, jumps: 0, timer: COMBO_TIME };
      this.combo.floors += jumped; this.combo.jumps += 1; this.combo.timer = COMBO_TIME;
      this.sfx.combo(this.combo.jumps);
      if (this.combo.jumps >= 2) this.popup(`${this.combo.floors} floors!`, p.x + p.w / 2, L.y - 40, '#ffe08a');
    } else if (jumped !== 0 && this.combo) this.endCombo();
    else this.sfx.land();
    const z = levelOf(L.i);
    if (z > this.zone) { this.zone = z; this.sfx.levelUp(); this.sfx.setZone(z); this.sparkle(W / 2, L.y, 40); }
    this.emitHud();
  }

  endCombo() {
    const c = this.combo; this.combo = null;
    if (!c || c.jumps < 2) return;
    const pts = c.floors * c.floors;
    this.comboPoints += pts; this.bestCombo = Math.max(this.bestCombo, c.floors);
    const p = this.player;
    this.popup(`Combo +${pts}`, p.x + p.w / 2, p.y - 30, '#7df9ff');
    this.sparkle(p.x + p.w / 2, p.y, 18);
    const line = this.sfx.comboEnd();
    if (line) this.popup(line, p.x + p.w / 2, p.y - 54, '#ffe08a');
  }

  get score() { return this.maxFloor * 10 + this.comboPoints; }

  gameOver() {
    if (this.combo) this.endCombo();
    this.state = 'over'; this.shake = 10;
    this.sfx.over(); this.sfx.duckMusic();
    const p = this.player;
    p.vy = 0; p.ground = this.floor;
    this.camY = Math.min(this.camY, this.ledges[this.floor].y - this.vh * 0.6);
    p.rot = 0; p.twirl = 1; p.trick = null;
    p.y = this.ledges[this.floor].y - p.h; p.x = Math.max(WALL, Math.min(W - WALL - p.w, this.ledges[this.floor].x + this.ledges[this.floor].w / 2 - p.w / 2));
    this.onOver({ score: this.score, floor: this.maxFloor, bestCombo: this.bestCombo, zone: this.zone, zoneName: LEVELS[this.zone].name });
  }

  emitHud() {
    this.onHud({ zone: this.zone, zoneName: LEVELS[this.zone].name, floor: this.maxFloor, score: this.score, combo: this.combo ? { floors: this.combo.floors, jumps: this.combo.jumps, t: this.combo.timer / COMBO_TIME } : null, hurry: this.hurry > 0, level: this.level });
  }

  // ---------- effects ----------
  dust(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: rand(-1.6, 1.6), vy: rand(-1.8, -0.3), life: 0.45, max: 0.45, r: rand(2, 4), c: 'rgba(255,236,210,' }); }
  sparkle(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: rand(-3, 3), vy: rand(-4, 0), life: 0.9, max: 0.9, r: rand(1.5, 3), c: 'rgba(255,224,138,' }); }
  popup(text, x, y, color) { this.popups.push({ text, x, y, color, life: 1.2 }); }
  updateParticles(dt) {
    for (const q of this.particles) { q.x += q.vx; q.y += q.vy; q.vy += 0.12; q.life -= dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const u of this.popups) { u.y -= 0.6; u.life -= dt; }
    this.popups = this.popups.filter((u) => u.life > 0);
  }

  // ---------- drawing ----------
  render(t) {
    const g = this.ctx, s = this.scale;
    g.setTransform(s, 0, 0, s, 0, 0);
    const shake = this.shake > 0.5 ? [rand(-this.shake, this.shake), rand(-this.shake, this.shake)] : [0, 0];
    const vw = this.vw, vh = this.vh;
    const height = Math.max(0, this.camY0 - this.camY) / GAP;   // floors climbed by the camera
    if (this.vw < W) {   // zoomed in: follow the climber sideways, smoothly
      const p = this.player, target = -Math.max(0, Math.min(W - vw, p.x + p.w / 2 - vw / 2));
      this.ox += (target - this.ox) * (this.state === 'playing' ? 0.12 : 1);
    }
    drawSky(g, vw, vh, height, t);
    drawBackdrop(g, vw, vh, this.camY - this.camY0, height, t);
    g.save(); g.translate(this.ox + shake[0], shake[1] - this.camY);
    drawWalls(g, W, this.camY, vh, WALL, height, (y) => levelOf(Math.floor((BASE - y) / GAP)), t);
    for (const L of this.ledges) if (L && L.y - this.camY > -40 && L.y - this.camY < vh + 60) drawLedge(g, L, t, height);
    drawParticles(g, this.particles);
    if (this.state !== 'menu') drawCharacter(g, this.player, t, this.state, this.character);
    for (const u of this.popups) {
      g.globalAlpha = Math.min(1, u.life * 2);
      g.font = '800 18px "DM Sans Variable", sans-serif'; g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = 'rgba(40,10,30,.55)'; g.strokeText(u.text, u.x, u.y);
      g.fillStyle = u.color; g.fillText(u.text, u.x, u.y);
      g.globalAlpha = 1;
    }
    g.restore();
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
