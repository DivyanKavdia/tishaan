# Tishaan’s Game Zone

[Open the Game Zone](https://divyankavdia.github.io/tishaan/)

A mobile game hub with illustrated game cards, instant launch, search, category filters, and a surprise-game button. The landing page works without JavaScript; JavaScript adds browsing controls and offline caching.

## Reimagined collection

| Game | Progression | Choices and gameplay |
| --- | --- | --- |
| Avengers Arena | 12 tournament stages | Four heroes, three combat perks, quick battles, three difficulties |
| Candy Pop | 36 levels / six worlds | Three challenges, recipes, double-layer jelly, combos and boosters |
| Chikoo & Bunty | 12 neighborhood runs | Two brothers, three lanes, jumping, sliding and protective dash |
| Dragon Keep TD | 12 missions / four paths | Three tower types, upgrades, selling, armor, slowing and meteor |
| Ghost Village | 12 defense missions | Three switchable ninjas, companion AI, independent powers, shrine defense |
| Iron Citadel | Nine sectors | First-person 3D, three weapons, ammunition, keys, three difficulties |
| Iron Flight | 12 routes | Three suit modules, free steering, homing fire, shields and boss encounters |
| Monterra Wilds | Six guardian sigils | Fifteen creature forms, capture/evolution, guarding, switching and three challenges |
| World Strike | 12 missions | Four weapons, cover, reloads, EMP and escalating robot waves |

Eight games render real-time 3D scenes; Candy Pop uses a polished SVG puzzle board. The lightweight shared WebGL renderer provides directional lighting, soft shadow maps, surface variation, tone mapping and atmospheric fog. Five new campaigns include a battery-saver setting. These are procedural browser games with stylized geometry, not photorealistic AAA games. Cinematic AI-generated cover artwork is promotional art rather than gameplay screenshots.

Keyboard and touch controls are explained in each game. Progress is stored on this browser/device; clearing site data removes it. Existing Candy Pop, Iron Citadel and Monterra saves are preserved. The new 12-mission campaigns use their own progression stores.

## Develop

Requires Node.js 20 or newer. No dependency installation is needed for the site, build, or engine/catalog tests.

```sh
npm start
npm test
npm run build
```

`npm start` refreshes the catalog and serves the project at `http://localhost:4173`. `npm run build` validates every game, updates the root landing page and catalog, and copies the complete site to `dist/`. Serve that directory with `npm run preview`.

## Add a game

1. Create `games/<slug>/index.html` and its mobile-friendly game assets. Use relative links and include a visible `../../` link back to the Game Zone.
2. Add an icon, a cover illustration, and `game.json` in that folder:

```json
{
  "name": "Your Game",
  "description": "A short description of the adventure.",
  "category": "Puzzle",
  "players": "Solo",
  "detail": "Quick rounds",
  "icon": "icon.svg",
  "cover": "cover.png",
  "featured": false
}
```

3. Run `npm run build`. It discovers all game folders and generates the cards, category buttons, game count, links, and `games/catalog.json`. Missing metadata or files fail the build so a game cannot be silently omitted.
4. Test launching and returning on a phone-sized viewport. Commit the game **and** the generated changes to `index.html` and `games/catalog.json`.

Each game appears automatically from its metadata; the hub code needs no game-specific edits. Set `featured: true` to put a game first. Do not list games until they are playable.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page with generated game cards |
| `assets/` | Hub styles and behavior |
| `studio/` | Shared 3D renderer, models, campaign shell, input, progression and offline worker |
| `games/<slug>/` | An independent game, metadata, and artwork |
| `games/catalog.json` | Generated catalog, also used to cache card artwork |
| `scripts/catalog.mjs` | Game discovery, validation, and listing generation |
| `scripts/build.mjs` | Complete static-site build |
| `tests/` | Combat, catalog, navigation, and mobile browser checks |
| `AGENTS.md` | Instructions that keep future games listed on the hub |

## Publishing and offline use

GitHub Pages publishes the repository root from `main`. Commit the generated catalog before merging. A successful Pages deployment updates the same public Game Zone URL.

The hub and all nine games have separate offline caches and manifests. Visit a game online before playing it offline. Use the browser’s **Add to Home Screen** option where supported. `npm run build` fingerprints every game’s files and the shared renderer, regenerating each worker with its own cache prefix. A worker removes only older caches with its own prefix. HTML, scripts and styles use network-first updates with offline fallback; shared modules are precached by each game. No third-party runtime or CDN is required.

## Verification

```sh
npm test
npm run build
```

Optional browser checks use Playwright and Chromium:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:hub
npm run test:browser
npm run test:citadel
npm run test:candy
npm run test:studio
```

Set `ARENA_BROWSER_PROFILE=phone`, `small-phone`, `landscape`, or `desktop` to check one gameplay layout. `ARENA_SOURCE_SITE=1` runs browser checks against the repository files rather than `dist/`.

Avengers Arena keyboard controls: arrows or A/D to move, Space/W to jump, J to strike, K for a special move, L/Shift to guard, and Escape to pause. All actions also have on-screen touch controls. Switching apps pauses the fight.

Iron Citadel uses original procedural pixel art and synthesized audio, with no external asset or runtime dependencies. Its browser checks cover desktop, 390px and 320px phones, landscape controls, and an offline hub/game round trip; its engine checks include traversing all three levels, weapons, collisions, enemy dodging, and progression.

Avengers Arena is an unofficial fan game. Character artwork and audio are drawn or synthesized in the browser; Marvel characters belong to their respective owners. Browser checks emulate devices and do not replace physical iPhone/Safari or Android testing.

The studio browser suite checks all nine games at desktop, phone, narrow-phone and landscape sizes using the built assets. `STUDIO_PROFILE` and `STUDIO_GAME` select a specific profile or game. Existing browser suites exercise real touch input, full combat rounds, puzzle interactions and offline round trips.
