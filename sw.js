// Atomic app-shell installation; failed requests never poison the offline cache.
const CACHE = 'switch-games-26421496db216654';
const SHELL = ['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./app-icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
// Leave a waiting worker until the existing game's tabs have closed. Never swap
// engine versions during a child's round. A subsequent launch gets the new shell.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith('switch-games-')&&key!==CACHE)await caches.delete(key);
    await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
    const url=new URL(event.request.url);
    if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
    event.respondWith((async()=>{
        const cache=await caches.open(CACHE);
        const cached=await cache.match(event.request,{ignoreSearch:true});
        if(cached)return cached;
        try {return await fetch(event.request);}
        catch {if(event.request.mode==='navigate')return cache.match('./index.html');throw new Error('Offline resource unavailable');}
    })());
});
