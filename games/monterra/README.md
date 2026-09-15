# Monterra Wilds 3.0

An original, stylized 3D creature adventure for Tishaan's Game Zone. This is not a photorealistic game, a multiplayer game, or an official Pokemon game.

## Play

Choose Flame, Leaf or Tide as a starter. Move with WASD/arrow keys, a held touch joystick, or tap-to-walk. Approach a creature and press E or Encounter. Quick strikes charge a signature attack. Weaken wild creatures before throwing capture orbs. Switch the lead in Team. Evolution becomes available at levels 7 and 12. Earn the Grove, Tide and Ember guardian sigils in that order; guardians cannot be caught. Camp heals the team and restores a minimum of 12 orbs and 5 potions. Crystal pickups add three orbs.

## Implementation

- `engine.js`: batched WebGL geometry, lighting, camera and projection, plus a depth-buffered Canvas software 3D fallback. No CDN, npm package or remote asset is required at runtime.
- `creatures.js`: five modeled creature families with three forms each; walking, idle and evolution variants.
- `world.js`: island terrain, lake, camp, guardian gates, foliage, collisions and pickups.
- `core.js`: pure combat, capture, XP, evolution and validated save rules.
- `game.js`: input, scene transitions, battles, collection, optional synthesized audio, save handling and UI.
- `sw.js`: game-scoped cache, confined to `games/monterra/`; does not delete another game's cache.

Progress is saved under `monterra-wilds-save-v3`. Valid version-two teams migrate automatically. When storage is unavailable the game stays playable, and the help screen discloses that progress cannot persist. New Journey requires confirmation. Diagnostic controls are only exposed on localhost, never on the published host.

## Verification

`node --test tests/monterra-core.test.mjs` from the repository root runs 23 pure-rule checks. `python tests/monterra-browser.py` uses Playwright and the system Chromium. Set `TEST_GROUP=layout` or `TEST_GROUP=progression` to run a smaller group.

The recorded run passed 23 rule tests and 51 browser assertions, including two evolution stages, capture, rapid-tap protection, fainting, all guardian rewards and four viewport sizes. The test container blocks URL navigation and WebGL; tests inline the source modules, exercise the actual software 3D renderer, and provide an in-memory storage shim. Physical devices, Safari, GPU rendering, live service-worker delivery and real storage across navigation have NOT been verified. See the accompanying test report for the exact scope. Do not describe this as universally bug-free or claim a successful live deployment from a commit alone.
