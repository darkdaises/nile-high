import { useEffect, useRef, useState } from 'react';
import { Game } from './game.js';
import { CHARACTERS } from './characters.js';
import Preview from './Preview.jsx';
import { LEVELS, LEVEL_FLOORS, levelOf } from './levels.js';

const readBest = () => { try { return JSON.parse(localStorage.getItem('hop-best') || 'null'); } catch (e) { return null; } };
const saveBest = (b) => { try { localStorage.setItem('hop-best', JSON.stringify(b)); } catch (e) {} };
const readChar = () => { try { const c = localStorage.getItem('hop-char'); return CHARACTERS.some((x) => x.id === c) ? c : 'blob'; } catch (e) { return 'blob'; } };

export default function App() {
  const canvas = useRef(null), game = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState({ floor: 0, score: 0, combo: null, hurry: false });
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(readBest);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [character, setCharacter] = useState(readChar);
  const [banner, setBanner] = useState(null);
  const touch = useRef(typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches);
  // phones: tilt to run, tap anywhere to jump (like Icy Tower on mobile). Falls back to arrow buttons
  // if the phone doesn't share its tilt (or the player says no to the permission prompt).
  const [ctl, setCtl] = useState('tilt');
  const [hint, setHint] = useState(false);
  const tiltAsked = useRef(false);

  useEffect(() => {
    const g = game.current = new Game(canvas.current, setHud, (r) => {
      setResult(r); setScreen('over');
      setBest((b) => { const nb = !b || r.score > b.score ? { score: r.score, floor: r.floor } : b; saveBest(nb); return nb; });
    });
    setMuted(g.sfx.muted);
    g.character = readChar();
    if (/[?&]debug\b/.test(location.search)) window.__hop = g;   // for automated tests only
    const onResize = () => g.resize();
    addEventListener('resize', onResize);
    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump' };
    const down = (e) => {
      const k = map[e.code];
      if ((e.code === 'Space' || e.code === 'Enter') && g.state !== 'playing') { e.preventDefault(); play(); return; }
      if (k) { e.preventDefault(); g.setKey(k, true); }
    };
    const up = (e) => { const k = map[e.code]; if (k) g.setKey(k, false); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('resize', onResize); removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  function play() {
    if (touch.current && !tiltAsked.current) enableTilt();
    game.current.start(); setResult(null); setScreen('playing');
    if (touch.current) { setHint(true); setTimeout(() => setHint(false), 3200); }
  }

  // must run inside the tap on Play: iPhones only ask for motion permission from a tap
  function enableTilt() {
    tiltAsked.current = true;
    const D = window.DeviceOrientationEvent;
    if (!D) { setCtl('buttons'); return; }
    const listen = () => {
      let got = false;
      addEventListener('deviceorientation', (e) => {
        if (e.gamma == null) return;
        if (!got) { got = true; setCtl('tilt'); }
        const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
        const a = ang === 90 ? e.beta : (ang === -90 || ang === 270) ? -e.beta : e.gamma;
        const dead = 4, full = 24;   // degrees: ignore a slight lean, full speed at about 24
        const m = Math.min(1, Math.max(0, Math.abs(a) - dead) / (full - dead));
        game.current.tilt = game.current.state === 'playing' ? Math.sign(a) * m : 0;
      });
      setTimeout(() => { if (!got) setCtl('buttons'); }, 1500);
    };
    if (typeof D.requestPermission === 'function') {
      D.requestPermission().then((r) => (r === 'granted' ? listen() : setCtl('buttons'))).catch(() => setCtl('buttons'));
    } else listen();
  }
  function pick(id) { setCharacter(id); game.current.character = id; try { localStorage.setItem('hop-char', id); } catch (e) {} }

  // a banner each time you reach a new level
  useEffect(() => {
    if (screen !== 'playing' || !hud.zone) return;
    setBanner({ n: hud.zone + 1, name: hud.zoneName });
    const id = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(id);
  }, [hud.zone]);
  useEffect(() => { if (screen !== 'playing') setBanner(null); }, [screen]);

  function toggleMute() { const m = !muted; setMuted(m); game.current.sfx.setMuted(m); }
  // tap anywhere on the game to jump (hold for a higher jump)
  const tapJump = {
    onPointerDown: (e) => { e.preventDefault(); game.current.setKey('jump', true); },
    onPointerUp: () => game.current.setKey('jump', false), onPointerCancel: () => game.current.setKey('jump', false),
    onContextMenu: (e) => e.preventDefault()
  };
  const hold = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game.current.setKey(k, true); },
    onPointerUp: () => game.current.setKey(k, false), onPointerCancel: () => game.current.setKey(k, false), onLostPointerCapture: () => game.current.setKey(k, false),
    onContextMenu: (e) => e.preventDefault()
  });

  async function share() {
    const who = CHARACTERS.find((c) => c.id === character)?.name || 'my climber';
    const text = `I climbed ${result.floor} floors with ${who} in Nile High, all the way to ${result.zoneName} (score ${result.score}). Can you beat it?`;
    const url = 'https://nilehigh.gigimostafa.com';
    try {
      if (navigator.share && touch.current) await navigator.share({ title: 'Nile High', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch (e) {}
  }

  const newBest = result && best && result.score >= best.score && result.score > 0;
  const howTo = touch.current
    ? [['tilt', 'Tilt your phone', 'to run left and right'], ['tap', 'Tap anywhere', 'to jump, hold to jump higher'], ['fast', 'Run fast', 'for bigger jumps and flips'], ['combo', 'Skip floors', 'to build combos']]
    : [['keys', '← → or A D', 'to run'], ['space', 'Space', 'to jump, hold to jump higher'], ['fast', 'Run fast', 'for bigger jumps and flips'], ['combo', 'Skip floors', 'to build combos']];

  const muteBtn = (
    <button className="icon" onClick={toggleMute} aria-label={muted ? 'Sound on' : 'Mute'}>
      {muted ? <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
        : <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>}
    </button>
  );

  return (
    <div className={`app is-${screen}`}>
      {/* the game fills the whole screen; everything else floats on top, lined up with the tower */}
      <canvas ref={canvas} className="screen" />

      {screen !== 'playing' && (
        <header className="top">
          <div className="brand"><span className="logo" aria-hidden="true" /> Nile High</div>
          <div className="top-right">
            {muteBtn}
            <a className="by" href="https://gigimostafa.com" target="_blank" rel="noopener">by Gigi Mostafa ↗</a>
          </div>
        </header>
      )}

      {screen === 'playing' && (
        <div className="col hud">
          <div className="stat"><small>Floor</small><b>{hud.floor}</b></div>
          <div className="mid">
            {hud.combo && hud.combo.jumps >= 1 && (
              <div className="combo"><span>Combo {hud.combo.floors}</span><i style={{ width: `${hud.combo.t * 100}%` }} /></div>
            )}
          </div>
          <div className="stat right"><small>Score</small><b>{hud.score}</b></div>
          <div className="hud-mute">{muteBtn}</div>
          {hud.hurry && <div className="hurry">Faster!</div>}
          {banner && <div className="banner" key={banner.n}><small>Level {banner.n}</small><b>{banner.name}</b></div>}
        </div>
      )}

      {screen === 'menu' && (
        <div className="overlay">
          <div className="col sheet menu">
            <p className="kicker">An endless climb over Cairo</p>
            <Title />
            {best && best.floor > 0 && <Record best={best} />}
            <p className="pick-label">Choose your climber</p>
            <div className="chars" role="radiogroup" aria-label="Choose your climber">
              {CHARACTERS.map((c) => (
                <button key={c.id} role="radio" aria-checked={character === c.id} className={character === c.id ? 'on' : ''} onClick={() => pick(c.id)} title={c.about}>
                  <Preview id={c.id} active={character === c.id} />
                  <span>{c.name}</span>
                  <em>{c.about}</em>
                </button>
              ))}
            </div>
            <button className="go" onClick={play}>
              Play
            </button>
            <section className="howto" aria-labelledby="howto-h">
              <h3 id="howto-h">How to play</h3>
              <ul>
                {howTo.map(([icon, b, rest]) => (
                  <li key={icon}><HowIcon k={icon} /><span><b>{b}</b> {rest}</span></li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {screen === 'over' && result && (
        <div className="overlay">
          <div className="col sheet over">
            <p className="kicker">{newBest ? 'New best!' : 'You fell off the roof'}</p>
            <h2>Floor {result.floor}</h2>
            <p className="reached">Reached level {result.zone + 1}: {result.zoneName}</p>
            <div className="results">
              <div><small>Score</small><b>{result.score}</b></div>
              <div><small>Best combo</small><b>{result.bestCombo || 0}</b></div>
            </div>
            {best && <Record best={best} now={result.floor} fresh={newBest} />}
            <p className="pick-label">Switch climber</p>
            <div className="chars mini" role="radiogroup" aria-label="Switch climber">
              {CHARACTERS.map((c) => (
                <button key={c.id} role="radio" aria-checked={character === c.id} className={character === c.id ? 'on' : ''} onClick={() => pick(c.id)} aria-label={c.name} title={c.name}>
                  <Preview id={c.id} active={character === c.id} />
                </button>
              ))}
            </div>
            <div className="row">
              <button className="go" onClick={play}>
                Play again
              </button>
              <button className="ghost" onClick={share} aria-label="Share your score">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" /></svg>
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'playing' && touch.current && (
        <div className="tapzone" {...tapJump} aria-hidden="true" />
      )}
      {screen === 'playing' && touch.current && ctl === 'buttons' && (
        <div className="col pad" aria-label="Controls">
          <div className="dirs">
            <button className="key" {...hold('left')} aria-label="Run left"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
            <button className="key" {...hold('right')} aria-label="Run right"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      )}
      {screen === 'playing' && hint && (
        <div className="hint-wrap" aria-live="polite"><div className="hint">
          {ctl === 'tilt' ? <><HowIcon k="tilt" /><span><b>Tilt</b> to run · <b>tap</b> to jump</span></> : <><HowIcon k="tap" /><span><b>Arrows</b> to run · <b>tap</b> anywhere to jump</span></>}
        </div></div>
      )}
    </div>
  );
}

function Title() {
  return <h1 className="title" aria-label="Nile High"><span className="t-wrap" aria-hidden="true"><span className="t-back">Nile High</span><span className="t-front">Nile High</span></span></h1>;
}

// Your best climb, shown as the tower: one block per level, filled up to your best floor.
function Record({ best, now, fresh }) {
  const lvl = levelOf(best.floor), top = LEVELS.length * LEVEL_FLOORS;
  const pct = (f) => Math.min(100, (f / top) * 100);
  return (
    <div className={`record ${fresh ? 'fresh' : ''}`}>
      <div className="rec-text">
        <small>{fresh ? 'New personal best' : 'Your best'}</small>
        <b>Floor {best.floor}</b>
        <span>{LEVELS[lvl].name} · {best.score.toLocaleString()} pts</span>
      </div>
      <div className="rec-tower" aria-hidden="true">
        {LEVELS.map((L, i) => <i key={i} className={i < lvl ? 'done' : i === lvl ? 'here' : ''} title={L.name} />)}
        <em className="rec-fill" style={{ height: `${pct(best.floor)}%` }} />
        {now !== undefined && !fresh && <em className="rec-now" style={{ bottom: `${pct(now)}%` }} />}
      </div>
    </div>
  );
}

function HowIcon({ k }) {
  const p = {
    tilt: <><rect x="8.5" y="4" width="7" height="13" rx="1.6" transform="rotate(-16 12 10.5)" /><path d="M4.5 7.5a9 9 0 0 0 0 8M19.5 7.5a9 9 0 0 1 0 8M3 13.8l1.5 1.7 1.7-1.4M21 13.8l-1.5 1.7-1.7-1.4" /></>,
    tap: <><circle cx="12" cy="9" r="3" /><path d="M12 3v1M6.5 5.5l.7.7M17.5 5.5l-.7.7M5 21c1-4 3.5-6 7-6s6 2 7 6" /></>,
    keys: <><rect x="2" y="7" width="9" height="10" rx="2" /><rect x="13" y="7" width="9" height="10" rx="2" /><path d="M8 12H5M6.5 10.5 5 12l1.5 1.5M16 12h3M17.5 10.5 19 12l-1.5 1.5" /></>,
    space: <><rect x="2" y="8" width="20" height="8" rx="2" /><path d="M7 12h10" /></>,
    fast: <><path d="M3 8h7M2 12h6M3 16h7" /><path d="M13 18c1-5 3-9 8-12" /></>,
    combo: <><path d="M4 20h4v-4h4v-4h4V8h4" /><path d="M14 4h6v6" /></>
  }[k];
  return <svg className="how-icon" viewBox="0 0 24 24" aria-hidden="true">{p}</svg>;
}
