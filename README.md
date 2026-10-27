# Nile High

An endless climb from the rooftops of Cairo to the pyramids and the stars. A tiny game by [Gigi Mostafa](https://gigimostafa.com).

- **Run** to build speed; the faster you run, the higher you jump. **Bounce off the walls** to keep your speed.
- Once you start climbing the city scrolls up, and it speeds up every 30 seconds and at every new level. Fall off the bottom and it's over.
- Jump **2+ floors** at once to start a combo; chain big jumps before the timer runs out. Combo points = floors².
- **Six climbers**: Mishmish (a blob), Bosbos (a Cairo street cat), Khepri (a scarab), Gamal (a baby camel), Tut (a tiny mummy), Zizo (a fennec fox).
- **Tricks**: fast jumps twirl, big ones spin, and during a combo you pull a double flip.
- **Sound**: a darbuka playing maqsum, an oud-style melody in maqam Hijaz, and ambience per level (Cairo horns, desert wind, a temple hum, Nile crickets). A zaghrouta for every new level, and an Egyptian Arabic line when you fall (spoken if the device has an Arabic voice).
- **Full screen** on phones; on wide screens the tower stays centered with the scenery around it.
- **Five worlds**, one every 25 floors: Cairo Rooftops → The Desert Road → Pyramids of Giza → Temple of the Stars → Above the Nile.

Everything (art and sound) is drawn and synthesized in code; there are no image or audio files.

Controls: arrows or A/D to run, Space/Up/W to jump. On phones: ◀ ▶ to run and ▲ to jump.

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
- `src/sfx.js` sound effects, the Arabic voice line
- `src/music.js` the Cairo music, ambience and the zaghrouta
- `src/App.jsx` screens, HUD, touch controls
