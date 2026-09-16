import {readPassport, gameProgress, favoriteGame, achievements} from '../studio/passport.js';

export function decorateCollection(cards) {
  const profile=readPassport(), summaries=cards.map(card=>gameProgress(card.dataset.slug,profile));
  const root=document.getElementById('player-hub');
  root.hidden=false;
  const earned=achievements(summaries);
  document.getElementById('player-stats').textContent=`${summaries.filter(p=>p.played).length} games explored · ${summaries.reduce((n,p)=>n+p.cleared,0)} stages cleared · ${summaries.reduce((n,p)=>n+p.stars,0)} stars`;
  const badges=document.getElementById('player-badges'); badges.replaceChildren();
  for(const badge of earned){
    const item=document.createElement('div');item.className='player-badge'+(badge.value>=badge.goal?' earned':'');
    const icon=document.createElement('b');icon.textContent=badge.icon;
    const label=document.createElement('span');label.textContent=badge.name;
    const detail=document.createElement('small');detail.textContent=badge.value>=badge.goal?'Unlocked':`${Math.min(badge.goal,badge.value)}/${badge.goal} · ${badge.detail}`;
    item.append(icon,label,detail);badges.append(item);
  }
  for(const [i,card] of cards.entries()){
    card.querySelector('.favorite-game')?.remove();card.querySelector('.card-progress')?.remove();
    const slug=card.dataset.slug, name=card.querySelector('h3').textContent, button=document.createElement('button');
    button.type='button';button.className='favorite-game';
    const sync=selected=>{card.dataset.favorite=String(selected);button.textContent=selected?'★':'☆';button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`${selected?'Unfavorite':'Favorite'} ${name}`);};
    sync(profile.favorites.includes(slug));button.onclick=()=>{sync(favoriteGame(slug));document.dispatchEvent(new Event('favoriteschange'));};card.append(button);
    const progress=summaries[i],line=document.createElement('div');line.className='card-progress';
    line.textContent=progress.cleared?`${progress.cleared} cleared · ${progress.stars} ★${progress.best?' · best '+progress.best.toLocaleString():''}`:progress.played?'Your next stage is waiting':'A new adventure awaits';
    card.querySelector('.game-info').append(line);
  }
  const day=Math.floor(Date.now()/86400000), pick=cards[day%cards.length];
  if(pick){const spot=document.getElementById('spotlight-link');spot.href=pick.querySelector('.game-link').href;document.getElementById('spotlight-title').textContent=pick.querySelector('h3').textContent;}
}
