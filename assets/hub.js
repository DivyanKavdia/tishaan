const grid = document.getElementById('game-grid');
const search = document.getElementById('game-search');
const filtersRoot = document.querySelector('.filters');
const status = document.getElementById('search-status');
const gameCount = document.getElementById('game-count');
const emptyState = document.getElementById('empty-state');
const clearSearch = document.getElementById('clear-search');
const surprise = document.getElementById('surprise-button');
const libraryTools = document.getElementById('library-tools');
let cards = [];
let category = 'All';

function makeCard(game) {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.dataset.genre = game.category || 'Other';
  card.dataset.search = `${game.name} ${game.category} ${game.description} ${game.detail || ''}`.toLocaleLowerCase();

  const link = document.createElement('a');
  link.className = 'game-link';
  link.href = game.href;
  link.setAttribute('aria-label', `Play ${game.name}`);

  const cover = document.createElement('div');
  cover.className = 'game-cover';
  const coverImg = document.createElement('img');
  coverImg.src = game.cover;
  coverImg.width = 960;
  coverImg.height = 640;
  coverImg.alt = '';
  coverImg.loading = game.featured ? 'eager' : 'lazy';
  cover.appendChild(coverImg);
  if (game.featured) {
    const badge = document.createElement('span');
    badge.className = 'game-badge';
    badge.textContent = game.slug === 'monterra' ? 'NEW ADVENTURE' : 'IN THE SPOTLIGHT';
    cover.appendChild(badge);
  }
  const coverMark = document.createElement('span');
  coverMark.className = 'cover-mark';
  coverMark.setAttribute('aria-hidden', 'true');
  coverMark.textContent = 'PRESS PLAY ↗';
  cover.appendChild(coverMark);

  const info = document.createElement('div');
  info.className = 'game-info';
  const heading = document.createElement('div');
  heading.className = 'game-heading';
  const icon = document.createElement('img');
  icon.className = 'game-icon';
  icon.src = game.icon;
  icon.width = 46;
  icon.height = 46;
  icon.alt = '';
  icon.loading = game.featured ? 'eager' : 'lazy';
  const titleWrap = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = game.name;
  const meta = document.createElement('div');
  meta.className = 'game-meta';
  const categoryEl = document.createElement('span');
  categoryEl.textContent = game.category;
  const dot = document.createElement('i');
  dot.setAttribute('aria-hidden', 'true');
  const players = document.createElement('span');
  players.textContent = game.players || 'Solo';
  meta.append(categoryEl, dot, players);
  titleWrap.append(title, meta);
  heading.append(icon, titleWrap);

  const description = document.createElement('p');
  description.className = 'game-description';
  description.textContent = game.description;
  const bottom = document.createElement('div');
  bottom.className = 'game-bottom';
  const detail = document.createElement('span');
  detail.className = 'game-detail';
  detail.textContent = game.detail || 'Tap to play';
  const play = document.createElement('span');
  play.className = 'play-now';
  play.textContent = 'Play now ↗';
  bottom.append(detail, play);
  info.append(heading, description, bottom);
  link.append(cover, info);
  card.appendChild(link);
  return card;
}

function rebuildFilters() {
  const counts = cards.reduce((map, card) => {
    const name = card.dataset.genre;
    map.set(name, (map.get(name) || 0) + 1);
    return map;
  }, new Map());

  filtersRoot.replaceChildren();
  const all = document.createElement('button');
  all.className = 'filter-button';
  all.dataset.category = 'All';
  all.setAttribute('aria-pressed', String(category === 'All'));
  all.innerHTML = `All games<span>${cards.length}</span>`;
  filtersRoot.appendChild(all);

  for (const [name, count] of counts) {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.dataset.category = name;
    button.setAttribute('aria-pressed', String(category === name));
    button.innerHTML = `${name}<span>${count}</span>`;
    filtersRoot.appendChild(button);
  }

  filtersRoot.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      category = button.dataset.category;
      filterGames();
    });
  });
}

function filterGames(announce = true) {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of cards) {
    const matchesCategory = category === 'All' || card.dataset.genre === category;
    const matchesQuery = !query || card.dataset.search.includes(query);
    card.hidden = !(matchesCategory && matchesQuery);
    if (!card.hidden) count++;
  }
  filtersRoot.querySelectorAll('[data-category]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  });
  grid.dataset.count = String(count);
  grid.hidden = count === 0;
  emptyState.hidden = count > 0;
  gameCount.textContent = `${count} ${count === 1 ? 'game' : 'games'} ${query || category !== 'All' ? 'found' : 'ready to play'}`;
  if (announce) status.textContent = `${count} ${count === 1 ? 'game' : 'games'} found.`;
}

async function loadCatalog() {
  try {
    const response = await fetch('./games/catalog.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('Catalog is empty');
    grid.replaceChildren(...catalog.map(makeCard));
  } catch (error) {
    console.warn('Using built-in game cards because catalog loading failed:', error);
  }

  cards = [...grid.querySelectorAll('.game-card')];
  rebuildFilters();
  libraryTools.hidden = false;
  surprise.hidden = cards.length === 0;
  filterGames(false);
}

search.addEventListener('input', () => filterGames());
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    search.value = '';
    category = 'All';
    filterGames();
  }
});
clearSearch.addEventListener('click', () => {
  search.value = '';
  category = 'All';
  filterGames();
  search.focus();
});
surprise.setAttribute('aria-label', 'Play a surprise game');
surprise.addEventListener('click', () => {
  const visible = cards.filter(card => !card.hidden);
  const pool = visible.length ? visible : cards;
  const card = pool[Math.floor(Math.random() * pool.length)];
  const link = card?.querySelector('.game-link');
  if (link) window.location.assign(link.href);
});

let installPrompt = null;
const runningStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const installButton = document.createElement('button');
installButton.type = 'button';
installButton.id = 'install-app';
installButton.textContent = 'Install app';
installButton.setAttribute('aria-label', "Install Tishaan's Game Zone app");
installButton.hidden = true;
Object.assign(installButton.style, {
  border: '1px solid rgba(255,255,255,.2)',
  background: '#f3d34a',
  color: '#15120a',
  borderRadius: '999px',
  padding: '10px 14px',
  fontWeight: '900',
  cursor: 'pointer'
});
const header = document.querySelector('.site-header');
if (header) header.append(installButton);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if (!runningStandalone) installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installButton.disabled = true;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
  installButton.disabled = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});

loadCatalog();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  });
}