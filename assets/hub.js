const grid = document.getElementById('game-grid');

// Keep the landing page in sync with newly registered games. The original
// homepage contains static cards, so inject Monterra here until the hub is
// migrated to fully catalog-driven rendering.
if (grid && !grid.querySelector('a[href="./games/monterra/"]')) {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.dataset.genre = 'Adventure';
  card.dataset.search = 'monterra wilds adventure explore catch battle evolve elemental creatures monster evolution';
  card.innerHTML = `
    <a class="game-link" href="./games/monterra/" aria-label="Play Monterra Wilds">
      <div class="game-cover">
        <img src="./games/monterra/cover.svg" width="960" height="640" alt="" loading="eager">
        <span class="game-badge">NEW ADVENTURE</span>
        <span class="cover-mark" aria-hidden="true">PRESS PLAY ↗</span>
      </div>
      <div class="game-info">
        <div class="game-heading">
          <img class="game-icon" src="./games/monterra/icon.svg" width="46" height="46" alt="" loading="eager">
          <div><h3>Monterra Wilds</h3><div class="game-meta"><span>Adventure</span><i aria-hidden="true"></i><span>Solo</span></div></div>
        </div>
        <p class="game-description">Explore a living wilderness, discover elemental creatures, battle, catch them, level up and unlock powerful evolutions.</p>
        <div class="game-bottom"><span class="game-detail">Explore · Catch · Battle · Evolve</span><span class="play-now">Play now <span aria-hidden="true">↗</span></span></div>
      </div>
    </a>`;
  grid.prepend(card);
}

const cards = [...document.querySelectorAll('.game-card')];
const search = document.getElementById('game-search');
const filtersRoot = document.querySelector('.filters');
const status = document.getElementById('search-status');
let category = 'All';

const categoryCounts = cards.reduce((map, card) => {
  map.set(card.dataset.genre, (map.get(card.dataset.genre) || 0) + 1);
  return map;
}, new Map());
filtersRoot.replaceChildren();
const allFilter = document.createElement('button');
allFilter.className = 'filter-button';
allFilter.dataset.category = 'All';
allFilter.setAttribute('aria-pressed', 'true');
allFilter.innerHTML = `All games<span>${cards.length}</span>`;
filtersRoot.append(allFilter);
for (const [name, count] of categoryCounts) {
  const button = document.createElement('button');
  button.className = 'filter-button';
  button.dataset.category = name;
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = `${name}<span>${count}</span>`;
  filtersRoot.append(button);
}
const filters = [...filtersRoot.querySelectorAll('[data-category]')];

function filterGames(announce = true) {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of cards) {
    const matches = (category === 'All' || card.dataset.genre === category) && card.dataset.search.includes(query);
    card.hidden = !matches;
    if (matches) count++;
  }
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.category === category));
  grid.dataset.count = String(count);
  grid.hidden = count === 0;
  document.getElementById('empty-state').hidden = count > 0;
  document.getElementById('game-count').textContent = `${count} ${count === 1 ? 'game' : 'games'} ${query || category !== 'All' ? 'found' : 'ready to play'}`;
  if (announce) status.textContent = `${count} ${count === 1 ? 'game' : 'games'} found.`;
}

search.addEventListener('input', () => filterGames());
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { search.value = ''; filterGames(); }
});
for (const button of filters) button.addEventListener('click', () => { category = button.dataset.category; filterGames(); });
document.getElementById('clear-search').addEventListener('click', () => {
  search.value = ''; category = 'All'; filterGames(); search.focus();
});
const surprise = document.getElementById('surprise-button');
surprise.setAttribute('aria-label', 'Play a surprise game');
surprise.addEventListener('click', () => {
  const card = cards[Math.floor(Math.random() * cards.length)];
  if (card) window.location.assign(card.querySelector('.game-link').href);
});
surprise.hidden = cards.length === 0;
document.getElementById('library-tools').hidden = false;
filterGames(false);

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

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
