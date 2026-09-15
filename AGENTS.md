# Tishaan’s Game Zone

The user wants this repository to host many mobile browser games.

- Keep the root `index.html` as the **Tishaan’s Game Zone** landing page. Never replace it with an individual game.
- Put every game in `games/<slug>/`, with its own `index.html`, relative assets, and a visible link back to `../../`.
- Whenever creating a new game, add its `game.json` metadata, icon, and cover. Run `npm run build` and commit the generated landing-page listings and `games/catalog.json` with the game. Listing new games on the landing page is part of completing the game.
- The catalog generator discovers game folders and rejects missing metadata, entry pages, icons, or covers. Do not manually maintain duplicate lists of games or add unplayable placeholders to the catalog.
- Keep games usable with mobile touch controls and on desktop. Check narrow phone layouts, launching from the hub, and returning to the hub.
- Games must use separate service-worker scopes and cache names. Never clear another game's cache. The build fingerprints hub assets and the catalog to refresh its offline cache automatically. Bump an individual game’s worker version when that game’s offline assets change.
- Preserve Avengers Arena combat and controls when changing the hub. Verify with `npm test`, `npm run build`, and the relevant browser tests.
- GitHub Pages publishes `main` from the repository root, so generated files must be committed. Keep `.nojekyll`.

See README.md for the metadata format, project structure, and verification commands.
