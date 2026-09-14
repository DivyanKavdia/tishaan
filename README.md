# Avengers Arena

A small mobile browser fighting game. Pick Iron Man, Captain America, Thor, or Hulk and fight an AI opponent on the Stark Tower rooftop.

Touch controls support moving and attacking at the same time. Each hero has a different special move, health, speed, and attack strength. Three difficulty levels, 75-second rounds, combos, guard, optional sound, pause, and rematches are included.

## Play locally

With Node.js 20 or newer:

```sh
npm start
```

Open `http://localhost:4173`. No dependency installation is needed to run, build, or test the game engine.

For a portable copy:

```sh
npm run build
```

Open `dist/index.html` directly in a browser. The game logic, styles, and artwork are contained in that file. To host the game, serve the complete `dist/` directory over HTTPS. The accompanying manifest, icons, and service worker support home-screen installation and offline use after the first online visit. Service workers do not run from a downloaded `file://` page; the portable game itself still works offline.

On a hosted version, use your phone browser’s **Add to Home Screen** option. Full-screen mode is also available where the browser supports it. Switching apps pauses the battle; resume when you return.

## Controls

| Action | Phone | Keyboard |
| --- | --- | --- |
| Move | Hold left/right arrows | Left/right arrows or A/D |
| Jump | Up arrow | Space, W, or up arrow |
| Strike | Strike button | J |
| Special | Special button | K |
| Guard | Hold guard | Hold L or Shift |
| Pause | Pause button | Escape |

Melee strikes need close range. Energy regenerates, and specials spend it. Blocking reduces damage but also costs energy. At the end of the timer, the higher **remaining health percentage** wins, accounting for heroes with different maximum health.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Responsive character selection, arena, and controls |
| `src/engine.js` | Combat rules, collision, AI, damage, and match results |
| `src/art.js` | Original canvas character drawings, rooftop, and effects |
| `src/game.js` | Input, animation, sound, menus, and browser lifecycle |
| `scripts/build.mjs` | Bundles a portable HTML file without third-party build tools |
| `sw.js`, `manifest.webmanifest` | Hosted offline cache and home-screen support |
| `tests/` | Engine and browser interaction tests |

## Verify

```sh
npm test
npm run build
```

The engine suite checks damage, blocking, all special moves, input buffering, jumps, boundaries, energy, draws, time-outs, knockouts, and 48 hero/difficulty matchups.

Optional browser tests require Playwright and Chromium:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

The browser suite checks 390 × 844 and 320 × 568 phones, 844 × 390 landscape, and desktop. It exercises simultaneous touch inputs, pointer cancellation, keyboard controls, menus, sound, automatic pause, offline reload, a complete round, and rematch. These are Chromium emulation checks; physical iPhone/Safari and Android device testing remains useful before a broader release.

This is a local single-player game, with no account, backend, multiplayer, analytics, or external asset downloads. Character artwork and sounds are drawn or synthesized in the browser. It is an unofficial fan game; Marvel characters belong to their respective owners.
