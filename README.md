# Tishaan’s Game Zone

[Open the Game Zone](https://divyankavdia.github.io/tishaan/)

A mobile game hub with illustrated game cards, instant launch, search, category filters, and a surprise-game button. The landing page works without JavaScript; JavaScript adds browsing controls and offline caching.

## The skill update

Ten complete games, each with touch and keyboard controls. The hub adds favorites, a daily game suggestion, a continue link, stage records and four achievements. These records stay on the current browser; no account or paid currency is required.

| Game | Campaign | New gameplay |
| --- | --- | --- |
| Avengers Arena | 12 tournament stages | Timed perfect parries, a short counterattack window, confirmed hit chains |
| Candy Pop | 36 puzzles / six worlds | Hints prioritize objectives; one saved rewind per board, including a losing final move |
| Chikoo & Bunty | 12 neighborhood runs | Jump and slide skill chains multiply points; brief jump buffering |
| Dragon Keep TD | 12 missions / four paths | First, strongest or nearest targeting; rank III armor piercing, freezing and wider blasts |
| Ghost Village | 12 defense missions | Frost shatter, three-ninja relay attacks, marked boss strikes and an enraged phase |
| Iron Citadel | Nine sectors | Rechargeable recon scan, map markers and stars for health, intel and accuracy |
| Iron Flight | 12 routes | Perfect ring centers, flight chains and a commander overdrive phase |
| Monterra Wilds | Six guardian sigils | Populated distant habitats, local/island radar, type hints, readable rival attacks and durable distant saves |
| World Strike | 12 missions | Timed active reloads, six empowered shots, cover combat and sentinel spread volleys |
| Pride Lands | 12 territories | Three lions, prey hunting, actual pride defense and telegraphed alpha pounces |

The six shared campaigns (Chase, Dragon Keep, Ghost Village, Iron Flight, World Strike and Pride Lands) also have live skill goals, enemy health bars where relevant, boss meters, left-handed touch layouts, reduced particles, a battery-saver option and opt-in standard gamepad support. They use fixed simulation steps and clear held inputs on pause. Enable the controller in Controls & comfort. Gamepad: left stick/D-pad moves, A acts, B uses a power, X uses the third skill, and Start pauses. In Dragon Keep, tap or click pads to build; controller buttons operate abilities but do not move a build cursor.

Nine games use real-time 3D scenes; Candy Pop uses an SVG puzzle board. The shared WebGL renderer provides lighting, shadows and atmospheric fog. These remain stylized procedural browser games, not photorealistic AAA productions. Cinematic covers are promotional artwork rather than gameplay screenshots.

Existing saves are preserved. Clearing site data removes local progress. Monterra now validates saves against its 220-unit island instead of silently moving distant players back to the old map boundary. The Field Guide suspends exploration, and leaving a duel cancels its pending turn callbacks.

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
| `tests/` | Combat, progression, catalog, navigation, and mobile browser checks |
| `AGENTS.md` | Instructions that keep future games listed on the hub |

## Publishing and offline use

GitHub Pages publishes the repository root from `main`. Commit the generated catalog before merging. A successful Pages deployment updates the same public Game Zone URL.

The installable hub and all ten games have separate offline caches. Visit a game online before playing it offline. Use the browser’s **Add to Home Screen** option where supported. `npm run build` fingerprints every game’s files and the shared renderer, regenerating each worker with its own cache prefix. A worker removes only older caches with its own prefix. HTML, scripts and styles use network-first updates with offline fallback; shared modules are precached by each game. No third-party runtime or CDN is required.

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
npm run test:features
```

Set `ARENA_BROWSER_PROFILE=phone`, `small-phone`, `landscape`, or `desktop` to check one gameplay layout. `ARENA_SOURCE_SITE=1` runs browser checks against the repository files rather than `dist/`.

Avengers Arena keyboard controls: arrows or A/D to move, Space/W to jump, J to strike, K for a special move, L/Shift to guard, and Escape to pause. All actions also have on-screen touch controls. Switching apps pauses the fight.

Iron Citadel uses original procedural pixel art and synthesized audio, with no external asset or runtime dependencies. Its browser checks cover desktop, 390px and 320px phones, landscape controls, and an offline hub/game round trip; its engine checks include traversing all three levels, weapons, collisions, enemy dodging, and progression.

Avengers Arena is an unofficial fan game. Character artwork and audio are drawn or synthesized in the browser; Marvel characters belong to their respective owners. Browser checks emulate devices and do not replace physical iPhone/Safari or Android testing.

The studio browser suite checks all ten games at desktop, phone, narrow-phone and landscape sizes using the built assets. `STUDIO_PROFILE` and `STUDIO_GAME` select a specific profile or game. Existing browser suites exercise real touch input, full combat rounds, puzzle interactions and offline round trips.

The skill-update rule tests cover parry timing, repeat reloads, undo/save consistency, target priorities, team combinations, the lion campaign, recon cooldowns, expanded-world saves, hazards and per-difficulty records. Browser checks use the built site and can serve files through Playwright routing when a local HTTP listener is unavailable. Set `PLAYWRIGHT_MODULE_PATH` and `ARENA_CHROMIUM_EXECUTABLE` when using preinstalled browser tooling.
