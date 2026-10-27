import { useEffect, useRef, useState } from 'react';
import { Game } from './game.js';
import { CHARACTERS } from './characters.js';
import Preview from './Preview.jsx';

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

  // the controls take room on phones while playing, so re-measure the canvas when the screen changes
  useEffect(() => { requestAnimationFrame(() => game.current && game.current.resize()); }, [screen]);

  function play() { game.current.start(); setResult(null); setScreen('playing'); }
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
  const hold = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game.current.setKey(k, true); },
    onPointerUp: () => game.current.setKey(k, false), onPointerCancel: () => game.current.setKey(k, false), onLostPointerCapture: () => game.current.setKey(k, false),
    onContextMenu: (e) => e.preventDefault()
  });

  async function share() {
    const who = CHARACTERS.find((c) => c.id === character)?.name || 'my climber';
    const text = `I climbed ${result.floor} floors with ${who} in Rooftop Hop, all the way to ${result.zoneName} (score ${result.score}). Can you beat it?`;
    const url = 'https://hop.gigimostafa.com';
    try {
      if (navigator.share && touch.current) await navigator.share({ title: 'Rooftop Hop', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch (e) {}
  }

  const newBest = result && best && result.score >= best.score && result.score > 0;

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="logo" aria-hidden="true" /> Rooftop Hop</div>
        <div className="top-right">
          <button className="icon" onClick={toggleMute} aria-label={muted ? 'Sound on' : 'Mute'}>
            {muted ? <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>}
          </button>
          <a className="by" href="https://gigimostafa.com" target="_blank" rel="noopener">by Gigi Mostafa ↗</a>
        </div>
      </header>

      <main className="stage">
        <div className="frame">
          <canvas ref={canvas} className="screen" />

          {screen === 'playing' && (
            <div className="hud">
              <div className="stat"><small>Floor</small><b>{hud.floor}</b></div>
              {hud.combo && hud.combo.jumps >= 1 && (
                <div className="combo"><span>Combo {hud.combo.floors}</span><i style={{ width: `${hud.combo.t * 100}%` }} /></div>
              )}
              <div className="stat right"><small>Score</small><b>{hud.score}</b></div>
              {hud.hurry && <div className="hurry">Faster!</div>}
              {banner && <div className="banner" key={banner.n}><small>Level {banner.n}</small><b>{banner.name}</b></div>}
            </div>
          )}

          {screen === 'menu' && (
            <div className="overlay menu">
              <p className="kicker">An endless climb over Cairo</p>
              <h1>Rooftop<br />Hop</h1>
              <p className="pick-label">Choose your climber</p>
              <div className="chars" role="radiogroup" aria-label="Choose your climber">
                {CHARACTERS.map((c) => (
                  <button key={c.id} role="radio" aria-checked={character === c.id} className={character === c.id ? 'on' : ''} onClick={() => pick(c.id)}>
                    <Preview id={c.id} active={character === c.id} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
              <button className="go" onClick={play}>
                <span className="go-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg></span>
                Play
              </button>
              <p className="keys">{touch.current ? 'Hold the arrows to run, tap Jump.' : 'Arrows or A / D to run, Space to jump.'} Run fast for bigger jumps, bounce off walls, and jump 2+ floors for combos.</p>
              {best && <p className="best">Best: floor {best.floor} · {best.score} pts</p>}
            </div>
          )}

          {screen === 'over' && result && (
            <div className="overlay over">
              <p className="kicker">{newBest ? 'New best!' : 'You fell off the roof'}</p>
              <h2>Floor {result.floor}</h2>
              <p className="reached">Reached level {result.zone + 1}: {result.zoneName}</p>
              <div className="results">
                <div><small>Score</small><b>{result.score}</b></div>
                <div><small>Combo</small><b>{result.bestCombo || 0}</b></div>
                <div><small>Best</small><b>{best ? best.score : result.score}</b></div>
              </div>
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
                  <span className="go-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9" /><path d="M4 4v4.5h4.5" /></svg></span>
                  Play again
                </button>
                <button className="ghost" onClick={share} aria-label="Share your score">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" /></svg>
                  {copied ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          )}
        </div>

        {screen === 'playing' && (
          <div className="pad" aria-label="Controls">
            <div className="dirs">
              <button className="key" {...hold('left')} aria-label="Run left"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
              <button className="key" {...hold('right')} aria-label="Run right"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
            </div>
            <button className="key jump" {...hold('jump')}>Jump</button>
          </div>
        )}
      </main>
    </div>
  );
}
