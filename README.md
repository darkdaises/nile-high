# Rooftop Hop

An endless climb from the rooftops of Cairo to the pyramids and the stars. A tiny game by [Gigi Mostafa](https://gigimostafa.com).

- **Run** to build speed; the faster you run, the higher you jump. **Bounce off the walls** to keep your speed.
- Once you start climbing the city scrolls up, and it speeds up every 30 seconds and at every new level. Fall off the bottom and it's over.
- Jump **2+ floors** at once to start a combo; chain big jumps before the timer runs out. Combo points = floors².
- **Six climbers**: Blobby, Mau the cat, Scarab, Baby camel, Mini mummy, Fennec fox.
- **Five worlds**, one every 25 floors: Cairo Rooftops → The Desert Road → Pyramids of Giza → Temple of the Stars → Above the Nile.

Everything (art and sound) is drawn and synthesized in code; there are no image or audio files.

Controls: arrows or A/D to run, Space/Up/W to jump. On phones: on-screen arrows and Jump.

## Run it
```
npm install
npm run dev
```

## Deploy (Cloudflare Pages)
Framework preset: None · Build command: `npm run build` · Output directory: `dist`

## Files
- `src/game.js` physics, camera, ledges, combos, scoring
- `src/draw.js` the sky, the five worlds, walls, ledges, props
- `src/characters.js` the six climbers
- `src/levels.js` level names and props
- `src/sfx.js` synthesized sound effects
- `src/App.jsx` screens, HUD, touch controls
