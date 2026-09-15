import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readCatalog, writeCatalog } from '../scripts/catalog.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'tishaan-catalog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'games'));
  await writeFile(path.join(root, 'index.html'), '<p><!-- GAME_COUNT_START --><!-- GAME_COUNT_END --></p><nav><!-- GAME_FILTERS_START --><!-- GAME_FILTERS_END --></nav><div id="game-grid"><!-- GAME_CARDS_START --><!-- GAME_CARDS_END --></div>');
  return root;
}
async function addGame(root, slug, metadata = {}) {
  const folder = path.join(root, 'games', slug);
  await mkdir(folder);
  for (const file of ['index.html', 'icon.svg', 'cover.svg']) await writeFile(path.join(folder, file), 'fixture');
  await writeFile(path.join(folder, 'game.json'), JSON.stringify({ name: slug, description: 'A test game.', category: 'Puzzle', players: 'Solo', detail: 'Quick rounds', icon: 'icon.svg', cover: 'cover.svg', ...metadata }));
}

test('new game folders automatically produce cards, icons, categories and playable links', async t => {
  const root = await fixture(t);
  await addGame(root, 'first-game', { name: 'First Game', category: 'Action', featured: true });
  await writeCatalog(root);
  await addGame(root, 'new-puzzle', { name: 'New Puzzle' });
  assert.equal((await writeCatalog(root)).length, 2);
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.equal((html.match(/class="game-card"/g) || []).length, 2);
  for (const value of ['href="./games/new-puzzle/"', 'src="./games/new-puzzle/icon.svg"', 'data-category="Puzzle"', '2 games ready to play']) assert.ok(html.includes(value));
  await writeCatalog(root);
  assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), html, 'Generation must not duplicate entries');
  assert.equal(JSON.parse(await readFile(path.join(root, 'games/catalog.json'), 'utf8')).length, 2);
});

test('games cannot silently disappear because metadata or assets are missing', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'games', 'unfinished-game'));
  await assert.rejects(readCatalog(root), /game.json/);
  await rm(path.join(root, 'games', 'unfinished-game'), { recursive: true });
  await addGame(root, 'missing-cover');
  await rm(path.join(root, 'games', 'missing-cover', 'cover.svg'));
  await assert.rejects(readCatalog(root), /missing cover.svg/);
});

test('catalog text is escaped and image paths stay inside the game', async t => {
  const root = await fixture(t);
  await addGame(root, 'safe-game', { name: 'Heroes <&> "Friends"' });
  await writeCatalog(root);
  assert.ok((await readFile(path.join(root, 'index.html'), 'utf8')).includes('Heroes &lt;&amp;&gt; &quot;Friends&quot;'));
  await addGame(root, 'bad-game', { icon: '../../outside.svg' });
  await assert.rejects(readCatalog(root), /local image path/);
});
