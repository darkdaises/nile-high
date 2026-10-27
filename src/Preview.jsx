import { useEffect, useRef } from 'react';
import { drawCharacter } from './characters.js';

// A little live preview of a climber, hopping in place
export default function Preview({ id, active }) {
  const ref = useRef(null), live = useRef(active);
  live.current = active;
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = 72 * dpr; c.height = 64 * dpr;
    const p = { x: 19, y: 26, w: 34, h: 30, vx: 0, vy: 0, squash: 0, blink: 0, face: 1 };
    let raf, t0 = performance.now(), floor = 56, rest = 0;
    const frame = (now) => {
      const t = (now - t0) / 1000;
      // selected climber: a small, slow hop about once a second, resting on the ground in between
      if (live.current) {
        if (p.y + p.h < floor || p.vy < 0) { p.vy += 0.22; p.y += p.vy; if (p.y + p.h >= floor) { p.y = floor - p.h; p.vy = 0; p.squash = 0.22; rest = t; } }
        else if (t - rest > 0.7) { p.vy = -3.4; p.squash = -0.15; }
      } else { p.y = floor - p.h; p.vy = 0; }
      p.squash *= 0.82; p.vx = Math.sin(t * 1.3) * 3; p.blink = (t % 3.2) < 0.12 ? 1 : 0; p.face = p.vx >= 0 ? 1 : -1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 72, 64);
      drawCharacter(g, p, t, 'menu', id);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} className="preview" aria-hidden="true" />;
}
