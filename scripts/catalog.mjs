import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export async function readCatalog(root = projectRoot) {
  const folders = await readdir(path.join(root, 'games'), { withFileTypes: true });
  const games = [];
  for (const folder of folders.filter(entry => entry.isDirectory())) {
    const slug = folder.name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid game folder: ${slug}. Use lowercase words separated by hyphens.`);
    const base = path.join(root, 'games', slug);
    let game;
    try { game = JSON.parse(await readFile(path.join(base, 'game.json'), 'utf8')); }
    catch { throw new Error(`${slug} needs a valid game.json so it can be listed on the landing page.`); }
    for (const key of ['name', 'description', 'category', 'players', 'detail', 'icon', 'cover']) {
      if (typeof game[key] !== 'string' || !game[key].trim()) throw new Error(`${slug}: missing ${key} in game.json.`);
    }
    if (game.category === 'All') throw new Error(`${slug}: use a specific category instead of All.`);
    for (const key of ['icon', 'cover']) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(svg|png|jpe?g|webp)$/i.test(game[key]) || game[key].split('/').includes('..')) throw new Error(`${slug}: ${key} must be a local image path.`);
    }
    for (const file of ['index.html', game.icon, game.cover]) {
      const asset = await stat(path.join(base, file)).catch(() => null);
      if (!asset?.isFile()) throw new Error(`${slug}: missing ${file}.`);
    }
    games.push({ slug, name: game.name.trim(), description: game.description.trim(), category: game.category.trim(), players: game.players.trim(), detail: game.detail.trim(), icon: `./games/${slug}/${game.icon}`, cover: `./games/${slug}/${game.cover}`, href: `./games/${slug}/`, featured: game.featured === true });
  }
  if (!games.length) throw new Error('Add at least one playable game before publishing.');
  return games.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
}

function between(html, name, content) {
  const start = `<!-- ${name}_START -->`;
  const end = `<!-- ${name}_END -->`;
  const left = html.indexOf(start), right = html.indexOf(end);
  if (left < 0 || right < left) throw new Error(`Missing ${name} markers in index.html.`);
  return html.slice(0, left + start.length) + content + html.slice(right);
}

export async function writeCatalog(root = projectRoot) {
  const games = await readCatalog(root);
  const cards = games.map(game => `
            <article class="game-card" data-genre="${escapeHtml(game.category)}" data-search="${escapeHtml(`${game.name} ${game.category} ${game.description}`.toLocaleLowerCase())}">
              <a class="game-link" href="${escapeHtml(game.href)}" aria-label="Play ${escapeHtml(game.name)}">
                <div class="game-cover"><img src="${escapeHtml(game.cover)}" width="960" height="640" alt="" loading="lazy">${game.featured ? '<span class="game-badge">IN THE SPOTLIGHT</span>' : ''}<span class="cover-mark" aria-hidden="true">PRESS PLAY ↗</span></div>
                <div class="game-info"><div class="game-heading"><img class="game-icon" src="${escapeHtml(game.icon)}" width="46" height="46" alt="" loading="lazy"><div><h3>${escapeHtml(game.name)}</h3><div class="game-meta"><span>${escapeHtml(game.category)}</span><i aria-hidden="true"></i><span>${escapeHtml(game.players)}</span></div></div></div><p class="game-description">${escapeHtml(game.description)}</p><div class="game-bottom"><span class="game-detail">${escapeHtml(game.detail)}</span><span class="play-now">Play now <span aria-hidden="true">↗</span></span></div></div>
              </a>
            </article>`).join('');
  const categories = ['All', ...new Set(games.map(game => game.category))];
  const filters = categories.map(category => `<button class="filter-button" data-category="${escapeHtml(category)}" aria-pressed="${category === 'All'}">${escapeHtml(category === 'All' ? 'All games' : category)}<span>${category === 'All' ? games.length : games.filter(game => game.category === category).length}</span></button>`).join('');
  let html = await readFile(path.join(root, 'index.html'), 'utf8');
  html = between(html, 'GAME_CARDS', cards + '\n          ');
  html = between(html, 'GAME_FILTERS', filters);
  html = between(html, 'GAME_COUNT', `${games.length} ${games.length === 1 ? 'game' : 'games'} ready to play`);
  html = html.replace(/id="game-grid"(?: data-count="\d+")?/, `id="game-grid" data-count="${games.length}"`);
  await writeFile(path.join(root, 'index.html'), html);
  await writeFile(path.join(root, 'games/catalog.json'), JSON.stringify(games, null, 2) + '\n');
  return games;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const games = await writeCatalog();
  console.log(`Listed ${games.length} ${games.length === 1 ? 'game' : 'games'} on Tishaan’s Game Zone.`);
}
