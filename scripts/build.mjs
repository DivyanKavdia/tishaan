import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot, writeCatalog } from './catalog.mjs';

const games = await writeCatalog();
// Changing the hub or a catalog illustration automatically refreshes its offline cache.
const workerPath = path.join(projectRoot, 'sw.js');
const worker = await readFile(workerPath, 'utf8');
const fingerprint = createHash('sha256');
fingerprint.update(worker.replace(/^const CACHE = .*;$/m, ''));
const hubFiles = ['index.html', 'games/catalog.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', ...(await readdir(path.join(projectRoot, 'assets'))).sort().map(file => `assets/${file}`), ...games.flatMap(game => [game.icon, game.cover])];
for (const file of hubFiles) { fingerprint.update(file); fingerprint.update(await readFile(path.join(projectRoot, file))); }
const version = fingerprint.digest('hex').slice(0, 12);
await writeFile(workerPath, worker.replace(/^const CACHE = .*;$/m, `const CACHE = 'tishaan-game-zone-${version}';`));
const output = path.join(projectRoot, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'assets', 'games', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', '.nojekyll']) {
  await cp(path.join(projectRoot, file), path.join(output, file), { recursive: true });
}
console.log(`Built Tishaan’s Game Zone and ${games.length} ${games.length === 1 ? 'game' : 'games'} in dist/.`);
