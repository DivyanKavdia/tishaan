const cards = [...document.querySelectorAll('.game-card')];
const search = document.getElementById('game-search');
const filters = [...document.querySelectorAll('[data-category]')];
const grid = document.getElementById('game-grid');
const status = document.getElementById('search-status');
let category = 'All';

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

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
