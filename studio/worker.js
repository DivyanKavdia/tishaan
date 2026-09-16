/* Shared worker logic. Each game supplies its own cache name and asset list. */
const {prefix,version,assets}=self.GAME_OFFLINE;
const cacheName=prefix+version;
const gameBase=new URL('./',self.location.href);
const sharedBase=new URL('../../studio/',self.location.href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  await cache.addAll(assets.map(asset=>new URL(asset,gameBase).href));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(name=>name.startsWith(prefix)&&name!==cacheName).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==gameBase.origin||(!url.pathname.startsWith(gameBase.pathname)&&!url.pathname.startsWith(sharedBase.pathname)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    try {
      const response=await fetch(request,{cache:'no-cache'});
      if(response.ok)await cache.put(request,response.clone());
      return response;
    }catch{
      return await cache.match(request,{ignoreSearch:true}) || (request.mode==='navigate'?await cache.match(new URL('index.html',gameBase).href):null) || Response.error();
    }
  })());
});
