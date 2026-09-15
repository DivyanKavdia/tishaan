const grid = document.getElementById('game-grid');

const cards = [...document.querySelectorAll('.game-card')];
const search = document.getElementById('game-search');
const filtersRoot = document.querySelector('.filters');
const status = document.getElementById('search-status');
let category = 'All';

// Keep category buttons and counts in sync with whatever games are currently registered.
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

// Android PWA install experience. Chrome fires beforeinstallprompt only when the
// site passes its installability checks, so the button appears only when useful.
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
