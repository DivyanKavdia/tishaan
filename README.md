# Tishaan’s Game Zone

[Open the Game Zone](https://divyankavdia.github.io/tishaan/)

A mobile game hub with illustrated game cards, instant launch, search, category filters, and a surprise-game button. The landing page works without JavaScript; JavaScript adds browsing controls and offline caching.

## Games

- [Candy Pop](https://divyankavdia.github.io/tishaan/games/candy-pop/): a candy match-three adventure with 24 levels, striped and wrapped candies, rainbow bombs, special combinations, jelly goals, free hints, two boosters of each type per level, and saved progress. Swipe or tap adjacent candies; keyboard users can select with Space/Enter or swap with Shift + arrows. Visit online once for offline play. Progress stays in the current browser; private browsing or cleared site data can remove it.
- [Iron Citadel](https://divyankavdia.github.io/tishaan/games/iron-citadel/): a retro first-person shooter with three fortress missions, robot sentries, a final boss, gold keys, a sidearm, a repeater, and an unlimited shock tool. Touch and desktop controls, two difficulties, mission unlocks, sound, and offline play.

- [Avengers Arena](https://divyankavdia.github.io/tishaan/games/avengers-arena/): choose Iron Man, Captain America, Thor, or Hulk and fight an AI opponent. Includes touch controls, special moves, three difficulties, 75-second rounds, sound, pause, and rematches.

Iron Citadel controls: WASD moves, arrow keys or mouse drag turn, Space/click fires, E opens doors/exits, R reloads, 1/2/3 or Q changes weapons, M expands the explored map, and Escape pauses. Phones use a movement stick, drag-to-look, and Fire/Open buttons. Complete a mission to save its successor as an unlocked starting point. Switching apps pauses the mission. The game has its own offline worker; visit it online once before playing offline.

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
| `assets/` | Hub styles, behavior, and controller illustration |
| `games/<slug>/` | An independent game, metadata, and artwork |
| `games/catalog.json` | Generated catalog, also used to cache card artwork |
| `scripts/catalog.mjs` | Game discovery, validation, and listing generation |
| `scripts/build.mjs` | Complete static-site build |
| `tests/` | Combat, catalog, navigation, and mobile browser checks |
| `AGENTS.md` | Instructions that keep future games listed on the hub |

## Publishing and offline use

GitHub Pages publishes the repository root from `main`. Commit the generated catalog before merging. A successful Pages deployment updates the same public Game Zone URL.

The hub and Avengers Arena have separate installable manifests and offline caches. Visit a game online before playing it offline. Use your phone browser’s **Add to Home Screen** option for the hub or an individual game. The hub worker removes only the obsolete root Avengers caches from the previous site layout; it leaves the relocated game's cache intact. The build automatically fingerprints hub assets and catalog artwork to refresh the hub cache. Bump an individual game’s worker version when its offline assets change.

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
```

Set `ARENA_BROWSER_PROFILE=phone`, `small-phone`, `landscape`, or `desktop` to check one gameplay layout. `ARENA_SOURCE_SITE=1` runs browser checks against the repository files rather than `dist/`.

Avengers Arena keyboard controls: arrows or A/D to move, Space/W to jump, J to strike, K for a special move, L/Shift to guard, and Escape to pause. All actions also have on-screen touch controls. Switching apps pauses the fight.

Iron Citadel uses original procedural pixel art and synthesized audio, with no external asset or runtime dependencies. Its browser checks cover desktop, 390px and 320px phones, landscape controls, and an offline hub/game round trip; its engine checks include traversing all three levels, weapons, collisions, enemy dodging, and progression.

Avengers Arena is an unofficial fan game. Character artwork and audio are drawn or synthesized in the browser; Marvel characters belong to their respective owners. Browser checks emulate devices and do not replace physical iPhone/Safari or Android testing.
