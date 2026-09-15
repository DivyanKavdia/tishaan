const PREFIX='iron-citadel-';
const CACHE=PREFIX+'v1';
const BASE=new URL('./',self.location.href);
const ASSETS=['./','./index.html','./styles.css','./engine.js','./art.js','./game.js','./icon.svg','./cover.svg','./game.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request);
    if(cached)return cached;
    try{return await fetch(event.request);}catch{return event.request.mode==='navigate'?(await cache.match('./index.html'))||Response.error():Response.error();}
  })());
});
